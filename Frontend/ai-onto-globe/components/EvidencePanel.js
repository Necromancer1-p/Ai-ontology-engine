"use client";
import React from 'react';
import { BookOpen, ExternalLink, FileText, Link as LinkIcon } from 'lucide-react';

/**
 * EvidencePanel — Task 2: Provenance & Source Articles Panel
 *
 * Props:
 * articles    — array of live news { title, snippet, url, source_name }
 * selectedNode — the currently clicked graph node (or null)
 * graphData   — full { nodes, edges } to trace explicit provenance linkages
 */
const EvidencePanel = ({ articles = [], selectedNode = null, graphData = null }) => {
  
  // When a node is selected, extract exact provenance from the graph + fuzzy matches
  const displayedSources = React.useMemo(() => {
    // 1. Standardize GDELT live news articles
    const baseArticles = articles.map(a => ({
      title: a.title,
      url: a.url,
      snippet: a.snippet || a.source_name || "Live News Feed",
      isExact: false
    }));

    if (!selectedNode) {
      // No node selected — show all live articles
      return baseArticles;
    }

    // 2. Node is selected: Gather direct provenance from the graph
    const exactSources = new Map(); // Use map to deduplicate by URL

    // A. Check the node's own provenance metadata
    if (selectedNode.source_url) {
      exactSources.set(selectedNode.source_url, {
        title: selectedNode.source_title || 'Extracted Entity Source',
        url: selectedNode.source_url,
        snippet: 'Direct Node Provenance',
        isExact: true
      });
    }

    // B. Check connected edges for relationship provenance
    if (graphData && graphData.edges) {
      graphData.edges.forEach(edge => {
        // ForceGraph replaces edge.source/target strings with object references after render
        const sourceId = typeof edge.source === 'object' ? edge.source.id : edge.source;
        const targetId = typeof edge.target === 'object' ? edge.target.id : edge.target;

        if ((sourceId === selectedNode.id || targetId === selectedNode.id) && edge.source_url) {
          // If this edge is connected to our clicked node, grab its source
          exactSources.set(edge.source_url, {
            title: edge.source_title || 'Relationship Source',
            url: edge.source_url,
            snippet: `Relationship Provenance (${edge.type || edge.name || 'Connected'})`,
            isExact: true
          });
        }
      });
    }

    // C. Add fuzzy matched GDELT articles as supplement
    const nodeNameLower = selectedNode.name?.toLowerCase() || "";
    baseArticles.forEach(a => {
      if (a.title?.toLowerCase().includes(nodeNameLower) || a.snippet?.toLowerCase().includes(nodeNameLower)) {
        if (a.url && !exactSources.has(a.url)) {
          exactSources.set(a.url, a);
        }
      }
    });

    const finalSources = Array.from(exactSources.values());

    console.log(
      `Evidence Panel updated. Showing sources for node: ${selectedNode.id}`,
      `— Found ${finalSources.length} explicit/fuzzy sources.`
    );

    // If we found specific sources, return them. Otherwise return all base articles as fallback
    return finalSources.length > 0 ? finalSources : baseArticles;

  }, [articles, selectedNode, graphData]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col h-full max-h-[400px]">
      <h2 className="text-lg font-semibold mb-2 flex items-center gap-2 shrink-0">
        <BookOpen className="w-5 h-5 text-amber-400" />
        Evidence &amp; Sources
        {selectedNode && (
          <span className="ml-2 text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full truncate max-w-[150px]">
            {selectedNode.name}
          </span>
        )}
      </h2>
      <p className="text-xs text-slate-500 mb-4 shrink-0">
        {selectedNode
          ? `Showing direct provenance and related articles for "${selectedNode.name}"`
          : 'Click a graph node to trace its origin. Showing live news.'}
      </p>

      {/* Source List */}
      <div className="flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-2 flex-1">
        {displayedSources.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm italic py-8">
            <FileText className="w-8 h-8 mb-2 opacity-40" />
            No source articles found in the graph or live feed.
          </div>
        ) : (
          displayedSources.map((source, index) => (
            <a
              key={`${source.url}-${index}`}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`group flex flex-col w-full bg-slate-950 border ${source.isExact ? 'border-amber-500/40' : 'border-slate-700'} hover:border-amber-500/80 rounded-lg p-3.5 transition-all duration-200 hover:shadow-amber-900/20 hover:shadow-md relative overflow-hidden shrink-0`}
            >
              {/* Highlight bar for exact provenance matches */}
              {source.isExact && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500/80"></div>
              )}
      
              <div className="flex items-start justify-between gap-3 w-full pl-2">
                <p className="flex-1 text-sm text-slate-200 group-hover:text-amber-300 font-medium leading-relaxed break-words transition-colors">
                  {source.title || 'Untitled Source Document'}
                </p>
                <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-amber-400 shrink-0 mt-0.5 transition-colors" />
              </div>
      
              <div className="flex items-start gap-2 mt-2 w-full pl-2">
                {source.isExact && <LinkIcon className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />}
                <p className={`flex-1 text-xs leading-normal ${source.isExact ? 'text-amber-500/80 font-medium' : 'text-slate-400'} break-words`}>
                  {source.snippet}
                </p>
              </div>
            </a>
          ))
        )}
      </div>

      {/* Footer count */}
      {displayedSources.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-500 flex justify-between shrink-0">
          <span>{displayedSources.filter(s => s.isExact).length} Exact Links</span>
          <span>{displayedSources.length} Total Sources</span>
        </div>
      )}
    </div>
  );
};

export default EvidencePanel;