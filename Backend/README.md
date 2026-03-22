# Backend - Global Ontology Engine

This is the backend for the Global Ontology Engine. It's built with **FastAPI** to expose APIs that process raw intelligence text using a **Google Gemini Large Language Model** via the `google-genai` library, which extracts dynamic entity (node) and relationship (edge) data into a structured format. This data is then merged into a **Neo4j** graph database using Cypher queries. It also features an AI Analyst Brief endpoint that generates situation reports based on the extracted situational context.

## Capabilities
- Extract knowledge graphs from raw text via the Google Gemini LLM API.
- Validate generated data via Pydantic structured schemas.
- Insert structured knowledge securely into a Neo4j database using a singleton driver instance and sanitized Cypher queries.
- Generate multi-paragraph, AI-authored analyst briefs (including key risks) using extracted graphs.
- Includes a standalone batch ingestion script (`ingest.py`) with automatic rate limit controls to process multiple articles simultaneously.

## Setup & Run Instructions

### Prerequisites
- **Python 3.9+**
- A **Neo4j AuraDB instance** (or local instance) with its connection URI, username, and password.
- A **Google Gemini API Key**.

### 1. Create a Virtual Environment
In the root directory of this repository, create and activate a Python virtual environment:

```bash
# On macOS/Linux
python3 -m venv venv
source venv/bin/activate

# On Windows
python -m venv venv
venv\Scripts\activate
```

### 2. Install Dependencies
Install the required packages using the `requirements.txt` file in the root repository.

```bash
pip install -r ../requirements.txt
```

### 3. Environment Variables
Create a `.env` file in the `Backend` directory and define your credentials:

```ini
NEO4J_URI=bolt://your-neo4j-uri
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_secure_password
GEMINI_API_KEY=your_gemini_api_key
```

### 4. Running the Backend Server
Start the FastAPI server using `uvicorn`:

```bash
uvicorn main:app --reload
```
The server will now be listening on `http://127.0.0.1:8000`.

### 5. Running the Ingestion Script (Optional)
If you wish to process sample data directly into the database:
```bash
python ingest.py
```
This script reads `sample_data.json` and runs extraction models on each article, pausing between them to accommodate API rate limits.

---
## Note about the Frontend
The companion Next.js React frontend (located in `../Frontend/ai-onto-globe`) provides a modern dashboard interface that dynamically displays these real-time entity extraction graphs. The frontend renders this structured data using an interactive D3-force layout, allowing users to customize physics components like node repulsion and link distances via real-time sliders.

You can refer to the [Frontend README](../Frontend/README.md) for its specific capabilities and setup/run instructions.