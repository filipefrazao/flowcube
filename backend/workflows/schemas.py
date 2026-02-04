"""
FlowCube Pydantic Schemas - API Contracts
Exportados para sincronização com frontend TypeScript
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime
from uuid import UUID
from enum import Enum


class BlockTypeEnum(str, Enum):
    # Triggers
    WEBHOOK = "webhook"
    WHATSAPP_TRIGGER = "whatsapp_trigger"
    SCHEDULE = "schedule"
    # Inputs
    TEXT_INPUT = "text_input"
    EMAIL_INPUT = "email_input"
    PHONE_INPUT = "phone_input"
    CHOICE = "choice"
    # AI Models
    OPENAI = "openai"
    CLAUDE = "claude"
    DEEPSEEK = "deepseek"
    # Logic
    CONDITION = "condition"
    SET_VARIABLE = "set_variable"
    WAIT = "wait"
    # Outputs
    TEXT_RESPONSE = "text_response"
    IMAGE_RESPONSE = "image_response"
    WHATSAPP_TEMPLATE = "whatsapp_template"


# ============ Base Schemas ============

class BlockContentBase(BaseModel):
    """Base content for all block types"""
    pass


class WebhookContent(BlockContentBase):
    url: Optional[str] = None
    method: Literal["GET", "POST", "PUT", "DELETE"] = "POST"
    headers: Dict[str, str] = Field(default_factory=dict)
    

class WhatsAppTriggerContent(BlockContentBase):
    instance_id: Optional[str] = None
    keywords: List[str] = Field(default_factory=list)
    

class ScheduleContent(BlockContentBase):
    cron: Optional[str] = None
    timezone: str = "America/Sao_Paulo"


class TextInputContent(BlockContentBase):
    prompt: str = ""
    placeholder: str = ""
    variable_name: str = "user_input"
    validation: Optional[str] = None


class EmailInputContent(BlockContentBase):
    prompt: str = "Digite seu email:"
    variable_name: str = "user_email"


class PhoneInputContent(BlockContentBase):
    prompt: str = "Digite seu telefone:"
    variable_name: str = "user_phone"
    country_code: str = "+55"


class ChoiceContent(BlockContentBase):
    prompt: str = ""
    options: List[Dict[str, str]] = Field(default_factory=list)
    variable_name: str = "user_choice"


class OpenAIContent(BlockContentBase):
    model: str = "gpt-4o-mini"
    system_prompt: str = ""
    user_prompt: str = ""
    temperature: float = 0.7
    max_tokens: int = 1000
    output_variable: str = "ai_response"


class ClaudeContent(BlockContentBase):
    model: str = "claude-3-5-sonnet-20241022"
    system_prompt: str = ""
    user_prompt: str = ""
    temperature: float = 0.7
    max_tokens: int = 1000
    output_variable: str = "ai_response"


class DeepSeekContent(BlockContentBase):
    model: str = "deepseek-r1:70b"
    system_prompt: str = ""
    user_prompt: str = ""
    temperature: float = 0.7
    output_variable: str = "ai_response"


class ConditionContent(BlockContentBase):
    expression: str = ""
    true_label: str = "Yes"
    false_label: str = "No"


class SetVariableContent(BlockContentBase):
    variable_name: str = ""
    value: Any = None
    expression: Optional[str] = None


class WaitContent(BlockContentBase):
    duration_seconds: int = 1
    duration_type: Literal["seconds", "minutes", "hours"] = "seconds"


class TextResponseContent(BlockContentBase):
    message: str = ""
    typing_delay: int = 0


class ImageResponseContent(BlockContentBase):
    image_url: str = ""
    caption: Optional[str] = None


class WhatsAppTemplateContent(BlockContentBase):
    template_name: str = ""
    template_language: str = "pt_BR"
    components: List[Dict[str, Any]] = Field(default_factory=list)


# ============ Main Schemas ============

class VariableSchema(BaseModel):
    id: UUID
    workflow_id: UUID
    name: str
    value: Any
    is_system: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class EdgeSchema(BaseModel):
    id: UUID
    workflow_id: UUID
    source_block_id: UUID = Field(alias="source_block")
    target_block_id: UUID = Field(alias="target_block")
    source_handle: str = "default"
    target_handle: str = "default"
    condition: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True
        populate_by_name = True


class BlockSchema(BaseModel):
    id: UUID
    workflow_id: UUID
    group_id: Optional[UUID] = Field(None, alias="group")
    block_type: BlockTypeEnum
    content: Dict[str, Any] = Field(default_factory=dict)
    position_x: float = 0
    position_y: float = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        populate_by_name = True


class GroupSchema(BaseModel):
    id: UUID
    workflow_id: UUID
    title: str = "New Group"
    position_x: float = 0
    position_y: float = 0
    blocks: List[BlockSchema] = Field(default_factory=list)
    created_at: datetime

    class Config:
        from_attributes = True


class WorkflowListSchema(BaseModel):
    id: UUID
    name: str
    description: str = ""
    owner_id: int = Field(alias="owner")
    is_published: bool = False
    is_active: bool = True
    block_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        populate_by_name = True


class WorkflowDetailSchema(BaseModel):
    id: UUID
    name: str
    description: str = ""
    owner_id: int = Field(alias="owner")
    is_published: bool = False
    is_active: bool = True
    groups: List[GroupSchema] = Field(default_factory=list)
    blocks: List[BlockSchema] = Field(default_factory=list)
    edges: List[EdgeSchema] = Field(default_factory=list)
    variables: List[VariableSchema] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        populate_by_name = True


class WorkflowCreateSchema(BaseModel):
    name: str
    description: str = ""


class WorkflowUpdateSchema(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_published: Optional[bool] = None
    is_active: Optional[bool] = None


class BlockCreateSchema(BaseModel):
    block_type: BlockTypeEnum
    group_id: Optional[UUID] = None
    content: Dict[str, Any] = Field(default_factory=dict)
    position_x: float = 0
    position_y: float = 0


class BlockUpdateSchema(BaseModel):
    group_id: Optional[UUID] = None
    content: Optional[Dict[str, Any]] = None
    position_x: Optional[float] = None
    position_y: Optional[float] = None


class EdgeCreateSchema(BaseModel):
    source_block_id: UUID
    target_block_id: UUID
    source_handle: str = "default"
    target_handle: str = "default"
    condition: Optional[Dict[str, Any]] = None


# ============ Block Content Type Mapping ============

BLOCK_CONTENT_SCHEMAS = {
    BlockTypeEnum.WEBHOOK: WebhookContent,
    BlockTypeEnum.WHATSAPP_TRIGGER: WhatsAppTriggerContent,
    BlockTypeEnum.SCHEDULE: ScheduleContent,
    BlockTypeEnum.TEXT_INPUT: TextInputContent,
    BlockTypeEnum.EMAIL_INPUT: EmailInputContent,
    BlockTypeEnum.PHONE_INPUT: PhoneInputContent,
    BlockTypeEnum.CHOICE: ChoiceContent,
    BlockTypeEnum.OPENAI: OpenAIContent,
    BlockTypeEnum.CLAUDE: ClaudeContent,
    BlockTypeEnum.DEEPSEEK: DeepSeekContent,
    BlockTypeEnum.CONDITION: ConditionContent,
    BlockTypeEnum.SET_VARIABLE: SetVariableContent,
    BlockTypeEnum.WAIT: WaitContent,
    BlockTypeEnum.TEXT_RESPONSE: TextResponseContent,
    BlockTypeEnum.IMAGE_RESPONSE: ImageResponseContent,
    BlockTypeEnum.WHATSAPP_TEMPLATE: WhatsAppTemplateContent,
}
