// ingestionService.js — uses GNews API (server-side safe, free tier)
const axios = require('axios');
require('dotenv').config();

console.log("[INIT] Ingestion Service ready.");

/**
 * Fetches news articles for a topic and returns clean combined text.
 * Uses GNews API which supports server-side requests on the free tier.
 * Falls back to Wikipedia summary if GNews fails.
 */
async function fetchAndCleanNews(topic) {
    console.log(`\n[INGEST] Topic: "${topic}"`);

    // ── Try GNews first ──────────────────────────────────────
    const gnewsKey = process.env.GNEWS_API_KEY;
    if (gnewsKey) {
        try {
            const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(topic)}&max=5&lang=en&apikey=${gnewsKey}`;
            console.log("[INGEST] Fetching from GNews...");
            const res = await axios.get(url, { timeout: 10000 });
            const articles = res.data?.articles;

            if (articles && articles.length > 0) {
                const text = articles
                    .map(a => `${a.title || ''}. ${a.description || a.content || ''}`)
                    .join(' ');
                return cleanText(text);
            }
        } catch (err) {
            console.warn("[INGEST] GNews failed:", err.response?.data?.errors || err.message);
        }
    }

    // ── Try NewsAPI (works on localhost dev) ─────────────────
    const newsApiKey = process.env.NEWS_API_KEY;
    if (newsApiKey) {
        try {
            const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(topic)}&pageSize=5&apiKey=${newsApiKey}`;
            console.log("[INGEST] Fetching from NewsAPI...");
            const res = await axios.get(url, { timeout: 10000 });
            const articles = res.data?.articles;

            if (articles && articles.length > 0) {
                const text = articles
                    .map(a => `${a.title || ''}. ${a.description || a.content || ''}`)
                    .join(' ');
                return cleanText(text);
            }
        } catch (err) {
            const status = err.response?.status;
            const msg = err.response?.data?.message || err.message;
            console.warn(`[INGEST] NewsAPI failed (HTTP ${status}): ${msg}`);
            // 426 = free plan can't be used server-side, continue to fallback
        }
    }

    // ── Wikipedia fallback (always works, no key needed) ─────
    console.log("[INGEST] Falling back to Wikipedia summary...");
    return await fetchWikipedia(topic);
}

/**
 * Fetches a Wikipedia summary for the topic as a last resort.
 */
async function fetchWikipedia(topic) {
    try {
        const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`;
        const res = await axios.get(url, { timeout: 8000 });
        const extract = res.data?.extract;

        if (extract && extract.length > 80) {
            console.log(`[INGEST] Wikipedia summary fetched (${extract.length} chars)`);
            return cleanText(extract);
        }
    } catch (err) {
        console.warn("[INGEST] Wikipedia failed:", err.message);
    }

    // ── Last resort: use the topic itself as context ──────────
    console.warn("[INGEST] All sources failed — using topic string as context.");
    return `Analyze and extract key entities and relationships about the topic: ${topic}. Include relevant people, organizations, locations, concepts, and technologies related to ${topic}.`;
}

/**
 * Strips HTML tags, URLs, and extra whitespace from raw text.
 */
function cleanText(raw) {
    return raw
        .replace(/(<([^>]+)>)/gi, '')        // strip HTML
        .replace(/https?:\/\/[^\s]+/g, '')   // strip URLs
        .replace(/\[.*?\]/g, '')              // strip [refs]
        .replace(/\n/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

module.exports = { fetchAndCleanNews };