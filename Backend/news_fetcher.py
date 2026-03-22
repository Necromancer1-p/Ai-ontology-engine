"""
news_fetcher.py
--------------
Fetches live news articles using the GDELT DOC API (completely free, no API key required).
GDELT monitors worldwide news media in 100+ languages, updated every 15 minutes.

API Docs: https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/
"""

import requests
import logging
import time

logger = logging.getLogger("ontology_backend.news_fetcher")
logger.setLevel(logging.INFO)
if not logger.handlers:
    ch = logging.StreamHandler()
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    ch.setFormatter(formatter)
    logger.addHandler(ch)

# GDELT DOC API base URL - no key required
GDELT_DOC_API = "https://api.gdeltproject.org/api/v2/doc/doc"

def fetch_articles(topic: str, max_records: int = 25) -> list[dict]:
    """
    Fetch recent news articles from GDELT DOC API for a given topic.
    
    Args:
        topic: The search query (e.g., "DeFi Regulations", "Red Sea Shipping")
        max_records: How many articles to fetch (max 250 from GDELT)

    Returns:
        List of dicts: [{title, snippet, url, source_name}]
    """
    logger.info(f"[news_fetcher] Fetching articles for topic: '{topic}' (max: {max_records})")
    
    params = {
        "query": topic,
        "mode": "artlist",          # Return article list (title + URL + snippet)
        "maxrecords": max_records,
        "format": "json",
        "sort": "DateDesc",         # Most recent first
        "timespan": "7d",           # Articles from the last 7 days
    }

    try:
        logger.info(f"[news_fetcher] Sending GET to GDELT DOC API: {GDELT_DOC_API}")
        response = requests.get(GDELT_DOC_API, params=params, timeout=15)
        response.raise_for_status()
        
        data = response.json()
        raw_articles = data.get("articles", [])
        
        logger.info(f"[news_fetcher] GDELT returned {len(raw_articles)} raw articles for topic: '{topic}'")
        
        # Normalize into our standard format
        normalized = []
        for article in raw_articles:
            title = article.get("title", "Untitled Article")
            url = article.get("url", "")
            snippet = article.get("seendate", "")  # GDELT uses seendate; we'll use title as main info
            source_name = article.get("domain", "unknown")
            
            if not url:
                logger.warning(f"[news_fetcher] Skipping article with no URL: {title}")
                continue

            normalized.append({
                "title": title,
                "snippet": f"Source: {source_name} | Published: {snippet}",
                "url": url,
                "source_name": source_name,
            })
        
        logger.info(f"[news_fetcher] SUCCESS: Returning {len(normalized)} articles for '{topic}'.")
        return normalized

    except requests.exceptions.Timeout:
        logger.error("[news_fetcher] FAILURE: Request to GDELT API timed out.")
        return []
    except requests.exceptions.RequestException as e:
        logger.error(f"[news_fetcher] FAILURE: HTTP error when contacting GDELT: {e}")
        return []
    except Exception as e:
        logger.error(f"[news_fetcher] FAILURE: Unexpected error: {e}")
        return []


def articles_to_text_corpus(articles: list[dict]) -> list[str]:
    """
    Converts article metadata into plain text strings suitable for LLM extraction.
    Each text entry = title + snippet combined for signal-rich context.
    """
    logger.info(f"[news_fetcher] Converting {len(articles)} articles to text corpus.")
    corpus = []
    for article in articles:
        text = f"{article['title']}. {article['snippet']}"
        corpus.append(text)
    return corpus


if __name__ == "__main__":
    # Quick test run
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    test_articles = fetch_articles("DeFi Regulations Blockchain", max_records=10)
    print(f"\n=== Fetched {len(test_articles)} articles ===")
    for i, a in enumerate(test_articles):
        print(f"[{i+1}] {a['title']} | {a['url']}")
