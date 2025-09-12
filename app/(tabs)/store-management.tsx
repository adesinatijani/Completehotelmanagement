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
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthContext } from '@/contexts/AuthContext';
import { db } from '@/lib/database';
import { Database } from '@/types/database';
import { ExcelImporter } from '@/components/ExcelImporter';
import { ExcelTemplateDownloader } from '@/components/ExcelTemplateDownloader';
import { Package, Plus, Search, TrendingUp, TrendingDown, ChefHat, Wine, TriangleAlert as AlertTriangle, Download } from 'lucide-react-native';

type InventoryItem = Database['public']['Tables']['inventory']['Row'];

export default function StoreManagement() {
  const { user } = useAuthContext();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStore, setSelectedStore] = useState<'kitchen' | 'bar' | 'all'>('all');
  const [restockModal, setRestockModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [restockQuantity, setRestockQuantity] = useState('');
  const [importModal, setImportModal] = useState(false);
  const [newItemModal, setNewItemModal] = useState(false);
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
  });

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'manager' || user?.role === 'kitchen_staff' || user?.role === 'bar_staff') {
      loadInventory();
    }
  }, [user]);

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

  const restockItem = async () => {
    if (!selectedItem || !restockQuantity) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    const quantity = parseInt(restockQuantity);
    if (quantity <= 0) {
      Alert.alert('Error', 'Quantity must be greater than 0');
      return;
    }

    try {
      const newStock = selectedItem.current_stock + quantity;
      const newValue = newStock * selectedItem.unit_cost;
      
      const [updatedItem] = await db.update<InventoryItem>('inventory', selectedItem.id, {
        current_stock: newStock,
        total_value: newValue,
        last_restocked: new Date().toISOString(),
      });

      if (updatedItem) {
        setInventory(inventory.map(item => 
          item.id === selectedItem.id 
            ? { 
                ...item, 
                current_stock: newStock,
                total_value: newValue,
                last_restocked: new Date().toISOString()
              }
            : item
        ));
      }

      Alert.alert('Success', `Added ${quantity} units to ${selectedItem.item_name}`);
      setRestockModal(false);
      setSelectedItem(null);
      setRestockQuantity('');
    } catch (error) {
      console.error('Error restocking item:', error);
      Alert.alert('Error', 'Failed to restock item');
    }
  };

  const createInventoryItem = async () => {
    if (!newItem.item_name || !newItem.supplier || newItem.unit_cost <= 0) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const totalValue = newItem.current_stock * newItem.unit_cost;
      
      const [createdItem] = await db.insert<InventoryItem>('inventory', {
        ...newItem,
        total_value: totalValue,
        last_restocked: new Date().toISOString(),
        reorder_point: newItem.minimum_stock,
      });

      if (createdItem) {
        Alert.alert('Success', 'Inventory item added successfully');
      }
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
      });
      loadInventory();
    } catch (error) {
      console.error('Error creating inventory item:', error);
      Alert.alert('Error', 'Failed to create inventory item');
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadInventory();
    setRefreshing(false);
  }, []);

  const getStoreItems = (store: 'kitchen' | 'bar') => {
    if (store === 'kitchen') {
      return inventory.filter(item => 
        ['food', 'kitchen_equipment'].includes(item.category) ||
        item.storage_location.toLowerCase().includes('kitchen')
      );
    } else {
      return inventory.filter(item => 
        ['beverage', 'alcohol', 'bar_equipment'].includes(item.category) ||
        item.storage_location.toLowerCase().includes('bar')
      );
    }
  };

  const filteredItems = inventory.filter(item => {
    const matchesSearch = item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.supplier.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (selectedStore === 'all') return matchesSearch;
    
    const storeItems = getStoreItems(selectedStore);
    return matchesSearch && storeItems.some(storeItem => storeItem.id === item.id);
  });

  const getStockStatus = (item: InventoryItem) => {
    if (item.current_stock === 0) return { status: 'Out of Stock', color: '#ef4444', icon: '❌' };
    if (item.current_stock <= item.minimum_stock) return { status: 'Low Stock', color: '#f59e0b', icon: '⚠️' };
    if (item.current_stock >= item.maximum_stock * 0.8) return { status: 'Well Stocked', color: '#10b981', icon: '✅' };
    return { status: 'In Stock', color: '#3b82f6', icon: '📦' };
  };

  const getCategoryColor = (category: InventoryItem['category']) => {
    switch (category) {
      case 'food': return '#10b981';
      case 'beverage': return '#3b82f6';
      case 'alcohol': return '#7c3aed';
      case 'kitchen_equipment': return '#f59e0b';
      case 'bar_equipment': return '#ec4899';
      default: return '#64748b';
    }
  };

  const kitchenItems = getStoreItems('kitchen');
  const barItems = getStoreItems('bar');
  const lowStockItems = inventory.filter(item => item.current_stock <= item.minimum_stock);

  if (!['admin', 'manager', 'kitchen_staff', 'bar_staff'].includes(user?.role || '')) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.accessDenied}>
          <Text style={styles.accessDeniedText}>Access Denied</Text>
          <Text style={styles.accessDeniedSubtext}>Only store keepers and managers can access store management.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#7c3aed', '#8b5cf6', '#a855f7']}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.titleContainer}>
              <Package size={28} color="white" />
              <View>
                <Text style={styles.title}>Store Management</Text>
                <Text style={styles.subtitle}>Kitchen & Bar Inventory</Text>
              </View>
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
      </LinearGradient>

      {/* Store Stats */}
      <View style={styles.statsContainer}>
        <LinearGradient
          colors={['#dcfce7', '#bbf7d0']}
          style={styles.statCard}
        >
          <ChefHat size={24} color="#16a34a" />
          <Text style={styles.statNumber}>{kitchenItems.length}</Text>
          <Text style={styles.statLabel}>Kitchen Items</Text>
        </LinearGradient>

        <LinearGradient
          colors={['#e0e7ff', '#c7d2fe']}
          style={styles.statCard}
        >
          <Wine size={24} color="#7c3aed" />
          <Text style={styles.statNumber}>{barItems.length}</Text>
          <Text style={styles.statLabel}>Bar Items</Text>
        </LinearGradient>

        <LinearGradient
          colors={['#fef3c7', '#fde68a']}
          style={styles.statCard}
        >
          <AlertTriangle size={24} color="#d97706" />
          <Text style={styles.statNumber}>{lowStockItems.length}</Text>
          <Text style={styles.statLabel}>Low Stock</Text>
        </LinearGradient>

        <LinearGradient
          colors={['#dbeafe', '#bfdbfe']}
          style={styles.statCard}
        >
          <Package size={24} color="#2563eb" />
          <Text style={styles.statNumber}>
            ${inventory.reduce((sum, item) => sum + item.total_value, 0).toLocaleString()}
          </Text>
          <Text style={styles.statLabel}>Total Value</Text>
        </LinearGradient>
      </View>

      {/* Template Download Section */}
      <View style={styles.templateSection}>
        <Text style={styles.templateSectionTitle}>📊 Excel Templates</Text>
        <ExcelTemplateDownloader
          templateType="inventory"
          onDownloadComplete={() => {
            Alert.alert('Success', 'Store management template downloaded! Fill in your data and use the import function.');
          }}
        />
      </View>

      {/* Search and Store Filter */}
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

      <View style={styles.storeSelector}>
        <TouchableOpacity
          style={[styles.storeButton, selectedStore === 'all' && styles.storeButtonActive]}
          onPress={() => setSelectedStore('all')}
        >
          <Text style={[styles.storeButtonText, selectedStore === 'all' && styles.storeButtonTextActive]}>
            All Stores ({inventory.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.storeButton, selectedStore === 'kitchen' && styles.storeButtonActive]}
          onPress={() => setSelectedStore('kitchen')}
        >
          <ChefHat size={16} color={selectedStore === 'kitchen' ? 'white' : '#64748b'} />
          <Text style={[styles.storeButtonText, selectedStore === 'kitchen' && styles.storeButtonTextActive]}>
            Kitchen ({kitchenItems.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.storeButton, selectedStore === 'bar' && styles.storeButtonActive]}
          onPress={() => setSelectedStore('bar')}
        >
          <Wine size={16} color={selectedStore === 'bar' ? 'white' : '#64748b'} />
          <Text style={[styles.storeButtonText, selectedStore === 'bar' && styles.storeButtonTextActive]}>
            Bar ({barItems.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.itemsContainer}>
          {filteredItems.map((item) => {
            const stockStatus = getStockStatus(item);
            return (
              <View key={item.id} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.item_name}</Text>
                    <View style={styles.itemMeta}>
                      <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(item.category) }]}>
                        <Text style={styles.categoryText}>
                          {item.category.replace('_', ' ').charAt(0).toUpperCase() + item.category.replace('_', ' ').slice(1)}
                        </Text>
                      </View>
                      <Text style={styles.supplierText}>by {item.supplier}</Text>
                    </View>
                  </View>
                  
                  <View style={[styles.stockStatus, { backgroundColor: stockStatus.color }]}>
                    <Text style={styles.stockStatusIcon}>{stockStatus.icon}</Text>
                    <Text style={styles.stockStatusText}>{stockStatus.status}</Text>
                  </View>
                </View>

                <View style={styles.stockInfo}>
                  <View style={styles.stockNumbers}>
                    <Text style={styles.currentStock}>
                      {item.current_stock} {item.unit}
                    </Text>
                    <Text style={styles.stockRange}>
                      Min: {item.minimum_stock} | Max: {item.maximum_stock}
                    </Text>
                  </View>
                  
                  <View style={styles.stockValue}>
                    <Text style={styles.unitCost}>${item.unit_cost}/{item.unit}</Text>
                    <Text style={styles.totalValue}>${item.total_value.toFixed(2)}</Text>
                  </View>
                </View>

                <View style={styles.itemDetails}>
                  <Text style={styles.storageLocation}>📍 {item.storage_location}</Text>
                  <Text style={styles.lastRestocked}>
                    Last restocked: {new Date(item.last_restocked).toLocaleDateString()}
                  </Text>
                  {item.expiry_date && (
                    <Text style={styles.expiryDate}>
                      Expires: {new Date(item.expiry_date).toLocaleDateString()}
                    </Text>
                  )}
                </View>

                <View style={styles.itemActions}>
                  <TouchableOpacity
                    style={styles.restockButton}
                    onPress={() => {
                      setSelectedItem(item);
                      setRestockModal(true);
                    }}
                  >
                    <TrendingUp size={16} color="white" />
                    <Text style={styles.restockButtonText}>Restock</Text>
                  </TouchableOpacity>
                  
                  {item.current_stock > 0 && (
                    <TouchableOpacity
                      style={styles.useButton}
                      onPress={() => {
                        Alert.prompt(
                          'Use Stock',
                          'Enter quantity to use:',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Use',
                              onPress: async (value) => {
                                const quantity = parseInt(value || '0');
                                if (quantity > 0 && quantity <= item.current_stock) {
                                  const newStock = item.current_stock - quantity;
                                  const newValue = newStock * item.unit_cost;
                                  
                                  await db.update<InventoryItem>('inventory', item.id, {
                                    current_stock: newStock,
                                    total_value: newValue,
                                  });
                                  
                                  loadInventory();
                                  Alert.alert('Success', `Used ${quantity} units of ${item.item_name}`);
                                }
                              }
                            }
                          ],
                          'plain-text'
                        );
                      }}
                    >
                      <TrendingDown size={16} color="white" />
                      <Text style={styles.useButtonText}>Use</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Restock Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={restockModal}
        onRequestClose={() => setRestockModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedItem && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Restock Item</Text>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setRestockModal(false)}
                  >
                    <Text style={styles.closeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.modalBody}>
                  <Text style={styles.itemNameModal}>{selectedItem.item_name}</Text>
                  <Text style={styles.currentStockModal}>
                    Current Stock: {selectedItem.current_stock} {selectedItem.unit}
                  </Text>
                  <Text style={styles.minimumStockModal}>
                    Minimum Stock: {selectedItem.minimum_stock} {selectedItem.unit}
                  </Text>

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Quantity to Add</Text>
                    <TextInput
                      style={styles.formInput}
                      value={restockQuantity}
                      onChangeText={setRestockQuantity}
                      placeholder="Enter quantity"
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.quickRestockButtons}>
                    <TouchableOpacity
                      style={styles.quickButton}
                      onPress={() => setRestockQuantity('10')}
                    >
                      <Text style={styles.quickButtonText}>+10</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.quickButton}
                      onPress={() => setRestockQuantity('50')}
                    >
                      <Text style={styles.quickButtonText}>+50</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.quickButton}
                      onPress={() => setRestockQuantity('100')}
                    >
                      <Text style={styles.quickButtonText}>+100</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.quickButton}
                      onPress={() => {
                        const toMax = selectedItem.maximum_stock - selectedItem.current_stock;
                        setRestockQuantity(toMax.toString());
                      }}
                    >
                      <Text style={styles.quickButtonText}>To Max</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity style={styles.restockConfirmButton} onPress={restockItem}>
                    <Text style={styles.restockConfirmButtonText}>Confirm Restock</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

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
              <Text style={styles.modalTitle}>Add New Inventory Item</Text>
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
                <ScrollView horizontal style={styles.categorySelector}>
                  {['food', 'beverage', 'alcohol', 'amenity', 'cleaning', 'maintenance', 'office', 'kitchen_equipment', 'bar_equipment'].map((category) => (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.categoryOption,
                        newItem.category === category && styles.categoryOptionActive,
                      ]}
                      onPress={() => setNewItem({ ...newItem, category: category as any })}
                    >
                      <Text style={[
                        styles.categoryOptionText,
                        newItem.category === category && styles.categoryOptionTextActive,
                      ]}>
                        {category.replace('_', ' ').charAt(0).toUpperCase() + category.replace('_', ' ').slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Storage Location *</Text>
                <TextInput
                  style={styles.formInput}
                  value={newItem.storage_location}
                  onChangeText={(text) => setNewItem({ ...newItem, storage_location: text })}
                  placeholder="e.g., Kitchen Pantry, Bar Storage, Walk-in Cooler"
                />
              </View>

              <View style={styles.formRow}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Current Stock</Text>
                  <TextInput
                    style={styles.formInput}
                    value={newItem.current_stock.toString()}
                    onChangeText={(text) => setNewItem({ ...newItem, current_stock: Number(text) || 0 })}
                    placeholder="0"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Unit</Text>
                  <TextInput
                    style={styles.formInput}
                    value={newItem.unit}
                    onChangeText={(text) => setNewItem({ ...newItem, unit: text })}
                    placeholder="pieces, kg, liters"
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Minimum Stock</Text>
                  <TextInput
                    style={styles.formInput}
                    value={newItem.minimum_stock.toString()}
                    onChangeText={(text) => setNewItem({ ...newItem, minimum_stock: Number(text) || 0 })}
                    placeholder="0"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Maximum Stock</Text>
                  <TextInput
                    style={styles.formInput}
                    value={newItem.maximum_stock.toString()}
                    onChangeText={(text) => setNewItem({ ...newItem, maximum_stock: Number(text) || 100 })}
                    placeholder="100"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Unit Cost *</Text>
                <TextInput
                  style={styles.formInput}
                  value={newItem.unit_cost.toString()}
                  onChangeText={(text) => setNewItem({ ...newItem, unit_cost: Number(text) || 0 })}
                  placeholder="0.00"
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

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Perishable Item</Text>
                <Switch
                  value={newItem.is_perishable}
                  onValueChange={(value) => setNewItem({ ...newItem, is_perishable: value })}
                />
              </View>

              <TouchableOpacity style={styles.createButton} onPress={createInventoryItem}>
                <Text style={styles.createButtonText}>Add to Inventory</Text>
              </TouchableOpacity>
            </ScrollView>
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
  accessDenied: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  accessDeniedText: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#ef4444',
    marginBottom: 8,
  },
  accessDeniedSubtext: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    textAlign: 'center',
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
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 10,
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
  },
  importButton: {
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    marginLeft: 12,
  },
  importButtonText: {
    fontSize: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 16,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1e293b',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  searchContainer: {
    paddingHorizontal: 20,
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
  storeSelector: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 10,
    gap: 8,
  },
  storeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'white',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6,
  },
  storeButtonActive: {
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed',
  },
  storeButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#64748b',
  },
  storeButtonTextActive: {
    color: 'white',
  },
  scrollView: {
    flex: 1,
  },
  itemsContainer: {
    padding: 20,
    gap: 16,
  },
  itemCard: {
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
    marginBottom: 4,
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
  stockStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  stockStatusIcon: {
    fontSize: 12,
  },
  stockStatusText: {
    color: 'white',
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
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
  stockRange: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    marginTop: 2,
  },
  stockValue: {
    alignItems: 'flex-end',
  },
  unitCost: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
  },
  totalValue: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#1e293b',
    marginTop: 2,
  },
  itemDetails: {
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
  },
  storageLocation: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    marginBottom: 4,
  },
  lastRestocked: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
    marginBottom: 2,
  },
  expiryDate: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#dc2626',
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  restockButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 10,
    borderRadius: 6,
    gap: 4,
  },
  restockButtonText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  useButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f59e0b',
    paddingVertical: 10,
    borderRadius: 6,
    gap: 4,
  },
  useButtonText: {
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
    maxWidth: 400,
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
  itemNameModal: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  currentStockModal: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    marginBottom: 4,
  },
  minimumStockModal: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
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
  },
  categoryOption: {
    marginRight: 8,
    padding: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minWidth: 80,
  },
  categoryOptionActive: {
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed',
  },
  categoryOptionText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#64748b',
    textAlign: 'center',
  },
  categoryOptionTextActive: {
    color: 'white',
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
  createButton: {
    backgroundColor: '#7c3aed',
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
  quickRestockButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  quickButton: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  quickButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#7c3aed',
  },
  restockConfirmButton: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  restockConfirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
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