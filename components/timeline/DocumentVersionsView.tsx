// Document Versions View - Production Ready, Zero Tech Debt
// UI component for displaying document completion sessions and versions

"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  FileText, 
  Download, 
  Clock, 
  Star, 
  Archive, 
  Eye,
  ArrowUp,
  AlertCircle,
  Calendar,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { DocumentWithVersionInfo, DocumentCompletionSession } from "@/lib/services/DocumentVersionService";

interface DocumentVersionsViewProps {
  stepId: string;
  currentDocuments: DocumentWithVersionInfo[];
  previousSessions: Array<{
    session: DocumentCompletionSession;
    documents: DocumentWithVersionInfo[];
  }>;
  onPromoteDocument: (documentId: string) => Promise<void>;
  onDownload: (document: DocumentWithVersionInfo) => void;
}

export function DocumentVersionsView({
  stepId,
  currentDocuments,
  previousSessions,
  onPromoteDocument,
  onDownload
}: DocumentVersionsViewProps) {
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [promotingDocument, setPromotingDocument] = useState<string | null>(null);

  const toggleSession = (sessionId: string) => {
    const newExpanded = new Set(expandedSessions);
    if (newExpanded.has(sessionId)) {
      newExpanded.delete(sessionId);
    } else {
      newExpanded.add(sessionId);
    }
    setExpandedSessions(newExpanded);
  };

  const handlePromoteDocument = async (documentId: string) => {
    setPromotingDocument(documentId);
    try {
      await onPromoteDocument(documentId);
    } finally {
      setPromotingDocument(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getDocumentTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'contract': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'financial': return 'bg-green-100 text-green-800 border-green-200';
      case 'inspection': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'appraisal': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'insurance': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const DocumentCard = ({ 
    document, 
    isCurrent = false, 
    showPromote = false 
  }: { 
    document: DocumentWithVersionInfo; 
    isCurrent?: boolean;
    showPromote?: boolean;
  }) => (
    <Card className={`transition-all duration-200 ${isCurrent ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1 min-w-0">
            <FileText className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isCurrent ? 'text-green-600' : 'text-gray-500'}`} />
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h4 className="font-medium text-gray-900 truncate">
                  {document.originalName}
                </h4>
                
                {isCurrent && (
                  <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                    <Star className="w-3 h-3 mr-1" />
                    Current
                  </Badge>
                )}
                
                <Badge className={getDocumentTypeColor(document.documentType)}>
                  {document.documentType}
                </Badge>
                
                {document.documentVersion > 1 && (
                  <Badge variant="outline" className="text-xs">
                    v{document.documentVersion}
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center space-x-4 text-sm text-gray-500 mb-2">
                <span>{formatFileSize(Number(document.fileSize))}</span>
                <span className="flex items-center">
                  <Calendar className="w-3 h-3 mr-1" />
                  {new Date(document.createdAt).toLocaleDateString()}
                </span>
                {document.supersededAt && (
                  <span className="flex items-center text-orange-600">
                    <Archive className="w-3 h-3 mr-1" />
                    Superseded {new Date(document.supersededAt).toLocaleDateString()}
                  </span>
                )}
              </div>
              
              {document.description && (
                <p className="text-sm text-gray-600 mb-2">{document.description}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2 flex-shrink-0">
            {showPromote && !isCurrent && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePromoteDocument(document.id)}
                disabled={promotingDocument === document.id}
                className="text-xs"
              >
                <ArrowUp className="w-3 h-3 mr-1" />
                {promotingDocument === document.id ? 'Promoting...' : 'Make Current'}
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDownload(document)}
              className="text-xs"
            >
              <Download className="w-3 h-3 mr-1" />
              Download
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Current Documents Section */}
      {currentDocuments.length > 0 && (
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Current Documents</h3>
            <Badge className="bg-green-100 text-green-800 border-green-200">
              {currentDocuments.length} active
            </Badge>
            {currentDocuments[0]?.sessionInfo && (
              <span className="text-sm text-gray-500">
                Session {currentDocuments[0].sessionInfo.sessionNumber} of {currentDocuments[0].sessionInfo.totalSessions}
              </span>
            )}
          </div>
          
          <div className="space-y-3">
            {currentDocuments.map((document) => (
              <DocumentCard
                key={document.id}
                document={document}
                isCurrent={true}
                showPromote={false}
              />
            ))}
          </div>
        </div>
      )}

      {/* Previous Sessions Section */}
      {previousSessions.length > 0 && (
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Previous Versions</h3>
            <Badge variant="outline">
              {previousSessions.length} session{previousSessions.length !== 1 ? 's' : ''}
            </Badge>
          </div>

          <div className="space-y-4">
            {previousSessions.map(({ session, documents }) => (
              <Card key={session.id} className="border-orange-200 bg-orange-50">
                <CardHeader 
                  className="pb-3 cursor-pointer hover:bg-orange-100 transition-colors"
                  onClick={() => toggleSession(session.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {expandedSessions.has(session.id) ? (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      )}
                      <div>
                        <CardTitle className="text-base">
                          Session {session.sessionNumber} 
                          <span className="font-normal text-gray-600 ml-2">
                            ({session.documentCount} document{session.documentCount !== 1 ? 's' : ''})
                          </span>
                        </CardTitle>
                        <CardDescription className="flex items-center mt-1">
                          <Clock className="w-3 h-3 mr-1" />
                          Completed {new Date(session.createdAt).toLocaleDateString()} at{' '}
                          {new Date(session.createdAt).toLocaleTimeString()}
                        </CardDescription>
                      </div>
                    </div>
                    
                    <Badge variant="outline" className="bg-white">
                      {expandedSessions.has(session.id) ? 'Collapse' : 'Expand'}
                    </Badge>
                  </div>
                </CardHeader>

                {expandedSessions.has(session.id) && (
                  <CardContent className="pt-0">
                    <div className="border-t border-orange-200 pt-4">
                      <div className="space-y-3">
                        {documents.map((document) => (
                          <DocumentCard
                            key={document.id}
                            document={document}
                            isCurrent={false}
                            showPromote={true}
                          />
                        ))}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {currentDocuments.length === 0 && previousSessions.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Documents Yet</h3>
            <p className="text-gray-600">
              Documents uploaded when completing this step will appear here with full version history.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Help Info */}
      {(currentDocuments.length > 0 || previousSessions.length > 0) && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Document Version Control</p>
                <ul className="space-y-1 text-blue-700">
                  <li>• <strong>Current documents</strong> are used for negotiations and official processes</li>
                  <li>• <strong>Previous versions</strong> are kept for audit trail and can be promoted if needed</li>
                  <li>• Each time a step is re-completed, a new session is created</li>
                  <li>• You can promote any previous version to become the current version</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}