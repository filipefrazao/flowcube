"""
Core — Shared models and utilities for FRZ Platform.

Re-exports shared models from flowcube.models for a cleaner import path.
Other apps should import from `core.models` instead of `flowcube.models`.
"""
default_app_config = "core.apps.CoreConfig"
