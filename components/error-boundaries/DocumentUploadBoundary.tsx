// Document Upload Error Boundary
// Handles file upload failures, size limits, and provides recovery options

import React, { Component, ReactNode } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, RefreshCw, Upload, FileX } from "lucide-react";
import { logger } from '@/lib/utils/logger';

interface Props {
  children: ReactNode;
  onRetry?: () => void;
  fallbackComponent?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
  retryCount: number;
}

export class DocumentUploadBoundary extends Component<Props, State> {
  private maxRetries = 3;

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
    logger.error('DocumentUploadBoundary caught error:', error, {
      errorInfo: errorInfo.componentStack,
      props: this.props
    });

    this.setState({
      errorInfo: errorInfo.componentStack
    });
  }

  handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      logger.info('Retrying document upload', { 
        retryCount: this.state.retryCount + 1 
      });
      
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: this.state.retryCount + 1
      });

      // Call parent retry handler if provided
      if (this.props.onRetry) {
        this.props.onRetry();
      }
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

  getErrorMessage(): { title: string; message: string; suggestions: string[] } {
    const error = this.state.error;
    
    if (!error) {
      return {
        title: 'Upload Error',
        message: 'An unexpected error occurred during file upload.',
        suggestions: ['Try uploading the file again', 'Check your internet connection']
      };
    }

    // File size errors
    if (error.message.includes('too large') || error.message.includes('Maximum size')) {
      return {
        title: 'File Too Large',
        message: 'The selected file exceeds the maximum size limit of 50MB.',
        suggestions: [
          'Compress the PDF using online tools',
          'Split large documents into smaller sections',
          'Save the document in a more efficient format',
          'Remove unnecessary pages or images'
        ]
      };
    }

    // Network/connectivity errors
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return {
        title: 'Upload Failed',
        message: 'Unable to upload file due to network issues.',
        suggestions: [
          'Check your internet connection',
          'Try again in a moment',
          'Switch to a more stable network'
        ]
      };
    }

    // Cloudinary-specific errors
    if (error.message.includes('cloudinary') || error.message.includes('transformation')) {
      return {
        title: 'Processing Error',
        message: 'Error occurred while processing your document.',
        suggestions: [
          'Try uploading a different file format',
          'Ensure the document is not corrupted',
          'Contact support if the issue persists'
        ]
      };
    }

    // File type errors
    if (error.message.includes('type') || error.message.includes('format')) {
      return {
        title: 'Unsupported File Type',
        message: 'The selected file type is not supported.',
        suggestions: [
          'Convert to PDF, JPEG, or PNG format',
          'Ensure the file is not corrupted',
          'Try a different file'
        ]
      };
    }

    // Generic error
    return {
      title: 'Upload Error',
      message: error.message || 'An unexpected error occurred.',
      suggestions: [
        'Try uploading again',
        'Check the file is not corrupted',
        'Contact support if the issue persists'
      ]
    };
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallbackComponent) {
        return this.props.fallbackComponent;
      }

      const { title, message, suggestions } = this.getErrorMessage();
      const canRetry = this.state.retryCount < this.maxRetries;

      return (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center text-red-800">
              <AlertCircle className="w-5 h-5 mr-2" />
              {title}
            </CardTitle>
            <CardDescription className="text-red-700">
              {message}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {suggestions.length > 0 && (
              <div>
                <h4 className="font-medium text-red-800 mb-2">Suggestions:</h4>
                <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                  {suggestions.map((suggestion, index) => (
                    <li key={index}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex space-x-2">
              {canRetry && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={this.handleRetry}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again ({this.maxRetries - this.state.retryCount} left)
                </Button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleReset}
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                <Upload className="w-4 h-4 mr-2" />
                Choose Different File
              </Button>
            </div>

            {/* Debug info in development */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4">
                <summary className="text-sm text-red-600 cursor-pointer">
                  Technical Details (Dev Only)
                </summary>
                <pre className="mt-2 text-xs text-red-600 bg-red-100 p-2 rounded overflow-auto">
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