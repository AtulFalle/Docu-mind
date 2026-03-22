SECTION_KEYWORDS = {
    "skills": ["skills"],
    "projects": ["projects"],
    "education": ["education"],
    "experience": ["experience"]
}

def normalize_resume(pages):
    content = []
    current_section = "general"

    for page in pages:
        lines = (page["text"] or "").split("\n")

        for line in lines:
            lower = line.lower()

            for sec, keys in SECTION_KEYWORDS.items():
                if any(k in lower for k in keys):
                    current_section = sec

            content.append({
                "text": line,
                "page": page["page"],
                "section": current_section
            })

        for table in page["tables"] or []:
            headers = table[0]
            for row in table[1:]:
                text = ", ".join([f"{headers[i]} {row[i]}" for i in range(len(headers))])
                content.append({
                    "text": text,
                    "page": page["page"],
                    "section": current_section
                })

    return content