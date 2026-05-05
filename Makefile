# HRMS — top-level Makefile
#
# Convenience wrapper around docker-compose, the Go backend, and the Next.js
# frontend. Run `make help` to see every target.
#
# Each target is .PHONY (no file artifacts at the repo root); recipes shell
# out to the per-component tooling rather than duplicating logic.

SHELL := /usr/bin/env bash
.SHELLFLAGS := -eu -o pipefail -c
.DEFAULT_GOAL := help

BACKEND_DIR  := backend
FRONTEND_DIR := frontend

# Source backend/.env into the recipe shell when present. Used after we've
# already `cd`'d into BACKEND_DIR, so the path is just `.env`.
# `set -a` exports every variable set during the source so child processes
# (go run, etc.) inherit them. The file is optional — shell-exported vars
# still take precedence and missing .env is not an error.
LOAD_ENV = set -a; [ -f .env ] && . ./.env || true; set +a

# psql against the docker-compose Postgres
PSQL = docker compose exec -T postgres psql -U hrms -d hrms

# ------------------------------------------------------------------ help

.PHONY: help
help: ## Show this help
	@awk 'BEGIN {FS=":.*##"; printf "\nTargets:\n"} /^[a-zA-Z0-9_.-]+:.*?##/ { printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

# ------------------------------------------------------------------ infra (docker compose)

.PHONY: up
up: ## Start Postgres + Redis (detached)
	docker compose up -d
	@echo "waiting for healthy services..."
	@for i in $$(seq 1 30); do \
	  if docker compose ps --status running --format '{{.Health}}' | grep -qv healthy; then \
	    sleep 1; \
	  else \
	    break; \
	  fi; \
	done
	docker compose ps

.PHONY: down
down: ## Stop and remove containers (volumes preserved)
	docker compose down

.PHONY: nuke
nuke: ## Stop and remove containers AND volumes (deletes all data)
	docker compose down -v

.PHONY: ps
ps: ## Show docker compose status
	docker compose ps

.PHONY: logs
logs: ## Tail docker compose logs
	docker compose logs -f --tail=100

# ------------------------------------------------------------------ install

.PHONY: install
install: install-backend install-frontend ## Install all dependencies

.PHONY: install-backend
install-backend: ## Download Go modules
	cd $(BACKEND_DIR) && go mod download

.PHONY: install-frontend
install-frontend: ## npm install
	cd $(FRONTEND_DIR) && npm install --no-fund --no-audit

.PHONY: env
env: ## Copy .env.example -> .env in backend & frontend (no-op if present)
	@[ -f $(BACKEND_DIR)/.env ]      || cp $(BACKEND_DIR)/.env.example      $(BACKEND_DIR)/.env
	@[ -f $(FRONTEND_DIR)/.env.local ] || cp $(FRONTEND_DIR)/.env.example   $(FRONTEND_DIR)/.env.local
	@echo "envs ready"

# ------------------------------------------------------------------ run

.PHONY: dev
dev: up ## Start infra + backend + frontend in parallel (Ctrl-C stops both)
	@$(MAKE) -j2 backend frontend

.PHONY: backend
backend: ## Run the Go backend (foreground; loads backend/.env)
	cd $(BACKEND_DIR) && $(LOAD_ENV); go run ./cmd/server

.PHONY: frontend
frontend: ## Run the Next.js dev server (foreground)
	cd $(FRONTEND_DIR) && npm run dev

# ------------------------------------------------------------------ build / test / lint

.PHONY: build
build: build-backend build-frontend ## Build both

.PHONY: build-backend
build-backend: ## go build
	cd $(BACKEND_DIR) && go build ./...

.PHONY: build-frontend
build-frontend: ## next build
	cd $(FRONTEND_DIR) && npm run build

.PHONY: test
test: ## go test ./...
	cd $(BACKEND_DIR) && go test ./...

.PHONY: vet
vet: ## go vet ./...
	cd $(BACKEND_DIR) && go vet ./...

.PHONY: lint
lint: ## eslint frontend
	cd $(FRONTEND_DIR) && npm run lint

.PHONY: check
check: vet test lint build ## Run vet + test + lint + build (CI-equivalent)

# ------------------------------------------------------------------ codegen

.PHONY: gen
gen: gen-graphql gen-sqlc ## Run all code generators

.PHONY: gen-graphql
gen-graphql: ## gqlgen generate (after editing *.graphqls)
	cd $(BACKEND_DIR) && go run github.com/99designs/gqlgen generate

.PHONY: gen-sqlc
gen-sqlc: ## sqlc generate (after editing queries/*.sql)
	cd $(BACKEND_DIR) && sqlc generate

# ------------------------------------------------------------------ db helpers

.PHONY: psql
psql: ## Open psql against the docker compose Postgres
	docker compose exec postgres psql -U hrms -d hrms

.PHONY: db-reset
db-reset: ## Drop & recreate the dev database (server reapplies migrations on next boot)
	$(PSQL) -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

.PHONY: seed
seed: ## Insert a demo tenant + admin user (idempotent)
	@$(PSQL) <<'SQL'
	INSERT INTO tenants (name, code) VALUES ('Acme', 'acme')
	  ON CONFLICT (code) DO NOTHING;
	INSERT INTO users (tenant_id, email, password_hash)
	VALUES (
	  (SELECT id FROM tenants WHERE code='acme'),
	  'admin@acme.test',
	  '$$2a$$10$$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'
	) ON CONFLICT DO NOTHING;
	SQL
	@echo "seeded: tenant=acme  email=admin@acme.test  password=secret"

# ------------------------------------------------------------------ clean

.PHONY: clean
clean: ## Remove backend build cache & frontend .next
	cd $(BACKEND_DIR) && go clean -cache -testcache 2>/dev/null || true
	rm -rf $(FRONTEND_DIR)/.next $(FRONTEND_DIR)/node_modules/.cache
