// Backend/aiService.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Models to try in order (first available wins)
const MODELS = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-3-flash",
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
                console.log(`\n🤖 [STEP 1] Trying ${modelName} (attempt ${attempt})...`);
                const model = genAI.getGenerativeModel({
                    model: modelName,
                    generationConfig: {
                        responseMimeType: "application/json",
                        temperature: 0.2,
                        maxOutputTokens: 2048,
                    }
                });

                console.log(`⏳ [STEP 2] Sending request to Google API...`);
                const result = await model.generateContent(prompt);
                
                // NEW: Extract finishReason to diagnose cut-offs
                const candidate = result.response.candidates?.[0];
                const finishReason = candidate?.finishReason || "UNKNOWN";
                console.log(`ℹ️  [STEP 2.5] Generation finished with reason: ${finishReason}`);

                const raw = result.response.text().trim();
                console.log(`✅ [STEP 3] Received response. Length: ${raw.length} characters.`);

                if (finishReason !== 'STOP') {
                     console.warn(`⚠️ Warning: Model did not finish normally. Output might be truncated.`);
                }

                // Strip accidental markdown fences
                const clean = raw
                    .replace(/^```json\s*/i, '')
                    .replace(/^```\s*/i, '')
                    .replace(/```\s*$/i, '')
                    .trim();

                // LOG THE EXACT RAW OUTPUT BEFORE PARSING
                console.log(`🔍 [STEP 4] Cleaned string prepared for JSON parsing: \n--- START RAW JSON ---\n${clean}\n--- END RAW JSON ---`);

                let parsed;
                try {
                    parsed = JSON.parse(clean);
                    console.log(`✅ [STEP 5] Successfully parsed JSON.`);
                } catch (parseError) {
                    console.error(`❌ [ERROR] JSON Parsing failed!`);
                    console.error(`❌ [ERROR Details]:`, parseError.message);
                    console.error(`💡 [HINT]: The API stopped generating due to: ${finishReason}`);
                    
                    // Throw custom error to trigger the retry logic
                    throw new Error(`Incomplete JSON generated (Finish Reason: ${finishReason})`);
                }

                if (!parsed.nodes?.length || !parsed.links) {
                    throw new Error("Response missing nodes or links");
                }

                console.log(`✅ [STEP 6] Validation complete — ${parsed.nodes.length} nodes, ${parsed.links.length} links`);
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

                // If the error was caused by a safety or recitation block, break and switch models entirely
                if (err.message.includes('SAFETY') || err.message.includes('RECITATION') || err.message.includes('PROHIBITED')) {
                     console.error(`❌ Content blocked by Google safety/recitation filters. Switching to next model...`);
                     break; 
                }

                console.error(`❌ ${modelName} error:`, err.message);
                
                // For non-rate-limit errors (like the JSON parsing failure), it will loop and retry the current model.
                // If it fails 3 times, it naturally moves to the next model.
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
- CRITICAL: Ensure the JSON is perfectly valid. Do not include trailing commas. Escape all quotes properly.

Text: ${text.slice(0, 5000)}`;
}

module.exports = { extractOntology };