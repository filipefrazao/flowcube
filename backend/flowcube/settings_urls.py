from rest_framework.routers import DefaultRouter
from .settings_views import (
    UserGroupViewSet, BusinessUnitViewSet,
    SquadViewSet, TagViewSet,
)

router = DefaultRouter()
router.register(r"groups", UserGroupViewSet, basename="groups")
router.register(r"units", BusinessUnitViewSet, basename="units")
router.register(r"squads", SquadViewSet, basename="squads")
router.register(r"tags", TagViewSet, basename="tags")

urlpatterns = router.urls
