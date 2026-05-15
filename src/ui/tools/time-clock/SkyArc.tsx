/*
 * SkyArc — Full 24h circle with day/night ring.
 *
 * Layout: noon at top, midnight at bottom, dawn on left, dusk on right.
 * The thick ring color shows sky-blue for day and deep indigo for night,
 * with warm transitions at dawn/dusk. Decorative icons on the ring
 * (small suns, stars, clouds) reinforce which section is day vs night.
 * Sun or moon marker travels along the ring.
 *
 * Tick marks at dawn, noon, dusk, midnight.
 */

import { memo, useId, useMemo } from 'react';
import styles from './TimeClock.module.css';

interface SkyArcProps {
  hour: number;
  minute: number;
  dawn: number;
  dusk: number;
}

const SIZE = 240;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = 68;
const RING_WIDTH = 32;
const SEGMENTS = 96;

// ── Color palette ──

const NIGHT_RGB = [20, 10, 60];        // deep indigo-black
const NIGHT_MID_RGB = [40, 18, 90];    // mid night purple
const DAWN_RGB = [230, 110, 60];       // warm orange-red
const DAY_RGB = [60, 140, 220];        // sky blue
const DAY_MID_RGB = [90, 170, 245];    // bright sky blue at noon
const DUSK_RGB = [180, 60, 120];       // magenta-pink

// ── Geometry ──

/**
 * Hour → angle on the circle. Fixed mapping:
 * 12:00 (noon) = top (−π/2, 0°), 0:00 (midnight) = bottom (π/2, 180°).
 * Each hour = 15°. Dawn/dusk fall at their natural hour positions.
 */
function hourToAngle(h: number): number {
  return ((h - 12) / 24) * 2 * Math.PI - Math.PI / 2;
}

function pointAt(angle: number, r: number): { x: number; y: number } {
  return { x: CX + r * Math.cos(angle), y: CY + r * Math.sin(angle) };
}

function lerpColor(a: number[], b: number[], t: number): number[] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function rgbStr(c: number[]): string {
  return `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;
}

// ── Ring color computation ──

function colorForHour(h: number, dawn: number, dusk: number): number[] {
  const TRANS = 1;

  // Day zone
  if (h >= dawn + TRANS && h <= dusk - TRANS) {
    const dayMid = (dawn + dusk) / 2;
    if (h <= dayMid) {
      const t = (h - (dawn + TRANS)) / (dayMid - (dawn + TRANS));
      return lerpColor(DAY_RGB, DAY_MID_RGB, Math.max(0, t));
    } else {
      const t = (h - dayMid) / ((dusk - TRANS) - dayMid);
      return lerpColor(DAY_MID_RGB, DAY_RGB, Math.min(1, t));
    }
  }
  // Dawn transition
  if (h >= dawn - TRANS && h < dawn + TRANS) {
    const t = (h - (dawn - TRANS)) / (TRANS * 2);
    return t < 0.5
      ? lerpColor(NIGHT_RGB, DAWN_RGB, t * 2)
      : lerpColor(DAWN_RGB, DAY_RGB, (t - 0.5) * 2);
  }
  // Dusk transition
  if (h > dusk - TRANS && h <= dusk + TRANS) {
    const t = (h - (dusk - TRANS)) / (TRANS * 2);
    return t < 0.5
      ? lerpColor(DAY_RGB, DUSK_RGB, t * 2)
      : lerpColor(DUSK_RGB, NIGHT_RGB, (t - 0.5) * 2);
  }
  // Night zone
  const nightCenter = dusk + (24 - dusk + dawn) / 2;
  const normCenter = nightCenter > 24 ? nightCenter - 24 : nightCenter;
  let distFromCenter = Math.abs(h - normCenter);
  if (distFromCenter > 12) distFromCenter = 24 - distFromCenter;
  const nightHalf = (24 - (dusk - dawn)) / 2;
  const nt = 1 - Math.min(distFromCenter / Math.max(nightHalf, 1), 1);
  return lerpColor(NIGHT_RGB, NIGHT_MID_RGB, nt);
}

// ── Ring segment path ──

function arcSegmentPath(startAngle: number, endAngle: number, r: number, w: number): string {
  const ro = r + w / 2;
  const ri = r - w / 2;
  const os = pointAt(startAngle, ro);
  const oe = pointAt(endAngle, ro);
  const is_ = pointAt(endAngle, ri);
  const ie = pointAt(startAngle, ri);
  const large = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${os.x} ${os.y} A ${ro} ${ro} 0 ${large} 1 ${oe.x} ${oe.y} L ${is_.x} ${is_.y} A ${ri} ${ri} 0 ${large} 0 ${ie.x} ${ie.y} Z`;
}

// ── Stars inside the inner area (night zone only) ──

function generateStars(dawn: number, dusk: number): Array<{ x: number; y: number; r: number; opacity: number }> {
  const stars: Array<{ x: number; y: number; r: number; opacity: number }> = [];
  const innerR = R - RING_WIDTH / 2 - 4;
  for (let i = 0; i < 28; i++) {
    const pseudoAngle = (i * 137.508 * Math.PI) / 180;
    const dist = 6 + (i * 7.3) % Math.max(innerR - 6, 1);
    const x = CX + dist * Math.cos(pseudoAngle);
    const y = CY + dist * Math.sin(pseudoAngle);
    // Reverse-map position angle back to hour (12 at top)
    const hourAtPos = ((Math.atan2(y - CY, x - CX) + Math.PI / 2) / (2 * Math.PI)) * 24 + 12;
    const h = ((hourAtPos % 24) + 24) % 24;
    const isNight = h < dawn - 0.5 || h > dusk + 0.5;
    if (isNight) {
      stars.push({ x, y, r: 0.4 + (i % 3) * 0.35, opacity: 0.25 + (i % 4) * 0.12 });
    }
  }
  return stars;
}

// ── Decorative icons on ring ──

interface RingDecoration {
  hour: number;
  type: 'star4' | 'star6' | 'cloud' | 'sparkle';
}

function buildDecorations(dawn: number, dusk: number): RingDecoration[] {
  const decos: RingDecoration[] = [];
  const nightCenter = dusk + (24 - dusk + dawn) / 2;
  const nc = nightCenter >= 24 ? nightCenter - 24 : nightCenter;

  // Night decorations: stars spread in night zone
  const nightSpan = 24 - (dusk - dawn);
  for (let i = 0; i < 5; i++) {
    let h = nc - nightSpan * 0.35 + (nightSpan * 0.7 * i) / 4;
    if (h < 0) h += 24;
    if (h >= 24) h -= 24;
    decos.push({ hour: h, type: i % 2 === 0 ? 'star4' : 'star6' });
  }

  // Day decorations: clouds spread in day zone
  const daySpan = dusk - dawn;
  for (let i = 0; i < 3; i++) {
    const h = dawn + daySpan * 0.2 + (daySpan * 0.6 * i) / 2;
    decos.push({ hour: h, type: i === 1 ? 'sparkle' : 'cloud' });
  }

  return decos;
}

/** Small 4-pointed star SVG path centered at (0,0) */
function star4Path(s: number): string {
  return `M 0 ${-s} L ${s * 0.25} ${-s * 0.25} L ${s} 0 L ${s * 0.25} ${s * 0.25} L 0 ${s} L ${-s * 0.25} ${s * 0.25} L ${-s} 0 L ${-s * 0.25} ${-s * 0.25} Z`;
}

/** 6-pointed star */
function star6Path(s: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6 - Math.PI / 2;
    const r = i % 2 === 0 ? s : s * 0.45;
    pts.push(`${r * Math.cos(a)},${r * Math.sin(a)}`);
  }
  return `M ${pts.join(' L ')} Z`;
}

// ── Labeled tick marks ──

function buildTicks(dawn: number, dusk: number) {
  return [
    { hour: dawn, label: 'DAWN' },
    { hour: 12, label: 'NOON' },
    { hour: dusk, label: 'DUSK' },
    { hour: 0, label: 'MIDNIGHT' },
  ];
}

// ── Component ──

export const SkyArc = memo(function SkyArc({ hour, minute, dawn, dusk }: SkyArcProps) {
  const uid = useId();
  const ringGlowId = `ringGlow-${uid}`;
  const celestialGlowId = `celestGlow-${uid}`;

  const fractionalHour = hour + minute / 60;
  const isDay = fractionalHour >= dawn && fractionalHour <= dusk;

  // Celestial body position on the ring center line
  const bodyAngle = hourToAngle(fractionalHour);
  const bodyPos = pointAt(bodyAngle, R);

  // Ring segments
  const segments = useMemo(() => {
    const segs: Array<{ startAngle: number; endAngle: number; color: string }> = [];
    for (let i = 0; i < SEGMENTS; i++) {
      const hStart = (i / SEGMENTS) * 24;
      const hMid = ((i + 0.5) / SEGMENTS) * 24;
      const startAngle = hourToAngle(hStart);
      const endAngle = hourToAngle(hStart + 24 / SEGMENTS);
      segs.push({ startAngle, endAngle, color: rgbStr(colorForHour(hMid, dawn, dusk)) });
    }
    return segs;
  }, [dawn, dusk]);

  // Stars inside circle
  const stars = useMemo(() => generateStars(dawn, dusk), [dawn, dusk]);

  // Ring decorations
  const decorations = useMemo(() => buildDecorations(dawn, dusk), [dawn, dusk]);

  // Tick marks
  const ticks = useMemo(() => buildTicks(dawn, dusk), [dawn, dusk]);

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className={styles.skyArc}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        {/* Ring glow */}
        <filter id={ringGlowId} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
          <feColorMatrix in="blur" type="saturate" values="1.4" result="saturated" />
          <feMerge>
            <feMergeNode in="saturated" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Celestial body glow */}
        <filter id={celestialGlowId} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="4" result="blur1" />
          <feGaussianBlur stdDeviation="9" result="blur2" />
          <feMerge>
            <feMergeNode in="blur2" />
            <feMergeNode in="blur1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Vignette for inner area */}
        <radialGradient id={`${uid}-vig`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="65%" stopColor="transparent" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.3)" />
        </radialGradient>
      </defs>

      {/* Dark inner background */}
      <circle cx={CX} cy={CY} r={R - RING_WIDTH / 2 - 1} fill="rgba(8, 5, 25, 0.7)" />

      {/* Stars in inner area */}
      {stars.map((s, i) => (
        <circle key={`s${i}`} cx={s.x} cy={s.y} r={s.r} fill="white" opacity={s.opacity} />
      ))}

      {/* Inner vignette */}
      <circle cx={CX} cy={CY} r={R - RING_WIDTH / 2 - 1} fill={`url(#${uid}-vig)`} />

      {/* Colored ring */}
      <g filter={`url(#${ringGlowId})`} opacity="0.9">
        {segments.map((seg, i) => (
          <path
            key={i}
            d={arcSegmentPath(seg.startAngle, seg.endAngle, R, RING_WIDTH)}
            fill={seg.color}
          />
        ))}
      </g>

      {/* Ornamental ring borders */}
      <circle cx={CX} cy={CY} r={R + RING_WIDTH / 2 + 0.5} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      <circle cx={CX} cy={CY} r={R + RING_WIDTH / 2 + 2.5} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
      <circle cx={CX} cy={CY} r={R - RING_WIDTH / 2 - 0.5} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />

      {/* Decorative icons on the ring */}
      {decorations.map((deco, i) => {
        const a = hourToAngle(deco.hour);
        const p = pointAt(a, R);
        const fill = deco.type === 'cloud' || deco.type === 'sparkle'
          ? 'rgba(255,255,255,0.2)'
          : 'rgba(255,255,255,0.3)';
        return (
          <g key={`deco${i}`} transform={`translate(${p.x},${p.y})`} opacity="0.7">
            {deco.type === 'star4' && (
              <path d={star4Path(4)} fill={fill} />
            )}
            {deco.type === 'star6' && (
              <path d={star6Path(3.5)} fill={fill} />
            )}
            {deco.type === 'cloud' && (
              /* Tiny cloud: three overlapping circles */
              <g fill={fill}>
                <circle cx={-2.5} cy={0.5} r={2.5} />
                <circle cx={0} cy={-1} r={3} />
                <circle cx={3} cy={0.5} r={2.5} />
              </g>
            )}
            {deco.type === 'sparkle' && (
              /* Diamond sparkle */
              <path d="M 0 -3.5 L 1 0 L 0 3.5 L -1 0 Z" fill={fill} />
            )}
          </g>
        );
      })}

      {/* Tick marks at dawn, noon, dusk, midnight */}
      {ticks.map(({ hour: h, label }) => {
        const a = hourToAngle(h);
        const innerPt = pointAt(a, R + RING_WIDTH / 2 + 2);
        const outerPt = pointAt(a, R + RING_WIDTH / 2 + 8);
        const labelPt = pointAt(a, R + RING_WIDTH / 2 + 17);
        return (
          <g key={label}>
            <line
              x1={innerPt.x} y1={innerPt.y}
              x2={outerPt.x} y2={outerPt.y}
              stroke="rgba(255,255,255,0.45)"
              strokeWidth="1.5"
            />
            <text
              x={labelPt.x}
              y={labelPt.y}
              textAnchor="middle"
              dominantBaseline="central"
              fill="rgba(255,255,255,0.5)"
              fontSize="6.5"
              fontFamily="inherit"
              letterSpacing="0.1em"
            >
              {label}
            </text>
          </g>
        );
      })}

      {/* Celestial body */}
      <g filter={`url(#${celestialGlowId})`} className={styles.celestialBody}>
        {isDay ? (
          <>
            {/* Sun rays */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
              const rad = (deg * Math.PI) / 180;
              const inner = deg % 90 === 0 ? 10 : 9;
              const outer = deg % 90 === 0 ? 16 : 13;
              return (
                <line
                  key={deg}
                  x1={bodyPos.x + inner * Math.cos(rad)}
                  y1={bodyPos.y + inner * Math.sin(rad)}
                  x2={bodyPos.x + outer * Math.cos(rad)}
                  y2={bodyPos.y + outer * Math.sin(rad)}
                  stroke="#FFD700"
                  strokeWidth={deg % 90 === 0 ? '1.2' : '0.8'}
                  opacity="0.6"
                />
              );
            })}
            <circle cx={bodyPos.x} cy={bodyPos.y} r="7" fill="#FFD700" />
            <circle cx={bodyPos.x} cy={bodyPos.y} r="4" fill="#FFFBE0" opacity="0.7" />
          </>
        ) : (
          /* Moon crescent */
          <>
            <circle cx={bodyPos.x} cy={bodyPos.y} r="7.5" fill="#D8D8F4" />
            <circle cx={bodyPos.x + 3} cy={bodyPos.y - 1.5} r="6" fill="rgba(20, 10, 60, 0.95)" />
            {/* Tiny moon sparkle */}
            <circle cx={bodyPos.x - 3} cy={bodyPos.y - 3} r="0.8" fill="white" opacity="0.6" />
          </>
        )}
      </g>
    </svg>
  );
});
