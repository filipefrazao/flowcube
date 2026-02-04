from openai import OpenAI
import os
import json

class AINodeBuilder:
    def __init__(self):
        self.client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
    
    def generate_node(self, description: str, context: dict = None):
        """Generate node configuration from natural language description"""
        
        system_prompt = """You are an AI assistant that generates workflow node configurations.
        
Given a description, generate a JSON node configuration with:
- type: trigger, action, condition, or ai
- label: short descriptive name
- config: node-specific configuration
- description: what the node does

Return ONLY valid JSON, no markdown or code blocks."""

        context_str = json.dumps(context, indent=2) if context else 'No existing nodes'
        
        user_prompt = f"""Generate a workflow node for: {description}

Context:
{context_str}

Return JSON format:
{{
  "type": "action",
  "label": "Send Email",
  "config": {{"to": "", "subject": "", "body": ""}},
  "description": "Sends an email to specified recipient"
}}"""

        response = self.client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7,
            max_tokens=500
        )
        
        return response.choices[0].message.content
    
    def stream_generate_node(self, description: str, context: dict = None):
        """Stream node generation with SSE"""
        
        system_prompt = """You are an AI assistant that generates workflow node configurations.

Given a description, generate a JSON node configuration with:
- type: trigger, action, condition, or ai
- label: short descriptive name
- config: node-specific configuration
- description: what the node does

Return ONLY valid JSON, no markdown or code blocks."""
        
        context_str = json.dumps(context, indent=2) if context else 'No existing nodes'
        
        user_prompt = f"""Generate a workflow node for: {description}

Context:
{context_str}

Return JSON format:
{{
  "type": "action",
  "label": "Send Email",
  "config": {{"to": "", "subject": "", "body": ""}},
  "description": "Sends an email to specified recipient"
}}"""
        
        stream = self.client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7,
            max_tokens=500,
            stream=True
        )
        
        for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
