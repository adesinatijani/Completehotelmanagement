import AsyncStorage from '@react-native-async-storage/async-storage';
import { Database } from '@/types/database';

type Tables = Database['public']['Tables'];

interface DashboardStats {
  totalRooms: number;
  occupiedRooms: number;
  availableRooms: number;
  todayCheckIns: number;
  todayCheckOuts: number;
  pendingOrders: number;
  lowStockItems: number;
  todayRevenue: number;
  monthlyRevenue: number;
}

export class LocalDatabase {
  private static instance: LocalDatabase;
  private isInitialized = false;
  private data: { [key: string]: any[] } = {};

  static getInstance(): LocalDatabase {
    if (!LocalDatabase.instance) {
      LocalDatabase.instance = new LocalDatabase();
    }
    return LocalDatabase.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🔄 Initializing local database...');
      
      // Load existing data from AsyncStorage
      await this.loadAllData();
      
      // Initialize empty tables if they don't exist
      await this.initializeEmptyTables();
      
      this.isInitialized = true;
      console.log('✅ Local database initialized successfully');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  private async loadAllData(): Promise<void> {
    const tables = [
      'profiles', 'rooms', 'bookings', 'menu_items', 'orders', 
      'inventory', 'maintenance_requests', 'transactions', 'halls', 
      'hall_bookings', 'recipes', 'pool_sessions'
    ];

    for (const table of tables) {
      try {
        const data = await AsyncStorage.getItem(`table_${table}`);
        this.data[table] = data ? JSON.parse(data) : [];
      } catch (error) {
        console.warn(`Failed to load ${table}:`, error);
        this.data[table] = [];
      }
    }
  }

  private async initializeEmptyTables(): Promise<void> {
    const requiredTables = [
      'profiles', 'rooms', 'bookings', 'menu_items', 'orders', 
      'inventory', 'maintenance_requests', 'transactions', 'halls', 
      'hall_bookings', 'recipes', 'pool_sessions'
    ];

    for (const table of requiredTables) {
      if (!this.data[table]) {
        this.data[table] = [];
        await this.saveTable(table);
      }
    }

    // Initialize with sample data if completely empty
    if (this.data.profiles.length === 0) {
      await this.initializeSampleData();
    }
  }

  private async initializeSampleData(): Promise<void> {
    console.log('🔄 Initializing sample data...');

    // Create default admin profile
    const adminProfile = {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'admin@hotel.com',
      full_name: 'System Administrator',
      role: 'admin',
      phone: '+1-555-0100',
      avatar_url: null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.data.profiles = [adminProfile];
    await this.saveTable('profiles');

    // Create sample rooms
    const sampleRooms = [
      {
        id: this.generateId(),
        room_number: '101',
        room_type: 'standard',
        status: 'available',
        price_per_night: 120.00,
        amenities: ['WiFi', 'TV', 'Air Conditioning'],
        floor: 1,
        max_occupancy: 2,
        description: 'Comfortable standard room with city view',
        images: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: this.generateId(),
        room_number: '102',
        room_type: 'deluxe',
        status: 'occupied',
        price_per_night: 180.00,
        amenities: ['WiFi', 'TV', 'Air Conditioning', 'Mini Bar', 'Balcony'],
        floor: 1,
        max_occupancy: 3,
        description: 'Spacious deluxe room with balcony',
        images: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: this.generateId(),
        room_number: '201',
        room_type: 'suite',
        status: 'available',
        price_per_night: 350.00,
        amenities: ['WiFi', 'TV', 'Air Conditioning', 'Mini Bar', 'Balcony', 'Kitchen', 'Living Room'],
        floor: 2,
        max_occupancy: 4,
        description: 'Luxury suite with separate living area',
        images: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    this.data.rooms = sampleRooms;
    await this.saveTable('rooms');

    console.log('✅ Sample data initialized');
  }

  private async saveTable(tableName: string): Promise<void> {
    try {
      await AsyncStorage.setItem(`table_${tableName}`, JSON.stringify(this.data[tableName]));
    } catch (error) {
      console.error(`Failed to save ${tableName}:`, error);
    }
  }

  private generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  async select<T>(
    tableName: string, 
    options: { 
      filters?: Record<string, any>;
      orderBy?: { column: string; ascending?: boolean };
      limit?: number;
    } = {}
  ): Promise<T[]> {
    await this.initialize();

    let results = [...(this.data[tableName] || [])];

    // Apply filters
    if (options.filters) {
      results = results.filter(item => {
        return Object.entries(options.filters!).every(([key, value]) => {
          if (key === 'status' && value) {
            return item[key] === value;
          }
          return item[key] === value;
        });
      });
    }

    // Apply ordering
    if (options.orderBy) {
      results.sort((a, b) => {
        const aVal = a[options.orderBy!.column];
        const bVal = b[options.orderBy!.column];
        const ascending = options.orderBy!.ascending !== false;
        
        if (aVal < bVal) return ascending ? -1 : 1;
        if (aVal > bVal) return ascending ? 1 : -1;
        return 0;
      });
    }

    // Apply limit
    if (options.limit) {
      results = results.slice(0, options.limit);
    }

    return results as T[];
  }

  async insert<T>(tableName: string, data: any): Promise<T> {
    await this.initialize();

    const newItem = {
      ...data,
      id: data.id || this.generateId(),
      created_at: data.created_at || new Date().toISOString(),
      updated_at: data.updated_at || new Date().toISOString(),
    };

    if (!this.data[tableName]) {
      this.data[tableName] = [];
    }

    this.data[tableName].push(newItem);
    await this.saveTable(tableName);

    return newItem as T;
  }

  async update<T>(tableName: string, id: string, updates: any): Promise<T> {
    await this.initialize();

    const items = this.data[tableName] || [];
    const index = items.findIndex(item => item.id === id);

    if (index === -1) {
      throw new Error(`Item with id ${id} not found in ${tableName}`);
    }

    const updatedItem = {
      ...items[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    this.data[tableName][index] = updatedItem;
    await this.saveTable(tableName);

    return updatedItem as T;
  }

  async delete(tableName: string, id: string): Promise<void> {
    await this.initialize();

    const items = this.data[tableName] || [];
    this.data[tableName] = items.filter(item => item.id !== id);
    await this.saveTable(tableName);
  }

  async getDashboardStats(): Promise<DashboardStats> {
    await this.initialize();

    const rooms = this.data.rooms || [];
    const bookings = this.data.bookings || [];
    const orders = this.data.orders || [];
    const inventory = this.data.inventory || [];
    const transactions = this.data.transactions || [];

    const today = new Date().toISOString().split('T')[0];

    const totalRooms = rooms.length;
    const occupiedRooms = rooms.filter(r => r.status === 'occupied').length;
    const availableRooms = rooms.filter(r => r.status === 'available').length;

    const todayCheckIns = bookings.filter(b => 
      b.check_in === today && b.booking_status === 'confirmed'
    ).length;

    const todayCheckOuts = bookings.filter(b => 
      b.check_out === today && b.booking_status === 'checked_in'
    ).length;

    const pendingOrders = orders.filter(o => 
      ['pending', 'preparing'].includes(o.status)
    ).length;

    const lowStockItems = inventory.filter(i => 
      i.current_stock <= i.minimum_stock
    ).length;

    const todayRevenue = transactions
      .filter(t => t.type === 'income' && t.transaction_date === today)
      .reduce((sum, t) => sum + t.amount, 0);

    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const monthlyRevenue = transactions
      .filter(t => t.type === 'income' && t.transaction_date.startsWith(currentMonth))
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      totalRooms,
      occupiedRooms,
      availableRooms,
      todayCheckIns,
      todayCheckOuts,
      pendingOrders,
      lowStockItems,
      todayRevenue,
      monthlyRevenue,
    };
  }

  async clearAllData(): Promise<void> {
    const tables = Object.keys(this.data);
    for (const table of tables) {
      this.data[table] = [];
      await AsyncStorage.removeItem(`table_${table}`);
    }
    this.isInitialized = false;
  }
}

export const db = LocalDatabase.getInstance();