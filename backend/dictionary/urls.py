from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TopicViewSet,
    UnitViewSet,
    TranslationView,
    RegisterView,
    UserProfileView,
)

router = DefaultRouter()
router.register(r"topics", TopicViewSet, basename="topic")
router.register(r"units", UnitViewSet, basename="unit")

urlpatterns = [
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("auth/me/", UserProfileView.as_view(), name="user_profile"),
    path("translate/", TranslationView.as_view(), name="translate"),
    path("", include(router.urls)),
]
