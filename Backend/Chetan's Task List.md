󰡷 **Chetan's Mission: Data & Integration Lead** 

**Project:** Global Ontology Engine 

**Goal:** Source the intelligence data, build the evidence pipeline, and ensure the frontend connects seamlessly to the backend APIs so the app feels like a true analyst tool. 
## 📝 **General Rules for Your Workflow** 
1. **Log Everything.** Whether you are building a React component or a Python API endpoint, add console.log() or logger.info(). If data fails to fetch or a panel doesn't open, we need to know exactly where the pipeline broke. 
1. **Focus on Provenance ("Show Your Work").** Palantir wins contracts because users trust the data. Every insight or graph node we show must eventually link back to a real article or dataset. 

🛠 **Step-by-Step Task Order** 
### **Task 1: Source the Intelligence Datasets (Priority: High)** 
**What it is:** Pawan is building an automated RAG (Retrieval-Augmented Generation) script, but he needs actual data sources to pull from. Since we are focusing on Finance/Blockchain and Geopolitics, we need reliable, free data. 

**How to execute:** 

1. Find a free News API (e.g., NewsAPI.org, GDELT, or a Crypto News API) that we can query for live articles. 
1. Get the API keys and figure out the exact endpoint URL to fetch 100 recent articles on a topic (like "DeFi Regulations" or "Red Sea Shipping"). 
1. Document the JSON structure of the API response and hand it over to Pawan so he can integrate it into his backend ingestion script. 
1. *Alternative:* If live APIs are too slow, find and download a static Kaggle CSV dataset of recent financial news and clean it up for us to use. 
### **Task 2: Build the Evidence/Provenance Panel (Priority: High)** 
**What it is:** A UI panel (likely on the right side under the AI brief) that lists the raw source articles. 

**How to build it:** 

1. Create a new React component: components/EvidencePanel.js. 
1. This panel should take an array of articles (title, snippet, URL) and render them as clean, 

   clickable cards. 

3. **The Magic Trick:** Wire this component up so that when a user clicks a specific Node in the graph (Parth can help you get the onNodeClick event), this panel filters the articles to only show the ones related to that node! 
3. *Log check:* console.log("Evidence Panel updated. Showing sources for node:", selectedNode.id) 
### **Task 3: Hook up the Search API (Priority: Medium)** 
**What it is:** Connecting Parth's frontend Search Bar to the actual data. **How to build it:** 

1. Work with Pawan to define a /api/search endpoint in FastAPI. 
1. Write the Axios fetch logic in lib/api.js on the frontend to call this endpoint when the user hits "Enter" in the search bar. 
1. Manage the React State in app/page.js to ensure that when the search results return, the graph and the Evidence Panel update simultaneously. 
1. *Log check:* console.log("Sending search query to backend:", query) 
### **Task 4: Bonus Static Data Integration (Priority: Low / Polish)** 
**What it is:** Adding structured data (like numbers) to our unstructured text graph. **How to execute:** 

1. Find a structured dataset (e.g., a CSV of Crypto Hacks containing "Target", "Amount Stolen", "Date"). 
1. Write a simple Python script to parse this CSV and convert it into Neo4j Cypher queries. 
1. Merge this structured data into our existing graph so that the AI nodes suddenly gain financial context! 
