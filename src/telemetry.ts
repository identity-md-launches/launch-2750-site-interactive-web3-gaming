import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE, type Economy, type Status } from "./model";

type Feed<T> = {
  data: T | null;
  error: string | null;
  fetchedAt: number | null;
};
async function read<T>(path: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    signal,
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  if (
    path.endsWith("/status") &&
    (!data.measurement ||
      !Number.isFinite(data.measurement.rpmMilli) ||
      !Number.isFinite(data.measurement.speedMmPerSecond) ||
      !data.builder)
  )
    throw new Error("Unexpected telemetry response");
  if (
    path.endsWith("/state") &&
    (data.status !== "available" ||
      !data.staking?.rewards ||
      !data.nft?.basePower ||
      !data.asset ||
      !data.chain ||
      !data.supply)
  )
    throw new Error("Economy unavailable");
  return data;
}
export function useTelemetry() {
  const [status, setStatus] = useState<Feed<Status>>({
    data: null,
    error: null,
    fetchedAt: null,
  });
  const [economy, setEconomy] = useState<Feed<Economy>>({
    data: null,
    error: null,
    fetchedAt: null,
  });
  const [now, setNow] = useState(Date.now());
  const [retry, setRetry] = useState(0);
  const controllers = useRef(new Set<AbortController>());
  useEffect(() => {
    let cancelled = false;
    let busy = false;
    let tick = 0;
    const poll = async () => {
      if (busy || document.hidden) return;
      busy = true;
      const controller = new AbortController();
      controllers.current.add(controller);
      const timeout = window.setTimeout(() => controller.abort(), 8000);
      const update = async <T>(
        path: string,
        set: React.Dispatch<React.SetStateAction<Feed<T>>>,
      ) => {
        try {
          const data = await read<T>(path, controller.signal);
          if (!cancelled) set({ data, error: null, fetchedAt: Date.now() });
        } catch {
          if (!cancelled)
            set((old) => ({ ...old, error: "Connection interrupted" }));
        }
      };
      await Promise.all([
        update<Status>("/v1/status", setStatus),
        ...(tick++ % 5 === 0
          ? [update<Economy>("/v1/economy/state", setEconomy)]
          : []),
      ]);
      clearTimeout(timeout);
      controllers.current.delete(controller);
      busy = false;
    };
    void poll();
    const interval = setInterval(() => void poll(), 2000);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    const visible = () => {
      if (!document.hidden) {
        tick = 0;
        void poll();
      }
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      cancelled = true;
      clearInterval(interval);
      clearInterval(clock);
      document.removeEventListener("visibilitychange", visible);
      controllers.current.forEach((c) => c.abort());
      controllers.current.clear();
    };
  }, [retry]);
  const observed = status.data
    ? Date.parse(status.data.measurement.observedAt)
    : 0;
  const fault = status.data?.measurement.coreStatus === "COUNTER_FAULT";
  const age = status.fetchedAt
    ? Math.max(0, Math.floor((now - status.fetchedAt) / 1000))
    : null;
  const stale =
    !!status.data &&
    (!Number.isFinite(observed) ||
      now - observed >
        (status.data.measurement.staleAfterSeconds || 120) * 1000 ||
      status.data.measurement.freshness !== "online" ||
      !!status.error ||
      (age ?? 0) > 10);
  const economyStale =
    !!economy.error ||
    (!!economy.data &&
      (now - Date.parse(economy.data.generatedAt) > 120000 ||
        now - (economy.fetchedAt ?? 0) > 30000));
  return {
    status: status.data,
    economy: economy.data,
    stale,
    fault,
    economyStale,
    age,
    loading: !status.data && !status.error,
    error: status.error,
    economyError: economy.error,
    now,
    retry: useCallback(() => setRetry((n) => n + 1), []),
  };
}
export type Telemetry = ReturnType<typeof useTelemetry>;
