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

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'beer': return '#d4a574';
    case 'wine': return '#8b0000';
    case 'cocktail': return '#dc143c';
    case 'spirits': return '#4169e1';
    default: return '#228b22';
  }
};

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'beer': return '🍺';
    case 'wine': return '🍷';
    case 'cocktail': return '🍹';
    case 'spirits': return '🥃';
    default: return '🥤';
  }
};

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
  const [pendingOrder, setPendingOrder] = useState<any>(null);
  
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
    console.log('🔄 Creating bar order (not yet sending to bar)');
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
      
      // Create order items
      const orderItems = cart.map(item => ({
        menu_item_id: item.menuItem.id,
        quantity: item.quantity,
        unit_price: item.menuItem.price,
        special_instructions: item.specialInstructions || '',
      }));

      // Generate order number
      const orderNumber = `B-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      console.log('📋 Creating pending order:', orderNumber, 'with', orderItems.length, 'items');
      
      // Create pending order (not sent to bar yet)
      const orderData = {
        order_number: orderNumber,
        table_number: `Guest ${currentGuest}`,
        order_type: 'bar' as const,
        items: orderItems,
        subtotal: totals.subtotal,
        tax_amount: totals.tax,
        service_charge: 0,
        total_amount: totals.total,
        status: 'pending' as const, // Order created but not sent to bar
        payment_status: 'pending' as const,
        payment_method: null,
      };
      
      // Store as pending order (don't save to database yet)
      setPendingOrder(orderData);
      
      console.log('✅ Pending order created:', orderData);

      Alert.alert(
        'Order Created!', 
        `Order Number: ${orderNumber}\nDrinks: ${cart.length}\nTotal: ${formatCurrency(totals.total)}\n\nNow select payment method to send to bar.`,
        [{ text: 'OK' }]
      );
      
      // Don't clear cart yet - wait for payment
      
    } catch (error) {
      console.error('Error processing order:', error);
      Alert.alert('Error', `Failed to create order: ${error.message || error}. Please try again.`);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, cart, calculateTotals, currentGuest, formatCurrency]);

  const processPayment = useCallback(async (paymentMethod: string) => {
    console.log('💳 Processing payment with method:', paymentMethod);
    
    if (!pendingOrder) {
      Alert.alert('Error', 'No pending order. Please create an order first.');
      return;
    }

    if (isProcessing) {
      console.log('⏳ Already processing payment, ignoring request');
      return;
    }

    setIsProcessing(true);

    try {
      // Update order with payment information
      const finalOrderData = {
        ...pendingOrder,
        status: 'confirmed' as const, // Now send to bar
        payment_status: paymentMethod === 'SETTLE' ? 'pending' as const : 'paid' as const,
        payment_method: paymentMethod.toLowerCase(),
      };
      
      console.log('💾 Saving order to database with payment:', finalOrderData);
      
      // Save order to database (now it goes to bar)
      const order = await db.insert('orders', finalOrderData);
      
      console.log('✅ Order saved and sent to bar:', order);

      // Create financial transaction for accounting
      try {
        await db.insert('transactions', {
          transaction_number: `TXN-${pendingOrder.order_number}`,
          type: 'income',
          category: 'food_beverage',
          amount: pendingOrder.total_amount,
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
        Alert.alert('Receipt', `Bar receipt for order ${pendingOrder.order_number} would be printed`);
      } else if (receiptOption === 'email') {
        Alert.alert('Receipt', `Bar receipt for order ${pendingOrder.order_number} would be emailed to guest`);
      }

      Alert.alert(
        'Payment Processed & Order Sent!', 
        `Order Number: ${pendingOrder.order_number}\nDrinks: ${cart.length}\nTotal: ${formatCurrency(pendingOrder.total_amount)}\nPayment: ${paymentMethod}\n\n✅ Order sent to bar!`,
        [{ text: 'OK' }]
      );
      
      // Clear everything after successful payment
      setCart([]);
      setPendingOrder(null);
      console.log('🧹 Cart and pending order cleared after successful payment');
      
      if (currentGuest < totalGuests) {
        setCurrentGuest(currentGuest + 1);
        console.log('👤 Moved to next guest:', currentGuest + 1);
      }
      
    } catch (error) {
      console.error('Error processing payment:', error);
      Alert.alert('Error', `Failed to process payment: ${error.message || error}. Please try again.`);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, pendingOrder, cart, receiptOption, formatCurrency, currentGuest, totalGuests, user?.id]);

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
    
    if (cart.length === 0 && !pendingOrder) return;
    
    Alert.alert(
      'Cancel Order',
      `Cancel current order?\n\n${pendingOrder ? 'This will cancel the pending order and ' : ''}remove all ${cart.length} drinks from your cart.\nTotal value: ${formatCurrency(calculateTotals.total)}\n\nThis action cannot be undone.`,
      [
        { text: 'Keep Order', style: 'cancel' },
        { 
          text: 'Cancel Order', 
          style: 'destructive',
          onPress: () => {
            setCart([]);
            setPendingOrder(null);
            Alert.alert('Bar Order Cancelled', 'All drinks have been removed from the cart');
          }
        }
      ]
    );
  }, [cart, pendingOrder, calculateTotals, formatCurrency]);

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
            </View>
          </ScrollView>