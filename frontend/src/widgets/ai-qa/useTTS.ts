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
