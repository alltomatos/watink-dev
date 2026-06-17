import React, { useRef, useEffect, useState } from "react";
import { Button } from "../ui/button";

const LS_NAME = "audioMessageRate";

interface AudioProps {
  url: string;
}

const Audio: React.FC<AudioProps> = ({ url }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioRate, setAudioRate] = useState<number>(
    parseFloat(localStorage.getItem(LS_NAME) || "1")
  );
  const [showButtonRate, setShowButtonRate] = useState(false);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.playbackRate = audioRate;
    localStorage.setItem(LS_NAME, String(audioRate));
  }, [audioRate]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.onplaying = () => setShowButtonRate(true);
    el.onpause = () => setShowButtonRate(false);
    el.onended = () => setShowButtonRate(false);
  }, []);

  const toggleRate = () => {
    const map: Record<number, number> = { 0.5: 1, 1: 1.5, 1.5: 2, 2: 0.5 };
    setAudioRate(map[audioRate] ?? 1);
  };

  return (
    <>
      <audio ref={audioRef} controls>
        <source src={url} type="audio/ogg" />
      </audio>
      {showButtonRate && (
        <Button
          variant="ghost"
          size="sm"
          className="ml-1.5 -mt-11"
          onClick={toggleRate}
        >
          {audioRate}x
        </Button>
      )}
    </>
  );
};

Audio.displayName = "Audio";

export default Audio;
