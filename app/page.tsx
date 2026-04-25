'use client';

import { useState, useRef } from 'react';

/* ── Types ──────────────────────────────────────────────── */
interface Recipe {
  name: string;
  emoji: string;
  time: string;
  difficulty: string;
  description: string;
  steps: string[];
  missingIngredients: string[];
}

interface FridgeResult {
  detectedIngredients: string[];
  recipes: Recipe[];
}

type Phase = 'idle' | 'preview' | 'loading' | 'results';

/* ── Design tokens ──────────────────────────────────────── */
const C = {
  bg:             '#050E0C',
  primary:        '#00D4AA',
  primaryDark:    '#00A880',
  text:           '#ffffff',
  muted:          'rgba(255,255,255,0.45)',
  veryMuted:      'rgba(255,255,255,0.25)',
  surface:        'rgba(255,255,255,0.03)',
  border:         'rgba(255,255,255,0.07)',
  borderHighlight:'rgba(0,212,170,0.3)',
} as const;

/* ── Ingredient chip colors — premium dark palette ──────── */
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

/* ── Background orbs ────────────────────────────────────── */
function BackgroundOrbs() {
  return (
    <>
      <div
        className="animate-float-orb-a"
        style={{
          position: 'fixed',
          top: '-100px',
          left: '-150px',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,212,170,0.10) 0%, transparent 65%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div
        className="animate-float-orb-b"
        style={{
          position: 'fixed',
          bottom: '-120px',
          right: '-100px',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,180,140,0.07) 0%, transparent 65%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
    </>
  );
}

/* ── Nav ────────────────────────────────────────────────── */
function Nav({ phase, onReset }: { phase: Phase; onReset: () => void }) {
  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      height: '64px',
      padding: '0 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: 'rgba(5,14,12,0.85)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
        <span style={{ fontSize: '22px', lineHeight: 1 }}>🧊</span>
        <span style={{ fontSize: '20px', fontWeight: 800, color: C.text, letterSpacing: '-0.3px' }}>
          FridgeAI
        </span>
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Live indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <span
            className="animate-glow-pulse"
            style={{
              display: 'inline-block',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: C.primary,
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: '12px', fontWeight: 600, color: C.muted }}>
            Live
          </span>
        </div>

        {/* New scan button */}
        {phase !== 'idle' && (
          <button
            onClick={onReset}
            className="btn-ghost"
            style={{
              fontSize: '13px',
              fontWeight: 700,
              padding: '8px 16px',
              fontFamily: 'inherit',
            }}
          >
            ← New scan
          </button>
        )}
      </div>
    </nav>
  );
}

/* ── Main page ──────────────────────────────────────────── */
export default function FridgeAIPage() {
  const [phase, setPhase]           = useState<Phase>('idle');
  const [imgPreview, setImgPreview] = useState<string | null>(null);
  const [imgData, setImgData]       = useState<{ base64: string; mimeType: string } | null>(null);
  const [result, setResult]         = useState<FridgeResult | null>(null);
  const [error, setError]           = useState<string | null>(null);
  const [openIdx, setOpenIdx]       = useState<number | null>(null);
  const [checked, setChecked]       = useState<Record<string, boolean>>({});
  const fileRef                     = useRef<HTMLInputElement>(null);

  /* ── Handlers ───────────────────────────────────────── */
  function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('Max file size is 8MB.');
      return;
    }
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
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong.');
        setPhase('preview');
        return;
      }
      setResult(data as FridgeResult);
      setPhase('results');
    } catch {
      setError('Network error — please try again.');
      setPhase('preview');
    }
  }

  function reset() {
    setPhase('idle');
    setImgPreview(null);
    setImgData(null);
    setResult(null);
    setError(null);
    setOpenIdx(null);
    setChecked({});
  }

  function toggleStep(ri: number, si: number) {
    const k = `${ri}-${si}`;
    setChecked(p => ({ ...p, [k]: !p[k] }));
  }

  function allDone(ri: number, steps: string[]) {
    return steps.length > 0 && steps.every((_, si) => checked[`${ri}-${si}`]);
  }

  /* ── Render ──────────────────────────────────────────── */
  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.bg, fontFamily: 'inherit', position: 'relative' }}>
      <BackgroundOrbs />
      <Nav phase={phase} onReset={reset} />

      {/* Scrollable content container */}
      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* ── IDLE ─────────────────────────────────────── */}
        {phase === 'idle' && (
          <div
            className="animate-fade-up"
            style={{
              paddingTop: '120px',
              textAlign: 'center',
              maxWidth: '560px',
              margin: '0 auto',
              padding: '120px 20px 80px',
            }}
          >
            {/* H1 */}
            <h1 style={{
              fontSize: 'clamp(2.4rem, 6vw, 3.5rem)',
              fontWeight: 900,
              lineHeight: 1.1,
              marginBottom: '20px',
              color: C.text,
              letterSpacing: '-1.5px',
            }}>
              Your fridge.<br />
              <span className="teal-gradient-text">Three recipes.</span>
            </h1>

            {/* Subtitle */}
            <p style={{
              fontSize: '17px',
              fontWeight: 500,
              color: C.muted,
              lineHeight: 1.65,
              maxWidth: '380px',
              margin: '0 auto 48px',
            }}>
              No sign-up. No nonsense. Just cook.
            </p>

            {/* Upload zone */}
            <div
              className="upload-zone-border"
              style={{
                borderRadius: '20px',
                padding: '52px 24px',
                marginBottom: '16px',
                textAlign: 'center',
              }}
              onClick={() => fileRef.current?.click()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
              }}
              onDragOver={(e) => e.preventDefault()}
            >
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                border: '1.5px solid rgba(255,255,255,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <span style={{ fontSize: '24px', color: 'rgba(255,255,255,0.25)', lineHeight: 1, fontWeight: 300 }}>+</span>
              </div>
              <p style={{ fontSize: '13px', color: C.muted, fontWeight: 500 }}>
                drop a photo or click to browse
              </p>
            </div>

            {/* CTA */}
            <button
              className="btn-primary"
              style={{
                width: '100%',
                padding: '17px',
                fontSize: '17px',
                letterSpacing: '0.2px',
              }}
              onClick={() => fileRef.current?.click()}
            >
              Let&apos;s cook →
            </button>

          </div>
        )}

        {/* ── PREVIEW ──────────────────────────────────── */}
        {phase === 'preview' && imgPreview && (
          <div
            className="animate-fade-up"
            style={{
              paddingTop: '88px',
              maxWidth: '560px',
              margin: '0 auto',
              padding: '88px 20px 80px',
            }}
          >
            <p style={{ fontSize: '22px', fontWeight: 800, color: C.text, marginBottom: '16px' }}>
              Looks delicious. 👀
            </p>

            <img
              src={imgPreview}
              alt="Your fridge"
              style={{
                width: '100%',
                borderRadius: '20px',
                border: '1px solid rgba(255,255,255,0.08)',
                display: 'block',
                marginBottom: '16px',
                maxHeight: '320px',
                objectFit: 'cover',
              }}
            />

            {error && (
              <p style={{ color: '#f87171', fontWeight: 600, fontSize: '14px', marginBottom: '14px' }}>
                {error}
              </p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                className="btn-primary"
                style={{
                  width: '100%',
                  padding: '17px',
                  fontSize: '17px',
                  letterSpacing: '0.2px',
                }}
                onClick={scan}
              >
                Find my recipes →
              </button>
              <button
                className="btn-ghost"
                style={{
                  width: '100%',
                  padding: '16px',
                  fontSize: '15px',
                  fontFamily: 'inherit',
                }}
                onClick={reset}
              >
                Use a different photo
              </button>
            </div>
          </div>
        )}

        {/* ── LOADING ──────────────────────────────────── */}
        {phase === 'loading' && (
          <div style={{ textAlign: 'center', paddingTop: '100px', padding: '100px 20px 80px' }}>
            {/* Spinner */}
            <div style={{
              width: '72px',
              height: '72px',
              position: 'relative',
              margin: '0 auto 28px',
            }}>
              <div style={{
                border: '3px solid rgba(0,212,170,0.15)',
                borderTop: `3px solid ${C.primary}`,
                borderRadius: '50%',
                width: '100%',
                height: '100%',
                animation: 'spin-ring 1s linear infinite',
              }} />
            </div>

            <h2 style={{ fontSize: '22px', fontWeight: 800, color: C.text, marginBottom: '8px' }}>
              Scanning your fridge...
            </h2>
            <p style={{ fontSize: '15px', color: C.muted }}>
              Takes about 5 seconds.
            </p>
          </div>
        )}

        {/* ── RESULTS ──────────────────────────────────── */}
        {phase === 'results' && result && (
          <div
            className="animate-fade-up"
            style={{
              maxWidth: '560px',
              margin: '0 auto',
              padding: '88px 20px 80px',
            }}
          >
            {/* Fridge thumbnail */}
            {imgPreview && (
              <img
                src={imgPreview}
                alt="Your fridge"
                style={{
                  width: '100%',
                  height: '140px',
                  objectFit: 'cover',
                  borderRadius: '18px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  display: 'block',
                  marginBottom: '32px',
                }}
              />
            )}

            {/* Ingredients section */}
            <div style={{ marginBottom: '12px' }}>
              <div
                className="section-label"
                style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                INGREDIENTS
                <span style={{ color: C.primary, fontWeight: 800 }}>
                  {result.detectedIngredients.length}
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {result.detectedIngredients.map((ing, i) => {
                  const chip = CHIP_COLORS[i % 6];
                  return (
                    <span
                      key={i}
                      style={{
                        display: 'inline-block',
                        padding: '7px 14px',
                        borderRadius: '99px',
                        fontSize: '13px',
                        fontWeight: 700,
                        backgroundColor: chip.bg,
                        color: chip.text,
                        border: `1px solid ${chip.border}`,
                        animation: `chip-in 0.4s ${i * 0.05}s cubic-bezier(0.16,1,0.3,1) both`,
                      }}
                    >
                      {ing}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Divider */}
            <div style={{
              height: '1px',
              backgroundColor: 'rgba(255,255,255,0.07)',
              margin: '32px 0',
            }} />

            {/* Recipes section */}
            <div className="section-label" style={{ marginBottom: '16px' }}>
              TONIGHT&apos;S MENU
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {result.recipes.map((recipe, ri) => {
                const isOpen = openIdx === ri;
                const done   = allDone(ri, recipe.steps);
                const diff   = DIFF_COLORS[recipe.difficulty] ?? DIFF_COLORS.easy;

                return (
                  <div
                    key={ri}
                    className={`recipe-card${isOpen ? ' open' : ''}`}
                  >
                    {/* Top gradient bar */}
                    <div style={{
                      height: '3px',
                      background: RECIPE_GRADIENTS[ri % 3],
                    }} />

                    {/* Card header button */}
                    <button
                      onClick={() => setOpenIdx(isOpen ? null : ri)}
                      style={{
                        width: '100%',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        textAlign: 'left',
                        fontFamily: 'inherit',
                      }}
                    >
                      {/* Emoji */}
                      <span style={{ fontSize: '36px', lineHeight: 1, flexShrink: 0 }}>
                        {recipe.emoji}
                      </span>

                      {/* Name + badges */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '16px',
                          fontWeight: 800,
                          color: C.text,
                          marginBottom: '8px',
                          letterSpacing: '-0.2px',
                        }}>
                          {recipe.name}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {/* Time badge */}
                          <span style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            color: C.muted,
                            backgroundColor: 'rgba(255,255,255,0.05)',
                            borderRadius: '99px',
                            padding: '4px 10px',
                          }}>
                            ⏱ {recipe.time}
                          </span>
                          {/* Difficulty badge */}
                          <span style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            backgroundColor: diff.bg,
                            color: diff.text,
                            borderRadius: '99px',
                            padding: '4px 10px',
                          }}>
                            {recipe.difficulty}
                          </span>
                        </div>
                      </div>

                      {/* Chevron */}
                      <span style={{
                        fontSize: '18px',
                        color: C.muted,
                        flexShrink: 0,
                        transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s cubic-bezier(0.16,1,0.3,1)',
                        display: 'inline-block',
                      }}>
                        ›
                      </span>
                    </button>

                    {/* Expanded content */}
                    {isOpen && (
                      <div style={{
                        padding: '0 20px 20px',
                        borderTop: '1px solid rgba(255,255,255,0.06)',
                        paddingTop: '16px',
                      }}>
                        {/* Description */}
                        <p style={{
                          fontSize: '14px',
                          color: 'rgba(255,255,255,0.45)',
                          fontWeight: 500,
                          lineHeight: 1.6,
                          marginBottom: '20px',
                        }}>
                          {recipe.description}
                        </p>

                        {/* Steps */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {recipe.steps.map((step, si) => {
                            const key        = `${ri}-${si}`;
                            const isChecked  = !!checked[key];
                            return (
                              <button
                                key={si}
                                className={`step-btn${isChecked ? ' checked' : ''}`}
                                onClick={() => toggleStep(ri, si)}
                              >
                                {/* Circle */}
                                <div className={`step-circle${isChecked ? ' checked' : ''}`}>
                                  {isChecked
                                    ? <span style={{ color: '#ffffff', fontSize: '13px', fontWeight: 900 }}>✓</span>
                                    : <span>{si + 1}</span>
                                  }
                                </div>
                                {/* Step text */}
                                <span style={{
                                  fontSize: '14px',
                                  fontWeight: 600,
                                  color: `rgba(255,255,255,${isChecked ? 0.35 : 0.8})`,
                                  textDecoration: isChecked ? 'line-through' : 'none',
                                  transition: 'color 0.2s',
                                  lineHeight: 1.5,
                                }}>
                                  {step}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Missing ingredients warning */}
                        {recipe.missingIngredients.length > 0 && (
                          <div
                            className="glass"
                            style={{
                              border: '1px solid rgba(251,191,36,0.2)',
                              borderRadius: '14px',
                              padding: '12px 16px',
                              marginTop: '16px',
                            }}
                          >
                            <p style={{ fontSize: '13px', fontWeight: 600, color: '#fbbf24', lineHeight: 1.5 }}>
                              ⚠ Might also need:{' '}
                              <span style={{ color: 'rgba(251,191,36,0.7)' }}>
                                {recipe.missingIngredients.join(', ')}
                              </span>
                            </p>
                          </div>
                        )}

                        {/* Completion card */}
                        {done && (
                          <div style={{
                            marginTop: '16px',
                            backgroundColor: 'rgba(0,212,170,0.08)',
                            border: '1px solid rgba(0,212,170,0.2)',
                            borderRadius: '16px',
                            padding: '20px',
                            textAlign: 'center',
                          }}>
                            <div style={{ fontSize: '32px', marginBottom: '8px', lineHeight: 1 }}>🎉</div>
                            <p style={{ fontSize: '18px', fontWeight: 800, color: C.primary, marginBottom: '4px' }}>
                              Recipe complete!
                            </p>
                            <p style={{ fontSize: '14px', color: C.muted }}>
                              Nice work, chef 👨‍🍳
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Scan again */}
            <button
              className="btn-primary"
              style={{
                width: '100%',
                padding: '17px',
                fontSize: '17px',
                letterSpacing: '0.2px',
                marginTop: '40px',
              }}
              onClick={reset}
            >
              Start over
            </button>
          </div>
        )}
      </div>

      {/* Hidden file input — mobile-friendly */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files?.[0]) handleFile(e.target.files[0]);
          // Reset value so same file can be re-selected
          e.target.value = '';
        }}
      />
    </div>
  );
}
