#!/bin/sh
set -e

echo " Starting Ory Keto..."

echo " Running database migrations..."
keto migrate up -c /etc/keto/keto.yml --yes

echo " Starting Keto server..."
exec keto serve -c /etc/keto/keto.yml