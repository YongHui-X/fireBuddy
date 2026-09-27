import type { FireCalculationResult, FireScenarioRequest, RetirementPlan } from '@firebuddy/shared';

/**
 * Tab-scoped memory for FIRE planner inputs that are not yet saved to the profile.
 *
 * Navigating to another tab unmounts the planner routes, and React state goes with them.
 * The setup wizard only writes to the server on an explicit save, so anything typed since then
 * used to be lost. sessionStorage survives in-app navigation and a refresh of the same tab, but
 * not closing the tab, which keeps unsaved planning numbers from lingering on a shared machine.
 * Entries are keyed by owner so a different account on the same tab never sees them.
 */

const SETUP_DRAFT_KEY = 'firebuddy_web_fire_setup_session_v1';
const SCENARIO_KEY = 'firebuddy_web_fire_scenario_session_v1';

export interface SetupSessionDraft {
  plan: RetirementPlan;
  step: number;
  incomeOverride: number | null;
  expensesOverride: number | null;
  savingsOverride: number | null;
  assetAmounts: Record<string, number>;
  /** `updatedAt` of the profile the draft was typed against, so a newer server draft wins. */
  profileUpdatedAt: string | null;
}

export type ScenarioOverrides = NonNullable<FireScenarioRequest['planOverrides']>;

export interface ScenarioSessionDraft {
  overrides: ScenarioOverrides;
  result: FireCalculationResult | null;
  /** Serialised saved-plan values the overrides were entered against; a changed plan discards them. */
  baselineKey: string;
}

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

function read<T>(key: string): T | null {
  try {
    const raw = storage()?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    storage()?.setItem(key, JSON.stringify(value));
  } catch {
    // Private windows and blocked site data fall back to in-memory behaviour only.
  }
}

function remove(key: string) {
  try {
    storage()?.removeItem(key);
  } catch {
    // Nothing to clear.
  }
}

const scoped = (key: string, ownerId: string) => `${key}:${ownerId}`;

/** Return the unsaved wizard state for this owner, or null when it is missing or stale. */
export function readSetupSessionDraft(ownerId: string, profileUpdatedAt: string | null): SetupSessionDraft | null {
  const draft = read<SetupSessionDraft>(scoped(SETUP_DRAFT_KEY, ownerId));
  if (!draft || draft.profileUpdatedAt !== profileUpdatedAt) return null;
  return draft;
}

export function writeSetupSessionDraft(ownerId: string, draft: SetupSessionDraft) {
  write(scoped(SETUP_DRAFT_KEY, ownerId), draft);
}

export function clearSetupSessionDraft(ownerId: string) {
  remove(scoped(SETUP_DRAFT_KEY, ownerId));
}

/** Return the scenario the owner was comparing, or null when the saved plan has changed since. */
export function readScenarioSessionDraft(ownerId: string, baselineKey: string): ScenarioSessionDraft | null {
  const draft = read<ScenarioSessionDraft>(scoped(SCENARIO_KEY, ownerId));
  if (!draft || draft.baselineKey !== baselineKey) return null;
  return draft;
}

export function writeScenarioSessionDraft(ownerId: string, draft: ScenarioSessionDraft) {
  write(scoped(SCENARIO_KEY, ownerId), draft);
}

export function clearScenarioSessionDraft(ownerId: string) {
  remove(scoped(SCENARIO_KEY, ownerId));
}
