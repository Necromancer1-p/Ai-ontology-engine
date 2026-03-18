import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import axios from 'axios';
import ForceGraph2D from 'react-force-graph-2d';
import {
  Search, Activity, Loader2, X, Globe, Network,
  RefreshCw, Crosshair, Eye, EyeOff, Zap, Brain,
  TrendingUp, Layers, Sparkles, ArrowRight, ChevronRight,
  Clock, AlertCircle, CheckCircle2, Database
} from 'lucide-react';

const BACKEND_URL = 'http://localhost:5000/api';

// Node type color palette (solid colors for canvas rendering)
const NODE_COLORS = {
  Person:       { solid: '#ec4899', glow: 'rgba(236, 72, 153, 0.6)',  label: '#f9a8d4' },
  Organization: { solid: '#3b82f6', glow: 'rgba(59, 130, 246, 0.6)',  label: '#93c5fd' },
  Country:      { solid: '#06b6d4', glow: 'rgba(6, 182, 212, 0.6)',   label: '#67e8f9' },
  Location:     { solid: '#10b981', glow: 'rgba(16, 185, 129, 0.6)',  label: '#6ee7b7' },
  Concept:      { solid: '#f59e0b', glow: 'rgba(245, 158, 11, 0.6)',  label: '#fcd34d' },
  Technology:   { solid: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.6)', label: '#c4b5fd' },
  default:      { solid: '#6b7280', glow: 'rgba(107, 114, 128, 0.5)', label: '#d1d5db' },
};

const DEMO_GRAPH = {
  nodes: [
    { id: 'United States', group: 'Country', importance: 10 },
    { id: 'China', group: 'Country', importance: 10 },
    { id: 'Russia', group: 'Country', importance: 8 },
    { id: 'Ukraine', group: 'Country', importance: 6 },
    { id: 'Taiwan', group: 'Location', importance: 7 },
    { id: 'Japan', group: 'Country', importance: 8 },
    { id: 'NVIDIA', group: 'Organization', importance: 9 },
    { id: 'TSMC', group: 'Organization', importance: 8 },
    { id: 'Apple', group: 'Organization', importance: 9 },
    { id: 'Google', group: 'Organization', importance: 9 },
    { id: 'Microsoft', group: 'Organization', importance: 9 },
    { id: 'Joe Biden', group: 'Person', importance: 8 },
    { id: 'Xi Jinping', group: 'Person', importance: 9 },
    { id: 'Jensen Huang', group: 'Person', importance: 7 },
    { id: 'Semiconductors', group: 'Technology', importance: 10 },
    { id: 'AI', group: 'Technology', importance: 10 },
    { id: 'Cybersecurity', group: 'Technology', importance: 8 },
    { id: 'Trade War', group: 'Concept', importance: 8 },
    { id: 'Supply Chain', group: 'Concept', importance: 7 },
  ],
  links: [
    { source: 'United States', target: 'China', label: 'COMPETES_WITH', strength: 8 },
    { source: 'United States', target: 'Taiwan', label: 'PROTECTS', strength: 9 },
    { source: 'China', target: 'Taiwan', label: 'CLAIMS', strength: 8 },
    { source: 'Russia', target: 'Ukraine', label: 'CONFLICTS_WITH', strength: 10 },
    { source: 'NVIDIA', target: 'TSMC', label: 'PARTNERS_WITH', strength: 8 },
    { source: 'NVIDIA', target: 'Semiconductors', label: 'PRODUCES', strength: 9 },
    { source: 'TSMC', target: 'Taiwan', label: 'LOCATED_IN', strength: 7 },
    { source: 'Apple', target: 'TSMC', label: 'SUPPLIES_FROM', strength: 8 },
    { source: 'Google', target: 'AI', label: 'INVESTS_IN', strength: 9 },
    { source: 'Microsoft', target: 'AI', label: 'INVESTS_IN', strength: 9 },
    { source: 'Joe Biden', target: 'United States', label: 'LEADS', strength: 8 },
    { source: 'Xi Jinping', target: 'China', label: 'LEADS', strength: 9 },
    { source: 'Jensen Huang', target: 'NVIDIA', label: 'CEO_OF', strength: 7 },
    { source: 'Semiconductors', target: 'AI', label: 'ENABLES', strength: 10 },
    { source: 'China', target: 'Trade War', label: 'INVOLVED_IN', strength: 8 },
    { source: 'Supply Chain', target: 'Semiconductors', label: 'AFFECTS', strength: 7 },
    { source: 'Japan', target: 'United States', label: 'ALLIED_WITH', strength: 8 },
  ],
};

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────
function getNodePalette(group) {
  return NODE_COLORS[group] || NODE_COLORS.default;
}

function lighten(hex, amount) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amount));
  const b = Math.max(0, Math.min(255, (num & 0xff) + amount));
  return `rgb(${r},${g},${b})`;
}

function getNodeRadius(node, graphLinks) {
  const connections = graphLinks.filter(
    l => l.source === node.id || l.target === node.id ||
         (l.source?.id === node.id) || (l.target?.id === node.id)
  ).length;
  // Moderate size: big enough to read, small enough to not block links
  const imp = (node.importance || 5) * 0.6;
  return Math.max(12, Math.min(22, 12 + connections * 0.8 + imp));
}

// ────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────

function StatChip({ icon: Icon, value, label, color }) {
  return (
    <div className="stat-chip">
      <Icon size={13} style={{ color }} />
      <span className="stat-value" style={{ color }}>{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

function MessageBar({ message }) {
  const isSuccess = message.includes('complete') || message.includes('success') || message.includes('activated') || message.includes('loaded');
  const isError   = message.includes('fail') || message.includes('error') || message.includes('unable');
  const cls = isSuccess ? 'success' : isError ? 'error' : 'info';
  const Icon = isSuccess ? CheckCircle2 : isError ? AlertCircle : Activity;
  return (
    <div className={`msg-bar ${cls}`}>
      <Icon size={13} style={{ flexShrink: 0 }} />
      <span style={{ fontSize: '0.8rem' }}>{message}</span>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Main App
// ────────────────────────────────────────────────────────────
export default function App() {
  const [topic, setTopic] = useState('');
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('Ready. Enter a topic or load the demo.');
  const [selectedNode, setSelectedNode] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [searchHistory, setSearchHistory] = useState([]);
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });
  const fgRef = useRef(null);
  const graphContainerRef = useRef(null);

  // ── Responsive dims ──
  useEffect(() => {
    function update() {
      if (graphContainerRef.current) {
        const rect = graphContainerRef.current.getBoundingClientRect();
        setDimensions({ w: rect.width, h: rect.height });
      }
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // ── Do NOT auto-fetch on mount — user must trigger ingestion or demo
  // useEffect(() => { fetchGraph(); }, []);

  // ── Inject d3 collision force to prevent node overlap ──
  useEffect(() => {
    if (!fgRef.current || graphData.nodes.length === 0) return;
    const fg = fgRef.current;

    // Remove center gravity (pulls nodes to center, fighting repulsion)
    fg.d3Force('x', null);
    fg.d3Force('y', null);

    // d3-force requires a FUNCTION (not object) with an .initialize property
    let _nodes = [];
    const collide = function(alpha) {
      for (let i = 0; i < _nodes.length; i++) {
        for (let j = i + 1; j < _nodes.length; j++) {
          const a = _nodes[i], b = _nodes[j];
          if (!isFinite(a.x) || !isFinite(b.x)) continue;
          const dx = b.x - a.x, dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const minDist = getNodeRadius(a, graphData.links) + getNodeRadius(b, graphData.links) + 40;
          if (dist < minDist) {
            const push = ((minDist - dist) / dist) * alpha * 0.5;
            const mx = dx * push, my = dy * push;
            b.vx = (b.vx || 0) + mx;  b.vy = (b.vy || 0) + my;
            a.vx = (a.vx || 0) - mx;  a.vy = (a.vy || 0) - my;
          }
        }
      }
    };
    collide.initialize = (nodes) => { _nodes = nodes; };

    fg.d3Force('collision', collide);
    fg.d3ReheatSimulation();

    // Auto zoom to fit after simulation settles
    setTimeout(() => fg.zoomToFit(800, 80), 3500);
  }, [graphData]);

  const fetchGraph = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/graph`);
      if (response.data?.nodes?.length > 0) {
        setGraphData(response.data);
        setMessage(`Graph loaded — ${response.data.nodes.length} entities, ${response.data.links.length} relationships`);
      } else {
        setMessage('No data in database yet. Try ingesting a topic!');
      }
    } catch {
      setMessage('Cannot connect to backend. Load demo to explore.');
    }
  };

  const loadDemoGraph = useCallback(() => {
    setIsDemoMode(true);
    setSelectedNode(null);
    setGraphData(DEMO_GRAPH);
    setMessage(`Demo loaded — ${DEMO_GRAPH.nodes.length} entities, ${DEMO_GRAPH.links.length} relationships`);
  }, []);

  const handleIngest = useCallback(async (e) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setLoading(true);
    setIsDemoMode(false);
    setSelectedNode(null);
    setMessage(`Analyzing: "${topic}"…`);
    try {
      await axios.post(`${BACKEND_URL}/ingest`, { topic });
      setSearchHistory(prev => [topic, ...prev.filter(t => t !== topic)].slice(0, 6));
      setTopic('');
      setMessage('Analysis complete! Refreshing graph…');
      await fetchGraph();
      setTimeout(() => fgRef.current?.zoomToFit(800, 60), 600);
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      setMessage(`Error: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [topic]);

  // ── Zoom-to-fit (fixed reload) ──
  const handleZoomFit = useCallback(() => {
    fgRef.current?.zoomToFit(500, 60);
  }, []);

  const handleCenter = useCallback(() => {
    fgRef.current?.centerAt(0, 0, 600);
    fgRef.current?.zoom(1.2, 600);
  }, []);

  // ── Node interactions ──
  const handleNodeClick = useCallback((node) => {
    setSelectedNode(prev => prev?.id === node.id ? null : node);
    fgRef.current?.centerAt(node.x, node.y, 600);
    fgRef.current?.zoom(3.5, 700);
  }, []);

  // ── Highlight neighbours on hover ──
  // KEY FIX: use a stable Set for dimmed IDs rather than spreading nodes.
  // Spreading nodes creates NEW object references every hover change, which
  // resets the force simulation positions (graph flies around).
  const dimmedNodeIds = useMemo(() => {
    if (!hoveredNode) return null;
    const connected = new Set([hoveredNode.id]);
    graphData.links.forEach(l => {
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      if (s === hoveredNode.id || t === hoveredNode.id) {
        connected.add(s); connected.add(t);
      }
    });
    // Return the IDs that should be DIMMED (not connected)
    const dimmed = new Set(graphData.nodes.map(n => n.id).filter(id => !connected.has(id)));
    return dimmed;
  }, [graphData, hoveredNode]);

  const dimmedLinkIds = useMemo(() => {
    if (!hoveredNode) return null;
    const active = new Set();
    graphData.links.forEach((l, i) => {
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      if (s === hoveredNode.id || t === hoveredNode.id) active.add(i);
    });
    return active;
  }, [graphData, hoveredNode]);

  // Pass graphData directly — NO spreading. Use dimmedNodeIds in drawNode instead.
  const processedGraph = graphData;

  // ── Stats ──
  const stats = useMemo(() => {
    const types = {};
    graphData.nodes.forEach(n => { types[n.group] = (types[n.group] || 0) + 1; });
    return {
      nodes: graphData.nodes.length,
      links: graphData.links.length,
      types: Object.keys(types).length,
    };
  }, [graphData]);

  // ── Relationships for selected node ──
  const selectedRels = useMemo(() => {
    if (!selectedNode) return [];
    return graphData.links
      .filter(l => {
        const s = typeof l.source === 'object' ? l.source.id : l.source;
        const t = typeof l.target === 'object' ? l.target.id : l.target;
        return s === selectedNode.id || t === selectedNode.id;
      })
      .map(l => {
        const s = typeof l.source === 'object' ? l.source.id : l.source;
        const t = typeof l.target === 'object' ? l.target.id : l.target;
        return {
          peer: s === selectedNode.id ? t : s,
          label: l.label,
          strength: l.strength || 5,
          isSource: s === selectedNode.id,
        };
      })
      .sort((a, b) => b.strength - a.strength);
  }, [selectedNode, graphData]);

  // ── Canvas node renderer ──
  const drawNode = useCallback((node, ctx, globalScale) => {
    // Guard: skip if coordinates aren't ready yet (prevents createRadialGradient crash)
    if (!isFinite(node.x) || !isFinite(node.y)) return;

    const palette = getNodePalette(node.group);
    const r = getNodeRadius(node, graphData.links);
    // Use dimmedNodeIds set instead of node._dim spread (avoids position reset)
    const isDimmed = dimmedNodeIds ? dimmedNodeIds.has(node.id) : false;
    const dim = isDimmed ? 0.2 : 1;
    const isSelected = selectedNode?.id === node.id;
    const isHovered = hoveredNode?.id === node.id;

    ctx.save();
    ctx.globalAlpha = dim;

    // Subtle glow ONLY — keep it tight so links between nodes stay visible
    if (!isDimmed && (isSelected || isHovered || !dimmedNodeIds)) {
      const haloR = r * 1.35; // much smaller than before (was r*2.2)
      const grad = ctx.createRadialGradient(node.x, node.y, r * 0.8, node.x, node.y, haloR);
      grad.addColorStop(0, palette.glow);
      grad.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(node.x, node.y, haloR, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    }

    // Outer ring (selected/hover)
    if (selectedNode?.id === node.id) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, r + 4, 0, Math.PI * 2);
      ctx.strokeStyle = palette.solid;
      ctx.lineWidth = 2.5 / globalScale;
      ctx.stroke();
    }

    // ── Node fill with gradient ──
    const nodeGrad = ctx.createRadialGradient(
      node.x - r * 0.3, node.y - r * 0.3, 0,
      node.x, node.y, r
    );
    nodeGrad.addColorStop(0, lighten(palette.solid, 55));
    nodeGrad.addColorStop(0.6, palette.solid);
    nodeGrad.addColorStop(1, lighten(palette.solid, -30));
    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
    ctx.fillStyle = nodeGrad;
    ctx.fill();

    // Soft border
    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,255,255,${isDimmed ? 0.05 : 0.2})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Inner shine
    ctx.beginPath();
    ctx.arc(node.x - r * 0.3, node.y - r * 0.3, r * 0.32, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fill();

    // ── Label BELOW the node (never truncated awkwardly) ──
    if (showLabels && !isDimmed) {
      const fontSize = Math.max(9, Math.min(13, r * 0.45));
      ctx.font = `600 ${fontSize}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      const labelY = node.y + r + 5;
      const label = node.id;
      const textWidth = ctx.measureText(label).width;
      const padX = 5;
      const padY = 3;
      const boxW = textWidth + padX * 2;
      const boxH = fontSize + padY * 2;

      // Pill background for readability
      ctx.fillStyle = 'rgba(3, 7, 18, 0.75)';
      ctx.beginPath();
      const bx = node.x - boxW / 2;
      const by = labelY;
      const br = boxH / 2;
      ctx.moveTo(bx + br, by);
      ctx.arcTo(bx + boxW, by, bx + boxW, by + boxH, br);
      ctx.arcTo(bx + boxW, by + boxH, bx, by + boxH, br);
      ctx.arcTo(bx, by + boxH, bx, by, br);
      ctx.arcTo(bx, by, bx + boxW, by, br);
      ctx.closePath();
      ctx.fill();

      // Label text
      ctx.fillStyle = '#f0f6ff';
      ctx.shadowColor = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur = 2;
      ctx.fillText(label, node.x, labelY + padY);
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }, [graphData.links, showLabels, selectedNode, dimmedNodeIds, hoveredNode]);


  const linkColor = useCallback((link) => {
    if (hoveredNode) {
      const s = typeof link.source === 'object' ? link.source.id : link.source;
      const t = typeof link.target === 'object' ? link.target.id : link.target;
      if (s === hoveredNode.id || t === hoveredNode.id) return 'rgba(56, 189, 248, 1)';
      return 'rgba(148, 163, 184, 0.08)';
    }
    // Always visible base color — bright enough to see clearly
    const str = link.strength || 5;
    const opacity = 0.45 + (str / 10) * 0.4;
    return `rgba(148, 163, 184, ${opacity})`;
  }, [hoveredNode]);

  const linkWidth = useCallback((link) => {
    if (hoveredNode) {
      const s = typeof link.source === 'object' ? link.source.id : link.source;
      const t = typeof link.target === 'object' ? link.target.id : link.target;
      if (s === hoveredNode.id || t === hoveredNode.id) return 3;
      return 0.4;
    }
    // Always visible width
    const str = link.strength || 5;
    return 1.2 + (str / 10) * 1.2;
  }, [hoveredNode]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', position: 'relative', overflow: 'hidden', background: 'var(--bg-deep)' }}>

      {/* ── Aurora background ── */}
      <div className="bg-aurora">
        <div className="aurora-blob aurora-blob-1" />
        <div className="aurora-blob aurora-blob-2" />
        <div className="aurora-blob aurora-blob-3" />
        <div className="aurora-blob aurora-blob-4" />
      </div>
      <div className="bg-grid" />

      {/* ════════════════════════════════
          TOP NAVBAR
      ════════════════════════════════ */}
      <header style={{
        position: 'relative', zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '0.5rem',
        padding: '0 1.5rem', minHeight: '60px', flexShrink: 0,
        background: 'rgba(3, 7, 18, 0.80)', borderBottom: '1px solid var(--border)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
          <div style={{
            padding: '0.4rem', borderRadius: '10px', flexShrink: 0,
            background: 'linear-gradient(135deg, #1d4ed8, #7c3aed)',
            boxShadow: '0 0 20px rgba(59,130,246,0.4)',
          }}>
            <Brain size={18} color="#fff" />
          </div>
          <div style={{ minWidth: 0 }}>
            <h1 className="animate-gradient" style={{ fontSize: '1rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', fontFamily: 'Space Grotesk, Inter, sans-serif', whiteSpace: 'nowrap' }}>
              Global Intelligence Engine
            </h1>
            <p style={{ fontSize: '0.62rem', color: 'var(--text-muted)', margin: 0, letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
              AI-Powered Ontology Platform
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
          <StatChip icon={Globe}    value={stats.nodes} label="Entities"  color="#3b82f6" />
          <StatChip icon={Network}  value={stats.links} label="Relations" color="#06b6d4" />
          <StatChip icon={Layers}   value={stats.types} label="Types"     color="#8b5cf6" />
          {isDemoMode && (
            <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#fcd34d', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '999px', padding: '0.2rem 0.65rem', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
              DEMO
            </span>
          )}
        </div>
      </header>

      {/* ════════════════════════════════
          MAIN AREA
      ════════════════════════════════ */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative', zIndex: 1 }}>

        {/* ── LEFT SIDEBAR ── */}
        <aside style={{
          width: '300px', flexShrink: 0,
          background: 'rgba(3, 7, 18, 0.72)',
          borderRight: '1px solid var(--border)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          display: 'flex', flexDirection: 'column',
        }}>
          <div className="sidebar-body">

            {/* INTELLIGENCE ANALYSIS section */}
            <div>
              <p className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Zap size={11} /> Intelligence Analysis
              </p>
              <form onSubmit={handleIngest} style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={15} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  <input
                    className="search-input"
                    type="text"
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    placeholder="AI competition, Geopolitics…"
                    disabled={loading}
                  />
                </div>
                <button className="btn-primary" type="submit" disabled={loading || !topic.trim()}>
                  {loading
                    ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Analyzing…</>
                    : <><Zap size={15} /> Launch Analysis</>
                  }
                </button>
              </form>
            </div>

            {/* Demo button */}
            <button className="btn-outline" onClick={loadDemoGraph}>
              <Sparkles size={14} /> Load Demo Network
            </button>

            {/* Status */}
            <MessageBar message={message} />

            {/* Search history */}
            {searchHistory.length > 0 && (
              <div>
                <p className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Clock size={11} /> Recent Searches
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {searchHistory.map((item, i) => (
                    <button key={i} className="history-tag" onClick={() => setTopic(item)}>
                      <ChevronRight size={10} />{item}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Legend */}
            <div>
              <p className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Database size={11} /> Entity Types
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem' }}>
                {Object.entries(NODE_COLORS).filter(([k]) => k !== 'default').map(([type, pal]) => (
                  <div key={type} className="legend-item">
                    <div className="legend-dot" style={{ background: pal.solid, color: pal.solid, boxShadow: `0 0 8px ${pal.glow}` }} />
                    {type}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar footer − graph controls */}
          <div className="sidebar-footer">
            <p className="section-title" style={{ marginBottom: '0.6rem' }}>Graph Controls</p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn-icon" onClick={handleZoomFit} title="Zoom to Fit" style={{ flex: 1 }}>
                <RefreshCw size={15} />
              </button>
              <button className="btn-icon" onClick={handleCenter} title="Center View" style={{ flex: 1 }}>
                <Crosshair size={15} />
              </button>
              <button className={`btn-icon ${showLabels ? 'active' : ''}`} onClick={() => setShowLabels(v => !v)} title="Toggle Labels" style={{ flex: 1 }}>
                {showLabels ? <Eye size={15} /> : <EyeOff size={15} />}
              </button>
              {selectedNode && (
                <button className="btn-icon" onClick={() => setSelectedNode(null)} title="Close Panel" style={{ flex: 1 }}>
                  <X size={15} />
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* ── GRAPH CANVAS AREA ── */}
        <main
          ref={graphContainerRef}
          style={{
            flex: 1, position: 'relative', overflow: 'hidden',
            cursor: 'grab',
          }}
        >
          {/* Empty state */}
          {graphData.nodes.length === 0 && !loading && (
            <div className="empty-state">
              <div style={{
                padding: '1.5rem', borderRadius: '24px',
                background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.15))',
                border: '1px solid rgba(99,179,237,0.2)',
                boxShadow: '0 0 60px rgba(59,130,246,0.12)',
              }}>
                <Network size={52} color="#3b82f6" />
              </div>
              <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 0.5rem', color: 'var(--text-primary)' }}>
                  Intelligence Network Ready
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                  Launch an analysis or load the demo to start mapping
                </p>
              </div>
              <button className="btn-primary" style={{ width: 'auto', padding: '0.75rem 1.75rem' }} onClick={loadDemoGraph}>
                <Sparkles size={15} /> Load Demo Network
              </button>
            </div>
          )}

          {/* Force Graph */}
          {graphData.nodes.length > 0 && dimensions.w > 0 && (
            <ForceGraph2D
              ref={fgRef}
              width={dimensions.w - (selectedNode ? 360 : 0)}
              height={dimensions.h}
              graphData={processedGraph}
              nodeCanvasObject={drawNode}
              nodeCanvasObjectMode={() => 'replace'}
              nodePointerAreaPaint={(node, color, ctx) => {
                if (!isFinite(node.x) || !isFinite(node.y)) return;
                const r = getNodeRadius(node, graphData.links);
                ctx.beginPath();
                ctx.arc(node.x, node.y, r + 6, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.fill();
              }}
              linkColor={linkColor}
              linkWidth={linkWidth}
              linkDirectionalArrowLength={7}
              linkDirectionalArrowRelPos={0.85}
              linkDirectionalParticles={3}
              linkDirectionalParticleSpeed={0.005}
              linkDirectionalParticleWidth={3}
              linkDirectionalParticleColor={() => 'rgba(99,179,237,0.9)'}
              d3AlphaDecay={0.008}
              d3VelocityDecay={0.1}
              d3LinkDistance={400}
              d3ChargeStrength={-3500}
              onNodeHover={setHoveredNode}
              onNodeClick={handleNodeClick}
              onBackgroundClick={() => setSelectedNode(null)}
              enableNodeDrag={true}
              enableZoomInteraction={true}
              enablePanInteraction={true}
              warmupTicks={250}
              cooldownTicks={200}
              backgroundColor="transparent"
            />
          )}

          {/* ── RIGHT ENTITY DETAIL PANEL ── */}
          <div
            className={`entity-panel glass-panel ${selectedNode ? 'visible' : 'hidden'}`}
            style={{ zIndex: 5 }}
          >
            {selectedNode && (
              <div style={{ padding: '1.5rem', height: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '14px', height: '14px', borderRadius: '50%', flexShrink: 0,
                      background: getNodePalette(selectedNode.group).solid,
                      boxShadow: `0 0 14px ${getNodePalette(selectedNode.group).glow}`,
                    }} />
                    <div>
                      <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                        {selectedNode.id}
                      </h2>
                      <span style={{
                        fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.08em',
                        textTransform: 'uppercase', color: getNodePalette(selectedNode.group).label,
                      }}>
                        {selectedNode.group}
                      </span>
                    </div>
                  </div>
                  <button className="btn-icon" onClick={() => setSelectedNode(null)}>
                    <X size={14} />
                  </button>
                </div>

                {/* Importance */}
                {selectedNode.importance && (
                  <div style={{
                    padding: '0.75rem 1rem', borderRadius: '10px',
                    background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                  }}>
                    <TrendingUp size={14} color="#f59e0b" />
                    <span style={{ fontSize: '0.8rem', color: '#fcd34d', fontWeight: 600 }}>
                      Priority Score: {selectedNode.importance}/10
                    </span>
                  </div>
                )}

                {/* Relationships */}
                <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                  <p className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Network size={11} /> {selectedRels.length} Connections
                  </p>
                  {selectedRels.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No relationships found.</p>
                  ) : (
                    selectedRels.map((rel, i) => (
                      <div key={i} className="rel-card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {rel.peer}
                          </span>
                          <ArrowRight size={12} color="var(--text-muted)" />
                          <span style={{
                            fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em',
                            background: 'linear-gradient(135deg, #1d4ed8, #0891b2)',
                            color: 'white', padding: '0.2rem 0.55rem', borderRadius: '6px',
                          }}>
                            {rel.label}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.4rem' }}>
                          <div style={{ flex: 1, height: '3px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)' }}>
                            <div style={{
                              height: '100%', borderRadius: '999px',
                              width: `${rel.strength * 10}%`,
                              background: 'linear-gradient(90deg, #3b82f6, #06b6d4)',
                            }} />
                          </div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            {rel.strength}/10
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
