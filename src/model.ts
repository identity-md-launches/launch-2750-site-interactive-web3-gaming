export interface Status {
  generatedAt: string;
  measurement: {
    freshness: string;
    observedAt: string;
    staleAfterSeconds: number;
    cumulativeWorkUnits: string;
    coreStatus: string;
    rpmMilli: number;
    speedMmPerSecond: number;
    provenance: string;
  };
  builder: {
    status: string;
    projected?: {
      blockHeight: string;
      blockProgress: string;
      lifecycle: string;
    };
    anchor?: { blockHeight: string; blockProgress: string };
  };
}
export interface Economy {
  status: string;
  generatedAt: string;
  chain: {
    chainId: string;
    indexedThroughBlock: string;
    safeThroughBlock: string;
  };
  asset: { decimals: number; symbol: string };
  supply: { miningMintedBaseUnits: string };
  staking: {
    totalNftPower: string;
    totalSqkPower: string;
    sqkPerPower: string;
    referencePower: string;
    paused: boolean;
    rewards: {
      streamRateBaseUnitsPerSecond: string;
      streamEndsAt: string;
      remainingBaseUnits: string;
    };
  };
  nft: {
    maximumLevel: number;
    cooldownBlocks: string[];
    basePower: string[];
    mergesOpen: boolean;
  };
}
export const API_BASE = "https://api.squeekchain.com";
// Public API uses ACTIVE for a spinning wheel; SPINNING remains a supported alias.
export function wheelState(status?: string) {
  if (status === "ACTIVE" || status === "SPINNING") return "spinning";
  if (status === "IDLE") return "idle";
  if (status === "COUNTER_FAULT") return "fault";
  return "unknown";
}
export const format = (n: number | null | undefined, digits = 0) =>
  n == null || !Number.isFinite(n)
    ? "—"
    : new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(
        n,
      );
export function units(value: string | undefined, decimals = 18): number | null {
  if (value === undefined || !/^\d+$/.test(value)) return null;
  // All on-chain amounts stay in integer base units until display conversion.
  const padded = value.padStart(decimals + 1, "0");
  return Number(
    decimals
      ? `${padded.slice(0, -decimals)}.${padded.slice(-decimals)}`
      : value,
  );
}
export function power(p: number, s: number, c: number) {
  return p + (s * (1 + p / 1000)) / c;
}
export function rewardEstimate(
  p: number,
  s: number,
  economy: Economy | null,
  now = Date.now(),
) {
  const c = units(economy?.staking.sqkPerPower);
  if (!economy || c == null || c <= 0) return null;
  const weight = power(p, s, c);
  const other =
    (units(economy.staking.totalNftPower) ?? 0) +
    (units(economy.staking.totalSqkPower) ?? 0);
  const share = weight / (other + weight || 1);
  const seconds = Math.max(
    0,
    Math.min(86400, Number(economy.staking.rewards.streamEndsAt) - now / 1000),
  );
  const rate =
    units(
      economy.staking.rewards.streamRateBaseUnitsPerSecond,
      economy.asset.decimals,
    ) ?? 0;
  const remaining =
    units(economy.staking.rewards.remainingBaseUnits, economy.asset.decimals) ??
    0;
  const dailyPool = economy.staking.paused
    ? 0
    : Math.min(rate * seconds, remaining);
  return { weight, share, daily: dailyPool * share, dailyPool, other, c };
}
export const RACE_LENGTH = 5000;
export type RaceState = {
  distances: number[];
  speeds: number[];
  elapsed: number;
  running: boolean;
  winner: number | null;
  taps: number;
};
export const newRace = (): RaceState => ({
  distances: [0, 0, 0, 0],
  speeds: [0, 0, 0, 0],
  elapsed: 0,
  running: false,
  winner: null,
  taps: 0,
});
export function stepRace(
  state: RaceState,
  dt: number,
  hardwareSpeed: number,
  input: number,
): RaceState {
  if (!state.running) return state;
  const elapsed = state.elapsed + dt;
  const speeds = [
    Math.max(0, hardwareSpeed),
    145 + 25 * Math.sin(elapsed * 0.7),
    165 + 20 * Math.cos(elapsed * 0.9),
    Math.max(0, state.speeds[3] * Math.exp(-dt * 2.4)) + input * 65,
  ];
  speeds[3] = Math.min(650, speeds[3]);
  const distances = state.distances.map((distance, i) =>
    Math.min(RACE_LENGTH, distance + speeds[i] * dt),
  );
  let winner = distances.some((d) => d >= RACE_LENGTH)
    ? distances.indexOf(Math.max(...distances))
    : null;
  // If two lanes cross in one frame, the smallest crossing time wins.
  if (winner !== null)
    winner = speeds
      .map((speed, i) =>
        speed > 0 ? (RACE_LENGTH - state.distances[i]) / speed : Infinity,
      )
      .reduce((best, time, i, times) => (time < times[best] ? i : best), 0);
  return {
    distances,
    speeds,
    elapsed,
    running: winner === null,
    winner,
    taps: state.taps + input,
  };
}
