# Global Ontology Engine - Frontend

## Overview

The Frontend component of the **Global Ontology Engine** is a modern, responsive web application built with **Next.js** and **React**. It serves as the interactive dashboard for the intelligence mapping platform, allowing users to:

1. **Input Raw Data:** Paste raw text (news, reports) into an interface for backend LLM processing.
2. **Fetch Live News:** Search for topics to pull live data from the GDELT DOC API and process it instantly.
3. **Interactive Visualization:** View extracted knowledge graphs in a 2D canvas utilizing `react-force-graph-2d` and D3.js physics.
4. **Graph Controls:** Adjust physics parameters like node repulsion and link distance dynamically via sliders.
5. **Insights & Analytics:** Generate AI-powered analyst briefs summarizing the current situation based on graph context.
6. **Provenance Tracking:** View source information and article evidence attached to specific nodes and edges using an interactive Evidence Panel.
7. **Search & Filtering:** Search for nodes locally or via backend calls to the Neo4j database, and filter nodes by auto-generated LLM entity categories.

## Key Technologies
- **Framework:** [Next.js](https://nextjs.org/) (App Router)
- **UI & Styling:** [Tailwind CSS](https://tailwindcss.com/), [Lucide React](https://lucide.dev/) (Icons)
- **Visualization:** `react-force-graph-2d`
- **Data Fetching:** Axios

## Setup & Installation

### Prerequisites
- Node.js (v18.x or later)
- npm or yarn
- The Backend API must be running for full functionality.

### Installation Steps

1. Navigate to the frontend application directory:
   ```bash
   cd ai-onto-globe
   ```

2. Install the necessary dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables:
   Create a `.env.local` file in the `ai-onto-globe` directory and specify the URL of the Backend API.
   ```env
   NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
   ```
   *(If omitted, the API service defaults to `http://127.0.0.1:8000`)*

## Running the Application

Start the development server:

```bash
npm run dev
```

The application will typically be available at [http://localhost:3000](http://localhost:3000).

## Building for Production

To create an optimized production build:

```bash
npm run build
npm start
```
