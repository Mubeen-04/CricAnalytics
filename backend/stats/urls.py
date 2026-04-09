from django.urls import path
from .views import get_players, get_player, search_player

urlpatterns = [
    path('players/', get_players),
    path('player/<int:id>/', get_player),
    path('search/', search_player),
]