# Quick Fix: Empty Ollama Response

## Symptoms
```
ERROR:service.evaluator:Failed to parse Ollama response as JSON
Could not extract valid JSON from Ollama response: line 1 column 1 (char 0)
```

## Root Cause
The Ollama service is running but returning an empty response. This typically means:
1. The `llama3:8b` model is NOT downloaded into Ollama
2. The model is still loading (first-time setup)
3. Ollama process crashed or restarted

## Quick Diagnosis
Run this in the AI service container:
```bash
# Check available models
docker exec documind-ai-service ollama list

# Check Ollama health
curl http://ollama:11434/api/tags | python -m json.tool
```

If llama3:8b is NOT listed, you need to pull it.

## Quick Fix
```bash
# Pull the model (first time, takes 10-30 minutes)
docker exec documind-ai-service ollama pull llama3:8b

# Verify it was downloaded
docker exec documind-ai-service ollama list

# Run diagnostic test
docker exec documind-ai-service python test_ollama.py
```

## After Fix
Try the evaluation again. You should now see:
```
✓ Model 'llama3:8b' is available in Ollama
Raw Ollama response received...
Parsed evaluation JSON successfully
✓ INTERVIEW EVALUATION COMPLETED SUCCESSFULLY
```

## Enhanced Debugging
The following improvements were made to help you diagnose issues:

### 1. **Ollama Health Check**
The evaluator now checks if Ollama is reachable and the model is available BEFORE attempting evaluation:
```
Checking Ollama health at http://ollama:11434...
Available Ollama models: [...]
✓ Model 'llama3:8b' is available in Ollama
```

### 2. **Better Error Messages**
Instead of generic JSON parsing errors, you now get:
```
✗ Ollama returned empty response
This usually means the model is still loading or not available.
```

### 3. **Detailed Response Logging**
All components of the Ollama response are now logged:
- HTTP status code
- Response keys
- Response length
- First 200 characters

### 4. **Diagnostic Script**
Run `test_ollama.py` to check everything:
```bash
python services/ai-service/test_ollama.py
```

This tests:
- Ollama connectivity
- Available models
- Model generation capability

## Logs to Check

### AI Service Logs
```bash
docker logs documind-ai-service -f
```

Look for sections like:
```
════════════════════════════════════════════════════════════
STARTING INTERVIEW EVALUATION
════════════════════════════════════════════════════════════
Checking Ollama health...
✓ Model 'llama3:8b' is available in Ollama
```

## Full Setup from Scratch

If evaluations still don't work after pulling the model:

```bash
# 1. Stop everything
docker-compose down

# 2. Restart services
docker-compose up -d

# 3. Wait 30 seconds for Ollama to start
sleep 30

# 4. Pull model
docker exec documind-ai-service ollama pull llama3:8b

# 5. Monitor progress (Ctrl+C to exit)
docker logs documind-ai-service -f

# 6. When download finishes, test
docker exec documind-ai-service python test_ollama.py
```

## Next Steps

See [OLLAMA_SETUP_GUIDE.md](OLLAMA_SETUP_GUIDE.md) for:
- Detailed troubleshooting
- Performance tuning
- Alternative models
- System requirements
