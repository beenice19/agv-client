import React, { useMemo, useState } from "react";

const DRAFT_KEY = "agv_sponsor_concierge_draft_v1";
const RECEIPT_KEY = "agv_sponsor_concierge_receipt_v1";

// PASS ASC-08B CLIENT SPONSOR INTAKE CONNECTION
const SPONSOR_API_BASE = (
  import.meta.env.VITE_AGV_ANPE_API_URL ||
  "http://127.0.0.1:8802"
).replace(/\/+$/, "");

const PACKAGE_SERVER_MAP = {
  COMMERCIAL: "run-commercial",
  PROGRAM: "sponsor-program",
  SERIES: "sponsor-series",
  EVENT: "sponsor-live-event",
  CHANNEL: "sponsor-channel",
  CUSTOM: "custom-partnership",
};

const MEDIA_SERVER_MAP = {
  VIDEO: "video",
  IMAGE: "image",
  AUDIO: "audio",
  PRODUCTION: "other",
};

function loadReceipt() {
  try {
    const parsed =
      JSON.parse(
        window.localStorage.getItem(
          RECEIPT_KEY
        ) || "null"
      );

    return parsed &&
      typeof parsed === "object"
      ? parsed
      : null;
  } catch {
    return null;
  }
}

const STEPS = [
  "Select Package",
  "Upload Commercial or Artwork",
  "Choose Programming and Dates",
  "Review Order and Payment Terms",
  "Approve Proof and Track Results",
];

const PACKAGES = [
  { id: "COMMERCIAL", title: "Run a Commercial", description: "Place a 15- or 30-second commercial in approved AGV programming." },
  { id: "PROGRAM", title: "Sponsor a Program", description: "Present one approved program or special broadcast." },
  { id: "SERIES", title: "Sponsor a Series", description: "Support a recurring program across multiple episodes." },
  { id: "EVENT", title: "Sponsor a Live Event", description: "Sponsor a convention, conference, fundraiser, or special event." },
  { id: "CHANNEL", title: "Sponsor a Channel", description: "Request a defined sponsorship period for an AGV Network channel." },
  { id: "CUSTOM", title: "Custom Partnership", description: "Ask AGV to prepare a tailored national or institutional proposal." },
];

function loadDraft() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(DRAFT_KEY) || "null");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function money(value) {
  const number = Number(value || 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number.isFinite(number) ? number : 0);
}

const fieldStyle = {
  width: "100%",
  boxSizing: "border-box",
  borderRadius: 12,
  border: "1px solid rgba(226,232,240,0.2)",
  background: "rgba(15,23,42,0.86)",
  color: "#f8fafc",
  padding: "12px 13px",
  outline: "none",
};

function Field({ label, help, children }) {
  return (
    <label style={{ display: "grid", gap: 7 }}>
      <span style={{ color: "#f8fafc", fontWeight: 800, fontSize: 13 }}>
        {label}
      </span>
      {children}
      {help ? (
        <span style={{ color: "#94a3b8", fontSize: 12, lineHeight: 1.45 }}>
          {help}
        </span>
      ) : null}
    </label>
  );
}

export default function SponsorConciergePortal() {
  const initial = useMemo(loadDraft, []);
  const [step, setStep] = useState(
    Number.isInteger(initial.step)
      ? Math.min(Math.max(initial.step, 0), STEPS.length - 1)
      : 0
  );

  const [draft, setDraft] = useState({
    packageId: initial.packageId || "",
    companyName: initial.companyName || "",
    contactName: initial.contactName || "",
    email: initial.email || "",
    phone: initial.phone || "",
    website: initial.website || "",
    mediaName: initial.mediaName || "",
    mediaType: initial.mediaType || "",
    destinationUrl: initial.destinationUrl || "",
    rightsConfirmed: initial.rightsConfirmed === true,
    programming: initial.programming || "",
    startDate: initial.startDate || "",
    endDate: initial.endDate || "",
    budget: initial.budget || "",
    notes: initial.notes || "",
    termsAccepted: initial.termsAccepted === true,
    proofApproved: initial.proofApproved === true,
  });

  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] =
    useState(false);
  const [submitError, setSubmitError] =
    useState("");
  const [submitErrorField, setSubmitErrorField] =
    useState("");
  const [submittedRequest, setSubmittedRequest] =
    useState(() => loadReceipt());
  const selectedPackage =
    PACKAGES.find((item) => item.id === draft.packageId) || null;

  function update(name, value) {
    setDraft((current) => ({ ...current, [name]: value }));
    setMessage("");
    setSubmitError("");
    setSubmitErrorField("");
  }

  function save(nextStep = step) {
    const payload = {
      ...draft,
      step: nextStep,
      savedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
    setMessage("Your Sponsor Concierge draft was saved on this device.");
  }

  function canContinue() {
    if (step === 0) {
      return Boolean(
        draft.packageId &&
        draft.companyName.trim() &&
        draft.contactName.trim() &&
        draft.email.trim()
      );
    }
    if (step === 1) {
      return Boolean(
        draft.mediaName.trim() &&
        draft.mediaType &&
        draft.rightsConfirmed
      );
    }
    if (step === 2) {
      return Boolean(
        draft.programming.trim() &&
        draft.startDate &&
        draft.endDate &&
        new Date(draft.endDate) >= new Date(draft.startDate)
      );
    }
    if (step === 3) return draft.termsAccepted === true;
    return true;
  }

  function next() {
    if (!canContinue()) {
      setMessage("Complete the required information before continuing.");
      return;
    }
    const nextStep = Math.min(step + 1, STEPS.length - 1);
    save(nextStep);
    setStep(nextStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function previous() {
    const nextStep = Math.max(step - 1, 0);
    save(nextStep);
    setStep(nextStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submitRequest() {
    if (isSubmitting) {
      return;
    }

    if (!draft.proofApproved) {
      setMessage(
        "Approve the proof request before submitting."
      );
      return;
    }

    const packageId =
      PACKAGE_SERVER_MAP[draft.packageId];

    const mediaType =
      MEDIA_SERVER_MAP[draft.mediaType];

    if (!packageId) {
      setSubmitErrorField("packageId");
      setSubmitError(
        "Select a valid AGV sponsorship package."
      );
      return;
    }

    if (!mediaType) {
      setSubmitErrorField("mediaType");
      setSubmitError(
        "Select a valid commercial or artwork type."
      );
      return;
    }

    const budgetText =
      String(
        draft.budget ?? ""
      ).trim();

    const payload = {
      packageId,
      companyName:
        draft.companyName.trim(),
      contactName:
        draft.contactName.trim(),
      email:
        draft.email.trim(),
      phone:
        draft.phone.trim(),
      website:
        draft.website.trim(),
      destinationUrl:
        draft.destinationUrl.trim(),
      mediaName:
        draft.mediaName.trim(),
      mediaType,
      programming:
        draft.programming.trim(),
      startDate:
        draft.startDate,
      endDate:
        draft.endDate,
      budget:
        budgetText === ""
          ? null
          : Number(budgetText),
      notes:
        draft.notes.trim(),
      rightsConfirmed:
        draft.rightsConfirmed === true,
      termsAccepted:
        draft.termsAccepted === true,
      proofApproved:
        draft.proofApproved === true,
    };

    setIsSubmitting(true);
    setMessage("");
    setSubmitError("");
    setSubmitErrorField("");

    try {
      window.localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          ...draft,
          step,
          savedAt:
            new Date().toISOString(),
        })
      );

      const response =
        await fetch(
          SPONSOR_API_BASE +
            "/api/sponsor-intake/requests",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              Accept:
                "application/json",
            },
            body:
              JSON.stringify(payload),
          }
        );

      const body =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        const requestError =
          new Error(
            body.error ||
              "AGV could not receive the sponsorship request."
          );

        requestError.field =
          body.field || "";

        throw requestError;
      }

      if (
        body.ok !== true ||
        !body.request ||
        !body.request.requestId
      ) {
        throw new Error(
          "AGV returned an incomplete sponsorship receipt."
        );
      }

      const receipt = {
        request:
          body.request,
        duplicate:
          body.duplicate === true,
        message:
          body.message || "",
        receivedAt:
          new Date().toISOString(),
      };

      window.localStorage.setItem(
        RECEIPT_KEY,
        JSON.stringify(receipt)
      );

      setSubmittedRequest(receipt);

      setMessage(
        body.message ||
          "Your sponsorship request was received for AGV review."
      );
    } catch (error) {
      setSubmitErrorField(
        error &&
        typeof error.field === "string"
          ? error.field
          : ""
      );

      setSubmitError(
        error instanceof Error
          ? error.message
          : "AGV could not receive the sponsorship request."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function refreshRequestStatus() {
    const requestId =
      submittedRequest?.request?.requestId;

    if (
      !requestId ||
      isSubmitting
    ) {
      return;
    }

    setIsSubmitting(true);
    setMessage("");
    setSubmitError("");
    setSubmitErrorField("");

    try {
      const response =
        await fetch(
          SPONSOR_API_BASE +
            "/api/sponsor-intake/requests/" +
            encodeURIComponent(requestId),
          {
            method: "GET",
            headers: {
              Accept:
                "application/json",
            },
          }
        );

      const body =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        const requestError =
          new Error(
            body.error ||
              "AGV could not retrieve the sponsorship request."
          );

        requestError.field =
          body.field || "";

        throw requestError;
      }

      if (
        body.ok !== true ||
        !body.request ||
        !body.request.requestId
      ) {
        throw new Error(
          "AGV returned an incomplete request status."
        );
      }

      const receipt = {
        ...submittedRequest,
        request:
          body.request,
        refreshedAt:
          new Date().toISOString(),
      };

      window.localStorage.setItem(
        RECEIPT_KEY,
        JSON.stringify(receipt)
      );

      setSubmittedRequest(receipt);

      setMessage(
        "Your AGV sponsorship-request status was refreshed."
      );
    } catch (error) {
      setSubmitErrorField(
        error &&
        typeof error.field === "string"
          ? error.field
          : ""
      );

      setSubmitError(
        error instanceof Error
          ? error.message
          : "AGV could not retrieve the sponsorship request."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, rgba(180,138,35,0.2), transparent 34%), #020617",
        color: "#f8fafc",
        padding: "28px 18px 54px",
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <header
          style={{
            borderRadius: 24,
            border: "1px solid rgba(250,204,21,0.28)",
            background:
              "linear-gradient(135deg, rgba(15,23,42,0.98), rgba(30,41,59,0.92))",
            padding: 24,
            boxShadow: "0 26px 70px rgba(0,0,0,0.35)",
          }}
        >
          <div
            style={{
              color: "#facc15",
              fontSize: 12,
              fontWeight: 950,
              textTransform: "uppercase",
              letterSpacing: 1.5,
            }}
          >
            Avant Global Vision
          </div>
          <h1 style={{ margin: "8px 0 8px", fontSize: "clamp(30px, 5vw, 52px)", lineHeight: 1.05 }}>
            Sponsor or Advertise on AGV
          </h1>
          <p style={{ margin: 0, maxWidth: 760, color: "#cbd5e1", lineHeight: 1.65, fontSize: 17 }}>
            Choose your opportunity, provide your commercial or artwork, and tell us where you want to appear. AGV handles the internal campaign, contract, scheduling, invoice, review, activation, and reporting process.
          </p>
        </header>

        <div
          style={{
            marginTop: 18,
            display: "grid",
            gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
            gap: 8,
          }}
        >
          {STEPS.map((label, index) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                if (index <= step) {
                  save(index);
                  setStep(index);
                }
              }}
              style={{
                borderRadius: 12,
                border: index === step ? "1px solid #facc15" : "1px solid rgba(148,163,184,0.2)",
                background:
                  index === step
                    ? "rgba(250,204,21,0.14)"
                    : index < step
                    ? "rgba(34,197,94,0.1)"
                    : "rgba(15,23,42,0.7)",
                color:
                  index === step ? "#fde68a" : index < step ? "#bbf7d0" : "#94a3b8",
                padding: "11px 8px",
                fontSize: 12,
                fontWeight: 850,
                cursor: index <= step ? "pointer" : "default",
              }}
            >
              {`${index + 1}. ${label}`}
            </button>
          ))}
        </div>

        <main
          style={{
            marginTop: 18,
            borderRadius: 22,
            border: "1px solid rgba(148,163,184,0.2)",
            background: "rgba(15,23,42,0.9)",
            padding: 22,
          }}
        >
          <div style={{ color: "#facc15", fontWeight: 900, fontSize: 13 }}>
            {`STEP ${step + 1} OF ${STEPS.length}`}
          </div>
          <h2 style={{ margin: "6px 0 20px", fontSize: 28 }}>{STEPS[step]}</h2>

          {step === 0 ? (
            <div style={{ display: "grid", gap: 20 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
                  gap: 12,
                }}
              >
                {PACKAGES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => update("packageId", item.id)}
                    style={{
                      textAlign: "left",
                      borderRadius: 16,
                      border: draft.packageId === item.id ? "1px solid #facc15" : "1px solid rgba(148,163,184,0.22)",
                      background: draft.packageId === item.id ? "rgba(250,204,21,0.12)" : "rgba(2,6,23,0.36)",
                      color: "#f8fafc",
                      padding: 16,
                      cursor: "pointer",
                    }}
                  >
                    <strong style={{ display: "block", fontSize: 17, marginBottom: 7 }}>
                      {item.title}
                    </strong>
                    <span style={{ color: "#cbd5e1", lineHeight: 1.5, fontSize: 13 }}>
                      {item.description}
                    </span>
                  </button>
                ))}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
                  gap: 12,
                }}
              >
                <Field label="Company Name">
                  <input value={draft.companyName} onChange={(e) => update("companyName", e.target.value)} style={fieldStyle} />
                </Field>
                <Field label="Contact Name">
                  <input value={draft.contactName} onChange={(e) => update("contactName", e.target.value)} style={fieldStyle} />
                </Field>
                <Field label="Email">
                  <input type="email" value={draft.email} onChange={(e) => update("email", e.target.value)} style={fieldStyle} />
                </Field>
                <Field label="Phone">
                  <input value={draft.phone} onChange={(e) => update("phone", e.target.value)} style={fieldStyle} />
                </Field>
                <Field label="Website">
                  <input type="url" value={draft.website} onChange={(e) => update("website", e.target.value)} style={fieldStyle} placeholder="https://" />
                </Field>
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div style={{ display: "grid", gap: 15 }}>
              <Field label="Commercial or Artwork Name" help="Enter the name of the file or creative material you plan to provide.">
                <input value={draft.mediaName} onChange={(e) => update("mediaName", e.target.value)} style={fieldStyle} placeholder="30-second company commercial" />
              </Field>
              <Field label="Material Type">
                <select value={draft.mediaType} onChange={(e) => update("mediaType", e.target.value)} style={fieldStyle}>
                  <option value="">Select material type</option>
                  <option value="VIDEO">Video commercial</option>
                  <option value="IMAGE">Logo or sponsor artwork</option>
                  <option value="AUDIO">Audio commercial</option>
                  <option value="PRODUCTION">AGV production assistance needed</option>
                </select>
              </Field>
              <Field label="Destination Link" help="Optional approved website or landing page.">
                <input type="url" value={draft.destinationUrl} onChange={(e) => update("destinationUrl", e.target.value)} style={fieldStyle} placeholder="https://" />
              </Field>
              <label style={{ display: "flex", gap: 10, alignItems: "flex-start", borderRadius: 14, border: "1px solid rgba(250,204,21,0.25)", background: "rgba(113,63,18,0.14)", padding: 14, color: "#fde68a", lineHeight: 1.55 }}>
                <input type="checkbox" checked={draft.rightsConfirmed} onChange={(e) => update("rightsConfirmed", e.target.checked)} style={{ marginTop: 4 }} />
                <span>
                  I confirm that my organization owns or is authorized to use the submitted commercial, logo, artwork, music, trademarks, claims, and destination link. AGV review and approval are still required.
                </span>
              </label>
              <div style={{ borderRadius: 14, border: "1px dashed rgba(148,163,184,0.35)", padding: 18, color: "#94a3b8", textAlign: "center" }}>
                Secure file upload will be connected after the Sponsor Concierge intake contract is established. This foundation safely records the intended material without uploading or publishing it.
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div style={{ display: "grid", gap: 15 }}>
              <Field label="Programming or Placement Request" help="Tell AGV where you would like the commercial or sponsorship to appear.">
                <textarea value={draft.programming} onChange={(e) => update("programming", e.target.value)} style={{ ...fieldStyle, minHeight: 110, resize: "vertical" }} placeholder="Example: Women in Leadership series, opening commercial placement" />
              </Field>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                <Field label="Requested Start Date">
                  <input type="date" value={draft.startDate} onChange={(e) => update("startDate", e.target.value)} style={fieldStyle} />
                </Field>
                <Field label="Requested End Date">
                  <input type="date" value={draft.endDate} onChange={(e) => update("endDate", e.target.value)} style={fieldStyle} />
                </Field>
                <Field label="Estimated Budget" help="This is a planning amount, not a charge.">
                  <input type="number" min="0" step="1" value={draft.budget} onChange={(e) => update("budget", e.target.value)} style={fieldStyle} />
                </Field>
              </div>
              <Field label="Additional Notes">
                <textarea value={draft.notes} onChange={(e) => update("notes", e.target.value)} style={{ ...fieldStyle, minHeight: 96, resize: "vertical" }} />
              </Field>
            </div>
          ) : null}

          {step === 3 ? (
            <div style={{ display: "grid", gap: 14 }}>
              <div style={{ borderRadius: 16, border: "1px solid rgba(148,163,184,0.2)", background: "rgba(2,6,23,0.38)", padding: 16, display: "grid", gap: 10 }}>
                <strong style={{ color: "#facc15", fontSize: 18 }}>Request Summary</strong>
                <div>Package: <b>{selectedPackage?.title || "Not selected"}</b></div>
                <div>Company: <b>{draft.companyName || "Not entered"}</b></div>
                <div>Material: <b>{draft.mediaName || "Not entered"}</b></div>
                <div>Programming: <b>{draft.programming || "Not entered"}</b></div>
                <div>Requested dates: <b>{draft.startDate || "â€”"} to {draft.endDate || "â€”"}</b></div>
                <div>Estimated budget: <b>{money(draft.budget)}</b></div>
              </div>
              <div style={{ borderRadius: 14, border: "1px solid rgba(96,165,250,0.25)", background: "rgba(30,64,175,0.12)", padding: 15, color: "#bfdbfe", lineHeight: 1.55 }}>
                AGV will review availability and prepare the final package, pricing, contract, schedule, invoice, required disclosure, and proof. This screen does not charge a card or create a binding placement.
              </div>
              <label style={{ display: "flex", gap: 10, alignItems: "flex-start", color: "#e2e8f0", lineHeight: 1.55 }}>
                <input type="checkbox" checked={draft.termsAccepted} onChange={(e) => update("termsAccepted", e.target.checked)} style={{ marginTop: 4 }} />
                <span>
                  I understand this is a request for AGV review. Final pricing, availability, contract acceptance, payment instructions, and AGV approval are still required.
                </span>
              </label>
            </div>
          ) : null}

          {step === 4 ? (
            <div style={{ display: "grid", gap: 14 }}>
              <div style={{ borderRadius: 16, border: "1px solid rgba(74,222,128,0.26)", background: "rgba(20,83,45,0.13)", padding: 16, color: "#bbf7d0", lineHeight: 1.6 }}>
                AGV will prepare a sponsor proof after reviewing your request, materials, dates, availability, pricing, disclosure, and rights information. No advertisement or sponsorship is live at this stage.
              </div>
              <label style={{ display: "flex", gap: 10, alignItems: "flex-start", color: "#f8fafc", lineHeight: 1.55 }}>
                <input type="checkbox" checked={draft.proofApproved} onChange={(e) => update("proofApproved", e.target.checked)} style={{ marginTop: 4 }} />
                <span>
                  I approve AGV preparing this request for internal review and a future sponsor proof. This does not approve publication, payment, or campaign activation.
                </span>
              </label>
              <button
                type="button"
                onClick={submitRequest}
                disabled={
                  !draft.proofApproved ||
                  isSubmitting
                }
                style={{
                  border: 0,
                  borderRadius: 13,
                  padding: "13px 16px",
                  background:
                    draft.proofApproved &&
                    !isSubmitting
                      ? "linear-gradient(135deg, #facc15, #eab308)"
                      : "rgba(71,85,105,0.55)",
                  color:
                    draft.proofApproved &&
                    !isSubmitting
                      ? "#111827"
                      : "#94a3b8",
                  fontWeight: 950,
                  cursor:
                    draft.proofApproved &&
                    !isSubmitting
                      ? "pointer"
                      : "not-allowed",
                }}
              >
                {isSubmitting
                  ? "Submitting Securely..."
                  : "Submit Sponsorship Request for AGV Review"}
              </button>
              <div style={{ borderRadius: 14, border: "1px solid rgba(148,163,184,0.2)", padding: 15, color: "#cbd5e1", lineHeight: 1.55 }}>
                Performance reporting will appear here after a future AGV-approved campaign is contracted, scheduled, activated, and measured.
              </div>
            </div>
          ) : null}

          {submitError ? (
            <div
              role="alert"
              style={{
                marginTop: 18,
                borderRadius: 12,
                border:
                  "1px solid rgba(248,113,113,0.42)",
                background:
                  "rgba(127,29,29,0.2)",
                color: "#fecaca",
                padding: 12,
                fontWeight: 750,
                lineHeight: 1.55,
              }}
            >
              {submitErrorField ? (
                <div
                  style={{
                    color: "#fca5a5",
                    fontSize: 12,
                    textTransform: "uppercase",
                    letterSpacing: 0.8,
                    marginBottom: 4,
                  }}
                >
                  {"Field requiring attention: " + submitErrorField}
                </div>
              ) : null}

              {submitError}
            </div>
          ) : null}

          {submittedRequest?.request?.requestId ? (
            <div
              style={{
                marginTop: 18,
                borderRadius: 16,
                border:
                  "1px solid rgba(74,222,128,0.32)",
                background:
                  "rgba(20,83,45,0.16)",
                color: "#dcfce7",
                padding: 16,
                display: "grid",
                gap: 10,
              }}
            >
              <div
                style={{
                  color: "#86efac",
                  fontWeight: 950,
                  fontSize: 18,
                }}
              >
                AGV Sponsorship Request Received
              </div>

              <div>
                Request ID:{" "}
                <strong>
                  {
                    submittedRequest
                      .request
                      .requestId
                  }
                </strong>
              </div>

              <div>
                Submission status:{" "}
                <strong>
                  {
                    submittedRequest
                      .request
                      .submissionStatus
                  }
                </strong>
              </div>

              <div>
                Review status:{" "}
                <strong>
                  {
                    submittedRequest
                      .request
                      .reviewStatus
                  }
                </strong>
              </div>

              {submittedRequest.duplicate ? (
                <div
                  style={{
                    color: "#fde68a",
                  }}
                >
                  AGV recognized this as a recent duplicate request and preserved the original request ID.
                </div>
              ) : null}

              <div
                style={{
                  color: "#bbf7d0",
                  lineHeight: 1.55,
                  fontSize: 13,
                }}
              >
                No campaign, contract, schedule, invoice, payment, publication, or activation was created by this submission.
              </div>

              <button
                type="button"
                onClick={
                  refreshRequestStatus
                }
                disabled={isSubmitting}
                style={{
                  justifySelf: "start",
                  borderRadius: 11,
                  border:
                    "1px solid rgba(74,222,128,0.34)",
                  background:
                    "rgba(20,83,45,0.28)",
                  color: "#dcfce7",
                  padding: "10px 13px",
                  fontWeight: 850,
                  cursor:
                    isSubmitting
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {isSubmitting
                  ? "Checking Status..."
                  : "Refresh Request Status"}
              </button>
            </div>
          ) : null}

          {message ? (
            <div role="status" style={{ marginTop: 18, borderRadius: 12, border: "1px solid rgba(250,204,21,0.28)", background: "rgba(113,63,18,0.14)", color: "#fde68a", padding: 12, fontWeight: 750 }}>
              {message}
            </div>
          ) : null}

          <div style={{ marginTop: 22, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <button type="button" onClick={previous} disabled={step === 0} style={{ borderRadius: 12, border: "1px solid rgba(148,163,184,0.25)", background: "rgba(15,23,42,0.75)", color: step === 0 ? "#64748b" : "#f8fafc", padding: "11px 15px", fontWeight: 850, cursor: step === 0 ? "not-allowed" : "pointer" }}>
              Back
            </button>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="button" onClick={() => save(step)} style={{ borderRadius: 12, border: "1px solid rgba(250,204,21,0.28)", background: "rgba(113,63,18,0.14)", color: "#fde68a", padding: "11px 15px", fontWeight: 850, cursor: "pointer" }}>
                Save and Continue Later
              </button>
              {step < STEPS.length - 1 ? (
                <button type="button" onClick={next} style={{ border: 0, borderRadius: 12, background: canContinue() ? "linear-gradient(135deg, #facc15, #eab308)" : "rgba(71,85,105,0.55)", color: canContinue() ? "#111827" : "#94a3b8", padding: "11px 16px", fontWeight: 950, cursor: canContinue() ? "pointer" : "not-allowed" }}>
                  Continue
                </button>
              ) : null}
            </div>
          </div>
        </main>

        <footer style={{ marginTop: 18, textAlign: "center", color: "#64748b", fontSize: 12 }}>
          Sponsors cannot publish directly, change AGV pricing, approve their own campaign, execute payments, or activate programming.
        </footer>
      </div>
    </div>
  );
}


