# Interview Evaluation API - Testing Guide

## Quick Start

### 1. Install Dependencies
```bash
# AI Service - add pymongo to requirements
cd services/ai-service
pip install -r requirements.txt
```

### 2. Start Services
Ensure these are running:
- ✅ MongoDB (port 27017)
- ✅ RabbitMQ (port 5672)
- ✅ Ollama (port 11434, with llama3:8b model)
- ✅ Backend API (port 3000)
- ⏳ AI Service Evaluation Consumer (new)

Start evaluation consumer in separate terminal:
```bash
cd services/ai-service
python evaluation_consumer.py
```

---

## Test Workflow

### Step 1: Upload an Interview (Baseline)
```bash
curl -X POST http://localhost:3000/interview/upload \
  -F "video=@sample-interview.mp4"

# Response:
{
  "interviewId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "uploaded",
  "videoPath": "video/550e8400-e29b-41d4-a716-446655440000.mp4",
  "audioPath": "audio/550e8400-e29b-41d4-a716-446655440000.wav"
}
```

### Step 2: Wait for Transcription Complete
Poll interview status until `status` becomes `"completed"`:
```bash
curl http://localhost:3000/interview/550e8400-e29b-41d4-a716-446655440000

# Expected:
{
  "status": "completed",  # Not "processing"
  "transcripts": [
    { "start": 0, "end": 2500, "text": "..." },
    ...
  ]
}
```

### Step 3: Request Evaluation ⭐ NEW
```bash
curl -X POST http://localhost:3000/interview/550e8400-e29b-41d4-a716-446655440000/evaluate

# Response (immediate):
{
  "status": "pending",
  "message": "Evaluation job has been queued for processing"
}

# Check MongoDB after this:
db.interviews.findOne({ interviewId: "550e8400..." })
# Should see: evaluation: { status: "pending", requestedAt: ISODate(...) }
```

### Step 4: Poll Evaluation Status
```bash
curl http://localhost:3000/interview/550e8400-e29b-41d4-a716-446655440000/evaluation

# Response while processing (15-30 seconds):
{
  "status": "pending",
  "requestedAt": "2024-03-30T12:00:00.000Z"
}

# Response after completion:
{
  "status": "completed",
  "result": {
    "technical": 8.5,
    "communication": 7.5,
    "confidence": 8.0,
    "consistency": 7.8,
    "aiRisk": 2.5,
    "strengths": [
      "Strong technical foundation",
      "Clear communication style",
      "Good problem-solving approach"
    ],
    "weaknesses": [
      "Limited experience with specific framework",
      "Could provide more examples"
    ],
    "summary": "Candidate demonstrates solid technical knowledge with clear communication skills. Shows confidence in problem-solving but may benefit from more hands-on framework experience."
  },
  "requestedAt": "2024-03-30T12:00:00.000Z",
  "completedAt": "2024-03-30T12:01:30.000Z"
}
```

---

## Verify Data Flow

### Check RabbitMQ Queues
Manager UI: `http://localhost:15672` (guest/guest)

Should see:
- ✅ `interview.evaluation` - Queue for evaluation requests (should be empty after processing)
- ✅ `interview.evaluation_results` - Result queue (should be empty after backend consumes)

### Check MongoDB Document
```bash
db.interviews.findOne({ interviewId: "550e8400..." })

# Should have:
{
  "interviewId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "transcripts": [...],
  "evaluation": {
    "status": "completed",
    "result": {
      "technical": 8.5,
      ...
    },
    "completedAt": ISODate("2024-03-30T12:01:30.000Z")
  }
}
```

### Check Service Logs
**Backend API logs:**
```
[nestjs] POST /interview/550e8400.../evaluate
[interview.service] Evaluation job queued for interviewId: 550e8400...
[queue.service] Received message: interview.evaluation_completed
[evaluation-result-consumer] Evaluation result updated for interview 550e8400...
```

**AI Service logs:**
```
[evaluation_consumer] Received evaluation request: {event: "interview.evaluation_requested", ...}
[evaluation_consumer] Processing evaluation for interview: 550e8400...
[evaluator] Sending evaluation request to Ollama (model: llama3:8b)
[evaluator] Interview evaluation completed successfully
[evaluation_consumer] Published evaluation result for interview 550e8400...
```

---

## Error Testing

### Test 1: Invalid Interview ID
```bash
curl -X POST http://localhost:3000/interview/invalid-id/evaluate

# Expected: 400/404 with error message
{ "error": "Failed to request evaluation: Interview invalid-id not found" }
```

### Test 2: Interview Not Yet Completed
```bash
# Upload interview, immediately request evaluation (before transcription completes)
curl -X POST http://localhost:3000/interview/{id}/evaluate

# Expected: 400 with error
{ "error": "Interview is not in completed status. Current status: processing" }
```

### Test 3: No Transcripts
```bash
# Manually create interview in MongoDB with status: "completed" but empty transcripts: []
# Then request evaluation

# Expected: 400 with error
{ "error": "Interview has no transcripts available" }
```

### Test 4: Ollama Timeout (Simulate)
Stop Ollama, then request evaluation:
```bash
curl -X POST http://localhost:3000/interview/{id}/evaluate

# Poll status after ~120 seconds:
curl http://localhost:3000/interview/{id}/evaluation

# Expected: error status
{
  "status": "failed",
  "error": "Ollama service timeout after 120 seconds"
}
```

---

## Response Validation Checklist

✅ **All numeric fields are 1-10 scale:**
- `technical` ∈ [1, 10]
- `communication` ∈ [1, 10]
- `confidence` ∈ [1, 10]
- `consistency` ∈ [1, 10]
- `aiRisk` ∈ [1, 10]

✅ **Arrays are populated:**
- `strengths` has at least 1 item
- `weaknesses` has at least 1 item
- Each item is a string

✅ **Summary:**
- Is a string
- Not empty
- 1-3 sentences typical

✅ **Status Flow:**
- POST returns "pending" immediately
- GET transitions: pending → completed/failed
- Timestamps are ISO format

---

## Debugging Tips

### If evaluation never completes:

1. **Check AI service consumer is running:**
   ```bash
   ps aux | grep evaluation_consumer
   ```

2. **Check AI service logs for errors:**
   - MongoDB connection failed?
   - Ollama unreachable?

3. **Check RabbitMQ messages:**
   - Are messages in `interview.evaluation` queue?
   - Are they being consumed?

4. **Test Ollama directly:**
   ```bash
   curl http://localhost:11434/api/tags
   # Should list llama3:8b
   ```

### If GET endpoint returns error "500":

1. **Check backend logs** for exception
2. **Verify MongoDB connection** in backend
3. **Check interview record** exists in MongoDB

### If RabbitMQ queues not created:

Services auto-declare queues on startup:
- Backend: declares on QueueService.onModuleInit()
- AI Service: declares on evaluation_consumer.start()

Restart services if manually deleted queues.

---

## Expected Performance

- **Time to evaluate:** 15-45 seconds (depends on transcript length & Ollama hardware)
- **Ollama timeout:** 120 seconds (hardcoded, can adjust in evaluator.py)
- **Prompt eval:** ~2-5KB of Ollama response

---

## Monitoring in Production

**Key metrics to track:**
- Evaluation request → completion time (P50, P95, P99)
- Ollama API response times
- RabbitMQ queue depth (should be near 0)
- Failed evaluations % rate

**Alerts to set:**
- Queue depth > 100 (Ollama bottleneck)
- Evaluation timeout rate > 5%
- MongoDB connection failures
