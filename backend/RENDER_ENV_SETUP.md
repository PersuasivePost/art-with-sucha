# Render Environment Variables Setup

⚠️ **CRITICAL**: The following environment variables MUST be set in your Render dashboard for the backend service.

## Required Environment Variables

Go to: https://dashboard.render.com → Select `art-with-sucha` backend → Environment tab

### 1. Database
```
DATABASE_URL=<your-neon-postgres-connection-string>
```

### 2. Authentication
```
ARTIST_EMAIL=artwithsucha@gmail.com
ARTIST_PASSWORD=<your-password>
JWT_SECRET=<your-jwt-secret>
```

### 3. Storage (GitHub)
```
GITHUB_TOKEN=<your-github-token>
GITHUB_REPO_OWNER=PersuasivePost
GITHUB_REPO_NAME=art-with-sucha-images
GITHUB_REPO_BRANCH=main
USE_GITHUB_STORAGE=true
```

### 4. CORS Configuration (MOST IMPORTANT!)
```
ALLOWED_ORIGINS=https://art-with-sucha.vercel.app
```

**Note**: NO spaces around the equals sign! Multiple origins can be comma-separated:
```
ALLOWED_ORIGINS=https://art-with-sucha.vercel.app,https://www.art-with-sucha.vercel.app
```

## After Setting Environment Variables

1. Click "Save Changes"
2. Render will automatically trigger a redeploy
3. Wait 2-3 minutes for deployment to complete
4. Verify: Check Render logs - should NOT see "CORS policy: origin not allowed" errors

## Troubleshooting

### CORS Errors Persist
- Double-check `ALLOWED_ORIGINS` has no spaces around `=`
- Ensure the Vercel URL matches exactly (with `https://`, no trailing slash)
- Check Render logs for the actual origin being rejected

### Backend Crashes on Startup
- Verify `DATABASE_URL` is correctly set
- Check `GITHUB_TOKEN` is valid and has repo access
- Ensure all required env vars are present

## Important Notes

- The `.env` file in the repo is for LOCAL development only
- Render IGNORES the `.env` file completely
- All production secrets must be set in Render's Environment dashboard
- Changes to environment variables trigger automatic redeployment
