// CLIENT — StroCheiveryWelcomeOverlay.jsx
import React from "react";

export default function StroCheiveryWelcomeOverlay({
  open,
  onGoLiveNow,
  onJoinAsViewer,
  onEnterControlRoom,
  onClose
}) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(5, 10, 18, 0.82)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        zIndex: 9999
      }}
    >
      <div
        style={{
          width: "min(760px, 100%)",
          borderRadius: "28px",
          border: "1px solid rgba(255,255,255,0.12)",
          background:
            "linear-gradient(180deg, rgba(20,25,40,0.96) 0%, rgba(10,14,24,0.98) 100%)",
          boxShadow: "0 30px 90px rgba(0,0,0,0.45)",
          overflow: "hidden"
        }}
      >
        <div
          style={{
            padding: "28px 28px 18px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            background:
              "linear-gradient(135deg, rgba(78,116,255,0.18) 0%, rgba(128,76,255,0.14) 100%)"
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 12px",
              borderRadius: "999px",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.09)",
              color: "#dbe7ff",
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase"
            }}
          >
            Premium Live Broadcast Platform
          </div>

          <h1
            style={{
              margin: "16px 0 10px",
              fontSize: "clamp(28px, 4vw, 42px)",
              lineHeight: 1.05,
              fontWeight: 800,
              color: "#ffffff"
            }}
          >
            Welcome to Avant Global Vision
          </h1>

          <p
            style={{
              margin: 0,
              fontSize: "16px",
              lineHeight: 1.6,
              color: "rgba(232,238,255,0.82)",
              maxWidth: "58ch"
            }}
          >
            Choose how you want to enter. Go live, join as a viewer, or open the control room.
          </p>
        </div>

        <div style={{ padding: "22px 22px 24px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
              gap: "16px"
            }}
          >
            <OverlayOption
              icon="🎥"
              title="Go Live Now"
              text="Enter with full access and begin your live session."
              actionLabel="Go live"
              accent="linear-gradient(135deg, rgba(61,133,255,0.35) 0%, rgba(84,203,255,0.18) 100%)"
              onClick={onGoLiveNow}
            />

            <OverlayOption
              icon="👀"
              title="Join as Viewer"
              text="Enter in viewer mode for a clean watch-first experience."
              actionLabel="Join and watch"
              accent="linear-gradient(135deg, rgba(83,193,122,0.28) 0%, rgba(149,226,177,0.12) 100%)"
              onClick={onJoinAsViewer}
            />

            <OverlayOption
              icon="⚙️"
              title="Enter Control Room"
              text="Open the production side for setup, coordination, and room management."
              actionLabel="Open controls"
              accent="linear-gradient(135deg, rgba(187,115,255,0.28) 0%, rgba(255,153,214,0.12) 100%)"
              onClick={onEnterControlRoom}
            />
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              gap: "14px",
              marginTop: "18px",
              paddingTop: "18px",
              borderTop: "1px solid rgba(255,255,255,0.08)"
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "13px",
                lineHeight: 1.5,
                color: "rgba(224,232,255,0.72)"
              }}
            >
              Built to make the first step obvious and the stage the center of attention.
            </p>

            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "10px 14px",
                borderRadius: "12px",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.05)",
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              Continue to platform
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function OverlayOption({
  icon,
  title,
  text,
  actionLabel,
  onClick,
  accent
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "240px",
        padding: "18px",
        borderRadius: "22px",
        border: "1px solid rgba(255,255,255,0.08)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%)",
        color: "#ffffff",
        textAlign: "left",
        cursor: "pointer",
        transition:
          "transform 160ms ease, border-color 160ms ease, background 160ms ease, box-shadow 160ms ease",
        boxShadow: "0 14px 32px rgba(0,0,0,0.18)"
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.transform = "translateY(-3px)";
        event.currentTarget.style.borderColor = "rgba(165,189,255,0.28)";
        event.currentTarget.style.background =
          "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)";
        event.currentTarget.style.boxShadow = "0 18px 40px rgba(0,0,0,0.24)";
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.transform = "translateY(0)";
        event.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
        event.currentTarget.style.background =
          "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%)";
        event.currentTarget.style.boxShadow = "0 14px 32px rgba(0,0,0,0.18)";
      }}
    >
      <div
        style={{
          width: "56px",
          height: "56px",
          borderRadius: "16px",
          display: "grid",
          placeItems: "center",
          fontSize: "28px",
          marginBottom: "16px",
          background: accent || "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.09)"
        }}
      >
        {icon}
      </div>

      <h3
        style={{
          margin: "0 0 10px",
          fontSize: "21px",
          fontWeight: 800,
          letterSpacing: "-0.02em"
        }}
      >
        {title}
      </h3>

      <p
        style={{
          margin: 0,
          fontSize: "14px",
          lineHeight: 1.6,
          color: "rgba(235,241,255,0.82)"
        }}
      >
        {text}
      </p>

      <div
        style={{
          marginTop: "auto",
          paddingTop: "16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "13px",
          color: "rgba(255,255,255,0.74)"
        }}
      >
        <span>{actionLabel}</span>
        <span aria-hidden="true">→</span>
      </div>
    </button>
  );
}