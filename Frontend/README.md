# Frontend - Global Ontology Engine

This is the frontend component of the **Global Ontology Engine**. It is a **Next.js** React application styled with **Tailwind CSS**. It provides an interactive dashboard where users can submit raw intelligence texts, watch real-time extraction of knowledge graphs using a powerful **Google Gemini** LLM, visualize dynamic node and relationship topologies with adjustable **D3.js force physics** (via `react-force-graph-2d`), and request AI-generated analyst briefs based on the extracted situational context. Nodes on the graph are mapped dynamically with color hashes to specific entity type labels (like `Organization`, `Country`, etc).

## Capabilities
- Extract unstructured intelligence reports via a fast text-area interface.
- Vizualize a live force-directed 2D Knowledge Graph of nodes and relationships.
- Adjust D3.js physics in real-time using node repulsion and link distance custom sliders.
- Generate an AI Analyst Brief from the extracted graph context.
- Fallbacks to handle SSR errors during graph rendering and connection issues.

## Setup & Run Instructions

### Prerequisites
- **Node.js** (v18+ recommended)
- **npm** (Node Package Manager)

### 1. Install Dependencies
Navigate into the `ai-onto-globe` folder and install all NPM packages required for the project.

```bash
cd Frontend/ai-onto-globe
npm install
```

### 2. Environment Variables
Create a `.env.local` file inside `Frontend/ai-onto-globe` to configure the API endpoint URL for your local or production FastAPI backend.

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```
*(If this variable is missing, the frontend will default to `http://127.0.0.1:8000` via its Axios API configuration.)*

### 3. Running the Next.js Development Server
Start the frontend development server:

```bash
npm run dev
```

The application will be accessible at [http://localhost:3000](http://localhost:3000) or whichever local port Next.js automatically assigns. Open your browser to begin exploring the ontology engine dashboard.

---
## Note about the Backend
The frontend relies heavily on the FastAPI server located in the `../Backend` directory for the heavy lifting (connecting to the **Neo4j** graph database and querying the **Gemini** LLM). Ensure the backend is running correctly and correctly configured with its environment keys before attempting to extract any graph structures or generate insights. Please refer to the [Backend README](../Backend/README.md) for full server-side deployment and ingestion setup documentation.