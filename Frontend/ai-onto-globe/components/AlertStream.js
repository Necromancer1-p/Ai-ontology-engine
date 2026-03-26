"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Radio } from 'lucide-react';

export default function AlertStream({ nodes = [], articles = [] }) {
  const [alerts, setAlerts] = useState([]);
  const [queue, setQueue] = useState([]);
  const scrollRef = useRef(null);

  // 1. Process real articles into the queue when they arrive
  useEffect(() => {
    if (!articles || articles.length === 0) return;

    console.log(`[AlertStream] Processing ${articles.length} real articles into intelligence queue.`);
    
    const newQueue = articles.map((article, index) => {
      // Cross-reference article text with graph nodes to find hits
      const articleText = `${article.title} ${article.snippet}`.toLowerCase();
      
      // Find all nodes that are literally mentioned in this specific article
      const mentionedNodes = nodes
        .filter(n => n.name && articleText.includes(n.name.toLowerCase()))
        .map(n => n.name);

      return {
        // Create a temporary ID for the queue
        id: `queued-${index}-${Date.now()}`, 
        title: article.title,
        source: article.source_name || "Unknown Source",
        nodes: mentionedNodes
      };
    });

    // Add to queue (replace entirely to avoid appending the same 10 items if just the graph physics updates)
    setQueue(newQueue);
  }, [articles, nodes]);

  // 2. Stream from the queue slowly to simulate live incoming data
  useEffect(() => {
    // If nothing is in the queue, stop the timer
    if (queue.length === 0) return;

    // Use a setTimeout that naturally loops because `queue` is in the dependency array
    const timer = setTimeout(() => {
      const nextAlert = queue[0];
      
      const newDisplayAlert = {
        ...nextAlert,
        // Guarantee absolute uniqueness when pushed to the screen
        id: `alert-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        time: new Date().toLocaleTimeString(),
      };

      // Push to screen (keep max 20)
      setAlerts(prev => [...prev.slice(-19), newDisplayAlert]);
      
      // Remove the item we just processed from the queue
      setQueue(prev => prev.slice(1));
      
    }, 4000); // 4 seconds between intercepts

    // Cleanup the timeout if the component unmounts or queue changes early
    return () => clearTimeout(timer);
  }, [queue]);

  // 3. Auto-scroll to the bottom when new alerts arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [alerts]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col h-64">
      <h2 className="text-lg font-semibold mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-rose-400">
          <Radio className="w-5 h-5 animate-pulse" />
          Live Signal Intercepts
        </div>
        {queue.length > 0 && (
          <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded-full border border-slate-700 shadow-inner">
            {queue.length} in queue
          </span>
        )}
      </h2>
      
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto custom-scrollbar bg-slate-950 border border-slate-700 rounded-lg p-3 space-y-3"
      >
        {alerts.length === 0 ? (
          <div className="text-slate-600 italic text-sm h-full flex flex-col items-center justify-center gap-2">
            <Radio className="w-6 h-6 opacity-20" />
            Awaiting real-time article feed...
          </div>
        ) : (
          alerts.map(alert => (
            <div key={alert.id} className="text-xs border-l-2 border-rose-500 pl-2 py-1.5 bg-rose-500/10 rounded-r animate-fade-in flex flex-col gap-1 shadow-sm">
              <div className="flex items-start justify-between">
                <span className="text-slate-500 font-mono shrink-0 mr-2">[{alert.time}]</span>
                <span className="text-rose-400 font-bold tracking-wider uppercase shrink-0">
                  INTERCEPT ({alert.source}):
                </span>
              </div>
              <p className="text-slate-300 font-medium leading-relaxed mt-0.5 line-clamp-2">
                {alert.title}
              </p>
              
              {/* Only show tags if this article explicitly mentions nodes in our graph */}
              {alert.nodes && alert.nodes.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {alert.nodes.map((n, i) => (
                    <span key={`${alert.id}-tag-${i}`} className="px-1.5 py-0.5 bg-rose-900/40 text-rose-300 border border-rose-500/30 rounded text-[10px] uppercase tracking-wider font-semibold">
                      {n}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}