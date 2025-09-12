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
import { db } from '@/lib/database';
import { Database } from '@/types/database';
import { DatePicker } from '@/components/DatePicker';
import { ExcelTemplateDownloader } from '@/components/ExcelTemplateDownloader';
import { Building, Plus, Search, Calendar, Users, DollarSign, Clock, MapPin } from 'lucide-react-native';

type Hall = Database['public']['Tables']['halls']['Row'];
type HallBooking = Database['public']['Tables']['hall_bookings']['Row'];

export default function Halls() {
  const [halls, setHalls] = useState<Hall[]>([]);
  const [hallBookings, setHallBookings] = useState<HallBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'halls' | 'bookings'>('halls');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHall, setSelectedHall] = useState<Hall | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [newBookingModal, setNewBookingModal] = useState(false);

  const [newBooking, setNewBooking] = useState({
    hall_id: '',
    client_name: '',
    client_email: '',
    client_phone: '',
    event_type: '',
    start_datetime: '',
    end_datetime: '',
    total_amount: 0,
    deposit_amount: 0,
    guest_count: 0,
    special_requirements: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [hallsData, bookingsData] = await Promise.all([
        db.select<Hall>('halls'),
        db.select<HallBooking>('hall_bookings')
      ]);
      setHalls(hallsData);
      setHallBookings(bookingsData);
    } catch (error) {
      console.error('Error loading halls data:', error);
      Alert.alert('Error', 'Failed to load halls data');
    } finally {
      setLoading(false);
    }
  };

  const createHallBooking = async () => {
    if (!newBooking.hall_id || !newBooking.client_name || !newBooking.client_email || 
        !newBooking.start_datetime || !newBooking.end_datetime) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const [newHallBooking] = await db.insert<HallBooking>('hall_bookings', {
        ...newBooking,
        payment_status: 'pending',
        booking_status: 'confirmed',
      });

      if (newHallBooking) {
        Alert.alert('Success', 'Hall booking created successfully');
      }
      setNewBookingModal(false);
      setNewBooking({
        hall_id: '',
        client_name: '',
        client_email: '',
        client_phone: '',
        event_type: '',
        start_datetime: '',
        end_datetime: '',
        total_amount: 0,
        deposit_amount: 0,
        guest_count: 0,
        special_requirements: '',
      });
      loadData();
    } catch (error) {
      console.error('Error creating hall booking:', error);
      Alert.alert('Error', 'Failed to create hall booking');
    }
  };

  const updateBookingStatus = async (bookingId: string, status: HallBooking['booking_status']) => {
    try {
      const [updatedBooking] = await db.update<HallBooking>('hall_bookings', bookingId, { booking_status: status });
      
      if (updatedBooking) {
        setHallBookings(hallBookings.map(booking => 
          booking.id === bookingId ? { ...booking, booking_status: status } : booking
        ));
      }
      
      Alert.alert('Success', 'Booking status updated');
    } catch (error) {
      console.error('Error updating booking status:', error);
      Alert.alert('Error', 'Failed to update booking status');
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const filteredHalls = halls.filter(hall =>
    hall.hall_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    hall.hall_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredBookings = hallBookings.filter(booking =>
    booking.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    booking.event_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getHallTypeColor = (type: Hall['hall_type']) => {
    switch (type) {
      case 'ballroom': return '#8b5cf6';
      case 'conference': return '#1e3a8a';
      case 'banquet': return '#10b981';
      case 'meeting': return '#f59e0b';
      case 'wedding': return '#ec4899';
      case 'exhibition': return '#06b6d4';
      default: return '#64748b';
    }
  };

  const getBookingStatusColor = (status: HallBooking['booking_status']) => {
    switch (status) {
      case 'confirmed': return '#f59e0b';
      case 'in_progress': return '#3b82f6';
      case 'completed': return '#10b981';
      case 'cancelled': return '#ef4444';
      default: return '#64748b';
    }
  };

  const getHallInfo = (hallId: string) => {
    const hall = halls.find(h => h.id === hallId);
    return hall ? `${hall.hall_name} (${hall.hall_type})` : 'Unknown Hall';
  };

  const getTodaysBookings = () => {
    const today = new Date().toISOString().split('T')[0];
    return hallBookings.filter(booking => 
      booking.start_datetime.startsWith(today)
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Halls & Events</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setNewBookingModal(true)}
        >
          <Plus size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'halls' && styles.activeTab]}
          onPress={() => setActiveTab('halls')}
        >
          <Text style={[styles.tabText, activeTab === 'halls' && styles.activeTabText]}>
            Halls ({halls.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'bookings' && styles.activeTab]}
          onPress={() => setActiveTab('bookings')}
        >
          <Text style={[styles.tabText, activeTab === 'bookings' && styles.activeTabText]}>
            Bookings ({getTodaysBookings().length} today)
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Search size={20} color="#64748b" />
          <TextInput
            style={styles.searchInput}
            placeholder={activeTab === 'halls' ? 'Search halls...' : 'Search bookings...'}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {activeTab === 'halls' ? (
          <View style={styles.hallsContainer}>
            {filteredHalls.map((hall) => (
              <TouchableOpacity
                key={hall.id}
                style={styles.hallCard}
                onPress={() => {
                  setSelectedHall(hall);
                  setModalVisible(true);
                }}
              >
                <View style={styles.hallHeader}>
                  <View style={styles.hallInfo}>
                    <Text style={styles.hallName}>{hall.hall_name}</Text>
                    <View style={[styles.hallTypeBadge, { backgroundColor: getHallTypeColor(hall.hall_type) }]}>
                      <Text style={styles.hallTypeText}>
                        {hall.hall_type.charAt(0).toUpperCase() + hall.hall_type.slice(1)}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.availabilityBadge, { 
                    backgroundColor: hall.is_available ? '#dcfce7' : '#fecaca' 
                  }]}>
                    <Text style={[styles.availabilityText, {
                      color: hall.is_available ? '#16a34a' : '#ef4444'
                    }]}>
                      {hall.is_available ? 'Available' : 'Unavailable'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.hallDescription}>{hall.description}</Text>

                <View style={styles.hallDetails}>
                  <View style={styles.detailRow}>
                    <Users size={16} color="#64748b" />
                    <Text style={styles.detailText}>Capacity: {hall.capacity} guests</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <DollarSign size={16} color="#64748b" />
                    <Text style={styles.detailText}>
                      ${hall.hourly_rate}/hr • ${hall.daily_rate}/day
                    </Text>
                  </View>
                </View>

                {hall.amenities && hall.amenities.length > 0 && (
                  <View style={styles.amenitiesContainer}>
                    <Text style={styles.amenitiesTitle}>Amenities:</Text>
                    <Text style={styles.amenitiesText}>
                      {hall.amenities.slice(0, 3).join(', ')}
                      {hall.amenities.length > 3 && '...'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.bookingsContainer}>
            {filteredBookings.map((booking) => (
              <View key={booking.id} style={styles.bookingCard}>
                <View style={styles.bookingHeader}>
                  <View style={styles.bookingInfo}>
                    <Text style={styles.clientName}>{booking.client_name}</Text>
                    <Text style={styles.eventType}>{booking.event_type}</Text>
                    <Text style={styles.hallName}>{getHallInfo(booking.hall_id)}</Text>
                  </View>
                  <View style={[styles.statusBadge, { 
                    backgroundColor: getBookingStatusColor(booking.booking_status) 
                  }]}>
                    <Text style={styles.statusText}>
                      {booking.booking_status.replace('_', ' ').toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.bookingDetails}>
                  <View style={styles.detailRow}>
                    <Calendar size={16} color="#64748b" />
                    <Text style={styles.detailText}>
                      {new Date(booking.start_datetime).toLocaleString()} - {new Date(booking.end_datetime).toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Users size={16} color="#64748b" />
                    <Text style={styles.detailText}>{booking.guest_count} guests</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <DollarSign size={16} color="#64748b" />
                    <Text style={styles.detailText}>${booking.total_amount}</Text>
                  </View>
                </View>

                <View style={styles.bookingActions}>
                  {booking.booking_status === 'confirmed' && (
                    <TouchableOpacity
                      style={styles.startButton}
                      onPress={() => updateBookingStatus(booking.id, 'in_progress')}
                    >
                      <Text style={styles.actionButtonText}>Start Event</Text>
                    </TouchableOpacity>
                  )}

                  {booking.booking_status === 'in_progress' && (
                    <TouchableOpacity
                      style={styles.completeButton}
                      onPress={() => updateBookingStatus(booking.id, 'completed')}
                    >
                      <Text style={styles.actionButtonText}>Complete</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Hall Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedHall && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{selectedHall.hall_name}</Text>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.closeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody}>
                  <View style={styles.modalSection}>
                    <Text style={styles.sectionTitle}>Hall Information</Text>
                    <View style={styles.infoGrid}>
                      <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Type</Text>
                        <Text style={styles.infoValue}>
                          {selectedHall.hall_type.charAt(0).toUpperCase() + selectedHall.hall_type.slice(1)}
                        </Text>
                      </View>
                      <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Capacity</Text>
                        <Text style={styles.infoValue}>{selectedHall.capacity} guests</Text>
                      </View>
                      <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Hourly Rate</Text>
                        <Text style={styles.infoValue}>${selectedHall.hourly_rate}</Text>
                      </View>
                      <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Daily Rate</Text>
                        <Text style={styles.infoValue}>${selectedHall.daily_rate}</Text>
                      </View>
                    </View>
                  </View>

                  {selectedHall.description && (
                    <View style={styles.modalSection}>
                      <Text style={styles.sectionTitle}>Description</Text>
                      <Text style={styles.descriptionText}>{selectedHall.description}</Text>
                    </View>
                  )}

                  {selectedHall.amenities && selectedHall.amenities.length > 0 && (
                    <View style={styles.modalSection}>
                      <Text style={styles.sectionTitle}>Amenities</Text>
                      <View style={styles.amenitiesGrid}>
                        {selectedHall.amenities.map((amenity, index) => (
                          <View key={index} style={styles.amenityTag}>
                            <Text style={styles.amenityText}>{amenity}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* New Booking Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={newBookingModal}
        onRequestClose={() => setNewBookingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Hall Booking</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setNewBookingModal(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Excel Template Download Section */}
              <View style={styles.templateSection}>
                <Text style={styles.templateSectionTitle}>📊 Excel Templates</Text>
                <ExcelTemplateDownloader
                  templateType="all"
                  onDownloadComplete={() => {
                    Alert.alert('Success', 'Complete template downloaded! This includes halls, bookings, and event management data.');
                  }}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Hall *</Text>
                <ScrollView horizontal style={styles.hallSelector}>
                  {halls.filter(h => h.is_available).map((hall) => (
                    <TouchableOpacity
                      key={hall.id}
                      style={[
                        styles.hallOption,
                        newBooking.hall_id === hall.id && styles.hallOptionActive,
                      ]}
                      onPress={() => setNewBooking({ ...newBooking, hall_id: hall.id })}
                    >
                      <Text style={[
                        styles.hallOptionText,
                        newBooking.hall_id === hall.id && styles.hallOptionTextActive,
                      ]}>
                        {hall.hall_name}
                      </Text>
                      <Text style={styles.hallOptionType}>{hall.hall_type}</Text>
                      <Text style={styles.hallOptionCapacity}>{hall.capacity} guests</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Client Name *</Text>
                <TextInput
                  style={styles.formInput}
                  value={newBooking.client_name}
                  onChangeText={(text) => setNewBooking({ ...newBooking, client_name: text })}
                  placeholder="Enter client name"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Client Email *</Text>
                <TextInput
                  style={styles.formInput}
                  value={newBooking.client_email}
                  onChangeText={(text) => setNewBooking({ ...newBooking, client_email: text })}
                  placeholder="Enter email address"
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Phone Number</Text>
                <TextInput
                  style={styles.formInput}
                  value={newBooking.client_phone}
                  onChangeText={(text) => setNewBooking({ ...newBooking, client_phone: text })}
                  placeholder="Enter phone number"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Event Type *</Text>
                <TextInput
                  style={styles.formInput}
                  value={newBooking.event_type}
                  onChangeText={(text) => setNewBooking({ ...newBooking, event_type: text })}
                  placeholder="e.g., Wedding, Conference, Birthday Party"
                />
              </View>

              <View style={styles.formRow}>
                <View style={styles.formGroup}>
                  <DatePicker
                    label="Start Date *"
                    value={newBooking.start_datetime.split(' ')[0] || ''}
                    onDateChange={(date) => {
                      const time = newBooking.start_datetime.split(' ')[1] || '09:00';
                      setNewBooking({ ...newBooking, start_datetime: `${date} ${time}` });
                    }}
                    placeholder="Select start date"
                    minimumDate={new Date().toISOString().split('T')[0]}
                  />
                  <TextInput
                    style={styles.timeInput}
                    value={newBooking.start_datetime.split(' ')[1] || ''}
                    onChangeText={(time) => {
                      const date = newBooking.start_datetime.split(' ')[0] || '';
                      setNewBooking({ ...newBooking, start_datetime: `${date} ${time}` });
                    }}
                    placeholder="HH:MM"
                  />
                </View>

                <View style={styles.formGroup}>
                  <DatePicker
                    label="End Date *"
                    value={newBooking.end_datetime.split(' ')[0] || ''}
                    onDateChange={(date) => {
                      const time = newBooking.end_datetime.split(' ')[1] || '17:00';
                      setNewBooking({ ...newBooking, end_datetime: `${date} ${time}` });
                    }}
                    placeholder="Select end date"
                    minimumDate={newBooking.start_datetime.split(' ')[0] || new Date().toISOString().split('T')[0]}
                  />
                  <TextInput
                    style={styles.timeInput}
                    value={newBooking.end_datetime.split(' ')[1] || ''}
                    onChangeText={(time) => {
                      const date = newBooking.end_datetime.split(' ')[0] || '';
                      setNewBooking({ ...newBooking, end_datetime: `${date} ${time}` });
                    }}
                    placeholder="HH:MM"
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Guest Count</Text>
                  <TextInput
                    style={styles.formInput}
                    value={newBooking.guest_count.toString()}
                    onChangeText={(text) => setNewBooking({ ...newBooking, guest_count: Number(text) || 0 })}
                    placeholder="Number of guests"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Total Amount</Text>
                  <TextInput
                    style={styles.formInput}
                    value={newBooking.total_amount.toString()}
                    onChangeText={(text) => setNewBooking({ ...newBooking, total_amount: Number(text) || 0 })}
                    placeholder="Enter total amount"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Special Requirements</Text>
                <TextInput
                  style={[styles.formInput, styles.textArea]}
                  value={newBooking.special_requirements}
                  onChangeText={(text) => setNewBooking({ ...newBooking, special_requirements: text })}
                  placeholder="Any special requirements..."
                  multiline
                  numberOfLines={3}
                />
              </View>

              <TouchableOpacity style={styles.createButton} onPress={createHallBooking}>
                <Text style={styles.createButtonText}>Create Booking</Text>
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#1e3a8a',
  },
  tabText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
  },
  activeTabText: {
    color: '#1e3a8a',
    fontFamily: 'Inter-SemiBold',
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
  scrollView: {
    flex: 1,
  },
  hallsContainer: {
    padding: 20,
    gap: 16,
  },
  hallCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  hallHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  hallInfo: {
    flex: 1,
  },
  hallName: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  hallTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  hallTypeText: {
    color: 'white',
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
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
  hallDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    marginBottom: 12,
  },
  hallDetails: {
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
  amenitiesContainer: {
    marginTop: 8,
  },
  amenitiesTitle: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
    marginBottom: 4,
  },
  amenitiesText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    fontStyle: 'italic',
  },
  bookingsContainer: {
    padding: 20,
    gap: 16,
  },
  bookingCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bookingInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#1e293b',
  },
  eventType: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#1e3a8a',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
  },
  bookingDetails: {
    gap: 8,
    marginBottom: 12,
  },
  bookingActions: {
    flexDirection: 'row',
    gap: 8,
  },
  startButton: {
    flex: 1,
    backgroundColor: '#10b981',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  completeButton: {
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
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  infoItem: {
    flex: 1,
    minWidth: 120,
  },
  infoLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1e293b',
  },
  descriptionText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    lineHeight: 20,
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amenityTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
  },
  amenityText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#1e3a8a',
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
  hallSelector: {
    flexDirection: 'row',
  },
  hallOption: {
    marginRight: 12,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minWidth: 140,
  },
  hallOptionActive: {
    backgroundColor: '#1e3a8a',
    borderColor: '#1e3a8a',
  },
  hallOptionText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#64748b',
  },
  hallOptionTextActive: {
    color: 'white',
  },
  hallOptionType: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  hallOptionCapacity: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
    marginTop: 2,
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
  timeInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    backgroundColor: '#fafafa',
    marginTop: 8,
  },
});