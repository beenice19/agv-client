import React, { useMemo, useState } from "react";

const DEFAULT_SERVICES = [
  { id: "bridge", name: "AGV Bridge", area: "Core", url: "http://127.0.0.1:8787/api/health" },
  { id: "chat", name: "AGV Chat", area: "Communication", url: "http://127.0.0.1:8788/health" },
  { id: "moderator", name: "AGV Moderator", area: "Safety", url: "http://127.0.0.1:8789/health" },
  { id: "livekit", name: "LiveKit Token Service", area: "Broadcast", url: "http://127.0.0.1:8790/health" },
  { id: "account", name: "Subscription and Account", area: "Accounts", url: "http://127.0.0.1:8792/health" },
  { id: "billing", name: "Stripe Billing", area: "Payments", url: "http://127.0.0.1:8793/health" },
  { id: "wallet", name: "Usage Wallet", area: "Payments", url: "http://127.0.0.1:8794/health" },
  { id: "gateway", name: "Host Financial Gateway", area: "Payments", url: "http://127.0.0.1:8795/api/vendor/health" },
  { id: "ticket", name: "Ticket Service", area: "Ticketing", url: "http://127.0.0.1:8797/" },
  { id: "sentinel", name: "Sentinel LiveOps", area: "Operations", url: "http://127.0.0.1:8799/health" },
  { id: "bulletin", name: "Bulletin Service", area: "Communication", url: "http://127.0.0.1:8785/health" },
  { id: "event", name: "Event Service", area: "Events", url: "http://127.0.0.1:8786/health" },
];

function createInitialResults() {
  return Object.fromEntries(
    DEFAULT_SERVICES.map((service) => [
      service.id,
      {
        status: "NOT_CHECKED",
        responseMs: null,
        checkedAt: null,
        detail: "Awaiting Founder-requested health check.",
      },
    ])
  );
}

function statusLabel(status) {
  if (status === "HEALTHY") return "Healthy";
  if (status === "DEGRADED") return "Degraded";
  if (status === "OFFLINE") return "Offline";
  if (status === "CHECKING") return "Checking";
  return "Not Checked";
}

function statusStyle(status) {
  if (status === "HEALTHY") {
    return {
      color: "#bbf7d0",
      background: "rgba(34,197,94,0.12)",
      border: "1px solid rgba(34,197,94,0.35)",
    };
  }

  if (status === "DEGRADED") {
    return {
      color: "#fde68a",
      background: "rgba(245,158,11,0.12)",
      border: "1px solid rgba(245,158,11,0.35)",
    };
  }

  if (status === "OFFLINE") {
    return {
      color: "#fecaca",
      background: "rgba(239,68,68,0.12)",
      border: "1px solid rgba(239,68,68,0.35)",
    };
  }

  return {
    color: "#cbd5e1",
    background: "rgba(148,163,184,0.10)",
    border: "1px solid rgba(148,163,184,0.25)",
  };
}

export default function AgvOperationsWorker() {
  const [results, setResults] = useState(createInitialResults);
  const [checking, setChecking] = useState(false);
  const [lastRunAt, setLastRunAt] = useState(null);

  const summary = useMemo(() => {
    const values = Object.values(results);

    return {
      healthy: values.filter((item) => item.status === "HEALTHY").length,
      degraded: values.filter((item) => item.status === "DEGRADED").length,
      offline: values.filter((item) => item.status === "OFFLINE").length,
      unchecked: values.filter((item) =>
        ["NOT_CHECKED", "CHECKING"].includes(item.status)
      ).length,
    };
  }, [results]);

  const overallState =
    summary.offline > 0
      ? "Critical Review"
      : summary.degraded > 0
        ? "Watch"
        : summary.unchecked > 0
          ? "Awaiting Check"
          : "Healthy";

  async function checkService(service) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 5000);
    const startedAt = performance.now();

    try {
      const response = await fetch(service.url, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: controller.signal,
      });

      const responseMs = Math.round(performance.now() - startedAt);
      let data = null;

      try {
        data = await response.json();
      } catch {
        data = null;
      }

      const approved =
        response.ok &&
        (data?.ok === true ||
          data?.healthy === true ||
          data?.status === "ok" ||
          data?.status === "healthy");

      return {
        status: approved ? "HEALTHY" : "DEGRADED",
        responseMs,
        checkedAt: new Date().toISOString(),
        detail: approved
          ? "Health endpoint responded successfully."
          : `Endpoint responded, but health was not confirmed${
              response.status ? ` (HTTP ${response.status})` : ""
            }.`,
      };
    } catch (error) {
      return {
        status: "OFFLINE",
        responseMs: Math.round(performance.now() - startedAt),
        checkedAt: new Date().toISOString(),
        detail:
          error?.name === "AbortError"
            ? "Health check timed out after 5 seconds."
            : `Health check failed: ${error?.message || "Unknown network error."}`,
      };
    } finally {
      window.clearTimeout(timeout);
    }
  }

  async function runReadOnlyCheck() {
    if (checking) return;

    setChecking(true);
    setResults((current) => {
      const next = { ...current };

      DEFAULT_SERVICES.forEach((service) => {
        next[service.id] = {
          ...next[service.id],
          status: "CHECKING",
          detail: "Read-only health check in progress.",
        };
      });

      return next;
    });

    const completed = await Promise.all(
      DEFAULT_SERVICES.map(async (service) => [
        service.id,
        await checkService(service),
      ])
    );

    setResults(Object.fromEntries(completed));
    setLastRunAt(new Date().toISOString());
    setChecking(false);
  }

  return (
    <section style={styles.shell} aria-labelledby="agv-operations-worker-title">
      <div style={styles.header}>
        <div>
          <div style={styles.eyebrow}>AGV OPERATIONS WORKER v1.0</div>
          <h2 id="agv-operations-worker-title" style={styles.title}>
            Read-Only Operations Foundation
          </h2>
          <p style={styles.subtitle}>
            Reviews approved AGV health endpoints and prepares evidence for the
            Founder. It cannot restart services, deploy code, change settings,
            access credentials, move money, or take enforcement action.
          </p>
        </div>

        <button
          type="button"
          onClick={runReadOnlyCheck}
          disabled={checking}
          style={checking ? styles.buttonDisabled : styles.button}
        >
          {checking ? "Checking Services..." : "Run Read-Only Health Check"}
        </button>
      </div>

      <div style={styles.summaryGrid}>
        <SummaryCard label="Overall State" value={overallState} />
        <SummaryCard label="Healthy" value={summary.healthy} />
        <SummaryCard label="Degraded" value={summary.degraded} />
        <SummaryCard label="Offline" value={summary.offline} />
        <SummaryCard label="Not Checked" value={summary.unchecked} />
      </div>

      <div style={styles.notice}>
        <strong>Founder authority preserved.</strong> Every repair, restart,
        rollback, deployment, credential change, financial action, or permanent
        enforcement decision requires separate authorization.
      </div>

      <div style={styles.serviceGrid}>
        {DEFAULT_SERVICES.map((service) => {
          const result = results[service.id];

          return (
            <article key={service.id} style={styles.serviceCard}>
              <div style={styles.serviceTop}>
                <div>
                  <div style={styles.area}>{service.area}</div>
                  <h3 style={styles.serviceName}>{service.name}</h3>
                </div>

                <span
                  style={{
                    ...styles.status,
                    ...statusStyle(result.status),
                  }}
                >
                  {statusLabel(result.status)}
                </span>
              </div>

              <div style={styles.meta}>
                Response:{" "}
                {Number.isFinite(result.responseMs)
                  ? `${result.responseMs} ms`
                  : "Not available"}
              </div>

              <div style={styles.meta}>
                Last checked:{" "}
                {result.checkedAt
                  ? new Date(result.checkedAt).toLocaleString()
                  : "Not checked"}
              </div>

              <p style={styles.detail}>{result.detail}</p>
            </article>
          );
        })}
      </div>

      <div style={styles.footer}>
        Last complete run:{" "}
        {lastRunAt ? new Date(lastRunAt).toLocaleString() : "No run completed"}
      </div>
    </section>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div style={styles.summaryCard}>
      <div style={styles.summaryLabel}>{label}</div>
      <div style={styles.summaryValue}>{value}</div>
    </div>
  );
}

const styles = {
  shell: {
    width: "100%",
    borderRadius: 24,
    border: "1px solid rgba(250,204,21,0.26)",
    background:
      "linear-gradient(145deg, rgba(15,23,42,0.96), rgba(3,7,18,0.96))",
    padding: 24,
    color: "#f8fafc",
    boxSizing: "border-box",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 20,
    flexWrap: "wrap",
  },
  eyebrow: {
    color: "#facc15",
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
    maxWidth: 760,
    color: "#cbd5e1",
    lineHeight: 1.6,
  },
  button: {
    border: "1px solid rgba(250,204,21,0.55)",
    borderRadius: 12,
    background: "#facc15",
    color: "#111827",
    padding: "12px 16px",
    fontWeight: 900,
    cursor: "pointer",
  },
  buttonDisabled: {
    border: "1px solid rgba(148,163,184,0.25)",
    borderRadius: 12,
    background: "#475569",
    color: "#e2e8f0",
    padding: "12px 16px",
    fontWeight: 900,
    cursor: "not-allowed",
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 12,
    marginTop: 22,
  },
  summaryCard: {
    borderRadius: 16,
    border: "1px solid rgba(148,163,184,0.18)",
    background: "rgba(15,23,42,0.72)",
    padding: 16,
  },
  summaryLabel: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  summaryValue: {
    marginTop: 7,
    fontSize: 22,
    fontWeight: 900,
  },
  notice: {
    marginTop: 18,
    padding: 14,
    borderRadius: 14,
    border: "1px solid rgba(96,165,250,0.3)",
    background: "rgba(59,130,246,0.09)",
    color: "#dbeafe",
    lineHeight: 1.55,
  },
  serviceGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 14,
    marginTop: 18,
  },
  serviceCard: {
    borderRadius: 18,
    border: "1px solid rgba(148,163,184,0.18)",
    background: "rgba(15,23,42,0.62)",
    padding: 16,
  },
  serviceTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  area: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  serviceName: {
    margin: "5px 0 12px",
    fontSize: 17,
  },
  status: {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "nowrap",
  },
  meta: {
    color: "#cbd5e1",
    fontSize: 13,
    marginTop: 6,
  },
  detail: {
    color: "#94a3b8",
    fontSize: 13,
    lineHeight: 1.5,
    marginBottom: 0,
  },
  footer: {
    marginTop: 18,
    color: "#94a3b8",
    fontSize: 13,
  },
};
