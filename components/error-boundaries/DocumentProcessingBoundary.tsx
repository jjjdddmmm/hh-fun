// Document Processing Error Boundary
// Handles PDF processing failures, OCR errors, and analysis pipeline issues

import React, { Component, ReactNode } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, RefreshCw, FileText, Eye, Brain, Loader2 } from "lucide-react";
import { logger } from '@/lib/utils/logger';

interface Props {
  children: ReactNode;
  onRetry?: () => void;
  onFallbackToManual?: () => void;
  processingStage?: 'upload' | 'ocr' | 'analysis' | 'complete';
  documentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
  retryCount: number;
  fallbackAttempted: boolean;
}

export class DocumentProcessingBoundary extends Component<Props, State> {
  private maxRetries = 2;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      fallbackAttempted: false
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      retryCount: 0,
      fallbackAttempted: false
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('DocumentProcessingBoundary caught error:', error, {
      errorInfo: errorInfo.componentStack,
      processingStage: this.props.processingStage,
      documentName: this.props.documentName
    });

    this.setState({
      errorInfo: errorInfo.componentStack
    });
  }

  handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      logger.info('Retrying document processing', { 
        retryCount: this.state.retryCount + 1,
        processingStage: this.props.processingStage 
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

  handleFallbackToManual = () => {
    logger.info('Falling back to manual input', {
      originalError: this.state.error?.message,
      processingStage: this.props.processingStage
    });

    this.setState({
      fallbackAttempted: true
    });

    if (this.props.onFallbackToManual) {
      this.props.onFallbackToManual();
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      fallbackAttempted: false
    });
  };

  getErrorAnalysis(): { 
    title: string; 
    message: string; 
    stage: string;
    suggestions: string[];
    canFallback: boolean;
  } {
    const error = this.state.error;
    const stage = this.props.processingStage || 'unknown';
    
    if (!error) {
      return {
        title: 'Processing Error',
        message: 'An unexpected error occurred during document processing.',
        stage: 'Unknown Stage',
        suggestions: ['Try processing the document again'],
        canFallback: true
      };
    }

    // OCR-specific errors
    if (error.message.includes('OCR') || error.message.includes('text extraction')) {
      return {
        title: 'Text Extraction Failed',
        message: 'Unable to extract text from the document. This may be due to poor image quality or complex formatting.',
        stage: 'Text Extraction (OCR)',
        suggestions: [
          'Ensure the document image is clear and high quality',
          'Try uploading a different version of the document',
          'Check that text is not handwritten or in unusual fonts'
        ],
        canFallback: true
      };
    }

    // Anthropic Vision API errors
    if (error.message.includes('anthropic') || error.message.includes('vision') || error.message.includes('claude')) {
      return {
        title: 'AI Analysis Failed',
        message: 'The AI analysis service encountered an error while processing your document.',
        stage: 'AI Analysis',
        suggestions: [
          'The document may be too complex or contain unsupported content',
          'Try again as this may be a temporary service issue',
          'Ensure the document is a standard inspection or appraisal report'
        ],
        canFallback: true
      };
    }

    // Cloudinary processing errors
    if (error.message.includes('cloudinary') || error.message.includes('transformation')) {
      return {
        title: 'Document Processing Failed',
        message: 'Error occurred while processing the document format.',
        stage: 'Document Processing',
        suggestions: [
          'The document format may not be fully supported',
          'Try converting to a standard PDF format',
          'Ensure the document is not password protected'
        ],
        canFallback: true
      };
    }

    // Timeout errors
    if (error.message.includes('timeout') || error.message.includes('took too long')) {
      return {
        title: 'Processing Timeout',
        message: 'Document processing took longer than expected and timed out.',
        stage: 'Processing Timeout',
        suggestions: [
          'The document may be very large or complex',
          'Try splitting large documents into smaller sections',
          'Ensure you have a stable internet connection'
        ],
        canFallback: true
      };
    }

    // Network/API errors
    if (error.message.includes('network') || error.message.includes('fetch') || error.message.includes('API')) {
      return {
        title: 'Service Unavailable',
        message: 'Unable to connect to the document processing service.',
        stage: 'Network Connection',
        suggestions: [
          'Check your internet connection',
          'Try again in a few moments',
          'This may be a temporary service outage'
        ],
        canFallback: true
      };
    }

    // Generic error
    return {
      title: 'Processing Error',
      message: error.message || 'An unexpected error occurred during processing.',
      stage: 'Document Processing',
      suggestions: [
        'Try processing the document again',
        'Ensure the document is in a supported format',
        'Contact support if the issue persists'
      ],
      canFallback: true
    };
  }

  getStageIcon(stage: string) {
    switch (stage.toLowerCase()) {
      case 'upload': return <FileText className="w-4 h-4" />;
      case 'ocr': case 'text extraction (ocr)': return <Eye className="w-4 h-4" />;
      case 'analysis': case 'ai analysis': return <Brain className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  }

  render() {
    if (this.state.hasError) {
      const { title, message, stage, suggestions, canFallback } = this.getErrorAnalysis();
      const canRetry = this.state.retryCount < this.maxRetries;
      const documentName = this.props.documentName || 'document';

      return (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center text-orange-800">
                <AlertCircle className="w-5 h-5 mr-2" />
                {title}
              </CardTitle>
              <Badge variant="secondary" className="flex items-center">
                {this.getStageIcon(stage)}
                <span className="ml-1 text-xs">{stage}</span>
              </Badge>
            </div>
            <CardDescription className="text-orange-700">
              Failed to process: <span className="font-medium">{documentName}</span>
            </CardDescription>
            <p className="text-sm text-orange-700 mt-2">{message}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {suggestions.length > 0 && (
              <div>
                <h4 className="font-medium text-orange-800 mb-2">Troubleshooting:</h4>
                <ul className="list-disc list-inside text-sm text-orange-700 space-y-1">
                  {suggestions.map((suggestion, index) => (
                    <li key={index}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {canRetry && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={this.handleRetry}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry Processing ({this.maxRetries - this.state.retryCount} left)
                </Button>
              )}
              
              {canFallback && !this.state.fallbackAttempted && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={this.handleFallbackToManual}
                  className="border-orange-300 text-orange-700 hover:bg-orange-100"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Enter Issues Manually
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={this.handleReset}
                className="text-orange-700 hover:bg-orange-100"
              >
                Try Different Document
              </Button>
            </div>

            {/* Show processing stages for context */}
            <div className="border-t border-orange-200 pt-3 mt-4">
              <p className="text-xs text-orange-600 mb-2">Processing Pipeline:</p>
              <div className="flex items-center space-x-2 text-xs">
                <Badge variant={stage.includes('Upload') ? 'destructive' : 'secondary'} className="text-xs">
                  <FileText className="w-3 h-3 mr-1" />
                  Upload
                </Badge>
                <span className="text-orange-400">→</span>
                <Badge variant={stage.includes('OCR') ? 'destructive' : 'secondary'} className="text-xs">
                  <Eye className="w-3 h-3 mr-1" />
                  OCR
                </Badge>
                <span className="text-orange-400">→</span>
                <Badge variant={stage.includes('Analysis') ? 'destructive' : 'secondary'} className="text-xs">
                  <Brain className="w-3 h-3 mr-1" />
                  Analysis
                </Badge>
              </div>
            </div>

            {/* Debug info in development */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4">
                <summary className="text-sm text-orange-600 cursor-pointer">
                  Technical Details (Dev Only)
                </summary>
                <pre className="mt-2 text-xs text-orange-600 bg-orange-100 p-2 rounded overflow-auto">
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