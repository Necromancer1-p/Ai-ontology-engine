"use client";
import React, { useRef, useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';

// This is the magic trick to stop Next.js from crashing during SSR!
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

const KnowledgeGraph = ({ data, repulsion = 30, linkDistance = 60, onNodeClick }) => {
  const containerRef = useRef(null);
  const fgRef = useRef(); 
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [hoverNode, setHoverNode] = useState(null);

  // Ensure the graph resizes to fit its container perfectly
  useEffect(() => {
    if (containerRef.current) {
      setDimensions({
        width: containerRef.current.offsetWidth,
        height: containerRef.current.offsetHeight
      });
    }
    
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- DYNAMIC COLOR HASHING ---
  const colorPalette = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', 
    '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', 
    '#06b6d4', '#84cc16', '#a855f7', '#f43f5e'
  ];

  const getNodeColor = (label) => {
    if (!label) return '#9ca3af'; 
    let hash = 0;
    for (let i = 0; i < label.length; i++) {
      hash = label.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colorPalette.length;
    return colorPalette[index];
  };

  // --- TASK 2: DEGREE CENTRALITY CALCULATION & SAFE FILTERING ---
  const graphData = useMemo(() => {
    const validNodeIds = new Set(data?.nodes?.map(n => n.id) || []);

    // Safely filter out any "orphan" edges (Fixed the .filter crash here)
    const safeLinks = (data?.edges || [])
      .filter(edge => validNodeIds.has(edge.source) && validNodeIds.has(edge.target))
      .map(edge => ({ ...edge, name: edge.type }));

    // Loop through edges and count connections (Degree Centrality)
    const edgeCounts = {};
    safeLinks.forEach(edge => {
      const sourceId = typeof edge.source === 'object' ? edge.source.id : edge.source;
      const targetId = typeof edge.target === 'object' ? edge.target.id : edge.target;
      
      edgeCounts[sourceId] = (edgeCounts[sourceId] || 0) + 1;
      edgeCounts[targetId] = (edgeCounts[targetId] || 0) + 1;
    });

    // Assign this count as a 'val' property to each node
    const processedNodes = data?.nodes?.map(node => {
      return { 
        ...node, 
        color: getNodeColor(node.label),
        val: edgeCounts[node.id] || 1 // Default to 1 so minor nodes don't vanish
      };
    }) || [];

    // Hackathon Log Checks
    const usaNodeValue = edgeCounts['USA'] || 0;
    console.log("Calculated Centrality. Node 'USA' has value:", usaNodeValue);
    
    if (processedNodes.length > 0) {
        const topNode = [...processedNodes].sort((a,b) => b.val - a.val)[0];
        console.log(`Hackathon Trace: Top connected node is '${topNode.name}' with value:`, topNode.val);
    }

    return { nodes: processedNodes, links: safeLinks };
  }, [data]);

  // --- REAL-TIME PHYSICS UPDATES ---

  useEffect(() => {
    if (fgRef.current) {
      // 1. Massively increase repulsion so nodes spread out
      fgRef.current.d3Force('charge').strength(-repulsion * 15).distanceMax(800);
      
      // 2. Dynamically calculate edge length based on the text length of the relationship
      fgRef.current.d3Force('link').distance(link => {
        const labelLength = link.name ? link.name.length : 0;
        // Base distance + 4.5 pixels per character to ensure text doesn't overlap nodes
        return linkDistance + (labelLength * 4.5);
      });

      fgRef.current.d3ReheatSimulation();
    }
  }, [repulsion, linkDistance, graphData]);

  return (
    <div ref={containerRef} className="w-full h-full bg-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-700">
      {graphData.nodes.length > 0 ? (
        <ForceGraph2D
          ref={fgRef} 
          width={dimensions.width}
          height={dimensions.height}
          graphData={graphData}
          nodeLabel="name"
          nodeColor="color"
          linkColor={() => 'rgba(255,255,255,0.2)'}
          linkDirectionalArrowLength={3.5}
          linkDirectionalArrowRelPos={1}
          
          // --- EDGE TEXT RENDERING ---
          linkCanvasObjectMode={() => 'after'}
          linkCanvasObject={(link, ctx, globalScale) => {
            const label = link.name;
            if (!label || !link.source || !link.target || typeof link.source !== 'object' || typeof link.target !== 'object') return;

            const start = link.source;
            const end = link.target;

            // Calculate middle point
            const textPos = Object.assign(...['x', 'y'].map(c => ({
              [c]: start[c] + (end[c] - start[c]) / 2 
            })));

            const relLink = { x: end.x - start.x, y: end.y - start.y };
            let textAngle = Math.atan2(relLink.y, relLink.x);
            // Maintain label upright
            if (textAngle > Math.PI / 2) textAngle = -(Math.PI - textAngle);
            if (textAngle < -Math.PI / 2) textAngle = -(-Math.PI - textAngle);

            const fontSize = 3.5;
            ctx.font = `${fontSize}px Sans-Serif`;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.save();
            ctx.translate(textPos.x, textPos.y);
            ctx.rotate(textAngle);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, 0, -2); // Offset slightly above the line
            ctx.restore();
          }}
          
          // TASK 4: HOVER STATE TRACKING
          onNodeHover={(node) => {
            setHoverNode(node);
            if (node) {
              console.log("Canvas Interaction: User hovered over node ->", node.name);
            }
          }}

          // TASK 2: NODE CLICK — triggers Evidence Panel filter
          onNodeClick={(node) => {
            console.log("Canvas Interaction: User clicked node ->", node.name, "| id:", node.id);
            if (onNodeClick) onNodeClick(node);
          }}
          
          // CUSTOM CANVAS DRAWING FOR SOLID NODES + EXTERNAL TEXT
          nodeCanvasObject={(node, ctx, globalScale) => {
            const label = node.name || "";
            
            // INCREASED NODE SIZE: Multiply centrality by a larger factor so hubs visually dominate
            const radius = 5 + ((node.val || 1) * 1.5);

            // 1. Draw the solid circular node using its assigned color
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
            ctx.fillStyle = node.color; 
            ctx.fill();

            // TASK 4: PREMIUM HOVER EFFECT (White Circular Ring)
            if (node === hoverNode) {
              ctx.beginPath();
              ctx.arc(node.x, node.y, radius + 2.5, 0, 2 * Math.PI, false);
              ctx.strokeStyle = '#ffffff'; 
              ctx.lineWidth = 1.5; 
              ctx.stroke();
            }

            // 2. Draw the text slightly below the node
            const fontSize = 4.5; // Fixed size in canvas units
            ctx.font = `${fontSize}px Sans-Serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            
            // Add a subtle dark background behind text so the connecting lines do not cut through it
            const textWidth = ctx.measureText(label).width;
            ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
            ctx.fillRect(node.x - textWidth / 2 - 1, node.y + radius + 1, textWidth + 2, fontSize + 2);

            // Draw the actual text label
            ctx.fillStyle = '#e2e8f0'; // Tailwind slate-200
            ctx.fillText(label, node.x, node.y + radius + 2);

            // Store the radius for the pointer area hover detection
            node.__radius = radius; 
          }}
          
          // UPDATE POINTER AREA TO MATCH NEW RADIUS
          nodePointerAreaPaint={(node, color, ctx) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(node.x, node.y, node.__radius || 5, 0, 2 * Math.PI, false);
            ctx.fill();
          }}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
          <svg className="w-16 h-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
          </svg>
          <p className="text-lg">No graph data available.</p>
          <p className="text-sm">Submit text to generate the intelligence map.</p>
        </div>
      )}
    </div>
  );
};

export default KnowledgeGraph;