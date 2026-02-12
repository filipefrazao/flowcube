import logging

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from socialcube.services import ai_content as ai_svc

logger = logging.getLogger(__name__)


@api_view(["POST"])
def ai_generate_caption(request):
    topic = request.data.get("topic", "")
    platform = request.data.get("platform", "instagram")
    tone = request.data.get("tone", "professional")
    language = request.data.get("language", "pt-BR")

    if not topic:
        return Response({"error": "topic is required"}, status=status.HTTP_400_BAD_REQUEST)

    result = ai_svc.generate_caption(topic, platform, tone, language)
    return Response({"caption": result})


@api_view(["POST"])
def ai_suggest_hashtags(request):
    caption = request.data.get("caption", "")
    platform = request.data.get("platform", "instagram")
    count = int(request.data.get("count", 15))

    if not caption:
        return Response({"error": "caption is required"}, status=status.HTTP_400_BAD_REQUEST)

    result = ai_svc.suggest_hashtags(caption, platform, count)
    return Response({"hashtags": result})


@api_view(["POST"])
def ai_improve_caption(request):
    caption = request.data.get("caption", "")
    platform = request.data.get("platform", "instagram")
    language = request.data.get("language", "pt-BR")

    if not caption:
        return Response({"error": "caption is required"}, status=status.HTTP_400_BAD_REQUEST)

    result = ai_svc.improve_caption(caption, platform, language)
    return Response({"improved_caption": result})


@api_view(["POST"])
def ai_alt_text(request):
    description = request.data.get("description", "")
    if not description:
        return Response({"error": "description is required"}, status=status.HTTP_400_BAD_REQUEST)

    result = ai_svc.generate_alt_text(description)
    return Response({"alt_text": result})


class AIContentView:
    pass
