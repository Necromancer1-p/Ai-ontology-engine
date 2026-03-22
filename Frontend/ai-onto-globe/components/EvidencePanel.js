"use client";
import React from 'react';
import { BookOpen, ExternalLink, FileText } from 'lucide-react';

/**
 * EvidencePanel — Task 2: Provenance & Source Articles Panel
 *
 * Props:
 *   articles   — array of { title, snippet, url, source_name }
 *   selectedNode — the currently clicked graph node (or null)
 */
const EvidencePanel = ({ articles = [], selectedNode = null }) => {
  // When a node is selected, filter articles relevant to it by name match
  const displayedArticles = React.useMemo(() => {
    if (!selectedNode || !selectedNode.name) {
      // No node selected — show all articles
      return articles;
    }

    const nodeName = selectedNode.name.toLowerCase();
    const filtered = articles.filter((a) => {
      const titleMatch = a.title?.toLowerCase().includes(nodeName);
      const snippetMatch = a.snippet?.toLowerCase().includes(nodeName);
      return titleMatch || snippetMatch;
    });

    console.log(
      `Evidence Panel updated. Showing sources for node: ${selectedNode.id}`,
      `— Found ${filtered.length} matching articles.`
    );

    // If no filtered articles found, fall back to showing all (best effort)
    return filtered.length > 0 ? filtered : articles;
  }, [articles, selectedNode]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col">
      <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-amber-400" />
        Evidence &amp; Sources
        {selectedNode && (
          <span className="ml-2 text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">
            {selectedNode.name}
          </span>
        )}
      </h2>
      <p className="text-xs text-slate-500 mb-3">
        {selectedNode
          ? `Showing sources related to "${selectedNode.name}"`
          : 'Click a graph node to filter sources. Showing all articles.'}
      </p>

      {/* Article List */}
      <div className="flex flex-col gap-3 overflow-y-auto max-h-72 custom-scrollbar pr-1">
        {displayedArticles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-24 text-slate-500 text-sm italic">
            <FileText className="w-8 h-8 mb-2 opacity-40" />
            No source articles. Use "Fetch Live News" to load data.
          </div>
        ) : (
          displayedArticles.map((article, index) => (
            <a
              key={`${article.url}-${index}`}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block bg-slate-950 border border-slate-700 hover:border-amber-500/50 rounded-lg p-3 transition-all duration-200 hover:shadow-amber-900/20 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-slate-200 group-hover:text-amber-300 font-medium leading-snug line-clamp-2 transition-colors">
                  {article.title || 'Untitled Article'}
                </p>
                <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 shrink-0 mt-0.5 transition-colors" />
              </div>
              <p className="text-xs text-slate-500 mt-1.5 line-clamp-1">
                {article.snippet || article.source_name || ''}
              </p>
            </a>
          ))
        )}
      </div>

      {/* Footer count */}
      {displayedArticles.length > 0 && (
        <div className="mt-3 pt-2 border-t border-slate-800 text-xs text-slate-500 text-right">
          {displayedArticles.length} source{displayedArticles.length !== 1 ? 's' : ''} shown
        </div>
      )}
    </div>
  );
};

export default EvidencePanel;
