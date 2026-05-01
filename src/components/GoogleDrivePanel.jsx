import React from "react";

export default function GoogleDrivePanel({
  driveConnected = false,
  driveFileName = "",
  driveFileType = "",
  driveMessage = "Google Drive is not connected yet.",
  onOpenDrive,
  onClearDriveSelection,
}) {
  const hasFile = Boolean(driveFileName);

  return (
    <div
      style={{
        borderRadius: 20,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.04)",
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: "#f8fafc",
              marginBottom: 4,
            }}
          >
            Google Drive
          </div>
          <div
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.68)",
              lineHeight: 1.45,
            }}
          >
            Safe Pass 1 shell for Drive import. This does not affect stage media, room authority, or server sync.
          </div>
        </div>

        <div
          style={{
            padding: "8px 12px",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 0.3,
            background: driveConnected ? "rgba(34,197,94,0.16)" : "rgba(245,158,11,0.14)",
            color: driveConnected ? "#86efac" : "#fcd34d",
            whiteSpace: "nowrap",
          }}
        >
          {driveConnected ? "Connected" : "Not Connected"}
        </div>
      </div>

      <div
        style={{
          borderRadius: 16,
          background: "rgba(15,23,42,0.55)",
          border: "1px solid rgba(255,255,255,0.06)",
          padding: 14,
        }}
      >
        <div
          style={{
            fontSize: 13,
            color: "rgba(255,255,255,0.62)",
            marginBottom: 6,
            fontWeight: 700,
          }}
        >
          Status
        </div>

        <div
          style={{
            fontSize: 14,
            color: "#e5e7eb",
            lineHeight: 1.5,
            marginBottom: hasFile ? 14 : 0,
          }}
        >
          {driveMessage}
        </div>

        {hasFile && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
              marginTop: 10,
            }}
          >
            <div
              style={{
                borderRadius: 14,
                background: "rgba(255,255,255,0.04)",
                padding: 12,
              }}
            >
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.58)", marginBottom: 6 }}>
                Selected File
              </div>
              <div style={{ fontSize: 14, color: "#f8fafc", fontWeight: 700 }}>
                {driveFileName}
              </div>
            </div>

            <div
              style={{
                borderRadius: 14,
                background: "rgba(255,255,255,0.04)",
                padding: 12,
              }}
            >
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.58)", marginBottom: 6 }}>
                File Type
              </div>
              <div style={{ fontSize: 14, color: "#f8fafc", fontWeight: 700 }}>
                {driveFileType || "Unknown"}
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <button
          onClick={onOpenDrive}
          style={{
            height: 42,
            padding: "0 16px",
            borderRadius: 12,
            border: "none",
            cursor: "pointer",
            background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
            color: "#ffffff",
            fontWeight: 700,
          }}
        >
          Open Google Drive
        </button>

        <button
          onClick={onClearDriveSelection}
          style={{
            height: 42,
            padding: "0 16px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.12)",
            cursor: "pointer",
            background: "rgba(255,255,255,0.04)",
            color: "#f8fafc",
            fontWeight: 700,
          }}
        >
          Clear Selection
        </button>
      </div>

      <div
        style={{
          fontSize: 12,
          color: "rgba(255,255,255,0.52)",
          lineHeight: 1.5,
        }}
      >
        Next phase: wire this button to Google Picker for secure file selection, then attach chosen items to bulletin or stage content.
      </div>
    </div>
  );
}