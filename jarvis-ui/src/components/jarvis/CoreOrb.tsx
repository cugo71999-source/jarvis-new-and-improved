import React, { useEffect, useRef } from 'react';
import { useJarvisStore } from '../../store/jarvisStore';

const TAU = Math.PI * 2;

/* ── State config ─────────────────────────────────────────────────────────── */
type SC = { r: number; g: number; b: number; speed: number; intensity: number };
const STATE: Record<string, SC> = {
  idle:       { r: 0,   g: 180, b: 255, speed: 0.6,  intensity: 0.80 },
  listening:  { r: 0,   g: 230, b: 255, speed: 1.2,  intensity: 1.10 },
  processing: { r: 255, g: 140, b: 0,   speed: 2.5,  intensity: 1.30 },
  executing:  { r: 255, g: 70,  b: 0,   speed: 2.2,  intensity: 1.20 },
  speaking:   { r: 60,  g: 160, b: 255, speed: 1.0,  intensity: 0.95 },
};

/* ── Simplified ring definitions ──────────────────────────────────────────── */
/* [rx, ry, canvasRotDeg, speedMul, dir, lineW, baseAlpha, dash[], nodeCount, colorT] */
type RingDef = [number,number,number,number,number,number,number,number[],number,number];
const RING_DEFS: RingDef[] = [
  /* Equatorial rings */
  [238, 238,  0,  0.16,  1, 0.55, 0.12, [190,50],  0, 0.00],
  [210, 210,  0,  0.22, -1, 0.75, 0.22, [],         2, 0.10],
  [178, 178,  0,  0.30,  1, 1.00, 0.34, [150,28],   3, 0.22],
  [148, 148,  0,  0.42, -1, 1.30, 0.46, [],         3, 0.36],
  [118, 118,  0,  0.58,  1, 1.65, 0.60, [100,20],   3, 0.52],
  [ 88,  88,  0,  0.80, -1, 2.10, 0.74, [],         4, 0.68],
  [ 58,  58,  0,  1.15,  1, 2.90, 0.89, [ 50,10],   3, 0.84],
  [ 32,  32,  0,  1.70, -1, 4.20, 0.97, [],         3, 0.96],
  /* Latitude bands */
  [215, 56,   0,  0.20,  1, 0.65, 0.22, [180,36],   1, 0.06],
  [215, 56, 180,  0.20, -1, 0.65, 0.22, [180,36],   1, 0.06],
  /* Meridian rings */
  [ 55, 228,   0, 0.18,  1, 0.60, 0.24, [200,42],   2, 0.07],
  [ 55, 228,  60, 0.21, -1, 0.60, 0.24, [200,42],   2, 0.07],
  [ 55, 228, 120, 0.24,  1, 0.60, 0.24, [200,42],   2, 0.07],
  /* Diagonal rings */
  [195, 74,  32,  0.28, -1, 0.80, 0.30, [160,32],   2, 0.12],
  [155, 58,  68,  0.36,  1, 0.75, 0.28, [],          2, 0.20],
];

interface RingState { orbRot: number; nodeRots: number[] }
interface Particle  { x: number; y: number; vx: number; vy: number; r: number; life: number }

function lerpColor(c1: number[], c2: number[], t: number) {
  return c1.map((v, i) => v + (c2[i] - v) * t);
}
function ringColor(colorT: number, sc: SC): string {
  const outerRGB = [0, 30, 80];
  const midRGB   = [sc.r * 0.45, sc.g * 0.55, sc.b * 0.75];
  const coreRGB  = [sc.r, sc.g, sc.b];
  const whiteRGB = [255, 255, 255];
  let rgb: number[];
  if      (colorT < 0.4)  rgb = lerpColor(outerRGB, midRGB,   colorT / 0.4);
  else if (colorT < 0.75) rgb = lerpColor(midRGB,   coreRGB,  (colorT - 0.4) / 0.35);
  else                    rgb = lerpColor(coreRGB,   whiteRGB, (colorT - 0.75) / 0.25);
  const alpha = 0.45 + colorT * 0.55;
  return `rgba(${rgb.map(Math.round).join(',')},${alpha.toFixed(2)})`;
}

export function CoreOrb() {
  const { state } = useJarvisStore();
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const ringsRef    = useRef<RingState[]>(
    RING_DEFS.map(d => ({
      orbRot:   Math.random() * TAU,
      nodeRots: Array.from({ length: d[8] }, () => Math.random() * TAU),
    }))
  );
  const particlesRef = useRef<Particle[]>([]);
  const scanRef      = useRef({ phase: Math.random() });
  const prevTRef     = useRef(performance.now());
  const globalTRef   = useRef(0);
  const stateRef     = useRef(state);
  stateRef.current   = state;

  const SZ = 540;
  const CX = SZ / 2, CY = SZ / 2;
  const FRAME_MS = 1000 / 36; /* cap at 36fps */

  useEffect(() => {
    particlesRef.current = Array.from({ length: 40 }, () => ({
      x:  (Math.random() - 0.5) * 340,
      y:  (Math.random() - 0.5) * 340,
      vx: (Math.random() - 0.5) * 14,
      vy: (Math.random() - 0.5) * 14,
      r:  0.5 + Math.random() * 1.6,
      life: Math.random(),
    }));
  }, []);

  useEffect(() => {
    let af: number;

    const draw = (now: number) => {
      af = requestAnimationFrame(draw);
      if (now - prevTRef.current < FRAME_MS) return;
      const dt = Math.min((now - prevTRef.current) / 1000, 0.05);
      prevTRef.current = now;
      globalTRef.current += dt;
      const T   = globalTRef.current;
      const sc  = STATE[stateRef.current] ?? STATE.idle;
      const spd = sc.speed;
      const itx = sc.intensity;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx)   return;

      ctx.clearRect(0, 0, SZ, SZ);

      /* Atmosphere */
      const atm = ctx.createRadialGradient(CX, CY, 0, CX, CY, SZ * 0.5);
      atm.addColorStop(0,   `rgba(${sc.r},${sc.g},${sc.b},${0.07 * itx})`);
      atm.addColorStop(0.5, `rgba(${sc.r},${sc.g},${sc.b},${0.02 * itx})`);
      atm.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = atm;
      ctx.fillRect(0, 0, SZ, SZ);

      /* Particles */
      const isProc   = stateRef.current === 'processing' || stateRef.current === 'executing';
      const isListen = stateRef.current === 'listening';
      const pts: [number, number][] = [];

      particlesRef.current.forEach(p => {
        const sm = isProc ? 2.8 : isListen ? 1.6 : 1;
        p.x += p.vx * dt * sm;
        p.y += p.vy * dt * sm;
        p.life += dt * 0.12;
        if (Math.hypot(p.x, p.y) > 230 || p.life > 1) {
          const a = Math.random() * TAU, d = 50 + Math.random() * 170;
          p.x = Math.cos(a) * d; p.y = Math.sin(a) * d;
          p.vx = (Math.random() - 0.5) * (isProc ? 26 : 14);
          p.vy = (Math.random() - 0.5) * (isProc ? 26 : 14);
          p.life = 0;
        }
        const fadeIn  = Math.min(1, p.life / 0.2);
        const fadeOut = 1 - Math.max(0, (p.life - 0.75) / 0.25);
        const dist    = Math.hypot(p.x, p.y);
        const alpha   = fadeIn * fadeOut * (0.25 + (1 - dist / 230) * 0.4) * itx;
        if (alpha < 0.02) return;
        const px = CX + p.x, py = CY + p.y;
        ctx.beginPath();
        ctx.arc(px, py, p.r, 0, TAU);
        ctx.fillStyle = `rgba(${sc.r},${sc.g},${sc.b},${alpha.toFixed(2)})`;
        ctx.fill();
        pts.push([px, py]);
      });

      /* Neural connections */
      const linkDist = isProc ? 50 : 38;
      ctx.lineWidth = 0.35;
      for (let i = 0; i < pts.length - 1; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[j][0] - pts[i][0], dy = pts[j][1] - pts[i][1];
          const d2 = dx * dx + dy * dy;
          if (d2 < linkDist * linkDist) {
            ctx.beginPath();
            ctx.moveTo(pts[i][0], pts[i][1]);
            ctx.lineTo(pts[j][0], pts[j][1]);
            ctx.strokeStyle = `rgba(${sc.r},${sc.g},${sc.b},${((1 - Math.sqrt(d2) / linkDist) * 0.14 * itx).toFixed(3)})`;
            ctx.stroke();
          }
        }
      }

      /* Rings — single pass, no per-ring shadow blur */
      ctx.save();
      ctx.translate(CX, CY);
      RING_DEFS.forEach((def, i) => {
        const [rx, ry, rotDeg, speedMul, dir, lw, baseAlpha, dash, nodeCount, colorT] = def;
        const rs = ringsRef.current[i];
        rs.orbRot += speedMul * dir * spd * dt * 0.38;
        const canvasRot = rotDeg * (Math.PI / 180);
        const alpha = Math.min(1, baseAlpha * itx);

        ctx.save();
        ctx.rotate(rs.orbRot);
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, canvasRot, 0, TAU);
        if (dash.length) ctx.setLineDash(dash);
        ctx.strokeStyle = ringColor(colorT, sc);
        ctx.lineWidth   = lw;
        ctx.globalAlpha = alpha;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;

        if (nodeCount > 0) {
          const nodeSpd = speedMul * dir * spd * dt * (isProc ? 2.5 : 1.0);
          rs.nodeRots.forEach((_, ni) => {
            rs.nodeRots[ni] += nodeSpd * (0.85 + ni * 0.1);
            const angle = rs.nodeRots[ni] + (ni / nodeCount) * TAU;
            const ex = rx * Math.cos(angle), ey = ry * Math.sin(angle);
            const nx = ex * Math.cos(canvasRot) - ey * Math.sin(canvasRot);
            const ny = ex * Math.sin(canvasRot) + ey * Math.cos(canvasRot);
            const ns = isProc ? 3.2 : 2.4;

            for (let t = 1; t <= 4; t++) {
              const ta  = angle - t * 0.045 * (isProc ? 1.8 : 1) * dir;
              const tex = rx * Math.cos(ta), tey = ry * Math.sin(ta);
              const tnx = tex * Math.cos(canvasRot) - tey * Math.sin(canvasRot);
              const tny = tex * Math.sin(canvasRot) + tey * Math.cos(canvasRot);
              ctx.beginPath();
              ctx.arc(tnx, tny, ns * (1 - t * 0.2), 0, TAU);
              ctx.fillStyle = `rgba(${sc.r},${sc.g},${sc.b},${(0.35 - t * 0.07).toFixed(2)})`;
              ctx.fill();
            }
            ctx.beginPath();
            ctx.arc(nx, ny, ns, 0, TAU);
            const ct = Math.min(1, colorT + 0.25);
            ctx.fillStyle = `rgba(${Math.round(sc.r * 0.4 + 155 * ct)},${Math.round(sc.g * 0.4 + 155 * ct)},${Math.round(sc.b * 0.4 + 155 * ct)},${0.7 + colorT * 0.3})`;
            ctx.fill();
            ctx.beginPath();
            ctx.arc(nx, ny, ns * 2.4, 0, TAU);
            ctx.fillStyle = `rgba(${sc.r},${sc.g},${sc.b},0.12)`;
            ctx.fill();
          });
        }
        ctx.restore();
      });
      ctx.restore();

      /* ── Glass sphere surface ──────────────────────────────────────────── */
      ctx.save();

      /* Atmosphere halo — wide outer breath */
      const halo = ctx.createRadialGradient(CX, CY, 190, CX, CY, SZ * 0.52);
      halo.addColorStop(0,   'rgba(0,0,0,0)');
      halo.addColorStop(0.5, `rgba(${sc.r},${sc.g},${sc.b},${0.03 * itx})`);
      halo.addColorStop(1,   `rgba(${sc.r},${sc.g},${sc.b},${0.12 * itx})`);
      ctx.beginPath();
      ctx.arc(CX, CY, SZ * 0.52, 0, TAU);
      ctx.fillStyle = halo;
      ctx.fill();

      /* Rim lighting — glowing sphere edge */
      const rimG = ctx.createRadialGradient(CX, CY, 205, CX, CY, 248);
      rimG.addColorStop(0,   'rgba(0,0,0,0)');
      rimG.addColorStop(0.55, `rgba(${sc.r},${sc.g},${sc.b},${0.04 * itx})`);
      rimG.addColorStop(1,   `rgba(${sc.r},${sc.g},${sc.b},${0.25 * itx})`);
      ctx.beginPath();
      ctx.arc(CX, CY, 248, 0, TAU);
      ctx.fillStyle = rimG;
      ctx.fill();

      /* Sphere surface — depth + 3D shading */
      const depthG = ctx.createRadialGradient(CX - 55, CY - 65, 0, CX, CY, 238);
      depthG.addColorStop(0,    `rgba(${Math.round(sc.r * 0.12)},${Math.round(sc.g * 0.12)},${Math.round(sc.b * 0.14)},0.09)`);
      depthG.addColorStop(0.42, 'rgba(0,0,0,0.01)');
      depthG.addColorStop(0.82, 'rgba(0,0,0,0.06)');
      depthG.addColorStop(1,    'rgba(0,0,0,0.20)');
      ctx.beginPath();
      ctx.arc(CX, CY, 238, 0, TAU);
      ctx.fillStyle = depthG;
      ctx.fill();

      /* Primary specular highlight — top-left bright hotspot */
      const pulse = 1 + Math.sin(T * (stateRef.current === 'processing' ? 10 : stateRef.current === 'listening' ? 6 : 2.2)) * (stateRef.current === 'processing' ? 0.06 : 0.025);
      const specShift = Math.sin(T * 0.35) * 8;
      const spec1G = ctx.createRadialGradient(CX - 80 + specShift * 0.3, CY - 90 - specShift * 0.2, 0, CX - 80 + specShift * 0.3, CY - 90 - specShift * 0.2, 100 * pulse);
      spec1G.addColorStop(0,    'rgba(255,255,255,0.26)');
      spec1G.addColorStop(0.32, 'rgba(255,255,255,0.07)');
      spec1G.addColorStop(0.65, 'rgba(255,255,255,0.015)');
      spec1G.addColorStop(1,    'rgba(255,255,255,0)');
      ctx.beginPath();
      ctx.arc(CX, CY, 238, 0, TAU);
      ctx.fillStyle = spec1G;
      ctx.fill();

      /* Small sharp specular dot */
      const dotG = ctx.createRadialGradient(CX - 65, CY - 75, 0, CX - 65, CY - 75, 28);
      dotG.addColorStop(0,   'rgba(255,255,255,0.55)');
      dotG.addColorStop(0.4, 'rgba(255,255,255,0.12)');
      dotG.addColorStop(1,   'rgba(255,255,255,0)');
      ctx.beginPath();
      ctx.arc(CX, CY, 238, 0, TAU);
      ctx.fillStyle = dotG;
      ctx.fill();

      /* Secondary bounce reflection — bottom-right colored tint */
      const spec2G = ctx.createRadialGradient(CX + 88, CY + 98, 0, CX + 88, CY + 98, 70);
      spec2G.addColorStop(0,   `rgba(${sc.r},${sc.g},${sc.b},${0.14 * itx})`);
      spec2G.addColorStop(0.5, `rgba(${sc.r},${sc.g},${sc.b},${0.04 * itx})`);
      spec2G.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.beginPath();
      ctx.arc(CX, CY, 238, 0, TAU);
      ctx.fillStyle = spec2G;
      ctx.fill();

      /* Thin rim stroke */
      ctx.beginPath();
      ctx.arc(CX, CY, 242, 0, TAU);
      const rimStr = ctx.createLinearGradient(CX - 242, CY, CX + 242, CY);
      rimStr.addColorStop(0,    `rgba(${sc.r},${sc.g},${sc.b},${0.06 * itx})`);
      rimStr.addColorStop(0.35, `rgba(${sc.r},${sc.g},${sc.b},${0.18 * itx})`);
      rimStr.addColorStop(0.65, `rgba(${sc.r},${sc.g},${sc.b},${0.22 * itx})`);
      rimStr.addColorStop(1,    `rgba(${sc.r},${sc.g},${sc.b},${0.06 * itx})`);
      ctx.strokeStyle = rimStr;
      ctx.lineWidth   = 1.2;
      ctx.stroke();

      ctx.restore();

      /* Electric arcs */
      if (isProc && Math.random() < 0.12) {
        ctx.save();
        ctx.translate(CX, CY);
        const a1 = Math.random() * TAU, r1 = 25 + Math.random() * 65;
        const a2 = a1 + (Math.random() - 0.5) * 1.1, r2 = r1 + 28 + Math.random() * 55;
        ctx.beginPath();
        ctx.moveTo(r1 * Math.cos(a1), r1 * Math.sin(a1));
        ctx.quadraticCurveTo(r1 * Math.cos(a1 + 0.2) * 1.25, r1 * Math.sin(a1 + 0.2) * 1.25, r2 * Math.cos(a2), r2 * Math.sin(a2));
        ctx.strokeStyle = `rgba(${sc.r},${sc.g},${sc.b},${0.45 + Math.random() * 0.4})`;
        ctx.lineWidth   = 0.6 + Math.random() * 0.7;
        ctx.shadowBlur  = 6;
        ctx.shadowColor = `rgb(${sc.r},${sc.g},${sc.b})`;
        ctx.stroke();
        ctx.shadowBlur  = 0;
        ctx.restore();
      }

      /* Scan beam */
      const scanPeriod = isProc ? 1.2 : isListen ? 2.0 : 4.5;
      scanRef.current.phase = (scanRef.current.phase + dt / scanPeriod) % 1;
      const scanY   = CY - 225 + scanRef.current.phase * 450;
      const scanAlp = Math.sin(scanRef.current.phase * Math.PI) * (isProc ? 0.45 : 0.20) * itx;
      if (scanAlp > 0.02) {
        const sg = ctx.createLinearGradient(CX - 225, 0, CX + 225, 0);
        sg.addColorStop(0,    'rgba(0,0,0,0)');
        sg.addColorStop(0.15, `rgba(${sc.r},${sc.g},${sc.b},${scanAlp})`);
        sg.addColorStop(0.85, `rgba(${sc.r},${sc.g},${sc.b},${scanAlp})`);
        sg.addColorStop(1,    'rgba(0,0,0,0)');
        ctx.fillStyle = sg;
        ctx.fillRect(CX - 225, scanY - 1.5, 450, 3);
      }

      /* Core bloom */
      const pulse = 1 + Math.sin(T * (isProc ? 10 : isListen ? 6 : 2.2)) * (isProc ? 0.06 : 0.025);
      const bg = ctx.createRadialGradient(CX, CY, 0, CX, CY, 100 * pulse);
      bg.addColorStop(0,   `rgba(${sc.r},${sc.g},${sc.b},${0.5 * itx})`);
      bg.addColorStop(0.3, `rgba(${sc.r},${sc.g},${sc.b},${0.18 * itx})`);
      bg.addColorStop(0.7, `rgba(${sc.r},${sc.g},${sc.b},${0.04 * itx})`);
      bg.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.beginPath();
      ctx.arc(CX, CY, 100 * pulse, 0, TAU);
      ctx.fillStyle = bg;
      ctx.fill();

      ctx.shadowBlur  = 20;
      ctx.shadowColor = `rgba(${sc.r},${sc.g},${sc.b},0.8)`;
      [28, 18, 10, 5].forEach((cr, ci) => {
        ctx.beginPath();
        ctx.arc(CX, CY, cr * pulse, 0, TAU);
        ctx.strokeStyle = ci < 2
          ? `rgba(255,255,255,${(0.55 - ci * 0.20) * itx})`
          : `rgba(${sc.r},${sc.g},${sc.b},${(0.65 - ci * 0.15) * itx})`;
        ctx.lineWidth = 3 - ci * 0.6;
        ctx.stroke();
      });
      ctx.shadowBlur = 0;

      const hotG = ctx.createRadialGradient(CX, CY, 0, CX, CY, 22 * pulse);
      hotG.addColorStop(0,    `rgba(255,255,255,${itx})`);
      hotG.addColorStop(0.25, `rgba(${sc.r},${sc.g},${sc.b},${0.88 * itx})`);
      hotG.addColorStop(0.7,  `rgba(${sc.r},${sc.g},${sc.b},${0.22 * itx})`);
      hotG.addColorStop(1,    'rgba(0,0,0,0)');
      ctx.shadowBlur  = 28;
      ctx.shadowColor = '#ffffff';
      ctx.beginPath();
      ctx.arc(CX, CY, 22 * pulse, 0, TAU);
      ctx.fillStyle = hotG;
      ctx.fill();
      ctx.shadowBlur = 0;

      /* Lens spikes */
      const spikeRot = T * 0.10;
      ctx.globalAlpha = itx * 0.9;
      for (let s = 0; s < 8; s++) {
        const a   = spikeRot + (s / 8) * TAU;
        const len = (s % 2 === 0 ? 60 : 35) * pulse * itx;
        const g   = ctx.createLinearGradient(CX, CY, CX + Math.cos(a) * len, CY + Math.sin(a) * len);
        g.addColorStop(0,   `rgba(255,255,255,${0.5 * itx})`);
        g.addColorStop(0.5, `rgba(${sc.r},${sc.g},${sc.b},${0.12 * itx})`);
        g.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.beginPath();
        ctx.moveTo(CX, CY);
        ctx.lineTo(CX + Math.cos(a) * len, CY + Math.sin(a) * len);
        ctx.strokeStyle = g;
        ctx.lineWidth   = s % 2 === 0 ? 1.2 : 0.6;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      ctx.shadowBlur  = 10;
      ctx.shadowColor = '#ffffff';
      ctx.beginPath();
      ctx.arc(CX, CY, 3.5 * pulse, 0, TAU);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.shadowBlur = 0;

      /* Ground reflection */
      const gy = CY + 240;
      const beam = ctx.createLinearGradient(CX, CY + 22, CX, gy);
      beam.addColorStop(0,   `rgba(${sc.r},${sc.g},${sc.b},${0.5 * itx})`);
      beam.addColorStop(0.6, `rgba(${sc.r},${sc.g},${sc.b},${0.12 * itx})`);
      beam.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.beginPath();
      ctx.moveTo(CX - 1.5, CY + 22); ctx.lineTo(CX + 1.5, CY + 22);
      ctx.lineTo(CX + 12, gy);       ctx.lineTo(CX - 12, gy);
      ctx.fillStyle = beam;
      ctx.fill();

      [[155, 18, 0.28], [100, 12, 0.18], [58, 7, 0.12]].forEach(([rx2, ry2, a]) => {
        ctx.beginPath();
        ctx.ellipse(CX, gy, rx2 as number, ry2 as number, 0, 0, TAU);
        ctx.strokeStyle = `rgba(${sc.r},${sc.g},${sc.b},${(a as number) * itx})`;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      });
    };

    af = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(af);
  }, []);

  const sc = STATE[state] ?? STATE.idle;
  const isProc = state === 'processing' || state === 'executing';

  return (
    <div style={{ position: 'relative', width: SZ, height: SZ, flexShrink: 0 }}>

      {/* CSS HUD decorations — GPU animated, no canvas cost */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {/* Outer rotating dashed ring */}
        <div style={{
          position: 'absolute', width: 520, height: 520, borderRadius: '50%',
          border: `1px dashed rgba(${sc.r},${sc.g},${sc.b},${0.10 * sc.intensity})`,
          animation: 'orbRotateCW 28s linear infinite',
        }} />

        {/* 4 arc bracket lines */}
        {[0, 90, 180, 270].map(deg => (
          <div key={deg} style={{
            position: 'absolute', width: 510, height: 510, borderRadius: '50%',
            border: '1.5px solid transparent',
            borderTopColor: `rgba(${sc.r},${sc.g},${sc.b},${0.20 * sc.intensity})`,
            transform: `rotate(${deg}deg)`,
            animation: `orbRotateCCW ${isProc ? '4s' : '16s'} linear infinite`,
          }} />
        ))}

        {/* Inner slow ring */}
        <div style={{
          position: 'absolute', width: 494, height: 494, borderRadius: '50%',
          border: `1px solid rgba(${sc.r},${sc.g},${sc.b},${0.07 * sc.intensity})`,
          animation: 'orbRotateCW 22s linear infinite',
        }} />

        {/* Cardinal data nodes */}
        {([
          { angle: -90, label: 'SYNC', val: '99.8%' },
          { angle:   0, label: 'NEUR', val: '247'   },
          { angle:  90, label: 'TEMP', val: '42°C'  },
          { angle: 180, label: 'POWR', val: '100%'  },
        ] as const).map(n => {
          const rad = (n.angle as number) * (Math.PI / 180);
          const nx  = Math.cos(rad) * 272;
          const ny  = Math.sin(rad) * 272;
          return (
            <div key={n.label} style={{
              position: 'absolute',
              left: SZ / 2 + nx - 22, top: SZ / 2 + ny - 16,
              width: 44, height: 30,
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              fontFamily: 'monospace',
            }}>
              <div style={{ fontSize: 6.5, letterSpacing: '0.22em', color: `rgba(${sc.r},${sc.g},${sc.b},${0.38 * sc.intensity})` }}>{n.label}</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: `rgba(255,255,255,${0.5 * sc.intensity})` }}>{n.val}</div>
            </div>
          );
        })}

        {/* Corner bracket decorations */}
        {[
          { top: 28, left: 28, tr: 'none', tl: '1px solid', br: 'none', bl: '1px solid' },
          { top: 28, right: 28, tr: 'none', tl: 'none', br: '1px solid', bl: 'none' },
          { bottom: 28, left: 28, tr: '1px solid', tl: 'none', br: 'none', bl: 'none' },
          { bottom: 28, right: 28, tr: 'none', tl: 'none', br: 'none', bl: '1px solid' },
        ].map((c, i) => (
          <div key={i} style={{
            position: 'absolute', width: 22, height: 22,
            top: (c as any).top, bottom: (c as any).bottom,
            left: (c as any).left, right: (c as any).right,
            borderTop:    (c as any).tr !== 'none' ? `${(c as any).tr} rgba(${sc.r},${sc.g},${sc.b},${0.28 * sc.intensity})` : undefined,
            borderLeft:   (c as any).tl !== 'none' ? `${(c as any).tl} rgba(${sc.r},${sc.g},${sc.b},${0.28 * sc.intensity})` : undefined,
            borderBottom: (c as any).br !== 'none' ? `${(c as any).br} rgba(${sc.r},${sc.g},${sc.b},${0.28 * sc.intensity})` : undefined,
            borderRight:  (c as any).bl !== 'none' ? `${(c as any).bl} rgba(${sc.r},${sc.g},${sc.b},${0.28 * sc.intensity})` : undefined,
          }} />
        ))}
      </div>

      {/* Canvas */}
      <canvas ref={canvasRef} width={SZ} height={SZ}
        style={{ display: 'block', position: 'relative', zIndex: 1 }} />

      {/* State label */}
      <div style={{
        position: 'absolute', bottom: 30, left: 0, right: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        fontFamily: 'monospace', pointerEvents: 'none', zIndex: 2,
      }}>
        <div style={{
          width: 5, height: 5, borderRadius: '50%',
          background: `rgb(${sc.r},${sc.g},${sc.b})`,
          boxShadow: `0 0 6px rgb(${sc.r},${sc.g},${sc.b})`,
          animation: 'orbPulse 1.5s ease-in-out infinite',
        }} />
        <span style={{ fontSize: 8, letterSpacing: '0.4em', color: `rgba(${sc.r},${sc.g},${sc.b},0.55)` }}>
          {state === 'idle' ? 'STANDBY' : state === 'processing' ? 'THINKING' : state === 'executing' ? 'EXECUTING' : state === 'listening' ? 'LISTENING' : 'SPEAKING'}
        </span>
      </div>

      <style>{`
        @keyframes orbRotateCW  { to { transform: rotate(360deg);  } }
        @keyframes orbRotateCCW { to { transform: rotate(-360deg); } }
        @keyframes orbPulse     { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
      `}</style>
    </div>
  );
}
