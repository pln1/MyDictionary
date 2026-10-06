from django.shortcuts import render
from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Topic, Unit
from .serializers import TopicSerializer, UnitSerializer, RegisterSerializer
from .services import translate_text


# Create your views here.
class TranslationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        text = request.data.get("text")
        source_lang = request.data.get(
            "source_lang", getattr(request.user, "source_lang", "en")
        )
        target_lang = request.data.get(
            "target_lang", getattr(request.user, "target_lang", "uk")
        )

        if not text:
            return Response(
                {"error": "Field 'text' must be specified."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        translation = translate_text(text, source_lang, target_lang)

        return Response(
            {
                "text": text,
                "translation": translation,
                "source_lang": source_lang,
                "target_lang": target_lang,
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


class UnitViewSet(viewsets.ModelViewSet):
    serializer_class = UnitSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Unit.objects.filter(user=self.request.user).prefetch_related(
            "topics"
        )

        topic_id = self.request.query_params.get("topic_id")
        if topic_id:
            queryset = queryset.filter(topics__id=topic_id)

        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
