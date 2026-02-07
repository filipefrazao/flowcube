from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase


User = get_user_model()


class FlowcubeAPITestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
        )
        self.client.force_authenticate(user=self.user)

    def test_preferences_me_get_creates_default(self):
        url = '/api/flowcube/preferences/me/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('theme', response.data)

    def test_preferences_me_patch_updates(self):
        url = '/api/flowcube/preferences/me/'
        response = self.client.patch(url, {'theme': 'light'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get('theme'), 'light')

    def test_credentials_crud_and_test_action(self):
        list_url = '/api/flowcube/credentials/'

        response = self.client.get(list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)

        create_payload = {
            'name': 'My Custom',
            'credential_type': 'custom',
            'description': 'Test credential',
            'base_url': '',
            'is_active': True,
            'data': {'foo': 'bar'},
        }
        response = self.client.post(list_url, create_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        cred_id = response.data.get('id')
        self.assertTrue(cred_id)

        detail_url = f'/api/flowcube/credentials/{cred_id}/'
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get('credential_type'), 'custom')

        test_url = f'/api/flowcube/credentials/{cred_id}/test/'
        response = self.client.post(test_url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get('success'))
