#!/bin/bash
# Azure Container Apps Deployment Script

set -e  # Exit on error

echo "🚀 Starting Azure deployment..."

# Configuration
RG="rag-rg"
LOC="westeurope"  # Change if needed
ACR="ragacr$RANDOM"
ENV="rag-env"
APP="rag-eval-app"
PORT=8000

echo "📦 Step 1: Creating resource group..."
az group create -n $RG -l $LOC --output none
echo "✅ Resource group created: $RG"

echo "📦 Step 2: Creating Azure Container Registry..."
az acr create -n $ACR -g $RG --sku Basic --output none
echo "✅ Container registry created: $ACR.azurecr.io"

echo "📦 Step 3: Building and pushing image to ACR..."
echo "   This may take a few minutes..."
az acr build -r $ACR -t rag-eval:1.0 -f backend/Dockerfile . --output none
echo "✅ Image built and pushed"

IMAGE="$ACR.azurecr.io/rag-eval:1.0"
echo "   Image: $IMAGE"

echo "📦 Step 4: Adding Container Apps extension..."
az extension add --name containerapp --upgrade --output none 2>/dev/null || true
echo "✅ Extension ready"

echo "📦 Step 5: Creating Container Apps environment..."
az containerapp env create -n $ENV -g $RG -l $LOC --output none
echo "✅ Environment created: $ENV"

echo "📦 Step 6: Deploying container app..."
echo "   ⚠️  You'll need to set environment variables after deployment"
FQDN=$(az containerapp create \
  -n $APP -g $RG \
  --environment $ENV \
  --image "$IMAGE" \
  --target-port $PORT \
  --ingress external \
  --registry-server "$ACR.azurecr.io" \
  --min-replicas 0 \
  --max-replicas 1 \
  --cpu 0.5 \
  --memory 1.0Gi \
  --query properties.configuration.ingress.fqdn -o tsv)

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Your app is available at: https://$FQDN"
echo ""
echo "📝 Next steps:"
echo "   1. Set environment variables:"
echo "      az containerapp update -n $APP -g $RG --set-env-vars \\"
echo "        DATABASE_URL=\"postgresql://...\" \\"
echo "        OPENAI_API_KEY=\"your-key\" \\"
echo "        CORS_ALLOW_ORIGINS=\"https://your-frontend.vercel.app\" \\"
echo "        ENVIRONMENT=\"production\""
echo ""
echo "   2. Test health endpoint:"
echo "      curl https://$FQDN/api/v1/health"
echo ""
echo "   3. View logs:"
echo "      az containerapp logs show -n $APP -g $RG --follow"
echo ""

