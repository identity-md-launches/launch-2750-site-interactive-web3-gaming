import { useEffect, useRef, useState } from "react";
import { Icon } from "./icons";
import { format } from "./model";
import type { Telemetry } from "./telemetry";

// Radians per second = RPM × 2π / 60. Time is integrated, not inferred from frames.
export function Wheel({
  telemetry,
  reduced,
}: {
  telemetry: Telemetry;
  reduced: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [paused, setPaused] = useState(false);
  const rpm = telemetry.status?.measurement.rpmMilli;
  const liveRpm = telemetry.stale || telemetry.fault ? 0 : (rpm ?? 0) / 1000;
  const rpmRef = useRef(liveRpm);
  rpmRef.current = liveRpm;
  const angle = useRef(0);
  useEffect(() => {
    const element = canvas.current;
    const ctx = element?.getContext("2d");
    if (!element || !ctx) return;
    const scale = Math.min(devicePixelRatio || 1, 2);
    element.width = 540 * scale;
    element.height = 380 * scale;
    ctx.scale(scale, scale);
    let frame = 0;
    let previous = 0;
    const draw = (time: number) => {
      const dt = previous ? (time - previous) / 1000 : 0;
      previous = time;
      if (!paused && !reduced)
        angle.current =
          (angle.current + ((rpmRef.current * Math.PI * 2) / 60) * dt) %
          (Math.PI * 2);
      ctx.clearRect(0, 0, 540, 380);
      const ellipse = (
        x: number,
        y: number,
        rx: number,
        ry: number,
        color: string,
      ) => {
        ctx.beginPath();
        ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      };
      const line = (points: number[], color: string, width: number) => {
        ctx.beginPath();
        ctx.moveTo(points[0], points[1]);
        for (let i = 2; i < points.length; i += 2)
          ctx.lineTo(points[i], points[i + 1]);
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.lineCap = "round";
        ctx.stroke();
      };
      ellipse(273, 350, 150, 13, "#e5c7ae");
      line([265, 204, 226, 340, 328, 340, 288, 204], "#39382f", 9);
      line([209, 342, 346, 342], "#39382f", 12);
      ellipse(274, 179, 145, 145, "#ffefd8");
      ctx.save();
      ctx.translate(274, 179);
      ctx.rotate(angle.current);
      for (let i = 0; i < 20; i++) {
        const theta = (i * Math.PI) / 10;
        line(
          [
            Math.cos(theta) * 17,
            Math.sin(theta) * 17,
            Math.cos(theta) * 140,
            Math.sin(theta) * 140,
          ],
          "#ecc5a0",
          2,
        );
      }
      ctx.beginPath();
      ctx.arc(0, 0, 145, 0, Math.PI * 2);
      ctx.strokeStyle = "#e94f23";
      ctx.lineWidth = 13;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 131, 0, Math.PI * 2);
      ctx.strokeStyle = "#f3a36f";
      ctx.lineWidth = 3;
      ctx.stroke();
      for (let i = 0; i < 20; i++) {
        const theta = (i * Math.PI) / 10;
        line(
          [
            Math.cos(theta) * 142,
            Math.sin(theta) * 142,
            Math.cos(theta) * 149,
            Math.sin(theta) * 149,
          ],
          "#a63618",
          3,
        );
      }
      ellipse(0, 0, 15, 15, "#e94f23");
      ellipse(0, 0, 5, 5, "#fff3e2");
      ctx.restore();
      // Squeektoshi stays at the contact point while the physical wheel rotates.
      ctx.save();
      ctx.translate(296, 272);
      const running = rpmRef.current > 0 && !paused && !reduced;
      const stride = running ? Math.sin(time / 90) * 5 : 0;
      line([-45, 7, -58, 0, -62, 7], "#bd7650", 5);
      ellipse(-15, 1, 41, 30, "#d69a62");
      ellipse(17, -13, 27, 28, "#e7b47b");
      ellipse(5, -37, 13, 14, "#d69a62");
      ellipse(5, -37, 7, 8, "#e6a899");
      ellipse(32, -35, 11, 12, "#e7b47b");
      ellipse(32, -35, 6, 7, "#edb7a4");
      ellipse(0, 12, 29, 21, "#fff1d7");
      ellipse(36, -5, 17, 13, "#fff1d7");
      ellipse(24, -19, 4, 5, "#2e302b");
      ellipse(25, -21, 1.3, 1.5, "#ffffff");
      ellipse(51, -9, 4, 3, "#a75b50");
      line([43, 3, 38, 5], "#b47861", 1.5);
      line([39, -1, 55, 2], "#b47861", 1);
      line([39, 3, 53, 8], "#b47861", 1);
      ellipse(-31 + stride, 28, 13, 5, "#b97449");
      ellipse(14 - stride, 28, 14, 5, "#b97449");
      ctx.restore();
      if (!paused && !reduced) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [paused, reduced]);
  // Redraw an idle reduced-motion canvas once on new data, without an animation loop.
  return (
    <section className="wheel-panel" aria-labelledby="wheel-title">
      <div className="panel-heading">
        <div className="inline">
          <Icon name="wheel" />
          <h2 id="wheel-title">The real wheel</h2>
        </div>
        <span className="small muted">WHEELY9000</span>
      </div>
      <div className="wheel-stage">
        <div className="stage-caption">
          <span
            className={`status-dot ${!telemetry.status || telemetry.stale || telemetry.fault ? "neutral" : ""}`}
          />
          {telemetry.loading
            ? "Connecting to the wheel"
            : telemetry.fault
              ? "Hardware counter fault"
              : telemetry.stale || !telemetry.status
                ? "Waiting for live hardware"
                : "One very real hamster"}
        </div>
        <canvas
          ref={canvas}
          role="img"
          aria-label={`Squeektoshi in the physical wheel. ${format(rpm == null ? null : rpm / 1000, 1)} RPM. ${!telemetry.status ? "Awaiting hardware." : telemetry.fault ? "Counter fault. Visualization stopped." : telemetry.stale ? "Hardware feed stale. Visualization stopped." : paused || reduced ? "Visualization paused." : "Rotation matches live RPM."}`}
        />
        <div className="wheel-stage-bottom">
          <span className="small">
            Powered by paws.
            <br />
            <strong>Verified by hardware.</strong>
          </span>
          <button
            className="icon-button"
            aria-label={
              paused ? "Resume wheel animation" : "Pause wheel animation"
            }
            aria-pressed={paused}
            onClick={() => setPaused((p) => !p)}
            disabled={reduced}
          >
            <Icon name={paused ? "play" : "pause"} size={17} />
          </button>
        </div>
      </div>
      <div className="wheel-readout">
        <div>
          <span className="muted small">Current rotation</span>
          <div className="rpm-value numeric">
            {format(rpm == null ? null : rpm / 1000, 1)}
            <span>rpm</span>
          </div>
        </div>
        <div className="hardware-note">
          <Icon name={telemetry.stale ? "info" : "link"} size={16} />
          <span>
            {!telemetry.status
              ? "Awaiting hardware"
              : telemetry.fault
                ? "Counter fault"
                : telemetry.stale
                  ? "Last known reading"
                  : reduced
                    ? "Motion reduced"
                    : paused
                      ? "Animation paused"
                      : "1:1 hardware sync"}
          </span>
        </div>
      </div>
      <div className="wheel-foot small muted">
        <span className="status-dot neutral" />
        {!telemetry.status || telemetry.stale || telemetry.fault
          ? "Live readings appear when the wheel reconnects."
          : liveRpm === 0
            ? "Taking a breather. Even miners need a nap."
            : "Every revolution helps move Squeekchain forward."}
      </div>
    </section>
  );
}
