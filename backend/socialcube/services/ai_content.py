import logging
from django.conf import settings
import requests

logger = logging.getLogger(__name__)


def _openai_chat(messages, max_tokens=500):
    api_key = getattr(settings, "OPENAI_API_KEY", "")
    if not api_key:
        raise ValueError("OPENAI_API_KEY not configured")
    resp = requests.post(
        "https://api.openai.com/v1/chat/completions",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json={
            "model": "gpt-4o-mini",
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": 0.7,
        },
        timeout=60,
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"].strip()


def generate_caption(topic: str, platform: str = "instagram", tone: str = "professional", language: str = "pt-BR") -> str:
    return _openai_chat([
        {"role": "system", "content": f"You are a social media expert. Write captions for {platform} in {language}. Tone: {tone}. Include relevant emojis. Do NOT include hashtags."},
        {"role": "user", "content": f"Write a caption about: {topic}"},
    ], max_tokens=300)


def suggest_hashtags(caption: str, platform: str = "instagram", count: int = 15) -> list:
    result = _openai_chat([
        {"role": "system", "content": f"You are a social media hashtag expert for {platform}. Return ONLY a JSON array of {count} hashtags (without #). Mix popular and niche."},
        {"role": "user", "content": f"Suggest hashtags for: {caption}"},
    ], max_tokens=200)
    import json
    try:
        tags = json.loads(result)
        return [t.lstrip("#") for t in tags][:count]
    except json.JSONDecodeError:
        return [t.strip().lstrip("#") for t in result.split(",")][:count]


def improve_caption(caption: str, platform: str = "instagram", language: str = "pt-BR") -> str:
    return _openai_chat([
        {"role": "system", "content": f"You are a social media copywriter. Improve the given caption for {platform} in {language}. Make it more engaging. Keep the same meaning."},
        {"role": "user", "content": f"Improve this caption:\n\n{caption}"},
    ], max_tokens=400)


def generate_alt_text(image_description: str) -> str:
    return _openai_chat([
        {"role": "system", "content": "Generate a concise, descriptive alt text for social media accessibility. Max 125 characters."},
        {"role": "user", "content": f"Image description: {image_description}"},
    ], max_tokens=60)
