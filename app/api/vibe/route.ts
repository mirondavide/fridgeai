import { NextRequest, NextResponse } from 'next/server';
import { getModel, sanitizeText } from '@/lib/gemini';
import { checkRateLimit, getClientIP } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 15 requests per minute per IP
    const ip = getClientIP(request);
    if (!checkRateLimit(ip, 15, 60_000)) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment.' },
        { status: 429 }
      );
    }

    // Parse and validate body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    if (!body || typeof body !== 'object' || !('mood' in body)) {
      return NextResponse.json({ error: 'Missing mood field.' }, { status: 400 });
    }

    const { mood } = body as { mood: string };

    if (typeof mood !== 'string' || mood.trim().length < 2) {
      return NextResponse.json({ error: 'Please describe your mood (at least 2 characters).' }, { status: 400 });
    }

    const sanitizedMood = sanitizeText(mood, 300);

    const model = getModel();

    const prompt = `You are a vibe curator. Based on the user's mood, provide the perfect recommendations.

User's mood: "${sanitizedMood}"

Respond with ONLY valid JSON, no markdown, no extra text:
{
  "vibeWord": "one evocative word that captures this vibe",
  "vibeDescription": "one sentence describing this vibe",
  "playlist": [
    {"title": "Song Title", "artist": "Artist Name"},
    {"title": "Song Title", "artist": "Artist Name"},
    {"title": "Song Title", "artist": "Artist Name"},
    {"title": "Song Title", "artist": "Artist Name"},
    {"title": "Song Title", "artist": "Artist Name"}
  ],
  "movie": {
    "title": "Movie Title",
    "year": "2023",
    "reason": "brief reason why this fits the vibe"
  },
  "food": {
    "name": "Food Name",
    "description": "brief description"
  },
  "activity": {
    "name": "Activity Name",
    "description": "brief description"
  },
  "pexelsQuery": "2-3 word search term for a background image matching this vibe (e.g. 'neon city rain', 'sunny beach waves', 'cozy coffee winter')"
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Parse Gemini's JSON response
    let vibeData: unknown;
    try {
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      vibeData = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: 'AI response parsing failed. Please try again.' },
        { status: 500 }
      );
    }

    // Fetch Pexels image
    let imageUrl: string | null = null;
    try {
      const pexelsQuery = (vibeData as { pexelsQuery?: string }).pexelsQuery ?? 'abstract mood';
      const pexelsRes = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(pexelsQuery)}&per_page=1&orientation=landscape`,
        {
          headers: { Authorization: process.env.PEXELS_API_KEY ?? '' },
        }
      );
      if (pexelsRes.ok) {
        const pexelsData = await pexelsRes.json() as { photos?: Array<{ src?: { large2x?: string } }> };
        imageUrl = pexelsData.photos?.[0]?.src?.large2x ?? null;
      }
    } catch {
      // Pexels is optional — don't fail the whole request
    }

    return NextResponse.json({ ...vibeData as object, imageUrl });
  } catch (error) {
    console.error('Vibe API error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
