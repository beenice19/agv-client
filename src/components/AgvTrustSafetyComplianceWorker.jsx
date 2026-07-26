import React, { useMemo, useState } from "react";

const REPORT_TYPES = [
  { id: "harassment", label: "Harassment or Bullying", policy: "AGV Community Standards — Sections 7, 47–56" },
  { id: "threats", label: "Threats, Violence, or Emergency", policy: "AGV Community Standards — Sections 8–9, 20, 23–25, 52" },
  { id: "child-safety", label: "Child or Minor Safety", policy: "AGV Community Standards — Sections 13–16" },
  { id: "fraud", label: "Fraud, Scam, or Impersonation", policy: "AGV Community Standards — Sections 29–34" },
  { id: "privacy", label: "Privacy or Recording Concern", policy: "AGV Privacy Policy — Sections 16–22; Community Standards — Sections 37–38" },
  { id: "copyright", label: "Copyright or DMCA", policy: "DMCA and Copyright Policy — Sections 21–39" },
  { id: "security", label: "Security Incident or Account Compromise", policy: "Security and Incident Response Policy — Sections 24–49" },
  { id: "ai", label: "AI Misuse or Synthetic Media", policy: "AI Use and Disclosure Policy — Sections 14–24, 41–49" },
  { id: "regulated-event", label: "Bingo, Raffle, Fundraising, or Jurisdiction", policy: "Jurisdiction Review Guide — Sections 18–55" },
  { id: "payment", label: "Payment Dispute, Refund, or Chargeback", policy: "Chargeback Policy and Ticketing, Cancellation and Refund Policy" },
];

const DEFAULT_FORM = {
  reporterName: "",
  reporterEmail: "",
  reportedUser: "",
  eventName: "",
  roomId: "",
  reportType: "harassment",
  urgency: "routine",
  occurredAt: "",
  description: "",
  evidence: "",
  immediateDanger: false,
  minorInvolved: false,
  accountCompromise: false,
};

function clean(value) {
  return String(value || "").trim();
}

function includesAny(text, terms) {
  return terms.some((term) => text.includes(term));
}

function classifyReport(form) {
  const text = `${clean(form.description)} ${clean(form.evidence)}`.toLowerCase();
  const reasons = [];
  let level = "GREEN";
  let title = "Controlled Intake";
  let action = "Collect complete case information and route for routine Founder review.";
  let restriction = "Do not promise enforcement, removal, refunds, legal approval, or account action.";

  const emergency =
    form.immediateDanger ||
    includesAny(text, [
      "immediate danger",
      "kill",
      "shoot",
      "bomb",
      "weapon",
      "suicide",
      "self harm",
      "emergency",
      "active threat",
    ]);

  const childRisk =
    form.minorInvolved ||
    form.reportType === "child-safety" ||
    includesAny(text, [
      "child",
      "minor",
      "grooming",
      "exploitation",
      "trafficking",
      "csam",
    ]);

  const securityRisk =
    form.accountCompromise ||
    form.reportType === "security" ||
    includesAny(text, [
      "hacked",
      "stolen account",
      "credential",
      "malware",
      "data breach",
      "unauthorized access",
    ]);

  if (emergency || childRisk) {
    level = "RED";
    title = "Immediate Founder Escalation";
    action =
      "Preserve all evidence, timestamps, identities, room and event records. Escalate immediately to the Founder under the approved safety procedure.";
    restriction =
      "Do not contact law enforcement, notify the reported user, delete evidence, terminate an account, or make public statements without authorization.";

    if (emergency) reasons.push("Immediate danger or serious threat indicators detected.");
    if (childRisk) reasons.push("Child or minor safety indicators detected.");
  } else if (
    securityRisk ||
    ["copyright", "privacy", "regulated-event", "payment"].includes(form.reportType)
  ) {
    level = "YELLOW";
    title = "Founder Review Required";

    if (securityRisk) {
      action =
        "Preserve logs, account identifiers, timestamps, device and session details. Escalate for security incident triage.";
      restriction =
        "Do not reset credentials, revoke sessions, deploy code, disclose logs, or alter account ownership without approval.";
      reasons.push("Security or account-compromise review required.");
    } else if (form.reportType === "copyright") {
      action =
        "Collect claimant identity, copyrighted work description, exact content location, good-faith statement, signature, and contact details.";
      restriction =
        "Do not approve a takedown, restore content, disclose private data, or make a legal determination.";
      reasons.push("DMCA or copyright workflow required.");
    } else if (form.reportType === "privacy") {
      action =
        "Collect the affected data, account, event, recording, dates, requested remedy, and identity-verification information.";
      restriction =
        "Do not disclose personal data, confirm another user's information, or approve deletion without authorized review.";
      reasons.push("Privacy or recording-consent review required.");
    } else if (form.reportType === "regulated-event") {
      action =
        "Collect host entity, jurisdictions, event type, participant locations, payment or prize structure, licenses, rules, and counsel documentation.";
      restriction =
        "Do not approve bingo, raffles, sweepstakes, charitable gaming, fundraising, or jurisdiction eligibility.";
      reasons.push("Jurisdiction and regulated-activity review required.");
    } else {
      action =
        "Collect account email, transaction ID, amount, date, event, ticket details, requested resolution, and available evidence.";
      restriction =
        "Do not issue refunds, reverse payments, change subscriptions, move funds, or respond to a chargeback.";
      reasons.push("Financial authorization required.");
    }
  } else if (
    form.reportType === "fraud" ||
    form.reportType === "ai" ||
    form.reportType === "threats" ||
    form.urgency === "urgent"
  ) {
    level = "YELLOW";
    title = "Priority Founder Review";
    action =
      "Preserve screenshots, messages, usernames, URLs, timestamps, event and room identifiers, and a neutral summary of the allegation.";
    restriction =
      "Do not suspend or terminate accounts, remove content permanently, disclose reporter identity, or promise an outcome.";
    reasons.push("Priority trust and safety review required.");
  } else {
    reasons.push("Routine controlled intake path selected.");
  }

  const missing = [];
  if (!clean(form.description)) missing.push("Detailed description");
  if (!clean(form.reportedUser)) missing.push("Reported account or user");
  if (!clean(form.eventName) && !clean(form.roomId)) missing.push("Event name or room ID");
  if (!clean(form.occurredAt)) missing.push("Date or approximate time");
  if (!clean(form.evidence)) missing.push("Evidence description or location");

  return { level, title, action, restriction, reasons, missing };
}

function levelStyle(level) {
  if (level === "RED") {
    return {
      label: "Immediate Escalation",
      color: "#fecaca",
      border: "rgba(239,68,68,0.45)",
      background: "rgba(239,68,68,0.12)",
    };
  }

  if (level === "YELLOW") {
    return {
      label: "Founder Review",
      color: "#fde68a",
      border: "rgba(245,158,11,0.45)",
      background: "rgba(245,158,11,0.12)",
    };
  }

  return {
    label: "Controlled Intake",
    color: "#bbf7d0",
    border: "rgba(34,197,94,0.45)",
    background: "rgba(34,197,94,0.12)",
  };
}

export default function AgvTrustSafetyComplianceWorker() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [result, setResult] = useState(null);

  const selectedType = useMemo(
    () => REPORT_TYPES.find((item) => item.id === form.reportType) || REPORT_TYPES[0],
    [form.reportType]
  );

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setResult(null);
  }

  function reviewReport(event) {
    event.preventDefault();
    setResult(classifyReport(form));
  }

  function clearReport() {
    setForm(DEFAULT_FORM);
    setResult(null);
  }

  const presentation = levelStyle(result?.level);

  return (
    <section style={styles.shell} aria-labelledby="agv-trust-worker-title">
      <div style={styles.header}>
        <div>
          <div style={styles.eyebrow}>AGV TRUST, SAFETY & COMPLIANCE WORKER v1.0</div>
          <h2 id="agv-trust-worker-title" style={styles.title}>
            Controlled Intake Foundation
          </h2>
          <p style={styles.subtitle}>
            Organizes sensitive reports, maps them to AGV policy, identifies missing
            evidence, and escalates cases to the Founder. It cannot suspend accounts,
            remove content permanently, contact law enforcement, issue refunds,
            approve legal claims, or authorize regulated activities.
          </p>
        </div>
        <div style={styles.badge}>Intake Only</div>
      </div>

      <form onSubmit={reviewReport}>
        <div style={styles.grid}>
          <Field label="Reporter Name">
            <input
              value={form.reporterName}
              onChange={(event) => updateField("reporterName", event.target.value)}
              style={styles.input}
              placeholder="Optional"
            />
          </Field>

          <Field label="Reporter Email">
            <input
              value={form.reporterEmail}
              onChange={(event) => updateField("reporterEmail", event.target.value)}
              style={styles.input}
              type="email"
              placeholder="Optional during initial intake"
            />
          </Field>

          <Field label="Reported User or Account">
            <input
              value={form.reportedUser}
              onChange={(event) => updateField("reportedUser", event.target.value)}
              style={styles.input}
              placeholder="Username, email, or account ID"
            />
          </Field>

          <Field label="Report Type">
            <select
              value={form.reportType}
              onChange={(event) => updateField("reportType", event.target.value)}
              style={styles.input}
            >
              {REPORT_TYPES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Urgency">
            <select
              value={form.urgency}
              onChange={(event) => updateField("urgency", event.target.value)}
              style={styles.input}
            >
              <option value="routine">Routine</option>
              <option value="important">Important</option>
              <option value="urgent">Urgent</option>
            </select>
          </Field>

          <Field label="Date or Approximate Time">
            <input
              value={form.occurredAt}
              onChange={(event) => updateField("occurredAt", event.target.value)}
              style={styles.input}
              placeholder="Example: July 26 at 5:30 PM"
            />
          </Field>

          <Field label="Event Name">
            <input
              value={form.eventName}
              onChange={(event) => updateField("eventName", event.target.value)}
              style={styles.input}
              placeholder="Optional"
            />
          </Field>

          <Field label="Room ID">
            <input
              value={form.roomId}
              onChange={(event) => updateField("roomId", event.target.value)}
              style={styles.input}
              placeholder="Optional"
            />
          </Field>
        </div>

        <div style={styles.policyBox}>
          <strong>Likely governing policy:</strong> {selectedType.policy}
        </div>

        <div style={styles.flags}>
          <Checkbox
            label="Immediate danger may exist"
            checked={form.immediateDanger}
            onChange={(checked) => updateField("immediateDanger", checked)}
          />
          <Checkbox
            label="A child or minor may be involved"
            checked={form.minorInvolved}
            onChange={(checked) => updateField("minorInvolved", checked)}
          />
          <Checkbox
            label="Possible account compromise or security incident"
            checked={form.accountCompromise}
            onChange={(checked) => updateField("accountCompromise", checked)}
          />
        </div>

        <Field label="Detailed Description" block>
          <textarea
            value={form.description}
            onChange={(event) => updateField("description", event.target.value)}
            style={styles.textarea}
            rows={6}
            placeholder="Describe what happened, who was involved, what was observed, and any immediate concern."
          />
        </Field>

        <Field label="Evidence Available" block>
          <textarea
            value={form.evidence}
            onChange={(event) => updateField("evidence", event.target.value)}
            style={styles.textarea}
            rows={4}
            placeholder="Screenshots, chat messages, recordings, URLs, transaction IDs, logs, witnesses, or other evidence."
          />
        </Field>

        <div style={styles.actions}>
          <button type="submit" style={styles.primaryButton}>
            Review Intake Report
          </button>
          <button type="button" onClick={clearReport} style={styles.secondaryButton}>
            Clear Report
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
          <div style={{ ...styles.level, color: presentation.color }}>
            {presentation.label}
          </div>
          <h3 style={styles.resultTitle}>{result.title}</h3>

          <ResultBlock title="Recommended next step" text={result.action} />
          <ResultBlock title="Worker restriction" text={result.restriction} />

          <div style={styles.signalBox}>
            {result.reasons.map((reason) => (
              <div key={reason}>• {reason}</div>
            ))}
          </div>

          <div style={styles.missingBox}>
            <strong>Missing or incomplete information</strong>
            {result.missing.length ? (
              result.missing.map((item) => <div key={item}>• {item}</div>)
            ) : (
              <div>Initial intake fields are complete.</div>
            )}
          </div>
        </section>
      ) : null}

      <div style={styles.authorityNotice}>
        <strong>Founder authority preserved.</strong> Permanent account actions,
        legal determinations, law-enforcement contact, privacy disclosures,
        refunds, payment reversals, content removal, and jurisdiction approvals
        require authorized human review.
      </div>
    </section>
  );
}

function Field({ label, children, block = false }) {
  return (
    <label style={block ? styles.fieldBlock : styles.field}>
      <span style={styles.label}>{label}</span>
      {children}
    </label>
  );
}

function Checkbox({ label, checked, onChange }) {
  return (
    <label style={styles.checkboxLabel}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

function ResultBlock({ title, text }) {
  return (
    <div style={styles.resultBlock}>
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

const styles = {
  shell: {
    width: "100%",
    borderRadius: 24,
    border: "1px solid rgba(167,139,250,0.30)",
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
    color: "#c4b5fd",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: "0.12em",
  },
  title: {
    margin: "8px 0",
    fontSize: 28,
  },
  subtitle: {
    margin: 0,
    maxWidth: 800,
    color: "#cbd5e1",
    lineHeight: 1.6,
  },
  badge: {
    borderRadius: 999,
    border: "1px solid rgba(167,139,250,0.40)",
    background: "rgba(139,92,246,0.12)",
    color: "#ddd6fe",
    padding: "8px 12px",
    fontSize: 12,
    fontWeight: 900,
  },
  grid: {
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
    color: "#ede9fe",
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
  policyBox: {
    marginTop: 14,
    borderRadius: 12,
    border: "1px solid rgba(167,139,250,0.24)",
    background: "rgba(139,92,246,0.08)",
    color: "#ede9fe",
    padding: 12,
    lineHeight: 1.5,
  },
  flags: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 10,
    marginTop: 14,
  },
  checkboxLabel: {
    display: "flex",
    gap: 9,
    alignItems: "center",
    borderRadius: 12,
    border: "1px solid rgba(148,163,184,0.2)",
    background: "rgba(15,23,42,0.62)",
    padding: 11,
    color: "#e2e8f0",
  },
  actions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 18,
  },
  primaryButton: {
    border: "1px solid rgba(167,139,250,0.55)",
    borderRadius: 12,
    background: "#7c3aed",
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
  resultBlock: {
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
  missingBox: {
    marginTop: 14,
    borderRadius: 12,
    border: "1px solid rgba(148,163,184,0.2)",
    background: "rgba(15,23,42,0.45)",
    padding: 12,
    color: "#e2e8f0",
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
