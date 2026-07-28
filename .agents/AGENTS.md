# Project Rules & Guidelines

## Git Workflow Rule (SAFETY & QUALITY FIRST)

Do NOT commit or push code automatically on every minor file edit or unverified change.

### Mandatory Workflow:
1. **Develop & Test Locally**: Make changes and verify using `npm run build` and tests.
2. **Commit & Push Criteria**:
   - Only commit and push when a specific task, bug fix, or feature is **fully completed and verified**.
   - Before pushing to Git / deploying, confirm that there are zero TypeScript / build errors and that the solution is validated.
3. **Execution Steps** (when ready to deliver a completed, tested milestone):
   - `npm run build` (Must pass with 0 errors)
   - `git add .`
   - `git commit -m "<concise descriptive summary of verified changes>"`
   - `git push`
