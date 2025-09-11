// POS State Management System
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CartItem } from './pos-validation';

export interface POSState {
  cart: CartItem[];
  tableNumber: string;
  currentGuest: string;
  serverName: string;
  lastOrderId?: string;
  sessionStartTime: string;
}

export class POSStateManager {
  private static instance: POSStateManager;
  private state: POSState;
  private listeners: Array<(state: POSState) => void> = [];
  private autoSaveInterval?: NodeJS.Timeout;

  static getInstance(): POSStateManager {
    if (!POSStateManager.instance) {
      POSStateManager.instance = new POSStateManager();
    }
    return POSStateManager.instance;
  }

  constructor() {
    this.state = {
      cart: [],
      tableNumber: '',
      currentGuest: 'GUEST 1 OF 3',
      serverName: 'WALDO T',
      sessionStartTime: new Date().toISOString(),
    };
    
    this.initializeAutoSave();
  }

  private initializeAutoSave() {
    // Auto-save state every 30 seconds
    this.autoSaveInterval = setInterval(() => {
      this.saveState();
    }, 30000);
  }

  async loadState(posType: 'restaurant' | 'bar'): Promise<POSState> {
    try {
      const savedState = await AsyncStorage.getItem(`pos_state_${posType}`);
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        
        // Validate loaded state
        if (this.isValidState(parsedState)) {
          this.state = { ...this.state, ...parsedState };
        }
      }
    } catch (error) {
      console.warn('Failed to load POS state:', error);
      // Continue with default state
    }
    
    return this.state;
  }

  async saveState(posType?: 'restaurant' | 'bar') {
    try {
      if (posType) {
        await AsyncStorage.setItem(`pos_state_${posType}`, JSON.stringify(this.state));
      } else {
        // Save to both if no type specified
        await Promise.all([
          AsyncStorage.setItem('pos_state_restaurant', JSON.stringify(this.state)),
          AsyncStorage.setItem('pos_state_bar', JSON.stringify(this.state))
        ]);
      }
    } catch (error) {
      console.warn('Failed to save POS state:', error);
    }
  }

  private isValidState(state: any): boolean {
    return (
      state &&
      typeof state === 'object' &&
      Array.isArray(state.cart) &&
      typeof state.tableNumber === 'string' &&
      typeof state.currentGuest === 'string' &&
      typeof state.serverName === 'string'
    );
  }

  getState(): POSState {
    return { ...this.state };
  }

  updateState(updates: Partial<POSState>) {
    this.state = { ...this.state, ...updates };
    this.notifyListeners();
  }

  addToCart(item: CartItem) {
    const existingIndex = this.state.cart.findIndex(
      cartItem => cartItem.menuItem.id === item.menuItem.id
    );

    if (existingIndex >= 0) {
      this.state.cart[existingIndex].quantity += item.quantity;
    } else {
      this.state.cart.push(item);
    }

    this.notifyListeners();
  }

  removeFromCart(menuItemId: string) {
    this.state.cart = this.state.cart.filter(
      item => item.menuItem.id !== menuItemId
    );
    this.notifyListeners();
  }

  updateCartItemQuantity(menuItemId: string, quantity: number) {
    if (quantity <= 0) {
      this.removeFromCart(menuItemId);
      return;
    }

    const itemIndex = this.state.cart.findIndex(
      item => item.menuItem.id === menuItemId
    );

    if (itemIndex >= 0) {
      this.state.cart[itemIndex].quantity = quantity;
      this.notifyListeners();
    }
  }

  clearCart() {
    this.state.cart = [];
    this.notifyListeners();
  }

  setTableNumber(tableNumber: string) {
    this.state.tableNumber = tableNumber;
    this.notifyListeners();
  }

  subscribe(listener: (state: POSState) => void) {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener(this.state);
      } catch (error) {
        console.warn('Error in state listener:', error);
      }
    });
  }

  async clearSession(posType: 'restaurant' | 'bar') {
    this.state = {
      cart: [],
      tableNumber: '',
      currentGuest: 'GUEST 1 OF 3',
      serverName: 'WALDO T',
      sessionStartTime: new Date().toISOString(),
    };
    
    await this.saveState(posType);
    this.notifyListeners();
  }

  cleanup() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
    this.listeners.length = 0;
  }
}

export const posStateManager = POSStateManager.getInstance();