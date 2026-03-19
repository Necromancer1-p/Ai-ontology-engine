# Global Ontology Engine

## Main Goal
The main goal of this project is to create an AI-powered "Global Ontology Engine" that acts as a real-time entity extraction and intelligence mapping tool. It takes raw text inputs (like news articles or intelligence briefs), uses a Large Language Model (Google Gemini via `google-genai`) to extract a dynamic knowledge graph (entities/nodes and their relationships/edges), and stores this graph in a Neo4j graph database. The frontend provides a Next.js-based interactive visualization of this knowledge graph using `react-force-graph-2d` and allows users to request an AI-generated analyst brief based on the extracted situational context.

## Complete Project Structure (Except `node_modules`)

```
/ (Root Folder)
├── .git/
├── Backend/
│   ├── .gitignore
│   ├── database.py
│   ├── ingest.py
│   ├── llm.py
│   ├── main.py
│   └── sample_data.json
├── Frontend/
│   └── ai-onto-globe/
│       ├── .gitignore
│       ├── AGENTS.md
│       ├── CLAUDE.md
│       ├── README.md
│       ├── app/
│       │   ├── favicon.ico
│       │   ├── globals.css
│       │   ├── layout.js
│       │   └── page.js
│       ├── components/
│       │   ├── CustomSlider.js
│       │   └── KnowledgeGraph.js
│       ├── lib/
│       │   └── api.js
│       ├── public/
│       │   ├── file.svg
│       │   ├── globe.svg
│       │   ├── next.svg
│       │   ├── vercel.svg
│       │   └── window.svg
│       ├── eslint.config.mjs
│       ├── jsconfig.json
│       ├── next.config.mjs
│       ├── package-lock.json
│       ├── package.json
│       └── postcss.config.mjs
└── requirements.txt
```

## What is Done and Capabilities
- **Backend API**: A FastAPI server that exposes two main endpoints:
  - `POST /api/extract`: Receives raw text, calls the Gemini LLM to extract nodes (entities) and edges (relationships), and saves the resulting graph into a Neo4j AuraDB graph database using Cypher queries.
  - `POST /api/insights`: Receives a topic and graph context, and uses the Gemini LLM to generate a concise analyst brief summarizing the situation and outlining key risks.
- **LLM Integration**: Uses the `google-genai` SDK with fallback models (`gemini-2.5-flash`, etc.) and structured JSON output generation via Pydantic schemas to ensure accurate and reliable graph extraction.
- **Database Connection**: Seamlessly connects to Neo4j with a singleton driver instance to run queries securely.
- **Ingestion Script**: A standalone `ingest.py` script to bulk-process articles from `sample_data.json` with rate-limiting baked in.
- **Frontend App**: A Next.js application built with React and styled with Tailwind CSS (`lucide-react` for icons).
- **Interactive Graph Visualization**: Uses `react-force-graph-2d` (rendered via Canvas/D3.js) to dynamically display the knowledge graph. Nodes are color-coded dynamically based on their category labels.
- **Graph Physics Controls**: Custom sliders allow the user to tweak D3 force-directed physics (repulsion and link distance) in real-time.

## Directory and File Details

### `/ (Root Folder)`
The main workspace containing both backend and frontend codebases, and top-level dependencies.
- `requirements.txt`: Contains the Python dependencies required for the backend (`fastapi`, `uvicorn`, `neo4j`, `google-generativeai` (Note: the code uses `google-genai`), `pydantic`, `python-dotenv`).

### `/Backend/`
Contains the Python FastAPI backend application that handles data extraction, database interaction, and AI brief generation.
- `.gitignore`: Specifies intentionally untracked files to ignore for Git.
- `database.py`: Handles the Neo4j database connection using the official neo4j driver. Provides a global database driver and includes the `insert_graph_data` function to merge nodes and relationships using Cypher queries.
- `ingest.py`: A standalone utility script to load JSON data from `sample_data.json` and bulk ingest it through the LLM extraction pipeline and into the Neo4j database, complete with rate-limiting pauses.
- `llm.py`: Manages the Google Gemini API integration using the `google-genai` library. Defines Pydantic schemas (`Node`, `Edge`, `KnowledgeGraphSchema`) to enforce structured JSON output. Contains `extract_graph_from_text` to parse text into a graph and `generate_analyst_brief` for situation reports.
- `main.py`: The entry point for the FastAPI application. Sets up CORS middleware, global logging, and defines the RESTful endpoints (`/api/extract` and `/api/insights`) that wire together the LLM and DB logic.
- `sample_data.json`: A sample dataset (likely JSON list of texts) used by `ingest.py` for testing bulk ingestions.

### `/Frontend/ai-onto-globe/`
Contains the Next.js React frontend application.
- `.gitignore`: Next.js specific git ignore rules.
- `AGENTS.md` & `CLAUDE.md` & `README.md`: Markdown files for agent/human instructions and project documentation.
- `eslint.config.mjs`: Configuration file for ESLint linting.
- `jsconfig.json`: JavaScript configuration for the Next.js project, setting up compiler options and path aliases.
- `next.config.mjs`: Next.js build and runtime configuration.
- `package.json` & `package-lock.json`: Defines npm dependencies (like `react`, `next`, `axios`, `react-force-graph-2d`, `tailwindcss`) and scripts (`dev`, `build`, etc.).
- `postcss.config.mjs`: PostCSS configuration for processing Tailwind CSS.

#### `/Frontend/ai-onto-globe/app/`
The Next.js App Router directory.
- `favicon.ico`: The application's favicon.
- `globals.css`: Global CSS file, notably integrating Tailwind CSS styles.
- `layout.js`: The root layout wrapper for the Next.js application, defining HTML structure and global metadata.
- `page.js`: The main dashboard page component. Handles state for input text, extracted graph data, the AI brief, and physics slider values. Manages API calls via the `lib/api.js` layer and orchestrates the child components.

#### `/Frontend/ai-onto-globe/components/`
Reusable React components.
- `CustomSlider.js`: A specialized slider input component used to control D3 graph physics parameters (like repulsion and link distance).
- `KnowledgeGraph.js`: The core visualization component. It dynamically imports `react-force-graph-2d` (to avoid SSR issues), maps node labels to dynamic colors, and hooks the React state into the D3 simulation engine to update forces (repulsion and link distance) in real-time.

#### `/Frontend/ai-onto-globe/lib/`
Utility libraries and API client wrappers.
- `api.js`: Wraps Axios to make API calls to the backend (`/api/extract` and `/api/insights`). Configured to use the `NEXT_PUBLIC_API_URL` environment variable or fallback to `http://127.0.0.1:8000`.

#### `/Frontend/ai-onto-globe/public/`
Static assets served directly by Next.js.
- `file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`: Various SVG icons and logos used within the project (standard Next.js boilerplate).

---
create prompt.md file in root folder containing everything, our main goal, complete project structure in detail including every file and folder (except node_modules), what is done in the project and what can it do, its capabilities and first read every file then define each file in detail about what it does and define each folder about what it does and in the end of the file copy this prompt

and create readme.md files, one for backend folder, one for frontend folder, one for root folder
readme in root folder hold the overview of the whole project
readme in frontend holds information about frontend and also how to setup and run frontend
readme in backend folder holds information about the frontend and also how to setup and run backend
