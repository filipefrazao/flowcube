from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin
from .services import UsageTracker
from .models import Subscription


class PlanLimitMiddleware(MiddlewareMixin):
    """
    Middleware para verificar limites de plano em requisições
    """

    def process_request(self, request):
        # Skip para endpoints públicos
        public_paths = [
            '/api/v1/billing/plans/',
            '/api/v1/auth/',
            '/api/health/',
            '/admin/',
        ]

        if any(request.path.startswith(path) for path in public_paths):
            return None

        # Skip se não autenticado
        if not request.user.is_authenticated:
            return None

        # Adiciona subscription ao request para acesso fácil
        try:
            subscription = request.user.subscription
            request.subscription = subscription
            request.plan = subscription.plan
        except Subscription.DoesNotExist:
            request.subscription = None
            request.plan = None

        return None


def require_feature(feature_name):
    """
    Decorator para views que requerem features específicas

    Usage:
        @require_feature('has_ai_features')
        def my_ai_view(request):
            ...
    """
    def decorator(view_func):
        def wrapped_view(request, *args, **kwargs):
            try:
                UsageTracker.check_feature_access(request.user, feature_name)
                return view_func(request, *args, **kwargs)
            except PermissionError as e:
                return JsonResponse(
                    {
                        'error': 'Feature not available',
                        'message': str(e),
                        'required_upgrade': True
                    },
                    status=403
                )

        return wrapped_view
    return decorator


def track_usage(usage_type):
    """
    Decorator para tracking de uso

    Usage:
        @track_usage('workflow_execution')
        def execute_workflow(request):
            ...
    """
    def decorator(view_func):
        def wrapped_view(request, *args, **kwargs):
            try:
                # Track before execution
                if usage_type == 'workflow_execution':
                    UsageTracker.track_workflow_execution(request.user)
                elif usage_type == 'workflow_creation':
                    UsageTracker.track_workflow_creation(request.user)
                elif usage_type == 'ai_request':
                    # Tokens will be tracked after execution
                    pass

                # Execute view
                response = view_func(request, *args, **kwargs)

                # Track AI tokens if applicable
                if usage_type == 'ai_request' and hasattr(response, 'data'):
                    tokens_used = response.data.get('tokens_used', 0)
                    UsageTracker.track_ai_request(request.user, tokens_used)

                return response

            except PermissionError as e:
                return JsonResponse(
                    {
                        'error': 'Limit exceeded',
                        'message': str(e),
                        'limit_type': usage_type,
                        'required_upgrade': True
                    },
                    status=429  # Too Many Requests
                )

        return wrapped_view
    return decorator
