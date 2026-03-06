# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Code Comments

- Use comments sparingly — only for genuinely complex logic
- Write comments in funny/humorous language
- Sign every comment with the developer's name (e.g. `@gregorek`)

## Repository Structure

This repo contains a single project under `uigen/` — an AI-powered React component generator with live preview.

## Commands (run from `uigen/`)

```bash
npm run setup        # Install deps + generate Prisma client + run migrations (first-time setup)
npm run dev          # Start dev server with Turbopack at http://localhost:3000
npm run build        # Production build
npm run lint         # ESLint
npm test             # Run all Vitest tests (watch mode)
npm test -- --run    # Run tests once (CI mode)
npm run db:reset     # Reset and re-run all migrations (destructive)
```

To run a single test file:
```bash
npm test -- src/lib/__tests__/file-system.test.ts --run
```

## Environment

Copy `.env.example` to `.env` and add `ANTHROPIC_API_KEY`. Without the key, the app uses a `MockLanguageModel` (`src/lib/provider.ts`) that returns static counter/form/card components — useful for development without burning API credits.

Optional: set `JWT_SECRET` (defaults to a hardcoded development key).

## Architecture

### Data Flow

1. User types a prompt in `ChatInterface` → submitted to `/api/chat` via Vercel AI SDK's `useChat`
2. The API route reconstructs a `VirtualFileSystem` from serialized file data sent in the request body, then streams responses using `streamText` with two tools
3. Tool calls stream back to the client; `FileSystemProvider.handleToolCall` intercepts them and updates the in-memory VFS
4. `PreviewFrame` watches `refreshTrigger` from the file system context, transforms JSX via `@babel/standalone`, builds an import map + blob URLs, and renders the result in a sandboxed `<iframe>` via `srcdoc`

### Virtual File System (`src/lib/file-system.ts`)

`VirtualFileSystem` is an in-memory tree — no files are ever written to disk on the client. It's serialized to JSON for transport (sent with every chat request, stored in the DB on completion). The `FileSystemProvider` context wraps it with React state and provides `handleToolCall` to apply AI tool calls.

### AI Tools

Both tools operate on the server-side `VirtualFileSystem` instance during the API request:
- `str_replace_editor` — `create`, `str_replace`, `insert`, `view` commands (`src/lib/tools/str-replace.ts`)
- `file_manager` — `rename`, `delete`, `list` commands (`src/lib/tools/file-manager.ts`)

### Preview Pipeline (`src/lib/transform/jsx-transformer.ts`)

- `transformJSX`: Babel-transforms JSX/TSX to plain JS (removes TypeScript, handles CSS imports)
- `createImportMap`: Builds an ES module import map; local files become blob URLs, third-party packages are resolved via `https://esm.sh/`; missing local imports get placeholder stub modules
- `createPreviewHTML`: Produces the full HTML document injected into the iframe, including Tailwind CDN, the import map, and an inline module script that mounts the React app

### Auth (`src/lib/auth.ts`)

Custom JWT sessions using `jose` + bcrypt passwords. Sessions stored in an `httpOnly` cookie (`auth-token`), 7-day expiry. `src/middleware.ts` protects routes. Anonymous users can still generate components; work is tracked in `src/lib/anon-work-tracker.ts` (localStorage) and offered for save after sign-up.

### Database (`prisma/schema.prisma`)

SQLite via Prisma. Two models:
- `User`: email + hashed password
- `Project`: `messages` (JSON string of chat history) + `data` (JSON string of serialized VFS) + optional `userId`

Project data is saved in the `onFinish` callback of `streamText` in the chat API route.

### Routing

- `/` — anonymous landing or redirect to latest project for authenticated users
- `/[projectId]` — loads project from DB and renders `MainContent` with hydrated file system + chat history

### React Contexts

- `FileSystemProvider` — owns the `VirtualFileSystem` instance; must wrap `ChatProvider`
- `ChatProvider` — wraps Vercel AI SDK's `useChat`; depends on `useFileSystem` to serialize files for each request and to process tool calls

### Testing

Vitest + jsdom + React Testing Library. Tests live in `__tests__/` directories co-located with the code they test.
