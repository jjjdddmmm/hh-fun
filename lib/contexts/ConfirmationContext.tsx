"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { ConfirmationDialog, ConfirmationDialogProps } from "@/components/ui/confirmation-dialog";

interface ConfirmationOptions {
  title?: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  type?: "destructive" | "info";
}

interface ConfirmationContextType {
  confirm: (options: ConfirmationOptions) => Promise<boolean>;
}

const ConfirmationContext = createContext<ConfirmationContextType | undefined>(undefined);

export function useConfirmation() {
  const context = useContext(ConfirmationContext);
  if (context === undefined) {
    throw new Error("useConfirmation must be used within a ConfirmationProvider");
  }
  return context;
}

interface ConfirmationState extends ConfirmationOptions {
  isOpen: boolean;
  resolve?: (value: boolean) => void;
}

interface ConfirmationProviderProps {
  children: React.ReactNode;
}

export function ConfirmationProvider({ children }: ConfirmationProviderProps) {
  const [state, setState] = useState<ConfirmationState>({
    isOpen: false,
    description: "",
  });

  const confirm = useCallback((options: ConfirmationOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        ...options,
        isOpen: true,
        resolve,
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (state.resolve) {
      state.resolve(true);
    }
    setState(prev => ({ ...prev, isOpen: false, resolve: undefined }));
  }, [state.resolve]);

  const handleCancel = useCallback(() => {
    if (state.resolve) {
      state.resolve(false);
    }
    setState(prev => ({ ...prev, isOpen: false, resolve: undefined }));
  }, [state.resolve]);

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      handleCancel();
    }
  }, [handleCancel]);

  const value: ConfirmationContextType = {
    confirm,
  };

  return (
    <ConfirmationContext.Provider value={value}>
      {children}
      <ConfirmationDialog
        open={state.isOpen}
        onOpenChange={handleOpenChange}
        title={state.title}
        description={state.description}
        confirmText={state.confirmText}
        cancelText={state.cancelText}
        type={state.type}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmationContext.Provider>
  );
}