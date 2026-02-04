"""
Instagram DM Automation for FlowCube
Multi-Agent Orchestration Platform

Provides Instagram Direct Message automation via Meta's Instagram Graph API.
Supports:
- Business account connection
- Incoming message handling
- Outbound messaging with quick replies
- Ice breaker management
- 24-hour messaging window handling
- Human agent handover
- Rate limiting (200 messages/user/day)

Created: 2026-02-02
"""

default_app_config = 'instagram_automation.apps.InstagramAutomationConfig'

__version__ = '1.0.0'
