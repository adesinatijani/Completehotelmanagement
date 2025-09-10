import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  RefreshControl,
  Animated,
  Dimensions,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';
import { ExcelImporter } from '@/components/ExcelImporter';
import { ExcelTemplateDownloader } from '@/components/ExcelTemplateDownloader';
import { Package, Plus, Search, TriangleAlert as AlertTriangle, TrendingDown, CreditCard as Edit, Star, Sparkles, Boxes, Download } from 'lucide-react-native';
import { currencyManager } from '@/lib/currency';
import { loadHotelSettings } from '@/lib/storage';

type InventoryItem = Database['public']['Tables']['inventory']['Row'];

const { width } = Dimensions.get('window');

export default function Inventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<InventoryItem['category'] | 'all'>('all');
  const [newItemModal, setNewItemModal] = useState(false);
  const [editItemModal, setEditItemModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(30));
  const [importModal, setImportModal] = useState(false);
  const [hotelSettings, setHotelSettings] = useState<any>(null);

  const [newItem, setNewItem] = useState({
    item_name: '',
    category: 'food' as InventoryItem['category'],
    subcategory: '',
    current_stock: 0,
    minimum_stock: 0,
    maximum_stock: 100,
    unit: 'pieces',
    unit_cost: 0,
    supplier: '',
    supplier_contact: '',
    storage_location: '',
    is_perishable: false,
    barcode: '',
  });

  useEffect(() => {
    loadInventory();
    loadSettings();
    
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
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

  const loadInventory = async () => {
    try {
      const inventoryData = await db.select<InventoryItem>('inventory');
      setInventory(inventoryData);
    } catch (error) {
      console.error('Error loading inventory:', error);
      Alert.alert('Error', 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const createItem = async () => {
    if (!newItem.item_name || !newItem.supplier || newItem.unit_cost <= 0 || !newItem.storage_location) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const totalValue = newItem.current_stock * newItem.unit_cost;
      
      await db.insert<InventoryItem>('inventory', {
        ...newItem,
        total_value: totalValue,
        last_restocked: new Date().toISOString(),
        reorder_point: newItem.minimum_stock,
      });

      Alert.alert('Success', 'Inventory item created successfully');
      setNewItemModal(false);
      setNewItem({
        item_name: '',
        category: 'food',
        subcategory: '',
        current_stock: 0,
        minimum_stock: 0,
        maximum_stock: 100,
        unit: 'pieces',
        unit_cost: 0,
        supplier: '',
        supplier_contact: '',
        storage_location: '',
        is_perishable: false,
        barcode: '',
      });
      loadInventory();
    } catch (error) {
      console.error('Error creating inventory item:', error);
      Alert.alert('Error', 'Failed to create inventory item');
    }
  };

  const updateStock = async (itemId: string, newStock: number) => {
    try {
      const item = inventory.find(i => i.id === itemId);
      if (!item) return;
      
      const newValue = newStock * item.unit_cost;
      
      await db.update<InventoryItem>('inventory', itemId, {
        current_stock: newStock,
        total_value: newValue,
        last_restocked: new Date().toISOString(),
      });

      setInventory(inventory.map(item => 
        item.id === itemId 
          ? { 
              ...item, 
              current_stock: newStock, 
              total_value: newValue,
              last_restocked: new Date().toISOString() 
            }
          : item
      ));

      Alert.alert('Success', 'Stock updated successfully');
    } catch (error) {
      console.error('Error updating stock:', error);
      Alert.alert('Error', 'Failed to update stock');
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadInventory();
    setRefreshing(false);
  }, []);

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.supplier.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const lowStockItems = inventory.filter(item => item.current_stock <= item.minimum_stock);
  const outOfStockItems = inventory.filter(item => item.current_stock === 0);

  const getCategoryColor = (category: InventoryItem['category']) => {
    switch (category) {
      case 'food': return '#10b981';
      case 'beverage': return '#3b82f6';
      case 'amenity': return '#8b5cf6';
      case 'cleaning': return '#f59e0b';
      case 'maintenance': return '#ef4444';
      case 'office': return '#64748b';
      default: return '#64748b';
    }
  };

  const getStockStatus = (item: InventoryItem) => {
    if (item.current_stock === 0) return { status: 'Out of Stock', color: '#ef4444' };
    if (item.current_stock <= item.minimum_stock) return { status: 'Low Stock', color: '#f59e0b' };
    return { status: 'In Stock', color: '#10b981' };
  };

  const categoryOptions: InventoryItem['category'][] = [
    'food', 'beverage', 'alcohol', 'amenity', 'cleaning', 'maintenance', 'office', 'kitchen_equipment', 'bar_equipment'
  ];
  
  const formatCurrency = (amount: number) => {
    return currencyManager.formatAmount(amount, hotelSettings?.currency);
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#f59e0b', '#f97316', '#fb923c']}
        style={styles.headerGradient}
      >
        <Animated.View 
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          <View style={styles.headerLeft}>
            <View style={styles.titleContainer}>
              <Package size={28} color="white" />
              <View>
                <Text style={styles.title}>Inventory</Text>
                <Text style={styles.subtitle}>Stock Management</Text>
              </View>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setNewItemModal(true)}
            >
              <LinearGradient
                colors={['#10b981', '#059669']}
                style={styles.addButtonGradient}
              >
                <Plus size={20} color="white" />
                <Sparkles size={12} color="white" style={styles.sparkle} />
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.importButton}
              onPress={() => setImportModal(true)}
            >
              <LinearGradient
                colors={['#7c3aed', '#8b5cf6']}
                style={styles.addButtonGradient}
              >
                <Text style={styles.importButtonText}>📊</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </LinearGradient>

      {/* Alert Summary */}
      {(lowStockItems.length > 0 || outOfStockItems.length > 0) && (
        <Animated.View 
          style={[
            styles.alertSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          <LinearGradient
            colors={['#fef3c7', '#fde68a']}
            style={styles.alertGradient}
          >
            <View style={styles.alertHeader}>
              <LinearGradient
                colors={['#f59e0b', '#d97706']}
                style={styles.alertIconContainer}
              >
                <AlertTriangle size={20} color="white" />
              </LinearGradient>
              <Text style={styles.alertTitle}>Inventory Alerts</Text>
            </View>
            
            <View style={styles.alertStats}>
              {outOfStockItems.length > 0 && (
                <LinearGradient
                  colors={['#fecaca', '#fca5a5']}
                  style={styles.alertStat}
                >
                  <Text style={styles.alertStatNumber}>{outOfStockItems.length}</Text>
                  <Text style={styles.alertStatLabel}>Out of Stock</Text>
                </LinearGradient>
              )}
              {lowStockItems.length > 0 && (
                <LinearGradient
                  colors={['#fed7aa', '#fdba74']}
                  style={styles.alertStat}
                >
                  <Text style={styles.alertStatNumber}>{lowStockItems.length}</Text>
                  <Text style={styles.alertStatLabel}>Low Stock</Text>
                </LinearGradient>
              )}
            </View>
          </LinearGradient>
        </Animated.View>
      )}

      {/* Template Download Section */}
      <View style={styles.templateSection}>
        <Text style={styles.templateSectionTitle}>📊 Excel Templates</Text>
        <ExcelTemplateDownloader
          templateType="inventory"
          onDownloadComplete={() => {
            Alert.alert('Success', 'Inventory template downloaded! Fill in your data and use the import function.');
          }}
        />
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Search size={20} color="#64748b" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search inventory items..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Category Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
      >
        <TouchableOpacity
          style={[styles.filterButton, selectedCategory === 'all' && styles.activeFilter]}
          onPress={() => setSelectedCategory('all')}
        >
          <Text style={[styles.filterText, selectedCategory === 'all' && styles.activeFilterText]}>
            All
          </Text>
        </TouchableOpacity>
        {categoryOptions.map((category) => (
          <TouchableOpacity
            key={category}
            style={[styles.filterButton, selectedCategory === category && styles.activeFilter]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text style={[styles.filterText, selectedCategory === category && styles.activeFilterText]}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.inventoryContainer}>
          {filteredInventory.map((item) => {
            const stockStatus = getStockStatus(item);
            return (
              <View key={item.id} style={styles.inventoryCard}>
                <View style={styles.itemHeader}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.item_name}</Text>
                    <View style={styles.itemMeta}>
                      <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(item.category) }]}>
                        <Text style={styles.categoryText}>
                          {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                        </Text>
                      </View>
                      <Text style={styles.supplierText}>by {item.supplier}</Text>
                    </View>
                  </View>
                  
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => {
                      setSelectedItem(item);
                      setEditItemModal(true);
                    }}
                  >
                    <Edit size={16} color="#64748b" />
                  </TouchableOpacity>
                </View>

                <View style={styles.stockInfo}>
                  <View style={styles.stockNumbers}>
                    <Text style={styles.currentStock}>
                      {item.current_stock} units
                    </Text>
                    <Text style={styles.minimumStock}>
                      Min: {item.minimum_stock}
                    </Text>
                  </View>
                  
                  <View style={[styles.stockStatus, { backgroundColor: stockStatus.color }]}>
                    <Text style={styles.stockStatusText}>{stockStatus.status}</Text>
                  </View>
                </View>

                <View style={styles.itemDetails}>
                  <Text style={styles.unitCost}>Unit Cost: {formatCurrency(item.unit_cost)}</Text>
                  <Text style={styles.totalValue}>
                    Total Value: {formatCurrency(item.total_value || (item.current_stock * item.unit_cost))}
                  </Text>
                  <Text style={styles.lastRestocked}>
                    Last Restocked: {new Date(item.last_restocked).toLocaleDateString()}
                  </Text>
                </View>

                {item.current_stock <= item.minimum_stock && (
                  <View style={styles.stockActions}>
                    <TouchableOpacity
                      style={styles.restockButton}
                      onPress={() => {
                        Alert.prompt(
                          'Restock Item',
                          'Enter new stock quantity:',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Update',
                              onPress: (value) => {
                                const newStock = parseInt(value || '0');
                                if (newStock > 0) {
                                  updateStock(item.id, newStock);
                                }
                              }
                            }
                          ],
                          'plain-text',
                          item.current_stock.toString()
                        );
                      }}
                    >
                      <Text style={styles.restockButtonText}>Restock</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* New Item Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={newItemModal}
        onRequestClose={() => setNewItemModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Inventory Item</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setNewItemModal(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Item Name *</Text>
                <TextInput
                  style={styles.formInput}
                  value={newItem.item_name}
                  onChangeText={(text) => setNewItem({ ...newItem, item_name: text })}
                  placeholder="Enter item name"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Category *</Text>
                <View style={styles.categorySelector}>
                  {categoryOptions.map((category) => (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.categoryOption,
                        newItem.category === category && styles.categoryOptionActive,
                      ]}
                      onPress={() => setNewItem({ ...newItem, category })}
                    >
                      <Text style={[
                        styles.categoryOptionText,
                        newItem.category === category && styles.categoryOptionTextActive,
                      ]}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Subcategory</Text>
                <TextInput
                  style={styles.formInput}
                  value={newItem.subcategory}
                  onChangeText={(text) => setNewItem({ ...newItem, subcategory: text })}
                  placeholder="Enter subcategory (optional)"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Current Stock</Text>
                <TextInput
                  style={styles.formInput}
                  value={newItem.current_stock.toString()}
                  onChangeText={(text) => setNewItem({ ...newItem, current_stock: Number(text) || 0 })}
                  placeholder="Enter current stock"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Minimum Stock</Text>
                <TextInput
                  style={styles.formInput}
                  value={newItem.minimum_stock.toString()}
                  onChangeText={(text) => setNewItem({ ...newItem, minimum_stock: Number(text) || 0 })}
                  placeholder="Enter minimum stock level"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Maximum Stock</Text>
                <TextInput
                  style={styles.formInput}
                  value={newItem.maximum_stock.toString()}
                  onChangeText={(text) => setNewItem({ ...newItem, maximum_stock: Number(text) || 100 })}
                  placeholder="Enter maximum stock level"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Unit</Text>
                <TextInput
                  style={styles.formInput}
                  value={newItem.unit}
                  onChangeText={(text) => setNewItem({ ...newItem, unit: text })}
                  placeholder="pieces, kg, liters, bottles"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Unit Cost *</Text>
                <TextInput
                  style={styles.formInput}
                  value={newItem.unit_cost.toString()}
                  onChangeText={(text) => setNewItem({ ...newItem, unit_cost: Number(text) || 0 })}
                  placeholder="Enter unit cost"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Supplier *</Text>
                <TextInput
                  style={styles.formInput}
                  value={newItem.supplier}
                  onChangeText={(text) => setNewItem({ ...newItem, supplier: text })}
                  placeholder="Enter supplier name"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Supplier Contact</Text>
                <TextInput
                  style={styles.formInput}
                  value={newItem.supplier_contact}
                  onChangeText={(text) => setNewItem({ ...newItem, supplier_contact: text })}
                  placeholder="Phone or email"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Storage Location *</Text>
                <TextInput
                  style={styles.formInput}
                  value={newItem.storage_location}
                  onChangeText={(text) => setNewItem({ ...newItem, storage_location: text })}
                  placeholder="e.g., Kitchen Pantry, Bar Storage"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Barcode/SKU</Text>
                <TextInput
                  style={styles.formInput}
                  value={newItem.barcode}
                  onChangeText={(text) => setNewItem({ ...newItem, barcode: text })}
                  placeholder="Enter barcode or SKU"
                />
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Perishable Item</Text>
                <Switch
                  value={newItem.is_perishable}
                  onValueChange={(value) => setNewItem({ ...newItem, is_perishable: value })}
                />
              </View>

              <TouchableOpacity style={styles.createButton} onPress={createItem}>
                <Text style={styles.createButtonText}>Add to Inventory</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Item Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editItemModal}
        onRequestClose={() => setEditItemModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedItem && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Update Stock</Text>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setEditItemModal(false)}
                  >
                    <Text style={styles.closeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.modalBody}>
                  <Text style={styles.editItemName}>{selectedItem.item_name}</Text>
                  <Text style={styles.editItemInfo}>
                    Current Stock: {selectedItem.current_stock} units
                  </Text>
                  <Text style={styles.editItemInfo}>
                    Minimum Stock: {selectedItem.minimum_stock} units
                  </Text>

                  <View style={styles.stockUpdateActions}>
                    <TouchableOpacity
                      style={styles.quickUpdateButton}
                      onPress={() => {
                        const newStock = selectedItem.current_stock + 10;
                        updateStock(selectedItem.id, newStock);
                        setEditItemModal(false);
                      }}
                    >
                      <Text style={styles.quickUpdateText}>+10</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.quickUpdateButton}
                      onPress={() => {
                        const newStock = selectedItem.current_stock + 50;
                        updateStock(selectedItem.id, newStock);
                        setEditItemModal(false);
                      }}
                    >
                      <Text style={styles.quickUpdateText}>+50</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.quickUpdateButton}
                      onPress={() => {
                        const newStock = selectedItem.current_stock + 100;
                        updateStock(selectedItem.id, newStock);
                        setEditItemModal(false);
                      }}
                    >
                      <Text style={styles.quickUpdateText}>+100</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={styles.customUpdateButton}
                    onPress={() => {
                      Alert.prompt(
                        'Custom Stock Update',
                        'Enter new stock quantity:',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Update',
                            onPress: (value) => {
                              const newStock = parseInt(value || '0');
                              if (newStock >= 0) {
                                updateStock(selectedItem.id, newStock);
                                setEditItemModal(false);
                              }
                            }
                          }
                        ],
                        'plain-text',
                        selectedItem.current_stock.toString()
                      );
                    }}
                  >
                    <Text style={styles.customUpdateText}>Custom Amount</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Excel Import Modal */}
      <ExcelImporter
        visible={importModal}
        onClose={() => setImportModal(false)}
        importType="inventory"
        onImportComplete={loadInventory}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  headerGradient: {
    paddingTop: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 10,
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
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  headerActions: {
    marginTop: 8,
  },
  addButton: {
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  addButtonGradient: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  sparkle: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  importButton: {
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  importButtonText: {
    fontSize: 20,
  },
  alertSection: {
    margin: 20,
    marginTop: -20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  alertGradient: {
    borderRadius: 20,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    justifyContent: 'center',
  },
  alertIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  alertTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#92400e',
  },
  alertStats: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
  },
  alertStat: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  alertStatNumber: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#7c2d12',
  },
  alertStatLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#7c2d12',
    marginTop: 4,
  },
  searchContainer: {
    padding: 20,
    paddingBottom: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1e293b',
  },
  filterContainer: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'white',
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  activeFilter: {
    backgroundColor: '#1e3a8a',
    borderColor: '#1e3a8a',
  },
  filterText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
  },
  activeFilterText: {
    color: 'white',
  },
  scrollView: {
    flex: 1,
  },
  inventoryContainer: {
    padding: 20,
    gap: 16,
  },
  inventoryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1e293b',
    marginBottom: 6,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryText: {
    color: 'white',
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
  },
  supplierText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
  },
  editButton: {
    padding: 4,
  },
  stockInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  stockNumbers: {
    flex: 1,
  },
  currentStock: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1e293b',
  },
  minimumStock: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    marginTop: 2,
  },
  stockStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  stockStatusText: {
    color: 'white',
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
  },
  itemDetails: {
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
  },
  unitCost: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    marginBottom: 2,
  },
  totalValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1e293b',
    marginBottom: 2,
  },
  lastRestocked: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
  },
  stockActions: {
    flexDirection: 'row',
  },
  restockButton: {
    flex: 1,
    backgroundColor: '#1e3a8a',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  restockButtonText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1e293b',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#64748b',
  },
  modalBody: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    backgroundColor: '#fafafa',
  },
  categorySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryOptionActive: {
    backgroundColor: '#1e3a8a',
    borderColor: '#1e3a8a',
  },
  categoryOptionText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#64748b',
  },
  categoryOptionTextActive: {
    color: 'white',
  },
  createButton: {
    backgroundColor: '#1e3a8a',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  editItemName: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  editItemInfo: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    marginBottom: 4,
  },
  stockUpdateActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 12,
  },
  quickUpdateButton: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  quickUpdateText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1e3a8a',
  },
  customUpdateButton: {
    backgroundColor: '#1e3a8a',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  customUpdateText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  switchLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#374151',
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