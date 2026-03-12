// server.js - Parth bhai ki master integration file
require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Apne banaye hue services ko import kar rahe hain
const { extractOntology } = require('./aiService');
const { saveGraphData, getFullGraph } = require('./dbService');

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
        console.log("Frontend se request aayi hai graph data ke liye...");
        const graphData = await getFullGraph();
        res.json(graphData);
    } catch (error) {
        console.error("Graph fetch error:", error);
        res.status(500).json({ error: "Graph fetch karne mein problem aayi hai bhai." });
    }
});

// 3. POST /api/ingest - Jab user search bar mein topic dalega, tab yeh chalega
app.post('/api/ingest', async (req, res) => {
    const { topic } = req.body;
    
    if (!topic) {
        return res.status(400).json({ error: "Topic toh de bhai!" });
    }

    try {
        console.log(`\n--- Naya Ingestion Start: ${topic} ---`);
        
        // Step 1: Pawan ka data fetch logic (Abhi ke liye dummy text use kar rahe hain)
        // Future: const rawText = await fetchNews(topic);
        const rawText = `Global news report on ${topic}: Recent developments show significant impact in the international market. Major organizations are monitoring the situation closely as it affects multiple locations.`;
        
        console.log("Step 1: AI ko text bhej raha hu extraction ke liye...");
        
        // Step 2: AI se Graph JSON nikalna (Parth's AI logic)
        const graphJson = await extractOntology(rawText);
        
        if (!graphJson) {
            throw new Error("AI ne dhang se response nahi diya.");
        }

        console.log("Step 2: AI ne data extract kar liya. Ab DB mein save kar raha hu...");

        // Step 3: Database mein save karna (Parth's DB logic)
        const success = await saveGraphData(graphJson);

        if (success) {
            console.log("Step 3: Database mein data save ho gaya! 🏁");
            res.json({ 
                message: "Success ekdum! Graph update ho gaya.", 
                dataAdded: graphJson 
            });
        } else {
            res.status(500).json({ error: "Database mein save nahi ho paya." });
        }

    } catch (error) {
        console.error("Ingestion fail ho gaya:", error.message);
        res.status(500).json({ error: "Ingestion fail ho gaya, logs check karle." });
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