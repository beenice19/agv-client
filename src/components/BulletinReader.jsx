import React, { useEffect, useMemo, useRef, useState } from "react";

export default function BulletinReader({ text = "" }) {
  const words = useMemo(() => {
    return text ? text.split(/\s+/).filter(Boolean) : [];
  }, [text]);

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  const utterRef = useRef(null);

  const startReading = () => {
    if (!text) return;

    window.speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(text);

    utter.rate = 0.95;

    utter.onstart = () => {
      setIsSpeaking(true);
      setHighlightIndex(0);
    };

    utter.onboundary = (e) => {
      if (e.name === "word") {
        const spoken = text.slice(0, e.charIndex);
        const index = spoken.trim() ? spoken.trim().split(/\s+/).length : 0;
        setHighlightIndex(index);
      }
    };

    utter.onend = () => {
      setIsSpeaking(false);
      setHighlightIndex(-1);
    };

    utterRef.current = utter;
    window.speechSynthesis.speak(utter);
  };

  const stopReading = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setHighlightIndex(-1);
  };

  return (
    <div>
      <button onClick={startReading}>Read Bulletin</button>
      <button onClick={stopReading}>Stop</button>

      <div style={{ marginTop: 10, lineHeight: "1.8em" }}>
        {words.map((word, i) => (
          <span
            key={i}
            style={{
              backgroundColor: i === highlightIndex ? "yellow" : "transparent",
              marginRight: 4,
            }}
          >
            {word}
          </span>
        ))}
      </div>
    </div>
  );
}