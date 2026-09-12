# AI Q&A Pet Mode — Design

Date: 2026-09-12

## Problem

The AI Q&A widget is a plain chat. The user wants the same widget to become an
AI pet that can hear them (speech recognition) and talk back (text-to-speech),
using the exact same AI providers, models, and API keys as the chat widget.

## Goal

Add a "Pet mode" toggle to the AI Q&A widget. In Pet mode the chat view is
replaced by an animated robot face (ported from
https://github.com/NachoKai/kai-bot) that listens, thinks, and speaks, while
sharing the widget's models, config, and conversation history with Chat mode.

## Approach

Approach A (approved): mode toggle inside the existing ai-qa widget. The pet is
a frontend presentation layer on the identical `/api/ask` request — no backend
logic changes.

## Architecture

```
frontend/src/widgets/ai-qa/
├── Widget.tsx            # shell: header, mode toggle, renders ChatView | PetView
├── useAiChatCore.ts      # NEW shared hook: messages, send(), model/prompt assembly, error
├── ChatView.tsx          # NEW (extraction of today's chat UI)
├── PetView.tsx           # NEW: RobotFace + mic/mute + subtitle + face state
├── useVoiceInput.ts      # NEW (ported from kai-bot)
├── useTTS.ts             # NEW (ported from kai-bot)
└── RobotFace/            # NEW (ported from kai-bot: SVG parts, expressions, motions)
```

- `useAiChatCore` owns the existing `send()` + `/api/ask` payload logic
  (provider `::` model parsing, `autoProviders`, `localBaseUrl`, prompt
  resolution, history). Both views call it; there is zero duplication of
  request logic.
- `Widget.tsx` renders `<ChatView>` or `<PetView>` based on mode, both fed by
  the same core. Mode persisted per instance in localStorage
  (`ai-qa-<id>-mode`).
- Chat history is one shared array — switching modes keeps the conversation.

## Voice pipeline

Face states: `idle · listening · thinking · talking`.

```
mic held → useVoiceInput.start() → face LISTENING
  onresult(transcript) → face THINKING → core.send(transcript)
    reply → message stored → face TALKING → useTTS.speak(reply)
      speech end → face idle
```

- Recognition and synthesis are never active simultaneously.
- While TALKING the mic is locked; pressing mic when idle first calls
  `tts.stop()` then listens.
- Live transcript streams to the subtitle line while speaking is heard; the
  pet's reply shows as subtitle while talking.
- Mute toggle (persisted) suppresses audio but the face still animates.
- Emotion stays `neutral` (YAGNI: no sentiment detection).

## Config & prompt assembly

One new unencrypted textarea field added to the backend `aiQaWidget`
configSchema; no backend logic change:

- `petSystemPrompt` — default pet persona.

Default persona: "You are PIXEL, an affectionate pet robot. You can hear your
human and reply out loud. Keep replies to 1–2 short spoken sentences, warm and
playful. Refer to them as your human."

Prompt assembly (frontend, in `useAiChatCore`):

- Chat mode: `systemPrompt` exactly as today.
- Pet mode: `petSystemPrompt` (or default persona if empty) combined with
  `systemPrompt` if the user wrote one (pet persona is the closing
  instruction). Same `max_tokens`, same models, same keys.

## Dependencies & port

- Add `framer-motion@^12` to `frontend/package.json` (React 19 compatible).
- Port `RobotFace/` (verbatim), `useTTS.ts`, `useVoiceInput.ts` from kai-bot.
- Keep kai-bot's low-pitch robotic voice selection; recognition starts at
  `en-US`.

## Error handling & fallbacks

- Mic unsupported (Firefox/WebViews): mic button disabled + small text input
  fallback under the face; TTS still works.
- No speech / permission denied / network: kai-bot friendly error message in
  the subtitle; face returns to idle.
- AI failure: existing error path — error line under the pet, face idle.
- TTS unsupported: face reacts, subtitle shows the reply text.

## Verification

- No test framework in the repo; gates are `npm run build -w backend` and
  `npm run build -w frontend` (tsc + vite).
- Manual: pet on/off toggle, hear → reply round-trip, mute, mic error paths,
  chat history survives mode switches.