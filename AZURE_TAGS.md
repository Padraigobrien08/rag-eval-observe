# Azure Container Apps Tags

Tags help organize resources and track costs. Here are suggested tags for your RAG Eval deployment:

## Recommended Tags

```json
{
  "Project": "rag-eval-observability",
  "Environment": "production",
  "Component": "backend-api",
  "ManagedBy": "manual",
  "CostCenter": "portfolio"
}
```

## Tag Values

| Tag Name | Value | Description |
|----------|-------|-------------|
| `Project` | `rag-eval-observability` | Project identifier |
| `Environment` | `production` | Deployment environment |
| `Component` | `backend-api` | Component type (backend-api, frontend, database) |
| `ManagedBy` | `manual` | How it's managed (manual, terraform, etc.) |
| `CostCenter` | `portfolio` | For cost tracking/billing |

## How to Add Tags

### Option 1: During Creation (via Azure Portal)

1. Go to Azure Portal → Create Container App
2. In the **Tags** section, add each tag:
   - Click **+ Add**
   - Enter tag name and value
   - Repeat for each tag

### Option 2: Via Azure CLI

```bash
az containerapp update \
  -n rag-eval-app \
  -g rag-rg \
  --tags \
    Project=rag-eval-observability \
    Environment=production \
    Component=backend-api \
    ManagedBy=manual \
    CostCenter=portfolio
```

### Option 3: During Initial Creation

```bash
az containerapp create \
  -n rag-eval-app \
  -g rag-rg \
  --environment rag-env \
  --image "$ACR.azurecr.io/rag-eval:1.0" \
  --target-port 8000 \
  --ingress external \
  --registry-server "$ACR.azurecr.io" \
  --tags \
    Project=rag-eval-observability \
    Environment=production \
    Component=backend-api \
    ManagedBy=manual \
    CostCenter=portfolio
```

## Additional Tags (Optional)

If you want more granular tracking:

```json
{
  "Project": "rag-eval-observability",
  "Environment": "production",
  "Component": "backend-api",
  "ManagedBy": "manual",
  "CostCenter": "portfolio",
  "Owner": "your-email@example.com",
  "Application": "rag-eval",
  "Version": "1.0"
}
```

## Why Tags Matter

1. **Cost Tracking**: Filter costs by project, environment, or component
2. **Resource Organization**: Group related resources together
3. **Policy Enforcement**: Apply policies based on tags
4. **Automation**: Use tags in automation scripts
5. **Compliance**: Track resources for compliance requirements

## Viewing Tagged Resources

```bash
# List all resources with a specific tag
az resource list --tag Project=rag-eval-observability

# View costs by tag
az consumption usage list --query "[?tags.Project=='rag-eval-observability']"
```

