"use client";

import { useMemo, useState } from "react";

/**
 * SunlitBlindsBackground
 * A full-page animated daylight-through-venetian-blinds background with a top-left
 * day/night toggle. Sits behind homepage content, never blocks clicks (the toggle
 * is the only interactive element). CSS transitions/animations only — no rAF.
 */

// ── tuned parameters ─────────────────────────────────────────────────────────
const SHUTTER_COUNT = 22;
const SHUTTER_HEIGHT = 56; // px, closed (day)
const OPEN_HEIGHT = 20; // px, open (sunset)
const SHUTTER_GAP = 8; // px
const CONTAINER_ROTATION_DAY = -20; // deg
const CONTAINER_ROTATION_SUNSET = -16; // deg
const CONTAINER_SHIFT_DAY = 24; // vw — push the blind field right so its edge is off-screen
const CONTAINER_SHIFT_SUNSET = 32; // vw
const PERSPECTIVE = "50vw";
const SHUTTER_SKEW_Y = 4; // deg (rotateY)
const SHUTTER_OFFSET_X = 12; // vw
const SLAT_INDENT_PER_ROW = 1; // vw per row (1% of viewport width)
const VERTICAL_BAR_WIDTH = 24; // px
const VERTICAL_BAR_RIGHT = 30; // vw
const BLUR_OVERLAY_WIDTH = 20; // %
const SUNSET_OPACITY = 0.59;
const GRAIN_OPACITY = 0.07;
const TRANSITION_DURATION = "1.8s";
const PROGRESSIVE_BLUR_LEVELS = [0.5, 8, 25, 50, 100, 100, 100, 100]; // px
// how far (from the left edge) each blur layer reaches — heavier blur hugs the edge
const PROGRESSIVE_BLUR_REACH = [100, 85, 68, 52, 38, 27, 18, 11]; // %

type CSSVars = React.CSSProperties & Record<`--${string}`, string>;

const NOISE_KEYFRAMES = `
@keyframes sunlit-noise {
  0%   { transform: translate3d(0, 0, 0); }
  10%  { transform: translate3d(-2%, -3%, 0); }
  20%  { transform: translate3d(-4%, 2%, 0); }
  30%  { transform: translate3d(2%, -4%, 0); }
  40%  { transform: translate3d(-2%, 5%, 0); }
  50%  { transform: translate3d(-4%, 2%, 0); }
  60%  { transform: translate3d(3%, 0, 0); }
  70%  { transform: translate3d(0, 3%, 0); }
  80%  { transform: translate3d(-3%, 1%, 0); }
  90%  { transform: translate3d(2%, 2%, 0); }
  100% { transform: translate3d(1%, 0, 0); }
}`;

export function SunlitBlindsBackground({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const [isSunset, setIsSunset] = useState(false);

  // Independent of isSunset — never changes across renders, so it's built once.
  const blurLayers = useMemo(
    () =>
      PROGRESSIVE_BLUR_LEVELS.map((level, i) => {
        const reach = PROGRESSIVE_BLUR_REACH[i]!;
        const mask = `linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,1) ${Math.max(reach - 12, 0)}%, rgba(0,0,0,0) ${reach}%)`;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              inset: 0,
              backdropFilter: `blur(${level}px)`,
              WebkitBackdropFilter: `blur(${level}px)`,
              maskImage: mask,
              WebkitMaskImage: mask,
              pointerEvents: "none",
            }}
          />
        );
      }),
    [],
  );

  const rootStyle: CSSVars = {
    ...style,
    "--bg-light": "#fff",
    "--bg-light2": "#fbf9fa",
    "--bg-sunset": "#ffbd8d",
    "--shadow-color": "#c7c7c7",
    "--shadow-transition": "#e8e6e5a5",
    pointerEvents: "none",
    overflow: "hidden",
    background: "linear-gradient(160deg, var(--bg-light), var(--bg-light2))",
    transition: `background ${TRANSITION_DURATION} ease`,
  };

  return (
    <>
      <div className={className} aria-hidden="true" style={rootStyle}>
        {/* diagonal venetian blind shutters */}
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            perspective: PERSPECTIVE,
            pointerEvents: "none",
            transform: isSunset
              ? `translateX(${CONTAINER_SHIFT_SUNSET}vw) rotate(${CONTAINER_ROTATION_SUNSET}deg)`
              : `translateX(${CONTAINER_SHIFT_DAY}vw) rotate(${CONTAINER_ROTATION_DAY}deg)`,
            transition: "transform 1.2s ease-out",
          }}
        >
          {Array.from({ length: SHUTTER_COUNT }).map((_, i) => {
            const height = isSunset ? OPEN_HEIGHT : SHUTTER_HEIGHT;
            const top = i * (height + SHUTTER_GAP) * (isSunset ? 1.15 : 1) - 300;
            const left = -(SLAT_INDENT_PER_ROW * i);
            return (
              <div
                key={i}
                style={{
                  position: "fixed",
                  width: "80vw",
                  right: 0,
                  top: `${top}px`,
                  left: `${left}vw`,
                  height: `${height}px`,
                  borderLeft: "100vw solid var(--shadow-color)",
                  borderTop: "10px solid transparent",
                  borderBottom: "10px solid transparent",
                  background: "linear-gradient(200deg, var(--shadow-color), var(--shadow-transition) 30%, transparent)",
                  transform: `translate(${SHUTTER_OFFSET_X}vw) rotateY(${SHUTTER_SKEW_Y}deg)`,
                  filter: "blur(6px)",
                  transition: `top ${TRANSITION_DURATION} ease, left ${TRANSITION_DURATION} ease, height ${TRANSITION_DURATION} ease`,
                  pointerEvents: "none",
                }}
              />
            );
          })}
        </div>

        {/* vertical window frame bar */}
        <div
          style={{
            position: "fixed",
            top: 0,
            bottom: 0,
            right: `${VERTICAL_BAR_RIGHT}vw`,
            width: `${VERTICAL_BAR_WIDTH}px`,
            background: "linear-gradient(90deg, transparent, var(--shadow-color) 40%, var(--shadow-color) 60%, transparent)",
            filter: "blur(3px)",
            opacity: 0.6,
            pointerEvents: "none",
          }}
        />

        {/* progressive blur / light diffusion on the left edge (8 layered strips) */}
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            height: "100vh",
            width: "42vw",
            pointerEvents: "none",
          }}
        >
          {blurLayers}
        </div>

        {/* blur / light overlay */}
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: `linear-gradient(85deg, var(--bg-light2), var(--bg-light2) ${BLUR_OVERLAY_WIDTH}%, transparent)`,
            pointerEvents: "none",
          }}
        />

        {/* warm sunset multiply overlay */}
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "#ffbd8d",
            mixBlendMode: "multiply",
            filter: "brightness(1.02)",
            opacity: isSunset ? SUNSET_OPACITY : 0,
            transition: "opacity 3s ease-in-out",
            pointerEvents: "none",
          }}
        />

        {/* film grain */}
        <div style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
          <div
            style={{
              position: "absolute",
              inset: "-10rem",
              backgroundImage: "url(https://upload.wikimedia.org/wikipedia/commons/5/5c/Image_gaussian_noise_example.png)",
              backgroundRepeat: "repeat",
              opacity: GRAIN_OPACITY,
              filter: "brightness(120%) sepia(50%)",
              animation: "sunlit-noise 1s steps(2) infinite",
              pointerEvents: "none",
            }}
          />
        </div>

        <style dangerouslySetInnerHTML={{ __html: NOISE_KEYFRAMES }} />
      </div>

      {/* day / night toggle — the only interactive element */}
      <button
        type="button"
        aria-label={isSunset ? "Switch to day" : "Switch to night"}
        aria-pressed={isSunset}
        onClick={() => setIsSunset((v) => !v)}
        style={{
          position: "fixed",
          top: 20,
          left: 20,
          zIndex: 50,
          pointerEvents: "auto",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 38,
          height: 38,
          padding: 0,
          border: "none",
          background: "transparent",
          cursor: "pointer",
          color: isSunset ? "#ffe4c9" : "#8a8a8a",
          transition: "color 1.2s ease",
          lineHeight: 0,
        }}
      >
        {isSunset ? <MoonIcon /> : <SunIcon />}
      </button>
    </>
  );
}

function SunIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
    </svg>
  );
}

export default SunlitBlindsBackground;
