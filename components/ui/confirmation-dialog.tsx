"use client";

import * as React from "react";
import { AlertTriangle, Info } from "lucide-react";
import { Button } from "./button";
import { Dialog } from "./dialog";

export interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  type?: "destructive" | "info";
  onConfirm: () => void;
  onCancel?: () => void;
}

export const ConfirmationDialog = ({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel", 
  type = "info",
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) => {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    onOpenChange(false);
  };

  const Icon = type === "destructive" ? AlertTriangle : Info;
  const iconColor = type === "destructive" ? "text-red-600" : "text-blue-600";
  const confirmVariant = type === "destructive" ? "destructive" : "default";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <div className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
        <div className="fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%] w-full max-w-md">
          <div 
            className="bg-[#F2F2F2] border-2 border-[#020B0A] rounded-lg p-6 shadow-lg animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]"
            style={{
              boxShadow: "0px 2px 2px rgba(0, 0, 0, 0.15), inset 0px 4px 0px rgba(255, 255, 255, 0.2), inset 0px -5px 0px rgba(0, 0, 0, 0.15)"
            }}
          >
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <Icon className={`h-6 w-6 ${iconColor}`} />
              </div>
              <div className="flex-1">
                {title && (
                  <h3 className="text-lg font-medium text-[#020B0A] mb-2">
                    {title}
                  </h3>
                )}
                <p className="text-sm text-[#020B0A] mb-6">
                  {description}
                </p>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={handleCancel}
                    className="inline-flex items-center justify-center px-4 py-2 bg-white border-2 border-[#020B0A] rounded-md font-medium text-[#020B0A] transition-colors hover:bg-gray-50"
                    style={{
                      boxShadow: "0px 2px 2px rgba(0, 0, 0, 0.15), inset 0px 4px 0px rgba(255, 255, 255, 0.2), inset 0px -5px 0px rgba(0, 0, 0, 0.15)"
                    }}
                  >
                    {cancelText}
                  </button>
                  <button
                    onClick={handleConfirm}
                    className={`inline-flex items-center justify-center px-4 py-2 border-2 border-[#020B0A] rounded-md font-medium transition-colors ${
                      type === "destructive" 
                        ? "bg-red-600 text-white hover:bg-red-700" 
                        : "bg-[#FAD9D4] text-[#020B0A] hover:bg-[#F5C7C1]"
                    }`}
                    style={{
                      boxShadow: "0px 2px 2px rgba(0, 0, 0, 0.15), inset 0px 4px 0px rgba(255, 255, 255, 0.2), inset 0px -5px 0px rgba(0, 0, 0, 0.15)"
                    }}
                  >
                    {confirmText}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
};

