#!/bin/bash

echo "=========================================="
echo "Teste do Assistente IA - FlowCube"
echo "=========================================="
echo ""

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:8000"
TOKEN="" # Adicione seu token aqui

echo "1. Testando análise de contexto..."
RESPONSE=$(curl -s -X POST "${BASE_URL}/api/v1/ai-assistant/analyze/" \
  -H "Authorization: Token ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "business_description": "E-commerce de roupas",
    "automation_goal": "Automatizar confirmação de pagamento Pix",
    "preferred_channels": ["whatsapp"]
  }')

if echo "$RESPONSE" | grep -q "suggestions"; then
  echo -e "${GREEN}✓ Análise funcionando${NC}"
  echo "Sugestões recebidas:"
  echo "$RESPONSE" | python3 -m json.tool 2>/dev/null | head -30
else
  echo -e "${RED}✗ Erro na análise${NC}"
  echo "$RESPONSE"
fi

echo ""
echo "2. Testando listagem de sugestões..."
RESPONSE=$(curl -s -X GET "${BASE_URL}/api/v1/ai-assistant/suggestions/" \
  -H "Authorization: Token ${TOKEN}")

if echo "$RESPONSE" | grep -q "results"; then
  echo -e "${GREEN}✓ Listagem funcionando${NC}"
  COUNT=$(echo "$RESPONSE" | grep -o '"count":[0-9]*' | cut -d: -f2)
  echo "Total de sugestões: $COUNT"
else
  echo -e "${RED}✗ Erro na listagem${NC}"
  echo "$RESPONSE"
fi

echo ""
echo "3. Testando listagem de contextos brasileiros..."
RESPONSE=$(curl -s -X GET "${BASE_URL}/api/v1/brazilian-contexts/" \
  -H "Authorization: Token ${TOKEN}")

if echo "$RESPONSE" | grep -q "context_type"; then
  echo -e "${GREEN}✓ Contextos carregados${NC}"
  echo "Contextos disponíveis:"
  echo "$RESPONSE" | python3 -m json.tool 2>/dev/null | grep '"context_type"'
else
  echo -e "${RED}✗ Erro ao carregar contextos${NC}"
  echo "$RESPONSE"
fi

echo ""
echo "=========================================="
echo "Testes concluídos"
echo "=========================================="
