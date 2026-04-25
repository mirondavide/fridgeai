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

    const prompt = `You are a creative chef. Look at this fridge/pantry image and identify the visible ingredients, then suggest 3 recipes that can be made with what's available.

Respond with ONLY valid JSON, no markdown, no extra text:
{
  "detectedIngredients": ["ingredient1", "ingredient2", "ingredient3"],
  "recipes": [
    {
      "name": "Recipe Name",
      "emoji": "🍳",
      "time": "20 min",
      "difficulty": "easy",
      "description": "One line description",
      "steps": [
        "Step 1 description",
        "Step 2 description",
        "Step 3 description",
        "Step 4 description"
      ],
      "missingIngredients": ["optional ingredient you might not have"]
    },
    {
      "name": "Recipe Name 2",
      "emoji": "🥗",
      "time": "15 min",
      "difficulty": "easy",
      "description": "One line description",
      "steps": ["Step 1", "Step 2", "Step 3"],
      "missingIngredients": []
    },
    {
      "name": "Recipe Name 3",
      "emoji": "🍲",
      "time": "30 min",
      "difficulty": "medium",
      "description": "One line description",
      "steps": ["Step 1", "Step 2", "Step 3", "Step 4", "Step 5"],
      "missingIngredients": ["one optional thing"]
    }
  ]
}`;

    const result = await model.generateContent([
      { inlineData: { data: image, mimeType } },
      prompt,
    ]);

    const text = result.response.text();

    let fridgeData: unknown;
    try {
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      fridgeData = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: 'AI response parsing failed. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json(fridgeData);
  } catch (error) {
    console.error('Fridge API error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
