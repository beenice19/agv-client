import React, { useState } from "react";
import AppCore from "./AppCore.jsx";

export default function App() {
  const [entered, setEntered] = useState(false);
  const [ticketApproved, setTicketApproved] = useState(false);

  if (entered && !ticketApproved) {
    return <TicketGate onApproved={() => setTicketApproved(true)} />;
  }

  if (entered && ticketApproved) {
    return <AppCore />;
  }

  return <AgvLandingPage onEnter={() => setEntered(true)} />;
}
function TicketGate({ onApproved }) {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);

  async function verifyTicket() {
    setWorking(true);
    setMessage("");

    try {
      const response = await fetch("https://tourist-chan-elliott-realized.trycloudflare.com/api/tickets/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (!data.ok) {
        setMessage(data.message || "Ticket failed.");
        setWorking(false);
        return;
      }

      localStorage.setItem("agv_ticket_code", code.trim().toUpperCase());
      onApproved();
    } catch (error) {
      setMessage("Ticket server is not running on port 8790.");
    }

    setWorking(false);
  }

  return (
    <div style={styles.page}>
      <div style={styles.goldGlow}></div>

      <main style={styles.finalCta}>
        <div style={styles.badge}>AGV TICKET ACCESS</div>

        <h1 style={styles.ctaTitle}>Enter your event ticket code</h1>

        <p style={styles.ctaText}>
          Paid guests receive an AGV ticket code before entering the live platform.
        </p>

        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Example: AGV-F2BG5J"
          style={{
            width: "min(420px, 100%)",
            marginTop: 24,
            padding: "16px 18px",
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.18)",
            background: "rgba(255,255,255,0.08)",
            color: "#fff",
            fontSize: 18,
            fontWeight: 800,
            textAlign: "center",
          }}
        />

        {message ? (
          <p style={{ color: "#fca5a5", fontWeight: 800 }}>{message}</p>
        ) : null}

        <div style={styles.buttonRow}>
          <button style={styles.primaryButton} onClick={verifyTicket}>
            {working ? "Checking..." : "Verify Ticket"}
          </button>
        </div>
      </main>
    </div>
  );
}

function AgvLandingPage({ onEnter }) {
  return (
    <div style={styles.page}>
      <div style={styles.goldGlow}></div>
      <div style={styles.blueGlow}></div>

      <header style={styles.nav}>
        <div style={styles.brand}>
          <div style={styles.logoMark}>AGV</div>
          <div>
            <div style={styles.brandName}>Avant Global Vision</div>
            <div style={styles.brandSub}>Digital Convention + Broadcast Platform</div>
          </div>
        </div>

        <button style={styles.navButton} onClick={onEnter}>
          Client Login
        </button>
      </header>

      <main style={styles.shell}>
        <section style={styles.hero}>
          <div style={styles.badge}>SELL ACCESS TO YOUR DIGITAL EVENT</div>

          <h1 style={styles.title}>
            Turn your live event into a professional online venue.
          </h1>

          <p style={styles.subtitle}>
            AGV helps churches, educators, creators, promoters, and organizations
            host ticketed live events, teaching sessions, conferences, and
            broadcast-style productions from one branded digital stage.
          </p>

          <div style={styles.buttonRow}>
            <button style={styles.primaryButton} onClick={onEnter}>
              Enter Live Platform
            </button>

            <a style={styles.secondaryButton} href="mailto:info@agvision.show?subject=AGV%20Demo%20Request">
              Book a Demo
            </a>
          </div>

          <div style={styles.trustRow}>
            <span>Built for ticketed events</span>
            <span>Room-based access</span>
            <span>Host-controlled stage</span>
          </div>
        </section>

        <section style={styles.previewCard}>
          <div style={styles.previewTop}>
            <span style={styles.liveDot}></span>
            AGV LIVE EVENT STAGE
          </div>

          <div style={styles.stageMock}>
            <div style={styles.hostBox}>HOST CAMERA</div>
            <div style={styles.mainScreen}>
              PRESENTATION / SCREEN SHARE / LIVE TEACHING
            </div>
          </div>

          <div style={styles.roomStrip}>
            <span>Main Hall</span>
            <span>Workshop Room</span>
            <span>Media Studio</span>
            <span>Private Session</span>
          </div>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Who AGV is built for</h2>

          <div style={styles.grid3}>
            <Card
              title="Churches & Ministries"
              text="Host services, conferences, revivals, teaching sessions, and private leadership rooms."
            />
            <Card
              title="Promoters & Event Hosts"
              text="Sell access to live shows, panels, conventions, seminars, and exclusive online events."
            />
            <Card
              title="Educators & Coaches"
              text="Run paid classes, workshops, training events, and group teaching sessions."
            />
          </div>
        </section>

        <section style={styles.revenueSection}>
          <div>
            <h2 style={styles.sectionTitle}>Designed to make money</h2>
            <p style={styles.revenueText}>
              AGV is not just a meeting room. It is a digital venue where hosts
              can sell tickets, control access, run multiple rooms, and present
              a professional branded experience.
            </p>
          </div>

          <div style={styles.priceCard}>
            <div style={styles.priceLabel}>Example Event Revenue</div>
            <div style={styles.priceBig}>500 guests × $15</div>
            <div style={styles.priceAmount}>$7,500 event potential</div>
          </div>
        </section>

        <section style={styles.grid3}>
          <Card
            title="Stage-first experience"
            text="The audience sees a professional stage instead of a basic meeting grid."
          />
          <Card
            title="Viewer-safe controls"
            text="Guests can watch and participate without access to host tools."
          />
          <Card
            title="Digital venue model"
            text="Rooms can represent halls, studios, classes, lounges, and private event spaces."
          />
        </section>

        <section style={styles.finalCta}>
          <h2 style={styles.ctaTitle}>Ready to host your next digital event?</h2>
          <p style={styles.ctaText}>
            Enter the live platform or request a demo to see how AGV can support
            your event, audience, and revenue plan.
          </p>

          <div style={styles.buttonRow}>
            <button style={styles.primaryButton} onClick={onEnter}>
              Enter Platform
            </button>

            <a style={styles.secondaryButton} href="mailto:info@agvision.show?subject=AGV%20Buyer%20Inquiry">
              Contact Sales
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}

function Card({ title, text }) {
  return (
    <div style={styles.card}>
      <h3 style={styles.cardTitle}>{title}</h3>
      <p style={styles.cardText}>{text}</p>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    width: "100%",
    background:
      "radial-gradient(circle at top left, rgba(250,204,21,0.20), transparent 34%), linear-gradient(135deg, #050b16 0%, #071526 44%, #111827 100%)",
    color: "#f8fafc",
    fontFamily:
      "Inter, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
    position: "relative",
    overflowX: "hidden",
    padding: 24,
    boxSizing: "border-box",
  },

  goldGlow: {
    position: "absolute",
    width: 460,
    height: 460,
    borderRadius: "50%",
    right: -160,
    top: 120,
    background: "rgba(250,204,21,0.18)",
    filter: "blur(90px)",
  },

  blueGlow: {
    position: "absolute",
    width: 520,
    height: 520,
    borderRadius: "50%",
    left: -180,
    bottom: 240,
    background: "rgba(37,99,235,0.18)",
    filter: "blur(90px)",
  },

  nav: {
    position: "relative",
    zIndex: 5,
    maxWidth: 1240,
    margin: "0 auto 28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },

  brand: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },

  logoMark: {
    width: 48,
    height: 48,
    borderRadius: 16,
    background: "linear-gradient(135deg, #facc15, #c99a3b)",
    color: "#07111f",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 950,
    boxShadow: "0 16px 36px rgba(250,204,21,0.18)",
  },

  brandName: {
    fontSize: 18,
    fontWeight: 950,
    letterSpacing: "-0.02em",
  },

  brandSub: {
    color: "#94a3b8",
    fontSize: 13,
    marginTop: 2,
  },

  navButton: {
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: 14,
    padding: "12px 18px",
    background: "rgba(255,255,255,0.07)",
    color: "#f8fafc",
    fontWeight: 850,
    cursor: "pointer",
  },

  shell: {
    position: "relative",
    zIndex: 2,
    maxWidth: 1240,
    margin: "0 auto",
    display: "grid",
    gap: 26,
  },

  hero: {
    textAlign: "center",
    padding: "40px 12px 12px",
  },

  badge: {
    display: "inline-flex",
    padding: "9px 16px",
    borderRadius: 999,
    border: "1px solid rgba(250,204,21,0.65)",
    color: "#facc15",
    fontSize: 12,
    fontWeight: 950,
    letterSpacing: "0.16em",
    marginBottom: 22,
    background: "rgba(250,204,21,0.08)",
  },

  title: {
    maxWidth: 980,
    margin: "0 auto",
    fontSize: "clamp(40px, 7vw, 78px)",
    lineHeight: 0.96,
    fontWeight: 950,
    letterSpacing: "-0.065em",
  },

  subtitle: {
    maxWidth: 850,
    margin: "24px auto 0",
    color: "#cbd5e1",
    fontSize: "clamp(17px, 2vw, 22px)",
    lineHeight: 1.55,
  },

  buttonRow: {
    display: "flex",
    justifyContent: "center",
    gap: 14,
    flexWrap: "wrap",
    marginTop: 32,
  },

  primaryButton: {
    border: "none",
    borderRadius: 16,
    padding: "15px 24px",
    fontSize: 16,
    fontWeight: 950,
    cursor: "pointer",
    background: "linear-gradient(135deg, #facc15, #c99a3b)",
    color: "#06111f",
    boxShadow: "0 18px 42px rgba(250,204,21,0.22)",
  },

  secondaryButton: {
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: 16,
    padding: "15px 24px",
    fontSize: 16,
    fontWeight: 850,
    cursor: "pointer",
    background: "rgba(255,255,255,0.07)",
    color: "#f8fafc",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },

  trustRow: {
    marginTop: 28,
    display: "flex",
    justifyContent: "center",
    gap: 12,
    flexWrap: "wrap",
    color: "#cbd5e1",
    fontSize: 14,
  },

  previewCard: {
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(7,17,31,0.76)",
    borderRadius: 28,
    padding: 18,
    boxShadow: "0 28px 80px rgba(0,0,0,0.38)",
    backdropFilter: "blur(18px)",
  },

  previewTop: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    color: "#e2e8f0",
    fontSize: 13,
    fontWeight: 950,
    letterSpacing: "0.12em",
    marginBottom: 14,
  },

  liveDot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: "#ef4444",
    boxShadow: "0 0 18px rgba(239,68,68,0.85)",
  },

  stageMock: {
    minHeight: 280,
    borderRadius: 22,
    border: "1px solid rgba(250,204,21,0.24)",
    background:
      "linear-gradient(135deg, rgba(15,23,42,0.98), rgba(30,41,59,0.92))",
    padding: 16,
    boxSizing: "border-box",
    display: "grid",
    gridTemplateColumns: "0.8fr 1.4fr",
    gap: 16,
  },

  hostBox: {
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.14)",
    background:
      "linear-gradient(135deg, rgba(15,23,42,1), rgba(2,6,23,1))",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#94a3b8",
    fontWeight: 950,
    letterSpacing: "0.08em",
    textAlign: "center",
    padding: 12,
  },

  mainScreen: {
    borderRadius: 18,
    border: "1px solid rgba(250,204,21,0.26)",
    background:
      "radial-gradient(circle at center, rgba(250,204,21,0.13), transparent 42%), rgba(15,23,42,0.95)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#f8fafc",
    fontWeight: 950,
    letterSpacing: "0.08em",
    textAlign: "center",
    padding: 18,
  },

  roomStrip: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 10,
    marginTop: 14,
  },

  section: {
    paddingTop: 8,
  },

  sectionTitle: {
    margin: "0 0 16px",
    fontSize: "clamp(28px, 4vw, 44px)",
    lineHeight: 1.05,
    fontWeight: 950,
    letterSpacing: "-0.04em",
  },

  grid3: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 16,
  },

  card: {
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    borderRadius: 22,
    padding: 22,
  },

  cardTitle: {
    margin: "0 0 8px",
    fontSize: 19,
    color: "#f8fafc",
  },

  cardText: {
    margin: 0,
    color: "#cbd5e1",
    lineHeight: 1.55,
    fontSize: 15,
  },

  revenueSection: {
    border: "1px solid rgba(250,204,21,0.22)",
    background:
      "linear-gradient(135deg, rgba(250,204,21,0.10), rgba(255,255,255,0.05))",
    borderRadius: 28,
    padding: 28,
    display: "grid",
    gridTemplateColumns: "1.3fr 0.7fr",
    gap: 18,
    alignItems: "center",
  },

  revenueText: {
    color: "#cbd5e1",
    lineHeight: 1.6,
    fontSize: 17,
    margin: 0,
  },

  priceCard: {
    borderRadius: 24,
    background: "rgba(2,6,23,0.72)",
    border: "1px solid rgba(255,255,255,0.13)",
    padding: 22,
  },

  priceLabel: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: 850,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },

  priceBig: {
    marginTop: 12,
    fontSize: 24,
    fontWeight: 950,
  },

  priceAmount: {
    marginTop: 6,
    color: "#facc15",
    fontSize: 22,
    fontWeight: 950,
  },

  finalCta: {
    textAlign: "center",
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    borderRadius: 28,
    padding: "38px 24px",
    marginBottom: 30,
  },

  ctaTitle: {
    margin: 0,
    fontSize: "clamp(30px, 4vw, 48px)",
    fontWeight: 950,
    letterSpacing: "-0.04em",
  },

  ctaText: {
    maxWidth: 720,
    margin: "16px auto 0",
    color: "#cbd5e1",
    fontSize: 17,
    lineHeight: 1.55,
  },
};