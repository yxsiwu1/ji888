import type { Holding } from '../types';

const STORAGE_KEY = 'fundMatrix_holdings';

export const loadHoldings = (): Holding[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

export const saveHoldings = (holdings: Holding[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings));
};
