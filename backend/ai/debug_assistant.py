import os
import json
from openai import OpenAI
from typing import Dict, Any, List, Optional

class AIDebugAssistant:
    def __init__(self):
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            raise ValueError('OPENAI_API_KEY environment variable is required')
        self.client = OpenAI(api_key=api_key)

    def analyze_error(self, execution_log: Dict[str, Any], workflow_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze workflow execution error and suggest fixes

        Args:
            execution_log: Dictionary containing error information
            workflow_data: Dictionary containing workflow configuration

        Returns:
            Dictionary with root cause analysis, fixes, and prevention tips
        """

        system_prompt = """You are an AI debugging assistant for workflow automation systems.

Analyze execution errors and provide actionable insights in JSON format.

Your response MUST include:
1. root_cause: Clear explanation of what caused the error
2. fixes: Array of fix objects, each with:
   - description: What this fix does
   - code_changes: Specific config/code changes (if applicable)
   - confidence: How confident you are (high/medium/low)
3. prevention_tips: Array of tips to prevent similar errors
4. severity: How critical this error is (critical/high/medium/low)

Focus on practical, actionable solutions. Be specific about configuration changes."""

        # Extract node information from workflow data
        nodes = workflow_data.get('nodes', [])
        error_node_id = execution_log.get('node_id')
        error_node = None

        for node in nodes:
            if node.get('id') == error_node_id:
                error_node = node
                break

        error_context = {
            'error': execution_log.get('error'),
            'error_type': execution_log.get('error_type'),
            'node_id': error_node_id,
            'node_type': error_node.get('type') if error_node else None,
            'node_config': error_node.get('data', {}).get('config', {}) if error_node else execution_log.get('node_config'),
            'input_data': execution_log.get('input_data'),
            'stack_trace': execution_log.get('stack_trace'),
            'previous_nodes': execution_log.get('previous_nodes', []),
            'workflow_name': workflow_data.get('name')
        }

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": json.dumps(error_context, indent=2)}
                ],
                temperature=0.3,
                response_format={"type": "json_object"}
            )

            result = json.loads(response.choices[0].message.content)
            return result

        except Exception as e:
            return {
                'root_cause': f'Failed to analyze error: {str(e)}',
                'fixes': [],
                'prevention_tips': [],
                'severity': 'unknown'
            }

    def suggest_quick_fix(self, error_type: str, node_config: Dict[str, Any], error_message: str) -> Optional[Dict[str, Any]]:
        """Generate quick fix for common errors using pattern matching

        Args:
            error_type: Type of error (e.g., 'validation', 'timeout', 'auth')
            node_config: Current node configuration
            error_message: The error message

        Returns:
            Updated node configuration with fix applied, or None if no fix available
        """

        # Pattern matching for common errors
        fixes = {
            'timeout': self._fix_timeout,
            'auth': self._fix_auth,
            'validation': self._fix_validation,
            'connection': self._fix_connection,
            'rate_limit': self._fix_rate_limit
        }

        fix_function = fixes.get(error_type.lower())
        if fix_function:
            return fix_function(node_config, error_message)

        return None

    def _fix_timeout(self, config: Dict[str, Any], error_message: str) -> Dict[str, Any]:
        """Fix timeout errors by increasing timeout values"""
        updated_config = config.copy()
        current_timeout = config.get('timeout', 30)
        updated_config['timeout'] = min(current_timeout * 2, 300)  # Max 5 minutes
        updated_config['retry_on_timeout'] = True
        return updated_config

    def _fix_auth(self, config: Dict[str, Any], error_message: str) -> Dict[str, Any]:
        """Fix authentication errors"""
        updated_config = config.copy()

        # Suggest checking credentials
        if 'api_key' in config:
            updated_config['_debug_hint'] = 'Check if API key is valid and not expired'
        if 'token' in config:
            updated_config['_debug_hint'] = 'Check if token is valid and has required permissions'

        return updated_config

    def _fix_validation(self, config: Dict[str, Any], error_message: str) -> Dict[str, Any]:
        """Fix validation errors"""
        updated_config = config.copy()

        # Add validation settings
        updated_config['validate_input'] = True
        updated_config['strict_mode'] = False

        return updated_config

    def _fix_connection(self, config: Dict[str, Any], error_message: str) -> Dict[str, Any]:
        """Fix connection errors"""
        updated_config = config.copy()

        # Add retry logic
        updated_config['retry_count'] = 3
        updated_config['retry_delay'] = 2
        updated_config['connection_timeout'] = 30

        return updated_config

    def _fix_rate_limit(self, config: Dict[str, Any], error_message: str) -> Dict[str, Any]:
        """Fix rate limit errors"""
        updated_config = config.copy()

        # Add rate limiting settings
        updated_config['rate_limit_delay'] = 1
        updated_config['max_requests_per_minute'] = 30
        updated_config['exponential_backoff'] = True

        return updated_config

    def analyze_workflow_health(self, workflow_data: Dict[str, Any], execution_history: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze overall workflow health and identify potential issues

        Args:
            workflow_data: Workflow configuration
            execution_history: List of recent executions

        Returns:
            Health analysis with warnings and recommendations
        """

        system_prompt = """You are analyzing workflow health and performance.

Review the workflow configuration and execution history to identify:
1. Potential bottlenecks
2. Reliability issues
3. Performance optimization opportunities
4. Best practice violations

Return JSON with:
- health_score: 0-100
- warnings: Array of potential issues
- recommendations: Array of improvement suggestions
- metrics: Key metrics (avg execution time, error rate, etc)"""

        analysis_context = {
            'workflow': {
                'name': workflow_data.get('name'),
                'node_count': len(workflow_data.get('nodes', [])),
                'edge_count': len(workflow_data.get('edges', [])),
                'nodes': workflow_data.get('nodes', [])
            },
            'executions': {
                'total': len(execution_history),
                'recent_errors': [e for e in execution_history if e.get('status') == 'error'][:5],
                'avg_duration': sum(e.get('duration', 0) for e in execution_history) / max(len(execution_history), 1)
            }
        }

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": json.dumps(analysis_context, indent=2)}
                ],
                temperature=0.3,
                response_format={"type": "json_object"}
            )

            return json.loads(response.choices[0].message.content)

        except Exception as e:
            return {
                'health_score': 0,
                'warnings': [f'Failed to analyze: {str(e)}'],
                'recommendations': [],
                'metrics': {}
            }
