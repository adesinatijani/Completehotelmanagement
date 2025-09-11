import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '@/lib/database';
import { DatePicker } from '@/components/DatePicker';
import { ExcelTemplateDownloader } from '@/components/ExcelTemplateDownloader';
import { ChartBar as BarChart, TrendingUp, TrendingDown, DollarSign, Users, Bed, Calendar, ChefHat, Wine, Building } from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface AnalyticsData {
  occupancyRate: number;
  averageDailyRate: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  roomRevenue: number;
  foodBeverageRevenue: number;
  hallRevenue: number;
  monthlyTrends: Array<{
    month: string;
    revenue: number;
    expenses: number;
    occupancy: number;
  }>;
  topPerformingRooms: Array<{
    roomNumber: string;
    revenue: number;
    occupancyRate: number;
  }>;
  popularMenuItems: Array<{
    name: string;
    orders: number;
    revenue: number;
  }>;
  maintenanceCosts: number;
  customerSatisfaction: number;
}

export default function Analytics() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

  useEffect(() => {
    loadAnalyticsData();
  }, [selectedPeriod]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Get all data for analytics
      const [rooms, bookings, transactions, orders, maintenanceRequests, hallBookings] = await Promise.all([
        db.select('rooms'),
        db.select('bookings'),
        db.select('transactions'),
        db.select('orders'),
        db.select('maintenance_requests'),
        db.select('hall_bookings')
      ]);

      // Calculate analytics
      const totalRooms = rooms.length;
      const occupiedRooms = rooms.filter(r => r.status === 'occupied').length;
      const occupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;

      // Revenue calculations
      const roomRevenue = transactions
        .filter(t => t.type === 'income' && t.category === 'room_revenue')
        .reduce((sum, t) => sum + t.amount, 0);

      const foodBeverageRevenue = transactions
        .filter(t => t.type === 'income' && t.category === 'food_beverage')
        .reduce((sum, t) => sum + t.amount, 0);

      // Also include direct order revenue (POS sales)
      const directOrderRevenue = orders
        .filter(o => o.payment_status === 'paid')
        .reduce((sum, o) => sum + o.total_amount, 0);

      const hallRevenue = transactions
        .filter(t => t.type === 'income' && t.category === 'hall_revenue')
        .reduce((sum, t) => sum + t.amount, 0);

      const totalRevenue = roomRevenue + foodBeverageRevenue + directOrderRevenue + hallRevenue;
      const totalExpenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      const netProfit = totalRevenue - totalExpenses;

      const averageDailyRate = bookings.length > 0 
        ? bookings.reduce((sum, b) => sum + b.total_amount, 0) / bookings.length 
        : 0;

      // Maintenance costs
      const maintenanceCosts = maintenanceRequests
        .filter(r => r.actual_cost)
        .reduce((sum, r) => sum + (r.actual_cost || 0), 0);

      // Generate monthly trends (mock data for demo)
      const monthlyTrends = [
        { month: 'Jan', revenue: totalRevenue * 0.8, expenses: totalExpenses * 0.7, occupancy: occupancyRate * 0.9 },
        { month: 'Feb', revenue: totalRevenue * 0.9, expenses: totalExpenses * 0.8, occupancy: occupancyRate * 0.95 },
        { month: 'Mar', revenue: totalRevenue, expenses: totalExpenses, occupancy: occupancyRate },
      ];

      // Top performing rooms (mock calculation)
      const topPerformingRooms = rooms
        .slice(0, 5)
        .map(room => ({
          roomNumber: room.room_number,
          revenue: room.price_per_night * 20, // Mock calculation
          occupancyRate: Math.random() * 100,
        }))
        .sort((a, b) => b.revenue - a.revenue);

      // Popular menu items (mock calculation)
      const popularMenuItems = [
        { name: 'Grilled Salmon', orders: 45, revenue: 1305 },
        { name: 'Beef Tenderloin', orders: 32, revenue: 1375 },
        { name: 'Caesar Salad', orders: 67, revenue: 870 },
        { name: 'Mojito', orders: 89, revenue: 1068 },
        { name: 'Chocolate Lava Cake', orders: 54, revenue: 540 },
      ];

      const analytics: AnalyticsData = {
        occupancyRate,
        averageDailyRate,
        totalRevenue,
        totalExpenses,
        netProfit,
        roomRevenue,
        foodBeverageRevenue,
        hallRevenue,
        monthlyTrends,
        topPerformingRooms,
        popularMenuItems,
        maintenanceCosts,
        customerSatisfaction: 4.2, // Mock data
      };

      setAnalyticsData(analytics);

    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadAnalyticsData();
    setRefreshing(false);
  }, [selectedPeriod]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getPercentageChange = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  if (!analyticsData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Analytics & Reports</Text>
        <BarChart size={24} color="#1e3a8a" />
      </View>

      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {['week', 'month', 'quarter', 'year'].map((period) => (
          <TouchableOpacity
            key={period}
            style={[
              styles.periodButton,
              selectedPeriod === period && styles.activePeriodButton,
            ]}
            onPress={() => setSelectedPeriod(period as any)}
          >
            <Text style={[
              styles.periodButtonText,
              selectedPeriod === period && styles.activePeriodButtonText,
            ]}>
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Key Performance Indicators */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Performance Indicators</Text>
          <View style={styles.kpiGrid}>
            <View style={styles.kpiCard}>
              <View style={[styles.kpiIcon, { backgroundColor: '#dbeafe' }]}>
                <DollarSign size={24} color="#1e3a8a" />
              </View>
              <Text style={styles.kpiValue}>{formatCurrency(analyticsData.totalRevenue)}</Text>
              <Text style={styles.kpiLabel}>Total Revenue</Text>
              <View style={styles.kpiTrend}>
                <TrendingUp size={12} color="#10b981" />
                <Text style={styles.kpiTrendText}>+12.5%</Text>
              </View>
            </View>

            <View style={styles.kpiCard}>
              <View style={[styles.kpiIcon, { backgroundColor: '#dcfce7' }]}>
                <Bed size={24} color="#16a34a" />
              </View>
              <Text style={styles.kpiValue}>{analyticsData.occupancyRate.toFixed(1)}%</Text>
              <Text style={styles.kpiLabel}>Occupancy Rate</Text>
              <View style={styles.kpiTrend}>
                <TrendingUp size={12} color="#10b981" />
                <Text style={styles.kpiTrendText}>+5.2%</Text>
              </View>
            </View>

            <View style={styles.kpiCard}>
              <View style={[styles.kpiIcon, { backgroundColor: '#fef3c7' }]}>
                <Calendar size={24} color="#d97706" />
              </View>
              <Text style={styles.kpiValue}>{formatCurrency(analyticsData.averageDailyRate)}</Text>
              <Text style={styles.kpiLabel}>Avg Daily Rate</Text>
              <View style={styles.kpiTrend}>
                <TrendingDown size={12} color="#ef4444" />
                <Text style={[styles.kpiTrendText, { color: '#ef4444' }]}>-2.1%</Text>
              </View>
            </View>

            <View style={styles.kpiCard}>
              <View style={[styles.kpiIcon, { 
                backgroundColor: analyticsData.netProfit >= 0 ? '#dcfce7' : '#fecaca' 
              }]}>
                <TrendingUp size={24} color={analyticsData.netProfit >= 0 ? '#16a34a' : '#ef4444'} />
              </View>
              <Text style={[
                styles.kpiValue,
                { color: analyticsData.netProfit >= 0 ? '#16a34a' : '#ef4444' }
              ]}>
                {formatCurrency(analyticsData.netProfit)}
              </Text>
              <Text style={styles.kpiLabel}>Net Profit</Text>
              <View style={styles.kpiTrend}>
                <TrendingUp size={12} color="#10b981" />
                <Text style={styles.kpiTrendText}>+8.7%</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Revenue Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Revenue Breakdown</Text>
          <View style={styles.revenueBreakdown}>
            <View style={styles.revenueItem}>
              <View style={styles.revenueHeader}>
                <Bed size={20} color="#1e3a8a" />
                <Text style={styles.revenueLabel}>Room Revenue</Text>
                <Text style={styles.revenueAmount}>{formatCurrency(analyticsData.roomRevenue)}</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[
                  styles.progressFill,
                  { 
                    width: `${(analyticsData.roomRevenue / analyticsData.totalRevenue) * 100}%`,
                    backgroundColor: '#1e3a8a'
                  }
                ]} />
              </View>
              <Text style={styles.revenuePercentage}>
                {((analyticsData.roomRevenue / analyticsData.totalRevenue) * 100).toFixed(1)}% of total
              </Text>
            </View>

            <View style={styles.revenueItem}>
              <View style={styles.revenueHeader}>
                <ChefHat size={20} color="#16a34a" />
                <Text style={styles.revenueLabel}>Food & Beverage</Text>
                <Text style={styles.revenueAmount}>{formatCurrency(analyticsData.foodBeverageRevenue)}</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[
                  styles.progressFill,
                  { 
                    width: `${(analyticsData.foodBeverageRevenue / analyticsData.totalRevenue) * 100}%`,
                    backgroundColor: '#16a34a'
                  }
                ]} />
              </View>
              <Text style={styles.revenuePercentage}>
                {((analyticsData.foodBeverageRevenue / analyticsData.totalRevenue) * 100).toFixed(1)}% of total
              </Text>
            </View>

            <View style={styles.revenueItem}>
              <View style={styles.revenueHeader}>
                <Building size={20} color="#7c3aed" />
                <Text style={styles.revenueLabel}>Hall Rentals</Text>
                <Text style={styles.revenueAmount}>{formatCurrency(analyticsData.hallRevenue)}</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[
                  styles.progressFill,
                  { 
                    width: `${(analyticsData.hallRevenue / analyticsData.totalRevenue) * 100}%`,
                    backgroundColor: '#7c3aed'
                  }
                ]} />
              </View>
              <Text style={styles.revenuePercentage}>
                {((analyticsData.hallRevenue / analyticsData.totalRevenue) * 100).toFixed(1)}% of total
              </Text>
            </View>
          </View>
        </View>

        {/* Monthly Trends Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Monthly Trends</Text>
          <View style={styles.chartContainer}>
            <View style={styles.chartHeader}>
              <View style={styles.chartLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: '#1e3a8a' }]} />
                  <Text style={styles.legendText}>Revenue</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: '#ef4444' }]} />
                  <Text style={styles.legendText}>Expenses</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: '#10b981' }]} />
                  <Text style={styles.legendText}>Occupancy</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.chart}>
              {analyticsData.monthlyTrends.map((trend, index) => (
                <View key={index} style={styles.chartBar}>
                  <View style={styles.barContainer}>
                    <View style={[
                      styles.bar,
                      { 
                        height: (trend.revenue / Math.max(...analyticsData.monthlyTrends.map(t => t.revenue))) * 100,
                        backgroundColor: '#1e3a8a'
                      }
                    ]} />
                    <View style={[
                      styles.bar,
                      { 
                        height: (trend.expenses / Math.max(...analyticsData.monthlyTrends.map(t => t.expenses))) * 100,
                        backgroundColor: '#ef4444'
                      }
                    ]} />
                    <View style={[
                      styles.bar,
                      { 
                        height: (trend.occupancy / 100) * 100,
                        backgroundColor: '#10b981'
                      }
                    ]} />
                  </View>
                  <Text style={styles.chartLabel}>{trend.month}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Top Performing Rooms */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Performing Rooms</Text>
          <View style={styles.performanceList}>
            {analyticsData.topPerformingRooms.map((room, index) => (
              <View key={index} style={styles.performanceItem}>
                <View style={styles.performanceRank}>
                  <Text style={styles.rankNumber}>{index + 1}</Text>
                </View>
                <View style={styles.performanceInfo}>
                  <Text style={styles.performanceName}>Room {room.roomNumber}</Text>
                  <Text style={styles.performanceMetric}>
                    {formatCurrency(room.revenue)} • {room.occupancyRate.toFixed(1)}% occupancy
                  </Text>
                </View>
                <View style={styles.performanceIndicator}>
                  <View style={[
                    styles.occupancyBar,
                    { width: `${room.occupancyRate}%` }
                  ]} />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Popular Menu Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Popular Menu Items</Text>
          <View style={styles.menuItemsList}>
            {analyticsData.popularMenuItems.map((item, index) => (
              <View key={index} style={styles.menuItem}>
                <View style={styles.menuItemRank}>
                  <Text style={styles.rankNumber}>{index + 1}</Text>
                </View>
                <View style={styles.menuItemInfo}>
                  <Text style={styles.menuItemName}>{item.name}</Text>
                  <Text style={styles.menuItemStats}>
                    {item.orders} orders • {formatCurrency(item.revenue)}
                  </Text>
                </View>
                <View style={styles.menuItemTrend}>
                  <TrendingUp size={16} color="#10b981" />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Operational Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Operational Metrics</Text>
          <View style={styles.operationalGrid}>
            <View style={styles.operationalCard}>
              <Text style={styles.operationalValue}>{formatCurrency(analyticsData.maintenanceCosts)}</Text>
              <Text style={styles.operationalLabel}>Maintenance Costs</Text>
              <Text style={styles.operationalSubtext}>This month</Text>
            </View>

            <View style={styles.operationalCard}>
              <Text style={styles.operationalValue}>{analyticsData.customerSatisfaction.toFixed(1)}/5.0</Text>
              <Text style={styles.operationalLabel}>Customer Rating</Text>
              <Text style={styles.operationalSubtext}>Average score</Text>
            </View>

            <View style={styles.operationalCard}>
              <Text style={styles.operationalValue}>
                {((analyticsData.totalRevenue - analyticsData.totalExpenses) / analyticsData.totalRevenue * 100).toFixed(1)}%
              </Text>
              <Text style={styles.operationalLabel}>Profit Margin</Text>
              <Text style={styles.operationalSubtext}>Net margin</Text>
            </View>

            <View style={styles.operationalCard}>
              <Text style={styles.operationalValue}>
                {(analyticsData.totalRevenue / 30).toFixed(0)}
              </Text>
              <Text style={styles.operationalLabel}>Daily Avg Revenue</Text>
              <Text style={styles.operationalSubtext}>Per day</Text>
            </View>
          </View>
        </View>

        {/* Financial Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Financial Summary</Text>
          
          {/* Template Download Section */}
          <View style={styles.templateSection}>
            <Text style={styles.templateSectionTitle}>📊 Export Templates</Text>
            <ExcelTemplateDownloader
              templateType="all"
              onDownloadComplete={() => {
                Alert.alert('Success', 'Complete system template downloaded! This includes all data types for comprehensive analysis.');
              }}
            />
          </View>
          
          <View style={styles.financialSummary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Revenue</Text>
              <Text style={styles.summaryValue}>{formatCurrency(analyticsData.totalRevenue)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Expenses</Text>
              <Text style={[styles.summaryValue, { color: '#ef4444' }]}>
                -{formatCurrency(analyticsData.totalExpenses)}
              </Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryTotal]}>
              <Text style={styles.summaryTotalLabel}>Net Profit</Text>
              <Text style={[
                styles.summaryTotalValue,
                { color: analyticsData.netProfit >= 0 ? '#16a34a' : '#ef4444' }
              ]}>
                {formatCurrency(analyticsData.netProfit)}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    alignItems: 'center',
  },
  activePeriodButton: {
    backgroundColor: '#1e3a8a',
  },
  periodButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
  },
  activePeriodButtonText: {
    color: 'white',
    fontFamily: 'Inter-SemiBold',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: 'white',
    marginBottom: 12,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1e293b',
    marginBottom: 16,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  kpiCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  kpiIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  kpiValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1e293b',
    textAlign: 'center',
  },
  kpiLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  kpiTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  kpiTrendText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#10b981',
  },
  revenueBreakdown: {
    gap: 16,
  },
  revenueItem: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 16,
  },
  revenueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  revenueLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1e293b',
  },
  revenueAmount: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#1e293b',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  revenuePercentage: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
  },
  chartContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
  },
  chartHeader: {
    marginBottom: 20,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
  },
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 120,
  },
  chartBar: {
    alignItems: 'center',
    flex: 1,
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    height: 100,
  },
  bar: {
    width: 8,
    borderRadius: 2,
  },
  chartLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    marginTop: 8,
  },
  performanceList: {
    gap: 12,
  },
  performanceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    gap: 12,
  },
  performanceRank: {
    width: 32,
    height: 32,
    backgroundColor: '#1e3a8a',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankNumber: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Inter-Bold',
  },
  performanceInfo: {
    flex: 1,
  },
  performanceName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1e293b',
  },
  performanceMetric: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    marginTop: 2,
  },
  performanceIndicator: {
    width: 60,
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  occupancyBar: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 2,
  },
  menuItemsList: {
    gap: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    gap: 12,
  },
  menuItemRank: {
    width: 32,
    height: 32,
    backgroundColor: '#16a34a',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemInfo: {
    flex: 1,
  },
  menuItemName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1e293b',
  },
  menuItemStats: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    marginTop: 2,
  },
  menuItemTrend: {
    padding: 4,
  },
  operationalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  operationalCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  operationalValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1e293b',
    textAlign: 'center',
  },
  operationalLabel: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  operationalSubtext: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
    marginTop: 2,
    textAlign: 'center',
  },
  financialSummary: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  summaryTotal: {
    borderBottomWidth: 0,
    borderTopWidth: 2,
    borderTopColor: '#1e3a8a',
    paddingTop: 12,
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
  },
  summaryValue: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1e293b',
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#1e293b',
  },
  summaryTotalValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
  },
  templateSection: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  templateSectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#1e293b',
    marginBottom: 12,
  },
});