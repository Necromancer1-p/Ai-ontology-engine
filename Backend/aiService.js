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
        // Using the exact model name from your discovery list
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
        You are an expert AI ontology extractor. 
        Analyze the following text and extract entities and their relationships.
        Entities: Location, Organization, Person, Concept.
        Return ONLY a valid JSON object in this format (no markdown, no backticks):
        {
          "nodes": [{"id": "Name", "group": "Category"}],
          "links": [{"source": "A", "target": "B", "label": "RELATION"}]
        }
        Text: ${text}`;

        console.log("AI is processing with gemini-2.5-flash... please wait.");
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let jsonString = response.text().trim();

        // Extra cleaning for safety
        jsonString = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();

        const parsedData = JSON.parse(jsonString);
        console.log("✅ AI Extraction Successful! Nodes found:", parsedData.nodes.length);
        return parsedData;

    } catch (error) {
        console.error("❌ AI Error:", error.message);
        return null;
    }
}

module.exports = { extractOntology };