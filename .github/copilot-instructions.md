## VelocityHub CRM — Copilot instructions

Purpose: give an AI coding agent the minimal, actionable knowledge to be productive in this repo.

- Big picture (where changes usually belong):
  - Backend: `backend/src/` — Express app entrypoint `src/server.js`, routes in `src/routes/`, Mongoose models in `src/models/`, AI services in `src/ai/`, general services in `src/services/`, middleware in `src/middleware/`, utilities in `src/utils/`.
  - Frontend: `frontend/src/` — React app (CRA). Pages in `src/pages/`, shared components in `src/components/`, global context in `src/contexts/` (e.g. `AuthContext.js`).
  - Data flow: client ↔ REST API under `/api/*` (see `server.js` for registered routes). Real-time features use Socket.IO (`socket.io` on backend, `socket.io-client` on frontend).

- Key integration & infra points to not break:
  - OpenAI usage: backend AI helpers live in `backend/src/ai/` (e.g. `chatbot.js`). Prompts and model calls are centralized there — change prompts carefully and preserve safety/fallbacks.
  - Third-party APIs: Twilio, Stripe, DocuSign and cloud storage are referenced in `server.js` env and used across `src/services/*`.
  - Auth: JWT-based middleware at `backend/src/middleware/auth.js`. Routes expect `Authorization: Bearer <token>` and `req.user` to exist after middleware.

- Developer workflows (how to run & test locally):
  - Backend: cd `backend` → `npm install`; dev server: `npm run dev` (nodemon) or `npm start` for production. Tests: `npm test` (Jest).
  - Frontend: cd `frontend` → `npm install`; dev: `npm start`; build: `npm run build`; tests: `npm test`.
  - Optional: docker-compose dev is referenced in the README — use it to boot MongoDB/Redis when needed.

- Project conventions and patterns to follow:
  - Models: Mongoose schemas live in `backend/src/models`, use `module.exports = mongoose.model('Name', schema)`.
  - Routes: route files export an Express `router` and are mounted in `src/server.js`. When adding a route, add `const x = require('./routes/x'); app.use('/api/x', x);`.
  - AI services: encapsulate prompt building, OpenAI calls and fallback logic inside `backend/src/ai/*.js`. Keep prompt templates and response parsing inside the AI module.
  - Logging: use `backend/src/utils/logger.js` rather than console.log so logs are consistent.
  - Error handling: route handlers should forward errors to the centralized error middleware in `server.js` (i.e., throw or call next(err)).

- Quick examples (copy/paste-safe patterns used in this repo):
  - Mounting a new route: add `backend/src/routes/myFeature.js` that exports `router`, then in `backend/src/server.js` add:
    - `const myFeatureRoutes = require('./routes/myFeature');`
    - `app.use('/api/my-feature', myFeatureRoutes);`
  - Accessing the current user inside a protected route:
    - `const { auth } = require('../middleware/auth'); router.get('/', auth, (req, res) => { const user = req.user; ... });`
  - Adding AI logic: create a service in `backend/src/ai/` and call it from the appropriate route or service. Keep prompt templates and response parsing inside the AI module.

- Files to inspect for examples when modifying behavior:
  - Backend entry & routes: `backend/src/server.js` (route registration, middleware, health check)
  - AI patterns: `backend/src/ai/chatbot.js`, `backend/src/ai/conversationIntelligence.js`
  - Auth middleware: `backend/src/middleware/auth.js`
  - Mongoose models: `backend/src/models/Lead.js`, `User.js`, `Deal.js` (show AI fields and indexes)
  - Frontend wiring: `frontend/src/contexts/AuthContext.js`, `frontend/src/pages/*` and `frontend/src/components/*` for UI patterns

- Safety & secrets:
  - Never hardcode secrets. ENV keys are documented in `README.md`. If you modify startup code, keep env checks and defaults intact.

- What not to change without asking a human:
  - OpenAI prompt logic in `backend/src/ai/*` (subtle prompt edits change model outputs significantly).
  - Auth token handling and subscription checks in `backend/src/middleware/auth.js` (billing gating and role checks).
  - Database index/Schema changes without migration plan (models in `backend/src/models`).

If anything above is unclear or you need additional examples (small unit tests, more route samples, or the typical environment used for CI), say which area and I will iterate.
