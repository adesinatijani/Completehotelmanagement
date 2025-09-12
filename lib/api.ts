import { supabase } from './supabase';
import { CacheManager } from './storage';
import { Database } from '@/types/database';

type Tables = Database['public']['Tables'];

export class ApiClient {
  private cache = CacheManager.getInstance();
  private retryAttempts = 3;
  private retryDelay = 1000;
  private requestQueue: Map<string, Promise<any>> = new Map();

  private async withRetry<T>(
    operation: () => Promise<T>,
    attempts: number = this.retryAttempts
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (attempts > 1 && this.isRetryableError(error)) {
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.withRetry(operation, attempts - 1);
      }
      throw error;
    }
  }

  private isRetryableError(error: any): boolean {
    return error?.code === 'PGRST301' || error?.message?.includes('network') || error?.status >= 500;
  }

  private getCacheKey(table: string, filters?: Record<string, any>): string {
    return `${table}_${JSON.stringify(filters || {})}`;
  }

  private deduplicateRequest<T>(key: string, operation: () => Promise<T>): Promise<T> {
    if (this.requestQueue.has(key)) {
      return this.requestQueue.get(key);
    }

    const promise = operation().finally(() => {
      this.requestQueue.delete(key);
    });

    this.requestQueue.set(key, promise);
    return promise;
  }

  async query<T extends keyof Tables>(
    table: T,
    options: {
      select?: string;
      filters?: Record<string, any>;
      orderBy?: { column: string; ascending?: boolean };
      limit?: number;
      useCache?: boolean;
      cacheTTL?: number;
    } = {}
  ): Promise<Tables[T]['Row'][]> {
    const { select = '*', filters, orderBy, limit, useCache = true, cacheTTL } = options;
    const cacheKey = this.getCacheKey(table as string, { select, filters, orderBy, limit });

    // Try cache first
    if (useCache) {
      const cached = this.cache.get<Tables[T]['Row'][]>(cacheKey);
      if (cached) return cached;
    }

    const requestKey = `query_${cacheKey}`;
    return this.deduplicateRequest(requestKey, () =>
      this.withRetry(async () => {
        let query = supabase.from(table).select(select);

        // Apply filters with proper operators
        if (filters) {
          Object.entries(filters).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              query = query.in(key, value);
            } else if (typeof value === 'object' && value !== null) {
              if ('gte' in value) query = query.gte(key, value.gte);
              if ('lte' in value) query = query.lte(key, value.lte);
              if ('like' in value) query = query.like(key, value.like);
              if ('ilike' in value) query = query.ilike(key, value.ilike);
              if ('neq' in value) query = query.neq(key, value.neq);
            } else {
              query = query.eq(key, value);
            }
          });
        }

        // Apply ordering
        if (orderBy) {
          query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
        }

        // Apply limit
        if (limit) {
          query = query.limit(limit);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Cache the result
        if (useCache && data) {
          this.cache.set(cacheKey, data, cacheTTL);
        }

        return data || [];
      })
    );
  }

  async insert<T extends keyof Tables>(
    table: T,
    data: Tables[T]['Insert'] | Tables[T]['Insert'][]
  ): Promise<Tables[T]['Row']> {
    return this.withRetry(async () => {
      const { data: result, error } = await supabase
        .from(table)
        .insert(data)
        .select();

      if (error) throw error;

      // Invalidate related cache
      this.invalidateTableCache(table as string);

      return (result && result[0]) || data as Tables[T]['Row'];
    });
  }

  async update<T extends keyof Tables>(
    table: T,
    data: Tables[T]['Update'],
    filters: Record<string, any>
  ): Promise<Tables[T]['Row']> {
    return this.withRetry(async () => {
      let query = supabase.from(table).update(data);

      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      const { data: result, error } = await query.select();
      if (error) throw error;

      // Invalidate related cache
      this.invalidateTableCache(table as string);

      return (result && result[0]) || { ...data, ...filters } as Tables[T]['Row'];
    });
  }

  async delete<T extends keyof Tables>(
    table: T,
    filters: Record<string, any>
  ): Promise<void> {
    return this.withRetry(async () => {
      let query = supabase.from(table).delete();

      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      const { error } = await query;
      if (error) throw error;

      // Invalidate related cache
      this.invalidateTableCache(table as string);
    });
  }

  private invalidateTableCache(table: string): void {
    // Smart cache invalidation - only clear related entries
    const keysToDelete: string[] = [];
    this.cache.getAllKeys().forEach(key => {
      if (key.startsWith(`${table}_`)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.cache.invalidate(key));
  }

  // Batch operations for better performance
  async batchInsert<T extends keyof Tables>(
    table: T,
    data: Tables[T]['Insert'][],
    batchSize: number = 100
  ): Promise<Tables[T]['Row'][]> {
    const results: Tables[T]['Row'][] = [];
    
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      for (const item of batch) {
        const result = await this.insert(table, item);
        results.push(result);
      }
    }
    
    return results;
  }

  // Real-time subscriptions with automatic reconnection
  subscribe<T extends keyof Tables>(
    table: T,
    callback: (payload: any) => void,
    filters?: Record<string, any>
  ) {
    let channel = supabase.channel(`${table}_changes`);
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;

    const setupSubscription = () => {
      channel = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table as string,
          filter: filters ? Object.entries(filters).map(([k, v]) => `${k}=eq.${v}`).join(',') : undefined,
        },
        (payload) => {
          // Invalidate cache on changes
          this.invalidateTableCache(table as string);
          callback(payload);
        }
      );

      channel.subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to ${table} changes`);
          reconnectAttempts = 0;
        } else if (status === 'CHANNEL_ERROR' && reconnectAttempts < maxReconnectAttempts) {
          console.log(`Reconnecting to ${table} subscription...`);
          reconnectAttempts++;
          setTimeout(setupSubscription, 1000 * reconnectAttempts);
        }
      });
    };

    setupSubscription();

    return () => {
      channel.unsubscribe();
    };
  }
}

export const apiClient = new ApiClient();