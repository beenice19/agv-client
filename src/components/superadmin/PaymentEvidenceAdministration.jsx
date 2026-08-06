import React, {
  useMemo,
  useState,
} from "react";

const PAYMENT_METHODS = [
  "ACH",
  "WIRE",
  "CHECK",
  "CARD",
  "CASH",
  "OTHER",
];

const PAYMENT_PROVIDERS = [
  "MANUAL",
  "STRIPE",
  "PAYPAL",
  "BANK",
  "OTHER",
];

function firstText(...values) {
  for (const value of values) {
    if (
      value !== undefined &&
      value !== null &&
      String(value).trim()
    ) {
      return String(value).trim();
    }
  }

  return "";
}

function centsFromDollars(value) {
  const amount = Number(value);

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    return null;
  }

  return Math.round(amount * 100);
}

function formatMoney(cents, currency = "USD") {
  const amount = Number(cents || 0) / 100;

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency:
        firstText(currency, "USD").toUpperCase(),
    }).format(amount);
  }
  catch {
    return "$" + amount.toFixed(2) + " " + (currency || "USD");
  }
}

function Field({
  label,
  help,
  children,
}) {
  return (
    <label
      style={{
        display: "grid",
        gap: 7,
      }}
    >
      <span
        style={{
          color: "#e2e8f0",
          fontSize: 13,
          fontWeight: 800,
        }}
      >
        {label}
      </span>

      {children}

      {help ? (
        <span
          style={{
            color: "#94a3b8",
            fontSize: 12,
            lineHeight: 1.45,
          }}
        >
          {help}
        </span>
      ) : null}
    </label>
  );
}

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  borderRadius: 10,
  border: "1px solid rgba(148,163,184,0.28)",
  background: "rgba(15,23,42,0.88)",
  color: "#f8fafc",
  padding: "11px 12px",
  outline: "none",
};

export default function PaymentEvidenceAdministration({
  apiBase,
  getAdminHeaders,
  invoices = [],
  onRefresh,
}) {
  const [invoiceId, setInvoiceId] =
    useState("");
  const [amountDollars, setAmountDollars] =
    useState("");
  const [paymentReference, setPaymentReference] =
    useState("");
  const [paymentMethod, setPaymentMethod] =
    useState("ACH");
  const [paymentProvider, setPaymentProvider] =
    useState("MANUAL");
  const [externalTransactionId, setExternalTransactionId] =
    useState("");
  const [receivedAt, setReceivedAt] =
    useState("");
  const [evidenceNote, setEvidenceNote] =
    useState("");
  const [attestation, setAttestation] =
    useState(false);
  const [submitting, setSubmitting] =
    useState(false);
  const [message, setMessage] =
    useState("");
  const [error, setError] =
    useState("");

  const eligibleInvoices = useMemo(
    () =>
      invoices.filter((invoice) =>
        [
          "ISSUED",
          "PARTIALLY_PAID",
          "PAST_DUE",
        ].includes(invoice?.status)
      ),
    [invoices]
  );

  const selectedInvoice = useMemo(
    () =>
      eligibleInvoices.find(
        (invoice) =>
          invoice?.id === invoiceId
      ) || null,
    [eligibleInvoices, invoiceId]
  );

  const amountCents =
    centsFromDollars(amountDollars);

  const balanceDueCents =
    Number(
      selectedInvoice?.balanceDueCents || 0
    );

  const providerNeedsExternalId =
    paymentProvider !== "MANUAL";

  function resetForm() {
    setInvoiceId("");
    setAmountDollars("");
    setPaymentReference("");
    setPaymentMethod("ACH");
    setPaymentProvider("MANUAL");
    setExternalTransactionId("");
    setReceivedAt("");
    setEvidenceNote("");
    setAttestation(false);
  }

  async function submitPaymentEvidence(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!selectedInvoice) {
      setError(
        "Choose an eligible invoice."
      );
      return;
    }

    if (
      amountCents === null ||
      !Number.isSafeInteger(amountCents) ||
      amountCents <= 0
    ) {
      setError(
        "Payment amount must be greater than zero."
      );
      return;
    }

    if (amountCents > balanceDueCents) {
      setError(
        "Payment evidence cannot exceed the invoice balance."
      );
      return;
    }

    if (!paymentReference.trim()) {
      setError(
        "Payment reference is required."
      );
      return;
    }

    if (evidenceNote.trim().length < 8) {
      setError(
        "Evidence note must contain at least 8 characters."
      );
      return;
    }

    if (
      providerNeedsExternalId &&
      !externalTransactionId.trim()
    ) {
      setError(
        "External transaction ID is required for non-manual providers."
      );
      return;
    }

    if (!attestation) {
      setError(
        "The administrative attestation must be accepted."
      );
      return;
    }

    const payload = {
      amountCents,
      currency:
        firstText(
          selectedInvoice?.currency,
          "USD"
        ).toUpperCase(),
      paymentReference:
        paymentReference.trim(),
      paymentMethod,
      paymentProvider,
      evidenceNote:
        evidenceNote.trim(),
      attestation: true,
    };

    if (externalTransactionId.trim()) {
      payload.externalTransactionId =
        externalTransactionId.trim();
    }

    if (receivedAt) {
      payload.receivedAt =
        new Date(receivedAt).toISOString();
    }

    setSubmitting(true);

    try {
      const response = await fetch(
        apiBase +
          "/api/admin/commercial/invoices/" +
          encodeURIComponent(selectedInvoice.id) +
          "/payments",
        {
          method: "POST",
          headers: {
            ...getAdminHeaders(true),
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const body = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          body?.error ||
          "Payment evidence recording failed."
        );
      }

      setMessage(
        "Payment evidence " +
        (body?.payment?.paymentReference ||
          body?.payment?.id ||
          paymentReference.trim()) +
        " was recorded."
      );

      resetForm();

      if (typeof onRefresh === "function") {
        await onRefresh();
      }
    }
    catch (submitError) {
      setError(
        submitError?.message ||
        "Payment evidence recording failed."
      );
    }
    finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      style={{
        marginTop: 20,
        borderRadius: 18,
        border:
          "1px solid rgba(56,189,248,0.26)",
        background:
          "linear-gradient(180deg, rgba(15,23,42,0.96), rgba(15,23,42,0.82))",
        padding: 20,
        boxShadow:
          "0 18px 45px rgba(2,6,23,0.24)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 18,
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              color: "#38bdf8",
              fontSize: 12,
              fontWeight: 900,
              letterSpacing: 1.1,
              textTransform: "uppercase",
            }}
          >
            ANPE Financial Administration
          </div>

          <h2
            style={{
              margin: "6px 0 7px",
              color: "#f8fafc",
              fontSize: 24,
            }}
          >
            Payment Evidence Administration
          </h2>

          <p
            style={{
              margin: 0,
              maxWidth: 780,
              color: "#cbd5e1",
              lineHeight: 1.55,
            }}
          >
            Record evidence of a payment completed
            outside AGV. This control does not run a
            payment processor, charge a card, create
            checkout, or move money.
          </p>
        </div>

        <div
          style={{
            borderRadius: 12,
            border:
              "1px solid rgba(56,189,248,0.3)",
            background:
              "rgba(14,116,144,0.14)",
            padding: "10px 12px",
            color: "#bae6fd",
            fontWeight: 800,
            fontSize: 13,
          }}
        >
          {eligibleInvoices.length} eligible invoice
          {eligibleInvoices.length === 1 ? "" : "s"}
        </div>
      </div>

      <div
        style={{
          marginTop: 18,
          display: "grid",
          gridTemplateColumns:
            "minmax(0, 1.45fr) minmax(280px, 0.75fr)",
          gap: 16,
        }}
      >
        <form
          onSubmit={submitPaymentEvidence}
          style={{
            borderRadius: 15,
            border:
              "1px solid rgba(148,163,184,0.2)",
            background:
              "rgba(2,6,23,0.36)",
            padding: 16,
            display: "grid",
            gap: 14,
          }}
        >
          <h3
            style={{
              margin: 0,
              color: "#f8fafc",
              fontSize: 17,
            }}
          >
            Record External Payment Evidence
          </h3>

          <Field
            label="Eligible Invoice"
            help="Only ISSUED, PARTIALLY_PAID, or PAST_DUE invoices are available."
          >
            <select
              value={invoiceId}
              onChange={(event) => {
                setInvoiceId(event.target.value);
                setAmountDollars("");
              }}
              style={inputStyle}
              required
            >
              <option value="">
                Select an invoice
              </option>

              {eligibleInvoices.map(
                (invoice) => (
                  <option
                    key={invoice.id}
                    value={invoice.id}
                  >
                    {firstText(
                      invoice.invoiceNumber,
                      invoice.id
                    )} — {invoice.status} —{" "}
                    {formatMoney(
                      invoice.balanceDueCents,
                      invoice.currency
                    )}
                  </option>
                )
              )}
            </select>
          </Field>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(190px, 1fr))",
              gap: 12,
            }}
          >
            <Field label="Payment Amount (dollars)">
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amountDollars}
                onChange={(event) =>
                  setAmountDollars(
                    event.target.value
                  )
                }
                style={inputStyle}
                required
              />
            </Field>

            <Field
              label="Payment Reference"
              help="Must be unique across payment evidence records."
            >
              <input
                value={paymentReference}
                onChange={(event) =>
                  setPaymentReference(
                    event.target.value
                  )
                }
                style={inputStyle}
                maxLength={200}
                required
              />
            </Field>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(190px, 1fr))",
              gap: 12,
            }}
          >
            <Field label="Payment Method">
              <select
                value={paymentMethod}
                onChange={(event) =>
                  setPaymentMethod(
                    event.target.value
                  )
                }
                style={inputStyle}
              >
                {PAYMENT_METHODS.map(
                  (method) => (
                    <option
                      key={method}
                      value={method}
                    >
                      {method}
                    </option>
                  )
                )}
              </select>
            </Field>

            <Field label="Evidence Provider">
              <select
                value={paymentProvider}
                onChange={(event) => {
                  setPaymentProvider(
                    event.target.value
                  );

                  if (
                    event.target.value ===
                    "MANUAL"
                  ) {
                    setExternalTransactionId("");
                  }
                }}
                style={inputStyle}
              >
                {PAYMENT_PROVIDERS.map(
                  (provider) => (
                    <option
                      key={provider}
                      value={provider}
                    >
                      {provider}
                    </option>
                  )
                )}
              </select>
            </Field>
          </div>

          <Field
            label="External Transaction ID"
            help={
              providerNeedsExternalId
                ? "Required for STRIPE, PAYPAL, BANK, or OTHER."
                : "Optional for MANUAL evidence."
            }
          >
            <input
              value={externalTransactionId}
              onChange={(event) =>
                setExternalTransactionId(
                  event.target.value
                )
              }
              style={inputStyle}
              required={providerNeedsExternalId}
              maxLength={250}
            />
          </Field>

          <Field
            label="Received At"
            help="Optional. Defaults to the SERVER recording time."
          >
            <input
              type="datetime-local"
              value={receivedAt}
              onChange={(event) =>
                setReceivedAt(
                  event.target.value
                )
              }
              style={inputStyle}
            />
          </Field>

          <Field
            label="Evidence Note"
            help="Required administrative evidence note, minimum 8 characters."
          >
            <textarea
              value={evidenceNote}
              onChange={(event) =>
                setEvidenceNote(
                  event.target.value
                )
              }
              style={{
                ...inputStyle,
                minHeight: 96,
                resize: "vertical",
              }}
              minLength={8}
              maxLength={2000}
              required
            />
          </Field>

          <label
            style={{
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              borderRadius: 10,
              border:
                "1px solid rgba(56,189,248,0.25)",
              background:
                "rgba(14,116,144,0.1)",
              padding: 12,
              color: "#bae6fd",
              lineHeight: 1.5,
              fontSize: 13,
            }}
          >
            <input
              type="checkbox"
              checked={attestation}
              onChange={(event) =>
                setAttestation(
                  event.target.checked
                )
              }
              style={{
                marginTop: 3,
              }}
            />

            <span>
              I attest that this is a truthful
              administrative record of payment
              evidence received outside AGV. I
              understand this action does not execute
              a charge, checkout, transfer, settlement,
              or other movement of money.
            </span>
          </label>

          {error ? (
            <div
              role="alert"
              style={{
                borderRadius: 10,
                border:
                  "1px solid rgba(248,113,113,0.35)",
                background:
                  "rgba(127,29,29,0.18)",
                color: "#fecaca",
                padding: 11,
                fontWeight: 700,
              }}
            >
              {error}
            </div>
          ) : null}

          {message ? (
            <div
              role="status"
              style={{
                borderRadius: 10,
                border:
                  "1px solid rgba(74,222,128,0.35)",
                background:
                  "rgba(20,83,45,0.18)",
                color: "#bbf7d0",
                padding: 11,
                fontWeight: 700,
              }}
            >
              {message}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={
              submitting ||
              !selectedInvoice ||
              !attestation
            }
            style={{
              border: 0,
              borderRadius: 11,
              padding: "12px 15px",
              background:
                submitting ||
                !selectedInvoice ||
                !attestation
                  ? "rgba(71,85,105,0.55)"
                  : "linear-gradient(135deg, #38bdf8, #0ea5e9)",
              color:
                submitting ||
                !selectedInvoice ||
                !attestation
                  ? "#94a3b8"
                  : "#082f49",
              fontWeight: 950,
              cursor:
                submitting ||
                !selectedInvoice ||
                !attestation
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {submitting
              ? "Recording Evidence..."
              : "Record Payment Evidence"}
          </button>
        </form>

        <aside
          style={{
            borderRadius: 15,
            border:
              "1px solid rgba(56,189,248,0.24)",
            background:
              "rgba(14,116,144,0.09)",
            padding: 16,
            alignSelf: "start",
          }}
        >
          <h3
            style={{
              margin: "0 0 12px",
              color: "#f8fafc",
              fontSize: 17,
            }}
          >
            Payment Evidence Summary
          </h3>

          <div
            style={{
              display: "grid",
              gap: 10,
              color: "#cbd5e1",
              fontSize: 14,
            }}
          >
            <div>
              Invoice:{" "}
              <strong
                style={{ color: "#f8fafc" }}
              >
                {firstText(
                  selectedInvoice?.invoiceNumber,
                  selectedInvoice?.id,
                  "Not selected"
                )}
              </strong>
            </div>

            <div>
              Status:{" "}
              <strong
                style={{ color: "#f8fafc" }}
              >
                {firstText(
                  selectedInvoice?.status,
                  "—"
                )}
              </strong>
            </div>

            <div>
              Balance due:{" "}
              <strong
                style={{ color: "#f8fafc" }}
              >
                {formatMoney(
                  balanceDueCents,
                  selectedInvoice?.currency
                )}
              </strong>
            </div>

            <div>
              Evidence amount:{" "}
              <strong
                style={{
                  color: "#bae6fd",
                  fontSize: 18,
                }}
              >
                {formatMoney(
                  amountCents || 0,
                  selectedInvoice?.currency
                )}
              </strong>
            </div>
          </div>

          <div
            style={{
              marginTop: 14,
              borderRadius: 10,
              border:
                "1px solid rgba(250,204,21,0.28)",
              background:
                "rgba(113,63,18,0.14)",
              color: "#fde68a",
              padding: 11,
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            Evidence recording only. No payment
            processor, checkout, charge, settlement,
            transfer, or automatic money movement is
            connected through this control.
          </div>
        </aside>
      </div>
    </section>
  );
}
