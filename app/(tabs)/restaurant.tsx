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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthContext } from '@/contexts/AuthContext';
import { db } from '@/lib/database';
import { Database } from '@/types/database';
import { loadHotelSettings } from '@/lib/storage';
import { currencyManager } from '@/lib/currency';
import { 
  ChefHat, 
  Plus, 
  Minus, 
  Search, 
  ShoppingCart, 
  CreditCard, 
  DollarSign, 
  Users, 
  Clock,
  Receipt,
  Save,
  X
} from 'lucide-react-native';

type MenuItem = Database['public']['Tables']['menu_items']['Row'];

const { width, height } = Dimensions.get('window');

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  specialInstructions?: string;
}

export default function Restaurant() {
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

  const categories = useMemo(() => [
    {
      id: 'appetizers',
      name: 'APPETIZERS',
      color: ['#ff6b6b', '#ee5a52'],
      icon: '🥗',
      items: menuItems.filter(item => item.category === 'appetizer'),
    },
    {
      id: 'mains',
      name: 'MAIN COURSE',
      color: ['#4ecdc4', '#44a08d'],
      icon: '🍽️',
      items: menuItems.filter(item => item.category === 'main_course'),
    },
    {
      id: 'desserts',
      name: 'DESSERTS',
      color: ['#a8e6cf', '#7fcdcd'],
      icon: '🍰',
      items: menuItems.filter(item => item.category === 'dessert'),
    },
    {
      id: 'beverages',
      name: 'BEVERAGES',
      color: ['#ffd93d', '#6bcf7f'],
      icon: '🥤',
      items: menuItems.filter(item => item.category === 'beverage'),
    },
    {
      id: 'burgers',
      name: 'BURGERS',
      color: ['#8B4513', '#A0522D'],
      icon: '🍔',
      items: menuItems.filter(item => item.name.toLowerCase().includes('burger')),
    },
    {
      id: 'platters',
      name: 'PLATTERS',
      color: ['#CD853F', '#DEB887'],
      icon: '🍽️',
      items: menuItems.filter(item => item.name.toLowerCase().includes('platter')),
    },
    {
      id: 'seafood',
      name: 'SEAFOOD',
      color: ['#20B2AA', '#48D1CC'],
      icon: '🐟',
      items: menuItems.filter(item => item.name.toLowerCase().includes('fish') || item.name.toLowerCase().includes('salmon') || item.name.toLowerCase().includes('shrimp')),
    },
    {
      id: 'subs',
      name: 'SUBS',
      color: ['#FF4500', '#FF6347'],
      icon: '🥪',
      items: menuItems.filter(item => item.name.toLowerCase().includes('sub')),
    },
  ], [menuItems]);

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

  const processOrder = async (paymentMethod: string) => {
    if (isProcessing || cart.length === 0) return;
    
    setIsProcessing(true);

    try {
      const orderNumber = `R-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      const orderItems = cart.map(item => ({
        menu_item_id: item.menuItem.id,
        quantity: item.quantity,
        unit_price: item.menuItem.price,
        special_instructions: item.specialInstructions || '',
      }));

      await db.insert('orders', {
        order_number: orderNumber,
        table_number: `Guest ${currentGuest}`,
        order_type: 'restaurant',
        items: orderItems,
        subtotal: calculateTotals.subtotal,
        tax_amount: calculateTotals.tax,
        service_charge: 0,
        total_amount: calculateTotals.total,
        status: 'confirmed',
        payment_status: paymentMethod === 'ROOM CHARGE' ? 'pending' : 'paid',
        payment_method: paymentMethod.toLowerCase().replace(/\s+/g, '_'),
      });

      Alert.alert('Success', `Order ${orderNumber} placed successfully!`);
      
      // Clear cart and move to next guest
      setCart([]);
      if (currentGuest < totalGuests) {
        setCurrentGuest(currentGuest + 1);
      }
      
    } catch (error) {
      console.error('Error processing order:', error);
      Alert.alert('Error', 'Failed to process order. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const saveOrder = () => {
    if (cart.length === 0) {
      Alert.alert('Info', 'No items to save');
      return;
    }
    Alert.alert('Success', 'Order saved for later');
  };

  const cancelOrder = () => {
    if (cart.length === 0) return;
    
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order?',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Yes', onPress: () => setCart([]) }
      ]
    );
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const formatCurrency = useCallback((amount: number) => {
    try {
      return currencyManager.formatAmount(amount, hotelSettings?.currency);
    } catch (error) {
      return `$${amount.toFixed(2)}`;
    }
  }, [hotelSettings]);

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
          <TouchableOpacity style={styles.searchButton}>
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
                      <TouchableOpacity style={styles.playButton}>
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
                    <Text style={styles.orderItemPrice}>
                      {formatCurrency(item.menuItem.price * item.quantity)}
                    </Text>
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
            <TouchableOpacity style={styles.actionButton} onPress={() => Alert.alert('Info', 'No receipt option selected')}>
              <Receipt size={20} color="#64748b" />
              <Text style={styles.actionButtonText}>NO RECEIPT</Text>
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
              <Text style={[styles.actionButtonText, styles.orderButtonText]}>ORDER</Text>
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
            <TouchableOpacity style={styles.bottomButton}>
              <Text style={styles.bottomButtonText}>RECALL</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.bottomButton}>
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
                category: 'main_course',
                description: 'Italian meatballs with marinara sauce',
                is_available: true
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
                category: 'main_course',
                description: 'Grilled steak with peppers and onions',
                is_available: true
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
                category: 'main_course',
                description: 'Philadelphia style steak hoagie',
                is_available: true
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
                category: 'main_course',
                description: 'Spicy Italian sausage with peppers',
                is_available: true
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
                category: 'main_course',
                description: 'Pizza sauce, cheese, and pepperoni',
                is_available: true
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
                category: 'main_course',
                description: 'Grilled chicken breast with herbs',
                is_available: true
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
                category: 'main_course',
                description: 'BBQ roasted chicken with sauce',
                is_available: true
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
                category: 'main_course',
                description: 'Honey ham with lettuce and tomato',
                is_available: true
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
                category: 'main_course',
                description: 'Fresh tuna salad with vegetables',
                is_available: true
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
                category: 'main_course',
                description: 'Roasted turkey with cranberry sauce',
                is_available: true
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
                category: 'main_course',
                description: 'Bacon, lettuce, and tomato classic',
                is_available: true
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