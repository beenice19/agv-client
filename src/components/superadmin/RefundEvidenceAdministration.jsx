import React, {
  useMemo,
  useState,
} from "react";

const REFUND_METHODS = [
  "ORIGINAL_METHOD",
  "ACH",
  "WIRE",
  "CHECK",
  "CARD",
  "CASH",
  "OTHER",
];

const REFUND_PROVIDERS = [
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

function safeWholeCents(value) {
  const cents = Number(value);

  return Number.isSafeInteger(cents) &&
    cents >= 0
    ? cents
    : 0;
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

function refundableBalanceFor(invoice) {
  const explicit = Number(
    invoice?.refundableBalanceCents
  );

  if (
    Number.isSafeInteger(explicit) &&
    explicit >= 0
  ) {
    return explicit;
  }

  const paid = safeWholeCents(
    invoice?.amountPaidCents
  );

  const refunded = safeWholeCents(
    invoice?.amountRefundedCents ??
    invoice?.refundedAmountCents
  );

  return Math.max(0, paid - refunded);
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

export default function RefundEvidenceAdministration({
  apiBase,
  getAdminHeaders,
  invoices = [],
  onRefresh,
}) {
  const [invoiceId, setInvoiceId] =
    useState("");
  const [amountDollars, setAmountDollars] =
    useState("");
  const [refundReference, setRefundReference] =
    useState("");
  const [refundMethod, setRefundMethod] =
    useState("ORIGINAL_METHOD");
  const [refundProvider, setRefundProvider] =
    useState("MANUAL");
  const [externalRefundId, setExternalRefundId] =
    useState("");
  const [refundedAt, setRefundedAt] =
    useState("");
  const [refundReason, setRefundReason] =
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
      invoices.filter(
        (invoice) =>
          invoice?.status === "PAID" &&
          refundableBalanceFor(invoice) > 0
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

  const refundableBalanceCents =
    refundableBalanceFor(selectedInvoice);

  const providerNeedsExternalId =
    refundProvider !== "MANUAL";

  function resetForm() {
    setInvoiceId("");
    setAmountDollars("");
    setRefundReference("");
    setRefundMethod("ORIGINAL_METHOD");
    setRefundProvider("MANUAL");
    setExternalRefundId("");
    setRefundedAt("");
    setRefundReason("");
    setEvidenceNote("");
    setAttestation(false);
  }

  async function submitRefundEvidence(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!selectedInvoice) {
      setError(
        "Choose a PAID invoice with a refundable balance."
      );
      return;
    }

    if (
      amountCents === null ||
      !Number.isSafeInteger(amountCents) ||
      amountCents <= 0
    ) {
      setError(
        "Refund amount must be greater than zero."
      );
      return;
    }

    if (
      amountCents >
      refundableBalanceCents
    ) {
      setError(
        "Refund evidence cannot exceed the refundable balance."
      );
      return;
    }

    if (!refundReference.trim()) {
      setError(
        "Refund reference is required."
      );
      return;
    }

    if (refundReason.trim().length < 8) {
      setError(
        "Refund reason must contain at least 8 characters."
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
      !externalRefundId.trim()
    ) {
      setError(
        "External refund ID is required for non-manual providers."
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
      refundReference:
        refundReference.trim(),
      refundMethod,
      refundProvider,
      refundReason:
        refundReason.trim(),
      evidenceNote:
        evidenceNote.trim(),
      attestation: true,
    };

    if (externalRefundId.trim()) {
      payload.externalRefundId =
        externalRefundId.trim();
    }

    if (refundedAt) {
      payload.refundedAt =
        new Date(refundedAt).toISOString();
    }

    setSubmitting(true);

    try {
      const response = await fetch(
        apiBase +
          "/api/admin/commercial/invoices/" +
          encodeURIComponent(selectedInvoice.id) +
          "/refunds",
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
          "Refund evidence recording failed."
        );
      }

      setMessage(
        "Refund evidence " +
        (body?.refund?.refundReference ||
          body?.refund?.id ||
          refundReference.trim()) +
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
        "Refund evidence recording failed."
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
          "1px solid rgba(244,114,182,0.28)",
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
              color: "#f472b6",
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
            Refund Evidence Administration
          </h2>

          <p
            style={{
              margin: 0,
              maxWidth: 790,
              color: "#cbd5e1",
              lineHeight: 1.55,
            }}
          >
            Record evidence of a refund completed
            outside AGV. This control does not execute
            a refund, contact a payment processor,
            reverse a charge, or move money.
          </p>
        </div>

        <div
          style={{
            borderRadius: 12,
            border:
              "1px solid rgba(244,114,182,0.3)",
            background:
              "rgba(157,23,77,0.14)",
            padding: "10px 12px",
            color: "#fbcfe8",
            fontWeight: 800,
            fontSize: 13,
          }}
        >
          {eligibleInvoices.length} refundable invoice
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
          onSubmit={submitRefundEvidence}
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
            Record External Refund Evidence
          </h3>

          <Field
            label="Eligible Invoice"
            help="Only PAID invoices with a remaining refundable balance are available."
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
                    )} — PAID —{" "}
                    {formatMoney(
                      refundableBalanceFor(invoice),
                      invoice.currency
                    )} refundable
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
            <Field label="Refund Amount (dollars)">
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
              label="Refund Reference"
              help="Must be unique across refund evidence records."
            >
              <input
                value={refundReference}
                onChange={(event) =>
                  setRefundReference(
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
            <Field label="Refund Method">
              <select
                value={refundMethod}
                onChange={(event) =>
                  setRefundMethod(
                    event.target.value
                  )
                }
                style={inputStyle}
              >
                {REFUND_METHODS.map(
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
                value={refundProvider}
                onChange={(event) => {
                  setRefundProvider(
                    event.target.value
                  );

                  if (
                    event.target.value ===
                    "MANUAL"
                  ) {
                    setExternalRefundId("");
                  }
                }}
                style={inputStyle}
              >
                {REFUND_PROVIDERS.map(
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
            label="External Refund ID"
            help={
              providerNeedsExternalId
                ? "Required for STRIPE, PAYPAL, BANK, or OTHER."
                : "Optional for MANUAL evidence."
            }
          >
            <input
              value={externalRefundId}
              onChange={(event) =>
                setExternalRefundId(
                  event.target.value
                )
              }
              style={inputStyle}
              required={providerNeedsExternalId}
              maxLength={250}
            />
          </Field>

          <Field
            label="Refunded At"
            help="Optional. Defaults to the SERVER recording time."
          >
            <input
              type="datetime-local"
              value={refundedAt}
              onChange={(event) =>
                setRefundedAt(
                  event.target.value
                )
              }
              style={inputStyle}
            />
          </Field>

          <Field
            label="Refund Reason"
            help="Required reason for the refund, minimum 8 characters."
          >
            <textarea
              value={refundReason}
              onChange={(event) =>
                setRefundReason(
                  event.target.value
                )
              }
              style={{
                ...inputStyle,
                minHeight: 86,
                resize: "vertical",
              }}
              minLength={8}
              maxLength={2000}
              required
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
                "1px solid rgba(244,114,182,0.25)",
              background:
                "rgba(157,23,77,0.1)",
              padding: 12,
              color: "#fbcfe8",
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
              administrative record of refund
              evidence completed outside AGV. I
              understand this action does not execute
              a refund, reverse a charge, contact a
              processor, or move money.
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
                  : "linear-gradient(135deg, #f472b6, #ec4899)",
              color:
                submitting ||
                !selectedInvoice ||
                !attestation
                  ? "#94a3b8"
                  : "#500724",
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
              ? "Recording Refund Evidence..."
              : "Record Refund Evidence"}
          </button>
        </form>

        <aside
          style={{
            borderRadius: 15,
            border:
              "1px solid rgba(244,114,182,0.24)",
            background:
              "rgba(157,23,77,0.09)",
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
            Refund Evidence Summary
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
              Refundable balance:{" "}
              <strong
                style={{ color: "#f8fafc" }}
              >
                {formatMoney(
                  refundableBalanceCents,
                  selectedInvoice?.currency
                )}
              </strong>
            </div>

            <div>
              Evidence amount:{" "}
              <strong
                style={{
                  color: "#fbcfe8",
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
            Evidence recording only. No automatic
            refund, processor call, charge reversal,
            settlement adjustment, transfer, or money
            movement is connected through this
            control.
          </div>
        </aside>
      </div>
    </section>
  );
}
