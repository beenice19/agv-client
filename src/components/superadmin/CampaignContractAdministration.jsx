import React, { useMemo, useState } from "react";

const panelStyle = {
  padding: 16,
  borderRadius: 14,
  border: "1px solid rgba(148,163,184,0.22)",
  background: "rgba(15,23,42,0.78)",
};

const controlStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 11px",
  borderRadius: 10,
  border: "1px solid rgba(148,163,184,0.28)",
  background: "rgba(15,23,42,0.9)",
  color: "#f8fafc",
};

function Field({
  label,
  value,
  onChange,
  type = "text",
  options,
  required = false,
  full = false,
  rows = 4,
}) {
  return (
    <label
      style={{
        display: "grid",
        gap: 6,
        gridColumn: full ? "1 / -1" : undefined,
      }}
    >
      <span
        style={{
          color: "#e2e8f0",
          fontSize: 12,
          fontWeight: 800,
        }}
      >
        {label}
        {required ? " *" : ""}
      </span>

      {Array.isArray(options) ? (
        <select
          value={value}
          onChange={onChange}
          required={required}
          style={controlStyle}
        >
          {options.map((option) => (
            <option
              key={String(option.value)}
              value={option.value}
            >
              {option.label}
            </option>
          ))}
        </select>
      ) : type === "textarea" ? (
        <textarea
          value={value}
          onChange={onChange}
          rows={rows}
          style={{
            ...controlStyle,
            resize: "vertical",
          }}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={onChange}
          required={required}
          min={type === "number" ? "0" : undefined}
          step={type === "number" ? "0.01" : undefined}
          style={controlStyle}
        />
      )}
    </label>
  );
}

function dollarsToCents(value) {
  const number = Number(String(value || "").trim() || 0);

  if (!Number.isFinite(number) || number < 0) {
    throw new Error(
      "Dollar amounts must be zero or greater."
    );
  }

  return Math.round(number * 100);
}

function isoOrNull(value) {
  const text = String(value || "").trim();

  if (!text) {
    return null;
  }

  const date = new Date(text);

  if (Number.isNaN(date.getTime())) {
    throw new Error(
      "A date or time value is invalid."
    );
  }

  return date.toISOString();
}

export default function CampaignContractAdministration({
  apiBase,
  getAdminHeaders,
  campaigns = [],
  contracts = [],
  offers = [],
  productionServices = [],
  onRefresh,
}) {
  const [working, setWorking] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const [campaign, setCampaign] =
    useState({
      campaignName: "",
      buyerName: "",
      buyerEmail: "",
      organization: "",
      contactPhone: "",
      offerId: "",
      stationId: "",
      programId: "",
      startAt: "",
      endAt: "",
      quantity: "1",
      quotedAmount: "",
      currency: "USD",
      rightsClearanceStatus:
        "NOT_REVIEWED",
      creativeApprovalStatus:
        "NOT_REVIEWED",
      notes: "",
    });

  const [contract, setContract] =
    useState({
      campaignId: "",
      contractNumber: "",
      title: "",
      effectiveAt: "",
      expiresAt: "",
      totalAmount: "",
      currency: "USD",
      terms: "",
      notes: "",
    });

  const commercialOptions =
    useMemo(
      () => [
        {
          value: "",
          label: "No offer selected",
        },
        ...[
          ...offers,
          ...productionServices,
        ].map((item) => ({
          value: String(item.id || ""),
          label:
            (item.title ||
              item.name ||
              item.id) +
            " - " +
            (item.type ||
              "COMMERCIAL"),
        })),
      ],
      [
        offers,
        productionServices,
      ]
    );

  const availableCampaigns =
    useMemo(
      () =>
        campaigns.filter(
          (item) =>
            !contracts.some(
              (record) =>
                record.campaignId ===
                  item.id &&
                record.status !==
                  "VOID" &&
                record.status !==
                  "CANCELLED"
            )
        ),
      [
        campaigns,
        contracts,
      ]
    );

  async function post(
    route,
    payload
  ) {
    if (
      typeof getAdminHeaders !==
      "function"
    ) {
      throw new Error(
        "Administrative authentication is unavailable."
      );
    }

    const base =
      String(apiBase || "")
        .trim()
        .replace(/\/+$/, "");

    if (!base) {
      throw new Error(
        "ANPE API base is not configured."
      );
    }

    const response =
      await fetch(
        base + route,
        {
          method: "POST",
          headers: {
            Accept:
              "application/json",
            "Content-Type":
              "application/json",
            ...getAdminHeaders(true),
          },
          cache: "no-store",
          body:
            JSON.stringify(
              payload
            ),
        }
      );

    const body =
      await response
        .json()
        .catch(() => ({}));

    if (
      !response.ok ||
      body?.ok !== true
    ) {
      throw new Error(
        body?.error ||
        body?.message ||
        "ANPE administrative request failed."
      );
    }

    return body;
  }

  async function createCampaign(
    event
  ) {
    event.preventDefault();

    if (working) {
      return;
    }

    setWorking("campaign");
    setMessage("");
    setError("");

    try {
      const campaignName =
        campaign.campaignName.trim();

      if (!campaignName) {
        throw new Error(
          "A campaign name is required."
        );
      }

      const startAt =
        isoOrNull(
          campaign.startAt
        );

      const endAt =
        isoOrNull(
          campaign.endAt
        );

      if (
        startAt &&
        endAt &&
        Date.parse(endAt) <=
          Date.parse(startAt)
      ) {
        throw new Error(
          "Campaign end must be later than campaign start."
        );
      }

      const chosen =
        [
          ...offers,
          ...productionServices,
        ].find(
          (item) =>
            String(item.id) ===
            campaign.offerId
        );

      const result =
        await post(
          "/api/admin/commercial/campaigns",
          {
            campaignName,
            buyerName:
              campaign.buyerName.trim(),
            buyerEmail:
              campaign.buyerEmail.trim(),
            organization:
              campaign.organization.trim(),
            contactPhone:
              campaign.contactPhone.trim(),
            offerId:
              chosen?.id || "",
            offerType:
              chosen?.type || "",
            stationId:
              campaign.stationId.trim(),
            programId:
              campaign.programId.trim(),
            startAt,
            endAt,
            quantity:
              Math.max(
                1,
                Number.parseInt(
                  campaign.quantity,
                  10
                ) || 1
              ),
            quotedAmountCents:
              dollarsToCents(
                campaign.quotedAmount
              ),
            currency:
              String(
                campaign.currency ||
                "USD"
              )
                .trim()
                .toUpperCase(),
            rightsClearanceStatus:
              campaign
                .rightsClearanceStatus,
            creativeApprovalStatus:
              campaign
                .creativeApprovalStatus,
            notes:
              campaign.notes.trim(),
          }
        );

      setCampaign(
        (current) => ({
          ...current,
          campaignName: "",
          notes: "",
        })
      );

      setContract(
        (current) => ({
          ...current,
          campaignId:
            result?.campaign?.id ||
            current.campaignId,
        })
      );

      setMessage(
        (result?.campaign
          ?.campaignName ||
          campaignName) +
        " was created as a DRAFT campaign."
      );

      if (
        typeof onRefresh ===
        "function"
      ) {
        await onRefresh();
      }
    }
    catch (caught) {
      setError(
        caught?.message ||
        "The draft campaign could not be created."
      );
    }
    finally {
      setWorking("");
    }
  }

  async function createContract(
    event
  ) {
    event.preventDefault();

    if (working) {
      return;
    }

    setWorking("contract");
    setMessage("");
    setError("");

    try {
      const campaignId =
        contract.campaignId.trim();

      if (!campaignId) {
        throw new Error(
          "Select a campaign before creating its contract."
        );
      }

      const effectiveAt =
        isoOrNull(
          contract.effectiveAt
        );

      const expiresAt =
        isoOrNull(
          contract.expiresAt
        );

      if (
        effectiveAt &&
        expiresAt &&
        Date.parse(expiresAt) <=
          Date.parse(effectiveAt)
      ) {
        throw new Error(
          "Contract expiration must be later than its effective date."
        );
      }

      const result =
        await post(
          "/api/admin/commercial/contracts",
          {
            campaignId,
            contractNumber:
              contract
                .contractNumber
                .trim(),
            title:
              contract.title.trim(),
            effectiveAt,
            expiresAt,
            totalAmountCents:
              dollarsToCents(
                contract.totalAmount
              ),
            currency:
              String(
                contract.currency ||
                "USD"
              )
                .trim()
                .toUpperCase(),
            terms:
              contract.terms.trim(),
            notes:
              contract.notes.trim(),
          }
        );

      setContract({
        campaignId: "",
        contractNumber: "",
        title: "",
        effectiveAt: "",
        expiresAt: "",
        totalAmount: "",
        currency: "USD",
        terms: "",
        notes: "",
      });

      setMessage(
        (result?.contract?.title ||
          "Commercial contract") +
        " was created as a DRAFT contract."
      );

      if (
        typeof onRefresh ===
        "function"
      ) {
        await onRefresh();
      }
    }
    catch (caught) {
      setError(
        caught?.message ||
        "The draft contract could not be created."
      );
    }
    finally {
      setWorking("");
    }
  }

  const gridStyle = {
    display: "grid",
    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",
    gap: 12,
  };

  return (
    <section
      id="anpe-campaign-contract-administration"
      style={{
        marginTop: 20,
      }}
    >
      <div
        style={{
          marginBottom: 14,
        }}
      >
        <div
          style={{
            color: "#facc15",
            fontSize: 11,
            fontWeight: 900,
            letterSpacing: 1,
          }}
        >
          ANPE-03C2
        </div>

        <h3
          style={{
            margin: "6px 0 4px",
            color: "#f8fafc",
            fontSize: 22,
          }}
        >
          Campaign and Contract Administration
        </h3>

        <p
          style={{
            margin: 0,
            color: "#cbd5e1",
            lineHeight: 1.6,
          }}
        >
          Create protected administrative DRAFT records only.
          These controls do not sell airtime, collect payments,
          issue refunds, accept public orders, or activate playout.
        </p>
      </div>

      {error ? (
        <div
          role="alert"
          style={{
            marginBottom: 12,
            padding: 12,
            borderRadius: 10,
            color: "#fecaca",
            background:
              "rgba(127,29,29,0.22)",
          }}
        >
          {error}
        </div>
      ) : null}

      {message ? (
        <div
          role="status"
          style={{
            marginBottom: 12,
            padding: 12,
            borderRadius: 10,
            color: "#bbf7d0",
            background:
              "rgba(20,83,45,0.22)",
          }}
        >
          {message}
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(340px, 1fr))",
          gap: 16,
        }}
      >
        <form
          onSubmit={createCampaign}
          style={{
            ...panelStyle,
            borderColor:
              "rgba(250,204,21,0.3)",
          }}
        >
          <h4
            style={{
              margin: "0 0 14px",
              color: "#f8fafc",
              fontSize: 18,
            }}
          >
            New Draft Campaign
          </h4>

          <div style={gridStyle}>
            <Field
              label="Campaign name"
              required
              full
              value={
                campaign.campaignName
              }
              onChange={(event) =>
                setCampaign({
                  ...campaign,
                  campaignName:
                    event.target.value,
                })
              }
            />

            <Field
              label="Buyer/contact"
              value={campaign.buyerName}
              onChange={(event) =>
                setCampaign({
                  ...campaign,
                  buyerName:
                    event.target.value,
                })
              }
            />

            <Field
              label="Buyer email"
              type="email"
              value={campaign.buyerEmail}
              onChange={(event) =>
                setCampaign({
                  ...campaign,
                  buyerEmail:
                    event.target.value,
                })
              }
            />

            <Field
              label="Organization"
              value={campaign.organization}
              onChange={(event) =>
                setCampaign({
                  ...campaign,
                  organization:
                    event.target.value,
                })
              }
            />

            <Field
              label="Contact phone"
              value={campaign.contactPhone}
              onChange={(event) =>
                setCampaign({
                  ...campaign,
                  contactPhone:
                    event.target.value,
                })
              }
            />

            <Field
              label="Commercial offer/service"
              full
              options={commercialOptions}
              value={campaign.offerId}
              onChange={(event) =>
                setCampaign({
                  ...campaign,
                  offerId:
                    event.target.value,
                })
              }
            />

            <Field
              label="Station ID"
              value={campaign.stationId}
              onChange={(event) =>
                setCampaign({
                  ...campaign,
                  stationId:
                    event.target.value,
                })
              }
            />

            <Field
              label="Program ID"
              value={campaign.programId}
              onChange={(event) =>
                setCampaign({
                  ...campaign,
                  programId:
                    event.target.value,
                })
              }
            />

            <Field
              label="Campaign start"
              type="datetime-local"
              value={campaign.startAt}
              onChange={(event) =>
                setCampaign({
                  ...campaign,
                  startAt:
                    event.target.value,
                })
              }
            />

            <Field
              label="Campaign end"
              type="datetime-local"
              value={campaign.endAt}
              onChange={(event) =>
                setCampaign({
                  ...campaign,
                  endAt:
                    event.target.value,
                })
              }
            />

            <Field
              label="Quantity"
              type="number"
              value={campaign.quantity}
              onChange={(event) =>
                setCampaign({
                  ...campaign,
                  quantity:
                    event.target.value,
                })
              }
            />

            <Field
              label="Quoted amount"
              type="number"
              value={
                campaign.quotedAmount
              }
              onChange={(event) =>
                setCampaign({
                  ...campaign,
                  quotedAmount:
                    event.target.value,
                })
              }
            />

            <Field
              label="Rights clearance"
              options={[
                {
                  value:
                    "NOT_REVIEWED",
                  label:
                    "Not reviewed",
                },
                {
                  value: "PENDING",
                  label: "Pending",
                },
                {
                  value: "CLEARED",
                  label: "Cleared",
                },
                {
                  value: "REJECTED",
                  label: "Rejected",
                },
              ]}
              value={
                campaign
                  .rightsClearanceStatus
              }
              onChange={(event) =>
                setCampaign({
                  ...campaign,
                  rightsClearanceStatus:
                    event.target.value,
                })
              }
            />

            <Field
              label="Creative approval"
              options={[
                {
                  value:
                    "NOT_REVIEWED",
                  label:
                    "Not reviewed",
                },
                {
                  value: "PENDING",
                  label: "Pending",
                },
                {
                  value: "APPROVED",
                  label: "Approved",
                },
                {
                  value: "REJECTED",
                  label: "Rejected",
                },
              ]}
              value={
                campaign
                  .creativeApprovalStatus
              }
              onChange={(event) =>
                setCampaign({
                  ...campaign,
                  creativeApprovalStatus:
                    event.target.value,
                })
              }
            />

            <Field
              label="Campaign notes"
              type="textarea"
              full
              value={campaign.notes}
              onChange={(event) =>
                setCampaign({
                  ...campaign,
                  notes:
                    event.target.value,
                })
              }
            />
          </div>

          <button
            type="submit"
            disabled={
              working === "campaign"
            }
            style={{
              marginTop: 14,
              width: "100%",
              padding: "11px 14px",
              borderRadius: 10,
              border:
                "1px solid rgba(250,204,21,0.55)",
              background:
                "rgba(250,204,21,0.16)",
              color: "#fde68a",
              fontWeight: 900,
            }}
          >
            {working === "campaign"
              ? "Creating Draft Campaign..."
              : "Create Draft Campaign"}
          </button>
        </form>

        <form
          onSubmit={createContract}
          style={{
            ...panelStyle,
            borderColor:
              "rgba(96,165,250,0.3)",
          }}
        >
          <h4
            style={{
              margin: "0 0 14px",
              color: "#f8fafc",
              fontSize: 18,
            }}
          >
            New Draft Contract
          </h4>

          <div style={gridStyle}>
            <Field
              label="Campaign"
              required
              full
              options={[
                {
                  value: "",
                  label:
                    "Select a campaign",
                },
                ...availableCampaigns.map(
                  (item) => ({
                    value: item.id,
                    label:
                      (item.campaignName ||
                        item.id) +
                      " - " +
                      (item.status ||
                        "DRAFT"),
                  })
                ),
              ]}
              value={contract.campaignId}
              onChange={(event) =>
                setContract({
                  ...contract,
                  campaignId:
                    event.target.value,
                })
              }
            />

            <Field
              label="Contract number"
              value={
                contract.contractNumber
              }
              onChange={(event) =>
                setContract({
                  ...contract,
                  contractNumber:
                    event.target.value,
                })
              }
            />

            <Field
              label="Contract title"
              value={contract.title}
              onChange={(event) =>
                setContract({
                  ...contract,
                  title:
                    event.target.value,
                })
              }
            />

            <Field
              label="Effective date"
              type="datetime-local"
              value={
                contract.effectiveAt
              }
              onChange={(event) =>
                setContract({
                  ...contract,
                  effectiveAt:
                    event.target.value,
                })
              }
            />

            <Field
              label="Expiration date"
              type="datetime-local"
              value={contract.expiresAt}
              onChange={(event) =>
                setContract({
                  ...contract,
                  expiresAt:
                    event.target.value,
                })
              }
            />

            <Field
              label="Contract value"
              type="number"
              value={
                contract.totalAmount
              }
              onChange={(event) =>
                setContract({
                  ...contract,
                  totalAmount:
                    event.target.value,
                })
              }
            />

            <Field
              label="Currency"
              value={contract.currency}
              onChange={(event) =>
                setContract({
                  ...contract,
                  currency:
                    event.target.value,
                })
              }
            />

            <Field
              label="Contract terms"
              type="textarea"
              full
              rows={5}
              value={contract.terms}
              onChange={(event) =>
                setContract({
                  ...contract,
                  terms:
                    event.target.value,
                })
              }
            />

            <Field
              label="Contract notes"
              type="textarea"
              full
              value={contract.notes}
              onChange={(event) =>
                setContract({
                  ...contract,
                  notes:
                    event.target.value,
                })
              }
            />
          </div>

          <button
            type="submit"
            disabled={
              working === "contract"
            }
            style={{
              marginTop: 14,
              width: "100%",
              padding: "11px 14px",
              borderRadius: 10,
              border:
                "1px solid rgba(96,165,250,0.55)",
              background:
                "rgba(30,64,175,0.2)",
              color: "#bfdbfe",
              fontWeight: 900,
            }}
          >
            {working === "contract"
              ? "Creating Draft Contract..."
              : "Create Draft Contract"}
          </button>
        </form>
      </div>
    </section>
  );
}
