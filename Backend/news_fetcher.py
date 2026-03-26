"""
news_fetcher.py
--------------
Fetches live news articles using the NewsAPI (newsapi.org).
Highly stable API returning well-structured JSON for global news.

Requires a free API key from https://newsapi.org/
"""

import requests
import logging
import time
import os

logger = logging.getLogger("ontology_backend.news_fetcher")
logger.setLevel(logging.INFO)
if not logger.handlers:
    ch = logging.StreamHandler()
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    ch.setFormatter(formatter)
    logger.addHandler(ch)

# NewsAPI Everything endpoint
NEWS_API_URL = "https://newsapi.org/v2/everything"

# Put your API key here, or ideally load it from an environment variable (.env)
API_KEY = os.environ.get("NEWS_API_KEY", "3d6ba05a11ae4a508743adfb45a8f76f")

# Standard User-Agent to prevent basic blocks
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}

def fetch_articles(topic: str, max_records: int = 25) -> list[dict]:
    """
    Fetch recent news articles from NewsAPI for a given topic with retry logic.
    """
    logger.info(f"[news_fetcher] Starting fetch process for topic: '{topic}' (max: {max_records})")
    
    if API_KEY == "YOUR_NEWS_API_KEY_HERE" or not API_KEY:
        logger.error("[news_fetcher] FAILURE: API Key is missing. Please set NEWS_API_KEY.")
        return []

    params = {
        "q": topic,                 # Search query
        "pageSize": max_records,    # Number of results to return
        "language": "en",           # English articles only
        "sortBy": "publishedAt",    # Most recent first
        "apiKey": API_KEY           # Authentication
    }

    max_retries = 3
    base_delay = 2  # seconds

    for attempt in range(1, max_retries + 1):
        try:
            logger.info(f"[news_fetcher] Attempt {attempt}/{max_retries}: Sending GET request to NewsAPI.")
            
            response = requests.get(NEWS_API_URL, params=params, headers=HEADERS, timeout=15)
            
            # Check for standard HTTP Error Codes first
            if response.status_code == 429:
                logger.warning(f"[news_fetcher] Attempt {attempt} Failed: Received 429 Too Many Requests (Rate limit hit).")
                if attempt < max_retries:
                    sleep_time = base_delay ** attempt
                    logger.info(f"[news_fetcher] Backing off for {sleep_time} seconds before retrying...")
                    time.sleep(sleep_time)
                    continue
                else:
                    logger.error(f"[news_fetcher] FAILURE: Exhausted all {max_retries} retries due to rate limiting.")
                    return []
            
            if response.status_code == 401:
                logger.error(f"[news_fetcher] FAILURE: Received 401 Unauthorized. Your API key is invalid or inactive.")
                return []

            response.raise_for_status()
            logger.info(f"[news_fetcher] Attempt {attempt} Successful: Received status code {response.status_code}.")
            
            data = response.json()
            
            # --- NEW: Catch hidden JSON errors even if Status is 200 ---
            if data.get("status") == "error":
                hidden_error = data.get("message", "Unknown API Error")
                logger.error(f"[news_fetcher] API returned an embedded error: {hidden_error}")
                return []
            
            raw_articles = data.get("articles", [])
            
            logger.info(f"[news_fetcher] Data parsed successfully. NewsAPI returned {len(raw_articles)} raw articles.")
            
            # Normalize into our standard format
            normalized = []
            for index, article in enumerate(raw_articles):
                logger.info(f"[news_fetcher] Processing article {index + 1}/{len(raw_articles)}")
                title = article.get("title") or "Untitled Article"
                url = article.get("url") or ""
                description = article.get("description") or "No snippet available."
                
                # NewsAPI nests the source name inside a 'source' dict
                source_dict = article.get("source", {})
                source_name = source_dict.get("name") or "unknown"
                
                # Skip [Removed] articles
                if title == "[Removed]":
                    logger.warning(f"[news_fetcher] Skipping article {index + 1}: Article was flagged as [Removed] by NewsAPI.")
                    continue

                if not url:
                    logger.warning(f"[news_fetcher] Skipping article {index + 1} due to missing URL: {title}")
                    continue

                normalized.append({
                    "title": title,
                    "snippet": f"Source: {source_name} | {description}",
                    "url": url,
                    "source_name": source_name,
                })
            
            logger.info(f"[news_fetcher] SUCCESS: Returning {len(normalized)} normalized articles for '{topic}'.")
            return normalized

        except requests.exceptions.Timeout:
            logger.error(f"[news_fetcher] Attempt {attempt} FAILURE: Request to NewsAPI timed out.")
            if attempt < max_retries:
                sleep_time = base_delay ** attempt
                logger.info(f"[news_fetcher] Backing off for {sleep_time} seconds before retrying...")
                time.sleep(sleep_time)
            else:
                return []
        except requests.exceptions.RequestException as e:
            logger.error(f"[news_fetcher] Attempt {attempt} FAILURE: HTTP error: {e}")
            if attempt < max_retries:
                sleep_time = base_delay ** attempt
                logger.info(f"[news_fetcher] Backing off for {sleep_time} seconds before retrying...")
                time.sleep(sleep_time)
            else:
                return []
        except Exception as e:
            logger.error(f"[news_fetcher] FAILURE: Unexpected error during fetch: {e}")
            return []

    return []


def articles_to_text_corpus(articles: list[dict]) -> list[str]:
    """
    Converts article metadata into plain text strings suitable for LLM extraction.
    """
    logger.info(f"[news_fetcher] Converting {len(articles)} articles to text corpus.")
    corpus = []
    for index, article in enumerate(articles):
        text = f"{article['title']}. {article['snippet']}"
        corpus.append(text)
    logger.info(f"[news_fetcher] Successfully created text corpus of length {len(corpus)}.")
    return corpus


if __name__ == "__main__":
    # Quick test run
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    logger.info("Starting quick test run for DeFi Regulations...")
    
    test_articles = fetch_articles("DeFi Regulations", max_records=10)
    
    print(f"\n=== Fetched {len(test_articles)} articles ===")
    for i, a in enumerate(test_articles):
        print(f"[{i+1}] {a['title']} | {a['url']}")