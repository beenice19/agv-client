import React, { useEffect, useMemo, useState } from "react";

// PASS CP-01 AGV CONTENT PARTNER PORTAL CLIENT SHELL
const DRAFT_KEY = "agv_content_partner_draft_v1";

// PASS CP-04 CLIENT PARTNER DRAFT REGISTRY CONNECTION
const REGISTRATION_KEY =
  "agv_content_partner_registration_v1";

const CONTENT_PARTNER_API_BASE =
  "http://127.0.0.1:8787";

function loadRegistration() {
  try {
    const saved = localStorage.getItem(REGISTRATION_KEY);

    if (!saved) {
      return null;
    }

    const parsed = JSON.parse(saved);

    if (
      !parsed ||
      !parsed.submissionId ||
      !parsed.draftAccessToken
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

const STEPS = [
  { id: 1, label: "Create Channel" },
  { id: 2, label: "Verify Identity" },
  { id: 3, label: "Film Details" },
  { id: 4, label: "Rights & Ownership" },
  { id: 5, label: "Upload Files" },
  { id: 6, label: "Release Setup" },
  { id: 7, label: "Review & Submit" },
];

const INITIAL_DRAFT = {
  channelName: "",
  partnerType: "Independent Filmmaker",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  organizationName: "",
  country: "",
  identityConfirmed: false,

  filmTitle: "",
  synopsis: "",
  genre: "",
  runtime: "",
  audienceRating: "",
  productionYear: "",
  language: "",
  territoryRights: "",

  ownsFilmRights: false,
  musicClearance: false,
  footageClearance: false,
  talentReleases: false,
  distributionAuthority: false,

  posterName: "",
  trailerName: "",
  featureName: "",
  captionsName: "",

  releaseType: "FREE_SCREENING",
  preferredPremiereDate: "",
  reviewerNotes: "",
};

function loadDraft() {
  try {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (!saved) return INITIAL_DRAFT;

    return {
      ...INITIAL_DRAFT,
      ...JSON.parse(saved),
    };
  } catch {
    return INITIAL_DRAFT;
  }
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}) {
  return (
    <label style={styles.fieldLabel}>
      <span>
        {label}
        {required ? <b style={styles.required}> *</b> : null}
      </span>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        style={styles.input}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
  required = false,
}) {
  return (
    <label style={styles.fieldLabel}>
      <span>
        {label}
        {required ? <b style={styles.required}> *</b> : null}
      </span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={styles.input}
      >
        {children}
      </select>
    </label>
  );
}

function CheckRow({ checked, onChange, title, detail }) {
  return (
    <label style={styles.checkRow}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        style={styles.checkbox}
      />

      <span>
        <strong style={styles.checkTitle}>{title}</strong>
        <span style={styles.checkDetail}>{detail}</span>
      </span>
    </label>
  );
}

function FileBox({
  title,
  detail,
  fileName,
  onChange,
  accept,
  metadataDetail = "",
}) {
  return (
    <label style={styles.fileBox}>
      <div style={styles.fileIcon}>⇧</div>
      <strong>{title}</strong>

      <span style={styles.fileDetail}>
        {fileName || detail}
      </span>

      {metadataDetail ? (
        <small style={styles.fileMetadataDetail}>
          {metadataDetail}
        </small>
      ) : null}

      <input
        type="file"
        accept={accept}
        style={{ display: "none" }}
        onChange={(event) => {
          const file = event.target.files?.[0] || null;
          onChange(file);
        }}
      />

      <span style={styles.browseButton}>
        {fileName ? "Change File" : "Choose File"}
      </span>
    </label>
  );
}

export default function AgvContentPartnerPortal() {
  const [activeStep, setActiveStep] = useState(1);
  const [draft, setDraft] = useState(loadDraft);
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === "undefined" ? 1440 : window.innerWidth
  );
  const [draftMessage, setDraftMessage] = useState(
    "Draft changes are saved locally on this device."
  );

  // PASS CP-02 PARTNER DRAFT VALIDATION AND CONTROLLED STEP GATING
  const [validationMessage, setValidationMessage] = useState("");

  // PASS CP-04 CLIENT PARTNER DRAFT REGISTRY CONNECTION
  const [registration, setRegistration] = useState(loadRegistration);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationMessage, setRegistrationMessage] = useState("");

  // PASS CP-05 PRIVATE DRAFT RECOVERY AND REGISTRATION RESET
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState("");

  // PASS CP-06B CLIENT SECURE PARTNER MEDIA INTAKE RESERVATION
  const [featureFile, setFeatureFile] = useState(null);
  const [isReservingIntake, setIsReservingIntake] = useState(false);
  const [intakeMessage, setIntakeMessage] = useState("");

  // PASS CP-07B CLIENT SECURE PARTNER FEATURE FILM UPLOAD
  const [isUploadingFeature, setIsUploadingFeature] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMessage, setUploadMessage] = useState("");

  const isMobile = viewportWidth < 720;
  const isTablet = viewportWidth >= 720 && viewportWidth < 1120;

  useEffect(() => {
    function handleResize() {
      setViewportWidth(window.innerWidth);
    }

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      setDraftMessage("Draft saved locally.");
    } catch {
      setDraftMessage("Draft could not be saved on this device.");
    }
  }, [draft]);

  useEffect(() => {
    const savedRegistration = loadRegistration();

    if (
      savedRegistration?.submissionId &&
      savedRegistration?.draftAccessToken
    ) {
      verifySavedDraft(savedRegistration, true);
    }
  }, []);

  function updateField(name, value) {
    setDraft((current) => ({
      ...current,
      [name]: value,
    }));

    setValidationMessage("");
  }

  function selectFeatureFile(file) {
    setFeatureFile(file);

    updateField(
      "featureName",
      file?.name || ""
    );

    setIntakeMessage("");
    setUploadMessage("");
    setUploadProgress(0);
  }

  function formatFileSize(bytes) {
    const safeBytes = Number(bytes);

    if (!Number.isFinite(safeBytes) || safeBytes <= 0) {
      return "";
    }

    if (safeBytes >= 1073741824) {
      return (
        (safeBytes / 1073741824).toFixed(2) +
        " GB"
      );
    }

    if (safeBytes >= 1048576) {
      return (
        (safeBytes / 1048576).toFixed(1) +
        " MB"
      );
    }

    if (safeBytes >= 1024) {
      return (
        (safeBytes / 1024).toFixed(1) +
        " KB"
      );
    }

    return safeBytes + " bytes";
  }

  function validateStep(stepNumber) {
    const email = String(draft.contactEmail || "").trim();
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (stepNumber === 1) {
      if (!String(draft.channelName || "").trim()) {
        return {
          ok: false,
          message: "Enter the AGV channel name before continuing.",
        };
      }

      if (!String(draft.contactName || "").trim()) {
        return {
          ok: false,
          message: "Enter the primary contact name before continuing.",
        };
      }

      if (!email) {
        return {
          ok: false,
          message: "Enter the partner contact email before continuing.",
        };
      }

      if (!validEmail) {
        return {
          ok: false,
          message: "Enter a valid contact email address.",
        };
      }
    }

    if (stepNumber === 2) {
      if (!String(draft.country || "").trim()) {
        return {
          ok: false,
          message: "Enter the partner country or territory.",
        };
      }

      if (draft.identityConfirmed !== true) {
        return {
          ok: false,
          message:
            "Confirm that you are the identified person or authorized representative.",
        };
      }
    }

    if (stepNumber === 3) {
      if (!String(draft.filmTitle || "").trim()) {
        return {
          ok: false,
          message: "Enter the film title before continuing.",
        };
      }

      if (!String(draft.synopsis || "").trim()) {
        return {
          ok: false,
          message: "Enter a synopsis before continuing.",
        };
      }

      if (!String(draft.genre || "").trim()) {
        return {
          ok: false,
          message: "Select the film genre before continuing.",
        };
      }
    }

    if (stepNumber === 4) {
      const rightsComplete =
        draft.ownsFilmRights === true &&
        draft.musicClearance === true &&
        draft.footageClearance === true &&
        draft.talentReleases === true &&
        draft.distributionAuthority === true;

      if (!rightsComplete) {
        return {
          ok: false,
          message:
            "Confirm every rights and ownership declaration before continuing.",
        };
      }
    }

    if (stepNumber === 5) {
      if (!String(draft.featureName || "").trim()) {
        return {
          ok: false,
          message:
            "Select the feature-film file before continuing to release setup.",
        };
      }
    }

    if (stepNumber === 6) {
      if (!String(draft.releaseType || "").trim()) {
        return {
          ok: false,
          message: "Select a preferred release type before continuing.",
        };
      }
    }

    return { ok: true, message: "" };
  }

  function isStepComplete(stepNumber) {
    return validateStep(stepNumber).ok;
  }

  function canOpenStep(targetStep) {
    if (targetStep <= 1) return true;

    for (let stepNumber = 1; stepNumber < targetStep; stepNumber += 1) {
      if (!isStepComplete(stepNumber)) {
        return false;
      }
    }

    return true;
  }

  function openStep(targetStep) {
    if (!canOpenStep(targetStep)) {
      setValidationMessage(
        "Complete each earlier onboarding step before opening this section."
      );
      return;
    }

    setValidationMessage("");
    setActiveStep(targetStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function nextStep() {
    const validation = validateStep(activeStep);

    if (!validation.ok) {
      setValidationMessage(validation.message);
      return;
    }

    setValidationMessage("");
    setActiveStep((current) => Math.min(7, current + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function previousStep() {
    setValidationMessage("");
    setActiveStep((current) => Math.max(1, current - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function recoverDraftFields(serverSubmission) {
    const partner = serverSubmission?.partner || {};
    const film = serverSubmission?.film || {};
    const rights = serverSubmission?.rightsDeclarations || {};
    const files = serverSubmission?.fileMetadata || {};
    const release = serverSubmission?.releaseSetup || {};

    return {
      ...INITIAL_DRAFT,

      channelName: partner.channelName || "",
      partnerType:
        partner.partnerType || "Independent Filmmaker",
      contactName: partner.contactName || "",
      contactEmail: partner.contactEmail || "",
      contactPhone: partner.contactPhone || "",
      organizationName: partner.organizationName || "",
      country: partner.country || "",
      identityConfirmed:
        partner.identityConfirmed === true,

      filmTitle: film.title || "",
      synopsis: film.synopsis || "",
      genre: film.genre || "",
      runtime: film.runtime || "",
      audienceRating: film.audienceRating || "",
      productionYear: film.productionYear || "",
      language: film.language || "",
      territoryRights: film.territoryRights || "",

      ownsFilmRights:
        rights.ownsFilmRights === true,
      musicClearance:
        rights.musicClearance === true,
      footageClearance:
        rights.footageClearance === true,
      talentReleases:
        rights.talentReleases === true,
      distributionAuthority:
        rights.distributionAuthority === true,

      posterName: files.posterName || "",
      trailerName: files.trailerName || "",
      featureName: files.featureName || "",
      captionsName: files.captionsName || "",

      releaseType:
        release.releaseType || "FREE_SCREENING",
      preferredPremiereDate:
        release.preferredPremiereDate || "",
      reviewerNotes: release.reviewerNotes || "",
    };
  }

  async function verifySavedDraft(
    registrationOverride = null,
    automatic = false
  ) {
    const savedRegistration =
      registrationOverride || registration;

    if (
      !savedRegistration?.submissionId ||
      !savedRegistration?.draftAccessToken
    ) {
      setRecoveryMessage(
        "No complete private draft registration is saved on this device."
      );
      return;
    }

    if (isRecovering) {
      return;
    }

    setIsRecovering(true);

    if (!automatic) {
      setRecoveryMessage(
        "Verifying the saved draft with AGV..."
      );
    }

    try {
      const response = await fetch(
        CONTENT_PARTNER_API_BASE +
          "/api/content-partner/submissions/" +
          encodeURIComponent(
            savedRegistration.submissionId
          ),
        {
          method: "GET",
          headers: {
            "X-AGV-Partner-Draft-Token":
              savedRegistration.draftAccessToken,
          },
        }
      );

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok || !payload?.submission) {
        throw new Error(
          payload?.error ||
            "AGV could not verify the saved draft."
        );
      }

      const verifiedRegistration = {
        ...savedRegistration,
        status:
          payload.status ||
          payload.submission.status ||
          "DRAFT_REGISTERED",
        verifiedAt: new Date().toISOString(),
      };

      localStorage.setItem(
        REGISTRATION_KEY,
        JSON.stringify(verifiedRegistration)
      );

      const recoveredDraft = recoverDraftFields(
        payload.submission
      );

      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify(recoveredDraft)
      );

      setRegistration(verifiedRegistration);
      setDraft(recoveredDraft);
      setRecoveryMessage(
        "Saved draft verified and recovered securely from AGV."
      );
      setRegistrationMessage(
        "Draft registration verified. No media files were uploaded."
      );
      setDraftMessage(
        "Verified AGV draft restored on this device."
      );
    } catch (error) {
      setRecoveryMessage(
        error?.message ||
          "The saved AGV draft could not be verified."
      );
    } finally {
      setIsRecovering(false);
    }
  }

  function startNewPartnerDraft() {
    const confirmed = window.confirm(
      "Start a new Content Partner draft? This clears the draft and private registration credentials from this device only. The existing AGV SERVER record will be preserved."
    );

    if (!confirmed) {
      return;
    }

    localStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem(REGISTRATION_KEY);

    setDraft({ ...INITIAL_DRAFT });
    setFeatureFile(null);
    setRegistration(null);
    setRegistrationMessage("");
    setIntakeMessage("");
    setUploadMessage("");
    setUploadProgress(0);
    setIsUploadingFeature(false);
    setRecoveryMessage(
      "A new local draft has started. The previous AGV SERVER record was not deleted."
    );
    setValidationMessage("");
    setDraftMessage(
      "New Content Partner draft saved locally."
    );
    setActiveStep(1);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function reserveSecureMediaIntake() {
    if (
      isReservingIntake ||
      registration?.mediaIntakeId
    ) {
      return;
    }

    if (
      !registration?.submissionId ||
      !registration?.draftAccessToken
    ) {
      setIntakeMessage(
        "Register and verify the Partner draft before reserving media intake."
      );
      return;
    }

    if (!featureFile) {
      setIntakeMessage(
        "Reselect the registered feature-film file before reserving secure intake. The movie will not be uploaded during this step."
      );
      setActiveStep(5);
      return;
    }

    if (featureFile.name !== draft.featureName) {
      setIntakeMessage(
        "The selected file does not match the registered feature-film filename."
      );
      setActiveStep(5);
      return;
    }

    if (
      !Number.isSafeInteger(featureFile.size) ||
      featureFile.size <= 0
    ) {
      setIntakeMessage(
        "AGV could not determine a valid feature-film file size."
      );
      return;
    }

    setIsReservingIntake(true);
    setIntakeMessage(
      "Reserving a protected AGV media intake. No file bytes are being uploaded..."
    );

    try {
      const response = await fetch(
        CONTENT_PARTNER_API_BASE +
          "/api/content-partner/submissions/" +
          encodeURIComponent(
            registration.submissionId
          ) +
          "/reserve-media-intake",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-AGV-Partner-Draft-Token":
              registration.draftAccessToken,
          },
          body: JSON.stringify({
            filename: featureFile.name,
            filesize: featureFile.size,
            mimetype:
              featureFile.type ||
              "application/octet-stream",
          }),
        }
      );

      const payload = await response.json().catch(() => null);

      if (
        !response.ok ||
        !payload?.ok ||
        !payload?.intakeId
      ) {
        throw new Error(
          payload?.error ||
            "AGV could not reserve secure media intake."
        );
      }

      const updatedRegistration = {
        ...registration,
        status:
          payload.partnerStatus ||
          "AWAITING_SECURE_UPLOAD",
        mediaIntakeId: payload.intakeId,
        intakeStatus:
          payload.intakeStatus ||
          "AWAITING_SECURE_UPLOAD",
        intakeReservedAt:
          new Date().toISOString(),
        featureFileSize: featureFile.size,
        featureMimeType:
          featureFile.type ||
          "application/octet-stream",
      };

      localStorage.setItem(
        REGISTRATION_KEY,
        JSON.stringify(updatedRegistration)
      );

      setRegistration(updatedRegistration);

      setIntakeMessage(
        payload.duplicatePrevented
          ? "The existing secure media intake reservation was recovered. No media file was uploaded."
          : "Secure media intake reserved successfully. No media file was uploaded."
      );

      setRegistrationMessage(
        "Partner draft linked to controlled AGV media intake."
      );
    } catch (error) {
      setIntakeMessage(
        error?.message ||
          "AGV could not reserve secure media intake."
      );
    } finally {
      setIsReservingIntake(false);
    }
  }

  function uploadFeatureFilmSecurely() {
    if (
      isUploadingFeature ||
      registration?.featureUploadCompleted
    ) {
      return;
    }

    if (
      !registration?.submissionId ||
      !registration?.draftAccessToken
    ) {
      setUploadMessage(
        "Register and verify the Partner draft before uploading the feature film."
      );
      return;
    }

    if (!registration?.mediaIntakeId) {
      setUploadMessage(
        "Reserve a secure AGV media intake before uploading the feature film."
      );
      return;
    }

    if (!featureFile) {
      setUploadMessage(
        "Reselect the same feature-film file before uploading. Browsers cannot restore local file access after a refresh."
      );
      setActiveStep(5);
      return;
    }

    if (featureFile.name !== draft.featureName) {
      setUploadMessage(
        "The selected file does not match the registered feature-film filename."
      );
      setActiveStep(5);
      return;
    }

    if (
      registration.featureFileSize &&
      Number(registration.featureFileSize) !==
        Number(featureFile.size)
    ) {
      setUploadMessage(
        "The selected file size does not match the reserved media intake."
      );
      setActiveStep(5);
      return;
    }

    const formData = new FormData();
    formData.append("media", featureFile);

    const request = new XMLHttpRequest();

    setIsUploadingFeature(true);
    setUploadProgress(0);
    setUploadMessage(
      "Uploading the feature film into Owner-private AGV storage..."
    );

    request.open(
      "POST",
      CONTENT_PARTNER_API_BASE +
        "/api/content-partner/submissions/" +
        encodeURIComponent(
          registration.submissionId
        ) +
        "/upload-feature"
    );

    request.setRequestHeader(
      "X-AGV-Partner-Draft-Token",
      registration.draftAccessToken
    );

    request.upload.onprogress = (event) => {
      if (!event.lengthComputable) {
        return;
      }

      const percent = Math.min(
        100,
        Math.max(
          0,
          Math.round(
            (event.loaded / event.total) * 100
          )
        )
      );

      setUploadProgress(percent);
    };

    request.onerror = () => {
      setIsUploadingFeature(false);
      setUploadMessage(
        "The secure feature-film upload could not reach AGV SERVER 8787."
      );
    };

    request.onabort = () => {
      setIsUploadingFeature(false);
      setUploadMessage(
        "The secure feature-film upload was interrupted."
      );
    };

    request.onload = () => {
      let payload = null;

      try {
        payload = JSON.parse(
          request.responseText || "{}"
        );
      } catch {
        payload = null;
      }

      if (
        request.status < 200 ||
        request.status >= 300 ||
        !payload?.ok
      ) {
        setIsUploadingFeature(false);
        setUploadMessage(
          payload?.error ||
            "AGV could not complete the secure feature-film upload."
        );
        return;
      }

      const completedRegistration = {
        ...registration,
        status:
          payload.partnerStatus ||
          "UPLOADED_AWAITING_FOUNDER_REVIEW",
        intakeStatus:
          payload.intakeStatus ||
          "UPLOADED_PENDING_REVIEW",
        mediaIntakeId:
          payload.intakeId ||
          registration.mediaIntakeId,
        featureUploadCompleted: true,
        featureUploadedAt:
          payload?.submission?.upload?.uploadedAt ||
          new Date().toISOString(),
        ownerPrivate: true,
        publicAccess: false,
        founderReviewRequired: true,
      };

      try {
        localStorage.setItem(
          REGISTRATION_KEY,
          JSON.stringify(completedRegistration)
        );
      } catch {
        setUploadMessage(
          "The film uploaded securely, but this browser could not save the updated local status."
        );
      }

      setRegistration(completedRegistration);
      setUploadProgress(100);
      setIsUploadingFeature(false);

      setUploadMessage(
        "Feature film uploaded securely. It is Owner-private and awaiting Founder review."
      );

      setRegistrationMessage(
        "Partner feature film received by AGV. Public access remains disabled."
      );
    };

    request.send(formData);
  }

  async function registerDraftWithAgv() {
    if (isRegistering || registration?.submissionId) {
      return;
    }

    for (let stepNumber = 1; stepNumber <= 6; stepNumber += 1) {
      const validation = validateStep(stepNumber);

      if (!validation.ok) {
        setValidationMessage(validation.message);
        setRegistrationMessage("");
        setActiveStep(stepNumber);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
    }

    setIsRegistering(true);
    setValidationMessage("");
    setRegistrationMessage(
      "Registering the protected draft with AGV..."
    );

    try {
      const response = await fetch(
        CONTENT_PARTNER_API_BASE +
          "/api/content-partner/submissions/draft",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            channelName: draft.channelName,
            partnerType: draft.partnerType,
            contactName: draft.contactName,
            contactEmail: draft.contactEmail,
            contactPhone: draft.contactPhone,
            organizationName: draft.organizationName,
            country: draft.country,
            identityConfirmed:
              draft.identityConfirmed === true,

            filmTitle: draft.filmTitle,
            synopsis: draft.synopsis,
            genre: draft.genre,
            runtime: draft.runtime,
            audienceRating: draft.audienceRating,
            productionYear: draft.productionYear,
            language: draft.language,
            territoryRights: draft.territoryRights,

            ownsFilmRights:
              draft.ownsFilmRights === true,
            musicClearance:
              draft.musicClearance === true,
            footageClearance:
              draft.footageClearance === true,
            talentReleases:
              draft.talentReleases === true,
            distributionAuthority:
              draft.distributionAuthority === true,

            posterName: draft.posterName,
            trailerName: draft.trailerName,
            featureName: draft.featureName,
            captionsName: draft.captionsName,

            releaseType: draft.releaseType,
            preferredPremiereDate:
              draft.preferredPremiereDate,
            reviewerNotes: draft.reviewerNotes,
          }),
        }
      );

      const payload = await response.json().catch(() => null);

      if (
        !response.ok ||
        !payload?.ok ||
        !payload?.submissionId ||
        !payload?.draftAccessToken
      ) {
        throw new Error(
          payload?.error ||
            "AGV could not register this draft."
        );
      }

      const savedRegistration = {
        submissionId: payload.submissionId,
        draftAccessToken: payload.draftAccessToken,
        status: payload.status || "DRAFT_REGISTERED",
        registeredAt:
          payload?.submission?.createdAt ||
          new Date().toISOString(),
      };

      localStorage.setItem(
        REGISTRATION_KEY,
        JSON.stringify(savedRegistration)
      );

      setRegistration(savedRegistration);
      setRegistrationMessage(
        "Draft registered securely with AGV. No media files were uploaded."
      );

      setDraftMessage(
        "AGV draft registration saved on this device."
      );
    } catch (error) {
      setRegistrationMessage(
        error?.message ||
          "AGV could not register this draft."
      );
    } finally {
      setIsRegistering(false);
    }
  }

  const completion = useMemo(() => {
    const checks = [
      Boolean(draft.channelName && draft.contactName && draft.contactEmail),
      Boolean(draft.identityConfirmed),
      Boolean(draft.filmTitle && draft.synopsis && draft.genre),
      Boolean(
        draft.ownsFilmRights &&
          draft.musicClearance &&
          draft.footageClearance &&
          draft.talentReleases &&
          draft.distributionAuthority
      ),
      Boolean(draft.featureName),
      Boolean(draft.releaseType),
    ];

    return checks.filter(Boolean).length;
  }, [draft]);

  const submissionStatuses = [
    ["Rights Check", activeStep > 4 ? "Ready for Review" : "Pending"],
    ["Technical Review", activeStep > 5 ? "Ready for Review" : "Pending"],
    ["Editorial Review", "Pending"],
    ["Approval Status", "Pending"],
    ["AGV Network Placement", "Pending Review"],
  ];

  function renderStep() {
    if (activeStep === 1) {
      return (
        <div style={styles.stepBody}>
          <div style={styles.sectionHeading}>
            <div style={styles.sectionIcon}>▣</div>
            <div>
              <h2 style={styles.sectionTitle}>Welcome, Filmmaker</h2>
              <p style={styles.sectionText}>
                Create the AGV channel identity viewers will see with
                your approved films.
              </p>
            </div>
          </div>

          <div style={styles.formGrid}>
            <Field
              label="Channel Name"
              value={draft.channelName}
              onChange={(value) => updateField("channelName", value)}
              placeholder="Your AGV channel name"
              required
            />

            <SelectField
              label="Partner Type"
              value={draft.partnerType}
              onChange={(value) => updateField("partnerType", value)}
            >
              <option>Independent Filmmaker</option>
              <option>Production Company</option>
              <option>Distributor</option>
              <option>Educational Organization</option>
              <option>Faith-Based Organization</option>
            </SelectField>

            <Field
              label="Contact Name"
              value={draft.contactName}
              onChange={(value) => updateField("contactName", value)}
              placeholder="Primary contact"
              required
            />

            <Field
              label="Contact Email"
              type="email"
              value={draft.contactEmail}
              onChange={(value) => updateField("contactEmail", value)}
              placeholder="partner@example.com"
              required
            />

            <Field
              label="Contact Phone"
              value={draft.contactPhone}
              onChange={(value) => updateField("contactPhone", value)}
              placeholder="Optional phone number"
            />

            <Field
              label="Organization Name"
              value={draft.organizationName}
              onChange={(value) =>
                updateField("organizationName", value)
              }
              placeholder="Company or organization"
            />
          </div>
        </div>
      );
    }

    if (activeStep === 2) {
      return (
        <div style={styles.stepBody}>
          <div style={styles.sectionHeading}>
            <div style={styles.sectionIcon}>✓</div>
            <div>
              <h2 style={styles.sectionTitle}>Verify Identity</h2>
              <p style={styles.sectionText}>
                Identity verification will be connected to the AGV
                secure verification service in a later SERVER pass.
              </p>
            </div>
          </div>

          <div style={styles.formGrid}>
            <Field
              label="Country or Territory"
              value={draft.country}
              onChange={(value) => updateField("country", value)}
              placeholder="Country of residence or registration"
              required
            />
          </div>

          <CheckRow
            checked={draft.identityConfirmed}
            onChange={(value) =>
              updateField("identityConfirmed", value)
            }
            title="I am the person or authorized representative identified in this submission."
            detail="This is a draft acknowledgement only. Formal identity verification is not active yet."
          />

          <div style={styles.notice}>
            No identity document is uploaded or transmitted during
            CP-01.
          </div>
        </div>
      );
    }

    if (activeStep === 3) {
      return (
        <div style={styles.stepBody}>
          <div style={styles.sectionHeading}>
            <div style={styles.sectionIcon}>▶</div>
            <div>
              <h2 style={styles.sectionTitle}>Film Details</h2>
              <p style={styles.sectionText}>
                Tell AGV about the film you want reviewed for the
                network.
              </p>
            </div>
          </div>

          <div style={styles.formGrid}>
            <Field
              label="Film Title"
              value={draft.filmTitle}
              onChange={(value) => updateField("filmTitle", value)}
              placeholder="Enter the full film title"
              required
            />

            <Field
              label="Production Year"
              value={draft.productionYear}
              onChange={(value) =>
                updateField("productionYear", value)
              }
              placeholder="Example: 2026"
            />

            <SelectField
              label="Genre"
              value={draft.genre}
              onChange={(value) => updateField("genre", value)}
              required
            >
              <option value="">Select genre</option>
              <option>Documentary</option>
              <option>Drama</option>
              <option>Comedy</option>
              <option>Faith</option>
              <option>Education</option>
              <option>Music</option>
              <option>News</option>
              <option>Historical</option>
              <option>Other</option>
            </SelectField>

            <Field
              label="Runtime"
              value={draft.runtime}
              onChange={(value) => updateField("runtime", value)}
              placeholder="Example: 1h 42m"
            />

            <SelectField
              label="Audience Rating"
              value={draft.audienceRating}
              onChange={(value) =>
                updateField("audienceRating", value)
              }
            >
              <option value="">Select rating</option>
              <option>Not Rated</option>
              <option>G</option>
              <option>PG</option>
              <option>PG-13</option>
              <option>R</option>
              <option>TV-G</option>
              <option>TV-PG</option>
              <option>TV-14</option>
              <option>TV-MA</option>
            </SelectField>

            <Field
              label="Primary Language"
              value={draft.language}
              onChange={(value) => updateField("language", value)}
              placeholder="Example: English"
            />
          </div>

          <label style={styles.fieldLabel}>
            <span>
              Synopsis <b style={styles.required}>*</b>
            </span>

            <textarea
              value={draft.synopsis}
              onChange={(event) =>
                updateField("synopsis", event.target.value)
              }
              placeholder="Write a short synopsis of your film..."
              maxLength={1000}
              style={styles.textarea}
            />

            <small style={styles.counter}>
              {draft.synopsis.length}/1000
            </small>
          </label>

          <Field
            label="Territory Rights"
            value={draft.territoryRights}
            onChange={(value) =>
              updateField("territoryRights", value)
            }
            placeholder="Example: Worldwide, United States only"
          />
        </div>
      );
    }

    if (activeStep === 4) {
      return (
        <div style={styles.stepBody}>
          <div style={styles.sectionHeading}>
            <div style={styles.sectionIcon}>⚖</div>
            <div>
              <h2 style={styles.sectionTitle}>
                Rights & Ownership
              </h2>
              <p style={styles.sectionText}>
                Confirm the legal authority required for AGV to review
                and potentially distribute this film.
              </p>
            </div>
          </div>

          <div style={styles.checkList}>
            <CheckRow
              checked={draft.ownsFilmRights}
              onChange={(value) =>
                updateField("ownsFilmRights", value)
              }
              title="Film ownership or licensing authority"
              detail="I own the film or hold written authority to submit it."
            />

            <CheckRow
              checked={draft.musicClearance}
              onChange={(value) =>
                updateField("musicClearance", value)
              }
              title="Music clearance"
              detail="All music is owned, licensed, or otherwise cleared."
            />

            <CheckRow
              checked={draft.footageClearance}
              onChange={(value) =>
                updateField("footageClearance", value)
              }
              title="Footage and image clearance"
              detail="Third-party footage, artwork, photographs, and clips are cleared."
            />

            <CheckRow
              checked={draft.talentReleases}
              onChange={(value) =>
                updateField("talentReleases", value)
              }
              title="Talent and participant releases"
              detail="Required appearance and performance releases are available."
            />

            <CheckRow
              checked={draft.distributionAuthority}
              onChange={(value) =>
                updateField("distributionAuthority", value)
              }
              title="Distribution authority"
              detail="I am authorized to grant AGV permission to review and, after approval, distribute the film."
            />
          </div>

          <div style={styles.warningNotice}>
            These draft confirmations do not replace AGV’s formal
            rights-clearance review or signed partner agreement.
          </div>
        </div>
      );
    }

    if (activeStep === 5) {
      return (
        <div style={styles.stepBody}>
          <div style={styles.sectionHeading}>
            <div style={styles.sectionIcon}>⇧</div>
            <div>
              <h2 style={styles.sectionTitle}>Upload Files</h2>
              <p style={styles.sectionText}>
                Select local files for this draft. CP-01 records file
                names only and does not transmit them.
              </p>
            </div>
          </div>

          <div style={styles.fileGrid}>
            <FileBox
              title="Film Poster"
              detail="JPG or PNG recommended"
              fileName={draft.posterName}
              accept="image/png,image/jpeg"
              onChange={(file) =>
                updateField(
                  "posterName",
                  file?.name || ""
                )
              }
            />

            <FileBox
              title="Trailer"
              detail="MP4, MOV or WebM"
              fileName={draft.trailerName}
              accept="video/mp4,video/quicktime,video/webm"
              onChange={(file) =>
                updateField(
                  "trailerName",
                  file?.name || ""
                )
              }
            />

            <FileBox
              title="Feature Film"
              detail="Required for secure intake"
              fileName={draft.featureName}
              accept="video/mp4,video/quicktime,video/webm,.mkv,.avi"
              onChange={selectFeatureFile}
              metadataDetail={
                featureFile
                  ? formatFileSize(featureFile.size) +
                    " • " +
                    (featureFile.type ||
                      "Unknown media type")
                  : draft.featureName
                    ? "Reselect this file after refresh before reserving intake."
                    : ""
              }
            />

            <FileBox
              title="Captions"
              detail="Optional VTT or SRT"
              fileName={draft.captionsName}
              accept=".vtt,.srt,text/vtt"
              onChange={(file) =>
                updateField(
                  "captionsName",
                  file?.name || ""
                )
              }
            />
          </div>

          <div style={styles.notice}>
            Secure AGV upload and intake reservation will be connected
            in a later CLIENT/SERVER pass.
          </div>
        </div>
      );
    }

    if (activeStep === 6) {
      const releaseTypes = [
        {
          id: "FREE_SCREENING",
          title: "Free Screening",
          detail: "Public ad-supported or free access",
          icon: "▶",
        },
        {
          id: "LIVE_PREMIERE",
          title: "Live Premiere",
          detail: "Scheduled live event experience",
          icon: "◉",
        },
        {
          id: "RENTAL",
          title: "Rental",
          detail: "Viewers rent temporarily",
          icon: "◇",
        },
        {
          id: "PURCHASE",
          title: "Purchase",
          detail: "Viewers purchase access",
          icon: "▣",
        },
      ];

      return (
        <div style={styles.stepBody}>
          <div style={styles.sectionHeading}>
            <div style={styles.sectionIcon}>★</div>
            <div>
              <h2 style={styles.sectionTitle}>Release Setup</h2>
              <p style={styles.sectionText}>
                Choose the preferred release model. Final availability
                remains subject to AGV approval and technical support.
              </p>
            </div>
          </div>

          <div style={styles.releaseGrid}>
            {releaseTypes.map((release) => {
              const selected =
                draft.releaseType === release.id;

              return (
                <button
                  key={release.id}
                  type="button"
                  onClick={() =>
                    updateField("releaseType", release.id)
                  }
                  style={
                    selected
                      ? styles.releaseCardActive
                      : styles.releaseCard
                  }
                >
                  <span style={styles.releaseIcon}>
                    {release.icon}
                  </span>
                  <strong>{release.title}</strong>
                  <small>{release.detail}</small>
                </button>
              );
            })}
          </div>

          <Field
            label="Preferred Premiere Date"
            type="date"
            value={draft.preferredPremiereDate}
            onChange={(value) =>
              updateField("preferredPremiereDate", value)
            }
          />

          <label style={styles.fieldLabel}>
            <span>Reviewer Notes</span>

            <textarea
              value={draft.reviewerNotes}
              onChange={(event) =>
                updateField("reviewerNotes", event.target.value)
              }
              placeholder="Add information for the AGV review team..."
              maxLength={500}
              style={styles.textarea}
            />

            <small style={styles.counter}>
              {draft.reviewerNotes.length}/500
            </small>
          </label>
        </div>
      );
    }

    return (
      <div style={styles.stepBody}>
        <div style={styles.sectionHeading}>
          <div style={styles.sectionIcon}>✓</div>
          <div>
            <h2 style={styles.sectionTitle}>Review & Submit</h2>
            <p style={styles.sectionText}>
              Review the draft before the secure submission system is
              connected.
            </p>
          </div>
        </div>

        <div style={styles.reviewGrid}>
          <div style={styles.reviewCard}>
            <span>Channel</span>
            <strong>{draft.channelName || "Not entered"}</strong>
          </div>

          <div style={styles.reviewCard}>
            <span>Partner</span>
            <strong>{draft.contactName || "Not entered"}</strong>
          </div>

          <div style={styles.reviewCard}>
            <span>Film</span>
            <strong>{draft.filmTitle || "Not entered"}</strong>
          </div>

          <div style={styles.reviewCard}>
            <span>Genre</span>
            <strong>{draft.genre || "Not selected"}</strong>
          </div>

          <div style={styles.reviewCard}>
            <span>Feature File</span>
            <strong>{draft.featureName || "Not selected"}</strong>
          </div>

          <div style={styles.reviewCard}>
            <span>Release Type</span>
            <strong>
              {draft.releaseType.replaceAll("_", " ")}
            </strong>
          </div>
        </div>

        {registration?.submissionId ? (
          <div style={styles.registrationSuccess}>
            <strong>
              {registration.featureUploadCompleted
                ? "UPLOADED_AWAITING_FOUNDER_REVIEW"
                : registration.mediaIntakeId
                  ? "AWAITING_SECURE_UPLOAD"
                  : registration.status ||
                    "DRAFT_REGISTERED"}
            </strong>

            <span>
              AGV Submission ID: {registration.submissionId}
            </span>

            {registration.mediaIntakeId ? (
              <span>
                Media Intake ID: {registration.mediaIntakeId}
              </span>
            ) : null}

            {registration.featureUploadCompleted ? (
              <span>
                Storage: OWNER_PRIVATE — Founder review required
              </span>
            ) : null}
          </div>
        ) : null}

        {registrationMessage ? (
          <div
            role="status"
            aria-live="polite"
            style={
              registration?.submissionId
                ? styles.registrationMessageSuccess
                : styles.registrationMessage
            }
          >
            {registrationMessage}
          </div>
        ) : null}

        <button
          type="button"
          onClick={registerDraftWithAgv}
          disabled={
            isRegistering ||
            Boolean(registration?.submissionId)
          }
          style={
            isRegistering ||
            registration?.submissionId
              ? styles.submitDisabled
              : styles.submitButton
          }
          title={
            registration?.submissionId
              ? "This draft has already been registered."
              : "Register draft metadata with AGV."
          }
        >
          {registration?.submissionId
            ? "Draft Registered with AGV"
            : isRegistering
              ? "Registering Draft..."
              : "Register Draft with AGV"}
        </button>

        <div style={styles.secureLine}>
          🔒 Only submission metadata is registered. Selected media files
          remain on this device until secure upload is enabled in a later
          pass.
        </div>

        {registration?.submissionId ? (
          <button
            type="button"
            onClick={reserveSecureMediaIntake}
            disabled={
              isReservingIntake ||
              Boolean(registration.mediaIntakeId)
            }
            style={
              isReservingIntake ||
              registration.mediaIntakeId
                ? styles.intakeButtonDisabled
                : styles.intakeButton
            }
            title={
              registration.mediaIntakeId
                ? "A controlled media intake is already reserved."
                : "Reserve intake metadata without uploading the movie."
            }
          >
            {registration.mediaIntakeId
              ? "Secure Media Intake Reserved"
              : isReservingIntake
                ? "Reserving Secure Intake..."
                : "Reserve Secure Media Intake"}
          </button>
        ) : null}

        {intakeMessage ? (
          <div
            role="status"
            aria-live="polite"
            style={
              registration?.mediaIntakeId
                ? styles.intakeMessageSuccess
                : styles.intakeMessage
            }
          >
            {intakeMessage}
          </div>
        ) : null}

        {registration?.mediaIntakeId ? (
          <div style={styles.uploadPanel}>
            <button
              type="button"
              onClick={uploadFeatureFilmSecurely}
              disabled={
                isUploadingFeature ||
                Boolean(
                  registration.featureUploadCompleted
                )
              }
              style={
                isUploadingFeature ||
                registration.featureUploadCompleted
                  ? styles.uploadButtonDisabled
                  : styles.uploadButton
              }
              title={
                registration.featureUploadCompleted
                  ? "The feature film has already been uploaded."
                  : "Upload the reserved feature film into Owner-private AGV storage."
              }
            >
              {registration.featureUploadCompleted
                ? "Feature Film Uploaded — Awaiting Founder Review"
                : isUploadingFeature
                  ? "Uploading Feature Film..."
                  : "Upload Feature Film Securely"}
            </button>

            {isUploadingFeature ||
            uploadProgress > 0 ? (
              <div style={styles.uploadProgressArea}>
                <div style={styles.uploadProgressTrack}>
                  <div
                    style={{
                      ...styles.uploadProgressFill,
                      width: uploadProgress + "%",
                    }}
                  />
                </div>

                <strong style={styles.uploadProgressText}>
                  {uploadProgress}% uploaded
                </strong>
              </div>
            ) : null}

            <div style={styles.uploadPrivacyNotice}>
              The movie is stored outside AGV public web
              folders. Uploading does not approve or publish
              the film.
            </div>
          </div>
        ) : null}

        {uploadMessage ? (
          <div
            role="status"
            aria-live="polite"
            style={
              registration?.featureUploadCompleted
                ? styles.uploadMessageSuccess
                : styles.uploadMessage
            }
          >
            {uploadMessage}
          </div>
        ) : null}

        {registration?.submissionId ? (
          <div style={styles.recoveryActions}>
            <button
              type="button"
              onClick={() => verifySavedDraft()}
              disabled={isRecovering}
              style={
                isRecovering
                  ? styles.recoveryButtonDisabled
                  : styles.recoveryButton
              }
            >
              {isRecovering
                ? "Verifying Saved Draft..."
                : "Verify Saved Draft"}
            </button>

            <button
              type="button"
              onClick={startNewPartnerDraft}
              disabled={isRecovering}
              style={styles.resetDraftButton}
            >
              Start New Draft
            </button>
          </div>
        ) : null}

        {recoveryMessage ? (
          <div
            role="status"
            aria-live="polite"
            style={
              recoveryMessage.includes("verified") ||
              recoveryMessage.includes("recovered") ||
              recoveryMessage.includes("new local draft")
                ? styles.recoveryMessageSuccess
                : styles.recoveryMessage
            }
          >
            {recoveryMessage}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div style={styles.shell}>
      <header style={styles.header}>
        <button
          type="button"
          style={styles.brandButton}
          onClick={() => {
            window.location.href = "/";
          }}
        >
          <span style={styles.logo}>AGV</span>
          <span>
            <strong style={styles.brandName}>
              AGV Content Partner Portal
            </strong>
            <small style={styles.brandSubtitle}>
              Independent Film Onboarding & Submission
            </small>
          </span>
        </button>

        <button
          type="button"
          style={styles.networkButton}
          onClick={() => {
            window.location.href = "/?agvNetwork=1";
          }}
        >
          View AGV Network
        </button>
      </header>

      <div style={styles.pageWidth}>
        <section style={styles.stepper}>
          {STEPS.map((step, index) => {
            const active = activeStep === step.id;
            const complete = isStepComplete(step.id);

            return (
              <React.Fragment key={step.id}>
                <button
                  type="button"
                  onClick={() => openStep(step.id)}
                  aria-disabled={!canOpenStep(step.id)}
                  title={
                    canOpenStep(step.id)
                      ? step.label
                      : "Complete the earlier steps first"
                  }
                  style={{
                    ...styles.stepButton,
                    opacity: canOpenStep(step.id) ? 1 : 0.52,
                    cursor: canOpenStep(step.id)
                      ? "pointer"
                      : "not-allowed",
                  }}
                >
                  <span
                    style={{
                      ...styles.stepCircle,
                      ...(active
                        ? styles.stepCircleActive
                        : complete
                          ? styles.stepCircleComplete
                          : {}),
                    }}
                  >
                    {complete ? "✓" : step.id}
                  </span>

                  <span
                    style={{
                      ...styles.stepLabel,
                      color: active
                        ? "#facc15"
                        : complete
                          ? "#bbf7d0"
                          : "#cbd5e1",
                    }}
                  >
                    {step.label}
                  </span>
                </button>

                {index < STEPS.length - 1 ? (
                  <span
                    style={{
                      ...styles.stepLine,
                      background:
                        isStepComplete(step.id)
                          ? "#22c55e"
                          : "rgba(148,163,184,0.28)",
                    }}
                  />
                ) : null}
              </React.Fragment>
            );
          })}
        </section>

        <div
          style={{
            ...styles.contentLayout,
            gridTemplateColumns:
              isMobile || isTablet
                ? "minmax(0, 1fr)"
                : styles.contentLayout.gridTemplateColumns,
          }}
        >
          <main style={styles.workspace}>
            {renderStep()}

            {validationMessage ? (
              <div
                role="alert"
                aria-live="polite"
                style={styles.validationBox}
              >
                <strong style={styles.validationTitle}>
                  Complete this step
                </strong>
                <span>{validationMessage}</span>
              </div>
            ) : null}

            <div style={styles.navigationRow}>
              <button
                type="button"
                onClick={previousStep}
                disabled={activeStep === 1}
                style={
                  activeStep === 1
                    ? styles.secondaryDisabled
                    : styles.secondaryButton
                }
              >
                Previous
              </button>

              <div style={styles.draftMessage}>
                {draftMessage}
              </div>

              <button
                type="button"
                onClick={nextStep}
                disabled={activeStep === 7}
                style={
                  activeStep === 7
                    ? styles.primaryDisabled
                    : styles.primaryButton
                }
              >
                Continue
              </button>
            </div>
          </main>

          <aside style={styles.sidebar}>
            <section style={styles.sidebarCard}>
              <h3 style={styles.sidebarTitle}>
                Submission Status
              </h3>

              <div style={styles.statusList}>
                {submissionStatuses.map(([label, status]) => (
                  <div key={label} style={styles.statusRow}>
                    <span style={styles.statusIcon}>◇</span>
                    <strong>{label}</strong>
                    <small
                      style={{
                        ...styles.statusText,
                        color:
                          status === "Pending Review"
                            ? "#facc15"
                            : status === "Ready for Review"
                              ? "#86efac"
                              : "#94a3b8",
                      }}
                    >
                      {status}
                    </small>
                  </div>
                ))}
              </div>
            </section>

            <section style={styles.sidebarCard}>
              <h3 style={styles.sidebarTitle}>
                What Filmmakers Get
              </h3>

              {[
                "Free AGV channel",
                "Live premiere tools",
                "On-demand release",
                "Audience analytics",
                "Revenue options",
                "Human onboarding support",
              ].map((benefit) => (
                <div key={benefit} style={styles.benefitRow}>
                  <span style={styles.benefitCheck}>✓</span>
                  {benefit}
                </div>
              ))}

              <div style={styles.directorChair}>
                <div style={styles.chairBack}>AGV</div>
                <div style={styles.chairSeat} />
                <div style={styles.chairLegs}>╱ ╲</div>
              </div>
            </section>

            <section style={styles.sidebarCard}>
              <h3 style={styles.sidebarTitle}>
                Draft Readiness
              </h3>

              <div style={styles.progressTrack}>
                <div
                  style={{
                    ...styles.progressFill,
                    width: `${Math.round(
                      (completion / 6) * 100
                    )}%`,
                  }}
                />
              </div>

              <div style={styles.readinessText}>
                {completion} of 6 preparation areas complete
              </div>
            </section>
          </aside>
        </div>

        <section style={styles.journey}>
          <h3 style={styles.journeyTitle}>
            Submission Journey
          </h3>

          <div style={styles.journeyRow}>
            {[
              "Draft",
              "Submitted",
              "Rights Review",
              "Technical Review",
              "Editorial Review",
              "Approved",
              "Scheduled",
              "Published",
            ].map((item, index, array) => (
              <React.Fragment key={item}>
                <div style={styles.journeyItem}>
                  <span style={styles.journeyIcon}>
                    {index === 0 ? "▤" : "◇"}
                  </span>
                  <small>{item}</small>
                </div>

                {index < array.length - 1 ? (
                  <span style={styles.journeyArrow}>→</span>
                ) : null}
              </React.Fragment>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

const styles = {
  shell: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top center, #10203a 0%, #07101f 38%, #030712 100%)",
    color: "#f8fafc",
    fontFamily: "Inter, Segoe UI, Arial, sans-serif",
  },
  header: {
    minHeight: 82,
    padding: "14px clamp(16px, 4vw, 46px)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
    borderBottom: "1px solid rgba(212,175,55,0.22)",
    background: "rgba(3,7,18,0.92)",
  },
  brandButton: {
    padding: 0,
    border: 0,
    display: "flex",
    alignItems: "center",
    gap: 14,
    background: "transparent",
    color: "#f8fafc",
    textAlign: "left",
    cursor: "pointer",
  },
  logo: {
    width: 58,
    height: 58,
    borderRadius: 18,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #f5ca68, #9b6515)",
    color: "#111827",
    fontWeight: 950,
    fontSize: 20,
  },
  brandName: {
    display: "block",
    fontSize: "clamp(20px, 3vw, 29px)",
  },
  brandSubtitle: {
    display: "block",
    marginTop: 3,
    color: "#f4c35a",
    fontSize: 13,
  },
  networkButton: {
    padding: "10px 14px",
    borderRadius: 13,
    border: "1px solid rgba(212,175,55,0.35)",
    background: "rgba(212,175,55,0.1)",
    color: "#fde68a",
    fontWeight: 900,
    cursor: "pointer",
  },
  pageWidth: {
    width: "min(1540px, calc(100% - 28px))",
    margin: "0 auto",
    padding: "22px 0 40px",
  },
  stepper: {
    display: "flex",
    alignItems: "flex-start",
    overflowX: "auto",
    padding: "8px 4px 22px",
  },
  stepButton: {
    flex: "0 0 112px",
    padding: 0,
    border: 0,
    display: "grid",
    justifyItems: "center",
    gap: 7,
    background: "transparent",
    cursor: "pointer",
  },
  stepCircle: {
    width: 34,
    height: 34,
    borderRadius: 999,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#1e293b",
    border: "1px solid rgba(148,163,184,0.22)",
    color: "#e2e8f0",
    fontWeight: 950,
  },
  stepCircleActive: {
    background: "linear-gradient(135deg, #facc15, #b7791f)",
    border: "1px solid #facc15",
    color: "#111827",
    boxShadow: "0 0 22px rgba(250,204,21,0.35)",
  },
  stepCircleComplete: {
    background: "rgba(34,197,94,0.18)",
    border: "1px solid rgba(34,197,94,0.45)",
    color: "#bbf7d0",
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: 850,
    whiteSpace: "nowrap",
  },
  stepLine: {
    flex: "1 0 34px",
    height: 2,
    marginTop: 16,
  },
  contentLayout: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 340px",
    gap: 18,
    alignItems: "start",
  },
  workspace: {
    minWidth: 0,
    padding: "clamp(18px, 3vw, 30px)",
    borderRadius: 22,
    border: "1px solid rgba(148,163,184,0.26)",
    background:
      "linear-gradient(145deg, rgba(8,22,42,0.97), rgba(5,13,27,0.98))",
    boxShadow: "0 24px 70px rgba(0,0,0,0.3)",
  },
  stepBody: {
    display: "grid",
    gap: 20,
  },
  sectionHeading: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    paddingBottom: 16,
    borderBottom: "1px solid rgba(148,163,184,0.17)",
  },
  sectionIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(212,175,55,0.13)",
    border: "1px solid rgba(212,175,55,0.34)",
    color: "#facc15",
    fontSize: 22,
    fontWeight: 950,
  },
  sectionTitle: {
    margin: 0,
    fontSize: 24,
  },
  sectionText: {
    margin: "5px 0 0",
    color: "#94a3b8",
    lineHeight: 1.5,
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
    gap: 16,
  },
  fieldLabel: {
    display: "grid",
    gap: 7,
    color: "#e2e8f0",
    fontSize: 13,
    fontWeight: 850,
  },
  required: {
    color: "#facc15",
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 13px",
    borderRadius: 10,
    border: "1px solid rgba(148,163,184,0.28)",
    background: "rgba(15,23,42,0.76)",
    color: "#f8fafc",
    outline: "none",
  },
  textarea: {
    width: "100%",
    minHeight: 120,
    resize: "vertical",
    boxSizing: "border-box",
    padding: 13,
    borderRadius: 10,
    border: "1px solid rgba(148,163,184,0.28)",
    background: "rgba(15,23,42,0.76)",
    color: "#f8fafc",
    outline: "none",
  },
  counter: {
    justifySelf: "end",
    color: "#94a3b8",
  },
  checkList: {
    display: "grid",
    gap: 12,
  },
  checkRow: {
    padding: 14,
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: 14,
    border: "1px solid rgba(148,163,184,0.19)",
    background: "rgba(15,23,42,0.5)",
    cursor: "pointer",
  },
  checkbox: {
    width: 19,
    height: 19,
    accentColor: "#d4af37",
  },
  checkTitle: {
    display: "block",
    color: "#f8fafc",
  },
  checkDetail: {
    display: "block",
    marginTop: 5,
    color: "#94a3b8",
    lineHeight: 1.45,
    fontSize: 12,
  },
  notice: {
    padding: 13,
    borderRadius: 12,
    border: "1px solid rgba(59,130,246,0.3)",
    background: "rgba(30,64,175,0.12)",
    color: "#bfdbfe",
    fontSize: 12,
  },
  warningNotice: {
    padding: 13,
    borderRadius: 12,
    border: "1px solid rgba(250,204,21,0.3)",
    background: "rgba(113,63,18,0.16)",
    color: "#fde68a",
    fontSize: 12,
  },
  fileGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: 14,
  },
  fileBox: {
    minHeight: 170,
    padding: 16,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    textAlign: "center",
    borderRadius: 14,
    border: "1px dashed rgba(148,163,184,0.42)",
    background: "rgba(15,23,42,0.48)",
    cursor: "pointer",
  },
  fileIcon: {
    width: 44,
    height: 44,
    borderRadius: 999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid rgba(212,175,55,0.4)",
    color: "#facc15",
    fontSize: 23,
  },
  fileDetail: {
    maxWidth: 190,
    color: "#94a3b8",
    fontSize: 11,
    wordBreak: "break-word",
  },
  browseButton: {
    marginTop: 5,
    padding: "7px 10px",
    borderRadius: 9,
    background: "rgba(212,175,55,0.13)",
    color: "#fde68a",
    fontSize: 11,
    fontWeight: 900,
  },
  releaseGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
    gap: 14,
  },
  releaseCard: {
    minHeight: 145,
    padding: 16,
    display: "grid",
    justifyItems: "center",
    alignContent: "center",
    gap: 8,
    borderRadius: 14,
    border: "1px solid rgba(148,163,184,0.22)",
    background: "rgba(15,23,42,0.54)",
    color: "#f8fafc",
    cursor: "pointer",
  },
  releaseCardActive: {
    minHeight: 145,
    padding: 16,
    display: "grid",
    justifyItems: "center",
    alignContent: "center",
    gap: 8,
    borderRadius: 14,
    border: "1px solid rgba(250,204,21,0.75)",
    background: "rgba(212,175,55,0.13)",
    color: "#f8fafc",
    cursor: "pointer",
    boxShadow: "0 0 24px rgba(250,204,21,0.1)",
  },
  releaseIcon: {
    color: "#facc15",
    fontSize: 26,
  },
  reviewGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: 12,
  },
  reviewCard: {
    padding: 14,
    display: "grid",
    gap: 5,
    borderRadius: 12,
    border: "1px solid rgba(148,163,184,0.18)",
    background: "rgba(15,23,42,0.54)",
  },
  submitButton: {
    width: "100%",
    padding: "15px 18px",
    border: "1px solid rgba(250,204,21,0.72)",
    borderRadius: 11,
    background: "linear-gradient(135deg, #eab308, #a16207)",
    color: "#07111f",
    fontSize: 16,
    fontWeight: 950,
    cursor: "pointer",
    boxShadow: "0 12px 28px rgba(234,179,8,0.18)",
  },
  registrationSuccess: {
    padding: "14px 16px",
    display: "grid",
    gap: 5,
    borderRadius: 11,
    border: "1px solid rgba(34,197,94,0.48)",
    background: "rgba(20,83,45,0.26)",
    color: "#bbf7d0",
    fontSize: 12,
    overflowWrap: "anywhere",
  },
  registrationMessage: {
    padding: "11px 13px",
    borderRadius: 10,
    border: "1px solid rgba(248,113,113,0.4)",
    background: "rgba(127,29,29,0.18)",
    color: "#fecaca",
    fontSize: 12,
    lineHeight: 1.45,
  },
  registrationMessageSuccess: {
    padding: "11px 13px",
    borderRadius: 10,
    border: "1px solid rgba(34,197,94,0.35)",
    background: "rgba(20,83,45,0.2)",
    color: "#bbf7d0",
    fontSize: 12,
    lineHeight: 1.45,
  },
  fileMetadataDetail: {
    color: "#93c5fd",
    fontSize: 10,
    lineHeight: 1.35,
    overflowWrap: "anywhere",
  },
  intakeButton: {
    width: "100%",
    padding: "14px 16px",
    borderRadius: 11,
    border: "1px solid rgba(96,165,250,0.62)",
    background:
      "linear-gradient(135deg, rgba(37,99,235,0.92), rgba(30,64,175,0.92))",
    color: "#eff6ff",
    fontSize: 14,
    fontWeight: 950,
    cursor: "pointer",
    boxShadow: "0 12px 28px rgba(37,99,235,0.18)",
  },
  intakeButtonDisabled: {
    width: "100%",
    padding: "14px 16px",
    borderRadius: 11,
    border: "1px solid rgba(148,163,184,0.24)",
    background: "rgba(30,41,59,0.58)",
    color: "#64748b",
    fontSize: 14,
    fontWeight: 950,
    cursor: "not-allowed",
  },
  intakeMessage: {
    padding: "11px 13px",
    borderRadius: 10,
    border: "1px solid rgba(248,113,113,0.38)",
    background: "rgba(127,29,29,0.16)",
    color: "#fecaca",
    fontSize: 12,
    lineHeight: 1.45,
  },
  intakeMessageSuccess: {
    padding: "11px 13px",
    borderRadius: 10,
    border: "1px solid rgba(34,197,94,0.38)",
    background: "rgba(20,83,45,0.21)",
    color: "#bbf7d0",
    fontSize: 12,
    lineHeight: 1.45,
  },
  uploadPanel: {
    display: "grid",
    gap: 11,
    padding: 14,
    borderRadius: 12,
    border: "1px solid rgba(34,197,94,0.28)",
    background: "rgba(20,83,45,0.1)",
  },
  uploadButton: {
    width: "100%",
    padding: "15px 18px",
    borderRadius: 11,
    border: "1px solid rgba(34,197,94,0.64)",
    background:
      "linear-gradient(135deg, rgba(22,163,74,0.96), rgba(21,128,61,0.96))",
    color: "#f0fdf4",
    fontSize: 14,
    fontWeight: 950,
    cursor: "pointer",
    boxShadow: "0 12px 28px rgba(22,163,74,0.18)",
  },
  uploadButtonDisabled: {
    width: "100%",
    padding: "15px 18px",
    borderRadius: 11,
    border: "1px solid rgba(148,163,184,0.24)",
    background: "rgba(30,41,59,0.58)",
    color: "#94a3b8",
    fontSize: 14,
    fontWeight: 950,
    cursor: "not-allowed",
  },
  uploadProgressArea: {
    display: "grid",
    gap: 7,
  },
  uploadProgressTrack: {
    height: 12,
    overflow: "hidden",
    borderRadius: 999,
    border: "1px solid rgba(148,163,184,0.24)",
    background: "rgba(15,23,42,0.8)",
  },
  uploadProgressFill: {
    height: "100%",
    borderRadius: 999,
    background:
      "linear-gradient(90deg, #22c55e, #86efac)",
    transition: "width 180ms ease",
  },
  uploadProgressText: {
    justifySelf: "end",
    color: "#bbf7d0",
    fontSize: 11,
  },
  uploadPrivacyNotice: {
    color: "#a7f3d0",
    fontSize: 11,
    lineHeight: 1.45,
  },
  uploadMessage: {
    padding: "11px 13px",
    borderRadius: 10,
    border: "1px solid rgba(248,113,113,0.38)",
    background: "rgba(127,29,29,0.16)",
    color: "#fecaca",
    fontSize: 12,
    lineHeight: 1.45,
  },
  uploadMessageSuccess: {
    padding: "11px 13px",
    borderRadius: 10,
    border: "1px solid rgba(34,197,94,0.42)",
    background: "rgba(20,83,45,0.24)",
    color: "#bbf7d0",
    fontSize: 12,
    lineHeight: 1.45,
  },
  recoveryActions: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(190px, 1fr))",
    gap: 10,
  },
  recoveryButton: {
    padding: "12px 14px",
    borderRadius: 10,
    border: "1px solid rgba(96,165,250,0.48)",
    background: "rgba(30,64,175,0.2)",
    color: "#bfdbfe",
    fontSize: 12,
    fontWeight: 900,
    cursor: "pointer",
  },
  recoveryButtonDisabled: {
    padding: "12px 14px",
    borderRadius: 10,
    border: "1px solid rgba(148,163,184,0.22)",
    background: "rgba(30,41,59,0.5)",
    color: "#64748b",
    fontSize: 12,
    fontWeight: 900,
    cursor: "not-allowed",
  },
  resetDraftButton: {
    padding: "12px 14px",
    borderRadius: 10,
    border: "1px solid rgba(248,113,113,0.42)",
    background: "rgba(127,29,29,0.16)",
    color: "#fecaca",
    fontSize: 12,
    fontWeight: 900,
    cursor: "pointer",
  },
  recoveryMessage: {
    padding: "11px 13px",
    borderRadius: 10,
    border: "1px solid rgba(248,113,113,0.38)",
    background: "rgba(127,29,29,0.16)",
    color: "#fecaca",
    fontSize: 12,
    lineHeight: 1.45,
  },
  recoveryMessageSuccess: {
    padding: "11px 13px",
    borderRadius: 10,
    border: "1px solid rgba(34,197,94,0.36)",
    background: "rgba(20,83,45,0.2)",
    color: "#bbf7d0",
    fontSize: 12,
    lineHeight: 1.45,
  },
  submitDisabled: {
    width: "100%",
    padding: "15px 18px",
    border: 0,
    borderRadius: 11,
    background: "linear-gradient(135deg, #a77b2d, #705018)",
    color: "rgba(255,255,255,0.65)",
    fontSize: 16,
    fontWeight: 950,
    cursor: "not-allowed",
  },
  secureLine: {
    textAlign: "center",
    color: "#94a3b8",
    fontSize: 11,
  },
  navigationRow: {
    marginTop: 24,
    paddingTop: 18,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    borderTop: "1px solid rgba(148,163,184,0.17)",
  },
  primaryButton: {
    padding: "12px 18px",
    border: 0,
    borderRadius: 11,
    background: "linear-gradient(135deg, #e6b94d, #9f6b1a)",
    color: "#111827",
    fontWeight: 950,
    cursor: "pointer",
  },
  primaryDisabled: {
    padding: "12px 18px",
    border: 0,
    borderRadius: 11,
    background: "rgba(148,163,184,0.15)",
    color: "#64748b",
    fontWeight: 950,
    cursor: "not-allowed",
  },
  secondaryButton: {
    padding: "12px 18px",
    borderRadius: 11,
    border: "1px solid rgba(148,163,184,0.25)",
    background: "rgba(15,23,42,0.66)",
    color: "#f8fafc",
    fontWeight: 900,
    cursor: "pointer",
  },
  secondaryDisabled: {
    padding: "12px 18px",
    borderRadius: 11,
    border: "1px solid rgba(148,163,184,0.12)",
    background: "rgba(15,23,42,0.32)",
    color: "#475569",
    fontWeight: 900,
    cursor: "not-allowed",
  },
  validationBox: {
    marginTop: 18,
    padding: "13px 14px",
    display: "grid",
    gap: 4,
    borderRadius: 12,
    border: "1px solid rgba(248,113,113,0.42)",
    background: "rgba(127,29,29,0.19)",
    color: "#fecaca",
    fontSize: 12,
    lineHeight: 1.45,
  },
  validationTitle: {
    color: "#fee2e2",
    fontSize: 13,
  },
  draftMessage: {
    color: "#86efac",
    fontSize: 11,
  },
  sidebar: {
    display: "grid",
    gap: 16,
  },
  sidebarCard: {
    padding: 16,
    borderRadius: 16,
    border: "1px solid rgba(148,163,184,0.23)",
    background: "rgba(5,15,30,0.92)",
  },
  sidebarTitle: {
    margin: "0 0 14px",
    color: "#facc15",
    fontSize: 16,
  },
  statusList: {
    display: "grid",
    gap: 8,
  },
  statusRow: {
    padding: "11px 10px",
    display: "grid",
    gridTemplateColumns: "28px minmax(0, 1fr) auto",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    border: "1px solid rgba(148,163,184,0.18)",
    background: "rgba(30,41,59,0.58)",
    fontSize: 12,
  },
  statusIcon: {
    color: "#facc15",
    fontSize: 18,
  },
  statusText: {
    fontSize: 10,
  },
  benefitRow: {
    marginTop: 9,
    display: "flex",
    alignItems: "center",
    gap: 9,
    color: "#e2e8f0",
    fontSize: 12,
  },
  benefitCheck: {
    width: 18,
    height: 18,
    borderRadius: 999,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid #d4af37",
    color: "#facc15",
    fontSize: 10,
  },
  directorChair: {
    marginTop: 24,
    display: "grid",
    justifyItems: "center",
    color: "#d4af37",
  },
  chairBack: {
    width: 110,
    padding: "14px 0",
    textAlign: "center",
    border: "4px solid #9f6b1a",
    background: "#111827",
    fontWeight: 950,
  },
  chairSeat: {
    width: 128,
    height: 16,
    marginTop: 8,
    background: "#9f6b1a",
  },
  chairLegs: {
    fontSize: 55,
    lineHeight: 0.8,
  },
  progressTrack: {
    height: 9,
    overflow: "hidden",
    borderRadius: 999,
    background: "rgba(148,163,184,0.16)",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    background: "linear-gradient(90deg, #d4af37, #facc15)",
    transition: "width 220ms ease",
  },
  readinessText: {
    marginTop: 9,
    color: "#94a3b8",
    fontSize: 11,
  },
  journey: {
    marginTop: 18,
    padding: "18px 22px",
    borderRadius: 16,
    border: "1px solid rgba(148,163,184,0.22)",
    background: "rgba(5,15,30,0.9)",
  },
  journeyTitle: {
    margin: "0 0 16px",
    color: "#facc15",
  },
  journeyRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    overflowX: "auto",
  },
  journeyItem: {
    minWidth: 82,
    display: "grid",
    justifyItems: "center",
    gap: 6,
    color: "#e2e8f0",
    textAlign: "center",
  },
  journeyIcon: {
    fontSize: 24,
  },
  journeyArrow: {
    color: "#f4b942",
    fontSize: 24,
  },
};
