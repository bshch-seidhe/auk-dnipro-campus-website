from datetime import timedelta

from django.contrib.auth.models import Group, User
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from .models import Post


def make_post(slug, **kwargs):
    defaults = {"title": slug.title(), "body": "Body text.", "is_published": True}
    defaults.update(kwargs)
    return Post.objects.create(slug=slug, **defaults)


class PublishedTests(TestCase):
    def setUp(self):
        self.live = make_post("live")
        self.draft = make_post("draft", is_published=False)
        self.future = make_post("future", published_at=timezone.now() + timedelta(days=1))

    def test_list_shows_only_live_posts(self):
        res = self.client.get(reverse("news:list"))
        self.assertEqual(list(res.context["page"]), [self.live])

    def test_home_shows_only_live_posts(self):
        res = self.client.get(reverse("home"))
        self.assertEqual(list(res.context["posts"]), [self.live])

    def test_detail_404_for_draft_and_future(self):
        self.assertEqual(self.client.get(self.live.get_absolute_url()).status_code, 200)
        self.assertEqual(self.client.get(self.draft.get_absolute_url()).status_code, 404)
        self.assertEqual(self.client.get(self.future.get_absolute_url()).status_code, 404)


class OrderingAndFilterTests(TestCase):
    def test_pinned_first_then_newest(self):
        now = timezone.now()
        old = make_post("old", published_at=now - timedelta(days=3))
        new = make_post("new", published_at=now - timedelta(days=1))
        pinned = make_post("pinned", published_at=now - timedelta(days=5), is_pinned=True)
        self.assertEqual(list(Post.objects.published()), [pinned, new, old])

    def test_filter_by_kind(self):
        make_post("n")
        a = make_post("a", kind=Post.Kind.ANNOUNCEMENT)
        res = self.client.get(reverse("news:list"), {"kind": "announcement"})
        self.assertEqual(list(res.context["page"]), [a])

    def test_unknown_kind_is_ignored(self):
        make_post("n")
        res = self.client.get(reverse("news:list"), {"kind": "bogus"})
        self.assertEqual(res.context["kind"], "")
        self.assertEqual(len(res.context["page"]), 1)


class AdminTests(TestCase):
    def test_editor_can_create_post_and_becomes_author(self):
        editor = User.objects.create_user("editor", password="pw", is_staff=True)
        editor.groups.add(Group.objects.get(name="Editors"))
        self.client.force_login(editor)
        now = timezone.localtime()
        res = self.client.post(reverse("admin:news_post_add"), {
            "title": "Hello", "slug": "hello", "kind": "news", "summary": "", "body": "Hi",
            "is_published": "on",
            "published_at_0": now.strftime("%Y-%m-%d"), "published_at_1": now.strftime("%H:%M:%S"),
        })
        self.assertEqual(res.status_code, 302)
        self.assertEqual(Post.objects.get(slug="hello").author, editor)

    def test_staff_without_group_cannot_add(self):
        user = User.objects.create_user("nobody", password="pw", is_staff=True)
        self.client.force_login(user)
        self.assertEqual(self.client.get(reverse("admin:news_post_add")).status_code, 403)
