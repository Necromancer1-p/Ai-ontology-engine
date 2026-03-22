import os
import re
import logging
from dotenv import load_dotenv
from neo4j import GraphDatabase
from neo4j.exceptions import ServiceUnavailable, AuthError

# 1. Setup Logging for the Database
logger = logging.getLogger("ontology_backend.database")
logger.setLevel(logging.INFO)
# If the logger doesn't have handlers, add one
if not logger.handlers:
    ch = logging.StreamHandler()
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    ch.setFormatter(formatter)
    logger.addHandler(ch)

# 2. Load Environment Variables
logger.info("Loading environment variables from .env file...")
load_dotenv()

NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USERNAME = os.getenv("NEO4J_USERNAME")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")

# 3. Database Connection Class
class Neo4jConnection:
    def __init__(self, uri, user, pwd):
        self.__uri = uri
        self.__user = user
        self.__pwd = pwd
        self.__driver = None
        
        logger.info(f"Attempting to connect to Neo4j at URI: {self.__uri}")
        try:
            # Create the driver
            self.__driver = GraphDatabase.driver(self.__uri, auth=(self.__user, self.__pwd))
            # Verify connectivity immediately to catch errors early
            self.__driver.verify_connectivity()
            logger.info("SUCCESS: Connected to Neo4j AuraDB!")
        except AuthError:
            logger.error("FAILURE: Authentication failed. Please check your NEO4J_USERNAME and NEO4J_PASSWORD.")
        except ServiceUnavailable:
            logger.error("FAILURE: Database service is unavailable. Check your NEO4J_URI or ensure your AuraDB instance is running.")
        except Exception as e:
            logger.error(f"FAILURE: An unexpected error occurred while connecting to Neo4j: {e}")

    def close(self):
        if self.__driver is not None:
            logger.info("Closing Neo4j connection...")
            self.__driver.close()
            logger.info("Neo4j connection closed safely.")

    def get_driver(self):
        return self.__driver

# 4. Initialize a global connection instance
logger.info("Initializing Neo4j global connection object...")
db_conn = Neo4jConnection(NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD)

# Helper function to get the driver in other files
def get_db():
    return db_conn.get_driver()

# Helper function to sanitize AI-generated labels and edge types
def sanitize_cypher_string(text: str) -> str:
    """Replaces spaces and invalid characters with underscores to prevent Cypher syntax errors."""
    if not text:
        return "UNKNOWN"
    # Replace anything that is not a letter, number, or underscore with an underscore
    clean_text = re.sub(r'[^a-zA-Z0-9_]', '_', str(text).strip())
    return clean_text

# 5. Graph Insertion Function
def insert_graph_data(driver, graph_data: dict) -> bool:
    """Takes the JSON from the LLM and inserts it into Neo4j using Cypher queries."""
    if not driver:
        logger.error("FAILURE: Cannot insert data, Neo4j driver is not initialized.")
        return False

    nodes = graph_data.get("nodes", [])
    edges = graph_data.get("edges", [])
    
    logger.info(f"Starting database insertion for {len(nodes)} nodes and {len(edges)} edges...")
    
    # We use a session to execute our queries
    with driver.session() as session:
        try:
            # Step A: Insert Nodes
            for node in nodes:
                # Sanitize the label before using it in the query
                raw_label = node.get('label', 'Entity')
                safe_label = sanitize_cypher_string(raw_label)
                
                logger.info(f"Merging node: [{safe_label}] (Original AI Label: '{raw_label}') ID: {node['id']}")
                
                # We use backticks around the label just as an extra layer of absolute security
                query = f"""
                MERGE (n:`{safe_label}` {{id: $id}})
                SET n.name = $name
                """
                session.run(query, id=node["id"], name=node["name"])
            
            logger.info("SUCCESS: All nodes safely inserted.")

            # Step B: Insert Edges (Relationships)
            for edge in edges:
                # Sanitize the edge type before using it in the query
                raw_type = edge.get('type', 'RELATED_TO')
                safe_type = sanitize_cypher_string(raw_type).upper() # Edge types are conventionally uppercase
                
                logger.info(f"Merging edge: {edge['source']} -[{safe_type}]-> {edge['target']} (Original AI Type: '{raw_type}')")
                
                query = f"""
                MATCH (source {{id: $source}})
                MATCH (target {{id: $target}})
                MERGE (source)-[r:`{safe_type}`]->(target)
                """
                session.run(query, source=edge["source"], target=edge["target"])
                
            logger.info("SUCCESS: All edges processed and graph data committed to Neo4j.")
            return True
            
        except Exception as e:
            logger.error(f"FAILURE during database insertion: {e}")
            return False