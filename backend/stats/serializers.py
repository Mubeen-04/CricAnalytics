from rest_framework import serializers
from .models import (
    OdiBatting, OdiBowling, TestBatting, TestBowling, TestAllRound,
    T20Batting, T20Bowling, T20AllRound, OdiAllRound
)


class OdiBattingSerializer(serializers.ModelSerializer):
    class Meta:
        model = OdiBatting
        fields = "__all__"


class OdiBowlingSerializer(serializers.ModelSerializer):
    class Meta:
        model = OdiBowling
        fields = "__all__"


class OdiAllRoundSerializer(serializers.ModelSerializer):
    class Meta:
        model = OdiAllRound
        fields = "__all__"


class TestBattingSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestBatting
        fields = "__all__"


class TestBowlingSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestBowling
        fields = "__all__"


class TestAllRoundSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestAllRound
        fields = "__all__"


class T20BattingSerializer(serializers.ModelSerializer):
    class Meta:
        model = T20Batting
        fields = "__all__"


class T20BowlingSerializer(serializers.ModelSerializer):
    class Meta:
        model = T20Bowling
        fields = "__all__"


class T20AllRoundSerializer(serializers.ModelSerializer):
    class Meta:
        model = T20AllRound
        fields = "__all__"