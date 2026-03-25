# Global Ontology Engine - Backend

## Overview

The Backend component of the **Global Ontology Engine** is a robust API driven by **FastAPI**. It handles parsing intelligence briefs, fetching real-time news, performing AI extractions to build comprehensive knowledge graphs, and saving that data into a Neo4j AuraDB instance.

It connects to:
- **Google Gemini** (via `google-genai` SDK) to intelligently process raw text or expanded short queries into structured node/edge ontologies.
- **Neo4j** (AuraDB) to persistently store nodes, edges, and provenance data (e.g., source URLs and titles) using structured Cypher queries.
- **GDELT DOC API** to fetch free real-time global news articles.

## Frontend Information

This API is designed to support the **Global Ontology Engine - Frontend** (a Next.js React application). The frontend provides users with a way to:
1. Input unstructured text and immediately visualize the extracted ontology via an interactive, physics-based D3 force graph.
2. Fetch live news using the GDELT DOC API and visualize the extracted intelligence as a graph.
3. Dynamically adjust the graph's rendering parameters.
4. Request an AI-generated situational analyst brief.
5. Trace evidence and source provenance.

For more information on the frontend and how to set it up, please see the [Frontend README](../Frontend/README.md).

## Key Technologies
- **Framework:** [FastAPI](https://fastapi.tiangolo.com/)
- **LLM Integration:** `google-genai` SDK
- **Database:** [Neo4j Python Driver](https://neo4j.com/docs/python-manual/current/)
- **Data Schemas:** [Pydantic](https://docs.pydantic.dev/)
- **External Data Fetching:** `requests`

## Setup & Installation

### Prerequisites
- Python (v3.10+)
- Pip
- Virtual Environment (recommended)
- A **Google Gemini API Key**
- A **Neo4j AuraDB** Database instance (with connection URI, Username, and Password)

### Environment Variables
To securely connect to these resources, create a `.env` file inside the `Backend` directory containing:
```env
# Gemini API Key
GEMINI_API_KEY="your_google_gemini_api_key_here"

# Neo4j Database Details
NEO4J_URI="neo4j+s://your-instance-id.databases.neo4j.io"
NEO4J_USERNAME="neo4j"
NEO4J_PASSWORD="your_neo4j_password_here"
```

### Installation Steps

1. Navigate to the `Backend` folder:
   ```bash
   cd Backend
   ```
2. Set up your Python virtual environment (optional but recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install the dependencies:
   ```bash
   pip install -r ../requirements.txt
   ```

## Running the Backend Application

Run the FastAPI application via `uvicorn` using the following command:

```bash
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

The API should now be running at `http://127.0.0.1:8000`. You can visit `http://127.0.0.1:8000/docs` to view the interactive Swagger API documentation.

## Running Data Ingestion Scripts (Bonus)
The backend also includes powerful scripts to ingest batch data directly into the database. Make sure your `.env` is configured before running these.

### Bulk JSON Data Ingestion
Loads textual data from `sample_data.json` and processes it via the Gemini LLM into nodes and edges before saving to Neo4j.
```bash
python ingest.py
```

### Crypto Hacks CSV Ingestion
Demonstrates how to integrate structured financial data (`crypto_hacks.csv`) into the unstructured knowledge graph, tracking protocols, attackers, and blockchains.
```bash
python csv_ingest.py
```
