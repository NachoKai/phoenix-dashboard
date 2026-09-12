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
