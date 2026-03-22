# Frontend - Global Ontology Engine

This is the frontend component for the **Global Ontology Engine**, built on top of **Next.js** (App Router) and **React**. It serves as an interactive intelligence mapping dashboard, providing a seamless visual interface to extract, visualize, and analyze unstructured text into dynamic knowledge graphs.

## Capabilities

The frontend empowers users to interact with the backend API visually. It is built to:
- Accept raw intelligence text or news articles and submit them to the backend API.
- Render the resulting ontology (nodes and relationships) using an interactive 2D D3 force-directed graph (`react-force-graph-2d`).
- Dynamically style nodes based on category classification (via hashed color mapping).
- Provide real-time graph physics controls, allowing users to tweak D3 force parameters such as *Node Repulsion* and *Link Distance* via custom sliders.
- Request an AI-generated analyst brief (situational report) based on the extracted graph data context, along with highlighted risks.

## Setup & Run Instructions

### Prerequisites
- **Node.js** (v18.17.0 or higher recommended)
- **npm** (or yarn, pnpm, bun)
- A running instance of the **Backend** (see [Backend README](../Backend/README.md) for instructions)

### 1. Install Dependencies
Navigate into the `ai-onto-globe` folder and install the required npm packages:

```bash
cd ai-onto-globe
npm install
```

### 2. Environment Variables
Create a `.env.local` file in the `ai-onto-globe` directory. Specify the backend API URL:

```ini
# Fallback is http://127.0.0.1:8000
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

### 3. Running the Development Server
Start the Next.js development server:

```bash
npm run dev
```

The frontend application will compile and start. Once ready, open [http://localhost:3000](http://localhost:3000) in your web browser.

You can now submit raw text intelligence into the dashboard and see the graph extract in real-time. Make sure your Python backend is also running and correctly configured to process the requests!