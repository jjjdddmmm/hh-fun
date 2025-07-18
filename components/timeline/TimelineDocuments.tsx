// Timeline Documents Component - Placeholder
// TODO: Implement document management functionality

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TimelineWithRelations } from "@/lib/types/timeline";

interface TimelineDocumentsProps {
  timeline: TimelineWithRelations;
  onDocumentUpdate: () => void;
}

export function TimelineDocuments({ timeline, onDocumentUpdate }: TimelineDocumentsProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Documents</CardTitle>
              <p className="text-sm text-gray-600">
                Upload and manage documents for your home purchase
              </p>
            </div>
            <Button
              style={{ backgroundColor: '#5C1B10', color: 'white' }}
              onClick={() => {
                // TODO: Implement document upload
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Documents Yet</h3>
            <p className="text-gray-600 mb-4">
              Upload documents related to your home purchase for easy access.
            </p>
            <Button
              style={{ backgroundColor: '#5C1B10', color: 'white' }}
              onClick={() => {
                // TODO: Implement document upload
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Upload First Document
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}