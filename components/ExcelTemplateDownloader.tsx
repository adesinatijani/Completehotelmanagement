import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Download, FileSpreadsheet, ChefHat, Wine, Package, Building, Users, Calculator, ChartBar as BarChart3 } from 'lucide-react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

interface ExcelTemplateDownloaderProps {
  templateType: 'rooms' | 'bookings' | 'halls' | 'menu' | 'recipes' | 'bar' | 'inventory' | 'maintenance' | 'staff' | 'financial' | 'analytics' | 'all';
  buttonText?: string;
  onDownloadComplete?: () => void;
}

export function ExcelTemplateDownloader({ 
  templateType, 
  buttonText, 
  onDownloadComplete 
}: ExcelTemplateDownloaderProps) {
  
  const getTemplateInfo = () => {
    switch (templateType) {
      case 'rooms':
        return {
          name: 'Hotel_Rooms_Template.xlsx',
          icon: Building,
          color: ['#2563eb', '#1e40af'],
          description: 'Room setup with amenities and pricing',
        };
      case 'bookings':
        return {
          name: 'Guest_Bookings_Template.xlsx',
          icon: Users,
          color: ['#059669', '#047857'],
          description: 'Guest reservations and booking data',
        };
      case 'halls':
        return {
          name: 'Event_Halls_Template.xlsx',
          icon: Building,
          color: ['#7c3aed', '#6d28d9'],
          description: 'Event spaces and hall bookings',
        };
      case 'menu':
        return {
          name: 'Menu_Items_Template.xlsx',
          icon: ChefHat,
          color: ['#dc2626', '#b91c1c'],
          description: 'Food and beverage menu items',
        };
      case 'recipes':
        return {
          name: 'Kitchen_Recipes_Template.xlsx',
          icon: ChefHat,
          color: ['#16a34a', '#15803d'],
          description: 'Kitchen recipes and cooking instructions',
        };
      case 'bar':
        return {
          name: 'Bar_Cocktails_Template.xlsx',
          icon: Wine,
          color: ['#7c3aed', '#6d28d9'],
          description: 'Bar menu and cocktail recipes',
        };
      case 'inventory':
        return {
          name: 'Inventory_Items_Template.xlsx',
          icon: Package,
          color: ['#ea580c', '#c2410c'],
          description: 'Stock management and inventory tracking',
        };
      case 'maintenance':
        return {
          name: 'Maintenance_Requests_Template.xlsx',
          icon: Package,
          color: ['#64748b', '#475569'],
          description: 'Maintenance requests and work orders',
        };
      case 'staff':
        return {
          name: 'Staff_Management_Template.xlsx',
          icon: Users,
          color: ['#4338ca', '#3730a3'],
          description: 'Staff information and role management',
        };
      case 'financial':
        return {
          name: 'Financial_Data_Template.xlsx',
          icon: Calculator,
          color: ['#059669', '#047857'],
          description: 'Financial transactions and accounting',
        };
      case 'analytics':
        return {
          name: 'Analytics_Data_Template.xlsx',
          icon: BarChart3,
          color: ['#7c3aed', '#6d28d9'],
          description: 'Performance metrics and analytics data',
        };
      case 'all':
        return {
          name: 'Complete_Hotel_System_Template.xlsx',
          icon: FileSpreadsheet,
          color: ['#1e3a8a', '#1e40af'],
          description: 'Complete system with all data types',
        };
      default:
        return {
          name: 'Hotel_Template.xlsx',
          icon: FileSpreadsheet,
          color: ['#64748b', '#475569'],
          description: 'Hotel management template',
        };
    }
  };

  const generateTemplateData = (type: string) => {
    switch (type) {
      case 'rooms':
        return {
          headers: [
            'room_number', 'room_type', 'price_per_night', 'floor', 'max_occupancy',
            'description', 'bed_size', 'air_conditioner', 'television', 'internet',
            'wardrobe', 'reading_table_chair', 'fan', 'mini_bar', 'balcony',
            'kitchen', 'jacuzzi', 'safe', 'coffee_maker'
          ],
          sampleData: [
            {
              room_number: '101',
              room_type: 'standard',
              price_per_night: 120.00,
              floor: 1,
              max_occupancy: 2,
              description: 'Comfortable standard room with city view',
              bed_size: 'queen',
              air_conditioner: true,
              television: true,
              internet: true,
              wardrobe: true,
              reading_table_chair: true,
              fan: false,
              mini_bar: false,
              balcony: false,
              kitchen: false,
              jacuzzi: false,
              safe: true,
              coffee_maker: true
            },
            {
              room_number: '201',
              room_type: 'deluxe',
              price_per_night: 180.00,
              floor: 2,
              max_occupancy: 3,
              description: 'Spacious deluxe room with balcony',
              bed_size: 'king',
              air_conditioner: true,
              television: true,
              internet: true,
              wardrobe: true,
              reading_table_chair: true,
              fan: true,
              mini_bar: true,
              balcony: true,
              kitchen: false,
              jacuzzi: false,
              safe: true,
              coffee_maker: true
            }
          ]
        };

      case 'bookings':
        return {
          headers: [
            'guest_name', 'guest_email', 'guest_phone', 'guest_id_number',
            'room_number', 'check_in', 'check_out', 'adults', 'children',
            'total_amount', 'deposit_amount', 'special_requests'
          ],
          sampleData: [
            {
              guest_name: 'John Smith',
              guest_email: 'john.smith@email.com',
              guest_phone: '+1-555-0101',
              guest_id_number: 'ID123456789',
              room_number: '101',
              check_in: '2024-02-15',
              check_out: '2024-02-18',
              adults: 2,
              children: 0,
              total_amount: 360.00,
              deposit_amount: 120.00,
              special_requests: 'Late check-in requested'
            }
          ]
        };

      case 'halls':
        return {
          headers: [
            'hall_name', 'hall_type', 'capacity', 'hourly_rate', 'daily_rate',
            'amenities', 'description', 'client_name', 'client_email',
            'event_type', 'start_datetime', 'end_datetime', 'guest_count'
          ],
          sampleData: [
            {
              hall_name: 'Grand Ballroom',
              hall_type: 'ballroom',
              capacity: 300,
              hourly_rate: 200.00,
              daily_rate: 1500.00,
              amenities: 'Sound System, Projector, Stage, Dance Floor',
              description: 'Elegant ballroom for weddings and galas',
              client_name: 'Sarah Johnson',
              client_email: 'sarah@email.com',
              event_type: 'Wedding Reception',
              start_datetime: '2024-02-20 18:00',
              end_datetime: '2024-02-20 23:00',
              guest_count: 150
            }
          ]
        };

      case 'menu':
        return {
          headers: [
            'name', 'description', 'category', 'subcategory', 'price', 'cost_price',
            'ingredients', 'allergens', 'prep_time_minutes', 'cooking_time_minutes',
            'difficulty_level', 'is_vegetarian', 'is_vegan', 'is_gluten_free', 'calories'
          ],
          sampleData: [
            {
              name: 'Grilled Salmon',
              description: 'Fresh Atlantic salmon with lemon herb butter',
              category: 'main_course',
              subcategory: 'seafood',
              price: 28.99,
              cost_price: 15.50,
              ingredients: 'salmon fillet, lemon, herbs, butter, vegetables',
              allergens: 'fish',
              prep_time_minutes: 15,
              cooking_time_minutes: 20,
              difficulty_level: 'medium',
              is_vegetarian: false,
              is_vegan: false,
              is_gluten_free: true,
              calories: 450
            }
          ]
        };

      case 'inventory':
        return {
          headers: [
            'item_name', 'category', 'subcategory', 'current_stock', 'minimum_stock',
            'maximum_stock', 'unit', 'unit_cost', 'supplier', 'supplier_contact',
            'storage_location', 'expiry_date', 'is_perishable', 'barcode'
          ],
          sampleData: [
            {
              item_name: 'Salmon Fillets',
              category: 'food',
              subcategory: 'seafood',
              current_stock: 25,
              minimum_stock: 10,
              maximum_stock: 50,
              unit: 'pieces',
              unit_cost: 15.99,
              supplier: 'Ocean Fresh Seafood',
              supplier_contact: '+1-555-0101',
              storage_location: 'Walk-in Freezer A',
              expiry_date: '2024-02-15',
              is_perishable: true,
              barcode: '1234567890123'
            }
          ]
        };

      case 'staff':
        return {
          headers: [
            'full_name', 'email', 'role', 'phone', 'department', 'start_date',
            'employee_id', 'is_active', 'emergency_contact', 'address'
          ],
          sampleData: [
            {
              full_name: 'John Smith',
              email: 'john.smith@hotel.com',
              role: 'receptionist',
              phone: '+1-555-0101',
              department: 'Front Desk',
              start_date: '2024-01-15',
              employee_id: 'EMP001',
              is_active: true,
              emergency_contact: '+1-555-0102',
              address: '123 Main St, City, State'
            }
          ]
        };

      case 'financial':
        return {
          headers: [
            'transaction_date', 'transaction_type', 'category', 'amount',
            'description', 'payment_method', 'reference_id', 'processed_by'
          ],
          sampleData: [
            {
              transaction_date: '2024-02-15',
              transaction_type: 'income',
              category: 'room_revenue',
              amount: 540.00,
              description: 'Room booking payment - John Smith',
              payment_method: 'card',
              reference_id: 'booking-001',
              processed_by: 'receptionist@hotel.com'
            }
          ]
        };

      case 'all':
        return {
          sheets: {
            'Rooms': generateTemplateData('rooms'),
            'Bookings': generateTemplateData('bookings'),
            'Menu_Items': generateTemplateData('menu'),
            'Inventory': generateTemplateData('inventory'),
            'Staff': generateTemplateData('staff'),
            'Financial': generateTemplateData('financial'),
          }
        };

      default:
        return {
          headers: ['id', 'name', 'description', 'created_at'],
          sampleData: [{ id: 1, name: 'Sample Item', description: 'Sample description', created_at: '2024-02-15' }]
        };
    }
  };

  const downloadTemplate = async () => {
    try {
      const templateInfo = getTemplateInfo();
      const templateData = generateTemplateData(templateType);
      
      if (Platform.OS === 'web') {
        // Web download with file save dialog
        if (templateType === 'all') {
          // For complete template, create a comprehensive CSV
          const allData = Object.entries(templateData.sheets).map(([sheetName, data]) => {
            const csvContent = [
              [`=== ${sheetName.toUpperCase()} ===`],
              data.headers,
              ...data.sampleData.map(row => data.headers.map(header => row[header] || ''))
            ].map(row => row.join(',')).join('\n');
            return csvContent;
          }).join('\n\n');
          
          downloadFile(allData, templateInfo.name.replace('.xlsx', '.csv'), 'text/csv');
        } else {
          // Single template
          const csvContent = [
            templateData.headers,
            ...templateData.sampleData.map(row => 
              templateData.headers.map(header => row[header] || '')
            )
          ].map(row => row.join(',')).join('\n');
          
          downloadFile(csvContent, templateInfo.name.replace('.xlsx', '.csv'), 'text/csv');
        }
      } else {
        // Mobile sharing
        const csvContent = templateType === 'all' 
          ? 'Complete hotel management template with multiple data types'
          : [
              templateData.headers,
              ...templateData.sampleData.map(row => 
                templateData.headers.map(header => row[header] || '')
              )
            ].map(row => row.join(',')).join('\n');

        const fileUri = FileSystem.documentDirectory + templateInfo.name.replace('.xlsx', '.csv');
        await FileSystem.writeAsStringAsync(fileUri, csvContent);
        
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/csv',
            dialogTitle: `Download ${templateInfo.name}`,
          });
        }
      }
      
      onDownloadComplete?.();
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Error', 'Failed to download template');
    }
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    if (typeof window !== 'undefined') {
      const blob = new Blob([content], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }
  };

  const templateInfo = getTemplateInfo();
  const Icon = templateInfo.icon;

  return (
    <TouchableOpacity style={styles.container} onPress={downloadTemplate}>
      <LinearGradient
        colors={templateInfo.color}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Icon size={20} color="white" />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.buttonText}>
              {buttonText || `Download ${templateType.charAt(0).toUpperCase() + templateType.slice(1)} Template`}
            </Text>
            <Text style={styles.description}>{templateInfo.description}</Text>
          </View>
          <Download size={16} color="white" />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  gradient: {
    borderRadius: 8,
    padding: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  buttonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: 'white',
  },
  description: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
});