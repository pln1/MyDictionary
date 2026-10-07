from rest_framework import serializers
from .models import Topic, Unit, TopicUnit
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

User = get_user_model()


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "source_lang", "target_lang"]
        read_only_fields = ["id", "username"]


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

    def validate_name(self, value):
        if value.strip().lower() == "saved":
            raise serializers.ValidationError(
                "Topic name 'Saved' is reserved for system use."
            )
        return value

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
        read_only_fields = ["id", "user", "added_date", "learned_date"]

    def validate_topic_ids(self, topics):
        user = self.context["request"].user
        for topic in topics:
            if topic.user != user:
                raise serializers.ValidationError(f"Topic '{topic.name}' is not yours.")
        return topics

    def create(self, validated_data):
        topics = validated_data.pop("topics", [])

        user = validated_data.pop("user", None)
        if not user and "request" in self.context:
            user = self.context["request"].user

        unit = Unit.objects.create(user=user, **validated_data)

        for topic in topics:
            TopicUnit.objects.create(unit=unit, topic=topic)

        return unit
