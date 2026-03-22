"use client";
import React, { useRef, useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';

// This is the magic trick to stop Next.js from crashing during SSR!
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

const KnowledgeGraph = ({ data, repulsion = 30, linkDistance = 40 }) => {
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
  // --- THE SAFETY FILTER ---
  // 1. Create a fast-lookup Set of all the valid Node IDs the AI actually gave us
  const validNodeIds = new Set(data?.nodes?.map(n => n.id) || []);

  const graphData = {
    nodes: data?.nodes?.map(node => ({ ...node, color: getNodeColor(node.label) })) || [],
    
    // 2. Filter out any "orphan" edges where the source or target node doesn't exist!
    links: data?.edges?
      .filter(edge => validNodeIds.has(edge.source) && validNodeIds.has(edge.target))
      .map(edge => ({ ...edge, name: edge.type })) || [] 
  };

  useEffect(() => {
    if (fgRef.current) {
      fgRef.current.d3Force('charge').strength(-repulsion);
      fgRef.current.d3Force('link').distance(linkDistance);
      fgRef.current.d3ReheatSimulation();
    }
  }, [repulsion, linkDistance, graphData]);

  return (
    <div ref={containerRef} className="w-full h-full min-h-[500px] bg-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-700">
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
          
          // TASK 4: HOVER STATE TRACKING
          onNodeHover={(node) => {
            setHoverNode(node);
            if (node) {
              console.log("Canvas Interaction: User hovered over node ->", node.name);
            }
          }}
          
          // CUSTOM CANVAS DRAWING
          nodeCanvasObject={(node, ctx, globalScale) => {
            const label = node.name;
            
            // Centrality visually applied here: scale font based on node.val
            const scaledFontSize = (10 + ((node.val || 1) * 2)) / globalScale; 
            
            ctx.font = `${scaledFontSize}px Sans-Serif`;
            const textWidth = ctx.measureText(label).width;
            const bckgDimensions = [textWidth, scaledFontSize].map(n => n + scaledFontSize * 0.2); 

            // Draw the main dark node background
            ctx.fillStyle = 'rgba(15, 23, 42, 0.9)'; 
            ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, ...bckgDimensions);

            // TASK 4: PREMIUM HOVER EFFECT (White Ring)
            if (node === hoverNode) {
              ctx.strokeStyle = '#ffffff'; 
              ctx.lineWidth = 2 / globalScale; 
              ctx.strokeRect(
                node.x - bckgDimensions[0] / 2 - 2, 
                node.y - bckgDimensions[1] / 2 - 2, 
                bckgDimensions[0] + 4, 
                bckgDimensions[1] + 4
              );
            }

            // Draw the node text
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = node.color;
            ctx.fillText(label, node.x, node.y);

            node.__bckgDimensions = bckgDimensions; 
          }}
          
          nodePointerAreaPaint={(node, color, ctx) => {
            ctx.fillStyle = color;
            const bckgDimensions = node.__bckgDimensions;
            bckgDimensions && ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, ...bckgDimensions);
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