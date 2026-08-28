import { motion } from "framer-motion";
import { Check, MapPin, Search, Star } from "lucide-react";

const ease = [0.16, 1, 0.3, 1] as const;

export function Scene2() {
  return (
    <motion.section
      className="scene-layer"
      initial={{ opacity: 0, clipPath: "circle(0% at 78% 46%)" }}
      animate={{ opacity: 1, clipPath: "circle(100% at 78% 46%)" }}
      exit={{ opacity: 0, clipPath: "circle(0% at 8% 42%)" }}
      transition={{ duration: 0.9, ease }}
    >
      <div className="absolute left-[7vw] top-[20vh] max-w-[27vw]">
        <motion.p className="eyebrow mb-[2.4vh] text-[#2f6fed]" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .45, ease }}>
          02 / Start with your place
        </motion.p>
        <motion.h2 className="display text-[5.3vw] text-[#202124]" initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .12, duration: .75, ease }}>
          Find the
          <br />
          right <span className="text-[#ea4335]">signal.</span>
        </motion.h2>
        <motion.p className="mt-[2.8vh] max-w-[24vw] text-[1.22vw] leading-[1.45] text-[#202124]/64" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .48, duration: .6 }}>
          ReviewMyStore.ai connects your reputation work to the business people already know.
        </motion.p>
      </div>
      <motion.div className="absolute right-[10vw] top-[15vh] w-[47vw] rotate-[1deg]" initial={{ y: 35, opacity: 0, scale: .96 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ delay: .25, duration: .9, ease }}>
        <div className="glass overflow-hidden rounded-[1.2vw]">
          <div className="flex items-center gap-[.6vw] border-b border-[#202124]/10 px-[1.2vw] py-[1vw]">
            <div className="flex h-[2vw] w-[2vw] items-center justify-center rounded-[.55vw] bg-[#2f6fed]"><Search size="1.1vw" color="white" /></div>
            <span className="font-mono text-[.88vw] text-[#202124]/60">Search your business name...</span>
            <div className="ml-auto flex items-center gap-[.4vw]"><span className="h-[.45vw] w-[.45vw] rounded-full bg-[#ea4335]" /><span className="h-[.45vw] w-[.45vw] rounded-full bg-[#fbbc04]" /><span className="h-[.45vw] w-[.45vw] rounded-full bg-[#34a853]" /></div>
          </div>
          <div className="relative h-[30vw] overflow-hidden bg-[#e8eefc]">
            <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "linear-gradient(25deg, transparent 48%, rgba(255,255,255,.9) 49%, rgba(255,255,255,.9) 51%, transparent 52%), linear-gradient(110deg, transparent 48%, rgba(255,255,255,.9) 49%, rgba(255,255,255,.9) 51%, transparent 52%)", backgroundSize: "8vw 6vw, 11vw 9vw" }} />
            <div className="absolute left-[8vw] top-[4vw] h-[11vw] w-[22vw] rounded-[45%] border-[1.2vw] border-[#d7e2fa] bg-[#c4d5f7]" />
            <motion.div className="absolute left-[22vw] top-[9vw] h-[7vw] w-[7vw] rounded-full border-[1px] border-[#2f6fed]/30 bg-[#2f6fed]/14" animate={{ scale: [1, 1.18, 1], opacity: [.5, .9, .5] }} transition={{ duration: 2.2, repeat: Infinity }} />
            <motion.div className="absolute left-[25vw] top-[11vw] flex h-[2.5vw] w-[2.5vw] items-center justify-center rounded-full bg-[#ea4335] shadow-[0_.5vw_1vw_rgba(234,67,53,.3)]" animate={{ y: ["0vw", "-.4vw", "0vw"] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}><MapPin size="1.35vw" color="white" fill="white" /></motion.div>
            <div className="absolute bottom-[1.3vw] left-[1.3vw] right-[1.3vw] rounded-[.8vw] border border-[#202124]/10 bg-[#fffdf8]/95 p-[1.2vw] shadow-[0_.8vw_2vw_rgba(32,33,36,.12)]">
              <div className="flex items-start gap-[.9vw]">
                <div className="flex h-[3.7vw] w-[3.7vw] shrink-0 items-center justify-center rounded-[.6vw] bg-[#2f6fed]"><img src={`${import.meta.env.BASE_URL}brand/logo-icon.png`} alt="" className="h-[3.1vw] w-[3.1vw] object-contain" /></div>
                <div className="min-w-0 flex-1"><p className="font-bold text-[1.1vw]">The Daily Standard</p><p className="mt-[.25vw] text-[.78vw] text-[#202124]/52">14 Church Street · Mumbai</p><p className="mt-[.55vw] flex items-center gap-[.35vw] text-[.76vw] font-bold"><Star size=".8vw" fill="#fbbc04" color="#fbbc04" /> 4.9 <span className="font-normal text-[#202124]/48">· 284 reviews</span></p></div>
                <motion.div className="flex h-[2vw] w-[2vw] items-center justify-center rounded-full bg-[#34a853]" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1, type: "spring", stiffness: 260, damping: 15 }}><Check size="1.1vw" color="white" /></motion.div>
              </div>
              <div className="mt-[1vw] h-[.28vw] overflow-hidden rounded-full bg-[#e5e4de]"><motion.div className="h-full w-[72%] origin-left bg-[#2f6fed]" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: .75, duration: .8, ease }} /></div>
            </div>
          </div>
        </div>
      </motion.div>
      <motion.div className="absolute bottom-[12vh] left-[7vw] flex items-center gap-[.75vw] rounded-full bg-[#fbbc04] px-[1vw] py-[.65vw] shadow-[0_.6vw_1.4vw_rgba(251,188,4,.22)]" initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: .75, duration: .55, ease }}>
        <MapPin size="1.2vw" />
        <span className="font-mono text-[.78vw] font-medium uppercase tracking-[.12em]">One place. One clear starting point.</span>
      </motion.div>
    </motion.section>
  );
}