import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ForceGraph2D from 'react-force-graph-2d';
import { Search, Activity, Database, Loader2 } from 'lucide-react';

const BACKEND_URL = 'http://localhost:5000/api';

export default function App() {
  const [topic, setTopic] = useState('');
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('Enter a topic to build the knowledge graph.');
  const fgRef = useRef();

  // 1. Fetch existing graph data when the app loads
  useEffect(() => {
    fetchGraph();
  }, []);

  const fetchGraph = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/graph`);
      setGraphData(response.data);
    } catch (error) {
      console.error("Error fetching graph data:", error);
      setMessage("Backend se connect nahi ho pa raha bhai. Check if server is running.");
    }
  };

  // 2. Trigger Ingestion Pipeline (Pawan + Parth's code)
  const handleIngest = async (e) => {
    e.preventDefault();
    if (!topic) return;

    setLoading(true);
    setMessage(`Fetching global news for "${topic}" & extracting AI ontology...`);
    
    try {
      // This calls Parth's POST API
      await axios.post(`${BACKEND_URL}/ingest`, { topic });
      setMessage("Success! New intelligence added to the graph.");
      setTopic('');
      
      // Fetch the updated graph
      fetchGraph();
    } catch (error) {
      console.error("Ingestion error:", error);
      setMessage("Kuch gadbad ho gayi processing mein.");
    } finally {
      setLoading(false);
    }
  };

  // 3. Logic to color nodes based on their type
  const getNodeColor = (node) => {
    switch(node.group) {
      case 'Location': return '#3b82f6';     // Blue
      case 'Organization': return '#10b981'; // Green
      case 'Person': return '#f59e0b';       // Yellow
      case 'Concept': return '#ec4899';      // Pink
      default: return '#9ca3af';             // Gray
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-900 overflow-hidden text-white font-sans">
      
      {/* SIDEBAR */}
      <div className="w-80 bg-slate-800 border-r border-slate-700 p-6 flex flex-col z-10 shadow-xl">
        
        <div className="flex items-center gap-3 mb-8">
          <Activity className="text-blue-400 animate-pulse" size={32} />
          <h1 className="text-xl font-bold leading-tight tracking-tight">Global Ontology Engine</h1>
        </div>

        <form onSubmit={handleIngest} className="flex flex-col gap-4 mb-8">
          <div>
            <label className="text-sm font-semibold text-slate-400 mb-2 block uppercase tracking-wider">Analyze New Topic</label>
            <div className="relative">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Oil Prices, Taiwan..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg py-3 px-4 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow disabled:opacity-50"
                disabled={loading}
              />
              <Search className="absolute left-3 top-3.5 text-slate-500" size={18} />
            </div>
          </div>
          
          <button 
            type="submit" 
            disabled={loading || !topic}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-blue-500/25 active:scale-95 disabled:active:scale-100"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Database size={18} />}
            {loading ? 'Processing via AI...' : 'Ingest & Analyze'}
          </button>
        </form>

        <div className={`p-4 rounded-lg border text-sm transition-colors duration-300 ${message.includes('Success') ? 'bg-green-900/30 border-green-700/50 text-green-400' : message.includes('gadbad') || message.includes('Nahi') ? 'bg-red-900/30 border-red-700/50 text-red-400' : 'bg-slate-900 border-slate-700 text-slate-300'}`}>
          <p className="leading-relaxed">{message}</p>
        </div>

        <div className="mt-auto pt-6 border-t border-slate-700/50">
          <h3 className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-widest">Node Types</h3>
          <div className="flex flex-col gap-3 text-sm font-medium">
            <div className="flex items-center gap-3"><span className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></span> Location</div>
            <div className="flex items-center gap-3"><span className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span> Organization</div>
            <div className="flex items-center gap-3"><span className="w-3 h-3 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]"></span> Person</div>
            <div className="flex items-center gap-3"><span className="w-3 h-3 rounded-full bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.6)]"></span> Concept</div>
            <div className="flex items-center gap-3"><span className="w-3 h-3 rounded-full bg-slate-400 shadow-[0_0_8px_rgba(156,163,175,0.6)]"></span> Other</div>
          </div>
        </div>
      </div>

      {/* GRAPH CANVAS AREA */}
      <div className="flex-1 relative cursor-grab active:cursor-grabbing bg-[#0f172a]" style={{ backgroundImage: 'radial-gradient(circle at center, #1e293b 0%, #0f172a 100%)' }}>
        {graphData.nodes.length === 0 && !loading ? (
          <div className="absolute inset-0 flex items-center justify-center text-slate-500 font-medium tracking-wide">
            No data in the graph yet. Ingest a topic to start!
          </div>
        ) : (
          <ForceGraph2D
            ref={fgRef}
            graphData={graphData}
            nodeLabel="id"
            nodeColor={getNodeColor}
            nodeRelSize={6}
            linkColor={() => '#475569'}
            linkWidth={1.5}
            linkDirectionalArrowLength={4}
            linkDirectionalArrowRelPos={1}
            linkDirectionalParticles={2}
            linkDirectionalParticleSpeed={0.01}
            d3AlphaDecay={0.02}
            d3VelocityDecay={0.3}
            onNodeClick={(node) => {
              // Smooth zoom animation when a node is clicked!
              fgRef.current.centerAt(node.x, node.y, 1000);
              fgRef.current.zoom(8, 2000);
            }}
          />
        )}
      </div>
    </div>
  );
}