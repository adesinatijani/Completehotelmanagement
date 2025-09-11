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
import { Database } from '@/types/database';
import { loadHotelSettings } from '@/lib/storage';
import { currencyManager } from '@/lib/currency';
import { db } from '@/lib/database';
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

interface MenuCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
  items: MenuItem[];
  count: number;
}

const { width, height } = Dimensions.get('window');

export default function Bar() {
  const { user } = useAuthContext();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<MenuCategory | null>(null);
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

  useEffect(() => {
    if (menuItems.length > 0) {
      generateCategories();
    }
  }, [menuItems]);
  
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
      console.log('🔄 Loading bar menu data...');
      await db.initialize();
      const menuData = await db.select<MenuItem>('menu_items', {
        filters: { is_available: true }
      });
      
      console.log('📊 Total menu items loaded:', menuData.length);
      
      const barItems = menuData.filter(item => 
        ['wine', 'cocktail', 'beer', 'beverage', 'spirits', 'coffee', 'tea', 'juice', 'water'].includes(item.category)
      );
      
      console.log('🍷 Bar items filtered:', barItems.length);
      setMenuItems(barItems);
    } catch (error) {
      console.error('Error loading menu items:', error);
      Alert.alert('Error', 'Failed to load bar menu items. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateCategories = () => {
    const categoryMap = new Map<string, MenuItem[]>();
    
    menuItems.forEach(item => {
      if (!categoryMap.has(item.category)) {
        categoryMap.set(item.category, []);
      }
      categoryMap.get(item.category)!.push(item);
    });

    const generatedCategories: MenuCategory[] = [
      {
        id: 'beer',
        name: 'BEER BASKET',
        color: '#d4a574',
        icon: '🍺',
        items: categoryMap.get('beer') || [],
        count: (categoryMap.get('beer') || []).length
      },
      {
        id: 'wine',
        name: 'WINE',
        color: '#8b0000',
        icon: '🍷',
        items: categoryMap.get('wine') || [],
        count: (categoryMap.get('wine') || []).length
      },
      {
        id: 'cocktail',
        name: 'COCKTAIL',
        color: '#dc143c',
        icon: '🍹',
        items: categoryMap.get('cocktail') || [],
        count: (categoryMap.get('cocktail') || []).length
      },
      {
        id: 'spirits',
        name: 'SPIRITS',
        color: '#4169e1',
        icon: '🥃',
        items: categoryMap.get('spirits') || [],
        count: (categoryMap.get('spirits') || []).length
      },
      {
        id: 'drinks',
        name: 'DRINKS',
        color: '#228b22',
        icon: '🥤',
        items: [...(categoryMap.get('beverage') || []), ...(categoryMap.get('coffee') || []), ...(categoryMap.get('tea') || []), ...(categoryMap.get('juice') || []), ...(categoryMap.get('water') || [])],
        count: (categoryMap.get('beverage') || []).length + (categoryMap.get('coffee') || []).length + (categoryMap.get('tea') || []).length + (categoryMap.get('juice') || []).length + (categoryMap.get('water') || []).length
      }
    ].filter(category => category.count > 0);

    setCategories(generatedCategories);
    if (generatedCategories.length > 0 && !selectedCategory) {
      setSelectedCategory(generatedCategories[0]);
    }
  };

  const addToCart = useCallback((menuItem: MenuItem) => {
    if (isProcessing) return;
    
    console.log('🍷 Adding to bar cart:', menuItem.name, 'Price:', menuItem.price);
    
    setCart(prevCart => {
      const existingIndex = prevCart.findIndex(item => item.menuItem.id === menuItem.id);
      
      if (existingIndex >= 0) {
        const newCart = [...prevCart];
        newCart[existingIndex].quantity += 1;
        console.log('✅ Updated quantity for existing bar item:', newCart[existingIndex].menuItem.name, 'New qty:', newCart[existingIndex].quantity);
        return newCart;
      } else {
        const newItem = { menuItem, quantity: 1 };
        console.log('✅ Added new bar item to cart:', newItem.menuItem.name, 'Qty:', newItem.quantity);
        return [...prevCart, newItem];
      }
    });
  }, [isProcessing]);

  const updateQuantity = useCallback((menuItemId: string, newQuantity: number) => {
    if (isProcessing) return;
    
    console.log('🔢 Updating bar quantity for item:', menuItemId, 'New quantity:', newQuantity);
    
    if (newQuantity <= 0) {
      console.log('🗑️ Removing bar item from cart');
      setCart(prevCart => prevCart.filter(item => item.menuItem.id !== menuItemId));
    } else if (newQuantity <= 99) {
      setCart(prevCart => 
        prevCart.map(item => 
          item.menuItem.id === menuItemId 
            ? { ...item, quantity: newQuantity }
            : item
        )
      );
      console.log('✅ Bar quantity updated successfully');
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

  const createOrder = useCallback(async () => {
    console.log('🔄 Creating bar order');
    console.log('🛒 Current bar cart items:', cart.length);
    
    if (isProcessing) {
      console.log('⏳ Already processing order, ignoring request');
      return;
    }
    
    if (cart.length === 0) {
      console.log('❌ Cart is empty, cannot create order');
      Alert.alert('Order Error', 'Please add drinks to cart before creating order');
      return;
    }

    setIsProcessing(true);

    try {
      // Calculate order totals
      const totals = calculateTotals;
      
      console.log('💰 Bar order totals:', totals);
      
      // Generate order number
      const orderNumber = `B-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      console.log('📋 Creating bar order:', orderNumber, 'with', cart.length, 'items');
      
      Alert.alert(
        'Bar Order Created!', 
        `Order Number: ${orderNumber}\nDrinks: ${cart.length}\nTotal: ${formatCurrency(totals.total)}\n\nNow select payment method to send to bar.`,
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('Error creating bar order:', error);
      Alert.alert('Error', `Failed to create order: ${error.message || error}. Please try again.`);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, cart, calculateTotals, formatCurrency]);

  const processPayment = useCallback(async (paymentMethod: string) => {
    console.log('💳 Processing bar payment with method:', paymentMethod);
    
    if (cart.length === 0) {
      Alert.alert('Error', 'Please add drinks to cart before processing payment');
      return;
    }

    if (isProcessing) {
      console.log('⏳ Already processing payment, ignoring request');
      return;
    }

    setIsProcessing(true);

    try {
      // Calculate order totals
      const totals = calculateTotals;
      
      console.log('💰 Bar order totals calculated:', totals);
      
      // Create order items
      const orderItems = cart.map(item => ({
        menu_item_id: item.menuItem.id,
        quantity: item.quantity,
        unit_price: item.menuItem.price,
        special_instructions: item.specialInstructions || '',
      }));

      // Generate order number
      const orderNumber = `B-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      console.log('📋 Creating bar order:', orderNumber, 'with', orderItems.length, 'items');
      
      // Create order data
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
      
      console.log('💾 Saving bar order to database with payment:', orderData);
      
      // Save order to database
      const order = await db.insert('orders', orderData);
      
      console.log('✅ Bar order saved and sent to bar:', order);

      // Create financial transaction for accounting
      try {
        await db.insert('transactions', {
          transaction_number: `TXN-${orderNumber}`,
          type: 'income',
          category: 'food_beverage',
          amount: totals.total,
          description: `Bar order - ${paymentMethod} payment`,
          reference_id: order.id,
          payment_method: paymentMethod.toLowerCase(),
          transaction_date: new Date().toISOString().split('T')[0],
          processed_by: user?.id || 'pos_system',
        });
        console.log('✅ Financial transaction recorded for bar order');
      } catch (transactionError) {
        console.warn('Failed to record financial transaction (non-critical):', transactionError);
      }

      // Handle receipt option
      if (receiptOption === 'print') {
        Alert.alert('Receipt', `Bar receipt for order ${orderNumber} would be printed`);
      } else if (receiptOption === 'email') {
        Alert.alert('Receipt', `Bar receipt for order ${orderNumber} would be emailed to guest`);
      }

      Alert.alert(
        'Payment Processed & Order Sent!', 
        `Order Number: ${orderNumber}\nDrinks: ${cart.length}\nTotal: ${formatCurrency(totals.total)}\nPayment: ${paymentMethod}\n\n✅ Order sent to bar!`,
        [{ text: 'OK' }]
      );
      
      // Clear everything after successful payment
      setCart([]);
      console.log('🧹 Cart cleared after successful payment');
      
      if (currentGuest < totalGuests) {
        setCurrentGuest(currentGuest + 1);
        console.log('👤 Moved to next guest:', currentGuest + 1);
      }
      
    } catch (error) {
      console.error('Error processing bar payment:', error);
      Alert.alert('Error', `Failed to process payment: ${error.message || error}. Please try again.`);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, cart, receiptOption, formatCurrency, currentGuest, totalGuests, calculateTotals, user?.id]);

  const saveOrder = useCallback(() => {
    console.log('💾 Saving bar order for Guest', currentGuest);
    
    if (cart.length === 0) {
      Alert.alert('Info', 'No items to save');
      return;
    }
    
    setSavedOrders(prev => [...prev, [...cart]]);
    Alert.alert(
      'Bar Order Saved!', 
      `Guest ${currentGuest} bar order saved successfully!\n\nDrinks saved: ${cart.length}\nTotal value: ${formatCurrency(calculateTotals.total)}\n\nUse RECALL button to restore this order later.`,
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
    console.log('📥 Recalling saved bar order');
    
    if (savedOrders.length === 0) {
      Alert.alert('Info', 'No saved orders to recall');
      return;
    }
    
    Alert.alert(
      'Recall Order',
      `Found ${savedOrders.length} saved bar order${savedOrders.length !== 1 ? 's' : ''}!\n\nRecall the most recent order?\nDrinks: ${savedOrders[savedOrders.length - 1].length}\n\nThis will replace your current cart.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Recall', 
          onPress: () => {
            const lastSavedOrder = savedOrders[savedOrders.length - 1];
            setCart(lastSavedOrder);
            setSavedOrders(prev => prev.slice(0, -1));
            Alert.alert('Bar Order Recalled!', `Successfully restored bar order!\n\nDrinks restored: ${lastSavedOrder.length}\nYou can now modify or place this order.`);
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
    
    setReceiptOption(newOption);
    
    console.log('✅ Bar receipt option changed to:', newOption);
    
    const optionText = newOption === 'no_receipt' ? 'NO RECEIPT' : 
                     newOption === 'print' ? 'PRINT RECEIPT' : 'EMAIL RECEIPT';
    Alert.alert('Receipt Option Changed', `Bar receipt option is now: ${optionText}`);
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
      `Cancel current bar order?\n\nRemove all ${cart.length} drinks from your cart.\nTotal value: ${formatCurrency(calculateTotals.total)}\n\nThis action cannot be undone.`,
      [
        { text: 'Keep Order', style: 'cancel' },
        { 
          text: 'Cancel Order', 
          style: 'destructive',
          onPress: () => {
            setCart([]);
            Alert.alert('Bar Order Cancelled', 'All drinks have been removed from the cart');
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
                    <Text style={styles.orderItemPrice}>{formatCurrency(item.menuItem.price)}</Text>
                  </View>
                  <View style={styles.orderItemRight}>
                    <View style={styles.quantityControls}>
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
                    </View>
                  </View>
                </View>
              ))}
              
              {cart.length === 0 && (
                <View style={styles.emptyCart}>
                  <Text style={styles.emptyCartText}>No drinks in cart</Text>
                  <Text style={styles.emptyCartSubtext}>Click drinks to add</Text>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Order Total */}
          <View style={styles.orderTotal}>
            <Text style={styles.taxAmount}>TAX {formatCurrency(calculateTotals.tax)}</Text>
          </View>
}

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
              onPress={createOrder}
              disabled={cart.length === 0 || isProcessing}
            >
              <Wine size={20} color="white" />
              <Text style={[styles.actionButtonText, styles.orderButtonText]}>
                {isProcessing ? 'CREATING...' : 'ORDER'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Payment Buttons */}
          <View style={styles.paymentButtons}>
            <TouchableOpacity 
              style={styles.paymentButton}
              onPress={() => processPayment('CASH')}
              disabled={cart.length === 0 || isProcessing}
            >
              <DollarSign size={20} color="white" />
              <Text style={styles.paymentButtonText}>CASH</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.paymentButton}
              onPress={() => processPayment('CREDIT')}
              disabled={cart.length === 0 || isProcessing}
            >
              <CreditCard size={20} color="white" />
              <Text style={styles.paymentButtonText}>CREDIT</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.paymentButton}
              onPress={() => processPayment('SETTLE')}
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
          {!selectedCategory ? (
            <View style={styles.menuGrid}>
              {/* Category Selection */}
              {categories.map((category) => (
                <TouchableOpacity 
                  key={category.id}
                  style={[styles.menuCategory, { backgroundColor: category.color }]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <Text style={styles.menuCategoryIcon}>{category.icon}</Text>
                  <Text style={styles.menuCategoryText}>{category.name}</Text>
                  <Text style={styles.menuCategoryCount}>({category.count} items)</Text>
                </TouchableOpacity>
              ))}
              
              {categories.length === 0 && !loading && (
                <View style={styles.noMenuItems}>
                  <Text style={styles.noMenuItemsText}>No bar categories available</Text>
                  <Text style={styles.noMenuItemsSubtext}>Add drinks in Menu Management</Text>
                </View>
              )}
              
              {loading && (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Loading bar categories...</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.itemsView}>
              {/* Back to Categories Button */}
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => setSelectedCategory(null)}
              >
                <Text style={styles.backButtonText}>← BACK TO CATEGORIES</Text>
              </TouchableOpacity>
              
              {/* Category Header */}
              <View style={[styles.categoryHeader, { backgroundColor: selectedCategory.color }]}>
                <Text style={styles.categoryHeaderIcon}>{selectedCategory.icon}</Text>
                <Text style={styles.categoryHeaderText}>{selectedCategory.name}</Text>
                <Text style={styles.categoryHeaderCount}>({selectedCategory.count} items)</Text>
              </View>
              
              {/* Menu Items Grid */}
              <ScrollView style={styles.itemsScrollView}>
                <View style={styles.itemsGrid}>
                  {selectedCategory.items.map((item) => (
                    <TouchableOpacity 
                      key={item.id}
                      style={[styles.menuItem, { borderColor: selectedCategory.color }]}
                      onPress={() => addToCart(item)}
                    >
                      <Text style={styles.menuItemName}>{item.name}</Text>
                      <Text style={styles.menuItemDescription}>{item.description}</Text>
                      <Text style={styles.menuItemPrice}>{formatCurrency(item.price)}</Text>
                      {item.prep_time_minutes > 0 && (
                        <Text style={styles.menuItemTime}>{item.prep_time_minutes} min</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}
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
  orderItemPrice: {
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
  quantityControls: {
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
    gap: 16,
  },
  menuCategory: {
    width: Math.floor((width - 350 - 80) / 3),
    height: 140,
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
    fontSize: 32,
    marginBottom: 8,
  },
  menuCategoryText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: 'white',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  menuCategoryCount: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: 'white',
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  itemsView: {
    flex: 1,
  },
  backButton: {
    backgroundColor: '#34495e',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginBottom: 16,
  },
  backButtonText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Inter-Bold',
  },
  categoryHeader: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  categoryHeaderIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  categoryHeaderText: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  categoryHeaderCount: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: 'white',
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  itemsScrollView: {
    flex: 1,
  },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  menuItem: {
    width: Math.floor((width - 350 - 80) / 4),
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  menuItemName: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#2c3e50',
    marginBottom: 4,
    textAlign: 'center',
  },
  menuItemDescription: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#7f8c8d',
    marginBottom: 8,
    textAlign: 'center',
    lineHeight: 12,
  },
  menuItemPrice: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#27ae60',
    textAlign: 'center',
    marginBottom: 4,
  },
  menuItemTime: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#95a5a6',
    textAlign: 'center',
  },
  noMenuItems: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  noMenuItemsText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#bdc3c7',
    marginBottom: 8,
  },
  noMenuItemsSubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#95a5a6',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#bdc3c7',
  },
});