"use client";

import { useEffect, useRef, useState } from "react";

/* Scroll-driven story: the city truck empties the bin, then our van washes it and returns it. */

const CHAPTERS = [
  { title: "Bins out, like always", text: "Roll them to the curb the night before. Nothing new to remember." },
  { title: "The truck empties them", text: "The city does its part. The bin is empty, but it still smells." },
  { title: "We roll up right after", text: "Our van follows the collection route, so your bin gets cleaned shortly after pickup." },
  { title: "Hot-water wash, inside and out", text: "High-pressure hot water for the inside, outside, lid and wheels, then a deodorizing finish." },
  { title: "Back by the house, fresh", text: "We return your bins to the spot you choose. No need to be home." },
];
// Progress where each chapter starts.
const STARTS = [0, 0.16, 0.42, 0.56, 0.8];

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p: number, a: number, b: number) => clamp((p - a) / (b - a));
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mix = (c1: number[], c2: number[], t: number) => `rgb(${c1.map((v, i) => Math.round(lerp(v, c2[i], t))).join(",")})`;

function clock(p: number) {
  const mins = 6 * 60 + 58 + Math.round(p * 76);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}:${String(m).padStart(2, "0")} AM`;
}

const STARS = [
  [80, 40], [300, 70], [520, 30], [700, 90], [880, 45], [1050, 80], [1150, 30], [160, 140], [420, 160], [620, 130], [960, 150], [1100, 190], [240, 220], [780, 210],
];

export function GarbageDayStory() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [p, setP] = useState(0);

  useEffect(() => {
    let raf = 0;
    let shown = 0;
    let target = 0;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const readTarget = () => {
      const el = wrapRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const range = rect.height - window.innerHeight;
      target = range > 0 ? clamp(-rect.top / range) : 1;
    };

    // Ease the displayed progress toward the scroll position so wheel steps animate smoothly.
    const tick = () => {
      raf = 0;
      const diff = target - shown;
      shown = reduce || Math.abs(diff) < 0.0004 ? target : shown + diff * 0.14;
      setP(shown);
      if (shown !== target) raf = requestAnimationFrame(tick);
    };

    const onScroll = () => {
      readTarget();
      if (!raf) raf = requestAnimationFrame(tick);
    };
    readTarget();
    shown = target;
    setP(shown);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const chapter = STARTS.reduce((acc, s, i) => (p >= s ? i : acc), 0);

  // ----- Scene values -----
  const dawn = ease(seg(p, 0.1, 1));
  const sky = mix([9, 18, 36], [40, 104, 150], dawn);
  const skyLow = mix([16, 32, 56], [70, 130, 160], dawn);
  const sunY = lerp(760, 470, dawn);
  const starOpacity = 1 - seg(p, 0.3, 0.7);
  const windowGlow = 1 - seg(p, 0.6, 0.95) * 0.6;

  // City truck: drives in from the right, empties the bin, leaves to the left.
  const truckIn = ease(seg(p, 0.16, 0.25));
  const truckOut = ease(seg(p, 0.33, 0.42));
  const truckX = truckOut > 0 ? lerp(640, -620, truckOut) : lerp(1300, 640, truckIn);
  const lift = Math.sin(Math.PI * seg(p, 0.25, 0.33));

  // Our van: arrives, washes, leaves to the right.
  const vanIn = ease(seg(p, 0.42, 0.53));
  const vanOut = ease(seg(p, 0.84, 0.97));
  // Comes in from the left, parks just before the bin, then drives off to the right.
  const vanX = vanOut > 0 ? lerp(300, 1320, vanOut) : lerp(-420, 300, vanIn);
  const washing = p > 0.56 && p < 0.8;
  const clean = ease(seg(p, 0.58, 0.78));

  // Bin: lifted and tipped by the truck, then wheeled back up the driveway.
  const back = ease(seg(p, 0.8, 0.95));
  const binX = lerp(680, 575, back) + lift * 30;
  const binY = lerp(618, 548, back) - lift * 70;
  const binScale = lerp(1, 0.8, back);
  const binTilt = -lift * 75;
  const dirt = 1 - clean;
  const stink = (1 - clean) * (0.55 + 0.45 * Math.sin(p * 120));

  return (
    <section ref={wrapRef} aria-labelledby="story-heading" className="relative h-[420vh] bg-[#0b0f11]">
      <div className="sticky top-0 flex h-[100svh] flex-col overflow-hidden pt-20 lg:pt-24">
        <div className="container-x flex flex-1 flex-col gap-4 pb-6 lg:grid lg:grid-cols-[0.62fr_1.6fr] lg:grid-rows-[auto_1fr] lg:gap-x-12 lg:pb-12">
          <h2 id="story-heading" className="font-display text-[clamp(2.2rem,5vw,4.6rem)] font-black leading-[1.16] tracking-[-0.035em] lg:col-span-2">
            <span className="bg-brand px-2 pb-1 text-ink [box-decoration-break:clone] [-webkit-box-decoration-break:clone]">
              Your garbage day,
              <br />
              with us in it
            </span>
          </h2>

          {/* Chapter copy */}
          <div className="order-3 lg:order-none lg:self-end">
            <div className="flex gap-2" aria-hidden>
              {CHAPTERS.map((_, i) => {
                const start = STARTS[i];
                const end = STARTS[i + 1] ?? 1;
                const fill = clamp((p - start) / (end - start));
                return (
                  <span key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/15">
                    <span className="block h-full rounded-full bg-cyan" style={{ width: `${fill * 100}%` }} />
                  </span>
                );
              })}
            </div>
            <div aria-live="polite" className="mt-5 min-h-[7.5rem]">
              <h3 className="font-display text-2xl font-black tracking-tight text-white sm:text-4xl">{CHAPTERS[chapter].title}</h3>
              <p className="mt-2 max-w-md text-base text-soft/75 sm:text-lg">{CHAPTERS[chapter].text}</p>
            </div>
          </div>

          {/* Scene */}
          <div className="relative order-2 lg:order-none lg:self-center">
            <p className="mb-2 text-right font-display text-2xl font-black text-brand drop-shadow-[0_0_14px_rgba(255,229,0,0.45)] sm:text-4xl" aria-hidden>
              {clock(p)}
            </p>
            <div className="relative aspect-[5/3] w-full overflow-hidden rounded-3xl border border-white/10 shadow-[0_30px_80px_-30px_rgba(0,189,232,0.35)]">
              <svg viewBox="0 0 1200 720" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full" role="img" aria-label={`${CHAPTERS[chapter].title}: ${CHAPTERS[chapter].text}`}>
                <defs>
                  <linearGradient id="gd-sky" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={sky} />
                    <stop offset="1" stopColor={skyLow} />
                  </linearGradient>
                  <radialGradient id="gd-sun">
                    <stop offset="0" stopColor="#fff6c8" stopOpacity="0.95" />
                    <stop offset="0.25" stopColor="#ffe56b" stopOpacity="0.7" />
                    <stop offset="1" stopColor="#ffe500" stopOpacity="0" />
                  </radialGradient>
                  <linearGradient id="gd-shine" x1="0" x2="1">
                    <stop offset="0" stopColor="#5b6670" />
                    <stop offset="0.45" stopColor="#d9e2e8" />
                    <stop offset="1" stopColor="#5b6670" />
                  </linearGradient>
                </defs>

                <rect width="1200" height="720" fill="url(#gd-sky)" />
                <circle cx="860" cy={sunY} r="260" fill="url(#gd-sun)" opacity={dawn} />
                {STARS.map(([x, y], i) => (
                  <circle key={i} cx={x} cy={y} r={i % 3 ? 1.6 : 2.4} fill="#fff" opacity={starOpacity * (0.5 + (i % 2) * 0.5)} />
                ))}

                {/* Neighbourhood */}
                <path d="M0 470 L90 470 L150 420 L210 470 L330 470 L330 440 L390 440 L390 470 L760 470 L760 440 L840 440 L840 470 L940 470 L1000 420 L1060 470 L1130 470 L1180 430 L1200 450 L1200 560 L0 560 Z" fill="#132230" />
                <rect x="120" y="500" width="10" height="10" fill="#ffe500" opacity={0.45 * windowGlow} />
                <rect x="900" y="495" width="10" height="10" fill="#ffe500" opacity={0.45 * windowGlow} />
                <rect x="1110" y="505" width="10" height="10" fill="#ffe500" opacity={0.45 * windowGlow} />

                {/* House */}
                <path d="M350 400 L510 300 L670 400 Z" fill="#14222e" />
                <rect x="595" y="318" width="22" height="50" fill="#14222e" />
                <rect x="385" y="400" width="250" height="160" fill="#1a2b38" />
                <g opacity={windowGlow}>
                  <rect x="410" y="425" width="56" height="48" fill="#e8c21a" />
                  <path d="M438 425 V473 M410 449 H466" stroke="#1a2b38" strokeWidth="4" />
                </g>
                <rect x="420" y="490" width="40" height="70" fill="#0f1a22" />
                <circle cx="452" cy="527" r="2.5" fill="#ffe500" />
                <rect x="495" y="470" width="120" height="90" fill="#22394a" />
                {[0, 1, 2, 3].map((i) => (
                  <rect key={i} x="495" y={478 + i * 20} width="120" height="3" fill="#18293a" />
                ))}

                {/* Lawn, driveway, sidewalk, road */}
                <rect x="0" y="560" width="1200" height="50" fill="#10241a" />
                <path d="M495 560 L615 560 L660 610 L455 610 Z" fill="#2a3640" />
                <rect x="0" y="610" width="1200" height="16" fill="#3a4752" />
                <rect x="0" y="626" width="1200" height="94" fill="#14181c" />
                {Array.from({ length: 9 }).map((_, i) => (
                  <rect key={i} x={30 + i * 140} y="680" width="80" height="6" rx="3" fill="#3a4550" />
                ))}

                {/* Bin */}
                <g transform={`translate(${binX} ${binY}) scale(${binScale}) rotate(${binTilt})`}>
                  {/* stink lines */}
                  <g opacity={stink} stroke="#7cc56b" strokeWidth="3" fill="none" strokeLinecap="round">
                    <path d="M-14 -118 q-10 -14 0 -28 t0 -28" />
                    <path d="M4 -122 q10 -14 0 -28 t0 -28" />
                    <path d="M22 -116 q-10 -14 0 -28 t0 -28" />
                  </g>
                  <path d="M-30 -96 L30 -96 L24 0 L-24 0 Z" fill={clean > 0.5 ? "url(#gd-shine)" : "#3a4248"} />
                  <path d="M-30 -96 L30 -96 L24 0 L-24 0 Z" fill="#3a4248" opacity={1 - clean} />
                  <g fill="#6b5320" opacity={dirt}>
                    <ellipse cx="-8" cy="-70" rx="10" ry="5" />
                    <ellipse cx="10" cy="-48" rx="7" ry="4" />
                    <ellipse cx="-12" cy="-30" rx="9" ry="5" />
                    <ellipse cx="12" cy="-14" rx="8" ry="4" />
                    <path d="M18 -90 q4 30 -2 60" stroke="#6b5320" strokeWidth="4" fill="none" />
                  </g>
                  <rect x="-36" y="-110" width="72" height="16" rx="4" fill="#e8c21a" />
                  <rect x="-10" y="-118" width="20" height="9" rx="3" fill="#e8c21a" />
                  <circle cx="-20" cy="0" r="9" fill="#1b1f23" stroke="#596470" strokeWidth="3" />
                  {/* sparkles */}
                  <g fill="#fff" opacity={clean}>
                    <path d="M-52 -96 l4 -12 l4 12 l12 4 l-12 4 l-4 12 l-4 -12 l-12 -4 Z" />
                    <path d="M44 -130 l5 -15 l5 15 l15 5 l-15 5 l-5 15 l-5 -15 l-15 -5 Z" />
                    <path d="M44 -40 l3 -9 l3 9 l9 3 l-9 3 l-3 9 l-3 -9 l-9 -3 Z" />
                  </g>
                </g>

                {/* City garbage truck */}
                <g transform={`translate(${truckX} 0)`}>
                  <rect x="110" y="520" width="360" height="160" rx="10" fill="#dfe5ea" />
                  <rect x="110" y="520" width="360" height="22" rx="8" fill="#c3ccd3" />
                  <rect x="110" y="610" width="360" height="16" fill="#2f8f57" />
                  <path d="M0 690 L0 590 Q0 568 22 566 L110 566 L110 690 Z" fill="#f2f5f7" />
                  <path d="M16 582 Q18 574 28 574 L94 574 L94 612 L16 612 Z" fill="#6f9bc1" />
                  <rect x="0" y="650" width="110" height="10" fill="#2f8f57" />
                  <rect x="120" y="530" width="20" height="70" rx="5" fill="#6b7680" />
                  <rect x="112" y="590" width="36" height="10" rx="4" fill="#58636c" />
                  <circle cx="8" cy="680" r="5" fill="#ffe500" />
                  {[60, 330, 420].map((cx) => (
                    <g key={cx}>
                      <circle cx={cx} cy="690" r="28" fill="#1b1f23" />
                      <circle cx={cx} cy="690" r="10" fill="#59636c" />
                    </g>
                  ))}
                </g>

                {/* Wheelie Clean Bins van */}
                <g transform={`translate(${vanX} 0)`}>
                  <path d="M0 690 L0 596 Q0 576 20 576 L250 576 Q272 576 286 596 L330 650 L330 690 Z" fill="#1b2a38" stroke="#4d6b80" strokeWidth="3" />
                  <path d="M262 586 L284 598 L322 646 L262 646 Z" fill="#3d7fa8" />
                  <rect x="0" y="650" width="330" height="12" fill="#ffe500" />
                  <image href="/brand/logo.png" x="12" y="584" width="78" height="62" preserveAspectRatio="xMidYMid meet" />
                  <text x="98" y="618" fontFamily="var(--font-outfit), sans-serif" fontWeight="900" fontSize="27" fill="#ffe500">WHEELIE</text>
                  <text x="99" y="642" fontFamily="var(--font-outfit), sans-serif" fontWeight="800" fontSize="16" fill="#00bde8" letterSpacing="1">CLEAN BINS</text>
                  {[60, 270].map((cx) => (
                    <g key={cx}>
                      <circle cx={cx} cy="694" r="24" fill="#111518" />
                      <circle cx={cx} cy="694" r="9" fill="#59636c" />
                    </g>
                  ))}
                  {/* pressure wand and spray */}
                  <g opacity={washing ? 1 : 0}>
                    <path d="M326 640 L350 616" stroke="#cfd8dc" strokeWidth="5" strokeLinecap="round" />
                    {[0, 1, 2, 3, 4].map((i) => (
                      <path
                        key={i}
                        d={`M352 614 L${368 + i * 4} ${546 + i * 14}`}
                        stroke="#7fe3ff"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeDasharray="6 8"
                        strokeDashoffset={-p * 900 - i * 7}
                      />
                    ))}
                  </g>
                </g>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
