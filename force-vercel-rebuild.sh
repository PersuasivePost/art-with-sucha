#!/bin/bash

# Force Vercel to rebuild by making a trivial change
# This ensures Vercel serves fresh JS bundles

echo "Creating cache-busting commit..."

cd "$(dirname "$0")/frontend"

# Add a comment with timestamp to vite.config.ts
TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M:%S UTC")
sed -i "1i// Force rebuild at $TIMESTAMP" vite.config.ts

git add vite.config.ts
git commit -m "force: rebuild frontend (cache bust)"
git push origin master

echo "✅ Pushed cache-busting commit"
echo "⏳ Wait 2-3 minutes for Vercel to rebuild"
echo "🔍 Check deployment at: https://vercel.com/dashboard"
