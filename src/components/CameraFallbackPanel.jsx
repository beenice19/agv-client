import React from "react";

function explainCameraError(errorName) {
  switch (errorName) {
    case "NotAllowedError":
      return "Camera permission was denied in the browser.";
    case "NotFoundError":
      return "No camera was found on this device.";
    case "NotReadableError":
      return "The camera exists, but Windows or another app is blocking access.";
    case "OverconstrainedError":
      return "The selected camera settings are not supported by this device.";
    case "SecurityError":
      return "Camera access is blocked because the page is not in an allowed secure context.";
    case "TypeError":
      return "Camera request could not start because the browser did not accept the request settings.";
    case "CameraDisabled":
      return "You chose to continue without using a camera.";
    default:
      return "The camera could not be started.";
  }
}

export default function CameraFallbackPanel({
  errorName = "",
  errorMessage = "",
  cameras = [],
  selectedDeviceId = "",
  onRetry,
  onSelectCamera,
  onUseNoCameraMode,
}) {
  const friendlyMessage = explainCameraError(errorName);

  return (
    <div
      style={{
        width: "100%",
        minHeight: 320,
        borderRadius: 20,
        border: "1px solid rgba(255,255,255,0.14)",
        background:
          "linear-gradient(180deg, rgba(16,18,24,0.96) 0%, rgba(10,12,18,0.98) 100%)",
        boxShadow: "0 18px 50px rgba(0,0,0,0.35)",
        padding: 20,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        color: "#f5f7fb",
      }}
    >
      <div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 12px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.08)",
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: 0.4,
            marginBottom: 14,
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              background: "#ffb347",
              display: "inline-block",
            }}
          />
          Camera Fallback Mode
        </div>

        <div
          style={{
            fontSize: 28,
            fontWeight: 800,
            lineHeight: 1.1,
            marginBottom: 10,
          }}
        >
          Could not access your camera
        </div>

        <div
          style={{
            fontSize: 15,
            lineHeight: 1.5,
            color: "rgba(255,255,255,0.82)",
            maxWidth: 900,
            marginBottom: 12,
          }}
        >
          {friendlyMessage}
        </div>

        {!!errorName && (
          <div
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.60)",
              marginBottom: 6,
            }}
          >
            Error Type: <strong>{errorName}</strong>
          </div>
        )}

        {!!errorMessage && (
          <div
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.60)",
              marginBottom: 16,
            }}
          >
            Details: {errorMessage}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 12,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              borderRadius: 16,
              background: "rgba(255,255,255,0.05)",
              padding: 14,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Quick checks</div>
            <div style={{ fontSize: 14, lineHeight: 1.5, color: "rgba(255,255,255,0.78)" }}>
              Make sure browser camera permission is allowed, Windows camera access is on,
              and Zoom, Teams, or the Camera app are not using the device.
            </div>
          </div>

          <div
            style={{
              borderRadius: 16,
              background: "rgba(255,255,255,0.05)",
              padding: 14,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Best AGV test path</div>
            <div style={{ fontSize: 14, lineHeight: 1.5, color: "rgba(255,255,255,0.78)" }}>
              Test the camera on <strong>127.0.0.1</strong> first. Tunnel testing is great for
              layout and outside users, but local testing is the best way to confirm camera access.
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 700,
              marginBottom: 8,
              color: "rgba(255,255,255,0.78)",
            }}
          >
            Choose camera
          </label>

          <select
            value={selectedDeviceId}
            onChange={(e) => onSelectCamera?.(e.target.value)}
            style={{
              width: "100%",
              maxWidth: 460,
              height: 44,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.06)",
              color: "#f5f7fb",
              padding: "0 12px",
              outline: "none",
            }}
          >
            <option value="">Default camera</option>
            {cameras.map((camera, index) => (
              <option key={camera.deviceId || `camera-${index}`} value={camera.deviceId}>
                {camera.label || `Camera ${index + 1}`}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          alignItems: "center",
        }}
      >
        <button
          onClick={onRetry}
          style={{
            height: 44,
            padding: "0 18px",
            borderRadius: 12,
            border: "none",
            cursor: "pointer",
            fontWeight: 700,
            background: "#f5f7fb",
            color: "#101218",
          }}
        >
          Retry Camera
        </button>

        <button
          onClick={() => onSelectCamera?.(selectedDeviceId)}
          style={{
            height: 44,
            padding: "0 18px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.16)",
            cursor: "pointer",
            fontWeight: 700,
            background: "rgba(255,255,255,0.06)",
            color: "#f5f7fb",
          }}
        >
          Apply Selected Camera
        </button>

        <button
          onClick={onUseNoCameraMode}
          style={{
            height: 44,
            padding: "0 18px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.16)",
            cursor: "pointer",
            fontWeight: 700,
            background: "transparent",
            color: "#f5f7fb",
          }}
        >
          Continue Without Camera
        </button>
      </div>
    </div>
  );
}