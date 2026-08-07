import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

// PASS ASC-10B-R2 CLIENT SPONSOR REVIEW QUEUE
// PASS ASC-10C CLIENT SPONSOR REVIEW DECISION PANEL

const ANPE_API_BASE = String(
  import.meta.env.VITE_AGV_ANPE_API_URL ||
    import.meta.env.VITE_ANPE_API_URL ||
    "http://127.0.0.1:8802"
).replace(/\/$/, "");

const REVIEW_STATUSES = [
  "",
  "PENDING_AGV_REVIEW",
  "UNDER_REVIEW",
  "APPROVED_FOR_NEXT_STEP",
  "MORE_INFORMATION_REQUIRED",
  "DECLINED",
];

function clean(value) {
  return String(value ?? "").trim();
}

function formatLabel(value) {
  return (clean(value) || "UNKNOWN")
    .toLowerCase()
    .split("_")
    .map((part) =>
      part
        ? part.charAt(0).toUpperCase() +
          part.slice(1)
        : part
    )
    .join(" ");
}

function formatDate(value) {
  const text = clean(value);

  if (!text) {
    return "Not provided";
  }

  const date = new Date(text);

  if (!Number.isFinite(date.getTime())) {
    return text;
  }

  return date.toLocaleDateString(
    undefined,
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    }
  );
}

function formatDateTime(value) {
  const text = clean(value);

  if (!text) {
    return "Not recorded";
  }

  const date = new Date(text);

  if (!Number.isFinite(date.getTime())) {
    return text;
  }

  return date.toLocaleString();
}

function formatBudget(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "Not provided";
  }

  return new Intl.NumberFormat(
    undefined,
    {
      style: "currency",
      currency: "USD",
    }
  ).format(amount);
}

function statusStyle(value) {
  switch (clean(value).toUpperCase()) {
    case "UNDER_REVIEW":
      return {
        background:
          "rgba(59,130,246,.15)",
        border:
          "rgba(96,165,250,.48)",
        color:
          "#bfdbfe",
      };

    case "APPROVED_FOR_NEXT_STEP":
      return {
        background:
          "rgba(34,197,94,.15)",
        border:
          "rgba(74,222,128,.48)",
        color:
          "#bbf7d0",
      };

    case "MORE_INFORMATION_REQUIRED":
      return {
        background:
          "rgba(245,158,11,.15)",
        border:
          "rgba(251,191,36,.48)",
        color:
          "#fde68a",
      };

    case "DECLINED":
      return {
        background:
          "rgba(239,68,68,.15)",
        border:
          "rgba(248,113,113,.48)",
        color:
          "#fecaca",
      };

    default:
      return {
        background:
          "rgba(250,204,21,.12)",
        border:
          "rgba(250,204,21,.42)",
        color:
          "#fde68a",
      };
  }
}

function StatusBadge({ value }) {
  const tone = statusStyle(value);

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        minHeight: 28,
        padding: "4px 10px",
        borderRadius: 999,
        border:
          `1px solid ${tone.border}`,
        background:
          tone.background,
        color:
          tone.color,
        fontSize: 11,
        fontWeight: 900,
        letterSpacing: 0.45,
        textTransform: "uppercase",
      }}
    >
      {formatLabel(value)}
    </span>
  );
}

function DetailField({
  label,
  value,
  wide = false,
}) {
  return (
    <div
      style={{
        gridColumn:
          wide ? "1 / -1" : undefined,
        padding: 11,
        borderRadius: 11,
        border:
          "1px solid rgba(148,163,184,.18)",
        background:
          "rgba(15,23,42,.52)",
      }}
    >
      <div
        style={{
          marginBottom: 5,
          color: "#94a3b8",
          fontSize: 10,
          fontWeight: 900,
          letterSpacing: 0.7,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>

      <div
        style={{
          color: "#f8fafc",
          fontSize: 13,
          fontWeight: 700,
          lineHeight: 1.45,
          overflowWrap: "anywhere",
          whiteSpace:
            wide ? "pre-wrap" : "normal",
        }}
      >
        {clean(value) || "Not provided"}
      </div>
    </div>
  );
}

export default function SponsorReviewQueue({
  getAdminHeaders,
}) {
  const [requests, setRequests] =
    useState([]);

  const [selectedRequest, setSelectedRequest] =
    useState(null);

  const [totals, setTotals] =
    useState({
      all: 0,
      pending: 0,
      underReview: 0,
    });

  const [loading, setLoading] =
    useState(false);

  const [detailLoading, setDetailLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [reviewStatus, setReviewStatus] =
    useState("");

  const [packageId, setPackageId] =
    useState("");

  const [mediaType, setMediaType] =
    useState("");

  const [decisionStatus, setDecisionStatus] =
    useState("UNDER_REVIEW");

  const [decisionReason, setDecisionReason] =
    useState("");

  const [internalNotes, setInternalNotes] =
    useState("");

  const [decisionSaving, setDecisionSaving] =
    useState(false);

  const buildHeaders =
    useCallback(
      (includeJson = false) => {
        const baseHeaders = {
          Accept: "application/json",
        };

        if (includeJson) {
          baseHeaders["Content-Type"] =
            "application/json";
        }

        if (
          typeof getAdminHeaders !==
          "function"
        ) {
          return baseHeaders;
        }

        return {
          ...baseHeaders,
          ...getAdminHeaders(
            includeJson
          ),
        };
      },
      [getAdminHeaders]
    );

  const queryString =
    useMemo(() => {
      const query =
        new URLSearchParams();

      if (clean(search)) {
        query.set(
          "search",
          clean(search)
        );
      }

      if (clean(reviewStatus)) {
        query.set(
          "reviewStatus",
          clean(reviewStatus)
        );
      }

      if (clean(packageId)) {
        query.set(
          "packageId",
          clean(packageId)
        );
      }

      if (clean(mediaType)) {
        query.set(
          "mediaType",
          clean(mediaType)
        );
      }

      const value =
        query.toString();

      return value
        ? `?${value}`
        : "";
    }, [
      search,
      reviewStatus,
      packageId,
      mediaType,
    ]);

  const loadQueue =
    useCallback(async () => {
      setLoading(true);
      setError("");
      setMessage(
        "Loading protected Sponsor requests..."
      );

      try {
        const response =
          await fetch(
            `${ANPE_API_BASE}/api/admin/sponsor-intake/requests${queryString}`,
            {
              method: "GET",
              headers: buildHeaders(),
            }
          );

        const result =
          await response
            .json()
            .catch(() => ({}));

        if (!response.ok) {
          if (
            response.status === 401 ||
            response.status === 403
          ) {
            throw new Error(
              "A verified AGV Founder or Super Admin session is required."
            );
          }

          throw new Error(
            clean(result.error) ||
              `Sponsor Review Queue failed with HTTP ${response.status}.`
          );
        }

        if (result.ok !== true) {
          throw new Error(
            clean(result.error) ||
              "Sponsor Review Queue could not be loaded."
          );
        }

        const nextRequests =
          Array.isArray(result.requests)
            ? result.requests
            : [];

        setRequests(nextRequests);

        setTotals({
          all:
            Number(
              result.totals?.all
            ) || 0,

          pending:
            Number(
              result.totals?.pending
            ) || 0,

          underReview:
            Number(
              result.totals?.underReview
            ) || 0,
        });

        setMessage(
          nextRequests.length
            ? `${nextRequests.length} Sponsor request${nextRequests.length === 1 ? "" : "s"} loaded.`
            : "No Sponsor requests match the current filters."
        );
      }
      catch (loadError) {
        setRequests([]);

        setTotals({
          all: 0,
          pending: 0,
          underReview: 0,
        });

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Sponsor Review Queue could not be loaded."
        );

        setMessage("");
      }
      finally {
        setLoading(false);
      }
    }, [
      buildHeaders,
      queryString,
    ]);

  const openRequest =
    useCallback(
      async (requestId) => {
        const id =
          clean(requestId);

        if (!id) {
          return;
        }

        setDetailLoading(true);
        setError("");
        setMessage(
          "Loading protected Sponsor request detail..."
        );

        try {
          const response =
            await fetch(
              `${ANPE_API_BASE}/api/admin/sponsor-intake/requests/${encodeURIComponent(id)}`,
              {
                method: "GET",
                headers:
                  buildHeaders(),
              }
            );

          const result =
            await response
              .json()
              .catch(() => ({}));

          if (!response.ok) {
            if (
              response.status === 401 ||
              response.status === 403
            ) {
              throw new Error(
                "A verified AGV Founder or Super Admin session is required."
              );
            }

            throw new Error(
              clean(result.error) ||
                `Sponsor request detail failed with HTTP ${response.status}.`
            );
          }

          if (
            result.ok !== true ||
            !result.request
          ) {
            throw new Error(
              clean(result.error) ||
                "Sponsor request detail was not returned."
            );
          }

          setSelectedRequest(
            result.request
          );

          setDecisionStatus(
            clean(
              result.request.reviewStatus
            ) || "UNDER_REVIEW"
          );

          setDecisionReason(
            clean(
              result.request.decisionReason
            )
          );

          setInternalNotes(
            clean(
              result.request.internalNotes
            )
          );

          setMessage(
            "Sponsor request opened for administrative review."
          );
        }
        catch (detailError) {
          setError(
            detailError instanceof Error
              ? detailError.message
              : "Sponsor request detail could not be loaded."
          );

          setMessage("");
        }
        finally {
          setDetailLoading(false);
        }
      },
      [buildHeaders]
    );

  const saveReviewDecision =
    useCallback(async () => {
      if (!selectedRequest?.requestId) {
        setError(
          "Open a Sponsor request before saving a review decision."
        );
        return;
      }

      const nextStatus =
        clean(decisionStatus);

      if (
        !REVIEW_STATUSES.includes(
          nextStatus
        ) ||
        !nextStatus
      ) {
        setError(
          "Select a valid administrative review status."
        );
        return;
      }

      const requiresReason =
        nextStatus ===
          "MORE_INFORMATION_REQUIRED" ||
        nextStatus ===
          "DECLINED";

      if (
        requiresReason &&
        !clean(decisionReason)
      ) {
        setError(
          "A decision reason is required for More Information Required or Declined."
        );
        return;
      }

      setDecisionSaving(true);
      setError("");
      setMessage(
        "Saving the protected Sponsor review decision..."
      );

      try {
        const requestId =
          selectedRequest.requestId;

        const response =
          await fetch(
            `${ANPE_API_BASE}/api/admin/sponsor-intake/requests/${encodeURIComponent(requestId)}/review`,
            {
              method: "PATCH",
              headers:
                buildHeaders(true),
              body: JSON.stringify({
                reviewStatus:
                  nextStatus,
                decisionReason:
                  clean(
                    decisionReason
                  ),
                internalNotes:
                  clean(
                    internalNotes
                  ),
              }),
            }
          );

        const result =
          await response
            .json()
            .catch(() => ({}));

        if (!response.ok) {
          if (
            response.status === 401 ||
            response.status === 403
          ) {
            throw new Error(
              "A verified AGV Founder or Super Admin session is required."
            );
          }

          throw new Error(
            clean(result.error) ||
              `Sponsor review update failed with HTTP ${response.status}.`
          );
        }

        if (result.ok !== true) {
          throw new Error(
            clean(result.error) ||
              "Sponsor review decision was not saved."
          );
        }

        const updatedRequest =
          result.request ||
          result.sponsorRequest ||
          result.item;

        if (!updatedRequest) {
          throw new Error(
            "The SERVER saved the review but did not return the updated request."
          );
        }

        setSelectedRequest(
          updatedRequest
        );

        setDecisionStatus(
          clean(
            updatedRequest.reviewStatus
          ) || nextStatus
        );

        setDecisionReason(
          clean(
            updatedRequest.decisionReason
          )
        );

        setInternalNotes(
          clean(
            updatedRequest.internalNotes
          )
        );

        setMessage(
          "Sponsor review decision saved. No downstream commercial or publication action was triggered."
        );

        await loadQueue();
      }
      catch (saveError) {
        setError(
          saveError instanceof Error
            ? saveError.message
            : "Sponsor review decision could not be saved."
        );

        setMessage("");
      }
      finally {
        setDecisionSaving(false);
      }
    }, [
      selectedRequest,
      decisionStatus,
      decisionReason,
      internalNotes,
      buildHeaders,
      loadQueue,
    ]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const inputStyle = {
    width: "100%",
    minHeight: 42,
    padding: "9px 11px",
    borderRadius: 10,
    border:
      "1px solid rgba(148,163,184,.28)",
    background:
      "rgba(15,23,42,.88)",
    color: "#f8fafc",
    fontSize: 13,
    outline: "none",
    boxSizing: "border-box",
  };

  const counts = [
    ["All Requests", totals.all],
    ["Pending Review", totals.pending],
    ["Under Review", totals.underReview],
    ["Current Results", requests.length],
  ];

  return (
    <section
      id="agv-sponsor-review-queue"
      style={{
        maxWidth: 1180,
        margin: "0 auto 18px",
        padding:
          "clamp(18px,3vw,28px)",
        borderRadius: 20,
        border:
          "1px solid rgba(250,204,21,.28)",
        background:
          "linear-gradient(145deg,rgba(8,20,42,.98),rgba(15,23,42,.96))",
        boxShadow:
          "0 20px 48px rgba(0,0,0,.3)",
        color: "#f8fafc",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems:
            "flex-start",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div>
          <div
            style={{
              color: "#facc15",
              fontSize: 11,
              fontWeight: 950,
              letterSpacing: 1.1,
              textTransform:
                "uppercase",
            }}
          >
            AGV Commercial Administration
          </div>

          <h2
            style={{
              margin:
                "7px 0 5px",
              fontSize:
                "clamp(24px,4vw,36px)",
            }}
          >
            Sponsor Review Queue
          </h2>

          <p
            style={{
              maxWidth: 760,
              margin: 0,
              color: "#cbd5e1",
              lineHeight: 1.6,
            }}
          >
            Review Sponsor Concierge
            submissions before any campaign,
            contract, schedule, invoice,
            payment, publication, or playout
            action is considered.
          </p>
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={loadQueue}
          style={{
            minHeight: 42,
            padding:
              "10px 16px",
            borderRadius: 10,
            border:
              "1px solid rgba(250,204,21,.5)",
            background:
              "rgba(250,204,21,.13)",
            color: "#fde68a",
            fontWeight: 900,
            cursor:
              loading
                ? "not-allowed"
                : "pointer",
          }}
        >
          {loading
            ? "Loading..."
            : "Refresh Queue"}
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(145px,1fr))",
          gap: 10,
          marginBottom: 18,
        }}
      >
        {counts.map(
          ([label, value]) => (
            <div
              key={label}
              style={{
                padding: 14,
                borderRadius: 13,
                border:
                  "1px solid rgba(148,163,184,.18)",
                background:
                  "rgba(15,23,42,.65)",
              }}
            >
              <div
                style={{
                  color: "#94a3b8",
                  fontSize: 10,
                  fontWeight: 900,
                  letterSpacing: 0.7,
                  textTransform:
                    "uppercase",
                }}
              >
                {label}
              </div>

              <div
                style={{
                  marginTop: 4,
                  fontSize: 25,
                  fontWeight: 950,
                }}
              >
                {value}
              </div>
            </div>
          )
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(170px,1fr))",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <input
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value
            )
          }
          placeholder="Search company, contact, email, media, or ID"
          style={inputStyle}
        />

        <select
          value={reviewStatus}
          onChange={(event) =>
            setReviewStatus(
              event.target.value
            )
          }
          style={inputStyle}
        >
          {REVIEW_STATUSES.map(
            (status) => (
              <option
                key={
                  status ||
                  "ALL_STATUSES"
                }
                value={status}
              >
                {status
                  ? formatLabel(status)
                  : "All review statuses"}
              </option>
            )
          )}
        </select>

        <input
          value={packageId}
          onChange={(event) =>
            setPackageId(
              event.target.value
            )
          }
          placeholder="Package ID"
          style={inputStyle}
        />

        <input
          value={mediaType}
          onChange={(event) =>
            setMediaType(
              event.target.value
            )
          }
          placeholder="Media type"
          style={inputStyle}
        />
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 9,
          marginBottom: 17,
        }}
      >
        <button
          type="button"
          disabled={loading}
          onClick={loadQueue}
          style={{
            minHeight: 38,
            padding:
              "8px 14px",
            borderRadius: 9,
            border: 0,
            background: "#facc15",
            color: "#111827",
            fontWeight: 950,
            cursor: "pointer",
          }}
        >
          Apply Filters
        </button>

        <button
          type="button"
          onClick={() => {
            setSearch("");
            setReviewStatus("");
            setPackageId("");
            setMediaType("");
          }}
          style={{
            minHeight: 38,
            padding:
              "8px 14px",
            borderRadius: 9,
            border:
              "1px solid rgba(148,163,184,.32)",
            background:
              "rgba(15,23,42,.72)",
            color: "#e2e8f0",
            fontWeight: 850,
            cursor: "pointer",
          }}
        >
          Clear Filters
        </button>
      </div>

      {error ? (
        <div
          role="alert"
          style={{
            marginBottom: 16,
            padding: 13,
            borderRadius: 11,
            border:
              "1px solid rgba(248,113,113,.46)",
            background:
              "rgba(127,29,29,.2)",
            color: "#fecaca",
            fontWeight: 750,
          }}
        >
          {error}
        </div>
      ) : null}

      {message ? (
        <div
          aria-live="polite"
          style={{
            marginBottom: 16,
            color: "#cbd5e1",
            fontSize: 13,
          }}
        >
          {message}
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            selectedRequest
              ? "minmax(0,1fr) minmax(320px,.9fr)"
              : "1fr",
          gap: 16,
          alignItems: "start",
        }}
      >
        <div
          style={{
            display: "grid",
            gap: 11,
          }}
        >
          {!loading &&
          requests.length === 0 &&
          !error ? (
            <div
              style={{
                padding: 28,
                borderRadius: 14,
                border:
                  "1px dashed rgba(148,163,184,.32)",
                color: "#94a3b8",
                textAlign: "center",
              }}
            >
              No Sponsor requests match
              the current filters.
            </div>
          ) : null}

          {requests.map((request) => {
            const active =
              selectedRequest?.requestId ===
              request.requestId;

            return (
              <article
                key={request.requestId}
                style={{
                  padding: 16,
                  borderRadius: 14,
                  border:
                    active
                      ? "1px solid rgba(250,204,21,.62)"
                      : "1px solid rgba(148,163,184,.2)",
                  background:
                    active
                      ? "rgba(250,204,21,.07)"
                      : "rgba(15,23,42,.58)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems:
                      "flex-start",
                    flexWrap: "wrap",
                    gap: 10,
                  }}
                >
                  <div>
                    <h3
                      style={{
                        margin:
                          "0 0 5px",
                        fontSize: 18,
                      }}
                    >
                      {clean(
                        request.companyName
                      ) ||
                        "Unnamed Sponsor"}
                    </h3>

                    <div
                      style={{
                        color: "#cbd5e1",
                        fontSize: 13,
                      }}
                    >
                      {clean(
                        request.mediaName
                      ) ||
                        "Unnamed media"}
                    </div>
                  </div>

                  <StatusBadge
                    value={
                      request.reviewStatus
                    }
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit,minmax(130px,1fr))",
                    gap: 8,
                    marginTop: 14,
                    color: "#cbd5e1",
                    fontSize: 12,
                  }}
                >
                  <div>
                    <strong>Package:</strong>{" "}
                    {clean(
                      request.packageId
                    ) || "—"}
                  </div>

                  <div>
                    <strong>Media:</strong>{" "}
                    {clean(
                      request.mediaType
                    ) || "—"}
                  </div>

                  <div>
                    <strong>Start:</strong>{" "}
                    {formatDate(
                      request.startDate
                    )}
                  </div>

                  <div>
                    <strong>Submitted:</strong>{" "}
                    {formatDate(
                      request.createdAt
                    )}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems:
                      "center",
                    flexWrap: "wrap",
                    gap: 10,
                    marginTop: 14,
                  }}
                >
                  <code
                    style={{
                      color: "#94a3b8",
                      fontSize: 10,
                      overflowWrap:
                        "anywhere",
                    }}
                  >
                    {request.requestId}
                  </code>

                  <button
                    type="button"
                    disabled={detailLoading}
                    onClick={() =>
                      openRequest(
                        request.requestId
                      )
                    }
                    style={{
                      minHeight: 36,
                      padding:
                        "7px 13px",
                      borderRadius: 9,
                      border:
                        "1px solid rgba(250,204,21,.5)",
                      background:
                        "rgba(250,204,21,.12)",
                      color: "#fde68a",
                      fontWeight: 900,
                      cursor: "pointer",
                    }}
                  >
                    {detailLoading &&
                    active
                      ? "Opening..."
                      : "Open Review"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        {selectedRequest ? (
          <aside
            style={{
              position: "sticky",
              top: 12,
              padding: 17,
              borderRadius: 15,
              border:
                "1px solid rgba(250,204,21,.3)",
              background:
                "rgba(2,6,23,.72)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "flex-start",
                gap: 10,
                marginBottom: 14,
              }}
            >
              <div>
                <div
                  style={{
                    color: "#facc15",
                    fontSize: 10,
                    fontWeight: 900,
                    letterSpacing: 0.8,
                    textTransform:
                      "uppercase",
                  }}
                >
                  Read-only foundation
                </div>

                <h3
                  style={{
                    margin:
                      "5px 0 0",
                    fontSize: 20,
                  }}
                >
                  Request Detail
                </h3>
              </div>

              <button
                type="button"
                aria-label="Close Sponsor request detail"
                onClick={() =>
                  setSelectedRequest(null)
                }
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  border:
                    "1px solid rgba(148,163,184,.28)",
                  background:
                    "rgba(15,23,42,.72)",
                  color: "#e2e8f0",
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                marginBottom: 14,
              }}
            >
              <StatusBadge
                value={
                  selectedRequest.reviewStatus
                }
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(2,minmax(0,1fr))",
                gap: 9,
              }}
            >
              <DetailField
                label="Company"
                value={
                  selectedRequest.companyName
                }
              />

              <DetailField
                label="Contact"
                value={
                  selectedRequest.contactName
                }
              />

              <DetailField
                label="Email"
                value={
                  selectedRequest.email
                }
              />

              <DetailField
                label="Phone"
                value={
                  selectedRequest.phone
                }
              />

              <DetailField
                label="Package"
                value={
                  selectedRequest.packageId
                }
              />

              <DetailField
                label="Media type"
                value={
                  selectedRequest.mediaType
                }
              />

              <DetailField
                label="Media name"
                value={
                  selectedRequest.mediaName
                }
                wide
              />

              <DetailField
                label="Programming"
                value={
                  selectedRequest.programming
                }
                wide
              />

              <DetailField
                label="Requested dates"
                value={
                  `${formatDate(selectedRequest.startDate)} — ${formatDate(selectedRequest.endDate)}`
                }
                wide
              />

              <DetailField
                label="Budget"
                value={formatBudget(
                  selectedRequest.budget
                )}
              />

              <DetailField
                label="Submitted"
                value={formatDateTime(
                  selectedRequest.createdAt
                )}
              />

              <DetailField
                label="Website"
                value={
                  selectedRequest.website
                }
                wide
              />

              <DetailField
                label="Destination"
                value={
                  selectedRequest.destinationUrl
                }
                wide
              />

              <DetailField
                label="Sponsor notes"
                value={
                  selectedRequest.notes
                }
                wide
              />

              <DetailField
                label="Request ID"
                value={
                  selectedRequest.requestId
                }
                wide
              />
            </div>

            <div
              style={{
                marginTop: 16,
                padding: 15,
                borderRadius: 13,
                border:
                  "1px solid rgba(250,204,21,.3)",
                background:
                  "rgba(15,23,42,.72)",
              }}
            >
              <div
                style={{
                  color: "#facc15",
                  fontSize: 10,
                  fontWeight: 900,
                  letterSpacing: 0.8,
                  textTransform:
                    "uppercase",
                }}
              >
                Administrative Decision
              </div>

              <h4
                style={{
                  margin:
                    "6px 0 12px",
                  color: "#f8fafc",
                  fontSize: 17,
                }}
              >
                Sponsor Review Decision
              </h4>

              <label
                style={{
                  display: "grid",
                  gap: 6,
                  marginBottom: 11,
                  color: "#cbd5e1",
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                Review status

                <select
                  value={decisionStatus}
                  disabled={decisionSaving}
                  onChange={(event) =>
                    setDecisionStatus(
                      event.target.value
                    )
                  }
                  style={inputStyle}
                >
                  {REVIEW_STATUSES
                    .filter(Boolean)
                    .map((status) => (
                      <option
                        key={status}
                        value={status}
                      >
                        {formatLabel(
                          status
                        )}
                      </option>
                    ))}
                </select>
              </label>

              <label
                style={{
                  display: "grid",
                  gap: 6,
                  marginBottom: 11,
                  color: "#cbd5e1",
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                Decision reason

                <textarea
                  value={decisionReason}
                  disabled={decisionSaving}
                  onChange={(event) =>
                    setDecisionReason(
                      event.target.value
                    )
                  }
                  placeholder="Required when requesting more information or declining"
                  rows={4}
                  style={{
                    ...inputStyle,
                    resize: "vertical",
                    fontFamily:
                      "inherit",
                  }}
                />
              </label>

              <label
                style={{
                  display: "grid",
                  gap: 6,
                  marginBottom: 12,
                  color: "#cbd5e1",
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                Internal notes

                <textarea
                  value={internalNotes}
                  disabled={decisionSaving}
                  onChange={(event) =>
                    setInternalNotes(
                      event.target.value
                    )
                  }
                  placeholder="Private AGV administrative notes"
                  rows={5}
                  style={{
                    ...inputStyle,
                    resize: "vertical",
                    fontFamily:
                      "inherit",
                  }}
                />
              </label>

              <button
                type="button"
                disabled={decisionSaving}
                onClick={
                  saveReviewDecision
                }
                style={{
                  width: "100%",
                  minHeight: 42,
                  padding:
                    "9px 14px",
                  borderRadius: 10,
                  border: 0,
                  background:
                    decisionSaving
                      ? "#64748b"
                      : "#facc15",
                  color: "#111827",
                  fontWeight: 950,
                  cursor:
                    decisionSaving
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {decisionSaving
                  ? "Saving Decision..."
                  : "Save Review Decision"}
              </button>

              <div
                style={{
                  marginTop: 12,
                  padding: 11,
                  borderRadius: 10,
                  border:
                    "1px solid rgba(96,165,250,.28)",
                  background:
                    "rgba(30,64,175,.12)",
                  color: "#bfdbfe",
                  fontSize: 11,
                  lineHeight: 1.5,
                }}
              >
                Approved for Next Step is an
                administrative status only. It
                does not create a campaign,
                contract, schedule, invoice,
                payment, publication, or
                playout activation.
              </div>
            </div>

            <div
              style={{
                marginTop: 14,
                padding: 14,
                borderRadius: 13,
                border:
                  "1px solid rgba(148,163,184,.2)",
                background:
                  "rgba(2,6,23,.55)",
              }}
            >
              <div
                style={{
                  color: "#f8fafc",
                  fontSize: 14,
                  fontWeight: 900,
                  marginBottom: 10,
                }}
              >
                Administrative Review Record
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 8,
                  color: "#cbd5e1",
                  fontSize: 12,
                }}
              >
                <div>
                  <strong>Reviewed by:</strong>{" "}
                  {clean(
                    selectedRequest.reviewedBy
                  ) || "Not yet reviewed"}
                </div>

                <div>
                  <strong>Reviewed at:</strong>{" "}
                  {formatDateTime(
                    selectedRequest.reviewedAt
                  )}
                </div>

                <div>
                  <strong>Current reason:</strong>{" "}
                  {clean(
                    selectedRequest.decisionReason
                  ) || "No reason recorded"}
                </div>
              </div>

              <div
                style={{
                  marginTop: 12,
                  display: "grid",
                  gap: 8,
                }}
              >
                {Array.isArray(
                  selectedRequest.reviewHistory
                ) &&
                selectedRequest.reviewHistory
                  .length ? (
                  selectedRequest.reviewHistory
                    .slice()
                    .reverse()
                    .map(
                      (
                        entry,
                        index
                      ) => (
                        <div
                          key={
                            entry.auditId ||
                            entry.id ||
                            `${entry.reviewedAt || entry.createdAt || "history"}-${index}`
                          }
                          style={{
                            padding: 10,
                            borderRadius: 9,
                            border:
                              "1px solid rgba(148,163,184,.16)",
                            background:
                              "rgba(15,23,42,.52)",
                            color:
                              "#cbd5e1",
                            fontSize: 11,
                            lineHeight: 1.5,
                          }}
                        >
                          <div
                            style={{
                              color:
                                "#f8fafc",
                              fontWeight:
                                900,
                            }}
                          >
                            {formatLabel(
                              entry.reviewStatus ||
                              entry.status
                            )}
                          </div>

                          <div>
                            {clean(
                              entry.reviewedBy ||
                              entry.actor
                            ) ||
                              "AGV reviewer"}
                            {" · "}
                            {formatDateTime(
                              entry.reviewedAt ||
                              entry.createdAt
                            )}
                          </div>

                          {clean(
                            entry.decisionReason
                          ) ? (
                            <div>
                              Reason:{" "}
                              {
                                entry.decisionReason
                              }
                            </div>
                          ) : null}

                          {clean(
                            entry.internalNotes
                          ) ? (
                            <div>
                              Internal notes:{" "}
                              {
                                entry.internalNotes
                              }
                            </div>
                          ) : null}
                        </div>
                      )
                    )
                ) : (
                  <div
                    style={{
                      color:
                        "#94a3b8",
                      fontSize: 11,
                    }}
                  >
                    No administrative review
                    history has been recorded.
                  </div>
                )}
              </div>
            </div>
          </aside>
        ) : null}
      </div>
    </section>
  );
}