import React, { useMemo } from 'react';
import candidateBg from '../../assets/candidate_bg.jpg';
import logo from '../../assets/logo.png';

// Shared visual identity panel for Login / Register / Forgot Password.
//
// Refined to flagship-quality: typography (Fraunces + Inter), integrated
// breathing audio waveform, and polished vertical composition.

function makeWaveform(count) {
  const bars = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    
    // Smooth bell-curve envelope to taper the edges
    const env = Math.sin(t * Math.PI);
    
    // Multi-frequency wave calculation for natural complexity
    const wave = 0.45 * Math.sin(t * 8 * Math.PI) + 
                 0.35 * Math.cos(t * 18 * Math.PI + 0.5) + 
                 0.20 * Math.sin(t * 28 * Math.PI);
                 
    // Map to premium looking peak heights (between 15% and 85%)
    const h = 15 + 70 * Math.abs(wave) * env;
    bars.push(Math.min(85, Math.max(15, Math.round(h))));
  }
  return bars;
}

const BARS = makeWaveform(48);

const AuthVisualPanel = () => {
  const bars = useMemo(() => BARS, []);

  return (
    <div
      className="relative hidden lg:flex lg:flex-col lg:justify-between h-full overflow-hidden p-12 xl:p-16 select-none bg-cover bg-center"
      style={{
        backgroundImage: `url(${candidateBg})`,
        borderRight: '1px solid var(--c-border)',
      }}
    >
      {/* Dynamic Dark/Warm Overlay matching --c-bg */}
      <div className="absolute inset-0 bg-[var(--c-bg)]/90 sm:bg-[var(--c-bg)]/88 backdrop-blur-[1px] transition-colors duration-300 pointer-events-none" />

      {/* Restrained decorative geometry */}
      <div
        className="absolute -right-24 -top-24 w-72 h-72 rounded-full pointer-events-none z-0"
        style={{ border: '1px solid var(--c-border-strong)', opacity: 0.35 }}
      />

      {/* Brand logo in top-left */}
      <div className="relative z-10 shrink-0 select-none">
        <img src={logo} alt="MockAI Logo" className="h-14 w-auto object-contain" />
      </div>

      {/* Flagship vertically centered composition */}
      <div className="relative z-10 flex-1 flex flex-col justify-center max-w-md py-12">
        <p className="c-eyebrow mb-4">Interview Practice</p>
        
        <h1 className="c-heading text-4xl xl:text-5xl leading-[1.12] mb-6">
          Practice before it matters.
        </h1>
        
        {/* Integrated Sophisticated Waveform */}
        <div 
          className="h-16 flex items-end gap-[3.5px] my-6 pointer-events-none"
          aria-hidden="true"
        >
          {bars.map((h, i) => {
            const t = i / (bars.length - 1);
            const env = Math.sin(t * Math.PI);
            // Edge bars have lower opacity, peak center has higher opacity
            const opacity = 0.2 + 0.65 * env;
            
            return (
              <div
                key={i}
                className="flex-1 rounded-full origin-bottom"
                style={{
                  height: `${h}%`,
                  background: 'var(--c-accent)',
                  opacity: opacity,
                  animation: 'waveform-shimmer 4s ease-in-out infinite',
                  animationDelay: `${i * 0.06}s`,
                }}
              />
            );
          })}
        </div>

        <p className="text-sm leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
          Simulate real interviews, review your performance, and improve with every attempt.
        </p>
      </div>

      {/* Silent spacer to align the grid layout nicely */}
      <div className="h-6 shrink-0 relative z-10" />
    </div>
  );
};

export default AuthVisualPanel;
