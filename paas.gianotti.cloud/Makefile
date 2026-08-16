SHELL := /bin/bash
INFRA := terraform/01-infra
PLATFORM := terraform/02-platform
SECURITY := terraform/03-security

.PHONY: help dev dev-down dev-logs dev-reset test up infra platform security verify images ops kubeconfig outputs fmt validate deploy destroy

help:
	@grep -E '^[a-z-]+:.*?##' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*?## "}{printf "  \033[1m%-12s\033[0m %s\n", $$1, $$2}'

# --- Local development -------------------------------------------------------

dev: ## Run the whole stack locally in containers
	@test -f .env || cp .env.example .env
	docker compose up --build --wait
	@echo
	@echo "  web              http://localhost:3001"
	@echo "  api              http://localhost:3000"
	@echo "  identity admin   http://localhost:8081"
	@echo "  keycloak         http://localhost:8080  (kcadmin / kcadmin)"

dev-down: ## Stop the local stack
	docker compose down

dev-reset: ## Stop the local stack and delete its data
	docker compose down -v

dev-logs: ## Follow local logs
	docker compose logs -f

test: ## Run application tests
	cd apps/api && npm install --no-audit --no-fund && npm test

# --- Images ------------------------------------------------------------------

images: ## Build all application images (TAG=... PUSH=1 to publish)
	bash scripts/build-images.sh

ops: ## Shell into the pinned toolchain image
	bash scripts/ops

# --- Cloud -------------------------------------------------------------------

up: ## Stand up everything on DigitalOcean from scratch
	bash scripts/bootstrap.sh

infra: ## Apply stage 01 only
	terraform -chdir=$(INFRA) init -input=false
	terraform -chdir=$(INFRA) apply

platform: ## Apply stage 02 only
	terraform -chdir=$(PLATFORM) init -input=false
	terraform -chdir=$(PLATFORM) apply \
	  -var "cluster_name=$$(terraform -chdir=$(INFRA) output -raw cluster_name)" \
	  -var "database_cluster_name=$$(terraform -chdir=$(INFRA) output -raw database_cluster_name)"

security: ## Apply the zero trust stage and its policies
	terraform -chdir=terraform/03-security init -input=false
	terraform -chdir=terraform/03-security apply \
	  -var "cluster_name=$$(terraform -chdir=$(INFRA) output -raw cluster_name)" \
	  -var "vpc_name=$$(terraform -chdir=$(INFRA) output -raw vpc_name 2>/dev/null || echo '')" \
	  -var "database_cluster_name=$$(terraform -chdir=$(INFRA) output -raw database_cluster_name)"
	bash scripts/security-bootstrap.sh

verify: ## Check every control and write a dated evidence report
	bash scripts/verify-controls.sh

deploy: ## Push images and roll out the applications
	REGISTRY="$$(terraform -chdir=$(INFRA) output -raw registry_endpoint)" \
	  TAG="$${TAG:-$$(git rev-parse --short HEAD)}" PUSH=1 bash scripts/build-images.sh
	REGISTRY="$$(terraform -chdir=$(INFRA) output -raw registry_endpoint)" \
	TAG="$${TAG:-$$(git rev-parse --short HEAD)}" \
	DOMAIN="$$(terraform -chdir=$(PLATFORM) output -raw identity_url | sed -E 's#https://[^.]+\.##')" \
	  bash -c 'export IMAGE_API=$$REGISTRY/api:$$TAG IMAGE_JOBS=$$REGISTRY/jobs:$$TAG IMAGE_WEB=$$REGISTRY/web:$$TAG; \
	           for m in k8s/apps/*.yaml; do envsubst < $$m | kubectl apply -f -; done'

kubeconfig: ## Refresh local kubeconfig
	doctl kubernetes cluster kubeconfig save "$$(terraform -chdir=$(INFRA) output -raw cluster_name)"

outputs: ## Show platform URLs and credentials
	@terraform -chdir=$(PLATFORM) output
	@echo "admin console password: $$(terraform -chdir=$(PLATFORM) output -raw admin_console_password)"

fmt: ## Format Terraform
	terraform -chdir=$(INFRA) fmt
	terraform -chdir=$(PLATFORM) fmt
	terraform -chdir=$(SECURITY) fmt

validate: ## Validate all stages
	terraform -chdir=$(INFRA) init -backend=false -input=false && terraform -chdir=$(INFRA) validate
	terraform -chdir=$(PLATFORM) init -backend=false -input=false && terraform -chdir=$(PLATFORM) validate
	terraform -chdir=$(SECURITY) init -backend=false -input=false && terraform -chdir=$(SECURITY) validate

destroy: ## Tear everything down, security and platform first
	terraform -chdir=$(SECURITY) destroy
	terraform -chdir=$(PLATFORM) destroy
	terraform -chdir=$(INFRA) destroy