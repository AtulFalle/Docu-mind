#!/bin/sh
set -e

echo "⏳ Waiting for Vault..."

until curl -s http://vault:8200/v1/sys/health >/dev/null; do
  sleep 2
done

echo "✅ Vault reachable"

INIT_STATUS=$(vault status -address=http://vault:8200 -format=json | grep initialized | grep false || true)

if [ -n "$INIT_STATUS" ]; then
  echo "🚀 Initializing Vault..."

  vault operator init -address=http://vault:8200 -format=json > /bootstrap/vault-keys.json

  UNSEAL1=$(cat /bootstrap/vault-keys.json | grep unseal_keys_b64 | head -1 | awk -F'"' '{print $4}')
  ROOT_TOKEN=$(cat /bootstrap/vault-keys.json | grep root_token | awk -F'"' '{print $4}')

  vault operator unseal -address=http://vault:8200 $UNSEAL1
  vault login -address=http://vault:8200 $ROOT_TOKEN

  vault secrets enable -address=http://vault:8200 -path=secret kv-v2 || true

  vault kv put -address=http://vault:8200 secret/documind/mongo \
    username=documind password=StrongMongoPass

  vault auth enable -address=http://vault:8200 approle || true

  echo "🎉 Vault initialized."
else
  echo "Vault already initialized."
fi