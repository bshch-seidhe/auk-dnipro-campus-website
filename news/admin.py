from django.contrib import admin

from .models import Post


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ["title", "kind", "is_published", "is_pinned", "published_at", "author"]
    list_filter = ["kind", "is_published", "is_pinned"]
    list_editable = ["is_published", "is_pinned"]
    search_fields = ["title", "summary", "body"]
    prepopulated_fields = {"slug": ["title"]}
    date_hierarchy = "published_at"
    readonly_fields = ["author", "created_at", "updated_at"]
    fieldsets = [
        (None, {"fields": ["title", "slug", "kind", "summary", "body", "cover"]}),
        ("Publishing", {"fields": ["is_published", "is_pinned", "published_at"]}),
        ("Info", {"fields": ["author", "created_at", "updated_at"], "classes": ["collapse"]}),
    ]

    def save_model(self, request, obj, form, change):
        if not obj.author_id:
            obj.author = request.user
        super().save_model(request, obj, form, change)
