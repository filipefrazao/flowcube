"""
Custom Middleware for FRZ Platform
Moved from flowcube_project/middleware.py
"""
from django_ratelimit.exceptions import Ratelimited
from django.http import JsonResponse
from django.core.cache import cache


class RealIPMiddleware:
    """Set real client IP from X-Forwarded-For behind proxy."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
            request.META['REMOTE_ADDR'] = ip
        return self.get_response(request)


class LoginRateLimitMiddleware:
    """Rate limit login endpoint (5 req/min per IP)."""

    def __init__(self, get_response):
        self.get_response = get_response
        self.rate_limit = 5
        self.rate_period = 60

    def __call__(self, request):
        if request.path == '/api/v1/auth/token/' and request.method == 'POST':
            client_ip = request.META.get('REMOTE_ADDR', 'unknown')
            cache_key = f'ratelimit:login:{client_ip}'
            current_count = cache.get(cache_key, 0)

            if current_count >= self.rate_limit:
                return JsonResponse(
                    {
                        'detail': 'Too many login attempts. Please try again in 1 minute.',
                        'error_code': 'rate_limit_exceeded',
                        'retry_after': self.rate_period,
                    },
                    status=429,
                )

            if current_count == 0:
                cache.set(cache_key, 1, self.rate_period)
            else:
                cache.incr(cache_key)

        return self.get_response(request)


class RatelimitExceptionMiddleware:
    """Handle Ratelimited exceptions and return 429."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        return self.get_response(request)

    def process_exception(self, request, exception):
        if isinstance(exception, Ratelimited):
            return JsonResponse(
                {
                    'detail': 'Too many requests. Please try again later.',
                    'error_code': 'rate_limit_exceeded',
                },
                status=429,
            )
        return None
