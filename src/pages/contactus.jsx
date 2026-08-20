import { useState } from "react";
import Navbar, { Navbar2 } from "../components/navbar";
import Footer from "../components/footer";
import styles from "./contactus.module.css";
import {
  Send,
  MapPin,
  Phone,
  Mail,
  Clock,
  MessageCircle,
  Leaf,
  ShieldCheck,
  Headphones,
  Sprout,
} from "lucide-react";

export default function ContactUs() {
  const [scrolled, setScrolled] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  // Navbar scroll behaviour (same pattern as Home page)
  if (typeof window !== "undefined") {
    window.addEventListener("scroll", () => {
      setScrolled(window.scrollY > 100);
    });
  }

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  function handleSubmit(e) {
    e.preventDefault();
    setSubmitted(true);
    setFormData({ name: "", email: "", subject: "", message: "" });
    setTimeout(() => setSubmitted(false), 4000);
  }

  return (
    <>
      

      <div className={styles.page}>
        {/* ── Hero Banner ── */}
        <section className={styles.hero}>
          <h1 className={`${styles.heroTitle} bebas-neue-regular`}>
            Get In Touch
          </h1>
          <p className={styles.heroSub}>
            Have a question about our AI agriculture platform? Need help setting
            up your farm dashboard? We are here to support Pakistani farmers
            every step of the way.
          </p>
        </section>

        {/* ── Form + Info Grid ── */}
        <section className={styles.content}>
          {/* Contact Form */}
          <div className={styles.formCard}>
            <h2 className="bebas-neue-regular">Send Us a Message</h2>
            <p>
              Fill out the form below and our team will get back to you within
              24 hours.
            </p>

            {submitted && (
              <div
                style={{
                  background: "rgba(103,153,54,0.12)",
                  border: "1px solid #679936",
                  borderRadius: "0.6rem",
                  padding: "0.85rem 1rem",
                  marginBottom: "1.25rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  color: "#4D7429",
                  fontWeight: 500,
                }}
              >
                <ShieldCheck size={20} />
                Your message has been sent successfully!
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className={styles.fieldGroup}>
                <div className={styles.field}>
                  <label htmlFor="name">Full Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    placeholder="e.g. Shayan Sheikh"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className={styles.field}>
                  <label htmlFor="email">Email Address</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    placeholder="e.g. shayan@gmail.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className={styles.field}>
                  <label htmlFor="subject">Subject</label>
                  <select
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                  >
                    <option value="" disabled>
                      Select a topic…
                    </option>
                    <option value="general">General Inquiry</option>
                    <option value="support">Technical Support</option>
                    <option value="crop">Crop Advisory</option>
                    <option value="partnership">
                      Partnership / Business
                    </option>
                    <option value="feedback">Feedback / Suggestion</option>
                  </select>
                </div>

                <div className={styles.field}>
                  <label htmlFor="message">Your Message</label>
                  <textarea
                    id="message"
                    name="message"
                    placeholder="Tell us how we can help you…"
                    value={formData.message}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <button type="submit" className={styles.submitBtn}>
                <Send size={18} />
                Send Message
              </button>
            </form>
          </div>

          {/* ── Info Sidebar ── */}
          <div className={styles.infoSidebar}>
            
            {/* Why Reach Out */}
            <div className={styles.infoCard}>
              <h3>
                <Headphones size={22} /> Why Reach Out?
              </h3>
              <div className={styles.infoRow}>
                <div className={styles.infoIcon}>
                  <Sprout size={20} />
                </div>
                <div className={styles.infoText}>
                  <strong>Crop Disease Help</strong>
                  <span>
                    Upload a photo and our AI will diagnose the issue within
                    minutes.
                  </span>
                </div>
              </div>
              <div className={styles.infoRow}>
                <div className={styles.infoIcon}>
                  <MessageCircle size={20} />
                </div>
                <div className={styles.infoText}>
                  <strong>Live Chat Support</strong>
                  <span>
                    Use the chatbot on our home page for instant answers to
                    common questions.
                  </span>
                </div>
              </div>
              <div className={styles.infoRow}>
                <div className={styles.infoIcon}>
                  <ShieldCheck size={20} />
                </div>
                <div className={styles.infoText}>
                  <strong>Account & Billing</strong>
                  <span>
                    Having trouble with your dashboard or subscription? We will
                    sort it out.
                  </span>
                </div>
              </div>
            </div>

            {/* Map Placeholder */}
            
          </div>
        </section>

        {/* ── FAQ Section ── */}
        <section className={styles.faqSection}>
          <h2 className="bebas-neue-regular">Frequently Asked Questions</h2>
          <div className={styles.faqGrid}>
            <div className={styles.faqItem}>
              <h4>How do I start monitoring my crops?</h4>
              <p>
                Sign up for a free account, select your crop type, enter your
                planting date, and our AI dashboard will generate a complete
                growth timeline with daily recommendations.
              </p>
            </div>
            <div className={styles.faqItem}>
              <h4>Is Agri Monitor free to use?</h4>
              <p>
                Yes! Our basic crop monitoring and weather alerts are
                completely free. Premium features like advanced soil analytics
                and market pricing are available in our Pro plan.
              </p>
            </div>
            <div className={styles.faqItem}>
              <h4>Which crops are supported?</h4>
              <p>
                We currently support wheat, rice, cotton, sugarcane, maize, and
                several vegetable crops commonly grown across Pakistan.
              </p>
            </div>
            <div className={styles.faqItem}>
              <h4>Can I get alerts on my phone?</h4>
              <p>
                Absolutely. Once you create an account and set up your farm,
                you will receive SMS and push notifications for weather
                warnings, irrigation reminders, and pest alerts.
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
