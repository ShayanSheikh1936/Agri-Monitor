import { useState, useEffect, useRef } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import {
  ScanLine,
  Droplets,
  Sprout,
  FlaskConical,
  ShieldAlert,
  FlaskRound,
  ArrowRight,
  CheckCircle2,
  Camera,
  BarChart3,
  Bell,
  History,
  ThermometerSun,
  Gauge,
  CloudRain,
  TrendingDown,
  Leaf,
  CalendarClock,
  Beaker,
  Target,
  Layers,
  Bug,
  MapPin,
  Shield,
  TestTubes,
  Microscope,
  FileText,
} from "lucide-react";
import Backnavigate from "../components/BackNavigate";
import styles from "./services.module.css";

/* ─── service data ─── */
const serviceData = {
  "crop-health": {
    title: "Crop Health",
    tagline: "Diagnose crop diseases and pest damage in seconds with AI.",
    heroImg: "https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=1400&q=80",
    overviewImg: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&q=80",
    icon: ScanLine,
    overview: [
      "Our AI-powered Crop Health service uses advanced computer vision models trained on thousands of plant disease samples. Simply capture a photo of your crop's affected leaves, stems, or fruit, and receive an instant diagnosis.",
      "The system identifies over 38 common diseases and pest damages across wheat, rice, cotton, sugarcane, maize, and vegetables grown in Pakistan. Each diagnosis comes with actionable treatment recommendations, including organic and chemical options.",
    ],
    benefits: [
      { icon: Camera, title: "Photo-Based Diagnosis", desc: "Snap a photo and get results in under 5 seconds — no lab wait times." },
      { icon: Bug, title: "Pest Recognition", desc: "Identify common Pakistani crop pests with treatment suggestions." },
      { icon: History, title: "Scan History Log", desc: "Track every scan per crop with timestamps and recovery notes." },
      { icon: Bell, title: "Outbreak Alerts", desc: "Regional pest and disease alerts from the farming community." },
      { icon: BarChart3, title: "Health Analytics", desc: "Monitor crop health trends over the entire growing season." },
      { icon: Shield, title: "Offline Mode", desc: "Scan works offline and syncs results when connectivity returns." },
    ],
    steps: [
      { title: "Capture", desc: "Open the app and take a clear photo of the affected crop area." },
      { title: "Analyze", desc: "Our AI model processes the image against 38+ disease patterns." },
      { title: "Act", desc: "Receive diagnosis, treatment plan, and preventive tips instantly." },
    ],
    cta: "Protect Your Crops Today",
    ctaSub: "Early detection saves up to 40% of potential yield loss. Start scanning your crops now.",
  },
  "smart-irrigation": {
    title: "Smart Irrigation",
    tagline: "Every drop counts — water smarter, grow better.",
    heroImg: "https://images.unsplash.com/photo-1625245488600-f03fef636a3c?w=1400&q=80",
    overviewImg: "https://images.unsplash.com/photo-1530538987395-032d1800fdd4?w=800&q=80",
    icon: Droplets,
    overview: [
      "Our Smart Irrigation engine calculates the exact daily water volume your crops need based on real-time evapotranspiration rates, soil moisture sensor data, and localized weather forecasts.",
      "By integrating with Pakistan Meteorological Department data and on-field IoT sensors, the system automatically adjusts irrigation schedules when rain is expected — preventing overwatering and conserving precious water resources.",
    ],
    benefits: [
      { icon: ThermometerSun, title: "ET-Based Scheduling", desc: "Daily water needs calculated from evapotranspiration data." },
      { icon: Gauge, title: "Soil Moisture Integration", desc: "Real-time sensor data for precision watering decisions." },
      { icon: CloudRain, title: "Rainfall Adjustment", desc: "Automatic schedule updates when rain is in the forecast." },
      { icon: TrendingDown, title: "Water Savings", desc: "Farmers save an average of 30% on water usage." },
      { icon: BarChart3, title: "Usage Analytics", desc: "Track daily, weekly, and seasonal water consumption patterns." },
      { icon: CalendarClock, title: "Automated Timeline", desc: "Full-season irrigation calendar generated at planting." },
    ],
    steps: [
      { title: "Setup", desc: "Register your crop type, field size, and soil characteristics." },
      { title: "Monitor", desc: "Sensors and weather data feed the irrigation engine daily." },
      { title: "Optimize", desc: "Receive precise water volume recommendations with timing." },
    ],
    cta: "Save Water. Boost Yield.",
    ctaSub: "Smart irrigation can reduce water usage by 30% while increasing crop yield. Start optimizing today.",
  },
  nutrients: {
    title: "Nutrients",
    tagline: "Precision nutrition for every growth stage.",
    heroImg: "https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=1400&q=80",
    overviewImg: "https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?w=800&q=80",
    icon: Sprout,
    overview: [
      "The Nutrient Management service provides a comprehensive feeding plan for your crops from germination through harvest. Based on soil test results, crop type, and yield targets, the system calculates exact nutrient requirements.",
      "Get precise recommendations for macro-nutrients (Nitrogen, Phosphorus, Potassium) and micro-nutrients (Zinc, Boron, Iron) with application dates calibrated to your crop's growth timeline and local climate conditions.",
    ],
    benefits: [
      { icon: Leaf, title: "Growth-Stage Based", desc: "Nutrient plans aligned to each phase of crop development." },
      { icon: Target, title: "Exact Dosage", desc: "Precise kg per acre calculations to prevent soil degradation." },
      { icon: CalendarClock, title: "Timing Optimization", desc: "Know the exact dates to apply each nutrient for max absorption." },
      { icon: Beaker, title: "Micro-Nutrients", desc: "Zinc, Boron, Iron recommendations based on soil deficiency." },
      { icon: BarChart3, title: "Yield Correlation", desc: "Track how nutrient plans impact your harvest quality and volume." },
      { icon: Layers, title: "Soil Integration", desc: "Plans adjust based on latest soil test results automatically." },
    ],
    steps: [
      { title: "Test", desc: "Upload your soil test report or enter recent nutrient levels." },
      { title: "Plan", desc: "AI generates a full-season nutrient calendar for your crop." },
      { title: "Apply", desc: "Follow timed recommendations for optimal nutrient uptake." },
    ],
    cta: "Feed Your Soil. Feed Your Future.",
    ctaSub: "Balanced nutrition is the foundation of high-yield farming. Get your custom nutrient plan now.",
  },
  fertilizers: {
    title: "Fertilizers",
    tagline: "Right fertilizer, right time, right amount.",
    heroImg: "https://images.unsplash.com/photo-1586771107445-b3e7eb4e0a54?w=1400&q=80",
    overviewImg: "https://images.unsplash.com/photo-1625245488600-f03fef636a3c?w=800&q=80",
    icon: FlaskConical,
    overview: [
      "Our Fertilizer Recommendation engine takes the guesswork out of feeding your crops. By analyzing soil composition, crop nutrient demand curves, and weather patterns, the system recommends the most effective fertilizer types and quantities.",
      "Whether you're using Urea, DAP, SOP, or organic alternatives, the platform provides a complete fertilizer schedule that maximizes nutrient use efficiency while minimizing environmental impact and input costs.",
    ],
    benefits: [
      { icon: FlaskConical, title: "Fertilizer Matching", desc: "Urea, DAP, SOP, and organic options matched to your soil needs." },
      { icon: Target, title: "Quantity Precision", desc: "Exact kg per application to avoid over-fertilization damage." },
      { icon: CloudRain, title: "Weather-Aware", desc: "Schedules adjust based on rainfall to prevent nutrient runoff." },
      { icon: CalendarClock, title: "Application Calendar", desc: "Full-season schedule with specific dates for each application." },
      { icon: TrendingDown, title: "Cost Reduction", desc: "Reduce fertilizer waste by up to 25% with precision application." },
      { icon: Leaf, title: "Eco-Friendly", desc: "Minimize environmental impact with optimized nutrient delivery." },
    ],
    steps: [
      { title: "Input", desc: "Enter your soil type, crop, and current fertilizer regimen." },
      { title: "Calculate", desc: "AI cross-references soil data with crop demand curves." },
      { title: "Schedule", desc: "Get a complete fertilizer calendar with product recommendations." },
    ],
    cta: "Maximize Every Bag of Fertilizer",
    ctaSub: "Stop wasting inputs. Get a precision fertilizer plan tailored to your field.",
  },
  pesticides: {
    title: "Pesticides",
    tagline: "Smart pest management for safer, healthier crops.",
    heroImg: "https://images.unsplash.com/photo-1592982537447-6f2a6a0c7c18?w=1400&q=80",
    overviewImg: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&q=80",
    icon: ShieldAlert,
    overview: [
      "The Pesticides service combines AI-driven pest identification with community-powered outbreak surveillance. When pests are detected in your region, you receive early warnings so you can take preventive action before damage spreads.",
      "The system provides safe application guidelines, pre-harvest intervals, and integrated pest management (IPM) strategies that reduce chemical dependency while protecting your crop from devastating pest outbreaks.",
    ],
    benefits: [
      { icon: Bug, title: "Pest Identification", desc: "AI identifies common Pakistani crop pests from photos." },
      { icon: MapPin, title: "Regional Alerts", desc: "Community-reported pest outbreaks mapped in real-time." },
      { icon: Shield, title: "Safe Application", desc: "Dosage guidelines and pre-harvest interval reminders." },
      { icon: Leaf, title: "IPM Strategies", desc: "Integrated pest management combining biological and chemical controls." },
      { icon: Bell, title: "Early Warnings", desc: "Get notified before pest swarms reach your fields." },
      { icon: History, title: "Spray History", desc: "Log every application with product, dosage, and date records." },
    ],
    steps: [
      { title: "Detect", desc: "Report or identify a pest through the app's AI scanner." },
      { title: "Alert", desc: "Regional outbreak maps update in real-time for your area." },
      { title: "Protect", desc: "Follow AI-recommended spray schedules and IPM strategies." },
    ],
    cta: "Stay Ahead of Pest Threats",
    ctaSub: "Early detection and community alerts can prevent devastating crop losses. Join the network today.",
  },
  "soil-testing": {
    title: "Soil Testing",
    tagline: "Know your soil — unlock your field's true potential.",
    heroImg: "https://images.unsplash.com/photo-1500937386664-56d1df388b80?w=1400&q=80",
    overviewImg: "https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?w=800&q=80",
    icon: FlaskRound,
    overview: [
      "Our Soil Testing service provides a comprehensive analysis of your field's health. Upload your lab report or use our guided testing kit to measure pH, organic matter, electrical conductivity, and key nutrient levels.",
      "Based on the results, the AI generates a Soil Health Score and provides actionable recommendations for soil amendment, crop rotation, and long-term fertility management tailored to your region's climate and farming practices.",
    ],
    benefits: [
      { icon: Beaker, title: "pH Analysis", desc: "Precise soil pH measurement with amendment recommendations." },
      { icon: Layers, title: "Organic Matter", desc: "Track soil organic carbon and its impact on fertility." },
      { icon: Microscope, title: "Nutrient Profiling", desc: "N, P, K, and micro-nutrient levels mapped across your field." },
      { icon: FileText, title: "Health Score", desc: "A single score summarizing your soil's overall productivity." },
      { icon: Sprout, title: "Crop Matching", desc: "AI suggests the best crops for your soil's current condition." },
      { icon: TrendingDown, title: "Improvement Plan", desc: "Step-by-step soil amendment strategy over multiple seasons." },
    ],
    steps: [
      { title: "Collect", desc: "Gather soil samples from different zones of your field." },
      { title: "Analyze", desc: "Upload lab results or use our guided testing kit for readings." },
      { title: "Improve", desc: "Follow the AI-generated soil health improvement roadmap." },
    ],
    cta: "Build Healthy Soil. Grow More.",
    ctaSub: "Healthy soil is the foundation of every great harvest. Start your soil assessment today.",
  },
};

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
export default function ServiceDetail() {
  const { serviceId } = useParams();
  const service = serviceData[serviceId];

  const [overviewRef, overviewVisible] = useInView();
  const [benefitsRef, benefitsVisible] = useInView();
  const [howRef, howVisible] = useInView();
  const [ctaRef, ctaVisible] = useInView();

  // If the serviceId doesn't match any service, redirect to /services
  if (!service) {
    return <Navigate to="/" replace />;
  }

  const Icon = service.icon;

  return (
    <div className={styles.page}>
      {/* Back Navigate */}
      <Backnavigate href="/" />

      {/* ════════ DETAIL HERO ════════ */}
      <section className={styles.detailHero}>
        <div className={styles.detailHeroBg} style={{ backgroundImage: `url(${service.heroImg})` }} />
        <div className={styles.detailHeroOverlay} />
        <div className={styles.detailHeroContent}>
          <span className={styles.detailHeroTag}>AgriMonitor Service</span>
          <h1 className={`${styles.detailHeroTitle} bebas-neue-regular`}>
            {service.title}
          </h1>
          <p className={styles.detailHeroSub}>{service.tagline}</p>
        </div>
      </section>

      {/* ════════ OVERVIEW ════════ */}
      <section
        ref={overviewRef}
        className={styles.overviewSection}
        style={{
          opacity: overviewVisible ? 1 : 0,
          transform: overviewVisible ? "translateY(0)" : "translateY(40px)",
          transition: "all 0.7s ease",
        }}
      >
        <div className={styles.overviewImg}>
          <img src={service.overviewImg} alt={service.title} loading="lazy" />
        </div>
        <div className={styles.overviewText}>
          <h2 className="bebas-neue-regular">Overview</h2>
          {service.overview.map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      </section>

      {/* ════════ KEY BENEFITS ════════ */}
      <section ref={benefitsRef} className={styles.benefitsSection}>
        <div className={styles.benefitsInner}>
          <div
            className={styles.benefitsHeader}
            style={{
              opacity: benefitsVisible ? 1 : 0,
              transform: benefitsVisible ? "translateY(0)" : "translateY(30px)",
              transition: "all 0.7s ease",
            }}
          >
            <span className={styles.benefitsTag}>Why It Matters</span>
            <h2 className={`${styles.benefitsHeading} bebas-neue-regular`}>
              Key Benefits
            </h2>
          </div>

          <div className={styles.benefitsGrid}>
            {service.benefits.map((b, i) => {
              const BIcon = b.icon;
              return (
                <div
                  key={b.title}
                  className={styles.benefitCard}
                  style={{
                    opacity: benefitsVisible ? 1 : 0,
                    transform: benefitsVisible ? "translateY(0)" : "translateY(30px)",
                    transition: `all 0.5s ease ${i * 80}ms`,
                  }}
                >
                  <div className={styles.benefitIcon}>
                    <BIcon size={22} />
                  </div>
                  <h4 className={styles.benefitTitle}>{b.title}</h4>
                  <p className={styles.benefitDesc}>{b.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ════════ HOW IT WORKS ════════ */}
      <section ref={howRef} className={styles.howSection}>
        <div className={styles.howInner}>
          <div
            className={styles.howHeader}
            style={{
              opacity: howVisible ? 1 : 0,
              transform: howVisible ? "translateY(0)" : "translateY(30px)",
              transition: "all 0.7s ease",
            }}
          >
            <span className={styles.howTag}>Simple Process</span>
            <h2 className={`${styles.howHeading} bebas-neue-regular`}>
              How It Works
            </h2>
          </div>

          <div className={styles.howSteps}>
            {service.steps.map((step, i) => (
              <div
                key={step.title}
                className={styles.howStep}
                style={{
                  opacity: howVisible ? 1 : 0,
                  transform: howVisible ? "translateY(0)" : "translateY(30px)",
                  transition: `all 0.5s ease ${i * 120}ms`,
                }}
              >
                <div className={styles.howStepNum}>{i + 1}</div>
                <h4 className={styles.howStepTitle}>{step.title}</h4>
                <p className={styles.howStepDesc}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ CTA ════════ */}
      <section
        ref={ctaRef}
        className={styles.detailCta}
        style={{
          opacity: ctaVisible ? 1 : 0,
          transform: ctaVisible ? "translateY(0)" : "translateY(30px)",
          transition: "all 0.7s ease",
        }}
      >
        <h2 className="bebas-neue-regular">{service.cta}</h2>
        <p>{service.ctaSub}</p>
        <Link to="/signup" className={styles.detailCtaBtn}>
          Get Started Free <ArrowRight size={18} />
        </Link>
      </section>
    </div>
  );
}
