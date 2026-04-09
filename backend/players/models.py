from django.db import models


class Player(models.Model):

    id = models.IntegerField(primary_key=True)
    name = models.CharField(max_length=200)
    full_name = models.CharField(max_length=200, null=True)
    gender = models.CharField(max_length=20)
    batting_style = models.CharField(max_length=100)
    bowling_style = models.CharField(max_length=100)
    playing_role = models.CharField(max_length=100)
    country_id = models.IntegerField()
    description = models.TextField(null=True, blank=True)
    image_url = models.TextField(null=True, blank=True)

    class Meta:
        db_table = "players"
        managed = False


class Country(models.Model):
    id = models.IntegerField(primary_key=True)
    country = models.CharField(max_length=100)
    image_url = models.TextField(null=True, blank=True)

    class Meta:
        db_table = "country"
        managed = False