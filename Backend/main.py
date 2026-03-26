from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import logging
import hashlib
from typing import Dict, Any

# Import our custom modules
from database import get_db, insert_graph_data, search_graph
from llm import extract_graph_from_text, generate_analyst_brief
from news_fetcher import fetch_articles, articles_to_text_corpus

# 1. Setup Heavy Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("ontology_backend.main")

logger.info("Initializing Global Ontology Engine API...")

# 2. Initialize FastAPI app
app = FastAPI(title="Global Ontology Engine MVP")

# 2.5 Initialize In-Memory Caches for Live Demo Optimization
logger.info("Initializing in-memory caches to protect against rate limits and network drops...")
search_cache: Dict[str, Any] = {}
insight_cache: Dict[str, str] = {}

# 3. Setup CORS
logger.info("Configuring CORS middleware...")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. Define Request Models
class ExtractRequest(BaseModel):
    text: str

class InsightRequest(BaseModel):
    topic: str
    context: str

class NewsRequest(BaseModel):
    topic: str
    max_articles: int = 10  # Default to 10 to respect Gemini rate limits

# 5. Core Endpoints
@app.get("/")
def read_root():
    logger.info("Health check endpoint '/' was called.")
    return {"status": "success", "message": "Global Ontology Engine API is running!"}

@app.post("/api/extract")
def extract_entities(request: ExtractRequest):
    logger.info(f"Endpoint '/api/extract' called. Text length: {len(request.text)} characters.")
    if not request.text.strip():
        logger.warning("Empty text provided for extraction.")
        raise HTTPException(status_code=400, detail="Text cannot be empty.")
        
    try:
        logger.info("Calling LLM for graph extraction...")
        graph_data = extract_graph_from_text(request.text)
        
        logger.info("Attempting to insert extracted data into Neo4j...")
        db_driver = get_db()
        insertion_success = insert_graph_data(db_driver, graph_data)
        
        if insertion_success:
            logger.info("SUCCESS: Data successfully saved to Neo4j.")
            # Clear caches to ensure fresh briefs and searches on next request
            search_cache.clear()
            insight_cache.clear()
            logger.info("Caches cleared due to new database ingestion.")
        else:
            logger.error("FAILURE: Data extraction succeeded, but database insertion failed.")
            raise HTTPException(status_code=500, detail="Failed to save graph data to the database.")

        logger.info(f"Extraction and insertion complete. Returning {len(graph_data.get('nodes', []))} nodes.")
        return {
            "status": "success",
            "message": "Data extracted and saved to database.",
            "data": graph_data
        }
    except Exception as e:
        logger.error(f"FAILURE in /api/extract: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/insights")
def get_insights(request: InsightRequest):
    logger.info(f"Endpoint '/api/insights' called for topic: {request.topic}")
    
    # Check the cache first - Create a unique hash of the context data
    context_hash = hashlib.md5(request.context.encode('utf-8')).hexdigest()
    cache_key = f"{request.topic.lower().strip()}_{context_hash}"
    
    if cache_key in insight_cache:
        logger.info(f"CACHE HIT: Returning AI brief instantly from memory for current context signature.")
        return {
            "status": "success",
            "brief": insight_cache[cache_key]
        }
        
    try:
        logger.info("CACHE MISS: Context changed or not found. Calling LLM for new analyst brief generation...")
        brief = generate_analyst_brief(request.topic, request.context)
        
        # Save the result to cache for future requests using the unique signature
        insight_cache[cache_key] = brief
        logger.info(f"SUCCESS: Brief generated and securely stored in cache.")
        
        return {
            "status": "success",
            "brief": brief
        }
    except Exception as e:
        logger.error(f"FAILURE in /api/insights: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/news")
def ingest_news(request: NewsRequest):
    logger.info(f"Endpoint '/api/news' called for topic: '{request.topic}' (max {request.max_articles} articles)")
    
    if not request.topic.strip():
        logger.error("FAILURE: Empty topic provided for news ingestion.")
        raise HTTPException(status_code=400, detail="Topic cannot be empty.")
    
    try:
        logger.info("Fetching live news articles from NewsAPI...")
        articles = fetch_articles(request.topic, max_records=request.max_articles)
        
        if not articles:
            logger.warning(f"No articles found on NewsAPI for topic: '{request.topic}'")
            return {
                "status": "success",
                "message": f"No articles found for '{request.topic}'. The query might be too specific or regional for the global feed. Try a broader search.",
                "articles": [],
                "data": {"nodes": [], "edges": []}
            }
        
        logger.info(f"Fetched {len(articles)} articles. Starting LLM extraction pipeline...")
        
        # --- FIXED: Format the text sent to the LLM to explicitly include URLs ---
        combined_text = "Here are the live news sources to analyze:\n\n"
        for i, art in enumerate(articles[:5]):
            combined_text += f"--- SOURCE {i+1} ---\nTITLE: {art['title']}\nURL: {art['url']}\nCONTENT: {art['snippet']}\n\n"
        
        logger.info(f"Combined text corpus length: {len(combined_text)} characters. Calling LLM with explicit source tracking...")
        
        # --- FIXED: Let the LLM map the correct sources instead of overwriting them all ---
        graph_data = extract_graph_from_text(combined_text)
        
        logger.info("Inserting extracted graph data into Neo4j...")
        db_driver = get_db()
        insertion_success = insert_graph_data(db_driver, graph_data)
        
        if insertion_success:
            logger.info(f"SUCCESS: News ingestion complete. {len(graph_data.get('nodes', []))} nodes stored.")
            # Clear caches since the database has changed, ensuring fresh data and fresh briefs
            search_cache.clear()
            insight_cache.clear()
            logger.info("Search and insight caches cleared due to new database ingestion.")
        else:
            logger.error("FAILURE: Graph extraction succeeded but database insertion failed.")

        return {
            "status": "success",
            "message": f"Fetched {len(articles)} articles and extracted {len(graph_data.get('nodes', []))} graph nodes.",
            "articles": articles,
            "data": graph_data
        }
        
    except Exception as e:
        logger.error(f"FAILURE in /api/news: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/search")
def search_entities(query: str):
    """
    Task 3: Search the Neo4j graph by entity name.
    Returns matching nodes and their connected edges for graph visualization.
    """
    logger.info(f"Endpoint '/api/search' GET called with query: '{query}'")
    
    if not query.strip():
        logger.error("FAILURE: Search query cannot be empty.")
        raise HTTPException(status_code=400, detail="Search query cannot be empty.")
    
    # Check the cache first
    cache_key = query.lower().strip()
    if cache_key in search_cache:
        logger.info(f"CACHE HIT: Returning graph data for '{query}' instantly from memory.")
        cached_data = search_cache[cache_key]
        logger.info(f"Received search request for query: {query}. Found {len(cached_data.get('nodes', []))} nodes.")
        return {
            "status": "success",
            "query": query,
            "data": cached_data
        }
        
    try:
        logger.info("CACHE MISS: Sending search query to backend database driver...")
        db_driver = get_db()
        
        if not db_driver:
            logger.error("FAILURE: Database connection unavailable.")
            raise HTTPException(status_code=503, detail="Database connection unavailable.")
        
        result = search_graph(db_driver, query)
        
        # Save to cache
        search_cache[cache_key] = result
        logger.info(f"SUCCESS: Graph search results cached for '{query}'.")
        
        # Exact Log check mandated by the Task List
        logger.info(f"Received search request for query: {query}. Found {len(result.get('nodes', []))} nodes.")
        
        return {
            "status": "success",
            "query": query,
            "data": result
        }
        
    except Exception as e:
        logger.error(f"FAILURE in /api/search: {e}")
        raise HTTPException(status_code=500, detail=str(e))

logger.info("Backend endpoints configured. Ready to receive requests.")