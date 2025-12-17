# How to Find Your Azure Container Apps URL

## Method 1: Azure Portal - Ingress Section (Most Reliable)

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to your Container App (e.g., `rag-eval-app`)
3. In the left menu, click **Ingress** (under Settings)
4. Look for **Application URL** or **FQDN**
   - It will be something like: `https://rag-eval-app.xyz123.eastus.azurecontainerapps.io`

## Method 2: Azure Portal - Properties Section

1. Go to your Container App
2. In the left menu, click **Properties**
3. Look for **Application Url** or **FQDN** field
   - Copy the full URL (starts with `https://`)

## Method 3: Azure CLI (Easiest)

Run this command in your terminal:

```bash
# Replace with your actual resource group and app name
az containerapp show \
  -n rag-eval-app \
  -g rag-rg \
  --query properties.configuration.ingress.fqdn \
  -o tsv
```

This will output just the URL, like:

```
rag-eval-app.xyz123.eastus.azurecontainerapps.io
```

Then add `https://` in front of it.

## Method 4: List All Container Apps

If you're not sure of the exact name:

```bash
# List all container apps in your resource group
az containerapp list -g rag-rg --query "[].{Name:name, URL:properties.configuration.ingress.fqdn}" -o table
```

## Method 5: Check Deployment Output

If you deployed using the script, the URL was printed at the end. Check your terminal history or re-run:

```bash
az containerapp show -n rag-eval-app -g rag-rg --query properties.configuration.ingress.fqdn -o tsv
```

## What the URL Should Look Like

- ✅ Correct: `https://rag-eval-app.xyz123.eastus.azurecontainerapps.io`
- ❌ Wrong: `http://128.251.215.176:8000` (IP address, not HTTPS)
- ❌ Wrong: `rag-eval-app.xyz123.eastus.azurecontainerapps.io` (missing `https://`)

## Quick Test

Once you have the URL, test it:

```bash
curl https://your-azure-url/api/v1/health
```

Should return: `{"ok":true,"db":true,"version":"0.1.0"}`
