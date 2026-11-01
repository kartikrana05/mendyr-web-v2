"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { api, ApiError } from "@/lib/api";

interface State<T> {
  path: string | null;
  data?: T;
  error?: ApiError;
}

function toApiError(error: unknown): ApiError {
  return error instanceof ApiError ? error : new ApiError("Something went wrong.", 0, "unknown");
}

// Last good response per path, so returning to a screen shows its data instantly while it
// refreshes in the background. Cleared on sign-out.
const memory = new Map<string, unknown>();

export function clearApiMemory() {
  memory.clear();
}

/**
 * GET `path` and keep the result. Pass `null` to skip fetching (e.g. until a dependency is
 * ready). With `pollMs`, refetches on an interval while the tab is visible, and right away
 * when it becomes visible again. Next keeps hidden routes mounted but runs their effect
 * cleanups, so polling also stops off-screen. Refetches keep showing the previous (or
 * remembered) data instead of flashing a skeleton.
 */
export function useApi<T>(path: string | null, { pollMs }: { pollMs?: number } = {}) {
  const [state, setState] = useState<State<T>>(() => ({
    path,
    data: path ? (memory.get(path) as T | undefined) : undefined,
  }));
  // Only the newest request may write state, so a slow older response can't win.
  const latest = useRef(0);

  const fetchInto = useCallback((forPath: string) => {
    const request = ++latest.current;
    return api<T>(forPath).then(
      (data) => {
        memory.set(forPath, data);
        if (request === latest.current) setState({ path: forPath, data });
      },
      (error: unknown) => {
        if (request !== latest.current) return;
        setState((previous) => ({
          path: forPath,
          data: previous.path === forPath ? previous.data : (memory.get(forPath) as T | undefined),
          error: toApiError(error),
        }));
      },
    );
  }, []);

  useEffect(() => {
    if (path === null) return;
    void fetchInto(path);
    if (!pollMs) return;
    const tick = () => {
      if (document.visibilityState === "visible") void fetchInto(path);
    };
    const timer = setInterval(tick, pollMs);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [path, pollMs, fetchInto]);

  const reload = useCallback(async () => {
    if (path !== null) await fetchInto(path);
  }, [path, fetchInto]);
  const mutate = useCallback(
    (data: T) => {
      if (path !== null) memory.set(path, data);
      setState({ path, data });
    },
    [path],
  );

  const current: State<T> =
    state.path === path ? state : { path, data: path ? (memory.get(path) as T | undefined) : undefined };
  return {
    data: current.data,
    error: current.error,
    loading: path !== null && current.data === undefined && current.error === undefined,
    reload,
    mutate,
  };
}

/** The current time, refreshed every `intervalMs` — for UI that unlocks at a given moment. */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
