# Project Rules & Guidelines

## Git Workflow Rule (MANDATORY)
Whenever files are modified, created, or fixed in this workspace (e.g. bug fixes, feature additions, deployments):
1. Always test/build to ensure zero errors (`npm run build`).
2. Deploy to Cloudflare Workers if applicable (`npx wrangler deploy`).
3. **MUST ALWAYS commit and push to Git immediately**:
   - `git add .`
   - `git commit -m "<concise descriptive summary of changes>"`
   - `git push`
