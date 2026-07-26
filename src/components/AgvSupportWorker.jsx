import React, { useMemo, useState } from "react";

const SUPPORT_CATEGORIES = [
  {
    id: "host-onboarding",
    label: "Host Onboarding",
    examples: "Room setup, camera, microphone, screen sharing, rehearsal, host controls",
  },
  {
    id: "viewer-access",
    label: "Viewer Access",
    examples: "Viewer links, room entry, ticket access, free entry, navigation",
  },
  {
    id: "account-access",
    label: "Account Access",
    examples: "Login trouble, password recovery, session problems, locked account",
  },
  {
    id: "ticketing",
    label: "Ticketing",
    examples: "Ticket code, paid entry, missing ticket, event access",
  },
  {
    id: "billing",
    label: "Billing and Subscription",
    examples: "Plans, checkout, billing portal, cancellation, payment questions",
  },
  {
    id: "broadcast",
    label: "Broadcast and Live Room",
    examples: "Camera, audio, LiveKit, stage, connection, screen sharing",
  },
  {
    id: "community",
    label: "Community and Safety",
    examples: "Harassment, threats, moderation, reporting, harmful behavior",
  },
  {
    id: "legal-privacy",
    label: "Legal, Privacy, or Copyright",
    examples: "DMCA, privacy request, recording concern, legal notice",
  },
];

const URGENCY_OPTIONS = [
  { value: "routine", label: "Routine" },
  { value: "important", label: "Important" },
  { value: "urgent", label: "Urgent" },
];

const DEFAULT_FORM = {
  requesterType: "Host",
  requesterName: "",
  requesterEmail: "",
  eventName: "",
  category: "host-onboarding",
  urgency: "routine",
  issue: "",
  attempted: "",
};

function clean(value) {
  return String(value || "").trim();
}

function classifyCase(form) {
  const issue = clean(form.issue).toLowerCase();
  const attempted = clean(form.attempted);
  const category = form.category;
  const signals = [];

  const containsAny = (words) => words.some((word) => issue.includes(word));

  if (
    containsAny([
      "threat",
      "weapon",
      "suicide",
      "self harm",
      "child",
      "minor",
      "exploitation",
      "trafficking",
      "police",
      "law enforcement",
      "emergency",
    ])
  ) {
    signals.push("Serious safety or emergency language detected.");
    return {
      level: "RED",
      title: "Immediate Founder Escalation",
      summary:
        "This request contains language requiring immediate human review. Do not promise an outcome or take permanent enforcement action.",
      recommendation:
        "Preserve the report, timestamps, account and event information. Escalate immediately to the Founder and follow the approved emergency procedure.",
      prohibited:
        "Do not investigate privately, contact law enforcement without authorization, delete evidence, or make a permanent account decision.",
      signals,
    };
  }

  if (
    category === "legal-privacy" ||
    containsAny([
      "lawyer",
      "attorney",
      "subpoena",
      "copyright",
      "dmca",
      "privacy request",
      "delete my data",
      "legal notice",
      "recording consent",
    ])
  ) {
    signals.push("Legal, privacy, or copyright review required.");
    return {
      level: "RED",
      title: "Legal or Privacy Review Required",
      summary:
        "This case must be handled through AGV's approved legal, privacy, or copyright workflow.",
      recommendation:
        "Collect the complete notice, sender contact information, affected content or account, relevant URLs, dates, and supporting evidence. Send the packet to the Founder for review.",
      prohibited:
        "Do not provide legal conclusions, promise removal, disclose private data, or approve a legal request.",
      signals,
    };
  }

  if (
    category === "community" ||
    containsAny([
      "harassment",
      "abuse",
      "hate",
      "stalking",
      "fraud",
      "scam",
      "impersonation",
      "unsafe",
    ])
  ) {
    signals.push("Trust and safety review required.");
    return {
      level: "RED",
      title: "Trust and Safety Escalation",
      summary:
        "The worker may organize this report, but a human must decide any restriction, suspension, or permanent enforcement action.",
      recommendation:
        "Preserve screenshots, room and event identifiers, usernames, timestamps, chat records, and a concise description of the reported behavior.",
      prohibited:
        "Do not terminate accounts, disclose reporter identity, remove evidence, or promise disciplinary action.",
      signals,
    };
  }

  if (
    category === "billing" ||
    containsAny([
      "refund",
      "chargeback",
      "charged twice",
      "duplicate charge",
      "bank",
      "card number",
      "payout",
      "money missing",
    ])
  ) {
    signals.push("Financial authorization required.");
    return {
      level: "YELLOW",
      title: "Founder Financial Review",
      summary:
        "The worker can explain published policy and collect transaction details, but cannot issue refunds, modify subscriptions, move money, or approve disputes.",
      recommendation:
        "Collect the account email, transaction or checkout identifier, amount, date, event name, and a description of the requested resolution.",
      prohibited:
        "Do not request full card numbers, banking passwords, security codes, or authorize a refund.",
      signals,
    };
  }

  if (
    category === "account-access" ||
    containsAny([
      "locked out",
      "cannot login",
      "can't login",
      "password reset",
      "reset code",
      "admin access",
      "super admin",
      "account stolen",
      "hacked",
    ])
  ) {
    signals.push("Identity or account authority must be verified.");
    return {
      level: "YELLOW",
      title: "Verified Account Recovery Review",
      summary:
        "The worker may guide approved recovery steps and collect evidence, but cannot unlock accounts, change ownership, create bypasses, or reveal credentials.",
      recommendation:
        "Confirm the account email, role, approximate last successful login, error message, device and browser, and whether password recovery was attempted.",
      prohibited:
        "Do not reveal passwords, reset codes, session tokens, admin PINs, or create an authentication bypass.",
      signals,
    };
  }

  if (
    category === "ticketing" ||
    containsAny([
      "ticket missing",
      "ticket code",
      "paid but",
      "cannot enter",
      "can't enter",
      "access denied",
    ])
  ) {
    signals.push("Ticket and event ownership should be verified.");
    return {
      level: "YELLOW",
      title: "Ticket Access Review",
      summary:
        "The worker may collect ticket details and provide navigation guidance, but cannot create replacement tickets, mark tickets paid, or alter event access.",
      recommendation:
        "Collect the purchaser email, event name, ticket code if available, payment timestamp, error message, and the room or viewer link used.",
      prohibited:
        "Do not mark a ticket paid, generate a replacement ticket, disclose another purchaser's data, or override ticket verification.",
      signals,
    };
  }

  if (
    category === "broadcast" ||
    containsAny([
      "camera",
      "microphone",
      "audio",
      "screen share",
      "screen sharing",
      "livekit",
      "broadcast",
      "black screen",
      "no sound",
      "connection",
    ])
  ) {
    signals.push("Routine technical troubleshooting path selected.");
    return {
      level: form.urgency === "urgent" ? "YELLOW" : "GREEN",
      title:
        form.urgency === "urgent"
          ? "Live Event Technical Review"
          : "Guided Broadcast Troubleshooting",
      summary:
        "This appears to be a broadcast or device-permission issue that can begin with approved, non-destructive checks.",
      recommendation:
        "Confirm browser permissions, selected camera and microphone, whether another application is using the device, internet stability, room role, and whether refreshing the room changes the result.",
      prohibited:
        "Do not alter production configuration, restart services, deploy code, or modify LiveKit credentials without Founder approval.",
      signals,
    };
  }

  if (category === "viewer-access") {
    signals.push("Routine viewer guidance path selected.");
    return {
      level: form.urgency === "urgent" ? "YELLOW" : "GREEN",
      title: "Viewer Access Guidance",
      summary:
        "This case can begin with approved viewer-entry and navigation checks.",
      recommendation:
        "Confirm the exact viewer link, event name, whether the event is free or ticketed, browser and device, displayed error, and whether the viewer is signed into the intended account.",
      prohibited:
        "Do not bypass room privacy, ticket verification, account authentication, or event restrictions.",
      signals,
    };
  }

  signals.push("Routine host-success guidance path selected.");
  return {
    level: form.urgency === "urgent" ? "YELLOW" : "GREEN",
    title:
      form.urgency === "urgent"
        ? "Founder Review Recommended"
        : "Host Success Guidance",
    summary:
      "This case appears suitable for approved onboarding guidance and information collection.",
    recommendation:
      "Confirm the host account, event goal, room name, scheduled date, camera and microphone readiness, viewer-entry method, moderation plan, and whether a rehearsal has been completed.",
    prohibited:
      "Do not change account permissions, financial settings, production configuration, or regulated-event approval.",
    signals,
  };
}

function levelPresentation(level) {
  if (level === "RED") {
    return {
      label: "Immediate Escalation",
      color: "#fecaca",
      border: "rgba(239,68,68,0.42)",
      background: "rgba(239,68,68,0.12)",
    };
  }

  if (level === "YELLOW") {
    return {
      label: "Founder Review",
      color: "#fde68a",
      border: "rgba(245,158,11,0.42)",
      background: "rgba(245,158,11,0.12)",
    };
  }

  return {
    label: "Guided Support",
    color: "#bbf7d0",
    border: "rgba(34,197,94,0.42)",
    background: "rgba(34,197,94,0.12)",
  };
}

export default function AgvSupportWorker() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [result, setResult] = useState(null);

  const selectedCategory = useMemo(
    () =>
      SUPPORT_CATEGORIES.find((category) => category.id === form.category) ||
      SUPPORT_CATEGORIES[0],
    [form.category]
  );

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
    setResult(null);
  }

  function reviewCase(event) {
    event.preventDefault();

    if (!clean(form.issue)) {
      setResult({
        level: "YELLOW",
        title: "More Information Required",
        summary:
          "The support request does not yet include a description of the problem.",
        recommendation:
          "Enter what happened, what the user expected, and the exact message or behavior they saw.",
        prohibited:
          "Do not guess at the problem or claim that it has been resolved.",
        signals: ["Issue description is missing."],
      });
      return;
    }

    setResult(classifyCase(form));
  }

  function resetCase() {
    setForm(DEFAULT_FORM);
    setResult(null);
  }

  const presentation = levelPresentation(result?.level);

  return (
    <section style={styles.shell} aria-labelledby="agv-support-worker-title">
      <div style={styles.header}>
        <div>
          <div style={styles.eyebrow}>AGV SUPPORT WORKER v1.0</div>
          <h2 id="agv-support-worker-title" style={styles.title}>
            Support and Host Success Foundation
          </h2>
          <p style={styles.subtitle}>
            Organizes routine support requests, prepares approved troubleshooting
            guidance, and escalates sensitive matters to the Founder. It cannot
            unlock accounts, issue refunds, alter tickets, change subscriptions,
            move money, or take permanent enforcement action.
          </p>
        </div>

        <div style={styles.readOnlyBadge}>Recommendation Only</div>
      </div>

      <form onSubmit={reviewCase}>
        <div style={styles.formGrid}>
          <label style={styles.field}>
            <span style={styles.label}>Requester Type</span>
            <select
              value={form.requesterType}
              onChange={(event) =>
                updateField("requesterType", event.target.value)
              }
              style={styles.input}
            >
              <option>Host</option>
              <option>Viewer</option>
              <option>Moderator</option>
              <option>Organization</option>
              <option>Other</option>
            </select>
          </label>

          <label style={styles.field}>
            <span style={styles.label}>Support Category</span>
            <select
              value={form.category}
              onChange={(event) => updateField("category", event.target.value)}
              style={styles.input}
            >
              {SUPPORT_CATEGORIES.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
          </label>

          <label style={styles.field}>
            <span style={styles.label}>Urgency</span>
            <select
              value={form.urgency}
              onChange={(event) => updateField("urgency", event.target.value)}
              style={styles.input}
            >
              {URGENCY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label style={styles.field}>
            <span style={styles.label}>Requester Name</span>
            <input
              value={form.requesterName}
              onChange={(event) =>
                updateField("requesterName", event.target.value)
              }
              placeholder="Optional"
              style={styles.input}
            />
          </label>

          <label style={styles.field}>
            <span style={styles.label}>Account Email</span>
            <input
              value={form.requesterEmail}
              onChange={(event) =>
                updateField("requesterEmail", event.target.value)
              }
              placeholder="Optional during initial intake"
              type="email"
              style={styles.input}
            />
          </label>

          <label style={styles.field}>
            <span style={styles.label}>Event or Room</span>
            <input
              value={form.eventName}
              onChange={(event) =>
                updateField("eventName", event.target.value)
              }
              placeholder="Optional"
              style={styles.input}
            />
          </label>
        </div>

        <div style={styles.categoryNote}>
          <strong>{selectedCategory.label}:</strong>{" "}
          {selectedCategory.examples}
        </div>

        <label style={styles.fieldBlock}>
          <span style={styles.label}>Describe the problem</span>
          <textarea
            value={form.issue}
            onChange={(event) => updateField("issue", event.target.value)}
            placeholder="Describe what happened, what was expected, and any exact error message."
            rows={6}
            style={styles.textarea}
          />
        </label>

        <label style={styles.fieldBlock}>
          <span style={styles.label}>What has already been tried?</span>
          <textarea
            value={form.attempted}
            onChange={(event) => updateField("attempted", event.target.value)}
            placeholder="Optional. List any troubleshooting already completed."
            rows={3}
            style={styles.textarea}
          />
        </label>

        <div style={styles.actions}>
          <button type="submit" style={styles.primaryButton}>
            Review Support Case
          </button>

          <button
            type="button"
            onClick={resetCase}
            style={styles.secondaryButton}
          >
            Clear Case
          </button>
        </div>
      </form>

      {result ? (
        <section
          style={{
            ...styles.result,
            borderColor: presentation.border,
            background: presentation.background,
          }}
          aria-live="polite"
        >
          <div style={styles.resultTop}>
            <div>
              <div
                style={{
                  ...styles.level,
                  color: presentation.color,
                }}
              >
                {presentation.label}
              </div>
              <h3 style={styles.resultTitle}>{result.title}</h3>
            </div>
          </div>

          <div style={styles.resultSection}>
            <strong>Assessment</strong>
            <p>{result.summary}</p>
          </div>

          <div style={styles.resultSection}>
            <strong>Recommended next step</strong>
            <p>{result.recommendation}</p>
          </div>

          <div style={styles.resultSection}>
            <strong>Worker restriction</strong>
            <p>{result.prohibited}</p>
          </div>

          {result.signals?.length ? (
            <div style={styles.signalBox}>
              {result.signals.map((signal) => (
                <div key={signal}>• {signal}</div>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <div style={styles.authorityNotice}>
        <strong>Founder authority preserved.</strong> The worker may organize
        information and recommend approved steps. Account recovery, refunds,
        payment actions, legal decisions, safety enforcement, ticket overrides,
        and production changes require authorized human review.
      </div>
    </section>
  );
}

const styles = {
  shell: {
    width: "100%",
    borderRadius: 24,
    border: "1px solid rgba(96,165,250,0.28)",
    background:
      "linear-gradient(145deg, rgba(15,23,42,0.97), rgba(3,7,18,0.97))",
    padding: 24,
    color: "#f8fafc",
    boxSizing: "border-box",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 18,
    flexWrap: "wrap",
    marginBottom: 22,
  },
  eyebrow: {
    color: "#93c5fd",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: "0.14em",
  },
  title: {
    margin: "8px 0",
    fontSize: 28,
  },
  subtitle: {
    margin: 0,
    maxWidth: 780,
    color: "#cbd5e1",
    lineHeight: 1.6,
  },
  readOnlyBadge: {
    borderRadius: 999,
    border: "1px solid rgba(96,165,250,0.38)",
    background: "rgba(59,130,246,0.12)",
    color: "#bfdbfe",
    padding: "8px 12px",
    fontSize: 12,
    fontWeight: 900,
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: 14,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 7,
  },
  fieldBlock: {
    display: "flex",
    flexDirection: "column",
    gap: 7,
    marginTop: 16,
  },
  label: {
    color: "#dbeafe",
    fontSize: 13,
    fontWeight: 800,
  },
  input: {
    width: "100%",
    borderRadius: 12,
    border: "1px solid rgba(148,163,184,0.28)",
    background: "rgba(15,23,42,0.8)",
    color: "#f8fafc",
    padding: "11px 12px",
    boxSizing: "border-box",
  },
  textarea: {
    width: "100%",
    resize: "vertical",
    borderRadius: 12,
    border: "1px solid rgba(148,163,184,0.28)",
    background: "rgba(15,23,42,0.8)",
    color: "#f8fafc",
    padding: 12,
    lineHeight: 1.5,
    boxSizing: "border-box",
    fontFamily: "inherit",
  },
  categoryNote: {
    marginTop: 14,
    borderRadius: 12,
    border: "1px solid rgba(96,165,250,0.2)",
    background: "rgba(59,130,246,0.08)",
    color: "#dbeafe",
    padding: 12,
    lineHeight: 1.5,
  },
  actions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 18,
  },
  primaryButton: {
    border: "1px solid rgba(96,165,250,0.5)",
    borderRadius: 12,
    background: "#3b82f6",
    color: "#ffffff",
    padding: "11px 16px",
    fontWeight: 900,
    cursor: "pointer",
  },
  secondaryButton: {
    border: "1px solid rgba(148,163,184,0.28)",
    borderRadius: 12,
    background: "rgba(15,23,42,0.75)",
    color: "#e2e8f0",
    padding: "11px 16px",
    fontWeight: 800,
    cursor: "pointer",
  },
  result: {
    marginTop: 22,
    border: "1px solid",
    borderRadius: 18,
    padding: 18,
  },
  resultTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
  },
  level: {
    fontSize: 12,
    fontWeight: 950,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
  },
  resultTitle: {
    margin: "7px 0 0",
    fontSize: 22,
  },
  resultSection: {
    marginTop: 16,
    color: "#e2e8f0",
    lineHeight: 1.55,
  },
  signalBox: {
    marginTop: 14,
    borderRadius: 12,
    background: "rgba(15,23,42,0.58)",
    padding: 12,
    color: "#cbd5e1",
    lineHeight: 1.6,
  },
  authorityNotice: {
    marginTop: 20,
    borderRadius: 14,
    border: "1px solid rgba(250,204,21,0.28)",
    background: "rgba(250,204,21,0.08)",
    color: "#fef3c7",
    padding: 14,
    lineHeight: 1.55,
  },
};
