.PHONY: up down dev logs migrate seed build push backup restore reset list-backups deploy sync deploy-seed deploy-logs

# --- Deployment config ---
DEPLOY_HOST    := bill@lxc-testbed
STACK_DIR      := /files/appdata/config/dockge/stacks/planview
DATA_DIR       := /files/appdata/config/planview/data

# --- Local dev ---
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
ifndef FILE
	@echo "Usage: make restore FILE=./backups/planview_YYYYMMDD_HHMMSS.sql.gz"
	@exit 1
endif
	./scripts/restore.sh $(FILE)

reset:
	./scripts/reset.sh

list-backups:
	@echo "Available backups:"
	@ls -lhS ./backups/*.sql.gz 2>/dev/null || echo "  No backups found in ./backups/"

# --- Remote deployment to lxc-testbed via Dockge ---

# Sync source + compose + nginx to the Dockge stack dir
sync:
	@echo "==> Syncing to $(DEPLOY_HOST):$(STACK_DIR)..."
	ssh $(DEPLOY_HOST) "sudo mkdir -p $(STACK_DIR) $(DATA_DIR)/postgres $(DATA_DIR)/uploads && sudo chown -R bill:bill $(STACK_DIR) $(DATA_DIR)"
	rsync -az --delete --exclude='__pycache__' --exclude='.venv' --exclude='node_modules' \
		--exclude='.git' --exclude='dist' --exclude='.env' \
		backend/ $(DEPLOY_HOST):$(STACK_DIR)/backend/
	rsync -az --delete --exclude='node_modules' --exclude='.git' --exclude='dist' \
		frontend/ $(DEPLOY_HOST):$(STACK_DIR)/frontend/
	rsync -az --delete nginx/ $(DEPLOY_HOST):$(STACK_DIR)/nginx/
	rsync -az deploy/compose.yaml $(DEPLOY_HOST):$(STACK_DIR)/compose.yaml
	@# Only copy .env if it doesn't exist yet (don't overwrite secrets)
	ssh $(DEPLOY_HOST) "test -f $(STACK_DIR)/.env || echo 'NO_ENV'"  | grep -q NO_ENV && \
		rsync -az deploy/.env.production $(DEPLOY_HOST):$(STACK_DIR)/.env && \
		echo "==> Copied initial .env (edit secrets on server if needed)" || \
		echo "==> .env already exists, skipping"
	@echo "==> Sync complete"

# Full deploy: sync + build + restart
deploy: sync
	@echo "==> Building and starting on $(DEPLOY_HOST)..."
	ssh $(DEPLOY_HOST) "cd $(STACK_DIR) && docker compose build && docker compose up -d"
	@echo "==> Deploy complete"

# Seed the remote database
deploy-seed:
	ssh $(DEPLOY_HOST) "cd $(STACK_DIR) && docker compose exec planview-web python -m seed"

# Tail remote logs
deploy-logs:
	ssh $(DEPLOY_HOST) "cd $(STACK_DIR) && docker compose logs -f"

# Remote DB backup
deploy-backup:
	@echo "==> Backing up remote database..."
	ssh $(DEPLOY_HOST) "cd $(STACK_DIR) && docker compose exec -T planview-db pg_dump -U planview planview | gzip" > backups/planview_remote_$$(date +%Y%m%d_%H%M%S).sql.gz
	@echo "==> Backup saved to backups/"
