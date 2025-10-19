# Production Deployment Fix - CORS Issue

## Problem Identified
The production deployment is failing with CORS errors. The Render logs show:
```
Error: CORS policy: origin not allowed
```

The deployed code is actually correct (commit 993954b has all the URL fixes), but the **backend is blocking requests from the Vercel frontend** due to missing CORS configuration.

## Root Cause
The `ALLOWED_ORIGINS` environment variable on Render is either:
1. Not set at all, OR
2. Set incorrectly without the Vercel frontend URL

The backend only allows origins listed in `ALLOWED_ORIGINS` plus localhost URLs.

## Solution Steps

### Step 1: Update Render Environment Variables
1. Go to Render Dashboard: https://dashboard.render.com
2. Select your backend service: `art-with-sucha`
3. Go to **Environment** tab
4. Add or update the `ALLOWED_ORIGINS` environment variable with:
   ```
   https://art-with-sucha.vercel.app
   ```
   If you need multiple origins (e.g., with and without www), use comma-separated:
   ```
   https://art-with-sucha.vercel.app,https://www.art-with-sucha.vercel.app
   ```

### Step 2: Redeploy Backend on Render
1. After updating the environment variable, Render should auto-redeploy
2. If not, go to **Manual Deploy** → **Deploy latest commit**
3. Wait for deployment to complete (~2-3 minutes)

### Step 3: Verify Fix
1. Open browser DevTools (F12)
2. Go to your Vercel site: https://art-with-sucha.vercel.app
3. Check Console - you should see:
   ```
   Fetching sections from: https://art-with-sucha.onrender.com/sections
   Response status: 200
   Sections from API: Array(1)
   ```

### Step 4: Check CORS in Render Logs (Optional)
After redeploying, monitor the Render logs. You should NOT see any more "CORS policy: origin not allowed" errors.

## Expected Behavior After Fix
- Frontend on Vercel can successfully fetch from backend on Render
- No CORS errors in console
- Sections load properly on homepage
- All image URLs resolve correctly through the backend proxy

## Technical Details
- Backend CORS middleware: `/backend/src/index.ts` lines 127-137
- Environment parsing: splits `ALLOWED_ORIGINS` by comma and trims whitespace
- Default allowed origins include localhost URLs for development
- Production origins must be explicitly added via env var

## Important Notes
- The `.env` file in the repo is for LOCAL development only
- Render uses environment variables set in the dashboard, NOT the .env file
- Any change to `ALLOWED_ORIGINS` requires a backend redeploy to take effect
- Make sure the Vercel URL matches exactly (with https://, no trailing slash)
