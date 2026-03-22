"""
csv_ingest.py
-------------
Task 4 (Bonus): Parses crypto_hacks.csv and merges structured financial data
into the existing Neo4j graph, giving financial context to text-extracted nodes.

Each row creates nodes for:
  - Protocol (the hacked project)
  - Attacker (threat actor group)
  - Chain (blockchain network)

And relationships:
  - (Protocol)-[:HACKED_FOR {amount_usd, date}]->(Attacker)  
  - (Attacker)-[:USED_CHAIN]->(Chain)
  - (Protocol)-[:DEPLOYED_ON]->(Chain)

Usage:
    cd Backend
    python csv_ingest.py
"""

import csv
import logging
import os
from database import get_db

# Setup Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("ontology_backend.csv_ingest")

CSV_FILE = os.path.join(os.path.dirname(__file__), "crypto_hacks.csv")


def sanitize_id(text: str) -> str:
    """Create a Neo4j-safe ID from a text label."""
    return text.strip().upper().replace(" ", "_").replace("-", "_").replace(".", "_")


def run_csv_ingestion():
    logger.info("============================================================")
    logger.info("Starting Crypto Hacks CSV Ingestion into Neo4j...")
    logger.info("============================================================")

    driver = get_db()
    if not driver:
        logger.error("CRITICAL: Cannot connect to the database. Aborting.")
        return

    if not os.path.exists(CSV_FILE):
        logger.error(f"CRITICAL: CSV file not found at: {CSV_FILE}")
        return

    logger.info(f"Loading CSV from: {CSV_FILE}")

    rows = []
    with open(CSV_FILE, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)

    logger.info(f"Loaded {len(rows)} records from CSV.")

    success_count = 0

    with driver.session() as session:
        for index, row in enumerate(rows):
            try:
                target = row["Target"].strip()
                amount = int(float(row["Amount_USD"]))
                date = row["Date"].strip()
                attacker = row["Attacker"].strip()
                chain = row["Chain"].strip()
                attack_type = row["Attack_Type"].strip()

                target_id = sanitize_id(target)
                attacker_id = sanitize_id(attacker)
                chain_id = sanitize_id(chain)

                logger.info(f"[{index + 1}/{len(rows)}] Merging: {target} --[HACKED_FOR ${amount:,}]--> {attacker} on {chain}")

                # Merge Protocol node
                session.run("""
                    MERGE (p:Protocol {id: $id})
                    SET p.name = $name,
                        p.source_title = 'Crypto Hacks Dataset (CSV)',
                        p.source_url = 'https://github.com/Ai-ontology-engine'
                    """,
                    id=target_id, name=target
                )

                # Merge Attacker node (if known)
                if attacker and attacker != "Unknown":
                    session.run("""
                        MERGE (a:ThreatActor {id: $id})
                        SET a.name = $name,
                            a.source_title = 'Crypto Hacks Dataset (CSV)'
                        """,
                        id=attacker_id, name=attacker
                    )
                    # Merge the HACKED relationship with financial metadata
                    session.run("""
                        MATCH (p:Protocol {id: $target_id})
                        MATCH (a:ThreatActor {id: $attacker_id})
                        MERGE (p)-[r:HACKED_BY]->(a)
                        SET r.amount_usd = $amount,
                            r.date = $date,
                            r.attack_type = $attack_type
                        """,
                        target_id=target_id,
                        attacker_id=attacker_id,
                        amount=amount,
                        date=date,
                        attack_type=attack_type
                    )

                # Merge Chain node
                session.run("""
                    MERGE (c:Blockchain {id: $id})
                    SET c.name = $name
                    """,
                    id=chain_id, name=chain
                )

                # Merge DEPLOYED_ON relationship
                session.run("""
                    MATCH (p:Protocol {id: $target_id})
                    MATCH (c:Blockchain {id: $chain_id})
                    MERGE (p)-[:DEPLOYED_ON]->(c)
                    """,
                    target_id=target_id,
                    chain_id=chain_id
                )

                # If attacker is known, also link them to the chain
                if attacker and attacker != "Unknown":
                    session.run("""
                        MATCH (a:ThreatActor {id: $attacker_id})
                        MATCH (c:Blockchain {id: $chain_id})
                        MERGE (a)-[:USED_CHAIN]->(c)
                        """,
                        attacker_id=attacker_id,
                        chain_id=chain_id
                    )

                success_count += 1
                logger.info(f"SUCCESS: Row {index + 1} merged.")

            except Exception as e:
                logger.error(f"FAILURE on row {index + 1} ({row.get('Target', '?')}): {e}")

    logger.info("============================================================")
    logger.info(f"CSV INGESTION COMPLETE. Successfully merged {success_count} / {len(rows)} records.")
    logger.info(f"Nodes created: Protocol, ThreatActor, Blockchain")
    logger.info(f"Relationships created: HACKED_BY, DEPLOYED_ON, USED_CHAIN")
    logger.info("============================================================")


if __name__ == "__main__":
    run_csv_ingestion()
