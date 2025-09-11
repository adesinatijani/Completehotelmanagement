import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
  Keyboard,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { db } from '@/lib/database';
import { saveHotelSettings, loadHotelSettings } from '@/lib/storage';
import { Database } from '@/types/database';
import { 
  ChefHat, 
  Search, 
  User, 
  Trash2, 
  CreditCard, 
  DollarSign,
  Clock,
  Receipt,
  Settings,
  Users,
  AlertTriangle,
  CheckCircle,
  Loader
} from 'lucide-react-native';
import { audioManager } from '@/lib/audio';
import { currencyManager } from '@/lib/currency';
import { receiptPrinter } from '@/lib/printer';

type MenuItem = Database['public']['Tables']['menu_items']['Row'];
type Order = Database['public']['Tables']['orders']['Row'];

const { width, height } = Dimensions.get('window');

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  specialInstructions?: string;
}

interface POSCategory {
  id: string;
  name: string;
  color: string[];
  icon: string;
  items: MenuItem[];
}

// Constants for validation
const MAX_QUANTITY = 99;
const MIN_QUANTITY = 1;
const MAX_ORDER_VALUE = 10000;
const ORDER_TIMEOUT = 30000; // 30 seconds

export default function Restaurant() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [currentGuest, setCurrentGuest] = useState('GUEST 1 OF 3');
  const [serverName] = useState('WALDO T');
  const [tableNumber, setTableNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [hotelSettings, setHotelSettings] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);

  // Initialize component
  useEffect(() => {
    initializeComponent();
  }, []);

  const initializeComponent = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await Promise.all([
        loadData(),
        loadSettings(),
        initializeAudio(),
      ]);
    } catch (error) {
      console.error('Component initialization failed:', error);
      setError('Failed to initialize restaurant POS. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const settings = await loadHotelSettings();
      setHotelSettings(settings);
      if (settings?.currency) {
        currencyManager.setCurrency(settings.currency);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      // Use default settings if loading fails
      setHotelSettings({
        currency: 'USD',
        taxRate: 8.5,
        serviceChargeRate: 10.0,
        hotelName: 'Grand Hotel'
      });
    }
  };

  const initializeAudio = async () => {
    try {
      await audioManager.initialize();
    } catch (error) {
      console.warn('Audio initialization failed (non-critical):', error);
      // Audio failure is non-critical, continue without audio
    }
  };

  const loadData = async () => {
    try {
      // Initialize database first
      await db.initialize();
      
      const [menuData, ordersData] = await Promise.all([
        db.select<MenuItem>('menu_items'),
        db.select<Order>('orders')
      ]);
      
      // Filter and validate menu items
      const restaurantItems = menuData.filter(item => 
        ['appetizer', 'main_course', 'dessert', 'beverage'].includes(item.category) &&
        item.is_available &&
        item.price > 0
      );
      
      const restaurantOrders = ordersData.filter(order => 
        order.order_type === 'restaurant' || order.order_type === 'room_service'
      );
      
      setMenuItems(restaurantItems);
      setOrders(restaurantOrders);
      
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load menu data. Please check your connection and try again.');
      throw error;
    }
  };

  // Memoized categories to prevent unnecessary recalculations
  const categories: POSCategory[] = useMemo(() => [
    {
      id: 'appetizers',
      name: 'APPETIZERS',
      color: ['#ff6b6b', '#ee5a52'],
      icon: '🥗',
      items: menuItems.filter(item => item.category === 'appetizer')
    },
    {
      id: 'mains',
      name: 'MAIN COURSE',
      color: ['#4ecdc4', '#44a08d'],
      icon: '🍽️',
      items: menuItems.filter(item => item.category === 'main_course')
    },
    {
      id: 'desserts',
      name: 'DESSERTS',
      color: ['#a8e6cf', '#7fcdcd'],
      icon: '🍰',
      items: menuItems.filter(item => item.category === 'dessert')
    },
    {
      id: 'beverages',
      name: 'BEVERAGES',
      color: ['#ffd93d', '#6bcf7f'],
      icon: '🥤',
      items: menuItems.filter(item => item.category === 'beverage')
    },
    {
      id: 'specials',
      name: 'CHEF SPECIALS',
      color: ['#ff9ff3', '#f368e0'],
      icon: '⭐',
      items: menuItems.filter(item => item.name.toLowerCase().includes('special'))
    },
    {
      id: 'salads',
      name: 'SALADS',
      color: ['#95e1d3', '#fce38a'],
      icon: '🥬',
      items: menuItems.filter(item => item.name.toLowerCase().includes('salad'))
    }
  ], [menuItems]);

  // Validation functions
  const validateMenuItem = (menuItem: MenuItem): boolean => {
    if (!menuItem || !menuItem.id) {
      setError('Invalid menu item selected');
      return false;
    }
    if (menuItem.price <= 0) {
      setError('Menu item has invalid price');
      return false;
    }
    if (!menuItem.is_available) {
      setError('This item is currently unavailable');
      return false;
    }
    return true;
  };

  const validateQuantity = (quantity: number): boolean => {
    if (quantity < MIN_QUANTITY) {
      setError(`Minimum quantity is ${MIN_QUANTITY}`);
      return false;
    }
    if (quantity > MAX_QUANTITY) {
      setError(`Maximum quantity is ${MAX_QUANTITY}`);
      return false;
    }
    return true;
  };

  const validateCart = (): boolean => {
    if (cart.length === 0) {
      setError('Cart is empty. Please add items before proceeding.');
      return false;
    }
    
    const total = calculateTotal().total;
    if (total > MAX_ORDER_VALUE) {
      setError(`Order value exceeds maximum limit of ${formatCurrency(MAX_ORDER_VALUE)}`);
      return false;
    }
    
    return true;
  };

  const addToCart = useCallback((menuItem: MenuItem) => {
    try {
      setError(null);
      
      if (!validateMenuItem(menuItem)) {
        return;
      }

      // Play sound effect
      audioManager.playSound('addToCart').catch(() => {});
      
      const existingItem = cart.find(item => item.menuItem.id === menuItem.id);
      if (existingItem) {
        const newQuantity = existingItem.quantity + 1;
        if (!validateQuantity(newQuantity)) {
          return;
        }
        
        setCart(cart.map(item => 
          item.menuItem.id === menuItem.id 
            ? { ...item, quantity: newQuantity }
            : item
        ));
      } else {
        setCart([...cart, { menuItem, quantity: 1 }]);
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      setError('Failed to add item to cart. Please try again.');
    }
  }, [cart]);

  const removeFromCart = useCallback((menuItemId: string) => {
    try {
      setError(null);
      setCart(cart.filter(item => item.menuItem.id !== menuItemId));
      audioManager.playSound('buttonClick').catch(() => {});
    } catch (error) {
      console.error('Error removing from cart:', error);
      setError('Failed to remove item from cart.');
    }
  }, [cart]);

  const updateQuantity = useCallback((menuItemId: string, quantity: number) => {
    try {
      setError(null);
      
      if (quantity <= 0) {
        removeFromCart(menuItemId);
        return;
      }
      
      if (!validateQuantity(quantity)) {
        return;
      }

      setCart(cart.map(item => 
        item.menuItem.id === menuItemId 
          ? { ...item, quantity }
          : item
      ));
    } catch (error) {
      console.error('Error updating quantity:', error);
      setError('Failed to update quantity.');
    }
  }, [cart, removeFromCart]);

  const calculateTotal = useCallback(() => {
    try {
      const subtotal = cart.reduce((sum, item) => {
        const itemTotal = item.menuItem.price * item.quantity;
        return sum + itemTotal;
      }, 0);
      
      if (subtotal < 0) {
        console.warn('Negative subtotal detected:', subtotal);
        return { subtotal: 0, tax: 0, serviceCharge: 0, total: 0 };
      }
      
      const taxRate = (hotelSettings?.taxRate || 8.5) / 100;
      const serviceChargeRate = (hotelSettings?.serviceChargeRate || 0) / 100;
      
      const tax = Math.round(subtotal * taxRate * 100) / 100; // Proper rounding
      const serviceCharge = Math.round(subtotal * serviceChargeRate * 100) / 100;
      const total = Math.round((subtotal + tax + serviceCharge) * 100) / 100;
      
      return { subtotal, tax, serviceCharge, total };
    } catch (error) {
      console.error('Error calculating total:', error);
      return { subtotal: 0, tax: 0, serviceCharge: 0, total: 0 };
    }
  }, [cart, hotelSettings]);

  const generateUniqueOrderNumber = (): string => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `R-${timestamp}-${random}`;
  };

  const createOrder = async (paymentMethod: string, paymentStatus: 'pending' | 'paid' = 'paid') => {
    try {
      if (!validateCart()) {
        return null;
      }

      const { subtotal, tax, serviceCharge, total } = calculateTotal();
      
      if (total <= 0) {
        setError('Invalid order total. Please check your items.');
        return null;
      }
      
      const orderItems = cart.map(item => ({
        menu_item_id: item.menuItem.id,
        quantity: item.quantity,
        unit_price: item.menuItem.price,
        special_instructions: item.specialInstructions || '',
      }));

      const orderNumber = generateUniqueOrderNumber();
      
      const orderData = {
        order_number: orderNumber,
        table_number: tableNumber || 'Restaurant',
        order_type: 'restaurant' as const,
        items: orderItems,
        subtotal,
        tax_amount: tax,
        service_charge: serviceCharge,
        total_amount: total,
        status: 'confirmed' as const,
        payment_status: paymentStatus,
        payment_method: paymentMethod,
      };

      const newOrder = await db.insert<Order>('orders', orderData);
      
      // Create financial transaction
      await db.insert('transactions', {
        transaction_number: `TXN-${orderNumber}`,
        type: 'income',
        category: 'food_beverage',
        amount: total,
        description: `Restaurant order - ${paymentMethod}`,
        reference_id: newOrder.id,
        payment_method: paymentMethod.toLowerCase().replace(' ', '_'),
        transaction_date: new Date().toISOString().split('T')[0],
        processed_by: 'restaurant_pos',
      });

      setLastOrderId(newOrder.id);
      return newOrder;
    } catch (error) {
      console.error('Error creating order:', error);
      setError(`Failed to create order: ${error.message || 'Unknown error'}`);
      return null;
    }
  };

  const completePayment = async (paymentMethod: string) => {
    if (isProcessing) {
      Alert.alert('Please Wait', 'Another operation is in progress...');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      
      const order = await createOrder(paymentMethod, 'paid');
      if (!order) {
        return; // Error already set in createOrder
      }

      // Play success sound
      audioManager.playSound('orderComplete').catch(() => {});
      
      const { total } = calculateTotal();
      
      Alert.alert(
        'Payment Successful! ✅', 
        `Order #${order.order_number}\nPayment: ${paymentMethod}\nTotal: ${formatCurrency(total)}\n\nOrder sent to kitchen for preparation.`,
        [{ 
          text: 'OK', 
          onPress: () => {
            clearCart();
            loadData(); // Refresh orders
          }
        }]
      );
      
    } catch (error) {
      console.error('Error completing payment:', error);
      setError(`Payment failed: ${error.message || 'Unknown error'}`);
      
      Alert.alert(
        'Payment Failed ❌', 
        `Failed to process ${paymentMethod} payment. Please try again or use a different payment method.`,
        [
          { text: 'Retry', onPress: () => completePayment(paymentMethod) },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNoReceipt = () => {
    if (!validateCart()) return;
    
    const { total } = calculateTotal();
    Alert.alert(
      'Complete Order',
      `Process order for ${formatCurrency(total)} without printing receipt?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Complete', onPress: () => completePayment('No Receipt') }
      ]
    );
  };

  const handlePlaceOrder = async () => {
    if (!validateCart()) return;
    
    const { total } = calculateTotal();
    Alert.alert(
      'Send to Kitchen',
      `Send order for ${formatCurrency(total)} to kitchen for preparation?\n\nYou can process payment after kitchen confirms the order.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send Order', onPress: () => placeOrderOnly() }
      ]
    );
  };

  const placeOrderOnly = async () => {
    try {
      setIsProcessing(true);
      setError(null);
      
      const order = await createOrder('Pending Payment', 'pending');
      if (!order) {
        return;
      }

      audioManager.playSound('buttonClick').catch(() => {});
      
      Alert.alert(
        'Order Sent! 📨',
        `Order #${order.order_number} sent to kitchen.\n\nKitchen will prepare your order. Process payment when ready.`,
        [{ 
          text: 'OK',
          onPress: () => {
            // Don't clear cart yet - keep for payment processing
            loadData();
          }
        }]
      );
      
    } catch (error) {
      console.error('Error placing order:', error);
      setError(`Failed to send order to kitchen: ${error.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCashPayment = () => {
    if (!validateCart()) return;
    
    const { total } = calculateTotal();
    Alert.alert(
      'Cash Payment 💵',
      `Process cash payment of ${formatCurrency(total)}?\n\nPlease ensure you have received the correct amount from the customer.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Process Payment', onPress: () => completePayment('Cash') }
      ]
    );
  };

  const handleCreditPayment = () => {
    if (!validateCart()) return;
    
    const { total } = calculateTotal();
    Alert.alert(
      'Credit Card Payment 💳',
      `Process credit card payment of ${formatCurrency(total)}?\n\nEnsure the card reader is ready and the customer has inserted their card.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Process Payment', onPress: () => completePayment('Credit Card') }
      ]
    );
  };

  const handleSettle = () => {
    if (!validateCart()) return;
    
    audioManager.playSound('buttonClick').catch(() => {});
    
    Alert.alert(
      'Settlement Options ⚙️',
      'Choose how to settle this order:',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Room Charge 🏨', onPress: () => handleRoomCharge() },
        { text: 'Complimentary 🎁', onPress: () => handleComplimentary() },
        { text: 'Split Bill 📊', onPress: () => handleSplitBill() }
      ]
    );
  };

  const handleRoomCharge = () => {
    const { total } = calculateTotal();
    Alert.prompt(
      'Room Charge 🏨',
      `Charge ${formatCurrency(total)} to which room number?\n\nPlease verify the room number with the guest.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Charge Room', 
          onPress: (roomNumber) => {
            if (roomNumber && roomNumber.trim() && /^\d+$/.test(roomNumber.trim())) {
              completePayment(`Room ${roomNumber.trim()} Charge`);
            } else {
              Alert.alert('Invalid Room Number', 'Please enter a valid numeric room number (e.g., 101, 205)');
            }
          }
        }
      ],
      'plain-text',
      '',
      'numeric'
    );
  };

  const handleComplimentary = () => {
    const { total } = calculateTotal();
    Alert.alert(
      'Complimentary Order 🎁',
      `Mark order for ${formatCurrency(total)} as complimentary (free)?\n\nThis action requires manager approval in a real system.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm Complimentary', 
          onPress: () => completePayment('Complimentary')
        }
      ]
    );
  };

  const handleSplitBill = () => {
    const { total } = calculateTotal();
    Alert.alert(
      'Split Bill Options 📊',
      `Total amount: ${formatCurrency(total)}\n\nHow would you like to split this bill?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Split Evenly', onPress: () => handleEvenSplit() },
        { text: 'Split by Item', onPress: () => handleItemSplit() },
        { text: 'Custom Split', onPress: () => handleCustomSplit() }
      ]
    );
  };

  const handleEvenSplit = () => {
    Alert.prompt(
      'Split Evenly 👥',
      'How many people will split this bill?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Calculate Split',
          onPress: (value) => {
            const ways = parseInt(value || '2');
            if (ways >= 2 && ways <= 10) {
              const { total } = calculateTotal();
              const amountPerPerson = Math.round((total / ways) * 100) / 100;
              Alert.alert(
                'Split Bill Calculation 🧮',
                `${formatCurrency(total)} ÷ ${ways} people = ${formatCurrency(amountPerPerson)} per person\n\nProceed with split payment?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Process Split', onPress: () => completePayment(`Split ${ways} ways - ${formatCurrency(amountPerPerson)} each`) }
                ]
              );
            } else {
              Alert.alert('Invalid Split', 'Please enter a number between 2 and 10 people.');
            }
          }
        }
      ],
      'plain-text',
      '2',
      'numeric'
    );
  };

  const handleItemSplit = () => {
    Alert.alert(
      'Split by Item 📝',
      'This feature allows customers to pay for specific items individually.\n\nIn a full implementation, this would show an item-by-item selection interface.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue with Item Split', onPress: () => completePayment('Split by Item') }
      ]
    );
  };

  const handleCustomSplit = () => {
    Alert.alert(
      'Custom Split 💰',
      'This feature allows entering custom amounts for each payment.\n\nIn a full implementation, this would show an amount entry interface for each payment.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue with Custom Split', onPress: () => completePayment('Custom Split') }
      ]
    );
  };

  const clearCart = useCallback(() => {
    try {
      setError(null);
      audioManager.playSound('buttonClick').catch(() => {});
      
      if (cart.length === 0) {
        Alert.alert('Cart Empty', 'Cart is already empty.');
        return;
      }
      
      setCart([]);
      Alert.alert('Cart Cleared ✅', 'All items removed from cart.');
    } catch (error) {
      console.error('Error clearing cart:', error);
      setError('Failed to clear cart.');
    }
  }, [cart]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      await loadData();
    } catch (error) {
      setError('Failed to refresh data. Please try again.');
    } finally {
      setRefreshing(false);
    }
  }, []);

  const formatCurrency = useCallback((amount: number) => {
    try {
      return currencyManager.formatAmount(amount, hotelSettings?.currency);
    } catch (error) {
      console.error('Currency formatting error:', error);
      return `$${amount.toFixed(2)}`; // Fallback formatting
    }
  }, [hotelSettings]);

  const getFilteredItems = useMemo(() => {
    try {
      if (selectedCategory === 'all') {
        return menuItems.filter(item => 
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
          item.is_available &&
          item.price > 0
        );
      }
      
      const category = categories.find(cat => cat.id === selectedCategory);
      return category ? category.items.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
        item.is_available &&
        item.price > 0
      ) : [];
    } catch (error) {
      console.error('Error filtering items:', error);
      return [];
    }
  }, [menuItems, selectedCategory, searchQuery, categories]);

  // Memoized calculations for performance
  const totals = useMemo(() => calculateTotal(), [calculateTotal]);
  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
  const hasItems = cart.length > 0;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ecf0f1" />
          <Text style={styles.loadingText}>Loading Restaurant POS...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !hotelSettings) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <AlertTriangle size={48} color="#e74c3c" />
          <Text style={styles.errorTitle}>System Error</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={initializeComponent}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#2c3e50', '#34495e']}
        style={styles.header}
      >
        <View style={styles.headerLeft}>
          <View style={styles.logoContainer}>
            <ChefHat size={24} color="#ecf0f1" />
            <Text style={styles.brandName}>foodiv</Text>
          </View>
          <View style={styles.orderInfo}>
            <Text style={styles.orderType}>RESTAURANT POS</Text>
            <Text style={styles.serverInfo}>SERVER: {serverName}</Text>
          </View>
        </View>
        
        <View style={styles.headerCenter}>
          <Text style={styles.guestInfo}>{currentGuest}</Text>
          <Text style={styles.cartInfo}>
            {cartCount} item{cartCount !== 1 ? 's' : ''} • {formatCurrency(totals.total)}
          </Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.searchButton}
            onPress={() => {
              // Focus search input or show search modal
              Keyboard.dismiss();
            }}
          >
            <Search size={20} color="#ecf0f1" />
            <Text style={styles.searchText}>SEARCH</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Error Display */}
      {error && (
        <View style={styles.errorBanner}>
          <AlertTriangle size={16} color="#e74c3c" />
          <Text style={styles.errorBannerText}>{error}</Text>
          <TouchableOpacity onPress={() => setError(null)}>
            <Text style={styles.errorDismiss}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.mainContent}>
        {/* Left Panel - Categories and Items */}
        <View style={styles.leftPanel}>
          {/* Search Input */}
          <View style={styles.searchContainer}>
            <Search size={16} color="#7f8c8d" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search menu items..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#7f8c8d"
            />
          </View>

          {/* Category Grid */}
          <View style={styles.categoryGrid}>
            <TouchableOpacity
              style={[styles.categoryTile, selectedCategory === 'all' && styles.selectedCategory]}
              onPress={() => {
                setSelectedCategory('all');
                audioManager.playSound('buttonClick').catch(() => {});
              }}
            >
              <LinearGradient
                colors={selectedCategory === 'all' ? ['#3498db', '#2980b9'] : ['#ecf0f1', '#bdc3c7']}
                style={styles.categoryGradient}
              >
                <Text style={styles.categoryIcon}>🍴</Text>
                <Text style={[styles.categoryText, { color: selectedCategory === 'all' ? '#fff' : '#2c3e50' }]}>
                  ALL ITEMS
                </Text>
                <Text style={styles.categoryCount}>({menuItems.length})</Text>
              </LinearGradient>
            </TouchableOpacity>

            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[styles.categoryTile, selectedCategory === category.id && styles.selectedCategory]}
                onPress={() => {
                  setSelectedCategory(category.id);
                  audioManager.playSound('buttonClick').catch(() => {});
                }}
              >
                <LinearGradient
                  colors={selectedCategory === category.id ? category.color : ['#ecf0f1', '#bdc3c7']}
                  style={styles.categoryGradient}
                >
                  <Text style={styles.categoryIcon}>{category.icon}</Text>
                  <Text style={[styles.categoryText, { color: selectedCategory === category.id ? '#fff' : '#2c3e50' }]}>
                    {category.name}
                  </Text>
                  <Text style={styles.categoryCount}>({category.items.length})</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>

          {/* Menu Items Grid */}
          <ScrollView 
            style={styles.itemsGrid}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.itemsContainer}>
              {getFilteredItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.menuItemTile}
                  onPress={() => addToCart(item)}
                  disabled={isProcessing}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#e74c3c', '#c0392b']}
                    style={styles.menuItemGradient}
                  >
                    <Text style={styles.menuItemName} numberOfLines={2}>
                      {item.name.toUpperCase()}
                    </Text>
                    <Text style={styles.menuItemPrice}>{formatCurrency(item.price)}</Text>
                    {item.prep_time_minutes > 0 && (
                      <Text style={styles.menuItemTime}>
                        {item.prep_time_minutes}min
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              ))}
              
              {getFilteredItems.length === 0 && (
                <View style={styles.noItemsContainer}>
                  <Text style={styles.noItemsText}>
                    {searchQuery ? 'No items found matching your search' : 'No items available in this category'}
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>

        {/* Right Panel - Order Management */}
        <View style={styles.rightPanel}>
          <LinearGradient
            colors={['#ecf0f1', '#bdc3c7']}
            style={styles.orderPanel}
          >
            {/* Table Number Input */}
            <View style={styles.tableNumberContainer}>
              <Text style={styles.tableLabel}>TABLE #</Text>
              <TextInput
                style={styles.tableInput}
                value={tableNumber}
                onChangeText={setTableNumber}
                placeholder="Enter table number"
                keyboardType="numeric"
                maxLength={3}
              />
            </View>

            {/* Order List */}
            <ScrollView style={styles.orderList} showsVerticalScrollIndicator={false}>
              {cart.map((item, index) => (
                <View key={`${item.menuItem.id}-${index}`} style={styles.orderItem}>
                  <View style={styles.orderItemHeader}>
                    <TouchableOpacity 
                      style={styles.removeButton}
                      onPress={() => removeFromCart(item.menuItem.id)}
                    >
                      <Text style={styles.removeButtonText}>✕</Text>
                    </TouchableOpacity>
                    <Text style={styles.orderItemNumber}>{index + 1}</Text>
                    <Text style={styles.orderItemName} numberOfLines={2}>
                      {item.menuItem.name.toUpperCase()}
                    </Text>
                    <Text style={styles.orderItemPrice}>
                      {formatCurrency(item.menuItem.price * item.quantity)}
                    </Text>
                  </View>
                  <View style={styles.orderItemDetails}>
                    <Text style={styles.orderItemCategory}>
                      {item.menuItem.category.toUpperCase()}
                    </Text>
                    <View style={styles.quantityControls}>
                      <TouchableOpacity
                        style={[styles.quantityButton, { opacity: item.quantity <= 1 ? 0.5 : 1 }]}
                        onPress={() => updateQuantity(item.menuItem.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                      >
                        <Text style={styles.quantityButtonText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.quantity}>{item.quantity}</Text>
                      <TouchableOpacity
                        style={[styles.quantityButton, { opacity: item.quantity >= MAX_QUANTITY ? 0.5 : 1 }]}
                        onPress={() => updateQuantity(item.menuItem.id, item.quantity + 1)}
                        disabled={item.quantity >= MAX_QUANTITY}
                      >
                        <Text style={styles.quantityButtonText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
              
              {cart.length === 0 && (
                <View style={styles.emptyCartContainer}>
                  <ChefHat size={48} color="#bdc3c7" />
                  <Text style={styles.emptyCartText}>Cart is empty</Text>
                  <Text style={styles.emptyCartSubtext}>Add items from the menu to get started</Text>
                </View>
              )}
            </ScrollView>

            {/* Order Total */}
            <View style={styles.orderTotal}>
              <View style={styles.totalDisplay}>
                <View style={styles.totalBreakdown}>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Subtotal:</Text>
                    <Text style={styles.totalValue}>{formatCurrency(totals.subtotal)}</Text>
                  </View>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Tax ({((hotelSettings?.taxRate || 8.5))}%):</Text>
                    <Text style={styles.totalValue}>{formatCurrency(totals.tax)}</Text>
                  </View>
                  {totals.serviceCharge > 0 && (
                    <View style={styles.totalRow}>
                      <Text style={styles.totalLabel}>Service ({((hotelSettings?.serviceChargeRate || 0))}%):</Text>
                      <Text style={styles.totalValue}>{formatCurrency(totals.serviceCharge)}</Text>
                    </View>
                  )}
                  <View style={[styles.totalRow, styles.grandTotalRow]}>
                    <Text style={styles.grandTotalLabel}>TOTAL:</Text>
                    <Text style={styles.grandTotalValue}>{formatCurrency(totals.total)}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <View style={styles.topButtons}>
                <TouchableOpacity 
                  style={[
                    styles.actionButton, 
                    { backgroundColor: hasItems && !isProcessing ? '#95a5a6' : '#7f8c8d' }
                  ]}
                  onPress={hasItems && !isProcessing ? handleNoReceipt : undefined}
                  disabled={!hasItems || isProcessing}
                  activeOpacity={hasItems && !isProcessing ? 0.7 : 1}
                >
                  <Receipt size={16} color="#fff" />
                  <Text style={styles.actionButtonText}>NO RECEIPT</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[
                    styles.actionButton, 
                    { backgroundColor: hasItems && !isProcessing ? '#f39c12' : '#d68910' }
                  ]}
                  onPress={hasItems && !isProcessing ? clearCart : undefined}
                  disabled={!hasItems || isProcessing}
                  activeOpacity={hasItems && !isProcessing ? 0.7 : 1}
                >
                  <Trash2 size={16} color="#fff" />
                  <Text style={styles.actionButtonText}>CLEAR</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[
                    styles.actionButton, 
                    { backgroundColor: hasItems && !isProcessing ? '#27ae60' : '#52c41a' }
                  ]}
                  onPress={hasItems && !isProcessing ? handlePlaceOrder : undefined}
                  disabled={!hasItems || isProcessing}
                  activeOpacity={hasItems && !isProcessing ? 0.7 : 1}
                >
                  {isProcessing ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <CheckCircle size={16} color="#fff" />
                  )}
                  <Text style={styles.actionButtonText}>
                    {isProcessing ? 'PROCESSING...' : 'ORDER'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.bottomButtons}>
                <TouchableOpacity 
                  style={[
                    styles.paymentButton, 
                    { backgroundColor: hasItems && !isProcessing ? '#2c3e50' : '#566573' }
                  ]}
                  onPress={hasItems && !isProcessing ? handleCashPayment : undefined}
                  disabled={!hasItems || isProcessing}
                  activeOpacity={hasItems && !isProcessing ? 0.7 : 1}
                >
                  <DollarSign size={16} color="#fff" />
                  <Text style={styles.paymentButtonText}>CASH</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[
                    styles.paymentButton, 
                    { backgroundColor: hasItems && !isProcessing ? '#2c3e50' : '#566573' }
                  ]}
                  onPress={hasItems && !isProcessing ? handleCreditPayment : undefined}
                  disabled={!hasItems || isProcessing}
                  activeOpacity={hasItems && !isProcessing ? 0.7 : 1}
                >
                  <CreditCard size={16} color="#fff" />
                  <Text style={styles.paymentButtonText}>CREDIT</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[
                    styles.paymentButton, 
                    { backgroundColor: hasItems && !isProcessing ? '#2c3e50' : '#566573' }
                  ]}
                  onPress={hasItems && !isProcessing ? handleSettle : undefined}
                  disabled={!hasItems || isProcessing}
                  activeOpacity={hasItems && !isProcessing ? 0.7 : 1}
                >
                  <Settings size={16} color="#fff" />
                  <Text style={styles.paymentButtonText}>SETTLE</Text>
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2c3e50',
  },
  loadingText: {
    color: '#ecf0f1',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2c3e50',
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#e74c3c',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#ecf0f1',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e74c3c',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  errorBannerText: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  errorDismiss: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    paddingHorizontal: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandName: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#ecf0f1',
  },
  orderInfo: {
    alignItems: 'flex-start',
  },
  orderType: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#ecf0f1',
  },
  serverInfo: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#bdc3c7',
  },
  headerCenter: {
    alignItems: 'center',
  },
  guestInfo: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#ecf0f1',
    marginBottom: 4,
  },
  cartInfo: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#bdc3c7',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#34495e',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  searchText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#ecf0f1',
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
  },
  leftPanel: {
    flex: 2,
    backgroundColor: '#34495e',
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2c3e50',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: '#ecf0f1',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categoryTile: {
    width: (width * 0.65 - 48) / 3,
    height: 90,
    borderRadius: 8,
  },
  selectedCategory: {
    transform: [{ scale: 1.05 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  categoryGradient: {
    flex: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  categoryIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 2,
  },
  categoryCount: {
    fontSize: 8,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  itemsGrid: {
    flex: 1,
  },
  itemsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  menuItemTile: {
    width: (width * 0.65 - 48) / 4,
    height: 110,
    borderRadius: 8,
  },
  menuItemGradient: {
    flex: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  menuItemName: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 4,
  },
  menuItemPrice: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#fff',
    marginBottom: 2,
  },
  menuItemTime: {
    fontSize: 8,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  noItemsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noItemsText: {
    color: '#bdc3c7',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  rightPanel: {
    flex: 1,
    backgroundColor: '#2c3e50',
    padding: 2,
  },
  orderPanel: {
    flex: 1,
    borderRadius: 8,
    padding: 16,
  },
  tableNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    gap: 8,
  },
  tableLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#2c3e50',
  },
  tableInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#2c3e50',
    textAlign: 'center',
  },
  orderList: {
    flex: 1,
    marginBottom: 16,
  },
  orderItem: {
    backgroundColor: '#fff',
    borderRadius: 6,
    marginBottom: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  orderItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  removeButton: {
    width: 20,
    height: 20,
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Inter-Bold',
  },
  orderItemNumber: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#2c3e50',
    minWidth: 16,
  },
  orderItemName: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#2c3e50',
  },
  orderItemPrice: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#2c3e50',
  },
  orderItemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 28,
  },
  orderItemCategory: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#7f8c8d',
    flex: 1,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityButton: {
    width: 24,
    height: 24,
    backgroundColor: '#3498db',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Inter-Bold',
  },
  quantity: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#2c3e50',
    minWidth: 20,
    textAlign: 'center',
  },
  emptyCartContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyCartText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#7f8c8d',
    marginTop: 12,
  },
  emptyCartSubtext: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#95a5a6',
    marginTop: 4,
    textAlign: 'center',
  },
  orderTotal: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  totalDisplay: {
    alignItems: 'stretch',
  },
  totalBreakdown: {
    gap: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#7f8c8d',
  },
  totalValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#2c3e50',
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#bdc3c7',
    paddingTop: 8,
    marginTop: 8,
  },
  grandTotalLabel: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#2c3e50',
  },
  grandTotalValue: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#27ae60',
  },
  actionButtons: {
    gap: 8,
  },
  topButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    height: 48,
    borderRadius: 6,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#fff',
  },
  bottomButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  paymentButton: {
    flex: 1,
    height: 48,
    borderRadius: 6,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  paymentButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#fff',
  },
});