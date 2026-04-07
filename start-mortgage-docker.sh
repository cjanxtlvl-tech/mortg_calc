#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="docker-compose.mortgage-calculator.yml"
REBUILD="false"
CLEAN="false"

for arg in "$@"; do
  case "$arg" in
    --rebuild)
      REBUILD="true"
      ;;
    --clean)
      CLEAN="true"
      ;;
    *)
      echo "Unknown option: $arg"
      echo "Usage: ./start-mortgage-docker.sh [--rebuild] [--clean]"
      exit 1
      ;;
  esac
done

if ! command -v docker >/dev/null 2>&1; then
  echo "Error: Docker CLI not found. Install Docker Desktop and ensure docker is in PATH."
  exit 1
fi

# Remove stale containers/orphans before start to avoid name/network conflicts.
if [ "$CLEAN" = "true" ]; then
  docker compose -f "$COMPOSE_FILE" down --remove-orphans --volumes
else
  docker compose -f "$COMPOSE_FILE" down --remove-orphans
fi

if [ "$REBUILD" = "true" ]; then
  docker compose -f "$COMPOSE_FILE" up --build -d
else
  docker compose -f "$COMPOSE_FILE" up -d
fi

echo "URL: http://localhost:8080"
