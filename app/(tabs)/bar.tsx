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
  Wine, 
  Search, 
  CreditCard, 
  DollarSign, 
  Users, 
  Receipt,
  Save,
} from 'lucide-react-native';

type MenuItem = Database['public']['Tables']['menu_items']['Row'];

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  specialInstructions?: string;
}

const { width, height } = Dimensions.get('window');

export default function Bar() {
  const { user } = useAuthContext();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
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
      
      const barItems = menuData.filter(item => 
        ['wine', 'cocktail', 'beer', 'beverage', 'spirits', 'coffee', 'tea', 'juice', 'water'].includes(item.category)
      );
      
      setMenuItems(barItems);
    } catch (error) {
      console.error('Error loading menu items:', error);
      Alert.alert('Error', 'Failed to load menu items. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = useCallback((menuItem: MenuItem) => {
    if (isProcessing) return;
    
    setCart(prevCart => {
      const existingIndex = prevCart.findIndex(item => item.menuItem.id === menuItem.id);
      
      if (existingIndex >= 0) {
        const newCart = [...prevCart];
        newCart[existingIndex].quantity += 1;
        return newCart;
      } else {
        return [...prevCart, { menuItem, quantity: 1 }];
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
    console.log('🍷 Processing bar order with payment method:', paymentMethod);
    
    if (isProcessing || cart.length === 0) return;
    
    if (cart.length === 0) {
      Alert.alert('Order Error', 'Please add drinks to cart before placing order');
      return;
    }

    setIsProcessing(true);

    try {
      // Calculate order totals
      const totals = calculateTotals;
      
      // Create order items
      const orderItems = cart.map(item => ({
        menu_item_id: item.menuItem.id,
        quantity: item.quantity,
        unit_price: item.menuItem.price,
        special_instructions: item.specialInstructions || '',
      }));

      // Generate order number
      const orderNumber = `B-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      // Create order in database
      const orderData = {
        order_number: orderNumber,
        table_number: `Guest ${currentGuest}`,
        order_type: 'bar' as const,
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
      
      console.log('✅ Bar order created successfully:', order);

      // Handle receipt option
      if (receiptOption === 'print') {
        Alert.alert('Receipt', `Bar receipt for order ${orderNumber} would be printed`);
      } else if (receiptOption === 'email') {
        Alert.alert('Receipt', `Bar receipt for order ${orderNumber} would be emailed to guest`);
      }

      Alert.alert('Success', `Bar Order ${orderNumber} placed successfully!\nTotal: ${formatCurrency(totals.total)}\nPayment: ${paymentMethod}`);
      
      // Clear cart and move to next guest
      setCart([]);
      if (currentGuest < totalGuests) {
        setCurrentGuest(currentGuest + 1);
      }
      
    } catch (error) {
      console.error('Error processing order:', error);
      Alert.alert('Error', `Failed to process bar order: ${error.message || error}. Please try again.`);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, cart, calculateTotals, receiptOption, currentGuest, totalGuests, formatCurrency]);

  const saveOrder = useCallback(() => {
    console.log('💾 Saving bar order for Guest', currentGuest);
    
    if (cart.length === 0) {
      Alert.alert('Info', 'No items to save');
      return;
    }
    
    setSavedOrders(prev => [...prev, [...cart]]);
    setCart([]);
    Alert.alert('Success', `Bar order saved for Guest ${currentGuest}!\nItems: ${cart.length}\nTotal: ${formatCurrency(calculateTotals.total)}\n\nYou can recall it later using the RECALL button.`);
  }, [cart, currentGuest, calculateTotals, formatCurrency]);

  const recallOrder = useCallback(() => {
    console.log('📥 Recalling saved bar order');
    
    if (savedOrders.length === 0) {
      Alert.alert('Info', 'No saved orders to recall');
      return;
    }
    
    Alert.alert(
      'Recall Order',
      `Recall the last saved bar order?\n\nThis will replace your current cart with ${savedOrders[savedOrders.length - 1].length} saved items.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Recall', 
          onPress: () => {
            const lastSavedOrder = savedOrders[savedOrders.length - 1];
            setCart(lastSavedOrder);
            setSavedOrders(prev => prev.slice(0, -1));
            Alert.alert('Success', `Bar order recalled successfully!\nItems restored: ${lastSavedOrder.length}`);
          }
        }
      ]
    );
  }, [savedOrders]);

  const toggleReceiptOption = useCallback(() => {
    console.log('🧾 Toggling bar receipt option from:', receiptOption);
    
    const options: Array<'no_receipt' | 'print' | 'email'> = ['no_receipt', 'print', 'email'];
    const currentIndex = options.indexOf(receiptOption);
    const nextIndex = (currentIndex + 1) % options.length;
    const newOption = options[nextIndex];
    
    setReceiptOption(options[nextIndex]);
    
    console.log('✅ Bar receipt option changed to:', newOption);
    Alert.alert('Receipt Option', `Bar receipt option changed to: ${newOption.replace('_', ' ').toUpperCase()}`);
  }, [receiptOption]);

  const getReceiptButtonText = () => {
    switch (receiptOption) {
      case 'no_receipt': return 'NO RECEIPT';
      case 'print': return 'PRINT RECEIPT';
      case 'email': return 'EMAIL RECEIPT';
    }
  };

  const cancelOrder = useCallback(() => {
    console.log('❌ Cancelling bar order');
    
    if (cart.length === 0) return;
    
    Alert.alert(
      'Cancel Order',
      `Are you sure you want to cancel this bar order?\n\nItems in cart: ${cart.length}\nTotal value: ${formatCurrency(calculateTotals.total)}`,
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes', 
          style: 'destructive',
          onPress: () => {
            setCart([]);
            Alert.alert('Order Cancelled', 'Bar cart has been cleared');
          }
        }
      ]
    );
  }, [cart, calculateTotals, formatCurrency]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.appName}>foodiv</Text>
          <Text style={styles.orderType}>NEW BAR ORDER</Text>
          <Text style={styles.serverInfo}>SERVER: {serverName}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.searchButton}
            onPress={() => Alert.alert('Search', 'Bar search functionality would open here')}
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
            {[1, 2, 3].map((guestNum) => (
              <View key={guestNum} style={styles.guestSection}>
                <View style={styles.guestHeader}>
                  <Text style={styles.guestLabel}>GUEST {guestNum}</Text>
                </View>
                
                {cart.filter((_, index) => (index % 3) === (guestNum - 1)).map((item, index) => (
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
                        {item.menuItem.description.substring(0, 30)}...
                      </Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.priceButton}
                      onPress={() => {
                        Alert.prompt(
                          'Update Quantity',
                          `Current quantity: ${item.quantity}`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { 
                              text: 'Update', 
                              onPress: (value) => {
                                const newQty = parseInt(value || '0');
                                if (newQty > 0) {
                                  updateQuantity(item.menuItem.id, newQty);
                                }
                              }
                            }
                          ],
                          'plain-text',
                          item.quantity.toString()
                        );
                      }}
                    >
                      <Text style={styles.orderItemPrice}>
                        {formatCurrency(item.menuItem.price * item.quantity)}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ))}
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
              <Wine size={20} color="white" />
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
                  'Are you sure you want to logout from bar POS?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Logout', onPress: () => Alert.alert('Logged Out', 'You have been logged out from bar POS') }
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

        {/* Right Panel - Bar Categories */}
        <View style={styles.rightPanel}>
          <View style={styles.menuGrid}>
            {/* Bar Categories */}
            <TouchableOpacity 
              style={[styles.menuCategory, styles.beerBasket]}
              onPress={() => addToCart({
                id: 'beer-basket',
                name: 'BEER SELECTION',
                price: 6.99,
                cost_price: 3.00,
                category: 'beer',
                subcategory: 'draft',
                description: 'Assorted beer selection',
                is_available: true,
                ingredients: ['beer'],
                prep_time_minutes: 2,
                cooking_time_minutes: 0,
                difficulty_level: 'easy',
                is_vegetarian: true,
                is_vegan: true,
                is_gluten_free: false,
                calories: 150,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              } as MenuItem)}
            >
              <Text style={styles.menuCategoryIcon}>🍺</Text>
              <Text style={styles.menuCategoryText}>BEER BASKET</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.menuCategory, styles.wine]}
              onPress={() => addToCart({
                id: 'house-wine',
                name: 'HOUSE WINE',
                price: 12.99,
                cost_price: 6.50,
                category: 'wine',
                subcategory: 'red',
                description: 'Premium house wine selection',
                is_available: true,
                ingredients: ['wine grapes'],
                prep_time_minutes: 2,
                cooking_time_minutes: 0,
                difficulty_level: 'easy',
                is_vegetarian: true,
                is_vegan: true,
                is_gluten_free: true,
                calories: 120,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              } as MenuItem)}
            >
              <Text style={styles.menuCategoryIcon}>🍷</Text>
              <Text style={styles.menuCategoryText}>WINE</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.menuCategory, styles.cocktailShort]}
              onPress={() => addToCart({
                id: 'cocktail-short',
                name: 'COCKTAIL SHORT',
                price: 8.99,
                cost_price: 4.00,
                category: 'cocktail',
                subcategory: 'shots',
                description: 'Short cocktail selection',
                is_available: true,
                ingredients: ['spirits', 'mixers'],
                prep_time_minutes: 3,
                cooking_time_minutes: 0,
                difficulty_level: 'easy',
                is_vegetarian: true,
                is_vegan: true,
                is_gluten_free: true,
                calories: 80,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              } as MenuItem)}
            >
              <Text style={styles.menuCategoryIcon}>🍸</Text>
              <Text style={styles.menuCategoryText}>COCKTAIL SHORT</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.menuCategory, styles.cocktail]}
              onPress={() => addToCart({
                id: 'cocktail-full',
                name: 'COCKTAIL',
                price: 14.99,
                cost_price: 6.50,
                category: 'cocktail',
                subcategory: 'mixed',
                description: 'Full cocktail selection',
                is_available: true,
                ingredients: ['spirits', 'mixers', 'garnish'],
                prep_time_minutes: 5,
                cooking_time_minutes: 0,
                difficulty_level: 'medium',
                is_vegetarian: true,
                is_vegan: true,
                is_gluten_free: true,
                calories: 180,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              } as MenuItem)}
            >
              <Text style={styles.menuCategoryIcon}>🍹</Text>
              <Text style={styles.menuCategoryText}>COCKTAIL</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.menuCategory, styles.drinks]}
              onPress={() => addToCart({
                id: 'soft-drinks',
                name: 'SOFT DRINKS',
                price: 3.99,
                cost_price: 1.50,
                category: 'beverage',
                subcategory: 'soft',
                description: 'Non-alcoholic beverages',
                is_available: true,
                ingredients: ['soda', 'ice'],
                prep_time_minutes: 1,
                cooking_time_minutes: 0,
                difficulty_level: 'easy',
                is_vegetarian: true,
                is_vegan: true,
                is_gluten_free: true,
                calories: 140,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              } as MenuItem)}
            >
              <Text style={styles.menuCategoryIcon}>🥤</Text>
              <Text style={styles.menuCategoryText}>DRINKS</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.menuCategory, styles.desserts]}
              onPress={() => addToCart({
                id: 'bar-desserts',
                name: 'DESSERTS',
                price: 7.99,
                cost_price: 3.50,
                category: 'dessert',
                subcategory: 'sweet',
                description: 'Sweet treats and desserts',
                is_available: true,
                ingredients: ['dessert ingredients'],
                prep_time_minutes: 5,
                cooking_time_minutes: 0,
                difficulty_level: 'easy',
                is_vegetarian: true,
                is_vegan: false,
                is_gluten_free: false,
                calories: 320,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              } as MenuItem)}
            >
              <Text style={styles.menuCategoryIcon}>🍰</Text>
              <Text style={styles.menuCategoryText}>DESSERTS</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.menuCategory, styles.clubs]}
              onPress={() => addToCart({
                id: 'club-special',
                name: 'CLUB SPECIAL',
                price: 18.99,
                cost_price: 9.00,
                category: 'cocktail',
                subcategory: 'premium',
                description: 'Premium club cocktails',
                is_available: true,
                ingredients: ['premium spirits', 'special mixers'],
                prep_time_minutes: 8,
                cooking_time_minutes: 0,
                difficulty_level: 'hard',
                is_vegetarian: true,
                is_vegan: true,
                is_gluten_free: true,
                calories: 220,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              } as MenuItem)}
            >
              <Text style={styles.menuCategoryIcon}>🏆</Text>
              <Text style={styles.menuCategoryText}>CLUBS</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.menuCategory, styles.sandwiches]}
              onPress={() => addToCart({
                id: 'bar-sandwich',
                name: 'BAR SANDWICH',
                price: 11.99,
                cost_price: 5.50,
                category: 'appetizer',
                subcategory: 'bar_food',
                description: 'Bar style sandwiches',
                is_available: true,
                ingredients: ['bread', 'filling', 'condiments'],
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
              <Text style={styles.menuCategoryIcon}>🥪</Text>
              <Text style={styles.menuCategoryText}>SANDWICHES</Text>
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
  priceButton: {
    padding: 4,
  },
  orderItemPrice: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#2c3e50',
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
  menuCategoryIcon: {
    fontSize: 24,
    marginBottom: 8,
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
  beerBasket: { backgroundColor: '#D2691E' },
  wine: { backgroundColor: '#8B0000' },
  cocktailShort: { backgroundColor: '#DC143C' },
  cocktail: { backgroundColor: '#B22222' },
  drinks: { backgroundColor: '#228B22' },
  desserts: { backgroundColor: '#4169E1' },
  clubs: { backgroundColor: '#191970' },
  sandwiches: { backgroundColor: '#8A2BE2' },
});