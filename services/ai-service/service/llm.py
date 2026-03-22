import requests
from config import *

def generate_answer(context, question):
    prompt = f"""
        You are an expert resume analyzer.

        Answer only from context.
        Be precise.

        Context:
        {context}

        Question:
        {question}
        """

    print("OLLAMA_URL=", OLLAMA_URL)
    print("prompt = ", prompt)
    res = requests.post(f"{OLLAMA_URL}/api/generate", json={
        "model": "llama3:8b",
        "prompt": prompt,
        "stream": False
    })
    print(res)

    return res.json()["response"]