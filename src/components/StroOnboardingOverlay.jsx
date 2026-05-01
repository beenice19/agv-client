import React, { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "stroCheiveryOnboardingSeen_v1";

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.55)",
  zIndex: 9999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px",
};

const cardStyle = {
  width: "min(560px, 92vw)",
  background: "#111827",
  color: "#f9fafb",
  borderRadius: "20px",
  boxShadow: "0 25px 70px rgba(0,0,0,0.45)",
  border: "1px solid rgba(255,255,255,0.10)",
  overflow: "hidden",
};

const headerStyle = {
  padding: "18px 22px 12px 22px",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
};

const bodyStyle = {
  padding: "22px",
};

const footerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  padding: "16px 22px 22px 22px",
  borderTop: "1px solid rgba(255,255,255,0.08)",
};

const buttonRowStyle = {
  display: "flex",
  gap: "10px",
  alignItems: "center",
};

const primaryBtn = {
  border: "none",
  borderRadius: "12px",
  padding: "10px 16px",
  fontWeight: 700,
  cursor: "pointer",
  background: "#2563eb",
  color: "#ffffff",
};

const secondaryBtn = {
  border: "1px solid rgba(255,255,255,0.16)",
  borderRadius: "12px",
  padding: "10px 16px",
  fontWeight: 700,
  cursor: "pointer",
  background: "transparent",
  color: "#ffffff",
};

const mutedBtn = {
  border: "none",
  background: "transparent",
  color: "#cbd5e1",
  cursor: "pointer",
  fontWeight: 600,
  padding: "8px 10px",
};

const badgeStyle = {
  display: "inline-block",
  fontSize: "12px",
  fontWeight: 800,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  padding: "6px 10px",
  borderRadius: "999px",
  background: "rgba(37,99,235,0.16)",
  color: "#93c5fd",
  marginBottom: "12px",
};

const progressWrapStyle = {
  width: "100%",
  height: "8px",
  background: "rgba(255,255,255,0.08)",
  borderRadius: "999px",
  overflow: "hidden",
  marginTop: "12px",
};

const sectionBoxStyle = {
  marginTop: "14px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "14px",
  padding: "14px 14px",
};

function getRoleLabel(role) {
  const normalized = String(role || "").toLowerCase();

  if (normalized.includes("admin")) return "Admin";
  if (normalized.includes("host")) return "Host";
  if (normalized.includes("mod")) return "Moderator";
  return "Viewer";
}

export default function StroOnboardingOverlay({
  isOpen,
  onClose,
  userRole,
  resetKey = 0,
}) {
  const [step, setStep] = useState(0);

  const roleLabel = getRoleLabel(userRole);

  const steps = useMemo(() => {
    return [
      {
        tag: "Welcome",
        title: "Welcome to Stro Cheivery",
        text: "Your live room is ready. This quick tour will show you where everything is so you can jump right in.",
        detailTitle: "What you’ll learn",
        detailText: "Stage, chat, room navigation, bulletin board, and what your role can do.",
      },
      {
        tag: "Stage",
        title: "This is the Stage",
        text: "The Stage is the main focus area. This is where users watch the host, presentations, live video, and screen sharing.",
        detailTitle: "What to expect here",
        detailText: "When the host starts camera or shares a screen, this area becomes the center of the room experience.",
      },
      {
        tag: "Chat",
        title: "This is the Chat Panel",
        text: "Chat is where people in the room talk in real time. It helps viewers stay engaged without interrupting the stage.",
        detailTitle: "Room-specific behavior",
        detailText: "Messages belong to the current room only, so each room keeps its own conversation.",
      },
      {
        tag: "Rooms",
        title: "This is Rooms & Navigation",
        text: "Use this area to move through the platform, switch rooms, and stay oriented inside Stro Cheivery.",
        detailTitle: "Why this matters",
        detailText: "It helps users know where they are and where they need to go next.",
      },
      {
        tag: "Bulletin",
        title: "This is the Bulletin Board",
        text: "The bulletin board displays room announcements, notes, and shared information people need to see during a live session.",
        detailTitle: "Good use cases",
        detailText: "Schedules, announcements, class notes, event details, speaker information, and room instructions.",
      },
      {
        tag: "Role",
        title: `You’re signed in as ${roleLabel}`,
        text:
          roleLabel === "Admin"
            ? "As Admin, you have full platform control, including room management, authority controls, and elevated access."
            : roleLabel === "Host"
            ? "As Host, you control the room experience, including the stage, camera, and screen sharing."
            : roleLabel === "Moderator"
            ? "As Moderator, you help support the room and assist with management and flow."
            : "As Viewer, you can watch the stage, follow the room, and participate in chat as allowed.",
        detailTitle: "Role clarity",
        detailText:
          roleLabel === "Admin"
            ? "You see more controls than everyone else."
            : roleLabel === "Host"
            ? "You run the live room presentation experience."
            : roleLabel === "Moderator"
            ? "You support order and flow inside the room."
            : "Your experience is focused on watching, following, and participating.",
      },
      {
        tag: "Done",
        title: "You’re all set",
        text: "That’s it. You now know the main parts of Stro Cheivery and can move through the platform with confidence.",
        detailTitle: "Next step",
        detailText: "Close this tour and enjoy the room.",
      },
    ];
  }, [roleLabel]);

  useEffect(() => {
    if (isOpen) {
      setStep(0);
    }
  }, [isOpen, resetKey]);

  if (!isOpen) return null;

  const current = steps[step];
  const isLast = step === steps.length - 1;
  const progress = ((step + 1) / steps.length) * 100;

  function handleNext() {
    if (isLast) {
      try {
        localStorage.setItem(STORAGE_KEY, "true");
      } catch (err) {
        console.error("Unable to save onboarding completion:", err);
      }
      onClose?.();
      return;
    }
    setStep((prev) => prev + 1);
  }

  function handleBack() {
    setStep((prev) => Math.max(0, prev - 1));
  }

  function handleSkip() {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch (err) {
      console.error("Unable to save onboarding completion:", err);
    }
    onClose?.();
  }

  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        <div style={headerStyle}>
          <div style={badgeStyle}>{current.tag}</div>
          <h2 style={{ margin: 0, fontSize: "28px", lineHeight: 1.15 }}>
            {current.title}
          </h2>

          <div style={progressWrapStyle}>
            <div
              style={{
                width: `${progress}%`,
                height: "100%",
                background: "#2563eb",
                transition: "width 180ms ease",
              }}
            />
          </div>

          <div
            style={{
              marginTop: "8px",
              fontSize: "13px",
              color: "#cbd5e1",
              fontWeight: 600,
            }}
          >
            Step {step + 1} of {steps.length}
          </div>
        </div>

        <div style={bodyStyle}>
          <p
            style={{
              margin: 0,
              fontSize: "17px",
              lineHeight: 1.7,
              color: "#f8fafc",
            }}
          >
            {current.text}
          </p>

          <div style={sectionBoxStyle}>
            <div
              style={{
                fontWeight: 800,
                marginBottom: "6px",
                color: "#bfdbfe",
              }}
            >
              {current.detailTitle}
            </div>
            <div style={{ color: "#dbeafe", lineHeight: 1.6 }}>
              {current.detailText}
            </div>
          </div>
        </div>

        <div style={footerStyle}>
          <button type="button" style={mutedBtn} onClick={handleSkip}>
            Skip Tour
          </button>

          <div style={buttonRowStyle}>
            <button
              type="button"
              style={secondaryBtn}
              onClick={handleBack}
              disabled={step === 0}
            >
              Back
            </button>

            <button type="button" style={primaryBtn} onClick={handleNext}>
              {isLast ? "Finish" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function shouldShowStroOnboarding() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "true";
  } catch (err) {
    console.error("Unable to read onboarding completion:", err);
    return true;
  }
}

export function resetStroOnboarding() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error("Unable to reset onboarding completion:", err);
  }
}