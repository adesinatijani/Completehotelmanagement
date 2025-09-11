import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthContext } from '@/contexts/AuthContext';
import { db } from '@/lib/database';
import { Database } from '@/types/database';
import { loadHotelSettings } from '@/lib/storage';
import { currencyManager } from '@/lib/currency';
import { 
  Search, 
  CreditCard, 
  DollarSign, 
  Users, 
  Receipt,
  Save,
  ChefHat
} from 'lucide-react-native';

type MenuItem = Database['public']['Tables']['menu_items']['Row'];

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  specialInstructions?: string;
}

const { width, height } = Dimensions.get('window');

export default function Restaurant() {
  const { user } = useAuthContext();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentGuest, setCurrentGuest] = useState(1);
  const [totalGuests] = useState(3);
  const [serverName] = useState('WALDO T');
  const [hotelSettings, setHotelSettings] = useState<any>(null);
  const [receiptOption, setReceiptOption] = useState<'no_receipt' | 'print' | 'email'>('no_receipt');
  const [savedOrders, setSavedOrders] = useState<CartItem[][]>([]);

  useEffect(() => {
    loadData();
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await loadHotelSettings();
      setHotelSettings(settings);
      if (settings?.currency) {
        currencyManager.setCurrency(settings.currency);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      await db.initialize();
      const menuData = await db.select<MenuItem>('menu_items', {
        filters: { is_available: true }
      });
      
      const restaurantItems = menuData.filter(item => 
        ['appetizer', 'main_course', 'dessert', 'beverage'].includes(item.category)
      );
      
      setMenuItems(restaurantItems);
    } catch (error) {
      console.error('Error loading menu items:', error);
      Alert.alert('Error', 'Failed to load menu items. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = useCallback((menuItem: MenuItem) => {
    if (isProcessing) return;
    
    console.log('🛒 Adding to cart:', menuItem.name);
    
    setCart(prevCart => {
      const existingIndex = prevCart.findIndex(item => item.menuItem.id === menuItem.id);
      
      if (existingIndex >= 0) {
        const newCart = [...prevCart];
        newCart[existingIndex].quantity += 1;
        console.log('✅ Updated quantity for existing item:', newCart[existingIndex]);
        return newCart;
      } else {
        const newItem = { menuItem, quantity: 1 };
        console.log('✅ Added new item to cart:', newItem);
        return [...prevCart, newItem];
      }
    });
  }, [isProcessing]);

  const updateQuantity = useCallback((menuItemId: string, newQuantity: number) => {
    if (isProcessing) return;
    
    if (newQuantity <= 0) {
      setCart(prevCart => prevCart.filter(item => item.menuItem.id !== menuItemId));
    } else if (newQuantity <= 99) {
      setCart(prevCart => 
        prevCart.map(item => 
          item.menuItem.id === menuItemId 
            ? { ...item, quantity: newQuantity }
            : item
        )
      );
    }
  }, [isProcessing]);

  const calculateTotals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0);
    const taxRate = (hotelSettings?.taxRate || 8.5) / 100;
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    return { subtotal, tax, total };
  }, [cart, hotelSettings]);

  const formatCurrency = useCallback((amount: number) => {
    try {
      return currencyManager.formatAmount(amount, hotelSettings?.currency);
    } catch (error) {
      return `$${amount.toFixed(2)}`;
    }
  }, [hotelSettings]);

  const processOrder = useCallback(async (paymentMethod: string) => {
    console.log('🔄 Processing order with payment method:', paymentMethod);
    
    if (isProcessing) {
      console.log('⏳ Already processing, ignoring request');
      return;
    }
    
    if (cart.length === 0) {
      Alert.alert('Order Error', 'Please add items to cart before placing order');
      return;
    }

    setIsProcessing(true);

    try {
      // Calculate order totals
      const totals = calculateTotals;
      
      console.log('💰 Order totals:', totals);
      
      // Create order items
      const orderItems = cart.map(item => ({
        menu_item_id: item.menuItem.id,
        quantity: item.quantity,
        unit_price: item.menuItem.price,
        special_instructions: item.specialInstructions || '',
      }));

      // Generate order number
      const orderNumber = `R-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      console.log('📋 Creating order:', orderNumber, 'with', orderItems.length, 'items');
      
      // Create order in database
      const orderData = {
        order_number: orderNumber,
        table_number: `Guest ${currentGuest}`,
        order_type: 'restaurant' as const,
        items: orderItems,
        subtotal: totals.subtotal,
        tax_amount: totals.tax,
        service_charge: 0,
        total_amount: totals.total,
        status: 'confirmed' as const,
        payment_status: paymentMethod === 'SETTLE' ? 'pending' as const : 'paid' as const,
        payment_method: paymentMethod.toLowerCase(),
      };
      
      const order = await db.insert('orders', orderData);
      
      console.log('✅ Order created successfully:', order);

      // Handle receipt option
      if (receiptOption === 'print') {
        Alert.alert('Receipt', `Receipt for order ${orderNumber} would be printed`);
      } else if (receiptOption === 'email') {
        Alert.alert('Receipt', `Receipt for order ${orderNumber} would be emailed to guest`);
      }

      Alert.alert(
        'Order Placed Successfully!', 
        `Order Number: ${orderNumber}\nItems: ${cart.length}\nTotal: ${formatCurrency(totals.total)}\nPayment: ${paymentMethod}\n\nOrder sent to kitchen!`,
        [{ text: 'OK' }]
      );
      
      // Clear cart and move to next guest
      setCart([]);
      if (currentGuest < totalGuests) {
        setCurrentGuest(currentGuest + 1);
      }
      
    } catch (error) {
      console.error('Error processing order:', error);
      Alert.alert('Error', `Failed to process order: ${error.message || error}. Please try again.`);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, cart, calculateTotals, receiptOption, currentGuest, totalGuests, formatCurrency]);

  const saveOrder = useCallback(() => {
    console.log('💾 Saving order for Guest', currentGuest);
    
    if (cart.length === 0) {
      Alert.alert('Info', 'No items to save');
      return;
    }
    
    setSavedOrders(prev => [...prev, [...cart]]);
    Alert.alert(
      'Order Saved!', 
      `Guest ${currentGuest} order saved successfully!\n\nItems saved: ${cart.length}\nTotal value: ${formatCurrency(calculateTotals.total)}\n\nUse RECALL button to restore this order later.`,
      [
        { text: 'Keep Working', style: 'cancel' },
        { 
          text: 'Clear Cart', 
          onPress: () => setCart([])
        }
      ]
    );
  }, [cart, currentGuest, calculateTotals, formatCurrency]);

  const recallOrder = useCallback(() => {
    console.log('📥 Recalling saved order');
    
    if (savedOrders.length === 0) {
      Alert.alert('Info', 'No saved orders to recall');
      return;
    }
    
    Alert.alert(
      'Recall Order',
      `Found ${savedOrders.length} saved order${savedOrders.length !== 1 ? 's' : ''}!\n\nRecall the most recent order?\nItems: ${savedOrders[savedOrders.length - 1].length}\n\nThis will replace your current cart.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Recall', 
          onPress: () => {
            const lastSavedOrder = savedOrders[savedOrders.length - 1];
            setCart(lastSavedOrder);
            setSavedOrders(prev => prev.slice(0, -1));
            Alert.alert('Order Recalled!', `Successfully restored order!\n\nItems restored: ${lastSavedOrder.length}\nYou can now modify or place this order.`);
          }
        }
      ]
    );
  }, [savedOrders]);

  const toggleReceiptOption = useCallback(() => {
    console.log('🧾 Toggling receipt option from:', receiptOption);
    
    const options: Array<'no_receipt' | 'print' | 'email'> = ['no_receipt', 'print', 'email'];
    const currentIndex = options.indexOf(receiptOption);
    const nextIndex = (currentIndex + 1) % options.length;
    const newOption = options[nextIndex];
    
    setReceiptOption(newOption);
    
    console.log('✅ Receipt option changed to:', newOption);
    
    const optionText = newOption === 'no_receipt' ? 'NO RECEIPT' : 
                     newOption === 'print' ? 'PRINT RECEIPT' : 'EMAIL RECEIPT';
    Alert.alert('Receipt Option Changed', `Receipt option is now: ${optionText}`);
  }, [receiptOption]);

  const getReceiptButtonText = () => {
    switch (receiptOption) {
      case 'no_receipt': return 'NO RECEIPT';
      case 'print': return 'PRINT RECEIPT';
      case 'email': return 'EMAIL RECEIPT';
    }
  };
  
  const cancelOrder = useCallback(() => {
    console.log('❌ Cancelling order');
    
    if (cart.length === 0) return;
    
    Alert.alert(
      'Cancel Order',
      `Cancel current order?\n\nThis will remove all ${cart.length} items from your cart.\nTotal value: ${formatCurrency(calculateTotals.total)}\n\nThis action cannot be undone.`,
      [
        { text: 'Keep Order', style: 'cancel' },
        { 
          text: 'Cancel Order', 
          style: 'destructive',
          onPress: () => {
            setCart([]);
            Alert.alert('Order Cancelled', 'All items have been removed from the cart');
          }
        }
      ]
    );
  }, [cart, calculateTotals, formatCurrency]);


  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.appName}>foodiv</Text>
          <Text style={styles.orderType}>NEW DINE-IN ORDER</Text>
          <Text style={styles.serverInfo}>SERVER: {serverName}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.searchButton}
            onPress={() => Alert.alert('Search', 'Search functionality would open here')}
          >
            <Search size={20} color="white" />
            <Text style={styles.searchButtonText}>SEARCH</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.mainContent}>
        {/* Left Panel - Order Management */}
        <View style={styles.leftPanel}>
          {/* Guest Selector */}
          <View style={styles.guestSelector}>
            <Text style={styles.guestTitle}>GUEST {currentGuest} OF {totalGuests}</Text>
            <View style={styles.guestControls}>
              <TouchableOpacity 
                style={styles.guestButton}
                onPress={() => setCurrentGuest(Math.max(1, currentGuest - 1))}
              >
                <Text style={styles.guestButtonText}>◀</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.guestButton}
                onPress={() => setCurrentGuest(Math.min(totalGuests, currentGuest + 1))}
              >
                <Text style={styles.guestButtonText}>▶</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Order Items */}
          <ScrollView style={styles.orderItemsContainer}>
            <View style={styles.guestSection}>
              <View style={styles.guestHeader}>
                <Text style={styles.guestLabel}>GUEST {currentGuest}</Text>
              </View>
              
              {cart.map((item, index) => (
                <View key={`${item.menuItem.id}-${index}`} style={styles.orderItem}>
                  <View style={styles.orderItemLeft}>
                    <TouchableOpacity 
                      style={styles.playButton}
                      onPress={() => Alert.alert('Item Options', `Options for ${item.menuItem.name}`)}
                    >
                      <Text style={styles.playButtonText}>▶</Text>
                    </TouchableOpacity>
                    <Text style={styles.orderItemNumber}>{index + 1}</Text>
                  </View>
                  <View style={styles.orderItemCenter}>
                    <Text style={styles.orderItemName}>{item.menuItem.name}</Text>
                    <Text style={styles.orderItemDetails}>
                      Qty: {item.quantity} × {formatCurrency(item.menuItem.price)}
                    </Text>
                  </View>
                  <View style={styles.orderItemRight}>
                    <TouchableOpacity 
                      style={styles.quantityButton}
                      onPress={() => updateQuantity(item.menuItem.id, item.quantity - 1)}
                    >
                      <Text style={styles.quantityButtonText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.quantityText}>{item.quantity}</Text>
                    <TouchableOpacity 
                      style={styles.quantityButton}
                      onPress={() => updateQuantity(item.menuItem.id, item.quantity + 1)}
                    >
                      <Text style={styles.quantityButtonText}>+</Text>
                    </TouchableOpacity>
                    <Text style={styles.orderItemPrice}>
                      {formatCurrency(item.menuItem.price * item.quantity)}
                    </Text>
                  </View>
                </View>
              ))}
              
              {cart.length === 0 && (
                <View style={styles.emptyCart}>
                  <Text style={styles.emptyCartText}>No items in cart</Text>
                  <Text style={styles.emptyCartSubtext}>Click menu items to add</Text>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Order Total */}
          <View style={styles.orderTotal}>
            <Text style={styles.totalAmount}>{formatCurrency(calculateTotals.total)}</Text>
            <Text style={styles.taxAmount}>TAX {formatCurrency(calculateTotals.tax)}</Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionButton} onPress={toggleReceiptOption}>
              <Receipt size={20} color="#64748b" />
              <Text style={styles.actionButtonText}>{getReceiptButtonText()}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={saveOrder}>
              <Save size={20} color="#64748b" />
              <Text style={styles.actionButtonText}>SAVE</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, styles.orderButton]}
              onPress={() => processOrder('CASH')}
              disabled={cart.length === 0 || isProcessing}
            >
              <ChefHat size={20} color="white" />
              <Text style={[styles.actionButtonText, styles.orderButtonText]}>
                {isProcessing ? 'PROCESSING...' : 'ORDER'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Payment Buttons */}
          <View style={styles.paymentButtons}>
            <TouchableOpacity 
              style={styles.paymentButton}
              onPress={() => processOrder('CASH')}
              disabled={cart.length === 0 || isProcessing}
            >
              <DollarSign size={20} color="white" />
              <Text style={styles.paymentButtonText}>CASH</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.paymentButton}
              onPress={() => processOrder('CREDIT')}
              disabled={cart.length === 0 || isProcessing}
            >
              <CreditCard size={20} color="white" />
              <Text style={styles.paymentButtonText}>CREDIT</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.paymentButton}
              onPress={() => processOrder('SETTLE')}
              disabled={cart.length === 0 || isProcessing}
            >
              <Users size={20} color="white" />
              <Text style={styles.paymentButtonText}>SETTLE</Text>
            </TouchableOpacity>
          </View>

          {/* Bottom Actions */}
          <View style={styles.bottomActions}>
            <TouchableOpacity style={styles.bottomButton} onPress={recallOrder}>
              <Text style={styles.bottomButtonText}>RECALL</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.bottomButton} 
              onPress={() => {
                Alert.alert(
                  'Logout',
                  'Are you sure you want to logout?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Logout', onPress: () => Alert.alert('Logged Out', 'You have been logged out') }
                  ]
                );
              }}
            >
              <Text style={styles.bottomButtonText}>LOGOUT</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.bottomButton} onPress={cancelOrder}>
              <Text style={styles.bottomButtonText}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Right Panel - Menu Categories */}
        <View style={styles.rightPanel}>
          <View style={styles.menuGrid}>
            {/* Food Categories */}
            <TouchableOpacity 
              style={[styles.menuCategory, styles.meatballSub]}
              onPress={() => addToCart({
                id: 'meatball-sub',
                name: 'MEATBALL SUB',
                price: 12.99,
                cost_price: 6.50,
                category: 'main_course',
                subcategory: 'subs',
                description: 'Italian meatballs with marinara sauce',
                is_available: true,
                ingredients: ['meatballs', 'marinara sauce', 'sub roll', 'cheese'],
                prep_time_minutes: 15,
                cooking_time_minutes: 10,
                difficulty_level: 'easy',
                is_vegetarian: false,
                is_vegan: false,
                is_gluten_free: false,
                calories: 580,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              } as MenuItem)}
            >
              <Text style={styles.menuCategoryText}>MEATBALL SUB</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.menuCategory, styles.steakSub]}
              onPress={() => addToCart({
                id: 'steak-sub',
                name: 'STEAK SUB',
                price: 15.99,
                cost_price: 8.50,
                category: 'main_course',
                subcategory: 'subs',
                description: 'Grilled steak with peppers and onions',
                is_available: true,
                ingredients: ['steak', 'peppers', 'onions', 'sub roll'],
                prep_time_minutes: 20,
                cooking_time_minutes: 15,
                difficulty_level: 'medium',
                is_vegetarian: false,
                is_vegan: false,
                is_gluten_free: false,
                calories: 650,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              } as MenuItem)}
            >
              <Text style={styles.menuCategoryText}>STEAK SUB</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.menuCategory, styles.steakHogie]}
              onPress={() => addToCart({
                id: 'steak-hogie',
                name: 'STEAK HOGIE',
                price: 14.99,
                cost_price: 7.50,
                category: 'main_course',
                subcategory: 'hoagies',
                description: 'Philadelphia style steak hoagie',
                is_available: true,
                ingredients: ['steak', 'cheese', 'hoagie roll', 'onions'],
                prep_time_minutes: 18,
                cooking_time_minutes: 12,
                difficulty_level: 'medium',
                is_vegetarian: false,
                is_vegan: false,
                is_gluten_free: false,
                calories: 620,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              } as MenuItem)}
            >
              <Text style={styles.menuCategoryText}>STEAK HOGIE</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.menuCategory, styles.italianSausage]}
              onPress={() => addToCart({
                id: 'italian-sausage',
                name: 'ITALIAN SAUSAGE SUB',
                price: 13.99,
                cost_price: 7.00,
                category: 'main_course',
                subcategory: 'subs',
                description: 'Spicy Italian sausage with peppers',
                is_available: true,
                ingredients: ['italian sausage', 'peppers', 'sub roll', 'sauce'],
                prep_time_minutes: 16,
                cooking_time_minutes: 14,
                difficulty_level: 'easy',
                is_vegetarian: false,
                is_vegan: false,
                is_gluten_free: false,
                calories: 590,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              } as MenuItem)}
            >
              <Text style={styles.menuCategoryText}>ITALIAN SAUSAGE SUB</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.menuCategory, styles.pizzaSub]}
              onPress={() => addToCart({
                id: 'pizza-sub',
                name: 'PIZZA SUB',
                price: 11.99,
                cost_price: 5.50,
                category: 'main_course',
                subcategory: 'subs',
                description: 'Pizza sauce, cheese, and pepperoni',
                is_available: true,
                ingredients: ['pizza sauce', 'cheese', 'pepperoni', 'sub roll'],
                prep_time_minutes: 12,
                cooking_time_minutes: 10,
                difficulty_level: 'easy',
                is_vegetarian: false,
                is_vegan: false,
                is_gluten_free: false,
                calories: 520,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              } as MenuItem)}
            >
              <Text style={styles.menuCategoryText}>PIZZA SUB</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.menuCategory, styles.chickenBreast]}
              onPress={() => addToCart({
                id: 'chicken-breast',
                name: 'CHICKEN BREAST',
                price: 16.99,
                cost_price: 9.00,
                category: 'main_course',
                subcategory: 'chicken',
                description: 'Grilled chicken breast with herbs',
                is_available: true,
                ingredients: ['chicken breast', 'herbs', 'seasoning'],
                prep_time_minutes: 20,
                cooking_time_minutes: 25,
                difficulty_level: 'medium',
                is_vegetarian: false,
                is_vegan: false,
                is_gluten_free: true,
                calories: 450,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              } as MenuItem)}
            >
              <Text style={styles.menuCategoryText}>CHICKEN BREAST</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.menuCategory, styles.roastBbq]}
              onPress={() => addToCart({
                id: 'roast-bbq',
                name: 'ROAST BBQ CHICKEN',
                price: 18.99,
                cost_price: 10.50,
                category: 'main_course',
                subcategory: 'chicken',
                description: 'BBQ roasted chicken with sauce',
                is_available: true,
                ingredients: ['whole chicken', 'bbq sauce', 'spices'],
                prep_time_minutes: 30,
                cooking_time_minutes: 45,
                difficulty_level: 'medium',
                is_vegetarian: false,
                is_vegan: false,
                is_gluten_free: true,
                calories: 680,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              } as MenuItem)}
            >
              <Text style={styles.menuCategoryText}>ROAST BBQ CHICKEN</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.menuCategory, styles.hamSub]}
              onPress={() => addToCart({
                id: 'ham-sub',
                name: 'HAM SUB',
                price: 10.99,
                cost_price: 5.00,
                category: 'main_course',
                subcategory: 'subs',
                description: 'Honey ham with lettuce and tomato',
                is_available: true,
                ingredients: ['honey ham', 'lettuce', 'tomato', 'sub roll'],
                prep_time_minutes: 8,
                cooking_time_minutes: 5,
                difficulty_level: 'easy',
                is_vegetarian: false,
                is_vegan: false,
                is_gluten_free: false,
                calories: 420,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              } as MenuItem)}
            >
              <Text style={styles.menuCategoryText}>HAM SUB</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.menuCategory, styles.tunaSub]}
              onPress={() => addToCart({
                id: 'tuna-sub',
                name: 'TUNA SUB',
                price: 12.99,
                cost_price: 6.50,
                category: 'main_course',
                subcategory: 'subs',
                description: 'Fresh tuna salad with vegetables',
                is_available: true,
                ingredients: ['tuna', 'vegetables', 'mayo', 'sub roll'],
                prep_time_minutes: 10,
                cooking_time_minutes: 0,
                difficulty_level: 'easy',
                is_vegetarian: false,
                is_vegan: false,
                is_gluten_free: false,
                calories: 480,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              } as MenuItem)}
            >
              <Text style={styles.menuCategoryText}>TUNA SUB</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.menuCategory, styles.turkeySub]}
              onPress={() => addToCart({
                id: 'turkey-sub',
                name: 'TURKEY SUB',
                price: 11.99,
                cost_price: 5.50,
                category: 'main_course',
                subcategory: 'subs',
                description: 'Roasted turkey with cranberry sauce',
                is_available: true,
                ingredients: ['turkey', 'cranberry sauce', 'lettuce', 'sub roll'],
                prep_time_minutes: 10,
                cooking_time_minutes: 5,
                difficulty_level: 'easy',
                is_vegetarian: false,
                is_vegan: false,
                is_gluten_free: false,
                calories: 450,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              } as MenuItem)}
            >
              <Text style={styles.menuCategoryText}>TURKEY SUB</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.menuCategory, styles.bltSub]}
              onPress={() => addToCart({
                id: 'blt-sub',
                name: 'BLT SUB',
                price: 9.99,
                cost_price: 4.50,
                category: 'main_course',
                subcategory: 'subs',
                description: 'Bacon, lettuce, and tomato classic',
                is_available: true,
                ingredients: ['bacon', 'lettuce', 'tomato', 'sub roll'],
                prep_time_minutes: 8,
                cooking_time_minutes: 8,
                difficulty_level: 'easy',
                is_vegetarian: false,
                is_vegan: false,
                is_gluten_free: false,
                calories: 380,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              } as MenuItem)}
            >
              <Text style={styles.menuCategoryText}>BLT SUB</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2c3e50',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#34495e',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerLeft: {
    flex: 1,
  },
  appName: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: 'white',
  },
  orderType: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#bdc3c7',
    marginTop: 2,
  },
  serverInfo: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#95a5a6',
    marginTop: 2,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3498db',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  searchButtonText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
  },
  leftPanel: {
    width: 350,
    backgroundColor: '#ecf0f1',
    borderRightWidth: 2,
    borderRightColor: '#bdc3c7',
  },
  rightPanel: {
    flex: 1,
    backgroundColor: '#2c3e50',
    padding: 20,
  },
  guestSelector: {
    backgroundColor: '#3498db',
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  guestTitle: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  guestControls: {
    flexDirection: 'row',
    gap: 8,
  },
  guestButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  guestButtonText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Inter-Bold',
  },
  orderItemsContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  guestSection: {
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  guestHeader: {
    backgroundColor: '#34495e',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  guestLabel: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  orderItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: 60,
  },
  playButton: {
    backgroundColor: '#27ae60',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonText: {
    color: 'white',
    fontSize: 10,
    fontFamily: 'Inter-Bold',
  },
  orderItemNumber: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#2c3e50',
  },
  orderItemCenter: {
    flex: 1,
    marginLeft: 12,
  },
  orderItemName: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#2c3e50',
  },
  orderItemDetails: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#7f8c8d',
    marginTop: 2,
  },
  orderItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityButton: {
    backgroundColor: '#3498db',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  quantityText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#2c3e50',
    minWidth: 20,
    textAlign: 'center',
  },
  priceButton: {
    padding: 4,
  },
  orderItemPrice: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#2c3e50',
    minWidth: 60,
    textAlign: 'right',
  },
  emptyCart: {
    padding: 40,
    alignItems: 'center',
  },
  emptyCartText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#7f8c8d',
  },
  emptyCartSubtext: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#95a5a6',
    marginTop: 4,
  },
  orderTotal: {
    backgroundColor: 'white',
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderTopWidth: 2,
    borderTopColor: '#bdc3c7',
  },
  totalAmount: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#2c3e50',
  },
  taxAmount: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#7f8c8d',
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    backgroundColor: '#ecf0f1',
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#bdc3c7',
    paddingVertical: 12,
    borderRadius: 6,
    gap: 6,
  },
  orderButton: {
    backgroundColor: '#27ae60',
  },
  actionButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#2c3e50',
  },
  orderButtonText: {
    color: 'white',
  },
  paymentButtons: {
    flexDirection: 'row',
    backgroundColor: '#2c3e50',
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 8,
  },
  paymentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34495e',
    paddingVertical: 16,
    borderRadius: 6,
    gap: 6,
  },
  paymentButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: 'white',
  },
  bottomActions: {
    flexDirection: 'row',
    backgroundColor: '#34495e',
    paddingVertical: 8,
    paddingHorizontal: 8,
    gap: 8,
  },
  bottomButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  bottomButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#bdc3c7',
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  menuCategory: {
    width: (width - 350 - 60) / 3,
    height: 120,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  menuCategoryText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: 'white',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  meatballSub: { backgroundColor: '#e74c3c' },
  steakSub: { backgroundColor: '#c0392b' },
  steakHogie: { backgroundColor: '#8B4513' },
  italianSausage: { backgroundColor: '#d35400' },
  pizzaSub: { backgroundColor: '#f39c12' },
  chickenBreast: { backgroundColor: '#D2691E' },
  roastBbq: { backgroundColor: '#CD853F' },
  hamSub: { backgroundColor: '#3498db' },
  tunaSub: { backgroundColor: '#2980b9' },
  turkeySub: { backgroundColor: '#8e44ad' },
  bltSub: { backgroundColor: '#9b59b6' },
});