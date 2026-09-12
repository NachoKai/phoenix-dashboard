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
