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
import { useAuthContext } from '@/contexts/AuthContext';
import { db } from '@/lib/database';
import { Database } from '@/types/database';
import { ExcelTemplateDownloader } from '@/components/ExcelTemplateDownloader';
import { DatePicker } from '@/components/DatePicker';
import { BookOpen, Plus, Search, Clock, Users, ChefHat, Star } from 'lucide-react-native';

type Recipe = Database['public']['Tables']['recipes']['Row'];

export default function Recipes() {
  const { user } = useAuthContext();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<Recipe['difficulty_level'] | 'all'>('all');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [newRecipeModal, setNewRecipeModal] = useState(false);

  const [newRecipe, setNewRecipe] = useState({
    name: '',
    description: '',
    instructions: '',
    prep_time_minutes: 0,
    cooking_time_minutes: 0,
    servings: 1,
    difficulty_level: 'easy' as Recipe['difficulty_level'],
    ingredients: [] as Array<{ name: string; quantity: number; unit: string; notes?: string }>,
    chef_notes: '',
  });

  const [newIngredient, setNewIngredient] = useState({
    name: '',
    quantity: 0,
    unit: '',
    notes: '',
  });

  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    try {
      const recipesData = await db.select<Recipe>('recipes');
      setRecipes(recipesData);
    } catch (error) {
      console.error('Error loading recipes:', error);
      Alert.alert('Error', 'Failed to load recipes');
    } finally {
      setLoading(false);
    }
  };

  const createRecipe = async () => {
    if (!newRecipe.name || !newRecipe.description || !newRecipe.instructions) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (newRecipe.ingredients.length === 0) {
      Alert.alert('Error', 'Please add at least one ingredient');
      return;
    }

    try {
      const [newRecipe] = await db.insert<Recipe>('recipes', {
        ...newRecipe,
        created_by: user?.id || '1',
      });

      if (newRecipe) {
        Alert.alert('Success', 'Recipe created successfully');
      }
      setNewRecipeModal(false);
      setNewRecipe({
        name: '',
        description: '',
        instructions: '',
        prep_time_minutes: 0,
        cooking_time_minutes: 0,
        servings: 1,
        difficulty_level: 'easy',
        ingredients: [],
        chef_notes: '',
      });
      loadRecipes();
    } catch (error) {
      console.error('Error creating recipe:', error);
      Alert.alert('Error', 'Failed to create recipe');
    }
  };

  const addIngredient = () => {
    if (!newIngredient.name || newIngredient.quantity <= 0 || !newIngredient.unit) {
      Alert.alert('Error', 'Please fill in ingredient details');
      return;
    }

    setNewRecipe({
      ...newRecipe,
      ingredients: [...newRecipe.ingredients, { ...newIngredient }]
    });

    setNewIngredient({
      name: '',
      quantity: 0,
      unit: '',
      notes: '',
    });
  };

  const removeIngredient = (index: number) => {
    setNewRecipe({
      ...newRecipe,
      ingredients: newRecipe.ingredients.filter((_, i) => i !== index)
    });
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadRecipes();
    setRefreshing(false);
  }, []);

  const filteredRecipes = recipes.filter(recipe => {
    const matchesSearch = recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         recipe.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDifficulty = selectedDifficulty === 'all' || recipe.difficulty_level === selectedDifficulty;
    return matchesSearch && matchesDifficulty;
  });

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

  const difficultyOptions: Recipe['difficulty_level'][] = ['easy', 'medium', 'hard'];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Recipe Collection</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setNewRecipeModal(true)}
        >
          <Plus size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* Template Download Section */}
      <View style={styles.templateSection}>
        <Text style={styles.templateSectionTitle}>📊 Recipe Templates</Text>
        <ExcelTemplateDownloader
          templateType="menu"
          onDownloadComplete={() => {
            Alert.alert('Success', 'Recipe template downloaded! Use this to import recipes and menu items in bulk.');
          }}
        />
      </View>

      {/* Search and Filters */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Search size={20} color="#64748b" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search recipes..."
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
          style={[styles.filterButton, selectedDifficulty === 'all' && styles.activeFilter]}
          onPress={() => setSelectedDifficulty('all')}
        >
          <Text style={[styles.filterText, selectedDifficulty === 'all' && styles.activeFilterText]}>
            All ({recipes.length})
          </Text>
        </TouchableOpacity>
        {difficultyOptions.map((difficulty) => {
          const count = recipes.filter(r => r.difficulty_level === difficulty).length;
          return (
            <TouchableOpacity
              key={difficulty}
              style={[styles.filterButton, selectedDifficulty === difficulty && styles.activeFilter]}
              onPress={() => setSelectedDifficulty(difficulty)}
            >
              <Text style={[styles.filterText, selectedDifficulty === difficulty && styles.activeFilterText]}>
                {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.recipesContainer}>
          {filteredRecipes.map((recipe) => (
            <TouchableOpacity
              key={recipe.id}
              style={styles.recipeCard}
              onPress={() => {
                setSelectedRecipe(recipe);
                setModalVisible(true);
              }}
            >
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
                <ChefHat size={20} color="#1e3a8a" />
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
              </View>

              <View style={styles.ingredientsPreview}>
                <Text style={styles.ingredientsTitle}>Ingredients ({recipe.ingredients.length}):</Text>
                <Text style={styles.ingredientsText}>
                  {recipe.ingredients.slice(0, 3).map(ing => ing.name).join(', ')}
                  {recipe.ingredients.length > 3 && '...'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
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
                    <Text style={styles.sectionTitle}>Recipe Information</Text>
                    <Text style={styles.descriptionText}>{selectedRecipe.description}</Text>
                    
                    <View style={styles.recipeMetrics}>
                      <View style={styles.metricItem}>
                        <Text style={styles.metricLabel}>Prep Time</Text>
                        <Text style={styles.metricValue}>{selectedRecipe.prep_time_minutes} min</Text>
                      </View>
                      <View style={styles.metricItem}>
                        <Text style={styles.metricLabel}>Cook Time</Text>
                        <Text style={styles.metricValue}>{selectedRecipe.cooking_time_minutes} min</Text>
                      </View>
                      <View style={styles.metricItem}>
                        <Text style={styles.metricLabel}>Servings</Text>
                        <Text style={styles.metricValue}>{selectedRecipe.servings}</Text>
                      </View>
                      <View style={styles.metricItem}>
                        <Text style={styles.metricLabel}>Difficulty</Text>
                        <Text style={[styles.metricValue, { color: getDifficultyColor(selectedRecipe.difficulty_level) }]}>
                          {selectedRecipe.difficulty_level.charAt(0).toUpperCase() + selectedRecipe.difficulty_level.slice(1)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.sectionTitle}>Ingredients</Text>
                    {selectedRecipe.ingredients.map((ingredient, index) => (
                      <View key={index} style={styles.ingredientItem}>
                        <Text style={styles.ingredientText}>
                          {ingredient.quantity} {ingredient.unit} {ingredient.name}
                        </Text>
                        {ingredient.notes && (
                          <Text style={styles.ingredientNotes}>({ingredient.notes})</Text>
                        )}
                      </View>
                    ))}
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

                  {selectedRecipe.nutritional_info && (
                    <View style={styles.modalSection}>
                      <Text style={styles.sectionTitle}>Nutritional Information</Text>
                      <View style={styles.nutritionGrid}>
                        <View style={styles.nutritionItem}>
                          <Text style={styles.nutritionLabel}>Calories</Text>
                          <Text style={styles.nutritionValue}>{selectedRecipe.nutritional_info.calories}</Text>
                        </View>
                        <View style={styles.nutritionItem}>
                          <Text style={styles.nutritionLabel}>Protein</Text>
                          <Text style={styles.nutritionValue}>{selectedRecipe.nutritional_info.protein}g</Text>
                        </View>
                        <View style={styles.nutritionItem}>
                          <Text style={styles.nutritionLabel}>Carbs</Text>
                          <Text style={styles.nutritionValue}>{selectedRecipe.nutritional_info.carbs}g</Text>
                        </View>
                        <View style={styles.nutritionItem}>
                          <Text style={styles.nutritionLabel}>Fat</Text>
                          <Text style={styles.nutritionValue}>{selectedRecipe.nutritional_info.fat}g</Text>
                        </View>
                      </View>
                    </View>
                  )}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* New Recipe Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={newRecipeModal}
        onRequestClose={() => setNewRecipeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Recipe</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setNewRecipeModal(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Recipe Name *</Text>
                <TextInput
                  style={styles.formInput}
                  value={newRecipe.name}
                  onChangeText={(text) => setNewRecipe({ ...newRecipe, name: text })}
                  placeholder="Enter recipe name"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Description *</Text>
                <TextInput
                  style={[styles.formInput, styles.textArea]}
                  value={newRecipe.description}
                  onChangeText={(text) => setNewRecipe({ ...newRecipe, description: text })}
                  placeholder="Describe the dish"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.formRow}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Prep Time (min)</Text>
                  <TextInput
                    style={styles.formInput}
                    value={newRecipe.prep_time_minutes.toString()}
                    onChangeText={(text) => setNewRecipe({ ...newRecipe, prep_time_minutes: Number(text) || 0 })}
                    placeholder="0"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Cook Time (min)</Text>
                  <TextInput
                    style={styles.formInput}
                    value={newRecipe.cooking_time_minutes.toString()}
                    onChangeText={(text) => setNewRecipe({ ...newRecipe, cooking_time_minutes: Number(text) || 0 })}
                    placeholder="0"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Servings</Text>
                  <TextInput
                    style={styles.formInput}
                    value={newRecipe.servings.toString()}
                    onChangeText={(text) => setNewRecipe({ ...newRecipe, servings: Number(text) || 1 })}
                    placeholder="1"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Difficulty</Text>
                  <View style={styles.difficultySelector}>
                    {difficultyOptions.map((difficulty) => (
                      <TouchableOpacity
                        key={difficulty}
                        style={[
                          styles.difficultyOption,
                          newRecipe.difficulty_level === difficulty && styles.difficultyOptionActive,
                        ]}
                        onPress={() => setNewRecipe({ ...newRecipe, difficulty_level: difficulty })}
                      >
                        <Text style={[
                          styles.difficultyOptionText,
                          newRecipe.difficulty_level === difficulty && styles.difficultyOptionTextActive,
                        ]}>
                          {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Ingredients *</Text>
                <View style={styles.ingredientForm}>
                  <View style={styles.ingredientInputRow}>
                    <TextInput
                      style={[styles.formInput, { flex: 2 }]}
                      value={newIngredient.name}
                      onChangeText={(text) => setNewIngredient({ ...newIngredient, name: text })}
                      placeholder="Ingredient name"
                    />
                    <TextInput
                      style={[styles.formInput, { flex: 1 }]}
                      value={newIngredient.quantity.toString()}
                      onChangeText={(text) => setNewIngredient({ ...newIngredient, quantity: Number(text) || 0 })}
                      placeholder="Qty"
                      keyboardType="numeric"
                    />
                    <TextInput
                      style={[styles.formInput, { flex: 1 }]}
                      value={newIngredient.unit}
                      onChangeText={(text) => setNewIngredient({ ...newIngredient, unit: text })}
                      placeholder="Unit"
                    />
                  </View>
                  <TextInput
                    style={styles.formInput}
                    value={newIngredient.notes}
                    onChangeText={(text) => setNewIngredient({ ...newIngredient, notes: text })}
                    placeholder="Notes (optional)"
                  />
                  <TouchableOpacity style={styles.addIngredientButton} onPress={addIngredient}>
                    <Text style={styles.addIngredientText}>Add Ingredient</Text>
                  </TouchableOpacity>
                </View>

                {newRecipe.ingredients.length > 0 && (
                  <View style={styles.ingredientsList}>
                    {newRecipe.ingredients.map((ingredient, index) => (
                      <View key={index} style={styles.ingredientListItem}>
                        <Text style={styles.ingredientListText}>
                          {ingredient.quantity} {ingredient.unit} {ingredient.name}
                          {ingredient.notes && ` (${ingredient.notes})`}
                        </Text>
                        <TouchableOpacity onPress={() => removeIngredient(index)}>
                          <Text style={styles.removeIngredientText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Instructions *</Text>
                <TextInput
                  style={[styles.formInput, styles.instructionsArea]}
                  value={newRecipe.instructions}
                  onChangeText={(text) => setNewRecipe({ ...newRecipe, instructions: text })}
                  placeholder="Step-by-step cooking instructions..."
                  multiline
                  numberOfLines={6}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Chef's Notes</Text>
                <TextInput
                  style={[styles.formInput, styles.textArea]}
                  value={newRecipe.chef_notes}
                  onChangeText={(text) => setNewRecipe({ ...newRecipe, chef_notes: text })}
                  placeholder="Any special tips or notes..."
                  multiline
                  numberOfLines={3}
                />
              </View>

              <TouchableOpacity style={styles.createButton} onPress={createRecipe}>
                <Text style={styles.createButtonText}>Create Recipe</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#1e293b',
  },
  addButton: {
    width: 40,
    height: 40,
    backgroundColor: '#1e3a8a',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
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
  ingredientsPreview: {
    marginTop: 8,
  },
  ingredientsTitle: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
    marginBottom: 4,
  },
  ingredientsText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    fontStyle: 'italic',
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
  descriptionText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 16,
  },
  recipeMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  metricItem: {
    flex: 1,
    minWidth: 80,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1e293b',
  },
  ingredientItem: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  ingredientText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1e293b',
  },
  ingredientNotes: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: 2,
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
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  nutritionItem: {
    flex: 1,
    minWidth: 80,
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
  },
  nutritionLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    marginBottom: 4,
  },
  nutritionValue: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1e293b',
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
  instructionsArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  difficultySelector: {
    flexDirection: 'row',
    gap: 8,
  },
  difficultyOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  difficultyOptionActive: {
    backgroundColor: '#1e3a8a',
    borderColor: '#1e3a8a',
  },
  difficultyOptionText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#64748b',
  },
  difficultyOptionTextActive: {
    color: 'white',
  },
  ingredientForm: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  ingredientInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  addIngredientButton: {
    backgroundColor: '#1e3a8a',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  addIngredientText: {
    color: 'white',
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  ingredientsList: {
    marginTop: 12,
  },
  ingredientListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#e0f2fe',
    padding: 8,
    borderRadius: 6,
    marginBottom: 4,
  },
  ingredientListText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#0369a1',
    flex: 1,
  },
  removeIngredientText: {
    fontSize: 14,
    color: '#ef4444',
    fontFamily: 'Inter-Bold',
    paddingHorizontal: 8,
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