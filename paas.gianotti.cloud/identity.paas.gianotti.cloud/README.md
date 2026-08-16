# Overview

How it's organized

Terraform runs in two stages, because the Kubernetes and Helm providers need a cluster endpoint that doesn't exist during a first plan. Stage 01 builds the VPC, the 3-node DOKS cluster, managed Postgres, and a registry. Stage 02 discovers them by name and does everything in-cluster — so the stages share no state and can be applied independently.

Database wiring. Each app gets its own logical database and role, never a shared one. Terraform drops a database secret into each namespace (DATABASE_URL, discrete PG* vars, and the managed CA), consumed with a single envFrom. The database firewall accepts connections only from the cluster, over the VPC.

Public networking. One DO load balancer fronting ingress-nginx in TCP mode with PROXY protocol, so apps see real client IPs. cert-manager issues Let's Encrypt certs; DNS is an apex + wildcard A record, so routing decisions live in ingress rules rather than DNS.

Identity. Keycloak (2 replicas, Infinispan clustered via DNS discovery) backed by its own database. The admin container is a small zero-dependency Node app that talks to the Keycloak Admin API as a service account — it turns signups on/off and connects Google as an identity provider, including generating the exact redirect URI to paste into Google Cloud. I smoke-tested it against a stub Keycloak; create, update, delete, and the validation paths all behave.

Two things I'd flag before you go live: the admin console is behind HTTP basic auth as a stopgap (put it behind Keycloak with oauth2-proxy once Google sign-in works), and email confirmation and password reset both silently need SMTP configured on the realm first.

## Platform

Containerized top to bottom. cp .env.example .env && make dev gets you the whole platform on a laptop — no DigitalOcean account, no domain, no cost.

Local stack. Postgres with a database and role per app (same shape Terraform provisions), Keycloak, and all four app images. Web on :3001, API on :3000, identity admin on :8081, Keycloak on :8080.

The piece I'd call out: scripts/keycloak-bootstrap.sh is now a single file that both compose and the in-cluster Job run — Terraform mounts it via ConfigMap rather than embedding a copy. Realm setup can't drift between dev and prod because there's only one definition. It also now creates the public PKCE web client, so signups and Google sign-in work end to end locally.

Toolchain image. ops/Dockerfile pins terraform, kubectl, helm, and doctl. bash scripts/ops "terraform -chdir=terraform/01-infra plan" runs anything through it; repo mounts at /work, plugin cache persists in a named volume. Nothing needs installing on the host.

Starters. The API verifies tokens against the realm JWKS with only node:crypto — I wrote tests for it and they pass, including alg: none downgrade, tampered signatures, wrong issuer, and audience mismatch. The worker takes a Postgres advisory lock per cycle so replicas are standbys rather than duplicate work. The web app does Authorization Code + PKCE with three entry points: create account, sign in, or straight to Google via kc_idp_hint.

CI. The useful job isn't the linting — it's stack, which brings the full compose stack up on every PR and asserts the realm resolves, the console reaches Keycloak, the API rejects unauthenticated calls, and the frontend serves its runtime config.

One caveat worth knowing: file transfers don't always preserve exec bits, so chmod +x scripts/*.sh scripts/ops dev/*.sh after checkout. The Makefile invokes scripts through bash explicitly to sidestep it.





