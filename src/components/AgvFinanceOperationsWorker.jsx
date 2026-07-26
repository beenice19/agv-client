import React, { useMemo, useState } from "react";

const AGV_PLATFORM_FEE_RATE = 0.07;

const DEFAULT_FORM = {
  eventName: "",
  hostName: "",
  hostId: "",
  transactionId: "",
  grossRevenue: "",
  refunds: "",
  broadcastDeliveryFee: "",
  paymentProcessingFee: "",
  recordedAgvFee: "",
  recordedHostNet: "",
  gatewayStatus: "NOT_CONNECTED",
  approvalStatus: "PENDING",
  disputeStatus: "NONE",
  notes: "",
};

function money(value) {
  const parsed = Number(String(value || "").replace(/[$,\s]/g, ""));
  return Number.isFinite(parsed) ? Math.max(parsed, 0) : 0;
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value || 0));
}

function withinTolerance(left, right, tolerance = 0.01) {
  return Math.abs(Number(left || 0) - Number(right || 0)) <= tolerance;
}

function analyzeFinanceRecord(form) {
  const gross = money(form.grossRevenue);
  const refunds = money(form.refunds);
  const deliveryFee = money(form.broadcastDeliveryFee);
  const processingFee = money(form.paymentProcessingFee);
  const recordedAgvFee = money(form.recordedAgvFee);
  const recordedHostNet = money(form.recordedHostNet);

  const netCollectedRevenue = Math.max(gross - refunds, 0);
  const expectedAgvFee = Number(
    (netCollectedRevenue * AGV_PLATFORM_FEE_RATE).toFixed(2)
  );
  const expectedHostNet = Number(
    Math.max(
      netCollectedRevenue -
        expectedAgvFee -
        deliveryFee -
        processingFee,
      0
    ).toFixed(2)
  );

  const exceptions = [];
  const missing = [];

  if (!form.eventName.trim()) missing.push("Event name");
  if (!form.hostName.trim() && !form.hostId.trim()) {
    missing.push("Host name or host ID");
  }
  if (!form.transactionId.trim()) missing.push("Transaction or settlement ID");
  if (gross <= 0) missing.push("Gross ticket revenue");

  if (refunds > gross) {
    exceptions.push("Refunds exceed gross ticket revenue.");
  }

  if (
    form.recordedAgvFee !== "" &&
    !withinTolerance(recordedAgvFee, expectedAgvFee)
  ) {
    exceptions.push(
      `Recorded AGV fee differs from the expected 7% fee by ${formatMoney(
        Math.abs(recordedAgvFee - expectedAgvFee)
      )}.`
    );
  }

  if (
    form.recordedHostNet !== "" &&
    !withinTolerance(recordedHostNet, expectedHostNet)
  ) {
    exceptions.push(
      `Recorded host net differs from the expected host net by ${formatMoney(
        Math.abs(recordedHostNet - expectedHostNet)
      )}.`
    );
  }

  if (
    ["NOT_CONNECTED", "ACTION_REQUIRED", "PENDING_VERIFICATION"].includes(
      form.gatewayStatus
    )
  ) {
    exceptions.push(
      `Payout gateway status is ${form.gatewayStatus.replaceAll("_", " ")}.`
    );
  }

  if (form.approvalStatus !== "APPROVED") {
    exceptions.push("Host financial approval is not complete.");
  }

  if (form.disputeStatus === "OPEN_CHARGEBACK") {
    exceptions.push("An open chargeback requires Founder financial review.");
  }

  if (form.disputeStatus === "REFUND_REQUESTED") {
    exceptions.push("A refund request requires Founder authorization.");
  }

  let level = "GREEN";
  let title = "Reconciliation Ready";
  let recommendation =
    "The record is mathematically consistent and may proceed to normal Founder review.";

  if (
    refunds > gross ||
    form.disputeStatus === "OPEN_CHARGEBACK" ||
    exceptions.some((item) => item.includes("differs"))
  ) {
    level = "RED";
    title = "Financial Exception Detected";
    recommendation =
      "Freeze automated settlement action for this record, preserve the source records, and escalate the reconciliation packet to the Founder.";
  } else if (exceptions.length || missing.length) {
    level = "YELLOW";
    title = "Founder Review Required";
    recommendation =
      "Collect the missing records, confirm payout readiness, and resolve the listed exceptions before settlement approval.";
  }

  return {
    level,
    title,
    gross,
    refunds,
    netCollectedRevenue,
    expectedAgvFee,
    deliveryFee,
    processingFee,
    expectedHostNet,
    exceptions,
    missing,
    recommendation,
  };
}

function presentation(level) {
  if (level === "RED") {
    return {
      label: "Financial Exception",
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
    label: "Reconciled",
    color: "#bbf7d0",
    border: "rgba(34,197,94,0.45)",
    background: "rgba(34,197,94,0.12)",
  };
}

export default function AgvFinanceOperationsWorker() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [result, setResult] = useState(null);

  const livePreview = useMemo(() => {
    const gross = money(form.grossRevenue);
    const refunds = money(form.refunds);
    const delivery = money(form.broadcastDeliveryFee);
    const processing = money(form.paymentProcessingFee);
    const netCollected = Math.max(gross - refunds, 0);
    const agvFee = Number(
      (netCollected * AGV_PLATFORM_FEE_RATE).toFixed(2)
    );
    const hostNet = Number(
      Math.max(netCollected - agvFee - delivery - processing, 0).toFixed(2)
    );

    return { gross, refunds, netCollected, agvFee, delivery, processing, hostNet };
  }, [form]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setResult(null);
  }

  function reviewRecord(event) {
    event.preventDefault();
    setResult(analyzeFinanceRecord(form));
  }

  function clearRecord() {
    setForm(DEFAULT_FORM);
    setResult(null);
  }

  const level = presentation(result?.level);

  return (
    <section style={styles.shell} aria-labelledby="agv-finance-worker-title">
      <div style={styles.header}>
        <div>
          <div style={styles.eyebrow}>AGV FINANCE OPERATIONS WORKER v1.0</div>
          <h2 id="agv-finance-worker-title" style={styles.title}>
            Read-Only Reconciliation Foundation
          </h2>
          <p style={styles.subtitle}>
            Verifies AGV financial calculations, identifies payout and settlement
            exceptions, and prepares records for Founder review. It cannot move
            money, issue refunds, release payouts, alter bank information, change
            fees, or respond to chargebacks.
          </p>
        </div>
        <div style={styles.badge}>Read-Only Finance</div>
      </div>

      <form onSubmit={reviewRecord}>
        <div style={styles.grid}>
          <Field label="Event Name">
            <input
              value={form.eventName}
              onChange={(event) => updateField("eventName", event.target.value)}
              style={styles.input}
              placeholder="Required"
            />
          </Field>

          <Field label="Host Name">
            <input
              value={form.hostName}
              onChange={(event) => updateField("hostName", event.target.value)}
              style={styles.input}
              placeholder="Host or organization"
            />
          </Field>

          <Field label="Host ID">
            <input
              value={form.hostId}
              onChange={(event) => updateField("hostId", event.target.value)}
              style={styles.input}
              placeholder="Vendor or host ID"
            />
          </Field>

          <Field label="Transaction / Settlement ID">
            <input
              value={form.transactionId}
              onChange={(event) =>
                updateField("transactionId", event.target.value)
              }
              style={styles.input}
              placeholder="Stripe, ticket, or settlement ID"
            />
          </Field>

          <Field label="Gross Ticket Revenue">
            <input
              value={form.grossRevenue}
              onChange={(event) =>
                updateField("grossRevenue", event.target.value)
              }
              style={styles.input}
              inputMode="decimal"
              placeholder="0.00"
            />
          </Field>

          <Field label="Refunds / Adjustments">
            <input
              value={form.refunds}
              onChange={(event) => updateField("refunds", event.target.value)}
              style={styles.input}
              inputMode="decimal"
              placeholder="0.00"
            />
          </Field>

          <Field label="Broadcast Delivery Fee">
            <input
              value={form.broadcastDeliveryFee}
              onChange={(event) =>
                updateField("broadcastDeliveryFee", event.target.value)
              }
              style={styles.input}
              inputMode="decimal"
              placeholder="0.00"
            />
          </Field>

          <Field label="Payment Processing Fee">
            <input
              value={form.paymentProcessingFee}
              onChange={(event) =>
                updateField("paymentProcessingFee", event.target.value)
              }
              style={styles.input}
              inputMode="decimal"
              placeholder="0.00"
            />
          </Field>

          <Field label="Recorded AGV Fee">
            <input
              value={form.recordedAgvFee}
              onChange={(event) =>
                updateField("recordedAgvFee", event.target.value)
              }
              style={styles.input}
              inputMode="decimal"
              placeholder="Optional comparison"
            />
          </Field>

          <Field label="Recorded Host Net">
            <input
              value={form.recordedHostNet}
              onChange={(event) =>
                updateField("recordedHostNet", event.target.value)
              }
              style={styles.input}
              inputMode="decimal"
              placeholder="Optional comparison"
            />
          </Field>

          <Field label="Payout Gateway Status">
            <select
              value={form.gatewayStatus}
              onChange={(event) =>
                updateField("gatewayStatus", event.target.value)
              }
              style={styles.input}
            >
              <option value="NOT_CONNECTED">Not Connected</option>
              <option value="PENDING_VERIFICATION">Pending Verification</option>
              <option value="ACTION_REQUIRED">Action Required</option>
              <option value="AGV_GATEWAY_ACTIVE">AGV Gateway Active</option>
              <option value="VERIFIED">Stripe Verified</option>
            </select>
          </Field>

          <Field label="Approval Status">
            <select
              value={form.approvalStatus}
              onChange={(event) =>
                updateField("approvalStatus", event.target.value)
              }
              style={styles.input}
            >
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REVIEW_REQUIRED">Review Required</option>
            </select>
          </Field>

          <Field label="Refund / Dispute Status">
            <select
              value={form.disputeStatus}
              onChange={(event) =>
                updateField("disputeStatus", event.target.value)
              }
              style={styles.input}
            >
              <option value="NONE">None</option>
              <option value="REFUND_REQUESTED">Refund Requested</option>
              <option value="OPEN_CHARGEBACK">Open Chargeback</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </Field>
        </div>

        <div style={styles.formulaBox}>
          <strong>AGV financial model:</strong> Gross revenue − refunds − 7%
          platform fee − broadcast delivery fee − payment processing fee = host
          net revenue.
        </div>

        <div style={styles.previewGrid}>
          <Summary label="Gross" value={formatMoney(livePreview.gross)} />
          <Summary label="Refunds" value={formatMoney(livePreview.refunds)} />
          <Summary
            label="Net Collected"
            value={formatMoney(livePreview.netCollected)}
          />
          <Summary
            label="AGV 7% Fee"
            value={formatMoney(livePreview.agvFee)}
          />
          <Summary
            label="Delivery Fee"
            value={formatMoney(livePreview.delivery)}
          />
          <Summary
            label="Processing Fee"
            value={formatMoney(livePreview.processing)}
          />
          <Summary
            label="Expected Host Net"
            value={formatMoney(livePreview.hostNet)}
          />
        </div>

        <Field label="Financial Notes" block>
          <textarea
            value={form.notes}
            onChange={(event) => updateField("notes", event.target.value)}
            style={styles.textarea}
            rows={4}
            placeholder="Optional reconciliation notes, evidence locations, or exception details."
          />
        </Field>

        <div style={styles.actions}>
          <button type="submit" style={styles.primaryButton}>
            Review Financial Record
          </button>
          <button
            type="button"
            onClick={clearRecord}
            style={styles.secondaryButton}
          >
            Clear Record
          </button>
        </div>
      </form>

      {result ? (
        <section
          style={{
            ...styles.result,
            borderColor: level.border,
            background: level.background,
          }}
          aria-live="polite"
        >
          <div style={{ ...styles.level, color: level.color }}>{level.label}</div>
          <h3 style={styles.resultTitle}>{result.title}</h3>

          <div style={styles.resultGrid}>
            <ResultValue label="Gross Revenue" value={result.gross} />
            <ResultValue label="Refunds" value={result.refunds} />
            <ResultValue
              label="Net Collected Revenue"
              value={result.netCollectedRevenue}
            />
            <ResultValue
              label="Expected AGV 7% Fee"
              value={result.expectedAgvFee}
            />
            <ResultValue
              label="Broadcast Delivery Fee"
              value={result.deliveryFee}
            />
            <ResultValue
              label="Payment Processing Fee"
              value={result.processingFee}
            />
            <ResultValue
              label="Expected Host Net"
              value={result.expectedHostNet}
            />
          </div>

          <div style={styles.resultBlock}>
            <strong>Recommended next step</strong>
            <p>{result.recommendation}</p>
          </div>

          <div style={styles.listBox}>
            <strong>Financial exceptions</strong>
            {result.exceptions.length ? (
              result.exceptions.map((item) => <div key={item}>• {item}</div>)
            ) : (
              <div>No calculation or payout exceptions detected.</div>
            )}
          </div>

          <div style={styles.listBox}>
            <strong>Missing or incomplete records</strong>
            {result.missing.length ? (
              result.missing.map((item) => <div key={item}>• {item}</div>)
            ) : (
              <div>Initial reconciliation fields are complete.</div>
            )}
          </div>
        </section>
      ) : null}

      <div style={styles.authorityNotice}>
        <strong>Founder authority preserved.</strong> This worker can calculate,
        compare, classify, and recommend. Refunds, payouts, payment reversals,
        chargeback responses, settlement approval, fee changes, bank changes,
        tax conclusions, and movement of funds require authorized human action.
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

function Summary({ label, value }) {
  return (
    <div style={styles.summaryCard}>
      <div style={styles.summaryLabel}>{label}</div>
      <div style={styles.summaryValue}>{value}</div>
    </div>
  );
}

function ResultValue({ label, value }) {
  return (
    <div style={styles.resultValue}>
      <div style={styles.summaryLabel}>{label}</div>
      <div style={styles.summaryValue}>{formatMoney(value)}</div>
    </div>
  );
}

const styles = {
  shell: {
    width: "100%",
    borderRadius: 24,
    border: "1px solid rgba(52,211,153,0.28)",
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
    color: "#6ee7b7",
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
    border: "1px solid rgba(52,211,153,0.38)",
    background: "rgba(16,185,129,0.12)",
    color: "#a7f3d0",
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
    color: "#d1fae5",
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
  formulaBox: {
    marginTop: 14,
    borderRadius: 12,
    border: "1px solid rgba(52,211,153,0.24)",
    background: "rgba(16,185,129,0.08)",
    color: "#d1fae5",
    padding: 12,
    lineHeight: 1.5,
  },
  previewGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
    gap: 10,
    marginTop: 14,
  },
  summaryCard: {
    borderRadius: 14,
    border: "1px solid rgba(148,163,184,0.18)",
    background: "rgba(15,23,42,0.65)",
    padding: 13,
  },
  summaryLabel: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: 850,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  summaryValue: {
    marginTop: 6,
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: 900,
  },
  actions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 18,
  },
  primaryButton: {
    border: "1px solid rgba(52,211,153,0.5)",
    borderRadius: 12,
    background: "#059669",
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
  resultGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 10,
    marginTop: 16,
  },
  resultValue: {
    borderRadius: 12,
    background: "rgba(15,23,42,0.52)",
    padding: 12,
  },
  resultBlock: {
    marginTop: 16,
    color: "#e2e8f0",
    lineHeight: 1.55,
  },
  listBox: {
    marginTop: 14,
    borderRadius: 12,
    background: "rgba(15,23,42,0.52)",
    padding: 12,
    color: "#cbd5e1",
    lineHeight: 1.65,
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
