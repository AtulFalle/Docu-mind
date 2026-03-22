import pika
import json
import logging
from service.pipeline import process_document
from config import RABBITMQ_HOST, RABBITMQ_PORT, RABBITMQ_USER, RABBITMQ_PASSWORD

logger = logging.getLogger(__name__)

def callback(ch, method, properties, body):
    try:
        msg = json.loads(body)
        logger.info(f"Received message: {msg}")

        if msg["event"] == "document.uploaded":
            data = msg["data"]
            logger.info(f"Processing document: {data['docId']}")

            process_document(
                data["docId"],
                data["bucket"],
                data["key"]
            )
            
            logger.info(f"Document {data['docId']} processing completed")

        ch.basic_ack(delivery_tag=method.delivery_tag)
    except Exception as e:
        logger.error(f"Error processing message: {str(e)}", exc_info=True)
        # DO NOT requeue always to avoid infinite retry loops on fatal errors.
        # Requeue only if this is explicitly transient and we expect a fix shortly.
        # Here we drop message after logging a failure so the consumer can continue.
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

def start():
    try:
        logger.info(f"Connecting to RabbitMQ at {RABBITMQ_HOST}:{RABBITMQ_PORT}...")
        
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
        channel.queue_declare(queue='document_queue', durable=True)
        
        # Set QoS to process one message at a time
        channel.basic_qos(prefetch_count=1)

        logger.info("RabbitMQ consumer started. Waiting for messages...")
        channel.basic_consume(queue='document_queue', on_message_callback=callback)
        
        channel.start_consuming()
    except Exception as e:
        logger.error(f"Error starting consumer: {str(e)}", exc_info=True)
        raise