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
import { ChefHat, Plus, Search, CreditCard as Edit, Trash2, Wine, Coffee, Utensils, Star, Download } from 'lucide-react-native';

type MenuItem = Database['public']['Tables']['menu_items']['Row'];

export default function MenuManagement() {
  const { user } = useAuthContext();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MenuItem['category'] | 'all'>('all');
  const [newItemModal, setNewItemModal] = useState(false);
  const [editItemModal, setEditItemModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [importModal, setImportModal] = useState(false);

  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    category: 'main_course' as MenuItem['category'],
    subcategory: '',
    price: 0,
    cost_price: 0,
    ingredients: [] as string[],
    allergens: [] as string[],
    prep_time_minutes: 0,
    cooking_time_minutes: 0,
    difficulty_level: 'easy' as MenuItem['difficulty_level'],
    is_available: true,
    is_vegetarian: false,
    is_vegan: false,
    is_gluten_free: false,
    calories: 0,
  });

  const [newIngredient, setNewIngredient] = useState('');
  const [newAllergen, setNewAllergen] = useState('');

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'manager') {
      loadMenuItems();
    }
  }, [user]);

  const loadMenuItems = async () => {
    try {
      const menuData = await db.select<MenuItem>('menu_items');
      setMenuItems(menuData);
    } catch (error) {
      console.error('Error loading menu items:', error);
      Alert.alert('Error', 'Failed to load menu items');
    } finally {
      setLoading(false);
    }
  };

  const createMenuItem = async () => {
    if (!newItem.name || !newItem.description || newItem.price <= 0) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      await db.insert<MenuItem>('menu_items', newItem);
      Alert.alert('Success', 'Menu item created successfully');
      setNewItemModal(false);
      resetNewItem();
      await loadMenuItems();
      
      // Trigger immediate refresh in POS systems
      console.log('✅ Menu item created, triggering POS refresh...');
    } catch (error) {
      console.error('Error creating menu item:', error);
      Alert.alert('Error', 'Failed to create menu item');
    }
  };

  const updateMenuItem = async () => {
    if (!selectedItem) return;

    if (!selectedItem.name || !selectedItem.description || selectedItem.price <= 0) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const updateData = {
        name: selectedItem.name,
        description: selectedItem.description,
        category: selectedItem.category,
        subcategory: selectedItem.subcategory,
        price: selectedItem.price,
        cost_price: selectedItem.cost_price,
        ingredients: selectedItem.ingredients,
        allergens: selectedItem.allergens,
        prep_time_minutes: selectedItem.prep_time_minutes,
        cooking_time_minutes: selectedItem.cooking_time_minutes,
        difficulty_level: selectedItem.difficulty_level,
        is_available: selectedItem.is_available,
        is_vegetarian: selectedItem.is_vegetarian,
        is_vegan: selectedItem.is_vegan,
        is_gluten_free: selectedItem.is_gluten_free,
        calories: selectedItem.calories,
      };
      
      console.log('Updating menu item:', selectedItem.id, 'with data:', updateData);
      
      const updatedItem = await db.update<MenuItem>('menu_items', selectedItem.id, updateData);
      
      console.log('Menu item updated successfully:', updatedItem);
      
      // Update local state immediately
      setMenuItems(menuItems.map(item => 
        item.id === selectedItem.id ? { ...item, ...updateData } : item
      ));
      
      Alert.alert('Success', 'Menu item updated successfully');
      setEditItemModal(false);
      setSelectedItem(null);
      await loadMenuItems();
      
      // Trigger immediate refresh in POS systems
      console.log('✅ Menu item updated, triggering POS refresh...');
    } catch (error) {
      console.error('Error updating menu item:', error);
      Alert.alert('Error', 'Failed to update menu item');
    }
  };

  const deleteMenuItem = async (itemId: string) => {
    Alert.alert(
      'Delete Menu Item',
      'Are you sure you want to delete this menu item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await db.delete('menu_items', itemId);
              Alert.alert('Success', 'Menu item deleted successfully');
              loadMenuItems();
            } catch (error) {
              console.error('Error deleting menu item:', error);
              Alert.alert('Error', 'Failed to delete menu item');
            }
          }
        }
      ]
    );
  };

  const resetNewItem = () => {
    setNewItem({
      name: '',
      description: '',
      category: 'main_course',
      subcategory: '',
      price: 0,
      cost_price: 0,
      ingredients: [],
      allergens: [],
      prep_time_minutes: 0,
      cooking_time_minutes: 0,
      difficulty_level: 'easy',
      is_available: true,
      is_vegetarian: false,
      is_vegan: false,
      is_gluten_free: false,
      calories: 0,
    });
  };

  const addIngredient = () => {
    if (newIngredient.trim()) {
      setNewItem({
        ...newItem,
        ingredients: [...newItem.ingredients, newIngredient.trim()]
      });
      setNewIngredient('');
    }
  };

  const removeIngredient = (index: number) => {
    setNewItem({
      ...newItem,
      ingredients: newItem.ingredients.filter((_, i) => i !== index)
    });
  };

  const addAllergen = () => {
    if (newAllergen.trim()) {
      setNewItem({
        ...newItem,
        allergens: [...newItem.allergens, newAllergen.trim()]
      });
      setNewAllergen('');
    }
  };

  const removeAllergen = (index: number) => {
    setNewItem({
      ...newItem,
      allergens: newItem.allergens.filter((_, i) => i !== index)
    });
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadMenuItems();
    setRefreshing(false);
  }, []);

  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryIcon = (category: MenuItem['category']) => {
    switch (category) {
      case 'appetizer': return '🥗';
      case 'main_course': return '🍽️';
      case 'dessert': return '🍰';
      case 'wine': return '🍷';
      case 'beer': return '🍺';
      case 'cocktail': return '🍹';
      case 'coffee': return '☕';
      case 'tea': return '🍵';
      case 'juice': return '🧃';
      default: return '🍴';
    }
  };

  const getCategoryColor = (category: MenuItem['category']) => {
    switch (category) {
      case 'appetizer': return '#10b981';
      case 'main_course': return '#3b82f6';
      case 'dessert': return '#f59e0b';
      case 'wine': return '#7c3aed';
      case 'beer': return '#d97706';
      case 'cocktail': return '#ec4899';
      case 'coffee': return '#92400e';
      case 'tea': return '#059669';
      case 'juice': return '#0ea5e9';
      default: return '#64748b';
    }
  };

  const categories: MenuItem['category'][] = [
    'appetizer', 'main_course', 'dessert', 'wine', 'beer', 'cocktail', 'spirits', 'coffee', 'tea', 'juice', 'water'
  ];

  const difficultyOptions: MenuItem['difficulty_level'][] = ['easy', 'medium', 'hard'];

  if (user?.role !== 'admin' && user?.role !== 'manager') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.accessDenied}>
          <Text style={styles.accessDeniedText}>Access Denied</Text>
          <Text style={styles.accessDeniedSubtext}>Only administrators and managers can access menu management.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#f59e0b', '#f97316', '#fb923c']}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.titleContainer}>
              <ChefHat size={28} color="white" />
              <View>
                <Text style={styles.title}>Menu Management</Text>
                <Text style={styles.subtitle}>Foods, Drinks & Categories</Text>
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
        </View>
      </LinearGradient>

      {/* Template Download Section */}
      <View style={styles.templateSection}>
        <Text style={styles.templateSectionTitle}>📊 Excel Templates</Text>
        <ExcelTemplateDownloader
          templateType="menu"
          onDownloadComplete={() => {
            Alert.alert('Success', 'Menu template downloaded! Fill in your data and use the import function.');
          }}
        />
      </View>

      {/* Search and Filters */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Search size={20} color="#64748b" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search menu items..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

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
            All ({menuItems.length})
          </Text>
        </TouchableOpacity>
        {categories.map((category) => {
          const count = menuItems.filter(item => item.category === category).length;
          return (
            <TouchableOpacity
              key={category}
              style={[styles.filterButton, selectedCategory === category && styles.activeFilter]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text style={[styles.filterText, selectedCategory === category && styles.activeFilterText]}>
                {getCategoryIcon(category)} {category.replace('_', ' ').charAt(0).toUpperCase() + category.replace('_', ' ').slice(1)} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.itemsContainer}>
          {filteredItems.map((item) => (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <View style={styles.itemMeta}>
                    <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(item.category) }]}>
                      <Text style={styles.categoryIcon}>{getCategoryIcon(item.category)}</Text>
                      <Text style={styles.categoryText}>
                        {item.category.replace('_', ' ').charAt(0).toUpperCase() + item.category.replace('_', ' ').slice(1)}
                      </Text>
                    </View>
                    {item.subcategory && (
                      <Text style={styles.subcategoryText}>{item.subcategory}</Text>
                    )}
                  </View>
                </View>
                
                <View style={styles.itemActions}>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => {
                      setSelectedItem(item);
                      setEditItemModal(true);
                    }}
                  >
                    <Edit size={16} color="#3b82f6" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => deleteMenuItem(item.id)}
                  >
                    <Trash2 size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.itemDescription}>{item.description}</Text>

              <View style={styles.itemDetails}>
                <View style={styles.priceContainer}>
                  <Text style={styles.price}>${item.price}</Text>
                  <Text style={styles.costPrice}>Cost: ${item.cost_price}</Text>
                </View>
                
                <View style={styles.itemFlags}>
                  {item.is_vegetarian && <Text style={styles.flag}>🌱 Vegetarian</Text>}
                  {item.is_vegan && <Text style={styles.flag}>🌿 Vegan</Text>}
                  {item.is_gluten_free && <Text style={styles.flag}>🌾 Gluten Free</Text>}
                </View>
              </View>

              <View style={styles.itemFooter}>
                <View style={styles.timeInfo}>
                  {item.prep_time_minutes > 0 && (
                    <Text style={styles.timeText}>Prep: {item.prep_time_minutes}min</Text>
                  )}
                  {item.cooking_time_minutes > 0 && (
                    <Text style={styles.timeText}>Cook: {item.cooking_time_minutes}min</Text>
                  )}
                </View>
                
                <View style={[styles.availabilityBadge, { 
                  backgroundColor: item.is_available ? '#dcfce7' : '#fecaca' 
                }]}>
                  <Text style={[styles.availabilityText, {
                    color: item.is_available ? '#16a34a' : '#ef4444'
                  }]}>
                    {item.is_available ? 'Available' : 'Unavailable'}
                  </Text>
                </View>
              </View>
            </View>
          ))}
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
              <Text style={styles.modalTitle}>Add New Menu Item</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setNewItemModal(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Name *</Text>
                <TextInput
                  style={styles.formInput}
                  value={newItem.name}
                  onChangeText={(text) => setNewItem({ ...newItem, name: text })}
                  placeholder="Enter item name"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Description *</Text>
                <TextInput
                  style={[styles.formInput, styles.textArea]}
                  value={newItem.description}
                  onChangeText={(text) => setNewItem({ ...newItem, description: text })}
                  placeholder="Describe the item"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Category *</Text>
                <ScrollView horizontal style={styles.categorySelector}>
                  {categories.map((category) => (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.categoryOption,
                        newItem.category === category && styles.categoryOptionActive,
                      ]}
                      onPress={() => setNewItem({ ...newItem, category })}
                    >
                      <Text style={styles.categoryOptionIcon}>{getCategoryIcon(category)}</Text>
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

              <View style={styles.formRow}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Price *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={newItem.price.toString()}
                    onChangeText={(text) => setNewItem({ ...newItem, price: Number(text) || 0 })}
                    placeholder="0.00"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Cost Price *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={newItem.cost_price.toString()}
                    onChangeText={(text) => setNewItem({ ...newItem, cost_price: Number(text) || 0 })}
                    placeholder="0.00"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Ingredients</Text>
                <View style={styles.ingredientForm}>
                  <View style={styles.ingredientInputRow}>
                    <TextInput
                      style={[styles.formInput, { flex: 1 }]}
                      value={newIngredient}
                      onChangeText={setNewIngredient}
                      placeholder="Add ingredient"
                    />
                    <TouchableOpacity style={styles.addButton} onPress={addIngredient}>
                      <Text style={styles.addButtonText}>Add</Text>
                    </TouchableOpacity>
                  </View>
                  {newItem.ingredients.length > 0 && (
                    <View style={styles.tagsList}>
                      {newItem.ingredients.map((ingredient, index) => (
                        <View key={index} style={styles.tag}>
                          <Text style={styles.tagText}>{ingredient}</Text>
                          <TouchableOpacity onPress={() => removeIngredient(index)}>
                            <Text style={styles.tagRemove}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Dietary Options</Text>
                <View style={styles.switchContainer}>
                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Vegetarian</Text>
                    <Switch
                      value={newItem.is_vegetarian}
                      onValueChange={(value) => setNewItem({ ...newItem, is_vegetarian: value })}
                    />
                  </View>
                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Vegan</Text>
                    <Switch
                      value={newItem.is_vegan}
                      onValueChange={(value) => setNewItem({ ...newItem, is_vegan: value })}
                    />
                  </View>
                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Gluten Free</Text>
                    <Switch
                      value={newItem.is_gluten_free}
                      onValueChange={(value) => setNewItem({ ...newItem, is_gluten_free: value })}
                    />
                  </View>
                </View>
              </View>

              <TouchableOpacity style={styles.createButton} onPress={createMenuItem}>
                <Text style={styles.createButtonText}>Add Menu Item</Text>
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
                  <Text style={styles.modalTitle}>Edit Menu Item</Text>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setEditItemModal(false)}
                  >
                    <Text style={styles.closeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody}>
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Name *</Text>
                    <TextInput
                      style={styles.formInput}
                      value={selectedItem.name}
                      onChangeText={(text) => setSelectedItem({ ...selectedItem, name: text })}
                      placeholder="Enter item name"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Description *</Text>
                    <TextInput
                      style={[styles.formInput, styles.textArea]}
                      value={selectedItem.description}
                      onChangeText={(text) => setSelectedItem({ ...selectedItem, description: text })}
                      placeholder="Describe the item"
                      multiline
                      numberOfLines={3}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Price *</Text>
                    <TextInput
                      style={styles.formInput}
                      value={selectedItem.price.toString()}
                      onChangeText={(text) => setSelectedItem({ ...selectedItem, price: Number(text) || 0 })}
                      placeholder="0.00"
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Cost Price *</Text>
                    <TextInput
                      style={styles.formInput}
                      value={selectedItem.cost_price.toString()}
                      onChangeText={(text) => setSelectedItem({ ...selectedItem, cost_price: Number(text) || 0 })}
                      placeholder="0.00"
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Availability</Text>
                    <View style={styles.switchRow}>
                      <Text style={[styles.switchLabel, { 
                        color: selectedItem.is_available ? '#16a34a' : '#ef4444',
                        fontFamily: 'Inter-SemiBold'
                      }]}>
                        {selectedItem.is_available ? '✅ Available for ordering' : '❌ Not available for ordering'}
                      </Text>
                      <Switch
                        value={selectedItem.is_available}
                        onValueChange={(value) => {
                          console.log('Toggling availability for:', selectedItem.name, 'to:', value);
                          setSelectedItem({ ...selectedItem, is_available: value });
                        }}
                        trackColor={{ false: '#ef4444', true: '#16a34a' }}
                        thumbColor={selectedItem.is_available ? '#ffffff' : '#f4f3f4'}
                      />
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Category</Text>
                    <ScrollView horizontal style={styles.categorySelector}>
                      {categories.map((category) => (
                        <TouchableOpacity
                          key={category}
                          style={[
                            styles.categoryOption,
                            selectedItem.category === category && styles.categoryOptionActive,
                          ]}
                          onPress={() => setSelectedItem({ ...selectedItem, category })}
                        >
                          <Text style={styles.categoryOptionIcon}>{getCategoryIcon(category)}</Text>
                          <Text style={[
                            styles.categoryOptionText,
                            selectedItem.category === category && styles.categoryOptionTextActive,
                          ]}>
                            {category.replace('_', ' ').charAt(0).toUpperCase() + category.replace('_', ' ').slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Subcategory</Text>
                    <TextInput
                      style={styles.formInput}
                      value={selectedItem.subcategory || ''}
                      onChangeText={(text) => setSelectedItem({ ...selectedItem, subcategory: text })}
                      placeholder="Enter subcategory (optional)"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Dietary Options</Text>
                    <View style={styles.switchContainer}>
                      <View style={styles.switchRow}>
                        <Text style={styles.switchLabel}>Vegetarian</Text>
                        <Switch
                          value={selectedItem.is_vegetarian}
                          onValueChange={(value) => setSelectedItem({ ...selectedItem, is_vegetarian: value })}
                        />
                      </View>
                      <View style={styles.switchRow}>
                        <Text style={styles.switchLabel}>Vegan</Text>
                        <Switch
                          value={selectedItem.is_vegan}
                          onValueChange={(value) => setSelectedItem({ ...selectedItem, is_vegan: value })}
                        />
                      </View>
                      <View style={styles.switchRow}>
                        <Text style={styles.switchLabel}>Gluten Free</Text>
                        <Switch
                          value={selectedItem.is_gluten_free}
                          onValueChange={(value) => setSelectedItem({ ...selectedItem, is_gluten_free: value })}
                        />
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.updateButton} onPress={updateMenuItem}>
                    <LinearGradient
                      colors={['#059669', '#10b981']}
                      style={styles.updateButtonGradient}
                    >
                      <Text style={styles.updateButtonText}>✅ Update Menu Item</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Excel Import Modal */}
      <ExcelImporter
        visible={importModal}
        onClose={() => setImportModal(false)}
        importType="menu"
        onImportComplete={loadMenuItems}
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
  templateButton: {
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    marginLeft: 12,
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
    marginBottom: 8,
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  categoryIcon: {
    fontSize: 12,
  },
  categoryText: {
    color: 'white',
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
  },
  subcategoryText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    padding: 4,
  },
  deleteButton: {
    padding: 4,
  },
  itemDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    marginBottom: 12,
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  priceContainer: {
    alignItems: 'flex-start',
  },
  price: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1e293b',
  },
  costPrice: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
  },
  itemFlags: {
    flexDirection: 'row',
    gap: 8,
  },
  flag: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#059669',
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeInfo: {
    flexDirection: 'row',
    gap: 12,
  },
  timeText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
  },
  availabilityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  availabilityText: {
    fontSize: 10,
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
    flex: 1,
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
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
    alignItems: 'center',
    minWidth: 80,
  },
  categoryOptionActive: {
    backgroundColor: '#1e3a8a',
    borderColor: '#1e3a8a',
  },
  categoryOptionIcon: {
    fontSize: 16,
    marginBottom: 4,
  },
  categoryOptionText: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    color: '#64748b',
    textAlign: 'center',
  },
  categoryOptionTextActive: {
    color: 'white',
  },
  ingredientForm: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
  },
  ingredientInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  addButton: {
    backgroundColor: '#1e3a8a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    justifyContent: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  tagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  tagText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#0369a1',
  },
  tagRemove: {
    fontSize: 12,
    color: '#ef4444',
    fontFamily: 'Inter-Bold',
  },
  switchContainer: {
    gap: 12,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#374151',
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
  updateButton: {
    borderRadius: 8,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  updateButtonGradient: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  updateButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  switchContainer: {
    gap: 12,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
});