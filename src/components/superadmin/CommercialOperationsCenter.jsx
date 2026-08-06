import React, {
  useCallback,
  useEffect,
  useState,
} from "react";
import SchedulingAdministration from "./SchedulingAdministration.jsx";
import InvoiceAdministration from "./InvoiceAdministration.jsx";
import CampaignContractAdministration from "./CampaignContractAdministration.jsx";

const DEFAULT_ANPE_API_BASE =
  import.meta.env.VITE_AGV_ANPE_API_URL ||
  "http://127.0.0.1:8802";

function firstArray(...values) {
  for (const value of values) {
    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
}

function safeCents(value) {
  const number = Number(value);

  return Number.isSafeInteger(number) &&
    number >= 0
    ? number
    : 0;
}

function formatMoney(
  value,
  currency = "USD"
) {
  const cents =
    safeCents(value);

  try {
    return new Intl.NumberFormat(
      "en-US",
      {
        style: "currency",
        currency:
          String(currency || "USD")
            .trim()
            .toUpperCase(),
      }
    ).format(
      cents / 100
    );
  }
  catch {
    return "$" +
      (
        cents / 100
      ).toFixed(2);
  }
}

function SummaryCard({
  label,
  value,
  note,
}) {
  return (
    <article
      style={{
        padding: 16,
        borderRadius: 14,
        border:
          "1px solid rgba(148,163,184,0.22)",
        background:
          "linear-gradient(145deg, rgba(15,23,42,0.95), rgba(7,18,42,0.9))",
        boxShadow:
          "0 12px 26px rgba(0,0,0,0.18)",
      }}
    >
      <div
        style={{
          color: "#94a3b8",
          fontSize: 12,
          fontWeight: 900,
          letterSpacing: 0.7,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 7,
          color: "#f8fafc",
          fontSize: 26,
          fontWeight: 900,
        }}
      >
        {value}
      </div>

      {note ? (
        <div
          style={{
            marginTop: 6,
            color: "#cbd5e1",
            fontSize: 12,
            lineHeight: 1.5,
          }}
        >
          {note}
        </div>
      ) : null}
    </article>
  );
}

function StatusRow({
  label,
  safe,
  safeLabel,
  warningLabel,
}) {
  const tone = safe
    ? {
        color: "#bbf7d0",
        border:
          "1px solid rgba(74,222,128,0.38)",
        background:
          "rgba(20,83,45,0.22)",
      }
    : {
        color: "#fecaca",
        border:
          "1px solid rgba(248,113,113,0.42)",
        background:
          "rgba(127,29,29,0.22)",
      };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        padding: "11px 0",
        borderBottom:
          "1px solid rgba(148,163,184,0.12)",
      }}
    >
      <span
        style={{
          color: "#e2e8f0",
          fontWeight: 700,
        }}
      >
        {label}
      </span>

      <span
        style={{
          ...tone,
          padding: "5px 9px",
          borderRadius: 999,
          fontSize: 11,
          fontWeight: 900,
          letterSpacing: 0.5,
        }}
      >
        {safe
          ? safeLabel
          : warningLabel}
      </span>
    </div>
  );
}

export default function CommercialOperationsCenter({
  apiBase =
    DEFAULT_ANPE_API_BASE,

  getAdminHeaders,
}) {
  const [snapshot, setSnapshot] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [lastLoadedAt, setLastLoadedAt] =
    useState("");

  const loadSnapshot =
    useCallback(async () => {
      setLoading(true);
      setError("");

      try {
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

        async function getJson(
          route,
          authenticated
        ) {
          const response =
            await fetch(
              base + route,
              {
                method: "GET",

                headers: {
                  Accept:
                    "application/json",

                  ...(authenticated
                    ? getAdminHeaders(false)
                    : {}),
                },

                cache:
                  "no-store",
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
              (
                "ANPE request failed with HTTP " +
                response.status +
                "."
              )
            );
          }

          return body;
        }

        const [
          health,
          catalogPayload,
          statePayload,
          contractsPayload,
          schedulesPayload,
          invoicesPayload,
        ] =
          await Promise.all([
            getJson(
              "/api/health",
              false
            ),

            getJson(
              "/api/network/commercial/catalog",
              false
            ),

            getJson(
              "/api/admin/commercial/state",
              true
            ),

            getJson(
              "/api/admin/commercial/contracts",
              true
            ),

            getJson(
              "/api/admin/commercial/schedule-placements",
              true
            ),

            getJson(
              "/api/admin/commercial/invoices",
              true
            ),
          ]);

        const catalog =
          catalogPayload.catalog ||
          catalogPayload.data ||
          catalogPayload;

        const state =
          statePayload.state ||
          statePayload.commercialState ||
          statePayload.data ||
          statePayload;

        const contracts =
          firstArray(
            contractsPayload.contracts,
            contractsPayload.items,
            contractsPayload.data,
            state.contracts
          );

        const schedulePlacements =
          firstArray(
            schedulesPayload.schedulePlacements,
            schedulesPayload.placements,
            schedulesPayload.items,
            schedulesPayload.data,
            state.schedulePlacements
          );

        const invoices =
          firstArray(
            invoicesPayload.invoices,
            invoicesPayload.items,
            invoicesPayload.data,
            state.invoices
          );

        setSnapshot({
          health,
          catalog,
          state,
          contracts,
          schedulePlacements,
          invoices,
        });

        setLastLoadedAt(
          new Date().toLocaleString()
        );
      }
      catch (loadError) {
        setSnapshot(null);

        setError(
          loadError?.message ||
          "Commercial Operations data could not be loaded."
        );
      }
      finally {
        setLoading(false);
      }
    }, [
      apiBase,
      getAdminHeaders,
    ]);

  useEffect(() => {
    loadSnapshot();
  }, [loadSnapshot]);

  const health =
    snapshot?.health || {};

  const state =
    snapshot?.state || {};

  const catalog =
    snapshot?.catalog || {};

  const campaigns =
    firstArray(
      state.campaigns,
      state.commercialCampaigns
    );

  const contracts =
    firstArray(
      snapshot?.contracts
    );

  const placements =
    firstArray(
      snapshot?.schedulePlacements
    );

  const invoices =
    firstArray(
      snapshot?.invoices
    );

  const offers =
    firstArray(
      catalog.offers,
      catalog.rateCards,
      catalog.commercialOffers
    );

  const productionServices =
    firstArray(
      catalog.productionServices,
      catalog.services
    );

  const contractedCents =
    contracts.reduce(
      (sum, item) =>
        sum +
        safeCents(
          item?.totalAmountCents ??
          item?.amountCents ??
          item?.contractValueCents
        ),
      0
    );

  const invoicedCents =
    invoices.reduce(
      (sum, item) =>
        sum +
        safeCents(
          item?.totalCents ??
          item?.amountCents ??
          item?.invoiceAmountCents
        ),
      0
    );

  const paidCents =
    invoices.reduce(
      (sum, item) =>
        sum +
        safeCents(
          item?.amountPaidCents
        ),
      0
    );

  const refundedCents =
    invoices.reduce(
      (sum, item) =>
        sum +
        safeCents(
          item?.amountRefundedCents
        ),
      0
    );

  const netCollectedCents =
    invoices.reduce(
      (sum, item) => {
        const paid =
          safeCents(
            item?.amountPaidCents
          );

        const refunded =
          safeCents(
            item?.amountRefundedCents
          );

        const recordedNet =
          item?.netCollectedCents;

        return (
          sum +
          (
            recordedNet === undefined ||
            recordedNet === null
              ? Math.max(
                  0,
                  paid - refunded
                )
              : safeCents(
                  recordedNet
                )
          )
        );
      },
      0
    );

  return (
    <section
      id="agv-commercial-operations-center"
      style={{
        maxWidth: 1180,
        margin: "0 auto 18px",
        padding: 20,
        borderRadius: 18,
        border:
          "1px solid rgba(250,204,21,0.34)",
        background:
          "linear-gradient(145deg, rgba(7,18,42,0.98), rgba(15,23,42,0.96))",
        boxShadow:
          "0 20px 42px rgba(0,0,0,0.3)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              color: "#facc15",
              fontSize: 12,
              fontWeight: 900,
              letterSpacing: 1.2,
              textTransform: "uppercase",
            }}
          >
            ANPE-03
          </div>

          <h2
            style={{
              margin: "6px 0 4px",
              color: "#f8fafc",
              fontSize: 28,
            }}
          >
            Commercial Operations Center
          </h2>

          <p
            style={{
              margin: 0,
              maxWidth: 760,
              color: "#cbd5e1",
              lineHeight: 1.6,
            }}
          >
            Read-only administrative visibility into
            AGV Network campaigns, commercial contracts,
            airtime placements, invoices, payment evidence,
            and refund evidence.
          </p>
        </div>

        <button
          type="button"
          onClick={loadSnapshot}
          disabled={loading}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border:
              "1px solid rgba(250,204,21,0.5)",
            background:
              loading
                ? "rgba(71,85,105,0.4)"
                : "rgba(250,204,21,0.14)",
            color:
              loading
                ? "#94a3b8"
                : "#fde68a",
            fontWeight: 900,
            cursor:
              loading
                ? "wait"
                : "pointer",
          }}
        >
          {loading
            ? "Loading..."
            : "Refresh Dashboard"}
        </button>
      </div>

      <div
        style={{
          marginTop: 16,
          padding: 13,
          borderRadius: 12,
          border:
            "1px solid rgba(96,165,250,0.32)",
          background:
            "rgba(30,64,175,0.14)",
          color: "#bfdbfe",
          lineHeight: 1.55,
          fontSize: 13,
        }}
      >
        <strong>
          Administrative evidence reconciliation only.
        </strong>{" "}
        This dashboard cannot charge a card, move money,
        execute a refund, accept a public order, or begin
        continuous playout.
      </div>

      {error ? (
        <div
          role="alert"
          style={{
            marginTop: 16,
            padding: 14,
            borderRadius: 12,
            border:
              "1px solid rgba(248,113,113,0.42)",
            background:
              "rgba(127,29,29,0.22)",
            color: "#fecaca",
            lineHeight: 1.55,
          }}
        >
          <strong>
            Commercial Operations could not connect.
          </strong>

          <div style={{ marginTop: 5 }}>
            {error}
          </div>
        </div>
      ) : null}

      {!error && loading ? (
        <div
          style={{
            marginTop: 18,
            color: "#cbd5e1",
          }}
        >
          Loading certified SERVER 8802
          administrative state...
        </div>
      ) : null}

      {!error && snapshot ? (
        <>
          <div
            style={{
              marginTop: 18,
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(170px, 1fr))",
              gap: 12,
            }}
          >
            <SummaryCard
              label="Campaigns"
              value={campaigns.length}
            />

            <SummaryCard
              label="Contracts"
              value={contracts.length}
            />

            <SummaryCard
              label="Placements"
              value={placements.length}
            />

            <SummaryCard
              label="Invoices"
              value={invoices.length}
            />

            <SummaryCard
              label="Commercial Offers"
              value={offers.length}
            />

            <SummaryCard
              label="Production Services"
              value={productionServices.length}
            />
          </div>

          <div
            style={{
              marginTop: 18,
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(205px, 1fr))",
              gap: 12,
            }}
          >
            <SummaryCard
              label="Contracted"
              value={formatMoney(
                contractedCents
              )}
            />

            <SummaryCard
              label="Invoiced"
              value={formatMoney(
                invoicedCents
              )}
            />

            <SummaryCard
              label="Payment Evidence"
              value={formatMoney(
                paidCents
              )}
              note="Recorded external payment evidence"
            />

            <SummaryCard
              label="Refund Evidence"
              value={formatMoney(
                refundedCents
              )}
              note="Recorded external refund evidence"
            />

            <SummaryCard
              label="Net Collected"
              value={formatMoney(
                netCollectedCents
              )}
              note="Payment evidence less refund evidence"
            />
          </div>

          <div
            style={{
              marginTop: 18,
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 14,
            }}
          >
            <article
              style={{
                padding: 16,
                borderRadius: 14,
                border:
                  "1px solid rgba(148,163,184,0.22)",
                background:
                  "rgba(15,23,42,0.72)",
              }}
            >
              <h3
                style={{
                  margin: "0 0 8px",
                  color: "#f8fafc",
                }}
              >
                Founder Safety Controls
              </h3>

              <StatusRow
                label="Commercial sales"
                safe={
                  health
                    .commercialSalesEnabled !==
                  true
                }
                safeLabel="DISABLED"
                warningLabel="ENABLED"
              />

              <StatusRow
                label="Public order intake"
                safe={
                  health
                    .publicOrderIntakeEnabled !==
                  true
                }
                safeLabel="DISABLED"
                warningLabel="ENABLED"
              />

              <StatusRow
                label="Continuous playout"
                safe={
                  health
                    .playoutEnabled !==
                  true
                }
                safeLabel="DISABLED"
                warningLabel="ENABLED"
              />

              <StatusRow
                label="Billing execution"
                safe={true}
                safeLabel="NOT CONNECTED"
                warningLabel="CONNECTED"
              />

              <StatusRow
                label="Stripe refund execution"
                safe={true}
                safeLabel="NOT CONNECTED"
                warningLabel="CONNECTED"
              />
            </article>

            <article
              style={{
                padding: 16,
                borderRadius: 14,
                border:
                  "1px solid rgba(148,163,184,0.22)",
                background:
                  "rgba(15,23,42,0.72)",
              }}
            >
              <h3
                style={{
                  margin: "0 0 8px",
                  color: "#f8fafc",
                }}
              >
                Certified Administrative Access
              </h3>

              <StatusRow
                label="Viewer access"
                safe={
                  health.viewerAccessModel ===
                  "FREE_TO_VIEW"
                }
                safeLabel="FREE_TO_VIEW"
                warningLabel="RESTRICTED"
              />

              <StatusRow
                label="SERVER 8787 bridge"
                safe={
                  health
                    .adminAuthentication
                    ?.server8787Bridge ===
                  true
                }
                safeLabel="ACTIVE"
                warningLabel="UNAVAILABLE"
              />

              <StatusRow
                label="SERVER 8792 Owner session"
                safe={
                  health
                    .adminAuthentication
                    ?.agvOwnerSession ===
                  true
                }
                safeLabel="ACTIVE"
                warningLabel="UNAVAILABLE"
              />

              <StatusRow
                label="Administrative routes"
                safe={
                  health
                    .adminRoutesLocked !==
                  true
                }
                safeLabel="AUTHORIZED"
                warningLabel="LOCKED"
              />

              <div
                style={{
                  marginTop: 12,
                  color: "#94a3b8",
                  fontSize: 12,
                }}
              >
                Last refreshed:{" "}
                {lastLoadedAt ||
                  "Not yet loaded"}
              </div>
            </article>
          </div>
        </>
      ) : null}
      <CampaignContractAdministration
        apiBase={apiBase}
        getAdminHeaders={getAdminHeaders}
        campaigns={campaigns}
        contracts={contracts}
        offers={offers}
        productionServices={productionServices}
        onRefresh={loadSnapshot}
      />

      <SchedulingAdministration
        apiBase={apiBase}
        getAdminHeaders={getAdminHeaders}
        campaigns={campaigns}
        contracts={contracts}
        placements={placements}
        onRefresh={loadSnapshot}
      />

      <InvoiceAdministration
        apiBase={apiBase}
        getAdminHeaders={getAdminHeaders}
        campaigns={campaigns}
        contracts={contracts}
        invoices={invoices}
        onRefresh={loadSnapshot}
      />

    </section>
  );
}
