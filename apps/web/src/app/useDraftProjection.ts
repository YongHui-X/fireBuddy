import { useMemo } from 'react';
import { calculateRetirement, validateRetirementPlan, type FireCalculationResult, type RetirementPlan } from '@firebuddy/shared';

/**
 * Preview the outcome of an unsaved plan with the same engine that runs after activation.
 * Pass null to skip the work on steps that do not show the preview. Returns null when the
 * draft is not yet valid, so the caller can explain what is missing instead of showing zeros.
 */
export function useDraftProjection(plan: RetirementPlan | null, startingAssets: number, asOf: string): FireCalculationResult | null {
  return useMemo(() => {
    if (!plan || validateRetirementPlan(plan, asOf)) return null;
    try {
      const result = calculateRetirement(plan, startingAssets, asOf);
      return result.fundingStatus === 'review_required' ? null : result;
    } catch {
      return null;
    }
  }, [plan, startingAssets, asOf]);
}
