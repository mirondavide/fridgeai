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

const LOADING_TIPS = [
  '💡 Save pasta water — the starch makes sauces silkier.',
  '💡 Salt your water generously — it\'s the only chance to season pasta.',
  '💡 Room-temp eggs beat faster and hold more air.',
  '💡 Let meat rest after cooking — juices redistribute.',
  '💡 A hot pan before oil means nothing sticks.',
  '💡 Acid (lemon, vinegar) brightens any dish at the end.',
  '💡 Fresh herbs added last, dried herbs added early.',
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
  const [tipIdx, setTipIdx]           = useState(0);
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
    if (phase !== 'loading') { setLoadingStep(0); setTipIdx(0); return; }
    const t1 = setTimeout(() => setLoadingStep(1), 2800);
    const t2 = setTimeout(() => setLoadingStep(2), 5500);
    const tip = setInterval(() => setTipIdx(i => (i + 1) % LOADING_TIPS.length), 3200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearInterval(tip); };
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
            <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}
              style={{ minHeight: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}
            >
              {/* Blurred ambient background */}
              <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imgPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.28) blur(3px)', transform: 'scale(1.06)' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(5,14,12,0.15) 0%, rgba(5,14,12,0.96) 75%)' }} />
              </div>

              {/* Centered featured photo */}
              <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px 24px' }}>
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, ease: EASE }}
                  style={{ maxWidth: '540px', width: '100%', position: 'relative' }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imgPreview} alt="Your fridge"
                    style={{ width: '100%', borderRadius: '24px', display: 'block', boxShadow: '0 48px 120px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,212,170,0.18)' }}
                  />
                  {/* Corner brackets */}
                  <div style={{ position: 'absolute', top: 12, left: 12, width: 20, height: 20, borderTop: '2px solid rgba(0,212,170,0.6)', borderLeft: '2px solid rgba(0,212,170,0.6)', borderRadius: '2px 0 0 0' }} />
                  <div style={{ position: 'absolute', top: 12, right: 12, width: 20, height: 20, borderTop: '2px solid rgba(0,212,170,0.6)', borderRight: '2px solid rgba(0,212,170,0.6)', borderRadius: '0 2px 0 0' }} />
                  <div style={{ position: 'absolute', bottom: 12, left: 12, width: 20, height: 20, borderBottom: '2px solid rgba(0,212,170,0.6)', borderLeft: '2px solid rgba(0,212,170,0.6)', borderRadius: '0 0 0 2px' }} />
                  <div style={{ position: 'absolute', bottom: 12, right: 12, width: 20, height: 20, borderBottom: '2px solid rgba(0,212,170,0.6)', borderRight: '2px solid rgba(0,212,170,0.6)', borderRadius: '0 0 2px 0' }} />
                </motion.div>
              </div>

              {/* Frosted glass bottom panel */}
              <div style={{ position: 'relative', zIndex: 1, padding: '24px 24px 40px', backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)', borderTop: '1px solid rgba(255,255,255,0.06)', backgroundColor: 'rgba(5,14,12,0.6)' }}>
                <div style={{ maxWidth: '540px', margin: '0 auto' }}>
                  {error && <p style={{ color: '#f87171', fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>{error}</p>}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div>
                      <p style={{ fontSize: '18px', fontWeight: 800, color: C.text, marginBottom: '3px', letterSpacing: '-0.3px' }}>Photo ready</p>
                      <p style={{ fontSize: '13px', color: C.muted }}>AI will identify what&apos;s in your fridge</p>
                    </div>
                    <button
                      onClick={reset}
                      style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '8px 14px', cursor: 'pointer', color: C.muted, fontSize: '13px', fontFamily: 'inherit', fontWeight: 600, transition: 'border-color 0.15s, color 0.15s', flexShrink: 0 }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)'; e.currentTarget.style.color = C.text; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = C.muted; }}
                    >
                      ✕ Different photo
                    </button>
                  </div>
                  <button className="btn-primary" style={{ width: '100%', padding: '17px', fontSize: '17px', letterSpacing: '0.2px' }} onClick={scan}>
                    Find my recipes →
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── LOADING ──────────────────────────────── */}
          {phase === 'loading' && (
            <motion.div key="loading" {...PAGE_MOTION}
              style={{ textAlign: 'center', padding: '20px', maxWidth: '540px', margin: '0 auto', minHeight: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
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

              {/* Rotating cooking tips */}
              <div style={{ marginTop: '40px', maxWidth: '340px', margin: '40px auto 0' }}>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={tipIdx}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.4 }}
                    style={{ fontSize: '13px', color: 'rgba(255,255,255,0.28)', fontWeight: 500, lineHeight: 1.6, textAlign: 'center', fontStyle: 'italic' }}
                  >
                    {LOADING_TIPS[tipIdx]}
                  </motion.p>
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* ── RESULTS ──────────────────────────────── */}
          {phase === 'results' && result && (
            <motion.div key="results" {...PAGE_MOTION} className="results-split">

              {/* ── Left: sticky photo pane ─────────── */}
              <div className="results-split-photo">
                {imgPreview && (
                  <div style={{ position: 'relative' }}>
                    <img
                      src={imgPreview} alt="Your fridge"
                      style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: '20px', border: '1px solid rgba(0,212,170,0.15)', display: 'block', boxShadow: '0 0 0 1px rgba(0,212,170,0.08), 0 32px 80px rgba(0,0,0,0.5)' }}
                    />
                    {/* Subtle scan corners */}
                    <div style={{ position: 'absolute', top: 10, left: 10, width: 18, height: 18, borderTop: '2px solid rgba(0,212,170,0.5)', borderLeft: '2px solid rgba(0,212,170,0.5)', borderRadius: '2px 0 0 0' }} />
                    <div style={{ position: 'absolute', top: 10, right: 10, width: 18, height: 18, borderTop: '2px solid rgba(0,212,170,0.5)', borderRight: '2px solid rgba(0,212,170,0.5)', borderRadius: '0 2px 0 0' }} />
                    <div style={{ position: 'absolute', bottom: 10, left: 10, width: 18, height: 18, borderBottom: '2px solid rgba(0,212,170,0.5)', borderLeft: '2px solid rgba(0,212,170,0.5)', borderRadius: '0 0 0 2px' }} />
                    <div style={{ position: 'absolute', bottom: 10, right: 10, width: 18, height: 18, borderBottom: '2px solid rgba(0,212,170,0.5)', borderRight: '2px solid rgba(0,212,170,0.5)', borderRadius: '0 0 2px 0' }} />
                  </div>
                )}
                <button
                  onClick={reset}
                  style={{ width: '100%', marginTop: '14px', padding: '11px', fontSize: '13px', fontFamily: 'inherit', background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontWeight: 600, transition: 'color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = C.text)}
                  onMouseLeave={e => (e.currentTarget.style.color = C.muted)}
                >
                  ← Start over
                </button>
              </div>

              {/* ── Right: scrollable content ────────── */}
              <div className="results-split-content">

                {/* Empty state — no ingredients detected */}
                {result.detectedIngredients.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: EASE }}
                    style={{ textAlign: 'center', padding: '48px 24px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px' }}
                  >
                    <div style={{ fontSize: '48px', marginBottom: '16px', lineHeight: 1 }}>🤔</div>
                    <h3 style={{ fontSize: '20px', fontWeight: 800, color: C.text, marginBottom: '10px', letterSpacing: '-0.3px' }}>
                      Doesn&apos;t look like a fridge
                    </h3>
                    <p style={{ fontSize: '14px', color: C.muted, lineHeight: 1.6, marginBottom: '28px', maxWidth: '280px', margin: '0 auto 28px' }}>
                      Make sure the photo shows food, ingredients, or a fridge. No people, furniture, or blank walls.
                    </p>
                    <button
                      className="btn-primary"
                      onClick={reset}
                      style={{ padding: '14px 32px', fontSize: '15px', fontFamily: 'inherit' }}
                    >
                      Try again →
                    </button>
                  </motion.div>
                )}

                {/* Ingredients header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '3px', height: '16px', background: `linear-gradient(180deg, ${C.primary}, ${C.primaryDark})`, borderRadius: '99px' }} />
                    <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>Ingredients</span>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: C.primary, backgroundColor: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.2)', borderRadius: '99px', padding: '2px 10px' }}>
                    {result.detectedIngredients.length} found
                  </span>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '36px' }}>
                  {result.detectedIngredients.map((ing, i) => {
                    const chip = CHIP_COLORS[i % 6];
                    return (
                      <span key={i} style={{ display: 'inline-block', padding: '7px 14px', borderRadius: '99px', fontSize: '13px', fontWeight: 600, backgroundColor: chip.bg, color: chip.text, border: `1px solid ${chip.border}`, animation: `chip-in 0.4s ${i * 0.05}s cubic-bezier(0.16,1,0.3,1) both` }}>
                        {ing}
                      </span>
                    );
                  })}
                </div>

                <div style={{ height: '1px', background: 'linear-gradient(90deg, rgba(0,212,170,0.2), rgba(255,255,255,0.06) 60%, transparent)', marginBottom: '32px' }} />

                {/* Recipes header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                  <div style={{ width: '3px', height: '16px', background: `linear-gradient(180deg, ${C.primary}, ${C.primaryDark})`, borderRadius: '99px' }} />
                  <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>Tonight&apos;s menu</span>
                </div>

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
                            {/* Recipe number */}
                            <div style={{ position: 'absolute', top: 14, right: 14, fontSize: '11px', fontWeight: 800, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', borderRadius: '6px', padding: '3px 8px' }}>
                              0{ri + 1}
                            </div>
                            <div className="recipe-card-image-overlay">
                              <button
                                onClick={() => setOpenIdx(isOpen ? null : ri)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, width: '100%', textAlign: 'left', fontFamily: 'inherit' }}
                              >
                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
                                  <span style={{ fontSize: '30px', lineHeight: 1, flexShrink: 0 }}>{recipe.emoji}</span>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '17px', fontWeight: 800, color: '#fff', marginBottom: '8px', letterSpacing: '-0.3px', lineHeight: 1.2 }}>{recipe.name}</div>
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                      <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.8)', backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', borderRadius: '99px', padding: '3px 10px' }}>⏱ {recipe.time}</span>
                                      <span style={{ fontSize: '11px', fontWeight: 700, backgroundColor: diff.bg, color: diff.text, borderRadius: '99px', padding: '3px 10px', backdropFilter: 'blur(8px)' }}>{recipe.difficulty}</span>
                                    </div>
                                  </div>
                                  <span style={{ fontSize: '20px', color: 'rgba(255,255,255,0.6)', flexShrink: 0, transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.25s cubic-bezier(0.16,1,0.3,1)', display: 'inline-block' }}>›</span>
                                </div>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div style={{ height: '3px', background: RECIPE_GRADIENTS[ri % 3] }} />
                            <button
                              onClick={() => setOpenIdx(isOpen ? null : ri)}
                              style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '20px', display: 'flex', alignItems: 'center', gap: '14px', textAlign: 'left', fontFamily: 'inherit' }}
                            >
                              <span style={{ fontSize: '11px', fontWeight: 800, color: C.veryMuted, letterSpacing: '0.08em', flexShrink: 0, minWidth: '24px' }}>0{ri + 1}</span>
                              <span style={{ fontSize: '32px', lineHeight: 1, flexShrink: 0 }}>{recipe.emoji}</span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '16px', fontWeight: 800, color: C.text, marginBottom: '7px', letterSpacing: '-0.2px' }}>{recipe.name}</div>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: '11px', fontWeight: 700, color: C.muted, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '99px', padding: '3px 10px' }}>⏱ {recipe.time}</span>
                                  <span style={{ fontSize: '11px', fontWeight: 700, backgroundColor: diff.bg, color: diff.text, borderRadius: '99px', padding: '3px 10px' }}>{recipe.difficulty}</span>
                                </div>
                              </div>
                              <span style={{ fontSize: '20px', color: C.muted, flexShrink: 0, transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.25s cubic-bezier(0.16,1,0.3,1)', display: 'inline-block' }}>›</span>
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

                            {/* Steps progress bar */}
                            {(() => {
                              const doneCount = recipe.steps.filter((_, si) => checked[`${ri}-${si}`]).length;
                              const pct = recipe.steps.length > 0 ? (doneCount / recipe.steps.length) * 100 : 0;
                              return (
                                <div style={{ marginBottom: '14px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '7px' }}>
                                    <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>Steps</span>
                                    <span style={{ fontSize: '11px', fontWeight: 800, color: doneCount === recipe.steps.length && doneCount > 0 ? C.primary : C.muted }}>
                                      {doneCount}/{recipe.steps.length}
                                    </span>
                                  </div>
                                  <div style={{ height: '2px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden' }}>
                                    <motion.div
                                      animate={{ width: `${pct}%` }}
                                      transition={{ duration: 0.45, ease: EASE }}
                                      style={{ height: '100%', background: `linear-gradient(90deg, ${C.primary}, #00FFC8)`, borderRadius: '99px' }}
                                    />
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Steps */}
                            <motion.div
                              initial="hidden"
                              animate="visible"
                              variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } } }}
                              style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
                            >
                              {recipe.steps.map((step, si) => {
                                const k         = `${ri}-${si}`;
                                const isChecked = !!checked[k];
                                return (
                                  <motion.button
                                    key={si}
                                    variants={{ hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0, transition: { duration: 0.32, ease: EASE } } }}
                                    whileHover={{ x: 3, scale: 1.012 }}
                                    whileTap={{ scale: 0.97 }}
                                    className={`step-btn${isChecked ? ' checked' : ''}`}
                                    onClick={() => toggleStep(ri, si)}
                                  >
                                    <div className={`step-circle${isChecked ? ' checked' : ''}`}>
                                      <AnimatePresence mode="wait" initial={false}>
                                        {isChecked ? (
                                          <motion.span
                                            key="check"
                                            initial={{ scale: 0, rotate: -30 }}
                                            animate={{ scale: 1, rotate: 0  }}
                                            exit={{ scale: 0 }}
                                            transition={{ duration: 0.22, ease: EASE }}
                                            style={{ color: '#fff', fontSize: '13px', fontWeight: 900 }}
                                          >✓</motion.span>
                                        ) : (
                                          <motion.span
                                            key={`n-${si}`}
                                            initial={{ scale: 0.5, opacity: 0 }}
                                            animate={{ scale: 1,   opacity: 1 }}
                                            exit={{ scale: 0.5, opacity: 0 }}
                                            transition={{ duration: 0.15 }}
                                          >{si + 1}</motion.span>
                                        )}
                                      </AnimatePresence>
                                    </div>
                                    <motion.span
                                      animate={{ opacity: isChecked ? 0.3 : 0.82 }}
                                      transition={{ duration: 0.2 }}
                                      style={{ fontSize: '14px', fontWeight: 600, lineHeight: 1.55, textDecoration: isChecked ? 'line-through' : 'none' }}
                                    >
                                      {step}
                                    </motion.span>
                                  </motion.button>
                                );
                              })}
                            </motion.div>

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
