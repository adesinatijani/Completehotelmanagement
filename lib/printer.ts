import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { Database } from '@/types/database';

type Booking = Database['public']['Tables']['bookings']['Row'];
type Room = Database['public']['Tables']['rooms']['Row'];

interface PrintOptions {
  booking: Booking;
  room: Room;
  hotelSettings: any;
  currency: string;
}

export class ReceiptPrinter {
  private static instance: ReceiptPrinter;

  static getInstance(): ReceiptPrinter {
    if (!ReceiptPrinter.instance) {
      ReceiptPrinter.instance = new ReceiptPrinter();
    }
    return ReceiptPrinter.instance;
  }

  async printBookingConfirmation({ booking, room, hotelSettings, currency }: PrintOptions) {
    try {
      const html = this.generateBookingReceiptHTML(booking, room, hotelSettings, currency);
      
      if (Platform.OS === 'web') {
        // For web, open print dialog
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(html);
          printWindow.document.close();
          printWindow.focus();
          printWindow.print();
          printWindow.close();
        }
      } else {
        // For mobile, use expo-print
        const { uri } = await Print.printToFileAsync({
          html,
          base64: false,
        });

        // Share the PDF
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Booking Confirmation',
          });
        }
      }
    } catch (error) {
      console.error('Print error:', error);
      throw new Error('Failed to print booking confirmation');
    }
  }

  private generateBookingReceiptHTML(booking: Booking, room: Room, hotelSettings: any, currency: string): string {
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency || 'USD'
      }).format(amount);
    };

    const calculateNights = (checkIn: string, checkOut: string) => {
      const start = new Date(checkIn);
      const end = new Date(checkOut);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const nights = calculateNights(booking.check_in, booking.check_out);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Booking Confirmation</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 5mm;
          }
          
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.4;
            margin: 0;
            padding: 10px;
            width: 70mm;
          }
          
          .header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
            margin-bottom: 15px;
          }
          
          .hotel-name {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          
          .hotel-details {
            font-size: 10px;
            margin-bottom: 3px;
          }
          
          .confirmation-title {
            font-size: 14px;
            font-weight: bold;
            text-align: center;
            margin: 15px 0;
            text-transform: uppercase;
          }
          
          .booking-info {
            margin-bottom: 15px;
          }
          
          .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
            border-bottom: 1px dotted #ccc;
            padding-bottom: 2px;
          }
          
          .label {
            font-weight: bold;
          }
          
          .value {
            text-align: right;
          }
          
          .total-section {
            border-top: 2px solid #000;
            padding-top: 10px;
            margin-top: 15px;
          }
          
          .total-row {
            display: flex;
            justify-content: space-between;
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          
          .footer {
            text-align: center;
            margin-top: 20px;
            padding-top: 10px;
            border-top: 1px solid #ccc;
            font-size: 10px;
          }
          
          .qr-placeholder {
            text-align: center;
            margin: 15px 0;
            padding: 20px;
            border: 1px dashed #ccc;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="hotel-name">${hotelSettings?.hotelName || 'Grand Hotel'}</div>
          <div class="hotel-details">${hotelSettings?.address || '123 Main Street'}</div>
          <div class="hotel-details">${hotelSettings?.phone || '+1 (555) 123-4567'}</div>
          <div class="hotel-details">${hotelSettings?.email || 'info@hotel.com'}</div>
        </div>

        <div class="confirmation-title">BOOKING CONFIRMATION</div>

        <div class="booking-info">
          <div class="info-row">
            <span class="label">Confirmation #:</span>
            <span class="value">${booking.id.substring(0, 8).toUpperCase()}</span>
          </div>
          
          <div class="info-row">
            <span class="label">Guest Name:</span>
            <span class="value">${booking.guest_name}</span>
          </div>
          
          <div class="info-row">
            <span class="label">Email:</span>
            <span class="value">${booking.guest_email}</span>
          </div>
          
          ${booking.guest_phone ? `
          <div class="info-row">
            <span class="label">Phone:</span>
            <span class="value">${booking.guest_phone}</span>
          </div>
          ` : ''}
          
          <div class="info-row">
            <span class="label">Room:</span>
            <span class="value">${room.room_number} (${room.room_type.charAt(0).toUpperCase() + room.room_type.slice(1)})</span>
          </div>
          
          <div class="info-row">
            <span class="label">Check-in:</span>
            <span class="value">${new Date(booking.check_in).toLocaleDateString()}</span>
          </div>
          
          <div class="info-row">
            <span class="label">Check-out:</span>
            <span class="value">${new Date(booking.check_out).toLocaleDateString()}</span>
          </div>
          
          <div class="info-row">
            <span class="label">Nights:</span>
            <span class="value">${nights}</span>
          </div>
          
          <div class="info-row">
            <span class="label">Guests:</span>
            <span class="value">${booking.adults} Adult${booking.adults !== 1 ? 's' : ''}${booking.children > 0 ? `, ${booking.children} Child${booking.children !== 1 ? 'ren' : ''}` : ''}</span>
          </div>
          
          <div class="info-row">
            <span class="label">Rate/Night:</span>
            <span class="value">${formatCurrency(room.price_per_night)}</span>
          </div>
        </div>

        <div class="total-section">
          <div class="total-row">
            <span>Subtotal:</span>
            <span>${formatCurrency(booking.total_amount)}</span>
          </div>
          
          ${booking.deposit_amount > 0 ? `
          <div class="total-row">
            <span>Deposit Paid:</span>
            <span>${formatCurrency(booking.deposit_amount)}</span>
          </div>
          
          <div class="total-row">
            <span>Balance Due:</span>
            <span>${formatCurrency(booking.total_amount - booking.deposit_amount)}</span>
          </div>
          ` : ''}
        </div>

        ${booking.special_requests ? `
        <div style="margin-top: 15px; padding: 10px; border: 1px solid #ccc;">
          <div style="font-weight: bold; margin-bottom: 5px;">Special Requests:</div>
          <div style="font-size: 11px;">${booking.special_requests}</div>
        </div>
        ` : ''}

        <div class="qr-placeholder">
          <div style="font-size: 10px;">QR Code for Mobile Check-in</div>
          <div style="margin: 5px 0;">████████████</div>
          <div style="font-size: 8px;">Scan with hotel app</div>
        </div>

        <div class="footer">
          <div>Thank you for choosing ${hotelSettings?.hotelName || 'Grand Hotel'}!</div>
          <div>Printed: ${new Date().toLocaleString()}</div>
          <div>Check-in time: ${hotelSettings?.checkInTime || '3:00 PM'}</div>
          <div>Check-out time: ${hotelSettings?.checkOutTime || '12:00 PM'}</div>
        </div>
      </body>
      </html>
    `;
  }

  async printOrderReceipt(order: any, currency: string, hotelSettings: any) {
    try {
      const html = this.generateOrderReceiptHTML(order, currency, hotelSettings);
      
      if (Platform.OS === 'web') {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(html);
          printWindow.document.close();
          printWindow.focus();
          printWindow.print();
          printWindow.close();
        }
      } else {
        const { uri } = await Print.printToFileAsync({
          html,
          base64: false,
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Order Receipt',
          });
        }
      }
    } catch (error) {
      console.error('Print error:', error);
      throw new Error('Failed to print order receipt');
    }
  }

  private generateOrderReceiptHTML(order: any, currency: string, hotelSettings: any): string {
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency || 'USD'
      }).format(amount);
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Order Receipt</title>
        <style>
          @page { size: 80mm auto; margin: 5mm; }
          body { font-family: 'Courier New', monospace; font-size: 12px; line-height: 1.4; margin: 0; padding: 10px; width: 70mm; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
          .hotel-name { font-size: 16px; font-weight: bold; margin-bottom: 5px; }
          .order-title { font-size: 14px; font-weight: bold; text-align: center; margin: 15px 0; }
          .order-info { margin-bottom: 15px; }
          .info-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
          .items-section { margin: 15px 0; }
          .item-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
          .total-section { border-top: 2px solid #000; padding-top: 10px; margin-top: 15px; }
          .total-row { display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 5px; }
          .footer { text-align: center; margin-top: 20px; padding-top: 10px; border-top: 1px solid #ccc; font-size: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="hotel-name">${hotelSettings?.hotelName || 'Grand Hotel'}</div>
          <div>${hotelSettings?.address || '123 Main Street'}</div>
        </div>

        <div class="order-title">${order.order_type.toUpperCase()} ORDER</div>

        <div class="order-info">
          <div class="info-row">
            <span>Order #:</span>
            <span>${order.order_number}</span>
          </div>
          <div class="info-row">
            <span>Date:</span>
            <span>${new Date(order.created_at).toLocaleDateString()}</span>
          </div>
          <div class="info-row">
            <span>Time:</span>
            <span>${new Date(order.created_at).toLocaleTimeString()}</span>
          </div>
          ${order.table_number ? `
          <div class="info-row">
            <span>Table:</span>
            <span>${order.table_number}</span>
          </div>
          ` : ''}
        </div>

        <div class="items-section">
          ${order.items.map((item: any) => `
            <div class="item-row">
              <span>${item.quantity}x Item #${item.menu_item_id.substring(0, 8)}</span>
              <span>${formatCurrency(item.unit_price * item.quantity)}</span>
            </div>
            ${item.special_instructions ? `
            <div style="font-size: 10px; margin-left: 10px; color: #666;">
              Note: ${item.special_instructions}
            </div>
            ` : ''}
          `).join('')}
        </div>

        <div class="total-section">
          <div class="total-row">
            <span>Subtotal:</span>
            <span>${formatCurrency(order.subtotal)}</span>
          </div>
          <div class="total-row">
            <span>Tax:</span>
            <span>${formatCurrency(order.tax_amount)}</span>
          </div>
          <div class="total-row">
            <span>TOTAL:</span>
            <span>${formatCurrency(order.total_amount)}</span>
          </div>
        </div>

        <div class="footer">
          <div>Thank you for your order!</div>
          <div>Printed: ${new Date().toLocaleString()}</div>
        </div>
      </body>
      </html>
    `;
  }
}

export const receiptPrinter = ReceiptPrinter.getInstance();