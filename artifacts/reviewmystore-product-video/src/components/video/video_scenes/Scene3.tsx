import { motion } from "framer-motion";
import { ArrowRight, Nfc, QrCode, ScanLine, Smartphone } from "lucide-react";

const ease = [0.16, 1, 0.3, 1] as const;

export function Scene3() {
  return (
    <motion.section
      className="scene-layer"
      initial={{ opacity: 0, clipPath: "inset(100% 0 0 0)" }}
      animate={{ opacity: 1, clipPath: "inset(0 0 0 0)" }}
      exit={{ opacity: 0, clipPath: "inset(0 0 100% 0)" }}
      transition={{ duration: 0.78, ease }}
    >
      <div className="absolute left-[7vw] top-[18vh]">
        <motion.p className="eyebrow mb-[2.2vh] text-[#34a853]" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .45, ease }}>03 / Make the ask easy</motion.p>
        <motion.h2 className="display text-[5.5vw] text-[#202124]" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .12, duration: .72, ease }}>
          One tap
          <br />
          <span className="text-[#2f6fed]">closer.</span>
        </motion.h2>
        <motion.p className="mt-[2.8vh] max-w-[25vw] text-[1.2vw] leading-[1.45] text-[#202124]/62" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .48, duration: .55 }}>
          Put a friendly path to Google where the good feeling is still warm.
        </motion.p>
      </div>
      <motion.div className="absolute right-[8vw] top-[15vh] h-[36vw] w-[53vw]" initial={{ opacity: 0, scale: .9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: .18, duration: .8, ease }}>
        <div className="absolute left-[1vw] top-[8vw] flex w-[21vw] flex-col items-center rounded-[1.2vw] border border-[#202124]/14 bg-[#fffdf8]/86 p-[1.5vw] shadow-[0_1.5vw_3.5vw_rgba(32,33,36,.1)]">
          <div className="flex w-full items-center justify-between"><span className="small-caps">Counter card</span><QrCode size="1.3vw" color="#ea4335" /></div>
          <div className="mt-[2vw] flex h-[12vw] w-[12vw] items-center justify-center rounded-[.8vw] border-[.55vw] border-[#202124] bg-[#fffdf8]">
            <svg viewBox="0 0 100 100" className="h-[10vw] w-[10vw]" aria-hidden="true">
              <path d="M9 9h28v28H9zM63 9h28v28H63zM9 63h28v28H9zM50 50h9v9h-9zM66 50h25v9H66zM50 66h9v25h-9zM66 66h9v9h-9zM82 66h9v25h-9z" fill="#202124" />
              <path d="M17 17h12v12H17zM71 17h12v12H71zM17 71h12v12H17z" fill="#2f6fed" />
            </svg>
          </div>
          <p className="mt-[1.25vw] text-center text-[1vw] font-bold">Tell us what went well.</p>
          <p className="mt-[.35vw] text-center text-[.7vw] text-[#202124]/50">Scan to share your visit</p>
        </div>
        <div className="absolute right-[2vw] top-[1vw] h-[32vw] w-[18vw] rounded-[2.2vw] border-[.55vw] border-[#202124] bg-[#202124] shadow-[0_2vw_4vw_rgba(32,33,36,.24)]">
          <div className="absolute left-1/2 top-[.65vw] h-[.45vw] w-[4vw] -translate-x-1/2 rounded-full bg-[#55565a]" />
          <div className="absolute inset-[.55vw] overflow-hidden rounded-[1.7vw] bg-[#e8eefc]">
            <div className="p-[1.2vw]"><div className="flex items-center gap-[.55vw]"><div className="h-[1.8vw] w-[1.8vw] rounded-[.5vw] bg-[#2f6fed]"><img src={`${import.meta.env.BASE_URL}brand/logo-icon.png`} alt="" className="h-full w-full rounded-[.5vw] object-contain" /></div><span className="font-mono text-[.62vw] text-[#202124]/54">reviewmystore.ai</span></div><p className="mt-[3.5vw] text-[1.5vw] font-bold leading-[1.1]">How was<br />your visit?</p><p className="mt-[.7vw] text-[.7vw] leading-[1.35] text-[#202124]/56">Pick a few words and make it yours.</p><div className="mt-[1.6vw] flex flex-wrap gap-[.4vw]">{["Warm", "Fast", "Thoughtful", "Easy"].map((tag, i) => <motion.span key={tag} className={`rounded-full px-[.65vw] py-[.42vw] text-[.62vw] font-bold ${i % 2 ? "bg-[#fbbc04]/75" : "bg-[#fffdf8]"}`} initial={{ opacity: 0, scale: .7 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: .8 + i * .12, type: "spring", stiffness: 300, damping: 18 }}>{tag}</motion.span>)}</div><div className="mt-[2vw] h-[.3vw] overflow-hidden rounded-full bg-[#d4dbec]"><motion.div className="h-full w-[66%] bg-[#34a853]" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 1.15, duration: .65, ease }} /></div></div>
            <motion.div className="absolute bottom-[1.3vw] left-[1vw] right-[1vw] flex items-center justify-between rounded-[.7vw] bg-[#2f6fed] px-[.8vw] py-[.7vw] text-white" animate={{ y: ["0vw", "-.18vw", "0vw"] }} transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}><span className="font-bold text-[.7vw]">Continue</span><ArrowRight size=".85vw" /></motion.div>
          </div>
        </div>
        <motion.div className="absolute left-[22vw] top-[20vw] flex items-center gap-[.75vw] rounded-full border border-[#34a853]/30 bg-[#34a853]/10 px-[1vw] py-[.65vw]" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .9, duration: .6, ease }}><Nfc size="1.35vw" color="#34a853" /><span className="font-mono text-[.75vw] uppercase tracking-[.1em]">or tap NFC</span></motion.div>
        <motion.div className="absolute left-[21vw] top-[23.5vw] h-[.12vw] w-[8vw] origin-left bg-[#34a853]" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 1.05, duration: .7, ease }} />
        <motion.div className="absolute left-[27vw] top-[23.1vw] h-[.8vw] w-[.8vw] rounded-full bg-[#34a853]" animate={{ x: [0, 5, 0], opacity: [0, 1, 0] }} transition={{ duration: 1.8, repeat: Infinity, delay: 1.2 }} />
        <div className="absolute bottom-[1vw] left-[2vw] flex items-center gap-[.6vw] text-[#202124]/48"><ScanLine size="1.1vw" /><Smartphone size="1.1vw" /><span className="font-mono text-[.7vw] uppercase tracking-[.13em]">QR / NFC / link</span></div>
      </motion.div>
    </motion.section>
  );
}