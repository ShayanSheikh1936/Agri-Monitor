import { useState, useEffect, useRef } from "react";
import {
  ScanLine,
  Droplets,
  Timer,
  CloudRain,
  ShieldAlert,
  Wallet,
  FlaskConical,
  CalendarClock,
  ArrowRight,
  Leaf,
  ChevronRight,
  Sprout,
  BarChart3,
  Brain,
  CheckCircle2,
} from "lucide-react";

/* ─── data ─── */
const features = [
  {
    icon: ScanLine,
    title: "AI Plant Scan",
    desc: "Snap a photo and get instant disease & pest detection powered by advanced AI models.",
  },
  {
    icon: Droplets,
    title: "Smart Irrigation",
    desc: "Daily water recommendations tailored to your crop, soil type, and live weather data.",
  },
  {
    icon: Timer,
    title: "Growth Timeline",
    desc: "Track every stage from germination to harvest with a visual crop growth tracker.",
  },
  {
    icon: CloudRain,
    title: "Weather Alerts",
    desc: "Rain & humidity warnings before applying sprays or fertilizer — never waste inputs.",
  },
  {
    icon: ShieldAlert,
    title: "Early Threat Prevention",
    desc: "Community-powered regional pest outbreak alerts so you can act before damage hits.",
  },
  {
    icon: Wallet,
    title: "Cost & ROI Tracking",
    desc: "Log input costs and compare against estimated crop market value in real time.",
  },
  {
    icon: FlaskConical,
    title: "Precision Nutrient Plans",
    desc: "Optimal timing and exact dosage recommendations for every fertilizer your crop needs.",
  },
  {
    icon: CalendarClock,
    title: "Harvest Countdown",
    desc: "Real-time stage monitoring with a countdown to your estimated harvest window.",
  },
];

const steps = [
  {
    icon: Sprout,
    title: "Sign Up",
    desc: "Create your free account in seconds and set up your farm profile.",
  },
  {
    icon: Leaf,
    title: "Add Your Crops",
    desc: "Register crop types, field locations, and planting dates.",
  },
  {
    icon: Brain,
    title: "Get AI Insights",
    desc: "Receive personalized recommendations powered by weather, soil & AI.",
  },
  {
    icon: BarChart3,
    title: "Optimize & Harvest",
    desc: "Track growth, reduce waste, and maximize your yield at harvest.",
  },
];

const spotlights = [
  {
    img: "https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=800&q=80",
    title: "AI-Powered Plant Scanning",
    tagline: "Diagnose crop health in seconds, not days.",
    points: [
      "Photo-based instant disease identification",
      "Pest recognition with treatment suggestions",
      "Historical scan log for each crop",
      "Works offline — syncs when connected",
    ],
  },
  {
    img: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&q=80",
    title: "Smart Irrigation Engine",
    tagline: "Every drop counts — water smarter, grow better.",
    points: [
      "Daily water needs based on evapotranspiration",
      "Soil moisture integration for precision watering",
      "Rainfall-adjusted schedules automatically",
      "Water usage analytics & savings tracker",
    ],
  },
  {
    img: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&q=80",
    title: "Harvest Countdown & Timeline",
    tagline: "From seed to harvest — every stage, crystal clear.",
    points: [
      "Visual growth stage tracker with milestones",
      "Dynamic harvest date prediction",
      "Yield estimation based on growth data",
      "Post-harvest insights for next season planning",
    ],
  },
];

const stats = [
  { value: 10000, suffix: "+", label: "Farmers Empowered" },
  { value: 95, suffix: "%", label: "Disease Detection Accuracy" },
  { value: 30, suffix: "%", label: "Water Saved on Average" },
  { value: 50, suffix: "+", label: "Crop Types Supported" },
];

/* ─── hooks ─── */
function useInView(options = {}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.unobserve(el);
        }
      },
      { threshold: 0.15, ...options }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

function useCountUp(target, active, duration = 2000) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active) return;
    let start = 0;
    const step = target / (duration / 16);
    const id = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(id);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(id);
  }, [active, target, duration]);
  return count;
}

/* ─── sub-components ─── */
function StatCard({ value, suffix, label, delay }) {
  const [ref, visible] = useInView();
  const count = useCountUp(value, visible);
  return (
    <div
      ref={ref}
      className="flex flex-col items-center text-center px-6 py-8 transition-all duration-700"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(30px)",
        transitionDelay: `${delay}ms`,
      }}
    >
      <span className="bebas-neue-regular text-5xl md:text-6xl lg:text-7xl tracking-wide" style={{ color: "var(--text-h)" }}>
        {count.toLocaleString()}
        {suffix}
      </span>
      <span className="mt-2 text-sm md:text-base tracking-widest uppercase" style={{ color: "var(--bg)" }}>
        {label}
      </span>
    </div>
  );
}

/* ─── main component ─── */
export default function Features() {
  const [gridRef, gridVisible] = useInView();
  const [howRef, howVisible] = useInView();
  const [spot1Ref, spot1Visible] = useInView();
  const [spot2Ref, spot2Visible] = useInView();
  const [spot3Ref, spot3Visible] = useInView();
  const [ctaRef, ctaVisible] = useInView();
  const spotlightRefs = [spot1Ref, spot2Ref, spot3Ref];
  const spotlightVisible = [spot1Visible, spot2Visible, spot3Visible];

  return (
    <div className="w-full overflow-x-hidden bg-white text-black" style={{ fontFamily: "var(--sans)" }}>
       {/* ════════ HERO ════════ */}
      <section
        className="relative overflow-hidden text-center text-white"
        style={{
          background: "linear-gradient(135deg, #4D7429 0%, #679936 100%)",
          padding: "7rem 2rem 4rem",
        }}
      >
        {/* SVG pattern overlay (same as contact page) */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <h1
          className="bebas-neue-regular relative z-10"
          style={{ fontSize: "3.5rem", fontWeight: 700, letterSpacing: "2px", marginBottom: "0.75rem" }}
        >
          Ready to Transform Your Farm
        </h1>
        <p
          className="relative z-10 mx-auto"
          style={{ fontSize: "1.15rem", maxWidth: "600px", opacity: 0.9, lineHeight: 1.7 }}
        >
          Discover eight powerful AI-driven tools that monitor, predict, and optimize every stage of your crop — from seed to market.
        </p>
      </section>

      {/* ════════ FEATURES GRID ════════ */}
      <section ref={gridRef} className="py-20 md:py-28 px-6 max-w-7xl mx-auto">
        <div
          className="text-center mb-16 transition-all duration-700"
          style={{
            opacity: gridVisible ? 1 : 0,
            transform: gridVisible ? "translateY(0)" : "translateY(30px)",
          }}
        >
          <span
            className="inline-block text-xs tracking-[0.3em] uppercase mb-3 px-3 py-1 rounded-full"
            style={{ color: "var(--text1)", background: "rgba(103,153,54,0.1)" }}
          >
            What We Offer
          </span>
          <h2 className="bebas-neue-regular text-5xl md:text-6xl" style={{ color: "#000" }}>
            Eight Tools. One Platform.
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="group relative p-6 rounded-2xl border border-gray-200 bg-white cursor-default
                  transition-all duration-500 hover:scale-[1.04] hover:shadow-2xl hover:border-[var(--text1)]"
                style={{
                  opacity: gridVisible ? 1 : 0,
                  transform: gridVisible ? "translateY(0)" : "translateY(40px)",
                  transitionDelay: `${i * 80}ms`,
                }}
              >
                {/* icon circle */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors duration-300"
                  style={{ background: "rgba(103,153,54,0.1)" }}
                >
                  <Icon
                    size={24}
                    className="transition-colors duration-300"
                    style={{ color: "var(--text1)" }}
                  />
                </div>
                <h3 className="bebas-neue-regular text-2xl mb-2" style={{ color: "#000" }}>
                  {f.title}
                </h3>
                <p className="text-sm leading-relaxed text-gray-600">{f.desc}</p>

                {/* hover accent bar */}
                <div
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[3px] rounded-b-2xl
                    w-0 group-hover:w-3/4 transition-all duration-500"
                  style={{ background: "var(--text1)" }}
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* ════════ HOW IT WORKS ════════ */}
      <section
        ref={howRef}
        className="py-20 md:py-28 px-6"
        style={{ background: "var(--bg)" }}
      >
        <div className="max-w-6xl mx-auto">
          <div
            className="text-center mb-16 transition-all duration-700"
            style={{
              opacity: howVisible ? 1 : 0,
              transform: howVisible ? "translateY(0)" : "translateY(30px)",
            }}
          >
            <span
              className="inline-block text-xs tracking-[0.3em] uppercase mb-3 px-3 py-1 rounded-full"
              style={{ color: "var(--text1)", background: "rgba(103,153,54,0.15)" }}
            >
              Simple Process
            </span>
            <h2 className="bebas-neue-regular text-5xl md:text-6xl" style={{ color: "#000" }}>
              How It Works
            </h2>
          </div>

          {/* steps */}
          <div className="relative grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-6">
            {/* connecting line (desktop only) */}
            <div
              className="hidden md:block absolute top-10 left-[12%] right-[12%] h-[2px]"
              style={{ background: "rgba(103,153,54,0.3)" }}
            />
            {steps.map((s, i) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.title}
                  className="relative flex flex-col items-center text-center transition-all duration-700"
                  style={{
                    opacity: howVisible ? 1 : 0,
                    transform: howVisible ? "translateY(0)" : "translateY(40px)",
                    transitionDelay: `${i * 150}ms`,
                  }}
                >
                  {/* number badge */}
                  <div
                    className="relative z-10 w-20 h-20 rounded-full flex items-center justify-center mb-5 shadow-lg"
                    style={{ background: "var(--text1)" }}
                  >
                    <Icon size={32} style={{ color: "var(--text-h)" }} />
                  </div>
                  <span
                    className="absolute -top-1 -right-1 md:right-auto md:-top-1 md:-left-1 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold z-20 border-2"
                    style={{
                      background: "var(--bg)",
                      color: "var(--text1)",
                      borderColor: "var(--text1)",
                    }}
                  >
                    {i + 1}
                  </span>
                  <h3 className="bebas-neue-regular text-2xl mb-1" style={{ color: "#000" }}>
                    {s.title}
                  </h3>
                  <p className="text-sm text-gray-600 max-w-[220px]">{s.desc}</p>

                  {/* arrow between steps (desktop) */}
                  {i < steps.length - 1 && (
                    <ChevronRight
                      className="hidden md:block absolute top-8 -right-5 z-10"
                      size={22}
                      style={{ color: "var(--text1)" }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ════════ FEATURE SPOTLIGHTS ════════ */}
      <section className="py-20 md:py-28 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <span
            className="inline-block text-xs tracking-[0.3em] uppercase mb-3 px-3 py-1 rounded-full"
            style={{ color: "var(--text1)", background: "rgba(103,153,54,0.1)" }}
          >
            Deep Dive
          </span>
          <h2 className="bebas-neue-regular text-5xl md:text-6xl" style={{ color: "#000" }}>
            Feature Spotlight
          </h2>
        </div>

        {spotlights.map((sp, i) => {
          const isEven = i % 2 === 1;
          const vis = spotlightVisible[i];
          return (
            <div
              key={sp.title}
              ref={spotlightRefs[i]}
              className={`flex flex-col ${isEven ? "md:flex-row-reverse" : "md:flex-row"} items-center gap-10 md:gap-16 mb-24 last:mb-0
                transition-all duration-700`}
              style={{
                opacity: vis ? 1 : 0,
                transform: vis ? "translateY(0)" : "translateY(50px)",
              }}
            >
              {/* image */}
              <div className="w-full md:w-1/2 overflow-hidden rounded-2xl shadow-xl">
                <img
                  src={sp.img}
                  alt={sp.title}
                  className="w-full h-64 md:h-80 object-cover transition-transform duration-700 hover:scale-105"
                  loading="lazy"
                />
              </div>
              {/* text */}
              <div className="w-full md:w-1/2">
                <h3 className="bebas-neue-regular text-4xl md:text-5xl mb-2" style={{ color: "#000" }}>
                  {sp.title}
                </h3>
                <p className="text-lg mb-6" style={{ color: "var(--text1)" }}>
                  {sp.tagline}
                </p>
                <ul className="space-y-3">
                  {sp.points.map((pt) => (
                    <li key={pt} className="flex items-start gap-3 text-gray-700">
                      <CheckCircle2
                        size={20}
                        className="mt-0.5 shrink-0"
                        style={{ color: "var(--text1)" }}
                      />
                      <span className="text-[15px]">{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </section>

      {/* ════════ STATS ════════ */}
      <section
        className="py-20 md:py-24 px-6"
        style={{ background: "#1a1a1a" }}
      >
        <div className="max-w-6xl mx-auto text-center mb-12">
          <h2 className="bebas-neue-regular text-5xl md:text-6xl" style={{ color: "var(--text-h)" }}>
            Numbers That Speak
          </h2>
        </div>
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s, i) => (
            <StatCard key={s.label} {...s} delay={i * 120} />
          ))}
        </div>
      </section>

      {/* ════════ CTA ════════ */}
      <section
        ref={ctaRef}
        className="relative py-24 md:py-32 px-6 overflow-hidden"
        style={{ background: "var(--bg)" }}
      >
        {/* decorative circles */}
        <div
          className="absolute -top-20 -left-20 w-64 h-64 rounded-full opacity-10"
          style={{ background: "var(--text-h)" }}
        />
        <div
          className="absolute -bottom-16 -right-16 w-48 h-48 rounded-full opacity-10"
          style={{ background: "var(--text-h)" }}
        />

        <div
          className="relative z-10 max-w-3xl mx-auto text-center transition-all duration-700"
          style={{
            opacity: ctaVisible ? 1 : 0,
            transform: ctaVisible ? "translateY(0)" : "translateY(30px)",
          }}
        >
          <h2 className="bebas-neue-regular text-5xl md:text-7xl mb-4" style={{ color: "black" }}>
            Ready to Transform Your Farm?
          </h2>
          <p className="text-lg mb-10 text-green-700" >
            Join thousands of Pakistani farmers already using AgriMonitor to grow
            smarter, save water, and boost yields. It's free to get started.
          </p>
          <a
            href="/signup"
            className="bg-[#679936] text-white inline-flex items-center gap-2 px-10 py-4 rounded-full text-base font-semibold transition-all duration-300 hover:scale-105 hover:shadow-xl"
            
          >
            Get Started Free <ArrowRight size={18} />
          </a>
        </div>
      </section>
    </div>
  );
}
