import { cn } from "@/lib/utils";
import React from "react";

interface SectionHeaderProps {
  children: React.ReactNode;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'span' | 'div';
}

export function SectionHeader({ children, className, as: Component = 'h2' }: SectionHeaderProps) {
  return (
    <Component className={cn("text-xl font-medium text-gray-900 tracking-wide", className)}>
      {children}
    </Component>
  );
}