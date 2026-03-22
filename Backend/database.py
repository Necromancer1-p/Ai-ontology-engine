import os
import re
import logging
from dotenv import load_dotenv
from neo4j import GraphDatabase
from neo4j.exceptions import ServiceUnavailable, AuthError

# 1. Setup Logging for the Database
logger = logging.getLogger("ontology_backend.database")
logger.setLevel(logging.INFO)
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
            self.__driver = GraphDatabase.driver(self.__uri, auth=(self.__user, self.__pwd))
            self.__driver.verify_connectivity()
            logger.info("SUCCESS: Connected to Neo4j AuraDB!")
        except Exception as e:
            logger.error(f"FAILURE connecting to Neo4j: {e}")

    def close(self):
        if self.__driver is not None:
            self.__driver.close()
            logger.info("Neo4j connection closed safely.")

    def get_driver(self):
        return self.__driver

# 4. Initialize global connection
logger.info("Initializing Neo4j global connection object...")
db_conn = Neo4jConnection(NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD)

def get_db():
    return db_conn.get_driver()

def sanitize_cypher_string(text: str) -> str:
    if not text:
        return "UNKNOWN"
    return re.sub(r'[^a-zA-Z0-9_]', '_', str(text).strip())

# 5. Graph Insertion Function
def insert_graph_data(driver, graph_data: dict) -> bool:
    if not driver:
        logger.error("FAILURE: Cannot insert data, Neo4j driver is not initialized.")
        return False

    nodes = graph_data.get("nodes", [])
    edges = graph_data.get("edges", [])
    
    with driver.session() as session:
        try:
            for node in nodes:
                raw_label = node.get('label', 'Entity')
                safe_label = sanitize_cypher_string(raw_label)
                source_url = node.get("source_url", "")
                source_title = node.get("source_title", "")
                
                query = f"""
                MERGE (n:`{safe_label}` {{id: $id}})
                SET n.name = $name, n.source_url = $source_url, n.source_title = $source_title
                """
                session.run(query, id=node["id"], name=node["name"], source_url=source_url, source_title=source_title)

            for edge in edges:
                raw_type = edge.get('type', 'RELATED_TO')
                safe_type = sanitize_cypher_string(raw_type).upper()
                source_url = edge.get("source_url", "")
                source_title = edge.get("source_title", "")
                
                query = f"""
                MATCH (source {{id: $source}})
                MATCH (target {{id: $target}})
                MERGE (source)-[r:`{safe_type}`]->(target)
                SET r.source_url = $source_url, r.source_title = $source_title
                """
                session.run(query, source=edge["source"], target=edge["target"], source_url=source_url, source_title=source_title)
                logger.info(f"Attached source URL to edge: {edge['source']} -> {edge['target']}")
                
            return True
        except Exception as e:
            logger.error(f"FAILURE during database insertion: {e}")
            return False

# 6. Search Graph Function (FIXED FOR 1-HOP NEIGHBORHOOD)
def search_graph(driver, query: str) -> dict:
    if not driver:
        logger.error("FAILURE: Cannot search, Neo4j driver is not initialized.")
        return {"nodes": [], "edges": []}
    
    logger.info(f"Searching graph for 1-hop neighborhood of: '{query}'")
    
    with driver.session() as session:
        try:
            # OPTIONAL MATCH grabs the node AND anything connected to it!
            search_query = """
            MATCH (n)
            WHERE toLower(n.name) CONTAINS toLower($search_term)
            OPTIONAL MATCH (n)-[r]-(m)
            RETURN 
                n.id AS id1, n.name AS name1, labels(n)[0] AS label1, coalesce(n.source_url, '') AS url1, coalesce(n.source_title, '') AS title1,
                type(r) AS rel_type,
                m.id AS id2, m.name AS name2, labels(m)[0] AS label2, coalesce(m.source_url, '') AS url2, coalesce(m.source_title, '') AS title2,
                startNode(r).id AS source_id, endNode(r).id AS target_id
            LIMIT 300
            """
            result = session.run(search_query, search_term=query)
            
            nodes_dict = {}
            edges = []
            seen_edges = set()

            for record in result:
                # Add the main searched node
                id1 = record["id1"]
                if id1 and id1 not in nodes_dict:
                    nodes_dict[id1] = {
                        "id": id1, "name": record["name1"], "label": record["label1"],
                        "source_url": record["url1"], "source_title": record["title1"]
                    }
                
                # Add the connected neighbor node (if it exists)
                id2 = record["id2"]
                if id2 and id2 not in nodes_dict:
                    nodes_dict[id2] = {
                        "id": id2, "name": record["name2"], "label": record["label2"],
                        "source_url": record["url2"], "source_title": record["title2"]
                    }
                
                # Add the edge connecting them
                rel_type = record["rel_type"]
                if rel_type:
                    edge_hash = f"{record['source_id']}-{rel_type}-{record['target_id']}"
                    if edge_hash not in seen_edges:
                        seen_edges.add(edge_hash)
                        edges.append({
                            "source": record["source_id"],
                            "target": record["target_id"],
                            "type": rel_type
                        })

            final_nodes = list(nodes_dict.values())
            logger.info(f"Neighborhood search complete. Found {len(final_nodes)} unique nodes and {len(edges)} edges.")
            
            return {"nodes": final_nodes, "edges": edges}
        
        except Exception as e:
            logger.error(f"FAILURE during graph search: {e}")
            return {"nodes": [], "edges": []}