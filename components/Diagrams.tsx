import React from "react";

type DiagramProps = {
  className?: string;
};

/** Gooseneck kettle rendered as a dimensioned line drawing. */
export function KettleDiagram({ className }: DiagramProps) {
  return (
    <svg
      viewBox="0 0 240 260"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M70 90 C70 60 90 40 120 40 C150 40 165 60 165 85 L165 190 C165 210 150 225 128 225 L92 225 C74 225 60 210 60 192 L60 120"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M165 95 C190 90 205 70 200 48 C197 34 182 28 172 36"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M92 45 L78 20"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="76" cy="16" r="4" stroke="currentColor" strokeWidth="1.5" />
      <line
        x1="30"
        y1="40"
        x2="30"
        y2="225"
        stroke="currentColor"
        strokeWidth="0.75"
        strokeDasharray="2 3"
      />
      <line x1="26" y1="40" x2="34" y2="40" stroke="currentColor" strokeWidth="0.75" />
      <line x1="26" y1="225" x2="34" y2="225" stroke="currentColor" strokeWidth="0.75" />
      <text x="14" y="135" fontSize="9" fill="currentColor" transform="rotate(-90 14 135)">
        1.0L
      </text>
    </svg>
  );
}

/** Precision scale rendered as a dimensioned line drawing. */
export function ScaleDiagram({ className }: DiagramProps) {
  return (
    <svg
      viewBox="0 0 240 260"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="45"
        y="150"
        width="150"
        height="55"
        rx="4"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="70"
        y="115"
        width="100"
        height="35"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <line x1="90" y1="132" x2="150" y2="132" stroke="currentColor" strokeWidth="1" />
      <text x="120" y="129" fontSize="10" fill="currentColor" textAnchor="middle">
        18.4 g
      </text>
      <line
        x1="45"
        y1="225"
        x2="195"
        y2="225"
        stroke="currentColor"
        strokeWidth="0.75"
        strokeDasharray="2 3"
      />
      <line x1="45" y1="221" x2="45" y2="229" stroke="currentColor" strokeWidth="0.75" />
      <line x1="195" y1="221" x2="195" y2="229" stroke="currentColor" strokeWidth="0.75" />
      <text x="120" y="242" fontSize="9" fill="currentColor" textAnchor="middle">
        150mm
      </text>
    </svg>
  );
}

/** Burr grinder rendered as a dimensioned line drawing. */
export function GrinderDiagram({ className }: DiagramProps) {
  return (
    <svg
      viewBox="0 0 240 260"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M95 35 L145 35 L155 70 L85 70 Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="80"
        y="70"
        width="80"
        height="120"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M80 190 L160 190 L150 215 L90 215 Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="120" cy="120" r="22" stroke="currentColor" strokeWidth="1" />
      <circle cx="120" cy="120" r="3" fill="currentColor" />
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i * Math.PI) / 4;
        const x1 = 120 + Math.cos(angle) * 10;
        const y1 = 120 + Math.sin(angle) * 10;
        const x2 = 120 + Math.cos(angle) * 20;
        const y2 = 120 + Math.sin(angle) * 20;
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="currentColor"
            strokeWidth="0.75"
          />
        );
      })}
      <text x="120" y="205" fontSize="8" fill="currentColor" textAnchor="middle">
        40 SETTINGS
      </text>
    </svg>
  );
}

/** Brew timer rendered as a dimensioned line drawing. */
export function TimerDiagram({ className }: DiagramProps) {
  return (
    <svg
      viewBox="0 0 240 260"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle cx="120" cy="135" r="70" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="120" cy="135" r="58" stroke="currentColor" strokeWidth="0.75" />
      <line x1="120" y1="135" x2="120" y2="90" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="120" y1="135" x2="150" y2="150" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="112" y1="58" x2="128" y2="58" stroke="currentColor" strokeWidth="1.5" />
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i * Math.PI) / 6 - Math.PI / 2;
        const x1 = 120 + Math.cos(angle) * 64;
        const y1 = 135 + Math.sin(angle) * 64;
        const x2 = 120 + Math.cos(angle) * 70;
        const y2 = 135 + Math.sin(angle) * 70;
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="currentColor"
            strokeWidth="0.75"
          />
        );
      })}
      <text x="120" y="230" fontSize="9" fill="currentColor" textAnchor="middle">
        0.1s RESOLUTION
      </text>
    </svg>
  );
}

/** Large hero diagram: kettle with full dimension-line annotations. */
export function HeroDiagram({ className }: DiagramProps) {
  return (
    <svg
      viewBox="0 0 420 480"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* Kettle body */}
      <path
        d="M140 150 C140 100 175 65 225 65 C275 65 300 100 300 145 L300 340 C300 375 270 400 232 400 L168 400 C136 400 110 375 110 344 L110 220"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      {/* Spout */}
      <path
        d="M300 160 C345 152 372 118 364 82 C359 58 332 48 314 60"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      {/* Handle */}
      <path
        d="M170 72 L146 28"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="142" cy="21" r="6" stroke="currentColor" strokeWidth="1.75" />
      {/* Lid seam */}
      <path d="M150 70 C170 55 250 55 288 78" stroke="currentColor" strokeWidth="1" strokeDasharray="3 4" />

      {/* Vertical dimension line, height */}
      <line x1="60" y1="65" x2="60" y2="400" stroke="currentColor" strokeWidth="0.75" strokeDasharray="2 4" />
      <line x1="54" y1="65" x2="66" y2="65" stroke="currentColor" strokeWidth="0.75" />
      <line x1="54" y1="400" x2="66" y2="400" stroke="currentColor" strokeWidth="0.75" />
      <text x="42" y="235" fontSize="11" fill="currentColor" transform="rotate(-90 42 235)">
        220mm
      </text>

      {/* Horizontal dimension line, base width */}
      <line x1="110" y1="425" x2="300" y2="425" stroke="currentColor" strokeWidth="0.75" strokeDasharray="2 4" />
      <line x1="110" y1="419" x2="110" y2="431" stroke="currentColor" strokeWidth="0.75" />
      <line x1="300" y1="419" x2="300" y2="431" stroke="currentColor" strokeWidth="0.75" />
      <text x="205" y="446" fontSize="11" fill="currentColor" textAnchor="middle">
        140mm
      </text>

      {/* Callout: fill line */}
      <line x1="300" y1="220" x2="345" y2="220" stroke="currentColor" strokeWidth="0.75" />
      <text x="350" y="223" fontSize="10" fill="currentColor">
        1.0L max fill
      </text>

      {/* Callout: temp probe */}
      <line x1="230" y1="145" x2="230" y2="30" stroke="currentColor" strokeWidth="0.75" />
      <line x1="230" y1="30" x2="270" y2="30" stroke="currentColor" strokeWidth="0.75" />
      <text x="275" y="33" fontSize="10" fill="currentColor">
        ±1°C hold
      </text>
    </svg>
  );
}
