import React, { useEffect, useState } from 'react';
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
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { db } from '@/lib/database';
import { Database } from '@/types/database';
import { 
  Wine, 
  Search, 
  User, 
  Trash2, 
  CreditCard, 
  DollarSign,
  Clock,
  Receipt,
  Settings,
  Martini
} from 'lucide-react-native';
import { playButtonClick, playAddToCart, playOrderComplete } from '@/lib/audio';
import { currencyManager } from '@/lib/currency';
import { receiptPrinter } from '@/lib/printer';
import { loadHotelSettings } from '@/lib/storage';

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

export default function Bar() {
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
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);

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
      const [menuData, ordersData] = await Promise.all([
        db.select<MenuItem>('menu_items'),
        db.select<Order>('orders')
      ]);
      setMenuItems(menuData.filter(item => ['wine', 'cocktail', 'beer', 'beverage'].includes(item.category)));
      setOrders(ordersData.filter(order => order.order_type === 'bar'));
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load bar data');
    } finally {
      setLoading(false);
    }
  };

  const categories: POSCategory[] = [
    {
      id: 'beer',
      name: 'BEER BASKET',
      color: ['#d4a574', '#b8956a'],
      icon: '🍺',
      items: menuItems.filter(item => item.category === 'beer' || item.name.toLowerCase().includes('beer'))
    },
    {
      id: 'wine',
      name: 'WINE',
      color: ['#8b0000', '#660000'],
      icon: '🍷',
      items: menuItems.filter(item => item.category === 'wine')
    },
    {
      id: 'cocktail_short',
      name: 'COCKTAIL SHORT',
      color: ['#dc143c', '#b91c3c'],
      icon: '🍸',
      items: menuItems.filter(item => item.category === 'cocktail' && item.name.toLowerCase().includes('short'))
    },
    {
      id: 'cocktail',
      name: 'COCKTAIL',
      color: ['#dc143c', '#b91c3c'],
      icon: '🍹',
      items: menuItems.filter(item => item.category === 'cocktail')
    },
    {
      id: 'drinks',
      name: 'DRINKS',
      color: ['#228b22', '#006400'],
      icon: '🥤',
      items: menuItems.filter(item => item.category === 'beverage')
    },
    {
      id: 'spirits',
      name: 'SPIRITS',
      color: ['#4169e1', '#1e40af'],
      icon: '🥃',
      items: menuItems.filter(item => item.name.toLowerCase().includes('whiskey') || item.name.toLowerCase().includes('vodka'))
    }
  ];

  const addToCart = (menuItem: MenuItem) => {
    playAddToCart();
    const existingItem = cart.find(item => item.menuItem.id === menuItem.id);
    if (existingItem) {
      setCart(cart.map(item => 
        item.menuItem.id === menuItem.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { menuItem, quantity: 1 }]);
    }
  };

  const removeFromCart = (menuItemId: string) => {
    setCart(cart.filter(item => item.menuItem.id !== menuItemId));
  };

  const updateQuantity = (menuItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(menuItemId);
    } else {
      setCart(cart.map(item => 
        item.menuItem.id === menuItemId 
          ? { ...item, quantity }
          : item
      ));
    }
  };

  const calculateTotal = () => {
    const subtotal = cart.reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0);
    const taxRate = (hotelSettings?.taxRate || 8.5) / 100;
    const serviceChargeRate = (hotelSettings?.serviceChargeRate || 0) / 100;
    const tax = subtotal * taxRate;
    const serviceCharge = subtotal * serviceChargeRate;
    const total = subtotal + tax + serviceCharge;
    return { subtotal, tax, serviceCharge, total };
  };

  const placeOrder = async () => {
    playButtonClick();
    if (cart.length === 0) {
      Alert.alert('Error', 'Cart is empty');
      return;
    }

    try {
      const { subtotal, tax, total } = calculateTotal();
      const serviceCharge = subtotal * ((hotelSettings?.serviceChargeRate || 0) / 100);
      const finalTotal = subtotal + tax + serviceCharge;
      
      const orderItems = cart.map(item => ({
        menu_item_id: item.menuItem.id,
        quantity: item.quantity,
        unit_price: item.menuItem.price,
        special_instructions: item.specialInstructions || '',
      }));

      const orderNumber = `B-${Date.now()}`;
      const newOrder = await db.insert<Order>('orders', {
        order_number: orderNumber,
        table_number: tableNumber || undefined,
        order_type: 'bar',
        items: orderItems,
        subtotal,
        tax_amount: tax,
        service_charge: serviceCharge,
        total_amount: finalTotal,
        status: 'pending',
        payment_status: 'pending',
      });

      setOrderPlaced(true);
      setCurrentOrderId(newOrder.id);
      Alert.alert('Success', 'Order placed! Please select payment method to complete.');
    } catch (error) {
      console.error('Error placing order:', error);
      Alert.alert('Error', 'Failed to place order');
    }
  };

  const completePayment = async (paymentMethod: string) => {
    if (!currentOrderId) return;

    try {
      // Update order payment status
      await db.update<Order>('orders', currentOrderId, {
        payment_status: 'paid',
        status: 'confirmed',
      });

      playOrderComplete();
      
      // Print receipt if printer available
      try {
        const { subtotal, tax, serviceCharge, total } = calculateTotal();
        await receiptPrinter.printOrderReceipt({
          order_number: `B-${Date.now()}`,
          order_type: 'bar',
          items: cart.map(item => ({
            menu_item_id: item.menuItem.id,
            quantity: item.quantity,
            unit_price: item.menuItem.price,
            special_instructions: item.specialInstructions || '',
          })),
          subtotal,
          tax_amount: tax,
          service_charge: serviceCharge,
          total_amount: total,
          created_at: new Date().toISOString(),
          table_number: tableNumber,
        }, hotelSettings?.currency || 'USD', hotelSettings);
      } catch (printError) {
        console.warn('Print failed:', printError);
      }
      
      Alert.alert('Payment Complete', `${paymentMethod} payment processed successfully`);
      
      // Clear cart and reset state
      setCart([]);
      setTableNumber('');
      setOrderPlaced(false);
      setCurrentOrderId(null);
      loadData();
    } catch (error) {
      console.error('Error completing payment:', error);
      Alert.alert('Error', 'Failed to process payment');
    }
  };
  const handleNoReceipt = () => {
    playButtonClick();
    if (cart.length === 0) {
      Alert.alert('Error', 'Cart is empty');
      return;
    }

    Alert.alert(
      'No Receipt',
      'Process order without printing receipt?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Process', 
          onPress: async () => {
            if (!orderPlaced) {
              await placeOrder();
            }
            await completePayment('No Receipt');
          }
        }
      ]
    );
  };

  const handleSaveOrder = () => {
    playButtonClick();
    if (cart.length === 0) {
      Alert.alert('Error', 'Cart is empty');
      return;
    }

    if (orderPlaced) {
      Alert.alert('Info', 'Order already placed. Please complete payment or start a new order.');
      return;
    }

    Alert.prompt(
      'Save Order',
      'Enter table number or guest name:',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Save', 
          onPress: async (identifier) => {
            try {
              const { subtotal, tax, total } = calculateTotal();
              const serviceCharge = subtotal * ((hotelSettings?.serviceChargeRate || 0) / 100);
              const finalTotal = subtotal + tax + serviceCharge;
              
              const orderItems = cart.map(item => ({
                menu_item_id: item.menuItem.id,
                quantity: item.quantity,
                unit_price: item.menuItem.price,
                special_instructions: item.specialInstructions || '',
              }));

              await db.insert<Order>('orders', {
                order_number: `B-SAVED-${Date.now()}`,
                table_number: identifier || 'Saved Order',
                order_type: 'bar',
                items: orderItems,
                subtotal,
                tax_amount: tax,
                service_charge: serviceCharge,
                total_amount: finalTotal,
                status: 'pending',
                payment_status: 'pending',
              });

              Alert.alert('Success', `Order saved for ${identifier || 'guest'}`);
              setCart([]);
              setTableNumber('');
              setOrderPlaced(false);
              setCurrentOrderId(null);
              loadData();
            } catch (error) {
              console.error('Error saving order:', error);
              Alert.alert('Error', 'Failed to save order');
            }
          }
        }
      ],
      'plain-text',
      tableNumber || ''
    );
  };

  const handleCashPayment = () => {
    playButtonClick();
    if (cart.length === 0) {
      Alert.alert('Error', 'Cart is empty');
      return;
    }

    const { total } = calculateTotal();
    
    if (!orderPlaced) {
      Alert.alert(
        'Cash Payment',
        `Total: ${formatCurrency(total)}\n\nPlace order and process cash payment?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Process Payment', 
            onPress: async () => {
              await placeOrder();
              await completePayment('Cash');
            }
          }
        ]
      );
    } else {
      Alert.alert(
        'Cash Payment',
        `Total: ${formatCurrency(total)}\n\nProcess cash payment?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Process Payment', onPress: () => completePayment('Cash') }
        ]
      );
    }
  };

  const handleCreditPayment = () => {
    playButtonClick();
    if (cart.length === 0) {
      Alert.alert('Error', 'Cart is empty');
      return;
    }

    const { total } = calculateTotal();
    
    if (!orderPlaced) {
      Alert.alert(
        'Credit Card Payment',
        `Total: ${formatCurrency(total)}\n\nPlace order and process credit card payment?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Process Payment', 
            onPress: async () => {
              await placeOrder();
              await completePayment('Credit Card');
            }
          }
        ]
      );
    } else {
      Alert.alert(
        'Credit Card Payment',
        `Total: ${formatCurrency(total)}\n\nProcess credit card payment?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Process Payment', onPress: () => completePayment('Credit Card') }
        ]
      );
    }
  };

  const handleSettle = () => {
    playButtonClick();
    if (cart.length === 0) {
      Alert.alert('Error', 'Cart is empty');
      return;
    }

    Alert.alert(
      'Settle Order',
      'Choose settlement option:',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Room Charge', onPress: () => handleRoomCharge() },
        { text: 'Comp/Free', onPress: () => handleComplimentary() },
        { text: 'Split Bill', onPress: () => handleSplitBill() }
      ]
    );
  };

  const handleRoomCharge = async () => {
    if (!orderPlaced) {
      await placeOrder();
    }
    await completePayment('Room Charge');
  };

  const handleComplimentary = async () => {
    Alert.alert(
      'Complimentary Order',
      'Mark this order as complimentary (free)?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          onPress: async () => {
            if (!orderPlaced) {
              await placeOrder();
            }
            await completePayment('Complimentary');
          }
        }
      ]
    );
  };

  const handleSplitBill = () => {
    Alert.alert(
      'Split Bill',
      'Split bill functionality would allow dividing the order among multiple payments. This feature would be implemented with a detailed split interface.',
      [{ text: 'OK' }]
    );
  };
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const { subtotal, tax, serviceCharge, total } = calculateTotal();
  
  const formatCurrency = (amount: number) => {
    return currencyManager.formatAmount(amount, hotelSettings?.currency);
  };

  const getFilteredItems = () => {
    if (selectedCategory === 'all') {
      return menuItems.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) && item.is_available
      );
    }
    
    const category = categories.find(cat => cat.id === selectedCategory);
    return category ? category.items.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) && item.is_available
    ) : [];
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#2c3e50', '#34495e']}
        style={styles.header}
      >
        <View style={styles.headerLeft}>
          <View style={styles.logoContainer}>
            <Wine size={24} color="#ecf0f1" />
            <Text style={styles.brandName}>foodiv</Text>
          </View>
          <View style={styles.orderInfo}>
            <Text style={styles.orderType}>NEW BAR ORDER</Text>
            <Text style={styles.serverInfo}>SERVER: {serverName}</Text>
          </View>
        </View>
        
        <View style={styles.headerCenter}>
          <Text style={styles.guestInfo}>{currentGuest}</Text>
          <View style={styles.guestControls}>
            <TouchableOpacity style={styles.guestButton}>
              <Text style={styles.guestButtonText}>◀</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.guestButton}>
              <Text style={styles.guestButtonText}>▶</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.searchButton}>
            <Search size={20} color="#ecf0f1" />
            <Text style={styles.searchText}>SEARCH</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.mainContent}>
        {/* Left Panel - Categories and Items */}
        <View style={styles.leftPanel}>
          {/* Category Grid */}
          <View style={styles.categoryGrid}>
            <TouchableOpacity
              style={[styles.categoryTile, selectedCategory === 'all' && styles.selectedCategory]}
              onPress={() => setSelectedCategory('all')}
            >
              <LinearGradient
                colors={selectedCategory === 'all' ? ['#3498db', '#2980b9'] : ['#ecf0f1', '#bdc3c7']}
                style={styles.categoryGradient}
              >
                <Text style={styles.categoryIcon}>🍻</Text>
                <Text style={[styles.categoryText, { color: selectedCategory === 'all' ? '#fff' : '#2c3e50' }]}>
                  ALL DRINKS
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[styles.categoryTile, selectedCategory === category.id && styles.selectedCategory]}
                onPress={() => setSelectedCategory(category.id)}
              >
                <LinearGradient
                  colors={selectedCategory === category.id ? category.color : ['#ecf0f1', '#bdc3c7']}
                  style={styles.categoryGradient}
                >
                  <Text style={styles.categoryIcon}>{category.icon}</Text>
                  <Text style={[styles.categoryText, { color: selectedCategory === category.id ? '#fff' : '#2c3e50' }]}>
                    {category.name}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>

          {/* Menu Items Grid */}
          <ScrollView 
            style={styles.itemsGrid}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            <View style={styles.itemsContainer}>
              {getFilteredItems().map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.menuItemTile}
                  onPress={() => addToCart(item)}
                >
                  <LinearGradient
                    colors={['#8b0000', '#660000']}
                    style={styles.menuItemGradient}
                  >
                    <Text style={styles.menuItemName}>{item.name.toUpperCase()}</Text>
                    <Text style={styles.menuItemPrice}>{formatCurrency(item.price)}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Right Panel - Order Management */}
        <View style={styles.rightPanel}>
          <LinearGradient
            colors={['#ecf0f1', '#bdc3c7']}
            style={styles.orderPanel}
          >
            {/* Order List */}
            <ScrollView style={styles.orderList}>
              {cart.map((item, index) => (
                <View key={`${item.menuItem.id}-${index}`} style={styles.orderItem}>
                  <View style={styles.orderItemHeader}>
                    <TouchableOpacity style={styles.playButton}>
                      <Text style={styles.playButtonText}>▶</Text>
                    </TouchableOpacity>
                    <Text style={styles.orderItemNumber}>{index + 1}</Text>
                    <Text style={styles.orderItemName}>{item.menuItem.name.toUpperCase()}</Text>
                    <Text style={styles.orderItemPrice}>{formatCurrency(item.menuItem.price * item.quantity)}</Text>
                  </View>
                  <View style={styles.orderItemDetails}>
                    <Text style={styles.orderItemCategory}>{item.menuItem.category}</Text>
                    <View style={styles.quantityControls}>
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => updateQuantity(item.menuItem.id, item.quantity - 1)}
                      >
                        <Text style={styles.quantityButtonText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.quantity}>{item.quantity}</Text>
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
            </ScrollView>

            {/* Order Total */}
            <View style={styles.orderTotal}>
              <View style={styles.totalDisplay}>
                <View style={styles.totalBreakdown}>
                  <Text style={styles.totalAmount}>{formatCurrency(total)}</Text>
                  <Text style={styles.taxAmount}>TAX {formatCurrency(tax)}</Text>
                  {serviceCharge > 0 && (
                    <Text style={styles.serviceAmount}>SERVICE {formatCurrency(serviceCharge)}</Text>
                  )}
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <View style={styles.topButtons}>
                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: '#95a5a6' }]}
                  onPress={handleNoReceipt}
                  activeOpacity={0.7}
                >
                  <Receipt size={16} color="#fff" />
                  <Text style={styles.actionButtonText}>NO RECEIPT</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: '#3498db' }]}
                  onPress={handleSaveOrder}
                  activeOpacity={0.7}
                >
                  <Clock size={16} color="#fff" />
                  <Text style={styles.actionButtonText}>SAVE</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[
                    styles.actionButton, 
                    { backgroundColor: cart.length > 0 ? '#27ae60' : '#95a5a6' }
                  ]}
                  onPress={placeOrder}
                  disabled={cart.length === 0}
                  activeOpacity={0.7}
                >
                  <Text style={styles.actionButtonText}>
                    {orderPlaced ? 'ORDER PLACED' : 'ORDER'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.bottomButtons}>
                <TouchableOpacity 
                  style={[styles.paymentButton, { backgroundColor: '#2c3e50' }]}
                  onPress={handleCashPayment}
                  activeOpacity={0.7}
                >
                  <DollarSign size={16} color="#fff" />
                  <Text style={styles.paymentButtonText}>CASH</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.paymentButton, { backgroundColor: '#2c3e50' }]}
                  onPress={handleCreditPayment}
                  activeOpacity={0.7}
                >
                  <CreditCard size={16} color="#fff" />
                  <Text style={styles.paymentButtonText}>CREDIT</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.paymentButton, { backgroundColor: '#2c3e50' }]}
                  onPress={handleSettle}
                  activeOpacity={0.7}
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
  guestControls: {
    flexDirection: 'row',
    gap: 8,
  },
  guestButton: {
    width: 24,
    height: 24,
    backgroundColor: '#34495e',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestButtonText: {
    color: '#ecf0f1',
    fontSize: 12,
    fontFamily: 'Inter-Bold',
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
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categoryTile: {
    width: (width * 0.65 - 48) / 3,
    height: 80,
    borderRadius: 8,
  },
  selectedCategory: {
    transform: [{ scale: 1.05 }],
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
    height: 100,
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
  orderList: {
    flex: 1,
    marginBottom: 16,
  },
  orderItem: {
    backgroundColor: '#fff',
    borderRadius: 6,
    marginBottom: 8,
    padding: 12,
  },
  orderItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  playButton: {
    width: 20,
    height: 20,
    backgroundColor: '#27ae60',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonText: {
    color: '#fff',
    fontSize: 10,
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
  orderTotal: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  totalDisplay: {
    alignItems: 'center',
  },
  totalBreakdown: {
    alignItems: 'flex-end',
    width: '100%',
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
  },
  serviceAmount: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#7f8c8d',
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
  },
  paymentButtonTouch: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  paymentButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#fff',
  },
  templateSection: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 12,
  },
  templateSectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1e293b',
    marginBottom: 16,
  },
});