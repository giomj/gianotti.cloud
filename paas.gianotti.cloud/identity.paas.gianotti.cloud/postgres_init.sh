#!/bin/bash
# Creates one database and one role per application, matching what Terraform
# provisions on the DigitalOcean managed cluster. Development passwords only.
set -euo pipefail

APP_DB_PASSWORD="${APP_DB_PASSWORD:-devpassword}"

for app in api jobs keycloak; do
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname defaultdb <<-SQL
    CREATE ROLE ${app}_app LOGIN PASSWORD '${APP_DB_PASSWORD}';
    CREATE DATABASE ${app} OWNER ${app}_app;
SQL
  echo "created database ${app} owned by ${app}_app"
done