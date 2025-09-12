import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '@/lib/database';
import { Database } from '@/types/database';
import { Waves, Thermometer, Users, Clock, TriangleAlert as AlertTriangle } from 'lucide-react-native';

type Order = Database['public']['Tables']['orders']['Row'];

export default function Pool() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [poolStatus] = useState({
    isOpen: true,
    temperature: 78,
    capacity: 50,
    currentOccupancy: 23,
    maintenanceScheduled: false,
    lifeguardOnDuty: true,
    poolBarOpen: true,
  });

  useEffect(() => {
    loadPoolOrders();
  }, []);

  const loadPoolOrders = async () => {
    try {
      const ordersData = await db.select<Order>('orders', {
        filters: { order_type: 'pool_bar' }
      });
      setOrders(ordersData);
    } catch (error) {
      console.error('Error loading pool orders:', error);
      Alert.alert('Error', 'Failed to load pool orders');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: Order['status']) => {
    try {
      const [updatedOrder] = await db.update<Order>('orders', orderId, { status });

      if (updatedOrder) {
        setOrders(orders.map(order => 
          order.id === orderId ? { ...order, status } : order
        ));
      }

      Alert.alert('Success', 'Order status updated');
    } catch (error) {
      console.error('Error updating order status:', error);
      Alert.alert('Error', 'Failed to update order status');
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadPoolOrders();
    setRefreshing(false);
  }, []);

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'preparing': return '#3b82f6';
      case 'ready': return '#10b981';
      case 'served': return '#64748b';
      case 'cancelled': return '#ef4444';
      default: return '#64748b';
    }
  };

  const getOccupancyColor = () => {
    const percentage = (poolStatus.currentOccupancy / poolStatus.capacity) * 100;
    if (percentage >= 90) return '#ef4444';
    if (percentage >= 70) return '#f59e0b';
    return '#10b981';
  };

  const getTemperatureStatus = () => {
    if (poolStatus.temperature < 75) return { color: '#3b82f6', status: 'Cool' };
    if (poolStatus.temperature > 82) return { color: '#ef4444', status: 'Warm' };
    return { color: '#10b981', status: 'Perfect' };
  };

  const tempStatus = getTemperatureStatus();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Pool & Pool Bar</Text>
        <Waves size={24} color="#1e3a8a" />
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Pool Status Overview */}
        <View style={styles.statusSection}>
          <Text style={styles.sectionTitle}>Pool Status</Text>
          
          <View style={styles.statusGrid}>
            <View style={styles.statusCard}>
              <View style={[styles.statusIcon, { backgroundColor: poolStatus.isOpen ? '#dcfce7' : '#fecaca' }]}>
                <Waves size={24} color={poolStatus.isOpen ? '#16a34a' : '#ef4444'} />
              </View>
              <Text style={styles.statusLabel}>Pool Status</Text>
              <Text style={[styles.statusValue, { color: poolStatus.isOpen ? '#16a34a' : '#ef4444' }]}>
                {poolStatus.isOpen ? 'Open' : 'Closed'}
              </Text>
            </View>

            <View style={styles.statusCard}>
              <View style={[styles.statusIcon, { backgroundColor: '#dbeafe' }]}>
                <Thermometer size={24} color={tempStatus.color} />
              </View>
              <Text style={styles.statusLabel}>Temperature</Text>
              <Text style={[styles.statusValue, { color: tempStatus.color }]}>
                {poolStatus.temperature}°F
              </Text>
              <Text style={styles.statusSubtext}>{tempStatus.status}</Text>
            </View>

            <View style={styles.statusCard}>
              <View style={[styles.statusIcon, { backgroundColor: '#f3e8ff' }]}>
                <Users size={24} color={getOccupancyColor()} />
              </View>
              <Text style={styles.statusLabel}>Occupancy</Text>
              <Text style={[styles.statusValue, { color: getOccupancyColor() }]}>
                {poolStatus.currentOccupancy}/{poolStatus.capacity}
              </Text>
              <Text style={styles.statusSubtext}>
                {Math.round((poolStatus.currentOccupancy / poolStatus.capacity) * 100)}% full
              </Text>
            </View>

            <View style={styles.statusCard}>
              <View style={[styles.statusIcon, { backgroundColor: poolStatus.lifeguardOnDuty ? '#dcfce7' : '#fef3c7' }]}>
                <Users size={24} color={poolStatus.lifeguardOnDuty ? '#16a34a' : '#f59e0b'} />
              </View>
              <Text style={styles.statusLabel}>Lifeguard</Text>
              <Text style={[styles.statusValue, { color: poolStatus.lifeguardOnDuty ? '#16a34a' : '#f59e0b' }]}>
                {poolStatus.lifeguardOnDuty ? 'On Duty' : 'Off Duty'}
              </Text>
            </View>
          </View>

          {poolStatus.maintenanceScheduled && (
            <View style={styles.maintenanceAlert}>
              <AlertTriangle size={20} color="#f59e0b" />
              <Text style={styles.maintenanceText}>
                Pool maintenance scheduled for today at 6:00 AM
              </Text>
            </View>
          )}
        </View>

        {/* Pool Bar Status */}
        <View style={styles.barSection}>
          <View style={styles.barHeader}>
            <Text style={styles.sectionTitle}>Pool Bar</Text>
            <View style={[
              styles.barStatusBadge,
              { backgroundColor: poolStatus.poolBarOpen ? '#dcfce7' : '#fecaca' }
            ]}>
              <Text style={[
                styles.barStatusText,
                { color: poolStatus.poolBarOpen ? '#16a34a' : '#ef4444' }
              ]}>
                {poolStatus.poolBarOpen ? 'Open' : 'Closed'}
              </Text>
            </View>
          </View>

          {/* Active Orders */}
          <View style={styles.ordersContainer}>
            <Text style={styles.ordersTitle}>
              Active Orders ({orders.filter(o => o.status !== 'served').length})
            </Text>
            
            {orders.filter(order => order.order_type === 'pool_bar' && order.status !== 'served').map((order) => (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <View style={styles.orderInfo}>
                    <Text style={styles.orderTitle}>
                      Pool Bar Order
                    </Text>
                    <Text style={styles.orderTime}>
                      {new Date(order.created_at).toLocaleTimeString()}
                    </Text>
                  </View>
                  <View style={[styles.orderStatusBadge, { backgroundColor: getStatusColor(order.status) }]}>
                    <Text style={styles.orderStatusText}>
                      {order.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.orderDetails}>
                  <Text style={styles.orderItemsCount}>
                    {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                  </Text>
                  <Text style={styles.orderAmount}>${order.total_amount}</Text>
                </View>

                <View style={styles.orderItemsList}>
                  {order.items.map((item, index) => (
                    <Text key={index} style={styles.orderItemSummary}>
                      {item.quantity}x Item #{item.menu_item_id}
                      {item.special_instructions && (
                        <Text style={styles.specialInstructions}> - {item.special_instructions}</Text>
                      )}
                    </Text>
                  ))}
                </View>

                <View style={styles.orderActions}>
                  {order.status === 'pending' && (
                    <TouchableOpacity
                      style={styles.prepareButton}
                      onPress={() => updateOrderStatus(order.id, 'preparing')}
                    >
                      <Text style={styles.actionButtonText}>Start Preparing</Text>
                    </TouchableOpacity>
                  )}

                  {order.status === 'preparing' && (
                    <TouchableOpacity
                      style={styles.readyButton}
                      onPress={() => updateOrderStatus(order.id, 'ready')}
                    >
                      <Text style={styles.actionButtonText}>Ready for Pickup</Text>
                    </TouchableOpacity>
                  )}

                  {order.status === 'ready' && (
                    <TouchableOpacity
                      style={styles.servedButton}
                      onPress={() => updateOrderStatus(order.id, 'served')}
                    >
                      <Text style={styles.actionButtonText}>Mark as Served</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}

            {orders.filter(o => o.status !== 'served').length === 0 && (
              <View style={styles.noOrdersContainer}>
                <Text style={styles.noOrdersText}>No active pool bar orders</Text>
              </View>
            )}
          </View>
        </View>

        {/* Pool Rules & Information */}
        <View style={styles.rulesSection}>
          <Text style={styles.sectionTitle}>Pool Information</Text>
          <View style={styles.rulesContainer}>
            <View style={styles.ruleItem}>
              <Clock size={16} color="#1e3a8a" />
              <Text style={styles.ruleText}>Pool Hours: 6:00 AM - 10:00 PM</Text>
            </View>
            <View style={styles.ruleItem}>
              <Users size={16} color="#1e3a8a" />
              <Text style={styles.ruleText}>Maximum Capacity: 50 guests</Text>
            </View>
            <View style={styles.ruleItem}>
              <Thermometer size={16} color="#1e3a8a" />
              <Text style={styles.ruleText}>Pool heated year-round</Text>
            </View>
            <View style={styles.ruleItem}>
              <Waves size={16} color="#1e3a8a" />
              <Text style={styles.ruleText}>Pool bar service until 9:00 PM</Text>
            </View>
          </View>

          <View style={styles.safetyRules}>
            <Text style={styles.safetyTitle}>Safety Rules</Text>
            <Text style={styles.safetyRule}>• Children under 12 must be supervised at all times</Text>
            <Text style={styles.safetyRule}>• No glass containers in pool area</Text>
            <Text style={styles.safetyRule}>• No diving in shallow end</Text>
            <Text style={styles.safetyRule}>• Shower before entering pool</Text>
            <Text style={styles.safetyRule}>• Follow lifeguard instructions</Text>
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
  scrollView: {
    flex: 1,
  },
  statusSection: {
    padding: 20,
    backgroundColor: 'white',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1e293b',
    marginBottom: 16,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statusCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  statusSubtext: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
    marginTop: 2,
  },
  maintenanceAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  maintenanceText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#92400e',
    flex: 1,
  },
  barSection: {
    padding: 20,
    backgroundColor: 'white',
    marginBottom: 12,
  },
  barHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  barStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  barStatusText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  ordersContainer: {
    marginTop: 8,
  },
  ordersTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
    marginBottom: 12,
  },
  orderCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  orderInfo: {
    flex: 1,
  },
  orderTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1e293b',
  },
  orderTime: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    marginTop: 2,
  },
  orderStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  orderStatusText: {
    color: 'white',
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
  },
  orderDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderItemsCount: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
  },
  orderAmount: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1e293b',
  },
  orderItemsList: {
    backgroundColor: 'white',
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
  },
  orderItemSummary: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    marginBottom: 4,
  },
  specialInstructions: {
    color: '#64748b',
    fontStyle: 'italic',
  },
  orderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  prepareButton: {
    flex: 1,
    backgroundColor: '#f59e0b',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  readyButton: {
    flex: 1,
    backgroundColor: '#10b981',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  servedButton: {
    flex: 1,
    backgroundColor: '#64748b',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  noOrdersContainer: {
    alignItems: 'center',
    padding: 24,
  },
  noOrdersText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
  },
  rulesSection: {
    padding: 20,
    backgroundColor: 'white',
    marginBottom: 12,
  },
  rulesContainer: {
    marginBottom: 20,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  ruleText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#374151',
  },
  safetyRules: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#1e3a8a',
  },
  safetyTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1e293b',
    marginBottom: 12,
  },
  safetyRule: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    marginBottom: 6,
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