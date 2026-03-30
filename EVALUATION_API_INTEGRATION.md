# Interview Evaluation API - Integration Summary

## What Was Integrated

The new interview evaluation endpoint is now fully integrated with:
- ✅ **Backend API** - Interview module with evaluation endpoints
- ✅ **AI Service** - Evaluation consumer processing transcripts via Ollama
- ✅ **RabbitMQ** - Async job queues for evaluation requests
- ✅ **MongoDB** - Persistent evaluation results in interview documents
- ✅ **Docker Compose** - Both dev and production services configured

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Later)                          │
└──────────────────────┬────────────────────────────────────────────┘
                       │
┌──────────────────────▼────────────────────────────────────────────┐
│                    Backend API (NestJS)                           │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  POST /interview/:id/evaluate                              │  │
│  │  GET /interview/:id/evaluation                             │  │
│  │  (Interview Module)                                        │  │
│  └─────┬──────────────────────────────────────────────────────┘  │
└────────┼──────────────────────────────────────────────────────────┘
         │ Publishes to RabbitMQ
         │ Queue: interview.evaluation
         │
┌────────▼──────────────────────────────────────────────────────────┐
│                   RabbitMQ (Message Broker)                       │
│  ┌──────────────────┐         ┌──────────────────────────────┐   │
│  │ interview.eval.. │         │ interview.evaluation_results │   │
│  └──────────────────┘         └──────────────────────────────┘   │
└─────┬──────────────────────────────────────────────────────────────┘
      │
      │ Consumed by
      │
┌─────▼──────────────────────────────────────────────────────────────┐
│                  AI Service (Python FastAPI)                       │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │  evaluation_consumer.py                                    │   │
│  │  ├─ Fetch interview from MongoDB                           │   │
│  │  ├─ Concatenate transcripts                                │   │
│  │  ├─ Call evaluator.py (Ollama integration)                │   │
│  │  └─ Publish results to interview.evaluation_results       │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────┬──────────────────────────────────────────────────────────────┘
      │
      │ Uses
      │
┌─────▼──────────────────────────────────────────────────────────────┐
│  • Ollama (llama3:8b model) - LLM for evaluation logic              │
│  • MongoDB - Interview data source                                 │
└─────────────────────────────────────────────────────────────────────┘
      │
      │ Publishes result
      │
┌─────▼──────────────────────────────────────────────────────────────┐
│  Result Queue (interview.evaluation_results)                       │
│  ↓                                                                  │
│  Backend receives result and updates MongoDB                       │
│  (Interview.evaluation.status = 'completed' or 'failed')           │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Services Configuration

### Backend API (NestJS)
**File**: [apps/backend/api/src/modules/interview](apps/backend/api/src/modules/interview)

**New Endpoints**:
```
POST   /interview/:interviewId/evaluate
GET    /interview/:interviewId/evaluation
```

**Key Changes**:
- Extended Interview schema with `evaluation` field
- Added `InterviewEvaluationResultConsumer` service
- Updated QueueService to listen on `interview.evaluation_results` queue

### AI Service (Python)
**Directory**: [services/ai-service](services/ai-service)

**New Files**:
- `service/evaluator.py` - Ollama integration & evaluation logic
- `evaluation_consumer.py` - RabbitMQ consumer for evaluation jobs

**Updated Files**:
- `main.py` - Now starts both document and evaluation consumers
- `config.py` - Added MongoDB configuration
- `requirements.txt` - Added `pymongo` dependency

### Docker Compose
**Files Updated**:
- `docker-compose.yml` - Added MongoDB to ai-service dependencies
- `docker-compose.dev.yml` - Added MongoDB config to ai-service

---

## How to Run

### Option 1: Full Stack (Docker)
```bash
# Start all services
npm run docker:up

# This will start:
# - Backend API (port 3000)
# - Frontend (port 4200)
# - MongoDB, RabbitMQ, Ollama, MinIO, etc.
# - AI Service (runs evaluation_consumer automatically)
```

### Option 2: Development (Partial Docker)
```bash
# Start supporting services only
npm run services:dev

# Then start backend and frontend separately
npm run start:api
npm run start:web

# AI Service needs manual start (see below)
```

### Option 3: Manual AI Service Start
```bash
cd services/ai-service
pip install -r requirements.txt
python main.py    # Starts FastAPI + both consumers
```

---

## Testing the Integration

### Step 1: Upload Interview
```bash
curl -X POST http://localhost:3000/interview/upload \
  -F "video=@sample.mp4"
```

### Step 2: Wait for Transcription
Poll until status is `"completed"`:
```bash
curl http://localhost:3000/interview/{interviewId}
```

### Step 3: Request Evaluation ⭐
```bash
curl -X POST http://localhost:3000/interview/{interviewId}/evaluate
# Response: { "status": "pending", "message": "..." }
```

### Step 4: Poll Evaluation Status
```bash
curl http://localhost:3000/interview/{interviewId}/evaluation

# Will return evaluation results (after 15-45 seconds):
# {
#   "status": "completed",
#   "result": {
#     "technical": 8.5,
#     "communication": 7.5,
#     "confidence": 8.0,
#     "consistency": 7.8,
#     "aiRisk": 2.5,
#     "strengths": [...],
#     "weaknesses": [...],
#     "summary": "..."
#   }
# }
```

---

## Verify the Integration

### Queue Status
Open RabbitMQ Manager: http://localhost:15672 (guest/guest)
- Should see queues:
  - `interview.evaluation` (evaluation requests)
  - `interview.evaluation_results` (results)

### Database Check
```bash
# Connect to MongoDB
mongo mongodb://localhost:27017

# Query interview with evaluation
use documind
db.interviews.findOne({ interviewId: "{your-id}" })

# Should have:
{
  "interviewId": "...",
  "status": "completed",
  "transcripts": [...],
  "evaluation": {
    "status": "completed",
    "result": { ... },
    "completedAt": ISODate(...)
  }
}
```

### Service Logs
```bash
# Backend API logs (evaluation endpoints)
docker logs documind-api

# AI Service logs (consumer processing)
docker logs documind-ai-service | grep -i "evaluation"

# RabbitMQ logs (message flow)
docker logs documind-rabbitmq
```

---

## Environment Variables

**AI Service** (auto-configured in docker-compose):
```
RABBITMQ_HOST=rabbitmq
RABBITMQ_PORT=5672
MONGODB_URL=mongodb://mongo:27017
MONGODB_DB=documind
OLLAMA_URL=http://ollama:11434
```

**Backend API** (already configured in NestJS):
```
MONGO_URI=mongodb://mongo:27017/documind
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
```

---

## Next Steps

### UI Integration (Frontend)
- [ ] Add evaluation button to interview detail page
- [ ] Display loading state while evaluation is in progress
- [ ] Show evaluation results in a formatted dashboard widget
- [ ] Add evaluation history/comparison view

**Expected endpoints for UI**:
```javascript
// Request evaluation (backend will show loading state)
POST /api/interview/{interviewId}/evaluate

// Poll for results
GET /api/interview/{interviewId}/evaluation

// Show results with scores and insights
```

### Production Enhancements
- [ ] Add Redis caching for frequent evaluations
- [ ] Implement evaluation result webhooks for real-time updates
- [ ] Add support for custom assessment prompts (stored in DB)
- [ ] Implement evaluation versioning (track LLM model & prompt used)
- [ ] Add bulk evaluation requests with priority queuing
- [ ] Monitor Ollama performance and auto-scale workers

---

## Troubleshooting

### Evaluation Never Completes
**Check**:
1. AI Service is running: `docker ps | grep ai-service`
2. MongoDB is accessible: `docker logs documind-mongo`
3. RabbitMQ has messages: Check [RabbitMQ console](http://localhost:15672)
4. Ollama is available: `curl http://localhost:11434/api/tags`

**Solution**:
```bash
# Restart AI Service
docker restart documind-ai-service

# Check logs
docker logs -f documind-ai-service
```

### "Interview not found" Error
- Ensure interview has been uploaded and transcription completed
- Check MongoDB: `db.interviews.findOne({interviewId: "..."})`

### "No transcripts" Error
- Wait for transcription worker to complete
- Check transcription-worker logs: `docker logs transcription-worker`

### RabbitMQ Connection Failed
- Ensure RabbitMQ is running: `docker logs documind-rabbitmq`
- Check network: `docker network ls`
- Verify credentials in docker-compose (default: guest/guest)

---

## Files Modified/Created

**Backend Files**:
- Created: [apps/backend/api/src/modules/interview/dto/interview-evaluation.dto.ts](apps/backend/api/src/modules/interview/dto/interview-evaluation.dto.ts)
- Created: [apps/backend/api/src/modules/interview/service/interview-evaluation-result.consumer.ts](apps/backend/api/src/modules/interview/service/interview-evaluation-result.consumer.ts)
- Modified: Interview schema, controller, service, module
- Modified: [apps/backend/api/src/core/queue.service.ts](apps/backend/api/src/core/queue.service.ts)

**AI Service Files**:
- Created: [services/ai-service/service/evaluator.py](services/ai-service/service/evaluator.py)
- Created: [services/ai-service/evaluation_consumer.py](services/ai-service/evaluation_consumer.py)
- Modified: [services/ai-service/main.py](services/ai-service/main.py)
- Modified: [services/ai-service/config.py](services/ai-service/config.py)
- Modified: [services/ai-service/requirements.txt](services/ai-service/requirements.txt)

**Docker Configuration**:
- Modified: [docker-compose.yml](docker-compose.yml)
- Modified: [docker-compose.dev.yml](docker-compose.dev.yml)

---

## Monitoring & Metrics

**Key Metrics to Track**:
- Evaluation request → response time (P50, P95, P99)
- Ollama API latency
- RabbitMQ queue depth
- Failed evaluations %
- Number of concurrent evaluations

**Suggested Setup**:
- Prometheus (already in docker-compose) for metrics
- Grafana dashboard for visualization
- CloudWatch/DataDog alerts for failures

---

## API Response Schema

```typescript
// Evaluation Results (in MongoDB)
{
  technical: 8.5,              // 1-10 scale
  communication: 7.5,          // 1-10 scale
  confidence: 8.0,             // 1-10 scale
  consistency: 7.8,            // 1-10 scale
  aiRisk: 2.5,                 // 1-10 scale (higher = more risk)
  strengths: [
    "Strong technical foundation",
    "Clear communication"
  ],
  weaknesses: [
    "Limited framework experience"
  ],
  summary: "Solid technical candidate with good communication skills..."
}
```

---

## Support & Debugging

**Common Issues**:
- **Timeout**: Increase Ollama timeout in `evaluator.py` (currently 120s)
- **Memory**: Ensure Ollama has enough resources (6GB+ recommended)
- **Network**: Check all services can reach each other (`docker network inspect documind-net`)

**Logs**:
```bash
# All services
docker compose logs -f

# Specific service
docker logs -f documind-api
docker logs -f documind-ai-service
docker logs -f documind-rabbitmq
```

---

## Ready to Deploy? 🚀

The API integration is complete and ready for:
1. ✅ Local testing (`docker-compose.yml`)
2. ✅ Development environment (`docker-compose.dev.yml`)
3. ✅ Production deployment (ensure Ollama resource limits)

**Next**: Add UI components to display evaluation results!
