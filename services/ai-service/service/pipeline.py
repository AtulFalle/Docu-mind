import logging
import os
from .extractor import extract_pdf
from .normalizer import normalize_resume
from .chunker import chunk_content
from .embedding import embed_text
from .vector_store import store_vectors
from .storage import download_file

logger = logging.getLogger(__name__)

def process_document(doc_id, bucket, key):
    """
    Process a PDF document: extract, normalize, chunk, embed and store vectors.
    
    Args:
        doc_id: Document ID
        bucket: MinIO bucket name
        key: MinIO object key
    """
    try:
        logger.info(f"Starting document processing for doc_id={doc_id}")
        file_path = f"/tmp/{doc_id}.pdf"

        # Download from MinIO
        logger.info(f"Downloading document from {bucket}/{key}")
        download_file(bucket, key, file_path)
        
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Downloaded file not found at {file_path}")

        # Extract PDF content
        logger.info(f"Extracting PDF content from {file_path}")
        pages = extract_pdf(file_path)
        logger.info(f"Extracted {len(pages)} pages from PDF")

        # Normalize content
        logger.info("Normalizing extracted content")
        content = normalize_resume(pages)

        # Chunk content
        logger.info("Chunking content")
        chunks = chunk_content(content)
        logger.info(f"Created {len(chunks)} chunks")

        # Generate embeddings
        logger.info("Generating embeddings for chunks")
        vectors = []
        for i, chunk in enumerate(chunks):
            logger.debug(f"Processing chunk {i+1}/{len(chunks)}")
            try:
                embedding = embed_text(chunk["text"])
                vectors.append({
                    "embedding": embedding,
                    "text": chunk["text"],
                    "page": chunk.get("page")
                })
            except Exception as exc:
                logger.error(f"Failed to embed chunk {i+1}/{len(chunks)}: {exc}", exc_info=True)
                # continue with next chunk; if all fail we raise below
                continue

        if not vectors:
            raise RuntimeError("No embeddings generated for document after chunk processing")

        # Store vectors in Qdrant
        logger.info(f"Storing {len(vectors)} vectors in vector database")
        store_vectors(doc_id, vectors)

        logger.info(f"Document processing completed successfully for doc_id={doc_id}")
        
        # Cleanup
        if os.path.exists(file_path):
            os.remove(file_path)
            logger.debug(f"Cleaned up temporary file {file_path}")
            
    except Exception as e:
        logger.error(f"Error processing document {doc_id}: {str(e)}", exc_info=True)
        # Clean up on failure
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except:
            pass
        raise