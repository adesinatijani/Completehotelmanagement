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
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { db } from '@/lib/database';
import { ExcelTemplateDownloader } from '@/components/ExcelTemplateDownloader';
import { Database } from '@/types/database';
import { Users, Plus, Search, Mail, Shield, CreditCard as Edit, Star, Sparkles, UserCheck } from 'lucide-react-native';

type Profile = Database['public']['Tables']['profiles']['Row'];

const { width } = Dimensions.get('window');

export default function Staff() {
  const [staff, setStaff] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<Profile['role'] | 'all'>('all');
  const [newStaffModal, setNewStaffModal] = useState(false);
  const [editStaffModal, setEditStaffModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Profile | null>(null);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(30));

  const [newStaffMember, setNewStaffMember] = useState({
    email: '',
    full_name: '',
    role: 'receptionist' as Profile['role'],
    password: '',
  });

  useEffect(() => {
    loadStaff();
    
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const loadStaff = async () => {
    try {
      const staffData = await db.select<Profile>('profiles');
      setStaff(staffData);
    } catch (error) {
      console.error('Error loading staff:', error);
      Alert.alert('Error', 'Failed to load staff members');
    } finally {
      setLoading(false);
    }
  };

  const createStaffMember = async () => {
    if (!newStaffMember.email || !newStaffMember.full_name || !newStaffMember.password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      // Create profile in local database
      const [newProfile] = await db.insert('profiles', {
        email: newStaffMember.email,
        full_name: newStaffMember.full_name,
        role: newStaffMember.role,
        is_active: true,
      });

      if (newProfile) {
        Alert.alert('Success', 'Staff member created successfully');
      }
      setNewStaffModal(false);
      setNewStaffMember({
        email: '',
        full_name: '',
        role: 'receptionist',
        password: '',
      });
      loadStaff();
    } catch (error) {
      console.error('Error creating staff member:', error);
      Alert.alert('Error', 'Failed to create staff member');
    }
  };

  const updateStaffRole = async (staffId: string, newRole: Profile['role']) => {
    try {
      const [updatedProfile] = await db.update('profiles', staffId, { role: newRole });

      if (updatedProfile) {
        setStaff(staff.map(member => 
          member.id === staffId ? { ...member, role: newRole } : member
        ));
      }

      Alert.alert('Success', 'Staff role updated successfully');
    } catch (error) {
      console.error('Error updating staff role:', error);
      Alert.alert('Error', 'Failed to update staff role');
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadStaff();
    setRefreshing(false);
  }, []);

  const filteredStaff = staff.filter(member => {
    const matchesSearch = member.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         member.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRole === 'all' || member.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  const getRoleColor = (role: Profile['role']) => {
    switch (role) {
      case 'manager': return '#7c3aed';
      case 'admin': return '#ef4444';
      case 'receptionist': return '#1e3a8a';
      case 'kitchen_staff': return '#16a34a';
      case 'bar_staff': return '#f59e0b';
      case 'housekeeping': return '#06b6d4';
      default: return '#64748b';
    }
  };

  const getRoleIcon = (role: Profile['role']) => {
    switch (role) {
      case 'manager':
      case 'admin':
        return Shield;
      default:
        return Users;
    }
  };

  const getStaffStats = () => {
    const stats = staff.reduce((acc, member) => {
      acc[member.role] = (acc[member.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return stats;
  };

  const staffStats = getStaffStats();
  const roleOptions: Profile['role'][] = ['manager', 'receptionist', 'kitchen_staff', 'bar_staff', 'housekeeping'];

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#4338ca', '#6366f1', '#8b5cf6']}
        style={styles.headerGradient}
      >
        <Animated.View 
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          <View style={styles.headerLeft}>
            <View style={styles.titleContainer}>
              <Users size={28} color="white" />
              <View>
                <Text style={styles.title}>Staff Management</Text>
                <Text style={styles.subtitle}>Team & Roles</Text>
              </View>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setNewStaffModal(true)}
            >
              <LinearGradient
                colors={['#10b981', '#059669']}
                style={styles.addButtonGradient}
              >
                <Plus size={20} color="white" />
                <Sparkles size={12} color="white" style={styles.sparkle} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </LinearGradient>

      {/* Staff Statistics */}
      <Animated.View 
        style={[
          styles.statsSection,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }
        ]}
      >
        <LinearGradient
          colors={['#ffffff', '#f8fafc']}
          style={styles.statsGradient}
        >
          <View style={styles.statsHeader}>
            <UserCheck size={20} color="#4338ca" />
            <Text style={styles.statsTitle}>Staff Overview</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsContainer}>
            <LinearGradient
              colors={['#dbeafe', '#bfdbfe']}
              style={styles.statCard}
            >
              <Text style={styles.statNumber}>{staff.length}</Text>
              <Text style={styles.statLabel}>Total Staff</Text>
            </LinearGradient>
            
            {Object.entries(staffStats).map(([role, count]) => (
              <LinearGradient
                key={role}
                colors={[`${getRoleColor(role as Profile['role'])}20`, `${getRoleColor(role as Profile['role'])}10`]}
                style={styles.statCard}
              >
                <Text style={[styles.statNumber, { color: getRoleColor(role as Profile['role']) }]}>
                  {count}
                </Text>
                <Text style={styles.statLabel}>
                  {role.replace('_', ' ').charAt(0).toUpperCase() + role.replace('_', ' ').slice(1)}
                </Text>
              </LinearGradient>
            ))}
          </ScrollView>
        </LinearGradient>
      </Animated.View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Search size={20} color="#64748b" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search staff members..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Template Download Section */}
      <View style={styles.templateSection}>
        <Text style={styles.templateSectionTitle}>📊 Staff Templates</Text>
        <ExcelTemplateDownloader
          templateType="all"
          onDownloadComplete={() => {
            Alert.alert('Success', 'Staff management template downloaded! This includes templates for bulk staff import and management.');
          }}
        />
      </View>

      {/* Role Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
      >
        <TouchableOpacity
          style={[styles.filterButton, selectedRole === 'all' && styles.activeFilter]}
          onPress={() => setSelectedRole('all')}
        >
          <Text style={[styles.filterText, selectedRole === 'all' && styles.activeFilterText]}>
            All
          </Text>
        </TouchableOpacity>
        {roleOptions.map((role) => (
          <TouchableOpacity
            key={role}
            style={[styles.filterButton, selectedRole === role && styles.activeFilter]}
            onPress={() => setSelectedRole(role)}
          >
            <Text style={[styles.filterText, selectedRole === role && styles.activeFilterText]}>
              {role.replace('_', ' ').charAt(0).toUpperCase() + role.replace('_', ' ').slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.staffContainer}>
          {filteredStaff.map((member) => {
            const RoleIcon = getRoleIcon(member.role);
            return (
              <View key={member.id} style={styles.staffCard}>
                <View style={styles.staffHeader}>
                  <View style={styles.staffInfo}>
                    <Text style={styles.staffName}>{member.full_name}</Text>
                    <View style={styles.staffMeta}>
                      <Mail size={14} color="#64748b" />
                      <Text style={styles.staffEmail}>{member.email}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.staffActions}>
                    <View style={[styles.roleBadge, { backgroundColor: getRoleColor(member.role) }]}>
                      <RoleIcon size={12} color="white" />
                      <Text style={styles.roleText}>
                        {member.role.replace('_', ' ').charAt(0).toUpperCase() + member.role.replace('_', ' ').slice(1)}
                      </Text>
                    </View>
                    
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => {
                        setSelectedStaff(member);
                        setEditStaffModal(true);
                      }}
                    >
                      <Edit size={16} color="#64748b" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.staffDetails}>
                  <Text style={styles.staffDetailText}>
                    Member since: {new Date(member.created_at).toLocaleDateString()}
                  </Text>
                  <Text style={styles.staffDetailText}>
                    Last updated: {new Date(member.updated_at).toLocaleDateString()}
                  </Text>
                </View>

                <View style={styles.quickActions}>
                  <TouchableOpacity
                    style={styles.quickActionButton}
                    onPress={() => {
                      Alert.alert(
                        'Send Message',
                        'Messaging functionality would be implemented here',
                        [{ text: 'OK' }]
                      );
                    }}
                  >
                    <Mail size={14} color="#1e3a8a" />
                    <Text style={styles.quickActionText}>Message</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.quickActionButton}
                    onPress={() => {
                      Alert.alert(
                        'View Schedule',
                        'Schedule management functionality would be implemented here',
                        [{ text: 'OK' }]
                      );
                    }}
                  >
                    <Users size={14} color="#16a34a" />
                    <Text style={styles.quickActionText}>Schedule</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* New Staff Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={newStaffModal}
        onRequestClose={() => setNewStaffModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Staff Member</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setNewStaffModal(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Full Name *</Text>
                <TextInput
                  style={styles.formInput}
                  value={newStaffMember.full_name}
                  onChangeText={(text) => setNewStaffMember({ ...newStaffMember, full_name: text })}
                  placeholder="Enter full name"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Email *</Text>
                <TextInput
                  style={styles.formInput}
                  value={newStaffMember.email}
                  onChangeText={(text) => setNewStaffMember({ ...newStaffMember, email: text })}
                  placeholder="Enter email address"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Password *</Text>
                <TextInput
                  style={styles.formInput}
                  value={newStaffMember.password}
                  onChangeText={(text) => setNewStaffMember({ ...newStaffMember, password: text })}
                  placeholder="Enter password"
                  secureTextEntry
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Role *</Text>
                <View style={styles.roleSelector}>
                  {roleOptions.map((role) => (
                    <TouchableOpacity
                      key={role}
                      style={[
                        styles.roleOption,
                        newStaffMember.role === role && styles.roleOptionActive,
                      ]}
                      onPress={() => setNewStaffMember({ ...newStaffMember, role })}
                    >
                      <Text style={[
                        styles.roleOptionText,
                        newStaffMember.role === role && styles.roleOptionTextActive,
                      ]}>
                        {role.replace('_', ' ').charAt(0).toUpperCase() + role.replace('_', ' ').slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity style={styles.createButton} onPress={createStaffMember}>
                <Text style={styles.createButtonText}>Add Staff Member</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Staff Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editStaffModal}
        onRequestClose={() => setEditStaffModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedStaff && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Edit Staff Member</Text>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setEditStaffModal(false)}
                  >
                    <Text style={styles.closeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.modalBody}>
                  <Text style={styles.editStaffName}>{selectedStaff.full_name}</Text>
                  <Text style={styles.editStaffEmail}>{selectedStaff.email}</Text>

                  <View style={styles.roleUpdateSection}>
                    <Text style={styles.formLabel}>Update Role</Text>
                    <View style={styles.roleSelector}>
                      {roleOptions.map((role) => (
                        <TouchableOpacity
                          key={role}
                          style={[
                            styles.roleOption,
                            selectedStaff.role === role && styles.roleOptionActive,
                          ]}
                          onPress={() => {
                            updateStaffRole(selectedStaff.id, role);
                            setSelectedStaff({ ...selectedStaff, role });
                          }}
                        >
                          <Text style={[
                            styles.roleOptionText,
                            selectedStaff.role === role && styles.roleOptionTextActive,
                          ]}>
                            {role.replace('_', ' ').charAt(0).toUpperCase() + role.replace('_', ' ').slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.staffActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => {
                        Alert.alert(
                          'Reset Password',
                          'Password reset functionality would be implemented here',
                          [{ text: 'OK' }]
                        );
                      }}
                    >
                      <Text style={styles.actionButtonText}>Reset Password</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionButton, styles.dangerButton]}
                      onPress={() => {
                        Alert.alert(
                          'Deactivate Staff Member',
                          'Are you sure you want to deactivate this staff member?',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Deactivate', style: 'destructive' }
                          ]
                        );
                      }}
                    >
                      <Text style={[styles.actionButtonText, styles.dangerButtonText]}>Deactivate</Text>
                    </TouchableOpacity>
                  </View>
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
    position: 'relative',
  },
  sparkle: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  statsSection: {
    margin: 20,
    marginTop: -20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  statsGradient: {
    borderRadius: 20,
    padding: 20,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    justifyContent: 'center',
  },
  statsTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#4338ca',
  },
  statsContainer: {
    flexDirection: 'row',
  },
  statCard: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginRight: 20,
    minWidth: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#1e293b',
  },
  statLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
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
  staffContainer: {
    padding: 20,
    gap: 16,
  },
  staffCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  staffHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  staffMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  staffEmail: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
  },
  staffActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  roleText: {
    color: 'white',
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
  },
  editButton: {
    padding: 4,
  },
  staffDetails: {
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
  },
  staffDetailText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    marginBottom: 2,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    gap: 4,
  },
  quickActionText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#1e3a8a',
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
  roleSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  roleOptionActive: {
    backgroundColor: '#1e3a8a',
    borderColor: '#1e3a8a',
  },
  roleOptionText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#64748b',
  },
  roleOptionTextActive: {
    color: 'white',
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
  editStaffName: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  editStaffEmail: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    marginBottom: 20,
  },
  roleUpdateSection: {
    marginBottom: 24,
  },
  actionButton: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  actionButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1e3a8a',
  },
  dangerButton: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  dangerButtonText: {
    color: '#ef4444',
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