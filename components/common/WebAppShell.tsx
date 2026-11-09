import React, { useEffect } from 'react';
import { Platform } from 'react-native';

interface Props {
  children: React.ReactNode;
}

function useScrollReveal() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;

    let io: IntersectionObserver;

    function observe(el: Element) {
      io.observe(el);
    }

    function initReveal() {
      if (io) io.disconnect();
      io = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('revealed');
            io.unobserve(e.target);
          }
        });
      }, { threshold: 0.12 });
      document.querySelectorAll('.reveal, .reveal-left, .reveal-scale').forEach(observe);
    }

    initReveal();

    // Re-observe when new nodes are added (SPA route changes)
    const mo = new MutationObserver(() => {
      document.querySelectorAll('.reveal:not(.revealed), .reveal-left:not(.revealed), .reveal-scale:not(.revealed)').forEach(observe);
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => { io?.disconnect(); mo.disconnect(); };
  }, []);
}

export function WebAppShell({ children }: Props) {
  useScrollReveal();
  if (Platform.OS !== 'web') return <>{children}</>;

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body {
          width: 100%; height: 100%;
          overflow-x: hidden;
        }
        #root {
          width: 100%; min-height: 100vh;
          display: flex; flex-direction: column;
        }

        /* ── Fade + slide up on enter ── */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-32px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes shimmer {
          0%   { background-position: -600px 0; }
          100% { background-position: 600px 0; }
        }

        .anim-fade-up {
          animation: fadeUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .anim-fade-in {
          animation: fadeIn 0.4s ease both;
        }
        .anim-slide-left {
          animation: slideInLeft 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .anim-scale-in {
          animation: scaleIn 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        /* stagger delays */
        .delay-1 { animation-delay: 0.05s; }
        .delay-2 { animation-delay: 0.10s; }
        .delay-3 { animation-delay: 0.15s; }
        .delay-4 { animation-delay: 0.20s; }
        .delay-5 { animation-delay: 0.25s; }
        .delay-6 { animation-delay: 0.30s; }
        .delay-7 { animation-delay: 0.35s; }
        .delay-8 { animation-delay: 0.40s; }

        /* ── Scroll-reveal: elements start hidden, JS adds .revealed ── */
        .reveal {
          opacity: 0;
          transform: translateY(28px);
          transition: opacity 0.55s cubic-bezier(0.22,1,0.36,1),
                      transform 0.55s cubic-bezier(0.22,1,0.36,1);
        }
        .reveal.revealed {
          opacity: 1;
          transform: translateY(0);
        }
        .reveal-left {
          opacity: 0;
          transform: translateX(-28px);
          transition: opacity 0.55s cubic-bezier(0.22,1,0.36,1),
                      transform 0.55s cubic-bezier(0.22,1,0.36,1);
        }
        .reveal-left.revealed {
          opacity: 1;
          transform: translateX(0);
        }
        .reveal-scale {
          opacity: 0;
          transform: scale(0.96);
          transition: opacity 0.5s cubic-bezier(0.22,1,0.36,1),
                      transform 0.5s cubic-bezier(0.22,1,0.36,1);
        }
        .reveal-scale.revealed {
          opacity: 1;
          transform: scale(1);
        }
        /* stagger siblings inside a reveal-group */
        .reveal-group > *:nth-child(1) { transition-delay: 0s; }
        .reveal-group > *:nth-child(2) { transition-delay: 0.08s; }
        .reveal-group > *:nth-child(3) { transition-delay: 0.16s; }
        .reveal-group > *:nth-child(4) { transition-delay: 0.24s; }
        .reveal-group > *:nth-child(5) { transition-delay: 0.32s; }

        /* ── Destination card grid ── */
        .dest-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        .dest-grid > * { min-width: 0; }

        /* ── Hover lift on cards ── */
        .hover-lift {
          transition: transform 0.2s cubic-bezier(0.22, 1, 0.36, 1),
                      box-shadow 0.2s ease;
          cursor: pointer;
        }
        .hover-lift:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 32px rgba(7, 92, 115, 0.15);
        }

        /* ── Hover glow on primary buttons ── */
        .hover-glow {
          transition: box-shadow 0.2s ease, transform 0.15s ease;
        }
        .hover-glow:hover {
          box-shadow: 0 0 0 4px rgba(7, 92, 115, 0.18);
          transform: translateY(-1px);
        }

        /* ── Nav link underline slide ── */
        .nav-link {
          position: relative;
          transition: color 0.2s ease;
        }
        .nav-link::after {
          content: '';
          position: absolute;
          bottom: -3px; left: 0;
          width: 0; height: 2px;
          background: currentColor;
          transition: width 0.25s cubic-bezier(0.22, 1, 0.36, 1);
          border-radius: 2px;
        }
        .nav-link:hover::after { width: 100%; }

        /* ── Chip hover ── */
        .hover-chip {
          transition: background 0.18s ease, transform 0.15s ease;
        }
        .hover-chip:hover { transform: translateY(-2px); }

        /* ── Hero image parallax-ish scale ── */
        .hero-img {
          transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .hero-img:hover { transform: scale(1.02); }

        /* ── Hero carousel ── */
        .hero-slide {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0;
          transition: opacity 0.9s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .hero-slide.active {
          opacity: 1;
        }

        /* ── Page transition wrapper ── */
        .page-enter {
          animation: fadeIn 0.35s ease both;
        }
      `}</style>
      {children}
    </>
  );
}
