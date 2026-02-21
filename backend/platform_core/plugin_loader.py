"""
Plugin discovery and registration engine.

Discovers plugins from two sources:
  1. pip-installed packages with entry_points group "flowcube.plugins"
  2. Django INSTALLED_APPS that use FlowCubePluginConfig as their AppConfig
"""
import logging
from importlib.metadata import entry_points

from django.apps import apps

logger = logging.getLogger(__name__)


class PluginRegistry:
    """Singleton registry for all discovered FlowCube plugins."""

    _plugins: dict = {}
    _discovered: bool = False

    @classmethod
    def discover(cls):
        """Discover plugins from entry_points and INSTALLED_APPS.

        Called once from FlowCubeCoreConfig.ready(). Safe to call multiple
        times (idempotent).
        """
        if cls._discovered:
            return

        # Phase 1: entry_points (pip-installed packages)
        try:
            eps = entry_points(group="flowcube.plugins")
            for ep in eps:
                try:
                    config_class = ep.load()
                    slug = getattr(config_class, "plugin_slug", ep.name)
                    if slug and slug not in cls._plugins:
                        cls._plugins[slug] = {
                            "name": ep.name,
                            "config_class": config_class,
                            "slug": slug,
                            "label": getattr(config_class, "plugin_label", ep.name),
                            "icon": getattr(config_class, "plugin_icon", "puzzle"),
                            "menu_position": getattr(config_class, "plugin_menu_position", 100),
                            "frontend_route": getattr(config_class, "plugin_frontend_route", ""),
                            "url_prefix": getattr(config_class, "plugin_url_prefix", slug),
                            "version": getattr(config_class, "plugin_version", "0.0.0"),
                            "source": "entry_point",
                        }
                        logger.info("Discovered plugin via entry_point: %s", slug)
                except Exception:
                    logger.exception("Failed to load plugin entry_point: %s", ep.name)
        except Exception:
            logger.debug("No entry_points found for group 'flowcube.plugins'")

        # Phase 2: INSTALLED_APPS introspection
        from platform_core.plugin_base import FlowCubePluginConfig

        for app_config in apps.get_app_configs():
            if (
                isinstance(app_config, FlowCubePluginConfig)
                and app_config.plugin_slug
                and app_config.plugin_slug not in cls._plugins
            ):
                cls._plugins[app_config.plugin_slug] = {
                    "name": app_config.name,
                    "config_class": type(app_config),
                    "slug": app_config.plugin_slug,
                    "label": app_config.plugin_label or app_config.verbose_name,
                    "icon": app_config.plugin_icon,
                    "menu_position": app_config.plugin_menu_position,
                    "frontend_route": app_config.plugin_frontend_route,
                    "url_prefix": app_config.plugin_url_prefix or app_config.plugin_slug,
                    "version": app_config.plugin_version,
                    "source": "installed_app",
                }
                logger.info("Discovered plugin via INSTALLED_APPS: %s", app_config.plugin_slug)

        cls._discovered = True
        logger.info("Plugin discovery complete. Found %d plugins.", len(cls._plugins))

    @classmethod
    def register(cls, app_config):
        """Register a plugin from its AppConfig.ready() call.

        This catches plugins that register themselves before discover()
        runs, or plugins added after initial discovery.
        """
        slug = app_config.plugin_slug
        if not slug:
            return

        if slug not in cls._plugins:
            cls._plugins[slug] = {
                "name": app_config.name,
                "config_class": type(app_config),
                "slug": slug,
                "label": app_config.plugin_label or app_config.verbose_name,
                "icon": app_config.plugin_icon,
                "menu_position": app_config.plugin_menu_position,
                "frontend_route": app_config.plugin_frontend_route,
                "url_prefix": app_config.plugin_url_prefix or slug,
                "version": app_config.plugin_version,
                "source": "self_registered",
            }

    @classmethod
    def get_plugin(cls, slug: str) -> dict | None:
        """Get plugin info by slug."""
        return cls._plugins.get(slug)

    @classmethod
    def get_all_plugins(cls) -> list[dict]:
        """Return all registered plugins sorted by menu_position."""
        return sorted(
            cls._plugins.values(),
            key=lambda p: p.get("menu_position", 100),
        )

    @classmethod
    def get_active_slugs(cls) -> list[str]:
        """Return list of active plugin slugs."""
        return list(cls._plugins.keys())

    @classmethod
    def reset(cls):
        """Reset registry (for testing only)."""
        cls._plugins.clear()
        cls._discovered = False
