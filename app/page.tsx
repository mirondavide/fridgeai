'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, type Transition, type TargetAndTransition } from 'framer-motion';
import confetti from 'canvas-confetti';

/* ── Types ──────────────────────────────────────────────── */
interface Recipe {
  name: string;
  emoji: string;
  time: string;
  difficulty: string;
  description: string;
  steps: string[];
  missingIngredients: string[];
  imageUrl?: string | null;
}

interface FridgeResult {
  detectedIngredients: string[];
  recipes: Recipe[];
}

type Phase = 'idle' | 'preview' | 'loading' | 'results';

/* ── Design tokens ──────────────────────────────────────── */
const C = {
  bg:              '#050E0C',
  primary:         '#00D4AA',
  primaryDark:     '#00A880',
  text:            '#ffffff',
  muted:           'rgba(255,255,255,0.45)',
  veryMuted:       'rgba(255,255,255,0.25)',
  surface:         'rgba(255,255,255,0.03)',
  border:          'rgba(255,255,255,0.07)',
  borderHighlight: 'rgba(0,212,170,0.3)',
} as const;

const CHIP_COLORS = [
  { bg: 'rgba(0,212,170,0.12)',  text: '#00D4AA', border: 'rgba(0,212,170,0.25)'  },
  { bg: 'rgba(139,92,246,0.12)', text: '#a78bfa', border: 'rgba(139,92,246,0.25)' },
  { bg: 'rgba(251,191,36,0.12)', text: '#fbbf24', border: 'rgba(251,191,36,0.25)' },
  { bg: 'rgba(59,130,246,0.12)', text: '#60a5fa', border: 'rgba(59,130,246,0.25)' },
  { bg: 'rgba(236,72,153,0.12)', text: '#f472b6', border: 'rgba(236,72,153,0.25)' },
  { bg: 'rgba(249,115,22,0.12)', text: '#fb923c', border: 'rgba(249,115,22,0.25)' },
];

const RECIPE_GRADIENTS = [
  'linear-gradient(90deg, #00D4AA, #00A880)',
  'linear-gradient(90deg, #8b5cf6, #ec4899)',
  'linear-gradient(90deg, #3b82f6, #06b6d4)',
];

const DIFF_COLORS: Record<string, { bg: string; text: string }> = {
  easy:   { bg: 'rgba(0,212,170,0.15)',  text: '#00D4AA' },
  medium: { bg: 'rgba(251,191,36,0.15)', text: '#fbbf24' },
  hard:   { bg: 'rgba(239,68,68,0.15)',  text: '#f87171' },
};

const MARQUEE_ITEMS = [
  '🥚 Eggs', '🥛 Milk', '🧀 Cheese', '🍅 Tomatoes', '🧄 Garlic',
  '🧈 Butter', '🫑 Peppers', '🥕 Carrots', '🥦 Broccoli', '🍗 Chicken',
  '🥩 Beef', '🧅 Onions', '🥑 Avocado', '🍋 Lemon', '🫙 Pasta', '🍄 Mushrooms',
  '🫐 Blueberries', '🍓 Strawberries', '🧃 Orange Juice', '🥣 Oats',
];

const LOADING_STEPS = [
  { title: 'Scanning your fridge...',  sub: 'Reading the image'           },
  { title: 'Ingredients detected!',    sub: 'Building your recipes...'    },
  { title: 'Almost there...',          sub: 'Crafting the perfect meal'   },
];

/* ── Shared motion props ────────────────────────────────── */
const EASE: [number,number,number,number] = [0.16, 1, 0.3, 1];
const PAGE_MOTION: { initial: TargetAndTransition; animate: TargetAndTransition; exit: TargetAndTransition; transition: Transition } = {
  initial:    { opacity: 0, y: 22 },
  animate:    { opacity: 1, y: 0  },
  exit:       { opacity: 0, y: -14 },
  transition: { duration: 0.38, ease: EASE },
};

/* ── Background orbs ────────────────────────────────────── */
function BackgroundOrbs() {
  return (
    <>
      <div
        className="animate-float-orb-a"
        style={{
          position: 'fixed', top: '-100px', left: '-150px',
          width: '600px', height: '600px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,212,170,0.10) 0%, transparent 65%)',
          pointerEvents: 'none', zIndex: 0,
        }}
      />
      <div
        className="animate-float-orb-b"
        style={{
          position: 'fixed', bottom: '-120px', right: '-100px',
          width: '500px', height: '500px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,180,140,0.07) 0%, transparent 65%)',
          pointerEvents: 'none', zIndex: 0,
        }}
      />
    </>
  );
}

/* ── Nav ────────────────────────────────────────────────── */
function Nav({ phase, onReset }: { phase: Phase; onReset: () => void }) {
  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      height: '64px', padding: '0 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: 'rgba(5,14,12,0.85)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
        <span style={{ fontSize: '22px', lineHeight: 1 }}>🧊</span>
        <span style={{ fontSize: '20px', fontWeight: 800, color: C.text, letterSpacing: '-0.3px' }}>
          FridgeAI
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <span
            className="animate-glow-pulse"
            style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: C.primary, flexShrink: 0 }}
          />
          <span style={{ fontSize: '12px', fontWeight: 600, color: C.muted }}>Live</span>
        </div>
        {phase !== 'idle' && (
          <button onClick={onReset} className="btn-ghost" style={{ fontSize: '13px', fontWeight: 700, padding: '8px 16px', fontFamily: 'inherit' }}>
            ← New scan
          </button>
        )}
      </div>
    </nav>
  );
}

/* ── Cook Mode Overlay ──────────────────────────────────── */
interface CookModeProps {
  recipe:      Recipe;
  si:          number;
  onNext:      () => void;
  onPrev:      () => void;
  onExit:      () => void;
  onToggle:    (si: number) => void;
}

function CookModeOverlay({ recipe, si, onNext, onPrev, onExit, onToggle }: CookModeProps) {
  const step   = recipe.steps[si];
  const prog   = (si + 1) / recipe.steps.length;
  const isLast = si === recipe.steps.length - 1;

  return (
    <motion.div
      key="cook-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="cook-mode-overlay"
    >
      {/* Top bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '24px' }}>{recipe.emoji}</span>
          <span style={{ fontSize: '15px', fontWeight: 700, color: C.muted }}>{recipe.name}</span>
        </div>
        <button onClick={onExit} className="btn-ghost" style={{ padding: '8px 16px', fontSize: '13px', fontFamily: 'inherit' }}>
          ✕ Exit
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ position: 'absolute', top: '64px', left: 0, right: 0, height: '2px', backgroundColor: 'rgba(255,255,255,0.07)' }}>
        <motion.div
          initial={false}
          animate={{ width: `${prog * 100}%` }}
          transition={{ duration: 0.4, ease: EASE }}
          style={{ height: '100%', background: `linear-gradient(90deg, ${C.primary}, #00FFC8)` }}
        />
      </div>

      {/* Step counter */}
      <p className="section-label" style={{ marginBottom: '20px' }}>
        STEP {si + 1} OF {recipe.steps.length}
      </p>

      {/* Step text — animates between steps */}
      <AnimatePresence mode="wait">
        <motion.p
          key={si}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0  }}
          exit={{ opacity: 0, y: -12  }}
          transition={{ duration: 0.28, ease: EASE }}
          style={{
            fontSize: 'clamp(1.4rem, 4vw, 2rem)',
            fontWeight: 700, color: C.text,
            lineHeight: 1.5, maxWidth: '640px',
            marginBottom: '48px',
          }}
        >
          {step}
        </motion.p>
      </AnimatePresence>

      {/* Navigation */}
      <div style={{ display: 'flex', gap: '12px' }}>
        {si > 0 && (
          <button onClick={onPrev} className="btn-ghost" style={{ padding: '16px 32px', fontSize: '16px', fontFamily: 'inherit' }}>
            ← Back
          </button>
        )}
        <button
          onClick={() => { onToggle(si); onNext(); }}
          className="btn-primary"
          style={{ padding: '16px 40px', fontSize: '16px', fontFamily: 'inherit' }}
        >
          {isLast ? '🎉 Done!' : 'Next step →'}
        </button>
      </div>
    </motion.div>
  );
}

/* ── Main page ──────────────────────────────────────────── */
export default function FridgeAIPage() {
  const [phase, setPhase]             = useState<Phase>('idle');
  const [imgPreview, setImgPreview]   = useState<string | null>(null);
  const [imgData, setImgData]         = useState<{ base64: string; mimeType: string } | null>(null);
  const [result, setResult]           = useState<FridgeResult | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [openIdx, setOpenIdx]         = useState<number | null>(null);
  const [checked, setChecked]         = useState<Record<string, boolean>>({});
  const [cookMode, setCookMode]       = useState<{ ri: number; si: number } | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [cursor, setCursor]           = useState({ x: -1000, y: -1000 });
  const [tilt, setTilt]               = useState({ x: 0, y: 0 });
  const fileRef                       = useRef<HTMLInputElement>(null);
  const cameraRef                     = useRef<HTMLInputElement>(null);

  /* Cursor glow */
  useEffect(() => {
    const h = (e: MouseEvent) => setCursor({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', h);
    return () => window.removeEventListener('mousemove', h);
  }, []);

  /* Loading step progression */
  useEffect(() => {
    if (phase !== 'loading') { setLoadingStep(0); return; }
    const t1 = setTimeout(() => setLoadingStep(1), 2800);
    const t2 = setTimeout(() => setLoadingStep(2), 5500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [phase]);

  /* ── Handlers ───────────────────────────────────────── */
  function handleFile(file: File) {
    if (!file.type.startsWith('image/')) { setError('Please upload an image file.'); return; }
    if (file.size > 8 * 1024 * 1024)    { setError('Max file size is 8MB.');         return; }
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      setImgPreview(url);
      setImgData({ base64: url.split(',')[1], mimeType: file.type });
      setPhase('preview');
    };
    reader.readAsDataURL(file);
  }

  async function scan() {
    if (!imgData) return;
    setPhase('loading');
    setError(null);
    setResult(null);
    setOpenIdx(null);
    setChecked({});
    try {
      const res  = await fetch('/api/fridge', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ image: imgData.base64, mimeType: imgData.mimeType }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Something went wrong.'); setPhase('preview'); return; }
      setResult(data as FridgeResult);
      setPhase('results');
    } catch {
      setError('Network error — please try again.'); setPhase('preview');
    }
  }

  function reset() {
    setPhase('idle'); setImgPreview(null); setImgData(null);
    setResult(null); setError(null); setOpenIdx(null);
    setChecked({}); setCookMode(null);
  }

  function toggleStep(ri: number, si: number) {
    const k    = `${ri}-${si}`;
    const next = { ...checked, [k]: !checked[k] };
    setChecked(next);
    if (result && !checked[k]) {
      const allComplete = result.recipes[ri].steps.every((_, i) => next[`${ri}-${i}`]);
      if (allComplete) {
        confetti({ particleCount: 130, spread: 80, origin: { y: 0.6 }, colors: ['#00D4AA', '#00FFC8', '#ffffff', '#a78bfa'] });
      }
    }
  }

  function allDone(ri: number, steps: string[]) {
    return steps.length > 0 && steps.every((_, si) => checked[`${ri}-${si}`]);
  }

  function handleUploadMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const dx   = (e.clientX - rect.left - rect.width  / 2) / (rect.width  / 2);
    const dy   = (e.clientY - rect.top  - rect.height / 2) / (rect.height / 2);
    setTilt({ x: dy * -6, y: dx * 6 });
  }

  function handleUploadMouseLeave() {
    setTilt({ x: 0, y: 0 });
  }

  /* ── Render ──────────────────────────────────────────── */
  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.bg, fontFamily: 'inherit', position: 'relative' }}>
      <BackgroundOrbs />

      {/* Cursor glow */}
      <div className="cursor-glow" style={{ left: cursor.x, top: cursor.y }} />

      <Nav phase={phase} onReset={reset} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <AnimatePresence mode="wait">

          {/* ── IDLE ─────────────────────────────────── */}
          {phase === 'idle' && (
            <motion.div key="idle" {...PAGE_MOTION} className="hero-split-idle">

              {/* ── Text column ────────────────────────── */}
              <div className="hero-text-idle">
                {/* Headline */}
                <h1 style={{ fontSize: 'clamp(2.8rem, 6vw, 5rem)', fontWeight: 900, lineHeight: 1.05, marginBottom: '24px', color: C.text, letterSpacing: '-2.5px' }}>
                  Open your{' '}
                  <span className="teal-gradient-text">fridge.</span>
                  <br />We&apos;ll handle
                  <br />the rest.
                </h1>

                {/* Tagline */}
                <p style={{ fontSize: '18px', fontWeight: 500, color: C.muted, lineHeight: 1.65, marginBottom: '48px', maxWidth: '380px' }}>
                  Drop a photo. Get 3 real recipes you can make with what you already have.
                </p>

                {/* CTAs */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '300px' }}>
                  <button className="btn-primary" style={{ padding: '17px 24px', fontSize: '16px', letterSpacing: '0.2px' }} onClick={() => fileRef.current?.click()}>
                    Let&apos;s cook →
                  </button>
                  <button className="btn-ghost mobile-only" style={{ padding: '14px 24px', fontSize: '14px', fontFamily: 'inherit' }} onClick={() => cameraRef.current?.click()}>
                    📷 Take a photo
                  </button>
                </div>
              </div>

              {/* ── Upload portal column ────────────────── */}
              <div className="hero-upload-idle">
                <div
                  className="upload-scanner-wrap"
                  style={{
                    transform: `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
                    transition: tilt.x === 0 && tilt.y === 0 ? 'transform 0.55s ease' : 'transform 0.08s ease',
                  }}
                  onClick={() => fileRef.current?.click()}
                  onMouseMove={handleUploadMouseMove}
                  onMouseLeave={handleUploadMouseLeave}
                  onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
                  onDragOver={(e) => e.preventDefault()}
                >
                  <div className="upload-scanner-inner">
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', border: '1px solid rgba(0,212,170,0.2)', backgroundColor: 'rgba(0,212,170,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                      <span style={{ fontSize: '34px', color: C.primary, lineHeight: 1, fontWeight: 300 }}>+</span>
                    </div>
                    <p style={{ fontSize: '17px', fontWeight: 700, color: C.text, marginBottom: '10px', letterSpacing: '-0.3px' }}>
                      Drop your fridge photo
                    </p>
                    <p style={{ fontSize: '13px', color: C.muted, lineHeight: 1.6 }}>
                      JPEG · PNG · HEIC · WebP<br />Max 8 MB
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── PREVIEW ──────────────────────────────── */}
          {phase === 'preview' && imgPreview && (
            <motion.div key="preview" {...PAGE_MOTION}
              style={{ maxWidth: '560px', margin: '0 auto', padding: '88px 20px 80px' }}
            >
              <p style={{ fontSize: '22px', fontWeight: 800, color: C.text, marginBottom: '16px' }}>Looks delicious. 👀</p>
              <img
                src={imgPreview} alt="Your fridge"
                style={{ width: '100%', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)', display: 'block', marginBottom: '16px', maxHeight: '320px', objectFit: 'cover' }}
              />
              {error && <p style={{ color: '#f87171', fontWeight: 600, fontSize: '14px', marginBottom: '14px' }}>{error}</p>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button className="btn-primary" style={{ width: '100%', padding: '17px', fontSize: '17px', letterSpacing: '0.2px' }} onClick={scan}>
                  Find my recipes →
                </button>
                <button className="btn-ghost" style={{ width: '100%', padding: '16px', fontSize: '15px', fontFamily: 'inherit' }} onClick={reset}>
                  Use a different photo
                </button>
              </div>
            </motion.div>
          )}

          {/* ── LOADING ──────────────────────────────── */}
          {phase === 'loading' && (
            <motion.div key="loading" {...PAGE_MOTION}
              style={{ textAlign: 'center', padding: '96px 20px 80px', maxWidth: '540px', margin: '0 auto' }}
            >
              {/* Fridge scan visualization */}
              {imgPreview && (
                <div className="loading-scan-wrap" style={{ marginBottom: '36px' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imgPreview} alt="Scanning" className="loading-scan-img" />
                  <div className="scan-grid" />
                  <div className="scan-beam" />
                  <div className="scan-line" />
                  <div className="vf-corner vf-tl" />
                  <div className="vf-corner vf-tr" />
                  <div className="vf-corner vf-bl" />
                  <div className="vf-corner vf-br" />
                </div>
              )}

              {/* Phase text */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={loadingStep}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0  }}
                  exit={{ opacity: 0, y: -8   }}
                  transition={{ duration: 0.3 }}
                >
                  <h2 style={{ fontSize: '22px', fontWeight: 800, color: C.text, marginBottom: '8px' }}>
                    {LOADING_STEPS[loadingStep].title}
                  </h2>
                  <p style={{ fontSize: '15px', color: C.muted }}>
                    {LOADING_STEPS[loadingStep].sub}
                  </p>
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}

          {/* ── RESULTS ──────────────────────────────── */}
          {phase === 'results' && result && (
            <motion.div key="results" {...PAGE_MOTION} className="results-split">

              {/* ── Left: sticky photo pane ─────────── */}
              <div className="results-split-photo">
                {imgPreview && (
                  <img
                    src={imgPreview} alt="Your fridge"
                    style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)', display: 'block' }}
                  />
                )}
                <button className="btn-ghost" onClick={reset} style={{ width: '100%', marginTop: '16px', padding: '13px', fontSize: '14px', fontFamily: 'inherit' }}>
                  Start over
                </button>
              </div>

              {/* ── Right: scrollable content ────────── */}
              <div className="results-split-content">

                {/* Ingredients */}
                <div className="section-label" style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  INGREDIENTS
                  <span style={{ color: C.primary, fontWeight: 800 }}>{result.detectedIngredients.length}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '32px' }}>
                  {result.detectedIngredients.map((ing, i) => {
                    const chip = CHIP_COLORS[i % 6];
                    return (
                      <span key={i} style={{ display: 'inline-block', padding: '7px 14px', borderRadius: '99px', fontSize: '13px', fontWeight: 700, backgroundColor: chip.bg, color: chip.text, border: `1px solid ${chip.border}`, animation: `chip-in 0.4s ${i * 0.05}s cubic-bezier(0.16,1,0.3,1) both` }}>
                        {ing}
                      </span>
                    );
                  })}
                </div>

                <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.07)', marginBottom: '24px' }} />

                {/* Recipes */}
                <div className="section-label" style={{ marginBottom: '16px' }}>TONIGHT&apos;S MENU</div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {result.recipes.map((recipe, ri) => {
                    const isOpen = openIdx === ri;
                    const done   = allDone(ri, recipe.steps);
                    const diff   = DIFF_COLORS[recipe.difficulty] ?? DIFF_COLORS.easy;

                    return (
                      <motion.div
                        key={ri}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0  }}
                        transition={{ delay: ri * 0.1, duration: 0.4, ease: EASE }}
                        className={`recipe-card${isOpen ? ' open' : ''}`}
                      >
                        {/* Card header — image or gradient bar */}
                        {recipe.imageUrl ? (
                          <div className="recipe-card-image-header">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={recipe.imageUrl} alt={recipe.name} />
                            <div className="recipe-card-image-overlay">
                              <button
                                onClick={() => setOpenIdx(isOpen ? null : ri)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, width: '100%', textAlign: 'left', fontFamily: 'inherit' }}
                              >
                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
                                  <span style={{ fontSize: '32px', lineHeight: 1, flexShrink: 0 }}>{recipe.emoji}</span>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#fff', marginBottom: '7px', letterSpacing: '-0.3px' }}>{recipe.name}</div>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.85)', backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: '99px', padding: '3px 10px' }}>⏱ {recipe.time}</span>
                                      <span style={{ fontSize: '12px', fontWeight: 700, backgroundColor: diff.bg, color: diff.text, borderRadius: '99px', padding: '3px 10px' }}>{recipe.difficulty}</span>
                                    </div>
                                  </div>
                                  <span style={{ fontSize: '18px', color: 'rgba(255,255,255,0.7)', flexShrink: 0, transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s cubic-bezier(0.16,1,0.3,1)', display: 'inline-block' }}>›</span>
                                </div>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div style={{ height: '3px', background: RECIPE_GRADIENTS[ri % 3] }} />
                            <button
                              onClick={() => setOpenIdx(isOpen ? null : ri)}
                              style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', textAlign: 'left', fontFamily: 'inherit' }}
                            >
                              <span style={{ fontSize: '36px', lineHeight: 1, flexShrink: 0 }}>{recipe.emoji}</span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '16px', fontWeight: 800, color: C.text, marginBottom: '8px', letterSpacing: '-0.2px' }}>{recipe.name}</div>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: '12px', fontWeight: 700, color: C.muted, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '99px', padding: '4px 10px' }}>⏱ {recipe.time}</span>
                                  <span style={{ fontSize: '12px', fontWeight: 700, backgroundColor: diff.bg, color: diff.text, borderRadius: '99px', padding: '4px 10px' }}>{recipe.difficulty}</span>
                                </div>
                              </div>
                              <span style={{ fontSize: '18px', color: C.muted, flexShrink: 0, transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s cubic-bezier(0.16,1,0.3,1)', display: 'inline-block' }}>›</span>
                            </button>
                          </>
                        )}

                        {/* Expanded body */}
                        {isOpen && (
                          <div style={{ padding: '16px 20px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                            {/* Cook Mode CTA */}
                            <button
                              onClick={() => setCookMode({ ri, si: 0 })}
                              className="btn-primary"
                              style={{ width: '100%', padding: '13px', fontSize: '14px', fontFamily: 'inherit', marginBottom: '16px' }}
                            >
                              🍳 Start Cook Mode
                            </button>

                            {/* Description */}
                            <p style={{ fontSize: '14px', color: C.muted, fontWeight: 500, lineHeight: 1.6, marginBottom: '20px' }}>
                              {recipe.description}
                            </p>

                            {/* Steps */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              {recipe.steps.map((step, si) => {
                                const k         = `${ri}-${si}`;
                                const isChecked = !!checked[k];
                                return (
                                  <button key={si} className={`step-btn${isChecked ? ' checked' : ''}`} onClick={() => toggleStep(ri, si)}>
                                    <div className={`step-circle${isChecked ? ' checked' : ''}`}>
                                      {isChecked
                                        ? <span style={{ color: '#fff', fontSize: '13px', fontWeight: 900 }}>✓</span>
                                        : <span>{si + 1}</span>}
                                    </div>
                                    <span style={{ fontSize: '14px', fontWeight: 600, color: `rgba(255,255,255,${isChecked ? 0.35 : 0.8})`, textDecoration: isChecked ? 'line-through' : 'none', transition: 'color 0.2s', lineHeight: 1.5 }}>
                                      {step}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>

                            {/* Missing ingredients */}
                            {recipe.missingIngredients.length > 0 && (
                              <div className="glass" style={{ border: '1px solid rgba(251,191,36,0.2)', borderRadius: '14px', padding: '12px 16px', marginTop: '16px' }}>
                                <p style={{ fontSize: '13px', fontWeight: 600, color: '#fbbf24', lineHeight: 1.5 }}>
                                  ⚠ Might also need:{' '}
                                  <span style={{ color: 'rgba(251,191,36,0.7)' }}>{recipe.missingIngredients.join(', ')}</span>
                                </p>
                              </div>
                            )}

                            {/* Completion */}
                            {done && (
                              <div style={{ marginTop: '16px', backgroundColor: 'rgba(0,212,170,0.08)', border: '1px solid rgba(0,212,170,0.2)', borderRadius: '16px', padding: '20px', textAlign: 'center' }}>
                                <div style={{ fontSize: '32px', marginBottom: '8px', lineHeight: 1 }}>🎉</div>
                                <p style={{ fontSize: '18px', fontWeight: 800, color: C.primary, marginBottom: '4px' }}>Recipe complete!</p>
                                <p style={{ fontSize: '14px', color: C.muted }}>Nice work, chef 👨‍🍳</p>
                              </div>
                            )}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ── Ingredient marquee (idle only) ──────────────────── */}
      <AnimatePresence>
        {phase === 'idle' && (
          <motion.div
            key="marquee"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.4 }}
            style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 20, borderTop: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'rgba(3,9,7,0.88)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', padding: '14px 0', overflow: 'hidden' }}
          >
            <div className="marquee-track">
              {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
                <span key={i} style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.22)', padding: '0 22px', whiteSpace: 'nowrap', letterSpacing: '0.02em' }}>
                  {item}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Cook Mode Overlay ────────────────────────────── */}
      <AnimatePresence>
        {cookMode !== null && result && (
          <CookModeOverlay
            recipe={result.recipes[cookMode.ri]}
            si={cookMode.si}
            onToggle={(si) => toggleStep(cookMode.ri, si)}
            onNext={() => {
              const recipe = result.recipes[cookMode.ri];
              if (cookMode.si < recipe.steps.length - 1) {
                setCookMode({ ...cookMode, si: cookMode.si + 1 });
              } else {
                setCookMode(null);
              }
            }}
            onPrev={() => cookMode.si > 0 && setCookMode({ ...cookMode, si: cookMode.si - 1 })}
            onExit={() => setCookMode(null)}
          />
        )}
      </AnimatePresence>

      {/* Hidden file inputs */}
      <input
        ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); e.target.value = ''; }}
      />
      <input
        ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
        onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); e.target.value = ''; }}
      />
    </div>
  );
}
