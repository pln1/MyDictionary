from django.shortcuts import render
from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Topic, Unit, TopicUnit
from .serializers import (
    TopicSerializer,
    UnitSerializer,
    RegisterSerializer,
    UserProfileSerializer,
)
from .services import translate_text


# Create your views here.
class StandardResultsSetPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class UserProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request):
        serializer = UserProfileSerializer(
            request.user, data=request.data, partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TranslationView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        text = request.data.get("text", "").strip()
        if not text:
            return Response(
                {"error": "Field 'text' must be specified."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user if request.user.is_authenticated else None
        source_lang = request.data.get(
            "source_lang", getattr(user, "source_lang", "en")
        )
        target_lang = request.data.get(
            "target_lang", getattr(user, "target_lang", "uk")
        )

        translation = translate_text(text, source_lang, target_lang)

        is_saved = False
        if user:
            is_saved = Unit.objects.filter(user=user, text__iexact=text).exists()

        return Response(
            {
                "text": text,
                "translation": translation,
                "source_lang": source_lang,
                "target_lang": target_lang,
                "is_saved": is_saved,
            },
            status=status.HTTP_200_OK,
        )


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()

            refresh = RefreshToken.for_user(user)

            return Response(
                {
                    "user": {
                        "id": user.id,
                        "username": user.username,
                    },
                    "tokens": {
                        "refresh": str(refresh),
                        "access": str(refresh.access_token),
                    },
                },
                status=status.HTTP_201_CREATED,
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TopicViewSet(viewsets.ModelViewSet):
    serializer_class = TopicSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Topic.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)

        total_units_count = Unit.objects.filter(user=request.user).count()
        system_topic = {
            "id": "saved",
            "name": "Saved",
            "position": -1,
            "units_count": total_units_count,
            "is_system": True,
            "created_at": None,
        }

        return Response([system_topic] + serializer.data, status=status.HTTP_200_OK)

    def destroy(self, request, *args, **kwargs):
        if kwargs.get("pk") == "saved":
            return Response(
                {"error": "System topic 'Saved' cannot be deleted."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        if kwargs.get("pk") == "saved":
            return Response(
                {"error": "System topic 'Saved' cannot be modified."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().update(request, *args, **kwargs)

    @action(detail=False, methods=["post"])
    def reorder(self, request):
        orders = request.data.get("positions", [])
        for item in orders:
            Topic.objects.filter(id=item.get("id"), user=request.user).update(
                position=item.get("position", 0)
            )
        return Response({"status": "ok"}, status=status.HTTP_200_OK)


class UnitViewSet(viewsets.ModelViewSet):
    serializer_class = UnitSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        queryset = Unit.objects.filter(user=self.request.user).prefetch_related(
            "topics"
        )
        topic_id = self.request.query_params.get("topic_id")
        if topic_id:
            queryset = queryset.filter(topics__id=topic_id).order_by(
                "topicunit__position", "-topicunit__added_at"
            )
        else:
            queryset = queryset.order_by("-added_date")
        return queryset

    def create(self, request, *args, **kwargs):
        text = request.data.get("text", "").strip()
        if not text:
            return Response(
                {"error": "Field 'text' is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        existing = Unit.objects.filter(user=request.user, text__iexact=text).first()
        if existing:
            return Response(
                {
                    "message": "Unit already exists in Saved.",
                    "unit": self.get_serializer(existing).data,
                },
                status=status.HTTP_409_CONFLICT,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user)

        headers = self.get_success_headers(serializer.data)
        return Response(
            serializer.data, status=status.HTTP_201_CREATED, headers=headers
        )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=["patch"])
    def toggle_state(self, request, pk=None):
        from django.utils import timezone

        unit = self.get_object()
        if unit.state == Unit.State.LEARNING:
            unit.state = Unit.State.LEARNED
            unit.learned_date = timezone.now()
        else:
            unit.state = Unit.State.LEARNING
            unit.learned_date = None
        unit.save(update_fields=["state", "learned_date"])
        return Response(self.get_serializer(unit).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def set_topics(self, request, pk=None):
        unit = self.get_object()
        topic_ids = request.data.get("topic_ids", [])
        valid_topics = Topic.objects.filter(id__in=topic_ids, user=request.user)
        valid_ids = set(valid_topics.values_list("id", flat=True))

        from .models import TopicUnit

        TopicUnit.objects.filter(unit=unit).exclude(topic_id__in=valid_ids).delete()
        existing_ids = set(
            TopicUnit.objects.filter(unit=unit).values_list("topic_id", flat=True)
        )
        for t_id in valid_ids - existing_ids:
            TopicUnit.objects.create(unit=unit, topic_id=t_id)

        return Response(self.get_serializer(unit).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"])
    def reorder_in_topic(self, request):
        topic_id = request.data.get("topic_id")
        positions = request.data.get("positions", [])

        if not topic_id:
            return Response(
                {"error": "topic_id is required."}, status=status.HTTP_400_BAD_REQUEST
            )

        if not Topic.objects.filter(id=topic_id, user=request.user).exists():
            return Response(
                {"error": "Topic not found."}, status=status.HTTP_404_NOT_FOUND
            )

        for item in positions:
            TopicUnit.objects.filter(
                topic_id=topic_id, unit_id=item.get("unit_id")
            ).update(position=item.get("position", 0))

        return Response({"status": "ok"}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def remove_from_topic(self, request, pk=None):
        unit = self.get_object()
        topic_id = request.data.get("topic_id")

        if not topic_id:
            return Response(
                {"error": "topic_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        deleted_count, _ = TopicUnit.objects.filter(
            unit=unit, topic_id=topic_id, topic__user=request.user
        ).delete()

        if deleted_count == 0:
            return Response(
                {"error": "Topic link not found or does not belong to you."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(self.get_serializer(unit).data, status=status.HTTP_200_OK)
