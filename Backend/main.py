from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import logging

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

class SearchRequest(BaseModel):
    query: str

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
        # Step 1: Extract graph data using LLM
        logger.info("Calling LLM for graph extraction...")
        graph_data = extract_graph_from_text(request.text)
        
        # Step 2: Insert this into Neo4j
        logger.info("Attempting to insert extracted data into Neo4j...")
        db_driver = get_db()
        insertion_success = insert_graph_data(db_driver, graph_data)
        
        if insertion_success:
            logger.info("SUCCESS: Data successfully saved to Neo4j.")
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
    try:
        logger.info("Calling LLM for analyst brief generation...")
        brief = generate_analyst_brief(request.topic, request.context)
        logger.info("Brief generated successfully.")
        return {
            "status": "success",
            "brief": brief
        }
    except Exception as e:
        logger.error(f"FAILURE in /api/insights: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/news")
def ingest_news(request: NewsRequest):
    """
    Task 1: Fetch live news from GDELT for a topic, extract entities, and store to Neo4j.
    Returns the fetched articles AND the combined graph data for the frontend.
    """
    logger.info(f"Endpoint '/api/news' called for topic: '{request.topic}' (max {request.max_articles} articles)")
    
    if not request.topic.strip():
        raise HTTPException(status_code=400, detail="Topic cannot be empty.")
    
    try:
        # Step 1: Fetch articles from GDELT
        logger.info("Fetching live news articles from GDELT...")
        articles = fetch_articles(request.topic, max_records=request.max_articles)
        
        if not articles:
            logger.warning(f"No articles found for topic: '{request.topic}'")
            return {
                "status": "success",
                "message": "No articles found for this topic. Try a broader search.",
                "articles": [],
                "data": {"nodes": [], "edges": []}
            }
        
        logger.info(f"Fetched {len(articles)} articles. Starting LLM extraction pipeline...")
        
        # Step 2: Convert articles to text corpus for LLM extraction
        text_corpus = articles_to_text_corpus(articles)
        
        # Step 3: Combine all article texts into one rich input for the LLM
        # We combine for a single extraction call to be efficient with rate limits
        combined_text = "\n\n".join(text_corpus[:5])  # Use top 5 articles to keep prompt size sane
        
        logger.info(f"Combined text corpus length: {len(combined_text)} characters. Calling LLM...")
        
        # Step 4: Extract graph from combined text, passing first article's URL as provenance
        first_url = articles[0]["url"] if articles else ""
        first_title = articles[0]["title"] if articles else ""
        graph_data = extract_graph_from_text(
            combined_text,
            source_url=first_url,
            source_title=first_title
        )
        
        # Step 5: Insert into Neo4j
        logger.info("Inserting extracted graph data into Neo4j...")
        db_driver = get_db()
        insertion_success = insert_graph_data(db_driver, graph_data)
        
        if insertion_success:
            logger.info(f"SUCCESS: News ingestion complete. {len(graph_data.get('nodes', []))} nodes stored.")
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


@app.post("/api/search")
def search_entities(request: SearchRequest):
    """
    Task 3: Search the Neo4j graph by entity name.
    Returns matching nodes and their connected edges for graph visualization.
    """
    logger.info(f"Endpoint '/api/search' called with query: '{request.query}'")
    
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Search query cannot be empty.")
    
    try:
        logger.info(f"Sending search query to backend: '{request.query}'")
        db_driver = get_db()
        
        if not db_driver:
            raise HTTPException(status_code=503, detail="Database connection unavailable.")
        
        result = search_graph(db_driver, request.query)
        
        logger.info(f"Search complete. Found {len(result.get('nodes', []))} nodes and {len(result.get('edges', []))} edges.")
        return {
            "status": "success",
            "query": request.query,
            "data": result
        }
        
    except Exception as e:
        logger.error(f"FAILURE in /api/search: {e}")
        raise HTTPException(status_code=500, detail=str(e))


logger.info("Backend endpoints configured. Ready to receive requests.")