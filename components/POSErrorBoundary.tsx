import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { TriangleAlert as AlertTriangle, RefreshCw, Chrome as Home } from 'lucide-react-native';
import { posErrorHandler } from '@/lib/pos-error-handler';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
  posType: 'restaurant' | 'bar';
}

interface State {
  hasError: boolean;
  error?: Error;
  errorId?: string;
}

export class POSErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { 
      hasError: true, 
      error,
      errorId: Date.now().toString()
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // Log error with context
    const posError = posErrorHandler.handleError(error, {
      component: `${this.props.posType}POS`,
      action: 'componentError',
      timestamp: new Date().toISOString(),
      additionalData: errorInfo
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Show user-friendly error message
    Alert.alert(
      'POS System Error',
      `The ${this.props.posType} POS encountered an error. The system will attempt to recover automatically.`,
      [
        { text: 'Retry', onPress: this.handleRetry },
        { text: 'Report Issue', onPress: this.handleReportIssue }
      ]
    );
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorId: undefined });
  };

  handleReportIssue = () => {
    const errorLog = posErrorHandler.getErrorLog();
    const recentErrors = errorLog.slice(-5);
    
    Alert.alert(
      'Report Issue',
      `Recent errors logged: ${recentErrors.length}\n\nIn a production system, this would automatically send error reports to support.`,
      [{ text: 'OK' }]
    );
  };

  handleGoHome = () => {
    // In a real app, this would navigate to dashboard
    Alert.alert(
      'Return to Dashboard',
      'This would navigate back to the main dashboard.',
      [{ text: 'OK' }]
    );
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <AlertTriangle size={64} color="#ef4444" style={styles.icon} />
            <Text style={styles.title}>POS System Error</Text>
            <Text style={styles.message}>
              The {this.props.posType} POS system encountered an unexpected error.
            </Text>
            <Text style={styles.errorDetails}>
              Error: {this.state.error?.message || 'Unknown error'}
            </Text>
            <Text style={styles.errorId}>
              Error ID: {this.state.errorId}
            </Text>
            
            <View style={styles.actions}>
              <TouchableOpacity style={styles.retryButton} onPress={this.handleRetry}>
                <RefreshCw size={20} color="white" />
                <Text style={styles.retryText}>Retry POS</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.homeButton} onPress={this.handleGoHome}>
                <Home size={20} color="#1e3a8a" />
                <Text style={styles.homeText}>Go to Dashboard</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.reportButton} onPress={this.handleReportIssue}>
                <AlertTriangle size={20} color="#f59e0b" />
                <Text style={styles.reportText}>Report Issue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 20,
  },
  content: {
    alignItems: 'center',
    maxWidth: 400,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  icon: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#1e293b',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 24,
  },
  errorDetails: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 8,
    backgroundColor: '#fef2f2',
    padding: 8,
    borderRadius: 6,
    alignSelf: 'stretch',
  },
  errorId: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 24,
  },
  actions: {
    gap: 12,
    alignSelf: 'stretch',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e3a8a',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  retryText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  homeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  homeText: {
    color: '#1e3a8a',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fde68a',
    gap: 8,
  },
  reportText: {
    color: '#f59e0b',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
});