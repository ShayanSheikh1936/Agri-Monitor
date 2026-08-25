import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  ScanLine,
  Droplets,
  Sprout,
  FlaskConical,
  ShieldAlert,
  FlaskRound,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import Backnavigate from "../components/BackNavigate";
import styles from "./services.module.css";

/* ─── data ─── */
const services = [
  {
    id: "crop-health",
    icon: ScanLine,
    title: "Crop Health",
    desc: "AI-powered disease and pest detection. Snap a photo and get instant diagnosis with treatment recommendations tailored to your crop.",
  },
  {
    id: "smart-irrigation",
    icon: Droplets,
    title: "Smart Irrigation",
    desc: "Precision watering schedules based on evapotranspiration data, soil moisture levels, and real-time weather forecasts for your field.",
  },
  {
    id: "nutrients",
    icon: Sprout,
    title: "Nutrients",
    desc: "Comprehensive nutrient management plans with optimal timing and exact dosage for Nitrogen, Phosphorus, Potassium, and micronutrients.",
  },
  {
    id: "fertilizers",
    icon: FlaskConical,
    title: "Fertilizers",
    desc: "Smart fertilizer recommendations calibrated to your soil type, crop stage, and weather — maximize yield while minimizing waste.",
  },
  {
    id: "pesticides",
    icon: ShieldAlert,
    title: "Pesticides",
    desc: "Community-powered regional pest outbreak alerts with AI-driven spray schedules and safe application guidelines.",
  },
  {
    id: "soil-testing",
    icon: FlaskRound,
    title: "Soil Testing",
    desc: "In-depth soil health analysis including pH, organic matter, and nutrient levels with actionable improvement recommendations.",
  },
];

/* ─── animation hook ─── */
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
      { threshold: 0.12, ...options }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

/* ─── main component ─── */
export default function Services() {
  const [gridRef, gridVisible] = useInView();
  const [ctaRef, ctaVisible] = useInView();

  return (
    <div className={styles.page}>
      {/* Back Navigate */}
      <Backnavigate href="/" />

      {/* ════════ HERO ════════ */}
      <section className={styles.hero}>
        <h1 className={`${styles.heroTitle} bebas-neue-regular`}>
          Our Services
        </h1>
        <p className={styles.heroSub}>
          Six AI-driven tools designed to monitor, predict, and optimize every
          stage of your crop — from soil preparation to harvest. Explore how
          AgriMonitor empowers Pakistani farmers.
        </p>
      </section>

      {/* ════════ SERVICES GRID ════════ */}
      <section ref={gridRef} className={styles.gridSection}>
        <div
          className={styles.gridHeader}
          style={{
            opacity: gridVisible ? 1 : 0,
            transform: gridVisible ? "translateY(0)" : "translateY(30px)",
            transition: "all 0.7s ease",
          }}
        >
          <span className={styles.gridTag}>What We Offer</span>
          <h2 className={`${styles.gridHeading} bebas-neue-regular`}>
            Six Tools. One Platform.
          </h2>
        </div>

        <div className={styles.cardGrid}>
          {services.map((s, i) => {
            const Icon = s.icon;
            return (
              <Link
                key={s.id}
                to={`/services/${s.id}`}
                className={styles.card}
                style={{
                  opacity: gridVisible ? 1 : 0,
                  transform: gridVisible ? "translateY(0)" : "translateY(40px)",
                  transition: `all 0.5s ease ${i * 100}ms`,
                }}
              >
                <div className={styles.cardIcon}>
                  <Icon size={28} />
                </div>
                <h3 className={`${styles.cardTitle} bebas-neue-regular`}>
                  {s.title}
                </h3>
                <p className={styles.cardDesc}>{s.desc}</p>
                <span className={styles.cardLink}>
                  Learn More <ChevronRight size={16} />
                </span>
                <div className={styles.cardBar} />
              </Link>
            );
          })}
        </div>
      </section>

      {/* ════════ CTA ════════ */}
      <section
        ref={ctaRef}
        className={styles.ctaSection}
      >
        <div className={styles.ctaCircle1} />
        <div className={styles.ctaCircle2} />
        <div
          style={{
            opacity: ctaVisible ? 1 : 0,
            transform: ctaVisible ? "translateY(0)" : "translateY(30px)",
            transition: "all 0.7s ease",
          }}
        >
          <h2 className={`${styles.ctaHeading} bebas-neue-regular`}>
            Ready to Grow Smarter?
          </h2>
          <p className={styles.ctaText}>
            Join thousands of Pakistani farmers already using AgriMonitor to
            optimize yields, save water, and reduce costs.
          </p>
          <Link to="/signup" className={styles.ctaBtn}>
            Get Started Free <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}
