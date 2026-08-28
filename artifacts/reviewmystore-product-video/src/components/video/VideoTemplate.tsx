import { AnimatePresence, motion } from "framer-motion";
import { Scene1 } from "./video_scenes/Scene1";
import { Scene2 } from "./video_scenes/Scene2";
import { Scene3 } from "./video_scenes/Scene3";
import { Scene4 } from "./video_scenes/Scene4";
import { Scene5 } from "./video_scenes/Scene5";
import { useVideoPlayer } from "@/lib/video";

const SCENE_DURATIONS = {
  opening: 3800,
  place: 4200,
  touchpoints: 4550,
  assist: 4650,
  growth: 5000,
};

const orbitPositions = [
  { left: "64vw", top: "40vh", scale: 2.2, rotate: 0, opacity: 0.26 },
  { left: "82vw", top: "18vh", scale: 1, rotate: 45, opacity: 0.3 },
  { left: "16vw", top: "74vh", scale: 1.6, rotate: 90, opacity: 0.25 },
  { left: "75vw", top: "72vh", scale: 0.8, rotate: 135, opacity: 0.34 },
  { left: "25vw", top: "16vh", scale: 1.3, rotate: 180, opacity: 0.27 },
];

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({ durations: SCENE_DURATIONS });

  return (
    <main className="video-frame" aria-label="ReviewMyStore.ai product video">
      <div className="scene-layer pointer-events-none">
        <motion.div
          className="absolute -left-[16vw] -top-[20vw] h-[56vw] w-[56vw] rounded-full opacity-70 blur-[3vw]"
          animate={{
            x: ["0vw", "12vw", "-4vw", "8vw", "0vw"],
            y: ["0vh", "8vh", "-3vh", "7vh", "0vh"],
            scale: [1, 1.08, 0.95, 1.12, 1],
          }}
          transition={{ duration: 23, repeat: Infinity, ease: "easeInOut" }}
          style={{ background: "radial-gradient(circle, rgba(47,111,237,.2), transparent 67%)" }}
        />
        <motion.div
          className="absolute -bottom-[25vw] -right-[18vw] h-[58vw] w-[58vw] rounded-full opacity-60 blur-[3vw]"
          animate={{
            x: ["0vw", "-10vw", "4vw", "-6vw", "0vw"],
            y: ["0vh", "-5vh", "9vh", "-6vh", "0vh"],
            scale: [1, 0.9, 1.11, 0.96, 1],
          }}
          transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
          style={{ background: "radial-gradient(circle, rgba(52,168,83,.14), transparent 68%)" }}
        />
        <div className="drift-a absolute left-[45vw] top-[9vh] h-[6vw] w-[6vw] rounded-[1.3vw] border border-[#ea4335]/20" />
        <div className="drift-b absolute bottom-[8vh] right-[31vw] h-[2.2vw] w-[2.2vw] rounded-full border-[.25vw] border-[#fbbc04]/55" />
        <div className="absolute left-0 right-0 top-[12vh] h-px bg-[#202124]/8" />
      </div>

      <motion.div
        className="pointer-events-none absolute z-20 h-[12vw] w-[12vw] rounded-full border-[.14vw] border-[#2f6fed]/25"
        animate={orbitPositions[currentScene]}
        transition={{ duration: 1.15, ease: [0.16, 1, 0.3, 1] }}
      />
      <motion.div
        className="pointer-events-none absolute z-20 h-[.18vw] bg-[#ea4335]"
        animate={{
          left: ["7vw", "7vw", "7vw", "7vw", "7vw"][currentScene],
          top: ["75vh", "77vh", "78vh", "80vh", "82vh"][currentScene],
          width: ["26vw", "18vw", "30vw", "22vw", "34vw"][currentScene],
          opacity: [0.9, 0.5, 0.8, 0.55, 0.9][currentScene],
        }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      />

      <div className="pointer-events-none absolute left-[7vw] right-[7vw] top-[4.2vh] z-20 flex items-center justify-between">
        <motion.img
          src={`${import.meta.env.BASE_URL}brand/logo-horizontal.png`}
          alt="ReviewMyStore.ai"
          className="h-auto w-[17vw] object-contain"
          animate={{ opacity: [0.92, 1, 0.92], y: [0, -.2, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="flex items-center gap-[.7vw]">
          <span className="font-mono text-[.65vw] uppercase tracking-[.17em] text-[#202124]/45">The AI-powered Google Review platform</span>
          <span className="h-[.5vw] w-[.5vw] rounded-full bg-[#34a853]" />
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-[3.8vh] left-[7vw] right-[7vw] z-20 flex items-center justify-between text-[#202124]/42">
        <span className="font-mono text-[.62vw] uppercase tracking-[.16em]">Good service / made visible</span>
        <span className="font-mono text-[.62vw] uppercase tracking-[.16em]">reviewmystore.ai</span>
      </div>

      <AnimatePresence mode="sync" initial={false}>
        {currentScene === 0 && <Scene1 key="opening" />}
        {currentScene === 1 && <Scene2 key="place" />}
        {currentScene === 2 && <Scene3 key="touchpoints" />}
        {currentScene === 3 && <Scene4 key="assist" />}
        {currentScene === 4 && <Scene5 key="growth" />}
      </AnimatePresence>
    </main>
  );
}