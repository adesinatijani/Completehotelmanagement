import AsyncStorage from '@react-native-async-storage/async-storage';
import { Database } from '@/types/database';

// Enhanced Local Database with all hotel management features
export class LocalDatabase {
  private static instance: LocalDatabase;
  private data: { [key: string]: any[] } = {};
  private initialized = false;

  static getInstance(): LocalDatabase {
    if (!LocalDatabase.instance) {
      LocalDatabase.instance = new LocalDatabase();
    }
    return LocalDatabase.instance;
  }

  async initialize() {
    if (this.initialized) return;

    console.log('=== DATABASE INITIALIZATION START ===');
    
    try {
      const savedData = await AsyncStorage.getItem('hotel_database');
      if (savedData) {
        this.data = JSON.parse(savedData);
        console.log('✅ Database loaded from AsyncStorage');
        console.log('Loaded data summary:', {
          profiles: this.data.profiles?.length || 0,
          rooms: this.data.rooms?.length || 0,
          bookings: this.data.bookings?.length || 0,
          menu_items: this.data.menu_items?.length || 0,
          inventory: this.data.inventory?.length || 0,
        });
      } else {
        console.log('No existing data found, creating new database...');
        await this.createDefaultSchema();
        console.log('✅ New database created with sample data');
      }
      this.initialized = true;
      console.log('✅ Database initialization complete');
      console.log('=== DATABASE INITIALIZATION COMPLETE ===');
    } catch (error) {
      console.error('❌ Failed to initialize database:', error);
      // Try to create fallback database
      try {
        await this.createDefaultSchema();
        this.initialized = true;
        console.log('✅ Fallback database created');
      } catch (fallbackError) {
        console.error('❌ Failed to create fallback database:', fallbackError);
        throw new Error('Database initialization failed completely');
      }
    }
  }

  private async createDefaultSchema() {
    console.log('Creating comprehensive hotel database schema...');
    
    // Initialize all tables
    this.data = {
      profiles: [],
      rooms: [],
      bookings: [],
      halls: [],
      hall_bookings: [],
      menu_items: [],
      recipes: [],
      orders: [],
      inventory: [],
      maintenance_requests: [],
      transactions: [],
      pool_sessions: [],
      analytics_data: [],
      staff_schedules: [],
      suppliers: [],
      customers: [],
    };

    await this.insertComprehensiveData();
    await this.save();
  }

  private async insertComprehensiveData() {
    console.log('Inserting comprehensive hotel data...');

    // Sample Profiles (Staff)
    const sampleProfiles = [
      {
        id: '1',
        email: 'admin@hotel.com',
        full_name: 'Hotel Administrator',
        role: 'admin',
        phone: '+1-555-0001',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '2',
        email: 'manager@hotel.com',
        full_name: 'General Manager',
        role: 'manager',
        phone: '+1-555-0002',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '3',
        email: 'reception@hotel.com',
        full_name: 'Front Desk Receptionist',
        role: 'receptionist',
        phone: '+1-555-0003',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '4',
        email: 'chef@hotel.com',
        full_name: 'Head Chef',
        role: 'kitchen_staff',
        phone: '+1-555-0004',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '5',
        email: 'bartender@hotel.com',
        full_name: 'Bar Manager',
        role: 'bar_staff',
        phone: '+1-555-0005',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    // Comprehensive Room Data
    const sampleRooms = [
      // Standard Rooms
      { id: '1', room_number: '101', room_type: 'standard', status: 'available', price_per_night: 120.00, amenities: ['WiFi', 'TV', 'AC', 'Private Bath'], floor: 1, max_occupancy: 2, description: 'Comfortable standard room with city view', checkout_time: '12:00', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '2', room_number: '102', room_type: 'standard', status: 'occupied', price_per_night: 120.00, amenities: ['WiFi', 'TV', 'AC', 'Private Bath'], floor: 1, max_occupancy: 2, description: 'Comfortable standard room with city view', checkout_time: '12:00', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '3', room_number: '103', room_type: 'standard', status: 'cleaning', price_per_night: 120.00, amenities: ['WiFi', 'TV', 'AC', 'Private Bath'], floor: 1, max_occupancy: 2, description: 'Comfortable standard room with city view', checkout_time: '12:00', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      
      // Deluxe Rooms
      { id: '4', room_number: '201', room_type: 'deluxe', status: 'available', price_per_night: 180.00, amenities: ['WiFi', 'TV', 'AC', 'Mini Bar', 'Balcony', 'Room Service'], floor: 2, max_occupancy: 3, description: 'Spacious deluxe room with balcony and city view', checkout_time: '12:00', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '5', room_number: '202', room_type: 'deluxe', status: 'occupied', price_per_night: 180.00, amenities: ['WiFi', 'TV', 'AC', 'Mini Bar', 'Balcony', 'Room Service'], floor: 2, max_occupancy: 3, description: 'Spacious deluxe room with balcony and city view', checkout_time: '12:00', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      
      // Suites
      { id: '6', room_number: '301', room_type: 'suite', status: 'available', price_per_night: 350.00, amenities: ['WiFi', 'TV', 'AC', 'Mini Bar', 'Balcony', 'Kitchen', 'Living Room', 'Butler Service'], floor: 3, max_occupancy: 4, description: 'Luxury suite with separate living area and kitchen', checkout_time: '12:00', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '7', room_number: '302', room_type: 'suite', status: 'maintenance', price_per_night: 350.00, amenities: ['WiFi', 'TV', 'AC', 'Mini Bar', 'Balcony', 'Kitchen', 'Living Room', 'Butler Service'], floor: 3, max_occupancy: 4, description: 'Luxury suite with separate living area and kitchen', checkout_time: '12:00', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      
      // Presidential Suite
      { id: '8', room_number: '401', room_type: 'presidential', status: 'available', price_per_night: 500.00, amenities: ['WiFi', 'TV', 'AC', 'Mini Bar', 'Balcony', 'Kitchen', 'Living Room', 'Butler Service', 'Jacuzzi', 'Private Terrace'], floor: 4, max_occupancy: 6, description: 'Ultimate luxury presidential suite with panoramic views', checkout_time: '12:00', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      
      // Family Rooms
      { id: '9', room_number: '105', room_type: 'family', status: 'available', price_per_night: 220.00, amenities: ['WiFi', 'TV', 'AC', 'Bunk Beds', 'Play Area', 'Mini Fridge'], floor: 1, max_occupancy: 6, description: 'Perfect for families with children', checkout_time: '12:00', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '10', room_number: '106', room_type: 'family', status: 'reserved', price_per_night: 220.00, amenities: ['WiFi', 'TV', 'AC', 'Bunk Beds', 'Play Area', 'Mini Fridge'], floor: 1, max_occupancy: 6, description: 'Perfect for families with children', checkout_time: '12:00', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    ];

    // Comprehensive Hall Data
    const sampleHalls = [
      {
        id: '1',
        hall_name: 'Grand Ballroom',
        hall_type: 'ballroom',
        capacity: 300,
        hourly_rate: 200.00,
        daily_rate: 1500.00,
        amenities: ['Sound System', 'Projector', 'Stage', 'Dance Floor', 'Bar', 'Kitchen Access', 'Parking'],
        description: 'Elegant ballroom perfect for weddings, galas, and large corporate events',
        is_available: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '2',
        hall_name: 'Conference Room A',
        hall_type: 'conference',
        capacity: 50,
        hourly_rate: 75.00,
        daily_rate: 500.00,
        amenities: ['Projector', 'Whiteboard', 'WiFi', 'Video Conferencing', 'Coffee Station'],
        description: 'Modern conference room for business meetings and presentations',
        is_available: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '3',
        hall_name: 'Banquet Hall',
        hall_type: 'banquet',
        capacity: 150,
        hourly_rate: 120.00,
        daily_rate: 800.00,
        amenities: ['Sound System', 'Kitchen Access', 'Bar Setup', 'Decorative Lighting'],
        description: 'Perfect for dinner parties, celebrations, and corporate dinners',
        is_available: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '4',
        hall_name: 'Meeting Room B',
        hall_type: 'meeting',
        capacity: 20,
        hourly_rate: 40.00,
        daily_rate: 250.00,
        amenities: ['TV Screen', 'WiFi', 'Whiteboard', 'Coffee Machine'],
        description: 'Intimate meeting space for small groups and team sessions',
        is_available: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    // Comprehensive Menu Items - Food
    const foodMenuItems = [
      // Appetizers
      { id: '1', name: 'Caesar Salad', description: 'Crisp romaine lettuce with parmesan and croutons', category: 'appetizer', subcategory: 'salad', price: 12.99, cost_price: 6.50, ingredients: ['romaine lettuce', 'parmesan cheese', 'croutons', 'caesar dressing', 'anchovies'], prep_time_minutes: 10, cooking_time_minutes: 0, difficulty_level: 'easy', is_available: true, is_vegetarian: true, is_vegan: false, is_gluten_free: false, calories: 280, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '2', name: 'Buffalo Wings', description: 'Spicy chicken wings with blue cheese dip', category: 'appetizer', subcategory: 'chicken', price: 14.99, cost_price: 8.00, ingredients: ['chicken wings', 'buffalo sauce', 'blue cheese', 'celery'], prep_time_minutes: 15, cooking_time_minutes: 25, difficulty_level: 'medium', is_available: true, is_vegetarian: false, is_vegan: false, is_gluten_free: true, calories: 450, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '3', name: 'Shrimp Cocktail', description: 'Fresh shrimp with cocktail sauce', category: 'appetizer', subcategory: 'seafood', price: 16.99, cost_price: 10.00, ingredients: ['shrimp', 'cocktail sauce', 'lemon', 'lettuce'], prep_time_minutes: 20, cooking_time_minutes: 5, difficulty_level: 'easy', is_available: true, is_vegetarian: false, is_vegan: false, is_gluten_free: true, calories: 120, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      
      // Nigerian Appetizers
      { id: '21', name: 'Pepper Soup (Goat Meat)', description: 'Spicy Nigerian pepper soup with tender goat meat', category: 'appetizer', subcategory: 'nigerian', price: 3500, cost_price: 1800, ingredients: ['goat meat', 'pepper soup spice', 'scent leaves', 'onions', 'ginger', 'garlic'], prep_time_minutes: 20, cooking_time_minutes: 45, difficulty_level: 'medium', is_available: true, is_vegetarian: false, is_vegan: false, is_gluten_free: true, calories: 320, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '22', name: 'Pepper Soup (Fish)', description: 'Traditional fish pepper soup with catfish', category: 'appetizer', subcategory: 'nigerian', price: 2800, cost_price: 1400, ingredients: ['catfish', 'pepper soup spice', 'scent leaves', 'onions', 'ginger'], prep_time_minutes: 15, cooking_time_minutes: 30, difficulty_level: 'medium', is_available: true, is_vegetarian: false, is_vegan: false, is_gluten_free: true, calories: 280, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '23', name: 'Suya', description: 'Grilled spiced beef skewers with onions and tomatoes', category: 'appetizer', subcategory: 'nigerian', price: 2000, cost_price: 1000, ingredients: ['beef', 'suya spice', 'onions', 'tomatoes', 'cucumber'], prep_time_minutes: 30, cooking_time_minutes: 20, difficulty_level: 'medium', is_available: true, is_vegetarian: false, is_vegan: false, is_gluten_free: true, calories: 350, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '24', name: 'Chin Chin', description: 'Sweet fried Nigerian snack', category: 'appetizer', subcategory: 'nigerian', price: 1500, cost_price: 600, ingredients: ['flour', 'sugar', 'butter', 'eggs', 'nutmeg', 'oil'], prep_time_minutes: 45, cooking_time_minutes: 15, difficulty_level: 'medium', is_available: true, is_vegetarian: true, is_vegan: false, is_gluten_free: false, calories: 180, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '25', name: 'Puff Puff', description: 'Sweet Nigerian fried dough balls', category: 'appetizer', subcategory: 'nigerian', price: 1200, cost_price: 500, ingredients: ['flour', 'sugar', 'yeast', 'nutmeg', 'oil'], prep_time_minutes: 60, cooking_time_minutes: 10, difficulty_level: 'easy', is_available: true, is_vegetarian: true, is_vegan: true, is_gluten_free: false, calories: 150, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      
      // Main Courses
      { id: '4', name: 'Grilled Salmon', description: 'Fresh Atlantic salmon with lemon herb butter', category: 'main_course', subcategory: 'seafood', price: 28.99, cost_price: 15.50, ingredients: ['salmon fillet', 'lemon', 'herbs', 'butter', 'vegetables'], prep_time_minutes: 15, cooking_time_minutes: 20, difficulty_level: 'medium', is_available: true, is_vegetarian: false, is_vegan: false, is_gluten_free: true, calories: 450, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '5', name: 'Beef Tenderloin', description: 'Premium beef with red wine reduction', category: 'main_course', subcategory: 'beef', price: 42.99, cost_price: 25.00, ingredients: ['beef tenderloin', 'red wine', 'shallots', 'butter', 'herbs'], prep_time_minutes: 20, cooking_time_minutes: 25, difficulty_level: 'hard', is_available: true, is_vegetarian: false, is_vegan: false, is_gluten_free: true, calories: 650, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '6', name: 'Chicken Parmesan', description: 'Breaded chicken with marinara and mozzarella', category: 'main_course', subcategory: 'chicken', price: 24.99, cost_price: 12.00, ingredients: ['chicken breast', 'breadcrumbs', 'marinara sauce', 'mozzarella', 'pasta'], prep_time_minutes: 25, cooking_time_minutes: 30, difficulty_level: 'medium', is_available: true, is_vegetarian: false, is_vegan: false, is_gluten_free: false, calories: 580, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '7', name: 'Vegetarian Pasta', description: 'Fresh pasta with seasonal vegetables', category: 'main_course', subcategory: 'pasta', price: 19.99, cost_price: 8.50, ingredients: ['pasta', 'zucchini', 'bell peppers', 'tomatoes', 'olive oil', 'herbs'], prep_time_minutes: 15, cooking_time_minutes: 20, difficulty_level: 'easy', is_available: true, is_vegetarian: true, is_vegan: true, is_gluten_free: false, calories: 420, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      
      // Nigerian Main Courses
      { id: '26', name: 'Jollof Rice with Chicken', description: 'Nigerian spiced rice with grilled chicken', category: 'main_course', subcategory: 'nigerian', price: 4500, cost_price: 2200, ingredients: ['rice', 'tomatoes', 'onions', 'chicken', 'curry', 'thyme', 'bay leaves'], prep_time_minutes: 30, cooking_time_minutes: 45, difficulty_level: 'medium', is_available: true, is_vegetarian: false, is_vegan: false, is_gluten_free: true, calories: 650, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '27', name: 'Pounded Yam with Egusi Soup', description: 'Traditional pounded yam with melon seed soup', category: 'main_course', subcategory: 'nigerian', price: 5000, cost_price: 2500, ingredients: ['yam', 'egusi seeds', 'spinach', 'beef', 'stockfish', 'palm oil', 'onions'], prep_time_minutes: 45, cooking_time_minutes: 60, difficulty_level: 'hard', is_available: true, is_vegetarian: false, is_vegan: false, is_gluten_free: true, calories: 720, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '28', name: 'Fried Rice Nigerian Style', description: 'Nigerian fried rice with mixed vegetables and chicken', category: 'main_course', subcategory: 'nigerian', price: 4000, cost_price: 2000, ingredients: ['rice', 'chicken', 'carrots', 'green beans', 'green peas', 'curry', 'thyme'], prep_time_minutes: 25, cooking_time_minutes: 35, difficulty_level: 'medium', is_available: true, is_vegetarian: false, is_vegan: false, is_gluten_free: true, calories: 580, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '29', name: 'Amala with Ewedu and Gbegiri', description: 'Yam flour with vegetable soup and bean soup', category: 'main_course', subcategory: 'nigerian', price: 3800, cost_price: 1900, ingredients: ['yam flour', 'ewedu leaves', 'beans', 'locust beans', 'palm oil', 'beef'], prep_time_minutes: 40, cooking_time_minutes: 50, difficulty_level: 'hard', is_available: true, is_vegetarian: false, is_vegan: false, is_gluten_free: true, calories: 620, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '30', name: 'Ofada Rice with Ayamase Stew', description: 'Local rice with spicy green pepper stew', category: 'main_course', subcategory: 'nigerian', price: 4200, cost_price: 2100, ingredients: ['ofada rice', 'green peppers', 'locust beans', 'beef', 'ponmo', 'palm oil'], prep_time_minutes: 35, cooking_time_minutes: 40, difficulty_level: 'medium', is_available: true, is_vegetarian: false, is_vegan: false, is_gluten_free: true, calories: 680, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '31', name: 'Banga Rice', description: 'Palm nut rice with assorted meat', category: 'main_course', subcategory: 'nigerian', price: 4800, cost_price: 2400, ingredients: ['rice', 'palm nut', 'beef', 'dried fish', 'crayfish', 'scent leaves'], prep_time_minutes: 40, cooking_time_minutes: 55, difficulty_level: 'hard', is_available: true, is_vegetarian: false, is_vegan: false, is_gluten_free: true, calories: 700, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '32', name: 'Nkwobi', description: 'Spicy cow foot delicacy with palm wine sauce', category: 'main_course', subcategory: 'nigerian', price: 3500, cost_price: 1800, ingredients: ['cow foot', 'palm wine', 'potash', 'utazi leaves', 'onions', 'pepper'], prep_time_minutes: 30, cooking_time_minutes: 90, difficulty_level: 'hard', is_available: true, is_vegetarian: false, is_vegan: false, is_gluten_free: true, calories: 450, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      
      // Continental Main Courses
      { id: '33', name: 'Grilled Tilapia with Jollof Rice', description: 'Fresh tilapia grilled with Nigerian jollof rice', category: 'main_course', subcategory: 'continental', price: 5500, cost_price: 2800, ingredients: ['tilapia fish', 'rice', 'tomatoes', 'onions', 'spices'], prep_time_minutes: 25, cooking_time_minutes: 40, difficulty_level: 'medium', is_available: true, is_vegetarian: false, is_vegan: false, is_gluten_free: true, calories: 520, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '34', name: 'Chicken Shawarma', description: 'Grilled chicken wrap with vegetables and sauce', category: 'main_course', subcategory: 'continental', price: 2500, cost_price: 1200, ingredients: ['chicken', 'pita bread', 'cabbage', 'carrots', 'mayonnaise', 'ketchup'], prep_time_minutes: 15, cooking_time_minutes: 20, difficulty_level: 'easy', is_available: true, is_vegetarian: false, is_vegan: false, is_gluten_free: false, calories: 480, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '35', name: 'Beef Steak with Chips', description: 'Grilled beef steak with potato chips', category: 'main_course', subcategory: 'continental', price: 6500, cost_price: 3200, ingredients: ['beef steak', 'potatoes', 'black pepper', 'garlic', 'butter'], prep_time_minutes: 20, cooking_time_minutes: 25, difficulty_level: 'medium', is_available: true, is_vegetarian: false, is_vegan: false, is_gluten_free: true, calories: 750, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      
      // Desserts
      { id: '8', name: 'Chocolate Lava Cake', description: 'Warm chocolate cake with vanilla ice cream', category: 'dessert', subcategory: 'cake', price: 9.99, cost_price: 4.50, ingredients: ['dark chocolate', 'butter', 'eggs', 'flour', 'vanilla ice cream'], prep_time_minutes: 20, cooking_time_minutes: 15, difficulty_level: 'medium', is_available: true, is_vegetarian: true, is_vegan: false, is_gluten_free: false, calories: 520, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '9', name: 'Tiramisu', description: 'Classic Italian dessert with coffee and mascarpone', category: 'dessert', subcategory: 'italian', price: 8.99, cost_price: 4.00, ingredients: ['ladyfingers', 'coffee', 'mascarpone', 'eggs', 'cocoa powder'], prep_time_minutes: 30, cooking_time_minutes: 0, difficulty_level: 'medium', is_available: true, is_vegetarian: true, is_vegan: false, is_gluten_free: false, calories: 380, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '10', name: 'Fresh Fruit Tart', description: 'Seasonal fruits on pastry cream base', category: 'dessert', subcategory: 'fruit', price: 7.99, cost_price: 3.50, ingredients: ['pastry shell', 'pastry cream', 'mixed berries', 'kiwi', 'glaze'], prep_time_minutes: 25, cooking_time_minutes: 20, difficulty_level: 'medium', is_available: true, is_vegetarian: true, is_vegan: false, is_gluten_free: false, calories: 290, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      
      // Nigerian Desserts
      { id: '36', name: 'Boli with Groundnut', description: 'Roasted plantain with roasted groundnuts', category: 'dessert', subcategory: 'nigerian', price: 1800, cost_price: 800, ingredients: ['plantain', 'groundnuts', 'palm oil'], prep_time_minutes: 10, cooking_time_minutes: 20, difficulty_level: 'easy', is_available: true, is_vegetarian: true, is_vegan: true, is_gluten_free: true, calories: 220, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '37', name: 'Coconut Rice Pudding', description: 'Sweet coconut rice dessert', category: 'dessert', subcategory: 'nigerian', price: 2200, cost_price: 1000, ingredients: ['rice', 'coconut milk', 'sugar', 'cinnamon', 'raisins'], prep_time_minutes: 15, cooking_time_minutes: 30, difficulty_level: 'easy', is_available: true, is_vegetarian: true, is_vegan: true, is_gluten_free: true, calories: 280, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    ];

    // Comprehensive Menu Items - Beverages
    const beverageMenuItems = [
      // Cocktails
      { id: '11', name: 'Mojito', description: 'Classic Cuban cocktail with mint and lime', category: 'cocktail', subcategory: 'rum_based', price: 12.00, cost_price: 4.50, ingredients: ['white rum', 'mint leaves', 'lime juice', 'sugar', 'soda water'], prep_time_minutes: 5, difficulty_level: 'easy', is_available: true, is_vegetarian: true, is_vegan: true, is_gluten_free: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '12', name: 'Old Fashioned', description: 'Whiskey cocktail with bitters and orange', category: 'cocktail', subcategory: 'whiskey_based', price: 14.00, cost_price: 6.00, ingredients: ['bourbon whiskey', 'sugar', 'bitters', 'orange peel'], prep_time_minutes: 5, difficulty_level: 'easy', is_available: true, is_vegetarian: true, is_vegan: true, is_gluten_free: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '13', name: 'Margarita', description: 'Tequila cocktail with lime and triple sec', category: 'cocktail', subcategory: 'tequila_based', price: 13.00, cost_price: 5.50, ingredients: ['tequila', 'triple sec', 'lime juice', 'salt'], prep_time_minutes: 5, difficulty_level: 'easy', is_available: true, is_vegetarian: true, is_vegan: true, is_gluten_free: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      
      // Nigerian Cocktails and Local Drinks
      { id: '38', name: 'Palm Wine Cocktail', description: 'Fresh palm wine with ginger and lime', category: 'cocktail', subcategory: 'nigerian', price: 2500, cost_price: 1000, ingredients: ['palm wine', 'ginger', 'lime', 'honey'], prep_time_minutes: 5, difficulty_level: 'easy', is_available: true, is_vegetarian: true, is_vegan: true, is_gluten_free: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '39', name: 'Zobo Cocktail', description: 'Hibiscus drink with fruits and spices', category: 'cocktail', subcategory: 'nigerian', price: 2000, cost_price: 800, ingredients: ['hibiscus leaves', 'pineapple', 'cucumber', 'ginger', 'lemon'], prep_time_minutes: 10, difficulty_level: 'easy', is_available: true, is_vegetarian: true, is_vegan: true, is_gluten_free: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '40', name: 'Chapman', description: 'Nigerian fruit cocktail with grenadine', category: 'cocktail', subcategory: 'nigerian', price: 2800, cost_price: 1200, ingredients: ['fanta', 'sprite', 'grenadine', 'cucumber', 'orange', 'lemon'], prep_time_minutes: 8, difficulty_level: 'easy', is_available: true, is_vegetarian: true, is_vegan: true, is_gluten_free: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '41', name: 'Kunu Cocktail', description: 'Tiger nut drink with spices and fruits', category: 'cocktail', subcategory: 'nigerian', price: 2200, cost_price: 900, ingredients: ['tiger nuts', 'dates', 'ginger', 'coconut', 'milk'], prep_time_minutes: 15, difficulty_level: 'medium', is_available: true, is_vegetarian: true, is_vegan: false, is_gluten_free: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      
      // Wine
      { id: '14', name: 'Cabernet Sauvignon', description: 'Full-bodied red wine from Napa Valley', category: 'wine', subcategory: 'red_wine', price: 15.00, cost_price: 8.00, ingredients: ['cabernet sauvignon grapes'], is_available: true, is_vegetarian: true, is_vegan: true, is_gluten_free: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '15', name: 'Chardonnay', description: 'Crisp white wine with citrus notes', category: 'wine', subcategory: 'white_wine', price: 12.00, cost_price: 6.50, ingredients: ['chardonnay grapes'], is_available: true, is_vegetarian: true, is_vegan: true, is_gluten_free: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '16', name: 'Champagne', description: 'Premium sparkling wine for celebrations', category: 'wine', subcategory: 'sparkling', price: 25.00, cost_price: 15.00, ingredients: ['champagne grapes'], is_available: true, is_vegetarian: true, is_vegan: true, is_gluten_free: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      
      // Nigerian Wines and Local Alcoholic Drinks
      { id: '42', name: 'Palm Wine (Fresh)', description: 'Fresh tapped palm wine', category: 'wine', subcategory: 'nigerian', price: 1500, cost_price: 600, ingredients: ['palm wine'], is_available: true, is_vegetarian: true, is_vegan: true, is_gluten_free: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '43', name: 'Burukutu', description: 'Traditional fermented grain drink', category: 'wine', subcategory: 'nigerian', price: 1800, cost_price: 700, ingredients: ['guinea corn', 'millet', 'yeast'], is_available: true, is_vegetarian: true, is_vegan: true, is_gluten_free: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '44', name: 'Ogogoro', description: 'Local gin distilled from palm wine', category: 'spirits', subcategory: 'nigerian', price: 3000, cost_price: 1500, ingredients: ['distilled palm wine'], is_available: true, is_vegetarian: true, is_vegan: true, is_gluten_free: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      
      // Beer
      { id: '17', name: 'Craft IPA', description: 'Local India Pale Ale on tap', category: 'beer', subcategory: 'ipa', price: 6.00, cost_price: 2.50, ingredients: ['hops', 'malt', 'yeast', 'water'], is_available: true, is_vegetarian: true, is_vegan: true, is_gluten_free: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '18', name: 'Wheat Beer', description: 'Smooth wheat beer with citrus notes', category: 'beer', subcategory: 'wheat', price: 5.50, cost_price: 2.25, ingredients: ['wheat', 'hops', 'yeast', 'water'], is_available: true, is_vegetarian: true, is_vegan: true, is_gluten_free: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      
      // Nigerian Beers
      { id: '45', name: 'Star Lager', description: 'Premium Nigerian lager beer', category: 'beer', subcategory: 'nigerian', price: 800, cost_price: 400, ingredients: ['barley', 'hops', 'yeast', 'water'], is_available: true, is_vegetarian: true, is_vegan: true, is_gluten_free: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '46', name: 'Gulder', description: 'Nigerian premium lager beer', category: 'beer', subcategory: 'nigerian', price: 800, cost_price: 400, ingredients: ['barley', 'hops', 'yeast', 'water'], is_available: true, is_vegetarian: true, is_vegan: true, is_gluten_free: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '47', name: 'Heineken', description: 'International premium lager', category: 'beer', subcategory: 'international', price: 1000, cost_price: 500, ingredients: ['barley', 'hops', 'yeast', 'water'], is_available: true, is_vegetarian: true, is_vegan: true, is_gluten_free: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '48', name: 'Trophy Stout', description: 'Rich Nigerian stout beer', category: 'beer', subcategory: 'nigerian', price: 900, cost_price: 450, ingredients: ['barley', 'hops', 'yeast', 'water', 'roasted malt'], is_available: true, is_vegetarian: true, is_vegan: true, is_gluten_free: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      
      // Non-Alcoholic
      { id: '19', name: 'Fresh Orange Juice', description: 'Freshly squeezed orange juice', category: 'juice', subcategory: 'citrus', price: 4.00, cost_price: 1.50, ingredients: ['fresh oranges'], prep_time_minutes: 3, is_available: true, is_vegetarian: true, is_vegan: true, is_gluten_free: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '20', name: 'Espresso', description: 'Rich Italian espresso', category: 'coffee', subcategory: 'espresso', price: 3.50, cost_price: 1.00, ingredients: ['espresso beans'], prep_time_minutes: 2, is_available: true, is_vegetarian: true, is_vegan: true, is_gluten_free: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      
      // Nigerian Non-Alcoholic Drinks
      { id: '49', name: 'Zobo (Hibiscus Tea)', description: 'Refreshing hibiscus drink with fruits and spices', category: 'juice', subcategory: 'nigerian', price: 1500, cost_price: 600, ingredients: ['hibiscus leaves', 'pineapple', 'cucumber', 'ginger', 'watermelon'], prep_time_minutes: 20, is_available: true, is_vegetarian: true, is_vegan: true, is_gluten_free: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '50', name: 'Kunu Aya', description: 'Tiger nut milk drink', category: 'juice', subcategory: 'nigerian', price: 1800, cost_price: 700, ingredients: ['tiger nuts', 'dates', 'ginger', 'coconut'], prep_time_minutes: 30, is_available: true, is_vegetarian: true, is_vegan: true, is_gluten_free: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '51', name: 'Fura da Nono', description: 'Millet balls with fermented milk', category: 'juice', subcategory: 'nigerian', price: 2000, cost_price: 800, ingredients: ['millet', 'cow milk', 'ginger', 'cloves'], prep_time_minutes: 25, is_available: true, is_vegetarian: true, is_vegan: false, is_gluten_free: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '52', name: 'Sobolo', description: 'Ghanaian-style hibiscus drink popular in Nigeria', category: 'juice', subcategory: 'nigerian', price: 1600, cost_price: 650, ingredients: ['hibiscus leaves', 'ginger', 'pineapple', 'orange', 'cloves'], prep_time_minutes: 15, is_available: true, is_vegetarian: true, is_vegan: true, is_gluten_free: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '53', name: 'Fresh Coconut Water', description: 'Natural coconut water served fresh', category: 'juice', subcategory: 'nigerian', price: 1200, cost_price: 500, ingredients: ['fresh coconut'], prep_time_minutes: 5, is_available: true, is_vegetarian: true, is_vegan: true, is_gluten_free: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      
      // Nigerian Soft Drinks and Popular Beverages
      { id: '54', name: 'Fanta Orange', description: 'Popular orange soft drink', category: 'beverage', subcategory: 'soft_drink', price: 500, cost_price: 200, ingredients: ['carbonated water', 'orange flavor', 'sugar'], prep_time_minutes: 1, is_available: true, is_vegetarian: true, is_vegan: true, is_gluten_free: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '55', name: 'Sprite', description: 'Lemon-lime soft drink', category: 'beverage', subcategory: 'soft_drink', price: 500, cost_price: 200, ingredients: ['carbonated water', 'lemon-lime flavor', 'sugar'], prep_time_minutes: 1, is_available: true, is_vegetarian: true, is_vegan: true, is_gluten_free: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '56', name: 'Coca-Cola', description: 'Classic cola soft drink', category: 'beverage', subcategory: 'soft_drink', price: 500, cost_price: 200, ingredients: ['carbonated water', 'cola flavor', 'sugar'], prep_time_minutes: 1, is_available: true, is_vegetarian: true, is_vegan: true, is_gluten_free: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '57', name: 'Malt Drink (Malta Guinness)', description: 'Non-alcoholic malt beverage', category: 'beverage', subcategory: 'malt', price: 700, cost_price: 350, ingredients: ['malt extract', 'water', 'sugar', 'vitamins'], prep_time_minutes: 1, is_available: true, is_vegetarian: true, is_vegan: true, is_gluten_free: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      
      // Nigerian Spirits and Strong Drinks
      { id: '58', name: 'Hennessy VSOP', description: 'Premium cognac popular in Nigerian bars', category: 'spirits', subcategory: 'cognac', price: 15000, cost_price: 8000, ingredients: ['cognac'], is_available: true, is_vegetarian: true, is_vegan: true, is_gluten_free: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '59', name: 'Remy Martin', description: 'Premium French cognac', category: 'spirits', subcategory: 'cognac', price: 18000, cost_price: 10000, ingredients: ['cognac'], is_available: true, is_vegetarian: true, is_vegan: true, is_gluten_free: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '60', name: 'Johnnie Walker Black Label', description: 'Premium blended Scotch whisky', category: 'spirits', subcategory: 'whisky', price: 12000, cost_price: 6500, ingredients: ['blended scotch whisky'], is_available: true, is_vegetarian: true, is_vegan: true, is_gluten_free: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '61', name: 'Absolut Vodka', description: 'Premium Swedish vodka', category: 'spirits', subcategory: 'vodka', price: 8000, cost_price: 4200, ingredients: ['vodka'], is_available: true, is_vegetarian: true, is_vegan: true, is_gluten_free: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '62', name: 'Bacardi White Rum', description: 'Premium white rum for cocktails', category: 'spirits', subcategory: 'rum', price: 7500, cost_price: 4000, ingredients: ['white rum'], is_available: true, is_vegetarian: true, is_vegan: true, is_gluten_free: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    ];

    // Comprehensive Inventory
    const sampleInventory = [
      // Kitchen Ingredients
      { id: '1', item_name: 'Salmon Fillets', category: 'food', subcategory: 'seafood', current_stock: 25, minimum_stock: 10, maximum_stock: 50, unit: 'pieces', unit_cost: 15.99, total_value: 399.75, supplier: 'Ocean Fresh Seafood', supplier_contact: '+1-555-0101', storage_location: 'Walk-in Freezer A', expiry_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], last_restocked: new Date().toISOString(), reorder_point: 15, is_perishable: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '2', item_name: 'Beef Tenderloin', category: 'food', subcategory: 'meat', current_stock: 8, minimum_stock: 5, maximum_stock: 20, unit: 'kg', unit_cost: 32.50, total_value: 260.00, supplier: 'Premium Meats Co', supplier_contact: '+1-555-0102', storage_location: 'Walk-in Freezer B', expiry_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], last_restocked: new Date().toISOString(), reorder_point: 8, is_perishable: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '3', item_name: 'Romaine Lettuce', category: 'food', subcategory: 'vegetables', current_stock: 50, minimum_stock: 20, maximum_stock: 100, unit: 'heads', unit_cost: 2.99, total_value: 149.50, supplier: 'Fresh Farms Supply', supplier_contact: '+1-555-0103', storage_location: 'Walk-in Cooler', expiry_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], last_restocked: new Date().toISOString(), reorder_point: 30, is_perishable: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '11', item_name: 'Dark Chocolate', category: 'food', subcategory: 'baking', current_stock: 15, minimum_stock: 5, maximum_stock: 30, unit: 'kg', unit_cost: 12.50, total_value: 187.50, supplier: 'Premium Baking Supply', supplier_contact: '+1-555-0110', storage_location: 'Kitchen Pantry', expiry_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], last_restocked: new Date().toISOString(), reorder_point: 8, is_perishable: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '12', item_name: 'Butter', category: 'food', subcategory: 'dairy', current_stock: 20, minimum_stock: 8, maximum_stock: 40, unit: 'kg', unit_cost: 8.99, total_value: 179.80, supplier: 'Fresh Farms Supply', supplier_contact: '+1-555-0103', storage_location: 'Walk-in Cooler', expiry_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], last_restocked: new Date().toISOString(), reorder_point: 12, is_perishable: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '13', item_name: 'Fresh Herbs Mix', category: 'food', subcategory: 'herbs', current_stock: 30, minimum_stock: 10, maximum_stock: 60, unit: 'bunches', unit_cost: 3.50, total_value: 105.00, supplier: 'Fresh Farms Supply', supplier_contact: '+1-555-0103', storage_location: 'Walk-in Cooler', expiry_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], last_restocked: new Date().toISOString(), reorder_point: 15, is_perishable: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '14', item_name: 'Lemons', category: 'food', subcategory: 'citrus', current_stock: 40, minimum_stock: 15, maximum_stock: 80, unit: 'pieces', unit_cost: 0.75, total_value: 30.00, supplier: 'Fresh Farms Supply', supplier_contact: '+1-555-0103', storage_location: 'Walk-in Cooler', expiry_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], last_restocked: new Date().toISOString(), reorder_point: 20, is_perishable: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      
      // Bar Inventory
      { id: '4', item_name: 'White Rum', category: 'alcohol', subcategory: 'spirits', current_stock: 12, minimum_stock: 5, maximum_stock: 30, unit: 'bottles', unit_cost: 25.00, total_value: 300.00, supplier: 'Premium Spirits Co', supplier_contact: '+1-555-0104', storage_location: 'Bar Storage', last_restocked: new Date().toISOString(), reorder_point: 8, is_perishable: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '5', item_name: 'Bourbon Whiskey', category: 'alcohol', subcategory: 'spirits', current_stock: 6, minimum_stock: 3, maximum_stock: 15, unit: 'bottles', unit_cost: 45.00, total_value: 270.00, supplier: 'Premium Spirits Co', supplier_contact: '+1-555-0104', storage_location: 'Bar Storage', last_restocked: new Date().toISOString(), reorder_point: 5, is_perishable: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '6', item_name: 'Craft Beer Kegs', category: 'alcohol', subcategory: 'beer', current_stock: 4, minimum_stock: 2, maximum_stock: 10, unit: 'kegs', unit_cost: 85.00, total_value: 340.00, supplier: 'Local Brewery', supplier_contact: '+1-555-0105', storage_location: 'Beer Cooler', expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], last_restocked: new Date().toISOString(), reorder_point: 3, is_perishable: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      
      // Nigerian Bar Inventory
      { id: '19', name: 'Palm Wine (Fresh)', category: 'alcohol', subcategory: 'nigerian', current_stock: 20, minimum_stock: 8, maximum_stock: 40, unit: 'bottles', unit_cost: 600, total_value: 12000, supplier: 'Local Palm Wine Tappers', supplier_contact: '+234-803-123-4567', storage_location: 'Bar Cooler', expiry_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], last_restocked: new Date().toISOString(), reorder_point: 12, is_perishable: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '20', name: 'Star Lager Beer', category: 'alcohol', subcategory: 'nigerian', current_stock: 48, minimum_stock: 20, maximum_stock: 100, unit: 'bottles', unit_cost: 400, total_value: 19200, supplier: 'Nigerian Breweries', supplier_contact: '+234-801-234-5678', storage_location: 'Beer Cooler', expiry_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], last_restocked: new Date().toISOString(), reorder_point: 30, is_perishable: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '21', name: 'Hennessy VSOP', category: 'alcohol', subcategory: 'cognac', current_stock: 6, minimum_stock: 2, maximum_stock: 15, unit: 'bottles', unit_cost: 8000, total_value: 48000, supplier: 'Premium Spirits Nigeria', supplier_contact: '+234-802-345-6789', storage_location: 'Premium Spirits Cabinet', last_restocked: new Date().toISOString(), reorder_point: 4, is_perishable: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '22', name: 'Hibiscus Leaves (Zobo)', category: 'food', subcategory: 'herbs', current_stock: 15, minimum_stock: 5, maximum_stock: 30, unit: 'kg', unit_cost: 800, total_value: 12000, supplier: 'Spice Market Lagos', supplier_contact: '+234-805-456-7890', storage_location: 'Bar Dry Storage', expiry_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], last_restocked: new Date().toISOString(), reorder_point: 8, is_perishable: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '23', name: 'Tiger Nuts', category: 'food', subcategory: 'nuts', current_stock: 25, minimum_stock: 10, maximum_stock: 50, unit: 'kg', unit_cost: 1200, total_value: 30000, supplier: 'Northern Nigeria Suppliers', supplier_contact: '+234-806-567-8901', storage_location: 'Kitchen Dry Storage', expiry_date: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], last_restocked: new Date().toISOString(), reorder_point: 15, is_perishable: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '24', name: 'Suya Spice Mix', category: 'food', subcategory: 'spices', current_stock: 10, minimum_stock: 3, maximum_stock: 20, unit: 'kg', unit_cost: 2500, total_value: 25000, supplier: 'Kano Spice Merchants', supplier_contact: '+234-807-678-9012', storage_location: 'Kitchen Spice Rack', expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], last_restocked: new Date().toISOString(), reorder_point: 5, is_perishable: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '25', name: 'Yam Tubers', category: 'food', subcategory: 'vegetables', current_stock: 50, minimum_stock: 20, maximum_stock: 100, unit: 'tubers', unit_cost: 800, total_value: 40000, supplier: 'Benue Yam Farmers', supplier_contact: '+234-808-789-0123', storage_location: 'Kitchen Root Cellar', expiry_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], last_restocked: new Date().toISOString(), reorder_point: 30, is_perishable: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '26', name: 'Plantain (Unripe)', category: 'food', subcategory: 'vegetables', current_stock: 40, minimum_stock: 15, maximum_stock: 80, unit: 'bunches', unit_cost: 1500, total_value: 60000, supplier: 'Cross River Plantain Farm', supplier_contact: '+234-809-890-1234', storage_location: 'Kitchen Storage', expiry_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], last_restocked: new Date().toISOString(), reorder_point: 25, is_perishable: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '15', item_name: 'Mint Leaves', category: 'food', subcategory: 'herbs', current_stock: 25, minimum_stock: 10, maximum_stock: 50, unit: 'bunches', unit_cost: 2.50, total_value: 62.50, supplier: 'Fresh Farms Supply', supplier_contact: '+1-555-0103', storage_location: 'Bar Cooler', expiry_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], last_restocked: new Date().toISOString(), reorder_point: 15, is_perishable: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '16', item_name: 'Lime Juice', category: 'beverage', subcategory: 'mixers', current_stock: 18, minimum_stock: 8, maximum_stock: 35, unit: 'bottles', unit_cost: 4.50, total_value: 81.00, supplier: 'Bar Supplies Inc', supplier_contact: '+1-555-0111', storage_location: 'Bar Storage', expiry_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], last_restocked: new Date().toISOString(), reorder_point: 12, is_perishable: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '17', item_name: 'Simple Syrup', category: 'beverage', subcategory: 'mixers', current_stock: 22, minimum_stock: 10, maximum_stock: 40, unit: 'bottles', unit_cost: 3.25, total_value: 71.50, supplier: 'Bar Supplies Inc', supplier_contact: '+1-555-0111', storage_location: 'Bar Storage', expiry_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], last_restocked: new Date().toISOString(), reorder_point: 15, is_perishable: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '18', item_name: 'Soda Water', category: 'beverage', subcategory: 'mixers', current_stock: 35, minimum_stock: 15, maximum_stock: 70, unit: 'bottles', unit_cost: 1.50, total_value: 52.50, supplier: 'Bar Supplies Inc', supplier_contact: '+1-555-0111', storage_location: 'Bar Storage', expiry_date: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], last_restocked: new Date().toISOString(), reorder_point: 20, is_perishable: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      
      // Cleaning Supplies
      { id: '7', item_name: 'All-Purpose Cleaner', category: 'cleaning', subcategory: 'chemicals', current_stock: 45, minimum_stock: 15, maximum_stock: 100, unit: 'bottles', unit_cost: 4.99, total_value: 224.55, supplier: 'Cleaning Essentials', supplier_contact: '+1-555-0106', storage_location: 'Housekeeping Storage', last_restocked: new Date().toISOString(), reorder_point: 20, is_perishable: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '8', item_name: 'Toilet Paper', category: 'amenity', subcategory: 'bathroom', current_stock: 200, minimum_stock: 50, maximum_stock: 500, unit: 'rolls', unit_cost: 1.50, total_value: 300.00, supplier: 'Hotel Supplies Plus', supplier_contact: '+1-555-0107', storage_location: 'Housekeeping Storage', last_restocked: new Date().toISOString(), reorder_point: 75, is_perishable: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      
      // Kitchen Equipment
      { id: '9', item_name: 'Chef Knives', category: 'kitchen_equipment', subcategory: 'cutlery', current_stock: 15, minimum_stock: 10, maximum_stock: 25, unit: 'pieces', unit_cost: 45.00, total_value: 675.00, supplier: 'Professional Kitchen Supply', supplier_contact: '+1-555-0108', storage_location: 'Kitchen Storage', last_restocked: new Date().toISOString(), reorder_point: 12, is_perishable: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '10', item_name: 'Cocktail Shakers', category: 'bar_equipment', subcategory: 'tools', current_stock: 8, minimum_stock: 5, maximum_stock: 15, unit: 'pieces', unit_cost: 25.00, total_value: 200.00, supplier: 'Bar Equipment Pro', supplier_contact: '+1-555-0109', storage_location: 'Bar Storage', last_restocked: new Date().toISOString(), reorder_point: 6, is_perishable: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    ];

    // Sample Recipes
    const sampleRecipes = [
      {
        id: '1',
        name: 'Grilled Salmon with Herb Butter',
        description: 'Perfect grilled salmon with aromatic herb butter sauce',
        instructions: '1. Season salmon with salt and pepper\n2. Preheat grill to medium-high\n3. Grill salmon 6-8 minutes per side\n4. Prepare herb butter with parsley, dill, and lemon\n5. Serve immediately with vegetables',
        prep_time_minutes: 15,
        cooking_time_minutes: 20,
        servings: 4,
        difficulty_level: 'medium',
        ingredients: [
          { name: 'Salmon fillet', quantity: 4, unit: 'pieces', notes: '6oz each' },
          { name: 'Butter', quantity: 0.1, unit: 'kg', notes: 'room temperature' },
          { name: 'Fresh Herbs Mix', quantity: 2, unit: 'bunches', notes: 'parsley and dill mixed' },
          { name: 'Lemons', quantity: 2, unit: 'pieces', notes: 'for juice' },
        ],
        nutritional_info: { calories: 450, protein: 35, carbs: 2, fat: 32 },
        chef_notes: 'Do not overcook the salmon. Internal temperature should reach 145°F.',
        created_by: '4',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '2',
        name: 'Classic Mojito',
        description: 'Refreshing Cuban cocktail with mint and lime',
        instructions: '1. Muddle mint leaves gently in glass\n2. Add lime juice and simple syrup\n3. Fill glass with ice\n4. Add white rum\n5. Top with soda water\n6. Garnish with mint sprig',
        prep_time_minutes: 5,
        cooking_time_minutes: 0,
        servings: 1,
        difficulty_level: 'easy',
        ingredients: [
          { name: 'White rum', quantity: 60, unit: 'ml', notes: 'premium quality' },
          { name: 'Mint Leaves', quantity: 1, unit: 'bunches', notes: 'plus extra for garnish' },
          { name: 'Lime Juice', quantity: 0.03, unit: 'bottles', notes: 'freshly squeezed' },
          { name: 'Simple Syrup', quantity: 0.015, unit: 'bottles', notes: 'adjust to taste' },
          { name: 'Soda Water', quantity: 0.1, unit: 'bottles', notes: 'chilled' },
        ],
        chef_notes: 'Muddle mint gently to avoid bitterness. Use plenty of ice.',
        created_by: '5',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '3',
        name: 'Chocolate Lava Cake',
        description: 'Decadent warm chocolate cake with molten center',
        instructions: '1. Preheat oven to 425°F\n2. Melt chocolate and butter in double boiler\n3. Whisk in eggs and sugar\n4. Fold in flour\n5. Pour into ramekins\n6. Bake for 12-14 minutes\n7. Serve immediately',
        prep_time_minutes: 20,
        cooking_time_minutes: 15,
        servings: 4,
        difficulty_level: 'medium',
        ingredients: [
          { name: 'Dark Chocolate', quantity: 0.2, unit: 'kg', notes: 'high quality' },
          { name: 'Butter', quantity: 0.1, unit: 'kg', notes: 'unsalted' },
        ],
        nutritional_info: { calories: 520, protein: 8, carbs: 45, fat: 35 },
        chef_notes: 'The key is timing - do not overbake or the center will not be molten.',
        created_by: '4',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    // Sample Maintenance Requests
    const sampleMaintenanceRequests = [
      {
        id: '1',
        request_number: 'MR-2024-001',
        title: 'Air Conditioning Not Working',
        description: 'Room 102 AC unit not cooling properly. Guests complaining about temperature.',
        category: 'hvac',
        priority: 'high',
        status: 'pending',
        location: 'Room 102',
        room_id: '2',
        reported_by: '3',
        estimated_cost: 150.00,
        parts_needed: [
          { item: 'AC Filter', quantity: 1, cost: 25.00 },
          { item: 'Refrigerant', quantity: 2, cost: 50.00 }
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '2',
        request_number: 'MR-2024-002',
        title: 'Leaky Faucet in Presidential Suite',
        description: 'Bathroom faucet in room 401 has a persistent drip.',
        category: 'plumbing',
        priority: 'medium',
        status: 'assigned',
        location: 'Room 401 Bathroom',
        room_id: '8',
        reported_by: '3',
        assigned_to: 'maintenance-001',
        estimated_cost: 75.00,
        parts_needed: [
          { item: 'Faucet Cartridge', quantity: 1, cost: 35.00 }
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    // Sample Transactions
    const sampleTransactions = [
      // Revenue transactions
      {
        id: '1',
        transaction_number: 'TXN-2024-001',
        type: 'income',
        category: 'room_revenue',
        amount: 540.00,
        description: 'Room booking payment - John Smith',
        reference_id: 'booking-001',
        payment_method: 'card',
        transaction_date: new Date().toISOString().split('T')[0],
        processed_by: '3',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '2',
        transaction_number: 'TXN-2024-002',
        type: 'income',
        category: 'food_beverage',
        amount: 85.50,
        description: 'Restaurant order - Table 5',
        reference_id: 'order-001',
        payment_method: 'cash',
        transaction_date: new Date().toISOString().split('T')[0],
        processed_by: '4',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      // Expense transactions
      {
        id: '3',
        transaction_number: 'TXN-2024-003',
        type: 'expense',
        category: 'supplies',
        amount: 450.00,
        description: 'Fresh seafood delivery',
        payment_method: 'bank_transfer',
        transaction_date: new Date().toISOString().split('T')[0],
        processed_by: '2',
        approved_by: '2',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    // Pool Sessions
    const samplePoolSessions = [
      {
        id: '1',
        session_date: new Date().toISOString().split('T')[0],
        start_time: '06:00',
        end_time: '22:00',
        current_occupancy: 12,
        max_capacity: 50,
        temperature: 26,
        ph_level: 7.2,
        chlorine_level: 1.5,
        status: 'open',
        lifeguard_on_duty: 'pool-staff-001',
        notes: 'Regular maintenance completed this morning',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    // Insert all data
    this.data.profiles = sampleProfiles;
    this.data.rooms = sampleRooms;
    this.data.halls = sampleHalls;
    this.data.menu_items = [...foodMenuItems, ...beverageMenuItems];
    this.data.recipes = sampleRecipes;
    this.data.inventory = sampleInventory;
    this.data.maintenance_requests = sampleMaintenanceRequests;
    this.data.transactions = sampleTransactions;
    this.data.pool_sessions = samplePoolSessions;

    // Initialize empty arrays for other tables
    this.data.bookings = [];
    this.data.hall_bookings = [];
    this.data.orders = [];
    this.data.analytics_data = [];
    this.data.staff_schedules = [];
    this.data.suppliers = [];
    this.data.customers = [];
  }

  async save() {
    try {
      console.log('💾 SAVING DATABASE TO ASYNCSTORAGE...');
      console.log('Database summary before save:', {
        profiles: this.data.profiles?.length || 0,
        rooms: this.data.rooms?.length || 0,
        bookings: this.data.bookings?.length || 0,
        menu_items: this.data.menu_items?.length || 0,
        inventory: this.data.inventory?.length || 0,
      });
      
      await AsyncStorage.setItem('hotel_database', JSON.stringify(this.data));
      
      // Verify the save
      const savedData = await AsyncStorage.getItem('hotel_database');
      const parsedData = savedData ? JSON.parse(savedData) : null;
      
      console.log('✅ DATABASE SAVED SUCCESSFULLY');
      console.log('Verification - saved data summary:', {
        profiles: parsedData?.profiles?.length || 0,
        rooms: parsedData?.rooms?.length || 0,
        bookings: parsedData?.bookings?.length || 0,
        menu_items: parsedData?.menu_items?.length || 0,
        inventory: parsedData?.inventory?.length || 0,
      });
      
    } catch (error) {
      console.error('❌ FAILED TO SAVE DATABASE:', error);
      throw new Error(`Database save failed: ${error.message}`);
    }
  }

  // Generic CRUD operations
  async select<T>(table: string, filters?: any): Promise<T[]> {
    try {
      await this.initialize();
    } catch (error) {
      console.error('Database not initialized for select:', error);
      throw new Error('Database not available. Please refresh the page.');
    }
    
    let results = this.data[table] || [];
    
    if (filters) {
      results = results.filter(item => {
        return Object.keys(filters).every(key => {
          if (Array.isArray(filters[key])) {
            return filters[key].includes(item[key]);
          }
          if (typeof filters[key] === 'object' && filters[key] !== null) {
            if ('gte' in filters[key]) return item[key] >= filters[key].gte;
            if ('lte' in filters[key]) return item[key] <= filters[key].lte;
            if ('like' in filters[key]) return item[key].toLowerCase().includes(filters[key].like.toLowerCase());
          }
          return item[key] === filters[key];
        });
      });
    }
    
    return results;
  }

  async insert<T>(table: string, data: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<T> {
    try {
      await this.initialize();
    } catch (error) {
      console.error('Database not initialized for insert:', error);
      throw new Error('Database not available. Please refresh the page.');
    }
    
    console.log(`📝 INSERTING INTO ${table.toUpperCase()}:`);
    console.log('Data to insert:', JSON.stringify(data, null, 2));
    
    // Validate data before insertion
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid data provided for insertion');
    }
    
    const newItem = {
      ...data,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as T;

    console.log('Generated item with ID:', (newItem as any).id);
    
    if (!this.data[table]) {
      console.log(`Creating new table: ${table}`);
      this.data[table] = [];
    }
    
    console.log(`Table ${table} before insert:`, this.data[table].length, 'items');
    this.data[table].push(newItem);
    console.log(`Table ${table} after insert:`, this.data[table].length, 'items');
    
    console.log('✅ Item successfully added to memory');
    
    console.log('💾 Saving to AsyncStorage...');
    await this.save();
    console.log('✅ Database saved to AsyncStorage');
    
    // Verify the save worked
    const verification = await this.select(table, { id: (newItem as any).id });
    console.log('🔍 Verification check:', verification.length > 0 ? 'SUCCESS' : 'FAILED');
    
    return newItem;
  }

  async update<T>(table: string, id: string, updates: Partial<T>): Promise<T | null> {
    try {
      await this.initialize();
    } catch (error) {
      console.error('Database not initialized for update:', error);
      throw new Error('Database not available. Please refresh the page.');
    }
    
    console.log(`Updating ${table} item ${id}:`, updates);
    
    // Validate inputs
    if (!id || !updates || typeof updates !== 'object') {
      throw new Error('Invalid parameters for update operation');
    }
    
    const items = this.data[table] || [];
    const index = items.findIndex(item => item.id === id);
    
    if (index === -1) {
      console.error(`Item with ID ${id} not found in table ${table}`);
      throw new Error(`Item not found in ${table}`);
    }
    
    const updatedItem = {
      ...items[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    
    this.data[table][index] = updatedItem;
    
    console.log(`Updated item:`, updatedItem);
    
    await this.save();
    
    return updatedItem;
  }

  async delete(table: string, id: string): Promise<boolean> {
    try {
      await this.initialize();
    } catch (error) {
      console.error('Database not initialized for delete:', error);
      throw new Error('Database not available. Please refresh the page.');
    }
    
    // Validate inputs
    if (!id) {
      throw new Error('ID is required for delete operation');
    }
    
    const items = this.data[table] || [];
    const index = items.findIndex(item => item.id === id);
    
    if (index === -1) {
      throw new Error(`Item with ID ${id} not found in ${table}`);
    }
    
    this.data[table].splice(index, 1);
    await this.save();
    
    return true;
  }

  // Specialized hotel management queries
  async getDashboardStats(): Promise<any> {
    const rooms = await this.select('rooms');
    const bookings = await this.select('bookings');
    const orders = await this.select('orders');
    const transactions = await this.select('transactions');
    const inventory = await this.select('inventory');
    const maintenanceRequests = await this.select('maintenance_requests');
    const hallBookings = await this.select('hall_bookings');
    
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = today.substring(0, 7);
    
    return {
      totalRooms: rooms.length,
      occupiedRooms: rooms.filter(r => r.status === 'occupied').length,
      availableRooms: rooms.filter(r => r.status === 'available').length,
      maintenanceRooms: rooms.filter(r => r.status === 'maintenance').length,
      todayCheckIns: bookings.filter(b => b.check_in === today && b.booking_status === 'confirmed').length,
      todayCheckOuts: bookings.filter(b => b.check_out === today && b.booking_status === 'checked_in').length,
      pendingOrders: orders.filter(o => ['pending', 'confirmed', 'preparing'].includes(o.status)).length,
      lowStockItems: inventory.filter(i => i.current_stock <= i.minimum_stock).length,
      pendingMaintenance: maintenanceRequests.filter(m => m.status === 'pending').length,
      todayHallBookings: hallBookings.filter(h => h.start_datetime.startsWith(today)).length,
      todayRevenue: transactions
        .filter(t => t.type === 'income' && t.transaction_date === today)
        .reduce((sum, t) => sum + t.amount, 0),
      monthlyRevenue: transactions
        .filter(t => t.type === 'income' && t.transaction_date.startsWith(thisMonth))
        .reduce((sum, t) => sum + t.amount, 0),
      monthlyExpenses: transactions
        .filter(t => t.type === 'expense' && t.transaction_date.startsWith(thisMonth))
        .reduce((sum, t) => sum + t.amount, 0),
    };
  }

  async getAvailableRooms(checkIn: string, checkOut: string): Promise<any[]> {
    const rooms = await this.select('rooms', { status: 'available' });
    const bookings = await this.select('bookings');
    
    return rooms.filter(room => {
      const roomBookings = bookings.filter(booking => 
        booking.room_id === room.id && 
        booking.booking_status !== 'cancelled' &&
        booking.booking_status !== 'checked_out'
      );
      
      return !roomBookings.some(booking => {
        const bookingStart = new Date(booking.check_in);
        const bookingEnd = new Date(booking.check_out);
        const requestStart = new Date(checkIn);
        const requestEnd = new Date(checkOut);
        
        return (requestStart < bookingEnd && requestEnd > bookingStart);
      });
    });
  }

  async getFinancialSummary(period: 'today' | 'week' | 'month' | 'year'): Promise<any> {
    const transactions = await this.select('transactions');
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
    }

    const periodTransactions = transactions.filter(t => 
      new Date(t.transaction_date) >= startDate
    );

    const income = periodTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = periodTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const roomRevenue = periodTransactions
      .filter(t => t.type === 'income' && t.category === 'room_revenue')
      .reduce((sum, t) => sum + t.amount, 0);

    const foodBeverageRevenue = periodTransactions
      .filter(t => t.type === 'income' && t.category === 'food_beverage')
      .reduce((sum, t) => sum + t.amount, 0);

    const hallRevenue = periodTransactions
      .filter(t => t.type === 'income' && t.category === 'hall_revenue')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      totalIncome: income,
      totalExpenses: expenses,
      netProfit: income - expenses,
      roomRevenue,
      foodBeverageRevenue,
      hallRevenue,
      otherRevenue: income - roomRevenue - foodBeverageRevenue - hallRevenue,
    };
  }

  // Backup and restore
  async exportData(): Promise<string> {
    await this.initialize();
    return JSON.stringify(this.data, null, 2);
  }

  async importData(jsonData: string): Promise<void> {
    try {
      const importedData = JSON.parse(jsonData);
      this.data = importedData;
      await this.save();
      console.log('Data imported successfully');
    } catch (error) {
      console.error('Failed to import data:', error);
      throw new Error('Invalid data format');
    }
  }
}

export const db = LocalDatabase.getInstance();