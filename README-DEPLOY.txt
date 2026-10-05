JAMES AI - PERMANENT PUBLIC LINK DEPLOYMENT

This package is prepared for cloud deployment. It does NOT include the .env file or node_modules.

Recommended deployment:
1. Create a GitHub repository and upload all files in this folder.
2. Create a Render Web Service from that repository.
3. Build Command: npm ci
4. Start Command: npm start
5. Add environment variable OPENAI_API_KEY with your real key.
6. Deploy.

The Render service URL stays the same across normal redeploys/restarts, so the phone can use one public link without the laptop running.
