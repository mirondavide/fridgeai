'use client';

import { useState, useRef } from 'react';

interface CalorieResult {
  dish: string;
  confidence: string;
  servingSize: string;
  calories: number;
  macros: {
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
  };
  ingredients: string[];
  healthScore: number;
  healthScoreNote: string;
  notes: string;
  isFood: boolean;
  error?: string;
}

function MacroBar({ label, value, color, unit = 'g' }: { label: string; value: number; color: string; unit?: string }) {
  const max = label === 'Calories' ? 800 : 80;
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-zinc-400">{label}</span>
        <span className="text-white font-medium">{value}{unit}</span>
      </div>
      <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div className="h-1.5 rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export default function CalorieScan() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageData, setImageData] = useState<{ base64: string; mimeType: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CalorieResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('Image too large. Max 8MB.');
      return;
    }
    setError(null);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setImagePreview(dataUrl);
      const base64 = dataUrl.split(',')[1];
      setImageData({ base64, mimeType: file.type });
    };
    reader.readAsDataURL(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  async function handleScan() {
    if (!imageData || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/calorie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData.base64, mimeType: imageData.mimeType }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Something went wrong.'); return; }
      setResult(data as CalorieResult);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const healthColor = (score: number) =>
    score >= 7 ? '#10b981' : score >= 4 ? '#f59e0b' : '#ef4444';

  return (
    <div>
      <div className="glass rounded-3xl p-6 sm:p-8 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ background: 'linear-gradient(135deg, #10b981, #06b6d4)' }}>
            🔬
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">CalorieScan</h2>
            <p className="text-sm text-zinc-500">Photo of food → full nutrition breakdown</p>
          </div>
        </div>

        {/* Upload Area */}
        <div
          onClick={() => fileRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="relative rounded-2xl overflow-hidden cursor-pointer transition-all hover:opacity-90 mb-4"
          style={{
            border: '2px dashed rgba(255,255,255,0.1)',
            minHeight: imagePreview ? 'auto' : '160px',
            background: 'rgba(255,255,255,0.02)',
          }}
        >
          {imagePreview ? (
            <img src={imagePreview} alt="Food preview" className="w-full max-h-64 object-cover rounded-2xl" />
          ) : (
            <div className="flex flex-col items-center justify-center h-40 gap-3">
              <div className="text-4xl">📸</div>
              <div className="text-sm text-zinc-500 text-center">
                Drop your food photo here<br />
                <span className="text-xs text-zinc-600">or click to browse</span>
              </div>
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />

        <div className="flex gap-3">
          {imagePreview && (
            <button onClick={() => { setImagePreview(null); setImageData(null); setResult(null); }}
              className="px-4 py-2.5 rounded-xl text-sm text-zinc-400 hover:text-white transition-colors"
              style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
              Clear
            </button>
          )}
          <button onClick={handleScan} disabled={!imageData || loading}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #10b981, #06b6d4)' }}>
            {loading ? (
              <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>Scanning...</>
            ) : '🔬 Scan Calories'}
          </button>
        </div>
      </div>

      {error && <div className="glass rounded-2xl p-4 mb-6 border border-red-500/20 text-red-400 text-sm">{error}</div>}

      {result && result.isFood && (
        <div className="space-y-4 animate-slide-up">
          <div className="glass rounded-3xl p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-white">{result.dish}</h3>
                <p className="text-sm text-zinc-500 mt-1">{result.servingSize}</p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-black gradient-text-calorie">{result.calories}</div>
                <div className="text-xs text-zinc-500">calories</div>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <MacroBar label="Protein" value={result.macros.protein} color="linear-gradient(90deg, #10b981, #06b6d4)" />
              <MacroBar label="Carbs" value={result.macros.carbs} color="linear-gradient(90deg, #8b5cf6, #ec4899)" />
              <MacroBar label="Fat" value={result.macros.fat} color="linear-gradient(90deg, #f59e0b, #ef4444)" />
              <MacroBar label="Fiber" value={result.macros.fiber} color="linear-gradient(90deg, #06b6d4, #3b82f6)" />
              <MacroBar label="Sugar" value={result.macros.sugar} color="linear-gradient(90deg, #ec4899, #f59e0b)" />
            </div>

            <div className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <div className="text-2xl font-black" style={{ color: healthColor(result.healthScore) }}>
                {result.healthScore}/10
              </div>
              <div>
                <div className="text-xs font-semibold text-zinc-300">Health Score</div>
                <div className="text-xs text-zinc-500">{result.healthScoreNote}</div>
              </div>
            </div>
          </div>

          <div className="glass rounded-3xl p-6">
            <h3 className="text-sm font-semibold text-zinc-400 mb-3">🥗 Main Ingredients</h3>
            <div className="flex flex-wrap gap-2">
              {result.ingredients.map((ing, i) => (
                <span key={i} className="text-xs px-3 py-1.5 rounded-full text-zinc-300"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {ing}
                </span>
              ))}
            </div>
            {result.notes && (
              <p className="text-xs text-zinc-600 mt-4 italic">{result.notes}</p>
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
