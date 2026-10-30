import { useCallback, useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "./icons";
import { useTelemetry, type Telemetry } from "./telemetry";
import { format, units, wheelState } from "./model";
import { Derby } from "./Derby";
import { SqueekFi } from "./SqueekFi";
import { Hud, Overlay } from "./Hud";
import { Wallet } from "./wallet";

function LiveBar({ telemetry }: { telemetry: Telemetry }) {
  const m = telemetry.status?.measurement;
  const activity = wheelState(m?.coreStatus);
  const projected =
    telemetry.status?.builder.projected ?? telemetry.status?.builder.anchor;
  const progress = projected
    ? Math.min(100, Math.max(0, Number(projected.blockProgress) / 1e7))
    : null;
  const state = telemetry.loading
    ? "Connecting"
    : !m
      ? "Offline"
      : telemetry.fault
        ? "Counter fault"
        : telemetry.stale
          ? "Feed stale"
          : activity === "spinning"
            ? "SPINNING 🔥"
            : activity === "idle"
              ? "IDLE 💤"
              : "Status unknown";
  return (
    <section className="telemetry" aria-label="Live Squeekchain telemetry">
      <div className="live-line">
        <div className="inline">
          <span
            className={`status-dot ${telemetry.stale || telemetry.error || telemetry.fault ? "neutral" : ""}`}
          />
          <strong>Squeekchain</strong>
          <span className="network-label muted small">Sepolia testnet</span>
        </div>
        <div className="inline live-state">
          <span className="small">{state}</span>
          <span className="feed-age small muted">
            {telemetry.age == null
              ? "Waiting for feed"
              : `Updated ${telemetry.age}s ago`}
          </span>
        </div>
      </div>
      <div className="metrics">
        <Metric
          label="Hamster RPM"
          value={format(m ? m.rpmMilli / 1000 : null, 1)}
          icon="wheel"
        />
        <Metric
          label="Rim speed"
          value={format(m?.speedMmPerSecond, 1)}
          unit="mm/s"
          icon="bolt"
        />
        <Metric
          label="Sepolia block"
          value={format(
            telemetry.economy
              ? Number(telemetry.economy.chain.indexedThroughBlock)
              : null,
          )}
          icon="link"
        />
        <div className="metric block-metric">
          <span className="metric-label small muted">
            Block progress
            <Icon name="chart" size={15} />
          </span>
          <div className="metric-value numeric">
            {format(progress, 1)}
            <span>%</span>
          </div>
          <div
            className="block-progress"
            role="progressbar"
            aria-label="Squeekchain block progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress ?? 0}
          >
            <span style={{ width: `${progress ?? 0}%` }} />
          </div>
        </div>
        <Metric
          label="Total work units"
          value={format(m ? Number(m.cumulativeWorkUnits) : null)}
          icon="settings"
        />
        <Metric
          label="SQK mined"
          value={format(
            units(
              telemetry.economy?.supply.miningMintedBaseUnits,
              telemetry.economy?.asset.decimals,
            ),
            0,
          )}
          icon="sun"
        />
      </div>
      {(telemetry.error ||
        telemetry.fault ||
        telemetry.stale ||
        telemetry.economyError ||
        telemetry.economyStale) && (
        <div className="feed-error small" role="status">
          <Icon name="info" size={16} />
          <span>
            {!m
              ? "Telemetry unavailable. The local race and simulator still work."
              : telemetry.fault
                ? "Hardware counter reports a fault. The live wheel and racer are stopped."
                : telemetry.stale
                  ? "Hardware feed is stale. Showing last known readings; the wheel and live racer are stopped."
                  : telemetry.economy
                    ? "Economy feed is unavailable or stale. Showing last known totals."
                    : "Economy feed is unavailable. Waiting for block and supply data."}
          </span>
          <button className="text-button" onClick={telemetry.retry}>
            Retry feed
          </button>
        </div>
      )}
    </section>
  );
}
function Metric({
  label,
  value,
  unit,
  icon,
}: {
  label: string;
  value: string;
  unit?: string;
  icon: IconName;
}) {
  return (
    <div className="metric">
      <span className="metric-label small muted">
        {label}
        <Icon name={icon} size={15} />
      </span>
      <div className="metric-value numeric">
        {value}
        {unit && <span>{unit}</span>}
      </div>
    </div>
  );
}

const tabs: {
  id: "derby" | "fi" | "hud";
  title: string;
  mobile: string;
  icon: IconName;
  number: string;
}[] = [
  {
    id: "derby",
    title: "Squeek Derby",
    mobile: "Derby",
    icon: "flag",
    number: "01",
  },
  {
    id: "fi",
    title: "SqueekFi lab",
    mobile: "SqueekFi",
    icon: "chart",
    number: "02",
  },
  {
    id: "hud",
    title: "Streamer HUD",
    mobile: "Stream HUD",
    icon: "screen",
    number: "03",
  },
];
function getTab() {
  const tab = new URLSearchParams(location.hash.slice(1)).get("tab");
  return tab === "fi" || tab === "hud" ? tab : "derby";
}
export default function App() {
  const telemetry = useTelemetry();
  const [tab, setTab] = useState<"derby" | "fi" | "hud">(getTab);
  const [overlay, setOverlay] = useState(
    new URLSearchParams(location.hash.slice(1)).get("overlay") === "1",
  );
  const [sound, setSound] = useState(false);
  const soundRef = useRef(false);
  soundRef.current = sound;
  const audio = useRef<AudioContext | null>(null);
  const [reduced, setReduced] = useState(
    matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const sfx = useCallback((kind: "start" | "tap" | "win" = "tap") => {
    if (!soundRef.current) return;
    try {
      const ctx = (audio.current ??= new AudioContext());
      void ctx.resume();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(
        kind === "tap" ? 520 : kind === "win" ? 660 : 330,
        ctx.currentTime,
      );
      oscillator.frequency.exponentialRampToValueAtTime(
        kind === "win" ? 1100 : 180,
        ctx.currentTime + 0.12,
      );
      gain.gain.setValueAtTime(0.055, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.17);
    } catch {
      setSound(false);
    }
  }, []);
  useEffect(() => {
    const update = () => {
      setTab(getTab());
      setOverlay(
        new URLSearchParams(location.hash.slice(1)).get("overlay") === "1",
      );
    };
    addEventListener("hashchange", update);
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const onMotion = () => setReduced(query.matches);
    query.addEventListener("change", onMotion);
    return () => {
      removeEventListener("hashchange", update);
      query.removeEventListener("change", onMotion);
      void audio.current?.close();
    };
  }, []);
  const select = (id: "derby" | "fi" | "hud") => {
    location.hash = `tab=${id}`;
    setTab(id);
  };
  if (overlay) return <Overlay telemetry={telemetry} />;
  return (
    <>
      <a
        className="skip-link"
        href="#content"
        onClick={(event) => {
          event.preventDefault();
          const content = document.getElementById("content");
          content?.focus({ preventScroll: true });
          content?.scrollIntoView();
        }}
      >
        Skip to playground
      </a>
      <header className="site-header">
        <a className="brand" href="#tab=derby" aria-label="Squeek Play home">
          <span className="brand-mark">
            <Icon name="wheel" size={31} />
          </span>
          <span>
            squeek<span className="brand-play">/ play</span>
            <span className="brand-dot">.</span>
          </span>
        </a>
        <div className="header-center small muted">
          A little hamster. A whole chain.
        </div>
        <div className="header-actions">
          <button
            className="icon-button audio-toggle"
            aria-label="Audio SFX"
            aria-pressed={sound}
            title={sound ? "Turn sound off" : "Turn sound on"}
            onClick={() => {
              soundRef.current = !sound;
              setSound(!sound);
              if (!sound) sfx("start");
            }}
          >
            <Icon name={sound ? "sound" : "muted"} size={20} />
          </button>
          <Wallet />
        </div>
      </header>
      <div className="page-shell">
        <main id="content" tabIndex={-1}>
          <LiveBar telemetry={telemetry} />
          <div className="playground-intro">
            <div>
              <h1>
                Tiny paws. <span>Serious horsepower.</span>
              </h1>
              <p className="muted">
                Your front-row seat to the hamster-powered ecosystem.
              </p>
            </div>
            <div className="intro-doodle" aria-hidden="true">
              <Icon name="bolt" size={29} />
              <span>
                100%
                <br />
                hamster energy
              </span>
              <svg viewBox="0 0 55 28" width="55" height="28">
                <path
                  d="M2 20c17 8 18-28 36-9m-8-2 10 3-1-10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
          <nav
            className="tab-nav"
            role="tablist"
            aria-label="Playground sections"
          >
            {tabs.map((t, i) => (
              <button
                role="tab"
                id={`tab-${t.id}`}
                aria-controls={`panel-${t.id}`}
                aria-selected={tab === t.id}
                tabIndex={tab === t.id ? 0 : -1}
                key={t.id}
                onClick={() => select(t.id)}
                onKeyDown={(e) => {
                  if (
                    ["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)
                  ) {
                    e.preventDefault();
                    const next =
                      e.key === "Home"
                        ? 0
                        : e.key === "End"
                          ? 2
                          : (i + (e.key === "ArrowRight" ? 1 : 2)) % 3;
                    select(tabs[next].id);
                    document.getElementById(`tab-${tabs[next].id}`)?.focus();
                  }
                }}
              >
                <Icon name={t.icon} size={19} />
                <span className="tab-desktop">{t.title}</span>
                <span className="tab-mobile">{t.mobile}</span>
                <span className="tab-number small numeric">{t.number}</span>
              </button>
            ))}
            <span className="tab-note small muted">
              <span className="status-dot" />
              Small paws, open possibilities.
            </span>
          </nav>
          <div className="section-content">
            <div
              role="tabpanel"
              id={`panel-${tab}`}
              aria-labelledby={`tab-${tab}`}
              key={tab}
            >
              {tab === "derby" ? (
                <Derby telemetry={telemetry} reduced={reduced} sfx={sfx} />
              ) : tab === "fi" ? (
                <SqueekFi telemetry={telemetry} />
              ) : (
                <Hud telemetry={telemetry} />
              )}
            </div>
          </div>
        </main>
        <footer className="site-footer">
          <a className="footer-brand inline" href="#tab=derby">
            <Icon name="wheel" size={19} />
            Built for the squeek of it.
          </a>
          <div className="footer-links">
            <a
              href="https://squeekchain.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              Squeekchain
              <Icon name="external" size={13} />
            </a>
            <a
              href="https://api.squeekchain.com/v1/status"
              target="_blank"
              rel="noopener noreferrer"
            >
              Telemetry API
              <Icon name="external" size={13} />
            </a>
            <span className="small muted">
              Independent companion · Sepolia testnet
            </span>
          </div>
        </footer>
      </div>
    </>
  );
}
