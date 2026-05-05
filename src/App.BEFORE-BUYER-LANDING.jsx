import React, { useState } from "react";
import AppCore from "./AppCore.jsx";

export default function App() {
  const [entered, setEntered] = useState(false);

  if (entered) {
    return <AppCore />;
  }

  return <AgvSplashPage onEnter={() => setEntered(true)} />;
}

function AgvSplashPage({ onEnter }) {
  return (
    <div style={styles.page}>
      <div style={styles.goldGlow}></div>
      <div style={styles.blueGlow}></div>

      <main style={styles.shell}>
        <section style={styles.hero}>
          <div style={styles.badge}>AVANT GLOBAL VISION</div>

          <h1 style={styles.title}>
            The Premium Digital Stage
            <br />
            for Live Events
          </h1>

          <p style={styles.subtitle}>
            Host conventions, teaching sessions, broadcasts, church events,
            media rooms, private meetings, and global viewer experiences from
            one professional platform.
          </p>

          <div style={styles.buttonRow}>
            <button style={styles.primaryButton} onClick={onEnter}>
              Enter Platform
            </button>

            <button style={styles.secondaryButton} onClick={onEnter}>
              Continue to Rooms
            </button>
          </div>
        </section>

        <section style={styles.stagePreview}>
          <div style={styles.stageTop}>
            <span style={styles.liveDot}></span>
            AGV LIVE STAGE
          </div>

          <div style={styles.stageScreen}>
            <div style={styles.stageInner}>
              <div style={styles.cameraBox}>HOST CAMERA</div>
              <div style={styles.screenBox}>SCREEN SHARE / PRESENTATION</div>
            </div>
          </div>

          <div style={styles.roomStrip}>
            <span>Main Hall</span>
            <span>Studio A</span>
            <span>Radio Room</span>
            <span>Teaching Room</span>
          </div>
        </section>

        <section style={styles.features}>
          <Feature
            title="Stage-First Broadcasting"
            text="Designed around a professional live stage, not a basic meeting grid."
          />

          <Feature
            title="Room-Based Events"
            text="Create the feel of a digital convention center with multiple rooms and controlled access."
          />

          <Feature
            title="Viewer-Safe Experience"
            text="Guests can watch, follow, chat, and receive updates without touching host controls."
          />
        </section>
      </main>
    </div>
  );
}

function Feature({ title, text }) {
  return (
    <div style={styles.featureCard}>
      <h3 style={styles.featureTitle}>{title}</h3>
      <p style={styles.featureText}>{text}</p>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    width: "100%",
    background:
      "radial-gradient(circle at top left, rgba(250,204,21,0.20), transparent 32%), linear-gradient(135deg, #050b16 0%, #071526 45%, #111827 100%)",
    color: "#f8fafc",
    fontFamily:
      "Inter, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
    position: "relative",
    overflow: "hidden",
    padding: 24,
    boxSizing: "border-box",
  },

  goldGlow: {
    position: "absolute",
    width: 420,
    height: 420,
    borderRadius: "50%",
    right: -140,
    top: 80,
    background: "rgba(250,204,21,0.18)",
    filter: "blur(80px)",
  },

  blueGlow: {
    position: "absolute",
    width: 520,
    height: 520,
    borderRadius: "50%",
    left: -180,
    bottom: -180,
    background: "rgba(37,99,235,0.18)",
    filter: "blur(90px)",
  },

  shell: {
    position: "relative",
    zIndex: 2,
    maxWidth: 1240,
    margin: "0 auto",
    minHeight: "calc(100vh - 48px)",
    display: "grid",
    gridTemplateColumns: "1fr",
    alignContent: "center",
    gap: 24,
  },

  hero: {
    textAlign: "center",
    padding: "32px 12px 10px",
  },

  badge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "9px 16px",
    borderRadius: 999,
    border: "1px solid rgba(250,204,21,0.65)",
    color: "#facc15",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: "0.18em",
    marginBottom: 22,
    background: "rgba(250,204,21,0.08)",
  },

  title: {
    margin: 0,
    fontSize: "clamp(40px, 7vw, 82px)",
    lineHeight: 0.95,
    fontWeight: 950,
    letterSpacing: "-0.06em",
  },

  subtitle: {
    maxWidth: 820,
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
    marginTop: 34,
  },

  primaryButton: {
    border: "none",
    borderRadius: 16,
    padding: "15px 24px",
    fontSize: 16,
    fontWeight: 900,
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
  },

  stagePreview: {
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(7,17,31,0.76)",
    borderRadius: 28,
    padding: 18,
    boxShadow: "0 28px 80px rgba(0,0,0,0.38)",
    backdropFilter: "blur(18px)",
  },

  stageTop: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    color: "#e2e8f0",
    fontSize: 13,
    fontWeight: 900,
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

  stageScreen: {
    aspectRatio: "16 / 7",
    minHeight: 240,
    borderRadius: 22,
    border: "1px solid rgba(250,204,21,0.24)",
    background:
      "linear-gradient(135deg, rgba(15,23,42,0.98), rgba(30,41,59,0.92))",
    padding: 16,
    boxSizing: "border-box",
  },

  stageInner: {
    height: "100%",
    display: "grid",
    gridTemplateColumns: "0.8fr 1.4fr",
    gap: 16,
  },

  cameraBox: {
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.14)",
    background:
      "linear-gradient(135deg, rgba(15,23,42,1), rgba(2,6,23,1))",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#94a3b8",
    fontWeight: 900,
    letterSpacing: "0.08em",
    textAlign: "center",
    padding: 12,
  },

  screenBox: {
    borderRadius: 18,
    border: "1px solid rgba(250,204,21,0.26)",
    background:
      "radial-gradient(circle at center, rgba(250,204,21,0.12), transparent 42%), rgba(15,23,42,0.95)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#f8fafc",
    fontWeight: 950,
    letterSpacing: "0.08em",
    textAlign: "center",
    padding: 12,
  },

  roomStrip: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 10,
    marginTop: 14,
  },

  features: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 16,
  },

  featureCard: {
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    borderRadius: 22,
    padding: 22,
  },

  featureTitle: {
    margin: "0 0 8px",
    fontSize: 18,
    color: "#f8fafc",
  },

  featureText: {
    margin: 0,
    color: "#cbd5e1",
    lineHeight: 1.5,
    fontSize: 15,
  },
};