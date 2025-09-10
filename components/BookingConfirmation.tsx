import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CircleCheck as CheckCircle, Calendar, User, MapPin, DollarSign, Mail, Phone } from 'lucide-react-native';
import { Database } from '@/types/database';
import { receiptPrinter } from '@/lib/printer';
import { currencyManager } from '@/lib/currency';
import { loadHotelSettings } from '@/lib/storage';

type Booking = Database['public']['Tables']['bookings']['Row'];
type Room = Database['public']['Tables']['rooms']['Row'];

interface BookingConfirmationProps {
  visible: boolean;
  booking: Booking | null;
  room: Room | null;
  onClose: () => void;
  onPrint?: () => void;
  onEmail?: () => void;
}

export function BookingConfirmation({ 
  visible, 
  booking, 
  room, 
  onClose, 
  onPrint, 
  onEmail 
}: BookingConfirmationProps) {
  const [hotelSettings, setHotelSettings] = React.useState<any>(null);

  React.useEffect(() => {
    if (visible) {
      loadSettings();
    }
  }, [visible]);

  const loadSettings = async () => {
    try {
      const settings = await loadHotelSettings();
      setHotelSettings(settings);
      if (settings?.currency) {
        currencyManager.setCurrency(settings.currency);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  if (!booking || !room) return null;

  const calculateNights = (checkIn: string, checkOut: string) => {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const nights = calculateNights(booking.check_in, booking.check_out);
  
  const formatCurrency = (amount: number) => {
    return currencyManager.formatAmount(amount, hotelSettings?.currency);
  };

  const handlePrint = async () => {
    try {
      if (!hotelSettings) {
        Alert.alert('Error', 'Hotel settings not loaded. Please try again.');
        return;
      }
      
      await receiptPrinter.printBookingConfirmation({
        booking,
        room,
        hotelSettings,
        currency: hotelSettings.currency || 'USD',
      });
      
      Alert.alert('Success', 'Booking confirmation printed successfully!');
    } catch (error) {
      console.error('Print error:', error);
      Alert.alert('Error', 'Failed to print booking confirmation');
    }
  };

  const handleEmail = () => {
    Alert.alert(
      'Email Confirmation',
      `Email confirmation would be sent to:\n${booking.guest_email}\n\nThis feature would integrate with your email service provider.`,
      [{ text: 'OK' }]
    );
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <LinearGradient
            colors={['#10b981', '#059669']}
            style={styles.header}
          >
            <View style={styles.headerContent}>
              <CheckCircle size={32} color="white" />
              <Text style={styles.headerTitle}>Booking Confirmed!</Text>
              <Text style={styles.headerSubtitle}>Reservation successfully created</Text>
            </View>
          </LinearGradient>

          <View style={styles.confirmationBody}>
            <View style={styles.bookingDetails}>
              <Text style={styles.sectionTitle}>Booking Details</Text>
              
              <View style={styles.detailRow}>
                <User size={20} color="#1e3a8a" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Guest Name</Text>
                  <Text style={styles.detailValue}>{booking.guest_name}</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <Mail size={20} color="#1e3a8a" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Email</Text>
                  <Text style={styles.detailValue}>{booking.guest_email}</Text>
                </View>
              </View>

              {booking.guest_phone && (
                <View style={styles.detailRow}>
                  <Phone size={20} color="#1e3a8a" />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Phone</Text>
                    <Text style={styles.detailValue}>{booking.guest_phone}</Text>
                  </View>
                </View>
              )}

              <View style={styles.detailRow}>
                <MapPin size={20} color="#1e3a8a" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Room</Text>
                  <Text style={styles.detailValue}>
                    Room {room.room_number} ({room.room_type.charAt(0).toUpperCase() + room.room_type.slice(1)})
                  </Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <Calendar size={20} color="#1e3a8a" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Stay Duration</Text>
                  <Text style={styles.detailValue}>
                    {new Date(booking.check_in).toLocaleDateString()} - {new Date(booking.check_out).toLocaleDateString()}
                  </Text>
                  <Text style={styles.detailSubtext}>
                    {nights} night{nights !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <DollarSign size={20} color="#1e3a8a" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Total Amount</Text>
                  <Text style={styles.detailValue}>{formatCurrency(booking.total_amount)}</Text>
                  {booking.deposit_amount > 0 && (
                    <Text style={styles.detailSubtext}>
                      Deposit: {formatCurrency(booking.deposit_amount)}
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.detailRow}>
                <User size={20} color="#1e3a8a" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Guests</Text>
                  <Text style={styles.detailValue}>
                    {booking.adults} adult{booking.adults !== 1 ? 's' : ''}
                    {booking.children > 0 && `, ${booking.children} child${booking.children !== 1 ? 'ren' : ''}`}
                  </Text>
                </View>
              </View>

              {booking.special_requests && (
                <View style={styles.specialRequests}>
                  <Text style={styles.specialRequestsTitle}>Special Requests</Text>
                  <Text style={styles.specialRequestsText}>{booking.special_requests}</Text>
                </View>
              )}
            </View>

            <View style={styles.importantInfo}>
              <Text style={styles.importantTitle}>Important Information</Text>
              <Text style={styles.importantText}>• Check-in time: 3:00 PM</Text>
              <Text style={styles.importantText}>• Check-out time: 12:00 PM</Text>
              <Text style={styles.importantText}>• Please bring valid ID for check-in</Text>
              <Text style={styles.importantText}>• Cancellation policy applies</Text>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity style={styles.actionButton} onPress={handlePrint}>
                <Text style={styles.actionButtonText}>Print Confirmation</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton} onPress={handleEmail}>
                <Text style={styles.actionButtonText}>Email Guest</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.primaryButton} onPress={onClose}>
                <LinearGradient
                  colors={['#1e3a8a', '#3b82f6']}
                  style={styles.primaryButtonGradient}
                >
                  <Text style={styles.primaryButtonText}>Done</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '90%',
    maxWidth: 500,
    maxHeight: '85%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    padding: 24,
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: 'white',
    marginTop: 12,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  confirmationBody: {
    padding: 24,
  },
  bookingDetails: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1e293b',
  },
  detailSubtext: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
    marginTop: 2,
  },
  specialRequests: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#1e3a8a',
  },
  specialRequestsTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1e293b',
    marginBottom: 4,
  },
  specialRequestsText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    lineHeight: 20,
  },
  importantInfo: {
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  importantTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#92400e',
    marginBottom: 8,
  },
  importantText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#92400e',
    marginBottom: 4,
  },
  actions: {
    gap: 12,
  },
  actionButton: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  actionButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1e3a8a',
  },
  primaryButton: {
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: 'white',
  },
});