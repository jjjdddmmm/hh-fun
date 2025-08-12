// Custom hook for modal state management
// Extracted from the massive 2,963-line analysis component

import { useState, useCallback } from 'react';
import type { Property, ModalState } from '@/components/property-analysis/types';

interface UseModalStateReturn extends ModalState {
  openModal: (property: Property, tab?: 'offers') => void;
  closeModal: () => void;
  setActiveOfferTab: (tab: 'strategy') => void;
  setActiveModalTab: (tab: 'offers') => void;
  toggleInvestmentScore: () => void;
  openDealMaker: (property: Property) => void;
  closeDealMaker: () => void;
}

export const useModalState = (): UseModalStateReturn => {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showInvestmentScore, setShowInvestmentScore] = useState(false);
  const [activeOfferTab, setActiveOfferTab] = useState<'strategy'>('strategy');
  const [activeModalTab, setActiveModalTab] = useState<'offers'>('offers');
  const [showDealMaker, setShowDealMaker] = useState(false);

  const openModal = useCallback((property: Property, tab: 'offers' = 'offers') => {
    setSelectedProperty(property);
    setActiveModalTab(tab);
    setShowInvestmentScore(false);
    setActiveOfferTab('strategy');
  }, []);

  const closeModal = useCallback(() => {
    setSelectedProperty(null);
    setShowInvestmentScore(false);
    setActiveOfferTab('strategy');
    setActiveModalTab('offers');
  }, []);

  const toggleInvestmentScore = useCallback(() => {
    setShowInvestmentScore(prev => !prev);
  }, []);

  const openDealMaker = useCallback((property: Property) => {
    setSelectedProperty(property);
    setShowDealMaker(true);
  }, []);

  const closeDealMaker = useCallback(() => {
    setShowDealMaker(false);
    setSelectedProperty(null);
  }, []);

  const handleSetActiveOfferTab = useCallback((tab: 'strategy') => {
    setActiveOfferTab(tab);
  }, []);

  const handleSetActiveModalTab = useCallback((tab: 'offers') => {
    setActiveModalTab(tab);
  }, []);

  return {
    selectedProperty,
    showInvestmentScore,
    activeOfferTab,
    activeModalTab,
    showDealMaker,
    openModal,
    closeModal,
    setActiveOfferTab: handleSetActiveOfferTab,
    setActiveModalTab: handleSetActiveModalTab,
    toggleInvestmentScore,
    openDealMaker,
    closeDealMaker,
  };
};