import type { CSSProperties } from "react";

export type IconName =
  | "wheel"
  | "flag"
  | "bolt"
  | "chart"
  | "screen"
  | "sound"
  | "muted"
  | "wallet"
  | "arrow"
  | "external"
  | "pause"
  | "play"
  | "reset"
  | "copy"
  | "check"
  | "close"
  | "settings"
  | "info"
  | "sun"
  | "link";
const paths: Record<IconName, React.ReactNode> = {
  wheel: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="2" />
      <path d="M12 3v7m0 4v7M3 12h7m4 0h7M6 6l4.5 4.5m3 3L18 18M6 18l4.5-4.5m3-3L18 6" />
    </>
  ),
  flag: (
    <>
      <path d="M5 21V4m0 0c5-5 9 5 15 0v10c-6 5-10-5-15 0" />
      <path d="M10 4v9m5-7v9M5 8c5-5 9 5 15 0" />
    </>
  ),
  bolt: <path d="m13 2-9 12h7l-1 8 10-13h-7l0-7Z" />,
  chart: (
    <>
      <path d="M4 4v16h17M8 15l4-5 4 3 5-7" />
      <path d="M17 6h4v4" />
    </>
  ),
  screen: (
    <>
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M8 21h8m-4-4v4M7 8h4" />
    </>
  ),
  sound: (
    <>
      <path d="m11 4-6 5H2v6h3l6 5V4Zm4 4c3 2 3 6 0 8m3-11c5 4 5 10 0 14" />
    </>
  ),
  muted: (
    <>
      <path d="m11 4-6 5H2v6h3l6 5V4Zm5 5 6 6m0-6-6 6" />
    </>
  ),
  wallet: (
    <>
      <path d="M20 8V5H5a3 3 0 0 0 0 6h16v9H5a3 3 0 0 1-3-3V8" />
      <path d="M21 11h-6v5h6m-3-2.5h.1" />
    </>
  ),
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  external: (
    <>
      <path d="M14 3h7v7m0-7L10 14M9 3H4v17h17v-5" />
    </>
  ),
  pause: (
    <>
      <path d="M8 5v14M16 5v14" />
    </>
  ),
  play: <path d="m7 4 14 8-14 8V4Z" />,
  reset: (
    <>
      <path d="M3 11a9 9 0 1 1 2 7M3 4v7h7" />
    </>
  ),
  copy: (
    <>
      <rect x="8" y="8" width="13" height="13" rx="2" />
      <path d="M16 8V3H3v13h5" />
    </>
  ),
  check: <path d="m4 12 5 5L21 5" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  settings: (
    <>
      <path d="M4 6h16M4 18h16M8 3v6m8 6v6" />
      <circle cx="8" cy="6" r="2" />
      <circle cx="16" cy="18" r="2" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10v7m0-11v1" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2" />
    </>
  ),
  link: (
    <>
      <path
        d="m10 14 4-4m-6 6-2 2a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m2 1 2-2a4 4 0 1 1 6 6l-5 5a4 4 0 0 1-6 0"
        transform="translate(1 -1)"
      />
    </>
  ),
};
export function Icon({
  name,
  size = 20,
  style,
}: {
  name: IconName;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      {paths[name]}
    </svg>
  );
}

export function Hamster({
  color = "#e9a15c",
  className = "",
  variant = 0,
}: {
  color?: string;
  className?: string;
  variant?: number;
}) {
  return (
    <svg
      className={className}
      width="64"
      height="58"
      viewBox="0 0 90 80"
      aria-hidden="true"
    >
      <ellipse cx="44" cy="72" rx="29" ry="4" fill="#292722" opacity=".1" />
      <path
        d="M15 49c-12-3-13 9-7 9"
        stroke={color}
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
      />
      <ellipse cx="38" cy="48" rx="27" ry="23" fill={color} />
      <circle cx="58" cy="37" r="22" fill={color} />
      <circle cx="47" cy="19" r="10" fill={color} />
      <circle cx="47" cy="19" r="5" fill="#f4b7a4" />
      <circle cx="68" cy="20" r="9" fill={color} />
      <circle cx="68" cy="20" r="4" fill="#f4b7a4" />
      <ellipse cx="52" cy="54" rx="20" ry="16" fill="#fff4df" />
      <ellipse cx="70" cy="43" rx="13" ry="10" fill="#fff4df" />
      {variant === 2 ? (
        <path d="M52 30h25v9H52z" fill="#292722" />
      ) : (
        <>
          <circle cx="62" cy="34" r="3.2" fill="#292722" />
          <circle cx="63" cy="33" r="1" fill="white" />
        </>
      )}
      <ellipse cx="80" cy="41" rx="3" ry="2.5" fill="#ac5f51" />
      <path
        d="m76 49-4 2m-4-1 3 3"
        stroke="#b48767"
        strokeWidth="1.3"
        fill="none"
      />
      <ellipse cx="28" cy="67" rx="10" ry="5" fill="#d87f51" />
      <ellipse cx="60" cy="67" rx="10" ry="5" fill="#d87f51" />
      {variant === 1 && (
        <>
          <path d="M40 28c6-8 23-8 32-2" stroke="#e94f23" strokeWidth="6" />
          <path d="m43 27-5 11m5-11-9 3" stroke="#e94f23" strokeWidth="3" />
        </>
      )}
    </svg>
  );
}
