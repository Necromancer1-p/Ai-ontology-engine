import os
import json
import logging
from dotenv import load_dotenv
from pydantic import BaseModel, Field

# NEW IMPORT SYNTAX
from google import genai
from google.genai import types

# 1. Setup Heavy Logging
logger = logging.getLogger("ontology_backend.llm")
logger.setLevel(logging.INFO)
if not logger.handlers:
    ch = logging.StreamHandler()
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    ch.setFormatter(formatter)
    logger.addHandler(ch)

# 2. Load and verify API Key
logger.info("Loading Gemini API key from environment...")
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

client = None
if not GEMINI_API_KEY:
    logger.error("FAILURE: GEMINI_API_KEY is missing! Check your .env file.")
else:
    logger.info("Configuring new Google GenAI Client...")
    # Initialize the new client syntax
    client = genai.Client(api_key=GEMINI_API_KEY)

# 3. Define Fallback Models
AVAILABLE_MODELS = [
    "gemini-2.5-flash",
    "gemini-3-flash-preview",
    "gemini-3.1-flash-lite-preview",
    "gemini-2.5-flash-lite"
]

# 4. Define the DYNAMIC JSON structure we want from the LLM
class Node(BaseModel):
    id: str = Field(description="Unique ID, uppercase with underscores, e.g., ETHEREUM, VITALIK_BUTERIN, USA")
    label: str = Field(description="Determine the most accurate category for the entity (e.g., Technology, Cryptocurrency, Company, Person, Market, Country, Event).")
    name: str = Field(description="Clean, human-readable name")
    source_url: str = Field(default="", description="Provenance tracking: Source URL")
    source_title: str = Field(default="", description="Provenance tracking: Source Title")

class Edge(BaseModel):
    source: str = Field(description="The ID of the source node")
    target: str = Field(description="The ID of the target node")
    type: str = Field(description="Generate a highly specific relationship type in UPPERCASE_WITH_UNDERSCORES (e.g., PARTNERED_WITH, INTEGRATES_WITH, FOUNDED_BY, THREATENS).")
    source_url: str = Field(default="", description="Provenance tracking: Source URL")
    source_title: str = Field(default="", description="Provenance tracking: Source Title")

class KnowledgeGraphSchema(BaseModel):
    nodes: list[Node]
    edges: list[Edge]

# 5. Function to Extract Graph Data
def extract_graph_from_text(text: str, source_url: str = "", source_title: str = "") -> dict:
    logger.info(f"Starting LLM extraction for text snippet (first 60 chars): {text[:60]}...")
    
    if not client:
        logger.error("FAILURE: GenAI client is not initialized.")
        return {"nodes": [], "edges": []}

    # --- THE ROUTER LOGIC ---
    # We count the words to determine the user's intent.
    word_count = len(text.split())
    logger.info(f"Input text word count analyzed: {word_count} words.")

    if word_count < 25:
        logger.info("ROUTER: Short input detected. Engaging TOPIC EXPANSION MODE.")
        prompt = f"""
        You are an elite intelligence analyst. The user has provided a short topic or search query. 
        Do NOT just extract the literal words. Instead, use your vast internal knowledge to EXPAND on this topic.
        Build a comprehensive, highly detailed intelligence graph (aiming for 10-15 nodes) that maps out the key organizations, people, locations, events, and technologies related to this topic.
        
        CRITICAL TOPOLOGY RULES:
        1. Build a highly interconnected "hub-and-spoke" graph.
        2. DO NOT create isolated, floating nodes or disconnected pairs.
        3. Tie all secondary entities explicitly back to central hubs (the main topic, key organizations, or key people).
        
        Create specific, context-aware categories for entities (Node labels) and precise relationship descriptions (Edge types).
        
        Topic to expand:
        {text}
        """
    else:
        logger.info("ROUTER: Long input detected. Engaging standard INFORMATION EXTRACTION MODE.")
        prompt = f"""
        You are an elite intelligence analyst. Read the following text and extract the key entities and their relationships to build a dynamic intelligence graph.
        
        CRITICAL TOPOLOGY RULES:
        1. Build a highly interconnected graph.
        2. DO NOT create isolated, floating nodes or disconnected pairs. 
        3. If a minor entity is mentioned, you MUST figure out how it relates to the central themes, organizations, or people in the text and create an edge connecting them.
        
        Create specific, context-aware categories for entities (Node labels) and precise relationship descriptions (Edge types).
        Strictly rely on the provided text for your extraction.
        
        Text to analyze:
        {text}
        """
    
    for model_name in AVAILABLE_MODELS:
        try:
            logger.info(f"Attempting extraction using model: {model_name}")
            
            logger.info("Sending prompt with DYNAMIC JSON schema via new genai.Client...")
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=KnowledgeGraphSchema,
                    temperature=0.2 # Slightly higher temp to allow for creative topic expansion
                )
            )
            
            logger.info(f"SUCCESS: Received valid JSON response from {model_name}.")
            result = json.loads(response.text)
            
            # Stamp provenance metadata onto every node AND edge for the Evidence Panel
            if source_url or source_title:
                for node in result.get("nodes", []):
                    node["source_url"] = source_url
                    node["source_title"] = source_title
                logger.info(f"Provenance stamped on {len(result.get('nodes', []))} nodes. Source: '{source_title}'")
                
                for edge in result.get("edges", []):
                    edge["source_url"] = source_url
                    edge["source_title"] = source_title
                    # Log check requirement for Edge Provenance
                    logger.info(f"Attached source URL to edge: ({edge.get('source')}) -> ({edge.get('target')})")
                logger.info(f"Provenance stamped on {len(result.get('edges', []))} edges.")
            
            logger.info(f"Extracted {len(result.get('nodes', []))} nodes and {len(result.get('edges', []))} edges.")
            return result
            
        except Exception as e:
            logger.warning(f"FAILURE with model {model_name}: {e}. Switching to next available model...")
            continue # Try the next model in the list
            
    logger.error("CRITICAL FAILURE: All models failed to extract the graph data.")
    return {"nodes": [], "edges": []}

# 6. Function to Generate the Analyst Brief
def generate_analyst_brief(topic: str, context: str) -> str:
    logger.info(f"Starting LLM brief generation for topic: {topic}")
    
    if not client:
        logger.error("FAILURE: GenAI client is not initialized.")
        return "GenAI client not initialized."

    prompt = f"""
    You are a senior intelligence analyst. Write a concise, 2-3 paragraph situation brief on the topic '{topic}'.
    Use the following extracted graph context and events to ground your analysis. Do not hallucinate. Add a bulleted list of 1-2 key risks at the end.
    
    Context Data:
    {context}
    """
    
    for model_name in AVAILABLE_MODELS:
        try:
            logger.info(f"Attempting brief generation using model: {model_name}")
            response = client.models.generate_content(
                model=model_name,
                contents=prompt
            )
            logger.info(f"SUCCESS: Brief generated by {model_name}.")
            return response.text
        except Exception as e:
            logger.warning(f"FAILURE with model {model_name}: {e}. Switching to next available model...")
            continue
            
    logger.error("CRITICAL FAILURE: All models failed to generate the analyst brief.")
    return "An error occurred while generating the intelligence brief."