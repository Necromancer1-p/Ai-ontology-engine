"use client";

import { useState, useMemo } from 'react';
import { extractGraphData, getInsights, searchGraph, fetchNewsGraph } from '../lib/api';
import KnowledgeGraph from '../components/KnowledgeGraph';
import CustomSlider from '../components/CustomSlider';
import AlertStream from '../components/AlertStream';
import EvidencePanel from '../components/EvidencePanel';
import { Network, BrainCircuit, Activity, AlertCircle, Loader2, SlidersHorizontal, Search, Filter, Rss } from 'lucide-react';

// --- DYNAMIC COLOR HASHING FOR LEGEND ---
const colorPalette = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', 
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', 
  '#06b6d4', '#84cc16', '#a855f7', '#f43f5e'
];

const getLabelColor = (label) => {
  if (!label) return '#9ca3af';
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = label.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colorPalette.length;
  return colorPalette[index];
};

export default function Home() {
  const [inputText, setInputText] = useState("");
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [brief, setBrief] = useState("");
  
  // --- SEARCH & FILTER STATES ---
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [isSearchingBackend, setIsSearchingBackend] = useState(false);

  // --- GRAPH PHYSICS STATE ---
  const [repulsion, setRepulsion] = useState(30);
  const [linkDistance, setLinkDistance] = useState(40);
  
  // --- TASK 1: NEWS STATE ---
  const [newsTopic, setNewsTopic] = useState("");
  const [articles, setArticles] = useState([]);
  const [isFetchingNews, setIsFetchingNews] = useState(false);

  // --- TASK 2: EVIDENCE PANEL STATE ---
  const [selectedNode, setSelectedNode] = useState(null);

  // Loading states
  const [isExtracting, setIsExtracting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState("");

  // ---- HANDLERS ----

  const handleExtract = async () => {
    if (!inputText.trim()) {
      setError("Please enter some text to analyze.");
      return;
    }
    setIsExtracting(true);
    setError("");
    setBrief("");
    setSelectedNode(null);
    
    try {
      const result = await extractGraphData(inputText);
      if (result.status === 'success' && result.data) {
        setGraphData(result.data);
      } else {
        setError("Failed to parse graph data from the response.");
      }
    } catch (err) {
      setError("An error occurred while extracting entities. Check your backend logs.");
      console.error(err);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleGenerateBrief = async () => {
    if (graphData.nodes.length === 0) return;
    setIsAnalyzing(true);
    setError("");
    try {
      const contextData = JSON.stringify(graphData);
      const result = await getInsights("Current Intelligence Graph Situation", contextData);
      if (result.status === 'success') {
        setBrief(result.brief);
      } else {
        setError("Failed to generate brief.");
      }
    } catch (err) {
      setError("An error occurred while generating the brief.");
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // TASK 1: Fetch Live News from GDELT and extract graph
  const handleFetchNews = async () => {
    const topic = newsTopic.trim() || inputText.trim();
    if (!topic) {
      setError("Please enter a topic or paste text above first.");
      return;
    }
    setIsFetchingNews(true);
    setError("");
    setBrief("");
    setSelectedNode(null);

    try {
      console.log(`[page.js] Fetching live news for topic: "${topic}"`);
      const result = await fetchNewsGraph(topic, 10);

      if (result.status === 'success') {
        if (result.data?.nodes?.length > 0) {
          setGraphData(result.data);
        }
        if (result.articles?.length > 0) {
          setArticles(result.articles);
          console.log(`[page.js] Loaded ${result.articles.length} articles into Evidence Panel.`);
        }
      } else {
        setError("News fetch succeeded but returned unexpected data.");
      }
    } catch (err) {
      setError("Failed to fetch live news. Check that the backend is running.");
      console.error(err);
    } finally {
      setIsFetchingNews(false);
    }
  };

  // Extract unique labels for dropdown
  const uniqueLabels = Array.from(new Set(graphData.nodes.map(n => n.label))).filter(Boolean);

  // TASK 3: Search bar change handler — local filter
  const handleSearchChange = (e) => {
    const value = e.target.value;
    console.log("Search query updated by user:", value);
    setSearchQuery(value);
  };

  // TASK 3: Hit Enter in search bar → call /api/search on the backend
  const handleSearchKeyDown = async (e) => {
    if (e.key !== 'Enter') return;
    const query = searchQuery.trim();
    if (!query) return;

    console.log(`[page.js] Sending search query to backend: "${query}"`);
    setIsSearchingBackend(true);
    setError("");
    setSelectedNode(null);

    try {
      const result = await searchGraph(query);
      if (result.status === 'success' && result.data?.nodes?.length > 0) {
        setGraphData(result.data);
        console.log(`[page.js] Graph updated from backend search. Nodes: ${result.data.nodes.length}`);
      } else {
        // If backend search found nothing, fall back to local filtering (already handled by filteredGraphData)
        console.log("[page.js] Backend search returned no results. Using local filter.");
      }
    } catch (err) {
      console.error("[page.js] Backend search failed, falling back to local filter.", err);
    } finally {
      setIsSearchingBackend(false);
    }
  };

  const handleCategoryChange = (e) => {
    const value = e.target.value;
    console.log("Filter category changed by user to:", value);
    setFilterCategory(value);
  };

  // TASK 2: Node click handler — fires Evidence Panel filter
  const handleNodeClick = (node) => {
    console.log(`Evidence Panel updated. Showing sources for node: ${node.id}`);
    setSelectedNode(prev => (prev?.id === node.id ? null : node)); // toggle on second click
  };

  // Local filtering logic (applied on top of whatever graphData state holds)
  const filteredGraphData = useMemo(() => {
    console.log("Filtering graph for:", searchQuery, "Category:", filterCategory);
    if (!graphData.nodes || graphData.nodes.length === 0) return graphData;

    const filteredNodes = graphData.nodes.filter(node => {
      const matchesSearch = !searchQuery || node.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = filterCategory === "All" || node.label === filterCategory;
      return matchesSearch && matchesCategory;
    });

    const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredEdges = (graphData.edges || []).filter(edge => {
      const sourceId = typeof edge.source === 'object' ? edge.source.id : edge.source;
      const targetId = typeof edge.target === 'object' ? edge.target.id : edge.target;
      return filteredNodeIds.has(sourceId) && filteredNodeIds.has(targetId);
    });

    console.log(`Filtering complete. Showing ${filteredNodes.length} nodes and ${filteredEdges.length} edges.`);
    return { nodes: filteredNodes, edges: filteredEdges };
  }, [graphData, searchQuery, filterCategory]);


  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8 font-sans">
      <header className="mb-8 flex items-center gap-3 border-b border-slate-800 pb-4">
        <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/30">
          <Network className="w-8 h-8 text-blue-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            Global Ontology Engine
          </h1>
          <p className="text-slate-500 text-sm">Real-time Entity Extraction &amp; Intelligence Mapping</p>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
        
        {/* Left Column: Controls & Text Input */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          
          {/* Input Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-400" />
              Raw Intelligence Feed
            </h2>
            <textarea
              className="w-full h-40 bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none mb-3 placeholder-slate-600"
              placeholder="Paste news articles, situational reports, or intelligence briefs here..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            
            <button
              onClick={handleExtract}
              disabled={isExtracting}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-lg transition-all flex justify-center items-center gap-2 mb-3"
            >
              {isExtracting ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Processing Graph...</>
              ) : (
                <><Network className="w-5 h-5" /> Extract Knowledge Graph</>
              )}
            </button>

            {/* TASK 1: Live News Fetch */}
            <div className="border-t border-slate-800 pt-3">
              <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                <Rss className="w-3.5 h-3.5 text-emerald-400" />
                Or fetch live news from GDELT (free, no API key)
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Topic (e.g. DeFi Regulations)..."
                  value={newsTopic}
                  onChange={(e) => setNewsTopic(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleFetchNews()}
                  className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  onClick={handleFetchNews}
                  disabled={isFetchingNews}
                  className="px-3 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded text-sm font-medium transition-all flex items-center gap-1.5"
                >
                  {isFetchingNews ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rss className="w-4 h-4" />}
                  {isFetchingNews ? "Fetching..." : "Fetch"}
                </button>
              </div>
            </div>

            {error && (
              <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2 text-red-400 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}
          </div>

          {/* AI Brief Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-purple-400" />
              AI Analyst Brief
            </h2>
            
            <button
              onClick={handleGenerateBrief}
              disabled={isAnalyzing || graphData.nodes.length === 0}
              className="w-full py-2 px-4 mb-4 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-lg transition-all flex justify-center items-center gap-2"
            >
              {isAnalyzing ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing...</>
              ) : (
                "Generate Brief from Graph"
              )}
            </button>

            <div className="bg-slate-950 border border-slate-700 rounded-lg p-4 h-52 overflow-y-auto text-sm text-slate-300">
              {brief ? (
                <div className="whitespace-pre-wrap leading-relaxed">{brief}</div>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-600 italic">
                  Extract a graph first, then generate an AI brief.
                </div>
              )}
            </div>
          </div>

          {/* TASK 2: Evidence Panel */}
          <EvidencePanel articles={articles} selectedNode={selectedNode} />

          {/* Graph Physics Controls */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-emerald-400" />
              Graph Physics
            </h2>
            <CustomSlider 
              label="Node Repulsion" 
              min={10} 
              max={150} 
              step={5} 
              value={repulsion} 
              onChange={setRepulsion} 
            />
            <CustomSlider 
              label="Link Distance" 
              min={10} 
              max={150} 
              step={5} 
              value={linkDistance} 
              onChange={setLinkDistance} 
            />
          </div>

          {/* Alert Stream Panel */}
          <AlertStream nodes={filteredGraphData.nodes} />

        </div>

        {/* Right Column: The Graph Visualization */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
            <h2 className="text-lg font-semibold flex items-center gap-2 whitespace-nowrap">
              <Network className="w-5 h-5 text-emerald-400" />
              Ontology Visualization
              <span className="ml-2 text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded-md">
                Nodes: {filteredGraphData.nodes.length} | Edges: {filteredGraphData.edges.length}
              </span>
            </h2>

            {/* TASK 3: Search and Filter UI */}
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <div className="relative">
                {isSearchingBackend ? (
                  <Loader2 className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-400 animate-spin" />
                ) : (
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" />
                )}
                <input 
                  type="text" 
                  placeholder="Search entities (Enter = query DB)..." 
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onKeyDown={handleSearchKeyDown}
                  className="w-full sm:w-56 pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all shadow-inner"
                />
              </div>
              <div className="relative">
                <Filter className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" />
                <select 
                  value={filterCategory}
                  onChange={handleCategoryChange}
                  className="w-full sm:w-40 pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all shadow-inner appearance-none"
                >
                  <option value="All">All Categories</option>
                  {uniqueLabels.map(label => (
                    <option key={label} value={label}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          <div className="flex-1 rounded-lg overflow-hidden border border-slate-700 relative min-h-[500px]">
            {/* TASK 2: Pass onNodeClick to KnowledgeGraph */}
            <KnowledgeGraph 
              data={filteredGraphData} 
              repulsion={repulsion} 
              linkDistance={linkDistance}
              onNodeClick={handleNodeClick}
            />
            
            {uniqueLabels.length > 0 && (
              <div className="absolute bottom-4 left-4 bg-slate-950/80 backdrop-blur-sm border border-slate-700 p-3 rounded-lg flex flex-col gap-2 text-xs max-h-48 overflow-y-auto custom-scrollbar">
                <div className="text-slate-400 font-semibold mb-1 border-b border-slate-700 pb-1">Entity Types</div>
                {uniqueLabels.map((label) => (
                  <div key={label} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full shrink-0" 
                      style={{ backgroundColor: getLabelColor(label) }}
                    ></div> 
                    <span className="truncate max-w-[120px]" title={label}>{label}</span>
                  </div>
                ))}
              </div>
            )}

            {/* TASK 2: Selected Node badge */}
            {selectedNode && (
              <div className="absolute top-4 right-4 bg-slate-950/90 backdrop-blur-sm border border-amber-500/40 text-amber-300 text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-md">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                Evidence filtered: <strong>{selectedNode.name}</strong>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="ml-1 text-amber-500 hover:text-white transition-colors"
                  title="Clear selection"
                >✕</button>
              </div>
            )}
          </div>
        </div>
        
      </main>
    </div>
  );
}