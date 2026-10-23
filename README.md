# AUK Dnipro Campus website

Campus website: news & announcements (phase 1), class schedule + Telegram Mini App (phase 2), events & student clubs (phase 3).
Built with Django; staff post content through the Django admin.

## Run locally

```sh
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env
.venv/bin/python manage.py migrate
.venv/bin/python manage.py createsuperuser
.venv/bin/python manage.py runserver
```

Site: http://127.0.0.1:8000 · Admin: http://127.0.0.1:8000/admin/

## Giving someone access to post news

In the admin → Users → add user, tick **Staff status**, and add them to the **Editors** group.
Editors can create, edit and delete posts; nothing else.

## Tests

```sh
.venv/bin/python manage.py test
```

## Legacy

`index.html`, `app.js`, `style.css` are the original schedule Mini App prototype; they move into the `schedule` app in phase 2.
