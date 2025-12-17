# Testing Backend Connection

## Test Health Endpoint with curl

Replace `YOUR_AZURE_URL` with your actual Azure Container Apps URL:

```bash
# Test health endpoint
curl https://YOUR_AZURE_URL/api/v1/health

# Expected response:
# {"ok":true,"db":true,"version":"0.1.0"}
```

## Get Your Azure Container Apps URL

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to your Container App (e.g., `rag-eval-app`)
3. In the **Overview** section, find the **Application Url**
   - It will be something like: `https://rag-eval-app.xyz123.eastus.azurecontainerapps.io`

## Common Issues

### Issue 1: Mixed Content Error (HTTPS → HTTP)
**Error:** `Mixed Content: The page at 'https://...' was loaded over HTTPS, but requested an insecure resource 'http://...'`

**Solution:** Your Azure URL must use `https://` not `http://`

### Issue 2: Wrong URL
**Error:** Using IP address instead of Azure Container Apps domain

**Solution:** Use the Azure Container Apps HTTPS URL, not an IP address

### Issue 3: CORS Error
**Error:** `CORS policy: No 'Access-Control-Allow-Origin' header`

**Solution:** Make sure `CORS_ALLOW_ORIGINS` in Azure includes your Vercel URL

## Test Commands

```bash
# 1. Test health endpoint
curl https://your-azure-url/api/v1/health

# 2. Test with verbose output to see headers
curl -v https://your-azure-url/api/v1/health

# 3. Test from your local machine (should work if backend is accessible)
curl https://your-azure-url/api/v1/health

# 4. Test CORS (simulate browser request)
curl -H "Origin: https://your-vercel-url.vercel.app" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://your-azure-url/api/v1/health
```

## Verify Environment Variable in Vercel

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Check that `NEXT_PUBLIC_AZURE_API_BASE_URL` is set to:
   ```
   https://your-azure-container-apps-url
   ```
   (NOT `http://` and NOT an IP address)

3. After updating, **redeploy** your Vercel app

