# Zetro — bilingual call QA

Upload a call-center recording. AssemblyAI separates the **agent** from the **customer** (Kiswahili, English, or mixed). OpenAI writes a clean two-speaker transcript, scores the agent, and ranks the team.

## What it does

1. You upload a call (`mp3`, `wav`, `m4a`, `mp4`, …) and name the agent.
2. **AssemblyAI** transcribes the audio (speech-to-text) and **diarizes** it: splits the two speakers and suggests Agent / Customer roles, with code-switching so mixed Kiswahili/English stays in the original languages.
3. **GPT-5-mini** **corrects speaker roles** from the conversation and writes a clean two-speaker script (no translation).
4. You upload **process documents**, a **scorecard**, and **compliance** files. **text-embedding-3-small** indexes them. **GPT-5 cannot score or audit** until all three are readable.
5. **GPT-5** scores against retrieved chunks from those files (not a generic rubric) and lists compliance findings.

## Stack

- Next.js App Router
- Supabase Auth, Postgres, Storage, Realtime
- AssemblyAI Universal (speaker labels + Kiswahili support)
- OpenAI Chat Completions with structured JSON

## Setup

### 1. Install

```bash
npm install
```

Copy environment variables:

```bash
copy .env.example .env.local
```

### 2. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Project Settings → API: copy **Project URL**, **anon key**, and **service role key** into `.env.local`.
3. Authentication → URL configuration: add `http://localhost:3000/auth/callback` to Redirect URLs. Site URL: `http://localhost:3000`.
4. Optional for local testing: Authentication → Providers → Email → turn **off** “Confirm email”.
5. SQL Editor: paste and run [`supabase/schema.sql`](supabase/schema.sql). That creates tables, RLS, the `call-audio` and `qa-documents` buckets, and realtime.
6. Existing projects: also run [`supabase/qa-standards.sql`](supabase/qa-standards.sql), [`supabase/workspaces.sql`](supabase/workspaces.sql), [`supabase/usernames.sql`](supabase/usernames.sql), and [`supabase/invites.sql`](supabase/invites.sql).

### 3. AssemblyAI

Create an API key at [assemblyai.com](https://www.assemblyai.com). Put it in `ASSEMBLYAI_API_KEY`.

Language handling:

- **Mixed English + Kiswahili** (default): Universal-2 with `language_codes: ["en", "sw"]` and a fallback to auto-detect + code-switching.
- **Kiswahili**: `language_code: "sw"`.
- **English**: Universal-3 Pro with Universal-2 fallback.
- **Auto-detect**: language detection + code-switching.

Speaker ID uses AssemblyAI role identification (`Agent` / `Customer`), then OpenAI corrects labels from the conversation.

### 4. OpenAI

Create an API key at [platform.openai.com](https://platform.openai.com). Put it in `OPENAI_API_KEY`. Optional: `OPENAI_PROJECT` if the key belongs to a specific project.

Default models:

- `AI_REASONING_MODEL=gpt-5` — reads retrieved scorecard/compliance chunks and scores the agent
- `AI_FAST_MODEL=gpt-5-mini` — cleans the two-speaker script
- `AI_EMBEDDING_MODEL=text-embedding-3-small` — indexes uploaded files
- `LLM_PROVIDER=openai` and `EMBEDDING_PROVIDER=openai`
- `AI_TEMPERATURE=0.1`, `AI_MAX_RETRIES=3`, `AI_TIMEOUT=240000`

### 5. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign up, and upload a call. Transcription of a few-minute recording usually takes 30–90 seconds. Keep the call page open; it polls until scoring is done.

## Processing flow

```
Browser → Supabase Storage (private bucket)
       → POST /api/calls
       → POST /api/calls/:id/transcribe   (Prepare)
            → AssemblyAI: speech-to-text + speaker diarization
            → optional Swahili meaning repair for bilingual calls
       → POST /api/calls/:id/score        (documents mode only)
            → load Standards (scorecard + compliance + process)
            → GPT analysis against company rules / Parameter Playbook
            → utterances already saved; call_scores row written
Leaderboard averages overall_score per agent (linked agent or filename id).
```

API keys never leave the server. The service role key is used only in server jobs to download audio and write analysis rows.

## Deploy

Set the same env vars on Vercel (or similar). Add the production URL to Supabase redirect URLs. Prepare/score routes use `maxDuration = 300`.

For existing projects, also run any missing SQL helpers under `supabase/` (including `sales-requests.sql` and `invite-expiry.sql`).
