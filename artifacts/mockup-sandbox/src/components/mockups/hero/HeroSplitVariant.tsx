import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Star,
  QrCode,
  MessageSquareText,
  BarChart3,
  Target,
  MapPin,
  ArrowRight,
  Zap,
  Search,
  CheckCircle2,
  TrendingUp,
  Smartphone
} from "lucide-react";

export default function HeroSplitVariant() {
  const [mounted, setMounted] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap');
        
        .font-display {
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
        .font-mono-accent {
          font-family: 'Space Grotesk', sans-serif;
        }
        
        .bento-shadow {
          box-shadow: 0 4px 24px -8px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0,0,0,0.02);
        }
        
        .bento-glow {
          box-shadow: 0 0 40px -10px rgba(59, 130, 246, 0.3);
        }
      `}</style>

      <div className="min-h-screen bg-[#F8FAFC] font-display flex items-center overflow-hidden relative">
        {/* Background Gradients */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-100/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-emerald-50/50 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4 pointer-events-none" />
        
        {/* Noise overlay */}
        <div 
          className="absolute inset-0 opacity-[0.015] pointer-events-none mix-blend-overlay"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}
        />

        <div className="container mx-auto px-6 lg:px-12 py-20 lg:py-0 relative z-10">
          <div className="grid lg:grid-cols-[1fr_1.1fr] gap-16 lg:gap-24 items-center">
            
            {/* Left Column - Content */}
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-xl"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 text-sm font-semibold mb-8 shadow-sm">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                  <Zap className="w-3 h-3" />
                </span>
                <span>The AI-Powered Google Review Platform</span>
              </div>
              
              <h1 className="text-5xl sm:text-6xl lg:text-[4rem] font-extrabold tracking-tight text-slate-900 leading-[1.05] mb-6">
                Collect More Google Reviews <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500">
                  with AI.
                </span>
              </h1>
              
              <p className="text-lg text-slate-600 mb-10 leading-relaxed font-medium max-w-lg">
                Automate your reputation. We use AI-powered review generation, smart QR Codes, and NFC devices to turn happy customers into 5-star ratings.
              </p>

              {/* Action Area - Integrated Search */}
              <div className="bg-white p-3 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 relative z-20">
                <div 
                  className={`flex items-center bg-slate-50 rounded-2xl px-5 py-4 border transition-all duration-300 ${searchFocused ? 'border-blue-400 ring-4 ring-blue-50' : 'border-slate-100'}`}
                >
                  <Search className={`w-6 h-6 mr-3 transition-colors ${searchFocused ? 'text-blue-500' : 'text-slate-400'}`} />
                  <input 
                    type="text" 
                    placeholder="Find your business on Google..." 
                    className="bg-transparent border-none outline-none flex-1 text-slate-800 placeholder:text-slate-400 text-lg font-medium"
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setSearchFocused(false)}
                  />
                </div>
                <div className="mt-3 grid sm:grid-cols-2 gap-3">
                  <button className="bg-slate-900 hover:bg-slate-800 text-white rounded-2xl py-4 px-6 font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]">
                    Find My Business <ArrowRight className="w-5 h-5" />
                  </button>
                  <button className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-2xl py-4 px-6 font-bold flex items-center justify-center gap-2 transition-colors">
                    Book a Demo
                  </button>
                </div>
              </div>
              
              <div className="mt-10 flex items-center gap-4">
                <div className="flex -space-x-3">
                  {[
                    "https://i.pravatar.cc/100?img=12",
                    "https://i.pravatar.cc/100?img=32",
                    "https://i.pravatar.cc/100?img=47",
                    "https://i.pravatar.cc/100?img=68"
                  ].map((src, i) => (
                    <img key={i} src={src} alt="User" className="w-10 h-10 rounded-full border-2 border-[#F8FAFC] shadow-sm" />
                  ))}
                </div>
                <div className="text-sm font-medium text-slate-500">
                  <span className="text-slate-900 font-bold">1,000+</span> local businesses growing
                </div>
              </div>
            </motion.div>

            {/* Right Column - Asymmetric Bento Grid */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, rotate: 1 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative perspective-1000"
            >
              <div className="grid grid-cols-2 gap-4 relative z-10">
                {/* Top Left: Stats Card */}
                <div className="bg-white rounded-3xl p-6 bento-shadow border border-slate-100 col-span-1 flex flex-col justify-between aspect-square group hover:border-blue-100 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <Target className="w-6 h-6" />
                    </div>
                    <span className="inline-flex items-center gap-1 text-emerald-600 text-sm font-bold bg-emerald-50 px-2.5 py-1 rounded-full">
                      <TrendingUp className="w-3 h-3" /> +24%
                    </span>
                  </div>
                  <div>
                    <div className="text-slate-500 text-sm font-semibold mb-1">Average Rating</div>
                    <div className="font-mono-accent text-5xl font-bold text-slate-900">4.9</div>
                    <div className="flex gap-1 mt-2 text-amber-400">
                      {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-current" />)}
                    </div>
                  </div>
                </div>

                {/* Top Right: AI Draft Card */}
                <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl p-6 shadow-xl shadow-blue-900/20 col-span-1 flex flex-col justify-between aspect-square text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                      <MessageSquareText className="w-5 h-5" />
                    </div>
                    <span className="font-semibold text-sm bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">AI Reply Draft</span>
                  </div>
                  
                  <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-md border border-white/10 mt-auto">
                    <div className="flex gap-1 text-amber-300 mb-2">
                      {[1,2,3,4,5].map(i => <Star key={i} className="w-3 h-3 fill-current" />)}
                    </div>
                    <p className="text-sm font-medium leading-relaxed opacity-90 line-clamp-2">
                      "Thank you so much for the wonderful feedback! We're thrilled you enjoyed..."
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button className="flex-1 bg-white text-blue-600 rounded-xl py-2 text-xs font-bold">Approve</button>
                      <button className="w-10 bg-white/20 rounded-xl flex items-center justify-center"><CheckCircle2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>

                {/* Bottom Full Width: Realtime Feed */}
                <div className="bg-white rounded-3xl p-6 bento-shadow border border-slate-100 col-span-2 relative overflow-hidden">
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <h3 className="font-bold text-slate-900">Live Review Feed</h3>
                    </div>
                    <span className="text-xs font-semibold text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">Last 24h</span>
                  </div>
                  
                  <div className="space-y-4">
                    {[
                      { name: "Sarah Jenkins", time: "2m ago", text: "Best coffee in Austin! The new seasonal blend is incredible.", via: "QR Code" },
                      { name: "Michael Chen", time: "15m ago", text: "Super fast service and really friendly staff. Will be back.", via: "NFC Tap" },
                    ].map((review, i) => (
                      <motion.div 
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 + (i * 0.1) }}
                        className="flex gap-4 items-start group"
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-200 to-slate-100 shrink-0 border border-slate-200 flex items-center justify-center text-slate-500 font-bold text-sm">
                          {review.name.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-baseline mb-1">
                            <h4 className="font-bold text-slate-900 text-sm">{review.name}</h4>
                            <span className="text-xs text-slate-400 font-medium">{review.time}</span>
                          </div>
                          <div className="flex gap-0.5 text-amber-400 mb-1.5">
                            {[1,2,3,4,5].map(s => <Star key={s} className="w-3 h-3 fill-current" />)}
                          </div>
                          <p className="text-sm text-slate-600 leading-snug">{review.text}</p>
                          <div className="mt-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {review.via === "QR Code" ? <QrCode className="w-3 h-3" /> : <Smartphone className="w-3 h-3" />}
                            Via {review.via}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  
                  {/* Fade out bottom */}
                  <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                </div>
              </div>

              {/* Decorative Floating Badges */}
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-6 -right-6 bg-white border border-slate-100 shadow-xl rounded-2xl p-3 flex items-center gap-3 z-20"
              >
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                  <QrCode className="w-4 h-4" />
                </div>
                <div className="pr-2">
                  <div className="text-xs font-bold text-slate-900">QR Generated</div>
                  <div className="text-[10px] font-semibold text-slate-400">Ready to print</div>
                </div>
              </motion.div>
            </motion.div>

          </div>
        </div>
      </div>
    </>
  );
}
