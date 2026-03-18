# DEPLOYMENT Skill

You are deploying a single HTML file to Vercel and verifying it is live.

## Deployment steps
1. Create a new Vercel deployment by uploading the HTML file via the Vercel REST API.
2. Wait for the deployment status to become `READY`.
3. Assign a subdomain alias: `<slug>.<CUSTOM_DOMAIN>`.
4. Confirm the URL returns HTTP 200 with the correct content-type.

## URL format
The live URL must follow this pattern: `https://<slug>.<CUSTOM_DOMAIN>`

## Failure handling
- If the deployment does not reach `READY` within 120 seconds, mark the deployment as failed.
- If the alias assignment fails, still return the raw Vercel deployment URL as fallback.
- Log all Vercel API responses for debugging.

## Output
Return the confirmed live URL as a string.
