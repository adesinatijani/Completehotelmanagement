// Comprehensive POS Error Handling System
import { POSErrorType, POSError } from './pos-validation';

export interface ErrorContext {
  component: string;
  action: string;
  userId?: string;
  timestamp: string;
  additionalData?: any;
}

export class POSErrorHandler {
  private static instance: POSErrorHandler;
  private errorLog: Array<{ error: POSError; context: ErrorContext }> = [];
  private maxLogSize = 100;

  static getInstance(): POSErrorHandler {
    if (!POSErrorHandler.instance) {
      POSErrorHandler.instance = new POSErrorHandler();
    }
    return POSErrorHandler.instance;
  }

  handleError(error: any, context: ErrorContext): POSError {
    const posError = this.convertToPOSError(error, context);
    
    // Log error
    this.logError(posError, context);
    
    // Report to analytics (in production, this would send to error tracking service)
    this.reportError(posError, context);
    
    return posError;
  }

  private convertToPOSError(error: any, context: ErrorContext): POSError {
    if (error instanceof POSError) {
      return error;
    }

    // Network errors
    if (error.message?.includes('network') || error.message?.includes('fetch')) {
      return new POSError(
        'Network connection failed. Please check your internet connection.',
        POSErrorType.NETWORK_ERROR,
        'NETWORK_001',
        true
      );
    }

    // Database errors
    if (error.message?.includes('database') || error.message?.includes('storage')) {
      return new POSError(
        'Database operation failed. Please try again.',
        POSErrorType.DATABASE_ERROR,
        'DB_001',
        true
      );
    }

    // Payment errors
    if (context.action.includes('payment') || context.action.includes('charge')) {
      return new POSError(
        'Payment processing failed. Please try a different payment method.',
        POSErrorType.PAYMENT_ERROR,
        'PAY_001',
        true
      );
    }

    // Validation errors
    if (error.message?.includes('validation') || error.message?.includes('invalid')) {
      return new POSError(
        error.message || 'Invalid input provided.',
        POSErrorType.VALIDATION_ERROR,
        'VAL_001',
        false
      );
    }

    // Generic system error
    return new POSError(
      'An unexpected error occurred. Please try again.',
      POSErrorType.SYSTEM_ERROR,
      'SYS_001',
      true
    );
  }

  private logError(error: POSError, context: ErrorContext) {
    this.errorLog.push({ error, context });
    
    // Keep log size manageable
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(-this.maxLogSize);
    }

    // Console logging for development
    console.error(`[POS Error] ${context.component}.${context.action}:`, {
      type: error.type,
      message: error.message,
      code: error.code,
      retryable: error.retryable,
      context
    });
  }

  private reportError(error: POSError, context: ErrorContext) {
    // In production, this would send to error tracking service like Sentry
    // For now, we'll just store locally for debugging
    try {
      const errorReport = {
        error: {
          type: error.type,
          message: error.message,
          code: error.code,
          retryable: error.retryable
        },
        context,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        timestamp: new Date().toISOString()
      };

      // Store in local storage for debugging
      if (typeof localStorage !== 'undefined') {
        const existingReports = JSON.parse(localStorage.getItem('pos_error_reports') || '[]');
        existingReports.push(errorReport);
        
        // Keep only last 50 reports
        const recentReports = existingReports.slice(-50);
        localStorage.setItem('pos_error_reports', JSON.stringify(recentReports));
      }
    } catch (reportError) {
      console.warn('Failed to report error:', reportError);
    }
  }

  getErrorLog(): Array<{ error: POSError; context: ErrorContext }> {
    return [...this.errorLog];
  }

  clearErrorLog() {
    this.errorLog = [];
  }

  // Retry mechanism for retryable errors
  async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        return result;
      } catch (error) {
        lastError = error;
        
        const posError = this.convertToPOSError(error, {
          component: 'RetryHandler',
          action: 'retryOperation',
          timestamp: new Date().toISOString()
        });

        if (!posError.retryable || attempt === maxRetries) {
          throw posError;
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
    
    throw lastError;
  }
}

export const posErrorHandler = POSErrorHandler.getInstance();