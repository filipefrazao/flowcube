# flowcube/views/api.py
from rest_framework import status, viewsets
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
import requests

from flowcube.models import UserPreference, Credential
from flowcube.serializers import (
    UserPreferenceSerializer,
    CredentialListSerializer,
    CredentialDetailSerializer
)


class UserPreferenceViewSet(viewsets.ModelViewSet):
    """ViewSet for managing user preferences"""
    permission_classes = [IsAuthenticated]
    serializer_class = UserPreferenceSerializer

    def get_queryset(self):
        return UserPreference.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get', 'patch'])
    def me(self, request):
        """Get or update current user's preferences"""
        preference, created = UserPreference.objects.get_or_create(
            user=request.user,
            defaults={'theme': 'dark'}
        )

        if request.method == 'PATCH':
            serializer = self.get_serializer(preference, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)

        serializer = self.get_serializer(preference)
        return Response(serializer.data)


class CredentialViewSet(viewsets.ModelViewSet):
    """ViewSet for managing encrypted credentials"""
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Credential.objects.filter(owner=self.request.user)

    def get_serializer_class(self):
        if self.action == 'list':
            return CredentialListSerializer
        return CredentialDetailSerializer

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=['post'])
    def test(self, request, pk=None):
        """Test a credential connection"""
        credential = self.get_object()
        credential_data = credential.data
        credential_type = credential.credential_type

        try:
            # Test different credential types
            if credential_type == 'evolution_api':
                url = f"{credential.base_url}/instance/connectionState/{credential_data.get('instance')}"
                headers = {'apikey': credential_data.get('api_key')}
                response = requests.get(url, headers=headers, timeout=10)
                success = response.status_code == 200
                message = "Connected successfully" if success else f"Connection failed: {response.text}"

            elif credential_type == 'salescube':
                url = f"{credential.base_url}/api/v1/auth/me/"
                headers = {'Authorization': f"Token {credential_data.get('token')}"}
                response = requests.get(url, headers=headers, timeout=10)
                success = response.status_code == 200
                message = "Connected successfully" if success else f"Authentication failed"

            elif credential_type == 'openai':
                url = "https://api.openai.com/v1/models"
                headers = {'Authorization': f"Bearer {credential_data.get('api_key')}"}
                response = requests.get(url, headers=headers, timeout=10)
                success = response.status_code == 200
                message = "Connected successfully" if success else "Invalid API key"

            elif credential_type == 'anthropic':
                url = "https://api.anthropic.com/v1/messages"
                headers = {
                    'x-api-key': credential_data.get('api_key'),
                    'anthropic-version': '2023-06-01'
                }
                # Just check if API key is valid format
                success = bool(credential_data.get('api_key', '').startswith('sk-'))
                message = "API key format valid" if success else "Invalid API key format"

            elif credential_type == 'webhook':
                # Test webhook URL
                url = credential.base_url or credential_data.get('url')
                response = requests.get(url, timeout=10)
                success = response.status_code < 500
                message = f"Webhook reachable (status: {response.status_code})"

            else:
                # Generic test - just verify data exists
                success = bool(credential_data)
                message = "Credential data saved" if success else "No credential data"

            # Mark credential as used if test succeeded
            if success:
                credential.mark_used()

            return Response({
                'success': success,
                'message': message,
                'credential_type': credential_type
            })

        except requests.RequestException as e:
            return Response({
                'success': False,
                'message': f"Connection error: {str(e)}",
                'credential_type': credential_type
            })
        except Exception as e:
            return Response({
                'success': False,
                'message': f"Test failed: {str(e)}",
                'credential_type': credential_type
            })

