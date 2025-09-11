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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthContext } from '@/contexts/AuthContext';
import { db } from '@/lib/database';
import { Database } from '@/types/database';
import { ExcelTemplateDownloader } from '@/components/ExcelTemplateDownloader';
import { POSErrorBoundary } from '@/components/POSErrorBoundary';
import { loadHotelSettings } from '@/lib/storage';
import { currencyManager } from '@/lib/currency';
import { audioManager, playButtonClick, playAddToCart, playOrderComplete } from '@/lib/audio';
import { POSValidator, CartItem as ValidatedCartItem } from '@/lib/pos-validation';
import { posOrderManager } from '@/lib/pos-order-manager';
import { 
  Wine, 
  Plus, 
  Minus, 
  Search, 
  ShoppingCart, 
  CreditCard, 
  DollarSign, 
  Users, 
  Clock,
  Waves,
  Star
} from 'lucide-react-native';

type MenuItem = Database['public']['Tables']['menu_items']['Row'];
type Order = Database['public']['Tables']['orders']['Row'];

const { width, height } = Dimensions.get('window');

type CartItem = ValidatedCartItem;

export default function Bar() {
  const { user } = useAuthContext();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [tableNumber, setTableNumber] = useState('');
  const [hotelSettings, setHotelSettings] = useState<any>(null);

  useEffect(() => {
    loadData();
    loadSettings();
    initializeAudio();
  }, []);

  const initializeAudio = async () => {
    try {
      await audioManager.initialize();
    } catch (error) {
      console.warn('Audio initialization failed (non-critical):', error);
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

  const categories = useMemo(() => [
    {
      id: 'all',
      name: 'ALL DRINKS',
      color: ['#64748b', '#475569'],
      icon: '🍹',
      items: menuItems,
    },
    {
      id: 'beer',
      name: 'BEER BASKET',
      color: ['#d4a574', '#b8956a'],
      icon: '🍺',
      items: menuItems.filter(item => item.category === 'beer'),
    },
    {
      id: 'wine',
      name: 'WINE',
      color: ['#8b0000', '#660000'],
      icon: '🍷',
      items: menuItems.filter(item => item.category === 'wine'),
    },
    {
      id: 'cocktail_short',
      name: 'COCKTAIL SHORT',
      color: ['#dc143c', '#b91c3c'],
      icon: '🍸',
      items: menuItems.filter(item => item.category === 'cocktail' && item.name.toLowerCase().includes('shot')),
    },
    {
      id: 'cocktail',
      name: 'COCKTAIL',
      color: ['#dc143c', '#b91c3c'],
      icon: '🍹',
      items: menuItems.filter(item => item.category === 'cocktail'),
    },
    {
      id: 'drinks',
      name: 'DRINKS',
      color: ['#228b22', '#006400'],
      icon: '🥤',
      items: menuItems.filter(item => ['beverage', 'coffee', 'tea', 'juice', 'water'].includes(item.category)),
    },
    {
      id: 'spirits',
      name: 'SPIRITS',
      color: ['#4169e1', '#1e40af'],
      icon: '🥃',
      items: menuItems.filter(item => item.category === 'spirits'),
    },
  ], [menuItems]);

  const filteredItems = useMemo(() => {
    const categoryItems = selectedCategory === 'all' 
      ? menuItems 
      : categories.find(cat => cat.id === selectedCategory)?.items || [];

    if (!searchQuery.trim()) {
      return categoryItems;
    }

    const query = searchQuery.toLowerCase();
    return categoryItems.filter(item =>
      item.name.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query)
    );
  }, [menuItems, selectedCategory, searchQuery, categories]);

  const addToCart = useCallback((menuItem: MenuItem) => {
    if (isProcessing) return;
    
    try {
      playAddToCart();
      
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
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  }, [isProcessing]);

  const updateQuantity = useCallback((menuItemId: string, newQuantity: number) => {
    if (isProcessing) return;
    
    try {
      playButtonClick();
      
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
    } catch (error) {
      console.error('Error updating quantity:', error);
    }
  }, [isProcessing]);

  const calculateTotals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0);
    const taxRate = (hotelSettings?.taxRate || 8.5) / 100;
    const serviceChargeRate = (hotelSettings?.serviceChargeRate || 0) / 100;
    
    const tax = subtotal * taxRate;
    const serviceCharge = subtotal * serviceChargeRate;
    const total = subtotal + tax + serviceCharge;

    return { subtotal, tax, serviceCharge, total };
  }, [cart, hotelSettings]);

  const processOrder = async (paymentMethod: string) => {
    if (isProcessing) return;
    
    // Validate cart before processing
    const cartValidation = POSValidator.validateCart(cart);
    if (!cartValidation.isValid) {
      Alert.alert('Error', cartValidation.error || 'Invalid cart');
      return;
    }

    setIsProcessing(true);

    try {
      const newOrder = await posOrderManager.createOrder({
        cart,
        tableNumber: tableNumber || 'Bar Service',
        orderType: 'bar',
        paymentMethod,
        paymentStatus: paymentMethod === 'ROOM CHARGE' ? 'pending' : 'paid',
        hotelSettings,
      });

      playOrderComplete();
      Alert.alert('Success', `Order ${newOrder.order_number} placed successfully!`);
      
      // Clear cart and reset
      setCart([]);
      setTableNumber('');
      
    } catch (error) {
      console.error('Error processing order:', error);
      Alert.alert('Error', 'Failed to process order. Please try again.');
    } finally {
      setIsProcessing(false);
    }
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
    <POSErrorBoundary posType="bar">
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#7c3aed', '#8b5cf6']}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.titleContainer}>
                <Wine size={28} color="white" />
                <View>
                  <Text style={styles.title}>Bar POS</Text>
                  <Text style={styles.subtitle}>Beverage Service System</Text>
                </View>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.mainContent}>
          {/* Left Panel - Menu */}
          <View style={styles.leftPanel}>
            {/* Search */}
            <View style={styles.searchContainer}>
              <Search size={20} color="#64748b" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search beverages..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#94a3b8"
              />
            </View>

            {/* Categories */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.categoriesContainer}
            >
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryButton,
                    selectedCategory === category.id && styles.activeCategoryButton
                  ]}
                  onPress={() => {
                    playButtonClick();
                    setSelectedCategory(category.id);
                  }}
                >
                  <LinearGradient
                    colors={selectedCategory === category.id ? category.color : ['#f8fafc', '#f1f5f9']}
                    style={styles.categoryGradient}
                  >
                    <Text style={styles.categoryIcon}>{category.icon}</Text>
                    <Text style={[
                      styles.categoryText,
                      selectedCategory === category.id && styles.activeCategoryText
                    ]}>
                      {category.name}
                    </Text>
                    <Text style={[
                      styles.categoryCount,
                      selectedCategory === category.id && styles.activeCategoryCount
                    ]}>
                      ({category.items.length})
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Menu Items */}
            <ScrollView
              style={styles.menuItemsContainer}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
              <View style={styles.menuGrid}>
                {filteredItems.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.menuItemCard}
                    onPress={() => addToCart(item)}
                    disabled={!item.is_available || isProcessing}
                  >
                    <LinearGradient
                      colors={item.is_available ? ['#ffffff', '#f8fafc'] : ['#f1f5f9', '#e2e8f0']}
                      style={styles.menuItemGradient}
                    >
                      <View style={styles.menuItemHeader}>
                        <Text style={[
                          styles.menuItemName,
                          !item.is_available && styles.unavailableText
                        ]}>
                          {item.name}
                        </Text>
                        <Text style={[
                          styles.menuItemPrice,
                          !item.is_available && styles.unavailableText
                        ]}>
                          {formatCurrency(item.price)}
                        </Text>
                      </View>
                      
                      <Text style={[
                        styles.menuItemDescription,
                        !item.is_available && styles.unavailableText
                      ]}>
                        {item.description}
                      </Text>

                      <View style={styles.menuItemFooter}>
                        <View style={styles.menuItemMeta}>
                          {item.prep_time_minutes > 0 && (
                            <View style={styles.metaItem}>
                              <Clock size={12} color="#64748b" />
                              <Text style={styles.metaText}>{item.prep_time_minutes}min</Text>
                            </View>
                          )}
                          {item.category === 'wine' && (
                            <Text style={styles.categoryFlag}>🍷</Text>
                          )}
                          {item.category === 'cocktail' && (
                            <Text style={styles.categoryFlag}>🍹</Text>
                          )}
                          {item.category === 'beer' && (
                            <Text style={styles.categoryFlag}>🍺</Text>
                          )}
                        </View>
                        
                        {!item.is_available && (
                          <Text style={styles.unavailableLabel}>Unavailable</Text>
                        )}
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Right Panel - Cart */}
          <View style={styles.rightPanel}>
            <LinearGradient
              colors={['#ffffff', '#f8fafc']}
              style={styles.cartContainer}
            >
              {/* Cart Header */}
              <View style={styles.cartHeader}>
                <View style={styles.cartTitleContainer}>
                  <ShoppingCart size={24} color="#7c3aed" />
                  <Text style={styles.cartTitle}>Current Order</Text>
                </View>
                <Text style={styles.cartItemCount}>
                  {cart.reduce((sum, item) => sum + item.quantity, 0)} items
                </Text>
              </View>

              {/* Table/Location Number */}
              <View style={styles.tableNumberContainer}>
                <Text style={styles.tableNumberLabel}>Table/Room:</Text>
                <TextInput
                  style={styles.tableNumberInput}
                  value={tableNumber}
                  onChangeText={setTableNumber}
                  placeholder="Table or room number"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              {/* Cart Items */}
              <ScrollView style={styles.cartItemsContainer}>
                {cart.length === 0 ? (
                  <View style={styles.emptyCart}>
                    <Wine size={48} color="#cbd5e1" />
                    <Text style={styles.emptyCartText}>No drinks in cart</Text>
                    <Text style={styles.emptyCartSubtext}>Add beverages from the menu</Text>
                  </View>
                ) : (
                  cart.map((item, index) => (
                    <View key={`${item.menuItem.id}-${index}`} style={styles.cartItem}>
                      <View style={styles.cartItemInfo}>
                        <Text style={styles.cartItemName}>{item.menuItem.name}</Text>
                        <Text style={styles.cartItemPrice}>
                          {formatCurrency(item.menuItem.price)} each
                        </Text>
                      </View>
                      
                      <View style={styles.quantityControls}>
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() => updateQuantity(item.menuItem.id, item.quantity - 1)}
                          disabled={isProcessing}
                        >
                          <Minus size={16} color="#ef4444" />
                        </TouchableOpacity>
                        
                        <Text style={styles.quantityText}>{item.quantity}</Text>
                        
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() => updateQuantity(item.menuItem.id, item.quantity + 1)}
                          disabled={isProcessing || item.quantity >= 99}
                        >
                          <Plus size={16} color="#10b981" />
                        </TouchableOpacity>
                      </View>
                      
                      <Text style={styles.cartItemTotal}>
                        {formatCurrency(item.menuItem.price * item.quantity)}
                      </Text>
                    </View>
                  ))
                )}
              </ScrollView>

              {/* Order Summary */}
              {cart.length > 0 && (
                <View style={styles.orderSummary}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Subtotal:</Text>
                    <Text style={styles.summaryValue}>{formatCurrency(calculateTotals.subtotal)}</Text>
                  </View>
                  
                  {calculateTotals.tax > 0 && (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Tax ({(hotelSettings?.taxRate || 8.5)}%):</Text>
                      <Text style={styles.summaryValue}>{formatCurrency(calculateTotals.tax)}</Text>
                    </View>
                  )}
                  
                  {calculateTotals.serviceCharge > 0 && (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Service ({(hotelSettings?.serviceChargeRate || 0)}%):</Text>
                      <Text style={styles.summaryValue}>{formatCurrency(calculateTotals.serviceCharge)}</Text>
                    </View>
                  )}
                  
                  <View style={[styles.summaryRow, styles.totalRow]}>
                    <Text style={styles.totalLabel}>TOTAL:</Text>
                    <Text style={styles.totalValue}>{formatCurrency(calculateTotals.total)}</Text>
                  </View>
                </View>
              )}

              {/* Payment Buttons */}
              {cart.length > 0 && (
                <View style={styles.paymentButtons}>
                  <TouchableOpacity
                    style={[styles.paymentButton, styles.cashButton]}
                    onPress={() => processOrder('CASH')}
                    disabled={isProcessing}
                  >
                    <LinearGradient
                      colors={isProcessing ? ['#94a3b8', '#64748b'] : ['#10b981', '#059669']}
                      style={styles.paymentButtonGradient}
                    >
                      <DollarSign size={20} color="white" />
                      <Text style={styles.paymentButtonText}>CASH</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.paymentButton, styles.creditButton]}
                    onPress={() => processOrder('CREDIT CARD')}
                    disabled={isProcessing}
                  >
                    <LinearGradient
                      colors={isProcessing ? ['#94a3b8', '#64748b'] : ['#3b82f6', '#2563eb']}
                      style={styles.paymentButtonGradient}
                    >
                      <CreditCard size={20} color="white" />
                      <Text style={styles.paymentButtonText}>CREDIT</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.paymentButton, styles.roomChargeButton]}
                    onPress={() => {
                      if (!tableNumber) {
                        Alert.alert('Room Required', 'Please enter room number for room charge');
                        return;
                      }
                      processOrder('ROOM CHARGE');
                    }}
                    disabled={isProcessing}
                  >
                    <LinearGradient
                      colors={isProcessing ? ['#94a3b8', '#64748b'] : ['#7c3aed', '#6d28d9']}
                      style={styles.paymentButtonGradient}
                    >
                      <Users size={20} color="white" />
                      <Text style={styles.paymentButtonText}>ROOM</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.paymentButton, styles.poolButton]}
                    onPress={() => processOrder('POOL SERVICE')}
                    disabled={isProcessing}
                  >
                    <LinearGradient
                      colors={isProcessing ? ['#94a3b8', '#64748b'] : ['#06b6d4', '#0891b2']}
                      style={styles.paymentButtonGradient}
                    >
                      <Waves size={20} color="white" />
                      <Text style={styles.paymentButtonText}>POOL</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}
            </LinearGradient>
          </View>
        </View>
      </SafeAreaView>
    </POSErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  headerGradient: {
    paddingTop: 20,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    paddingHorizontal: 24,
  },
  headerLeft: {
    flex: 1,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: 'white',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
  },
  leftPanel: {
    flex: 2,
    backgroundColor: '#ffffff',
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
  },
  rightPanel: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 20,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1e293b',
  },
  categoriesContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  categoryButton: {
    marginRight: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  activeCategoryButton: {
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  categoryGradient: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 120,
  },
  categoryIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#64748b',
    textAlign: 'center',
  },
  activeCategoryText: {
    color: 'white',
  },
  categoryCount: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
    marginTop: 2,
  },
  activeCategoryCount: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  menuItemsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    paddingBottom: 20,
  },
  menuItemCard: {
    width: (width * 0.6 - 60) / 3,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  menuItemGradient: {
    borderRadius: 12,
    padding: 16,
    height: 140,
  },
  menuItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  menuItemName: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#1e293b',
    flex: 1,
    marginRight: 8,
  },
  menuItemPrice: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#7c3aed',
  },
  menuItemDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    lineHeight: 16,
    flex: 1,
  },
  menuItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 8,
  },
  menuItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  metaText: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
  },
  categoryFlag: {
    fontSize: 12,
  },
  unavailableText: {
    color: '#94a3b8',
  },
  unavailableLabel: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    color: '#ef4444',
  },
  cartContainer: {
    flex: 1,
    margin: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  cartTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cartTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1e293b',
  },
  cartItemCount: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
  },
  tableNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  tableNumberLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
  },
  tableNumberInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    backgroundColor: '#fafafa',
  },
  cartItemsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyCart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyCartText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#64748b',
    marginTop: 12,
  },
  emptyCartSubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
    marginTop: 4,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1e293b',
  },
  cartItemPrice: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    marginTop: 2,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  quantityText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#1e293b',
    minWidth: 24,
    textAlign: 'center',
  },
  cartItemTotal: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#7c3aed',
    minWidth: 60,
    textAlign: 'right',
  },
  orderSummary: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1e293b',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#d1d5db',
    paddingTop: 8,
    marginTop: 8,
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1e293b',
  },
  totalValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#7c3aed',
  },
  paymentButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    gap: 12,
  },
  paymentButton: {
    flex: 1,
    minWidth: 100,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  paymentButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 6,
  },
  paymentButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: 'white',
  },
  cashButton: {},
  creditButton: {},
  roomChargeButton: {},
  poolButton: {},
});