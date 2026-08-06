import React, { useMemo, useState } from "react";

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
          style={controlStyle}
        />
      )}
    </label>
  );
}

function toIso(value, label) {
  const text = String(value || "").trim();

  if (!text) {
    throw new Error(label + " is required.");
  }

  const date = new Date(text);

  if (Number.isNaN(date.getTime())) {
    throw new Error(label + " is invalid.");
  }

  return date.toISOString();
}

export default function SchedulingAdministration({
  apiBase,
  getAdminHeaders,
  campaigns = [],
  contracts = [],
  placements = [],
  onRefresh,
}) {
  const [form, setForm] = useState({
    contractId: "",
    stationId: "",
    programId: "",
    scheduledStartAt: "",
    scheduledEndAt: "",
    placementType: "AIRTIME_SPOT",
    notes: "",
  });

  const [working, setWorking] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const eligibleContracts =
    useMemo(
      () =>
        contracts.filter(
          (contract) =>
            contract.status ===
              "SIGNED" ||
            contract.status ===
              "ACTIVE"
        ),
      [contracts]
    );

  const selectedContract =
    useMemo(
      () =>
        eligibleContracts.find(
          (contract) =>
            contract.id ===
            form.contractId
        ) || null,
      [
        eligibleContracts,
        form.contractId,
      ]
    );

  const selectedCampaign =
    useMemo(
      () =>
        campaigns.find(
          (campaign) =>
            campaign.id ===
            selectedContract
              ?.campaignId
        ) || null,
      [
        campaigns,
        selectedContract,
      ]
    );

  async function createPlacement(
    event
  ) {
    event.preventDefault();

    if (working) {
      return;
    }

    setWorking(true);
    setMessage("");
    setError("");

    try {
      if (!selectedContract) {
        throw new Error(
          "Select a SIGNED or ACTIVE contract."
        );
      }

      if (!selectedCampaign) {
        throw new Error(
          "The selected contract has no matching campaign."
        );
      }

      const scheduledStartAt =
        toIso(
          form.scheduledStartAt,
          "Scheduled start"
        );

      const scheduledEndAt =
        toIso(
          form.scheduledEndAt,
          "Scheduled end"
        );

      if (
        Date.parse(
          scheduledEndAt
        ) <=
        Date.parse(
          scheduledStartAt
        )
      ) {
        throw new Error(
          "Scheduled end must be later than scheduled start."
        );
      }

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
          base +
            "/api/admin/commercial/schedule-placements",
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
              JSON.stringify({
                campaignId:
                  selectedCampaign.id,
                contractId:
                  selectedContract.id,
                stationId:
                  form.stationId.trim(),
                programId:
                  form.programId.trim(),
                scheduledStartAt,
                scheduledEndAt,
                placementType:
                  form.placementType,
                notes:
                  form.notes.trim(),
              }),
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
          "The schedule placement could not be created."
        );
      }

      setForm({
        contractId: "",
        stationId: "",
        programId: "",
        scheduledStartAt: "",
        scheduledEndAt: "",
        placementType:
          "AIRTIME_SPOT",
        notes: "",
      });

      setMessage(
        "The schedule placement was created as an administrative record. Continuous playout remains disabled."
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
        "The schedule placement could not be created."
      );
    }
    finally {
      setWorking(false);
    }
  }

  return (
    <section
      id="anpe-scheduling-administration"
      style={{
        marginTop: 20,
        paddingTop: 18,
        borderTop:
          "1px solid rgba(148,163,184,0.18)",
      }}
    >
      <div
        style={{
          marginBottom: 14,
        }}
      >
        <div
          style={{
            color: "#60a5fa",
            fontSize: 11,
            fontWeight: 900,
            letterSpacing: 1,
          }}
        >
          ANPE-03D2
        </div>

        <h3
          style={{
            margin: "6px 0 4px",
            color: "#f8fafc",
            fontSize: 22,
          }}
        >
          Scheduling Administration
        </h3>

        <p
          style={{
            margin: 0,
            color: "#cbd5e1",
            lineHeight: 1.6,
          }}
        >
          Create controlled administrative placement records for SIGNED or ACTIVE contracts.
          This does not start playback, insert advertising, or enable continuous playout.
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
            "minmax(0, 1.2fr) minmax(280px, 0.8fr)",
          gap: 16,
          alignItems: "start",
        }}
      >
        <form
          onSubmit={
            createPlacement
          }
          style={{
            padding: 16,
            borderRadius: 14,
            border:
              "1px solid rgba(96,165,250,0.3)",
            background:
              "rgba(15,23,42,0.78)",
          }}
        >
          <h4
            style={{
              margin: "0 0 14px",
              color: "#f8fafc",
              fontSize: 18,
            }}
          >
            New Schedule Placement
          </h4>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(2, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <Field
              label="Eligible contract"
              required
              full
              options={[
                {
                  value: "",
                  label:
                    eligibleContracts.length
                      ? "Select a SIGNED or ACTIVE contract"
                      : "No SIGNED or ACTIVE contracts available",
                },
                ...eligibleContracts.map(
                  (contract) => ({
                    value:
                      contract.id,
                    label:
                      (contract.title ||
                        contract.contractNumber ||
                        contract.id) +
                      " - " +
                      contract.status,
                  })
                ),
              ]}
              value={
                form.contractId
              }
              onChange={(event) =>
                setForm({
                  ...form,
                  contractId:
                    event.target.value,
                })
              }
            />

            <Field
              label="Campaign"
              full
              value={
                selectedCampaign
                  ?.campaignName ||
                selectedCampaign
                  ?.id ||
                "Select an eligible contract"
              }
              onChange={() => {}}
            />

            <Field
              label="Station ID"
              value={
                form.stationId
              }
              onChange={(event) =>
                setForm({
                  ...form,
                  stationId:
                    event.target.value,
                })
              }
            />

            <Field
              label="Program ID"
              value={
                form.programId
              }
              onChange={(event) =>
                setForm({
                  ...form,
                  programId:
                    event.target.value,
                })
              }
            />

            <Field
              label="Scheduled start"
              type="datetime-local"
              required
              value={
                form.scheduledStartAt
              }
              onChange={(event) =>
                setForm({
                  ...form,
                  scheduledStartAt:
                    event.target.value,
                })
              }
            />

            <Field
              label="Scheduled end"
              type="datetime-local"
              required
              value={
                form.scheduledEndAt
              }
              onChange={(event) =>
                setForm({
                  ...form,
                  scheduledEndAt:
                    event.target.value,
                })
              }
            />

            <Field
              label="Placement type"
              full
              options={[
                {
                  value:
                    "AIRTIME_SPOT",
                  label:
                    "Airtime spot",
                },
                {
                  value:
                    "SPONSORED_PROGRAM",
                  label:
                    "Sponsored program",
                },
                {
                  value:
                    "PROGRAM_BLOCK",
                  label:
                    "Program block",
                },
                {
                  value:
                    "PRODUCTION_SERVICE",
                  label:
                    "Production service",
                },
              ]}
              value={
                form.placementType
              }
              onChange={(event) =>
                setForm({
                  ...form,
                  placementType:
                    event.target.value,
                })
              }
            />

            <Field
              label="Scheduling notes"
              type="textarea"
              full
              value={form.notes}
              onChange={(event) =>
                setForm({
                  ...form,
                  notes:
                    event.target.value,
                })
              }
            />
          </div>

          <button
            type="submit"
            disabled={
              working ||
              eligibleContracts.length ===
                0
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
            {working
              ? "Creating Placement..."
              : "Create Schedule Placement"}
          </button>
        </form>

        <aside
          style={{
            padding: 16,
            borderRadius: 14,
            border:
              "1px solid rgba(148,163,184,0.22)",
            background:
              "rgba(15,23,42,0.72)",
          }}
        >
          <h4
            style={{
              margin: "0 0 10px",
              color: "#f8fafc",
              fontSize: 18,
            }}
          >
            Placement Summary
          </h4>

          <div
            style={{
              color: "#cbd5e1",
              fontSize: 13,
              lineHeight: 1.7,
            }}
          >
            Existing placements:
            {" "}
            <strong>
              {placements.length}
            </strong>
          </div>

          <div
            style={{
              color: "#cbd5e1",
              fontSize: 13,
              lineHeight: 1.7,
            }}
          >
            Eligible contracts:
            {" "}
            <strong>
              {eligibleContracts.length}
            </strong>
          </div>

          <div
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 10,
              border:
                "1px solid rgba(250,204,21,0.25)",
              background:
                "rgba(113,63,18,0.18)",
              color: "#fde68a",
              fontSize: 12,
              lineHeight: 1.6,
            }}
          >
            Administrative scheduling only. A placement record does not activate playout or publish media.
          </div>
        </aside>
      </div>
    </section>
  );
}
