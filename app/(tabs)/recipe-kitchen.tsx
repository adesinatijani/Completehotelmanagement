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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthContext } from '@/contexts/AuthContext';
import { db } from '@/lib/database';
import { ExcelTemplateDownloader } from '@/components/ExcelTemplateDownloader';
import { Database } from '@/types/database';
import { BookOpen, ChefHat, Clock, Users, Star, Play, Package, TrendingDown } from 'lucide-react-native';

type Recipe = Database['public']['Tables']['recipes']['Row'];
type InventoryItem = Database['public']['Tables']['inventory']['Row'];

export default function RecipeKitchen() {
  const { user } = useAuthContext();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [cookingModal, setCookingModal] = useState(false);
  const [servings, setServings] = useState('1');

  useEffect(() => {
    if (user?.role === 'kitchen_staff' || user?.role === 'admin' || user?.role === 'manager') {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      const [recipesData, inventoryData] = await Promise.all([
        db.select<Recipe>('recipes'),
        db.select<InventoryItem>('inventory')
      ]);
      setRecipes(recipesData);
      setInventory(inventoryData.filter(item => 
        ['food', 'kitchen_equipment'].includes(item.category) ||
        item.storage_location.toLowerCase().includes('kitchen')
      ));
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load recipes and inventory');
    } finally {
      setLoading(false);
    }
  };

  const checkIngredientAvailability = (recipe: Recipe, servingsCount: number) => {
    const unavailableIngredients: string[] = [];
    const lowStockIngredients: string[] = [];

    recipe.ingredients.forEach(ingredient => {
      const inventoryItem = inventory.find(item => 
        item.item_name.toLowerCase().includes(ingredient.name.toLowerCase()) ||
        ingredient.name.toLowerCase().includes(item.item_name.toLowerCase())
      );

      if (!inventoryItem) {
        unavailableIngredients.push(ingredient.name);
      } else {
        const requiredQuantity = ingredient.quantity * servingsCount;
        if (inventoryItem.current_stock < requiredQuantity) {
          lowStockIngredients.push(`${ingredient.name} (need ${requiredQuantity}, have ${inventoryItem.current_stock})`);
        }
      }
    });

    return { unavailableIngredients, lowStockIngredients };
  };

  const cookRecipe = async () => {
    if (!selectedRecipe) return;

    const servingsCount = parseInt(servings) || 1;
    const { unavailableIngredients, lowStockIngredients } = checkIngredientAvailability(selectedRecipe, servingsCount);

    if (unavailableIngredients.length > 0) {
      Alert.alert(
        'Ingredients Not Available',
        `The following ingredients are not in inventory:\n${unavailableIngredients.join(', ')}`,
        [{ text: 'OK' }]
      );
      return;
    }

    if (lowStockIngredients.length > 0) {
      Alert.alert(
        'Insufficient Stock',
        `The following ingredients have insufficient stock:\n${lowStockIngredients.join('\n')}`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Cook Anyway', 
            style: 'destructive',
            onPress: () => deductIngredients(selectedRecipe, servingsCount)
          }
        ]
      );
      return;
    }

    deductIngredients(selectedRecipe, servingsCount);
  };

  const deductIngredients = async (recipe: Recipe, servingsCount: number) => {
    try {
      const updates: Promise<any>[] = [];

      recipe.ingredients.forEach(ingredient => {
        const inventoryItem = inventory.find(item => 
          item.item_name.toLowerCase().includes(ingredient.name.toLowerCase()) ||
          ingredient.name.toLowerCase().includes(item.item_name.toLowerCase())
        );

        if (inventoryItem) {
          const requiredQuantity = ingredient.quantity * servingsCount;
          const newStock = Math.max(0, inventoryItem.current_stock - requiredQuantity);
          const newValue = newStock * inventoryItem.unit_cost;

          updates.push(
            db.update('inventory', inventoryItem.id, {
              current_stock: newStock,
              total_value: newValue,
            })
          );
        }
      });

      await Promise.all(updates);

      Alert.alert(
        'Recipe Cooked Successfully!',
        `${recipe.name} for ${servingsCount} serving${servingsCount !== 1 ? 's' : ''} has been prepared. Ingredients have been deducted from inventory.`,
        [{ text: 'OK' }]
      );

      setCookingModal(false);
      setSelectedRecipe(null);
      setServings('1');
      loadData(); // Reload to show updated inventory
    } catch (error) {
      console.error('Error deducting ingredients:', error);
      Alert.alert('Error', 'Failed to deduct ingredients from inventory');
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const getDifficultyColor = (difficulty: Recipe['difficulty_level']) => {
    switch (difficulty) {
      case 'easy': return '#10b981';
      case 'medium': return '#f59e0b';
      case 'hard': return '#ef4444';
      default: return '#64748b';
    }
  };

  const getDifficultyStars = (difficulty: Recipe['difficulty_level']) => {
    switch (difficulty) {
      case 'easy': return 1;
      case 'medium': return 2;
      case 'hard': return 3;
      default: return 1;
    }
  };

  if (!['kitchen_staff', 'admin', 'manager'].includes(user?.role || '')) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.accessDenied}>
          <Text style={styles.accessDeniedText}>Access Denied</Text>
          <Text style={styles.accessDeniedSubtext}>Only kitchen staff and managers can access recipe management.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#16a34a', '#22c55e', '#34d399']}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.titleContainer}>
              <BookOpen size={28} color="white" />
              <View>
                <Text style={styles.title}>Kitchen Recipes</Text>
                <Text style={styles.subtitle}>Cook & Manage Inventory</Text>
              </View>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Template Download Section */}
      <View style={styles.templateSection}>
        <Text style={styles.templateSectionTitle}>📊 Recipe Templates</Text>
        <ExcelTemplateDownloader
          templateType="menu"
          onDownloadComplete={() => {
            Alert.alert('Success', 'Recipe and menu template downloaded! This includes templates for recipes and menu items.');
          }}
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.recipesContainer}>
          {recipes.map((recipe) => {
            const { unavailableIngredients, lowStockIngredients } = checkIngredientAvailability(recipe, 1);
            const canCook = unavailableIngredients.length === 0 && lowStockIngredients.length === 0;
            
            return (
              <View key={recipe.id} style={styles.recipeCard}>
                <View style={styles.recipeHeader}>
                  <View style={styles.recipeInfo}>
                    <Text style={styles.recipeName}>{recipe.name}</Text>
                    <View style={styles.difficultyContainer}>
                      <View style={styles.starsContainer}>
                        {[...Array(3)].map((_, index) => (
                          <Star
                            key={index}
                            size={12}
                            color={index < getDifficultyStars(recipe.difficulty_level) ? getDifficultyColor(recipe.difficulty_level) : '#e2e8f0'}
                            fill={index < getDifficultyStars(recipe.difficulty_level) ? getDifficultyColor(recipe.difficulty_level) : '#e2e8f0'}
                          />
                        ))}
                      </View>
                      <Text style={[styles.difficultyText, { color: getDifficultyColor(recipe.difficulty_level) }]}>
                        {recipe.difficulty_level.charAt(0).toUpperCase() + recipe.difficulty_level.slice(1)}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.recipeActions}>
                    <TouchableOpacity
                      style={styles.viewButton}
                      onPress={() => {
                        setSelectedRecipe(recipe);
                        setModalVisible(true);
                      }}
                    >
                      <BookOpen size={16} color="#3b82f6" />
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.cookButton, { backgroundColor: canCook ? '#10b981' : '#94a3b8' }]}
                      onPress={() => {
                        if (canCook) {
                          setSelectedRecipe(recipe);
                          setCookingModal(true);
                        } else {
                          Alert.alert(
                            'Cannot Cook',
                            'Some ingredients are missing or insufficient in inventory.',
                            [{ text: 'OK' }]
                          );
                        }
                      }}
                      disabled={!canCook}
                    >
                      <ChefHat size={16} color="white" />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.recipeDescription}>{recipe.description}</Text>

                <View style={styles.recipeDetails}>
                  <View style={styles.detailRow}>
                    <Clock size={16} color="#64748b" />
                    <Text style={styles.detailText}>
                      Prep: {recipe.prep_time_minutes}min • Cook: {recipe.cooking_time_minutes}min
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Users size={16} color="#64748b" />
                    <Text style={styles.detailText}>Serves {recipe.servings}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Package size={16} color="#64748b" />
                    <Text style={styles.detailText}>{recipe.ingredients.length} ingredients</Text>
                  </View>
                </View>

                {/* Ingredient Availability Status */}
                <View style={styles.ingredientStatus}>
                  {unavailableIngredients.length > 0 && (
                    <View style={styles.statusAlert}>
                      <Text style={styles.alertText}>❌ Missing: {unavailableIngredients.length} ingredients</Text>
                    </View>
                  )}
                  {lowStockIngredients.length > 0 && (
                    <View style={styles.statusWarning}>
                      <Text style={styles.warningText}>⚠️ Low stock: {lowStockIngredients.length} ingredients</Text>
                    </View>
                  )}
                  {canCook && (
                    <View style={styles.statusSuccess}>
                      <Text style={styles.successText}>✅ Ready to cook</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Recipe Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedRecipe && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{selectedRecipe.name}</Text>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.closeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody}>
                  <View style={styles.modalSection}>
                    <Text style={styles.sectionTitle}>Ingredients</Text>
                    {selectedRecipe.ingredients.map((ingredient, index) => {
                      const inventoryItem = inventory.find(item => 
                        item.item_name.toLowerCase().includes(ingredient.name.toLowerCase()) ||
                        ingredient.name.toLowerCase().includes(item.item_name.toLowerCase())
                      );
                      
                      return (
                        <View key={index} style={styles.ingredientItem}>
                          <Text style={styles.ingredientText}>
                            {ingredient.quantity} {ingredient.unit} {ingredient.name}
                          </Text>
                          {inventoryItem && (
                            <Text style={[
                              styles.stockText,
                              { color: inventoryItem.current_stock >= ingredient.quantity ? '#10b981' : '#ef4444' }
                            ]}>
                              Stock: {inventoryItem.current_stock}
                            </Text>
                          )}
                          {!inventoryItem && (
                            <Text style={styles.stockText}>❌ Not in inventory</Text>
                          )}
                        </View>
                      );
                    })}
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.sectionTitle}>Instructions</Text>
                    <Text style={styles.instructionsText}>{selectedRecipe.instructions}</Text>
                  </View>

                  {selectedRecipe.chef_notes && (
                    <View style={styles.modalSection}>
                      <Text style={styles.sectionTitle}>Chef's Notes</Text>
                      <View style={styles.chefNotesContainer}>
                        <Text style={styles.chefNotesText}>{selectedRecipe.chef_notes}</Text>
                      </View>
                    </View>
                  )}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Cooking Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={cookingModal}
        onRequestClose={() => setCookingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedRecipe && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Cook Recipe</Text>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setCookingModal(false)}
                  >
                    <Text style={styles.closeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.modalBody}>
                  <Text style={styles.cookingRecipeName}>{selectedRecipe.name}</Text>
                  <Text style={styles.cookingDescription}>{selectedRecipe.description}</Text>

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Number of Servings</Text>
                    <TextInput
                      style={styles.formInput}
                      value={servings}
                      onChangeText={setServings}
                      placeholder="1"
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.ingredientPreview}>
                    <Text style={styles.previewTitle}>Ingredients to be deducted:</Text>
                    {selectedRecipe.ingredients.map((ingredient, index) => {
                      const servingsCount = parseInt(servings) || 1;
                      const totalQuantity = ingredient.quantity * servingsCount;
                      
                      return (
                        <View key={index} style={styles.deductionItem}>
                          <TrendingDown size={14} color="#ef4444" />
                          <Text style={styles.deductionText}>
                            {totalQuantity} {ingredient.unit} {ingredient.name}
                          </Text>
                        </View>
                      );
                    })}
                  </View>

                  <TouchableOpacity style={styles.startCookingButton} onPress={cookRecipe}>
                    <Play size={16} color="white" />
                    <Text style={styles.startCookingButtonText}>Start Cooking</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
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
  scrollView: {
    flex: 1,
  },
  recipesContainer: {
    padding: 20,
    gap: 16,
  },
  recipeCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  recipeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  recipeInfo: {
    flex: 1,
  },
  recipeName: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  difficultyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  difficultyText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  recipeActions: {
    flexDirection: 'row',
    gap: 8,
  },
  viewButton: {
    padding: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 6,
  },
  cookButton: {
    padding: 8,
    borderRadius: 6,
  },
  recipeDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    marginBottom: 12,
  },
  recipeDetails: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
  },
  ingredientStatus: {
    marginTop: 8,
  },
  statusAlert: {
    backgroundColor: '#fef2f2',
    padding: 8,
    borderRadius: 6,
    marginBottom: 4,
  },
  alertText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#dc2626',
  },
  statusWarning: {
    backgroundColor: '#fef3c7',
    padding: 8,
    borderRadius: 6,
    marginBottom: 4,
  },
  warningText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#d97706',
  },
  statusSuccess: {
    backgroundColor: '#dcfce7',
    padding: 8,
    borderRadius: 6,
  },
  successText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#16a34a',
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
  modalSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1e293b',
    marginBottom: 12,
  },
  ingredientItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  ingredientText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1e293b',
    flex: 1,
  },
  stockText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  instructionsText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    lineHeight: 22,
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 8,
  },
  chefNotesContainer: {
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  chefNotesText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#92400e',
    fontStyle: 'italic',
  },
  cookingRecipeName: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  cookingDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 20,
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
  ingredientPreview: {
    backgroundColor: '#fef2f2',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  previewTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#dc2626',
    marginBottom: 12,
  },
  deductionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  deductionText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#7f1d1d',
  },
  startCookingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16a34a',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  startCookingButtonText: {
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