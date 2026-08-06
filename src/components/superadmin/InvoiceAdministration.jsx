import React, {
  useMemo,
  useState,
} from "react";

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
  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    return null;
  }

  return Math.round(number * 100);
}

function dollarsFromCents(value) {
  const cents = Number(value);

  return Number.isFinite(cents)
    ? (cents / 100).toFixed(2)
    : "0.00";
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
  children,
  help,
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

export default function InvoiceAdministration({
  apiBase,
  getAdminHeaders,
  campaigns = [],
  contracts = [],
  invoices = [],
  onRefresh,
}) {
  const [contractId, setContractId] =
    useState("");
  const [invoiceNumber, setInvoiceNumber] =
    useState("");
  const [subtotalDollars, setSubtotalDollars] =
    useState("");
  const [taxDollars, setTaxDollars] =
    useState("0.00");
  const [currency, setCurrency] =
    useState("USD");
  const [issuedAt, setIssuedAt] =
    useState("");
  const [dueAt, setDueAt] =
    useState("");
  const [notes, setNotes] =
    useState("");
  const [submitting, setSubmitting] =
    useState(false);
  const [message, setMessage] =
    useState("");
  const [error, setError] =
    useState("");

  const eligibleContracts = useMemo(
    () =>
      contracts.filter(
        (contract) =>
          contract?.status === "SIGNED" ||
          contract?.status === "ACTIVE"
      ),
    [contracts]
  );

  const selectedContract = useMemo(
    () =>
      eligibleContracts.find(
        (contract) =>
          contract?.id === contractId
      ) || null,
    [eligibleContracts, contractId]
  );

  const selectedCampaign = useMemo(
    () =>
      campaigns.find(
        (campaign) =>
          campaign?.id ===
          selectedContract?.campaignId
      ) || null,
    [
      campaigns,
      selectedContract,
    ]
  );

  const activeInvoiceExists =
    useMemo(
      () =>
        invoices.some(
          (invoice) =>
            invoice?.contractId ===
              selectedContract?.id &&
            invoice?.campaignId ===
              selectedCampaign?.id &&
            invoice?.status !== "VOID" &&
            invoice?.status !== "REFUNDED"
        ),
      [
        invoices,
        selectedContract,
        selectedCampaign,
      ]
    );

  const subtotalCents =
    centsFromDollars(subtotalDollars);
  const taxCents =
    centsFromDollars(taxDollars);
  const totalCents =
    subtotalCents === null ||
    taxCents === null
      ? null
      : subtotalCents + taxCents;

  function resetForm() {
    setContractId("");
    setInvoiceNumber("");
    setSubtotalDollars("");
    setTaxDollars("0.00");
    setCurrency("USD");
    setIssuedAt("");
    setDueAt("");
    setNotes("");
  }

  async function submitInvoice(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!selectedContract) {
      setError(
        "Choose a SIGNED or ACTIVE contract."
      );
      return;
    }

    if (!selectedCampaign) {
      setError(
        "The selected contract does not have a matching campaign."
      );
      return;
    }

    if (activeInvoiceExists) {
      setError(
        "This campaign and contract already have an active invoice."
      );
      return;
    }

    if (
      subtotalCents === null ||
      taxCents === null ||
      totalCents === null
    ) {
      setError(
        "Subtotal and tax must be nonnegative dollar amounts."
      );
      return;
    }

    if (
      issuedAt &&
      dueAt &&
      new Date(dueAt).getTime() <
        new Date(issuedAt).getTime()
    ) {
      setError(
        "The due date cannot be before the issue date."
      );
      return;
    }

    const payload = {
      campaignId:
        selectedCampaign.id,
      contractId:
        selectedContract.id,
      subtotalCents,
      taxCents,
      totalCents,
      currency:
        firstText(
          currency,
          selectedCampaign?.currency,
          "USD"
        ).toUpperCase(),
      notes: notes.trim(),
    };

    if (invoiceNumber.trim()) {
      payload.invoiceNumber =
        invoiceNumber.trim();
    }

    if (issuedAt) {
      payload.issuedAt =
        new Date(issuedAt).toISOString();
    }

    if (dueAt) {
      payload.dueAt =
        new Date(dueAt).toISOString();
    }

    setSubmitting(true);

    try {
      const response = await fetch(
        apiBase + "/api/admin/commercial/invoices",
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
          "Invoice creation failed."
        );
      }

      setMessage(
        "Invoice " + (body?.invoice?.invoiceNumber || body?.invoice?.id || "") + " was created as DRAFT."
      );

      resetForm();

      if (typeof onRefresh === "function") {
        await onRefresh();
      }
    }
    catch (submitError) {
      setError(
        submitError?.message ||
        "Invoice creation failed."
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
          "1px solid rgba(250,204,21,0.26)",
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
              color: "#facc15",
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
            Invoice Administration
          </h2>

          <p
            style={{
              margin: 0,
              maxWidth: 760,
              color: "#cbd5e1",
              lineHeight: 1.55,
            }}
          >
            Create controlled administrative invoices
            for SIGNED or ACTIVE commercial contracts.
            This form does not charge a customer,
            start checkout, or execute billing.
          </p>
        </div>

        <div
          style={{
            borderRadius: 12,
            border:
              "1px solid rgba(96,165,250,0.3)",
            background:
              "rgba(30,64,175,0.12)",
            padding: "10px 12px",
            color: "#bfdbfe",
            fontWeight: 800,
            fontSize: 13,
          }}
        >
          {invoices.length} invoice
          {invoices.length === 1 ? "" : "s"}
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
          onSubmit={submitInvoice}
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
            New Administrative Invoice
          </h3>

          <Field
            label="Eligible Contract"
            help="Only SIGNED or ACTIVE contracts are available."
          >
            <select
              value={contractId}
              onChange={(event) => {
                const nextId =
                  event.target.value;
                const nextContract =
                  eligibleContracts.find(
                    (item) =>
                      item?.id === nextId
                  );
                const nextCampaign =
                  campaigns.find(
                    (item) =>
                      item?.id ===
                      nextContract?.campaignId
                  );

                setContractId(nextId);
                setCurrency(
                  firstText(
                    nextCampaign?.currency,
                    "USD"
                  ).toUpperCase()
                );

                const quotedCents =
                  Number(
                    nextCampaign?.quotedAmountCents
                  );

                if (
                  Number.isSafeInteger(
                    quotedCents
                  ) &&
                  quotedCents >= 0
                ) {
                  setSubtotalDollars(
                    dollarsFromCents(
                      quotedCents
                    )
                  );
                }
              }}
              style={inputStyle}
              required
            >
              <option value="">
                Select a contract
              </option>

              {eligibleContracts.map(
                (contract) => (
                  <option
                    key={contract.id}
                    value={contract.id}
                  >
                    {firstText(
                      contract.contractNumber,
                      contract.title,
                      contract.id
                    )} — {contract.status}
                  </option>
                )
              )}
            </select>
          </Field>

          <Field
            label="Campaign Association"
            help="Automatically inherited from the selected contract."
          >
            <input
              value={firstText(
                selectedCampaign?.name,
                selectedCampaign?.title,
                selectedCampaign?.id
              )}
              readOnly
              style={{
                ...inputStyle,
                color: "#94a3b8",
              }}
              placeholder="Select an eligible contract"
            />
          </Field>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(190px, 1fr))",
              gap: 12,
            }}
          >
            <Field
              label="Invoice Number"
              help="Optional. The SERVER will generate one when blank."
            >
              <input
                value={invoiceNumber}
                onChange={(event) =>
                  setInvoiceNumber(
                    event.target.value
                  )
                }
                style={inputStyle}
                placeholder="ANPE-2026-001"
              />
            </Field>

            <Field label="Currency">
              <input
                value={currency}
                onChange={(event) =>
                  setCurrency(
                    event.target.value
                      .toUpperCase()
                  )
                }
                style={inputStyle}
                maxLength={10}
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
            <Field label="Subtotal (dollars)">
              <input
                type="number"
                min="0"
                step="0.01"
                value={subtotalDollars}
                onChange={(event) =>
                  setSubtotalDollars(
                    event.target.value
                  )
                }
                style={inputStyle}
                required
              />
            </Field>

            <Field label="Tax (dollars)">
              <input
                type="number"
                min="0"
                step="0.01"
                value={taxDollars}
                onChange={(event) =>
                  setTaxDollars(
                    event.target.value
                  )
                }
                style={inputStyle}
                required
              />
            </Field>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            <Field
              label="Issued At"
              help="Optional. Stored as an ISO date and time."
            >
              <input
                type="datetime-local"
                value={issuedAt}
                onChange={(event) =>
                  setIssuedAt(
                    event.target.value
                  )
                }
                style={inputStyle}
              />
            </Field>

            <Field
              label="Due At"
              help="Cannot be earlier than the issue date."
            >
              <input
                type="datetime-local"
                value={dueAt}
                onChange={(event) =>
                  setDueAt(
                    event.target.value
                  )
                }
                style={inputStyle}
              />
            </Field>
          </div>

          <Field
            label="Invoice Notes"
            help="Administrative notes only. No payment processing instructions."
          >
            <textarea
              value={notes}
              onChange={(event) =>
                setNotes(event.target.value)
              }
              style={{
                ...inputStyle,
                minHeight: 92,
                resize: "vertical",
              }}
              maxLength={2000}
            />
          </Field>

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
              !selectedContract ||
              !selectedCampaign ||
              activeInvoiceExists
            }
            style={{
              border: 0,
              borderRadius: 11,
              padding: "12px 15px",
              background:
                submitting ||
                !selectedContract ||
                !selectedCampaign ||
                activeInvoiceExists
                  ? "rgba(71,85,105,0.55)"
                  : "linear-gradient(135deg, #facc15, #eab308)",
              color:
                submitting ||
                !selectedContract ||
                !selectedCampaign ||
                activeInvoiceExists
                  ? "#94a3b8"
                  : "#111827",
              fontWeight: 950,
              cursor:
                submitting ||
                !selectedContract ||
                !selectedCampaign ||
                activeInvoiceExists
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {submitting
              ? "Creating Invoice..."
              : "Create Draft Invoice"}
          </button>
        </form>

        <aside
          style={{
            borderRadius: 15,
            border:
              "1px solid rgba(96,165,250,0.24)",
            background:
              "rgba(30,64,175,0.09)",
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
            Invoice Summary
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
              Eligible contracts:{" "}
              <strong
                style={{ color: "#f8fafc" }}
              >
                {eligibleContracts.length}
              </strong>
            </div>

            <div>
              Campaign:{" "}
              <strong
                style={{ color: "#f8fafc" }}
              >
                {firstText(
                  selectedCampaign?.name,
                  selectedCampaign?.title,
                  selectedCampaign?.id,
                  "Not selected"
                )}
              </strong>
            </div>

            <div>
              Subtotal:{" "}
              <strong
                style={{ color: "#f8fafc" }}
              >
                {formatMoney(
                  subtotalCents || 0,
                  currency
                )}
              </strong>
            </div>

            <div>
              Tax:{" "}
              <strong
                style={{ color: "#f8fafc" }}
              >
                {formatMoney(
                  taxCents || 0,
                  currency
                )}
              </strong>
            </div>

            <div>
              Total:{" "}
              <strong
                style={{
                  color: "#fde68a",
                  fontSize: 18,
                }}
              >
                {formatMoney(
                  totalCents || 0,
                  currency
                )}
              </strong>
            </div>
          </div>

          {activeInvoiceExists ? (
            <div
              style={{
                marginTop: 14,
                borderRadius: 10,
                border:
                  "1px solid rgba(248,113,113,0.32)",
                background:
                  "rgba(127,29,29,0.16)",
                color: "#fecaca",
                padding: 11,
                fontSize: 13,
                lineHeight: 1.45,
                fontWeight: 700,
              }}
            >
              This campaign and contract already
              have an active invoice.
            </div>
          ) : null}

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
            Administrative invoicing only.
            Creating this record does not send an
            invoice, collect money, authorize a
            charge, enable checkout, or activate
            commercial sales.
          </div>
        </aside>
      </div>
    </section>
  );
}
