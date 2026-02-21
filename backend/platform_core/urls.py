from django.urls import path
from . import views

urlpatterns = [
    path("", views.plugin_list, name="plugin-list"),
    path("hooks/", views.hooks_list, name="plugin-hooks"),
    path("<slug:slug>/", views.plugin_detail, name="plugin-detail"),
]
