import { GoogleGenerativeAI } from '@google/generative-ai';

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY environment variable is not set');
}

export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export function getModel(modelName = 'gemini-2.5-flash') {
  return genAI.getGenerativeModel({ model: modelName });
}

/**
 * Validates and sanitizes base64 image data received from client
 */
export function validateImageData(base64Data: string, mimeType: string): void {
  // Validate MIME type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
  if (!allowedTypes.includes(mimeType)) {
    throw new Error('Invalid image type. Allowed: JPEG, PNG, WebP, HEIC');
  }

  // Validate base64 data (rough size check — base64 is ~4/3 of binary)
  const estimatedBytes = (base64Data.length * 3) / 4;
  const maxBytes = 8 * 1024 * 1024; // 8MB limit
  if (estimatedBytes > maxBytes) {
    throw new Error('Image too large. Maximum size is 8MB.');
  }

  // Basic base64 pattern validation
  if (!/^[A-Za-z0-9+/]+=*$/.test(base64Data)) {
    throw new Error('Invalid image data format.');
  }
}

/**
 * Sanitizes text input to prevent prompt injection
 */
export function sanitizeText(input: string, maxLength = 500): string {
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, '') // strip angle brackets
    .replace(/\n{3,}/g, '\n\n'); // collapse excessive newlines
}
