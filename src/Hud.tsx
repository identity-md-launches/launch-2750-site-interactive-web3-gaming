import { useEffect, useRef, useState } from "react";
import { Icon } from "./icons";
import { format, wheelState } from "./model";
import type { Telemetry } from "./telemetry";

type HudTheme = "dark" | "light" | "transparent";
export function HudDisplay({
  telemetry,
  theme,
  compact,
  showEconomy,
}: {
  telemetry: Telemetry;
  theme: HudTheme;
  compact: boolean;
  showEconomy: boolean;
}) {
  const measurement = telemetry.status?.measurement;
  const block =
    telemetry.status?.builder.projected ?? telemetry.status?.builder.anchor;
  return (
    <div className={`hud-display hud-${theme} ${compact ? "hud-compact" : ""}`}>
      <div className="hud-brand">
        <Icon name="wheel" size={32} />
        <div>
          <strong>Squeekchain</strong>
          <span className="small">WHEELY9000</span>
        </div>
        <span className="hud-status small">
          <span className="status-dot" />
          {!measurement
            ? telemetry.loading
              ? "Connecting"
              : "Offline"
            : telemetry.fault
              ? "Counter fault"
              : telemetry.stale
                ? "Feed stale"
                : wheelState(measurement.coreStatus) === "spinning"
                  ? "Spinning"
                  : wheelState(measurement.coreStatus) === "idle"
                    ? "Idle"
                    : "Unknown"}
        </span>
      </div>
      <div className="hud-numbers">
        <div>
          <strong className="numeric">
            {format(measurement ? measurement.rpmMilli / 1000 : null, 1)}
          </strong>
          <span>Hamster RPM</span>
        </div>
        <div>
          <strong className="numeric">
            {format(measurement?.speedMmPerSecond, 1)}
          </strong>
          <span>mm/s rim speed</span>
        </div>
        {showEconomy && (
          <div>
            <strong className="numeric">
              {block ? format(Number(block.blockHeight)) : "—"}
            </strong>
            <span>Squeek block</span>
          </div>
        )}
      </div>
      <div className="hud-progress">
        <span
          style={{
            width: `${Math.min(100, Number(block?.blockProgress ?? 0) / 1e7)}%`,
          }}
        />
      </div>
      <div className="hud-foot small">
        <span>Powered by a real hamster.</span>
        <span>
          {telemetry.stale
            ? "Last known data"
            : telemetry.age == null
              ? "Awaiting data"
              : `Updated ${telemetry.age}s ago`}
        </span>
      </div>
    </div>
  );
}
export function Hud({ telemetry }: { telemetry: Telemetry }) {
  const [theme, setTheme] = useState<HudTheme>("dark");
  const [compact, setCompact] = useState(false);
  const [showEconomy, setShowEconomy] = useState(true);
  const [copyState, setCopyState] = useState("");
  const field = useRef<HTMLInputElement>(null);
  const url = new URL(location.href);
  url.hash = new URLSearchParams({
    overlay: "1",
    theme,
    compact: compact ? "1" : "0",
    blocks: showEconomy ? "1" : "0",
  }).toString();
  const overlayUrl = url.href;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(overlayUrl);
      setCopyState("Overlay link copied.");
    } catch {
      field.current?.focus();
      field.current?.select();
      setCopyState("Select and copy the link above.");
    }
  };
  return (
    <>
      <div className="section-intro">
        <div>
          <h2>A little wheel on your stream</h2>
          <p className="muted">
            Live telemetry for OBS, Streamlabs, and your audience.
          </p>
        </div>
        <span className="subtle-label">
          <Icon name="screen" size={16} />
          Browser source
        </span>
      </div>
      <div className="hud-grid">
        <section
          className="surface hud-settings"
          aria-labelledby="hud-settings-title"
        >
          <h2 id="hud-settings-title">Make it yours</h2>
          <fieldset>
            <legend>Overlay appearance</legend>
            <div className="theme-picker">
              {(["dark", "light", "transparent"] as const).map((t) => (
                <button
                  className={theme === t ? "selected" : ""}
                  key={t}
                  aria-pressed={theme === t}
                  onClick={() => setTheme(t)}
                >
                  {t[0].toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="check-row">
            <span>
              Compact layout
              <span className="muted small">
                A smaller footprint for busy streams
              </span>
            </span>
            <input
              type="checkbox"
              checked={compact}
              onChange={(e) => setCompact(e.target.checked)}
            />
          </label>
          <label className="check-row">
            <span>
              Show Squeek block
              <span className="muted small">Include live chain progress</span>
            </span>
            <input
              type="checkbox"
              checked={showEconomy}
              onChange={(e) => setShowEconomy(e.target.checked)}
            />
          </label>
          <div className="overlay-link">
            <label htmlFor="overlay-url">Browser source URL</label>
            <input
              ref={field}
              id="overlay-url"
              value={overlayUrl}
              readOnly
              onFocus={(e) => e.currentTarget.select()}
            />
            <button className="button primary full" onClick={() => void copy()}>
              <Icon
                name={copyState.startsWith("Overlay") ? "check" : "copy"}
                size={17}
              />
              Copy overlay link
            </button>
            <p className="small" role="status">
              {copyState || "Add this URL as a Browser Source in OBS."}
            </p>
          </div>
          <div className="setup-note small muted">
            <Icon name="info" />
            <p>
              Set your source to {compact ? "480 × 320" : "800 × 300"} px. Keep
              the default OBS transparent background. Telemetry refreshes every
              2 seconds with no extra playback buffer.
            </p>
          </div>
        </section>
        <section
          className="hud-preview-panel"
          aria-labelledby="hud-preview-title"
        >
          <div className="panel-heading">
            <h2 id="hud-preview-title">Live preview</h2>
            <a
              className="text-button"
              href={overlayUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open overlay
              <Icon name="external" size={16} />
            </a>
          </div>
          <div className="hud-preview checkerboard">
            <HudDisplay
              telemetry={telemetry}
              theme={theme}
              compact={compact}
              showEconomy={showEconomy}
            />
          </div>
          <div className="hud-caption">
            <span className="status-dot" />
            <p className="small muted">
              Same hardware feed. Made for the corner of your stream.
            </p>
          </div>
          <div className="stream-platforms small muted">
            <Icon name="screen" size={17} />
            <span>OBS Studio</span>
            <span>Streamlabs</span>
            <span>Twitch</span>
            <span>Kick</span>
            <span>YouTube</span>
          </div>
        </section>
      </div>
    </>
  );
}
export function Overlay({ telemetry }: { telemetry: Telemetry }) {
  const params = new URLSearchParams(location.hash.slice(1));
  const theme = params.get("theme");
  useEffect(() => {
    document.documentElement.classList.add("overlay-page");
    return () => document.documentElement.classList.remove("overlay-page");
  }, []);
  return (
    <main className="overlay-root">
      <HudDisplay
        telemetry={telemetry}
        theme={theme === "light" || theme === "transparent" ? theme : "dark"}
        compact={params.get("compact") === "1"}
        showEconomy={params.get("blocks") !== "0"}
      />
    </main>
  );
}
