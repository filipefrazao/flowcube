"""
FlowCube AI Workflow Builder

Generates React Flow graph JSON from a natural language description
using LLM providers (OpenAI, Claude, etc.).
"""
import json
import logging
import uuid

from django.conf import settings

logger = logging.getLogger("flowcube.ai_builder")

# Default graph template for positioning
GRID_X_START = 250
GRID_Y_START = 80
GRID_Y_STEP = 160

SYSTEM_PROMPT = """You are a workflow automation expert. Given a user's description,
generate a React Flow graph JSON representing the workflow.

Output ONLY valid JSON with this structure:
{
  "nodes": [
    {
      "id": "<uuid>",
      "type": "<node_type>",
      "position": {"x": <number>, "y": <number>},
      "data": {
        "label": "<human readable label>",
        "type": "<node_type>",
        "config": { <type-specific config> }
      }
    }
  ],
  "edges": [
    {
      "id": "<uuid>",
      "source": "<source_node_id>",
      "target": "<target_node_id>",
      "type": "default"
    }
  ],
  "viewport": {"x": 0, "y": 0, "zoom": 1}
}

Available node types:
- webhook_trigger: Starts workflow on webhook call
- manual_trigger: Manual start button
- schedule: Triggered on schedule
- whatsapp_trigger: WhatsApp message received
- http_request: Make HTTP API call (config: method, url, headers, body)
- condition: Branch based on condition (config: conditions[{field, operator, value, label}])
- router: Route to multiple branches (config: routes[{label, filters}])
- set_variable: Set a variable (config: variable_name, value)
- wait: Delay execution (config: duration_seconds)
- merge: Merge branches
- openai: Call OpenAI API (config: model, system_prompt, temperature)
- claude: Call Claude API (config: model, system_prompt)
- send_email: Send email (config: to, subject, body)
- whatsapp_send: Send WhatsApp message (config: instance, phone, message)
- salescube_create_lead: Create lead in SalesCube CRM (config: channel, column, mapping)
- text_response: Send text response (config: text, channel)
- json_transform: Transform JSON with JMESPath (config: expression)
- iterator: Loop over array items (config: source_field)
- aggregator: Collect items back (config: collect_field)
- filter: Filter array items (config: field, operator, value)
- sort: Sort array (config: field, direction)
- sub_workflow: Execute another workflow (config: workflow_id)

Position nodes vertically with ~160px spacing. Start triggers at y=80.
Each node should have a unique UUID id. Connect nodes with edges following the logical flow.
For conditions, use sourceHandle matching the condition label to route to different branches.
"""


async def generate_workflow_graph(description: str, provider: str = "openai") -> dict:
    """
    Generate a React Flow graph from natural language description.

    Args:
        description: Natural language description of the workflow
        provider: LLM provider ("openai" or "claude")

    Returns:
        dict: React Flow graph JSON {nodes, edges, viewport}
    """
    if provider == "claude":
        return await _generate_with_claude(description)
    return await _generate_with_openai(description)


async def _generate_with_openai(description: str) -> dict:
    """Generate graph using OpenAI."""
    import httpx

    api_key = getattr(settings, "OPENAI_API_KEY", None)
    if not api_key:
        raise ValueError("OPENAI_API_KEY not configured in settings")

    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": "gpt-4o",
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": f"Create a workflow for: {description}"},
                ],
                "temperature": 0.3,
                "response_format": {"type": "json_object"},
            },
        )
        response.raise_for_status()
        data = response.json()
        content = data["choices"][0]["message"]["content"]
        return _parse_and_validate(content)


async def _generate_with_claude(description: str) -> dict:
    """Generate graph using Claude."""
    import httpx

    api_key = getattr(settings, "ANTHROPIC_API_KEY", None)
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY not configured in settings")

    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": "claude-sonnet-4-5-20250929",
                "max_tokens": 4096,
                "system": SYSTEM_PROMPT,
                "messages": [
                    {"role": "user", "content": f"Create a workflow for: {description}"},
                ],
            },
        )
        response.raise_for_status()
        data = response.json()
        content = data["content"][0]["text"]
        return _parse_and_validate(content)


def _parse_and_validate(content: str) -> dict:
    """Parse LLM output and validate graph structure."""
    # Try to extract JSON from markdown code blocks
    if "```json" in content:
        content = content.split("```json")[1].split("```")[0]
    elif "```" in content:
        content = content.split("```")[1].split("```")[0]

    graph = json.loads(content.strip())

    # Validate required keys
    if "nodes" not in graph:
        graph["nodes"] = []
    if "edges" not in graph:
        graph["edges"] = []
    if "viewport" not in graph:
        graph["viewport"] = {"x": 0, "y": 0, "zoom": 1}

    # Ensure all nodes have required fields
    for node in graph["nodes"]:
        if "id" not in node:
            node["id"] = str(uuid.uuid4())
        if "position" not in node:
            node["position"] = {"x": GRID_X_START, "y": GRID_Y_START}
        if "data" not in node:
            node["data"] = {}
        node["data"].setdefault("label", "Untitled")
        node["data"].setdefault("type", node.get("type", "default"))

    # Ensure all edges have required fields
    for edge in graph["edges"]:
        if "id" not in edge:
            edge["id"] = str(uuid.uuid4())
        edge.setdefault("type", "default")

    return graph


def create_simple_graph(steps: list[dict]) -> dict:
    """
    Create a simple linear workflow graph from a list of step definitions.

    Args:
        steps: List of dicts with keys: type, label, config (optional)

    Returns:
        React Flow graph JSON
    """
    nodes = []
    edges = []

    for i, step in enumerate(steps):
        node_id = str(uuid.uuid4())
        nodes.append({
            "id": node_id,
            "type": step.get("type", "default"),
            "position": {"x": GRID_X_START, "y": GRID_Y_START + (i * GRID_Y_STEP)},
            "data": {
                "label": step.get("label", f"Step {i + 1}"),
                "type": step.get("type", "default"),
                "config": step.get("config", {}),
            },
        })

        if i > 0:
            edges.append({
                "id": str(uuid.uuid4()),
                "source": nodes[i - 1]["id"],
                "target": node_id,
                "type": "default",
            })

    return {
        "nodes": nodes,
        "edges": edges,
        "viewport": {"x": 0, "y": 0, "zoom": 1},
    }
