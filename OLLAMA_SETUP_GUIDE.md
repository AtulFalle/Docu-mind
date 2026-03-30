# Ollama Setup and Troubleshooting Guide

## Overview
The DocuMind evaluation system uses Ollama to run the `llama3:8b` language model for interview evaluation. Ollama must be running and have the model loaded for evaluations to work.

## Prerequisites
- Ollama service is running in Docker
- Model `llama3:8b` is downloaded and available
- Ollama port 11434 is accessible from the AI service container

## Quick Start

### 1. Verify Ollama is Running
```bash
# Check if Ollama container is running
docker ps | grep ollama

# View Ollama logs
docker logs documind-ai-service  # or whatever your Ollama container name is
```

### 2. Pull the Required Model
The first time you run the system, you need to pull the model into Ollama. This can take 10-30 minutes depending on your internet connection.

```bash
# Check if model exists
docker exec documind-ai-service curl http://localhost:11434/api/tags

# Pull the model (if not present)
docker exec documind-ai-service ollama pull llama3:8b
```

### 3. Run Diagnostic Test
Once Ollama is running with the model, verify everything works:

```bash
# From the ai-service container
docker exec documind-ai-service python test_ollama.py

# Or from your local machine (if Python is available)
cd services/ai-service
python test_ollama.py
```

## Common Issues and Solutions

### Issue: "Ollama returned empty response"
**Cause**: The model is not loaded or is still loading.

**Solution**:
1. Check if model exists:
   ```bash
   docker exec documind-ai-service ollama list
   ```

2. If model not present, pull it:
   ```bash
   docker exec documind-ai-service ollama pull llama3:8b
   ```

3. Wait for the pull to complete (watch the logs):
   ```bash
   docker logs documind-ai-service --follow
   ```

### Issue: "Failed to connect to Ollama service"
**Cause**: Ollama service is not running or not accessible.

**Solution**:
1. Verify Ollama container is running:
   ```bash
   docker ps | grep ollama
   ```

2. Start Ollama if not running:
   ```bash
   docker-compose up -d ollama
   ```

3. Check Ollama logs for errors:
   ```bash
   docker logs documind-ollama
   ```

### Issue: "Model 'llama3:8b' is not available"
**Cause**: Model hasn't been downloaded into Ollama.

**Solution**:
```bash
# Pull the model
docker exec documind-ollama ollama pull llama3:8b

# Verify it was pulled
docker exec documind-ollama ollama list
```

### Issue: Timeout during evaluation
**Cause**: Model is too slow to respond or is being swapped out of memory.

**Solution**:
1. Check system resources (CPU, RAM, disk):
   ```bash
   docker stats documind-ollama
   ```

2. Increase timeout in evaluator.py if resources are constrained:
   ```python
   self.timeout = 300  # 5 minutes instead of 120 seconds
   ```

3. Switch to a smaller model if available (e.g., `mistral` or `neural-chat`)

## Model Information

### Current Model: llama3:8b
- **Size**: ~4.7 GB
- **Memory Required**: ~8-10 GB RAM
- **Speed**: ~20-30 tokens/second (varies by hardware)
- **Quality**: Excellent for interview evaluation

### Alternative Models (if resources are limited)
- `mistral:latest` (~4 GB, faster, less accurate)
- `neural-chat:latest` (~4 GB, good for conversations)
- `dolphin-mixtral:recommended` (~26 GB, very powerful but memory intensive)

## Monitoring Evaluation Performance

### Check AI Service Logs
```bash
docker logs documind-ai-service -f --tail=100
```

### Look for Success Indicators
```
[RECEIVED] Evaluation request: event=interview.evaluation_requested
Checking Ollama health at http://ollama:11434...
✓ Model 'llama3:8b' is available in Ollama
Sending evaluation request to Ollama (model: llama3:8b)
Raw Ollama response received for interview evaluation
Parsed evaluation JSON successfully
✓ INTERVIEW EVALUATION COMPLETED SUCCESSFULLY
```

### Look for Error Indicators
```
✗ Failed to connect to Ollama service
✗ Model 'llama3:8b' is not available
✗ Ollama returned empty response
✗ Failed to parse Ollama response as JSON
```

## Manual Testing

### Test Ollama Connectivity
```bash
curl http://localhost:11434/api/tags
```

Expected output:
```json
{
  "models": [
    {
      "name": "llama3:8b",
      "modified_at": "2024-...",
      "size": ...
    }
  ]
}
```

### Test Model Generation
```bash
curl -X POST http://localhost:11434/api/generate \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "llama3:8b",
    "prompt": "Hello, how are you?",
    "stream": false
  }'
```

Expected: A JSON response with a `response` field containing generated text.

## Rebuilding After Ollama Issues

Sometimes you need to restart everything:

```bash
# Stop all services
docker-compose down

# Remove Ollama data (WARNING: loses downloaded models)
docker volume rm docu-mind_ollama-data

# Restart services
docker-compose up -d

# Re-pull model
docker exec documind-ollama ollama pull llama3:8b
```

## Performance Tuning

### Increase Timeout for Slow Systems
Edit `services/ai-service/service/evaluator.py`:
```python
self.timeout = 300  # seconds
```

### Adjust Model Parameters
In `evaluation_consumer.py`, modify the Ollama request:
```python
response = requests.post(
    f"{self.ollama_url}/api/generate",
    json={
        "model": self.model,
        "prompt": prompt,
        "stream": False,
        "options": {
            "num_predict": 500,  # Max tokens to generate
            "temperature": 0.7,
            "top_k": 40,
            "top_p": 0.9,
        }
    },
    timeout=self.timeout,
)
```

## Getting Help

When reporting issues, include:
1. Output of diagnostic test: `python test_ollama.py`
2. Docker ps output: `docker ps | grep ollama`
3. Ollama logs: `docker logs documind-ollama`
4. AI service logs: `docker logs documind-ai-service`
5. System resources: `docker stats`
