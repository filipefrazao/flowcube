"""
Custom Middleware for FlowCube
"""
from django_ratelimit.exceptions import Ratelimited
from django.http import JsonResponse
from django.core.cache import cache
import hashlib


class RealIPMiddleware:
    """
    Middleware to set the real client IP from X-Forwarded-For header.
    This is necessary for rate limiting to work correctly behind a proxy.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Get the X-Forwarded-For header
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        
        if x_forwarded_for:
            # Get the first IP in the chain (the real client IP)
            ip = x_forwarded_for.split(',')[0].strip()
            request.META['REMOTE_ADDR'] = ip
        
        response = self.get_response(request)
        return response


class LoginRateLimitMiddleware:
    """
    Middleware to rate limit login endpoint specifically.
    Implements a simple rate limiter using Redis cache.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.rate_limit = 5  # 5 requests
        self.rate_period = 60  # per 60 seconds (1 minute)

    def __call__(self, request):
        # Check if this is a login request
        if request.path == '/api/v1/auth/token/' and request.method == 'POST':
            # Get client IP
            client_ip = request.META.get('REMOTE_ADDR', 'unknown')
            
            # Create cache key
            cache_key = f'ratelimit:login:{client_ip}'
            
            # Get current count
            current_count = cache.get(cache_key, 0)
            
            # Check if rate limit exceeded
            if current_count >= self.rate_limit:
                return JsonResponse(
                    {
                        'detail': 'Too many login attempts. Please try again in 1 minute.',
                        'error_code': 'rate_limit_exceeded',
                        'retry_after': self.rate_period
                    },
                    status=429
                )
            
            # Increment counter
            if current_count == 0:
                # First request - set with TTL
                cache.set(cache_key, 1, self.rate_period)
            else:
                # Increment existing counter (preserve TTL)
                cache.incr(cache_key)
        
        response = self.get_response(request)
        return response


class RatelimitExceptionMiddleware:
    """
    Middleware to handle Ratelimited exceptions and return 429 responses.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        return self.get_response(request)
    
    def process_exception(self, request, exception):
        if isinstance(exception, Ratelimited):
            return JsonResponse(
                {
                    'detail': 'Too many login attempts. Please try again later.',
                    'error_code': 'rate_limit_exceeded'
                },
                status=429
            )
        return None
