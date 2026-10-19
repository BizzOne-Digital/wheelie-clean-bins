"use client";

import { useEffect, useRef, useState } from "react";
import { Mouse, MousePointer2 } from "lucide-react";

/**
 * Interactive "pressure wash" hero. The clean hero (children) sits underneath a layer of grime.
 * The pressure-washer nozzle follows the visitor's mouse (or finger) and washes away whatever it passes over.
 * Once most of the hero is clean, the remaining grime fades away.
 * Reduced-motion users and browsers without canvas simply see the clean hero.
 */
export function HeroWash({ children }: { children: React.ReactNode }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dropsRef = useRef<HTMLCanvasElement>(null);
  const nozzleRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [touch, setTouch] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setTouch(window.matchMedia("(hover: none)").matches);
    if (!reduce && canvasRef.current?.getContext) setEnabled(true);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const stage = stageRef.current!;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const nozzle = nozzleRef.current!;
    const dropsCanvas = dropsRef.current!;
    const dctx = dropsCanvas.getContext("2d")!;
    type Drop = { x: number; y: number; vx: number; vy: number; r: number; life: number };
    let drops: Drop[] = [];
    let dropRaf = 0;

    // Water droplets that spray from the nozzle tip and fall with gravity.
    function spray(x: number, y: number, speed: number) {
      const count = Math.min(7, 2 + Math.floor(speed / 8));
      for (let i = 0; i < count && drops.length < 260; i++) {
        drops.push({
          x: x + dir * 6,
          y: y + (Math.random() - 0.5) * 20,
          vx: dir * (2 + Math.random() * 5) + (Math.random() - 0.5) * 2,
          vy: -1.5 - Math.random() * 3.5,
          r: 1.5 + Math.random() * 3,
          life: 1,
        });
      }
      if (!dropRaf) dropRaf = requestAnimationFrame(tickDrops);
    }

    function tickDrops() {
      dropRaf = 0;
      dctx.clearRect(0, 0, w, h);
      drops = drops.filter((d) => d.life > 0 && d.y < h + 10);
      for (const d of drops) {
        d.vy += 0.28;
        d.vx *= 0.98;
        d.x += d.vx;
        d.y += d.vy;
        d.life -= 0.018;
        dctx.globalAlpha = Math.max(0, d.life);
        dctx.fillStyle = "#7fe3ff";
        dctx.beginPath();
        dctx.ellipse(d.x, d.y, d.r * 0.8, d.r * 1.25, Math.atan2(d.vy, d.vx) + Math.PI / 2, 0, Math.PI * 2);
        dctx.fill();
        dctx.globalAlpha = Math.max(0, d.life) * 0.9;
        dctx.fillStyle = "#ffffff";
        dctx.beginPath();
        dctx.arc(d.x - d.r * 0.3, d.y - d.r * 0.4, d.r * 0.3, 0, Math.PI * 2);
        dctx.fill();
      }
      dctx.globalAlpha = 1;
      if (drops.length) dropRaf = requestAnimationFrame(tickDrops);
    }
    const hint = hintRef.current!;

    let w = 0;
    let h = 0;
    let last: { x: number; y: number } | null = null;
    let dir = 1;
    let done = false;
    let started = false;
    const strokes: { x: number; y: number }[] = []; // kept to repaint on resize

    // Coverage grid used to decide when the hero is "clean enough".
    const COLS = 40;
    const ROWS = 24;
    const cleaned = new Set<number>();

    // Seeded random so the grime looks the same after resize.
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

    function paintGrime() {
      seed = 7;
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "rgba(52, 42, 18, 0.94)";
      ctx.fillRect(0, 0, w, h);
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
      for (let i = 0; i < (w * h) / 900; i++) {
        ctx.fillStyle = rand() > 0.5 ? "rgba(15,12,6,0.55)" : "rgba(160,140,80,0.22)";
        const s = rand() * 2.2 + 0.4;
        ctx.fillRect(rand() * w, rand() * h, s, s);
      }
      for (let i = 0; i < 60; i++) {
        const x = rand() * w;
        const y = rand() * h * 0.7;
        const len = 60 + rand() * 260;
        const g = ctx.createLinearGradient(x, y, x, y + len);
        g.addColorStop(0, "rgba(20,16,8,0)");
        g.addColorStop(0.3, "rgba(20,16,8,0.7)");
        g.addColorStop(1, "rgba(20,16,8,0.15)");
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.5 + rand() * 3.5;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (rand() - 0.5) * 6, y + len);
        ctx.stroke();
      }
    }

    const radius = () => Math.max(w, h) * (w < 640 ? 0.055 : 0.032);

    function stamp(x: number, y: number) {
      const r = radius();
      ctx.globalCompositeOperation = "destination-out";
      const g = ctx.createRadialGradient(x, y, r * 0.25, x, y, r);
      g.addColorStop(0, "rgba(0,0,0,1)");
      g.addColorStop(0.65, "rgba(0,0,0,0.9)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      // Mark coverage cells inside the solid part of the brush.
      const cw = w / COLS;
      const ch = h / ROWS;
      const rr = r * 0.7;
      for (let cx = Math.max(0, Math.floor((x - rr) / cw)); cx <= Math.min(COLS - 1, Math.floor((x + rr) / cw)); cx++) {
        for (let cy = Math.max(0, Math.floor((y - rr) / ch)); cy <= Math.min(ROWS - 1, Math.floor((y + rr) / ch)); cy++) {
          if (Math.hypot((cx + 0.5) * cw - x, (cy + 0.5) * ch - y) < rr) cleaned.add(cy * COLS + cx);
        }
      }
    }

    function washLine(a: { x: number; y: number }, b: { x: number; y: number }) {
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      const steps = Math.max(1, Math.ceil(dist / (radius() * 0.3)));
      for (let s = 1; s <= steps; s++) {
        const p = { x: a.x + ((b.x - a.x) * s) / steps, y: a.y + ((b.y - a.y) * s) / steps };
        stamp(p.x, p.y);
        strokes.push({ x: p.x / w, y: p.y / h });
      }
    }

    function finish() {
      if (done) return;
      done = true;
      canvas.style.transition = "opacity 700ms ease";
      canvas.style.opacity = "0";
      nozzle.style.opacity = "0";
      hint.style.opacity = "0";
      stage.style.cursor = "";
    }

    function moveNozzle(x: number, y: number) {
      const scale = w < 640 ? 0.6 : 1;
      nozzle.style.transform = `translate(${x}px, ${y}px) scale(${-dir * scale}, ${scale})`;
    }

    function onMove(e: PointerEvent) {
      if (done) return;
      const rect = stage.getBoundingClientRect();
      const p = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      if (last && Math.abs(p.x - last.x) > 2) dir = p.x > last.x ? -1 : 1;
      if (!started) {
        started = true;
        hint.style.opacity = "0";
      }
      washLine(last ?? p, p);
      spray(p.x, p.y, last ? Math.hypot(p.x - last.x, p.y - last.y) : 0);
      last = p;
      nozzle.style.opacity = "1";
      moveNozzle(p.x, p.y);
      if (cleaned.size / (COLS * ROWS) > 0.55) finish();
    }

    function onLeave() {
      last = null;
      if (!done) nozzle.style.opacity = "0";
    }

    function resize() {
      const rect = stage.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dropsCanvas.width = Math.round(w * dpr);
      dropsCanvas.height = Math.round(h * dpr);
      dctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paintGrime();
      for (const s of strokes) stamp(s.x * w, s.y * h);
    }

    /* ---------- Touch devices: swiping up washes the hero; the page stays put until it is clean ---------- */
    const scrollMode = window.matchMedia("(hover: none)").matches;
    let washedT = 0;
    let scrollRaf = 0;
    let pendingT = 0;
    let touchY: number | null = null;

    function pathPoint(t: number) {
      // Zig-zag rows covering the part of the hero visible on screen.
      const H = Math.min(h, window.innerHeight);
      const rows = Math.max(4, Math.round(H / 110));
      const padX = w * 0.06;
      const rowLen = w - padX * 2;
      const top = Math.min(90, H * 0.1);
      const drop = (H - top - 30) / (rows - 1);
      const total = rows * rowLen + (rows - 1) * drop;
      let d = Math.min(Math.max(t, 0), 1) * total;
      for (let r = 0; r < rows; r++) {
        const y = top + r * drop;
        const ltr = r % 2 === 0;
        if (d <= rowLen) return { x: ltr ? padX + d : w - padX - d, y, dir: ltr ? -1 : 1 };
        d -= rowLen;
        if (r < rows - 1) {
          if (d <= drop) return { x: ltr ? w - padX : padX, y: y + d, dir: ltr ? -1 : 1 };
          d -= drop;
        }
      }
      return { x: padX, y: H - 30, dir: 1 };
    }

    function onScrollFrame() {
      scrollRaf = 0;
      if (done) return;
      const t = pendingT;
      if (t > washedT) {
        const steps = Math.max(1, Math.ceil((t - washedT) * 120));
        let prev = pathPoint(washedT);
        for (let i = 1; i <= steps; i++) {
          const p = pathPoint(washedT + ((t - washedT) * i) / steps);
          washLine(prev, p);
          prev = p;
        }
        spray(prev.x, prev.y, 20);
        washedT = t;
        if (!started) {
          started = true;
          hint.style.opacity = "0";
        }
      }
      const p = pathPoint(Math.max(washedT, 0.0005));
      dir = p.dir;
      nozzle.style.opacity = "1";
      moveNozzle(p.x, p.y);
      if (washedT >= 0.995) finish();
    }

    // Lock page scrolling only while the hero is at the top of the page and still dirty.
    const locked = () => !done && window.scrollY < 40;

    function advance(delta: number) {
      if (delta <= 0) return;
      pendingT = Math.min(1, pendingT + delta / (window.innerHeight * 2.2));
      if (!scrollRaf) scrollRaf = requestAnimationFrame(onScrollFrame);
    }

    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!locked()) return;
      const y = e.touches[0]?.clientY;
      if (y == null || touchY == null) return;
      const dy = touchY - y;
      touchY = y;
      if (dy > 0) {
        e.preventDefault();
        advance(dy);
      }
    };
    const onWheel = (e: WheelEvent) => {
      if (!locked() || e.deltaY <= 0) return;
      e.preventDefault();
      advance(e.deltaY);
    };
    const onScroll = () => {
      // Reached the hero from further down the page, or scrolled past it: never leave it dirty.
      if (!done && window.scrollY >= 40 && !started) finish();
    };

    // Fallback: if the hero leaves the screen before it is clean, finish so it never looks broken.
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || (!scrollMode && entry.intersectionRatio < 0.25)) finish();
    }, { threshold: [0, 0.25] });

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(stage);
    io.observe(stage);
    if (scrollMode) {
      if (window.scrollY >= 40) finish();
      window.addEventListener("touchstart", onTouchStart, { passive: true });
      window.addEventListener("touchmove", onTouchMove, { passive: false });
      window.addEventListener("wheel", onWheel, { passive: false });
      window.addEventListener("scroll", onScroll, { passive: true });
      onScrollFrame();
    } else {
      stage.addEventListener("pointermove", onMove);
      stage.addEventListener("pointerdown", onMove);
      stage.addEventListener("pointerleave", onLeave);
      stage.addEventListener("pointercancel", onLeave);
    }
    const onUp = (e: PointerEvent) => e.pointerType === "touch" && onLeave();
    if (!scrollMode) stage.addEventListener("pointerup", onUp);
    return () => {
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("wheel", onWheel);
      if (scrollRaf) cancelAnimationFrame(scrollRaf);
      if (dropRaf) cancelAnimationFrame(dropRaf);
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerdown", onMove);
      stage.removeEventListener("pointerleave", onLeave);
      stage.removeEventListener("pointercancel", onLeave);
      stage.removeEventListener("pointerup", onUp);
    };
  }, [enabled]);

  return (
    <div
      ref={stageRef}
      className={`relative ${enabled ? "min-h-[100svh] touch-pan-y overflow-hidden [@media(hover:hover)]:cursor-none" : ""}`}
    >
      {children}
      <canvas ref={canvasRef} aria-hidden className={`pointer-events-none absolute inset-0 z-10 h-full w-full ${enabled ? "" : "hidden"}`} />
      {enabled && (
        <>
          <canvas ref={dropsRef} aria-hidden className="pointer-events-none absolute inset-0 z-20 h-full w-full" />
          {/* Pressure-washer nozzle that follows the pointer */}
          <div ref={nozzleRef} aria-hidden className="pointer-events-none absolute left-0 top-0 z-20 transition-opacity duration-200 will-change-transform" style={{ opacity: 0 }}>
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

          <div ref={hintRef} className={`pointer-events-none ${touch ? "fixed" : "absolute"} inset-x-0 bottom-8 z-30 flex justify-center px-4 transition-opacity duration-500 sm:bottom-12`}>
            <div className="rounded-2xl border border-white/10 bg-ink/85 px-6 py-4 text-center shadow-2xl backdrop-blur">
              {touch ? (
                <Mouse className="mx-auto h-6 w-6 animate-bounce text-cyan" aria-hidden />
              ) : (
                <MousePointer2 className="mx-auto h-6 w-6 animate-bounce text-cyan" aria-hidden />
              )}
              <p className="mt-2 font-display text-lg font-bold text-white">{touch ? "Scroll to wash it clean" : "Move your mouse to wash it clean"}</p>
              <p className="text-xs text-muted">This page sat at the curb all week.</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
