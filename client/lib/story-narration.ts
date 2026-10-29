export type NarrationState = { key: number | null; paused: boolean };

export function createStoryNarration(
  synth: SpeechSynthesis,
  Utterance: typeof SpeechSynthesisUtterance,
  onChange: (state: NarrationState) => void,
  onError: (message: string) => void,
) {
  let current: SpeechSynthesisUtterance | null = null;
  let key: number | null = null;
  let paused = false;

  const stop = () => {
    // Detach handlers before cancel: old events must not reset a newer chapter.
    if (current) {
      current.onend = null;
      current.onerror = null;
      current = null;
      synth.cancel();
    }
    key = null;
    paused = false;
    onChange({ key, paused });
  };

  const toggle = (nextKey: number, text: string) => {
    if (!text.trim()) {
      onError("There is no story text to read on this page.");
      return;
    }
    try {
      if (current && key === nextKey) {
        if (paused) synth.resume();
        else synth.pause();
        paused = !paused;
        onChange({ key, paused });
        return;
      }
      stop();
      const utterance = new Utterance(text);
      current = utterance;
      key = nextKey;
      const finish = () => {
        if (current !== utterance) return;
        current = null;
        key = null;
        paused = false;
        onChange({ key, paused });
      };
      utterance.onend = finish;
      utterance.onerror = (event) => {
        if (current !== utterance) return;
        finish();
        if (event.error !== "canceled" && event.error !== "interrupted") {
          onError("Audio couldn't play. Check that a text-to-speech voice is available on your device, then try again or use another browser.");
        }
      };
      onChange({ key, paused });
      synth.speak(utterance);
      // A previously paused browser queue can otherwise leave new audio silent.
      if (synth.paused) synth.resume();
    } catch {
      stop();
      onError("Audio couldn't start. Please try again or use another browser.");
    }
  };

  return { toggle, stop };
}
