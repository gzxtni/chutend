# EMM System Deployment Guide

This guide outlines the best platforms for hosting the EMM (Enterprise Mobile Management) backend and its PostgreSQL database.

## 1. Hosting the PostgreSQL Database

Since the backend relies on an asynchronous PostgreSQL database (`asyncpg`), you need a robust relational database host.

### Recommended Providers:

*   **Supabase (Recommended):**
    *   **Why:** Excellent free tier, instantly provisions a Postgres database, built-in connection pooling (important for serverless), and very developer-friendly.
    *   **Cost:** Free for small projects; scales predictably.
*   **Neon:**
    *   **Why:** Serverless Postgres. It separates storage and compute, allowing it to scale to zero when not in use, which is great for cost savings on low-traffic dashboards.
    *   **Cost:** Generous free tier.
*   **Render:**
    *   **Why:** Good if you want to host both the backend and DB on the same platform.
    *   **Cost:** Free tier available (but databases spin down after 90 days on free).
*   **AWS RDS / Google Cloud SQL / Azure Database for PostgreSQL:**
    *   **Why:** Enterprise-grade, highly available, and secure. Best for production deployments with strict compliance requirements.
    *   **Cost:** No free tier (usually), can get expensive quickly.

## 2. Hosting the FastAPI Backend

The backend is built with FastAPI (Python) and requires an environment that can run ASGI apps (like `uvicorn`).

### Recommended Providers:

*   **Render (Recommended):**
    *   **Why:** Easiest deployment. You just connect your GitHub repository, tell it it's a Python app, set the start command to `uvicorn app.main:app --host 0.0.0.0 --port $PORT`, and it handles the rest.
    *   **Cost:** Free tier (spins down after inactivity), cheap paid tiers.
*   **Railway:**
    *   **Why:** Similar to Render, very straightforward deployment from a GitHub repo. Good performance.
    *   **Cost:** Usage-based pricing (no true free tier anymore, but very cheap for small apps).
*   **Fly.io:**
    *   **Why:** Deploys Docker containers close to your users globally. Great if you need low latency for devices spread across the world.
    *   **Cost:** Small free tier.
*   **AWS App Runner or ECS (Advanced):**
    *   **Why:** If you are already in the AWS ecosystem and need enterprise scaling.
    *   **Cost:** Can be complex to set up and pricier.

## 3. Hosting the React Dashboard (Frontend)

The React dashboard (built with Vite) is a static site, meaning it doesn't need a traditional server to run, just a CDN.

### Recommended Providers:

*   **Vercel (Recommended):**
    *   **Why:** The absolute best developer experience for React/Vite apps. Zero-config deployments, automatic SSL, and a global edge network.
    *   **Cost:** Generous free tier.
*   **Netlify:**
    *   **Why:** Similar to Vercel, very easy to set up and connect to a repo.
    *   **Cost:** Generous free tier.
*   **Cloudflare Pages:**
    *   **Why:** Extremely fast, uses Cloudflare's massive global network.
    *   **Cost:** Excellent free tier.

## Summary: The Ideal Stack

For a balance of ease-of-use, cost, and performance, here is the recommended stack:

1.  **Database:** [Supabase](https://supabase.com/) (Postgres)
2.  **Backend (FastAPI):** [Render](https://render.com/) or [Railway](https://railway.app/)
3.  **Frontend (React Dashboard):** [Vercel](https://vercel.com/)

### Important Deployment Notes

*   **Environment Variables:** When deploying the backend, ensure you set `MASTER_API_KEY`, `JWT_SECRET`, and `DATABASE_URL` securely in the hosting provider's environment variables settings. **Never** commit these to your Git repository.
*   **CORS:** Ensure your backend's CORS settings (`app/main.py`) allow requests from the domain where your React dashboard is hosted (e.g., `https://your-dashboard.vercel.app`).
*   **Android App Configuration:** Once your backend is deployed, you must update the `ServerConfig.kt` in the Android agent to point to your live backend URL (e.g., `https://your-backend.onrender.com`).
