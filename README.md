# Global Ontology Engine

## Overview
The **Global Ontology Engine** is an AI-powered intelligence mapping tool designed to extract real-time entities and their relationships from unstructured text (like news articles or intelligence briefs) and build a dynamic knowledge graph. It uses the Google Gemini Large Language Model (LLM) to extract structured data, stores the graph in a Neo4j database, and visualizes it interactively on a modern Next.js frontend. Users can also request AI-generated analyst briefs summarizing the situational context of the generated graphs.

## Project Structure
This repository contains two main components:
*   **[Backend (FastAPI & Neo4j)](./Backend/README.md)**: Handles the API endpoints, LLM extraction pipeline, database ingestion, and AI brief generation.
*   **[Frontend (Next.js & React Force Graph)](./Frontend/README.md)**: A responsive React application that provides a dashboard for text input, graph visualization (with adjustable D3 physics), and analyst brief requests.

For detailed setup and run instructions, please refer to the specific `README.md` files in their respective folders.