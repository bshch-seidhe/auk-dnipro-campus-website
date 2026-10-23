from django.shortcuts import render

from news.models import Post


def home(request):
    posts = Post.objects.published()[:5]
    return render(request, "core/home.html", {"posts": posts})


def about(request):
    return render(request, "core/about.html")
