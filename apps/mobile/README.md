# FireBuddy Mobile App

This folder contains the Expo mobile app for FireBuddy.

What this means:
- This is the current implementation with the most UI coverage
- It now lives in the intended monorepo location
- Web remains the primary product direction for public deployment and resume use

Use this folder when:
- Working on the mobile app
- Adapting existing UI, hooks, or Supabase integration incrementally
- Extracting reusable logic into `packages/shared`

Do not assume:
- Figma Make code should be pasted directly here
- Mobile is the first-priority surface for shipping or portfolio visibility; web still comes first there

Project references:
- Root brief: [`../PROJECT_BRIEF.md`](../PROJECT_BRIEF.md)
- Repo instructions: [`../AGENTS.md`](../AGENTS.md)

Current commands from this folder:

```bash
npm install
npm run dev
npm start
npm run android
npm run ios
npm run web
npm run lint
```
