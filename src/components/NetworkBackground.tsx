import { useEffect, useRef } from 'react';
import { gsap } from '../lib/gsap';
import { useMotion } from '../hooks/useMotion';

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  glow: number;
  accent: boolean;
}
interface Ripple {
  x: number;
  y: number;
  r: number;
  max: number;
  s: number;
}

/**
 * Delicate network diagram: drifting nodes, faint links, a gentle pull toward
 * the pointer, and ripples whenever a command runs ("noa:pulse" events).
 * Static (single frame) under reduced motion.
 */
export function NetworkBackground() {
  const ref = useRef<HTMLCanvasElement>(null);
  const { reduced } = useMotion();

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
    const dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2);
    let w = 0;
    let h = 0;
    let nodes: Node[] = [];
    const ripples: Ripple[] = [];
    const pointer = { x: -9999, y: -9999 };
    const LINK = coarse ? 120 : 150;

    const seed = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(coarse ? 26 : 56, Math.round((w * h) / (coarse ? 26000 : 30000)));
      nodes = Array.from({ length: count }, (_, i) => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        r: Math.random() * 1.2 + 0.8,
        glow: 0,
        accent: i % 7 === 0,
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const n of nodes) {
        if (!reduced) {
          n.x += n.vx;
          n.y += n.vy;
          if (n.x < -20) n.x = w + 20;
          if (n.x > w + 20) n.x = -20;
          if (n.y < -20) n.y = h + 20;
          if (n.y > h + 20) n.y = -20;
        }
        const dx = n.x - pointer.x;
        const dy = n.y - pointer.y;
        const d = Math.hypot(dx, dy);
        const near = d < 170 ? 1 - d / 170 : 0;
        n.glow += (near - n.glow) * 0.12;
        if (near > 0 && !reduced) {
          n.x += (dx / (d || 1)) * -0.12 * near; // soft attraction
          n.y += (dy / (d || 1)) * -0.12 * near;
        }
      }
      for (const rp of ripples) rp.r += 5 + rp.s * 4;
      for (let i = ripples.length - 1; i >= 0; i--) if (ripples[i].r > ripples[i].max) ripples.splice(i, 1);

      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d > LINK) continue;
          const boost = Math.max(a.glow, b.glow);
          let ripple = 0;
          for (const rp of ripples) {
            const md = Math.hypot((a.x + b.x) / 2 - rp.x, (a.y + b.y) / 2 - rp.y);
            if (Math.abs(md - rp.r) < 50) ripple = Math.max(ripple, rp.s * (1 - Math.abs(md - rp.r) / 50));
          }
          const alpha = (1 - d / LINK) * (0.12 + boost * 0.4 + ripple * 0.6);
          ctx.strokeStyle = boost + ripple > 0.15 ? `rgba(163,255,18,${alpha})` : `rgba(137,146,156,${alpha})`;
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
      for (const n of nodes) {
        let ripple = 0;
        for (const rp of ripples) {
          const dd = Math.abs(Math.hypot(n.x - rp.x, n.y - rp.y) - rp.r);
          if (dd < 50) ripple = Math.max(ripple, rp.s * (1 - dd / 50));
        }
        const lit = Math.min(1, n.glow + ripple);
        ctx.fillStyle = n.accent || lit > 0.2 ? `rgba(163,255,18,${0.35 + lit * 0.65})` : 'rgba(137,146,156,0.55)';
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r + lit * 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    seed();
    draw();

    const onResize = () => {
      seed();
      draw();
    };
    const onMove = (e: PointerEvent) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      if (reduced) draw();
    };
    const onLeave = () => {
      pointer.x = pointer.y = -9999;
    };
    const onPulse = (e: Event) => {
      if (reduced) return;
      const { strength = 0.5, x, y } = (e as CustomEvent).detail ?? {};
      ripples.push({
        x: x ?? w * (0.35 + Math.random() * 0.3),
        y: y ?? h * (0.4 + Math.random() * 0.3),
        r: 0,
        max: Math.max(w, h) * (0.35 + strength * 0.5),
        s: Math.min(1, Math.max(0.2, strength)),
      });
      if (ripples.length > 4) ripples.shift();
    };

    window.addEventListener('resize', onResize);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerleave', onLeave);
    window.addEventListener('noa:pulse', onPulse);
    if (!reduced) gsap.ticker.add(draw);

    return () => {
      gsap.ticker.remove(draw);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('noa:pulse', onPulse);
    };
  }, [reduced]);

  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-0" />;
}
