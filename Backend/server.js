// server.js - Integrated with AI, DB, and Ingestion Services
require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Importing services
const { extractOntology } = require('./aiService');
const { saveGraphData, getFullGraph } = require('./dbService');
const { fetchAndCleanNews } = require('./ingestionService');

const app = express();
app.use(cors());
app.use(express.json());

// 1. Graph Data fetch karne ke liye API
app.get('/api/graph', async (req, res) => {
    try {
        const data = await getFullGraph();
        res.json(data);
    } catch (error) {
        console.error("Fetch Error:", error);
        res.status(500).json({ error: "Graph fetch fail ho gaya bhai." });
    }
});

// 2. Real Ingestion API - News + AI + Neo4j
app.post('/api/ingest', async (req, res) => {
    const { topic } = req.body;
    if (!topic) return res.status(400).json({ error: "Topic toh de bhai!" });

    try {
        console.log(`\n--- Processing Topic: ${topic} ---`);
        
        // Step 1: Pawan's logic - Fetching real news
        console.log("Fetching news from GNews...");
        const rawText = await fetchAndCleanNews(topic);
        
        if (!rawText || rawText.length < 50) {
            throw new Error("GNews se kuch nahi mila. Pawan ki API key check karo.");
        }

        // Step 2: AI logic - Analyzing text
        console.log("AI is extracting ontology...");
        const graphJson = await extractOntology(rawText);
        
        if (graphJson) {
            // Step 3: DB logic - Saving to Neo4j
            const success = await saveGraphData(graphJson);
            if (success) {
                console.log("Graph successfully updated!");
                res.json({ message: "Knowledge Graph Updated!", data: graphJson });
            } else {
                throw new Error("Neo4j database mein save nahi hua.");
            }
        } else {
            throw new Error("AI extraction failed.");
        }
    } catch (error) {
        console.error("❌ INGESTION FAILED:", error.message);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`🚀 MASTER SERVER LIVE ON PORT ${PORT}`);
    console.log(`========================================\n`);
});