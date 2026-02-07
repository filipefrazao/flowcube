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

            elif credential_type == 'meta_ads':
                url = f"https://graph.facebook.com/v24.0/me/adaccounts?access_token={credential_data.get('access_token')}"
                response = requests.get(url, timeout=10)
                success = response.status_code == 200
                message = "Connected successfully" if success else f"Failed: {response.text[:200]}"

            elif credential_type == 'whatsapp_cloud':
                url = f"https://graph.facebook.com/v24.0/me?access_token={credential_data.get('access_token')}"
                response = requests.get(url, timeout=10)
                success = response.status_code == 200
                message = "Connected successfully" if success else f"Failed: {response.text[:200]}"

            elif credential_type == 'meta_lead_ads':
                url = f"https://graph.facebook.com/v24.0/me/accounts?access_token={credential_data.get('access_token')}"
                response = requests.get(url, timeout=10)
                success = response.status_code == 200
                message = "Connected successfully" if success else f"Failed: {response.text[:200]}"

            elif credential_type == 'google_sheets' or credential_type == 'google_drive':
                import json as json_mod
                try:
                    creds = json_mod.loads(credential_data.get('credentials_json', '{}'))
                    success = creds.get('type') == 'service_account' and bool(creds.get('client_email'))
                    message = f"Service account: {creds.get('client_email', 'N/A')}" if success else "Invalid service account JSON"
                except:
                    success = False
                    message = "Invalid JSON format"

            elif credential_type == 'notion':
                url = "https://api.notion.com/v1/users/me"
                headers = {
                    'Authorization': f"Bearer {credential_data.get('api_key')}",
                    'Notion-Version': '2022-06-28'
                }
                response = requests.get(url, headers=headers, timeout=10)
                success = response.status_code == 200
                message = "Connected successfully" if success else f"Failed: {response.status_code}"

            elif credential_type == 'smtp':
                import smtplib
                try:
                    server = smtplib.SMTP(credential_data.get('host', 'smtp.gmail.com'), int(credential_data.get('port', 587)), timeout=10)
                    server.starttls()
                    server.login(credential_data.get('username', ''), credential_data.get('password', ''))
                    server.quit()
                    success = True
                    message = "SMTP connection successful"
                except Exception as smtp_err:
                    success = False
                    message = f"SMTP error: {str(smtp_err)}"

            elif credential_type == 'n8n':
                url = f"{credential.base_url}/api/v1/workflows?limit=1"
                headers = {'X-N8N-API-KEY': credential_data.get('api_key')}
                response = requests.get(url, headers=headers, timeout=10)
                success = response.status_code == 200
                message = "Connected successfully" if success else f"Failed: {response.status_code}"

            elif credential_type == 'groq':
                url = "https://api.groq.com/openai/v1/models"
                headers = {'Authorization': f"Bearer {credential_data.get('api_key')}"}
                response = requests.get(url, headers=headers, timeout=10)
                success = response.status_code == 200
                message = "Connected successfully" if success else "Invalid API key"

            elif credential_type == 'deepseek':
                url = "https://api.deepseek.com/v1/models"
                headers = {'Authorization': f"Bearer {credential_data.get('api_key')}"}
                response = requests.get(url, headers=headers, timeout=10)
                success = response.status_code == 200
                message = "Connected successfully" if success else "Invalid API key"

            elif credential_type == 'grok':
                url = "https://api.x.ai/v1/models"
                headers = {'Authorization': f"Bearer {credential_data.get('api_key')}"}
                response = requests.get(url, headers=headers, timeout=10)
                success = response.status_code == 200
                message = "Connected successfully" if success else "Invalid API key"

            elif credential_type == 'google_ai':
                api_key = credential_data.get('api_key', '')
                url = f"https://generativelanguage.googleapis.com/v1/models?key={api_key}"
                response = requests.get(url, timeout=10)
                success = response.status_code == 200
                message = "Connected successfully" if success else "Invalid API key"

            elif credential_type == 'supabase':
                url = "https://api.supabase.com/v1/projects"
                headers = {'Authorization': f"Bearer {credential_data.get('access_token')}"}
                response = requests.get(url, headers=headers, timeout=10)
                success = response.status_code == 200
                message = "Connected successfully" if success else "Invalid access token"

            elif credential_type == 'make':
                url = "https://us1.make.com/api/v2/users/me"
                headers = {'Authorization': f"Token {credential_data.get('api_token')}"}
                response = requests.get(url, headers=headers, timeout=10)
                success = response.status_code == 200
                message = "Connected successfully" if success else "Invalid token"

            elif credential_type == 'google_ads':
                success = bool(credential_data.get('developer_token'))
                message = "Developer token saved" if success else "No developer token"

            elif credential_type == 'openrouter':
                url = "https://openrouter.ai/api/v1/models"
                headers = {'Authorization': f"Bearer {credential_data.get('api_key')}"}
                response = requests.get(url, headers=headers, timeout=10)
                success = response.status_code == 200
                message = "Connected successfully" if success else "Invalid API key"

            elif credential_type == 'elevenlabs':
                url = "https://api.elevenlabs.io/v1/user"
                headers = {'xi-api-key': credential_data.get('api_key')}
                response = requests.get(url, headers=headers, timeout=10)
                success = response.status_code == 200
                message = "Connected successfully" if success else "Invalid API key"

            elif credential_type == 'mistral':
                url = "https://api.mistral.ai/v1/models"
                headers = {'Authorization': f"Bearer {credential_data.get('api_key')}"}
                response = requests.get(url, headers=headers, timeout=10)
                success = response.status_code == 200
                message = "Connected successfully" if success else "Invalid API key"

            elif credential_type in ('postgresql', 'mysql'):
                success = bool(credential_data.get('host') and credential_data.get('database'))
                message = "Credential data saved" if success else "Missing host or database"

            elif credential_type == 'mongodb':
                success = bool(credential_data.get('connection_string'))
                message = "Connection string saved" if success else "No connection string"

            elif credential_type == 'redis':
                success = bool(credential_data.get('host'))
                message = "Redis config saved" if success else "No host configured"

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

