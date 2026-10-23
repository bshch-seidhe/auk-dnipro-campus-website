from django.core.paginator import Paginator
from django.shortcuts import get_object_or_404, render

from .models import Post


def post_list(request):
    posts = Post.objects.published()
    kind = request.GET.get("kind")
    if kind not in Post.Kind.values:
        kind = ""
    if kind:
        posts = posts.filter(kind=kind)
    page = Paginator(posts, 10).get_page(request.GET.get("page"))
    return render(request, "news/list.html", {"page": page, "kind": kind, "kinds": Post.Kind.choices})


def post_detail(request, slug):
    post = get_object_or_404(Post.objects.published(), slug=slug)
    return render(request, "news/detail.html", {"post": post})
