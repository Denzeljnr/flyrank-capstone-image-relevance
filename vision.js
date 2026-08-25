require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const { ImageMetadataSchema } = require('./schemas');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite' });

async function tagImage(imagePath) {
  const imageData = fs.readFileSync(imagePath);
  const base64Image = imageData.toString('base64');

  const prompt = `Analyze this image and respond with ONLY valid JSON, no markdown formatting, in exactly this shape:
{
  "subject": "short noun phrase for the main subject",
  "category": "one general category word (e.g. animal, landscape, object)",
  "attributes": ["3-5 descriptive words or short phrases"],
  "caption": "one sentence describing the image",
  "confidence": a number between 0 and 1 representing how confident you are in this classification
}`;

  const result = await model.generateContent([
    prompt,
    { inlineData: { data: base64Image, mimeType: 'image/jpeg' } }
  ]);

  const rawText = result.response.text();
  const cleanedText = rawText.replace(/```json\n?|\n?```/g, '').trim();

  let parsedJson;
  try {
    parsedJson = JSON.parse(cleanedText);
  } catch (e) {
    throw new Error(`Gemini returned invalid JSON: ${rawText.slice(0, 200)}`);
  }

  const validation = ImageMetadataSchema.safeParse(parsedJson);
  if (!validation.success) {
    throw new Error(`Schema validation failed: ${validation.error.message}`);
  }

  return validation.data;
}

module.exports = { tagImage };