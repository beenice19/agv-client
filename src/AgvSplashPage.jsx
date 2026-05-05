import React from "react";

export default function AgvSplashPage({ onEnter }) {
  return (
    <div style={styles.page}>
      <div style={styles.glow}></div>

      <section style={styles.card}>
        <div style={styles.badge}>AVANT GLOBAL VISION</div>

        <h1 style={styles.title}>
          Your Virtual Stage.
          <br />
          Your Global Audience.
        </h1>

        <p style={styles.subtitle}>
          AGV is a premium online convention, teaching, and live production
          platform built for hosts, churches, educators, promoters, and creators
          who need a professional digital stage.
        </p>

        <div style={styles.actions}>
          <button style={styles.primaryButton} onClick={onEnter}>
            Enter Platform
          </button>
          <button style={styles.secondaryButton}>
            View Event Rooms
          </button>
        </div>

        <div style={styles.features}>
          <div style={styles.featureBox}>
            <strong>Live Stage</strong>
            <span>Camera, screen share, and presentation control.</span>
          </div>

          <div style={styles.featureBox}>
            <strong>Room-Based Events</strong>
            <span>Convention rooms, classrooms, studios, and lounges.</span>
          </div>

          <div style={styles.featureBox}>
            <strong>Viewer-Safe Access</strong>
            <span>Guests watch, chat, and follow without control access.</span>
          </div>
        </div>
      </section>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    width: "100%",
    background:
      "radial-gradient(circle at top left, rgba(201,154,59,0.28), transparent 36%), linear-gradient(135deg, #07111f 0%, #0c1a2d 42%, #111827 100%)",
    color: "#f8fafc",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    boxSizing: "border-box",
    position: "relative",
    overflow: "hidden",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
  },

  glow: {
    position: "absolute",
    width: 420,
    height: 420,
    borderRadius: "50%",
    background: "rgba(201,154,59,0.18)",
    filter: "blur(70px)",
    right: -120,
    bottom: -120,
  },

  card: {
    position: "relative",
    zIndex: 2,
    width: "min(1080px, 100%)",
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(7,17,31,0.78)",
    backdropFilter: "blur(18px)",
    borderRadius: 28,
    padding: "56px 42px",
    boxShadow: "0 30px 90px rgba(0,0,0,0.42)",
    textAlign: "center",
  },

  badge: {
    display: "inline-block",
    padding: "9px 16px",
    borderRadius: 999,
    border: "1px solid rgba(201,154,59,0.7)",
    color: "#facc15",
    fontWeight: 800,
    letterSpacing: "0.18em",
    fontSize: 12,
    marginBottom: 24,
  },

  title: {
    fontSize: "clamp(42px, 7vw, 84px)",
    lineHeight: 0.95,
    margin: "0 0 22px",
    fontWeight: 900,
    letterSpacing: "-0.06em",
  },

  subtitle: {
    maxWidth: 760,
    margin: "0 auto 34px",
    color: "#cbd5e1",
    fontSize: "clamp(17px, 2vw, 22px)",
    lineHeight: 1.55,
  },

  actions: {
    display: "flex",
    gap: 14,
    justifyContent: "center",
    flexWrap: "wrap",
    marginBottom: 42,
  },

  primaryButton: {
    border: "none",
    borderRadius: 16,
    padding: "15px 24px",
    fontSize: 16,
    fontWeight: 900,
    cursor: "pointer",
    background: "linear-gradient(135deg, #facc15, #c99a3b)",
    color: "#07111f",
    boxShadow: "0 14px 34px rgba(250,204,21,0.22)",
  },

  secondaryButton: {
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: 16,
    padding: "15px 24px",
    fontSize: 16,
    fontWeight: 800,
    cursor: "pointer",
    background: "rgba(255,255,255,0.07)",
    color: "#f8fafc",
  },

  features: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
    textAlign: "left",
  },

  featureBox: {
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    borderRadius: 20,
    padding: 20,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    color: "#cbd5e1",
  },
};