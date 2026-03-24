# CI/CD Build Trigger
from fastapi import FastAPI
from contextlib import asynccontextmanager
import threading
import logging
from service.embedding import embed_text
from service.vector_store import search, init_collection
from service.llm import generate_answer
from consumer import start as start_consumer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Start RabbitMQ consumer in background thread
consumer_thread = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global consumer_thread
    logger.info("Initializing Qdrant collection...")
    try:
        init_collection()
        logger.info("Qdrant collection initialized")
    except Exception as exc:
        logger.error(f"Could not initialize Qdrant collection: {exc}", exc_info=True)

    logger.info("Starting RabbitMQ consumer thread...")
    consumer_thread = threading.Thread(target=start_consumer, daemon=True)
    consumer_thread.start()
    logger.info("RabbitMQ consumer thread started")
    
    yield
    
    # Shutdown
    logger.info("Shutting down RabbitMQ consumer...")

app = FastAPI(lifespan=lifespan)

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/query")
async def query(data: dict):
    doc_id = data["docId"]
    question = data["question"]

    logger.info(f"Query received: doc_id={doc_id}, question='{question}'")

    q_embedding = embed_text(question)
    results = search(doc_id, q_embedding)

    context = "\n".join([
        f"{r.payload['text']} (Page {r.payload['page']})"
        for r in results
    ])

    answer = generate_answer(context, question)

    response = {
        "answer": answer,
        "sources": [{"text": r.payload["text"], "page": r.payload["page"], "score": r.score} for r in results]
    }

    logger.info(f"Query response: {response}")

    return response