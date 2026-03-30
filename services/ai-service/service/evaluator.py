"""
Interview Evaluation Service
Uses Ollama to evaluate interview transcripts based on various criteria.
"""

import json
import requests
import logging
from typing import Dict, List, Any
from config import OLLAMA_URL

logger = logging.getLogger(__name__)


class InterviewEvaluator:
    """Evaluates interview transcripts using Ollama LLM"""

    EVALUATION_PROMPT_TEMPLATE = """
You are an expert interview evaluator. Your task is to analyze the provided interview transcript and evaluate the candidate's performance.

Analyze the interview transcript and provide a comprehensive evaluation. Rate the candidate on a scale of 1-10 for each metric, where 1 is poor and 10 is excellent.

TRANSCRIPT:
{transcript}

Based on the transcript above, provide your evaluation in the following JSON format (ensure it's valid JSON):
{{
  "technical": <number 1-10>,
  "communication": <number 1-10>,
  "confidence": <number 1-10>,
  "consistency": <number 1-10>,
  "aiRisk": <number 1-10 - higher means more risk of AI-generated answers>,
  "strengths": [<array of strings - key strengths demonstrated>],
  "weaknesses": [<array of strings - areas for improvement>],
  "summary": "<string - 2-3 sentences overall assessment>"
}}

Ensure your response is ONLY valid JSON, nothing else. Do not include any markdown formatting or code blocks.
"""

    def __init__(self, ollama_url: str = OLLAMA_URL, model: str = "llama3:8b"):
        """
        Initialize the evaluator with Ollama connection details.

        Args:
            ollama_url: URL to Ollama service
            model: Model name to use for evaluation
        """
        self.ollama_url = ollama_url
        self.model = model
        self.timeout = 3000  # 5 minutes timeout for Ollama response (increased from 120s for slow systems)
        
        logger.info(f"InterviewEvaluator initialized with model={model}, url={ollama_url}, timeout={self.timeout}s")

    def check_ollama_health(self) -> bool:
        """
        Check if Ollama service is healthy and model is available.

        Returns:
            True if healthy, False otherwise
        """
        try:
            logger.info(f"Checking Ollama health at {self.ollama_url}...")
            response = requests.get(f"{self.ollama_url}/api/tags", timeout=10)
            response.raise_for_status()
            
            result = response.json()
            models = result.get("models", [])
            logger.info(f"Available Ollama models: {[m.get('name') for m in models]}")
            
            # Check if our model is in the list
            available_models = [m.get('name', '') for m in models]
            if any(self.model in m for m in available_models):
                logger.info(f"✓ Model '{self.model}' is available in Ollama")
                return True
            else:
                logger.warning(f"✗ Model '{self.model}' NOT found in Ollama. Available: {available_models}")
                return False
        except Exception as e:
            logger.error(f"✗ Failed to reach Ollama at {self.ollama_url}: {str(e)}")
            return False

    def evaluate_interview(self, transcript: str) -> Dict[str, Any]:
        """
        Evaluate an interview transcript.

        Args:
            transcript: The interview transcript text

        Returns:
            Dictionary containing evaluation results with keys:
            - technical: float (1-10)
            - communication: float (1-10)
            - confidence: float (1-10)
            - consistency: float (1-10)
            - aiRisk: float (1-10)
            - strengths: List[str]
            - weaknesses: List[str]
            - summary: str

        Raises:
            Exception: If evaluation fails
        """
        try:
            if not transcript or not transcript.strip():
                raise ValueError("Transcript cannot be empty")

            logger.info("═" * 60)
            logger.info("STARTING INTERVIEW EVALUATION")
            logger.info("═" * 60)

            # Check Ollama health before proceeding
            if not self.check_ollama_health():
                raise Exception(
                    f"Ollama service is not healthy or model '{self.model}' is not available. "
                    f"Please ensure Ollama is running and model is loaded."
                )

            # Prepare the prompt
            prompt = self.EVALUATION_PROMPT_TEMPLATE.format(transcript=transcript)

            logger.info(f"Sending evaluation request to Ollama (model: {self.model})")
            logger.debug(f"Prompt length: {len(prompt)} characters")

            # Call Ollama API
            response = requests.post(
                f"{self.ollama_url}/api/generate",
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "stream": False,
                },
                timeout=self.timeout,
            )

            logger.info(f"Ollama HTTP Status: {response.status_code}")
            
            response.raise_for_status()

            result = response.json()
            logger.info(f"Ollama full response object keys: {result.keys()}")
            
            # Check for error in response
            if result.get("error"):
                error_msg = f"Ollama returned error: {result.get('error')}"
                logger.error(error_msg)
                raise Exception(error_msg)
            
            generated_text = result.get("response", "").strip()

            logger.info(f"Raw Ollama response received for interview evaluation")
            logger.info(f"Response length: {len(generated_text)} characters")
            
            if not generated_text:
                error_msg = (
                    f"Ollama returned empty response. Full response: {result}. "
                    f"This usually means the model is still loading or not available."
                )
                logger.error(error_msg)
                raise Exception(error_msg)
            
            logger.info(f"Raw response content:\n{generated_text}")

            logger.debug(f"Ollama response received, length: {len(generated_text)}")

            # Parse the response - attempt to extract JSON
            evaluation_data = self._parse_evaluation_response(generated_text)

            logger.info(f"Parsed evaluation JSON successfully: {evaluation_data}")

            # Validate the evaluation data
            self._validate_evaluation_data(evaluation_data)

            logger.info("═" * 60)
            logger.info("✓ INTERVIEW EVALUATION COMPLETED SUCCESSFULLY")
            logger.info("═" * 60)
            logger.info(f"  Technical: {evaluation_data.get('technical')}/10")
            logger.info(f"  Communication: {evaluation_data.get('communication')}/10")
            logger.info(f"  Confidence: {evaluation_data.get('confidence')}/10")
            logger.info(f"  Consistency: {evaluation_data.get('consistency')}/10")
            logger.info(f"  AI Risk: {evaluation_data.get('aiRisk')}/10")
            
            return evaluation_data

        except requests.exceptions.Timeout:
            error_msg = (
                f"✗ Ollama service timeout after {self.timeout} seconds. "
                f"This means Ollama took too long to respond. Possible causes:\n"
                f"  1. Model is still loading\n"
                f"  2. System resources (CPU/RAM) are low\n"
                f"  3. Model is too large for system\n"
                f"Consider:\n"
                f"  - Increasing timeout further\n"
                f"  - Using a smaller model (e.g., mistral:latest)\n"
                f"  - Adding more system RAM"
            )
            logger.error(error_msg)
            logger.error("═" * 60)
            raise Exception(error_msg)
        except requests.exceptions.ConnectionError as e:
            error_msg = f"✗ Failed to connect to Ollama service at {self.ollama_url}"
            logger.error(f"{error_msg}: {str(e)}")
            logger.error("═" * 60)
            raise Exception(error_msg)
        except json.JSONDecodeError as e:
            error_msg = f"✗ Failed to parse Ollama response as JSON: {str(e)}"
            logger.error(error_msg)
            logger.error("═" * 60)
            raise Exception(error_msg)
        except Exception as e:
            error_msg = f"✗ Evaluation failed: {str(e)}"
            logger.error(error_msg)
            logger.error("═" * 60)
            raise Exception(error_msg)

    def _parse_evaluation_response(self, response_text: str) -> Dict[str, Any]:
        """
        Parse the Ollama response and extract JSON evaluation data.

        Args:
            response_text: Raw text response from Ollama

        Returns:
            Parsed evaluation dictionary

        Raises:
            JSONDecodeError: If JSON cannot be parsed
        """
        logger.debug(f"Attempting to parse response text (length: {len(response_text)})")
        logger.debug(f"First 100 chars: {response_text[:100]}")
        
        # Try to extract JSON from the response
        # In case Ollama wraps it in markdown or text
        
        # First try direct JSON parsing
        try:
            logger.debug("Attempting direct JSON parsing...")
            result = json.loads(response_text)
            logger.info(f"✓ Direct JSON parsing succeeded")
            return result
        except json.JSONDecodeError as e:
            logger.debug(f"Direct parsing failed: {str(e)}")
            pass

        # Try to find JSON in the response (between { and })
        logger.debug("Attempting to extract JSON from text...")
        start_idx = response_text.find("{")
        end_idx = response_text.rfind("}") + 1

        logger.debug(f"Found {{ at index {start_idx}, found }} at index {end_idx-1}")

        if start_idx != -1 and end_idx > start_idx:
            try:
                json_str = response_text[start_idx:end_idx]
                logger.debug(f"Extracted JSON string (length: {len(json_str)}): {json_str[:100]}...")
                result = json.loads(json_str)
                logger.info(f"✓ Extracted JSON parsing succeeded")
                return result
            except json.JSONDecodeError as e:
                logger.warning(f"Extracted JSON parsing failed: {str(e)}")
                pass

        # If we still can't parse, raise error with more info
        error_msg = (
            f"Could not extract valid JSON from Ollama response. "
            f"Response length: {len(response_text)}, "
            f"First 200 chars: {response_text[:200]}"
        )
        logger.error(error_msg)
        raise json.JSONDecodeError(
            error_msg,
            response_text,
            0,
        )

    def _validate_evaluation_data(self, data: Dict[str, Any]) -> None:
        """
        Validate that the evaluation data has all required fields and valid values.

        Args:
            data: Evaluation data dictionary

        Raises:
            ValueError: If validation fails
        """
        required_fields = {
            "technical": (int, float),
            "communication": (int, float),
            "confidence": (int, float),
            "consistency": (int, float),
            "aiRisk": (int, float),
            "strengths": list,
            "weaknesses": list,
            "summary": str,
        }

        for field, expected_type in required_fields.items():
            if field not in data:
                raise ValueError(f"Missing required field: {field}")

            value = data[field]
            if not isinstance(value, expected_type):
                raise ValueError(
                    f"Field '{field}' has invalid type. Expected {expected_type}, got {type(value)}"
                )

            # Validate numeric fields are in range 1-10
            if field in ["technical", "communication", "confidence", "consistency", "aiRisk"]:
                if not (1 <= value <= 10):
                    raise ValueError(
                        f"Field '{field}' value must be between 1 and 10, got {value}"
                    )

            # Validate arrays are not empty
            if field in ["strengths", "weaknesses"]:
                if len(value) == 0:
                    raise ValueError(f"Field '{field}' cannot be empty")

        # Validate summary is not empty
        if not data["summary"].strip():
            raise ValueError("Summary cannot be empty")


def evaluate_interview_transcript(transcript: str) -> Dict[str, Any]:
    """
    Public function to evaluate an interview transcript.

    Args:
        transcript: The interview transcript text

    Returns:
        Evaluation results dictionary

    Raises:
        Exception: If evaluation fails
    """
    evaluator = InterviewEvaluator()
    return evaluator.evaluate_interview(transcript)
