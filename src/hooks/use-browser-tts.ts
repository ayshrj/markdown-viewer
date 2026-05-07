import * as React from "react";

export type BrowserTtsSupport = {
  isSupported: boolean;
  hasVoices: boolean;
  isChecking: boolean;
};

function getVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return [];
  }

  return window.speechSynthesis.getVoices();
}

function detectBrowserTtsSupport(): BrowserTtsSupport {
  if (typeof window === "undefined") {
    return {
      isSupported: false,
      hasVoices: false,
      isChecking: true,
    };
  }

  const isSupported = Boolean(window.speechSynthesis && window.SpeechSynthesisUtterance);

  if (!isSupported) {
    return {
      isSupported: false,
      hasVoices: false,
      isChecking: false,
    };
  }

  const voices = getVoices();

  return {
    isSupported: true,
    hasVoices: voices.length > 0,
    isChecking: voices.length === 0,
  };
}

export function useBrowserTts(): BrowserTtsSupport {
  const [support, setSupport] = React.useState<BrowserTtsSupport>(() => detectBrowserTtsSupport());

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis || !window.SpeechSynthesisUtterance) {
      setSupport({
        isSupported: false,
        hasVoices: false,
        isChecking: false,
      });
      return;
    }

    let isCancelled = false;

    const updateSupport = () => {
      if (isCancelled) return;

      const voices = getVoices();

      setSupport({
        isSupported: true,
        hasVoices: voices.length > 0,
        isChecking: voices.length === 0,
      });
    };

    updateSupport();

    window.speechSynthesis.addEventListener("voiceschanged", updateSupport);

    const retryTimeout = window.setTimeout(updateSupport, 300);
    const finalTimeout = window.setTimeout(() => {
      if (isCancelled) return;

      const voices = getVoices();

      setSupport({
        isSupported: true,
        hasVoices: voices.length > 0,
        isChecking: false,
      });
    }, 1500);

    return () => {
      isCancelled = true;
      window.clearTimeout(retryTimeout);
      window.clearTimeout(finalTimeout);
      window.speechSynthesis.removeEventListener("voiceschanged", updateSupport);
    };
  }, []);

  return support;
}
