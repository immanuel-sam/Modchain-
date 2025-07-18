# Modchain MVP

## Features
- Retro/vintage UI
- Civic Auth login (Gmail supported)
- Onboarding: Profession selection and quiz
- Main moderation dashboard: moderate content (upvote/downvote)
- Content submission with bounty (mock wallet)
- Bounty distribution logic handled by contracts (integration ready)

## Setup
1. Install dependencies:
   ```bash
   cd dapp
   npm install
   ```
2. Set up Civic Auth:
   - Get your client ID from https://auth.civic.com
   - Create `.env.local` in `dapp/`:
     ```env
     NEXT_PUBLIC_CIVIC_CLIENT_ID=your-client-id-here
     ```
3. Run the app:
```bash
npm run dev
   ```

## Workflow
1. **Landing Page:**
   - Shows a quote and prompts login with Civic Auth.
2. **Login:**
   - Uses Civic Auth (Gmail supported).
3. **Onboarding:**
   - Select your profession in a popup.
   - Take a 3-question quiz (health demo).
4. **Dashboard:**
   - Main moderation page: fullscreen retro card, horizontal rows of content to moderate.
   - Click to view, upvote/downvote content.
5. **Content Submission:**
   - Submit new content with a bounty (mock wallet for demo).
   - Content is submitted for moderation.
6. **Bounty Distribution:**
   - When vote threshold is reached, bounty is split among correct moderators (handled by contracts).

## Notes
- Replace the Civic Auth client ID in `.env.local`.
- Backend/contract integration is ready for connection.
- UI is fully functional for demo/MVP purposes.
