# Global Ontology Engine

## Project Overview

The **Global Ontology Engine** is an AI-powered intelligence mapping application designed to extract real-time entities and relationships from raw text inputs (such as news articles, situational reports, or intelligence briefs) and build dynamic knowledge graphs.

Using Google's Gemini Large Language Model (via the `google-genai` SDK), the engine structurally parses text into a precise node-and-edge ontology. This structured data is then ingested into a Neo4j graph database.

A modern, reactive dashboard built with Next.js connects to the backend API, allowing users to:
1. Input unstructured text and immediately visualize the extracted ontology via an interactive, physics-based D3 force graph.
2. Dynamically adjust the graph's rendering parameters, such as node repulsion and link distance, to explore complex entity relationships.
3. Request an AI-generated situational analyst brief summarizing the extracted intelligence landscape, complete with identified risks.

## Repository Structure

This repository is organized into two main components:

- **[Backend](./Backend/README.md)**: A FastAPI application that orchestrates the integration between the Google Gemini LLM and the Neo4j database. It exposes RESTful APIs for extraction and brief generation, and includes a standalone ingestion script for processing large datasets.
- **[Frontend](./Frontend/README.md)**: A Next.js (React) application built with Tailwind CSS and `react-force-graph-2d`. It serves as the primary user interface for submitting data, visualizing graphs, and requesting insights.

## Project Capabilities
- **Automated Entity Extraction**: Dynamically identifies key nodes (e.g., people, organizations, locations) and their explicit relationships from unstructured data.
- **Graph Storage**: Persistently stores extracted ontologies in a Neo4j AuraDB graph database for complex querying and long-term intelligence gathering.
- **Interactive Visualization**: Presents the data dynamically using an interactive 2D graph with customizable D3.js physics properties.
- **AI Analyst Briefs**: Uses the extracted graph context to generate concise, multi-paragraph situational reports and risk assessments.
- **Bulk Data Processing**: Facilitates the batch ingestion of large text datasets using built-in scripts with API rate-limit protections.

Please refer to the specific `README.md` files in the `Backend` and `Frontend` directories for detailed setup, configuration, and execution instructions.