// aiService.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

// Initializing the Gemini API client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Extracts entities and relationships from raw text using Gemini 2.5 Flash.
 */
async function extractOntology(text) {
    try {
        // Enforcing strict JSON output to prevent JSON.parse errors
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
            }
        });

        const prompt = `
        You are an expert AI ontology extractor. 
        Analyze the following text and extract entities and their relationships.
        Entities: Location, Organization, Person, Concept.
        Return ONLY a valid JSON object in this format:
        {
          "nodes": [{"id": "Name", "group": "Category"}],
          "links": [{"source": "A", "target": "B", "label": "RELATION"}]
        }
        Text: ${text}`;

        console.log("AI is processing with gemini-2.5-flash... please wait.");
        const result = await model.generateContent(prompt);
        
        // Removed the unnecessary 'await'
        const response = result.response; 
        const jsonString = response.text().trim();

        const parsedData = JSON.parse(jsonString);
        console.log("✅ AI Extraction Successful! Nodes found:", parsedData.nodes.length);
        return parsedData;

    } catch (error) {
        console.error("❌ AI Error:", error.message);
        return null;
    }
}

module.exports = { extractOntology };