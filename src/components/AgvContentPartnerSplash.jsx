import React from "react";

// PASS CP-MARKETING-01 PUBLIC CONTENT PARTNER SPLASH
const STEPS = [
  {
    number: "01",
    title: "Create Channel",
    text: "Establish your AGV Network content identity and channel profile.",
  },
  {
    number: "02",
    title: "Verify Identity",
    text: "Provide accurate partner and organization information for review.",
  },
  {
    number: "03",
    title: "Film Details",
    text: "Describe your film, documentary, series, news, or educational program.",
  },
  {
    number: "04",
    title: "Rights & Ownership",
    text: "Document the authority and rights required for AGV review.",
  },
  {
    number: "05",
    title: "Upload Files",
    text: "Prepare your feature file, poster, trailer, captions, and supporting materials.",
  },
  {
    number: "06",
    title: "Release Setup",
    text: "Choose your preferred presentation and release approach.",
  },
  {
    number: "07",
    title: "Review & Submit",
    text: "Send the completed package into AGV's controlled review process.",
  },
];

const PARTNER_TYPES = [
  {
    title: "Independent Filmmakers",
    text: "Submit feature films, short films, series, and original productions.",
  },
  {
    title: "Documentary Producers",
    text: "Bring historical, cultural, educational, and investigative work to AGV.",
  },
  {
    title: "Journalists",
    text: "Present independent reporting, interviews, briefings, and local coverage.",
  },
  {
    title: "Educators",
    text: "Distribute teaching, training, classroom, and professional-learning programs.",
  },
  {
    title: "Ministries",
    text: "Share sermons, conferences, faith programming, and community outreach.",
  },
  {
    title: "Content Owners",
    text: "Submit rights-cleared libraries, archives, and specialized programming.",
  },
];

const styles = {
  page: {
    minHeight: "100vh",
    color: "#f8fafc",
    background:
      "radial-gradient(circle at 15% 5%, rgba(212,175,55,0.18), transparent 30%), radial-gradient(circle at 85% 15%, rgba(59,130,246,0.15), transparent 28%), linear-gradient(180deg, #020817 0%, #07122a 46%, #020817 100%)",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },

  shell: {
    width: "min(1180px, calc(100% - 32px))",
    margin: "0 auto",
  },

  header: {
    position: "sticky",
    top: 0,
    zIndex: 20,
    borderBottom: "1px solid rgba(212,175,55,0.18)",
    background: "rgba(2,8,23,0.9)",
    backdropFilter: "blur(16px)",
  },

  headerInner: {
    minHeight: 72,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 18,
    flexWrap: "wrap",
  },

  brandButton: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    border: 0,
    padding: 0,
    background: "transparent",
    color: "#f8fafc",
    cursor: "pointer",
    textAlign: "left",
  },

  logo: {
    width: 44,
    height: 44,
    display: "grid",
    placeItems: "center",
    borderRadius: 12,
    border: "1px solid rgba(250,204,21,0.52)",
    background:
      "linear-gradient(145deg, rgba(212,175,55,0.28), rgba(112,79,10,0.26))",
    color: "#fde68a",
    fontWeight: 950,
    letterSpacing: "0.04em",
  },

  eyebrow: {
    color: "#fde68a",
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: "0.16em",
    textTransform: "uppercase",
  },

  headerActions: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
  },

  primaryButton: {
    minHeight: 46,
    padding: "0 18px",
    borderRadius: 12,
    border: "1px solid rgba(250,204,21,0.72)",
    background:
      "linear-gradient(145deg, #f4d35e, #b88a16)",
    color: "#07122a",
    fontWeight: 950,
    cursor: "pointer",
    boxShadow: "0 12px 26px rgba(212,175,55,0.2)",
  },

  secondaryButton: {
    minHeight: 46,
    padding: "0 18px",
    borderRadius: 12,
    border: "1px solid rgba(148,163,184,0.3)",
    background: "rgba(15,23,42,0.76)",
    color: "#e2e8f0",
    fontWeight: 850,
    cursor: "pointer",
  },

  hero: {
    padding: "86px 0 72px",
  },

  heroGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(min(100%, 420px), 1fr))",
    alignItems: "center",
    gap: 42,
  },

  badge: {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 32,
    padding: "0 12px",
    borderRadius: 999,
    border: "1px solid rgba(250,204,21,0.36)",
    background: "rgba(113,83,14,0.2)",
    color: "#fde68a",
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: "0.11em",
    textTransform: "uppercase",
  },

  headline: {
    margin: "18px 0 16px",
    maxWidth: 740,
    fontSize: "clamp(42px, 7vw, 78px)",
    lineHeight: 0.98,
    letterSpacing: "-0.045em",
    fontWeight: 950,
  },

  goldText: {
    color: "#f5d66f",
  },

  heroText: {
    margin: 0,
    maxWidth: 700,
    color: "#cbd5e1",
    fontSize: "clamp(17px, 2vw, 21px)",
    lineHeight: 1.72,
  },

  heroActions: {
    marginTop: 28,
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
  },

  heroCard: {
    padding: 26,
    borderRadius: 24,
    border: "1px solid rgba(212,175,55,0.36)",
    background:
      "linear-gradient(145deg, rgba(7,18,42,0.96), rgba(15,23,42,0.9))",
    boxShadow: "0 26px 70px rgba(0,0,0,0.36)",
  },

  heroCardTitle: {
    margin: "12px 0 8px",
    fontSize: 26,
  },

  pipeline: {
    marginTop: 20,
    display: "grid",
    gap: 10,
  },

  pipelineRow: {
    display: "grid",
    gridTemplateColumns: "38px 1fr",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 13,
    border: "1px solid rgba(148,163,184,0.16)",
    background: "rgba(2,8,23,0.42)",
  },

  pipelineNumber: {
    width: 38,
    height: 38,
    borderRadius: 11,
    display: "grid",
    placeItems: "center",
    background: "rgba(212,175,55,0.14)",
    color: "#fde68a",
    fontWeight: 950,
  },

  section: {
    padding: "70px 0",
  },

  sectionAlt: {
    padding: "70px 0",
    borderTop: "1px solid rgba(148,163,184,0.1)",
    borderBottom: "1px solid rgba(148,163,184,0.1)",
    background: "rgba(2,8,23,0.3)",
  },

  sectionTitle: {
    margin: "12px 0 10px",
    fontSize: "clamp(32px, 5vw, 52px)",
    lineHeight: 1.04,
    letterSpacing: "-0.035em",
  },

  sectionText: {
    margin: 0,
    maxWidth: 760,
    color: "#94a3b8",
    fontSize: 17,
    lineHeight: 1.7,
  },

  grid: {
    marginTop: 32,
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 16,
  },

  card: {
    padding: 20,
    borderRadius: 18,
    border: "1px solid rgba(148,163,184,0.17)",
    background:
      "linear-gradient(145deg, rgba(15,23,42,0.82), rgba(7,18,42,0.76))",
  },

  cardTitle: {
    margin: 0,
    color: "#f8fafc",
    fontSize: 18,
  },

  cardText: {
    margin: "9px 0 0",
    color: "#94a3b8",
    lineHeight: 1.62,
    fontSize: 14,
  },

  stepCard: {
    padding: 20,
    borderRadius: 18,
    border: "1px solid rgba(212,175,55,0.22)",
    background:
      "linear-gradient(145deg, rgba(7,18,42,0.96), rgba(15,23,42,0.82))",
  },

  stepNumber: {
    color: "#fde68a",
    fontSize: 12,
    fontWeight: 950,
    letterSpacing: "0.12em",
  },

  callout: {
    padding: "36px clamp(22px, 5vw, 54px)",
    borderRadius: 26,
    border: "1px solid rgba(250,204,21,0.42)",
    background:
      "radial-gradient(circle at 100% 0%, rgba(59,130,246,0.18), transparent 36%), linear-gradient(145deg, rgba(16,38,78,0.98), rgba(7,18,42,0.98))",
    boxShadow: "0 26px 70px rgba(0,0,0,0.3)",
  },

  footer: {
    padding: "34px 0 42px",
    color: "#64748b",
    fontSize: 13,
    textAlign: "center",
  },
};

export default function AgvContentPartnerSplash() {
  const openPortal = () => {
    window.location.href = "/content-partner";
  };

  const openNetwork = () => {
    window.location.href = "/agv-network";
  };

  const scrollToProcess = () => {
    document
      .getElementById("partner-process")
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  };

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div style={{ ...styles.shell, ...styles.headerInner }}>
          <button
            type="button"
            style={styles.brandButton}
            onClick={openNetwork}
          >
            <span style={styles.logo}>AGV</span>

            <span>
              <span
                style={{
                  display: "block",
                  fontWeight: 950,
                  fontSize: 16,
                }}
              >
                AGV Content Partners
              </span>

              <span
                style={{
                  display: "block",
                  marginTop: 2,
                  color: "#94a3b8",
                  fontSize: 11,
                }}
              >
                Independent content onboarding
              </span>
            </span>
          </button>

          <div style={styles.headerActions}>
            <button
              type="button"
              style={styles.secondaryButton}
              onClick={openNetwork}
            >
              Explore AGV Network
            </button>

            <button
              type="button"
              style={styles.primaryButton}
              onClick={openPortal}
            >
              Start Your Submission
            </button>
          </div>
        </div>
      </header>

      <section style={styles.hero}>
        <div style={{ ...styles.shell, ...styles.heroGrid }}>
          <div>
            <div style={styles.badge}>
              AGV Network Content Partner Program
            </div>

            <h1 style={styles.headline}>
              Bring your story to{" "}
              <span style={styles.goldText}>AGV Network.</span>
            </h1>

            <p style={styles.heroText}>
              AGV gives independent filmmakers, journalists,
              educators, ministries, documentary producers, and
              content owners a controlled path to submit,
              review, prepare, and release programming.
            </p>

            <div style={styles.heroActions}>
              <button
                type="button"
                style={{
                  ...styles.primaryButton,
                  minHeight: 54,
                  padding: "0 24px",
                  fontSize: 15,
                }}
                onClick={openPortal}
              >
                Become an AGV Content Partner
              </button>

              <button
                type="button"
                style={{
                  ...styles.secondaryButton,
                  minHeight: 54,
                  padding: "0 24px",
                  fontSize: 15,
                }}
                onClick={scrollToProcess}
              >
                See How It Works
              </button>
            </div>
          </div>

          <aside style={styles.heroCard}>
            <div style={styles.eyebrow}>
              Controlled publishing pathway
            </div>

            <h2 style={styles.heroCardTitle}>
              From submission to Founder review
            </h2>

            <p style={styles.cardText}>
              Your submission enters AGV's protected media
              intake and review system. Nothing becomes public
              automatically.
            </p>

            <div style={styles.pipeline}>
              {[
                "Partner onboarding",
                "Secure media intake",
                "Rights and technical review",
                "Founder decision",
                "Approved AGV Network release",
              ].map((label, index) => (
                <div key={label} style={styles.pipelineRow}>
                  <div style={styles.pipelineNumber}>
                    {index + 1}
                  </div>

                  <div
                    style={{
                      color: "#e2e8f0",
                      fontSize: 14,
                      fontWeight: 800,
                    }}
                  >
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section style={styles.sectionAlt}>
        <div style={styles.shell}>
          <div style={styles.eyebrow}>
            Built for independent voices
          </div>

          <h2 style={styles.sectionTitle}>
            A professional entrance into AGV Network
          </h2>

          <p style={styles.sectionText}>
            Present your work through a structured process that
            protects creators, viewers, rights holders, and AGV.
          </p>

          <div style={styles.grid}>
            {PARTNER_TYPES.map((item) => (
              <article key={item.title} style={styles.card}>
                <h3 style={styles.cardTitle}>{item.title}</h3>
                <p style={styles.cardText}>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="partner-process" style={styles.section}>
        <div style={styles.shell}>
          <div style={styles.eyebrow}>
            Seven-step onboarding
          </div>

          <h2 style={styles.sectionTitle}>
            One clear path from channel creation to submission
          </h2>

          <p style={styles.sectionText}>
            The public marketing page leads directly into the
            existing AGV Content Partner Portal and its approved
            seven-step workflow.
          </p>

          <div style={styles.grid}>
            {STEPS.map((step) => (
              <article key={step.number} style={styles.stepCard}>
                <div style={styles.stepNumber}>
                  STEP {step.number}
                </div>

                <h3
                  style={{
                    ...styles.cardTitle,
                    marginTop: 10,
                  }}
                >
                  {step.title}
                </h3>

                <p style={styles.cardText}>{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.shell}>
          <div style={styles.callout}>
            <div style={styles.eyebrow}>
              Your content. Your identity. A protected process.
            </div>

            <h2
              style={{
                margin: "12px 0 10px",
                maxWidth: 760,
                fontSize: "clamp(34px, 5vw, 58px)",
                lineHeight: 1.02,
                letterSpacing: "-0.04em",
              }}
            >
              Ready to begin your AGV Content Partner submission?
            </h2>

            <p
              style={{
                ...styles.sectionText,
                color: "#cbd5e1",
              }}
            >
              Create your channel, prepare your rights
              information, upload your materials, and submit your
              program for AGV review.
            </p>

            <div style={styles.heroActions}>
              <button
                type="button"
                style={{
                  ...styles.primaryButton,
                  minHeight: 54,
                  padding: "0 24px",
                }}
                onClick={openPortal}
              >
                Enter the Partner Portal
              </button>

              <button
                type="button"
                style={{
                  ...styles.secondaryButton,
                  minHeight: 54,
                  padding: "0 24px",
                }}
                onClick={openNetwork}
              >
                Visit AGV Network
              </button>
            </div>
          </div>
        </div>
      </section>

      <footer style={styles.footer}>
        <div style={styles.shell}>
          AGV Content Partner Program · Founder-controlled review
          and publishing
        </div>
      </footer>
    </main>
  );
}
