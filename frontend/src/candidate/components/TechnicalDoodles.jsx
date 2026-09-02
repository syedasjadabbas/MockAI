import React from 'react';

/**
 * Technical Corner Reticles (Viewfinder brackets)
 */
export const CornerReticles = ({ className = '', color = 'currentColor', size = 8 }) => (
  <>
    <span
      className={`c-hud-corner c-hud-tl ${className}`}
      style={{ width: size, height: size, borderColor: color }}
      aria-hidden="true"
    />
    <span
      className={`c-hud-corner c-hud-tr ${className}`}
      style={{ width: size, height: size, borderColor: color }}
      aria-hidden="true"
    />
    <span
      className={`c-hud-corner c-hud-bl ${className}`}
      style={{ width: size, height: size, borderColor: color }}
      aria-hidden="true"
    />
    <span
      className={`c-hud-corner c-hud-br ${className}`}
      style={{ width: size, height: size, borderColor: color }}
      aria-hidden="true"
    />
  </>
);

/**
 * Live Audio Waveform Equalizer (CSS Keyframe Animated)
 */
export const LiveAudioWaveform = ({
  bars = 12,
  active = true,
  height = 20,
  color = 'var(--c-accent)',
  className = '',
}) => {
  const delays = [0, 0.2, 0.4, 0.15, 0.35, 0.5, 0.25, 0.1, 0.45, 0.3, 0.18, 0.38];

  return (
    <div
      className={`inline-flex items-center gap-[3px] h-full ${className}`}
      style={{ height: `${height}px` }}
      aria-label="Audio waveform indicator"
    >
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className={`w-[2.5px] rounded-full transition-all ${
            active ? 'c-waveform-bar' : ''
          }`}
          style={{
            background: color,
            height: active ? undefined : '4px',
            animationDelay: `${delays[i % delays.length]}s`,
            animationDuration: `${0.8 + (i % 4) * 0.2}s`,
            minHeight: '3px',
          }}
        />
      ))}
    </div>
  );
};

/**
 * Live Video Waveform Signal (CSS Keyframe Animated Optical Raster)
 */
export const LiveVideoWaveform = ({
  bars = 12,
  active = true,
  height = 16,
  color = '#FF9F1C',
  className = '',
}) => {
  const delays = [0.3, 0.1, 0.45, 0.2, 0.5, 0.15, 0.35, 0.05, 0.25, 0.4, 0.12, 0.32];

  return (
    <div
      className={`inline-flex items-center gap-[3px] h-full ${className}`}
      style={{ height: `${height}px` }}
      aria-label="Video waveform signal indicator"
    >
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className={`w-[2.5px] rounded-full transition-all ${
            active ? 'c-waveform-bar' : ''
          }`}
          style={{
            background: color,
            height: active ? undefined : '4px',
            animationDelay: `${delays[i % delays.length]}s`,
            animationDuration: `${0.65 + (i % 3) * 0.25}s`,
            minHeight: '3px',
          }}
        />
      ))}
    </div>
  );
};

/**
 * Domain-Specific SVG Micro Schematics
 */

// AI & Machine Learning - Neural Node Lattice
export const NeuralNodesDiagram = ({ size = 28, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 28 28"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
    aria-hidden="true"
  >
    {/* Connection lines */}
    <line x1="6" y1="8" x2="14" y2="5" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" />
    <line x1="6" y1="8" x2="14" y2="14" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" />
    <line x1="6" y1="20" x2="14" y2="14" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" />
    <line x1="6" y1="20" x2="14" y2="23" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" />
    <line x1="14" y1="5" x2="22" y2="14" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" />
    <line x1="14" y1="14" x2="22" y2="14" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" />
    <line x1="14" y1="23" x2="22" y2="14" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" />
    {/* Nodes */}
    <circle cx="6" cy="8" r="2.5" fill="currentColor" fillOpacity="0.8" />
    <circle cx="6" cy="20" r="2.5" fill="currentColor" fillOpacity="0.8" />
    <circle cx="14" cy="5" r="2.5" fill="currentColor" fillOpacity="0.9" />
    <circle cx="14" cy="14" r="3" fill="var(--c-accent)" />
    <circle cx="14" cy="23" r="2.5" fill="currentColor" fillOpacity="0.9" />
    <circle cx="22" cy="14" r="3" fill="currentColor" />
  </svg>
);

// Frontend Development - Browser DOM & Layout Lattice
export const FrontendLayoutSchematic = ({ size = 28, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 28 28"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
    aria-hidden="true"
  >
    <rect x="4" y="5" width="20" height="18" rx="2" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.7" />
    <line x1="4" y1="10" x2="24" y2="10" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" />
    <circle cx="7" cy="7.5" r="1" fill="currentColor" strokeOpacity="0.6" />
    <circle cx="10" cy="7.5" r="1" fill="currentColor" strokeOpacity="0.6" />
    {/* Elements */}
    <rect x="7" y="13" width="6" height="7" rx="1" fill="var(--c-accent)" fillOpacity="0.3" stroke="var(--c-accent)" strokeWidth="1" />
    <line x1="16" y1="14" x2="21" y2="14" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.6" strokeLinecap="round" />
    <line x1="16" y1="17" x2="21" y2="17" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.4" strokeLinecap="round" />
    <line x1="16" y1="20" x2="19" y2="20" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.4" strokeLinecap="round" />
  </svg>
);

// Backend & Distributed Systems - Cluster & Node Pipeline
export const BackendClusterSchematic = ({ size = 28, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 28 28"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
    aria-hidden="true"
  >
    {/* Server rack 1 */}
    <rect x="4" y="5" width="20" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.7" />
    <circle cx="8" cy="8" r="1" fill="var(--c-success, #10B981)" />
    <line x1="12" y1="8" x2="20" y2="8" stroke="currentColor" strokeWidth="1" strokeOpacity="0.3" strokeLinecap="round" />
    {/* Server rack 2 */}
    <rect x="4" y="14" width="20" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.7" />
    <circle cx="8" cy="17" r="1" fill="var(--c-accent, #FF6B35)" />
    <line x1="12" y1="17" x2="20" y2="17" stroke="currentColor" strokeWidth="1" strokeOpacity="0.3" strokeLinecap="round" />
    {/* Data bus */}
    <line x1="14" y1="11" x2="14" y2="14" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.6" strokeDasharray="1 1" />
  </svg>
);

// Behavioral & Leadership - Acoustic Resonance & Dialogue
export const BehavioralDialogueSchematic = ({ size = 28, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 28 28"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
    aria-hidden="true"
  >
    <circle cx="10" cy="11" r="4" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.8" />
    <path d="M4 22C4 18.6863 6.68629 16 10 16C13.3137 16 16 18.6863 16 22" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.8" strokeLinecap="round" />
    {/* Acoustic Resonance Waves */}
    <path d="M18 9C19.5 10.5 19.5 13.5 18 15" stroke="var(--c-accent)" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M21 7C23.5 9.5 23.5 15.5 21 18" stroke="var(--c-accent)" strokeWidth="1.2" strokeOpacity="0.6" strokeLinecap="round" />
  </svg>
);

// Data Analytics & SQL - Relational Matrix & Aggregation
export const SqlMatrixSchematic = ({ size = 28, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 28 28"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
    aria-hidden="true"
  >
    <ellipse cx="14" cy="7" rx="9" ry="3.5" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.8" />
    <path d="M5 7V14C5 15.933 9.02944 17.5 14 17.5C18.9706 17.5 23 15.933 23 14V7" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.7" />
    <path d="M5 14V21C5 22.933 9.02944 24.5 14 24.5C18.9706 24.5 23 22.933 23 21V14" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.7" />
    <line x1="14" y1="10.5" x2="14" y2="14" stroke="var(--c-accent)" strokeWidth="1.2" />
  </svg>
);

/**
 * Technical HUD Tag (e.g. `[REC 00:32]`, `[44.1kHz]`)
 */
export const TechnicalHUDTag = ({ label, value, tone = 'default', className = '' }) => (
  <div
    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono border select-none ${className}`}
    style={{
      background: 'var(--c-surface-muted)',
      borderColor: 'var(--c-border)',
      color: tone === 'accent' ? 'var(--c-accent)' : 'var(--c-text-secondary)',
    }}
  >
    {label && <span className="opacity-60 uppercase">{label}:</span>}
    <span className="font-bold">{value}</span>
  </div>
);

/**
 * Hand-Drawn / Technical SVG Annotation Arrow
 */
export const TechnicalArrow = ({ direction = 'right', className = '', color = 'var(--c-accent)' }) => (
  <svg
    width="24"
    height="16"
    viewBox="0 0 24 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ transform: direction === 'down' ? 'rotate(90deg)' : direction === 'left' ? 'rotate(180deg)' : 'none' }}
    aria-hidden="true"
  >
    <path
      d="M2 8H20M20 8L14 3M20 8L14 13"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * Geometric Assessment Dossier Seal
 */
export const AssessmentDossierSeal = ({ size = 32, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
    aria-hidden="true"
  >
    <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="1" strokeOpacity="0.3" />
    <circle cx="16" cy="16" r="11" stroke="var(--c-accent)" strokeWidth="1.2" strokeDasharray="3 2" />
    <path d="M11 16L14.5 19.5L21 13" stroke="var(--c-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * Optical Camera Reticle Graphic (For Preparation / Simulator)
 */
export const OpticalLensReticle = ({ size = 48, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
    aria-hidden="true"
  >
    <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="1" strokeOpacity="0.25" />
    <circle cx="24" cy="24" r="14" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.5" />
    <circle cx="24" cy="24" r="4" fill="var(--c-accent)" fillOpacity="0.3" stroke="var(--c-accent)" strokeWidth="1.2" />
    {/* Target crosshairs */}
    <line x1="24" y1="2" x2="24" y2="8" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.6" />
    <line x1="24" y1="40" x2="24" y2="46" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.6" />
    <line x1="2" y1="24" x2="8" y2="24" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.6" />
    <line x1="40" y1="24" x2="46" y2="24" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.6" />
  </svg>
);
