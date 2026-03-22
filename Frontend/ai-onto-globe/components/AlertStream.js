"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Radio } from 'lucide-react';

export default function AlertStream({ nodes }) {
  const [alerts, setAlerts] = useState([]);
  const scrollRef = useRef(null);

  useEffect(() => {
    // If there are no nodes to pick from, do nothing.
    if (!nodes || nodes.length === 0) return;

    // Set up the interval to pop a random node every 3 seconds 
    const interval = setInterval(() => {
      // Pick a random node from the provided data
      const randomNode = nodes[Math.floor(Math.random() * nodes.length)];
      
      // TASK 3 EXACT LOG CHECK
      console.log("Firing new simulated alert for:", randomNode.name);

      const newAlert = {
        id: Date.now() + Math.random(),
        time: new Date().toLocaleTimeString(),
        entity: randomNode.name,
        category: randomNode.label || "Entity"
      };

      // Add to the list, but keep only the last 20 so it doesn't crash the browser memory
      setAlerts(prev => [...prev.slice(-19), newAlert]);
    }, 3000);

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, [nodes]); // Re-run if the nodes data changes

  // Auto-scroll to the bottom whenever a new alert arrives
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [alerts]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col h-64">
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-emerald-400">
        <Radio className="w-5 h-5 animate-pulse" />
        Live Signal Intercepts
      </h2>
      
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto custom-scrollbar bg-slate-950 border border-slate-700 rounded-lg p-3 space-y-2"
      >
        {alerts.length === 0 ? (
          <div className="text-slate-600 italic text-sm h-full flex items-center justify-center">
            Awaiting intelligence feed...
          </div>
        ) : (
          alerts.map(alert => (
            <div key={alert.id} className="text-xs border-l-2 border-emerald-500 pl-2 py-1 bg-emerald-500/10 rounded-r animate-fade-in">
              <span className="text-slate-500 mr-2 font-mono">[{alert.time}]</span>
              <span className="text-emerald-400 font-bold tracking-wider">NEW SIGNAL DETECTED: </span>
              <span className="text-slate-200 ml-1 font-semibold">{alert.entity}</span>
              <span className="text-slate-500 ml-1">({alert.category})</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}