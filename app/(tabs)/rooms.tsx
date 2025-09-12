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
import { ExcelTemplateDownloader } from '@/components/ExcelTemplateDownloader';
import { Bed, Plus, Search, Eye, Clock, Users, DollarSign, Wrench, Filter } from 'lucide-react-native';

type Room = Database['public']['Tables']['rooms']['Row'];

export default function Rooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<Room['status'] | 'all'>('all');
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [newRoomModal, setNewRoomModal] = useState(false);

  const [newRoom, setNewRoom] = useState({
    room_number: '',
    room_type: 'standard' as Room['room_type'],
    price_per_night: 0,
    floor: 1,
    max_occupancy: 2,
    description: '',
    bed_size: 'queen',
    facilities: {
      air_conditioner: false,
      television: false,
      internet: false,
      wardrobe: false,
      reading_table_chair: false,
      fan: false,
      mini_bar: false,
      balcony: false,
      kitchen: false,
      jacuzzi: false,
      safe: false,
      coffee_maker: false,
    },
  });

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    try {
      const roomsData = await db.select<Room>('rooms');
      setRooms(roomsData);
    } catch (error) {
      console.error('Error loading rooms:', error);
      Alert.alert('Error', 'Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  const updateRoomStatus = async (roomId: string, status: Room['status']) => {
    try {
      const [updatedRoom] = await db.update<Room>('rooms', roomId, { status });
      
      if (updatedRoom) {
        setRooms(rooms.map(room => 
          room.id === roomId ? { ...room, status } : room
        ));
      }
      
      Alert.alert('Success', 'Room status updated');
    } catch (error) {
      console.error('Error updating room status:', error);
      Alert.alert('Error', 'Failed to update room status');
    }
  };

  const createRoom = async () => {
    if (!newRoom.room_number || newRoom.price_per_night <= 0) {
      Alert.alert('Error', 'Please fill in room number and price');
      return;
    }

    // Check if room number already exists
    const existingRoom = rooms.find(r => r.room_number === newRoom.room_number);
    if (existingRoom) {
      Alert.alert('Error', 'Room number already exists');
      return;
    }

    try {
      // Convert facilities to amenities array
      const amenities = [];
      if (newRoom.facilities.air_conditioner) amenities.push('Air Conditioning');
      if (newRoom.facilities.television) amenities.push('Television');
      if (newRoom.facilities.internet) amenities.push('WiFi Internet');
      if (newRoom.facilities.wardrobe) amenities.push('Wardrobe');
      if (newRoom.facilities.reading_table_chair) amenities.push('Reading Table & Chair');
      if (newRoom.facilities.fan) amenities.push('Ceiling Fan');
      if (newRoom.facilities.mini_bar) amenities.push('Mini Bar');
      if (newRoom.facilities.balcony) amenities.push('Balcony');
      if (newRoom.facilities.kitchen) amenities.push('Kitchen');
      if (newRoom.facilities.jacuzzi) amenities.push('Jacuzzi');
      if (newRoom.facilities.safe) amenities.push('Safe');
      if (newRoom.facilities.coffee_maker) amenities.push('Coffee Maker');
      
      // Add bed size to amenities
      amenities.push(`${newRoom.bed_size.charAt(0).toUpperCase() + newRoom.bed_size.slice(1)} Size Bed`);

      const [createdRoom] = await db.insert<Room>('rooms', {
        room_number: newRoom.room_number,
        room_type: newRoom.room_type,
        status: 'available',
        price_per_night: newRoom.price_per_night,
        amenities,
        floor: newRoom.floor,
        max_occupancy: newRoom.max_occupancy,
        description: newRoom.description,
      });

      if (createdRoom) {
        Alert.alert('Success', 'Room created successfully');
      }
      setNewRoomModal(false);
      setNewRoom({
        room_number: '',
        room_type: 'standard',
        price_per_night: 0,
        floor: 1,
        max_occupancy: 2,
        description: '',
        bed_size: 'queen',
        facilities: {
          air_conditioner: false,
          television: false,
          internet: false,
          wardrobe: false,
          reading_table_chair: false,
          fan: false,
          mini_bar: false,
          balcony: false,
          kitchen: false,
          jacuzzi: false,
          safe: false,
          coffee_maker: false,
        },
      });
      loadRooms();
    } catch (error) {
      console.error('Error creating room:', error);
      Alert.alert('Error', 'Failed to create room');
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadRooms();
    setRefreshing(false);
  }, []);

  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.room_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         room.room_type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || room.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: Room['status']) => {
    switch (status) {
      case 'available': return '#059669';
      case 'occupied': return '#dc2626';
      case 'maintenance': return '#ea580c';
      case 'cleaning': return '#2563eb';
      case 'reserved': return '#7c3aed';
      case 'out_of_order': return '#64748b';
      default: return '#64748b';
    }
  };

  const getRoomTypeColor = (type: Room['room_type']) => {
    switch (type) {
      case 'standard': return '#64748b';
      case 'deluxe': return '#2563eb';
      case 'suite': return '#7c3aed';
      case 'presidential': return '#dc2626';
      case 'family': return '#059669';
      case 'executive': return '#ea580c';
      default: return '#64748b';
    }
  };

  const statusOptions: Room['status'][] = ['available', 'occupied', 'maintenance', 'cleaning', 'reserved', 'out_of_order'];

  return (
    <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.pageTitle}>Rooms Management</Text>
            <Text style={styles.pageSubtitle}>Monitor and manage hotel rooms</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => setNewRoomModal(true)}
            >
              <Plus size={20} color="#ffffff" />
              <Text style={styles.addButtonText}>Add Room</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Filters and Search */}
        <View style={styles.filtersSection}>
          <View style={styles.searchContainer}>
            <Search size={20} color="#64748b" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search rooms..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#94a3b8"
            />
          </View>
          
          <View style={styles.filterContainer}>
            <Filter size={16} color="#64748b" />
            <Text style={styles.filterLabel}>Filter:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              <TouchableOpacity
                style={[styles.filterButton, filterStatus === 'all' && styles.filterButtonActive]}
                onPress={() => setFilterStatus('all')}
              >
                <Text style={[styles.filterButtonText, filterStatus === 'all' && styles.filterButtonTextActive]}>
                  All ({rooms.length})
                </Text>
              </TouchableOpacity>
              {statusOptions.map((status) => {
                const count = rooms.filter(r => r.status === status).length;
                return (
                  <TouchableOpacity
                    key={status}
                    style={[styles.filterButton, filterStatus === status && styles.filterButtonActive]}
                    onPress={() => setFilterStatus(status)}
                  >
                    <Text style={[styles.filterButtonText, filterStatus === status && styles.filterButtonTextActive]}>
                      {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)} ({count})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>

        {/* Rooms Grid */}
        <ScrollView
          style={styles.scrollView}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={styles.roomsGrid}>
            {filteredRooms.map((room) => (
              <TouchableOpacity
                key={room.id}
                style={styles.roomCard}
                onPress={() => {
                  setSelectedRoom(room);
                  setModalVisible(true);
                }}
              >
                <View style={styles.roomHeader}>
                  <View style={styles.roomNumberContainer}>
                    <Text style={styles.roomNumber}>{room.room_number}</Text>
                    <View style={[styles.roomTypeBadge, { backgroundColor: getRoomTypeColor(room.room_type) }]}>
                      <Text style={styles.roomTypeText}>
                        {room.room_type.charAt(0).toUpperCase() + room.room_type.slice(1)}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(room.status) }]}>
                    <Text style={styles.statusText}>
                      {room.status.replace('_', ' ').charAt(0).toUpperCase() + room.status.replace('_', ' ').slice(1)}
                    </Text>
                  </View>
                </View>

                <View style={styles.roomDetails}>
                  <View style={styles.roomDetailRow}>
                    <DollarSign size={16} color="#64748b" />
                    <Text style={styles.roomDetailText}>${room.price_per_night}/night</Text>
                  </View>
                  <View style={styles.roomDetailRow}>
                    <Users size={16} color="#64748b" />
                    <Text style={styles.roomDetailText}>Max: {room.max_occupancy} guests</Text>
                  </View>
                  <View style={styles.roomDetailRow}>
                    <Clock size={16} color="#64748b" />
                    <Text style={styles.roomDetailText}>Floor: {room.floor}</Text>
                  </View>
                </View>

                <View style={styles.roomActions}>
                  {room.status === 'occupied' && (
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: '#2563eb' }]}
                      onPress={() => updateRoomStatus(room.id, 'cleaning')}
                    >
                      <Text style={styles.actionButtonText}>Check Out</Text>
                    </TouchableOpacity>
                  )}

                  {room.status === 'cleaning' && (
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: '#059669' }]}
                      onPress={() => updateRoomStatus(room.id, 'available')}
                    >
                      <Text style={styles.actionButtonText}>Clean Done</Text>
                    </TouchableOpacity>
                  )}

                  {room.status === 'available' && (
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: '#dc2626' }]}
                      onPress={() => updateRoomStatus(room.id, 'occupied')}
                    >
                      <Text style={styles.actionButtonText}>Check In</Text>
                    </TouchableOpacity>
                  )}

                  {room.status === 'maintenance' && (
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: '#059669' }]}
                      onPress={() => updateRoomStatus(room.id, 'available')}
                    >
                      <Text style={styles.actionButtonText}>Fixed</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

      {/* Room Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedRoom && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Room {selectedRoom.room_number}</Text>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.closeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody}>
                  <View style={styles.modalSection}>
                    <Text style={styles.sectionTitle}>Room Information</Text>
                    <View style={styles.infoGrid}>
                      <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Type</Text>
                        <Text style={styles.infoValue}>{selectedRoom.room_type.charAt(0).toUpperCase() + selectedRoom.room_type.slice(1)}</Text>
                      </View>
                      <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Floor</Text>
                        <Text style={styles.infoValue}>{selectedRoom.floor}</Text>
                      </View>
                      <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Max Occupancy</Text>
                        <Text style={styles.infoValue}>{selectedRoom.max_occupancy} guests</Text>
                      </View>
                      <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Price per Night</Text>
                        <Text style={styles.infoValue}>${selectedRoom.price_per_night}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.sectionTitle}>Current Status</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedRoom.status) }]}>
                      <Text style={styles.statusText}>
                        {selectedRoom.status.replace('_', ' ').charAt(0).toUpperCase() + selectedRoom.status.replace('_', ' ').slice(1)}
                      </Text>
                    </View>
                  </View>

                  {selectedRoom.amenities && selectedRoom.amenities.length > 0 && (
                    <View style={styles.modalSection}>
                      <Text style={styles.sectionTitle}>Amenities</Text>
                      <View style={styles.amenitiesContainer}>
                        {selectedRoom.amenities.map((amenity, index) => (
                          <View key={index} style={styles.amenityTag}>
                            <Text style={styles.amenityText}>{amenity}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  <View style={styles.modalSection}>
                    <Text style={styles.sectionTitle}>Change Status</Text>
                    <View style={styles.statusButtonsContainer}>
                      {statusOptions.map((status) => (
                        <TouchableOpacity
                          key={status}
                          style={[
                            styles.modalStatusButton,
                            selectedRoom.status === status && styles.modalStatusButtonActive,
                          ]}
                          onPress={() => {
                            updateRoomStatus(selectedRoom.id, status);
                            setSelectedRoom({ ...selectedRoom, status });
                          }}
                        >
                          <Text style={[
                            styles.modalStatusButtonText,
                            selectedRoom.status === status && styles.modalStatusButtonTextActive,
                          ]}>
                            {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* New Room Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={newRoomModal}
        onRequestClose={() => setNewRoomModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Room</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setNewRoomModal(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Room Number *</Text>
                <TextInput
                  style={styles.formInput}
                  value={newRoom.room_number}
                  onChangeText={(text) => setNewRoom({ ...newRoom, room_number: text })}
                  placeholder="e.g., 101, 205, A12"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Room Type *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roomTypeSelector}>
                  {['standard', 'deluxe', 'suite', 'presidential', 'family', 'executive'].map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.roomTypeOption,
                        newRoom.room_type === type && styles.roomTypeOptionActive,
                      ]}
                      onPress={() => setNewRoom({ ...newRoom, room_type: type as Room['room_type'] })}
                    >
                      <Text style={[
                        styles.roomTypeText,
                        newRoom.room_type === type && styles.roomTypeTextActive,
                      ]}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Price per Night *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={newRoom.price_per_night.toString()}
                    onChangeText={(text) => setNewRoom({ ...newRoom, price_per_night: Number(text) || 0 })}
                    placeholder="0.00"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Floor</Text>
                  <TextInput
                    style={styles.formInput}
                    value={newRoom.floor.toString()}
                    onChangeText={(text) => setNewRoom({ ...newRoom, floor: Number(text) || 1 })}
                    placeholder="1"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Max Occupancy</Text>
                  <TextInput
                    style={styles.formInput}
                    value={newRoom.max_occupancy.toString()}
                    onChangeText={(text) => setNewRoom({ ...newRoom, max_occupancy: Number(text) || 2 })}
                    placeholder="2"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Bed Size</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bedSizeSelector}>
                    {['single', 'twin', 'full', 'queen', 'king', 'california_king'].map((size) => (
                      <TouchableOpacity
                        key={size}
                        style={[
                          styles.bedSizeOption,
                          newRoom.bed_size === size && styles.bedSizeOptionActive,
                        ]}
                        onPress={() => setNewRoom({ ...newRoom, bed_size: size })}
                      >
                        <Text style={[
                          styles.bedSizeText,
                          newRoom.bed_size === size && styles.bedSizeTextActive,
                        ]}>
                          {size.replace('_', ' ').charAt(0).toUpperCase() + size.replace('_', ' ').slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Room Description</Text>
                <TextInput
                  style={[styles.formInput, styles.textArea]}
                  value={newRoom.description}
                  onChangeText={(text) => setNewRoom({ ...newRoom, description: text })}
                  placeholder="Describe the room features and ambiance..."
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Room Facilities</Text>
                <View style={styles.facilitiesGrid}>
                  {Object.entries(newRoom.facilities).map(([facility, enabled]) => (
                    <TouchableOpacity
                      key={facility}
                      style={[
                        styles.facilityOption,
                        enabled && styles.facilityOptionActive,
                      ]}
                      onPress={() => setNewRoom({
                        ...newRoom,
                        facilities: {
                          ...newRoom.facilities,
                          [facility]: !enabled,
                        }
                      })}
                    >
                      <View style={styles.facilityContent}>
                        <Text style={styles.facilityIcon}>
                          {facility === 'air_conditioner' && '❄️'}
                          {facility === 'television' && '📺'}
                          {facility === 'internet' && '📶'}
                          {facility === 'wardrobe' && '👔'}
                          {facility === 'reading_table_chair' && '🪑'}
                          {facility === 'fan' && '🌀'}
                          {facility === 'mini_bar' && '🍷'}
                          {facility === 'balcony' && '🏞️'}
                          {facility === 'kitchen' && '🍳'}
                          {facility === 'jacuzzi' && '🛁'}
                          {facility === 'safe' && '🔒'}
                          {facility === 'coffee_maker' && '☕'}
                        </Text>
                        <Text style={[
                          styles.facilityText,
                          enabled && styles.facilityTextActive,
                        ]}>
                          {facility.replace('_', ' ').charAt(0).toUpperCase() + facility.replace('_', ' ').slice(1)}
                        </Text>
                        {enabled && (
                          <View style={styles.facilityCheck}>
                            <Text style={styles.facilityCheckText}>✓</Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity style={styles.createRoomButton} onPress={createRoom}>
                <Text style={styles.createRoomButtonText}>Create Room</Text>
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
    paddingHorizontal: 24,
    paddingVertical: 24,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerLeft: {
    flex: 1,
  },
  pageTitle: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#1e293b',
  },
  pageSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    marginTop: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  filtersSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 24,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    minWidth: 300,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#1e293b',
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  filterLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#64748b',
  },
  filterScroll: {
    flex: 1,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  filterButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#64748b',
  },
  filterButtonTextActive: {
    color: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  roomsGrid: {
    padding: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  roomCard: {
    width: 280,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  roomNumberContainer: {
    flex: 1,
  },
  roomNumber: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  roomTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  roomTypeText: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  roomDetails: {
    gap: 12,
    marginBottom: 20,
  },
  roomDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roomDetailText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
  },
  roomActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#ffffff',
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
    backgroundColor: '#ffffff',
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
  amenitiesContainer: {
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
    color: '#2563eb',
  },
  statusButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modalStatusButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalStatusButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  modalStatusButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#64748b',
  },
  modalStatusButtonTextActive: {
    color: '#ffffff',
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  roomTypeSelector: {
    flexDirection: 'row',
  },
  roomTypeOption: {
    marginRight: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  roomTypeOptionActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  roomTypeText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#64748b',
  },
  roomTypeTextActive: {
    color: 'white',
  },
  bedSizeSelector: {
    flexDirection: 'row',
  },
  bedSizeOption: {
    marginRight: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  bedSizeOptionActive: {
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed',
  },
  bedSizeText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#64748b',
  },
  bedSizeTextActive: {
    color: 'white',
  },
  facilitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  facilityOption: {
    width: '48%',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  facilityOptionActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#2563eb',
  },
  facilityContent: {
    alignItems: 'center',
    position: 'relative',
  },
  facilityIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  facilityText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#64748b',
    textAlign: 'center',
  },
  facilityTextActive: {
    color: '#2563eb',
  },
  facilityCheck: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    backgroundColor: '#10b981',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  facilityCheckText: {
    color: 'white',
    fontSize: 12,
    fontFamily: 'Inter-Bold',
  },
  createRoomButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  createRoomButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
});