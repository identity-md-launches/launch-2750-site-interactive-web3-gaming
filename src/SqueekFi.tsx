import { useState } from "react";
import { Hamster, Icon } from "./icons";
import { format, power, rewardEstimate, units } from "./model";
import type { Telemetry } from "./telemetry";

// Public /v1/economy/state protocol parameters, retrieved 2026-10-30.
// These reference values keep the simulator useful offline; they are never live telemetry.
const REFERENCE_POWER = [
  1000, 2200, 4840, 10648, 23426, 51536, 113380, 249436, 548759, 1207269,
];
const REFERENCE_COOLDOWN = [
  0, 3000, 7000, 14000, 21000, 28000, 35000, 42000, 49000, 0,
];

export function SqueekFi({ telemetry }: { telemetry: Telemetry }) {
  const [p, setP] = useState(1000);
  const [s, setS] = useState(10000);
  const [level, setLevel] = useState(2);
  const [message, setMessage] = useState("");
  const { economy } = telemetry;
  const reference = !economy || telemetry.economyStale;
  const c = units(economy?.staking.sqkPerPower) || 40;
  const weight = power(p, s, c);
  const estimate = !reference
    ? rewardEstimate(p, s, economy, telemetry.now)
    : null;
  const powers = economy?.nft.basePower.map(Number) ?? REFERENCE_POWER;
  const cooldowns =
    economy?.nft.cooldownBlocks.map(Number) ?? REFERENCE_COOLDOWN;
  const max = Math.min(powers.length, economy?.nft.maximumLevel ?? 10);
  const maxPower = Math.max(...powers.slice(0, max));
  const selectedPower = powers[level - 1];
  const inputPower = level > 1 ? powers[level - 2] : 0;
  return (
    <>
      <div className="section-intro">
        <div>
          <h2>SqueekFi lab</h2>
          <p className="muted">Make the numbers work before you make a move.</p>
        </div>
        <span className="subtle-label">
          <Icon name="info" size={16} />
          Simulation only
        </span>
      </div>
      <div className="fi-grid">
        <section className="surface calculator" aria-labelledby="power-title">
          <div className="panel-heading">
            <div className="inline">
              <Icon name="chart" />
              <h2 id="power-title">Find your power</h2>
            </div>
          </div>
          <p className="muted">
            Combine NFT power and staked SQK to estimate your share of the
            reward stream.
          </p>
          <div className="slider-group">
            <div className="input-heading">
              <label id="nft-power-label" htmlFor="nft-power-value">
                NFT power <span className="muted">(P)</span>
              </label>
              <input
                id="nft-power-value"
                className="numeric power-input"
                type="number"
                aria-labelledby="nft-power-label"
                min="0"
                max={maxPower}
                step="1"
                value={p}
                onChange={(e) => {
                  const value = e.target.valueAsNumber;
                  if (Number.isFinite(value))
                    setP(Math.min(maxPower, Math.max(0, Math.round(value))));
                }}
              />
            </div>
            <input
              id="nft-power"
              type="range"
              aria-labelledby="nft-power-label"
              min="0"
              max={maxPower}
              step="1"
              value={p}
              onChange={(e) => setP(Number(e.target.value))}
            />
            <div className="range-ends small muted">
              <span>0</span>
              <span>{format(maxPower)} power</span>
            </div>
          </div>
          <div className="slider-group">
            <div className="input-heading">
              <label htmlFor="staked-sqk">
                Staked SQK <span className="muted">(S)</span>
              </label>
              <output className="numeric" htmlFor="staked-sqk">
                {format(s)}
              </output>
            </div>
            <input
              id="staked-sqk"
              type="range"
              min="0"
              max="100000"
              step="500"
              value={s}
              onChange={(e) => setS(Number(e.target.value))}
            />
            <div className="range-ends small muted">
              <span>0</span>
              <span>100,000 SQK</span>
            </div>
          </div>
          <div className="power-result">
            <div>
              <span className="small">Your total weight</span>
              <output
                className="result-value numeric"
                aria-live="polite"
                aria-label="Total power weight"
              >
                {format(weight, 2)}
                <span>W</span>
              </output>
            </div>
            <Icon name="bolt" size={48} />
          </div>
          <div className="reward-grid">
            <div>
              <span className="small muted">Estimated pool share</span>
              <strong className="numeric" data-testid="pool-share">
                {estimate ? `${format(estimate.share * 100, 3)}%` : "—"}
              </strong>
            </div>
            <div>
              <span className="small muted">Next 24h reward</span>
              <strong className="numeric" data-testid="daily-reward">
                {estimate ? format(estimate.daily, 4) : "—"}
                <span className="small"> SQK</span>
              </strong>
            </div>
          </div>
          <div className="formula small">
            <code>W = P + S × (1 + P / 1000) / c</code>
            <span className="muted">
              c = {format(c)} SQK per power ·{" "}
              {reference ? "reference parameters" : "live parameters"}
            </span>
          </div>
          <p className="small muted">
            {estimate?.dailyPool === 0
              ? "The current reward stream has no funded rewards to distribute. A future deposit can change this."
              : "Rewards use the funded stream remaining in the next 24 hours. Your weight is added to the current pool; existing wallet positions are not subtracted."}{" "}
            Estimates are variable, not guaranteed.
          </p>
          {reference && (
            <div className="inline-error small" role="status">
              Live economy unavailable. Reward estimates are paused.{" "}
              <button className="text-button" onClick={telemetry.retry}>
                Retry feed
              </button>
            </div>
          )}
        </section>
        <section className="surface merge-panel" aria-labelledby="merge-title">
          <div className="panel-heading">
            <div className="inline">
              <Icon name="wheel" />
              <h2 id="merge-title">Two become mighty</h2>
            </div>
            <span className="small muted">Merge simulator</span>
          </div>
          <p className="muted">
            Merge two equal-level NFTs into one stronger hamster. Choose a
            target level.
          </p>
          <div className="level-picker" aria-label="Target NFT level">
            {Array.from({ length: max }, (_, i) => (
              <button
                key={i}
                className={level === i + 1 ? "selected" : ""}
                aria-pressed={level === i + 1}
                onClick={() => {
                  setLevel(i + 1);
                  setMessage("");
                }}
                aria-label={`Level ${i + 1}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <div
            className="merge-tree"
            aria-label={
              level === 1
                ? "Base NFT, no merge needed"
                : `Two level ${level - 1} NFTs merge to level ${level}`
            }
          >
            {level > 1 && (
              <>
                <div className="merge-inputs">
                  {[0, 1].map((i) => (
                    <div className="merge-node" key={i}>
                      <Hamster color="#d6b47d" />
                      <span className="small">Level {level - 1}</span>
                      <strong className="numeric">
                        {format(inputPower)} P
                      </strong>
                    </div>
                  ))}
                </div>
                <div className="merge-branches" />
                <Icon name="arrow" style={{ rotate: "90deg" }} size={22} />
              </>
            )}
            <div className="merge-output">
              <Hamster color={level > 5 ? "#e4b056" : "#e9a15c"} variant={1} />
              <div>
                <span className="small">
                  Level {level} {level === max ? "· maximum tier" : ""}
                </span>
                <strong className="numeric">
                  {format(selectedPower)}
                  <span className="small"> power</span>
                </strong>
              </div>
            </div>
          </div>
          <div className="merge-stats">
            <div>
              <span className="small muted">Boost vs. two inputs</span>
              <strong className="numeric">
                {level > 1
                  ? `+${format((selectedPower / (inputPower * 2) - 1) * 100, 1)}%`
                  : "Base tier"}
              </strong>
            </div>
            <div>
              <span className="small muted">Tier cooldown</span>
              <strong className="numeric">
                {level === max
                  ? "Final tier"
                  : `${format(cooldowns[level - 1])} blocks`}
              </strong>
            </div>
          </div>
          <p className="small muted">
            Requires {format(2 ** (level - 1))} level-1{" "}
            {level === 1 ? "NFT" : "NFTs"} through{" "}
            {format(2 ** (level - 1) - 1)} {level === 2 ? "merge" : "merges"}.
            Cooldowns count Squeekchain blocks, not wall-clock time.
            {reference ? " Showing the published reference schedule." : ""}
          </p>
          <button
            className="button full"
            disabled={level === max}
            onClick={() => {
              setLevel((l) => Math.min(l + 1, max));
              setMessage(
                `Simulated two level ${level} NFTs merging into level ${level + 1}.`,
              );
            }}
          >
            <Icon name="bolt" size={17} />
            {level === max ? "Maximum level reached" : "Simulate next merge"}
          </button>
          <p className="small merge-message" role="status">
            {message ||
              (economy?.nft.mergesOpen === false
                ? "On-chain merging is currently closed. Preview any tier here."
                : "Preview only. No NFTs are burned and no SQK is spent.")}
          </p>
        </section>
      </div>
    </>
  );
}
