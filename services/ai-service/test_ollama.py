#!/usr/bin/env python3
"""
Diagnostic script to test Ollama connectivity and model availability.
Run this to verify Ollama is working correctly before running evaluations.
"""

import requests
import sys
import logging
from config import OLLAMA_URL

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

def test_ollama_connectivity():
    """Test if Ollama is reachable."""
    logger.info(f"Testing Ollama connectivity at {OLLAMA_URL}...")
    try:
        response = requests.get(f"{OLLAMA_URL}/api/tags", timeout=10)
        response.raise_for_status()
        logger.info("✓ Ollama is reachable")
        return True
    except requests.exceptions.ConnectionError as e:
        logger.error(f"✗ Cannot connect to Ollama: {str(e)}")
        logger.error(f"  Make sure Ollama is running at {OLLAMA_URL}")
        return False
    except Exception as e:
        logger.error(f"✗ Error connecting to Ollama: {str(e)}")
        return False

def test_ollama_models():
    """Check available models in Ollama."""
    logger.info("Checking available models in Ollama...")
    try:
        response = requests.get(f"{OLLAMA_URL}/api/tags", timeout=10)
        response.raise_for_status()
        
        result = response.json()
        models = result.get("models", [])
        
        if not models:
            logger.warning("⚠ No models loaded in Ollama")
            logger.info("  You need to pull at least one model. Example:")
            logger.info("  docker exec documind-ai-service ollama pull llama3:8b")
            return False
        
        logger.info(f"✓ Found {len(models)} model(s):")
        for model in models:
            name = model.get('name', 'unknown')
            digest = model.get('digest', '')[:12]
            size = model.get('size', 0) / (1024**3)  # Convert to GB
            logger.info(f"  - {name} ({size:.1f}GB)")
        
        # Check for llama3:8b
        model_names = [m.get('name', '') for m in models]
        if any('llama3' in m and '8b' in m for m in model_names):
            logger.info("✓ Required model 'llama3:8b' is available")
            return True
        else:
            logger.warning("⚠ Model 'llama3:8b' not found")
            logger.info("  Pull it with: docker exec documind-ai-service ollama pull llama3:8b")
            return False
        
    except Exception as e:
        logger.error(f"✗ Error checking models: {str(e)}")
        return False

def test_ollama_generation():
    """Test if Ollama can generate a response."""
    logger.info("Testing Ollama text generation...")
    try:
        response = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json={
                "model": "llama3:8b",
                "prompt": "Say 'Hello, World!' in exactly 3 words.",
                "stream": False,
            },
            timeout=60,
        )
        response.raise_for_status()
        
        result = response.json()
        generated_text = result.get("response", "").strip()
        
        if generated_text:
            logger.info("✓ Ollama generation works")
            logger.info(f"  Response: {generated_text[:100]}...")
            return True
        else:
            logger.error("✗ Ollama returned empty response")
            logger.info(f"  Full response: {result}")
            return False
            
    except requests.exceptions.Timeout:
        logger.error("✗ Ollama request timed out")
        logger.info("  The model might be too slow or still loading")
        return False
    except Exception as e:
        logger.error(f"✗ Error testing generation: {str(e)}")
        return False

def main():
    """Run all diagnostic tests."""
    logger.info("=" * 60)
    logger.info("OLLAMA DIAGNOSTIC TEST")
    logger.info("=" * 60)
    
    tests = [
        ("Connectivity", test_ollama_connectivity),
        ("Models", test_ollama_models),
        ("Generation", test_ollama_generation),
    ]
    
    results = []
    for test_name, test_func in tests:
        logger.info(f"\n[{test_name}]")
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            logger.error(f"✗ Test failed with exception: {str(e)}")
            results.append((test_name, False))
    
    logger.info("\n" + "=" * 60)
    logger.info("SUMMARY")
    logger.info("=" * 60)
    
    all_passed = True
    for test_name, passed in results:
        status = "✓ PASS" if passed else "✗ FAIL"
        logger.info(f"{status}: {test_name}")
        if not passed:
            all_passed = False
    
    logger.info("=" * 60)
    
    if all_passed:
        logger.info("✓ All tests passed! Ollama is ready for evaluations.")
        return 0
    else:
        logger.error("✗ Some tests failed. See details above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
