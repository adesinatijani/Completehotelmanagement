import { db } from './database';
import { Database } from '@/types/database';

type MenuItem = Database['public']['Tables']['menu_items']['Row'];

export class SampleDataLoader {
  private static instance: SampleDataLoader;
  private isLoaded = false;

  static getInstance(): SampleDataLoader {
    if (!SampleDataLoader.instance) {
      SampleDataLoader.instance = new SampleDataLoader();
    }
    return SampleDataLoader.instance;
  }

  async loadSampleMenuData(): Promise<void> {
    if (this.isLoaded) {
      console.log('Sample data already loaded, skipping...');
      return;
    }

    try {
      console.log('🔄 Loading sample menu data for POS systems...');
      
      // Check if menu items already exist
      const existingItems = await db.select<MenuItem>('menu_items');
      if (existingItems.length > 0) {
        console.log('✅ Menu items already exist, skipping sample data load');
        this.isLoaded = true;
        return;
      }

      // Restaurant Menu Items
      const restaurantItems = [
        // Appetizers
        {
          name: 'Caesar Salad',
          description: 'Fresh romaine lettuce with parmesan cheese, croutons, and caesar dressing',
          category: 'appetizer' as const,
          subcategory: 'salads',
          price: 12.99,
          cost_price: 6.50,
          ingredients: ['romaine lettuce', 'parmesan cheese', 'croutons', 'caesar dressing', 'anchovies'],
          allergens: ['dairy', 'gluten', 'fish'],
          prep_time_minutes: 10,
          cooking_time_minutes: 0,
          difficulty_level: 'easy' as const,
          is_available: true,
          is_vegetarian: false,
          is_vegan: false,
          is_gluten_free: false,
          calories: 280,
        },
        {
          name: 'Bruschetta Trio',
          description: 'Three varieties of toasted bread with tomato, mozzarella, and basil',
          category: 'appetizer' as const,
          subcategory: 'bread',
          price: 14.99,
          cost_price: 7.25,
          ingredients: ['bread', 'tomatoes', 'mozzarella', 'basil', 'olive oil', 'garlic'],
          allergens: ['gluten', 'dairy'],
          prep_time_minutes: 15,
          cooking_time_minutes: 5,
          difficulty_level: 'easy' as const,
          is_available: true,
          is_vegetarian: true,
          is_vegan: false,
          is_gluten_free: false,
          calories: 320,
        },
        {
          name: 'Shrimp Cocktail',
          description: 'Chilled jumbo shrimp with cocktail sauce and lemon',
          category: 'appetizer' as const,
          subcategory: 'seafood',
          price: 18.99,
          cost_price: 12.50,
          ingredients: ['jumbo shrimp', 'cocktail sauce', 'lemon', 'lettuce'],
          allergens: ['shellfish'],
          prep_time_minutes: 20,
          cooking_time_minutes: 10,
          difficulty_level: 'medium' as const,
          is_available: true,
          is_vegetarian: false,
          is_vegan: false,
          is_gluten_free: true,
          calories: 180,
        },

        // Main Courses
        {
          name: 'Grilled Salmon',
          description: 'Fresh Atlantic salmon with lemon herb butter and seasonal vegetables',
          category: 'main_course' as const,
          subcategory: 'seafood',
          price: 28.99,
          cost_price: 15.50,
          ingredients: ['salmon fillet', 'lemon', 'herbs', 'butter', 'seasonal vegetables'],
          allergens: ['fish', 'dairy'],
          prep_time_minutes: 15,
          cooking_time_minutes: 20,
          difficulty_level: 'medium' as const,
          is_available: true,
          is_vegetarian: false,
          is_vegan: false,
          is_gluten_free: true,
          calories: 450,
        },
        {
          name: 'Beef Tenderloin',
          description: 'Premium beef tenderloin with red wine reduction and roasted potatoes',
          category: 'main_course' as const,
          subcategory: 'beef',
          price: 42.99,
          cost_price: 22.50,
          ingredients: ['beef tenderloin', 'red wine', 'shallots', 'butter', 'potatoes', 'herbs'],
          allergens: ['dairy'],
          prep_time_minutes: 20,
          cooking_time_minutes: 25,
          difficulty_level: 'hard' as const,
          is_available: true,
          is_vegetarian: false,
          is_vegan: false,
          is_gluten_free: true,
          calories: 650,
        },
        {
          name: 'Chicken Parmesan',
          description: 'Breaded chicken breast with marinara sauce and melted mozzarella',
          category: 'main_course' as const,
          subcategory: 'chicken',
          price: 24.99,
          cost_price: 12.75,
          ingredients: ['chicken breast', 'breadcrumbs', 'marinara sauce', 'mozzarella', 'parmesan'],
          allergens: ['gluten', 'dairy', 'eggs'],
          prep_time_minutes: 15,
          cooking_time_minutes: 25,
          difficulty_level: 'medium' as const,
          is_available: true,
          is_vegetarian: false,
          is_vegan: false,
          is_gluten_free: false,
          calories: 580,
        },
        {
          name: 'Vegetarian Pasta',
          description: 'Penne pasta with roasted vegetables and herb cream sauce',
          category: 'main_course' as const,
          subcategory: 'pasta',
          price: 19.99,
          cost_price: 8.50,
          ingredients: ['penne pasta', 'zucchini', 'bell peppers', 'mushrooms', 'cream', 'herbs'],
          allergens: ['gluten', 'dairy'],
          prep_time_minutes: 10,
          cooking_time_minutes: 15,
          difficulty_level: 'easy' as const,
          is_available: true,
          is_vegetarian: true,
          is_vegan: false,
          is_gluten_free: false,
          calories: 420,
        },

        // Desserts
        {
          name: 'Chocolate Lava Cake',
          description: 'Warm chocolate cake with molten center and vanilla ice cream',
          category: 'dessert' as const,
          subcategory: 'chocolate',
          price: 9.99,
          cost_price: 4.25,
          ingredients: ['dark chocolate', 'butter', 'eggs', 'flour', 'sugar', 'vanilla ice cream'],
          allergens: ['gluten', 'dairy', 'eggs'],
          prep_time_minutes: 15,
          cooking_time_minutes: 12,
          difficulty_level: 'medium' as const,
          is_available: true,
          is_vegetarian: true,
          is_vegan: false,
          is_gluten_free: false,
          calories: 480,
        },
        {
          name: 'Tiramisu',
          description: 'Classic Italian dessert with coffee-soaked ladyfingers and mascarpone',
          category: 'dessert' as const,
          subcategory: 'italian',
          price: 8.99,
          cost_price: 4.50,
          ingredients: ['ladyfingers', 'espresso', 'mascarpone', 'eggs', 'cocoa powder', 'sugar'],
          allergens: ['gluten', 'dairy', 'eggs'],
          prep_time_minutes: 30,
          cooking_time_minutes: 0,
          difficulty_level: 'medium' as const,
          is_available: true,
          is_vegetarian: true,
          is_vegan: false,
          is_gluten_free: false,
          calories: 380,
        },
        {
          name: 'Fresh Berry Tart',
          description: 'Pastry shell filled with vanilla custard and fresh seasonal berries',
          category: 'dessert' as const,
          subcategory: 'pastry',
          price: 7.99,
          cost_price: 3.75,
          ingredients: ['pastry shell', 'vanilla custard', 'strawberries', 'blueberries', 'raspberries'],
          allergens: ['gluten', 'dairy', 'eggs'],
          prep_time_minutes: 20,
          cooking_time_minutes: 0,
          difficulty_level: 'easy' as const,
          is_available: true,
          is_vegetarian: true,
          is_vegan: false,
          is_gluten_free: false,
          calories: 290,
        },

        // Beverages (Non-alcoholic for restaurant)
        {
          name: 'Fresh Orange Juice',
          description: 'Freshly squeezed orange juice served chilled',
          category: 'beverage' as const,
          subcategory: 'juice',
          price: 4.99,
          cost_price: 1.50,
          ingredients: ['fresh oranges'],
          allergens: [],
          prep_time_minutes: 3,
          cooking_time_minutes: 0,
          difficulty_level: 'easy' as const,
          is_available: true,
          is_vegetarian: true,
          is_vegan: true,
          is_gluten_free: true,
          calories: 110,
        },
        {
          name: 'Iced Tea',
          description: 'House-brewed iced tea with lemon',
          category: 'beverage' as const,
          subcategory: 'tea',
          price: 3.99,
          cost_price: 0.75,
          ingredients: ['black tea', 'lemon', 'ice'],
          allergens: [],
          prep_time_minutes: 2,
          cooking_time_minutes: 0,
          difficulty_level: 'easy' as const,
          is_available: true,
          is_vegetarian: true,
          is_vegan: true,
          is_gluten_free: true,
          calories: 25,
        },
        {
          name: 'Sparkling Water',
          description: 'Premium sparkling water with lime',
          category: 'beverage' as const,
          subcategory: 'water',
          price: 3.49,
          cost_price: 1.00,
          ingredients: ['sparkling water', 'lime'],
          allergens: [],
          prep_time_minutes: 1,
          cooking_time_minutes: 0,
          difficulty_level: 'easy' as const,
          is_available: true,
          is_vegetarian: true,
          is_vegan: true,
          is_gluten_free: true,
          calories: 0,
        },
      ];

      // Bar Menu Items
      const barItems = [
        // Wine
        {
          name: 'Cabernet Sauvignon',
          description: 'Full-bodied red wine from Napa Valley with rich berry flavors',
          category: 'wine' as const,
          subcategory: 'red_wine',
          price: 15.00,
          cost_price: 8.00,
          ingredients: ['cabernet sauvignon grapes'],
          allergens: ['sulfites'],
          prep_time_minutes: 2,
          cooking_time_minutes: 0,
          difficulty_level: 'easy' as const,
          is_available: true,
          is_vegetarian: true,
          is_vegan: true,
          is_gluten_free: true,
          calories: 125,
        },
        {
          name: 'Pinot Grigio',
          description: 'Crisp Italian white wine with citrus notes',
          category: 'wine' as const,
          subcategory: 'white_wine',
          price: 12.00,
          cost_price: 6.50,
          ingredients: ['pinot grigio grapes'],
          allergens: ['sulfites'],
          prep_time_minutes: 2,
          cooking_time_minutes: 0,
          difficulty_level: 'easy' as const,
          is_available: true,
          is_vegetarian: true,
          is_vegan: true,
          is_gluten_free: true,
          calories: 120,
        },
        {
          name: 'Champagne',
          description: 'Premium French champagne for special occasions',
          category: 'wine' as const,
          subcategory: 'sparkling',
          price: 25.00,
          cost_price: 15.00,
          ingredients: ['champagne grapes'],
          allergens: ['sulfites'],
          prep_time_minutes: 3,
          cooking_time_minutes: 0,
          difficulty_level: 'easy' as const,
          is_available: true,
          is_vegetarian: true,
          is_vegan: true,
          is_gluten_free: true,
          calories: 130,
        },

        // Beer
        {
          name: 'Craft IPA',
          description: 'Local craft India Pale Ale with hoppy flavor',
          category: 'beer' as const,
          subcategory: 'ipa',
          price: 6.99,
          cost_price: 3.50,
          ingredients: ['hops', 'malt', 'yeast', 'water'],
          allergens: ['gluten'],
          prep_time_minutes: 2,
          cooking_time_minutes: 0,
          difficulty_level: 'easy' as const,
          is_available: true,
          is_vegetarian: true,
          is_vegan: true,
          is_gluten_free: false,
          calories: 180,
        },
        {
          name: 'Wheat Beer',
          description: 'Smooth wheat beer with citrus notes',
          category: 'beer' as const,
          subcategory: 'wheat',
          price: 5.99,
          cost_price: 3.00,
          ingredients: ['wheat', 'hops', 'yeast', 'water'],
          allergens: ['gluten'],
          prep_time_minutes: 2,
          cooking_time_minutes: 0,
          difficulty_level: 'easy' as const,
          is_available: true,
          is_vegetarian: true,
          is_vegan: true,
          is_gluten_free: false,
          calories: 160,
        },
        {
          name: 'Lager',
          description: 'Classic crisp lager beer',
          category: 'beer' as const,
          subcategory: 'lager',
          price: 4.99,
          cost_price: 2.50,
          ingredients: ['malt', 'hops', 'yeast', 'water'],
          allergens: ['gluten'],
          prep_time_minutes: 2,
          cooking_time_minutes: 0,
          difficulty_level: 'easy' as const,
          is_available: true,
          is_vegetarian: true,
          is_vegan: true,
          is_gluten_free: false,
          calories: 150,
        },

        // Cocktails
        {
          name: 'Classic Mojito',
          description: 'Refreshing Cuban cocktail with white rum, mint, and lime',
          category: 'cocktail' as const,
          subcategory: 'rum_based',
          price: 12.00,
          cost_price: 4.50,
          ingredients: ['white rum', 'mint leaves', 'lime juice', 'sugar', 'soda water'],
          allergens: [],
          prep_time_minutes: 5,
          cooking_time_minutes: 0,
          difficulty_level: 'easy' as const,
          is_available: true,
          is_vegetarian: true,
          is_vegan: true,
          is_gluten_free: true,
          calories: 150,
        },
        {
          name: 'Old Fashioned',
          description: 'Classic whiskey cocktail with bitters and orange peel',
          category: 'cocktail' as const,
          subcategory: 'whiskey_based',
          price: 14.00,
          cost_price: 6.00,
          ingredients: ['bourbon whiskey', 'sugar', 'angostura bitters', 'orange peel'],
          allergens: [],
          prep_time_minutes: 5,
          cooking_time_minutes: 0,
          difficulty_level: 'medium' as const,
          is_available: true,
          is_vegetarian: true,
          is_vegan: true,
          is_gluten_free: true,
          calories: 180,
        },
        {
          name: 'Margarita',
          description: 'Classic tequila cocktail with lime and triple sec',
          category: 'cocktail' as const,
          subcategory: 'tequila_based',
          price: 11.00,
          cost_price: 4.25,
          ingredients: ['tequila', 'lime juice', 'triple sec', 'salt'],
          allergens: [],
          prep_time_minutes: 4,
          cooking_time_minutes: 0,
          difficulty_level: 'easy' as const,
          is_available: true,
          is_vegetarian: true,
          is_vegan: true,
          is_gluten_free: true,
          calories: 160,
        },
        {
          name: 'Cosmopolitan',
          description: 'Elegant vodka cocktail with cranberry and lime',
          category: 'cocktail' as const,
          subcategory: 'vodka_based',
          price: 13.00,
          cost_price: 5.50,
          ingredients: ['vodka', 'cranberry juice', 'lime juice', 'triple sec'],
          allergens: [],
          prep_time_minutes: 4,
          cooking_time_minutes: 0,
          difficulty_level: 'easy' as const,
          is_available: true,
          is_vegetarian: true,
          is_vegan: true,
          is_gluten_free: true,
          calories: 140,
        },
        {
          name: 'Manhattan',
          description: 'Classic whiskey cocktail with sweet vermouth and cherry',
          category: 'cocktail' as const,
          subcategory: 'whiskey_based',
          price: 15.00,
          cost_price: 7.00,
          ingredients: ['rye whiskey', 'sweet vermouth', 'angostura bitters', 'maraschino cherry'],
          allergens: [],
          prep_time_minutes: 4,
          cooking_time_minutes: 0,
          difficulty_level: 'medium' as const,
          is_available: true,
          is_vegetarian: true,
          is_vegan: true,
          is_gluten_free: true,
          calories: 170,
        },

        // Spirits
        {
          name: 'Premium Whiskey',
          description: 'Single malt Scotch whiskey, neat or on the rocks',
          category: 'spirits' as const,
          subcategory: 'whiskey',
          price: 18.00,
          cost_price: 10.00,
          ingredients: ['single malt whiskey'],
          allergens: [],
          prep_time_minutes: 2,
          cooking_time_minutes: 0,
          difficulty_level: 'easy' as const,
          is_available: true,
          is_vegetarian: true,
          is_vegan: true,
          is_gluten_free: true,
          calories: 105,
        },
        {
          name: 'Premium Vodka',
          description: 'Top-shelf vodka served neat or on the rocks',
          category: 'spirits' as const,
          subcategory: 'vodka',
          price: 16.00,
          cost_price: 8.50,
          ingredients: ['premium vodka'],
          allergens: [],
          prep_time_minutes: 2,
          cooking_time_minutes: 0,
          difficulty_level: 'easy' as const,
          is_available: true,
          is_vegetarian: true,
          is_vegan: true,
          is_gluten_free: true,
          calories: 97,
        },
        {
          name: 'Aged Rum',
          description: 'Premium aged rum from the Caribbean',
          category: 'spirits' as const,
          subcategory: 'rum',
          price: 17.00,
          cost_price: 9.00,
          ingredients: ['aged rum'],
          allergens: [],
          prep_time_minutes: 2,
          cooking_time_minutes: 0,
          difficulty_level: 'easy' as const,
          is_available: true,
          is_vegetarian: true,
          is_vegan: true,
          is_gluten_free: true,
          calories: 100,
        },

        // Non-alcoholic beverages for bar
        {
          name: 'Virgin Mojito',
          description: 'Refreshing non-alcoholic mojito with mint and lime',
          category: 'beverage' as const,
          subcategory: 'mocktail',
          price: 6.99,
          cost_price: 2.50,
          ingredients: ['mint leaves', 'lime juice', 'sugar', 'soda water'],
          allergens: [],
          prep_time_minutes: 4,
          cooking_time_minutes: 0,
          difficulty_level: 'easy' as const,
          is_available: true,
          is_vegetarian: true,
          is_vegan: true,
          is_gluten_free: true,
          calories: 45,
        },
        {
          name: 'Espresso',
          description: 'Rich Italian espresso coffee',
          category: 'coffee' as const,
          subcategory: 'espresso',
          price: 3.99,
          cost_price: 1.25,
          ingredients: ['espresso beans'],
          allergens: [],
          prep_time_minutes: 3,
          cooking_time_minutes: 0,
          difficulty_level: 'easy' as const,
          is_available: true,
          is_vegetarian: true,
          is_vegan: true,
          is_gluten_free: true,
          calories: 5,
        },
        {
          name: 'Green Tea',
          description: 'Premium green tea served hot or iced',
          category: 'tea' as const,
          subcategory: 'green',
          price: 3.49,
          cost_price: 0.75,
          ingredients: ['green tea leaves'],
          allergens: [],
          prep_time_minutes: 5,
          cooking_time_minutes: 0,
          difficulty_level: 'easy' as const,
          is_available: true,
          is_vegetarian: true,
          is_vegan: true,
          is_gluten_free: true,
          calories: 2,
        },
        {
          name: 'Premium Water',
          description: 'Still or sparkling premium water',
          category: 'water' as const,
          subcategory: 'premium',
          price: 2.99,
          cost_price: 1.00,
          ingredients: ['premium water'],
          allergens: [],
          prep_time_minutes: 1,
          cooking_time_minutes: 0,
          difficulty_level: 'easy' as const,
          is_available: true,
          is_vegetarian: true,
          is_vegan: true,
          is_gluten_free: true,
          calories: 0,
        },
      ];

      // Combine all menu items
      const allMenuItems = [...restaurantItems, ...barItems];

      console.log(`📊 Inserting ${allMenuItems.length} menu items...`);

      // Insert menu items in batches to avoid overwhelming the database
      const batchSize = 5;
      let inserted = 0;

      for (let i = 0; i < allMenuItems.length; i += batchSize) {
        const batch = allMenuItems.slice(i, i + batchSize);
        
        for (const item of batch) {
          try {
            await db.insert<MenuItem>('menu_items', item);
            inserted++;
            console.log(`✅ Inserted: ${item.name} (${item.category})`);
          } catch (error) {
            console.warn(`⚠️ Failed to insert ${item.name}:`, error);
          }
        }
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log(`✅ Sample menu data loaded successfully! Inserted ${inserted} items.`);
      console.log('📊 Menu breakdown:');
      console.log(`  - Restaurant items: ${restaurantItems.length}`);
      console.log(`  - Bar items: ${barItems.length}`);
      console.log(`  - Total items: ${allMenuItems.length}`);

      this.isLoaded = true;

    } catch (error) {
      console.error('❌ Error loading sample menu data:', error);
      throw error;
    }
  }

  async loadSampleInventoryData(): Promise<void> {
    try {
      console.log('🔄 Loading sample inventory data...');
      
      // Check if inventory items already exist
      const existingInventory = await db.select('inventory');
      if (existingInventory.length > 0) {
        console.log('✅ Inventory items already exist, skipping sample data load');
        return;
      }

      const inventoryItems = [
        // Kitchen ingredients
        {
          item_name: 'Salmon Fillets',
          category: 'food' as const,
          subcategory: 'seafood',
          current_stock: 25,
          minimum_stock: 10,
          maximum_stock: 50,
          unit: 'pieces',
          unit_cost: 15.99,
          total_value: 399.75,
          supplier: 'Ocean Fresh Seafood',
          supplier_contact: '+1-555-0101',
          storage_location: 'Walk-in Freezer A',
          expiry_date: '2024-02-15',
          batch_number: 'SF240201',
          last_restocked: new Date().toISOString(),
          reorder_point: 10,
          is_perishable: true,
          barcode: '1234567890123',
        },
        {
          item_name: 'Beef Tenderloin',
          category: 'food' as const,
          subcategory: 'meat',
          current_stock: 8,
          minimum_stock: 5,
          maximum_stock: 20,
          unit: 'pieces',
          unit_cost: 32.50,
          total_value: 260.00,
          supplier: 'Premium Meats Co',
          supplier_contact: '+1-555-0102',
          storage_location: 'Walk-in Freezer B',
          expiry_date: '2024-02-10',
          batch_number: 'BT240201',
          last_restocked: new Date().toISOString(),
          reorder_point: 5,
          is_perishable: true,
          barcode: '2345678901234',
        },
        {
          item_name: 'Romaine Lettuce',
          category: 'food' as const,
          subcategory: 'vegetables',
          current_stock: 50,
          minimum_stock: 20,
          maximum_stock: 100,
          unit: 'heads',
          unit_cost: 2.99,
          total_value: 149.50,
          supplier: 'Fresh Farms Supply',
          supplier_contact: '+1-555-0103',
          storage_location: 'Walk-in Cooler',
          expiry_date: '2024-01-20',
          batch_number: 'RL240115',
          last_restocked: new Date().toISOString(),
          reorder_point: 20,
          is_perishable: true,
          barcode: '3456789012345',
        },

        // Bar ingredients
        {
          item_name: 'White Rum',
          category: 'alcohol' as const,
          subcategory: 'spirits',
          current_stock: 12,
          minimum_stock: 5,
          maximum_stock: 30,
          unit: 'bottles',
          unit_cost: 25.00,
          total_value: 300.00,
          supplier: 'Premium Spirits Co',
          supplier_contact: '+1-555-0104',
          storage_location: 'Bar Storage',
          expiry_date: '',
          batch_number: 'WR240101',
          last_restocked: new Date().toISOString(),
          reorder_point: 5,
          is_perishable: false,
          barcode: '4567890123456',
        },
        {
          item_name: 'Mint Leaves',
          category: 'food' as const,
          subcategory: 'herbs',
          current_stock: 25,
          minimum_stock: 10,
          maximum_stock: 50,
          unit: 'bunches',
          unit_cost: 2.50,
          total_value: 62.50,
          supplier: 'Fresh Farms Supply',
          supplier_contact: '+1-555-0103',
          storage_location: 'Bar Cooler',
          expiry_date: '2024-01-18',
          batch_number: 'ML240115',
          last_restocked: new Date().toISOString(),
          reorder_point: 10,
          is_perishable: true,
          barcode: '5678901234567',
        },
        {
          item_name: 'Lime Juice',
          category: 'beverage' as const,
          subcategory: 'mixers',
          current_stock: 15,
          minimum_stock: 8,
          maximum_stock: 30,
          unit: 'bottles',
          unit_cost: 4.99,
          total_value: 74.85,
          supplier: 'Bar Mixers Inc',
          supplier_contact: '+1-555-0105',
          storage_location: 'Bar Storage',
          expiry_date: '2024-03-01',
          batch_number: 'LJ240201',
          last_restocked: new Date().toISOString(),
          reorder_point: 8,
          is_perishable: true,
          barcode: '6789012345678',
        },
      ];

      console.log(`📦 Inserting ${inventoryItems.length} inventory items...`);

      for (const item of inventoryItems) {
        try {
          await db.insert('inventory', item);
          console.log(`✅ Inserted inventory: ${item.item_name}`);
        } catch (error) {
          console.warn(`⚠️ Failed to insert ${item.item_name}:`, error);
        }
      }

      console.log('✅ Sample inventory data loaded successfully!');

    } catch (error) {
      console.error('❌ Error loading sample inventory data:', error);
      throw error;
    }
  }

  async initializeAllSampleData(): Promise<void> {
    try {
      console.log('🚀 Initializing all sample data...');
      
      await this.loadSampleMenuData();
      await this.loadSampleInventoryData();
      
      console.log('🎉 All sample data initialized successfully!');
      
    } catch (error) {
      console.error('❌ Error initializing sample data:', error);
      throw error;
    }
  }
}

export const sampleDataLoader = SampleDataLoader.getInstance();