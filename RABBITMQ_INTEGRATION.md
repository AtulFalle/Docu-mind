# RabbitMQ Integration - Document Processing Pipeline

## Overview

This document describes the RabbitMQ integration that enables asynchronous document processing in the DocuMind system. When a file is uploaded to the API, an event is published to RabbitMQ, which is then consumed by the Python AI service to perform document extraction and vectorization.

## Architecture

```
┌─────────────────────────────┐
│   NestJS API (Backend)      │
│  - File Upload Handler      │
│  - Virus Scan               │
│  - MinIO Storage            │
│  - RabbitMQ Publisher       │
└──────────────┬──────────────┘
               │
               │ document.uploaded event
               │
        ┌──────▼──────┐
        │  RabbitMQ   │
        │   Queue     │
        └──────┬──────┘
               │
               │ consume
               │
┌──────────────▼──────────────┐
│ Python AI Service           │
│  - RabbitMQ Consumer        │
│  - PDF Extraction           │
│  - Content Normalization    │
│  - Text Chunking           │
│  - Embedding Generation    │
│  - Vector Storage (Qdrant) │
└─────────────────────────────┘
```

## Components

### 1. API Side (NestJS)

#### QueueService (`apps/backend/api/src/document/queue.service.ts`)
- Initializes RabbitMQ connection on module init
- Publishes events with message persistence
- Graceful handling of queue failures
- Logs all message publishing activity

**Configuration:**
- `RABBITMQ_URL`: Connection URL (default: `amqp://rabbitmq`)
- `QUEUE_ENABLED`: Enable/disable queue functionality (default: `true`)

**Event Format:**
```json
{
  "event": "document.uploaded",
  "timestamp": "2026-03-21T10:30:00Z",
  "id": "abc123def456",
  "data": {
    "docId": "550e8400-e29b-41d4-a716-446655440000",
    "bucket": "documents",
    "key": "550e8400-e29b-41d4-a716-446655440000.pdf",
    "type": "resume"
  }
}
```

### 2. Python AI Service

#### Main Service (`services/ai-service/main.py`)
- FastAPI application with lifespan management
- Starts RabbitMQ consumer in background thread
- Provides `/health` endpoint for health checks
- Provides `/query` endpoint for document querying

#### Consumer (`services/ai-service/consumer.py`)
- Listens to `document_queue` on RabbitMQ
- Implements automatic message acknowledgment
- Handles errors with message requeue
- Supports username/password authentication
- Configurable connection retry logic

#### Pipeline (`services/ai-service/service/pipeline.py`)
- Orchestrates the document processing workflow:
  1. Download PDF from MinIO
  2. Extract text and pages
  3. Normalize content
  4. Chunk content into manageable pieces
  5. Generate embeddings for each chunk
  6. Store vectors in Qdrant
  7. Cleanup temporary files

#### Configuration (`services/ai-service/config.py`)
- Environment-based configuration management
- Supports `.env` files for local development
- Default values for all services

**Environment Variables:**
```
RABBITMQ_HOST=rabbitmq
RABBITMQ_PORT=5672
RABBITMQ_USER=guest
RABBITMQ_PASSWORD=guest
QDRANT_HOST=qdrant
QDRANT_PORT=6333
MINIO_HOST=minio:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
OLLAMA_URL=http://ollama:11434
COLLECTION_NAME=documents
```

## Workflow

### 1. File Upload
```
POST /upload
│
├─ Virus Scan (ClamAV)
├─ Upload to MinIO
└─ Publish Event to RabbitMQ
   └─ Returns: { docId, status: 'uploaded' }
```

### 2. Document Processing (Async)
```
RabbitMQ Message Received
│
├─ Download PDF from MinIO
├─ Extract PDF Content
├─ Normalize Content
├─ Chunk Content
├─ Generate Embeddings
├─ Store in Vector DB
└─ Acknowledge Message
```

### 3. Query Processing
```
POST /query
│
├─ Embed Question
├─ Search Vector DB
├─ Generate Answer (using LLM)
└─ Return Results
```

## Error Handling

### API Side
- Queue failures don't block file uploads
- Detailed error logging for debugging
- Message persistence ensures no data loss

### Python Service
- Automatic message requeue on processing errors
- Comprehensive error logging with stack traces
- Graceful shutdown on connection failures
- Cleanup of temporary files on error

## Development Setup

### Prerequisites
- Docker & Docker Compose
- Python 3.9+
- Node.js 18+

### Starting Services

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f ai-service    # Python service
docker-compose logs -f api           # NestJS API

# Check RabbitMQ Management Console
# http://localhost:15672 (guest/guest)
```

### Local Development

**API:**
```bash
cd apps/backend/api
npm install
npm run serve  # or npm run dev
```

**Python Service (without Docker):**
```bash
cd services/ai-service

# Create virtual environment
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export RABBITMQ_HOST=localhost
export QDRANT_HOST=localhost
export MINIO_HOST=localhost:9000
export OLLAMA_URL=http://localhost:11434

# Run the service
python main.py
```

## Testing the Integration

### 1. Upload a Document
```bash
curl -X POST -F "file=@document.pdf" http://localhost:3000/upload
```

Response:
```json
{
  "docId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "uploaded"
}
```

### 2. Monitor Processing
```bash
# Check logs
docker-compose logs -f ai-service

# Expected output:
# Starting document processing for doc_id=550e8400-e29b-41d4-a716-446655440000
# Downloading document from documents/550e8400-e29b-41d4-a716-446655440000.pdf
# Extracted X pages from PDF
# Created Y chunks
# Storing Z vectors in vector database
# Document processing completed successfully
```

### 3. Query Document
```bash
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{
    "docId": "550e8400-e29b-41d4-a716-446655440000",
    "question": "What are the key skills mentioned?"
  }'
```

## Monitoring

### RabbitMQ Management Console
- **URL:** http://localhost:15672
- **Credentials:** guest/guest
- **Features:**
  - View queue status and message count
  - Monitor consumer connections
  - Check message rates

### Logging
- API logs: `docker-compose logs api`
- Python service logs: `docker-compose logs ai-service`
- RabbitMQ logs: `docker-compose logs rabbitmq`

## Troubleshooting

### Issue: Consumer not connecting to RabbitMQ
**Solution:**
- Check RabbitMQ is running: `docker-compose ps rabbitmq`
- Verify credentials in config.py
- Check logs: `docker-compose logs rabbitmq`

### Issue: Documents not being processed
**Checks:**
1. Verify message in queue: `docker-compose logs ai-service`
2. Check Python service is running: `docker-compose ps ai-service`
3. Verify MinIO connectivity: `docker-compose logs ai-service`
4. Check permissions: `docker-compose logs ai-service`

### Issue: "Connection refused" errors
**Solution:**
- Wait for all services to be healthy (30-60 seconds)
- Run: `docker-compose ps` to verify all services are up
- Check service health endpoints

## Future Enhancements

1. **Dead Letter Queue (DLQ):** Route failed messages to separate queue
2. **Message Retry Logic:** Exponential backoff for failed processing
3. **Progress Tracking:** Update document status during processing
4. **Batch Processing:** Process multiple documents in parallel
5. **Performance Metrics:** Track processing time and throughput
6. **Message Encryption:** Secure sensitive data in transit

## References

- [RabbitMQ Documentation](https://www.rabbitmq.com/documentation.html)
- [AMQP 0.9.1 Specification](https://www.rabbitmq.com/amqp-0-9-1.html)
- [Pika Python Client](https://pika.readthedocs.io/)
- [NestJS amqplib](https://github.com/amqp-ts/node-amqp-ts)
