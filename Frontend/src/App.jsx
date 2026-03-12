import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Activity, Database, Zap, RefreshCw, 
  Info, AlertCircle, CheckCircle2, Globe, Server, 
  Layers, ChevronRight 
} from 'lucide-react';

/**
 * KnowledgeGraph Component
 * High-performance SVG-based force simulation for graph visualization.
 */
const KnowledgeGraph = ({ data }) => {
  const [nodes, setNodes] = useState([]);
  const [links, setLinks] = useState([]);

  useEffect(() => {
    if (!data.nodes || data.nodes.length === 0) return;

    // Initial positioning with controlled spread
    const initialNodes = data.nodes.map((node) => ({
      ...node,
      x: 400 + (Math.random() - 0.5) * 400,
      y: 300 + (Math.random() - 0.5) * 300,
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
        
        // 1. Repulsion Logic (Charge)
        for (let i = 0; i < newNodes.length; i++) {
          for (let j = i + 1; j < newNodes.length; j++) {
            const dx = newNodes[i].x - newNodes[j].x;
            const dy = newNodes[i].y - newNodes[j].y;
            const distSq = dx * dx + dy * dy || 1;
            const dist = Math.sqrt(distSq);
            const force = Math.min(600, 7500 / distSq);
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            newNodes[i].vx += fx;
            newNodes[i].vy += fy;
            newNodes[j].vx -= fx;
            newNodes[j].vy -= fy;
          }
        }

        // 2. Attraction Logic (Springs/Links)
        data.links?.forEach(link => {
          const source = newNodes.find(n => n.id === link.source);
          const target = newNodes.find(n => n.id === link.target);
          if (source && target) {
            const dx = target.x - source.x;
            const dy = target.y - source.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = (dist - 160) * 0.06;
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
          n.vx = (n.vx + gx) * 0.72;
          n.vy = (n.vy + gy) * 0.72;
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
                stroke="rgba(99, 102, 241, 0.25)"
                strokeWidth="2.5"
                strokeDasharray="4 2"
              />
              <text
                x={(s.x + t.x) / 2}
                y={(s.y + t.y) / 2 - 8}
                fill="rgba(148, 163, 184, 0.8)"
                className="text-[10px] font-bold select-none pointer-events-none uppercase tracking-widest"
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
  const [status, setStatus] = useState('Initializing network sync...');
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
      setStatus('Service Offline');
      if (graphData.nodes.length === 0) {
        setGraphData({
          nodes: [
            {id: "Intelligence", group: "Concept"}, 
            {id: "Neo4j Cluster", group: "Organization"}, 
            {id: "Global Hub", group: "Location"}
          ],
          links: [{source: "Intelligence", target: "Neo4j Cluster", label: "INDEXED_BY"}]
        });
      }
    }
  };

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleIngest = async (e) => {
    e.preventDefault();
    if (!topic || !isOnline) return;
    setLoading(true);
    setStatus('AI Pipeline extracting entities...');
    try {
      const res = await fetch(`${API_BASE}/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic })
      });
      const result = await res.json();
      if (res.ok) {
        setStatus('Knowledge Graph synchronized.');
        setTopic('');
        fetchData();
      } else { setStatus(`Error: ${result.error}`); }
    } catch (e) { setStatus('Connection error detected'); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex h-screen bg-[#020617] text-slate-200 font-sans overflow-hidden" style={{ display: 'flex' }}>
      {/* SIDEBAR CONTROL PANEL */}
      <aside 
        className="bg-[#070b14] border-r border-white/5 flex flex-col shadow-2xl z-30"
        style={{ width: '320px', height: '100vh', flexShrink: 0, overflowY: 'auto' }}
      >
        <div className="p-8 pb-10">
          <div className="flex items-center gap-4 mb-2" style={{ display: 'flex', alignItems: 'center' }}>
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-600/30">
              <Zap className="w-7 h-7 text-white" fill="currentColor" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter text-white leading-none italic uppercase">GRAPH.AI</h1>
              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-[0.2em] mt-2 underline decoration-indigo-500/50 underline-offset-4">Ontology Suite</p>
            </div>
          </div>
        </div>

        <div className="flex-1 px-8 space-y-12 flex flex-col" style={{ flexGrow: 1 }}>
          {/* Data Ingestion Module */}
          <div className="space-y-4">
            <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <Globe className="w-3.5 h-3.5" /> Intelligence Source
            </label>
            <form onSubmit={handleIngest} className="relative">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={isOnline ? "Search Topic..." : "Awaiting Connection"}
                disabled={!isOnline}
                className="w-full bg-slate-900/50 border border-white/10 rounded-2xl py-4 px-5 pr-14 focus:ring-2 focus:ring-indigo-500/50 outline-none text-sm transition-all disabled:opacity-30 placeholder:text-slate-600"
              />
              <button 
                type="submit"
                disabled={loading || !isOnline}
                className="absolute right-2 top-2 p-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all active:scale-95 disabled:opacity-40 shadow-xl shadow-indigo-600/20"
              >
                {loading ? <RefreshCw className="w-5 h-5 animate-spin text-white" /> : <Search className="w-5 h-5 text-white" />}
              </button>
            </form>
          </div>

          {/* Infrastructure Monitor */}
          <div className="space-y-4">
            <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <Server className="w-3.5 h-3.5" /> Core Monitoring
            </label>
            <div className={`p-5 rounded-2xl border flex flex-col gap-3 transition-all duration-500 ${isOnline ? 'bg-indigo-950/20 border-indigo-500/30' : 'bg-red-950/20 border-red-500/30'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-red-500'}`}></div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Network Status</span>
                </div>
                <Activity className={`w-4 h-4 ${isOnline ? 'text-indigo-400 opacity-60' : 'text-red-500'}`} />
              </div>
              <p className={`text-xs font-mono font-bold truncate p-2 bg-black/40 rounded-lg border border-white/5 ${isOnline ? 'text-emerald-400' : 'text-red-400 animate-pulse'}`}>
                {"> "} {status}
              </p>
            </div>
          </div>

          {/* Graph Analytics Module */}
          <div className="mt-auto space-y-4 pb-8">
            <div className="flex items-center justify-between px-1">
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Analytics Dashboard</span>
               <Layers className="w-3.5 h-3.5 text-slate-700" />
            </div>
            <div className="grid grid-cols-2 gap-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
               <div className="bg-slate-900/40 p-5 rounded-3xl border border-white/5 hover:border-indigo-500/30 transition-colors group">
                 <p className="text-3xl font-black text-white group-hover:text-indigo-400 transition-colors">{graphData.nodes.length}</p>
                 <p className="text-[10px] font-bold text-slate-500 uppercase mt-3 tracking-tighter">Entities</p>
               </div>
               <div className="bg-slate-900/40 p-5 rounded-3xl border border-white/5 hover:border-indigo-500/30 transition-colors group">
                 <p className="text-3xl font-black text-white group-hover:text-indigo-400 transition-colors">{graphData.links.length}</p>
                 <p className="text-[10px] font-bold text-slate-500 uppercase mt-3 tracking-tighter">Relationships</p>
               </div>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN VISUALIZATION VIEWPORT */}
      <main className="flex-1 relative bg-[#020617]" style={{ flexGrow: 1, position: 'relative' }}>
        {/* Dynamic Canvas Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:60px_60px] opacity-10 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>
        
        {/* Connection Badge */}
        <div className="absolute top-10 left-10 z-20">
          <div className="flex items-center gap-3 bg-slate-900/80 backdrop-blur-2xl px-6 py-3 rounded-3xl border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
             <Database className="w-4 h-4 text-indigo-400" />
             <span className="text-[12px] font-black uppercase tracking-widest text-slate-200">Neo4j AuraDB</span>
             <ChevronRight className="w-4 h-4 text-slate-700" />
             <span className="text-[10px] font-bold text-indigo-500 uppercase">Live Pipeline</span>
          </div>
        </div>

        {/* Graph Render Surface */}
        <div className="w-full h-full relative z-10">
          <KnowledgeGraph data={graphData} />
        </div>

        {/* Global Legend Module */}
        <div className="absolute bottom-10 right-10 p-8 bg-[#0a0f1d]/80 backdrop-blur-2xl rounded-[2.5rem] border border-white/5 shadow-2xl space-y-5 min-w-[220px] z-20">
          <div className="flex items-center gap-2 text-[11px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-4 mb-2">
            <Info className="w-4 h-4 text-indigo-500" /> Ontology Index
          </div>
          {[
            { label: 'Location', color: 'bg-emerald-500', shadow: 'shadow-emerald-500/50' },
            { label: 'Key Person', color: 'bg-amber-500', shadow: 'shadow-amber-500/50' },
            { label: 'Organization', color: 'bg-pink-500', shadow: 'shadow-pink-500/50' },
            { label: 'Concept / Event', color: 'bg-indigo-500', shadow: 'shadow-indigo-500/50' },
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