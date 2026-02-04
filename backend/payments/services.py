import requests
import base64
import hashlib
import hmac
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)


class BankAPIClient(ABC):
    """
    Classe base abstrata para clientes de API bancária
    """
    
    def __init__(self, credentials: Dict[str, Any], api_endpoint: str):
        self.credentials = credentials
        self.api_endpoint = api_endpoint
        self.access_token = None
        self.token_expires_at = None
    
    @abstractmethod
    def authenticate(self) -> bool:
        """Autentica com a API do banco"""
        pass
    
    @abstractmethod
    def generate_qr_code(self, amount: float, description: str, expiration_minutes: int = 60, **kwargs) -> Dict[str, Any]:
        """Gera QR Code Pix dinâmico"""
        pass
    
    @abstractmethod
    def check_payment_status(self, transaction_id: str) -> Dict[str, Any]:
        """Verifica status de pagamento"""
        pass
    
    @abstractmethod
    def get_transaction_details(self, transaction_id: str) -> Dict[str, Any]:
        """Obtém detalhes da transação"""
        pass
    
    def is_token_valid(self) -> bool:
        """Verifica se o token ainda é válido"""
        if not self.access_token or not self.token_expires_at:
            return False
        return timezone.now() < self.token_expires_at
    
    def ensure_authenticated(self) -> bool:
        """Garante que está autenticado"""
        if not self.is_token_valid():
            return self.authenticate()
        return True


class ItauPixClient(BankAPIClient):
    """
    Cliente para API Pix do Itaú
    Documentação: https://developer.itau.com.br/
    """
    
    def authenticate(self) -> bool:
        """
        Autentica usando OAuth2 Client Credentials
        """
        try:
            auth_url = f'{self.api_endpoint}/oauth/token'
            
            # Basic Auth com client_id:client_secret em base64
            credentials_str = f"{self.credentials['client_id']}:{self.credentials['client_secret']}"
            credentials_b64 = base64.b64encode(credentials_str.encode()).decode()
            
            headers = {
                'Authorization': f'Basic {credentials_b64}',
                'Content-Type': 'application/x-www-form-urlencoded'
            }
            
            data = {
                'grant_type': 'client_credentials',
                'scope': 'pix.read pix.write'
            }
            
            response = requests.post(auth_url, headers=headers, data=data, timeout=30)
            response.raise_for_status()
            
            token_data = response.json()
            self.access_token = token_data['access_token']
            expires_in = token_data.get('expires_in', 3600)
            self.token_expires_at = timezone.now() + timedelta(seconds=expires_in)
            
            logger.info(f'Autenticado com sucesso no Itaú. Token expira em {expires_in}s')
            return True
            
        except Exception as e:
            logger.error(f'Erro ao autenticar com Itaú: {str(e)}')
            return False
    
    def generate_qr_code(self, amount: float, description: str, expiration_minutes: int = 60, **kwargs) -> Dict[str, Any]:
        """
        Gera QR Code Pix dinâmico no Itaú
        """
        if not self.ensure_authenticated():
            raise Exception('Falha na autenticação')
        
        try:
            url = f'{self.api_endpoint}/pix/v2/cobqrcode'
            
            headers = {
                'Authorization': f'Bearer {self.access_token}',
                'Content-Type': 'application/json'
            }
            
            # Gerar txid único
            txid = self._generate_txid()
            
            payload = {
                'calendario': {
                    'expiracao': expiration_minutes * 60  # em segundos
                },
                'valor': {
                    'original': f'{amount:.2f}'
                },
                'chave': self.credentials.get('pix_key'),  # Chave Pix cadastrada
                'solicitacaoPagador': description,
                'infoAdicionais': kwargs.get('metadata', {})
            }
            
            response = requests.put(f'{url}/{txid}', headers=headers, json=payload, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            
            return {
                'success': True,
                'external_id': data.get('loc', {}).get('id'),
                'txid': txid,
                'qr_code': data.get('pixCopiaECola'),
                'qr_code_image': data.get('imagemQrcode'),
                'expires_at': timezone.now() + timedelta(minutes=expiration_minutes)
            }
            
        except Exception as e:
            logger.error(f'Erro ao gerar QR Code Itaú: {str(e)}')
            return {
                'success': False,
                'error': str(e)
            }
    
    def check_payment_status(self, transaction_id: str) -> Dict[str, Any]:
        """
        Verifica status de pagamento
        """
        if not self.ensure_authenticated():
            raise Exception('Falha na autenticação')
        
        try:
            url = f'{self.api_endpoint}/pix/v2/cob/{transaction_id}'
            
            headers = {
                'Authorization': f'Bearer {self.access_token}'
            }
            
            response = requests.get(url, headers=headers, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            
            # Mapear status do Itaú para nosso sistema
            status_map = {
                'ATIVA': 'PENDING',
                'CONCLUIDA': 'PAID',
                'REMOVIDA_PELO_USUARIO_RECEBEDOR': 'CANCELLED',
                'REMOVIDA_PELO_PSP': 'CANCELLED'
            }
            
            return {
                'status': status_map.get(data.get('status'), 'PENDING'),
                'paid_at': data.get('pix', [{}])[0].get('horario') if data.get('pix') else None,
                'payer_info': data.get('devedor', {}),
                'amount': float(data.get('valor', {}).get('original', 0))
            }
            
        except Exception as e:
            logger.error(f'Erro ao verificar status Itaú: {str(e)}')
            return {'status': 'ERROR', 'error': str(e)}
    
    def get_transaction_details(self, transaction_id: str) -> Dict[str, Any]:
        """
        Obtém detalhes completos da transação
        """
        return self.check_payment_status(transaction_id)
    
    def _generate_txid(self) -> str:
        """Gera txid único (35 caracteres alfanuméricos)"""
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S%f')
        random_str = base64.urlsafe_b64encode(timestamp.encode()).decode()[:35]
        return random_str.upper().replace('-', '0').replace('_', '0')


class BradescoPixClient(BankAPIClient):
    """
    Cliente para API Pix do Bradesco
    """
    
    def authenticate(self) -> bool:
        # Implementação similar ao Itaú
        logger.warning('BradescoPixClient não implementado completamente')
        return False
    
    def generate_qr_code(self, amount: float, description: str, expiration_minutes: int = 60, **kwargs) -> Dict[str, Any]:
        return {'success': False, 'error': 'Não implementado'}
    
    def check_payment_status(self, transaction_id: str) -> Dict[str, Any]:
        return {'status': 'ERROR', 'error': 'Não implementado'}
    
    def get_transaction_details(self, transaction_id: str) -> Dict[str, Any]:
        return {'error': 'Não implementado'}


class NubankPixClient(BankAPIClient):
    """
    Cliente para API Pix do Nubank
    """
    
    def authenticate(self) -> bool:
        logger.warning('NubankPixClient não implementado completamente')
        return False
    
    def generate_qr_code(self, amount: float, description: str, expiration_minutes: int = 60, **kwargs) -> Dict[str, Any]:
        return {'success': False, 'error': 'Não implementado'}
    
    def check_payment_status(self, transaction_id: str) -> Dict[str, Any]:
        return {'status': 'ERROR', 'error': 'Não implementado'}
    
    def get_transaction_details(self, transaction_id: str) -> Dict[str, Any]:
        return {'error': 'Não implementado'}


class BankClientFactory:
    """
    Factory para criar clientes bancários
    """
    
    CLIENTS = {
        'ITAU': ItauPixClient,
        'BRADESCO': BradescoPixClient,
        'NUBANK': NubankPixClient,
        # Adicionar outros bancos aqui
    }
    
    @classmethod
    def create_client(cls, bank_code: str, credentials: Dict[str, Any], api_endpoint: str) -> BankAPIClient:
        """Cria cliente apropriado baseado no código do banco"""
        client_class = cls.CLIENTS.get(bank_code)
        
        if not client_class:
            raise ValueError(f'Banco {bank_code} não suportado')
        
        return client_class(credentials, api_endpoint)
