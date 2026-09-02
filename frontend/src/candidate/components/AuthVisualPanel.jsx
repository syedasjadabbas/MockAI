import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CANDIDATE_IMAGES } from '../assets/images';
import logo from '../../assets/logo.png';
import { CornerReticles, TechnicalHUDTag } from './TechnicalDoodles';

function makeWaveform(count) {
  const bars = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const env = Math.sin(t * Math.PI);
    const wave = 0.45 * Math.sin(t * 8 * Math.PI) + 
                 0.35 * Math.cos(t * 18 * Math.PI + 0.5) + 
                 0.20 * Math.sin(t * 28 * Math.PI);
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
      className="relative hidden lg:flex lg:flex-col lg:justify-between h-full overflow-hidden p-10 xl:p-14 select-none bg-cover bg-center border-r"
      style={{
        backgroundImage: `url(${CANDIDATE_IMAGES.authHero})`,
        borderColor: 'var(--c-border)',
        backgroundColor: '#070B16',
      }}
    >
      <div className="absolute inset-0 bg-[#070B16]/85 pointer-events-none" />

      {/* Brand logo */}
      <div className="flex items-center justify-between relative z-10">
        <Link 
          to="/" 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} 
          className="shrink-0 select-none block"
        >
          <img src={logo} alt="MockAI Logo" className="c-brand-logo" />
        </Link>
        <TechnicalHUDTag label="SECURITY" value="TLS 1.3" tone="accent" />
      </div>

      {/* Center Composition with Framing Reticles */}
      <div className="relative z-10 flex-1 flex flex-col justify-center max-w-md py-10 my-auto">
        <div className="p-6 rounded-lg border relative group"
          style={{
            background: 'rgba(10, 16, 32, 0.75)',
            borderColor: 'var(--c-border)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <CornerReticles size={10} color="var(--c-accent)" />
          
          <div className="flex items-center justify-between mb-2">
            <p className="c-eyebrow">Practice Platform</p>
            <span className="c-tech-annotation text-orange-400">SESSION.AUTH</span>
          </div>
          
          <h1 className="c-heading text-2xl xl:text-3xl font-bold leading-tight mb-4 text-white">
            Practice before it matters.
          </h1>
          
          {/* Waveform indicator */}
          <div 
            className="h-10 flex items-end gap-[3px] my-4 pointer-events-none"
            aria-hidden="true"
          >
            {bars.map((h, i) => {
              const t = i / (bars.length - 1);
              const env = Math.sin(t * Math.PI);
              const opacity = 0.4 + 0.6 * env;
              
              return (
                <div
                  key={i}
                  className="flex-1 rounded-xs origin-bottom"
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

          <p className="text-xs leading-relaxed text-slate-300">
            Simulate realistic interviews with timed prompts, speech recording, and structured evaluation scoring.
          </p>
        </div>
      </div>

      {/* Bottom Telemetry Footer */}
      <div className="relative z-10 flex items-center justify-between text-[11px] font-mono text-slate-400 border-t pt-4"
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}
      >
        <span>[EVALUATION ENGINE v2.4]</span>
        <span>[SAMPLING: 44.1kHz]</span>
      </div>
    </div>
  );
};

export default AuthVisualPanel;


