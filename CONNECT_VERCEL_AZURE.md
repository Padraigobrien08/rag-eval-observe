# Connecting Vercel Frontend to Azure Backend

This guide will help you connect your Vercel-deployed frontend to your Azure Container Apps backend.

## Step 1: Get Your URLs

### Vercel URL
1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on your project
3. Your deployment URL will be something like: `https://rag-eval-observability.vercel.app`
   - Or a custom domain if you've set one up

### Azure Container Apps URL
1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to your Container App (e.g., `rag-eval-app`)
3. In the **Overview** section, find the **Application Url**
   - It will be something like: `https://rag-eval-app.xyz123.eastus.azurecontainerapps.io`

## Step 2: Configure Vercel Environment Variables

1. In your Vercel project dashboard, go to **Settings** → **Environment Variables**
2. Add the following variable:

   **Variable Name:** `NEXT_PUBLIC_API_BASE_URL`  
   **Value:** Your Azure Container Apps URL (e.g., `https://rag-eval-app.xyz123.eastus.azurecontainerapps.io`)  
   **Environment:** Production, Preview, Development (select all)

3. Click **Save**

4. **Important:** After adding the environment variable, you need to trigger a new deployment:
   - Go to **Deployments** tab
   - Click the **⋯** menu on the latest deployment
   - Click **Redeploy**
   - Or push a new commit to trigger a rebuild

## Step 3: Update Azure Container Apps CORS Settings

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to your Container App (e.g., `rag-eval-app`)
3. Go to **Configuration** → **Environment variables**
4. Find the `CORS_ALLOW_ORIGINS` variable (or add it if it doesn't exist)
5. Update the value to include your Vercel URL:
   
   ```
   https://your-vercel-app.vercel.app,https://your-vercel-app-git-main-your-username.vercel.app
   ```
   
   **Note:** Include both the main domain and any preview deployment URLs if you want preview deployments to work.

6. Click **Save**
7. The container app will automatically restart with the new configuration

## Step 4: Verify the Connection

1. Open your Vercel deployment URL in a browser
2. Open the browser's Developer Console (F12)
3. Try sending a query in the chat
4. Check the Network tab to see if requests are going to your Azure backend
5. If you see CORS errors, double-check the `CORS_ALLOW_ORIGINS` setting in Azure

## Troubleshooting

### CORS Errors
- Make sure `CORS_ALLOW_ORIGINS` in Azure includes your exact Vercel URL (with `https://`)
- Include both the main domain and preview deployment URLs
- Wait a few minutes after updating Azure settings for the container to restart

### 404 Errors
- Verify the Azure Container Apps URL is correct
- Check that the backend is running and healthy in Azure Portal
- Test the health endpoint: `https://your-azure-url/api/v1/health`

### Connection Timeout
- Check Azure Container Apps logs for errors
- Verify the backend is running (check the **Overview** page in Azure Portal)
- Ensure the port is correctly configured (should be 8000)

## Quick Reference

### Vercel Environment Variables
```env
NEXT_PUBLIC_API_BASE_URL=https://your-azure-container-apps-url
```

### Azure Container Apps Environment Variables
```env
CORS_ALLOW_ORIGINS=https://your-vercel-app.vercel.app,https://your-vercel-app-git-main-your-username.vercel.app
DATABASE_URL=your-neon-db-connection-string
OPENAI_API_KEY=your-openai-api-key
ENVIRONMENT=production
```

## Next Steps

Once connected:
1. Test the chat functionality
2. Try ingesting a document
3. Check the metrics page
4. Verify citations are working

If everything works, your deployment is complete! 🎉

