'use client';

import { useState, useRef } from 'react';

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

export default function FridgeAI() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageData, setImageData] = useState<{ base64: string; mimeType: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FridgeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openRecipe, setOpenRecipe] = useState<number | null>(0);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    if (!file.type.startsWith('image/')) { setError('Please upload an image.'); return; }
    if (file.size > 8 * 1024 * 1024) { setError('Image too large. Max 8MB.'); return; }
    setError(null); setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setImagePreview(dataUrl);
      setImageData({ base64: dataUrl.split(',')[1], mimeType: file.type });
    };
    reader.readAsDataURL(file);
  }

  async function handleScan() {
    if (!imageData || loading) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch('/api/fridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData.base64, mimeType: imageData.mimeType }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Something went wrong.'); return; }
      setResult(data as FridgeResult);
      setOpenRecipe(0);
    } catch { setError('Network error. Please try again.'); }
    finally { setLoading(false); }
  }

  const difficultyColor = (d: string) =>
    d === 'easy' ? '#10b981' : d === 'medium' ? '#f59e0b' : '#ef4444';

  return (
    <div>
      <div className="glass rounded-3xl p-6 sm:p-8 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}>
            🧊
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Fridge AI</h2>
            <p className="text-sm text-zinc-500">Photo of your fridge → recipes you can make now</p>
          </div>
        </div>

        <div onClick={() => fileRef.current?.click()} onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
          onDragOver={(e) => e.preventDefault()}
          className="relative rounded-2xl overflow-hidden cursor-pointer transition-all hover:opacity-90 mb-4"
          style={{ border: '2px dashed rgba(255,255,255,0.1)', minHeight: imagePreview ? 'auto' : '160px', background: 'rgba(255,255,255,0.02)' }}>
          {imagePreview ? (
            <img src={imagePreview} alt="Fridge" className="w-full max-h-64 object-cover rounded-2xl" />
          ) : (
            <div className="flex flex-col items-center justify-center h-40 gap-3">
              <div className="text-4xl">🧊</div>
              <div className="text-sm text-zinc-500 text-center">Photo of your fridge or pantry<br /><span className="text-xs text-zinc-600">click or drag & drop</span></div>
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
          <button onClick={handleScan} disabled={!imageData || loading}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-all hover:scale-105 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}>
            {loading ? <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Finding recipes...</> : '🍳 Find Recipes'}
          </button>
        </div>
      </div>

      {error && <div className="glass rounded-2xl p-4 mb-6 border border-red-500/20 text-red-400 text-sm">{error}</div>}

      {result && (
        <div className="space-y-4 animate-slide-up">
          {/* Detected ingredients */}
          <div className="glass rounded-3xl p-6">
            <h3 className="text-sm font-semibold text-zinc-400 mb-3">🔍 Detected in your fridge</h3>
            <div className="flex flex-wrap gap-2">
              {result.detectedIngredients.map((ing, i) => (
                <span key={i} className="text-xs px-3 py-1.5 rounded-full text-zinc-300"
                  style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                  {ing}
                </span>
              ))}
            </div>
          </div>

          {/* Recipe accordion */}
          {result.recipes.map((recipe, i) => (
            <div key={i} className="glass rounded-3xl overflow-hidden">
              <button className="w-full flex items-center justify-between p-6 text-left hover:bg-white/5 transition-colors"
                onClick={() => setOpenRecipe(openRecipe === i ? null : i)}>
                <div className="flex items-center gap-4">
                  <span className="text-3xl">{recipe.emoji}</span>
                  <div>
                    <div className="font-semibold text-white">{recipe.name}</div>
                    <div className="text-xs text-zinc-500 mt-0.5 flex items-center gap-2">
                      <span>⏱ {recipe.time}</span>
                      <span style={{ color: difficultyColor(recipe.difficulty) }}>● {recipe.difficulty}</span>
                    </div>
                  </div>
                </div>
                <span className="text-zinc-500 text-lg">{openRecipe === i ? '−' : '+'}</span>
              </button>
              {openRecipe === i && (
                <div className="px-6 pb-6 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <p className="text-sm text-zinc-400 mt-4 mb-4">{recipe.description}</p>
                  <div className="space-y-2">
                    {recipe.steps.map((step, j) => (
                      <div key={j} className="flex gap-3 text-sm">
                        <span className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold mt-0.5"
                          style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)', color: 'white' }}>{j + 1}</span>
                        <span className="text-zinc-300">{step}</span>
                      </div>
                    ))}
                  </div>
                  {recipe.missingIngredients.length > 0 && (
                    <div className="mt-4 p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                      <p className="text-xs text-red-400">⚠️ You might also need: {recipe.missingIngredients.join(', ')}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
