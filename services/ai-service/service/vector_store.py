from qdrant_client import QdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchValue, VectorParams, Distance
from config import QDRANT_HOST, COLLECTION_NAME

client = QdrantClient(host=QDRANT_HOST, port=6333)

def init_collection():
    if COLLECTION_NAME not in [c.name for c in client.get_collections().collections]:
        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(size=768, distance=Distance.COSINE)
        )

def store_vectors(doc_id, vectors):
    points = []

    for i, v in enumerate(vectors):
        points.append({
            "id": i,
            "vector": v["embedding"],
            "payload": {
                "text": v["text"],
                "doc_id": doc_id,
                "page": v["page"]
            }
        })

    client.upsert(collection_name=COLLECTION_NAME, points=points)


def search(doc_id, embedding):
    filter_condition = Filter(
        must=[
            FieldCondition(
                key="doc_id",
                match=MatchValue(value=doc_id)
            )
        ]
    )

    try:
        # Preferred (modern)
        results = client.search(
            collection_name=COLLECTION_NAME,
            query_vector=embedding,
            query_filter=filter_condition,
            limit=5
        )
        return results

    except Exception:
        # Fallback for newer query_points API
        response = client.query_points(
            collection_name=COLLECTION_NAME,
            query=embedding,   # ✅ FIX HERE
            query_filter=filter_condition,
            limit=5
        )
        return response.points
