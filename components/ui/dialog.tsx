"use client"

import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

interface DialogContentProps {
  className?: string
  children: React.ReactNode
}

interface DialogHeaderProps {
  className?: string
  children: React.ReactNode
}

interface DialogTitleProps {
  className?: string
  children: React.ReactNode
}

interface DialogDescriptionProps {
  className?: string
  children: React.ReactNode
}

const Dialog = ({ open, onOpenChange, children }: DialogProps) => {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={() => onOpenChange?.(false)}
      />
      <div className="relative z-50 w-full max-w-2xl mx-auto p-4">
        {children}
      </div>
    </div>
  )
}

const DialogContent = ({ className, children }: DialogContentProps) => (
  <div className={cn(
    "bg-white rounded-lg shadow-xl p-6 w-full max-h-[90vh] overflow-y-auto",
    className
  )}>
    {children}
  </div>
)

const DialogHeader = ({ className, children }: DialogHeaderProps) => (
  <div className={cn("mb-4", className)}>
    {children}
  </div>
)

const DialogTitle = ({ className, children }: DialogTitleProps) => (
  <h2 className={cn("text-xl font-semibold", className)}>
    {children}
  </h2>
)

const DialogDescription = ({ className, children }: DialogDescriptionProps) => (
  <p className={cn("text-sm text-gray-600 mt-2", className)}>
    {children}
  </p>
)

const DialogTrigger = ({ children }: { children: React.ReactNode }) => (
  <>{children}</>
)

export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger }