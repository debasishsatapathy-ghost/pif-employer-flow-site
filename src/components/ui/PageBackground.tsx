'use client';

/*
 * PageBackground
 * ------------------------------------------------------------
 * Renders the Figma "Widescreen background" variants (Home / Form /
 * Dashboard / Dashboard ALT) as a fixed, full-viewport layer behind the app.
 *
 * Source: Figma file nKrtbhUWx15YuejRjTTK2u, frame "Widescreen background"
 * Each variant is a 3840×{1600 | 1117} canvas containing several blurred
 * coloured ellipses (vector SVGs in /public/bg).
 *
 * Sizing strategy (mirrors CSS `background-size: cover`):
 *   canvasWidth  = max(100vw, 100vh × aspectRatio)
 *   canvasHeight = max(100vw ÷ aspectRatio, 100vh)
 * The canvas is centred, its contents positioned with percentages so everything
 * scales proportionally at any viewport size.
 *
 * Cross-fade: all variants are kept mounted, only one has opacity:1. Swapping
 * `variant` triggers a 400ms opacity fade via CSS transitions (no reflow).
 */

import { memo } from 'react';

export type BackgroundVariant = 'home' | 'form' | 'dashboard' | 'dashboard-alt';

type EllipseSpec = {
  /** Public URL of the SVG ellipse (pre-blurred, single-colour). */
  src: string;
  /** Container width in canvas px. */
  w: number;
  /** Container height in canvas px. */
  h: number;
  /** Ellipse container centre-x in canvas px (0 = left edge, canvasW = right). */
  cx: number;
  /** Ellipse container centre-y in canvas px (0 = top edge, canvasH = bottom). */
  cy: number;
  /** Inner inset % in the X-axis (how much the SVG over-spills the container). */
  insetX: number;
  /** Inner inset % in the Y-axis. */
  insetY: number;
};

type VariantSpec = {
  /** Flat base colour shown anywhere the ellipses don't cover. */
  base: string;
  /** Canvas width (Figma frame width). */
  canvasW: number;
  /** Canvas height (Figma frame height). */
  canvasH: number;
  ellipses: EllipseSpec[];
};

/* Figma frame specs translated 1:1 from `get_design_context` response.
 * Layer order matches Figma (first entry = bottom-most). */
const VARIANTS: Record<BackgroundVariant, VariantSpec> = {
  home: {
    base: '#03130e',
    canvasW: 3840,
    canvasH: 1600,
    ellipses: [
      { src: '/bg/home-ellipse5.svg', w: 1644, h: 1641, cx: 0, cy: 27 + 1641 / 2, insetX: 58.39, insetY: 58.5 },
      { src: '/bg/home-ellipse5.svg', w: 1644, h: 1641, cx: 3840, cy: 27 + 1641 / 2, insetX: 58.39, insetY: 58.5 },
      { src: '/bg/home-ellipse1.svg', w: 753, h: 753, cx: 1920 - 491.5, cy: -100 + 753 / 2, insetX: 54.71, insetY: 54.71 },
      { src: '/bg/home-ellipse2.svg', w: 500, h: 500, cx: 1920 + 716, cy: 73 + 500 / 2, insetX: 120, insetY: 120 },
      { src: '/bg/home-ellipse3.svg', w: 501, h: 500, cx: 1920 - 35.5, cy: 241 + 500 / 2, insetX: 39.12, insetY: 39.2 },
      { src: '/bg/home-ellipse4.svg', w: 1182, h: 1182, cx: 1920, cy: 1351 + 1182 / 2, insetX: 60.24, insetY: 60.24 },
    ],
  },
  form: {
    base: '#03130e',
    canvasW: 3840,
    canvasH: 1600,
    ellipses: [
      { src: '/bg/form-ellipse5.svg', w: 1644, h: 1641, cx: 0, cy: 27 + 1641 / 2, insetX: 58.39, insetY: 58.5 },
      { src: '/bg/form-ellipse5.svg', w: 1644, h: 1641, cx: 3840, cy: 27 + 1641 / 2, insetX: 58.39, insetY: 58.5 },
      { src: '/bg/form-ellipse1.svg', w: 1612, h: 306, cx: 1920 - 518, cy: 309 + 306 / 2, insetX: 47.15, insetY: 248.37 },
      { src: '/bg/form-ellipse3.svg', w: 501, h: 500, cx: 1920 + 815.5, cy: 1168 + 500 / 2, insetX: 39.12, insetY: 39.2 },
      { src: '/bg/form-ellipse2.svg', w: 500, h: 500, cx: 1920 + 1440, cy: -498 + 500 / 2, insetX: 120, insetY: 120 },
    ],
  },
  dashboard: {
    base: '#09090b',
    canvasW: 3840,
    canvasH: 1117,
    ellipses: [
      { src: '/bg/dash-ellipse5.svg', w: 1644, h: 1641, cx: 0, cy: -146 + 1641 / 2, insetX: 58.39, insetY: 58.5 },
      { src: '/bg/dash-ellipse5.svg', w: 1644, h: 1641, cx: 3840, cy: -262 + 1641 / 2, insetX: 58.39, insetY: 58.5 },
      { src: '/bg/dash-avatar.svg', w: 712, h: 712, cx: 1920 + 720, cy: -37 + 712 / 2, insetX: 26.97, insetY: 26.97 },
      { src: '/bg/dash-avatar1.svg', w: 1182, h: 1182, cx: 1920 - 608, cy: 861 + 1182 / 2, insetX: 16.24, insetY: 16.24 },
    ],
  },
  'dashboard-alt': {
    base: '#09090b',
    canvasW: 3840,
    canvasH: 1117,
    ellipses: [
      { src: '/bg/dashalt-ellipse5.svg', w: 1644, h: 1641, cx: 0, cy: -146 + 1641 / 2, insetX: 58.39, insetY: 58.5 },
      { src: '/bg/dashalt-ellipse5.svg', w: 1644, h: 1641, cx: 3840, cy: -262 + 1641 / 2, insetX: 58.39, insetY: 58.5 },
      { src: '/bg/dashalt-avatar.svg', w: 712, h: 712, cx: 1920 - 720, cy: -37 + 712 / 2, insetX: 26.97, insetY: 26.97 },
      { src: '/bg/dashalt-avatar1.svg', w: 1182, h: 1182, cx: 1920 + 608, cy: 861 + 1182 / 2, insetX: 16.24, insetY: 16.24 },
    ],
  },
};

const ORDER: BackgroundVariant[] = ['home', 'form', 'dashboard', 'dashboard-alt'];

const pct = (num: number, denom: number) => `${(num / denom) * 100}%`;

/* Renders a single variant's ellipse stack inside a percentage-based coordinate space. */
const VariantLayer = memo(function VariantLayer({ spec, visible }: { spec: VariantSpec; visible: boolean }) {
  /* Aspect-ratio-preserving `cover` sizing:
   *   canvas width  = max(100vw, viewportHeight × aspect)
   *   canvas height = max(100vw / aspect, 100vh)
   * The canvas is centred by absolute-positioning at 50/50 with a -50% translate.
   * Children use percent-based positioning so they scale proportionally. */
  const aspect = spec.canvasW / spec.canvasH;

  return (
    <div
      aria-hidden
      className="absolute top-1/2 left-1/2"
      style={{
        width: `max(100vw, calc(100vh * ${aspect}))`,
        height: `max(calc(100vw / ${aspect}), 100vh)`,
        transform: 'translate(-50%, -50%)',
        opacity: visible ? 1 : 0,
        /* 700ms ease-in-out cross-fade — slow enough to read as a gentle glow
         * shift between Dashboard ↔ Dashboard-ALT rather than an abrupt swap. */
        transition: 'opacity 700ms cubic-bezier(0.4, 0, 0.2, 1)',
        willChange: 'opacity',
      }}
    >
      {spec.ellipses.map((e, idx) => {
        const innerW = 100 + 2 * e.insetX;
        const innerH = 100 + 2 * e.insetY;
        return (
          <div
            key={idx}
            className="absolute"
            style={{
              left: pct(e.cx - e.w / 2, spec.canvasW),
              top: pct(e.cy - e.h / 2, spec.canvasH),
              width: pct(e.w, spec.canvasW),
              height: pct(e.h, spec.canvasH),
            }}
          >
            <div
              className="absolute"
              style={{
                left: `-${e.insetX}%`,
                top: `-${e.insetY}%`,
                width: `${innerW}%`,
                height: `${innerH}%`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={e.src}
                alt=""
                aria-hidden
                draggable={false}
                className="block select-none"
                style={{ width: '100%', height: '100%', maxWidth: 'none' }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
});

export type PageBackgroundProps = {
  /** Which variant to show. Others remain mounted for zero-reflow cross-fade. */
  variant: BackgroundVariant;
};

/**
 * Fixed full-viewport background layer.
 * All four variants are mounted simultaneously so cross-fades between pages
 * cost nothing beyond an opacity transition (no re-mount / reflow).
 */
export function PageBackground({ variant }: PageBackgroundProps) {
  return (
    <div
      aria-hidden
      className="fixed inset-0 overflow-hidden pointer-events-none"
      style={{
        zIndex: -1,
        /* Fallback base colour — Dashboard variants share #09090b so Home↔Hiring
         * ↔Workforce have zero base-colour change. Form uses #03130e; we fade
         * the base colour in lockstep with the variant fade for consistency. */
        background: VARIANTS[variant].base,
        transition: 'background-color 700ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {ORDER.map((v) => (
        <VariantLayer key={v} spec={VARIANTS[v]} visible={v === variant} />
      ))}
    </div>
  );
}

export default PageBackground;
