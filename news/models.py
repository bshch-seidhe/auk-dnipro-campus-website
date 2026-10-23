from django.conf import settings
from django.db import models
from django.urls import reverse
from django.utils import timezone


class PostQuerySet(models.QuerySet):
    def published(self):
        """Posts visible to the public: marked published and not scheduled for the future."""
        return self.filter(is_published=True, published_at__lte=timezone.now())


class Post(models.Model):
    class Kind(models.TextChoices):
        NEWS = "news", "News"
        ANNOUNCEMENT = "announcement", "Announcement"

    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True)
    kind = models.CharField(max_length=20, choices=Kind, default=Kind.NEWS)
    summary = models.CharField(max_length=300, blank=True, help_text="Short teaser shown in lists.")
    body = models.TextField()
    cover = models.ImageField(upload_to="news/%Y/%m/", blank=True)

    is_published = models.BooleanField(default=False)
    is_pinned = models.BooleanField(default=False, help_text="Pinned posts stay on top of the list.")
    published_at = models.DateTimeField(default=timezone.now, help_text="Set a future time to schedule the post.")

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="posts",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = PostQuerySet.as_manager()

    class Meta:
        ordering = ["-is_pinned", "-published_at"]

    def __str__(self):
        return self.title

    def get_absolute_url(self):
        return reverse("news:detail", args=[self.slug])
