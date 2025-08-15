"use client";

import React from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import AppNavigation from "@/components/app-navigation";
import AppFooter from "@/components/app-footer";
import { PropertyAnalysisContainer } from "@/components/analysis/PropertyAnalysisContainer";

/**
 * Property Analysis Page
 * 
 * This page has been completely refactored from a monolithic 1,668-line component
 * into a clean, modular architecture with:
 * - Centralized type definitions
 * - Custom hooks for business logic
 * - Reusable components
 * - Proper error boundaries
 * - Improved accessibility
 */
export default function PropertyAnalysisPage() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <AppNavigation />
        <PropertyAnalysisContainer />
        <AppFooter />
      </div>
    </ErrorBoundary>
  );
}