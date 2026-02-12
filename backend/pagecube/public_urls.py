from django.urls import path
from . import views

urlpatterns = [
    path('', views.serve_page, name='serve-page'),
]
