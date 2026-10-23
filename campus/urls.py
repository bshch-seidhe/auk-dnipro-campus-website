from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from core import views as core_views

admin.site.site_header = "AUK Dnipro Campus"
admin.site.site_title = "AUK Dnipro admin"
admin.site.index_title = "Content"

urlpatterns = [
    path("", core_views.home, name="home"),
    path("about/", core_views.about, name="about"),
    path("news/", include("news.urls")),
    path("admin/", admin.site.urls),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
