import { NextRequest, NextResponse } from 'next/server';
import { getModel, validateImageData } from '@/lib/gemini';
import { checkRateLimit, getClientIP } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    if (!checkRateLimit(ip, 10, 60_000)) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment.' },
        { status: 429 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    if (!body || typeof body !== 'object' || !('image' in body) || !('mimeType' in body)) {
      return NextResponse.json({ error: 'Missing image or mimeType field.' }, { status: 400 });
    }

    const { image, mimeType } = body as { image: string; mimeType: string };

    try {
      validateImageData(image, mimeType);
    } catch (validationError) {
      return NextResponse.json(
        { error: validationError instanceof Error ? validationError.message : 'Invalid image.' },
        { status: 400 }
      );
    }

    const model = getModel();

    const prompt = `You are a world cuisine expert. Identify this dish from the photo and provide detailed information about it.

Respond with ONLY valid JSON, no markdown, no extra text:
{
  "name": "Full Dish Name",
  "localName": "Local name if different (or same as name)",
  "confidence": "high",
  "origin": "Country or Region of Origin",
  "originFlag": "🇮🇹",
  "category": "e.g. Pasta, Street Food, Dessert, Soup",
  "description": "2-3 sentence description of this dish, its history and significance",
  "mainIngredients": ["ingredient1", "ingredient2", "ingredient3", "ingredient4"],
  "flavor": ["savory", "rich"],
  "difficulty": "medium",
  "prepTime": "20 min",
  "cookTime": "30 min",
  "recipe": {
    "steps": [
      "Step 1: description",
      "Step 2: description",
      "Step 3: description",
      "Step 4: description",
      "Step 5: description"
    ]
  },
  "funFact": "An interesting cultural or historical fact about this dish",
  "isFood": true
}

If the image is NOT food: { "isFood": false, "error": "This doesn't appear to be a food dish." }`;

    const result = await model.generateContent([
      { inlineData: { data: image, mimeType } },
      prompt,
    ]);

    const text = result.response.text();

    let dishData: unknown;
    try {
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      dishData = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: 'AI response parsing failed. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json(dishData);
  } catch (error) {
    console.error('Dish API error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
