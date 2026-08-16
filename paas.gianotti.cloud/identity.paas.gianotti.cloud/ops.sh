#!/usr/bin/env bash
#
# Runs a command inside the pinned toolchain image.
#
#   ./scripts/ops "terraform -chdir=terraform/01-infra plan"
#   ./scripts/ops "doctl kubernetes cluster list"
#   ./scripts/ops                     # interactive shell
#
# The repository is mounted at /work, the Docker socket is passed through so
# image builds work, and Terraform's plugin cache persists in a named volume.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMAGE="${OPS_IMAGE:-platform-ops:local}"

if ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
  echo "Building $IMAGE (first run only)"
  docker build -t "$IMAGE" "$ROOT/ops"
fi

args=(
  --rm
  -v "$ROOT:/work"
  -v platform-ops-cache:/cache
  -v /var/run/docker.sock:/var/run/docker.sock
  -w /work
  -e DIGITALOCEAN_TOKEN
  -e DIGITALOCEAN_ACCESS_TOKEN
  -e TF_VAR_do_token
  -e IMAGE_TAG
)

# Only allocate a TTY when there is one, so CI logs stay clean.
[ -t 0 ] && args+=(-it)

if [ $# -eq 0 ]; then
  exec docker run "${args[@]}" "$IMAGE" "bash"
fi

exec docker run "${args[@]}" "$IMAGE" "$*"
