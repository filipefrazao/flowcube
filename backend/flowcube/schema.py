
# flowcube/views/api.py
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_yasg.utils import swagger_auto_schema
from django.http import HttpRequest

class WorkflowList(APIView):
    @swagger_auto_schema(
        operation_summary="Lista todos os workflows",
        responses={
            status.HTTP_200_OK: "Lista de workflows recuperada com sucesso"
        }
    )
    def get(self, request: HttpRequest) -> Response:
        """Lista todos os workflows existentes no sistema.
        
        Args:
            request: Requisição HTTP
        
        Returns:
            Response: Resposta HTTP com lista de workflows em JSON
        """
        pass

class WorkflowDetail(APIView):
    @swagger_auto_schema(
        operation_summary="Recupera um workflow específico",
        responses={
            status.HTTP_200_OK: "Workflow recuperado com sucesso",
            status.HTTP_404_NOT_FOUND: "Workflow não encontrado"
        }
    )
    def get(self, request: HttpRequest, workflow_id: str) -> Response:
        """Recupera as informações de um workflow específico.
        
        Args:
            request: Requisição HTTP
            workflow_id: ID do workflow a ser recuperado
        
        Returns:
            Response: Resposta HTTP com detalhes do workflow em JSON
        """
        pass

# flowcube/schema.py
from drf_yasg import openapi
from typing import Optional, List

components = openapi.Components()

WorkflowSchema = openapi.Schema(
    title="Workflow",
    description="Representação de um workflow",
    type=openapi.TYPE_OBJECT,
    properties={
        "id": openapi.Schema(title="ID", description="Identificador único do workflow", type=openapi.TYPE_STRING, format=openapi.FORMAT_UUID),
        "name": openapi.Schema(title="Nome", description="Nome do workflow", type=openapi.TYPE_STRING),
        "description": openapi.Schema(title="Descrição", description="Descrição do workflow", type=openapi.TYPE_STRING),
        "steps": openapi.Schema(title="Etapa", description="Lista de etapas do workflow", type=openapi.TYPE_ARRAY, items={"$ref": "#/components/schemas/StepSchema"}),
    },
)

StepSchema = openapi.Schema(
    title="Step",
    description="Representação de uma etapa no workflow",
    type=openapi.TYPE_OBJECT,
    properties={
        "id": openapi.Schema(title="ID", description="Identificador único da etapa", type=openapi.TYPE_STRING, format=openapi.FORMAT_UUID),
        "workflow_id": openapi.Schema(title="Workflow ID", description="ID do workflow ao qual a etapa pertence", type=openapi.TYPE_STRING, format=openapi.FORMAT_UUID),
        "name": openapi.Schema(title="Nome", description="Nome da etapa", type=openapi.TYPE_STRING),
        "order": openapi.Schema(title="Ordem", description="Ordem de execução da etapa no workflow", type=openapi.TYPE_INTEGER),
    },
)

FormFieldSchema = openapi.Schema(
    title="FormField",
    description="Representação de um campo de formulário",
    type=openapi.TYPE_OBJECT,
    properties={
        "id": openapi.Schema(title="ID", description="Identificador único do campo", type=openapi.TYPE_STRING, format=openapi.FORMAT_UUID),
        "step_id": openapi.Schema(title="Step ID", description="ID da etapa ao qual o campo pertence", type=openapi.TYPE_STRING, format=openapi.FORMAT_UUID),
        "label": openapi.Schema(title="Label", description="Rótulo do campo", type=openapi.TYPE_STRING),
        "type": openapi.Schema(title="Tipo", description="Tipo do campo (text, select, etc.)", type=openapi.TYPE_STRING),
    },
)

components.schemas = {
    "WorkflowSchema": WorkflowSchema,
    "StepSchema": StepSchema,
    "FormFieldSchema": FormFieldSchema
}
