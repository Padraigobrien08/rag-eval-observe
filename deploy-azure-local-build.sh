#!/bin/bash
# Azure Container Apps Deployment Script (Local Build)

set -e  # Exit on error

echo "🚀 Starting Azure deployment (local build)..."

# Configuration
RG="rag-rg"
LOC="westeurope"
ACR="ragacr11185"  # Use existing ACR from previous attempt
ENV="rag-env"
APP="rag-eval-app"
PORT=8000
IMAGE_NAME="rag-eval:1.0"

echo "📦 Step 1: Logging into ACR..."
az acr login --name $ACR
echo "✅ Logged into ACR"

echo "📦 Step 2: Building image locally..."
docker build -f backend/Dockerfile -t $IMAGE_NAME .
echo "✅ Image built locally"

echo "📦 Step 3: Tagging image for ACR..."
FULL_IMAGE="$ACR.azurecr.io/$IMAGE_NAME"
docker tag $IMAGE_NAME $FULL_IMAGE
echo "✅ Image tagged: $FULL_IMAGE"

echo "📦 Step 4: Pushing image to ACR..."
docker push $FULL_IMAGE
echo "✅ Image pushed to ACR"

echo "📦 Step 5: Adding Container Apps extension..."
az extension add --name containerapp --upgrade --output none 2>/dev/null || true
echo "✅ Extension ready"

echo "📦 Step 6: Registering Microsoft.App provider (if needed)..."
az provider register --namespace Microsoft.App --wait --output none 2>/dev/null || true
echo "✅ Provider registered"

echo "📦 Step 7: Creating Container Apps environment..."
az containerapp env create -n $ENV -g $RG -l $LOC --output none 2>/dev/null || echo "   Environment may already exist"
echo "✅ Environment ready: $ENV"

echo "📦 Step 8: Deploying container app..."
FQDN=$(az containerapp create \
  -n $APP -g $RG \
  --environment $ENV \
  --image "$FULL_IMAGE" \
  --target-port $PORT \
  --ingress external \
  --registry-server "$ACR.azurecr.io" \
  --min-replicas 0 \
  --max-replicas 1 \
  --cpu 0.5 \
  --memory 1.0Gi \
  --query properties.configuration.ingress.fqdn -o tsv 2>/dev/null || \
  az containerapp update \
    -n $APP -g $RG \
    --image "$FULL_IMAGE" \
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

