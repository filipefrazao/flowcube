# WhatsApp Business API Studio - FlowCube

Complete WhatsApp Business integration with visual flow builder, template management, and real-time analytics.

## Backend Implementation Complete

### Models
- **WhatsAppFlow**: Visual flow with React Flow state, phone number ID, activation status
- **WhatsAppTemplate**: Templates with approval workflow (draft, pending, approved, rejected)
- **WhatsAppInteraction**: Message logs with user phone, message type, response tracking
- **WhatsAppConversation**: User session state, message counts, completion status
- **WhatsAppAnalytics**: Daily metrics aggregation for performance tracking

### Meta WhatsApp Cloud API Integration
- Send text, template, interactive (buttons/lists), and media messages
- Template CRUD operations with Meta approval workflow
- Media upload and download with Cloud API
- Webhook verification and message processing

### Flow Execution Engine
- State machine for multi-step conversations
- Conditional routing based on user responses
- Variable replacement ({{name}}, {{product}})
- Session state persistence
- Support for message, template, interactive, wait, and condition nodes

### REST API Endpoints

#### Flows
- `GET /api/whatsapp/flows/` - List user's flows
- `POST /api/whatsapp/flows/` - Create new flow
- `GET /api/whatsapp/flows/{id}/` - Get flow details
- `PUT /api/whatsapp/flows/{id}/` - Update flow
- `DELETE /api/whatsapp/flows/{id}/` - Delete flow
- `POST /api/whatsapp/flows/{id}/test_flow/` - Test with simulated message
- `POST /api/whatsapp/flows/{id}/toggle_active/` - Enable/disable flow
- `GET /api/whatsapp/flows/{id}/analytics/?days=7` - Get performance metrics

#### Templates
- `GET /api/whatsapp/templates/` - List templates
- `POST /api/whatsapp/templates/` - Create template (draft)
- `GET /api/whatsapp/templates/{id}/` - Get template
- `PUT /api/whatsapp/templates/{id}/` - Update template
- `DELETE /api/whatsapp/templates/{id}/` - Delete template
- `POST /api/whatsapp/templates/{id}/submit_for_approval/` - Submit to Meta
- `POST /api/whatsapp/templates/{id}/check_status/` - Check approval status

#### Conversations & Interactions
- `GET /api/whatsapp/conversations/?flow_id=1` - List conversations
- `GET /api/whatsapp/conversations/{id}/messages/` - Get conversation history
- `GET /api/whatsapp/interactions/?user_phone=+5511999999999` - Filter interactions

#### Webhook
- `GET /api/whatsapp/webhook/` - Verify webhook (Meta setup)
- `POST /api/whatsapp/webhook/` - Receive messages from Meta

## Setup Instructions

### 1. Configure Meta WhatsApp Business API

Add to `config/settings.py`:
```python
META_WHATSAPP_ACCESS_TOKEN = 'your_long_lived_access_token'
WHATSAPP_WEBHOOK_VERIFY_TOKEN = 'your_custom_verify_token_123'
```

Get credentials from:
- Meta Business Manager > WhatsApp Business Account
- Generate long-lived access token (90 days)
- Note your Business Account ID and Phone Number ID

### 2. Run Migrations

```bash
# Inside Docker container
docker exec flowcube-backend python manage.py migrate whatsapp

# Or if you have Django locally
python manage.py migrate whatsapp
```

### 3. Configure Webhook in Meta Developer Console

- URL: `https://flowcube.frzgroup.com.br/api/whatsapp/webhook/`
- Verify Token: (same as WHATSAPP_WEBHOOK_VERIFY_TOKEN in settings)
- Subscribe to fields: `messages`, `messaging_postbacks`

### 4. Test the API

```bash
# Get auth token
TOKEN="your_api_token"

# Create a flow
curl -X POST https://flowcube.frzgroup.com.br/api/whatsapp/flows/ \
  -H "Authorization: Token $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Welcome Flow",
    "description": "Greet new users",
    "phone_number_id": "933152683214452",
    "workflow": 1,
    "flow_data": {
      "nodes": [
        {
          "id": "1",
          "type": "message",
          "data": {"text": "Welcome to our service!"}
        }
      ],
      "edges": []
    }
  }'

# Test the flow
curl -X POST https://flowcube.frzgroup.com.br/api/whatsapp/flows/1/test_flow/ \
  -H "Authorization: Token $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "test_phone": "+5511999999999",
    "message_data": {
      "type": "text",
      "text": {"body": "hello"}
    }
  }'
```

## Frontend (Next Steps)

### Components to Implement

#### 1. WhatsAppStudio (`/app/whatsapp-studio/page.tsx`)
- React Flow canvas with custom WhatsApp nodes
- Sidebar node palette (message, template, interactive, wait, condition)
- Properties panel for selected node
- Phone preview panel (real-time rendering)
- Test mode simulator

#### 2. WhatsApp Nodes
```tsx
// MessageNode.tsx - Send text message
// InteractiveNode.tsx - Buttons/lists
// TemplateNode.tsx - Approved templates
// WaitNode.tsx - Wait for user input
// ConditionNode.tsx - Branch on response
```

#### 3. PhonePreview Component
```tsx
// components/whatsapp/PhonePreview.tsx
- iPhone/Android mockup with WhatsApp UI
- Message bubbles (sent/received)
- Timestamp rendering
- Button/list rendering
- Scroll to latest message
```

#### 4. TemplateDesigner
```tsx
// components/whatsapp/TemplateDesigner.tsx
- Header type selector (text, image, video, document)
- Body editor with {{variable}} support
- Footer text input
- Button builder (reply, call, URL)
- Real-time preview
- Submit for approval button
```

#### 5. Analytics Dashboard
```tsx
// app/whatsapp-studio/analytics/page.tsx
- Line chart: Messages sent/received over time
- Funnel: Conversation start → completion
- Metrics cards: Total messages, active conversations, completion rate
- Filter by date range
```

### Suggested File Structure

```
frontend/src/
├── app/
│   └── whatsapp-studio/
│       ├── page.tsx                 # Main studio
│       ├── analytics/page.tsx       # Analytics dashboard
│       └── templates/page.tsx       # Template library
├── components/
│   └── whatsapp/
│       ├── PhonePreview.tsx         # Phone mockup
│       ├── TemplateDesigner.tsx     # Visual template builder
│       ├── nodes/
│       │   ├── MessageNode.tsx
│       │   ├── InteractiveNode.tsx
│       │   ├── TemplateNode.tsx
│       │   ├── WaitNode.tsx
│       │   └── ConditionNode.tsx
│       └── ConversationList.tsx     # Active conversations
└── lib/
    └── whatsapp-api.ts              # API client functions
```

## Meta WhatsApp API Limits & Best Practices

### Template Limits
- Max 250 templates per Business Account
- Approval time: 24-48 hours typically
- Categories: marketing (requires opt-in), utility, authentication

### Message Limits
- Rate limits based on phone number tier
- Tier 1: 1K conversations/day
- Tier 2: 10K conversations/day
- Tier 3: 100K conversations/day (request from Meta)

### Button Limits
- Max 3 buttons per message
- Button text: max 20 characters
- URL buttons: can have dynamic variables

### List Limits
- Max 10 items per list
- Max 10 sections per list
- Item title: max 24 characters

## Integration with Evolution API

Currently using Evolution API (`https://evolution.frzgroup.com.br`). To migrate to Meta official API:

1. Export existing flows from Evolution
2. Update phone_number_id to Meta Phone Number IDs
3. Migrate templates to Meta template format
4. Update webhook configuration
5. Test thoroughly before switching production traffic

## Troubleshooting

### Webhook not receiving messages
- Check webhook is verified in Meta console
- Verify HTTPS certificate is valid
- Check firewall allows Meta IP ranges
- Review webhook logs: `docker logs flowcube-backend | grep webhook`

### Template stuck in pending
- Check template follows Meta guidelines
- Avoid promotional language in utility templates
- Ensure variables are properly formatted: {{1}}, {{2}}
- Review rejection reason in admin panel

### Flow not executing
- Verify flow is marked as `is_active=True`
- Check phone_number_id matches Meta configuration
- Review interaction logs for errors
- Test with test_flow endpoint first

## Next Features

- [ ] A/B testing for flows
- [ ] Template versioning and rollback
- [ ] Multi-language template support
- [ ] Conversation tagging and segmentation
- [ ] AI-powered response suggestions
- [ ] Bulk message scheduler
- [ ] Custom webhook events
- [ ] Integration with SalesCube CRM

## Support

For issues:
1. Check Meta WhatsApp Cloud API documentation
2. Review FlowCube backend logs
3. Test webhooks with Meta webhook tester tool
4. Contact FRZ Group support

## Evolution API Integration Notes

Current Evolution API keys:
- API Key: `429683C4C977415CAAFCCE10F7D57E11`
- Base URL: `https://evolution.frzgroup.com.br`

Active instances:
- `api_oficial_suporte_frz` - +55 91 9186-2660
- `api_oficial_suporte_vix` - +55 27 99856-0997
