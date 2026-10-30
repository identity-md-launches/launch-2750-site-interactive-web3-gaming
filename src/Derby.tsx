import { useEffect, useRef, useState } from "react";
import { Hamster, Icon } from "./icons";
import {
  format,
  newRace,
  RACE_LENGTH,
  stepRace,
  type RaceState,
} from "./model";
import type { Telemetry } from "./telemetry";
import { Wheel } from "./Wheel";

const racers = [
  {
    name: "Squeektoshi",
    kind: "Live hardware",
    color: "#e9a15c",
    class: "hardware",
  },
  { name: "Cheddar", kind: "AI racer", color: "#e3bf69", class: "cheddar" },
  { name: "Sir Squeeks", kind: "AI racer", color: "#aaa9c8", class: "squeeks" },
  { name: "You", kind: "Space to sprint", color: "#a7bc98", class: "player" },
];
export function Derby({
  telemetry,
  reduced,
  sfx,
}: {
  telemetry: Telemetry;
  reduced: boolean;
  sfx: (kind?: "start" | "tap" | "win") => void;
}) {
  const [race, setRace] = useState<RaceState>(newRace);
  const stateRef = useRef(race);
  const taps = useRef(0);
  const speed = useRef(0);
  const arena = useRef<HTMLDivElement>(null);
  const [help, setHelp] = useState(false);
  stateRef.current = race;
  speed.current =
    !telemetry.stale && !telemetry.fault
      ? (telemetry.status?.measurement.speedMmPerSecond ?? 0)
      : 0;
  const sprint = () => {
    if (stateRef.current.running) {
      taps.current++;
      sfx("tap");
    }
  };
  const sprintRef = useRef(sprint);
  sprintRef.current = sprint;
  useEffect(() => {
    const keydown = (e: KeyboardEvent) => {
      const element = e.target as HTMLElement;
      if (
        e.code !== "Space" ||
        e.repeat ||
        element.closest("button,input,select,textarea,a,dialog") ||
        !stateRef.current.running
      )
        return;
      e.preventDefault();
      sprintRef.current();
    };
    addEventListener("keydown", keydown);
    return () => removeEventListener("keydown", keydown);
  }, []);
  useEffect(() => {
    if (!race.running) return;
    let previous = performance.now();
    const interval = setInterval(() => {
      const now = performance.now();
      const dt = Math.min((now - previous) / 1000, 0.1);
      previous = now;
      const input = taps.current;
      taps.current = 0;
      setRace((old) => stepRace(old, dt, speed.current, input));
    }, 50);
    const onVisibility = () => {
      if (document.hidden) setRace((old) => ({ ...old, running: false }));
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [race.running]);
  useEffect(() => {
    if (race.winner !== null) sfx("win");
  }, [race.winner]); // Play once per result.
  const started = race.elapsed > 0;
  const start = () => {
    taps.current = 0;
    setRace((old) =>
      old.winner !== null
        ? { ...newRace(), running: true }
        : { ...old, running: true },
    );
    arena.current?.focus({ preventScroll: true });
    sfx("start");
  };
  return (
    <>
      <div className="section-intro derby-intro">
        <div>
          <h2>Squeek Derby</h2>
          <p className="muted">A 5-metre dash. Four tiny contenders.</p>
        </div>
        <button
          className="text-button"
          aria-expanded={help}
          onClick={() => setHelp((p) => !p)}
        >
          <Icon name="info" size={17} />
          How to play
        </button>
      </div>
      {help && (
        <div className="help-strip">
          <Icon name="flag" />
          <p>
            Start a race, then repeatedly press Space or Sprint. Each press adds
            speed; speed fades between presses. Squeektoshi uses live rim speed
            in mm/s. The other two racers are AI. Races are local, with no
            prizes or transactions.
          </p>
        </div>
      )}
      <div className="derby-grid">
        <Wheel telemetry={telemetry} reduced={reduced} />
        <section className="race-panel" aria-labelledby="race-title">
          <div className="panel-heading">
            <div className="inline">
              <Icon name="flag" />
              <h2 id="race-title">The tiny grand prix</h2>
            </div>
            <span className="small muted">Local race</span>
          </div>
          <div className="race-controls">
            <div>
              <span className="small muted">5-metre sprint</span>
              <div className="race-timer numeric">
                {race.elapsed.toFixed(1)}
                <span>sec</span>
              </div>
            </div>
            {race.running ? (
              <button
                className="button"
                onClick={() => setRace((old) => ({ ...old, running: false }))}
              >
                <Icon name="pause" size={17} />
                Pause race
              </button>
            ) : (
              <button className="button primary" onClick={start}>
                <Icon
                  name={started && race.winner === null ? "play" : "flag"}
                  size={17}
                />
                {race.winner !== null
                  ? "Race again"
                  : started
                    ? "Resume race"
                    : "Start race"}
              </button>
            )}
          </div>
          <div
            className="track"
            ref={arena}
            tabIndex={-1}
            aria-label="Race track"
          >
            <div className="track-scale small numeric">
              <span>0 m</span>
              <span>1 m</span>
              <span>2 m</span>
              <span>3 m</span>
              <span>4 m</span>
              <Icon name="flag" size={14} />
            </div>
            {racers.map((r, i) => (
              <div className={`race-lane ${r.class}`} key={r.name}>
                <div className="lane-label">
                  <strong>
                    {r.name}
                    {i === 0 && (
                      <span className="live-marker" title="Live hardware" />
                    )}
                  </strong>
                  <span className="small muted">
                    {i === 0 && telemetry.fault
                      ? "Counter fault"
                      : i === 0 && telemetry.stale
                        ? "Feed unavailable"
                        : r.kind}
                  </span>
                  <span className="lane-distance small numeric">
                    {(race.distances[i] / 1000).toFixed(2)} m
                  </span>
                </div>
                <div className="lane-runway">
                  <div
                    className={`runner ${race.running && !reduced ? "running" : ""}`}
                    style={{
                      insetInlineStart: `${(race.distances[i] / RACE_LENGTH) * 86}%`,
                    }}
                  >
                    <Hamster
                      color={r.color}
                      variant={i === 1 ? 1 : i === 2 ? 2 : 0}
                    />
                  </div>
                  <div className="finish-line" />
                </div>
              </div>
            ))}
          </div>
          <div className="sprint-controls">
            <div>
              <button
                className="button sprint-button"
                disabled={!race.running}
                onClick={sprint}
              >
                <Icon name="bolt" size={21} />
                Sprint<kbd>Space</kbd>
              </button>
              <p className="small muted">Tap repeatedly to pick up speed.</p>
            </div>
            <div className="speed-readout">
              <strong className="numeric">{format(race.speeds[3])}</strong>
              <span className="small muted">mm/s · your speed</span>
            </div>
          </div>
          <div className="race-message small" role="status">
            {race.winner !== null
              ? `${racers[race.winner].name} wins! ${race.winner === 3 ? "Those paws have potential." : "Ready for a rematch?"}`
              : race.running
                ? "Race on! Every sprint gives you a boost."
                : started
                  ? "Race paused. Resume when you’re ready."
                  : "Think you can outrun a hamster?"}
          </div>
        </section>
      </div>
      <div className="derby-bottom">
        <div className="inline">
          <span className="mini-wheel">
            <Icon name="wheel" size={23} />
          </span>
          <div>
            <strong>A little exercise. A whole ecosystem.</strong>
            <p className="small muted">
              Live wheel data. Local races. No on-chain scores.
            </p>
          </div>
        </div>
        <button
          className="text-button"
          onClick={() => {
            taps.current = 0;
            setRace(newRace());
          }}
        >
          <Icon name="reset" size={16} />
          Reset race
        </button>
      </div>
    </>
  );
}
