// server.js - Parth bhai ki master integration file
require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Apne banaye hue services ko import kar rahe hain
const { extractOntology } = require('./aiService');
const { saveGraphData, getFullGraph } = require('./dbService');
// Pawan's Data Ingestion Service
const { fetchAndCleanNews } = require('./ingestionService'); // [cite: 95]

const app = express();

// Middleware setup
app.use(cors());
app.use(express.json());

// 1. Basic Health Check Route
app.get('/', (req, res) => {
    res.send("Backend Master Server ekdum mast chal raha hai bhai! 🚀");
});

// 2. GET /api/graph - Chetan (Frontend) isko use karega graph dikhane ke liye
app.get('/api/graph', async (req, res) => {
    try {
        console.log("[API] Frontend se request aayi hai graph data ke liye...");
        const graphData = await getFullGraph();
        res.json(graphData);
    } catch (error) {
        console.error("[FAILED] Graph fetch error:", error);
        res.status(500).json({ error: "Graph fetch karne mein problem aayi hai bhai." });
    }
});

// 3. POST /api/ingest - Jab user search bar mein topic dalega, tab yeh chalega
app.post('/api/ingest', async (req, res) => {
    const { topic } = req.body; // [cite: 98]
    
    if (!topic) {
        return res.status(400).json({ error: "Topic toh de bhai!" });
    }

    try {
        console.log(`\n--- [PIPELINE START] Naya Ingestion Start: ${topic} ---`);
        
        // STEP 1: PAWAN'S CODE RUNS HERE
        console.log(`[PIPELINE STEP 1] Calling Pawan's function for: ${topic}`); // [cite: 101]
        const rawText = await fetchAndCleanNews(topic); // [cite: 103]
        
        if (!rawText) {
            console.error("[FAILED] Did not get text from Pawan's ingestion service.");
            throw new Error("Did not get text from NewsAPI"); // [cite: 104]
        }
        
        console.log(`[PIPELINE STEP 1.5] Pawan's function success! Passed clean text of length: ${rawText.length}`);
        console.log("[PIPELINE STEP 2] Sending clean data to AI..."); // [cite: 106]
        
        // STEP 2: PARTH'S AI CODE RUNS HERE
        const graphJson = await extractOntology(rawText); // [cite: 113]
        
        if (!graphJson) {
            console.error("[FAILED] AI failed to parse the text into a graph.");
            throw new Error("AI ne dhang se response nahi diya."); // [cite: 114]
        }

        console.log("[PIPELINE STEP 3] AI extraction successful. Saving to Database...");

        // STEP 3: DATABASE SAVE RUNS HERE
        const success = await saveGraphData(graphJson); // [cite: 116]

        if (success) {
            console.log("[PIPELINE SUCCESS] Database mein data save ho gaya! 🏁");
            res.json({ 
                message: "Data Ingested and Graph Updated successfully!", // [cite: 117]
                dataAdded: graphJson 
            });
        } else {
            console.error("[FAILED] Database save function returned false.");
            res.status(500).json({ error: "Database mein save nahi ho paya." });
        }

    } catch (error) {
        console.error("[PIPELINE FATAL ERROR] Ingestion pipeline failed:", error.message); // [cite: 120]
        res.status(500).json({ error: "Ingestion pipeline failed, logs check karle." });
    }
});

// Server Start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`🚀 Master Server port ${PORT} pe chalu hai!`);
    console.log(`Ready for Frontend Connection!`);
    console.log(`========================================\n`);
});