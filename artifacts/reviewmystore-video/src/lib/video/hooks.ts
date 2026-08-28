import { useEffect, useMemo, useRef, useState } from "react";

declare global {
  interface Window {
    startRecording?: () => void;
    stopRecording?: () => void;
  }
}

export function useVideoPlayer({ durations }: { durations: Record<string, number> }) {
  const sceneKeys = useMemo(() => Object.keys(durations), [durations]);
  const [currentScene, setCurrentScene] = useState(0);
  const hasStoppedRecording = useRef(false);

  useEffect(() => {
    window.startRecording?.();
    return () => undefined;
  }, []);

  useEffect(() => {
    const duration = durations[sceneKeys[currentScene]] ?? 4000;
    const timer = window.setTimeout(() => {
      const nextScene = currentScene + 1;
      if (nextScene >= sceneKeys.length) {
        if (!hasStoppedRecording.current) {
          window.stopRecording?.();
          hasStoppedRecording.current = true;
        }
        setCurrentScene(0);
      } else {
        setCurrentScene(nextScene);
      }
    }, duration);

    return () => window.clearTimeout(timer);
  }, [currentScene, durations, sceneKeys]);

  return { currentScene, sceneKey: sceneKeys[currentScene] };
}