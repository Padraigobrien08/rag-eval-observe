FROM python:3.11-slim

WORKDIR /app

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy dependency files
COPY backend/pyproject.toml ./
# Copy lock file if it exists (optional)
COPY backend/uv.lock* ./

# Copy application code (needed for package build)
COPY backend/ ./backend/

# Install dependencies only (skip local package installation)
# We'll run the app directly, not as an installed package
RUN uv pip install --system \
    fastapi>=0.109.0 \
    "uvicorn[standard]>=0.27.0" \
    pydantic>=2.5.0 \
    pydantic-settings>=2.1.0 \
    asyncpg>=0.29.0 \
    python-dotenv>=1.0.0 \
    structlog>=24.1.0 \
    httpx>=0.26.0

# Set working directory to backend
WORKDIR /app/backend

# Expose port
EXPOSE 8000

# Run the application
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

