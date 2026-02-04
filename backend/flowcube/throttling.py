
# flowcube/middleware.py
from django.http import JsonResponse
import uuid
from .throttling import FlowRateThrottle


class FlowThrottleMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path.startswith('/flows/'):
            throttle = FlowRateThrottle()
            if not throttle.allow_request(request):
                return JsonResponse(
                    {'error': 'Too many requests'},
                    status=429
                )
        return self.get_response(request)
