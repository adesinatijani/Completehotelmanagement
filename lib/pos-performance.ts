// POS Performance Optimization System
import { useMemo, useCallback, useRef, useEffect } from 'react';
import { Database } from '@/types/database';

type MenuItem = Database['public']['Tables']['menu_items']['Row'];

export interface POSCategory {
  id: string;
  name: string;
  color: string[];
  icon: string;
  items: MenuItem[];
  count: number;
}

export class POSPerformanceManager {
  private static instance: POSPerformanceManager;
  private menuCache = new Map<string, MenuItem[]>();
  private categoryCache = new Map<string, POSCategory[]>();
  private searchCache = new Map<string, MenuItem[]>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  static getInstance(): POSPerformanceManager {
    if (!POSPerformanceManager.instance) {
      POSPerformanceManager.instance = new POSPerformanceManager();
    }
    return POSPerformanceManager.instance;
  }

  // Memoized category generation
  generateCategories(menuItems: MenuItem[], posType: 'restaurant' | 'bar'): POSCategory[] {
    const cacheKey = `${posType}_${menuItems.length}_${Date.now()}`;
    
    if (this.categoryCache.has(cacheKey)) {
      return this.categoryCache.get(cacheKey)!;
    }

    let categories: POSCategory[];

    if (posType === 'restaurant') {
      categories = [
        {
          id: 'appetizers',
          name: 'APPETIZERS',
          color: ['#ff6b6b', '#ee5a52'],
          icon: '🥗',
          items: menuItems.filter(item => item.category === 'appetizer'),
          count: 0
        },
        {
          id: 'mains',
          name: 'MAIN COURSE',
          color: ['#4ecdc4', '#44a08d'],
          icon: '🍽️',
          items: menuItems.filter(item => item.category === 'main_course'),
          count: 0
        },
        {
          id: 'desserts',
          name: 'DESSERTS',
          color: ['#a8e6cf', '#7fcdcd'],
          icon: '🍰',
          items: menuItems.filter(item => item.category === 'dessert'),
          count: 0
        },
        {
          id: 'beverages',
          name: 'BEVERAGES',
          color: ['#ffd93d', '#6bcf7f'],
          icon: '🥤',
          items: menuItems.filter(item => item.category === 'beverage'),
          count: 0
        },
        {
          id: 'specials',
          name: 'CHEF SPECIALS',
          color: ['#ff9ff3', '#f368e0'],
          icon: '⭐',
          items: menuItems.filter(item => item.name.toLowerCase().includes('special')),
          count: 0
        },
        {
          id: 'salads',
          name: 'SALADS',
          color: ['#95e1d3', '#fce38a'],
          icon: '🥬',
          items: menuItems.filter(item => item.name.toLowerCase().includes('salad')),
          count: 0
        }
      ];
    } else {
      categories = [
        {
          id: 'beer',
          name: 'BEER BASKET',
          color: ['#d4a574', '#b8956a'],
          icon: '🍺',
          items: menuItems.filter(item => item.category === 'beer' || item.name.toLowerCase().includes('beer')),
          count: 0
        },
        {
          id: 'wine',
          name: 'WINE',
          color: ['#8b0000', '#660000'],
          icon: '🍷',
          items: menuItems.filter(item => item.category === 'wine'),
          count: 0
        },
        {
          id: 'cocktail_short',
          name: 'COCKTAIL SHORT',
          color: ['#dc143c', '#b91c3c'],
          icon: '🍸',
          items: menuItems.filter(item => item.category === 'cocktail' && item.name.toLowerCase().includes('shot')),
          count: 0
        },
        {
          id: 'cocktail',
          name: 'COCKTAIL',
          color: ['#dc143c', '#b91c3c'],
          icon: '🍹',
          items: menuItems.filter(item => item.category === 'cocktail'),
          count: 0
        },
        {
          id: 'drinks',
          name: 'DRINKS',
          color: ['#228b22', '#006400'],
          icon: '🥤',
          items: menuItems.filter(item => item.category === 'beverage'),
          count: 0
        },
        {
          id: 'spirits',
          name: 'SPIRITS',
          color: ['#4169e1', '#1e40af'],
          icon: '🥃',
          items: menuItems.filter(item => item.category === 'spirits'),
          count: 0
        }
      ];
    }

    // Update counts
    categories.forEach(category => {
      category.count = category.items.length;
    });

    // Cache the result
    this.categoryCache.set(cacheKey, categories);
    
    // Clean old cache entries
    setTimeout(() => {
      this.categoryCache.delete(cacheKey);
    }, this.cacheTimeout);

    return categories;
  }

  // Optimized search with caching
  searchMenuItems(menuItems: MenuItem[], query: string): MenuItem[] {
    if (!query || query.trim().length === 0) {
      return menuItems;
    }

    const cacheKey = `search_${query.toLowerCase()}_${menuItems.length}`;
    
    if (this.searchCache.has(cacheKey)) {
      return this.searchCache.get(cacheKey)!;
    }

    const searchTerm = query.toLowerCase().trim();
    const results = menuItems.filter(item => 
      item.name.toLowerCase().includes(searchTerm) ||
      item.description.toLowerCase().includes(searchTerm) ||
      item.category.toLowerCase().includes(searchTerm) ||
      (item.subcategory && item.subcategory.toLowerCase().includes(searchTerm))
    );

    // Cache the result
    this.searchCache.set(cacheKey, results);
    
    // Clean old cache entries
    setTimeout(() => {
      this.searchCache.delete(cacheKey);
    }, this.cacheTimeout);

    return results;
  }

  // Debounced search hook
  useDebouncedSearch(searchQuery: string, delay: number = 300) {
    const [debouncedQuery, setDebouncedQuery] = React.useState(searchQuery);

    useEffect(() => {
      const handler = setTimeout(() => {
        setDebouncedQuery(searchQuery);
      }, delay);

      return () => {
        clearTimeout(handler);
      };
    }, [searchQuery, delay]);

    return debouncedQuery;
  }

  // Performance monitoring
  measurePerformance<T>(operation: () => T, operationName: string): T {
    const startTime = performance.now();
    const result = operation();
    const endTime = performance.now();
    const duration = endTime - startTime;

    if (duration > 100) { // Log slow operations
      console.warn(`Slow POS operation: ${operationName} took ${duration.toFixed(2)}ms`);
    }

    return result;
  }

  // Memory cleanup
  clearCaches() {
    this.menuCache.clear();
    this.categoryCache.clear();
    this.searchCache.clear();
  }

  // Get cache statistics
  getCacheStats() {
    return {
      menuCacheSize: this.menuCache.size,
      categoryCacheSize: this.categoryCache.size,
      searchCacheSize: this.searchCache.size,
      totalCacheEntries: this.menuCache.size + this.categoryCache.size + this.searchCache.size
    };
  }
}

export const posPerformanceManager = POSPerformanceManager.getInstance();

// React hooks for performance optimization
export function useOptimizedMenuItems(menuItems: MenuItem[], posType: 'restaurant' | 'bar') {
  return useMemo(() => {
    return posPerformanceManager.measurePerformance(
      () => menuItems.filter(item => {
        if (posType === 'restaurant') {
          return ['appetizer', 'main_course', 'dessert', 'beverage'].includes(item.category);
        } else {
          return ['wine', 'cocktail', 'beer', 'beverage', 'spirits'].includes(item.category);
        }
      }),
      `filterMenuItems_${posType}`
    );
  }, [menuItems, posType]);
}

export function useOptimizedCategories(menuItems: MenuItem[], posType: 'restaurant' | 'bar') {
  return useMemo(() => {
    return posPerformanceManager.measurePerformance(
      () => posPerformanceManager.generateCategories(menuItems, posType),
      `generateCategories_${posType}`
    );
  }, [menuItems, posType]);
}

export function useOptimizedSearch(menuItems: MenuItem[], searchQuery: string) {
  const debouncedQuery = posPerformanceManager.useDebouncedSearch(searchQuery);
  
  return useMemo(() => {
    return posPerformanceManager.measurePerformance(
      () => posPerformanceManager.searchMenuItems(menuItems, debouncedQuery),
      'searchMenuItems'
    );
  }, [menuItems, debouncedQuery]);
}