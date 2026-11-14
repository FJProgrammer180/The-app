# Migrations
Dev/test uses SQLAlchemy `create_all` against `DATABASE_URL` (SQLite default).
Production: set `DATABASE_URL=postgresql+psycopg://...` — all models are portable
(FKs, unique idempotency constraint, indexes declared in `app/models.py`).
Generate Alembic revisions from these models before first production deploy:
`alembic init alembic && alembic revision --autogenerate -m init && alembic upgrade head`
