import { useEffect, useState } from 'react';

export default function SplashScreen({ onFinish }) {
    const [phase, setPhase] = useState('enter'); // 'enter' | 'exit'

    useEffect(() => {
        // Después de 2.2s empieza el fade out
        const exitTimer = setTimeout(() => setPhase('exit'), 2200);
        // Después de 2.7s llama onFinish para desmontar
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
            {/* Círculos de fondo decorativos */}
            <div style={{
                position: 'absolute',
                width: '320px',
                height: '320px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%)',
                animation: 'pulse-ring 2s ease-in-out infinite',
            }} />
            <div style={{
                position: 'absolute',
                width: '200px',
                height: '200px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)',
                animation: 'pulse-ring 2s ease-in-out infinite 0.3s',
            }} />

            {/* Contenedor principal animado */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1.25rem',
                animation: 'splash-enter 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
            }}>
                {/* Ícono de huevo rebotando */}
                <div style={{
                    fontSize: '5rem',
                    lineHeight: 1,
                    animation: 'egg-bounce 0.7s cubic-bezier(0.36, 0.07, 0.19, 0.97) infinite alternate',
                    filter: 'drop-shadow(0 8px 24px rgba(245,158,11,0.5))',
                    userSelect: 'none',
                }}>
                    🥚
                </div>

                {/* Nombre */}
                <div style={{ textAlign: 'center' }}>
                    <h1 style={{
                        fontSize: '2rem',
                        fontWeight: '800',
                        color: '#f59e0b',
                        letterSpacing: '-0.02em',
                        lineHeight: 1,
                        textShadow: '0 0 30px rgba(245,158,11,0.5)',
                    }}>
                        Huevos To-Go
                    </h1>
                    <p style={{
                        fontSize: '0.8rem',
                        color: 'rgba(148,163,184,0.8)',
                        marginTop: '0.4rem',
                        fontWeight: '500',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                    }}>
                        Gestión de pedidos
                    </p>
                </div>

                {/* Barra de carga */}
                <div style={{
                    width: '120px',
                    height: '3px',
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '999px',
                    overflow: 'hidden',
                    marginTop: '0.5rem',
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
          from {
            opacity: 0;
            transform: scale(0.7) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes egg-bounce {
          from {
            transform: translateY(0px) rotate(-8deg);
          }
          to {
            transform: translateY(-18px) rotate(8deg);
          }
        }

        @keyframes pulse-ring {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.15);
            opacity: 0.5;
          }
        }

        @keyframes load-bar {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
        </div>
    );
}
