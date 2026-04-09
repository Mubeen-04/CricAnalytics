from django.contrib import admin
from django.urls import include, path
from django.http import JsonResponse
from django.views.generic import TemplateView
from django.conf import settings
from django.conf.urls.static import static


def api_root(request):
    return JsonResponse({
        "message": "CricAnalytics API",
        "endpoints": {
            "players":         "/api/players/",
            "player_detail":   "/api/player/<id>/",
            "player_profile":  "/api/player/<id>/profile/",
            "search":          "/api/search/?q=<query>",
            "odi_batting_top": "/api/stats/odi/batting/top/",
            "odi_bowling_top": "/api/stats/odi/bowling/top/",
            "test_batting_top":"/api/stats/test/batting/top/",
            "test_bowling_top":"/api/stats/test/bowling/top/",
            "t20_batting_top": "/api/stats/t20/batting/top/",
            "t20_bowling_top": "/api/stats/t20/bowling/top/",
            "odi_allround_top":"/api/stats/odi/allround/top/",
            "test_allround_top":"/api/stats/test/allround/top/",
            "t20_allround_top":"/api/stats/t20/allround/top/",
            "compare":         "/api/compare/?player1=<id>&player2=<id>&match_format=odi|test|t20",
            "team_builder_analyze": "/api/team-builder/analyze/",
        }
    })


urlpatterns = [
    path('', api_root),
    path('admin/', admin.site.urls),
    path('api/', include('players.urls')),
    path('api/', include('stats.urls')),
]

# Serve frontend static files and SPA fallback
urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

# Catch-all route for SPA - must be last
urlpatterns += [
    path('<path:resource>', TemplateView.as_view(template_name='index.html')),
    path('', TemplateView.as_view(template_name='index.html')),
]