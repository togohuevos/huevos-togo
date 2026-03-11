import { useEffect, useState } from 'react';

// SVG egg with cowboy handlebar mustache, just like the logo character
function EggWithMustache() {
  return (
    <svg
      viewBox="0 0 120 140"
      width="110"
      height="130"
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: 'drop-shadow(0 8px 24px rgba(245,158,11,0.55))' }}
    >
      {/* Egg body */}
      <ellipse cx="60" cy="76" rx="46" ry="58" fill="#FEFEFE" stroke="#e8e0d0" strokeWidth="1.5" />

      {/* Eyes */}
      <ellipse cx="45" cy="62" rx="7" ry="8" fill="white" stroke="#333" strokeWidth="1.2" />
      <ellipse cx="75" cy="62" rx="7" ry="8" fill="white" stroke="#333" strokeWidth="1.2" />
      <circle cx="46" cy="63" r="4" fill="#222" />
      <circle cx="76" cy="63" r="4" fill="#222" />
      {/* Eye shine */}
      <circle cx="48" cy="61" r="1.5" fill="white" />
      <circle cx="78" cy="61" r="1.5" fill="white" />

      {/* Eyebrows (slightly furrowed like the logo) */}
      <path d="M38 54 Q45 50 52 53" stroke="#333" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M68 53 Q75 50 82 54" stroke="#333" strokeWidth="2.5" fill="none" strokeLinecap="round" />

      {/* Nose hint */}
      <ellipse cx="60" cy="76" rx="4" ry="2.5" fill="rgba(0,0,0,0.07)" />

      {/* Smile */}
      <path d="M50 85 Q60 92 70 85" stroke="#ccc" strokeWidth="1.5" fill="none" strokeLinecap="round" />

      {/* HANDLEBAR MUSTACHE — thick, curly, black, cowboy style */}
      <path
        d="
          M60 80
          C55 77, 44 75, 36 78
          C30 80, 28 86, 33 88
          C37 90, 43 87, 48 83
          C52 80, 56 79, 60 80
          C64 79, 68 80, 72 83
          C77 87, 83 90, 87 88
          C92 86, 90 80, 84 78
          C76 75, 65 77, 60 80
          Z
        "
        fill="#1a1a1a"
        stroke="#111"
        strokeWidth="0.5"
      />

      {/* Mustache tips curl up */}
      <path
        d="M33 88 C28 88, 25 84, 28 80"
        stroke="#1a1a1a"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M87 88 C92 88, 95 84, 92 80"
        stroke="#1a1a1a"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function SplashScreen({ onFinish }) {
  const [phase, setPhase] = useState('enter'); // 'enter' | 'exit'

  useEffect(() => {
    const exitTimer = setTimeout(() => setPhase('exit'), 2200);
    const doneTimer = setTimeout(() => onFinish(), 2750);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, [onFinish]);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(145deg, #0f172a 0%, #1a2540 50%, #0f172a 100%)',
      opacity: phase === 'exit' ? 0 : 1,
      transition: 'opacity 0.55s ease',
    }}>
      {/* Decorative background glow rings */}
      <div style={{
        position: 'absolute',
        width: '320px', height: '320px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%)',
        animation: 'pulse-ring 2s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute',
        width: '200px', height: '200px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)',
        animation: 'pulse-ring 2s ease-in-out infinite 0.3s',
      }} />

      {/* Main animated container */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem',
        animation: 'splash-enter 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
      }}>
        {/* Bouncing egg SVG with mustache */}
        <div style={{
          animation: 'egg-bounce 0.7s cubic-bezier(0.36, 0.07, 0.19, 0.97) infinite alternate',
          userSelect: 'none',
        }}>
          <EggWithMustache />
        </div>

        {/* Brand name */}
        <div style={{ textAlign: 'center' }}>
          <h1 style={{
            fontSize: '2rem', fontWeight: '800', color: '#f59e0b',
            letterSpacing: '-0.02em', lineHeight: 1,
            textShadow: '0 0 30px rgba(245,158,11,0.5)',
          }}>
            Huevos To-Go
          </h1>
          <p style={{
            fontSize: '0.8rem', color: 'rgba(148,163,184,0.8)',
            marginTop: '0.4rem', fontWeight: '500',
            letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            Gestión de pedidos
          </p>
        </div>

        {/* Loading bar */}
        <div style={{
          width: '120px', height: '3px',
          background: 'rgba(255,255,255,0.1)', borderRadius: '999px',
          overflow: 'hidden', marginTop: '0.5rem',
        }}>
          <div style={{
            height: '100%',
            background: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
            borderRadius: '999px',
            animation: 'load-bar 2s ease-out forwards',
          }} />
        </div>
      </div>

      <style>{`
        @keyframes splash-enter {
          from { opacity: 0; transform: scale(0.7) translateY(20px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes egg-bounce {
          from { transform: translateY(0px) rotate(-5deg); }
          to   { transform: translateY(-18px) rotate(5deg); }
        }
        @keyframes pulse-ring {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%       { transform: scale(1.15); opacity: 0.5; }
        }
        @keyframes load-bar {
          from { width: 0%; }
          to   { width: 100%; }
        }
      `}</style>
    </div>
  );
}
