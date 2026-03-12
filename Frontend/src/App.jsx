import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Activity, Database, Zap, RefreshCw, 
  Info, AlertCircle, CheckCircle2, Globe, Server, 
  Layers, ChevronRight, Share2
} from 'lucide-react';

/**
 * KnowledgeGraph Component
 * Optimized for high-density visualization and stable layout.
 */
const KnowledgeGraph = ({ data }) => {
  const [nodes, setNodes] = useState([]);
  const [links, setLinks] = useState([]);

  useEffect(() => {
    if (!data.nodes || data.nodes.length === 0) {
      setNodes([]);
      setLinks([]);
      return;
    }

    const initialNodes = data.nodes.map((node) => ({
      ...node,
      x: 400 + (Math.random() - 0.5) * 300,
      y: 300 + (Math.random() - 0.5) * 200,
      vx: 0,
      vy: 0
    }));

    setNodes(initialNodes);
    setLinks(data.links || []);

    let animationFrame;
    const simulate = () => {
      setNodes(prevNodes => {
        if (prevNodes.length === 0) return prevNodes;
        const newNodes = prevNodes.map(n => ({ ...n }));
        
        // 1. Repulsion
        for (let i = 0; i < newNodes.length; i++) {
          for (let j = i + 1; j < newNodes.length; j++) {
            const dx = newNodes[i].x - newNodes[j].x;
            const dy = newNodes[i].y - newNodes[j].y;
            const distSq = dx * dx + dy * dy || 1;
            const dist = Math.sqrt(distSq);
            const force = Math.min(800, 8000 / distSq);
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            newNodes[i].vx += fx;
            newNodes[i].vy += fy;
            newNodes[j].vx -= fx;
            newNodes[j].vy -= fy;
          }
        }

        // 2. Attraction
        data.links?.forEach(link => {
          const source = newNodes.find(n => n.id === link.source);
          const target = newNodes.find(n => n.id === link.target);
          if (source && target) {
            const dx = target.x - source.x;
            const dy = target.y - source.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = (dist - 140) * 0.06;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            source.vx += fx;
            source.vy += fy;
            target.vx -= fx;
            target.vy -= fy;
          }
        });

        // 3. Central Gravity & Friction
        newNodes.forEach(n => {
          const gx = (400 - n.x) * 0.05;
          const gy = (300 - n.y) * 0.05;
          n.vx = (n.vx + gx) * 0.7;
          n.vy = (n.vy + gy) * 0.7;
          n.x += n.vx;
          n.y += n.vy;
        });

        return newNodes;
      });
      animationFrame = requestAnimationFrame(simulate);
    };

    simulate();
    return () => cancelAnimationFrame(animationFrame);
  }, [data]);

  return (
    <div className="w-full h-full bg-transparent overflow-hidden">
      <svg width="100%" height="100%" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid meet">
        <defs>
          <filter id="nodeGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="blur" />
            <feFlood floodColor="currentColor" floodOpacity="0.6" result="glowColor" />
            <feComposite in="glowColor" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        
        {links.map((link, i) => {
          const s = nodes.find(n => n.id === link.source);
          const t = nodes.find(n => n.id === link.target);
          if (!s || !t) return null;
          return (
            <g key={`link-${i}`}>
              <line
                x1={s.x} y1={s.y}
                x2={t.x} y2={t.y}
                stroke="rgba(79, 70, 229, 0.3)"
                strokeWidth="2"
                strokeDasharray="4 2"
              />
              <text
                x={(s.x + t.x) / 2}
                y={(s.y + t.y) / 2 - 8}
                fill="rgba(148, 163, 184, 0.8)"
                className="text-[10px] font-bold select-none pointer-events-none"
                textAnchor="middle"
              >
                {link.label}
              </text>
            </g>
          );
        })}

        {nodes.map((node, i) => {
          const color = node.group === 'Location' ? '#10b981' : 
                        node.group === 'Person' ? '#f59e0b' : 
                        node.group === 'Organization' ? '#ec4899' : '#6366f1';
          return (
            <g key={`node-${i}`} transform={`translate(${node.x},${node.y})`} className="cursor-pointer group">
              <circle 
                r="16" 
                fill={color} 
                className="opacity-20 animate-pulse"
                style={{ color: color }}
                filter="url(#nodeGlow)"
              />
              <circle 
                r="10" 
                fill={color} 
                className="stroke-slate-950 stroke-[3px] transition-transform group-hover:scale-125"
              />
              <text
                dy="-24"
                textAnchor="middle"
                className="fill-white text-[13px] font-black tracking-tight select-none pointer-events-none"
                style={{ textShadow: '0 2px 10px rgba(0,0,0,1)' }}
              >
                {node.id}
              </text>
              <text
                dy="28"
                textAnchor="middle"
                className="fill-slate-500 text-[10px] font-bold uppercase tracking-[0.15em] select-none pointer-events-none"
              >
                {node.group}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default function App() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('Checking connectivity...');
  const [isOnline, setIsOnline] = useState(false);

  const API_BASE = "http://localhost:5000/api";

  const fetchData = async () => {
    try {
      const response = await fetch(`${API_BASE}/graph`);
      if (!response.ok) throw new Error();
      const data = await response.json();
      setGraphData(data);
      setIsOnline(true);
      setStatus('System Operational');
    } catch (err) {
      setIsOnline(false);
      setStatus('Backend Service Offline');
      if (graphData.nodes.length === 0) {
        setGraphData({
          nodes: [
            {id: "USA", group: "Location"},
            {id: "Gemini", group: "Concept"},
            {id: "Google", group: "Organization"},
            {id: "India", group: "Location"}
          ],
          links: [
            {source: "Google", target: "Gemini", label: "DEVELOPS"},
            {source: "Gemini", target: "USA", label: "HOSTED_IN"},
            {source: "Gemini", target: "India", label: "SERVES"}
          ]
        });
      }
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleIngest = async (e) => {
    e.preventDefault();
    if (!topic || !isOnline) return;
    setLoading(true);
    setStatus('AI Brain Processing...');
    try {
      const res = await fetch(`${API_BASE}/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic })
      });
      if (res.ok) {
        setStatus('Ontology Enhanced!');
        setTopic('');
        fetchData();
      } else { setStatus('Ingestion Failed'); }
    } catch (e) { setStatus('Connection Lost'); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex h-screen bg-[#020617] text-slate-100 font-sans overflow-hidden">
      {/* Refined Sidebar */}
      <aside className="w-80 flex-shrink-0 bg-[#070b14] border-r border-white/5 flex flex-col shadow-2xl z-30 overflow-hidden">
        <div className="p-8 pb-10">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-600/30">
              <Zap className="w-7 h-7 text-white" fill="currentColor" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter text-white leading-none">GRAPH.AI</h1>
              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-[0.2em] mt-2">Ontology Suite</p>
            </div>
          </div>
        </div>

        <div className="flex-1 px-8 space-y-10 overflow-y-auto pb-10">
          {/* Source Ingestion */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <Globe className="w-3.5 h-3.5" /> Intelligence Source
              </label>
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-red-500'}`}></div>
            </div>
            <form onSubmit={handleIngest} className="relative group">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={isOnline ? "Enter topic (e.g. OpenAI)..." : "Launch Backend First"}
                disabled={!isOnline}
                className="w-full bg-slate-900/50 border border-white/10 rounded-2xl py-4 px-5 pr-14 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none text-sm transition-all disabled:opacity-30 placeholder:text-slate-600"
              />
              <button 
                type="submit"
                disabled={loading || !isOnline}
                className="absolute right-2 top-2 p-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all active:scale-95 disabled:opacity-40 shadow-xl shadow-indigo-600/20"
              >
                {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              </button>
            </form>
          </div>

          {/* Status Monitor */}
          <div className="space-y-4">
            <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <Server className="w-3.5 h-3.5" /> Console Stream
            </label>
            <div className="bg-black/40 border border-white/5 p-4 rounded-2xl font-mono text-[11px] leading-relaxed shadow-inner">
              <div className="flex items-center gap-2 mb-2 text-indigo-400 opacity-60">
                <Activity className="w-3 h-3" />
                <span>Live Feed</span>
              </div>
              <p className={isOnline ? 'text-emerald-400' : 'text-red-400 animate-pulse'}>
                {"> "} {status}
              </p>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="space-y-4">
            <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <Layers className="w-3.5 h-3.5" /> Discovery Stats
            </label>
            <div className="grid grid-cols-2 gap-4">
               <div className="bg-slate-900/40 p-5 rounded-3xl border border-white/5 hover:border-indigo-500/30 transition-colors group">
                 <p className="text-3xl font-black text-white leading-none group-hover:text-indigo-400 transition-colors">{graphData.nodes.length}</p>
                 <p className="text-[10px] font-bold text-slate-500 uppercase mt-3 tracking-tighter">Entities</p>
               </div>
               <div className="bg-slate-900/40 p-5 rounded-3xl border border-white/5 hover:border-indigo-500/30 transition-colors group">
                 <p className="text-3xl font-black text-white leading-none group-hover:text-indigo-400 transition-colors">{graphData.links.length}</p>
                 <p className="text-[10px] font-bold text-slate-500 uppercase mt-3 tracking-tighter">Relations</p>
               </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Viewport Area */}
      <main className="flex-1 relative bg-[#020617] z-10">
        {/* Cinematic Grid Backdrop */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:60px_60px] opacity-10 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>
        
        {/* Status Badge */}
        <div className="absolute top-10 left-10 z-20">
          <div className="flex items-center gap-3 bg-slate-900/80 backdrop-blur-2xl px-6 py-3 rounded-3xl border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
             <Database className="w-4 h-4 text-indigo-400" />
             <span className="text-[12px] font-black uppercase tracking-widest text-slate-200">Neo4j AuraDB</span>
             <ChevronRight className="w-4 h-4 text-slate-700" />
             <span className="text-[10px] font-bold text-indigo-500 uppercase">Live Cluster</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="absolute top-10 right-10 z-20">
          <button onClick={() => fetchData()} className="p-3 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition-all active:scale-90 backdrop-blur-lg">
            <RefreshCw className={`w-5 h-5 text-slate-400 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>

        {/* The Graph Canvas */}
        <div className="w-full h-full">
          <KnowledgeGraph data={graphData} />
        </div>

        {/* Legend Dashboard */}
        <div className="absolute bottom-10 right-10 p-8 bg-[#0a0f1d]/80 backdrop-blur-2xl rounded-[2.5rem] border border-white/5 shadow-2xl space-y-5 min-w-[200px]">
          <div className="flex items-center gap-2 text-[11px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-4 mb-2">
            <Info className="w-4 h-4 text-indigo-500" /> Key Index
          </div>
          {[
            { label: 'Location', color: 'bg-emerald-500', shadow: 'shadow-emerald-500/50' },
            { label: 'Person', color: 'bg-amber-500', shadow: 'shadow-amber-500/50' },
            { label: 'Organization', color: 'bg-pink-500', shadow: 'shadow-pink-500/50' },
            { label: 'Concept', color: 'bg-indigo-500', shadow: 'shadow-indigo-500/50' },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center gap-4">
              <div className={`w-3 h-3 rounded-full ${item.color} shadow-lg ${item.shadow}`}></div>
              <span className="text-[13px] font-semibold text-slate-400">{item.label}</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}