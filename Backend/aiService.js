// aiService.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Models to try in order (first available wins)
const MODELS = [
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",
];

/**
 * Sleep for ms milliseconds.
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Extracts entities and relationships from raw text using Gemini.
 * Retries with exponential backoff on rate-limit (429) errors.
 */
async function extractOntology(text) {
    const prompt = buildPrompt(text);

    for (const modelName of MODELS) {
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                console.log(`🤖 Trying ${modelName} (attempt ${attempt})...`);
                const model = genAI.getGenerativeModel({
                    model: modelName,
                    generationConfig: {
                        responseMimeType: "application/json",
                        temperature: 0.2,
                        maxOutputTokens: 2048,
                    }
                });

                const result = await model.generateContent(prompt);
                const raw = result.response.text().trim();

                // Strip accidental markdown fences
                const clean = raw
                    .replace(/^```json\s*/i, '')
                    .replace(/^```\s*/i, '')
                    .replace(/```\s*$/i, '')
                    .trim();

                const parsed = JSON.parse(clean);
                if (!parsed.nodes?.length || !parsed.links) {
                    throw new Error("Response missing nodes or links");
                }

                console.log(`✅ Done — ${parsed.nodes.length} nodes, ${parsed.links.length} links`);
                return parsed;

            } catch (err) {
                const isRateLimit = err.status === 429 ||
                    err.message?.includes('429') ||
                    err.message?.includes('quota') ||
                    err.message?.includes('RESOURCE_EXHAUSTED');

                if (isRateLimit && attempt < 3) {
                    const wait = attempt * 20000; // 20s, 40s
                    console.warn(`⚠️  Rate limit on ${modelName}. Retrying in ${wait/1000}s...`);
                    await sleep(wait);
                    continue;
                }

                if (isRateLimit) {
                    console.warn(`⚠️  ${modelName} quota exceeded, trying next model...`);
                    break; // try next model
                }

                console.error(`❌ ${modelName} error:`, err.message);
                break; // non-rate-limit error, try next model
            }
        }
    }

    console.error("❌ All models exhausted or failed.");
    return null;
}

function buildPrompt(text) {
    return `You are an AI ontology extractor. Extract entities and relationships from the text below.
Entity types: Person, Organization, Location, Country, Technology, Concept.
Return ONLY valid JSON, no markdown, no explanation:
{
  "nodes": [{"id": "EntityName", "group": "Type", "importance": 7}],
  "links": [{"source": "A", "target": "B", "label": "RELATION", "strength": 7}]
}
- importance and strength: integers 1-10
- label: UPPER_SNAKE_CASE
- Extract at least 5 nodes and 4 links

Text: ${text.slice(0, 5000)}`;
}

module.exports = { extractOntology };