'use client';

import { useState } from 'react';

interface VibeResult {
  vibeWord: string;
  vibeDescription: string;
  playlist: Array<{ title: string; artist: string }>;
  movie: { title: string; year: string; reason: string };
  food: { name: string; description: string };
  activity: { name: string; description: string };
  imageUrl: string | null;
}

export default function VibeCheck() {
  const [mood, setMood] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VibeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!mood.trim() || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/vibe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong.');
        return;
      }

      setResult(data as VibeResult);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Input Card */}
      <div className="glass rounded-3xl p-6 sm:p-8 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)' }}>
            ✨
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Vibe Check</h2>
            <p className="text-sm text-zinc-500">How are you feeling right now?</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            value={mood}
            onChange={(e) => setMood(e.target.value)}
            placeholder="I'm feeling kinda nostalgic, like a rainy Sunday with old music and coffee..."
            maxLength={300}
            rows={3}
            className="w-full rounded-2xl px-4 py-3 text-sm text-white placeholder-zinc-600 resize-none focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition-all"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-600">{mood.length}/300</span>
            <button
              type="submit"
              disabled={loading || !mood.trim()}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)' }}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Reading your vibe...
                </>
              ) : (
                <>✨ Check My Vibe</>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Error */}
      {error && (
        <div className="glass rounded-2xl p-4 mb-6 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4 animate-slide-up">
          {/* Vibe Card with background image */}
          <div
            className="relative rounded-3xl overflow-hidden"
            style={{ minHeight: '200px' }}
          >
            {result.imageUrl && (
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${result.imageUrl})` }}
              />
            )}
            <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }} />
            <div className="relative p-8 text-center">
              <div className="text-6xl font-black mb-2 gradient-text-vibe">{result.vibeWord}</div>
              <p className="text-zinc-300 text-sm max-w-sm mx-auto">{result.vibeDescription}</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Playlist */}
            <div className="glass rounded-3xl p-6">
              <h3 className="text-sm font-semibold text-zinc-400 mb-4 flex items-center gap-2">
                🎵 Your Playlist
              </h3>
              <div className="space-y-3">
                {result.playlist.map((song, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)' }}>
                      {i + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-white truncate">{song.title}</div>
                      <div className="text-xs text-zinc-500 truncate">{song.artist}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {/* Movie */}
              <div className="glass rounded-3xl p-5">
                <h3 className="text-sm font-semibold text-zinc-400 mb-3 flex items-center gap-2">
                  🎬 Watch This
                </h3>
                <div className="text-white font-semibold">{result.movie.title}
                  <span className="text-zinc-500 font-normal text-sm ml-1">({result.movie.year})</span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">{result.movie.reason}</p>
              </div>

              {/* Food */}
              <div className="glass rounded-3xl p-5">
                <h3 className="text-sm font-semibold text-zinc-400 mb-3 flex items-center gap-2">
                  🍽️ Eat This
                </h3>
                <div className="text-white font-semibold">{result.food.name}</div>
                <p className="text-xs text-zinc-500 mt-1">{result.food.description}</p>
              </div>

              {/* Activity */}
              <div className="glass rounded-3xl p-5">
                <h3 className="text-sm font-semibold text-zinc-400 mb-3 flex items-center gap-2">
                  🎯 Do This
                </h3>
                <div className="text-white font-semibold">{result.activity.name}</div>
                <p className="text-xs text-zinc-500 mt-1">{result.activity.description}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
