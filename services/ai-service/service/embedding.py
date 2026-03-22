import logging
import time
import requests
from config import *

logger = logging.getLogger(__name__)


def embed_text(text, max_retries=3, retry_delay=1):
    """Get an embedding for text from Ollama with retries and response validation."""
    payload = {
        "model": "nomic-embed-text",
        "prompt": text,
    }

    for attempt in range(1, max_retries + 1):
        try:
            res = requests.post(f"{OLLAMA_URL}/api/embeddings", json=payload, timeout=30)
        except requests.RequestException as exc:
            logger.warning(f"Embedding request failed (attempt {attempt}/{max_retries}): {exc}")
            if attempt < max_retries:
                time.sleep(retry_delay)
                continue
            raise

        try:
            data = res.json()
        except ValueError as exc:
            raise RuntimeError(f"Invalid JSON response from embeddings API ({res.status_code}): {res.text}") from exc

        if res.status_code != 200:
            raise RuntimeError(f"Embedding API error ({res.status_code}): {data}")

        # Try known formats
        if isinstance(data, dict):
            if "embedding" in data:
                return data["embedding"]

            if "data" in data and isinstance(data["data"], list) and data["data"]:
                entry = data["data"][0]
                if isinstance(entry, dict) and "embedding" in entry:
                    return entry["embedding"]

            if "result" in data and isinstance(data["result"], list) and data["result"]:
                entry = data["result"][0]
                if isinstance(entry, dict) and "embedding" in entry:
                    return entry["embedding"]

        # not found
        err_txt = f"Embedding key not found in response (attempt {attempt}/{max_retries}): {data}"
        logger.warning(err_txt)
        if attempt < max_retries:
            time.sleep(retry_delay)
            continue
        raise KeyError(err_txt)
