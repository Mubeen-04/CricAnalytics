from django.db import models


class OdiBatting(models.Model):
    player_id = models.IntegerField(primary_key=True)
    span = models.CharField(max_length=20)
    matches = models.IntegerField()
    innings = models.IntegerField()
    not_out = models.IntegerField()
    runs = models.IntegerField()
    high_score = models.CharField(max_length=20)
    average = models.FloatField()
    balls_faced = models.IntegerField()
    strike_rate = models.FloatField()
    hundreds = models.IntegerField()
    fifties = models.IntegerField()
    ducks = models.IntegerField()
    fours = models.IntegerField()
    sixes = models.IntegerField()

    class Meta:
        db_table = "odi_batting"
        managed = False


class OdiBowling(models.Model):
    player_id = models.IntegerField(primary_key=True)
    span = models.CharField(max_length=20)
    # Source table stores overs, not balls.
    balls = models.CharField(max_length=20, db_column="overs")
    wickets = models.IntegerField()
    bowling_avg = models.FloatField(db_column="bowling_average")
    economy = models.FloatField(db_column="economy_rate")
    strike_rate = models.FloatField(db_column="bowling_strike_rate")
    four_wkts = models.IntegerField(db_column="four_wicket_hauls")
    five_wkts = models.IntegerField(db_column="five_wicket_hauls")

    class Meta:
        db_table = "odi_bowling"
        managed = False


class TestBatting(models.Model):
    player_id = models.IntegerField(primary_key=True)
    span = models.CharField(max_length=20)
    matches = models.IntegerField()
    innings = models.IntegerField()
    runs = models.IntegerField()
    average = models.FloatField()
    strike_rate = models.FloatField()

    class Meta:
        db_table = "test_batting"
        managed = False


class TestBowling(models.Model):
    player_id = models.IntegerField(primary_key=True)
    wickets = models.IntegerField()
    average = models.FloatField(db_column="bowling_average")
    economy = models.FloatField(db_column="economy_rate")
    strike_rate = models.FloatField(db_column="bowling_strike_rate")

    class Meta:
        db_table = "test_bowling"
        managed = False


class T20Batting(models.Model):
    player_id = models.IntegerField(primary_key=True)
    runs = models.IntegerField()
    average = models.FloatField()
    strike_rate = models.FloatField()
    fours = models.IntegerField()
    sixes = models.IntegerField()

    class Meta:
        db_table = "t20_batting"
        managed = False


class T20Bowling(models.Model):
    player_id = models.IntegerField(primary_key=True)
    wickets = models.IntegerField()
    average = models.FloatField(db_column="bowling_average")
    economy = models.FloatField(db_column="economy_rate")
    strike_rate = models.FloatField(db_column="bowling_strike_rate")

    class Meta:
        db_table = "t20_bowling"
        managed = False

class OdiAllRound(models.Model):

    player_id = models.IntegerField(primary_key=True)
    runs = models.IntegerField()
    wickets = models.IntegerField()
    batting_avg = models.FloatField(db_column="batting_average")
    bowling_avg = models.FloatField(db_column="bowling_average")

    class Meta:
        db_table = "odi_allround"
        managed = False


class TestAllRound(models.Model):

    player_id = models.IntegerField(primary_key=True)
    runs = models.IntegerField()
    wickets = models.IntegerField()
    batting_avg = models.FloatField(db_column="batting_average")
    bowling_avg = models.FloatField(db_column="bowling_average")

    class Meta:
        db_table = "test_allround"
        managed = False


class T20AllRound(models.Model):

    player_id = models.IntegerField(primary_key=True)
    runs = models.IntegerField()
    wickets = models.IntegerField()
    batting_avg = models.FloatField(db_column="batting_average")
    bowling_avg = models.FloatField(db_column="bowling_average")

    class Meta:
        db_table = "t20_allround"
        managed = False
