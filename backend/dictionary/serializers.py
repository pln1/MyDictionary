from rest_framework import serializers
from .models import Topic, Unit
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True, required=True, validators=[validate_password]
    )
    password_confirm = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ["id", "username", "password", "password_confirm"]

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password": "Invalid password."})
        return attrs

    def create(self, validated_data):
        validated_data.pop("password_confirm")
        user = User.objects.create_user(
            username=validated_data["username"],
            password=validated_data["password"],
        )
        return user


class TopicSerializer(serializers.ModelSerializer):
    units_count = serializers.IntegerField(source="units.count", read_only=True)

    class Meta:
        model = Topic
        fields = ["id", "name", "position", "units_count", "created_at"]
        read_only_fields = ["id", "created_at"]


class UnitSerializer(serializers.ModelSerializer):
    topic_ids = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Topic.objects.all(), source="topics", required=False
    )

    class Meta:
        model = Unit
        fields = [
            "id",
            "text",
            "translation",
            "source_lang",
            "target_lang",
            "state",
            "topic_ids",
            "added_date",
            "learned_date",
        ]
        read_only_fields = ["id", "added_date"]

    def validate_topic_ids(self, topics):
        user = self.context["request"].user
        for topic in topics:
            if topic.user != user:
                raise serializers.ValidationError(f"Topic '{topic.name}' is noy yours.")
        return topics
