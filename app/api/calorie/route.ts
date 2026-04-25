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

    const prompt = `You are a professional nutritionist. Analyze this food image and provide detailed nutritional information.

Be as accurate as possible. If the image is unclear or not food, say so in the notes.

Respond with ONLY valid JSON, no markdown, no extra text:
{
  "dish": "Name of the dish/food",
  "confidence": "high",
  "servingSize": "estimated serving size description",
  "calories": 450,
  "macros": {
    "protein": 25,
    "carbs": 45,
    "fat": 15,
    "fiber": 3,
    "sugar": 8
  },
  "ingredients": ["main ingredient 1", "main ingredient 2", "main ingredient 3"],
  "healthScore": 7,
  "healthScoreNote": "brief note about nutritional quality (1-10 scale)",
  "notes": "any caveats about accuracy or additional context",
  "isFood": true
}

If the image is NOT food, return: { "isFood": false, "error": "This doesn't appear to be food." }`;

    const result = await model.generateContent([
      { inlineData: { data: image, mimeType } },
      prompt,
    ]);

    const text = result.response.text();

    let calorieData: unknown;
    try {
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      calorieData = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: 'AI response parsing failed. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json(calorieData);
  } catch (error) {
    console.error('Calorie API error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
