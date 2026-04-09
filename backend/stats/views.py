from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db.models import Q, Case, When, Value, IntegerField, OuterRef, Subquery, F
from django.db.models.functions import Coalesce
from players.models import Player
from players.serializers import PlayerSerializer
from .models import OdiBatting, TestBatting, T20Batting, OdiBowling, TestBowling, T20Bowling


# GET /api/players/
@api_view(['GET'])
def get_players(request):
    # Build a simple cross-format popularity score from batting runs and bowling wickets.
    # Wickets are weighted to keep specialist bowlers visible in featured cards.
    players = (
        Player.objects
        .annotate(
            odi_runs=Coalesce(
                Subquery(OdiBatting.objects.filter(player_id=OuterRef('id')).values('runs')[:1]),
                Value(0),
            ),
            test_runs=Coalesce(
                Subquery(TestBatting.objects.filter(player_id=OuterRef('id')).values('runs')[:1]),
                Value(0),
            ),
            t20_runs=Coalesce(
                Subquery(T20Batting.objects.filter(player_id=OuterRef('id')).values('runs')[:1]),
                Value(0),
            ),
            odi_wickets=Coalesce(
                Subquery(OdiBowling.objects.filter(player_id=OuterRef('id')).values('wickets')[:1]),
                Value(0),
            ),
            test_wickets=Coalesce(
                Subquery(TestBowling.objects.filter(player_id=OuterRef('id')).values('wickets')[:1]),
                Value(0),
            ),
            t20_wickets=Coalesce(
                Subquery(T20Bowling.objects.filter(player_id=OuterRef('id')).values('wickets')[:1]),
                Value(0),
            ),
        )
        .annotate(
            fame_score=(
                F('odi_runs') + F('test_runs') + F('t20_runs')
                + 20 * (F('odi_wickets') + F('test_wickets') + F('t20_wickets'))
            )
        )
        .order_by('-fame_score', 'name')
    )
    serializer = PlayerSerializer(players, many=True)
    return Response(serializer.data)


# GET /api/player/<id>/
@api_view(['GET'])
def get_player(request, id):
    player = get_object_or_404(Player, id=id)
    serializer = PlayerSerializer(player)
    return Response(serializer.data)


# GET /api/search/?q=<query>
@api_view(['GET'])
def search_player(request):
    query = (request.GET.get('q') or '').strip()

    if not query:
        return Response([])

    players = (
        Player.objects.filter(
            Q(name__icontains=query)
            | Q(full_name__icontains=query)
            | Q(playing_role__icontains=query)
        )
        .annotate(
            starts_with=Case(
                When(Q(name__istartswith=query) | Q(full_name__istartswith=query), then=Value(0)),
                default=Value(1),
                output_field=IntegerField(),
            )
        )
        .order_by('starts_with', 'name')[:30]
    )

    serializer = PlayerSerializer(players, many=True)
    return Response(serializer.data)