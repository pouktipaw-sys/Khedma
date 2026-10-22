import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export type MotionPref = 'system' | 'on' | 'off';

interface MotionCtx {
  /** True when animations must be skipped / minimised. */
  reduced: boolean;
  pref: MotionPref;
  setPref: (p: MotionPref) => void;
}

const Ctx = createContext<MotionCtx>({ reduced: false, pref: 'system', setPref: () => {} });
const KEY = 'noa-motion';

const readPref = (): MotionPref => {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'on' || v === 'off' || v === 'system') return v;
  } catch {
    /* storage unavailable */
  }
  return 'system';
};

const systemReduced = (): boolean =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function MotionProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState<MotionPref>(readPref);
  const [sys, setSys] = useState<boolean>(systemReduced);

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const on = () => setSys(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);

  const reduced = pref === 'off' || (pref === 'system' && sys);

  useEffect(() => {
    const el = document.documentElement;
    el.dataset.reducedMotion = String(reduced);
  }, [reduced]);

  const setPref = useCallback((p: MotionPref) => {
    setPrefState(p);
    try {
      localStorage.setItem(KEY, p);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(() => ({ reduced, pref, setPref }), [reduced, pref, setPref]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useMotion = (): MotionCtx => useContext(Ctx);
