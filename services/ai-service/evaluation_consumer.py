"""
Interview Evaluation Consumer
Listens to RabbitMQ for interview evaluation requests and processes them.
"""

import pika
import json
import logging
from datetime import datetime
from pymongo import MongoClient
from service.evaluator import evaluate_interview_transcript
from config import (
    RABBITMQ_HOST,
    RABBITMQ_PORT,
    RABBITMQ_USER,
    RABBITMQ_PASSWORD,
    MONGODB_URL,
    MONGODB_DB,
    MONGODB_COLLECTION_INTERVIEWS,
)

logger = logging.getLogger(__name__)

# MongoDB client (will be initialized in start())
mongodb_client = None
mongodb_db = None


def get_mongodb_collection(collection_name: str):
    """Get a MongoDB collection"""
    global mongodb_db
    if mongodb_db is None:
        raise Exception("MongoDB connection not initialized")
    return mongodb_db[collection_name]


def concatenate_transcripts(transcripts: list) -> str:
    """
    Concatenate transcript segments into a single text.

    Args:
        transcripts: List of transcript segments with 'text' field

    Returns:
        Concatenated transcript text
    """
    if not transcripts:
        return ""

    # Sort by timestamp if available
    sorted_transcripts = sorted(transcripts, key=lambda x: x.get("start", 0))

    # Concatenate text segments
    full_text = "\n".join([segment.get("text", "") for segment in sorted_transcripts])

    return full_text.strip()


def callback(ch, method, properties, body):
    """
    Process interview evaluation requests from the queue.
    """
    try:
        msg = json.loads(body)
        logger.info(f"[RECEIVED] Evaluation request: event={msg.get('event')}, interviewId={msg.get('data', {}).get('interviewId')}")

        if msg.get("event") == "interview.evaluation_requested":
            data = msg.get("data", {})
            interview_id = data.get("interviewId")

            if not interview_id:
                logger.error("No interviewId in evaluation request")
                ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
                return

            logger.info(f"Processing evaluation for interview: {interview_id}")

            try:
                # Fetch interview from MongoDB
                interviews_collection = get_mongodb_collection(
                    MONGODB_COLLECTION_INTERVIEWS
                )
                interview = interviews_collection.find_one(
                    {"interviewId": interview_id}
                )

                if not interview:
                    error_msg = f"Interview {interview_id} not found in MongoDB"
                    logger.error(error_msg)
                    update_evaluation_status(
                        interview_id, "failed", error=error_msg
                    )
                    ch.basic_ack(delivery_tag=method.delivery_tag)
                    return

                # Check if interview has transcripts
                transcripts = interview.get("transcripts", [])
                if not transcripts:
                    error_msg = f"Interview {interview_id} has no transcripts"
                    logger.error(error_msg)
                    update_evaluation_status(
                        interview_id, "failed", error=error_msg
                    )
                    ch.basic_ack(delivery_tag=method.delivery_tag)
                    return

                # Concatenate transcripts
                full_transcript = concatenate_transcripts(transcripts)

                if not full_transcript:
                    error_msg = f"Interview {interview_id} transcript is empty"
                    logger.error(error_msg)
                    update_evaluation_status(
                        interview_id, "failed", error=error_msg
                    )
                    ch.basic_ack(delivery_tag=method.delivery_tag)
                    return

                logger.info(
                    f"Evaluating interview {interview_id}, transcript length: {len(full_transcript)} chars"
                )

                # Call evaluator
                evaluation_result = evaluate_interview_transcript(full_transcript)

                logger.info(
                    f"✓ Evaluation completed. Result obtained with fields: {list(evaluation_result.keys()) if evaluation_result else 'None'}"
                )
                logger.info(
                    f"  Technical: {evaluation_result.get('technical')}, Communication: {evaluation_result.get('communication')}"
                )

                # Publish result to result queue
                publish_evaluation_result(interview_id, "completed", evaluation_result)

                logger.info(
                    f"✓ Evaluation evaluation completed for interview {interview_id}"
                )

            except Exception as eval_error:
                error_msg = f"Evaluation failed for {interview_id}: {str(eval_error)}"
                logger.error(error_msg, exc_info=True)
                publish_evaluation_result(interview_id, "failed", error=str(eval_error))

        else:
            logger.warning(f"Unknown event type: {msg.get('event')}")

        ch.basic_ack(delivery_tag=method.delivery_tag)

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse message as JSON: {str(e)}")
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
    except Exception as e:
        logger.error(f"Error processing message: {str(e)}", exc_info=True)
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)


def update_evaluation_status(
    interview_id: str, status: str, error: str = None
) -> None:
    """
    Update evaluation status in MongoDB (for failed/in-progress states).

    Args:
        interview_id: The interview ID
        status: Status value ('pending', 'completed', 'failed')
        error: Error message if applicable
    """
    try:
        interviews_collection = get_mongodb_collection(
            MONGODB_COLLECTION_INTERVIEWS
        )

        update_data = {
            "evaluation.status": status,
        }

        if error:
            update_data["evaluation.error"] = error
            update_data["evaluation.completedAt"] = datetime.utcnow()

        interviews_collection.update_one(
            {"interviewId": interview_id},
            {"$set": update_data},
        )

        logger.info(
            f"Updated evaluation status for {interview_id} to {status}"
        )

    except Exception as e:
        logger.error(
            f"Failed to update evaluation status for {interview_id}: {str(e)}"
        )


def publish_evaluation_result(
    interview_id: str, status: str, result: dict = None, error: str = None
) -> None:
    """
    Publish evaluation result to the result queue for backend consumption.

    Args:
        interview_id: The interview ID
        status: Status ('completed' or 'failed')
        result: Evaluation result dictionary (if status is 'completed')
        error: Error message (if status is 'failed')
    """
    try:
        # Re-use the same RabbitMQ connection setup as start()
        credentials = pika.PlainCredentials(RABBITMQ_USER, RABBITMQ_PASSWORD)
        connection = pika.BlockingConnection(
            pika.ConnectionParameters(
                host=RABBITMQ_HOST,
                port=RABBITMQ_PORT,
                credentials=credentials,
                heartbeat=600,
                blocked_connection_timeout=300,
                connection_attempts=3,
                retry_delay=2,
            )
        )
        channel = connection.channel()
        channel.queue_declare(queue="interview.evaluation_results", durable=True)

        message = {
            "event": "interview.evaluation_completed",
            "data": {
                "interviewId": interview_id,
                "status": status,
                "timestamp": datetime.utcnow().isoformat(),
            },
        }

        if result:
            message["data"]["result"] = result
            logger.info(
                f"✓ Publishing evaluation COMPLETED for interview {interview_id}"
            )
            logger.info(
                f"  Result fields: {list(result.keys())}"
            )
            logger.info(
                f"  Full result being published: {json.dumps(result, indent=2)}"
            )
        else:
            logger.warn(
                f"✗ No result provided for interview {interview_id}, status: {status}"
            )

        if error:
            message["data"]["error"] = error
            logger.info(f"  Error: {error}")

        logger.debug(f"Full RabbitMQ message: {json.dumps(message)}")

        channel.basic_publish(
            exchange="",
            routing_key="interview.evaluation_results",
            body=json.dumps(message),
            properties=pika.BasicProperties(delivery_mode=2),
        )

        logger.info(f"✓ Message published to queue for interview {interview_id}")
        connection.close()

    except Exception as e:
        logger.error(
            f"✗ Failed to publish evaluation result for {interview_id}: {str(e)}",
            exc_info=True,
        )


def start():
    """Start the evaluation consumer"""
    global mongodb_client, mongodb_db

    try:
        logger.info(f"Connecting to MongoDB at {MONGODB_URL}...")
        mongodb_client = MongoClient(MONGODB_URL)
        mongodb_db = mongodb_client[MONGODB_DB]

        # Test connection
        mongodb_client.admin.command("ping")
        logger.info("MongoDB connection successful")

        logger.info(
            f"Connecting to RabbitMQ at {RABBITMQ_HOST}:{RABBITMQ_PORT}..."
        )

        credentials = pika.PlainCredentials(RABBITMQ_USER, RABBITMQ_PASSWORD)
        connection = pika.BlockingConnection(
            pika.ConnectionParameters(
                host=RABBITMQ_HOST,
                port=RABBITMQ_PORT,
                credentials=credentials,
                heartbeat=600,
                blocked_connection_timeout=300,
                connection_attempts=3,
                retry_delay=2,
            )
        )
        channel = connection.channel()

        # Declare queue
        channel.queue_declare(queue="interview.evaluation", durable=True)

        # Set QoS to process one message at a time
        channel.basic_qos(prefetch_count=1)

        logger.info("Evaluation consumer started. Waiting for messages...")
        channel.basic_consume(
            queue="interview.evaluation", on_message_callback=callback
        )

        channel.start_consuming()

    except Exception as e:
        logger.error(f"Error starting evaluation consumer: {str(e)}", exc_info=True)
        raise
    finally:
        if mongodb_client:
            mongodb_client.close()


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )
    start()
