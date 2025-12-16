
# LabVio Deployment Guide

## Recommended: Deploy on Replit

**Replit offers the best deployment experience for this application:**

1. Click the **Deploy** button in your workspace
2. Select **Autoscale Deployment** for scalable web hosting
3. Configure your secrets in the Secrets tool:
   - `GOOGLE_APPLICATION_CREDENTIALS_JSON` (Firebase service account)
   - Any other sensitive environment variables
4. Click Deploy!

### Why Replit?

- ✅ Already configured and optimized
- ✅ Autoscale handles traffic spikes automatically
- ✅ Free static deployments for subscribers
- ✅ Built-in environment variable management
- ✅ Custom domain support
- ✅ 99.95% uptime guarantee (Autoscale)
- ✅ No additional setup needed

## Alternative: Render.com (Reference Only)

If you must use Render, follow these steps:

### Prerequisites

1. Push your code to a GitHub repository
2. Have your Firebase credentials ready
3. Ensure ML API is accessible (HuggingFace or self-hosted)

### Deployment Steps

1. **Create a new Web Service on Render:**
   - Connect your GitHub repository
   - Select the repository with your code

2. **Configure Build Settings:**
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run start`
   - **Environment:** Node

3. **Add Environment Variables:**
   - `NODE_ENV=production`
   - `PORT=5000` (Render sets this automatically)
   - `ML_API_URL=https://mijsu-labvio-ml-api.hf.space`
   - `VITE_FIREBASE_API_KEY=<your-firebase-api-key>`
   - `VITE_FIREBASE_PROJECT_ID=medchain-5af09`
   - `VITE_FIREBASE_APP_ID=<your-firebase-app-id>`
   - `GOOGLE_APPLICATION_CREDENTIALS_JSON=<your-service-account-json>`

4. **Deploy:**
   - Click "Create Web Service"
   - Wait for the build to complete
   - Access your app at the provided Render URL

### Important Notes for Render

- The application listens on `0.0.0.0` for compatibility
- Port 5000 is configured by default
- ML predictions use the HuggingFace API (no ML server needed on Render)
- Firebase Admin SDK is configured via environment variables
- No persistent storage - use external databases/storage

## Configuration Files

- `render.yaml`: Render deployment configuration (reference)
- `.replit`: Replit deployment configuration (active)
- `package.json`: Build scripts and dependencies

## Environment Variables Required

| Variable | Description | Required |
|----------|-------------|----------|
| `ML_API_URL` | HuggingFace ML API endpoint | Yes |
| `VITE_FIREBASE_API_KEY` | Firebase API key | Yes |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID | Yes |
| `VITE_FIREBASE_APP_ID` | Firebase app ID | Yes |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | Firebase service account JSON | Yes |

## Troubleshooting

### Port Issues
- Ensure server binds to `0.0.0.0`, not `localhost`
- Verify PORT environment variable is set to 5000

### ML API Issues
- Verify HuggingFace API URL is accessible
- Check API endpoint: `https://mijsu-labvio-ml-api.hf.space/predict`

### Firebase Issues
- Verify all Firebase environment variables are set
- Check service account JSON is valid

---

**Remember: Replit deployment is the recommended and easiest option!**
