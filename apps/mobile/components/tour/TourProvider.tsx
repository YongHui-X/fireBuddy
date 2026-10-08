import { TOUR_STEPS, type TourTargetId } from '@firebuddy/shared';
import { useRouter } from 'expo-router';
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import type { View } from 'react-native';

import { useUserProfile } from '@/lib/user-profile';

interface TourContextValue {
  /** Index into `TOUR_STEPS` while the tour runs, null otherwise. */
  stepIndex: number | null;
  active: boolean;
  /** Opens Home and starts DouDou's tour from the first step. */
  startTour: () => void;
  next: () => void;
  /** One step back; does nothing on the first step. */
  back: () => void;
  /** Skip, Done and the Android back button all end the tour and remember it. */
  finish: () => void;
  /** The view a step points at, if its component is mounted. */
  getTarget: (id: TourTargetId) => View | null;
  register: (id: TourTargetId, node: View | null) => void;
}

const TourContext = createContext<TourContextValue | null>(null);

/**
 * Owns DouDou's spotlight tour: which step is showing and the registry of views it points at.
 * Components that draw a tour target call `useTourTarget(id)` and spread the result on their view;
 * `TourOverlay` measures that view on each step.
 */
export function TourProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { completeTour } = useUserProfile();
  const [stepIndex, setStepIndex] = useState<number | null>(null);
  const targets = useRef(new Map<TourTargetId, View>());

  const register = useCallback((id: TourTargetId, node: View | null) => {
    if (node) targets.current.set(id, node);
    else targets.current.delete(id);
  }, []);
  const getTarget = useCallback((id: TourTargetId) => targets.current.get(id) ?? null, []);

  const startTour = useCallback(() => {
    // Every step points at Home or the tab bar, so start from Home whichever screen asked.
    router.navigate('/');
    setStepIndex(0);
  }, [router]);

  const finish = useCallback(() => {
    setStepIndex(null);
    completeTour();
  }, [completeTour]);

  const back = useCallback(() => {
    setStepIndex((current) => (current === null || current === 0 ? current : current - 1));
  }, []);

  const next = useCallback(() => {
    if (stepIndex === null) return;
    if (stepIndex >= TOUR_STEPS.length - 1) finish();
    else setStepIndex(stepIndex + 1);
  }, [stepIndex, finish]);

  const value = useMemo<TourContextValue>(
    () => ({ stepIndex, active: stepIndex !== null, startTour, next, back, finish, getTarget, register }),
    [stepIndex, startTour, next, back, finish, getTarget, register],
  );
  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

export function useTour() {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within TourProvider');
  }
  return context;
}

/**
 * Marks a view as a tour target. Spread the result on the view: `<Pressable {...useTourTarget('add')}>`.
 * `collapsable={false}` keeps Android from flattening the view away, so it can be measured.
 */
export function useTourTarget(id: TourTargetId) {
  const { register } = useTour();
  const ref = useCallback((node: View | null) => register(id, node), [register, id]);
  return { ref, collapsable: false } as const;
}
