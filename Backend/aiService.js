const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function extractOntology(text) {
    try {
        // Bhai, tere system pe ye model kaam kar raha hai (listModels result)
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

        console.log("AI Extraction chalu hai...");
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let jsonString = response.text().trim();
        
        jsonString = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonString);
    } catch (error) {
        console.error("❌ AI Error inside Service:", error.message);
        throw error; // Throwing so server.js catch can catch the real message
    }
}

module.exports = { extractOntology };