// Document Display Error Boundary
// Handles Cloudinary display errors, broken thumbnails, and document loading failures

import React, { Component, ReactNode } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, RefreshCw, Download, ExternalLink, FileX } from "lucide-react";
import { logger } from '@/lib/utils/logger';

interface Props {
  children: ReactNode;
  documentName?: string;
  documentUrl?: string;
  onRetry?: () => void;
  fallbackComponent?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
  retryCount: number;
}

export class DocumentDisplayBoundary extends Component<Props, State> {
  private maxRetries = 2;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      retryCount: 0
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('DocumentDisplayBoundary caught error:', error, {
      errorInfo: errorInfo.componentStack,
      documentName: this.props.documentName,
      documentUrl: this.props.documentUrl
    });

    this.setState({
      errorInfo: errorInfo.componentStack || null
    });
  }

  handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      logger.info('Retrying document display', { 
        retryCount: this.state.retryCount + 1,
        documentName: this.props.documentName 
      });
      
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: this.state.retryCount + 1
      });

      if (this.props.onRetry) {
        this.props.onRetry();
      }
    }
  };

  handleDirectDownload = () => {
    if (this.props.documentUrl) {
      logger.info('Opening direct download link', {
        documentName: this.props.documentName,
        documentUrl: this.props.documentUrl
      });
      
      window.open(this.props.documentUrl, '_blank');
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    });
  };

  getErrorAnalysis(): {
    title: string;
    message: string;
    suggestions: string[];
    showDownload: boolean;
    isTemporary: boolean;
  } {
    const error = this.state.error;
    
    if (!error) {
      return {
        title: 'Display Error',
        message: 'Unable to display document content.',
        suggestions: ['Try refreshing the page', 'Check your internet connection'],
        showDownload: true,
        isTemporary: true
      };
    }

    // Cloudinary/image loading errors
    if (error.message.includes('cloudinary') || 
        error.message.includes('Failed to load') ||
        error.message.includes('img') ||
        error.message.includes('image')) {
      return {
        title: 'Document Preview Failed',
        message: 'Unable to load document preview or thumbnail.',
        suggestions: [
          'Document may still be processing',
          'Try downloading the document directly',
          'Check if the document was uploaded correctly'
        ],
        showDownload: true,
        isTemporary: true
      };
    }

    // Network/connectivity errors
    if (error.message.includes('network') || 
        error.message.includes('fetch') ||
        error.message.includes('timeout')) {
      return {
        title: 'Connection Error',
        message: 'Unable to load document due to network issues.',
        suggestions: [
          'Check your internet connection',
          'Try again in a moment',
          'Use download link as alternative'
        ],
        showDownload: true,
        isTemporary: true
      };
    }

    // Permission/access errors
    if (error.message.includes('403') || 
        error.message.includes('unauthorized') ||
        error.message.includes('access denied')) {
      return {
        title: 'Access Error',
        message: 'You may not have permission to view this document.',
        suggestions: [
          'Check if you have access to this timeline',
          'Contact the timeline owner for access',
          'Try refreshing your login session'
        ],
        showDownload: false,
        isTemporary: false
      };
    }

    // Document corruption/format errors
    if (error.message.includes('corrupt') || 
        error.message.includes('invalid') ||
        error.message.includes('format')) {
      return {
        title: 'Document Error',
        message: 'The document appears to be corrupted or in an unsupported format.',
        suggestions: [
          'Try re-uploading the document',
          'Check the original file for corruption',
          'Convert to a standard format (PDF, JPEG, PNG)'
        ],
        showDownload: true,
        isTemporary: false
      };
    }

    // Generic error
    return {
      title: 'Display Error',
      message: error.message || 'An unexpected error occurred while displaying the document.',
      suggestions: [
        'Try refreshing the display',
        'Check if the document is accessible',
        'Contact support if the issue persists'
      ],
      showDownload: true,
      isTemporary: true
    };
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallbackComponent) {
        return this.props.fallbackComponent;
      }

      const { title, message, suggestions, showDownload, isTemporary } = this.getErrorAnalysis();
      const canRetry = this.state.retryCount < this.maxRetries && isTemporary;
      const documentName = this.props.documentName || 'document';
      const hasDownloadUrl = !!this.props.documentUrl;

      return (
        <Card className="border-yellow-200 bg-yellow-50 min-h-[200px] flex items-center justify-center">
          <CardContent className="text-center space-y-4 p-6">
            <div className="flex flex-col items-center space-y-2">
              <FileX className="w-12 h-12 text-yellow-600" />
              <CardTitle className="flex items-center text-yellow-800">
                <AlertCircle className="w-5 h-5 mr-2" />
                {title}
              </CardTitle>
            </div>
            
            <CardDescription className="text-yellow-700 max-w-md">
              <strong>{documentName}</strong>
              <br />
              {message}
            </CardDescription>

            {suggestions.length > 0 && (
              <div className="text-left max-w-md">
                <h4 className="font-medium text-yellow-800 mb-2 text-sm">Suggestions:</h4>
                <ul className="list-disc list-inside text-xs text-yellow-700 space-y-1">
                  {suggestions.map((suggestion, index) => (
                    <li key={index}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap justify-center gap-2">
              {canRetry && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={this.handleRetry}
                  className="bg-yellow-600 hover:bg-yellow-700"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again ({this.maxRetries - this.state.retryCount} left)
                </Button>
              )}
              
              {showDownload && hasDownloadUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={this.handleDirectDownload}
                  className="border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Directly
                </Button>
              )}

              {hasDownloadUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={this.handleDirectDownload}
                  className="text-yellow-700 hover:bg-yellow-100"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open in New Tab
                </Button>
              )}
            </div>

            {!isTemporary && (
              <div className="text-xs text-yellow-600 mt-4 p-2 bg-yellow-100 rounded">
                <strong>Note:</strong> This appears to be a persistent issue that may require manual intervention.
              </div>
            )}

            {/* Debug info in development */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="text-sm text-yellow-600 cursor-pointer">
                  Technical Details (Dev Only)
                </summary>
                <pre className="mt-2 text-xs text-yellow-600 bg-yellow-100 p-2 rounded overflow-auto max-h-32">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}