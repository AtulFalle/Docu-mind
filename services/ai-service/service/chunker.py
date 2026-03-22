def chunk_content(content, size=20):
    chunks = []
    buffer = []

    for item in content:
        buffer.append(item["text"])

        if len(buffer) >= size:
            chunks.append({
                "text": "\n".join(buffer),
                "page": item["page"]
            })
            buffer = []

    if buffer:
        chunks.append({
            "text": "\n".join(buffer),
            "page": content[-1]["page"]
        })

    return chunks