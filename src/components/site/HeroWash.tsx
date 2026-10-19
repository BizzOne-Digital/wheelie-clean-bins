"use client";

import { useEffect, useRef, useState } from "react";
import { Mouse } from "lucide-react";

/**
 * Scroll-driven "pressure wash" hero. The clean hero (children) sits underneath a canvas of grime;
 * as the visitor scrolls, a pressure-washer nozzle sweeps across and erases the grime.
 * Reduced-motion users and browsers without canvas simply see the clean hero.
 */
export function HeroWash({ children }: { children: React.ReactNode }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nozzleRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce && canvasRef.current?.getContext) setEnabled(true);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const wrap = wrapRef.current!;
    const stage = stageRef.current!;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const nozzle = nozzleRef.current!;
    const hint = hintRef.current!;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let path: { x: number; y: number }[] = [];
    let lengths: number[] = [];
    let total = 0;
    let washed = 0; // progress already erased (0..1)
    let raf = 0;
    let done = false;

    // Seeded random so the grime looks the same after resize.
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

    function paintGrime() {
      seed = 7;
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "rgba(52, 42, 18, 0.94)";
      ctx.fillRect(0, 0, w, h);
      // Blotches of mud and mildew
      const tones = ["rgba(96,78,30,0.55)", "rgba(70,62,24,0.6)", "rgba(28,24,12,0.55)", "rgba(110,98,40,0.35)"];
      for (let i = 0; i < 46; i++) {
        const x = rand() * w;
        const y = rand() * h;
        const r = (0.06 + rand() * 0.22) * Math.max(w, h);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, tones[i % tones.length]);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      // Grit speckles
      for (let i = 0; i < (w * h) / 900; i++) {
        ctx.fillStyle = rand() > 0.5 ? "rgba(15,12,6,0.55)" : "rgba(160,140,80,0.22)";
        const s = rand() * 2.2 + 0.4;
        ctx.fillRect(rand() * w, rand() * h, s, s);
      }
      // Drips and streaks
      for (let i = 0; i < 60; i++) {
        const x = rand() * w;
        const y = rand() * h * 0.7;
        const len = 60 + rand() * 260;
        const lw = 1.5 + rand() * 3.5;
        const g = ctx.createLinearGradient(x, y, x, y + len);
        g.addColorStop(0, "rgba(20,16,8,0)");
        g.addColorStop(0.3, "rgba(20,16,8,0.7)");
        g.addColorStop(1, "rgba(20,16,8,0.15)");
        ctx.strokeStyle = g;
        ctx.lineWidth = lw;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (rand() - 0.5) * 6, y + len);
        ctx.stroke();
      }
    }

    function buildPath() {
      // Zig-zag passes from top to bottom, like a real surface clean.
      const rows = w < 640 ? 6 : 5;
      const padX = w * 0.04;
      path = [];
      for (let r = 0; r < rows; r++) {
        const y = h * (0.2 + (0.72 * r) / (rows - 1));
        const ltr = r % 2 === 0;
        path.push({ x: ltr ? padX : w - padX, y }, { x: ltr ? w - padX : padX, y });
      }
      lengths = [0];
      total = 0;
      for (let i = 1; i < path.length; i++) {
        total += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
        lengths.push(total);
      }
    }

    function pointAt(t: number) {
      const d = Math.min(Math.max(t, 0), 1) * total;
      let i = 1;
      while (i < lengths.length - 1 && lengths[i] < d) i++;
      const a = path[i - 1];
      const b = path[i];
      const seg = lengths[i] - lengths[i - 1] || 1;
      const k = (d - lengths[i - 1]) / seg;
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, dir: Math.sign(b.x - a.x) || 1 };
    }

    function erase(from: number, to: number) {
      const radius = Math.max(w, h) * (w < 640 ? 0.16 : 0.1);
      ctx.globalCompositeOperation = "destination-out";
      const steps = Math.max(1, Math.ceil(((to - from) * total) / (radius * 0.25)));
      for (let s = 0; s <= steps; s++) {
        const p = pointAt(from + ((to - from) * s) / steps);
        const g = ctx.createRadialGradient(p.x, p.y, radius * 0.2, p.x, p.y, radius);
        g.addColorStop(0, "rgba(0,0,0,1)");
        g.addColorStop(0.7, "rgba(0,0,0,0.85)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function resize() {
      const rect = stage.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildPath();
      paintGrime();
      if (washed > 0) erase(0, washed);
      if (done) ctx.clearRect(0, 0, w, h);
    }

    function progress() {
      const rect = wrap.getBoundingClientRect();
      const range = rect.height - window.innerHeight;
      if (range <= 0) return 1;
      return Math.min(Math.max(-rect.top / range / 0.85, 0), 1);
    }

    function frame() {
      raf = 0;
      const t = progress();
      if (t > washed) {
        erase(washed, t);
        washed = t;
      }
      if (t >= 0.995 && !done) {
        done = true;
        canvas.style.transition = "opacity 500ms ease";
        canvas.style.opacity = "0";
      }
      const p = pointAt(Math.max(t, 0.0001));
      const visible = t > 0.002 && t < 0.995;
      nozzle.style.opacity = visible ? "1" : t <= 0.002 ? "0.9" : "0";
      const scale = w < 640 ? 0.6 : 1;
      nozzle.style.transform = `translate(${p.x}px, ${p.y}px) scale(${-p.dir * scale}, ${scale})`;
      hint.style.opacity = String(Math.max(0, 1 - t * 8));
    }

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };

    resize();
    frame();
    const ro = new ResizeObserver(() => {
      resize();
      frame();
    });
    ro.observe(stage);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [enabled]);

  return (
    <div ref={wrapRef} className={enabled ? "relative h-[240vh]" : "relative"}>
      <div ref={stageRef} className={enabled ? "sticky top-0 h-[100svh] overflow-hidden" : "relative"}>
        {children}
        <canvas ref={canvasRef} aria-hidden className={`pointer-events-none absolute inset-0 z-10 h-full w-full ${enabled ? "" : "hidden"}`} />
        {enabled && (
          <>
            {/* Pressure-washer nozzle with spray */}
            <div ref={nozzleRef} aria-hidden className="pointer-events-none absolute left-0 top-0 z-20 will-change-transform" style={{ opacity: 0 }}>
              <svg width="250" height="120" viewBox="-30 0 250 120" className="-translate-x-[54px] -translate-y-[60px] drop-shadow-[0_6px_18px_rgba(0,189,232,0.45)]">
                <g className="animate-pulse">
                  <path d="M24 60 L-4 38 M24 60 L-10 60 M24 60 L-4 82 M24 60 L4 48 M24 60 L4 72" stroke="#00bde8" strokeWidth="7" strokeLinecap="round" />
                  <circle cx="-6" cy="30" r="5" fill="#00bde8" />
                  <circle cx="-14" cy="60" r="6" fill="#00bde8" />
                  <circle cx="-6" cy="90" r="5" fill="#00bde8" />
                </g>
                <rect x="24" y="56" width="120" height="8" rx="3" fill="#cfd8dc" />
                <rect x="140" y="50" width="34" height="20" rx="5" fill="#ffe500" />
                <rect x="166" y="64" width="16" height="40" rx="5" fill="#ffe500" transform="rotate(-14 174 64)" />
                <rect x="174" y="54" width="40" height="12" rx="4" fill="#1a1a1a" />
              </svg>
            </div>

            <div ref={hintRef} className="pointer-events-none absolute inset-x-0 bottom-8 z-30 flex justify-center px-4 sm:bottom-12">
              <div className="rounded-2xl border border-white/10 bg-ink/85 px-6 py-4 text-center shadow-2xl backdrop-blur">
                <Mouse className="mx-auto h-6 w-6 animate-bounce text-cyan" aria-hidden />
                <p className="mt-2 font-display text-lg font-bold text-white">Scroll to wash it clean</p>
                <p className="text-xs text-muted">This page sat at the curb all week.</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
