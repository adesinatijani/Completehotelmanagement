// POS Accessibility Support System
import { AccessibilityInfo, Platform } from 'react-native';

export interface AccessibilityConfig {
  screenReaderEnabled: boolean;
  highContrastEnabled: boolean;
  largeTextEnabled: boolean;
  reducedMotionEnabled: boolean;
}

export class POSAccessibilityManager {
  private static instance: POSAccessibilityManager;
  private config: AccessibilityConfig = {
    screenReaderEnabled: false,
    highContrastEnabled: false,
    largeTextEnabled: false,
    reducedMotionEnabled: false,
  };

  static getInstance(): POSAccessibilityManager {
    if (!POSAccessibilityManager.instance) {
      POSAccessibilityManager.instance = new POSAccessibilityManager();
    }
    return POSAccessibilityManager.instance;
  }

  async initialize() {
    try {
      if (Platform.OS !== 'web') {
        // Check screen reader status
        const screenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();
        this.config.screenReaderEnabled = screenReaderEnabled;

        // Listen for accessibility changes
        AccessibilityInfo.addEventListener('screenReaderChanged', (enabled) => {
          this.config.screenReaderEnabled = enabled;
        });
      } else {
        // Web accessibility detection
        this.detectWebAccessibilityFeatures();
      }
    } catch (error) {
      console.warn('Accessibility initialization failed:', error);
    }
  }

  private detectWebAccessibilityFeatures() {
    if (typeof window !== 'undefined') {
      // Check for high contrast mode
      if (window.matchMedia) {
        const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
        this.config.highContrastEnabled = highContrastQuery.matches;

        // Check for reduced motion
        const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        this.config.reducedMotionEnabled = reducedMotionQuery.matches;

        // Listen for changes
        highContrastQuery.addEventListener('change', (e) => {
          this.config.highContrastEnabled = e.matches;
        });

        reducedMotionQuery.addEventListener('change', (e) => {
          this.config.reducedMotionEnabled = e.matches;
        });
      }
    }
  }

  getConfig(): AccessibilityConfig {
    return { ...this.config };
  }

  // Generate accessibility labels for POS elements
  generateMenuItemLabel(item: any): string {
    const price = this.formatPriceForScreenReader(item.price);
    const category = item.category.replace('_', ' ');
    
    let label = `${item.name}, ${category}, ${price}`;
    
    if (item.prep_time_minutes > 0) {
      label += `, preparation time ${item.prep_time_minutes} minutes`;
    }

    if (item.is_vegetarian) label += ', vegetarian';
    if (item.is_vegan) label += ', vegan';
    if (item.is_gluten_free) label += ', gluten free';

    return label;
  }

  generateCartItemLabel(item: any, index: number): string {
    const price = this.formatPriceForScreenReader(item.menuItem.price * item.quantity);
    return `Item ${index + 1}, ${item.menuItem.name}, quantity ${item.quantity}, total ${price}`;
  }

  generateOrderTotalLabel(totals: any): string {
    const subtotal = this.formatPriceForScreenReader(totals.subtotal);
    const tax = this.formatPriceForScreenReader(totals.tax);
    const total = this.formatPriceForScreenReader(totals.total);
    
    return `Order total: subtotal ${subtotal}, tax ${tax}, grand total ${total}`;
  }

  private formatPriceForScreenReader(price: number): string {
    const dollars = Math.floor(price);
    const cents = Math.round((price - dollars) * 100);
    
    if (cents === 0) {
      return `${dollars} dollar${dollars !== 1 ? 's' : ''}`;
    } else {
      return `${dollars} dollar${dollars !== 1 ? 's' : ''} and ${cents} cent${cents !== 1 ? 's' : ''}`;
    }
  }

  // Keyboard navigation support
  handleKeyboardNavigation(event: KeyboardEvent, context: 'menu' | 'cart' | 'payment') {
    switch (context) {
      case 'menu':
        this.handleMenuKeyboard(event);
        break;
      case 'cart':
        this.handleCartKeyboard(event);
        break;
      case 'payment':
        this.handlePaymentKeyboard(event);
        break;
    }
  }

  private handleMenuKeyboard(event: KeyboardEvent) {
    switch (event.key) {
      case 'Enter':
      case ' ':
        // Add selected item to cart
        event.preventDefault();
        break;
      case 'ArrowUp':
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'ArrowRight':
        // Navigate menu items
        event.preventDefault();
        break;
      case 'Escape':
        // Clear selection
        event.preventDefault();
        break;
    }
  }

  private handleCartKeyboard(event: KeyboardEvent) {
    switch (event.key) {
      case 'Delete':
      case 'Backspace':
        // Remove selected item
        event.preventDefault();
        break;
      case '+':
        // Increase quantity
        event.preventDefault();
        break;
      case '-':
        // Decrease quantity
        event.preventDefault();
        break;
    }
  }

  private handlePaymentKeyboard(event: KeyboardEvent) {
    switch (event.key) {
      case 'Enter':
        // Process payment
        event.preventDefault();
        break;
      case '1':
        // Cash payment
        event.preventDefault();
        break;
      case '2':
        // Credit payment
        event.preventDefault();
        break;
      case '3':
        // Settle options
        event.preventDefault();
        break;
    }
  }

  // High contrast color schemes
  getHighContrastColors() {
    return {
      background: '#000000',
      foreground: '#ffffff',
      primary: '#ffff00',
      secondary: '#00ffff',
      success: '#00ff00',
      error: '#ff0000',
      warning: '#ff8800',
    };
  }

  // Large text scaling
  getScaledFontSize(baseFontSize: number): number {
    if (this.config.largeTextEnabled) {
      return baseFontSize * 1.3;
    }
    return baseFontSize;
  }

  // Reduced motion alternatives
  shouldUseReducedMotion(): boolean {
    return this.config.reducedMotionEnabled;
  }

  // Voice announcements for screen readers
  announceToScreenReader(message: string) {
    if (this.config.screenReaderEnabled) {
      if (Platform.OS !== 'web') {
        AccessibilityInfo.announceForAccessibility(message);
      } else {
        // Web screen reader announcement
        this.announceToWebScreenReader(message);
      }
    }
  }

  private announceToWebScreenReader(message: string) {
    if (typeof document !== 'undefined') {
      const announcement = document.createElement('div');
      announcement.setAttribute('aria-live', 'polite');
      announcement.setAttribute('aria-atomic', 'true');
      announcement.style.position = 'absolute';
      announcement.style.left = '-10000px';
      announcement.style.width = '1px';
      announcement.style.height = '1px';
      announcement.style.overflow = 'hidden';
      announcement.textContent = message;
      
      document.body.appendChild(announcement);
      
      setTimeout(() => {
        document.body.removeChild(announcement);
      }, 1000);
    }
  }
}

export const posAccessibilityManager = POSAccessibilityManager.getInstance();

// React hooks for accessibility
export function useAccessibilityConfig() {
  const [config, setConfig] = React.useState<AccessibilityConfig>(
    posAccessibilityManager.getConfig()
  );

  useEffect(() => {
    posAccessibilityManager.initialize();
    
    // Update config when accessibility settings change
    const interval = setInterval(() => {
      setConfig(posAccessibilityManager.getConfig());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return config;
}

export function useScreenReaderAnnouncement() {
  return useCallback((message: string) => {
    posAccessibilityManager.announceToScreenReader(message);
  }, []);
}