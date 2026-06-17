import React, { useState, useEffect } from "react";

interface TimerState {
  minutes: number;
  seconds: number;
}

const RecordingTimer: React.FC = () => {
  const [timer, setTimer] = useState<TimerState>({ minutes: 0, seconds: 0 });

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev.seconds === 59) {
          return { minutes: prev.minutes + 1, seconds: 0 };
        }
        return { ...prev, seconds: prev.seconds + 1 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

  return (
    <div className="mx-2.5 flex items-center">
      <span>{`${pad(timer.minutes)}:${pad(timer.seconds)}`}</span>
    </div>
  );
};

export default RecordingTimer;
