# AI Q&A Pet Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Pet mode" toggle to the AI Q&A widget that turns it into a talking robot pet (kai-bot `RobotFace` + speech recognition + TTS) sharing the same chat history, models, and `/api/ask` request as Chat mode.

**Architecture:** Mode toggle inside the existing ai-qa widget. The chat logic is extracted into `useAiChatCore` (shared by both views). `ChatView` renders the existing chat UI; `PetView` renders the ported `RobotFace` driven by a state machine (`idle · listening · thinking · talking`), fed by ported `useVoiceInput` + `useTTS`. Pet mode changes only the `systemPrompt` assembled client-side — **zero backend routing changes** besides one new config field.

**Tech Stack:** React 19, Vite, styled-components (frontend); Express + TypeScript (backend). New dep: `framer-motion@^12` (frontend only). Source to port: `C:\Users\nacho\AppData\Local\Temp\opencode\kai-bot`.

## Global Constraints

- No test framework in the repo. Verification gates: `npm run build -w backend` and `npm run build -w frontend` (both must pass green), plus the manual checklist in each task.
- Only ONE new npm dependency: `framer-motion@^12` in the `frontend` workspace. Everything else is ported/adapted code.
- Backend `/api/ask` request body shape is unchanged. Pet mode only changes the `systemPrompt` value sent.
- Port kai-bot files verbatim EXCEPT the documented adaptations (inline option types, inline safe `localStorage`, `interimResults: true` + `onInterim`). Every adaptation is spelled out below.
- Mode is persisted per widget instance under `localStorage["ai-qa-<instance.id>-mode"]` (`"chat" | "pet"`). Chat history key stays `ai-qa-<instance.id>` and is shared by both modes.
- Pet emotion is always `neutral` (no sentiment detection — YAGNI).
- No new comments in authored code (matches repo style). Ported kai-bot code keeps its own comments.

## File Structure

**Backend:**
- Modify: `backend/src/constants.ts` — add `DEFAULT_PET_PROMPT`
- Modify: `backend/src/widgets/registry.ts` — import it, add to `defaultConfig` + `configSchema` of `aiQaWidget`

**Frontend (all under `frontend/src/widgets/ai-qa/`):**
- Create: `models.ts` — `API_BASE`, `AUTO_VALUE`, `MODEL_SEPARATOR`, `ChatMessage`, `MODEL_GROUPS`, `PROVIDER_LABELS`, `modelOptionValue` (moved out of `Widget.tsx`)
- Create: `prompt.ts` — `DEFAULT_PET_PROMPT`, `buildSystemPrompt()`
- Create: `useLatest.ts` — ported verbatim from kai-bot
- Create: `useTTS.ts` — ported + adapted (safe `localStorage`, inline options type, key `phi-ai-qa-tts-muted`)
- Create: `useVoiceInput.ts` — ported + adapted (inline types, `interimResults: true`, `onInterim`)
- Create: `RobotFace/{RobotFace.tsx, expressions.ts, types.ts, index.ts}` — ported verbatim
- Create: `useAiChatCore.ts` — extracted chat state machine (messages, loading, error, model select, send, clear, prompt assembly)
- Create: `ChatView.tsx` — extracted chat UI (messages list + input row)
- Create: `PetView.tsx` — robot face + mic/mute/subtitle + text fallback
- Modify: `Widget.tsx` — shell: model select + clear + mode toggle, renders `ChatView | PetView`
- Modify: `frontend/package.json` — add `framer-motion`

---

### Task 1: Backend — `petSystemPrompt` config field

**Files:**
- Modify: `backend/src/constants.ts`
- Modify: `backend/src/widgets/registry.ts`

**Interfaces:**
- Produces: `DEFAULT_PET_PROMPT: string` exported from `../constants.js`; `configSchema` entry `{ key: "petSystemPrompt", type: "string", default: DEFAULT_PET_PROMPT }`; `defaultConfig.petSystemPrompt`.

- [ ] **Step 1: Add `DEFAULT_PET_PROMPT` to constants**

Append to the end of `backend/src/constants.ts`:

```ts
export const DEFAULT_PET_PROMPT = `You are PIXEL, an affectionate pet robot. You can hear your human and reply out loud. Keep replies to 1-2 short spoken sentences, warm and playful. Refer to them as your human.`;
```

- [ ] **Step 2: Wire it into the ai-qa widget definition**

In `backend/src/widgets/registry.ts`:

1. Change line 2 to also import the new constant:

```ts
import { DEFAULT_PET_PROMPT, DEFAULT_SYSTEM_PROMPT } from "../constants.js";
```

2. Add to `defaultConfig` (current keys: `model`, `systemPrompt`, `autoProviders`, `localBaseUrl`):

```ts
    petSystemPrompt: DEFAULT_PET_PROMPT,
```

3. Add a new `configSchema` entry right after the `systemPrompt` entry (line ~305):

```ts
    {
      key: "petSystemPrompt",
      label: "Pet mode prompt",
      type: "string",
      default: DEFAULT_PET_PROMPT,
      description:
        "Persona used in Pet mode. Empty falls back to the default pet persona.",
    },
```

- [ ] **Step 3: Build backend**

Run: `npm run build -w backend`
Expected: exits 0, no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add backend/src/constants.ts backend/src/widgets/registry.ts
git commit -m "feat(ai-qa): add petSystemPrompt config field"
```

---

### Task 2: Frontend — add `framer-motion` dependency

**Files:**
- Modify: `frontend/package.json` (via npm)
- Modify: `package-lock.json` (via npm)

- [ ] **Step 1: Install**

Run: `npm install framer-motion@^12 --workspace frontend`
Expected: `frontend/package.json` gains `"framer-motion": "^12.x.x"`; lockfile updates. (Workspace root may suffix `workspaces` — check nothing else changed with `git diff frontend/package.json`.)

- [ ] **Step 2: Build frontend (still green, dep unused)**

Run: `npm run build -w frontend`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add frontend/package.json package-lock.json
git commit -m "build(frontend): add framer-motion for pet mode"
```

---

### Task 3: Frontend — port `RobotFace` and `useLatest` verbatim

**Files:**
- Create: `frontend/src/widgets/ai-qa/useLatest.ts`
- Create: `frontend/src/widgets/ai-qa/RobotFace/index.ts`
- Create: `frontend/src/widgets/ai-qa/RobotFace/types.ts`
- Create: `frontend/src/widgets/ai-qa/RobotFace/expressions.ts`
- Create: `frontend/src/widgets/ai-qa/RobotFace/RobotFace.tsx`

**Interfaces:**
- Produces: `export function useLatest<T>(value: T): MutableRefObject<T>`.
- Produces: `RobotFace({ activity, emotion }: { activity: ActivityState; emotion: EmotionState })`, `export type ActivityState = "idle" | "thinking" | "talking" | "listening"`, `export type EmotionState = "neutral" | "happy" | "sad" | "surprised" | "confused" | "sleeping" | "excited" | "angry"`, re-exported from `RobotFace/index.ts`.

- [ ] **Step 1: Create destination directory**

```powershell
New-Item -ItemType Directory -Force -Path "frontend/src/widgets/ai-qa/RobotFace" | Out-Null
```

- [ ] **Step 2: Copy the five files verbatim**

```powershell
$src = "C:\Users\nacho\AppData\Local\Temp\opencode\kai-bot\src"
$dst = "D:\code\phoenix-dashboard\frontend\src\widgets\ai-qa"
Copy-Item -LiteralPath "$src\hooks\useLatest.ts" -Destination "$dst\useLatest.ts"
Copy-Item -LiteralPath "$src\components\RobotFace\index.ts" -Destination "$dst\RobotFace\index.ts"
Copy-Item -LiteralPath "$src\components\RobotFace\types.ts" -Destination "$dst\RobotFace\types.ts"
Copy-Item -LiteralPath "$src\components\RobotFace\expressions.ts" -Destination "$dst\RobotFace\expressions.ts"
Copy-Item -LiteralPath "$src\components\RobotFace\RobotFace.tsx" -Destination "$dst\RobotFace\RobotFace.tsx"
```

No edits. Verify with `Get-Content "$dst\RobotFace\RobotFace.tsx" | Select-Object -First 5` — imports must be `react`, `framer-motion`, `./types`, `./expressions` only.

- [ ] **Step 3: Build frontend**

Run: `npm run build -w frontend`
Expected: exits 0. (`motion` calls like `motion.svg`, `motion.g`, `motion.path`, `motion.ellipse` type-check against framer-motion 12.)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/widgets/ai-qa
git commit -m "feat(ai-qa): port RobotFace and useLatest from kai-bot"
```

---

### Task 4: Frontend — port `useTTS` and `useVoiceInput` (adapted)

**Files:**
- Create: `frontend/src/widgets/ai-qa/useTTS.ts`
- Create: `frontend/src/widgets/ai-qa/useVoiceInput.ts`

**Interfaces:**
- Consumes: `useLatest` from Task 3.
- Produces:
  - `useTTS(options?: { onSpeakStart?: () => void; onSpeakEnd?: () => void })` → `{ speak(text: string): void; stop(): void; isSpeaking: boolean; isMuted: boolean; toggleMute(): void }`
  - `useVoiceInput(options?: { onResult?: (text: string) => void; onInterim?: (partial: string) => void; onError?: (message: string) => void })` → `{ isRecording: boolean; result: string; error: string | null; isSupported: boolean; permissionState: "prompt" | "granted" | "denied"; requestPermission(): Promise<...>; startRecording(): void; stopRecording(): void; clearResult(): void }`

- [ ] **Step 1: Write `useTTS.ts`**

Create `frontend/src/widgets/ai-qa/useTTS.ts` with EXACTLY this content (adapted from kai-bot: kai-bot's `storage` util replaced with local `storageGet`/`storageSet`; `UseTTSOptions` type inlined; storage key renamed):

```ts
import { useCallback, useEffect, useRef, useState } from "react";

interface UseTTSOptions {
  onSpeakStart?: () => void;
  onSpeakEnd?: () => void;
}

interface UseTTSReturn {
  speak: (text: string) => void;
  stop: () => void;
  isSpeaking: boolean;
  isMuted: boolean;
  toggleMute: () => void;
}

const STORAGE_KEY = "phi-ai-qa-tts-muted";

function storageGet(key: string, fallback: boolean): boolean {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as boolean);
  } catch {
    return fallback;
  }
}

function storageSet(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
}

export function useTTS(options: UseTTSOptions = {}): UseTTSReturn {
  const { onSpeakStart, onSpeakEnd } = options;
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(() => storageGet(STORAGE_KEY, false));

  useEffect(() => {
    storageSet(STORAGE_KEY, isMuted);
  }, [isMuted]);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const getVoice = useCallback(() => {
    const voices = window.speechSynthesis.getVoices();

    const preferredVoices = [
      "Google UK English Male",
      "Microsoft David",
      "Alex",
      "Daniel",
      "Fred",
    ];

    for (const name of preferredVoices) {
      const voice = voices.find(v => v.name.includes(name));
      if (voice) return voice;
    }

    const maleVoice = voices.find(
      v => v.lang.startsWith("en") && v.name.toLowerCase().includes("male"),
    );
    if (maleVoice) return maleVoice;

    return voices.find(v => v.lang.startsWith("en")) || voices[0];
  }, []);

  useEffect(() => {
    const loadVoices = () => window.speechSynthesis.getVoices();
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (isMuted || !text.trim()) return;

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = getVoice();
      utterance.rate = 1.0;
      utterance.pitch = 0.8;
      utterance.volume = 1.0;

      utterance.onstart = () => {
        setIsSpeaking(true);
        onSpeakStart?.();
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        onSpeakEnd?.();
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        onSpeakEnd?.();
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [isMuted, getVoice, onSpeakStart, onSpeakEnd],
  );

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const toggleMute = useCallback(() => {
    if (!isMuted) {
      stop();
    }
    setIsMuted(prev => !prev);
  }, [isMuted, stop]);

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  return {
    speak,
    stop,
    isSpeaking,
    isMuted,
    toggleMute,
  };
}
```

- [ ] **Step 2: Write `useVoiceInput.ts`**

Create `frontend/src/widgets/ai-qa/useVoiceInput.ts` with EXACTLY this content (adapted from kai-bot: `PermissionState`/`UseVoiceInputOptions` types inlined instead of `../types`; `interimResults` set to `true`; `onInterim` option added for live captioning):

```ts
import { useCallback, useEffect, useRef, useState } from "react";
import { useLatest } from "./useLatest";

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export type PermissionState = "prompt" | "granted" | "denied";

interface UseVoiceInputOptions {
  onResult?: (text: string) => void;
  onInterim?: (partial: string) => void;
  onError?: (message: string) => void;
}

interface UseVoiceInputReturn {
  isRecording: boolean;
  result: string;
  error: string | null;
  isSupported: boolean;
  permissionState: PermissionState;
  requestPermission: () => Promise<PermissionState>;
  startRecording: () => void;
  stopRecording: () => void;
  clearResult: () => void;
}

export function useVoiceInput(
  options: UseVoiceInputOptions = {},
): UseVoiceInputReturn {
  const { onResult, onInterim, onError } = options;
  const [isRecording, setIsRecording] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const onResultRef = useLatest(onResult);
  const onInterimRef = useLatest(onInterim);
  const onErrorRef = useLatest(onError);

  const isSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const [permissionState, setPermissionState] =
    useState<PermissionState>("prompt");

  const requestPermission = useCallback(async (): Promise<PermissionState> => {
    setPermissionState("prompt");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setPermissionState("granted");
      return "granted";
    } catch {
      setPermissionState("denied");
      return "denied";
    }
  }, []);

  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      if (transcript) {
        setResult(transcript);
        onInterimRef.current?.(transcript);
      }
      const latest = event.results[event.results.length - 1];
      if (latest?.isFinal) {
        setIsRecording(false);
        onResultRef.current?.(transcript);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "aborted") {
        setIsRecording(false);
        return;
      }

      const getErrorMessage = (error: string) => {
        switch (error) {
          case "not-allowed":
            return "Microphone access denied. Please allow microphone permissions.";
          case "no-speech":
            return "No speech detected. Please try again.";
          case "audio-capture":
            return "No microphone found. Please check your audio input.";
          case "network":
            return "Network error. Please check your connection.";
          default:
            return `Voice error: ${error}`;
        }
      };

      const msg = getErrorMessage(event.error);
      setError(msg);
      setIsRecording(false);
      onErrorRef.current?.(msg);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, [isSupported, onResultRef, onInterimRef, onErrorRef]);

  const startRecording = useCallback(() => {
    if (!isSupported || !recognitionRef.current) {
      setError("Voice recognition is not supported in this browser");
      return;
    }

    setError(null);
    setResult("");
    setIsRecording(true);

    try {
      recognitionRef.current.start();
    } catch (err) {
      console.error(err);
      setError("Could not start recording. Please try again.");
      setIsRecording(false);
    }
  }, [isSupported]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const clearResult = useCallback(() => {
    setResult("");
    setError(null);
  }, []);

  return {
    isRecording,
    result,
    error,
    isSupported,
    permissionState,
    requestPermission,
    startRecording,
    stopRecording,
    clearResult,
  };
}
```

- [ ] **Step 3: Build frontend**

Run: `npm run build -w frontend`
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/widgets/ai-qa/useTTS.ts frontend/src/widgets/ai-qa/useVoiceInput.ts
git commit -m "feat(ai-qa): port useTTS and useVoiceInput from kai-bot"
```

---

### Task 5: Frontend — extract `useAiChatCore`, `ChatView`, and shared modules

Pure refactor: identical behavior, verified by build + manual chat. No pet view yet.

**Files:**
- Create: `frontend/src/widgets/ai-qa/models.ts`
- Create: `frontend/src/widgets/ai-qa/prompt.ts`
- Create: `frontend/src/widgets/ai-qa/useAiChatCore.ts`
- Create: `frontend/src/widgets/ai-qa/ChatView.tsx`
- Modify: `frontend/src/widgets/ai-qa/Widget.tsx` (rewrite — chat mode only)

**Interfaces:**
- Consumes: `useLatest` (Task 3).
- Produces:
  - `models.ts`: `API_BASE: string`, `AUTO_VALUE = "auto"`, `MODEL_SEPARATOR = "::"`, `interface ChatMessage { role: "user" | "assistant"; content: string; model?: string; provider?: string }`, `MODEL_GROUPS`, `PROVIDER_LABELS`, `modelOptionValue(group: string, model: string): string`.
  - `prompt.ts`: `DEFAULT_PET_PROMPT: string`, `buildSystemPrompt(systemPrompt: string, petPrompt: string, mode: "chat" | "pet"): string | undefined`.
  - `useAiChatCore(instanceId: string, config: Record<string, unknown>, mode: "chat" | "pet", options?: { onAssistantReply?: (reply: string) => void })` → `{ messages: ChatMessage[]; loading: boolean; error: string | null; selectedModel: string; setSelectedModel: React.Dispatch<React.SetStateAction<string>>; send: (text: string) => Promise<void>; clearChat: () => void }`.
  - `ChatView({ messages, loading, error, send }: { messages: ChatMessage[]; loading: boolean; error: string | null; send: (text: string) => Promise<void> })`.

- [ ] **Step 1: Create `models.ts`**

Create `frontend/src/widgets/ai-qa/models.ts`:

```ts
export const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

export const AUTO_VALUE = "auto";
export const MODEL_SEPARATOR = "::";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  model?: string;
  provider?: string;
}

export const MODEL_GROUPS: {
  id: string;
  label: string;
  options: { id: string; label: string }[];
}[] = [
  {
    id: "groq",
    label: "Groq",
    options: [
      { id: "openai/gpt-oss-120b", label: "GPT-OSS 120B" },
      { id: "openai/gpt-oss-20b", label: "GPT-OSS 20B" },
      { id: "qwen/qwen3-8b", label: "Qwen3 8B" },
      { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" },
    ],
  },
  {
    id: "gemini",
    label: "Google AI Studio (Gemini)",
    options: [
      { id: "gemini-3.7-flash", label: "Gemini 3.7 Flash" },
      { id: "gemini-3.6-flash", label: "Gemini 3.6 Flash" },
      { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash" },
      { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash Lite" },
      { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    ],
  },
  {
    id: "llm7",
    label: "LLM7.io (free)",
    options: [
      { id: "codestral-latest", label: "Codestral (free)" },
      { id: "minimax-m2.7", label: "MiniMax M2.7 (free)" },
      { id: "mistral-Nemo-Instruct-2407", label: "Mistral Nemo (free)" },
    ],
  },
  {
    id: "local",
    label: "Local (Ollama / LM Studio)",
    options: [
      { id: "llama3.3", label: "Llama 3.3" },
      { id: "llama3.1", label: "Llama 3.1" },
      { id: "gemma3", label: "Gemma 3" },
      { id: "qwen3", label: "Qwen3" },
      { id: "mistral", label: "Mistral" },
    ],
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    options: [
      { id: "openrouter/free", label: "Auto router (best free)" },
      { id: "meta-llama/llama-3.3-70b-instruct:free", label: "Llama 3.3 70B (free)" },
      { id: "google/gemma-4-31b-it:free", label: "Gemma 4 31B (free)" },
      { id: "qwen/qwen3-coder:free", label: "Qwen3 Coder 480B (free)" },
      { id: "openai/gpt-oss-20b:free", label: "GPT-OSS 20B (free)" },
      { id: "nousresearch/hermes-3-llama-3.1-405b:free", label: "Hermes 3 405B (free)" },
    ],
  },
];

export const PROVIDER_LABELS: Record<string, string> = {
  groq: "Groq",
  gemini: "Google AI Studio",
  llm7: "LLM7.io",
  local: "Local",
  openrouter: "OpenRouter",
};

export function modelOptionValue(group: string, model: string): string {
  return `${group}${MODEL_SEPARATOR}${model}`;
}
```

- [ ] **Step 2: Create `prompt.ts`**

Create `frontend/src/widgets/ai-qa/prompt.ts` (match the backend default string exactly — plain hyphens):

```ts
export const DEFAULT_PET_PROMPT =
  "You are PIXEL, an affectionate pet robot. You can hear your human and reply out loud. Keep replies to 1-2 short spoken sentences, warm and playful. Refer to them as your human.";

export function buildSystemPrompt(
  systemPrompt: string,
  petPrompt: string,
  mode: "chat" | "pet",
): string | undefined {
  const base = systemPrompt.trim();
  if (mode !== "pet") {
    return base || undefined;
  }
  const pet = petPrompt.trim() || DEFAULT_PET_PROMPT;
  const parts = [base, pet].filter(Boolean);
  return parts.join("\n\n") || undefined;
}
```

- [ ] **Step 3: Create `useAiChatCore.ts`**

Create `frontend/src/widgets/ai-qa/useAiChatCore.ts`:

```ts
import { useCallback, useEffect, useRef, useState } from "react";
import {
  API_BASE,
  AUTO_VALUE,
  MODEL_GROUPS,
  modelOptionValue,
  type ChatMessage,
} from "./models";
import { buildSystemPrompt } from "./prompt";
import { useLatest } from "./useLatest";

type Mode = "chat" | "pet";

interface UseAiChatCoreOptions {
  onAssistantReply?: (reply: string) => void;
}

interface UseAiChatCoreReturn {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  selectedModel: string;
  setSelectedModel: React.Dispatch<React.SetStateAction<string>>;
  send: (text: string) => Promise<void>;
  clearChat: () => void;
}

export function useAiChatCore(
  instanceId: string,
  config: Record<string, unknown>,
  mode: Mode,
  options: UseAiChatCoreOptions = {},
): UseAiChatCoreReturn {
  const { onAssistantReply } = options;
  const onAssistantReplyRef = useLatest(onAssistantReply);

  const storageKey = `ai-qa-${instanceId}`;

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? (JSON.parse(saved) as ChatMessage[]) : [];
    } catch {
      console.error("[widget] Failed to load chat history");
      return [];
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState(() => {
    const configured = config.model as string | undefined;
    const valid = MODEL_GROUPS.some(g =>
      g.options.some(o => modelOptionValue(g.id, o.id) === configured),
    );
    return valid ? (configured as string) : AUTO_VALUE;
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch {
      console.error("[widget] Failed to save chat history");
      /* storage unavailable */
    }
  }, [messages, storageKey]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const userMsg: ChatMessage = { role: "user", content: trimmed };
      setMessages(prev => [...prev, userMsg]);
      setLoading(true);
      setError(null);

      const isAuto = selectedModel === AUTO_VALUE;
      let provider: string | undefined;
      let model: string | undefined;
      if (!isAuto) {
        const idx = selectedModel.indexOf("::");
        if (idx >= 0) {
          provider = selectedModel.slice(0, idx);
          model = selectedModel.slice(idx + "::".length);
        }
      }

      const body: Record<string, unknown> = {
        message: trimmed,
        provider,
        model,
        systemPrompt:
          buildSystemPrompt(
            (config.systemPrompt as string | undefined) ?? "",
            (config.petSystemPrompt as string | undefined) ?? "",
            mode,
          ) ?? undefined,
        history: messages.slice(-10).map(m => ({
          role: m.role,
          content: m.content,
        })),
      };
      if (isAuto) {
        body.autoProviders =
          (config.autoProviders as string[] | undefined) ?? undefined;
      }
      if (config.localBaseUrl) {
        body.localBaseUrl = config.localBaseUrl;
      }

      try {
        const res = await fetch(
          `${API_BASE}/ask?widgetId=${encodeURIComponent(instanceId)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          },
        );

        const data = (await res.json()) as {
          reply?: string;
          model?: string;
          provider?: string;
          error?: string;
          message?: string;
        };
        if (!res.ok) {
          const detail = data.message ? ` ${data.message}` : "";
          throw new Error(`${data.error ?? `HTTP ${res.status}`}${detail}`);
        }

        const reply = data.reply ?? "";
        setMessages(prev => [
          ...prev,
          {
            role: "assistant",
            content: reply,
            model: data.model,
            provider: data.provider,
          },
        ]);
        onAssistantReplyRef.current?.(reply);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Request failed");
      } finally {
        setLoading(false);
      }
    },
    [loading, selectedModel, messages, mode, config, instanceId],
  );

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    loading,
    error,
    selectedModel,
    setSelectedModel,
    send,
    clearChat,
  };
}
```

- [ ] **Step 4: Create `ChatView.tsx`**

Create `frontend/src/widgets/ai-qa/ChatView.tsx` (all chat styled components moved here verbatim from the current `Widget.tsx`):

```tsx
import { useCallback, useEffect, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import { PROVIDER_LABELS, type ChatMessage } from "./models";

interface ChatViewProps {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  send: (text: string) => Promise<void>;
}

export function ChatView({ messages, loading, error, send }: ChatViewProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    await send(text);
  }, [input, loading, send]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <>
      <Messages>
        {messages.length === 0 && !loading && <Empty>Ask anything…</Empty>}
        {messages.map((msg, i) => (
          <Msg key={i} $role={msg.role}>
            {msg.role === "assistant" && (msg.provider || msg.model) ? (
              <AssistantWrap>
                <MsgContent $role="assistant">{msg.content}</MsgContent>
                <ProviderBadge>
                  via{" "}
                  {PROVIDER_LABELS[msg.provider ?? ""] ?? msg.provider ?? "AI"}
                  {msg.model ? ` · ${msg.model}` : ""}
                </ProviderBadge>
              </AssistantWrap>
            ) : (
              <MsgContent $role={msg.role}>{msg.content}</MsgContent>
            )}
          </Msg>
        ))}
        {loading && (
          <Msg $role="assistant">
            <MsgContent $role="assistant" as={TypingWrapper}>
              <TypingDot />
              <TypingDot />
              <TypingDot />
            </MsgContent>
          </Msg>
        )}
        {error && <ErrorMsg>{error}</ErrorMsg>}
        <div ref={messagesEndRef} />
      </Messages>

      <InputRow>
        <Input
          ref={inputRef}
          type="text"
          placeholder="Ask anything…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <SendBtn
          type="button"
          onClick={() => void handleSend()}
          disabled={loading || !input.trim()}
        >
          {loading ? "…" : "↑"}
        </SendBtn>
      </InputRow>
    </>
  );
}

const typingAnim = keyframes`
  0%, 60%, 100% { opacity: 0.3; transform: scale(0.8); }
  30% { opacity: 1; transform: scale(1); }
`;

const Messages = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 6px 8px;
  scroll-behavior: smooth;
  background: ${({ theme }) => theme.bgElevated};
  border-radius: 8px;
`;

const Empty = styled.p`
  margin: auto;
  text-align: center;
  color: ${({ theme }) => theme.textMuted};
  font-size: 0.75rem;
  opacity: 0.6;
`;

const Msg = styled.div<{ $role: "user" | "assistant" }>`
  display: flex;
  justify-content: ${({ $role }) => ($role === "user" ? "flex-end" : "flex-start")};
`;

const MsgContent = styled.div<{ $role: "user" | "assistant" }>`
  max-width: 85%;
  padding: 6px 10px;
  border-radius: 10px;
  font-size: 0.75rem;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-word;
  background: ${({ $role, theme }) =>
    $role === "user" ? theme.accent : theme.bgElevated};
  color: ${({ $role }) => ($role === "user" ? "#fff" : "inherit")};
  ${({ $role }) =>
    $role === "user"
      ? "border-bottom-right-radius: 3px;"
      : "border-bottom-left-radius: 3px;"}
`;

const TypingWrapper = styled(MsgContent)`
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 8px 12px;
`;

const AssistantWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  max-width: 100%;
`;

const ProviderBadge = styled.span`
  font-size: 0.6rem;
  color: ${({ theme }) => theme.textMuted};
  opacity: 0.7;
  padding: 0 2px;
`;

const TypingDot = styled.span`
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: ${({ theme }) => theme.textMuted};
  animation: ${typingAnim} 1.2s infinite ease-in-out;

  &:nth-child(2) {
    animation-delay: 0.15s;
  }

  &:nth-child(3) {
    animation-delay: 0.3s;
  }
`;

const ErrorMsg = styled.div`
  font-size: 0.7rem;
  color: ${({ theme }) => theme.error};
  background: rgba(255, 107, 107, 0.1);
  border: 1px solid rgba(255, 107, 107, 0.25);
  border-radius: 8px;
  padding: 5px 8px;
  margin-top: 4px;
`;

const InputRow = styled.div`
  display: flex;
  gap: 6px;
  padding: 6px 0 0;
  flex-shrink: 0;
`;

const Input = styled.input`
  flex: 1;
  min-width: 0;
  padding: 7px 10px;
  background: ${({ theme }) => theme.bgElevated};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 8px;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.text};
  outline: none;
  transition: border-color 0.15s;

  &:focus {
    border-color: ${({ theme }) => theme.accent};
  }

  &:disabled {
    opacity: 0.5;
  }
`;

const SendBtn = styled.button`
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.accent};
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;

  &:disabled {
    opacity: 0.35;
    cursor: default;
  }
`;
```

- [ ] **Step 5: Rewrite `Widget.tsx` as the shell (chat mode only for now)**

Replace the ENTIRE contents of `frontend/src/widgets/ai-qa/Widget.tsx`:

```tsx
import styled from "styled-components";
import { WidgetCard } from "../../components/WidgetCard";
import type { WidgetProps } from "../../types";
import { ChatView } from "./ChatView";
import { AUTO_VALUE, MODEL_GROUPS, modelOptionValue } from "./models";
import { useAiChatCore } from "./useAiChatCore";

export function AiQaWidget({ instance }: WidgetProps) {
  const core = useAiChatCore(instance.id, instance.config, "chat");

  return (
    <WidgetCard title="AI Q&A" status="success" error={null} dragHandle={true}>
      <Wrapper>
        <Toolbar>
          <ModelSelect
            value={core.selectedModel}
            onChange={e => core.setSelectedModel(e.target.value)}
          >
            <option value={AUTO_VALUE}>⚡ Auto (best free)</option>
            {MODEL_GROUPS.map(g => (
              <optgroup key={g.id} label={g.label}>
                {g.options.map(o => (
                  <option
                    key={modelOptionValue(g.id, o.id)}
                    value={modelOptionValue(g.id, o.id)}
                  >
                    {o.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </ModelSelect>
          {core.messages.length > 0 && (
            <ClearBtn type="button" onClick={core.clearChat} title="Clear chat">
              ✕
            </ClearBtn>
          )}
        </Toolbar>
        <ChatView
          messages={core.messages}
          loading={core.loading}
          error={core.error}
          send={core.send}
        />
      </Wrapper>
    </WidgetCard>
  );
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  width: 100%;
`;

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 0 6px;
  flex-shrink: 0;
`;

const ModelSelect = styled.select`
  flex: 1;
  min-width: 0;
  padding: 4px 6px;
  background: ${({ theme }) => theme.bgElevated};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 6px;
  font-size: 0.65rem;
  color: ${({ theme }) => theme.text};
  cursor: pointer;
  appearance: auto;
`;

const ClearBtn = styled.button`
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 6px;
  color: ${({ theme }) => theme.textMuted};
  font-size: 0.6rem;
  cursor: pointer;
  transition:
    color 0.15s,
    border-color 0.15s;

  &:hover {
    color: ${({ theme }) => theme.error};
    border-color: ${({ theme }) => theme.error};
  }
`;
```

- [ ] **Step 6: Build frontend**

Run: `npm run build -w frontend`
Expected: exits 0. Watch for `noUnusedLocals` errors if any moved style is accidentally left in the old file — the rewrite drops it all.

- [ ] **Step 7: Manual smoke test (dev server)**

Run the frontend dev server, open the AI Q&A widget, and check:
- Send a chat message with Auto and a specific provider — same behavior as before.
- Reload the page — history and selected model persist (keys `ai-qa-<id>` and behavior unchanged).
- Clear button ✕ clears messages.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/widgets/ai-qa
git commit -m "refactor(ai-qa): extract shared chat core and views"
```

---

### Task 6: Frontend — `PetView` + mode toggle

**Files:**
- Create: `frontend/src/widgets/ai-qa/PetView.tsx`
- Modify: `frontend/src/widgets/ai-qa/Widget.tsx` (add mode state + toggle)

**Interfaces:**
- Consumes: `useAiChatCore` (Task 5), `useTTS`/`useVoiceInput` (Task 4), `RobotFace` (Task 3), `ChatMessage` (Task 5).
- Produces: `PetView({ messages, loading, error, send }: { messages: ChatMessage[]; loading: boolean; error: string | null; send: (text: string) => Promise<void> })`. Emits no interface — `Widget.tsx` owns persistence of the mode.

- [ ] **Step 1: Create `PetView.tsx`**

Create `frontend/src/widgets/ai-qa/PetView.tsx`:

```tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { RobotFace, type ActivityState, type EmotionState } from "./RobotFace";
import { useTTS } from "./useTTS";
import { useVoiceInput } from "./useVoiceInput";
import type { ChatMessage } from "./models";

interface PetViewProps {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  send: (text: string) => Promise<void>;
}

const HELLO = "Say hi — tap the mic to talk to PIXEL";

export function PetView({ messages, loading, error, send }: PetViewProps) {
  const [activity, setActivity] = useState<ActivityState>("idle");
  const [subtitle, setSubtitle] = useState(HELLO);
  const [fallbackText, setFallbackText] = useState("");
  const emotion: EmotionState = "neutral";

  const tts = useTTS({
    onSpeakStart: () => setActivity("talking"),
    onSpeakEnd: () => setActivity("idle"),
  });

  const voice = useVoiceInput({
    onInterim: part => setSubtitle(`… ${part}`),
    onResult: text => {
      setSubtitle(`You: ${text}`);
      setActivity("thinking");
      void send(text);
    },
    onError: msg => {
      setSubtitle(msg);
      setActivity("idle");
    },
  });

  const lastAssistant = useMemo(
    () => messages.filter(m => m.role === "assistant").at(-1),
    [messages],
  );

  useEffect(() => {
    if (activity !== "thinking") return;
    if (!lastAssistant || tts.isSpeaking) return;
    setSubtitle(lastAssistant.content);
    if (tts.isMuted) {
      setActivity("idle");
    } else {
      tts.speak(lastAssistant.content);
    }
  }, [activity, lastAssistant, tts]);

  const handleMic = useCallback(() => {
    if (voice.isRecording) {
      voice.stopRecording();
      setSubtitle(HELLO);
      setActivity("idle");
    } else {
      setSubtitle("Listening…");
      tts.stop();
      setActivity("listening");
      voice.startRecording();
    }
  }, [voice, tts]);

  const handleFallbackSend = useCallback(() => {
    const text = fallbackText.trim();
    if (!text || loading) return;
    setFallbackText("");
    setSubtitle(`You: ${text}`);
    setActivity("thinking");
    void send(text);
  }, [fallbackText, loading, send]);

  const isTalking = activity === "talking";

  return (
    <PetBody>
      <FaceBox>
        <RobotFace activity={activity} emotion={emotion} />
      </FaceBox>
      <Subtitle>{subtitle}</Subtitle>
      {error && <PetError>{error}</PetError>}
      <Controls>
        <MicBtn
          $recording={voice.isRecording}
          disabled={isTalking}
          onClick={handleMic}
          title={voice.isRecording ? "Stop listening" : "Talk to PIXEL"}
        >
          {voice.isRecording ? "■" : "🎙"}
        </MicBtn>
        <MuteBtn
          $muted={tts.isMuted}
          onClick={tts.toggleMute}
          title={tts.isMuted ? "Unmute" : "Mute"}
        >
          {tts.isMuted ? "🔇" : "🔊"}
        </MuteBtn>
      </Controls>
      {!voice.isSupported && (
        <FallbackRow>
          <FallbackInput
            type="text"
            placeholder="Type to PIXEL…"
            value={fallbackText}
            onChange={e => setFallbackText(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") handleFallbackSend();
            }}
            disabled={loading}
          />
          <FallbackSendBtn
            type="button"
            onClick={handleFallbackSend}
            disabled={loading || !fallbackText.trim()}
          >
            {loading ? "…" : "↑"}
          </FallbackSendBtn>
        </FallbackRow>
      )}
    </PetBody>
  );
}

const PetBody = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 6px 8px;
`;

const FaceBox = styled.div`
  flex: 1;
  min-height: 0;
  width: 100%;
  max-width: 320px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Subtitle = styled.p`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.textMuted};
  text-align: center;
  min-height: 1.1em;
  max-width: 100%;
  overflow-wrap: break-word;
  padding: 2px 8px;
  flex-shrink: 0;
`;

const PetError = styled.p`
  font-size: 0.7rem;
  color: ${({ theme }) => theme.error};
  background: rgba(255, 107, 107, 0.1);
  border: 1px solid rgba(255, 107, 107, 0.25);
  border-radius: 8px;
  padding: 5px 8px;
  margin: 0;
  max-width: 100%;
  overflow-wrap: break-word;
  flex-shrink: 0;
`;

const Controls = styled.div`
  display: flex;
  gap: 8px;
  flex-shrink: 0;
`;

const MicBtn = styled.button<{ $recording: boolean }>`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid
    ${({ theme, $recording }) => ($recording ? theme.error : theme.border)};
  background: ${({ theme, $recording }) =>
    $recording ? "rgba(255,107,107,0.15)" : theme.bgElevated};
  color: ${({ theme, $recording }) => ($recording ? theme.error : theme.text)};
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.15s;

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
`;

const MuteBtn = styled.button<{ $muted: boolean }>`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid ${({ theme }) => theme.border};
  background: ${({ theme }) => theme.bgElevated};
  color: ${({ theme, $muted }) => ($muted ? theme.textMuted : theme.text)};
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.15s;
`;

const FallbackRow = styled.div`
  display: flex;
  gap: 6px;
  width: 100%;
  padding: 0 8px 6px;
  flex-shrink: 0;
`;

const FallbackInput = styled.input`
  flex: 1;
  min-width: 0;
  padding: 7px 10px;
  background: ${({ theme }) => theme.bgElevated};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 8px;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.text};
  outline: none;
  transition: border-color 0.15s;

  &:focus {
    border-color: ${({ theme }) => theme.accent};
  }
`;

const FallbackSendBtn = styled.button`
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.accent};
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    opacity: 0.35;
    cursor: default;
  }
`;
```

- [ ] **Step 2: Add mode state + toggle to `Widget.tsx`**

Replace the ENTIRE contents of `frontend/src/widgets/ai-qa/Widget.tsx`:

```tsx
import { useEffect, useState } from "react";
import styled from "styled-components";
import { WidgetCard } from "../../components/WidgetCard";
import type { WidgetProps } from "../../types";
import { ChatView } from "./ChatView";
import { AUTO_VALUE, MODEL_GROUPS, modelOptionValue } from "./models";
import { PetView } from "./PetView";
import { useAiChatCore } from "./useAiChatCore";

type Mode = "chat" | "pet";

function readMode(key: string): Mode {
  try {
    return localStorage.getItem(key) === "pet" ? "pet" : "chat";
  } catch {
    return "chat";
  }
}

export function AiQaWidget({ instance }: WidgetProps) {
  const modeKey = `ai-qa-${instance.id}-mode`;
  const [mode, setMode] = useState<Mode>(() => readMode(modeKey));

  useEffect(() => {
    try {
      localStorage.setItem(modeKey, mode);
    } catch {
      /* storage unavailable */
    }
  }, [mode, modeKey]);

  const core = useAiChatCore(instance.id, instance.config, mode);

  return (
    <WidgetCard title="AI Q&A" status="success" error={null} dragHandle={true}>
      <Wrapper>
        <Toolbar>
          <ModelSelect
            value={core.selectedModel}
            onChange={e => core.setSelectedModel(e.target.value)}
          >
            <option value={AUTO_VALUE}>⚡ Auto (best free)</option>
            {MODEL_GROUPS.map(g => (
              <optgroup key={g.id} label={g.label}>
                {g.options.map(o => (
                  <option
                    key={modelOptionValue(g.id, o.id)}
                    value={modelOptionValue(g.id, o.id)}
                  >
                    {o.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </ModelSelect>
          {core.messages.length > 0 && (
            <ClearBtn type="button" onClick={core.clearChat} title="Clear chat">
              ✕
            </ClearBtn>
          )}
          <ModeToggle
            $pet={mode === "pet"}
            type="button"
            onClick={() => setMode(mode === "pet" ? "chat" : "pet")}
            title={mode === "pet" ? "Switch to chat" : "Switch to pet mode"}
          >
            {mode === "pet" ? "💬" : "🐾"}
          </ModeToggle>
        </Toolbar>

        {mode === "pet" ? (
          <PetView
            messages={core.messages}
            loading={core.loading}
            error={core.error}
            send={core.send}
          />
        ) : (
          <ChatView
            messages={core.messages}
            loading={core.loading}
            error={core.error}
            send={core.send}
          />
        )}
      </Wrapper>
    </WidgetCard>
  );
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  width: 100%;
`;

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 0 6px;
  flex-shrink: 0;
`;

const ModelSelect = styled.select`
  flex: 1;
  min-width: 0;
  padding: 4px 6px;
  background: ${({ theme }) => theme.bgElevated};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 6px;
  font-size: 0.65rem;
  color: ${({ theme }) => theme.text};
  cursor: pointer;
  appearance: auto;
`;

const ClearBtn = styled.button`
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 6px;
  color: ${({ theme }) => theme.textMuted};
  font-size: 0.6rem;
  cursor: pointer;
  transition:
    color 0.15s,
    border-color 0.15s;

  &:hover {
    color: ${({ theme }) => theme.error};
    border-color: ${({ theme }) => theme.error};
  }
`;

const ModeToggle = styled.button<{ $pet: boolean }>`
  flex-shrink: 0;
  width: 26px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme, $pet }) =>
    $pet ? "rgba(138, 43, 226, 0.25)" : theme.bgElevated};
  border: 1px solid
    ${({ theme, $pet }) => ($pet ? theme.accent : theme.border)};
  border-radius: 6px;
  font-size: 0.7rem;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: ${({ theme }) => theme.accent};
  }
`;
```

- [ ] **Step 3: Build frontend**

Run: `npm run build -w frontend`
Expected: exits 0.

- [ ] **Step 4: Manual smoke test**

Run the frontend dev server and check each item:
- Toggle 🐾 → robot face appears; toggle 💬 → exact same chat, history intact.
- Reload page while in pet mode — mode is restored from `ai-qa-<id>-mode`.
- Tap 🎙 mic → face goes `listening`, subtitle streams `… <partial>`, then `thinking`; when the reply arrives the face goes `talking` and audible speech plays; on completion face returns `idle`.
- Tap 🎙 while the pet is talking → stops speech first, then listens.
- 🔇 mute → reply appears in subtitle, no audio, face returns to `idle` after a moment.
- Mic error path (deny permission / no mic) → friendly error in subtitle, face `idle`, fallback text input appears when unsupported.
- Ask "Are you a robot?" — reply follows the pet persona (short, spoken-sounding) because pet mode sends the pet `systemPrompt`.
- Chat-mode system prompt still applies when toggled back (send a chat message, confirm the assistant's plain-assistant persona).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/widgets/ai-qa
git commit -m "feat(ai-qa): pet mode with voice"
```

---

## Self-Review Notes

- Spec coverage: config field (Task 1), deps (Task 2), RobotFace/hooks port (Tasks 3-4), shared core + extracted chat (Task 5), PetView + toggle + persistence + fallbacks (Task 6). Voice pipeline state machine, mic-lock-while-talking, mute persistence, and pet prompt assembly all live in `PetView.tsx`/`useAiChatCore.ts`. No spec requirement is left without a task.
- `WidgetProps` not touched; `instance.config` typed as `Record<string, unknown>` throughout — matches existing usage.
- Type consistency: `buildSystemPrompt`, `modelOptionValue`, `chatMessage`, `ActivityState`, and the hook return shape are used identically across tasks.