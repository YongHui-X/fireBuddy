import { createContext, useContext } from 'react';
import {
  type CreateWealthContributionInput,
  type CreateWealthPositionInput,
  type CreateWealthSnapshotInput,
  type FinancialSummary,
  type FireCalculationResult,
  type FireProfile,
  type FireScenarioRequest,
  type UpdateFireProfileInput,
  type UpdateWealthPositionInput,
  type WealthContribution,
  type WealthPosition,
  type WealthPositionSnapshot,
} from '@firebuddy/shared';

export type FoundationStatus = 'loading' | 'ready' | 'error';

export interface FinancialFoundationContextValue {
  positions: WealthPosition[];
  snapshots: WealthPositionSnapshot[];
  contributions: WealthContribution[];
  profile: FireProfile | null;
  essentialCategoryIds: string[];
  summary: FinancialSummary | null;
  status: FoundationStatus;
  error: string | null;
  demoMode: boolean;
  refresh: () => Promise<void>;
  loadSnapshotHistory: () => void;
  addPosition: (input: CreateWealthPositionInput, snapshot?: CreateWealthSnapshotInput) => Promise<void>;
  editPosition: (id: string, input: UpdateWealthPositionInput) => Promise<void>;
  removePosition: (id: string) => Promise<void>;
  addSnapshot: (positionId: string, input: CreateWealthSnapshotInput) => Promise<void>;
  removeSnapshot: (positionId: string, snapshotId: string) => Promise<void>;
  addContribution: (input: CreateWealthContributionInput) => Promise<void>;
  removeContribution: (id: string) => Promise<void>;
  updateProfile: (input: UpdateFireProfileInput) => Promise<void>;
  updateEssentialCategories: (ids: string[]) => Promise<void>;
  runScenario: (input: FireScenarioRequest) => Promise<FireCalculationResult>;
}

export const FinancialFoundationContext = createContext<FinancialFoundationContextValue | null>(null);

export function useFinancialFoundation() {
  const context = useContext(FinancialFoundationContext);
  if (!context) throw new Error('useFinancialFoundation must be used inside FinancialFoundationProvider');
  return context;
}
