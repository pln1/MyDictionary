from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TopicViewSet, UnitViewSet, TranslationView, RegisterView

router = DefaultRouter()
router.register(r"topics", TopicViewSet, basename="topic")
router.register(r"units", UnitViewSet, basename="unit")

urlpatterns = [
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("translate/", TranslationView.as_view(), name="translate"),
    path("", include(router.urls)),
]
