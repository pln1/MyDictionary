from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings


# Create your models here.
class User(AbstractUser):
    source_lang = models.CharField(max_length=2, default="en")
    target_lang = models.CharField(max_length=2, default="uk")

    def __str__(self):
        return self.username


class Topic(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="topics"
    )
    name = models.CharField(max_length=100)
    position = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["position", "-created_at"]
        unique_together = ("user", "name")

    def __str__(self):
        return self.name


class Unit(models.Model):
    class State(models.TextChoices):
        LEARNING = "learning", "Learning"
        LEARNED = "learned", "Learned"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="units"
    )
    text = models.TextField()
    translation = models.TextField()
    source_lang = models.CharField(max_length=2, default="en")
    target_lang = models.CharField(max_length=2, default="uk")
    state = models.CharField(
        max_length=10, choices=State.choices, default=State.LEARNING
    )

    topics = models.ManyToManyField(
        Topic, through="TopicUnit", related_name="units", blank=True
    )

    added_date = models.DateTimeField(auto_now_add=True)
    learned_date = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("user", "text")

    def __str__(self):
        return self.text


class TopicUnit(models.Model):
    topic = models.ForeignKey(Topic, on_delete=models.CASCADE)
    unit = models.ForeignKey(Unit, on_delete=models.CASCADE)
    position = models.PositiveIntegerField(default=0)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["position", "-added_at"]
        unique_together = ("topic", "unit")
