🧠 AI Ontology Engine

📌 About the Project

The AI Ontology Engine is an intelligent full-stack application designed to dynamically fetch real-time global news, analyze the text to extract complex entities and their relationships, and visualize them as a Knowledge Graph.

By leveraging NewsAPI for data ingestion, Google Gemini 2.5 Flash for NLP and ontology extraction, and Neo4j for graph data storage, this tool provides deep, interconnected insights into current global events.

✨ Key Features

🌍 Real-Time Data Ingestion: Fetches the latest global news articles based on user-defined topics.

🧹 Automated Data Cleaning: Strips HTML, URLs, and noise from articles to provide high-quality context to the AI.

🤖 AI-Powered Ontology Extraction: Uses Google's Gemini LLM to intelligently categorize text into entities (Location, Organization, Person, Concept) and map their relationships.

🕸️ Graph Database Integration: Stores nodes and links seamlessly in Neo4j without duplication using MERGE queries.

📊 Frontend Visualization: A responsive React (Vite + Tailwind CSS) interface to ingest topics and explore the generated knowledge graph.

🛠️ Tech Stack

Frontend:

React.js (Vite)

Tailwind CSS

Backend:

Node.js & Express.js

Axios (for external API calls)

@google/generative-ai (Gemini SDK)

neo4j-driver (Graph DB client)

External APIs & Services:

Google Gemini API

NewsAPI

Neo4j AuraDB (Cloud)

🚀 Architecture & Workflow

Ingestion: User searches for a topic -> Backend hits NewsAPI -> Articles are combined and cleaned.

Extraction: Clean text is passed to Gemini AI with a strict prompt to return a structured JSON containing nodes and links.

Storage: The parsed JSON is mapped into Cypher queries and injected into the Neo4j database.

Visualization: The React frontend fetches the complete graph from Neo4j and renders it interactively.

⚙️ Prerequisites

Before you begin, ensure you have the following installed on your local machine:

Node.js (v16 or higher)

npm

A free Neo4j AuraDB instance

API keys for Google Gemini and NewsAPI

🔑 Environment Variables

Create a .env file in the Backend directory and add the following keys:

PORT=5000
GEMINI_API_KEY=your_gemini_api_key_here
NEO4J_URI=neo4j+s://your-aura-db-url.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_neo4j_password
NEWS_API_KEY=your_news_api_key_here


💻 Installation & Setup

1. Clone the repository:

git clone [https://github.com/your-username/ai-ontology-engine.git](https://github.com/your-username/ai-ontology-engine.git)
cd ai-ontology-engine


2. Setup the Backend:

cd Backend
npm install
npm start


The backend server will start on http://localhost:5000.

3. Setup the Frontend:

cd ../Frontend
npm install
npm run dev


The React app will start on the provided Vite localhost port.

📡 API Reference

Fetch Complete Graph

  GET /api/graph


Returns a JSON object containing all nodes and links currently stored in the Neo4j database.

Ingest New Topic

  POST /api/ingest


Body

Type

Description

topic

string

Required. The news topic to search and process

Fetches news, extracts ontology, saves to Neo4j, and returns the newly added graph data.

🤝 Contributors

Parth Gupta - Backend Architecture, Database Setup & AI Integration

Pawan - Data Ingestion Pipeline (NewsAPI & Data Cleaning)

Chetan - Frontend UI & Graph Visualization