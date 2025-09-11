// POS System Validation Library
import { Database } from '@/types/database';

type MenuItem = Database['public']['Tables']['menu_items']['Row'];

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  specialInstructions?: string;
}

export class POSValidator {
  // Constants for validation
  static readonly MIN_QUANTITY = 1;
  static readonly MAX_QUANTITY = 99;
  static readonly MAX_ORDER_VALUE = 10000;
  static readonly MIN_ORDER_VALUE = 0.01;
  static readonly MAX_SPECIAL_INSTRUCTIONS_LENGTH = 200;
  static readonly MAX_TABLE_NUMBER_LENGTH = 10;

  static validateMenuItem(menuItem: MenuItem): ValidationResult {
    if (!menuItem || !menuItem.id) {
      return { isValid: false, error: 'Invalid menu item selected' };
    }

    if (!menuItem.is_available) {
      return { isValid: false, error: 'This item is currently unavailable' };
    }

    if (menuItem.price <= 0) {
      return { isValid: false, error: 'Menu item has invalid price' };
    }

    if (!menuItem.name || menuItem.name.trim().length === 0) {
      return { isValid: false, error: 'Menu item has no name' };
    }

    return { isValid: true };
  }

  static validateQuantity(quantity: number): ValidationResult {
    if (!Number.isInteger(quantity)) {
      return { isValid: false, error: 'Quantity must be a whole number' };
    }

    if (quantity < this.MIN_QUANTITY) {
      return { isValid: false, error: `Minimum quantity is ${this.MIN_QUANTITY}` };
    }

    if (quantity > this.MAX_QUANTITY) {
      return { isValid: false, error: `Maximum quantity is ${this.MAX_QUANTITY}` };
    }

    return { isValid: true };
  }

  static validateCart(cart: CartItem[]): ValidationResult {
    if (cart.length === 0) {
      return { isValid: false, error: 'Cart is empty. Please add items before proceeding.' };
    }

    // Validate each item in cart
    for (const item of cart) {
      const itemValidation = this.validateMenuItem(item.menuItem);
      if (!itemValidation.isValid) {
        return { isValid: false, error: `${item.menuItem.name}: ${itemValidation.error}` };
      }

      const quantityValidation = this.validateQuantity(item.quantity);
      if (!quantityValidation.isValid) {
        return { isValid: false, error: `${item.menuItem.name}: ${quantityValidation.error}` };
      }

      // Validate special instructions length
      if (item.specialInstructions && item.specialInstructions.length > this.MAX_SPECIAL_INSTRUCTIONS_LENGTH) {
        return { 
          isValid: false, 
          error: `Special instructions too long (max ${this.MAX_SPECIAL_INSTRUCTIONS_LENGTH} characters)` 
        };
      }
    }

    // Calculate total and validate
    const total = cart.reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0);
    
    if (total < this.MIN_ORDER_VALUE) {
      return { isValid: false, error: `Order value too low (minimum $${this.MIN_ORDER_VALUE})` };
    }

    if (total > this.MAX_ORDER_VALUE) {
      return { 
        isValid: false, 
        error: `Order value exceeds maximum limit of $${this.MAX_ORDER_VALUE.toLocaleString()}` 
      };
    }

    return { isValid: true };
  }

  static validateRoomNumber(roomNumber: string): ValidationResult {
    if (!roomNumber || roomNumber.trim().length === 0) {
      return { isValid: false, error: 'Room number is required' };
    }

    // Room numbers should be alphanumeric
    const validPattern = /^[a-zA-Z0-9]+$/;
    if (!validPattern.test(roomNumber.trim())) {
      return { isValid: false, error: 'Invalid room number format' };
    }

    return { isValid: true };
  }

  static sanitizeInput(input: string): string {
    // Remove potentially dangerous characters
    return input
      .replace(/[<>\"'&]/g, '') // Remove HTML/script characters
      .trim()
      .substring(0, 1000); // Limit length
  }

  static validateSplitCount(count: number): ValidationResult {
    if (!Number.isInteger(count)) {
      return { isValid: false, error: 'Split count must be a whole number' };
    }

    if (count < 2) {
      return { isValid: false, error: 'Must split between at least 2 people' };
    }

    if (count > 20) {
      return { isValid: false, error: 'Cannot split between more than 20 people' };
    }

    return { isValid: true };
  }
}

// Error types for better error handling
export enum POSErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  PAYMENT_ERROR = 'PAYMENT_ERROR',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  USER_ERROR = 'USER_ERROR'
}

export class POSError extends Error {
  constructor(
    message: string,
    public type: POSErrorType,
    public code?: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'POSError';
  }
}