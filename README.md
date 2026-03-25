# Global Ontology Engine

## Project Overview

The **Global Ontology Engine** is an AI-powered intelligence mapping application designed to extract real-time entities and relationships from raw text inputs (such as news articles, situational reports, or intelligence briefs) and build dynamic knowledge graphs.

Using Google's Gemini Large Language Model (via the `google-genai` SDK), the engine structurally parses text into a precise node-and-edge ontology. This structured data is then ingested into a Neo4j graph database.

A modern, reactive dashboard built with Next.js connects to the backend API, allowing users to:
1. Input unstructured text and immediately visualize the extracted ontology via an interactive, physics-based D3 force graph.
2. Fetch live news using the GDELT DOC API and visualize the extracted intelligence as a graph.
3. Dynamically adjust the graph's rendering parameters, such as node repulsion and link distance, to explore complex entity relationships.
4. Request an AI-generated situational analyst brief summarizing the extracted intelligence landscape, complete with identified risks.
5. Trace evidence and source provenance directly from extracted entities to their original news articles or datasets.
6. Monitor a live stream of critical alerts generated from the intelligence mapping.

## Repository Structure

This repository is organized into two main components:

- **[Backend](./Backend/README.md)**: A FastAPI application that orchestrates the integration between the Google Gemini LLM, the Neo4j database, and the GDELT news API. It exposes RESTful APIs for extraction, insights, search, and news fetching. It also includes standalone ingestion scripts for processing large JSON or CSV datasets.
- **[Frontend](./Frontend/README.md)**: A Next.js (React) application built with Tailwind CSS and `react-force-graph-2d`. It serves as the primary user interface for submitting data, visualizing graphs, tracing provenance, and requesting insights.

## Project Capabilities
- **Automated Entity Extraction**: Dynamically identifies key nodes (e.g., people, organizations, locations, threats) and their explicit relationships from unstructured data.
- **Graph Storage & Search**: Persistently stores extracted ontologies in a Neo4j AuraDB graph database for complex querying and long-term intelligence gathering.
- **Interactive Visualization**: Presents the data dynamically using an interactive 2D graph with customizable D3.js physics properties.
- **AI Analyst Briefs**: Uses the extracted graph context to generate concise, multi-paragraph situational reports and risk assessments.
- **Live News Integration**: Automatically pulls current events from global news media (via GDELT) and transforms them into extractable text corpuses.
- **Bulk Data Processing**: Facilitates the batch ingestion of large text datasets (`sample_data.json`) or structured CSV files (`crypto_hacks.csv`) with built-in scripts.
- **Provenance Tracking**: Links nodes and edges back to their source URLs and titles, allowing users to verify intelligence via the "Evidence Panel".

Please refer to the specific `README.md` files in the `Backend` and `Frontend` directories for detailed setup, configuration, and execution instructions.