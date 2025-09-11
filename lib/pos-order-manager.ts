// POS Order Management System
import { db } from './database';
import { posErrorHandler } from './pos-error-handler';
import { POSValidator, CartItem, POSErrorType, POSError } from './pos-validation';
import { currencyManager } from './currency';
import { Database } from '@/types/database';

type Order = Database['public']['Tables']['orders']['Row'];

export interface OrderCalculation {
  subtotal: number;
  tax: number;
  serviceCharge: number;
  total: number;
}

export interface OrderCreationData {
  cart: CartItem[];
  tableNumber: string;
  orderType: 'restaurant' | 'bar' | 'pool_bar' | 'room_service';
  paymentMethod: string;
  paymentStatus: 'pending' | 'paid';
  hotelSettings: any;
}

export class POSOrderManager {
  private static instance: POSOrderManager;
  private orderCounter = 0;

  static getInstance(): POSOrderManager {
    if (!POSOrderManager.instance) {
      POSOrderManager.instance = new POSOrderManager();
    }
    return POSOrderManager.instance;
  }

  calculateOrderTotal(cart: CartItem[], hotelSettings: any): OrderCalculation {
    try {
      // Validate cart first
      const cartValidation = POSValidator.validateCart(cart);
      if (!cartValidation.isValid) {
        throw new POSError(
          cartValidation.error || 'Invalid cart',
          POSErrorType.VALIDATION_ERROR
        );
      }

      const subtotal = cart.reduce((sum, item) => {
        const itemTotal = item.menuItem.price * item.quantity;
        return sum + itemTotal;
      }, 0);

      if (subtotal < 0) {
        throw new POSError(
          'Invalid subtotal calculation',
          POSErrorType.VALIDATION_ERROR
        );
      }

      // Validate and apply tax rate
      const taxRate = Math.max(0, Math.min(50, hotelSettings?.taxRate || 8.5)) / 100;
      const serviceChargeRate = Math.max(0, Math.min(30, hotelSettings?.serviceChargeRate || 0)) / 100;

      const tax = Math.round(subtotal * taxRate * 100) / 100;
      const serviceCharge = Math.round(subtotal * serviceChargeRate * 100) / 100;
      const total = Math.round((subtotal + tax + serviceCharge) * 100) / 100;

      return { subtotal, tax, serviceCharge, total };
    } catch (error) {
      throw posErrorHandler.handleError(error, {
        component: 'POSOrderManager',
        action: 'calculateOrderTotal',
        timestamp: new Date().toISOString(),
        additionalData: { cartLength: cart.length }
      });
    }
  }

  generateUniqueOrderNumber(orderType: string): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.orderCounter = (this.orderCounter + 1) % 1000;
    const counter = this.orderCounter.toString().padStart(3, '0');
    const prefix = orderType === 'restaurant' ? 'R' : 'B';
    
    return `${prefix}-${timestamp}-${random}-${counter}`;
  }

  async createOrder(orderData: OrderCreationData): Promise<Order> {
    try {
      // Comprehensive validation
      const cartValidation = POSValidator.validateCart(orderData.cart);
      if (!cartValidation.isValid) {
        throw new POSError(
          cartValidation.error || 'Invalid cart',
          POSErrorType.VALIDATION_ERROR
        );
      }

      if (orderData.tableNumber) {
        const tableValidation = POSValidator.validateTableNumber(orderData.tableNumber);
        if (!tableValidation.isValid) {
          throw new POSError(
            tableValidation.error || 'Invalid table number',
            POSErrorType.VALIDATION_ERROR
          );
        }
      }

      // Calculate totals
      const totals = this.calculateOrderTotal(orderData.cart, orderData.hotelSettings);

      // Validate payment amount
      const paymentValidation = POSValidator.validatePaymentAmount(totals.total);
      if (!paymentValidation.isValid) {
        throw new POSError(
          paymentValidation.error || 'Invalid payment amount',
          POSErrorType.PAYMENT_ERROR
        );
      }

      // Generate unique order number
      const orderNumber = this.generateUniqueOrderNumber(orderData.orderType);

      // Prepare order items
      const orderItems = orderData.cart.map(item => ({
        menu_item_id: item.menuItem.id,
        quantity: item.quantity,
        unit_price: item.menuItem.price,
        special_instructions: POSValidator.sanitizeInput(item.specialInstructions || ''),
      }));

      // Create order data
      const newOrderData = {
        order_number: orderNumber,
        table_number: orderData.tableNumber || `${orderData.orderType} Service`,
        order_type: orderData.orderType,
        items: orderItems,
        subtotal: totals.subtotal,
        tax_amount: totals.tax,
        service_charge: totals.serviceCharge,
        total_amount: totals.total,
        status: 'confirmed' as const,
        payment_status: orderData.paymentStatus,
        payment_method: orderData.paymentMethod,
      };

      // Create order in database with retry mechanism
      const newOrder = await posErrorHandler.retryOperation(
        () => db.insert<Order>('orders', newOrderData),
        3,
        1000
      );

      // Create financial transaction
      await this.createFinancialTransaction(newOrder, orderData);

      return newOrder;
    } catch (error) {
      throw posErrorHandler.handleError(error, {
        component: 'POSOrderManager',
        action: 'createOrder',
        timestamp: new Date().toISOString(),
        additionalData: {
          orderType: orderData.orderType,
          cartItems: orderData.cart.length,
          paymentMethod: orderData.paymentMethod
        }
      });
    }
  }

  private async createFinancialTransaction(order: Order, orderData: OrderCreationData) {
    try {
      await db.insert('transactions', {
        transaction_number: `TXN-${order.order_number}`,
        type: 'income',
        category: 'food_beverage',
        amount: order.total_amount,
        description: `${orderData.orderType} order - ${orderData.paymentMethod}`,
        reference_id: order.id,
        payment_method: orderData.paymentMethod.toLowerCase().replace(/\s+/g, '_'),
        transaction_date: new Date().toISOString().split('T')[0],
        processed_by: 'pos_system',
      });
    } catch (error) {
      console.warn('Failed to create financial transaction (non-critical):', error);
      // Don't throw error - order creation is more important than transaction logging
    }
  }

  async updateOrderStatus(orderId: string, status: Order['status']): Promise<void> {
    try {
      await posErrorHandler.retryOperation(
        () => db.update<Order>('orders', orderId, { status }),
        3,
        1000
      );
    } catch (error) {
      throw posErrorHandler.handleError(error, {
        component: 'POSOrderManager',
        action: 'updateOrderStatus',
        timestamp: new Date().toISOString(),
        additionalData: { orderId, status }
      });
    }
  }

  async cancelOrder(orderId: string, reason: string): Promise<void> {
    try {
      await posErrorHandler.retryOperation(
        () => db.update<Order>('orders', orderId, { 
          status: 'cancelled',
          special_instructions: `Cancelled: ${reason}`
        }),
        3,
        1000
      );

      // Create refund transaction if order was paid
      const order = await db.select<Order>('orders', { id: orderId });
      if (order.length > 0 && order[0].payment_status === 'paid') {
        await db.insert('transactions', {
          transaction_number: `REF-${order[0].order_number}`,
          type: 'expense',
          category: 'refunds',
          amount: order[0].total_amount,
          description: `Refund for cancelled order - ${reason}`,
          reference_id: orderId,
          transaction_date: new Date().toISOString().split('T')[0],
          processed_by: 'pos_system',
        });
      }
    } catch (error) {
      throw posErrorHandler.handleError(error, {
        component: 'POSOrderManager',
        action: 'cancelOrder',
        timestamp: new Date().toISOString(),
        additionalData: { orderId, reason }
      });
    }
  }

  formatCurrency(amount: number, currencyCode?: string): string {
    try {
      return currencyManager.formatAmount(amount, currencyCode);
    } catch (error) {
      console.warn('Currency formatting failed:', error);
      return `$${amount.toFixed(2)}`;
    }
  }

  validateOrderData(orderData: OrderCreationData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate cart
    const cartValidation = POSValidator.validateCart(orderData.cart);
    if (!cartValidation.isValid) {
      errors.push(cartValidation.error || 'Invalid cart');
    }

    // Validate table number if provided
    if (orderData.tableNumber) {
      const tableValidation = POSValidator.validateTableNumber(orderData.tableNumber);
      if (!tableValidation.isValid) {
        errors.push(tableValidation.error || 'Invalid table number');
      }
    }

    // Validate payment method
    const validPaymentMethods = ['cash', 'credit_card', 'room_charge', 'complimentary'];
    const normalizedPaymentMethod = orderData.paymentMethod.toLowerCase().replace(/\s+/g, '_');
    if (!validPaymentMethods.some(method => normalizedPaymentMethod.includes(method))) {
      errors.push('Invalid payment method');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  cleanup() {
    // Cleanup functionality would be implemented here
    console.log('POSOrderManager cleanup called');
  }
}

export const posOrderManager = POSOrderManager.getInstance();