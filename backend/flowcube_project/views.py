"""
Custom Views for FlowCube Authentication
"""
from rest_framework.authtoken.views import ObtainAuthToken


class ThrottledObtainAuthToken(ObtainAuthToken):
    """
    Obtain auth token view.
    Rate limiting is handled by LoginRateLimitMiddleware.
    """
    pass
