"use client";

import { useMemo, useSyncExternalStore } from "react";

export type TourStatus = "idle" | "running" | "paused";

export type TourState = {
  status: TourStatus;
  step: number;
  furthest: number;
  completed: boolean;
  introduced: boolean;
  roadmapOpen: boolean;
  /** Cross-page move in flight: the current step stays visible until `navigatingTo` is mounted. */
  navigatingTo: string | null;
  navigatingFrom: string | null;
  pendingStep: number | null;
};

type Persisted = Pick<TourState, "status" | "step" | "furthest" | "completed" | "introduced">;

const STORAGE_PREFIX = "sam.tour.v1";

const DEFAULT_STATE: TourState = {
  status: "idle",
  step: 0,
  furthest: -1,
  completed: false,
  introduced: false,
  roadmapOpen: false,
  navigatingTo: null,
  navigatingFrom: null,
  pendingStep: null,
};

type Listener = () => void;

type TourStore = {
  get: () => TourState;
  set: (patch: Partial<TourState> | ((state: TourState) => Partial<TourState>)) => void;
  subscribe: (listener: Listener) => () => void;
};

const stores = new Map<string, TourStore>();

function readPersisted(key: string): Partial<Persisted> {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    return {
      status: parsed.status === "running" || parsed.status === "paused" ? parsed.status : "idle",
      step: Number.isInteger(parsed.step) ? parsed.step : 0,
      furthest: Number.isInteger(parsed.furthest) ? parsed.furthest : -1,
      completed: Boolean(parsed.completed),
      introduced: Boolean(parsed.introduced),
    };
  } catch {
    return {};
  }
}

function createStore(userId: string): TourStore {
  const key = `${STORAGE_PREFIX}:${userId}`;
  let state: TourState = { ...DEFAULT_STATE, ...readPersisted(key) };
  const listeners = new Set<Listener>();
  return {
    get: () => state,
    set: (patch) => {
      const next = typeof patch === "function" ? patch(state) : patch;
      state = { ...state, ...next };
      try {
        const persisted: Persisted = {
          status: state.status,
          step: state.step,
          furthest: state.furthest,
          completed: state.completed,
          introduced: state.introduced,
        };
        window.localStorage.setItem(key, JSON.stringify(persisted));
      } catch {
        /* storage unavailable: the tour still works for this session */
      }
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

function storeFor(userId: string) {
  let store = stores.get(userId);
  if (!store) {
    store = createStore(userId);
    stores.set(userId, store);
  }
  return store;
}

const serverSnapshot = () => DEFAULT_STATE;
const noopSubscribe = () => () => {};

export function useTourStore(userId: string) {
  const store = useMemo(() => (typeof window === "undefined" ? null : storeFor(userId)), [userId]);
  const state = useSyncExternalStore(
    store?.subscribe ?? noopSubscribe,
    store?.get ?? serverSnapshot,
    serverSnapshot,
  );
  const set = useMemo(() => store?.set ?? (() => {}), [store]);
  return [state, set] as const;
}
