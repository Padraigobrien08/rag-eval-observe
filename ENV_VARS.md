# Environment Variables Reference

## Frontend (Vercel)

### Required (Server-Side Only - No NEXT_PUBLIC_ prefix)

```env
AZURE_API_BASE_URL=https://your-azure-container-apps-url
```

**Example:**
```env
AZURE_API_BASE_URL=https://rag-eval-aci-dns-4.bme0cjc9bkevdbd4.westeurope.azurecontainer.io
```

**Where to set:** Vercel Dashboard → Project → Settings → Environment Variables

**Note:** The frontend now proxies requests through Vercel API routes (`/api/backend/*`), so the backend URL is server-side only and doesn't need the `NEXT_PUBLIC_` prefix. This avoids mixed content and CORS issues.

---

## Backend (Azure Container Apps)

### Required Variables

```env
# Database (Neon DB connection string)
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require

# OpenAI API Key (MARK AS SECURE)
OPENAI_API_KEY=sk-...

# Environment
ENVIRONMENT=production

# CORS - Include your Vercel URL (comma-separated)
CORS_ALLOW_ORIGINS=https://your-vercel-app.vercel.app,https://your-vercel-app-git-main-username.vercel.app
```

### Optional Variables (with defaults)

```env
# OpenAI Models
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_CHAT_MODEL=gpt-4-turbo-preview
EMBEDDING_DIMENSION=1536

# OpenAI API Settings
OPENAI_MAX_RETRIES=3
OPENAI_TIMEOUT=60

# Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60

# Redis (for distributed rate limiting - optional)
REDIS_URL=redis://redis-host:6379/0
REDIS_ENABLED=false

# Chunking Configuration
CHUNK_SIZE=1000
CHUNK_OVERLAP=200

# Request Limits
MAX_INGEST_PAYLOAD_SIZE=10485760
MAX_QUERY_LENGTH=5000
MAX_CONTEXT_CHARS=50000
MAX_CONTEXT_TOKENS=12000

# Server Configuration
HOST=0.0.0.0
PORT=8000
```

---

## Complete Example for Azure Container Apps

Here's a complete example with all required variables filled in:

```env
# REQUIRED - Database (Neon DB)
DATABASE_URL=postgresql://neondb_owner:password@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require

# REQUIRED - OpenAI (MARK AS SECURE)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# REQUIRED - Environment
ENVIRONMENT=production

# REQUIRED - CORS (replace with your actual Vercel URL)
CORS_ALLOW_ORIGINS=https://rag-eval-observability.vercel.app,https://rag-eval-observability-git-main-yourusername.vercel.app
```

---

## Which Variables to Mark as "Secure" in Azure?

**Mark as Secure (encrypted, hidden in logs):**
- ✅ `DATABASE_URL` - Contains database credentials
- ✅ `OPENAI_API_KEY` - Sensitive API key

**Do NOT mark as Secure (can be visible):**
- `ENVIRONMENT` - Just "production"
- `CORS_ALLOW_ORIGINS` - Public URLs
- All optional variables with defaults

---

## Quick Setup Checklist

### Vercel:
- [ ] Add `NEXT_PUBLIC_API_BASE_URL` pointing to Azure URL
- [ ] Redeploy after adding environment variable

### Azure Container Apps:
- [ ] Add `DATABASE_URL` (from Neon DB) - **Mark as Secure**
- [ ] Add `OPENAI_API_KEY` - **Mark as Secure**
- [ ] Add `ENVIRONMENT=production`
- [ ] Add `CORS_ALLOW_ORIGINS` with your Vercel URL(s)
- [ ] Save and wait for container restart

---

## Notes

1. **CORS_ALLOW_ORIGINS**: Include both your main Vercel domain and preview deployment URLs if you want preview deployments to work.

2. **DATABASE_URL**: Get this from your Neon DB dashboard → Connection Details → Connection String

3. **Environment Variable Names**: Azure Container Apps are case-insensitive, but use uppercase for consistency.

4. **After Adding Variables**: Azure will automatically restart your container. Wait 1-2 minutes before testing.

5. **Testing**: After setup, test the connection by:
   - Opening your Vercel URL
   - Checking browser console for errors
   - Trying to send a query
   - Checking Azure logs if issues occur

