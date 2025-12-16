#!/bin/bash
# Setup Azure Database for PostgreSQL with pgvector

set -e

RG="rag-rg"
LOC="westeurope"
DB_SERVER="rag-postgres-$(openssl rand -hex 3)"
DB_NAME="ragdb"
DB_USER="ragadmin"
DB_PASSWORD=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-16)

echo "📦 Creating Azure Database for PostgreSQL..."
echo "   Server name: $DB_SERVER"
echo "   Database: $DB_NAME"
echo "   User: $DB_USER"

# Create PostgreSQL Flexible Server
az postgres flexible-server create \
  --resource-group $RG \
  --name $DB_SERVER \
  --location $LOC \
  --admin-user $DB_USER \
  --admin-password "$DB_PASSWORD" \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --version 16 \
  --public-access 0.0.0.0 \
  --output none

echo "✅ PostgreSQL server created"

# Get connection string
DB_HOST="$DB_SERVER.postgres.database.azure.com"
DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:5432/$DB_NAME?sslmode=require"

echo ""
echo "📝 Database connection details:"
echo "   DATABASE_URL=$DATABASE_URL"
echo ""
echo "⚠️  Save this password! You won't see it again."
echo ""

# Enable pgvector extension
echo "📦 Enabling pgvector extension..."
az postgres flexible-server db create \
  --resource-group $RG \
  --server-name $DB_SERVER \
  --database-name $DB_NAME \
  --output none

# Connect and enable extension (requires psql)
echo "📦 Setting up schema..."
echo "   You'll need to run the schema migration manually:"
echo "   psql \"$DATABASE_URL\" < docker/init/02-create-schema.sql"
echo ""
echo "   Or use Azure Cloud Shell to run:"
echo "   CREATE EXTENSION IF NOT EXISTS vector;"
echo ""

echo "✅ Database setup complete!"
echo ""
echo "🔗 Connection string for your container app:"
echo "   $DATABASE_URL"
echo ""

