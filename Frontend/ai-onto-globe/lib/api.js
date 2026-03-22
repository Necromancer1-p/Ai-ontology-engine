import axios from 'axios';

// 1. Setup Axios instance with the base URL from our environment variables
// If the env variable is missing, fallback to localhost for safety during development
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

console.log(`[API Init] Configuring Axios to connect to backend at: ${API_BASE_URL}`);

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// 2. Function to send text to the backend for extraction
export const extractGraphData = async (text) => {
    console.log(`[API Call] Starting extractGraphData... Text length: ${text.length} chars`);
    try {
        console.log(`[API Call] Sending POST request to /api/extract...`);
        const response = await apiClient.post('/api/extract', { text });
        
        // Safety check to ensure we got the right data structure back
        const nodeCount = response.data?.data?.nodes?.length || 0;
        console.log(`[API Call] SUCCESS: Received graph data with ${nodeCount} nodes.`);
        
        return response.data;
    } catch (error) {
        console.error(`[API Error] FAILURE in extractGraphData:`, error.response?.data || error.message);
        throw error;
    }
};

// 3. Function to ask the backend for an analyst brief
export const getInsights = async (topic, context) => {
    console.log(`[API Call] Starting getInsights for topic: "${topic}"`);
    try {
        console.log(`[API Call] Sending POST request to /api/insights...`);
        const response = await apiClient.post('/api/insights', { topic, context });
        console.log(`[API Call] SUCCESS: Received generated brief.`);
        return response.data;
    } catch (error) {
        console.error(`[API Error] FAILURE in getInsights:`, error.response?.data || error.message);
        throw error;
    }
};

// 4. Function to search the Neo4j graph by entity name (Task 3)
export const searchGraph = async (query) => {
    console.log(`[API Call] Sending search query to backend: "${query}"`);
    try {
        const response = await apiClient.post('/api/search', { query });
        const nodeCount = response.data?.data?.nodes?.length || 0;
        console.log(`[API Call] Search SUCCESS: Found ${nodeCount} nodes for "${query}".`);
        return response.data;
    } catch (error) {
        console.error(`[API Error] FAILURE in searchGraph:`, error.response?.data || error.message);
        throw error;
    }
};

// 5. Function to fetch live news + extract graph (Task 1)
export const fetchNewsGraph = async (topic, maxArticles = 10) => {
    console.log(`[API Call] Fetching live news for topic: "${topic}"`);
    try {
        const response = await apiClient.post('/api/news', { topic, max_articles: maxArticles });
        const nodeCount = response.data?.data?.nodes?.length || 0;
        const articleCount = response.data?.articles?.length || 0;
        console.log(`[API Call] News fetch SUCCESS: ${articleCount} articles, ${nodeCount} graph nodes.`);
        return response.data;
    } catch (error) {
        console.error(`[API Error] FAILURE in fetchNewsGraph:`, error.response?.data || error.message);
        throw error;
    }
};