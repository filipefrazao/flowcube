"""
Custom Throttling Classes for FlowCube API
"""
from rest_framework.throttling import AnonRateThrottle
import logging

logger = logging.getLogger(__name__)


class LoginRateThrottle(AnonRateThrottle):
    """
    Rate throttle specifically for login endpoint.
    Allows only 5 login attempts per minute per IP address.
    """
    rate = '5/minute'
    scope = 'login'
    
    def allow_request(self, request, view):
        """
        Override to add logging.
        """
        allowed = super().allow_request(request, view)
        ip = self.get_ident(request)
        logger.info(f"LoginRateThrottle: IP={ip}, allowed={allowed}, rate={self.rate}")
        return allowed
