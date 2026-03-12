// ingestionService.js
const axios = require('axios'); // [cite: 21]
require('dotenv').config(); // [cite: 22]

console.log("[INIT] Pawan's Ingestion Service is ready to rock!"); // [cite: 23]

async function fetchAndCleanNews(topic) { // [cite: 54]
    console.log(`\n[STEP 1] Starting fetchAndCleanNews for topic: "${topic}"`);
    const apiKey = process.env.NEWS_API_KEY; // [cite: 55]
    
    if (!apiKey) {
        console.error("[FAILED] NEWS_API_KEY is missing from process.env!");
        throw new Error("Missing API Key");
    }

    // Adding pageSize=5 so the LLM doesn't get overwhelmed [cite: 34]
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(topic)}&pageSize=5&apiKey=${apiKey}`;
    console.log(`[STEP 2] Constructed NewsAPI URL.`);

    try {
        console.log("[STEP 3] Sending GET request to NewsAPI...");
        const response = await axios.get(url); // [cite: 59]
        console.log("[STEP 4] Received response from NewsAPI.");

        const articles = response.data.articles; // [cite: 60, 61]

        if (!articles || articles.length === 0) { // [cite: 62]
            console.log("[WARNING] No articles found for this topic, yaar."); // [cite: 40]
            return "No relevant global information found."; // [cite: 63]
        }
        
        console.log(`[STEP 5] Found ${articles.length} articles. Starting combination...`);
        let combinedText = ""; // [cite: 65]

        // Loop through articles and combine title and description [cite: 66]
        articles.forEach((article, index) => {
            const title = article.title || ""; // [cite: 67, 68]
            const description = article.description || article.content || ""; // [cite: 75]
            combinedText += `${title}. ${description} `; // [cite: 75]
            console.log(`   -> Appended article ${index + 1}`);
        });

        console.log("[STEP 6] Starting text cleaning process..."); // [cite: 76]
        
        // 1. Remove HTML tags (like <b>, <p>, etc.) [cite: 77]
        let cleanText = combinedText.replace(/(<([^>]+)>)/gi, ""); // [cite: 78]
        console.log("   -> Removed HTML tags.");
        
        // 2. Remove URLs (http://...) [cite: 79]
        cleanText = cleanText.replace(/https?:\/\/[^\s]+/g, ""); // [cite: 80]
        console.log("   -> Removed URLs.");
        
        // 3. Remove extra spaces and newlines [cite: 80, 81]
        cleanText = cleanText.replace(/\n/g, " ").replace(/\s{2,}/g, " ").trim(); // [cite: 82]
        console.log("   -> Removed extra spaces and newlines.");

        console.log(`[SUCCESS] Data cleaned successfully! Length of text: ${cleanText.length}`); // [cite: 83]
        
        // Return this clean text so the AI can read it [cite: 84]
        return cleanText; 

    } catch (error) {
        console.error("[FAILED] Data ingestion failed:", error.message); // [cite: 86]
        // Adding extra logging to catch specific API rejection reasons
        if (error.response) {
            console.error("[FAILED] API Response Error Data:", error.response.data);
        }
        throw error; // [cite: 86]
    }
}

// Export the function so it can be used in server.js [cite: 89]
module.exports = { fetchAndCleanNews };