// CLIENT — OverlayPreview.jsx
import React from "react";
import StroCheiveryWelcomeOverlay from "./components/StroCheiveryWelcomeOverlay";

export default function OverlayPreview() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, rgba(38,58,110,0.45) 0%, rgba(8,12,20,1) 55%, rgba(5,8,15,1) 100%)",
        position: "relative",
        overflow: "hidden"
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)"
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          padding: "32px"
        }}
      >
        <div
          style={{
            maxWidth: "1400px",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "280px minmax(0, 1fr) 320px",
            gap: "20px",
            minHeight: "100vh"
          }}
        >
          <div
            style={{
              borderRadius: "22px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              padding: "20px",
              color: "#dce6ff"
            }}
          >
            <h3 style={{ marginTop: 0 }}>Rooms</h3>
            <div style={roomCard}>Main Stage</div>
            <div style={roomCard}>Control Room</div>
            <div style={roomCard}>VIP Room</div>
            <div style={roomCard}>Green Room</div>
          </div>

          <div
            style={{
              borderRadius: "28px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              padding: "18px",
              display: "flex",
              flexDirection: "column",
              gap: "18px"
            }}
          >
            <div
              style={{
                borderRadius: "24px",
                minHeight: "420px",
                background:
                  "linear-gradient(180deg, rgba(18,27,46,0.95) 0%, rgba(9,14,24,0.98) 100%)",
                border: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                fontSize: "28px",
                fontWeight: 700,
                letterSpacing: "0.02em"
              }}
            >
              Avant Global Vision Stage
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "12px"
              }}
            >
              <div style={controlButton}>Camera</div>
              <div style={controlButton}>Mic</div>
              <div style={controlButton}>Share</div>
              <div style={controlButton}>Invite</div>
            </div>
          </div>

          <div
            style={{
              borderRadius: "22px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              padding: "20px",
              color: "#dce6ff"
            }}
          >
            <h3 style={{ marginTop: 0 }}>Side Panel</h3>
            <div style={panelBox}>Chat</div>
            <div style={panelBox}>Participants</div>
            <div style={panelBox}>Announcements</div>
          </div>
        </div>
      </div>

      <StroCheiveryWelcomeOverlay
        open={true}
        onGoLiveNow={() => {}}
        onJoinAsViewer={() => {}}
        onEnterControlRoom={() => {}}
        onClose={() => {}}
      />
    </div>
  );
}

const roomCard = {
  padding: "14px 16px",
  borderRadius: "14px",
  marginBottom: "12px",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.08)"
};

const controlButton = {
  padding: "14px",
  borderRadius: "14px",
  textAlign: "center",
  color: "#ffffff",
  fontWeight: 700,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.08)"
};

const panelBox = {
  padding: "16px",
  borderRadius: "14px",
  marginBottom: "12px",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.08)"
};