/**
 * Seam for an on-device language model. It may only rephrase a reply that was
 * already built from database facts; its output still goes through validateOutput.
 *
 * shortcut: no on-device LLM ships today, so this returns null on Android, iOS and Web and the
 * deterministic engine answers everything. Plug in llama.rn (native, needs an EAS dev build) or
 * WebLLM (Web, needs WebGPU) here when model size/download is acceptable for the release.
 */
export interface LocalModel {
  name: string;
  rephrase(text: string): Promise<string>;
}

export function getLocalModel(): LocalModel | null {
  return null;
}
