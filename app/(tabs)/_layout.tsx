import { Tabs } from 'expo-router';
import { useRouter, usePathname } from 'expo-router';
import { useAuthContext } from '@/contexts/AuthContext';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { loadHotelSettings } from '@/lib/storage';
import { sampleDataLoader } from '@/lib/sample-data';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  LayoutDashboard, 
  Bed, 
  Calendar, 
  ChefHat, 
  Wine, 
  Package, 
  Calculator, 
  Settings, 
  Users, 
  Waves, 
  Building, 
  Wrench, 
  ChartBar as BarChart3, 
  BookOpen,
  LogOut,
  Bell
} from 'lucide-react-native';

export default function TabLayout() {
  const { user, signOut } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();
  const [hotelName, setHotelName] = useState('Grand Hotel');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    loadHotelName();
    initializeSampleData();
    
    // Listen for settings changes
    const interval = setInterval(async () => {
      const settings = await loadHotelSettings();
      const newHotelName = settings?.hotelName || 'Grand Hotel';
      if (newHotelName !== hotelName) {
        setHotelName(newHotelName);
        setRefreshKey(prev => prev + 1);
      }
    }, 1000); // Check every second for changes
    
    return () => clearInterval(interval);
  }, []);

  const loadHotelName = async () => {
    try {
      const settings = await loadHotelSettings();
      setHotelName(settings?.hotelName || 'Grand Hotel');
    } catch (error) {
      console.error('Failed to load hotel name:', error);
      setHotelName('Grand Hotel');
    }
  };

  const initializeSampleData = async () => {
    try {
      console.log('🔄 Initializing sample data for POS systems...');
      await sampleDataLoader.initializeAllSampleData();
      console.log('✅ Sample data initialization completed');
    } catch (error) {
      console.warn('⚠️ Sample data initialization failed (non-critical):', error);
    }
  };

  const getTabsForRole = () => {
    if (!user) return [];

    const commonTabs = [
      { name: 'index', title: 'Dashboard', icon: LayoutDashboard },
    ];

    switch (user.role) {
      case 'admin':
      case 'manager':
        return [
          ...commonTabs,
          { name: 'rooms', title: 'Rooms', icon: Bed },
          { name: 'bookings', title: 'Bookings', icon: Calendar },
          { name: 'halls', title: 'Halls', icon: Building },
          { name: 'menu-management', title: 'Menu Management', icon: ChefHat },
          { name: 'restaurant', title: 'Restaurant', icon: ChefHat },
          { name: 'bar', title: 'Bar', icon: Wine },
          { name: 'pool', title: 'Pool', icon: Waves },
          { name: 'store-management', title: 'Store Management', icon: Package },
          { name: 'inventory', title: 'Inventory', icon: Package },
          { name: 'maintenance', title: 'Maintenance', icon: Wrench },
          { name: 'accounting', title: 'Accounting', icon: Calculator },
          { name: 'analytics', title: 'Analytics', icon: BarChart3 },
          { name: 'staff', title: 'Staff', icon: Users },
          { name: 'settings', title: 'Settings', icon: Settings },
        ];
      
      case 'receptionist':
        return [
          ...commonTabs,
          { name: 'rooms', title: 'Rooms', icon: Bed },
          { name: 'bookings', title: 'Bookings', icon: Calendar },
          { name: 'halls', title: 'Halls', icon: Building },
          { name: 'restaurant', title: 'Restaurant', icon: ChefHat },
          { name: 'bar', title: 'Bar', icon: Wine },
          { name: 'pool', title: 'Pool', icon: Waves },
        ];
      
      case 'kitchen_staff':
        return [
          ...commonTabs,
          { name: 'restaurant', title: 'Restaurant', icon: ChefHat },
          { name: 'recipe-kitchen', title: 'Kitchen Recipes', icon: BookOpen },
          { name: 'recipes', title: 'Recipes', icon: BookOpen },
          { name: 'store-management', title: 'Store Management', icon: Package },
          { name: 'inventory', title: 'Inventory', icon: Package },
        ];
      
      case 'bar_staff':
        return [
          ...commonTabs,
          { name: 'bar', title: 'Bar', icon: Wine },
          { name: 'pool', title: 'Pool', icon: Waves },
          { name: 'store-management', title: 'Store Management', icon: Package },
          { name: 'inventory', title: 'Inventory', icon: Package },
        ];
      
      case 'housekeeping':
        return [
          ...commonTabs,
          { name: 'rooms', title: 'Rooms', icon: Bed },
          { name: 'maintenance', title: 'Maintenance', icon: Wrench },
        ];

      case 'maintenance':
        return [
          ...commonTabs,
          { name: 'maintenance', title: 'Maintenance', icon: Wrench },
          { name: 'inventory', title: 'Inventory', icon: Package },
        ];

      case 'accountant':
        return [
          ...commonTabs,
          { name: 'accounting', title: 'Accounting', icon: Calculator },
          { name: 'analytics', title: 'Analytics', icon: BarChart3 },
        ];
      
      case 'store_keeper':
        return [
          ...commonTabs,
          { name: 'store-management', title: 'Store Management', icon: Package },
          { name: 'inventory', title: 'Inventory', icon: Package },
        ];
      
      default:
        return commonTabs;
    }
  };

  const tabs = getTabsForRole();

  return (
    <View style={styles.container}>
      {/* Fixed Sidebar */}
      <View style={styles.sidebar}>
        <LinearGradient
          colors={['#ffffff', '#f8fafc']}
          style={styles.sidebarGradient}
        >
          {/* Header */}
          <View key={refreshKey} style={styles.sidebarHeader}>
            <LinearGradient
              colors={['#2563eb', '#3b82f6']}
              style={styles.logoContainer}
            >
              <Building size={24} color="white" />
            </LinearGradient>
            <View style={styles.hotelInfo}>
              <Text style={styles.hotelName}>{hotelName}</Text>
              <Text style={styles.userRole}>{user?.role.replace('_', ' ').toUpperCase()}</Text>
            </View>
          </View>

          {/* User Info */}
          <View style={styles.userSection}>
            <View style={styles.userAvatar}>
              <Text style={styles.userInitials}>
                {user?.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </Text>
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{user?.full_name}</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
            </View>
            <TouchableOpacity style={styles.notificationButton}>
              <Bell size={18} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Navigation */}
          <ScrollView style={styles.navigation}>
            {tabs.map((tab, index) => {
              const Icon = tab.icon;
              const isActive = pathname === `/${tab.name}` || (tab.name === 'index' && pathname === '/');
              
              return (
                <TouchableOpacity
                  key={tab.name}
                  style={[styles.navItem, isActive && styles.navItemActive]}
                  onPress={() => {
                    if (tab.name === 'index') {
                      router.push('/');
                    } else {
                      router.push(`/${tab.name}`);
                    }
                  }}
                >
                  <Icon size={20} color={isActive ? "#2563eb" : "#64748b"} />
                  <Text style={[styles.navItemText, isActive && styles.navItemTextActive]}>
                    {tab.title}
                  </Text>
                  {isActive && <View style={styles.activeIndicator} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Footer */}
          <View style={styles.sidebarFooter}>
            <TouchableOpacity 
              style={styles.signOutButton}
              onPress={async () => {
                const result = await signOut();
                if (!result.error) {
                  router.replace('/auth');
                }
              }}
            >
              <LogOut size={18} color="#ef4444" />
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>

      {/* Main Content Area */}
      <View style={styles.mainContentArea}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: { display: 'none' }, // Hide the default tab bar
          }}
        >
          {tabs.map((tab) => (
            <Tabs.Screen
              key={tab.name}
              name={tab.name}
              options={{
                title: tab.title,
                tabBarIcon: ({ color, size }) => (
                  <tab.icon size={size} color={color} />
                ),
              }}
            />
          ))}
          <Tabs.Screen name="menu-management" options={{ href: null }} />
          <Tabs.Screen name="store-management" options={{ href: null }} />
          <Tabs.Screen name="recipe-kitchen" options={{ href: null }} />
        </Tabs>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
  },
  sidebar: {
    width: 280,
    backgroundColor: '#ffffff',
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
  },
  sidebarGradient: {
    flex: 1,
  },
  mainContentArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 12,
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  hotelInfo: {
    flex: 1,
  },
  hotelName: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1e293b',
  },
  userRole: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    marginTop: 2,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 12,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInitials: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: 'white',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1e293b',
  },
  userEmail: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    marginTop: 2,
  },
  notificationButton: {
    padding: 8,
  },
  navigation: {
    flex: 1,
    paddingVertical: 20,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 12,
    marginVertical: 2,
    borderRadius: 8,
    gap: 12,
    position: 'relative',
  },
  navItemActive: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  navItemText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#64748b',
  },
  navItemTextActive: {
    color: '#2563eb',
  },
  activeIndicator: {
    position: 'absolute',
    right: 12,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#2563eb',
  },
  sidebarFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    gap: 8,
  },
  signOutText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#ef4444',
  },
});