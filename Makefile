.PHONY: up down dev logs migrate seed build push backup restore

up:
	docker compose up -d

down:
	docker compose down

dev:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

logs:
	docker compose logs -f

migrate:
	docker compose exec planview-web alembic upgrade head

seed:
	docker compose exec planview-web python -m seed

build:
	docker compose build

push:
	docker push wgf007/planview-api:latest
	docker push wgf007/planview-ui:latest

backup:
	./scripts/backup.sh ./backups

restore:
	@echo "Usage: ./scripts/restore.sh <backup_file.sql.gz>"
