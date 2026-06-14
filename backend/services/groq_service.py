import os
from typing import Optional

from groq import Groq

GROQ_MODEL = "llama-3.3-70b-versatile"

_client = None


def _get_client() -> Groq:
    global _client
    if _client is None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY is not set")
        _client = Groq(api_key=api_key)
    return _client


def generate_text(prompt: str, max_tokens: int = 1024) -> Optional[str]:
    """Send a prompt to Groq and return the generated text, or None on failure."""
    try:
        client = _get_client()
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=max_tokens,
            temperature=0.7,
        )
        text = response.choices[0].message.content
        return text.strip() if text else None
    except Exception:
        return None
