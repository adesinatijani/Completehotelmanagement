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
import { Wrench, Plus, Search, TriangleAlert as AlertTriangle, Clock, DollarSign, User, MapPin } from 'lucide-react-native';

type MaintenanceRequest = Database['public']['Tables']['maintenance_requests']['Row'];
type Room = Database['public']['Tables']['rooms']['Row'];
type Hall = Database['public']['Tables']['halls']['Row'];

export default function Maintenance() {
  const { user } = useAuthContext();
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [halls, setHalls] = useState<Hall[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<MaintenanceRequest['status'] | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<MaintenanceRequest['priority'] | 'all'>('all');
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [newRequestModal, setNewRequestModal] = useState(false);

  const [newRequest, setNewRequest] = useState({
    title: '',
    description: '',
    category: 'electrical' as MaintenanceRequest['category'],
    priority: 'medium' as MaintenanceRequest['priority'],
    location: '',
    room_id: '',
    hall_id: '',
    estimated_cost: 0,
    parts_needed: [] as Array<{ item: string; quantity: number; cost: number }>,
    work_notes: '',
  });

  const [newPart, setNewPart] = useState({
    item: '',
    quantity: 0,
    cost: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [requestsData, roomsData, hallsData] = await Promise.all([
        db.select<MaintenanceRequest>('maintenance_requests'),
        db.select<Room>('rooms'),
        db.select<Hall>('halls')
      ]);
      setRequests(requestsData);
      setRooms(roomsData);
      setHalls(hallsData);
    } catch (error) {
      console.error('Error loading maintenance data:', error);
      Alert.alert('Error', 'Failed to load maintenance data');
    } finally {
      setLoading(false);
    }
  };

  const createMaintenanceRequest = async () => {
    if (!newRequest.title || !newRequest.description || !newRequest.location) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const requestNumber = `MR-${new Date().getFullYear()}-${String(requests.length + 1).padStart(3, '0')}`;
      
      const [newRequest] = await db.insert<MaintenanceRequest>('maintenance_requests', {
        ...newRequest,
        request_number: requestNumber,
        status: 'pending',
        reported_by: user?.id || '1',
      });

      if (newRequest) {
        Alert.alert('Success', 'Maintenance request created successfully');
      }
      setNewRequestModal(false);
      setNewRequest({
        title: '',
        description: '',
        category: 'electrical',
        priority: 'medium',
        location: '',
        room_id: '',
        hall_id: '',
        estimated_cost: 0,
        parts_needed: [],
        work_notes: '',
      });
      loadData();
    } catch (error) {
      console.error('Error creating maintenance request:', error);
      Alert.alert('Error', 'Failed to create maintenance request');
    }
  };

  const updateRequestStatus = async (requestId: string, status: MaintenanceRequest['status']) => {
    try {
      const updates: any = { status };
      
      if (status === 'completed') {
        updates.completed_at = new Date().toISOString();
      }

      const [updatedRequest] = await db.update<MaintenanceRequest>('maintenance_requests', requestId, updates);
      
      if (updatedRequest) {
        setRequests(requests.map(request => 
          request.id === requestId ? { ...request, ...updates } : request
        ));
      }

      Alert.alert('Success', 'Request status updated');
    } catch (error) {
      console.error('Error updating request status:', error);
      Alert.alert('Error', 'Failed to update request status');
    }
  };

  const addPart = () => {
    if (!newPart.item || newPart.quantity <= 0 || newPart.cost <= 0) {
      Alert.alert('Error', 'Please fill in part details');
      return;
    }

    setNewRequest({
      ...newRequest,
      parts_needed: [...newRequest.parts_needed, { ...newPart }]
    });

    setNewPart({
      item: '',
      quantity: 0,
      cost: 0,
    });
  };

  const removePart = (index: number) => {
    setNewRequest({
      ...newRequest,
      parts_needed: newRequest.parts_needed.filter((_, i) => i !== index)
    });
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const filteredRequests = requests.filter(request => {
    const matchesSearch = request.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         request.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         request.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || request.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || request.priority === filterPriority;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getStatusColor = (status: MaintenanceRequest['status']) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'assigned': return '#3b82f6';
      case 'in_progress': return '#8b5cf6';
      case 'completed': return '#10b981';
      case 'cancelled': return '#ef4444';
      default: return '#64748b';
    }
  };

  const getPriorityColor = (priority: MaintenanceRequest['priority']) => {
    switch (priority) {
      case 'low': return '#10b981';
      case 'medium': return '#f59e0b';
      case 'high': return '#ef4444';
      case 'urgent': return '#dc2626';
      default: return '#64748b';
    }
  };

  const getCategoryIcon = (category: MaintenanceRequest['category']) => {
    switch (category) {
      case 'electrical': return '⚡';
      case 'plumbing': return '🔧';
      case 'hvac': return '❄️';
      case 'furniture': return '🪑';
      case 'appliance': return '📱';
      case 'structural': return '🏗️';
      case 'safety': return '🛡️';
      default: return '🔧';
    }
  };

  const getRoomInfo = (roomId?: string) => {
    if (!roomId) return null;
    const room = rooms.find(r => r.id === roomId);
    return room ? `Room ${room.room_number}` : 'Unknown Room';
  };

  const getHallInfo = (hallId?: string) => {
    if (!hallId) return null;
    const hall = halls.find(h => h.id === hallId);
    return hall ? hall.hall_name : 'Unknown Hall';
  };

  const statusOptions: MaintenanceRequest['status'][] = ['pending', 'assigned', 'in_progress', 'completed', 'cancelled'];
  const priorityOptions: MaintenanceRequest['priority'][] = ['low', 'medium', 'high', 'urgent'];
  const categoryOptions: MaintenanceRequest['category'][] = ['electrical', 'plumbing', 'hvac', 'furniture', 'appliance', 'structural', 'safety', 'other'];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Maintenance</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setNewRequestModal(true)}
        >
          <Plus size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* Stats Overview */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{requests.filter(r => r.status === 'pending').length}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{requests.filter(r => r.status === 'in_progress').length}</Text>
          <Text style={styles.statLabel}>In Progress</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{requests.filter(r => r.priority === 'urgent').length}</Text>
          <Text style={styles.statLabel}>Urgent</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{requests.filter(r => r.status === 'completed').length}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
      </View>

      {/* Template Download Section */}
      <View style={styles.templateSection}>
        <Text style={styles.templateSectionTitle}>📊 Maintenance Templates</Text>
        <ExcelTemplateDownloader
          templateType="all"
          onDownloadComplete={() => {
            Alert.alert('Success', 'Maintenance management template downloaded! This includes templates for maintenance requests and tracking.');
          }}
        />
      </View>

      {/* Search and Filters */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Search size={20} color="#64748b" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search maintenance requests..."
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
          style={[styles.filterButton, filterStatus === 'all' && styles.activeFilter]}
          onPress={() => setFilterStatus('all')}
        >
          <Text style={[styles.filterText, filterStatus === 'all' && styles.activeFilterText]}>
            All Status
          </Text>
        </TouchableOpacity>
        {statusOptions.map((status) => (
          <TouchableOpacity
            key={status}
            style={[styles.filterButton, filterStatus === status && styles.activeFilter]}
            onPress={() => setFilterStatus(status)}
          >
            <Text style={[styles.filterText, filterStatus === status && styles.activeFilterText]}>
              {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.requestsContainer}>
          {filteredRequests.map((request) => (
            <TouchableOpacity
              key={request.id}
              style={styles.requestCard}
              onPress={() => {
                setSelectedRequest(request);
                setModalVisible(true);
              }}
            >
              <View style={styles.requestHeader}>
                <View style={styles.requestInfo}>
                  <View style={styles.requestTitleRow}>
                    <Text style={styles.categoryIcon}>{getCategoryIcon(request.category)}</Text>
                    <Text style={styles.requestTitle}>{request.title}</Text>
                  </View>
                  <Text style={styles.requestNumber}>{request.request_number}</Text>
                </View>
                <View style={styles.badgesContainer}>
                  <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(request.priority) }]}>
                    <AlertTriangle size={10} color="white" />
                    <Text style={styles.badgeText}>{request.priority.toUpperCase()}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) }]}>
                    <Text style={styles.badgeText}>
                      {request.status.replace('_', ' ').toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>

              <Text style={styles.requestDescription}>{request.description}</Text>

              <View style={styles.requestDetails}>
                <View style={styles.detailRow}>
                  <MapPin size={16} color="#64748b" />
                  <Text style={styles.detailText}>{request.location}</Text>
                  {getRoomInfo(request.room_id) && (
                    <Text style={styles.detailText}> • {getRoomInfo(request.room_id)}</Text>
                  )}
                  {getHallInfo(request.hall_id) && (
                    <Text style={styles.detailText}> • {getHallInfo(request.hall_id)}</Text>
                  )}
                </View>
                
                {request.estimated_cost && request.estimated_cost > 0 && (
                  <View style={styles.detailRow}>
                    <DollarSign size={16} color="#64748b" />
                    <Text style={styles.detailText}>Estimated: ${request.estimated_cost}</Text>
                  </View>
                )}

                <View style={styles.detailRow}>
                  <Clock size={16} color="#64748b" />
                  <Text style={styles.detailText}>
                    Created: {new Date(request.created_at).toLocaleDateString()}
                  </Text>
                </View>
              </View>

              <View style={styles.requestActions}>
                {request.status === 'pending' && (
                  <TouchableOpacity
                    style={styles.assignButton}
                    onPress={() => updateRequestStatus(request.id, 'assigned')}
                  >
                    <Text style={styles.actionButtonText}>Assign</Text>
                  </TouchableOpacity>
                )}

                {request.status === 'assigned' && (
                  <TouchableOpacity
                    style={styles.startButton}
                    onPress={() => updateRequestStatus(request.id, 'in_progress')}
                  >
                    <Text style={styles.actionButtonText}>Start Work</Text>
                  </TouchableOpacity>
                )}

                {request.status === 'in_progress' && (
                  <TouchableOpacity
                    style={styles.completeButton}
                    onPress={() => updateRequestStatus(request.id, 'completed')}
                  >
                    <Text style={styles.actionButtonText}>Complete</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Request Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedRequest && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{selectedRequest.title}</Text>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.closeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody}>
                  <View style={styles.modalSection}>
                    <Text style={styles.sectionTitle}>Request Information</Text>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Request Number:</Text>
                      <Text style={styles.infoValue}>{selectedRequest.request_number}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Category:</Text>
                      <Text style={styles.infoValue}>
                        {getCategoryIcon(selectedRequest.category)} {selectedRequest.category.charAt(0).toUpperCase() + selectedRequest.category.slice(1)}
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Priority:</Text>
                      <Text style={[styles.infoValue, { color: getPriorityColor(selectedRequest.priority) }]}>
                        {selectedRequest.priority.toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Location:</Text>
                      <Text style={styles.infoValue}>{selectedRequest.location}</Text>
                    </View>
                    {selectedRequest.estimated_cost && selectedRequest.estimated_cost > 0 && (
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Estimated Cost:</Text>
                        <Text style={styles.infoValue}>${selectedRequest.estimated_cost}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.sectionTitle}>Description</Text>
                    <Text style={styles.descriptionText}>{selectedRequest.description}</Text>
                  </View>

                  {selectedRequest.parts_needed && selectedRequest.parts_needed.length > 0 && (
                    <View style={styles.modalSection}>
                      <Text style={styles.sectionTitle}>Parts Needed</Text>
                      {selectedRequest.parts_needed.map((part, index) => (
                        <View key={index} style={styles.partItem}>
                          <Text style={styles.partText}>
                            {part.quantity}x {part.item} - ${part.cost}
                          </Text>
                        </View>
                      ))}
                      <Text style={styles.totalPartsText}>
                        Total Parts Cost: ${selectedRequest.parts_needed.reduce((sum, part) => sum + (part.quantity * part.cost), 0)}
                      </Text>
                    </View>
                  )}

                  {selectedRequest.work_notes && (
                    <View style={styles.modalSection}>
                      <Text style={styles.sectionTitle}>Work Notes</Text>
                      <Text style={styles.workNotesText}>{selectedRequest.work_notes}</Text>
                    </View>
                  )}

                  <View style={styles.modalSection}>
                    <Text style={styles.sectionTitle}>Status Management</Text>
                    <View style={styles.statusButtonsContainer}>
                      {statusOptions.map((status) => (
                        <TouchableOpacity
                          key={status}
                          style={[
                            styles.modalStatusButton,
                            selectedRequest.status === status && styles.modalStatusButtonActive,
                          ]}
                          onPress={() => {
                            updateRequestStatus(selectedRequest.id, status);
                            setSelectedRequest({ ...selectedRequest, status });
                          }}
                        >
                          <Text style={[
                            styles.modalStatusButtonText,
                            selectedRequest.status === status && styles.modalStatusButtonTextActive,
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

      {/* New Request Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={newRequestModal}
        onRequestClose={() => setNewRequestModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Maintenance Request</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setNewRequestModal(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Title *</Text>
                <TextInput
                  style={styles.formInput}
                  value={newRequest.title}
                  onChangeText={(text) => setNewRequest({ ...newRequest, title: text })}
                  placeholder="Brief description of the issue"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Description *</Text>
                <TextInput
                  style={[styles.formInput, styles.textArea]}
                  value={newRequest.description}
                  onChangeText={(text) => setNewRequest({ ...newRequest, description: text })}
                  placeholder="Detailed description of the maintenance issue"
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.formRow}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Category *</Text>
                  <ScrollView horizontal style={styles.categorySelector}>
                    {categoryOptions.map((category) => (
                      <TouchableOpacity
                        key={category}
                        style={[
                          styles.categoryOption,
                          newRequest.category === category && styles.categoryOptionActive,
                        ]}
                        onPress={() => setNewRequest({ ...newRequest, category })}
                      >
                        <Text style={styles.categoryIcon}>{getCategoryIcon(category)}</Text>
                        <Text style={[
                          styles.categoryOptionText,
                          newRequest.category === category && styles.categoryOptionTextActive,
                        ]}>
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Priority *</Text>
                  <View style={styles.prioritySelector}>
                    {priorityOptions.map((priority) => (
                      <TouchableOpacity
                        key={priority}
                        style={[
                          styles.priorityOption,
                          newRequest.priority === priority && styles.priorityOptionActive,
                          { borderColor: getPriorityColor(priority) }
                        ]}
                        onPress={() => setNewRequest({ ...newRequest, priority })}
                      >
                        <Text style={[
                          styles.priorityOptionText,
                          newRequest.priority === priority && { color: 'white' },
                          { color: getPriorityColor(priority) }
                        ]}>
                          {priority.charAt(0).toUpperCase() + priority.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Location *</Text>
                <TextInput
                  style={styles.formInput}
                  value={newRequest.location}
                  onChangeText={(text) => setNewRequest({ ...newRequest, location: text })}
                  placeholder="Specific location of the issue"
                />
              </View>

              <View style={styles.formRow}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Room (if applicable)</Text>
                  <ScrollView horizontal style={styles.roomSelector}>
                    <TouchableOpacity
                      style={[
                        styles.roomOption,
                        !newRequest.room_id && styles.roomOptionActive,
                      ]}
                      onPress={() => setNewRequest({ ...newRequest, room_id: '' })}
                    >
                      <Text style={styles.roomOptionText}>None</Text>
                    </TouchableOpacity>
                    {rooms.map((room) => (
                      <TouchableOpacity
                        key={room.id}
                        style={[
                          styles.roomOption,
                          newRequest.room_id === room.id && styles.roomOptionActive,
                        ]}
                        onPress={() => setNewRequest({ ...newRequest, room_id: room.id })}
                      >
                        <Text style={[
                          styles.roomOptionText,
                          newRequest.room_id === room.id && styles.roomOptionTextActive,
                        ]}>
                          Room {room.room_number}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              <View style={styles.formGroup}>
                <DatePicker
                  label="Estimated Completion Date"
                  value={newRequest.estimated_completion?.split('T')[0] || ''}
                  onDateChange={(date) => setNewRequest({ 
                    ...newRequest, 
                    estimated_completion: date ? new Date(date).toISOString() : undefined 
                  })}
                  placeholder="Select target completion date"
                  minimumDate={new Date().toISOString().split('T')[0]}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Estimated Cost</Text>
                <TextInput
                  style={styles.formInput}
                  value={newRequest.estimated_cost.toString()}
                  onChangeText={(text) => setNewRequest({ ...newRequest, estimated_cost: Number(text) || 0 })}
                  placeholder="Estimated repair cost"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Parts Needed</Text>
                <View style={styles.partForm}>
                  <View style={styles.partInputRow}>
                    <TextInput
                      style={[styles.formInput, { flex: 2 }]}
                      value={newPart.item}
                      onChangeText={(text) => setNewPart({ ...newPart, item: text })}
                      placeholder="Part name"
                    />
                    <TextInput
                      style={[styles.formInput, { flex: 1 }]}
                      value={newPart.quantity.toString()}
                      onChangeText={(text) => setNewPart({ ...newPart, quantity: Number(text) || 0 })}
                      placeholder="Qty"
                      keyboardType="numeric"
                    />
                    <TextInput
                      style={[styles.formInput, { flex: 1 }]}
                      value={newPart.cost.toString()}
                      onChangeText={(text) => setNewPart({ ...newPart, cost: Number(text) || 0 })}
                      placeholder="Cost"
                      keyboardType="numeric"
                    />
                  </View>
                  <TouchableOpacity style={styles.addPartButton} onPress={addPart}>
                    <Text style={styles.addPartText}>Add Part</Text>
                  </TouchableOpacity>
                </View>

                {newRequest.parts_needed.length > 0 && (
                  <View style={styles.partsList}>
                    {newRequest.parts_needed.map((part, index) => (
                      <View key={index} style={styles.partListItem}>
                        <Text style={styles.partListText}>
                          {part.quantity}x {part.item} - ${part.cost}
                        </Text>
                        <TouchableOpacity onPress={() => removePart(index)}>
                          <Text style={styles.removePartText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Work Notes</Text>
                <TextInput
                  style={[styles.formInput, styles.textArea]}
                  value={newRequest.work_notes}
                  onChangeText={(text) => setNewRequest({ ...newRequest, work_notes: text })}
                  placeholder="Additional notes or instructions..."
                  multiline
                  numberOfLines={3}
                />
              </View>

              <TouchableOpacity style={styles.createButton} onPress={createMaintenanceRequest}>
                <Text style={styles.createButtonText}>Create Request</Text>
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
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statNumber: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1e293b',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    marginTop: 4,
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
  requestsContainer: {
    padding: 20,
    gap: 16,
  },
  requestCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  requestInfo: {
    flex: 1,
  },
  requestTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryIcon: {
    fontSize: 16,
  },
  requestTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#1e293b',
    flex: 1,
  },
  requestNumber: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    marginTop: 2,
  },
  badgesContainer: {
    alignItems: 'flex-end',
    gap: 4,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 9,
    fontFamily: 'Inter-SemiBold',
  },
  requestDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    marginBottom: 12,
  },
  requestDetails: {
    gap: 6,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  assignButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  startButton: {
    flex: 1,
    backgroundColor: '#8b5cf6',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  completeButton: {
    flex: 1,
    backgroundColor: '#10b981',
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
  },
  infoValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1e293b',
  },
  descriptionText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    lineHeight: 20,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
  },
  partItem: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  partText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#1e293b',
  },
  totalPartsText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1e3a8a',
    marginTop: 8,
    textAlign: 'right',
  },
  workNotesText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    fontStyle: 'italic',
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
    backgroundColor: '#1e3a8a',
    borderColor: '#1e3a8a',
  },
  modalStatusButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#64748b',
  },
  modalStatusButtonTextActive: {
    color: 'white',
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
    height: 100,
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
  categoryOptionText: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    color: '#64748b',
    marginTop: 2,
  },
  categoryOptionTextActive: {
    color: 'white',
  },
  prioritySelector: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
  },
  priorityOptionActive: {
    backgroundColor: '#1e3a8a',
  },
  priorityOptionText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  roomSelector: {
    flexDirection: 'row',
  },
  roomOption: {
    marginRight: 8,
    padding: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minWidth: 60,
    alignItems: 'center',
  },
  roomOptionActive: {
    backgroundColor: '#1e3a8a',
    borderColor: '#1e3a8a',
  },
  roomOptionText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#64748b',
  },
  roomOptionTextActive: {
    color: 'white',
  },
  partForm: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  partInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  addPartButton: {
    backgroundColor: '#1e3a8a',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  addPartText: {
    color: 'white',
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  partsList: {
    marginTop: 12,
  },
  partListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#e0f2fe',
    padding: 8,
    borderRadius: 6,
    marginBottom: 4,
  },
  partListText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#0369a1',
    flex: 1,
  },
  removePartText: {
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