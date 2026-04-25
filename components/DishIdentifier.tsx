'use client';

import { useState, useRef } from 'react';

interface DishResult {
  name: string;
  localName: string;
  confidence: string;
  origin: string;
  originFlag: string;
  category: string;
  description: string;
  mainIngredients: string[];
  flavor: string[];
  difficulty: string;
  prepTime: string;
  cookTime: string;
  recipe: { steps: string[] };
  funFact: string;
  isFood: boolean;
  error?: string;
}

export default function DishIdentifier() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageData, setImageData] = useState<{ base64: string; mimeType: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DishResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRecipe, setShowRecipe] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    if (!file.type.startsWith('image/')) { setError('Please upload an image.'); return; }
    if (file.size > 8 * 1024 * 1024) { setError('Max 8MB.'); return; }
    setError(null); setResult(null); setShowRecipe(false);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setImagePreview(dataUrl);
      setImageData({ base64: dataUrl.split(',')[1], mimeType: file.type });
    };
    reader.readAsDataURL(file);
  }

  async function handleIdentify() {
    if (!imageData || loading) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch('/api/dish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData.base64, mimeType: imageData.mimeType }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Something went wrong.'); return; }
      setResult(data as DishResult);
    } catch { setError('Network error. Please try again.'); }
    finally { setLoading(false); }
  }

  return (
    <div>
      <div className="glass rounded-3xl p-6 sm:p-8 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
            🍽️
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Dish Identifier</h2>
            <p className="text-sm text-zinc-500">Photo of any dish → name, origin & recipe</p>
          </div>
        </div>

        <div onClick={() => fileRef.current?.click()} onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
          onDragOver={(e) => e.preventDefault()}
          className="relative rounded-2xl overflow-hidden cursor-pointer transition-all hover:opacity-90 mb-4"
          style={{ border: '2px dashed rgba(255,255,255,0.1)', minHeight: imagePreview ? 'auto' : '160px', background: 'rgba(255,255,255,0.02)' }}>
          {imagePreview ? (
            <img src={imagePreview} alt="Dish" className="w-full max-h-64 object-cover rounded-2xl" />
          ) : (
            <div className="flex flex-col items-center justify-center h-40 gap-3">
              <div className="text-4xl">🍽️</div>
              <div className="text-sm text-zinc-500 text-center">Drop any food photo<br /><span className="text-xs text-zinc-600">restaurant, homemade, anywhere</span></div>
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />

        <div className="flex gap-3">
          {imagePreview && (
            <button onClick={() => { setImagePreview(null); setImageData(null); setResult(null); }}
              className="px-4 py-2.5 rounded-xl text-sm text-zinc-400 hover:text-white transition-colors"
              style={{ border: '1px solid rgba(255,255,255,0.1)' }}>Clear</button>
          )}
          <button onClick={handleIdentify} disabled={!imageData || loading}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-all hover:scale-105 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
            {loading ? <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Identifying...</> : '🔍 Identify Dish'}
          </button>
        </div>
      </div>

      {error && <div className="glass rounded-2xl p-4 mb-6 border border-red-500/20 text-red-400 text-sm">{error}</div>}

      {result && result.isFood && (
        <div className="space-y-4 animate-slide-up">
          {/* Main info card */}
          <div className="glass rounded-3xl p-6 sm:p-8">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-3xl font-black text-white">{result.name}</h3>
                {result.localName !== result.name && (
                  <p className="text-sm text-zinc-500 mt-1 italic">{result.localName}</p>
                )}
              </div>
              <div className="text-4xl ml-4">{result.originFlag}</div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <span className="text-xs px-3 py-1.5 rounded-full font-medium"
                style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)' }}>
                {result.origin}
              </span>
              <span className="text-xs px-3 py-1.5 rounded-full"
                style={{ background: 'rgba(255,255,255,0.06)', color: '#a1a1aa', border: '1px solid rgba(255,255,255,0.08)' }}>
                {result.category}
              </span>
              {result.flavor.map((f, i) => (
                <span key={i} className="text-xs px-3 py-1.5 rounded-full"
                  style={{ background: 'rgba(139,92,246,0.1)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.15)' }}>
                  {f}
                </span>
              ))}
            </div>

            <p className="text-sm text-zinc-400 leading-relaxed mb-5">{result.description}</p>

            <div>
              <p className="text-xs font-semibold text-zinc-500 mb-2">MAIN INGREDIENTS</p>
              <div className="flex flex-wrap gap-2">
                {result.mainIngredients.map((ing, i) => (
                  <span key={i} className="text-xs px-3 py-1.5 rounded-full text-zinc-300"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    {ing}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Fun fact */}
          <div className="glass rounded-3xl p-5" style={{ borderLeft: '3px solid #8b5cf6' }}>
            <p className="text-xs font-semibold text-purple-400 mb-2">💡 FUN FACT</p>
            <p className="text-sm text-zinc-300 italic">{result.funFact}</p>
          </div>

          {/* Recipe accordion */}
          <div className="glass rounded-3xl overflow-hidden">
            <button className="w-full flex items-center justify-between p-6 text-left hover:bg-white/5 transition-colors"
              onClick={() => setShowRecipe(!showRecipe)}>
              <div>
                <div className="font-semibold text-white">How to make it</div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  ⏱ Prep {result.prepTime} · Cook {result.cookTime} · {result.difficulty}
                </div>
              </div>
              <span className="text-zinc-500 text-lg">{showRecipe ? '−' : '+'}</span>
            </button>
            {showRecipe && (
              <div className="px-6 pb-6 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="space-y-3 mt-4">
                  {result.recipe.steps.map((step, i) => (
                    <div key={i} className="flex gap-3 text-sm">
                      <span className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold mt-0.5"
                        style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: 'white' }}>{i + 1}</span>
                      <span className="text-zinc-300">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {result && !result.isFood && (
        <div className="glass rounded-2xl p-4 text-zinc-400 text-sm">{result.error ?? "That doesn't look like food!"}</div>
      )}
    </div>
  );
}
