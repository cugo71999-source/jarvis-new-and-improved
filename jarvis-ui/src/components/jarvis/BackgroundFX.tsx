import React, { useEffect, useRef } from 'react';

export function BackgroundFX() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    let af: number, t = 0;

    const tick = () => {
      const W = canvas.width, H = canvas.height;
      const cx = W / 2, cy = H / 2 - 20;
      ctx.clearRect(0, 0, W, H);

      /* ── Deep radial background ── */
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.7);
      bg.addColorStop(0, 'rgba(0, 40, 90, 0.18)');
      bg.addColorStop(0.35, 'rgba(0, 20, 55, 0.12)');
      bg.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      /* ── Radial circuit lines from center ── */
      const lineCount = 32;
      for (let i = 0; i < lineCount; i++) {
        const angle = (i / lineCount) * Math.PI * 2;
        const len = 320 + Math.random() * 40;
        const x1 = cx + 120 * Math.cos(angle);
        const y1 = cy + 120 * Math.sin(angle);
        const x2 = cx + len * Math.cos(angle);
        const y2 = cy + len * Math.sin(angle);
        const grad = ctx.createLinearGradient(x1, y1, x2, y2);
        grad.addColorStop(0, 'rgba(0,180,255,0.12)');
        grad.addColorStop(1, 'rgba(0,100,200,0)');
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 0.6;
        ctx.stroke();

        /* dot nodes along lines */
        [0.3, 0.55, 0.8].forEach(f => {
          const nx = cx + len * f * Math.cos(angle);
          const ny = cy + len * f * Math.sin(angle);
          ctx.beginPath();
          ctx.arc(nx, ny, 1.2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(0,180,255,${0.25 - f * 0.2})`;
          ctx.fill();
        });
      }

      t += 0.008;
      af = requestAnimationFrame(tick);
    };
    tick();
    return () => { cancelAnimationFrame(af); window.removeEventListener('resize', resize); };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
      {/* Base dark background */}
      <div className="absolute inset-0" style={{ background: '#030a18' }} />
      {/* Subtle grid overlay */}
      <div className="absolute inset-0" style={{
        backgroundImage: 'linear-gradient(rgba(0,180,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(0,180,255,0.025) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />
      {/* Circuit canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}
