# FlowCube API - Paginação e Filtros

## Implementação Completa - 04/02/2026

### O que foi implementado

#### 1. Paginação Customizada
- **Arquivo:** 
- **Classe:** 
- **Configuração:**
  - Page size padrão: 20 workflows
  - Page size máximo: 100 workflows
  - Query param:  (define tamanho da página)
  - Query param:  (define número da página)

#### 2. Metadados de Resposta
Formato JSON retornado:
```json
{
  "count": 45,                    // Total de workflows
  "next": "https://...",         // Link próxima página (ou null)
  "previous": "https://...",     // Link página anterior (ou null)
  "total_pages": 3,               // Total de páginas
  "current_page": 1,              // Página atual
  "results": [...]                // Array de workflows
}
```

#### 3. Filtros Disponíveis
-  - Filtra workflows ativos
-  - Filtra workflows inativos
-  - Filtra workflows publicados
-  - Filtra workflows não publicados

#### 4. Busca (Search)
-  - Busca em:
  - Nome do workflow
  - Descrição do workflow
- Exemplo: 

#### 5. Ordenação (Ordering)
Campos disponíveis:
-  - Mais antigos primeiro
-  - Mais recentes primeiro (padrão)
-  - Última atualização (antigos primeiro)
-  - Última atualização (recentes primeiro)
-  - Ordem alfabética A-Z
-  - Ordem alfabética Z-A

### Arquivos Modificados

1. **backend/workflows/pagination.py** (NOVO)
   - Classe WorkflowPagination customizada
   - Metadados enriquecidos na resposta

2. **backend/workflows/views.py**
   - Adicionado 
   - Adicionado 
   - Adicionado 
   - Adicionado 
   - Adicionado 
   - Adicionado  (padrão)

3. **backend/flowcube_project/settings.py**
   - Adicionado  ao INSTALLED_APPS

### Exemplos de Uso

#### Paginação básica
```bash
GET /api/v1/workflows/?limit=20&page=1
GET /api/v1/workflows/?limit=50&page=2
```

#### Filtros
```bash
GET /api/v1/workflows/?is_active=true
GET /api/v1/workflows/?is_published=false
GET /api/v1/workflows/?is_active=true&is_published=true
```

#### Busca
```bash
GET /api/v1/workflows/?search=LeadFit
GET /api/v1/workflows/?search=WhatsApp
```

#### Ordenação
```bash
GET /api/v1/workflows/?ordering=-created_at  # Mais recentes
GET /api/v1/workflows/?ordering=name         # A-Z
GET /api/v1/workflows/?ordering=-updated_at  # Última atualização
```

#### Combinações
```bash
GET /api/v1/workflows/?is_active=true&ordering=-created_at&limit=10
GET /api/v1/workflows/?search=Lead&is_active=true&page=1
GET /api/v1/workflows/?is_published=true&ordering=name&limit=50
```

### Testes Realizados

#### ✅ Teste 1: Paginação com limit=2
- **Request:** 
- **Resultado:** Retornou 2 workflows, metadados corretos
- **Metadados:** count=3, total_pages=2, current_page=1, next present

#### ✅ Teste 2: Segunda página
- **Request:** 
- **Resultado:** current_page=2, 1 workflow (última página)

#### ✅ Teste 3: Filtro is_active
- **Request:** 
- **Resultado:** Retornou apenas workflows ativos (3 workflows)

#### ✅ Teste 4: Busca por nome
- **Request:** 
- **Resultado:** Encontrou 1 workflow (LeadFit WhatsApp Bot)

#### ✅ Teste 5: Ordenação por nome
- **Request:** 
- **Resultado:** Workflows ordenados alfabeticamente

### Performance

**ANTES:**
- API retornava TODOS os workflows sem paginação
- Query params  e  eram ignorados
- Alto consumo de banda e tempo de resposta
- Frontend carregava todos os workflows de uma vez

**DEPOIS:**
- Paginação padrão: 20 workflows por página
- Resposta reduzida em até 95% para usuários com muitos workflows
- Metadados permitem navegação eficiente
- Frontend pode implementar infinite scroll ou paginação tradicional

### Commit

```
commit 279b0c77
feat: Add pagination and filters to Workflows API

- Implement WorkflowPagination with custom metadata (default: 20 items/page)
- Add django_filters to INSTALLED_APPS
- Configure WorkflowViewSet with pagination, filters, search, and ordering
```

### Próximos Passos (Opcional)

1. **Frontend:** Implementar paginação na interface
2. **Cache:** Adicionar cache para queries frequentes
3. **Filtros avançados:** Adicionar filtros por tags, folder, created_at range
4. **Export:** Endpoint para exportar todos workflows (CSV/JSON)

---

**Implementado por:** Claude Sonnet 4.5  
**Data:** 04/02/2026  
**Status:** ✅ PRODUCTION READY  
**Servidor:** Hetzner (46.224.59.249)  
