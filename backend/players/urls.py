from django.urls import path
from .views import (
    # Per-player (now return batting + bowling together)
    player_odi_stats,
    player_test_stats,
    player_t20_stats,
    player_profile,

    # Leaderboards — batting
    top_odi_batsmen,
    top_test_batsmen,   # NEW
    top_t20_batsmen,    # NEW

    # Leaderboards — bowling
    top_odi_bowlers,    # NEW
    top_test_bowlers,
    top_t20_bowlers,    # NEW

    # Leaderboards — all-round
    top_odi_allrounders,
    top_test_allrounders,
    top_t20_allrounders,

    # Compare
    compare_players,
    analyze_team_builder,
)

urlpatterns = [

    # ── Per-player stats ──────────────────────────────────
    path('player/<int:id>/odi/',     player_odi_stats),
    path('player/<int:id>/test/',    player_test_stats),
    path('player/<int:id>/t20/',     player_t20_stats),
    path('player/<int:id>/profile/', player_profile),

    # ── ODI leaderboards ─────────────────────────────────
    path('stats/odi/batting/top/',   top_odi_batsmen),
    path('stats/odi/bowling/top/',   top_odi_bowlers),
    path('stats/odi/allround/top/',  top_odi_allrounders),

    # ── Test leaderboards ────────────────────────────────
    path('stats/test/batting/top/',  top_test_batsmen),
    path('stats/test/bowling/top/',  top_test_bowlers),
    path('stats/test/allround/top/', top_test_allrounders),

    # ── T20 leaderboards ─────────────────────────────────
    path('stats/t20/batting/top/',   top_t20_batsmen),
    path('stats/t20/bowling/top/',   top_t20_bowlers),
    path('stats/t20/allround/top/',  top_t20_allrounders),

    # ── Compare ───────────────────────────────────────────
    # ?player1=<id>&player2=<id>&format=odi|test|t20
    path('compare/', compare_players),

    # ── Team Builder ──────────────────────────────────────
    path('team-builder/analyze/', analyze_team_builder),
]