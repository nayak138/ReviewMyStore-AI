import { Star, MessageSquareText, Mail, Filter, Search, MoreHorizontal, QrCode, Smartphone, Download, Zap, TrendingUp, Users, Target } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ReviewInboxSection() {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-xs font-semibold uppercase tracking-wider mb-4 border border-blue-500/20">
            Coming soon
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6 text-foreground">A beautiful inbox for your reputation</h2>
          <p className="text-lg text-muted-foreground">
            Coming soon: manage Google Reviews like you manage email. Filter by rating, location, or status, and respond to everything from one central hub. Preview below is illustrative.
          </p>
        </div>

        {/* Realistic Dashboard Mockup */}
        <div className="rounded-2xl border border-border bg-card shadow-2xl overflow-hidden max-w-6xl mx-auto text-left">
          {/* Header */}
          <div className="h-14 border-b border-border bg-background flex items-center justify-between px-4">
            <div className="flex items-center gap-4">
              <Mail className="w-5 h-5 text-muted-foreground" />
              <div className="font-medium text-foreground">Review Inbox</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <div className="h-8 w-64 bg-muted/50 rounded-md border border-border pl-9 flex items-center text-sm text-muted-foreground">Search reviews...</div>
              </div>
            </div>
          </div>
          {/* Body */}
          <div className="flex h-[500px]">
            {/* Sidebar */}
            <div className="w-64 border-r border-border bg-background/50 p-4 hidden md:block space-y-1">
              <div className="px-3 py-2 bg-primary/10 text-primary font-medium rounded-lg text-sm flex justify-between">
                <span>Needs Attention</span>
                <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">12</span>
              </div>
              <div className="px-3 py-2 hover:bg-muted text-foreground font-medium rounded-lg text-sm flex justify-between cursor-pointer">
                <span>Unread</span>
                <span className="text-muted-foreground text-xs">4</span>
              </div>
              <div className="px-3 py-2 hover:bg-muted text-foreground font-medium rounded-lg text-sm cursor-pointer">All Reviews</div>
              <div className="px-3 py-2 hover:bg-muted text-foreground font-medium rounded-lg text-sm cursor-pointer">Positive Reviews</div>
              <div className="px-3 py-2 hover:bg-muted text-foreground font-medium rounded-lg text-sm cursor-pointer">Negative Reviews</div>
              <div className="mt-8 mb-2 px-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Filters</div>
              <div className="px-3 py-1.5 flex items-center gap-2 text-sm text-muted-foreground"><Filter className="w-3 h-3" /> Location: Austin</div>
              <div className="px-3 py-1.5 flex items-center gap-2 text-sm text-muted-foreground"><Filter className="w-3 h-3" /> Rating: 5 Star</div>
            </div>
            {/* List */}
            <div className="flex-1 flex flex-col bg-card">
              <div className="border-b border-border p-2 flex justify-between items-center bg-background/80">
                <div className="flex gap-2">
                  <div className="h-8 w-8 bg-muted rounded flex items-center justify-center"><MoreHorizontal className="w-4 h-4 text-muted-foreground" /></div>
                </div>
                <div className="text-xs text-muted-foreground">1-50 of 1,248</div>
              </div>
              <div className="flex-1 overflow-hidden flex flex-col">
                {/* Active Review Row */}
                <div className="flex p-4 border-b border-border bg-primary/5 cursor-pointer relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold shrink-0">JD</div>
                  <div className="ml-4 flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <div className="font-semibold text-foreground">John Doe <span className="text-xs text-muted-foreground font-normal ml-2">2 days ago</span></div>
                      <div className="flex text-amber-400"><Star className="w-3 h-3 fill-current"/><Star className="w-3 h-3 fill-current"/><Star className="w-3 h-3 fill-current"/><Star className="w-3 h-3 fill-current"/><Star className="w-3 h-3 fill-current"/></div>
                    </div>
                    <p className="text-sm text-foreground/80 line-clamp-1 font-medium">Absolutely incredible experience! The staff was super friendly and the coffee was the best I've had in Austin.</p>
                  </div>
                </div>
                {/* Other Rows */}
                {[1,2,3,4].map(i => (
                  <div key={i} className="flex p-4 border-b border-border hover:bg-muted/30 cursor-pointer">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold shrink-0">M</div>
                    <div className="ml-4 flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <div className="font-medium text-foreground">Maria S. <span className="text-xs text-muted-foreground font-normal ml-2">1 week ago</span></div>
                        <div className="flex text-amber-400"><Star className="w-3 h-3 fill-current"/><Star className="w-3 h-3 fill-current"/><Star className="w-3 h-3 fill-current"/><Star className="w-3 h-3 fill-current"/><Star className="w-3 h-3 text-muted/30"/></div>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">Great place, good atmosphere. Service was a bit slow today but otherwise fine.</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Detail Panel */}
            <div className="w-80 border-l border-border bg-background hidden lg:flex flex-col">
              <div className="p-6 border-b border-border flex-1 overflow-y-auto">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex text-amber-400 gap-0.5"><Star className="w-4 h-4 fill-current"/><Star className="w-4 h-4 fill-current"/><Star className="w-4 h-4 fill-current"/><Star className="w-4 h-4 fill-current"/><Star className="w-4 h-4 fill-current"/></div>
                  <span className="text-xs text-muted-foreground">Google</span>
                </div>
                <p className="text-sm text-foreground leading-relaxed mb-6">"Absolutely incredible experience! The staff was super friendly and the coffee was the best I've had in Austin. Will definitely be coming back every morning!"</p>
                
                <div className="border-t border-border pt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">AI Suggested Reply</span>
                  </div>
                  <div className="bg-card border border-border rounded-lg p-3 text-sm text-muted-foreground relative mb-3">
                    Hi John! Thank you so much for the 5-star review. We're thrilled to hear you loved the coffee and our friendly staff. We look forward to seeing you every morning in Austin! ☕
                    <div className="absolute top-2 right-2 bg-background border border-border text-[10px] px-1.5 py-0.5 rounded text-muted-foreground">Friendly</div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">Publish Reply</Button>
                    <Button size="sm" variant="outline" className="px-2"><MoreHorizontal className="w-4 h-4"/></Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function AiReplyDemoSection() {
  return (
    <section className="py-24 bg-zinc-50 dark:bg-zinc-900/30 border-y border-border">
      <div className="container mx-auto px-4 lg:px-8">
         <div className="flex flex-col lg:flex-row items-center gap-16 max-w-6xl mx-auto">
           <div className="flex-1 space-y-6">
             <div className="inline-flex items-center px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold uppercase tracking-wider border border-amber-500/20">
               Coming soon
             </div>
             <h2 className="text-3xl lg:text-4xl font-bold text-foreground">AI that speaks your brand's language</h2>
             <p className="text-lg text-muted-foreground leading-relaxed">
               On our roadmap: AI-drafted replies to your reviews that analyze sentiment and match your industry and brand voice. The demo below is an illustrative preview.
             </p>
             <div className="flex flex-wrap gap-2 pt-2">
               {["Professional", "Friendly", "Luxury", "Restaurant", "Clinic", "Retail"].map(style => (
                 <span key={style} className="px-3 py-1 bg-background border border-border rounded-full text-sm font-medium text-foreground shadow-sm">
                   {style}
                 </span>
               ))}
             </div>
           </div>
           <div className="flex-1 w-full bg-card border border-border p-6 rounded-2xl shadow-xl">
             <div className="space-y-4 text-left">
                <div className="bg-muted/30 rounded-xl p-4">
                  <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Customer Review</div>
                  <div className="text-sm font-medium text-foreground">"The facial treatment was incredibly relaxing, but I had to wait 15 minutes past my appointment time."</div>
                  <div className="flex text-amber-400 mt-2"><Star className="w-3 h-3 fill-current"/><Star className="w-3 h-3 fill-current"/><Star className="w-3 h-3 fill-current"/><Star className="w-3 h-3 fill-current"/><Star className="w-3 h-3 text-muted"/></div>
                </div>
                
                <div className="relative pl-6 border-l-2 border-primary/20 space-y-4 py-2">
                  <div className="absolute -left-[11px] top-1/2 -translate-y-1/2 w-5 h-5 bg-background border-2 border-primary rounded-full flex items-center justify-center"><Zap className="w-3 h-3 text-primary" /></div>
                  
                  <div className="bg-background border border-border rounded-xl p-4 shadow-sm relative hover:border-primary/50 transition-colors cursor-pointer ring-1 ring-primary/20">
                    <div className="absolute -top-2.5 right-4 bg-background px-2 text-[10px] font-bold text-primary uppercase border border-primary/20 rounded">Professional (Clinic)</div>
                    <div className="text-sm text-foreground/90">Thank you for your feedback. We are delighted you enjoyed the facial treatment. We sincerely apologize for the 15-minute wait, as we strive to maintain a punctual schedule for all our clients. We have shared this with our front desk team.</div>
                  </div>
                  
                  <div className="bg-background border border-border rounded-xl p-4 shadow-sm relative opacity-60 hover:opacity-100 transition-opacity cursor-pointer">
                    <div className="absolute -top-2.5 right-4 bg-background px-2 text-[10px] font-bold text-muted-foreground uppercase border border-border rounded">Warm & Friendly</div>
                    <div className="text-sm text-foreground/90">Hi there! So glad the facial was relaxing for you! 💆‍♀️ We're so sorry about the short wait at reception today—we got a little backed up, but we'll make sure to be faster next time you visit us!</div>
                  </div>
                </div>
             </div>
           </div>
         </div>
      </div>
    </section>
  );
}

export function QrNfcSection() {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4 lg:px-8 text-center max-w-5xl">
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6 text-foreground">Bridge the physical and digital world</h2>
        <p className="text-lg text-muted-foreground mb-16 max-w-2xl mx-auto">
          No apps. No searching. Just a simple tap or scan to open your exact Google Review page. Print your own materials or register your own NFC devices.
        </p>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-card border border-border rounded-2xl p-8 hover:shadow-xl transition-shadow flex flex-col items-center text-center">
            <div className="w-48 h-48 bg-white p-4 rounded-xl shadow-sm border border-border mb-8 rotate-3 hover:rotate-0 transition-transform">
              {/* Fake QR visual */}
              <div className="w-full h-full border-4 border-black p-2 flex flex-wrap relative bg-white">
                <div className="w-8 h-8 bg-black absolute top-2 left-2"></div>
                <div className="w-8 h-8 bg-black absolute top-2 right-2"></div>
                <div className="w-8 h-8 bg-black absolute bottom-2 left-2"></div>
                <div className="grid grid-cols-4 grid-rows-4 gap-1 w-full h-full p-10">
                  {[...Array(16)].map((_, i) => <div key={i} className={`bg-black ${i%3===0 ? 'opacity-0' : 'opacity-100'}`}></div>)}
                </div>
              </div>
            </div>
            <h3 className="text-2xl font-bold mb-3 text-foreground">Dynamic QR Codes</h3>
            <p className="text-muted-foreground mb-6">High-res codes that route to our smart redirect engine. Change the destination anytime without reprinting.</p>
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-muted text-foreground rounded-md text-xs font-medium"><Download className="inline w-3 h-3 mr-1"/> PNG</span>
              <span className="px-3 py-1 bg-muted text-foreground rounded-md text-xs font-medium"><Download className="inline w-3 h-3 mr-1"/> SVG</span>
              <span className="px-3 py-1 bg-muted text-foreground rounded-md text-xs font-medium"><Download className="inline w-3 h-3 mr-1"/> PDF</span>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-8 hover:shadow-xl transition-shadow flex flex-col items-center text-center">
            <div className="relative w-48 h-48 mb-8 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full blur-2xl"></div>
              <div className="w-32 h-44 bg-zinc-900 border-4 border-zinc-800 rounded-2xl shadow-2xl relative overflow-hidden flex flex-col items-center justify-center -rotate-6 hover:rotate-0 transition-transform">
                <Smartphone className="w-12 h-12 text-white/20 mb-2" />
                <span className="text-white font-bold tracking-widest uppercase text-xs">Tap Here</span>
                <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent"></div>
              </div>
            </div>
            <h3 className="text-2xl font-bold mb-3 text-foreground">NFC Tags & Cards</h3>
            <p className="text-muted-foreground mb-6">Works with any standard NFC tag, card, or standee — register it in your dashboard and assign it to a campaign. Tap any modern phone to review.</p>
            <div className="flex gap-2 text-sm font-medium text-primary">
              Works with iOS & Android
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function AnalyticsSection() {
  return (
    <section className="py-24 bg-zinc-50 dark:bg-zinc-900/20 border-t border-border">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 w-full order-2 lg:order-1">
            <div className="bg-card border border-border rounded-xl shadow-2xl p-6 relative">
              <div className="flex justify-between items-center mb-6">
                <h4 className="font-semibold text-foreground flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Growth Analytics</h4>
                <div className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">Last 30 Days</div>
              </div>
              <div className="flex gap-4 mb-6">
                <div className="flex-1 bg-background border border-border rounded-lg p-3">
                  <div className="text-xs text-muted-foreground mb-1">New Reviews</div>
                  <div className="text-xl font-bold text-foreground">+124 <span className="text-xs font-normal text-emerald-500 ml-1">↑ 12%</span></div>
                </div>
                <div className="flex-1 bg-background border border-border rounded-lg p-3">
                  <div className="text-xs text-muted-foreground mb-1">Scan to Review</div>
                  <div className="text-xl font-bold text-foreground">34.2% <span className="text-xs font-normal text-emerald-500 ml-1">↑ 5%</span></div>
                </div>
              </div>
              <div className="h-32 bg-background border border-border rounded-lg flex items-end p-2 gap-1 mb-6">
                {/* Fake bar chart */}
                {[4, 7, 5, 8, 12, 15, 10, 14, 18, 24, 20, 25].map((h, i) => (
                  <div key={i} className="flex-1 bg-primary/20 hover:bg-primary/40 rounded-t-sm transition-colors" style={{ height: `${h * 4}%` }}></div>
                ))}
              </div>
              <div>
                <h5 className="text-sm font-semibold mb-3 text-foreground">Top Campaigns</h5>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm p-2 bg-background rounded border border-border">
                    <div className="flex items-center gap-2 text-foreground"><QrCode className="w-4 h-4 text-muted-foreground"/> Table Tents</div>
                    <div className="font-medium text-foreground">456 scans</div>
                  </div>
                  <div className="flex justify-between items-center text-sm p-2 bg-background rounded border border-border">
                    <div className="flex items-center gap-2 text-foreground"><Smartphone className="w-4 h-4 text-muted-foreground"/> Front Desk NFC</div>
                    <div className="font-medium text-foreground">289 taps</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex-1 space-y-6 order-1 lg:order-2">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 text-xs font-semibold uppercase tracking-wider border border-fuchsia-500/20">
              Coming soon
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground">Measure what matters</h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              We're building an analytics dashboard that gives you crystal clear visibility into your reputation engine — which locations and campaigns drive the most reviews. Preview shown is illustrative.
            </p>
            <ul className="space-y-3 pt-2">
              <li className="flex items-center gap-3 text-foreground"><Users className="w-5 h-5 text-primary" /> <span className="font-medium">Scan & Tap Tracking</span></li>
              <li className="flex items-center gap-3 text-foreground"><Target className="w-5 h-5 text-primary" /> <span className="font-medium">Conversion Tracking</span></li>
              <li className="flex items-center gap-3 text-foreground"><TrendingUp className="w-5 h-5 text-primary" /> <span className="font-medium">Rating Trajectory</span></li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
