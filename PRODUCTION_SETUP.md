# Production Setup Guide - Fixing "Endpoint Not Found" Error

## Problem
When confirming or rejecting subscription suggestions in production, you get a **404 "endpoint not found"** error.

## Root Cause
Your frontend is trying to call `/api/feedback/record` but the `VITE_BACKEND_API_URL` environment variable is not set in production, causing it to default to `http://localhost:3002` which doesn't exist in production.

## Solution

### Step 1: Get Your Railway Backend URL

1. Go to your Railway dashboard: https://railway.app
2. Find your backend project (2subscribe-backend)
3. Copy the public URL (something like `https://2subscribe-backend-production.up.railway.app`)

### Step 2: Set Environment Variable in Your Frontend Deployment

#### If deployed on **Netlify**:
1. Go to your Netlify dashboard
2. Select your site
3. Go to **Site settings** → **Environment variables**
4. Add a new variable:
   - **Key**: `VITE_BACKEND_API_URL`
   - **Value**: `https://your-backend-url.up.railway.app` (your Railway URL)
5. Click **Save**
6. **Trigger a new deployment** (important! Environment variables are only applied during build)

#### If deployed on **Vercel**:
1. Go to your Vercel dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add a new variable:
   - **Name**: `VITE_BACKEND_API_URL`
   - **Value**: `https://your-backend-url.up.railway.app`
5. Select **Production** environment
6. Click **Save**
7. **Redeploy** your application

#### If using **Railway** for frontend too:
1. Go to your frontend service in Railway
2. Go to **Variables** tab
3. Add:
   - **Variable**: `VITE_BACKEND_API_URL`
   - **Value**: `https://your-backend-url.up.railway.app`
4. Railway will automatically redeploy

### Step 3: Verify Backend Endpoints

Make sure your backend is running and accessible. Test by visiting:
```
https://your-backend-url.up.railway.app/health
```

If you get a response, your backend is working.

### Step 4: Test the Fix

After redeploying with the environment variable:

1. Go to your production frontend
2. Navigate to the transactions/dashboard page
3. Try to confirm or reject a subscription suggestion
4. Check the browser console (F12) → Network tab
5. You should see the request going to your Railway backend URL instead of localhost

## Important Notes

### Environment Variables in Vite
- Environment variables **must** start with `VITE_` to be exposed to the frontend
- They are **embedded at build time**, not runtime
- You **must redeploy** after changing environment variables

### CORS Configuration
Make sure your backend allows requests from your frontend domain. Check `backend/src/server.ts`:

```typescript
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://your-frontend-domain.netlify.app', // Add your production domain
  ],
  credentials: true
}))
```

### Backend Endpoints Used by Subscription Confirmation

The component calls these endpoints:
- `POST /api/feedback/record` - Records user feedback (confirm/reject)
- `GET /api/feedback/user/:userId` - Gets user's feedback history
- `GET /api/feedback/stats` - Gets feedback statistics

All these endpoints are properly implemented in your backend at `backend/src/routes/feedback.ts`.

## Quick Checklist

- [ ] Get Railway backend URL
- [ ] Add `VITE_BACKEND_API_URL` environment variable to frontend deployment
- [ ] Redeploy frontend
- [ ] Test subscription confirmation in production
- [ ] Check browser console for correct API calls
- [ ] Verify CORS settings if needed

## Troubleshooting

### Still getting 404?
1. Check browser console - what URL is it trying to call?
2. Verify the environment variable is set correctly (no trailing slash)
3. Make sure you redeployed after adding the variable
4. Check Railway logs to see if requests are reaching your backend

### Getting CORS errors?
Add your production frontend URL to the CORS whitelist in `backend/src/server.ts`

### Backend not responding?
1. Check Railway logs for errors
2. Verify your backend is running (check Railway dashboard)
3. Make sure all required environment variables are set in Railway backend

## Local Development

For local development, create a `.env` file (copy from `.env.example`):

```bash
VITE_BACKEND_API_URL=http://localhost:3002
VITE_DATA_BACKEND=FIREBASE
# ... other Firebase config
```

This file is gitignored and won't be committed to your repository.
