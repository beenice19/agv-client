import React, { useEffect, useRef, useState } from "react";
import AgvOperationsWorker from "./components/AgvOperationsWorker.jsx";
import AgvSupportWorker from "./components/AgvSupportWorker.jsx";
import AgvTrustSafetyComplianceWorker from "./components/AgvTrustSafetyComplianceWorker.jsx";
import AgvFinanceOperationsWorker from "./components/AgvFinanceOperationsWorker.jsx";
import CommercialOperationsCenter from "./components/superadmin/CommercialOperationsCenter.jsx";
import SponsorReviewQueue from "./components/sponsor/SponsorReviewQueue.jsx";

const ROOM_STORAGE_KEY = "agv_super_admin_rooms";
const NETWORK_STATION_STORAGE_KEY = "agv_network_stations";
const SUPER_ADMIN_PIN = "AGV-HOST-2026";

const SUBSCRIPTION_API_BASE =
  import.meta.env.VITE_AGV_SUBSCRIPTION_API_URL || "http://127.0.0.1:8792";

const BILLING_API_BASE =
  import.meta.env.VITE_AGV_BILLING_API_URL || "http://127.0.0.1:8793";

// PASS CU-08B â€” CONTROLLED INTAKE SERVER BASE
const AGV_SERVER_API_BASE =
  import.meta.env.VITE_AGV_SERVER_API_URL || "http://127.0.0.1:8787";

const DEFAULT_ROOMS = [
  {
    id: "main-hall",
    name: "Main Hall",
    category: "Convention",
    visibility: "Public",
    host: "Founder",
    status: "Live Ready",
    isPrivate: false,
    isLocked: false,
  },
];

const DEFAULT_NETWORK_STATIONS = [
  {
    id: "earth-from-space",
    title: "Earth From Space",
    source: "NASA",
    categoryId: "space-observatories",
    category: "Space & Observatories",
    badge: "LIVE",
    schedule: "24/7 when the source is available",
    videoId: "awQzjn72bI0",
    thumbnail: "https://i.ytimg.com/vi/awQzjn72bI0/hqdefault.jpg",
    description:
      "Live high-definition views of Earth from an external camera on the International Space Station.",
    attribution: "Source: NASA",
    fallbackVideoId: "",
    enabled: true,
    rightsStatus: "PENDING_REVIEW",
    healthStatus: "UNKNOWN",
  },
  {
    id: "monterey-bay-live",
    title: "Monterey Bay Live",
    source: "Monterey Bay Aquarium",
    categoryId: "zoos-aquariums",
    category: "Zoos & Aquariums",
    badge: "LIVE CAM",
    schedule: "Daily, 7 a.m. to 7 p.m. Pacific",
    videoId: "fVa6-zCBR7A",
    thumbnail: "https://i.ytimg.com/vi/fVa6-zCBR7A/hqdefault.jpg",
    description:
      "A live view across Monterey Bay from the Aquarium's ocean-view decks.",
    attribution: "Source: Monterey Bay Aquarium",
    fallbackVideoId: "",
    enabled: true,
    rightsStatus: "PENDING_REVIEW",
    healthStatus: "UNKNOWN",
  },
  {
    id: "moon-jelly-cam",
    title: "Moon Jelly Cam",
    source: "Monterey Bay Aquarium",
    categoryId: "zoos-aquariums",
    category: "Zoos & Aquariums",
    badge: "LIVE CAM",
    schedule: "Daily, 7 a.m. to 7 p.m. Pacific",
    videoId: "IEGYa3FlY1s",
    thumbnail: "https://i.ytimg.com/vi/IEGYa3FlY1s/hqdefault.jpg",
    description:
      "A live view of Pacific moon jellies moving with the current inside the Aquarium's gallery.",
    attribution: "Source: Monterey Bay Aquarium",
    fallbackVideoId: "",
    enabled: true,
    rightsStatus: "PENDING_REVIEW",
    healthStatus: "UNKNOWN",
  },
];
const FALLBACK_PLAN_LIMITS = {
  FREE: {
    label: "Free",
    maxRooms: 1,
    maxViewers: 25,
    allowPrivate: false,
    allowTicketOnly: false,
    note: "Starter testing tier",
  },
  CREATOR: {
    label: "Creator",
    maxRooms: 3,
    maxViewers: 100,
    allowPrivate: true,
    allowTicketOnly: true,
    note: "For creators, teachers, podcasters",
  },
  MINISTRY: {
    label: "Ministry / Pro",
    maxRooms: 10,
    maxViewers: 500,
    allowPrivate: true,
    allowTicketOnly: true,
    note: "For churches, schools, conferences",
  },
  CONVENTION: {
    label: "Convention",
    maxRooms: 50,
    maxViewers: 2000,
    allowPrivate: true,
    allowTicketOnly: true,
    note: "For major events and digital venues",
  },
};

function getPrivacyFlags(visibility) {
  if (visibility === "Private") {
    return { isPrivate: true, isLocked: true };
  }

  if (visibility === "Ticket Only") {
    return { isPrivate: false, isLocked: true };
  }

  return { isPrivate: false, isLocked: false };
}

function getStoredAccount() {
  try {
    const account = JSON.parse(localStorage.getItem("agv_account") || "null");

    if (account?.email) {
      return {
        name: account.name || "",
        email: String(account.email || "").trim().toLowerCase(),
        organization: account.organization || "",
        plan: String(account.plan || "FREE").trim().toUpperCase(),
      };
    }
  } catch {}

  try {
    const freeAccount = JSON.parse(localStorage.getItem("agv_free_account") || "null");

    if (freeAccount?.email) {
      return {
        name: freeAccount.name || "",
        email: String(freeAccount.email || "").trim().toLowerCase(),
        organization: freeAccount.organization || "",
        plan: String(freeAccount.plan || "FREE").trim().toUpperCase(),
      };
    }
  } catch {}

  return {
    name: "",
    email: "",
    organization: "",
    plan: "FREE",
  };
}

// PASS_AGV_NETWORK_CONTROL_2_SUPER_ADMIN_SYNC
function getAgvServerAuthToken() {
  try {
    return (
      localStorage.getItem("agv_auth_token") ||
      localStorage.getItem("agv_server_token") ||
      localStorage.getItem("agvToken") ||
      localStorage.getItem("token") ||
      ""
    );
  } catch {
    return "";
  }
}

function getNetworkAdminHeaders(includeJson = false) {
  const token = getAgvServerAuthToken();
  const headers = includeJson
    ? { "Content-Type": "application/json" }
    : {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

function normalizePlan(plan) {
  const value = String(plan || "FREE").trim().toUpperCase();

  if (value === "INTERNAL_TEST") return "CREATOR";

  if (FALLBACK_PLAN_LIMITS[value]) return value;

  return "FREE";
}

export default function SuperAdminPanel({ onBack, onEnterHost }) {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [pinMessage, setPinMessage] = useState("");

  const [rooms, setRooms] = useState(() => {
    try {
      const saved = localStorage.getItem(ROOM_STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_ROOMS;
    } catch {
      return DEFAULT_ROOMS;
    }
  });

  const [networkStations, setNetworkStations] = useState(() => {
    try {
      const saved = localStorage.getItem(NETWORK_STATION_STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : DEFAULT_NETWORK_STATIONS;

      return Array.isArray(parsed) ? parsed : DEFAULT_NETWORK_STATIONS;
    } catch {
      return DEFAULT_NETWORK_STATIONS;
    }
  });

  const [networkForm, setNetworkForm] = useState({
    id: "",
    title: "",
    source: "",
    categoryId: "space-observatories",
    category: "Space & Observatories",
    badge: "LIVE",
    schedule: "24/7",
    scheduleMode: "ALWAYS_ON",
    scheduleStart: "",
    scheduleEnd: "",
    scheduleTimezone: "America/Chicago",
    scheduleDays: [],
    scheduleNotes: "",
    videoId: "",
    thumbnail: "",
    description: "",
    attribution: "",
    fallbackVideoId: "",
    rightsStatus: "PENDING_REVIEW",
    healthStatus: "UNKNOWN",
    lastHealthCheck: "",
    lastSuccessfulPlayback: "",
    consecutiveFailures: 0,
    healthNotes: "",
    views: 0,
    watchMinutes: 0,
    completedViews: 0,
    clicks: 0,
    averageWatchSeconds: 0,
    lastViewed: "",
    lastPublished: "",
    analyticsNotes: "",
    sponsorEnabled: false,
    sponsorName: "",
    sponsorDisclosure: "",
    campaignStart: "",
    campaignEnd: "",
    sponsorArtwork: "",
    sponsorClickUrl: "",
    sponsoredProgram: false,
    impressions: 0,
    sponsorWatchMinutes: 0,
  });

  const [editingNetworkStationId, setEditingNetworkStationId] = useState("");
  const [networkMessage, setNetworkMessage] = useState(
    "AGV Network stations are controlled separately from host rooms."
  );
  const [networkSyncing, setNetworkSyncing] = useState(false);

  // PASS_CU_02_LOCAL_FILE_SELECTION_STATE
  // The selected File object remains in browser memory only.
  const mediaInputRef = useRef(null);
  const [selectedMediaFile, setSelectedMediaFile] = useState(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState("");
  const [mediaDragActive, setMediaDragActive] = useState(false);

  // PASS_CU_04_MEDIA_METADATA
  const [mediaTitle, setMediaTitle] = useState("");
  const [mediaDescription, setMediaDescription] = useState("");
  const [mediaCategory, setMediaCategory] = useState("AGV Network");
  const [mediaVisibility, setMediaVisibility] = useState("Private");
  const [mediaRightsConfirmed, setMediaRightsConfirmed] = useState(false);
  const [mediaAttribution, setMediaAttribution] = useState("");

  // PASS_CU_05_CONTROLLED_UPLOAD_READINESS_GATE
  // CLIENT ONLY: validates local intake readiness. No upload or server action.
  const mediaReadinessChecks = {
    file: Boolean(selectedMediaFile),
    title: Boolean(mediaTitle.trim()),
    description: Boolean(mediaDescription.trim()),
    rights: mediaRightsConfirmed === true,
  };
  const mediaReadyForControlledUpload = Object.values(
    mediaReadinessChecks
  ).every(Boolean);

  // PASS_CU_06_LOCAL_SUBMISSION_STAGING
  // CLIENT ONLY: stores a metadata snapshot in React memory. No file transfer.
  const [preparedMediaSubmission, setPreparedMediaSubmission] = useState(null);

// PASS CU-08C â€” CONTROLLED INTAKE SERVER RESERVATION STATE
const [controlledIntakeSubmitting, setControlledIntakeSubmitting] =
  useState(false);
const [controlledIntakeError, setControlledIntakeError] = useState("");
const [controlledIntakeReservation, setControlledIntakeReservation] =
  useState(null);

// PASS CU-09A3A-V2 DIRECT UPLOAD STATE
// CLIENT: tracks upload of the same File object shown in the preview.
const [controlledMediaUploading, setControlledMediaUploading] =
  useState(false);
const [controlledMediaUploadProgress, setControlledMediaUploadProgress] =
  useState(0);
const [controlledMediaUploadError, setControlledMediaUploadError] =
  useState("");
const [controlledMediaUploadResult, setControlledMediaUploadResult] =
  useState(null);

// PASS CU-10D1 FOUNDER MEDIA REVIEW CLIENT STATE
const [founderMediaReviewItems, setFounderMediaReviewItems] = useState([]);
const [founderMediaReviewLoading, setFounderMediaReviewLoading] =
  useState(false);
const [founderMediaReviewError, setFounderMediaReviewError] = useState("");
const [selectedFounderMediaReview, setSelectedFounderMediaReview] =
  useState(null);
const [founderMediaPreviewUrl, setFounderMediaPreviewUrl] = useState("");
const [founderMediaPreviewExpiresAt, setFounderMediaPreviewExpiresAt] =
  useState("");
const [founderMediaReviewNote, setFounderMediaReviewNote] = useState("");
const [founderMediaRejectReason, setFounderMediaRejectReason] =
  useState("");
const [founderMediaReviewAction, setFounderMediaReviewAction] =
  useState("");

// PASS CP-08B FOUNDER PARTNER SUBMISSION REVIEW WORKSPACE
const [founderPartnerReviewDetail, setFounderPartnerReviewDetail] =
  useState(null);
const [founderPartnerReviewLoading, setFounderPartnerReviewLoading] =
  useState(false);

// PASS CU-10H4 FOUNDER PUBLIC PUBLISHING CLIENT STATE
const [controlledPublicPublicationAction, setControlledPublicPublicationAction] =
  useState("");
const [controlledPublicPublicationError, setControlledPublicPublicationError] =
  useState("");
const [controlledPublicTitle, setControlledPublicTitle] = useState("");
const [controlledPublicDescription, setControlledPublicDescription] =
  useState("");
const [controlledPublicAttribution, setControlledPublicAttribution] =
  useState("");
const [controlledPublicConfirmation, setControlledPublicConfirmation] =
  useState("");
const [controlledPublicRemovalReason, setControlledPublicRemovalReason] =
  useState("");
// PASS FPA-02 - FOUNDER PUBLIC ACCESS CLIENT CONTROLS
const [controlledPublicAccessMode, setControlledPublicAccessMode] =
  useState("DISABLED");
const [controlledPublicPublishAt, setControlledPublicPublishAt] =
  useState("");
// PASS CU-10F1 OWNER PRIVATE AGV NETWORK LIBRARY STATE
const [ownerPrivateMediaItems, setOwnerPrivateMediaItems] = useState([]);
const [ownerPrivateMediaLoading, setOwnerPrivateMediaLoading] =
  useState(false);
const [ownerPrivateMediaError, setOwnerPrivateMediaError] = useState("");
const [selectedOwnerPrivateMedia, setSelectedOwnerPrivateMedia] =
  useState(null);
const [ownerPrivateMediaPreviewUrl, setOwnerPrivateMediaPreviewUrl] =
  useState("");
const [ownerPrivateMediaPreviewExpiresAt, setOwnerPrivateMediaPreviewExpiresAt] =
  useState("");
const [ownerPrivateMediaAction, setOwnerPrivateMediaAction] =
  useState("");
// PASS FPA-03 - OWNER PRIVATE MEDIA PUBLIC ACCESS CONTROLS
const [ownerPrivatePublicAccessMode, setOwnerPrivatePublicAccessMode] =
  useState("DISABLED");
const [ownerPrivatePublicPublishAt, setOwnerPrivatePublicPublishAt] =
  useState("");
const [ownerPrivatePublicConfirmation, setOwnerPrivatePublicConfirmation] =
  useState("");
const [ownerPrivatePublicAction, setOwnerPrivatePublicAction] =
  useState("");
const [ownerPrivatePublicError, setOwnerPrivatePublicError] =
  useState("");

// PASS FAD-02 - FOUNDER ADMIN HUMAN REVIEW CLIENT
const [
  founderAdminDecisionOpenContext,
  setFounderAdminDecisionOpenContext,
] = useState("");
const [
  founderAdminDecisionBasis,
  setFounderAdminDecisionBasis,
] = useState("OFFICIAL_PROVIDER_EMBED");
const [
  founderAdminDecisionEvidence,
  setFounderAdminDecisionEvidence,
] = useState("");
const [
  founderAdminDecisionSourceUrl,
  setFounderAdminDecisionSourceUrl,
] = useState("");
const [
  founderAdminDecisionAttribution,
  setFounderAdminDecisionAttribution,
] = useState("");
const [
  founderAdminDecisionNote,
  setFounderAdminDecisionNote,
] = useState("");
const [
  founderAdminDecisionAttestation,
  setFounderAdminDecisionAttestation,
] = useState("");
const [
  founderAdminDecisionAffirmed,
  setFounderAdminDecisionAffirmed,
] = useState(false);
const [
  founderAdminDecisionAction,
  setFounderAdminDecisionAction,
] = useState("");
const [
  founderAdminDecisionError,
  setFounderAdminDecisionError,
] = useState("");
// PASS MRM-02 - SUPER ADMIN MEDIA REMOVAL CONTROLS
const [
  ownerPrivateMediaRemovalConfirmation,
  setOwnerPrivateMediaRemovalConfirmation,
] = useState("");
const [
  ownerPrivateMediaRemovalAction,
  setOwnerPrivateMediaRemovalAction,
] = useState("");
// PASS PTK-03 - PARTNER MEDIA TAKEDOWN CONTROLS
const [
  ownerPartnerTakedownReason,
  setOwnerPartnerTakedownReason,
] = useState("");
const [
  ownerPartnerViolationCategory,
  setOwnerPartnerViolationCategory,
] = useState("PLATFORM_POLICY_VIOLATION");
const [
  ownerPartnerTakedownConfirmation,
  setOwnerPartnerTakedownConfirmation,
] = useState("");
const [
  ownerPartnerTakedownAction,
  setOwnerPartnerTakedownAction,
] = useState("");

// PASS AGV-NETWORK-ARCHIVES-PUBLIC-CATALOG-01
const [publicArchiveMediaItems, setPublicArchiveMediaItems] = useState([]);
const [publicArchiveMediaLoading, setPublicArchiveMediaLoading] =
  useState(false);
const [publicArchiveMediaError, setPublicArchiveMediaError] =
  useState("");

async function loadPublicArchiveMediaCatalog() {
  setPublicArchiveMediaLoading(true);
  setPublicArchiveMediaError("");

  try {
    const response = await fetch(
      AGV_SERVER_API_BASE + "/api/media/public",
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result?.ok) {
      throw new Error(
        result?.error ||
          "AGV Network Archives are temporarily unavailable."
      );
    }

    const items = Array.isArray(result.items)
      ? result.items.filter((item) => {
          const intakeId = String(
            item?.intakeId || ""
          ).trim();

          const playbackPath = String(
            item?.playbackPath || ""
          ).trim();

          return Boolean(intakeId && playbackPath);
        })
      : [];

    setPublicArchiveMediaItems(items);
    return true;
  } catch (error) {
    setPublicArchiveMediaItems([]);
    setPublicArchiveMediaError(
      error?.message ||
        "AGV Network Archives are temporarily unavailable."
    );
    return false;
  } finally {
    setPublicArchiveMediaLoading(false);
  }
}

function getPublicArchivePlaybackUrl(item) {
  const playbackPath = String(
    item?.playbackPath || ""
  ).trim();

  if (!playbackPath) {
    return "";
  }

  return playbackPath.startsWith("http")
    ? playbackPath
    : AGV_SERVER_API_BASE + playbackPath;
}

// PASS CU-10G3A CONTROLLED PUBLIC RIGHTS CLIENT FOUNDATION STATE
const [controlledRightsItems, setControlledRightsItems] = useState([]);
const [controlledRightsLoading, setControlledRightsLoading] =
  useState(false);
const [controlledRightsError, setControlledRightsError] = useState("");
const [controlledRightsAction, setControlledRightsAction] =
  useState("");
const [controlledRightsBasis, setControlledRightsBasis] =
  useState("OWNED_ORIGINAL");
const [controlledRightsEvidence, setControlledRightsEvidence] =
  useState("");
const [controlledRightsLicenseType, setControlledRightsLicenseType] =
  useState("");
const [controlledRightsLicenseUrl, setControlledRightsLicenseUrl] =
  useState("");
const [controlledRightsSourceUrl, setControlledRightsSourceUrl] =
  useState("");
const [controlledRightsAttribution, setControlledRightsAttribution] =
  useState("");
const [controlledRightsNotes, setControlledRightsNotes] =
  useState("");
const [controlledRightsCertification, setControlledRightsCertification] =
  useState("");
const [controlledRightsCertifyAuthority, setControlledRightsCertifyAuthority] =
  useState(false);
const [controlledRightsCertifyEvidence, setControlledRightsCertifyEvidence] =
  useState(false);
const [controlledRightsCertifyPublicUse, setControlledRightsCertifyPublicUse] =
  useState(false);
const [controlledRightsRevocationReason, setControlledRightsRevocationReason] =
  useState("");

  // PASS_SA_UX_01_WORKSPACE_NAVIGATION
  // Navigation framework only. Existing Super Admin sections remain unchanged.
  const [activeAdminWorkspace, setActiveAdminWorkspace] = useState(() => {
    return sessionStorage.getItem("agv_super_admin_workspace") || "dashboard";
  });

  // PASS NOC-02B2-V3 DISPLAY CONTROLLED NETWORK SECTIONS
  const [activeNetworkSection, setActiveNetworkSection] =
    useState(() => {
      const stored =
        sessionStorage.getItem(
          "agv_super_admin_network_section"
        );

      return [
        "home",
        "live",
        "ondemand",
        "news",
        "education",
        "archives",
        "partners",
        "publishing",
      ].includes(stored)
        ? stored
        : "home";
    });

  function selectNetworkSection(sectionId) {
    const allowed = [
      "home",
      "live",
      "ondemand",
      "news",
      "education",
      "archives",
      "partners",
      "publishing",
    ];

    const next = allowed.includes(sectionId)
      ? sectionId
      : "home";

    setActiveNetworkSection(next);

    sessionStorage.setItem(
      "agv_super_admin_network_section",
      next
    );

    requestAnimationFrame(() => {
      document
        .getElementById(
          "agv-network-control-center"
        )
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    });
  }

  // PASS_NOC_01B_COLLAPSIBLE_SUPER_ADMIN_CONTROLS
  const [additionalAdminControlsOpen, setAdditionalAdminControlsOpen] = useState(
    () =>
      sessionStorage.getItem("agv_additional_admin_controls_open") === "true"
  );

  function toggleAdditionalAdminControls() {
    setAdditionalAdminControlsOpen((current) => {
      const next = !current;
      sessionStorage.setItem(
        "agv_additional_admin_controls_open",
        String(next)
      );
      return next;
    });
  }

  function selectAdminWorkspace(workspaceId) {
    setActiveAdminWorkspace(workspaceId);
    sessionStorage.setItem("agv_super_admin_workspace", workspaceId);
  }

  useEffect(() => {
    if (!selectedMediaFile) {
      setMediaPreviewUrl("");
      return;
    }

    const url = URL.createObjectURL(selectedMediaFile);
    setMediaPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [selectedMediaFile]);
  const [roomName, setRoomName] = useState("");
  const [category, setCategory] = useState("Convention");
  const [visibility, setVisibility] = useState("Public");
  const [host, setHost] = useState("Unassigned");

  const [planRules, setPlanRules] = useState(FALLBACK_PLAN_LIMITS);
  const [subscriptionPlan, setSubscriptionPlan] = useState("FREE");
  // PASS_110_H2C_1_OWNER_TESTING_AS_UI
  // Session-only testing selection. This does not modify the real subscription.
  const [testPlan, setTestPlan] = useState(() => {
    const savedTestPlan = String(
      sessionStorage.getItem("agv_super_admin_test_plan") || sessionStorage.getItem("agv_owner_test_plan") || "CONVENTION"
    ).trim().toUpperCase();

    return FALLBACK_PLAN_LIMITS[savedTestPlan] ? savedTestPlan : "CONVENTION";
  });

  const [subscriptionMessage, setSubscriptionMessage] = useState(
    "Subscription server not checked yet."
  );
  const [upgradeMessage, setUpgradeMessage] = useState("");
  const [billingMessage, setBillingMessage] = useState("");
  const [enforcementMessage, setEnforcementMessage] = useState(
    "AGV subscription service plan enforcement not checked yet."
  );
  const [lastEnforcement, setLastEnforcement] = useState(null);

  const account = getStoredAccount();
  const limits = planRules[subscriptionPlan] || FALLBACK_PLAN_LIMITS.FREE;
  const roomsUsed = rooms.length;
  const roomsRemaining = Math.max(limits.maxRooms - roomsUsed, 0);

  useEffect(() => {
    localStorage.setItem(ROOM_STORAGE_KEY, JSON.stringify(rooms));
  }, [rooms]);
  useEffect(() => {
    localStorage.setItem(
      NETWORK_STATION_STORAGE_KEY,
      JSON.stringify(networkStations)
    );
  }, [networkStations]);

  useEffect(() => {
    loadSubscription();
  }, []);

  useEffect(() => {
    if (unlocked) {
      loadNetworkStationsFromServer();
    }
  }, [unlocked]);

  async function loadSubscription() {
    try {
      const response = await fetch(`${SUBSCRIPTION_API_BASE}/api/subscription`);
      const data = await response.json();

      if (!response.ok || !data?.ok) {
        setSubscriptionMessage("Subscription server responded, but did not approve.");
        return;
      }

      const serverPlan = normalizePlan(data.plan || account.plan || "FREE");

      setSubscriptionPlan(serverPlan);

      if (data.limits) {
        setPlanRules((current) => ({
          ...current,
          [serverPlan]: {
            ...(current[serverPlan] || {}),
            ...data.limits,
          },
        }));
      }

      setSubscriptionMessage("Subscription loaded from AGV subscription service.");

      if (data.enforcement?.enabled) {
        setEnforcementMessage("AGV subscription enforcement is active.");
      } else {
        setEnforcementMessage("AGV subscription service loaded, enforcement status not reported.");
      }
    } catch {
      setSubscriptionMessage("Subscription server offline. Using local fallback rules.");
      setEnforcementMessage("AGV subscription service enforcement offline. Local fallback checks will run.");
    }
  }

  async function saveSubscriptionPlan(nextPlan) {
    const cleanPlan = normalizePlan(nextPlan);

    setSubscriptionPlan(cleanPlan);
    setUpgradeMessage("");
    setLastEnforcement(null);

    try {
      const response = await fetch(`${SUBSCRIPTION_API_BASE}/api/subscription/plan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan: cleanPlan }),
      });

      const data = await response.json();

      if (!response.ok || !data?.ok) {
        setSubscriptionMessage(data?.error || "Could not save subscription plan.");
        return;
      }

      const savedPlan = normalizePlan(data.plan || cleanPlan);

      setSubscriptionPlan(savedPlan);

      if (data.limits) {
        setPlanRules((current) => ({
          ...current,
          [savedPlan]: {
            ...(current[savedPlan] || {}),
            ...data.limits,
          },
        }));
      }

      setSubscriptionMessage(`Saved ${savedPlan} plan to AGV subscription service.`);
    } catch {
      setSubscriptionMessage("Could not reach subscription server. Local plan changed only.");
    }
  }

  async function startCheckout(plan) {
    setBillingMessage(`Starting ${plan} checkout...`);

    try {
      const response = await fetch(`${BILLING_API_BASE}/api/billing/create-checkout-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan }),
      });

      const data = await response.json();

      if (!response.ok || !data?.ok) {
        setBillingMessage(
          data?.error ||
            "Billing server responded, but Stripe checkout is not ready yet."
        );
        return;
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      setBillingMessage("Checkout session created, but no checkout URL was returned.");
    } catch {
      setBillingMessage("Could not reach billing server on 8793.");
    }
  }

  function unlockPanel() {
    if (pin.trim() === SUPER_ADMIN_PIN) {
      setUnlocked(true);
      setPinMessage("");
      return;
    }

    setPinMessage("Invalid Super Admin PIN.");
  }

  async function checkServerRoomCreate() {
    const requestedRooms = rooms.length + 1;

    try {
      const response = await fetch(`${SUBSCRIPTION_API_BASE}/api/subscription/check-room-create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: account.email,
          plan: subscriptionPlan,
          currentRooms: rooms.length,
          requestedRooms,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data?.ok) {
        return {
          allowed: rooms.length < limits.maxRooms,
          reason: "AGV subscription service check failed. Local fallback check was used.",
          data,
        };
      }

      return {
        allowed: Boolean(data.allowed),
        reason: data.reason || "AGV subscription service room-create check completed.",
        data,
      };
    } catch {
      return {
        allowed: rooms.length < limits.maxRooms,
        reason: "AGV subscription service offline. Local fallback room limit check was used.",
        data: null,
      };
    }
  }

  async function checkServerPrivateRoom() {
    const wantsPrivate = visibility === "Private";

    if (!wantsPrivate) {
      return {
        allowed: true,
        reason: "Private-room check not needed.",
        data: null,
      };
    }

    try {
      const response = await fetch(`${SUBSCRIPTION_API_BASE}/api/subscription/check-private-room`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: account.email,
          plan: subscriptionPlan,
          requestPrivate: true,
          isPrivate: true,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data?.ok) {
        return {
          allowed: Boolean(limits.allowPrivate),
          reason: "AGV subscription service private-room check failed. Local fallback check was used.",
          data,
        };
      }

      return {
        allowed: Boolean(data.allowed),
        reason: data.reason || "AGV subscription service private-room check completed.",
        data,
      };
    } catch {
      return {
        allowed: Boolean(limits.allowPrivate),
        reason: "AGV subscription service offline. Local fallback private-room check was used.",
        data: null,
      };
    }
  }

  async function checkServerTicketOnly() {
    const wantsTicketOnly = visibility === "Ticket Only";

    if (!wantsTicketOnly) {
      return {
        allowed: true,
        reason: "Ticket-only check not needed.",
        data: null,
      };
    }

    try {
      const response = await fetch(`${SUBSCRIPTION_API_BASE}/api/subscription/check-ticket-only`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: account.email,
          plan: subscriptionPlan,
          requestTicketOnly: true,
          isTicketOnly: true,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data?.ok) {
        return {
          allowed: Boolean(limits.allowTicketOnly),
          reason: "AGV subscription service ticket-only check failed. Local fallback check was used.",
          data,
        };
      }

      return {
        allowed: Boolean(data.allowed),
        reason: data.reason || "AGV subscription service ticket-only check completed.",
        data,
      };
    } catch {
      return {
        allowed: Boolean(limits.allowTicketOnly),
        reason: "AGV subscription service offline. Local fallback ticket-only check was used.",
        data: null,
      };
    }
  }

  async function createRoom() {
    const cleanName = roomName.trim();

    if (!cleanName) {
      setUpgradeMessage("Enter a room name before creating a room.");
      return;
    }

    setUpgradeMessage("Checking AGV subscription service plan enforcement...");
    setLastEnforcement(null);

    const roomCheck = await checkServerRoomCreate();

    setLastEnforcement(roomCheck.data);

    if (!roomCheck.allowed) {
      setUpgradeMessage(roomCheck.reason);
      setEnforcementMessage("Room creation blocked by AGV subscription service enforcement.");
      return;
    }

    const privateCheck = await checkServerPrivateRoom();

    if (!privateCheck.allowed) {
      setUpgradeMessage(privateCheck.reason);
      setEnforcementMessage("Private-room creation blocked by AGV subscription service enforcement.");
      setLastEnforcement(privateCheck.data);
      return;
    }

    const ticketCheck = await checkServerTicketOnly();

    if (!ticketCheck.allowed) {
      setUpgradeMessage(ticketCheck.reason);
      setEnforcementMessage("Ticket-only room creation blocked by AGV subscription service enforcement.");
      setLastEnforcement(ticketCheck.data);
      return;
    }

    const id = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const privacy = getPrivacyFlags(visibility);

    const newRoom = {
      id,
      name: cleanName,
      category,
      visibility,
      host,
      status: "Standby",
      ownerName: account.name || "AGV Account",
      ownerEmail: account.email || "",
      organization: account.organization || "",
      createdByPlan: subscriptionPlan,
      planLabel: limits.label || subscriptionPlan,
      ...privacy,
    };

    setRooms([...rooms, newRoom]);
    setRoomName("");
    setCategory("Convention");
    setVisibility("Public");
    setHost("Unassigned");
    setUpgradeMessage(roomCheck.reason || "Room created under active plan enforcement.");
    setEnforcementMessage("AGV subscription service enforcement approved this room creation.");
  }

  function deleteRoom(id) {
    setRooms(rooms.filter((room) => room.id !== id));
  }

  async function updateRoomVisibility(id, nextVisibility) {
    const targetRoom = rooms.find((room) => room.id === id);

    if (!targetRoom) {
      setUpgradeMessage("Room not found.");
      return;
    }

    if (nextVisibility === "Private") {
      try {
        const response = await fetch(`${SUBSCRIPTION_API_BASE}/api/subscription/check-private-room`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: account.email,
            plan: subscriptionPlan,
            requestPrivate: true,
            isPrivate: true,
          }),
        });

        const data = await response.json();

        if (response.ok && data?.ok && !data.allowed) {
          setUpgradeMessage(data.reason || "Private rooms require an upgraded plan.");
          setEnforcementMessage("Visibility change blocked by AGV subscription service enforcement.");
          setLastEnforcement(data);
          return;
        }
      } catch {
        if (!limits.allowPrivate) {
          setUpgradeMessage("Private rooms require Creator plan or higher.");
          return;
        }
      }
    }

    if (nextVisibility === "Ticket Only") {
      try {
        const response = await fetch(`${SUBSCRIPTION_API_BASE}/api/subscription/check-ticket-only`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: account.email,
            plan: subscriptionPlan,
            requestTicketOnly: true,
            isTicketOnly: true,
          }),
        });

        const data = await response.json();

        if (response.ok && data?.ok && !data.allowed) {
          setUpgradeMessage(data.reason || "Ticket-only rooms require an upgraded plan.");
          setEnforcementMessage("Visibility change blocked by AGV subscription service enforcement.");
          setLastEnforcement(data);
          return;
        }
      } catch {
        if (!limits.allowTicketOnly) {
          setUpgradeMessage("Ticket-only rooms require Creator plan or higher.");
          return;
        }
      }
    }

    const privacy = getPrivacyFlags(nextVisibility);

    setRooms(
      rooms.map((room) =>
        room.id === id
          ? {
              ...room,
              visibility: nextVisibility,
              ...privacy,
            }
          : room
      )
    );

    setUpgradeMessage(`Room visibility changed to ${nextVisibility}.`);
    setEnforcementMessage("AGV subscription service visibility enforcement passed or local fallback allowed it.");
  }

  function updateRoomStatus(id, nextStatus) {
    setRooms(
      rooms.map((room) =>
        room.id === id
          ? {
              ...room,
              status: nextStatus,
            }
          : room
      )
    );
  }


  async function loadNetworkStationsFromServer() {
    const token = getAgvServerAuthToken();

    if (!token) {
      setNetworkMessage(
        "A verified AGV account session is required to load the server registry."
      );
      return false;
    }

    setNetworkSyncing(true);
    setNetworkMessage("Loading the protected AGV Network registry...");

    try {
      const response = await fetch(
        `${SUBSCRIPTION_API_BASE}/api/network/stations/admin`,
        {
          method: "GET",
          headers: getNetworkAdminHeaders(),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (
        !response.ok ||
        !data?.ok ||
        !Array.isArray(data.stations)
      ) {
        throw new Error(
          data?.error || "The protected station registry could not be loaded."
        );
      }

      setNetworkStations(data.stations);
      resetNetworkForm();
      setNetworkMessage(
        `Loaded ${data.stations.length} station${data.stations.length === 1 ? "" : "s"} from the protected server registry.`
      );

      return true;
    } catch (error) {
      setNetworkMessage(
        `Server registry load failed. The browser recovery copy remains available. ${error?.message || ""}`.trim()
      );

      return false;
    } finally {
      setNetworkSyncing(false);
    }
  }

  // PASS_CU_02_LOCAL_FILE_SELECTION_HANDLERS
  const acceptedMediaExtensions = [".mp4", ".mkv", ".mov", ".avi", ".webm"];

  function formatMediaFileSize(bytes) {
    const value = Number(bytes || 0);

    if (value < 1024) {
      return `${value} bytes`;
    }

    if (value < 1024 * 1024) {
      return `${(value / 1024).toFixed(1)} KB`;
    }

    if (value < 1024 * 1024 * 1024) {
      return `${(value / (1024 * 1024)).toFixed(1)} MB`;
    }

    return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  function selectLocalMediaFile(file) {
    if (!file) {
      return;
    }

    const fileName = String(file.name || "");
    const extensionIndex = fileName.lastIndexOf(".");
    const extension =
      extensionIndex >= 0 ? fileName.slice(extensionIndex).toLowerCase() : "";

    if (!acceptedMediaExtensions.includes(extension)) {
      setNetworkMessage(
        "Unsupported media format. Choose an MP4, MKV, MOV, AVI, or WEBM file."
      );
      return;
    }

    setSelectedMediaFile(file);
    setPreparedMediaSubmission(null);
    setControlledIntakeReservation(null);
    setControlledIntakeError("");
    setControlledMediaUploading(false);
    setControlledMediaUploadProgress(0);
    setControlledMediaUploadError("");
    setControlledMediaUploadResult(null);
    setNetworkMessage(
      `${fileName} selected locally. The file has not been uploaded or transmitted.`
    );
  }

  function handleMediaInputChange(event) {
    const file = event.target.files?.[0] || null;
    selectLocalMediaFile(file);
  }

  function handleMediaDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    setMediaDragActive(true);
  }

  function handleMediaDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    setMediaDragActive(false);
  }

  function handleMediaDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    setMediaDragActive(false);

    const file = event.dataTransfer?.files?.[0] || null;
    selectLocalMediaFile(file);
  }
  // PASS_CU_06_LOCAL_SUBMISSION_STAGING_HANDLERS
  // PASS CU-08E â€” PREPARE AND RESERVE CONTROLLED INTAKE
  async function prepareControlledMediaSubmission() {
    if (!mediaReadyForControlledUpload || !selectedMediaFile) {
      setNetworkMessage(
        "Complete every controlled intake requirement before preparing the submission."
      );
      return;
    }

    if (controlledIntakeSubmitting) {
      return;
    }

    const preparedAt = new Date();
    const localIntakeId =
      "AGV-CU-LOCAL-" +
      preparedAt.toISOString().replace(/\D/g, "").slice(0, 14) +
      "-" +
      Math.random().toString(36).slice(2, 8).toUpperCase();

    const submission = {
      intakeId: localIntakeId,
      preparedAt: preparedAt.toISOString(),
      fileName: selectedMediaFile.name || "Unnamed media file",
      fileSize: Number(selectedMediaFile.size || 0),
      mediaType: selectedMediaFile.type || "Unknown media type",
      title: mediaTitle.trim(),
      description: mediaDescription.trim(),
      category: mediaCategory,
      visibility: mediaVisibility,
      attribution: mediaAttribution.trim(),
      rightsConfirmed: mediaRightsConfirmed === true,
    };

    setPreparedMediaSubmission(submission);
    setControlledIntakeReservation(null);
    setControlledIntakeError("");
    setNetworkMessage(
      `Prepared local intake ${localIntakeId}. Reserving its metadata with the protected AGV server.`
    );

    await reserveControlledMediaIntake(submission);
  }

  function cancelPreparedMediaSubmission() {
    const cancelledId = preparedMediaSubmission?.intakeId || "prepared intake";
    setPreparedMediaSubmission(null);
    setControlledIntakeReservation(null);
    setControlledIntakeError("");
    setControlledMediaUploading(false);
    setControlledMediaUploadProgress(0);
    setControlledMediaUploadError("");
    setControlledMediaUploadResult(null);
    setNetworkMessage(
      `Cancelled ${cancelledId}. No file was uploaded, transmitted, stored, or published.`
    );
  }

  // PASS CU-08D â€” CLIENT-TO-SERVER METADATA RESERVATION
  async function reserveControlledMediaIntake(submission) {
    if (!submission) {
      setControlledIntakeError(
        "Prepare the controlled intake metadata before reserving it."
      );
      return false;
    }

    const token = getAgvServerAuthToken();

    if (!token) {
      setControlledIntakeError(
        "A verified AGV Super Admin server session is required."
      );
      setNetworkMessage(
        "Controlled intake was not reserved. Sign in through the verified AGV server account."
      );
      return false;
    }

    setControlledIntakeSubmitting(true);
    setControlledIntakeError("");
    setControlledIntakeReservation(null);

    try {
      const response = await fetch(
        `${AGV_SERVER_API_BASE}/api/media/intake/prepare`,
        {
          method: "POST",
          headers: getNetworkAdminHeaders(true),
          body: JSON.stringify({
            title: submission.title,
            description: submission.description,
            filename: submission.fileName,
            filesize: submission.fileSize,
            mimetype: submission.mediaType,
            category: submission.category,
            visibility: submission.visibility,
            attribution: submission.attribution,
            rightsConfirmed: submission.rightsConfirmed === true,
          }),
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result?.ok) {
        throw new Error(
          result?.error ||
            `Controlled intake reservation failed with HTTP ${response.status}.`
        );
      }

      const reservation = {
        ...submission,
        localIntakeId: submission.intakeId,
        intakeId: result.intakeId,
        status: result.status || "AWAITING_SECURE_UPLOAD",
        reservedAt:
          result.intake?.createdAt || new Date().toISOString(),
      };

      setPreparedMediaSubmission(reservation);
      setControlledIntakeReservation(reservation);
      setNetworkMessage(
        `Controlled intake ${reservation.intakeId} reserved. The media file remains local and has not been uploaded.`
      );

      return true;
    } catch (error) {
      const message =
        error?.message || "Could not reserve the controlled media intake.";

      setControlledIntakeError(message);
      setNetworkMessage(
        `${message} The prepared metadata and local media selection were preserved.`
      );

      return false;
    } finally {
      setControlledIntakeSubmitting(false);
    }
  }

  // PASS CU-09A3B-V2 DIRECT PREVIEW UPLOAD HANDLER
  // CLIENT: sends the same File object already displayed in the preview.
  function uploadSelectedPreviewMedia() {
    if (controlledMediaUploading) {
      return;
    }

    if (!selectedMediaFile) {
      const message = "The selected preview file is no longer available. Select the file again.";

      setControlledMediaUploadError(message);
      setNetworkMessage(message);
      return;
    }

    const intakeId = String(
      controlledIntakeReservation?.intakeId ||
        preparedMediaSubmission?.intakeId ||
        ""
    ).trim();

    if (!intakeId || intakeId.includes("-LOCAL-")) {
      const message = "Reserve the controlled intake with the AGV server before uploading.";

      setControlledMediaUploadError(message);
      setNetworkMessage(message);
      return;
    }

    if (
      preparedMediaSubmission?.status !==
      "AWAITING_SECURE_UPLOAD"
    ) {
      const message = "This controlled intake is not awaiting a secure upload.";

      setControlledMediaUploadError(message);
      setNetworkMessage(message);
      return;
    }

    const token = getAgvServerAuthToken();

    if (!token) {
      const message = "A verified AGV Super Admin server session is required.";

      setControlledMediaUploadError(message);
      setNetworkMessage("The media upload did not begin. Sign in through the verified AGV Owner account.");
      return;
    }

    const formData = new FormData();

    formData.append(
      "media",
      selectedMediaFile,
      selectedMediaFile.name
    );

    const request = new XMLHttpRequest();

    setControlledMediaUploading(true);
    setControlledMediaUploadProgress(0);
    setControlledMediaUploadError("");
    setControlledMediaUploadResult(null);

    setNetworkMessage(
      "Uploading the selected preview file for controlled intake " + intakeId + "."
    );

    request.open(
      "POST",
      AGV_SERVER_API_BASE +
        "/api/media/intake/" +
        encodeURIComponent(intakeId) +
        "/upload"
    );

    request.setRequestHeader(
      "Authorization",
      "Bearer " + token
    );

    request.upload.onprogress = (event) => {
      if (!event.lengthComputable) {
        return;
      }

      const percentage = Math.min(
        100,
        Math.max(
          0,
          Math.round((event.loaded / event.total) * 100)
        )
      );

      setControlledMediaUploadProgress(percentage);
    };

    request.onerror = () => {
      setControlledMediaUploading(false);

      const message = "The secure media upload could not reach the AGV server.";

      setControlledMediaUploadError(message);
      setNetworkMessage(
        message + " The selected preview file remains available locally."
      );
    };

    request.onabort = () => {
      setControlledMediaUploading(false);

      const message = "The secure media upload was cancelled.";

      setControlledMediaUploadError(message);
      setNetworkMessage(
        message + " The selected preview file remains available locally."
      );
    };

    request.onload = () => {
      let result = {};

      try {
        result = JSON.parse(request.responseText || "{}");
      } catch {}

      if (
        request.status < 200 ||
        request.status >= 300 ||
        !result?.ok
      ) {
        const message =
          result?.error ||
          "Secure media upload failed with HTTP " + request.status + ".";

        setControlledMediaUploading(false);
        setControlledMediaUploadError(message);
        setNetworkMessage(
          message + " The selected preview file remains available locally."
        );
        return;
      }

      const uploaded = {
        ...(preparedMediaSubmission || {}),
        ...(result.intake || {}),
        intakeId: result.intakeId || intakeId,
        status:
          result.status ||
          result.intake?.status ||
          "UPLOADED_PENDING_REVIEW",
        uploadedAt:
          result.intake?.uploadedAt ||
          new Date().toISOString(),
      };

      setControlledMediaUploading(false);
      setControlledMediaUploadProgress(100);
      setControlledMediaUploadError("");
      setControlledMediaUploadResult(uploaded);
      setControlledIntakeReservation(uploaded);
      setPreparedMediaSubmission(uploaded);

      setNetworkMessage(
        "Media for intake " + uploaded.intakeId + " uploaded securely and is pending review."
      );
    };

    request.send(formData);
  }

  // PASS CU-10D1 FOUNDER MEDIA REVIEW CLIENT HANDLERS
  async function loadFounderMediaReviewItems() {
    const token = getAgvServerAuthToken();

    if (!token) {
      const message =
        "A verified AGV Founder/Super Admin session is required.";

      setFounderMediaReviewError(message);
      setNetworkMessage(message);
      return false;
    }

    setFounderMediaReviewLoading(true);
    setFounderMediaReviewError("");

    try {
      const response = await fetch(
        AGV_SERVER_API_BASE + "/api/media/review",
        {
          method: "GET",
          headers: getNetworkAdminHeaders(),
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result?.ok) {
        throw new Error(
          result?.error ||
            "Could not load the Founder media-review queue."
        );
      }

      const items = Array.isArray(result.items)
        ? result.items
        : [];

      setFounderMediaReviewItems(items);

      if (!items.length) {
        setSelectedFounderMediaReview(null);
        setFounderPartnerReviewDetail(null);
      } else {
        const currentId =
          selectedFounderMediaReview?.intakeId;

        const nextSelected =
          items.find(
            (item) => item.intakeId === currentId
          ) || items[0];

        setSelectedFounderMediaReview(nextSelected);
        await loadFounderPartnerReviewDetail(
          nextSelected
        );
      }

      setNetworkMessage(
        "Loaded " +
          items.length +
          " Founder media-review item" +
          (items.length === 1 ? "." : "s.")
      );

      return true;
    } catch (error) {
      const message =
        error?.message ||
        "Could not load the Founder media-review queue.";

      setFounderMediaReviewError(message);
      setNetworkMessage(message);
      return false;
    } finally {
      setFounderMediaReviewLoading(false);
    }
  }

  async function loadFounderPartnerReviewDetail(item) {
    const intakeId = item?.intakeId;

    if (!intakeId) {
      setFounderPartnerReviewDetail(null);
      return null;
    }

    setFounderPartnerReviewLoading(true);

    try {
      const response = await fetch(
        AGV_SERVER_API_BASE +
          "/api/media/review/" +
          encodeURIComponent(intakeId),
        {
          method: "GET",
          headers: getNetworkAdminHeaders(),
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result?.ok) {
        throw new Error(
          result?.error ||
            "Could not load the linked Partner review details."
        );
      }

      const detail = {
        intake: result.intake || item,
        linkedPartnerSubmission:
          result.linkedPartnerSubmission || null,
        linkedPartnerAvailable:
          result.linkedPartnerAvailable === true,
        partnerSubmissionId:
          result.partnerSubmissionId || null,
        privatePreviewAvailable:
          result.privatePreviewAvailable === true,
        reviewWorkspace:
          result.reviewWorkspace || null,
      };

      setFounderPartnerReviewDetail(detail);

      if (result.intake) {
        setSelectedFounderMediaReview((current) =>
          current?.intakeId === result.intake.intakeId
            ? {
                ...current,
                ...result.intake,
              }
            : current
        );
      }

      return detail;
    } catch (error) {
      setFounderPartnerReviewDetail(null);

      const message =
        error?.message ||
        "Could not load the linked Partner review details.";

      setFounderMediaReviewError(message);
      return null;
    } finally {
      setFounderPartnerReviewLoading(false);
    }
  }

  function selectFounderMediaReviewItem(item) {
    setSelectedFounderMediaReview(item || null);
    setFounderPartnerReviewDetail(null);

    if (item?.intakeId) {
      loadFounderPartnerReviewDetail(item);
    }

    setFounderMediaPreviewUrl("");
    setFounderMediaPreviewExpiresAt("");
    setFounderMediaReviewNote("");
    setFounderMediaRejectReason("");
    setFounderMediaReviewError("");
    setControlledRightsError("");
    setControlledRightsBasis("OWNED_ORIGINAL");
    setControlledRightsEvidence("");
    setControlledRightsLicenseType("");
    setControlledRightsLicenseUrl("");
    setControlledRightsSourceUrl("");
    setControlledRightsAttribution(item?.attribution || "");
    setControlledRightsNotes("");
    setControlledRightsCertification("");
    setControlledRightsCertifyAuthority(false);
    setControlledRightsCertifyEvidence(false);
    setControlledRightsCertifyPublicUse(false);
    setControlledRightsRevocationReason("");
    setControlledPublicPublicationError("");
    setControlledPublicTitle(
      item?.publicPublication?.publicTitle || item?.title || ""
    );
    setControlledPublicDescription(
      item?.publicPublication?.publicDescription || item?.description || ""
    );
    setControlledPublicAttribution(
      item?.publicPublication?.publicAttribution ||
        item?.rightsClearance?.attribution ||
        item?.attribution || ""
    );
    setControlledPublicConfirmation("");
    setControlledPublicRemovalReason("");

    const storedPublicationMode =
      item?.publicAccess === true
        ? "ENABLED"
        : item?.publicPublication?.publicationMode ===
            "SCHEDULED" ||
          item?.publicationControl?.mode ===
            "SCHEDULED"
          ? "SCHEDULED"
          : "DISABLED";

    const storedScheduledPublishAt =
      item?.publicPublication?.scheduledPublishAt ||
      item?.publicationControl?.scheduledPublishAt ||
      "";

    const parsedScheduledPublishAt =
      storedScheduledPublishAt
        ? new Date(storedScheduledPublishAt)
        : null;

    setControlledPublicAccessMode(
      storedPublicationMode
    );

    setControlledPublicPublishAt(
      parsedScheduledPublishAt &&
      Number.isFinite(parsedScheduledPublishAt.getTime())
        ? parsedScheduledPublishAt
            .toLocaleString("sv-SE", {
              hour12: false,
            })
            .replace(" ", "T")
            .slice(0, 16)
        : ""
    );
  }

  async function requestFounderMediaPreview() {
    const intakeId = selectedFounderMediaReview?.intakeId;

    if (!intakeId) {
      setFounderMediaReviewError(
        "Select an uploaded media item before requesting a preview."
      );
      return false;
    }

    setFounderMediaReviewAction("preview");
    setFounderMediaReviewError("");
    setFounderMediaPreviewUrl("");

    try {
      const response = await fetch(
        AGV_SERVER_API_BASE +
          "/api/media/review/" +
          encodeURIComponent(intakeId) +
          "/preview-ticket",
        {
          method: "POST",
          headers: getNetworkAdminHeaders(true),
          body: JSON.stringify({}),
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result?.ok || !result.previewPath) {
        throw new Error(
          result?.error ||
            "Could not create the private Founder preview."
        );
      }

      setFounderMediaPreviewUrl(
        AGV_SERVER_API_BASE + result.previewPath
      );
      setFounderMediaPreviewExpiresAt(result.expiresAt || "");
      setNetworkMessage(
        "Private Founder preview opened for intake " +
          intakeId +
          "."
      );

      return true;
    } catch (error) {
      const message =
        error?.message ||
        "Could not create the private Founder preview.";

      setFounderMediaReviewError(message);
      setNetworkMessage(message);
      return false;
    } finally {
      setFounderMediaReviewAction("");
    }
  }

  async function approveFounderMediaReview() {
    const intakeId = selectedFounderMediaReview?.intakeId;

    if (!intakeId) {
      return false;
    }

    setFounderMediaReviewAction("approve");
    setFounderMediaReviewError("");

    try {
      const response = await fetch(
        AGV_SERVER_API_BASE +
          "/api/media/review/" +
          encodeURIComponent(intakeId) +
          "/approve",
        {
          method: "POST",
          headers: getNetworkAdminHeaders(true),
          body: JSON.stringify({
            note: founderMediaReviewNote.trim(),
          }),
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result?.ok) {
        throw new Error(
          result?.error ||
            "Could not approve this media intake."
        );
      }

      setSelectedFounderMediaReview(result.intake);
      setFounderMediaReviewNote("");
      await loadFounderMediaReviewItems();
      setNetworkMessage(result.message || "Media approved.");
      return true;
    } catch (error) {
      const message =
        error?.message ||
        "Could not approve this media intake.";

      setFounderMediaReviewError(message);
      setNetworkMessage(message);
      return false;
    } finally {
      setFounderMediaReviewAction("");
    }
  }

  async function rejectFounderMediaReview() {
    const intakeId = selectedFounderMediaReview?.intakeId;
    const reason = founderMediaRejectReason.trim();

    if (!intakeId) {
      return false;
    }

    if (!reason) {
      setFounderMediaReviewError(
        "Enter a rejection reason before rejecting the media."
      );
      return false;
    }

    setFounderMediaReviewAction("reject");
    setFounderMediaReviewError("");

    try {
      const response = await fetch(
        AGV_SERVER_API_BASE +
          "/api/media/review/" +
          encodeURIComponent(intakeId) +
          "/reject",
        {
          method: "POST",
          headers: getNetworkAdminHeaders(true),
          body: JSON.stringify({ reason }),
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result?.ok) {
        throw new Error(
          result?.error ||
            "Could not reject this media intake."
        );
      }

      setSelectedFounderMediaReview(result.intake);
      setFounderMediaRejectReason("");
      setFounderMediaPreviewUrl("");
      await loadFounderMediaReviewItems();
      setNetworkMessage(result.message || "Media rejected.");
      return true;
    } catch (error) {
      const message =
        error?.message ||
        "Could not reject this media intake.";

      setFounderMediaReviewError(message);
      setNetworkMessage(message);
      return false;
    } finally {
      setFounderMediaReviewAction("");
    }
  }

  // PASS CU-10G3A CONTROLLED PUBLIC RIGHTS CLIENT FOUNDATION
  async function loadControlledMediaRightsQueue() {
    const token = getAgvServerAuthToken();

    if (!token) {
      const message =
        "A verified AGV Founder/Super Admin session is required.";

      setControlledRightsError(message);
      setNetworkMessage(message);
      return false;
    }

    setControlledRightsLoading(true);
    setControlledRightsError("");

    try {
      const response = await fetch(
        AGV_SERVER_API_BASE + "/api/media/rights",
        {
          method: "GET",
          headers: getNetworkAdminHeaders(),
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result?.ok) {
        throw new Error(
          result?.error ||
            "Could not load the controlled media rights queue."
        );
      }

      const items = Array.isArray(result.items)
        ? result.items
        : [];

      setControlledRightsItems(items);

      const selectedId =
        selectedFounderMediaReview?.intakeId;

      const selectedRightsItem = items.find(
        (item) => item.intakeId === selectedId
      );

      if (selectedRightsItem?.rightsClearance) {
        const rights = selectedRightsItem.rightsClearance;

        setControlledRightsBasis(
          rights.rightsBasis || "OWNED_ORIGINAL"
        );
        setControlledRightsEvidence(
          rights.evidenceReference || ""
        );
        setControlledRightsLicenseType(
          rights.licenseType || ""
        );
        setControlledRightsLicenseUrl(
          rights.licenseUrl || ""
        );
        setControlledRightsSourceUrl(
          rights.sourceUrl || ""
        );
        setControlledRightsAttribution(
          rights.attribution ||
            selectedFounderMediaReview?.attribution ||
            ""
        );
        setControlledRightsNotes(rights.notes || "");
      } else {
        setControlledRightsAttribution(
          selectedFounderMediaReview?.attribution || ""
        );
      }

      setNetworkMessage(
        "Loaded " +
          items.length +
          " controlled rights-review item" +
          (items.length === 1 ? "." : "s.")
      );

      return true;
    } catch (error) {
      const message =
        error?.message ||
        "Could not load the controlled media rights queue.";

      setControlledRightsError(message);
      setNetworkMessage(message);
      return false;
    } finally {
      setControlledRightsLoading(false);
    }
  }

  function getSelectedControlledRightsItem() {
    const intakeId =
      selectedFounderMediaReview?.intakeId;

    return (
      controlledRightsItems.find(
        (item) => item.intakeId === intakeId
      ) || null
    );
  }

  async function submitControlledMediaRightsReview() {
    const intakeId =
      selectedFounderMediaReview?.intakeId;

    if (!intakeId) {
      setControlledRightsError(
        "Select an uploaded media item before submitting rights evidence."
      );
      return false;
    }

    if (!controlledRightsEvidence.trim()) {
      setControlledRightsError(
        "Enter the rights evidence reference before submission."
      );
      return false;
    }

    setControlledRightsAction("submit");
    setControlledRightsError("");

    try {
      const response = await fetch(
        AGV_SERVER_API_BASE +
          "/api/media/review/" +
          encodeURIComponent(intakeId) +
          "/rights/pending",
        {
          method: "POST",
          headers: getNetworkAdminHeaders(true),
          body: JSON.stringify({
            rightsBasis: controlledRightsBasis,
            evidenceReference:
              controlledRightsEvidence.trim(),
            licenseType:
              controlledRightsLicenseType.trim(),
            licenseUrl:
              controlledRightsLicenseUrl.trim(),
            sourceUrl:
              controlledRightsSourceUrl.trim(),
            attribution:
              controlledRightsAttribution.trim(),
            notes: controlledRightsNotes.trim(),
          }),
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result?.ok) {
        throw new Error(
          result?.error ||
            "Could not submit this item for rights review."
        );
      }

      setSelectedFounderMediaReview(result.intake);
      await loadControlledMediaRightsQueue();
      await loadFounderMediaReviewItems();
      setNetworkMessage(
        result.message ||
          "Media submitted for controlled rights review."
      );

      return true;
    } catch (error) {
      const message =
        error?.message ||
        "Could not submit this item for rights review.";

      setControlledRightsError(message);
      setNetworkMessage(message);
      return false;
    } finally {
      setControlledRightsAction("");
    }
  }

  async function clearControlledMediaRights() {
    const intakeId =
      selectedFounderMediaReview?.intakeId;

    if (!intakeId) {
      return false;
    }

    if (
      !controlledRightsCertifyAuthority ||
      !controlledRightsCertifyEvidence ||
      !controlledRightsCertifyPublicUse
    ) {
      setControlledRightsError(
        "All three Founder rights certifications must be affirmed."
      );
      return false;
    }

    if (!controlledRightsCertification.trim()) {
      setControlledRightsError(
        "Enter a Founder certification statement before clearance."
      );
      return false;
    }

    setControlledRightsAction("clear");
    setControlledRightsError("");

    try {
      const response = await fetch(
        AGV_SERVER_API_BASE +
          "/api/media/review/" +
          encodeURIComponent(intakeId) +
          "/rights/clear",
        {
          method: "POST",
          headers: getNetworkAdminHeaders(true),
          body: JSON.stringify({
            certifyAuthority: true,
            certifyEvidenceAccurate: true,
            certifyPublicUseAllowed: true,
            certificationStatement:
              controlledRightsCertification.trim(),
          }),
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result?.ok) {
        throw new Error(
          result?.error ||
            "Could not save the Founder rights clearance."
        );
      }

      setSelectedFounderMediaReview(result.intake);
      setControlledRightsCertification("");
      setControlledRightsCertifyAuthority(false);
      setControlledRightsCertifyEvidence(false);
      setControlledRightsCertifyPublicUse(false);
      await loadControlledMediaRightsQueue();
      await loadFounderMediaReviewItems();
      setNetworkMessage(
        result.message ||
          "Rights cleared for a future controlled public-publishing pass."
      );

      return true;
    } catch (error) {
      const message =
        error?.message ||
        "Could not save the Founder rights clearance.";

      setControlledRightsError(message);
      setNetworkMessage(message);
      return false;
    } finally {
      setControlledRightsAction("");
    }
  }

  async function revokeControlledMediaRights() {
    const intakeId =
      selectedFounderMediaReview?.intakeId;
    const reason =
      controlledRightsRevocationReason.trim();

    if (!intakeId) {
      return false;
    }

    if (!reason) {
      setControlledRightsError(
        "Enter a rights-revocation reason before continuing."
      );
      return false;
    }

    setControlledRightsAction("revoke");
    setControlledRightsError("");

    try {
      const response = await fetch(
        AGV_SERVER_API_BASE +
          "/api/media/review/" +
          encodeURIComponent(intakeId) +
          "/rights/revoke",
        {
          method: "POST",
          headers: getNetworkAdminHeaders(true),
          body: JSON.stringify({ reason }),
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result?.ok) {
        throw new Error(
          result?.error ||
            "Could not revoke public-publishing eligibility."
        );
      }

      setSelectedFounderMediaReview(result.intake);
      setControlledRightsRevocationReason("");
      await loadControlledMediaRightsQueue();
      await loadFounderMediaReviewItems();
      setNetworkMessage(
        result.message ||
          "Public-publishing eligibility has been revoked."
      );

      return true;
    } catch (error) {
      const message =
        error?.message ||
        "Could not revoke public-publishing eligibility.";

      setControlledRightsError(message);
      setNetworkMessage(message);
      return false;
    } finally {
      setControlledRightsAction("");
    }
  }
    // PASS CU-10H4 FOUNDER PUBLIC PUBLISHING CLIENT CONTROLS
  function refreshSelectedPublicPublicationFields(intake) {
    if (!intake) {
      return;
    }

    setControlledPublicTitle(
      intake?.publicPublication?.publicTitle || intake.title || ""
    );
    setControlledPublicDescription(
      intake?.publicPublication?.publicDescription ||
        intake.description || ""
    );
    setControlledPublicAttribution(
      intake?.publicPublication?.publicAttribution ||
        intake?.rightsClearance?.attribution ||
        intake.attribution || ""
    );

    const refreshedPublicationMode =
      intake?.publicAccess === true
        ? "ENABLED"
        : intake?.publicPublication?.publicationMode ===
            "SCHEDULED" ||
          intake?.publicationControl?.mode ===
            "SCHEDULED"
          ? "SCHEDULED"
          : "DISABLED";

    const refreshedScheduledPublishAt =
      intake?.publicPublication?.scheduledPublishAt ||
      intake?.publicationControl?.scheduledPublishAt ||
      "";

    const parsedRefreshedPublishAt =
      refreshedScheduledPublishAt
        ? new Date(refreshedScheduledPublishAt)
        : null;

    setControlledPublicAccessMode(
      refreshedPublicationMode
    );

    setControlledPublicPublishAt(
      parsedRefreshedPublishAt &&
      Number.isFinite(parsedRefreshedPublishAt.getTime())
        ? parsedRefreshedPublishAt
            .toLocaleString("sv-SE", {
              hour12: false,
            })
            .replace(" ", "T")
            .slice(0, 16)
        : ""
    );
  }

  async function stageFounderMediaForPublicPublication() {
    const intakeId = selectedFounderMediaReview?.intakeId;

    if (!intakeId) {
      setControlledPublicPublicationError(
        "Select a Founder-reviewed media item before public staging."
      );
      return false;
    }

    if (
      selectedFounderMediaReview?.status !==
      "PUBLISHED_PRIVATE_TEST"
    ) {
      setControlledPublicPublicationError(
        "The item must be active in the Owner-private library before public staging."
      );
      return false;
    }

    // PASS FPA-05 - FOUNDER SUBMISSION IS THE CLIENT AUTHORIZATION
    const founderOwnedOriginalRequest =
      selectedFounderMediaReview?.source !==
        "AGV_CONTENT_PARTNER_PORTAL" &&
      !selectedFounderMediaReview?.partnerSubmissionId &&
      (selectedFounderMediaReview?.source ===
        "AGV_FOUNDER_CONTROLLED_INTAKE" ||
        (!selectedFounderMediaReview?.source &&
          selectedFounderMediaReview?.createdBy?.globalRole ===
            "superadmin"));

    const rightsStatus =
      getSelectedControlledRightsItem()?.rightsClearance?.status ||
      selectedFounderMediaReview?.rightsClearance?.status ||
      "";

    if (
      !founderOwnedOriginalRequest &&
      rightsStatus !== "CLEARED_FOR_PUBLIC_PUBLISHING"
    ) {
      setControlledPublicPublicationError(
        "Separate rights clearance is required for Partner or outside content."
      );
      return false;
    }

    if (controlledPublicAccessMode === "DISABLED") {
      setControlledPublicPublicationError(
        "Public access remains disabled. Choose Enabled or Scheduled to continue."
      );
      return false;
    }

    if (controlledPublicAccessMode === "SCHEDULED") {
      const scheduledTime = new Date(
        controlledPublicPublishAt
      ).getTime();

      if (
        !controlledPublicPublishAt ||
        !Number.isFinite(scheduledTime) ||
        scheduledTime <= Date.now()
      ) {
        setControlledPublicPublicationError(
          "Select a valid future publication date and time."
        );
        return false;
      }
    }

    setControlledPublicPublicationAction("stage");
    setControlledPublicPublicationError("");

    try {
      const response = await fetch(
        AGV_SERVER_API_BASE +
          "/api/media/review/" +
          encodeURIComponent(intakeId) +
          "/public-stage",
        {
          method: "POST",
          headers: getNetworkAdminHeaders(true),
          body: JSON.stringify({
            publicTitle:
              controlledPublicTitle.trim() ||
              selectedFounderMediaReview.title,
            publicDescription:
              controlledPublicDescription.trim(),
            publicAttribution:
              controlledPublicAttribution.trim(),
            founderOwnedOriginal:
              founderOwnedOriginalRequest,
            publishAt:
              controlledPublicAccessMode === "SCHEDULED"
                ? new Date(
                    controlledPublicPublishAt
                  ).toISOString()
                : "",
          }),
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result?.ok) {
        throw new Error(
          result?.error ||
            "Could not stage this media for controlled public publication."
        );
      }

      setSelectedFounderMediaReview(result.intake);
      refreshSelectedPublicPublicationFields(result.intake);
      setControlledPublicConfirmation("");
      setControlledPublicRemovalReason("");
      await loadFounderMediaReviewItems();
      await loadControlledMediaRightsQueue();
      setNetworkMessage(
        result.message ||
          "Media staged for controlled public publication."
      );
      return true;
    } catch (error) {
      const message =
        error?.message ||
        "Could not stage this media for controlled public publication.";

      setControlledPublicPublicationError(message);
      setNetworkMessage(message);
      return false;
    } finally {
      setControlledPublicPublicationAction("");
    }
  }

  async function unstageFounderMediaFromPublicPublication() {
    const intakeId = selectedFounderMediaReview?.intakeId;
    const reason = controlledPublicRemovalReason.trim();

    if (!intakeId) {
      return false;
    }

    if (!reason) {
      setControlledPublicPublicationError(
        "Enter a reason before removing the item from public staging."
      );
      return false;
    }

    setControlledPublicPublicationAction("unstage");
    setControlledPublicPublicationError("");

    try {
      const response = await fetch(
        AGV_SERVER_API_BASE +
          "/api/media/review/" +
          encodeURIComponent(intakeId) +
          "/public-unstage",
        {
          method: "POST",
          headers: getNetworkAdminHeaders(true),
          body: JSON.stringify({ reason }),
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result?.ok) {
        throw new Error(
          result?.error ||
            "Could not remove this media from public staging."
        );
      }

      setSelectedFounderMediaReview(result.intake);
      refreshSelectedPublicPublicationFields(result.intake);
      setControlledPublicRemovalReason("");
      setControlledPublicConfirmation("");
      await loadFounderMediaReviewItems();
      setNetworkMessage(
        result.message ||
          "Media removed from public-publication staging."
      );
      return true;
    } catch (error) {
      const message =
        error?.message ||
        "Could not remove this media from public staging.";

      setControlledPublicPublicationError(message);
      setNetworkMessage(message);
      return false;
    } finally {
      setControlledPublicPublicationAction("");
    }
  }

  async function activateFounderMediaPublicly() {
    const intakeId = selectedFounderMediaReview?.intakeId;
    const confirmation = controlledPublicConfirmation.trim();

    if (!intakeId) {
      return false;
    }

    if (confirmation !== "PUBLISH PUBLICLY") {
      setControlledPublicPublicationError(
        "Enter the exact Founder confirmation phrase: PUBLISH PUBLICLY"
      );
      return false;
    }

    setControlledPublicPublicationAction("activate");
    setControlledPublicPublicationError("");

    try {
      const response = await fetch(
        AGV_SERVER_API_BASE +
          "/api/media/review/" +
          encodeURIComponent(intakeId) +
          "/public-activate",
        {
          method: "POST",
          headers: getNetworkAdminHeaders(true),
          body: JSON.stringify({ confirmation }),
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result?.ok) {
        throw new Error(
          result?.error ||
            "Could not activate this media for public playback."
        );
      }

      setSelectedFounderMediaReview(result.intake);
      refreshSelectedPublicPublicationFields(result.intake);
      setControlledPublicConfirmation("");
      setControlledPublicRemovalReason("");
      await loadFounderMediaReviewItems();
      setNetworkMessage(
        result.message ||
          "Media is now publicly available through AGV Network."
      );
      return true;
    } catch (error) {
      const message =
        error?.message ||
        "Could not activate this media for public playback.";

      setControlledPublicPublicationError(message);
      setNetworkMessage(message);
      return false;
    } finally {
      setControlledPublicPublicationAction("");
    }
  }

  async function emergencyUnpublishFounderMedia() {
    const intakeId = selectedFounderMediaReview?.intakeId;
    const reason = controlledPublicRemovalReason.trim();

    if (!intakeId) {
      return false;
    }

    if (!reason) {
      setControlledPublicPublicationError(
        "Enter an emergency-unpublish reason before continuing."
      );
      return false;
    }

    setControlledPublicPublicationAction("emergency");
    setControlledPublicPublicationError("");

    try {
      const response = await fetch(
        AGV_SERVER_API_BASE +
          "/api/media/review/" +
          encodeURIComponent(intakeId) +
          "/emergency-unpublish",
        {
          method: "POST",
          headers: getNetworkAdminHeaders(true),
          body: JSON.stringify({ reason }),
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result?.ok) {
        throw new Error(
          result?.error ||
            "Could not stop public access to this media."
        );
      }

      setSelectedFounderMediaReview(result.intake);
      refreshSelectedPublicPublicationFields(result.intake);
      setControlledPublicRemovalReason("");
      setControlledPublicConfirmation("");
      setFounderMediaPreviewUrl("");
      setFounderMediaPreviewExpiresAt("");
      await loadFounderMediaReviewItems();
      setNetworkMessage(
        result.message ||
          "Public access stopped. Owner-private access remains available."
      );
      return true;
    } catch (error) {
      const message =
        error?.message ||
        "Could not stop public access to this media.";

      setControlledPublicPublicationError(message);
      setNetworkMessage(message);
      return false;
    } finally {
      setControlledPublicPublicationAction("");
    }
  }
// PASS CU-10E3 PRIVATE AGV NETWORK PUBLISH CONTROLS
  async function publishFounderMediaToPrivateNetwork() {
    const intakeId = selectedFounderMediaReview?.intakeId;

    if (!intakeId) {
      setFounderMediaReviewError(
        "Select an approved media item before publishing."
      );
      return false;
    }

    const allowedStatuses = [
      "APPROVED_FOR_PRIVATE_PUBLISHING",
      "UNPUBLISHED",
    ];

    if (
      !allowedStatuses.includes(
        selectedFounderMediaReview?.status
      )
    ) {
      setFounderMediaReviewError(
        "This item is not approved for private publishing."
      );
      return false;
    }

    setFounderMediaReviewAction("publish");
    setFounderMediaReviewError("");

    try {
      const response = await fetch(
        AGV_SERVER_API_BASE +
          "/api/media/review/" +
          encodeURIComponent(intakeId) +
          "/publish",
        {
          method: "POST",
          headers: getNetworkAdminHeaders(true),
          body: JSON.stringify({}),
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result?.ok) {
        throw new Error(
          result?.error ||
            "Could not publish this media to the private AGV Network library."
        );
      }

      setSelectedFounderMediaReview(result.intake);
      await loadFounderMediaReviewItems();
      setNetworkMessage(
        result.message ||
          "Media published to the private AGV Network test library."
      );

      return true;
    } catch (error) {
      const message =
        error?.message ||
        "Could not publish this media to the private AGV Network library.";

      setFounderMediaReviewError(message);
      setNetworkMessage(message);
      return false;
    } finally {
      setFounderMediaReviewAction("");
    }
  }

  async function unpublishFounderMediaFromPrivateNetwork() {
    const intakeId = selectedFounderMediaReview?.intakeId;

    if (!intakeId) {
      return false;
    }

    if (
      selectedFounderMediaReview?.status !==
      "PUBLISHED_PRIVATE_TEST"
    ) {
      setFounderMediaReviewError(
        "Only privately published media can be unpublished."
      );
      return false;
    }

    setFounderMediaReviewAction("unpublish");
    setFounderMediaReviewError("");

    try {
      const response = await fetch(
        AGV_SERVER_API_BASE +
          "/api/media/review/" +
          encodeURIComponent(intakeId) +
          "/unpublish",
        {
          method: "POST",
          headers: getNetworkAdminHeaders(true),
          body: JSON.stringify({
            reason: "Founder removed private test publication",
          }),
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result?.ok) {
        throw new Error(
          result?.error ||
            "Could not unpublish this private AGV Network item."
        );
      }

      setSelectedFounderMediaReview(result.intake);
      setFounderMediaPreviewUrl("");
      setFounderMediaPreviewExpiresAt("");
      await loadFounderMediaReviewItems();
      setNetworkMessage(
        result.message ||
          "Media removed from the private AGV Network test library."
      );

      return true;
    } catch (error) {
      const message =
        error?.message ||
        "Could not unpublish this private AGV Network item.";

      setFounderMediaReviewError(message);
      setNetworkMessage(message);
      return false;
    } finally {
      setFounderMediaReviewAction("");
    }
  }

  // PASS CU-10F1 OWNER PRIVATE AGV NETWORK LIBRARY
  async function loadOwnerPrivateMediaLibrary() {
    const token = getAgvServerAuthToken();

    if (!token) {
      const message =
        "A verified AGV Founder/Super Admin session is required.";

      setOwnerPrivateMediaError(message);
      setNetworkMessage(message);
      return false;
    }

    setOwnerPrivateMediaLoading(true);
    setOwnerPrivateMediaError("");

    try {
      const response = await fetch(
        AGV_SERVER_API_BASE + "/api/media/library/private",
        {
          method: "GET",
          headers: getNetworkAdminHeaders(),
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result?.ok) {
        throw new Error(
          result?.error ||
            "Could not load the Owner-private AGV Network library."
        );
      }

      const items = Array.isArray(result.items)
        ? result.items
        : [];

      setOwnerPrivateMediaItems(items);

      setSelectedOwnerPrivateMedia((current) => {
        if (!items.length) {
          return null;
        }

        const currentId = current?.intakeId;

        return (
          items.find((item) => item.intakeId === currentId) ||
          items[0]
        );
      });

      setNetworkMessage(
        "Loaded " +
          items.length +
          " Owner-private AGV Network item" +
          (items.length === 1 ? "." : "s.")
      );

      return true;
    } catch (error) {
      const message =
        error?.message ||
        "Could not load the Owner-private AGV Network library.";

      setOwnerPrivateMediaError(message);
      setNetworkMessage(message);
      return false;
    } finally {
      setOwnerPrivateMediaLoading(false);
    }
  }

  function selectOwnerPrivateMediaItem(item) {
    setSelectedOwnerPrivateMedia(item || null);
    setOwnerPrivateMediaPreviewUrl("");
    setOwnerPrivateMediaPreviewExpiresAt("");
    setOwnerPrivateMediaError("");
    setOwnerPrivatePublicError("");
    setOwnerPrivatePublicConfirmation("");
    setOwnerPrivateMediaRemovalConfirmation("");
    setOwnerPartnerTakedownReason("");
    setOwnerPartnerViolationCategory(
      "PLATFORM_POLICY_VIOLATION"
    );
    setOwnerPartnerTakedownConfirmation("");

    const storedMode =
      item?.publicAccess === true
        ? "ENABLED"
        : item?.publicPublication?.publicationMode ===
            "SCHEDULED" ||
          item?.publicationControl?.mode ===
            "SCHEDULED"
          ? "SCHEDULED"
          : "DISABLED";

    const storedPublishAt =
      item?.publicPublication?.scheduledPublishAt ||
      item?.publicationControl?.scheduledPublishAt ||
      "";

    const parsedPublishAt = storedPublishAt
      ? new Date(storedPublishAt)
      : null;

    setOwnerPrivatePublicAccessMode(storedMode);
    setOwnerPrivatePublicPublishAt(
      parsedPublishAt &&
      Number.isFinite(parsedPublishAt.getTime())
        ? parsedPublishAt
            .toLocaleString("sv-SE", {
              hour12: false,
            })
            .replace(" ", "T")
            .slice(0, 16)
        : ""
    );
  }

  // PASS FAD-02 - FOUNDER ADMIN HUMAN REVIEW CLIENT
  function getFounderAdminDecisionDefaultBasis(item) {
    const existingBasis = String(
      item?.rightsClearance?.rightsBasis ||
        item?.rightsBasis ||
        ""
    )
      .trim()
      .toUpperCase();

    const allowedBases = new Set([
      "OFFICIAL_PROVIDER_EMBED",
      "PUBLIC_DOMAIN",
      "GOVERNMENT_WORK",
      "LICENSED",
      "WRITTEN_PERMISSION",
    ]);

    if (allowedBases.has(existingBasis)) {
      return existingBasis;
    }

    const sourceType = String(
      item?.sourceType ||
        item?.externalMedia?.sourceType ||
        ""
    )
      .trim()
      .toUpperCase();

    if (
      existingBasis === "EXTERNAL_PROVIDER_EMBED" ||
      sourceType === "YOUTUBE" ||
      item?.youtubeVideoId ||
      item?.videoId
    ) {
      return "OFFICIAL_PROVIDER_EMBED";
    }

    if (
      existingBasis.includes("PUBLIC_DOMAIN")
    ) {
      return "PUBLIC_DOMAIN";
    }

    if (
      existingBasis.includes("GOVERNMENT")
    ) {
      return "GOVERNMENT_WORK";
    }

    if (
      existingBasis.includes("LICENSE")
    ) {
      return "LICENSED";
    }

    if (
      existingBasis.includes("PERMISSION")
    ) {
      return "WRITTEN_PERMISSION";
    }

    return "OFFICIAL_PROVIDER_EMBED";
  }

  function openFounderAdminDecision(
    item,
    contextKey
  ) {
    if (!item?.intakeId) {
      return;
    }

    const sourceUrl = String(
      item?.rightsClearance?.sourceUrl ||
        item?.sourceUrl ||
        item?.youtubeUrl ||
        item?.directSourceUrl ||
        item?.externalDownloadUrl ||
        ""
    ).trim();

    const attribution = String(
      item?.rightsClearance?.attribution ||
        item?.attribution ||
        item?.provider ||
        ""
    ).trim();

    setFounderAdminDecisionBasis(
      getFounderAdminDecisionDefaultBasis(
        item
      )
    );

    setFounderAdminDecisionEvidence(
      String(
        item?.rightsClearance
          ?.evidenceReference ||
          sourceUrl
      ).trim()
    );

    setFounderAdminDecisionSourceUrl(
      sourceUrl
    );

    setFounderAdminDecisionAttribution(
      attribution
    );

    setFounderAdminDecisionNote(
      ""
    );

    setFounderAdminDecisionAttestation(
      "I personally reviewed this content, its source, and the available rights information. I approve it for AGV publication eligibility under the selected basis."
    );

    setFounderAdminDecisionAffirmed(
      false
    );

    setFounderAdminDecisionError(
      ""
    );

    setFounderAdminDecisionOpenContext(
      contextKey
    );
  }

  function closeFounderAdminDecision() {
    if (founderAdminDecisionAction) {
      return;
    }

    setFounderAdminDecisionOpenContext(
      ""
    );

    setFounderAdminDecisionError(
      ""
    );

    setFounderAdminDecisionAffirmed(
      false
    );
  }

  async function saveFounderAdminDecision(
    item,
    contextKey
  ) {
    const intakeId =
      item?.intakeId;

    if (!intakeId) {
      setFounderAdminDecisionError(
        "Select a media item before saving a Founder Admin Decision."
      );
      return false;
    }

    if (
      founderAdminDecisionNote.trim()
        .length < 10
    ) {
      setFounderAdminDecisionError(
        "Enter a meaningful Founder review decision of at least 10 characters."
      );
      return false;
    }

    if (
      founderAdminDecisionAttestation
        .trim().length < 20
    ) {
      setFounderAdminDecisionError(
        "Enter a Founder human-review attestation of at least 20 characters."
      );
      return false;
    }

    if (
      !founderAdminDecisionEvidence.trim() &&
      !founderAdminDecisionSourceUrl.trim()
    ) {
      setFounderAdminDecisionError(
        "Enter an evidence reference or official source URL."
      );
      return false;
    }

    if (
      !founderAdminDecisionAttribution.trim()
    ) {
      setFounderAdminDecisionError(
        "Enter the provider attribution."
      );
      return false;
    }

    if (
      !founderAdminDecisionAffirmed
    ) {
      setFounderAdminDecisionError(
        "Confirm that this is your personal Founder human-review decision."
      );
      return false;
    }

    setFounderAdminDecisionAction(
      contextKey
    );

    setFounderAdminDecisionError(
      ""
    );

    try {
      const response = await fetch(
        AGV_SERVER_API_BASE +
          "/api/media/review/" +
          encodeURIComponent(intakeId) +
          "/founder-admin-decision",
        {
          method: "POST",
          headers:
            getNetworkAdminHeaders(
              true
            ),
          body: JSON.stringify({
            decisionBasis:
              founderAdminDecisionBasis,

            evidenceReference:
              founderAdminDecisionEvidence.trim(),

            sourceUrl:
              founderAdminDecisionSourceUrl.trim(),

            attribution:
              founderAdminDecisionAttribution.trim(),

            founderDecisionNote:
              founderAdminDecisionNote.trim(),

            certificationStatement:
              founderAdminDecisionAttestation.trim(),

            confirmation:
              "SAVE FOUNDER ADMIN DECISION",
          }),
        }
      );

      const result = await response
        .json()
        .catch(() => ({}));

      if (
        !response.ok ||
        !result?.ok
      ) {
        throw new Error(
          result?.error ||
            "Could not save the Founder Admin Decision."
        );
      }

      const updatedIntake =
        result.intake;

      if (
        selectedFounderMediaReview
          ?.intakeId === intakeId
      ) {
        setSelectedFounderMediaReview(
          updatedIntake
        );
      }

      if (
        selectedOwnerPrivateMedia
          ?.intakeId === intakeId
      ) {
        setSelectedOwnerPrivateMedia(
          updatedIntake
        );
      }

      setOwnerPrivateMediaItems(
        (items) =>
          items.map((entry) =>
            entry?.intakeId ===
            intakeId
              ? updatedIntake
              : entry
          )
      );

      await loadControlledMediaRightsQueue();
      await loadFounderMediaReviewItems();

      setControlledPublicPublicationError(
        ""
      );

      setOwnerPrivatePublicError(
        ""
      );

      setFounderAdminDecisionOpenContext(
        ""
      );

      setFounderAdminDecisionAffirmed(
        false
      );

      setNetworkMessage(
        result.message ||
          "Founder Admin Decision saved. Public activation still requires a separate Founder Public Access Decision."
      );

      return true;
    } catch (error) {
      const message =
        error?.message ||
        "Could not save the Founder Admin Decision.";

      setFounderAdminDecisionError(
        message
      );

      setNetworkMessage(message);

      return false;
    } finally {
      setFounderAdminDecisionAction(
        ""
      );
    }
  }

  function renderFounderAdminDecisionPanel(
    item,
    contextKey
  ) {
    if (!item?.intakeId) {
      return null;
    }

    const isOpen =
      founderAdminDecisionOpenContext ===
      contextKey;

    if (!isOpen) {
      return (
        <button
          type="button"
          onClick={() =>
            openFounderAdminDecision(
              item,
              contextKey
            )
          }
          style={{
            ...styles.primaryButton,
            marginTop: 10,
            width: "100%",
          }}
        >
          Save as Admin — Founder Review Decision
        </button>
      );
    }

    const isSaving =
      founderAdminDecisionAction ===
      contextKey;

    const fieldStyle = {
      width: "100%",
      padding: 10,
      borderRadius: 8,
      border:
        "1px solid rgba(250, 204, 21, 0.28)",
      background:
        "rgba(2, 6, 23, 0.72)",
      color: "#f8fafc",
      boxSizing: "border-box",
    };

    return (
      <div
        style={{
          marginTop: 11,
          padding: 14,
          borderRadius: 11,
          border:
            "1px solid rgba(250, 204, 21, 0.42)",
          background:
            "rgba(120, 83, 9, 0.12)",
        }}
      >
        <div
          style={{
            color: "#fde68a",
            fontWeight: 900,
            fontSize: 14,
          }}
        >
          Founder Human Review Decision
        </div>

        <div
          style={{
            marginTop: 6,
            color: "#cbd5e1",
            fontSize: 12,
            lineHeight: 1.55,
          }}
        >
          This records your human decision and
          public-publication eligibility. It
          does not publish the media
          automatically.
        </div>

        <div
          style={{
            display: "grid",
            gap: 11,
            marginTop: 13,
          }}
        >
          <label
            style={{
              display: "grid",
              gap: 5,
              color: "#e2e8f0",
              fontSize: 12,
            }}
          >
            Founder decision basis
            <select
              value={
                founderAdminDecisionBasis
              }
              onChange={(event) =>
                setFounderAdminDecisionBasis(
                  event.target.value
                )
              }
              style={fieldStyle}
            >
              <option value="OFFICIAL_PROVIDER_EMBED">
                Official provider embed
              </option>
              <option value="PUBLIC_DOMAIN">
                Verified public domain
              </option>
              <option value="GOVERNMENT_WORK">
                Government work
              </option>
              <option value="LICENSED">
                Licensed content
              </option>
              <option value="WRITTEN_PERMISSION">
                Written permission
              </option>
            </select>
          </label>

          <label
            style={{
              display: "grid",
              gap: 5,
              color: "#e2e8f0",
              fontSize: 12,
            }}
          >
            Evidence reference
            <input
              value={
                founderAdminDecisionEvidence
              }
              onChange={(event) =>
                setFounderAdminDecisionEvidence(
                  event.target.value
                )
              }
              placeholder="Official channel, archive evidence, license, agreement, or permission reference"
              style={fieldStyle}
            />
          </label>

          <label
            style={{
              display: "grid",
              gap: 5,
              color: "#e2e8f0",
              fontSize: 12,
            }}
          >
            Official source URL
            <input
              value={
                founderAdminDecisionSourceUrl
              }
              onChange={(event) =>
                setFounderAdminDecisionSourceUrl(
                  event.target.value
                )
              }
              placeholder="https://..."
              style={fieldStyle}
            />
          </label>

          <label
            style={{
              display: "grid",
              gap: 5,
              color: "#e2e8f0",
              fontSize: 12,
            }}
          >
            Provider attribution
            <input
              value={
                founderAdminDecisionAttribution
              }
              onChange={(event) =>
                setFounderAdminDecisionAttribution(
                  event.target.value
                )
              }
              placeholder="Provider or rights holder"
              style={fieldStyle}
            />
          </label>

          <label
            style={{
              display: "grid",
              gap: 5,
              color: "#e2e8f0",
              fontSize: 12,
            }}
          >
            Founder review decision
            <textarea
              value={
                founderAdminDecisionNote
              }
              onChange={(event) =>
                setFounderAdminDecisionNote(
                  event.target.value
                )
              }
              rows={4}
              placeholder="Describe what you reviewed and why you approve or decline publication eligibility."
              style={{
                ...fieldStyle,
                resize: "vertical",
              }}
            />
          </label>

          <label
            style={{
              display: "grid",
              gap: 5,
              color: "#e2e8f0",
              fontSize: 12,
            }}
          >
            Founder attestation
            <textarea
              value={
                founderAdminDecisionAttestation
              }
              onChange={(event) =>
                setFounderAdminDecisionAttestation(
                  event.target.value
                )
              }
              rows={4}
              style={{
                ...fieldStyle,
                resize: "vertical",
              }}
            />
          </label>

          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 9,
              color: "#fef3c7",
              fontSize: 12,
              lineHeight: 1.5,
            }}
          >
            <input
              type="checkbox"
              checked={
                founderAdminDecisionAffirmed
              }
              onChange={(event) =>
                setFounderAdminDecisionAffirmed(
                  event.target.checked
                )
              }
              style={{
                marginTop: 3,
              }}
            />

            <span>
              I confirm that I personally
              reviewed this media and am saving
              this as my Founder human-review
              decision.
            </span>
          </label>

          {founderAdminDecisionError ? (
            <div
              style={{
                padding: 10,
                borderRadius: 8,
                border:
                  "1px solid rgba(248, 113, 113, 0.42)",
                background:
                  "rgba(127, 29, 29, 0.2)",
                color: "#fecaca",
                fontSize: 12,
              }}
            >
              {founderAdminDecisionError}
            </div>
          ) : null}

          <div
            style={{
              display: "flex",
              gap: 9,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={() =>
                saveFounderAdminDecision(
                  item,
                  contextKey
                )
              }
              disabled={isSaving}
              style={{
                ...styles.primaryButton,
                flex: "1 1 260px",
              }}
            >
              {isSaving
                ? "Saving Founder Decision..."
                : "Save as Admin — Founder Review Decision"}
            </button>

            <button
              type="button"
              onClick={
                closeFounderAdminDecision
              }
              disabled={isSaving}
              style={{
                ...styles.primaryButton,
                flex: "0 1 120px",
                opacity: 0.76,
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  async function applyOwnerPrivatePublicAccessDecision() {
    const intakeId = selectedOwnerPrivateMedia?.intakeId;

    if (!intakeId) {
      setOwnerPrivatePublicError(
        "Select an Owner Private media item first."
      );
      return false;
    }

    if (ownerPrivatePublicAccessMode === "DISABLED") {
      if (
        selectedOwnerPrivateMedia?.status ===
        "PUBLICATION_READY_STAGED"
      ) {
        setOwnerPrivatePublicAction("disable");
        setOwnerPrivatePublicError("");

        try {
          const response = await fetch(
            AGV_SERVER_API_BASE +
              "/api/media/review/" +
              encodeURIComponent(intakeId) +
              "/public-unstage",
            {
              method: "POST",
              headers: getNetworkAdminHeaders(true),
              body: JSON.stringify({
                reason:
                  "Founder set Public Access to Disabled from Owner Private Media",
              }),
            }
          );

          const result = await response
            .json()
            .catch(() => ({}));

          if (!response.ok || !result?.ok) {
            throw new Error(
              result?.error ||
                "Could not disable public staging."
            );
          }

          setSelectedOwnerPrivateMedia(result.intake);
          setOwnerPrivatePublicPublishAt("");
          setOwnerPrivatePublicConfirmation("");
          setNetworkMessage(
            "Public Access is disabled. AGV ownership certification remains preserved."
          );
          return true;
        } catch (error) {
          const message =
            error?.message ||
            "Could not disable public access.";

          setOwnerPrivatePublicError(message);
          setNetworkMessage(message);
          return false;
        } finally {
          setOwnerPrivatePublicAction("");
        }
      }

      setOwnerPrivatePublicPublishAt("");
      setOwnerPrivatePublicConfirmation("");
      setOwnerPrivatePublicError("");
      setNetworkMessage(
        "Public Access remains disabled. AGV ownership certification was not changed."
      );
      return true;
    }

    const founderOwnedOriginalRequest =
      selectedOwnerPrivateMedia?.source !==
        "AGV_CONTENT_PARTNER_PORTAL" &&
      !selectedOwnerPrivateMedia?.partnerSubmissionId &&
      (selectedOwnerPrivateMedia?.source ===
        "AGV_FOUNDER_CONTROLLED_INTAKE" ||
        (!selectedOwnerPrivateMedia?.source &&
          selectedOwnerPrivateMedia?.createdBy?.globalRole ===
            "superadmin"));

    const rightsStatus =
      selectedOwnerPrivateMedia?.rightsClearance?.status ||
      "";

    if (
      !founderOwnedOriginalRequest &&
      rightsStatus !== "CLEARED_FOR_PUBLIC_PUBLISHING"
    ) {
      setOwnerPrivatePublicError(
        "Separate rights clearance is required for Partner or outside content."
      );
      return false;
    }

    let publishAt = null;

    if (ownerPrivatePublicAccessMode === "SCHEDULED") {
      const scheduledTime = new Date(
        ownerPrivatePublicPublishAt
      ).getTime();

      if (
        !ownerPrivatePublicPublishAt ||
        !Number.isFinite(scheduledTime) ||
        scheduledTime <= Date.now()
      ) {
        setOwnerPrivatePublicError(
          "Select a valid future publication date and time."
        );
        return false;
      }

      publishAt = new Date(
        ownerPrivatePublicPublishAt
      ).toISOString();
    }

    if (ownerPrivatePublicAccessMode === "ENABLED") {
      if (
        ownerPrivatePublicConfirmation.trim() !==
        "PUBLISH PUBLICLY"
      ) {
        setOwnerPrivatePublicError(
          "Enter the exact Founder confirmation phrase: PUBLISH PUBLICLY"
        );
        return false;
      }
    }

    setOwnerPrivatePublicAction("apply");
    setOwnerPrivatePublicError("");

    try {
      const stageResponse = await fetch(
        AGV_SERVER_API_BASE +
          "/api/media/review/" +
          encodeURIComponent(intakeId) +
          "/public-stage",
        {
          method: "POST",
          headers: getNetworkAdminHeaders(true),
          body: JSON.stringify({
            publicTitle:
              selectedOwnerPrivateMedia.title ||
              selectedOwnerPrivateMedia.filename,
            publicDescription:
              selectedOwnerPrivateMedia.description ||
              "",
            publicAttribution:
              selectedOwnerPrivateMedia?.rightsClearance
                ?.attribution ||
              selectedOwnerPrivateMedia.attribution ||
              "",
            founderOwnedOriginal:
              founderOwnedOriginalRequest,
            publishAt:
              ownerPrivatePublicAccessMode === "SCHEDULED"
                ? publishAt
                : "",
          }),
        }
      );

      const stageResult = await stageResponse
        .json()
        .catch(() => ({}));

      if (!stageResponse.ok || !stageResult?.ok) {
        throw new Error(
          stageResult?.error ||
            "Could not save the Founder public-access decision."
        );
      }

      let updatedIntake = stageResult.intake;

      if (ownerPrivatePublicAccessMode === "ENABLED") {
        const activateResponse = await fetch(
          AGV_SERVER_API_BASE +
            "/api/media/review/" +
            encodeURIComponent(intakeId) +
            "/public-activate",
          {
            method: "POST",
            headers: getNetworkAdminHeaders(true),
            body: JSON.stringify({
              confirmation: "PUBLISH PUBLICLY",
            }),
          }
        );

        const activateResult = await activateResponse
          .json()
          .catch(() => ({}));

        if (!activateResponse.ok || !activateResult?.ok) {
          throw new Error(
            activateResult?.error ||
              "The media was staged but could not be publicly activated."
          );
        }

        updatedIntake = activateResult.intake;
      }

      setSelectedOwnerPrivateMedia(updatedIntake);
      setOwnerPrivatePublicConfirmation("");

      setNetworkMessage(
        ownerPrivatePublicAccessMode === "ENABLED"
          ? "Public Access enabled. This media is now published on AGV Network."
          : "Scheduled publication saved. AGV ownership certification remains preserved."
      );

      return true;
    } catch (error) {
      const message =
        error?.message ||
        "Could not apply the Founder public-access decision.";

      setOwnerPrivatePublicError(message);
      setNetworkMessage(message);
      return false;
    } finally {
      setOwnerPrivatePublicAction("");
    }
  }

  // PASS YTI-02 - OWNER PRIVATE YOUTUBE PLAYBACK
  function ownerPrivateYouTubeEmbedUrl(item) {
    const sourceType = String(
      item?.sourceType ||
        item?.externalMedia?.sourceType ||
        ""
    )
      .trim()
      .toUpperCase();

    const videoId = String(
      item?.videoId ||
        item?.externalMedia?.videoId ||
        ""
    ).trim();

    if (
      sourceType !== "YOUTUBE" ||
      !/^[A-Za-z0-9_-]{11}$/.test(videoId)
    ) {
      return "";
    }

    const direct = String(
      item?.embedUrl ||
        item?.externalMedia?.embedUrl ||
        ""
    ).trim();

    return direct.startsWith(
      "https://www.youtube-nocookie.com/embed/"
    )
      ? direct
      : "https://www.youtube-nocookie.com/embed/" +
          encodeURIComponent(videoId) +
          "?autoplay=1&playsinline=1&controls=1&fs=1&rel=0";
  }

  // PASS PTK-03 - PARTNER MEDIA TAKEDOWN
  function isOwnerPartnerMediaItem(item) {
    return (
      item?.source ===
        "AGV_CONTENT_PARTNER_PORTAL" ||
      Boolean(item?.partnerSubmissionId)
    );
  }

  async function takeDownOwnerPartnerMediaItem() {
    const item = selectedOwnerPrivateMedia;
    const intakeId = item?.intakeId;

    if (!intakeId) {
      setOwnerPrivateMediaError(
        "Select a Partner media item before takedown."
      );
      return false;
    }

    if (!isOwnerPartnerMediaItem(item)) {
      setOwnerPrivateMediaError(
        "The selected item is not linked to a Partner Portal submission."
      );
      return false;
    }

    if (
      String(ownerPartnerTakedownReason)
        .trim()
        .length < 10
    ) {
      setOwnerPrivateMediaError(
        "Enter a meaningful violation reason of at least 10 characters."
      );
      return false;
    }

    if (
      ownerPartnerTakedownConfirmation !==
      "TAKE DOWN PARTNER MEDIA"
    ) {
      setOwnerPrivateMediaError(
        "Type TAKE DOWN PARTNER MEDIA exactly."
      );
      return false;
    }

    const title =
      item?.title ||
      item?.filename ||
      intakeId;

    const confirmed = window.confirm(
      'Immediately take down "' +
        title +
        '"?\n\n' +
        "Public playback will stop, the Partner submission will be suspended, " +
        "and the media will remain preserved as compliance evidence."
    );

    if (!confirmed) {
      return false;
    }

    setOwnerPartnerTakedownAction("takedown");
    setOwnerPrivateMediaError("");

    try {
      const response = await fetch(
        AGV_SERVER_API_BASE +
          "/api/media/review/" +
          encodeURIComponent(intakeId) +
          "/partner-takedown",
        {
          method: "POST",
          headers:
            getNetworkAdminHeaders(true),
          body: JSON.stringify({
            confirmation:
              "TAKE DOWN PARTNER MEDIA",
            reason:
              String(
                ownerPartnerTakedownReason
              ).trim(),
            violationCategory:
              ownerPartnerViolationCategory,
          }),
        }
      );

      const result = await response
        .json()
        .catch(() => ({}));

      if (!response.ok || !result?.ok) {
        throw new Error(
          result?.error ||
            "Could not take down the Partner media."
        );
      }

      const updatedItem =
        result?.intake || {
          ...item,
          status: "PUBLISHED_PRIVATE_TEST",
          visibility: "Private",
          publicAccess: false,
          moderationStatus:
            "PARTNER_TAKEDOWN_HOLD",
        };

      setOwnerPrivateMediaItems(
        (currentItems) =>
          currentItems.map((entry) =>
            entry.intakeId === intakeId
              ? updatedItem
              : entry
          )
      );

      setSelectedOwnerPrivateMedia(
        updatedItem
      );

      setOwnerPrivateMediaPreviewUrl("");
      setOwnerPrivateMediaPreviewExpiresAt("");
      setOwnerPrivatePublicAccessMode(
        "DISABLED"
      );
      setOwnerPrivatePublicConfirmation("");
      setOwnerPrivatePublicPublishAt("");
      setOwnerPartnerTakedownConfirmation("");

      setNetworkMessage(
        result?.message ||
          title +
            " was taken down and placed on a compliance hold."
      );

      return true;
    } catch (error) {
      const message =
        error?.message ||
        "Could not take down the Partner media.";

      setOwnerPrivateMediaError(message);
      setNetworkMessage(message);
      return false;
    } finally {
      setOwnerPartnerTakedownAction("");
    }
  }

  // PASS MRM-02 - REMOVE MEDIA FROM AGV
  async function removeOwnerPrivateMediaItem() {
    const item = selectedOwnerPrivateMedia;
    const intakeId = item?.intakeId;

    if (!intakeId) {
      setOwnerPrivateMediaError(
        "Select an Owner Private media item before removal."
      );
      return false;
    }

    if (
      ownerPrivateMediaRemovalConfirmation !==
      "REMOVE FROM AGV"
    ) {
      setOwnerPrivateMediaError(
        "Type REMOVE FROM AGV exactly before removing this media."
      );
      return false;
    }

    const title =
      item?.title ||
      item?.filename ||
      intakeId;

    const confirmed = window.confirm(
      'Permanently remove "' +
        title +
        '" from AGV?\n\n' +
        "This removes it from the private library and public AGV Network catalog. " +
        "An external YouTube video will remain on YouTube."
    );

    if (!confirmed) {
      return false;
    }

    setOwnerPrivateMediaRemovalAction("remove");
    setOwnerPrivateMediaError("");

    try {
      const response = await fetch(
        AGV_SERVER_API_BASE +
          "/api/media/review/" +
          encodeURIComponent(intakeId),
        {
          method: "DELETE",
          headers: getNetworkAdminHeaders(true),
          body: JSON.stringify({
            confirmation: "REMOVE FROM AGV",
          }),
        }
      );

      const result = await response
        .json()
        .catch(() => ({}));

      if (!response.ok || !result?.ok) {
        throw new Error(
          result?.error ||
            "Could not remove the media from AGV."
        );
      }

      const remainingItems =
        ownerPrivateMediaItems.filter(
          (entry) => entry.intakeId !== intakeId
        );

      setOwnerPrivateMediaItems(remainingItems);
      setSelectedOwnerPrivateMedia(
        remainingItems[0] || null
      );
      setOwnerPrivateMediaPreviewUrl("");
      setOwnerPrivateMediaPreviewExpiresAt("");
      setOwnerPrivateMediaRemovalConfirmation("");
      setOwnerPrivatePublicConfirmation("");
      setOwnerPrivatePublicAccessMode("DISABLED");
      setOwnerPrivatePublicPublishAt("");

      setNetworkMessage(
        result?.message ||
          title + " was permanently removed from AGV."
      );

      return true;
    } catch (error) {
      const message =
        error?.message ||
        "Could not remove the media from AGV.";

      setOwnerPrivateMediaError(message);
      setNetworkMessage(message);
      return false;
    } finally {
      setOwnerPrivateMediaRemovalAction("");
    }
  }

  async function playOwnerPrivateMediaItem() {
    const intakeId = selectedOwnerPrivateMedia?.intakeId;

    if (!intakeId) {
      setOwnerPrivateMediaError(
        "Select a private AGV Network item before playback."
      );
      return false;
    }

    setOwnerPrivateMediaAction("preview");
    setOwnerPrivateMediaError("");
    setOwnerPrivateMediaPreviewUrl("");
    setOwnerPrivateMediaPreviewExpiresAt("");

    const youtubeEmbedUrl =
      ownerPrivateYouTubeEmbedUrl(
        selectedOwnerPrivateMedia
      );

    if (youtubeEmbedUrl) {
      setOwnerPrivateMediaPreviewUrl(youtubeEmbedUrl);
      setOwnerPrivateMediaPreviewExpiresAt(
        "External YouTube source"
      );
      setNetworkMessage(
        "Owner-private YouTube playback opened for " +
          intakeId +
          "."
      );
      setOwnerPrivateMediaAction("");
      return true;
    }

    try {
      const response = await fetch(
        AGV_SERVER_API_BASE +
          "/api/media/review/" +
          encodeURIComponent(intakeId) +
          "/preview-ticket",
        {
          method: "POST",
          headers: getNetworkAdminHeaders(true),
          body: JSON.stringify({}),
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result?.ok || !result.previewPath) {
        throw new Error(
          result?.error ||
            "Could not open the protected Owner-private playback session."
        );
      }

      setOwnerPrivateMediaPreviewUrl(
        AGV_SERVER_API_BASE + result.previewPath
      );
      setOwnerPrivateMediaPreviewExpiresAt(
        result.expiresAt || ""
      );

      setNetworkMessage(
        "Protected Owner-private playback opened for " +
          intakeId +
          "."
      );

      return true;
    } catch (error) {
      const message =
        error?.message ||
        "Could not open the protected Owner-private playback session.";

      setOwnerPrivateMediaError(message);
      setNetworkMessage(message);
      return false;
    } finally {
      setOwnerPrivateMediaAction("");
    }
  }
  async function publishNetworkStations() {
    const token = getAgvServerAuthToken();

    if (!token) {
      setNetworkMessage(
        "A verified AGV account session is required to publish the registry."
      );
      return false;
    }

    if (!Array.isArray(networkStations) || !networkStations.length) {
      setNetworkMessage(
        "At least one valid AGV Network station is required before publishing."
      );
      return false;
    }

    setNetworkSyncing(true);
    setNetworkMessage("Publishing the AGV Network registry...");

    try {
      const response = await fetch(
        `${SUBSCRIPTION_API_BASE}/api/network/stations`,
        {
          method: "PUT",
          headers: getNetworkAdminHeaders(true),
          body: JSON.stringify({
            stations: networkStations,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (
        !response.ok ||
        !data?.ok ||
        !Array.isArray(data.stations)
      ) {
        throw new Error(
          data?.error || "The station registry could not be published."
        );
      }

      setNetworkStations(data.stations);
      setNetworkMessage(
        `Published ${data.stations.length} AGV Network station${data.stations.length === 1 ? "" : "s"} to the protected server registry.`
      );

      return true;
    } catch (error) {
      setNetworkMessage(
        `Registry publish failed. No server change was confirmed. ${error?.message || ""}`.trim()
      );

      return false;
    } finally {
      setNetworkSyncing(false);
    }
  }

  function cleanNetworkStationId(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  // PASS CCH-03C2 V1 — DYNAMIC STATION READINESS ENGINE
  function getNetworkStationReadiness(station) {
    const item = station || {};
    const missing = [];
    let score = 0;

    const sourceType = String(
      item.sourceType ||
        (item.videoId ? "YOUTUBE" : "DIRECT_MP4")
    )
      .trim()
      .toUpperCase();

    const videoId = String(item.videoId || "").trim();
    const sourceUrl = String(item.sourceUrl || "").trim();
    const embedUrl = String(item.embedUrl || "").trim();

    const validSource =
      (sourceType === "YOUTUBE" && Boolean(videoId)) ||
      (sourceType === "DIRECT_MP4" && Boolean(sourceUrl)) ||
      (sourceType === "IFRAME" &&
        Boolean(embedUrl || sourceUrl)) ||
      (sourceType === "HLS" && Boolean(sourceUrl)) ||
      (sourceType === "DASH" && Boolean(sourceUrl));

    const rightsStatus = String(
      item.rightsStatus || "PENDING_REVIEW"
    )
      .trim()
      .toUpperCase();

    const rightsApproved = [
      "APPROVED_EMBED",
      "WRITTEN_LICENSE",
      "AGV_OWNED",
    ].includes(rightsStatus);

    const healthOnline =
      String(item.healthStatus || "UNKNOWN")
        .trim()
        .toUpperCase() === "ONLINE";

    const hasAttribution = Boolean(
      String(item.attribution || "").trim()
    );

    const hasCategory = Boolean(
      String(item.categoryId || item.category || "").trim()
    );

    const scheduleMode = String(
      item.scheduleMode || "ALWAYS_ON"
    )
      .trim()
      .toUpperCase();

    let scheduleValid = false;

    if (scheduleMode === "ALWAYS_ON") {
      scheduleValid = true;
    } else if (scheduleMode === "WEEKLY") {
      scheduleValid =
        Array.isArray(item.scheduleDays) &&
        item.scheduleDays.length > 0;
    } else {
      const startValue = String(
        item.scheduleStart || ""
      ).trim();

      const endValue = String(
        item.scheduleEnd || ""
      ).trim();

      const startTime = Date.parse(startValue);
      const endTime = Date.parse(endValue);

      scheduleValid =
        Boolean(startValue) &&
        Boolean(endValue) &&
        Number.isFinite(startTime) &&
        Number.isFinite(endTime) &&
        endTime > startTime;
    }

    if (item.enabled !== false) {
      score += 15;
    } else {
      missing.push("Station is disabled");
    }

    if (validSource) {
      score += 20;
    } else {
      missing.push("Valid playable source");
    }

    if (rightsApproved) {
      score += 20;
    } else {
      missing.push("Approved rights status");
    }

    if (healthOnline) {
      score += 20;
    } else {
      missing.push("Online health status");
    }

    if (hasAttribution) {
      score += 10;
    } else {
      missing.push("Attribution");
    }

    if (hasCategory) {
      score += 5;
    } else {
      missing.push("Category");
    }

    if (scheduleValid) {
      score += 10;
    } else {
      missing.push("Valid schedule");
    }

    let label = "NOT READY";
    let tone = "red";

    if (score >= 90) {
      label = "READY";
      tone = "green";
    } else if (score >= 70) {
      label = "NEEDS ATTENTION";
      tone = "yellow";
    } else if (score >= 40) {
      label = "INCOMPLETE";
      tone = "orange";
    }

    return {
      score,
      label,
      tone,
      missing,
    };
  }

  function resetNetworkForm() {
    setEditingNetworkStationId("");
    setNetworkForm({
      id: "",
      title: "",
      source: "",
      categoryId: "space-observatories",
      category: "Space & Observatories",
      badge: "LIVE",
      schedule: "24/7",
      scheduleMode: "ALWAYS_ON",
      scheduleStart: "",
      scheduleEnd: "",
      scheduleTimezone: "America/Chicago",
      scheduleDays: [],
      scheduleNotes: "",
      videoId: "",
      thumbnail: "",
      description: "",
      attribution: "",
      fallbackVideoId: "",
      rightsStatus: "PENDING_REVIEW",
      healthStatus: "UNKNOWN",
      lastHealthCheck: "",
      lastSuccessfulPlayback: "",
      consecutiveFailures: 0,
      healthNotes: "",
      views: 0,
      watchMinutes: 0,
      completedViews: 0,
      clicks: 0,
      averageWatchSeconds: 0,
      lastViewed: "",
      lastPublished: "",
      analyticsNotes: "",
      sponsorEnabled: false,
      sponsorName: "",
      sponsorDisclosure: "",
      campaignStart: "",
      campaignEnd: "",
      sponsorArtwork: "",
      sponsorClickUrl: "",
      sponsoredProgram: false,
      impressions: 0,
      sponsorWatchMinutes: 0,
    });
  }

  // PASS CCH-03C3A — CLIENT SOURCE VALIDATION
  function getValidatedHttpsUrl(value) {
    const raw = String(value || "").trim();

    if (!raw) {
      return {
        valid: false,
        url: "",
        reason: "URL is required.",
      };
    }

    try {
      const parsed = new URL(raw);

      if (parsed.protocol !== "https:") {
        return {
          valid: false,
          url: raw,
          reason: "URL must begin with https://",
        };
      }

      if (!parsed.hostname) {
        return {
          valid: false,
          url: raw,
          reason: "URL hostname is missing.",
        };
      }

      return {
        valid: true,
        url: parsed.href,
        pathname: parsed.pathname.toLowerCase(),
        reason: "",
      };
    } catch {
      return {
        valid: false,
        url: raw,
        reason: "URL format is invalid.",
      };
    }
  }

  function normalizeNetworkSourceValue(value) {
    return String(value || "")
      .trim()
      .replace(/\/+$/, "")
      .toLowerCase();
  }

  function isValidYouTubeVideoId(value) {
    return /^[A-Za-z0-9_-]{11}$/.test(
      String(value || "").trim()
    );
  }

  // PASS CCH-04B — CLIENT SPONSORSHIP CAMPAIGN STATUS
  function getSponsorshipCampaignStatus(value) {
    const item = value || {};

    if (item.sponsorEnabled !== true) {
      return {
        code: "DRAFT",
        label: "DRAFT",
        color: "#94a3b8",
        border: "1px solid rgba(148,163,184,0.35)",
        background: "rgba(148,163,184,0.1)",
      };
    }

    const sponsorName = String(
      item.sponsorName || ""
    ).trim();

    const disclosure = String(
      item.sponsorDisclosure || ""
    ).trim();

    const startRaw = String(
      item.campaignStart || ""
    ).trim();

    const endRaw = String(
      item.campaignEnd || ""
    ).trim();

    const startTime = startRaw
      ? new Date(startRaw).getTime()
      : NaN;

    const endTime = endRaw
      ? new Date(endRaw).getTime()
      : NaN;

    if (
      !sponsorName ||
      !disclosure ||
      !Number.isFinite(startTime) ||
      !Number.isFinite(endTime) ||
      endTime <= startTime
    ) {
      return {
        code: "INCOMPLETE",
        label: "INCOMPLETE",
        color: "#fca5a5",
        border: "1px solid rgba(248,113,113,0.42)",
        background: "rgba(127,29,29,0.16)",
      };
    }

    const now = Date.now();

    if (now < startTime) {
      return {
        code: "SCHEDULED",
        label: "SCHEDULED",
        color: "#93c5fd",
        border: "1px solid rgba(96,165,250,0.42)",
        background: "rgba(30,64,175,0.16)",
      };
    }

    if (now > endTime) {
      return {
        code: "ENDED",
        label: "ENDED",
        color: "#cbd5e1",
        border: "1px solid rgba(148,163,184,0.38)",
        background: "rgba(71,85,105,0.14)",
      };
    }

    return {
      code: "ACTIVE",
      label: "ACTIVE",
      color: "#86efac",
      border: "1px solid rgba(34,197,94,0.42)",
      background: "rgba(20,83,45,0.17)",
    };
  }

  // PASS CCH-03C3C — LIVE STATION VALIDATION SUMMARY
  function getLiveNetworkStationValidation(form) {
    const item = form || {};
    const checks = [];

    const title = String(item.title || "").trim();
    const stationId = cleanNetworkStationId(
      item.id || title
    );

    const provider = String(
      item.source || ""
    ).trim();

    const attribution = String(
      item.attribution || ""
    ).trim();

    const categoryId = String(
      item.categoryId || ""
    ).trim();

    const categoryLabel = String(
      item.category || ""
    ).trim();

    const videoId = String(
      item.videoId || ""
    ).trim();

    const sourceUrl = String(
      item.sourceUrl || ""
    ).trim();

    const embedUrl = String(
      item.embedUrl || ""
    ).trim();

    const sourceType = String(
      item.sourceType ||
        (videoId ? "YOUTUBE" : "DIRECT_MP4")
    )
      .trim()
      .toUpperCase();

    const supportedSourceTypes = [
      "YOUTUBE",
      "DIRECT_MP4",
      "IFRAME",
      "HLS",
      "DASH",
    ];

    checks.push({
      label: "Station identity",
      tone:
        title && stationId ? "pass" : "fail",
      detail:
        title && stationId
          ? "Title and station ID are present."
          : "Station title and ID are required.",
    });

    checks.push({
      label: "Provider / Source",
      tone: provider ? "pass" : "fail",
      detail: provider
        ? provider
        : "Provider / Source is required.",
    });

    let sourceConfigured = false;
    let sourceFormatValid = false;
    let sourceDetail = "";

    if (!supportedSourceTypes.includes(sourceType)) {
      sourceDetail =
        "Select a supported source type.";
    } else if (sourceType === "YOUTUBE") {
      sourceConfigured = Boolean(videoId);
      sourceFormatValid =
        sourceConfigured &&
        isValidYouTubeVideoId(videoId);

      sourceDetail = !sourceConfigured
        ? "A YouTube Video ID is required."
        : sourceFormatValid
          ? "YouTube Video ID format is valid."
          : "YouTube Video ID must contain exactly 11 supported characters.";
    } else if (sourceType === "IFRAME") {
      const iframeSource = embedUrl || sourceUrl;
      sourceConfigured = Boolean(iframeSource);

      const result =
        getValidatedHttpsUrl(iframeSource);

      sourceFormatValid =
        sourceConfigured && result.valid;

      sourceDetail = !sourceConfigured
        ? "An iframe or source URL is required."
        : sourceFormatValid
          ? "Iframe source uses a valid HTTPS URL."
          : result.reason;
    } else {
      sourceConfigured = Boolean(sourceUrl);

      const result =
        getValidatedHttpsUrl(sourceUrl);

      sourceFormatValid =
        sourceConfigured && result.valid;

      if (sourceFormatValid) {
        if (sourceType === "DIRECT_MP4") {
          sourceFormatValid =
            result.pathname.endsWith(".mp4");
          sourceDetail = sourceFormatValid
            ? "Direct MP4 URL is valid."
            : "Direct MP4 URL must end in .mp4";
        } else if (sourceType === "HLS") {
          sourceFormatValid =
            result.pathname.endsWith(".m3u8");
          sourceDetail = sourceFormatValid
            ? "HLS manifest URL is valid."
            : "HLS URL must end in .m3u8";
        } else if (sourceType === "DASH") {
          sourceFormatValid =
            result.pathname.endsWith(".mpd");
          sourceDetail = sourceFormatValid
            ? "DASH manifest URL is valid."
            : "DASH URL must end in .mpd";
        }
      } else {
        sourceDetail = !sourceConfigured
          ? "A source URL is required."
          : result.reason;
      }
    }

    checks.push({
      label: "Playable source",
      tone:
        sourceConfigured &&
        sourceFormatValid
          ? "pass"
          : "fail",
      detail: sourceDetail,
    });

    const duplicateSourceUrl =
      Boolean(sourceUrl) &&
      networkStations.some(
        (station) =>
          station.id !==
            editingNetworkStationId &&
          normalizeNetworkSourceValue(
            station.sourceUrl
          ) ===
            normalizeNetworkSourceValue(sourceUrl)
      );

    const duplicateEmbedUrl =
      Boolean(embedUrl) &&
      networkStations.some(
        (station) =>
          station.id !==
            editingNetworkStationId &&
          normalizeNetworkSourceValue(
            station.embedUrl
          ) ===
            normalizeNetworkSourceValue(embedUrl)
      );

    const duplicateVideoId =
      Boolean(videoId) &&
      networkStations.some(
        (station) =>
          station.id !==
            editingNetworkStationId &&
          String(station.videoId || "")
            .trim()
            .toLowerCase() ===
            videoId.toLowerCase()
      );

    const hasDuplicateSource =
      duplicateSourceUrl ||
      duplicateEmbedUrl ||
      duplicateVideoId;

    checks.push({
      label: "Duplicate source check",
      tone: hasDuplicateSource
        ? "fail"
        : "pass",
      detail: hasDuplicateSource
        ? "Another station already uses this source."
        : "No duplicate source was detected.",
    });

    checks.push({
      label: "Attribution",
      tone: attribution ? "pass" : "fail",
      detail: attribution
        ? attribution
        : "Attribution is required.",
    });

    checks.push({
      label: "Category",
      tone:
        categoryId && categoryLabel
          ? "pass"
          : "fail",
      detail:
        categoryId && categoryLabel
          ? categoryLabel
          : "Category ID and label are required.",
    });

    const rightsStatus = String(
      item.rightsStatus || ""
    )
      .trim()
      .toUpperCase();

    const approvedRights = [
      "APPROVED_EMBED",
      "WRITTEN_LICENSE",
      "AGV_OWNED",
    ];

    let rightsTone = "fail";
    let rightsDetail =
      "A supported rights status is required.";

    if (approvedRights.includes(rightsStatus)) {
      rightsTone = "pass";
      rightsDetail =
        "Rights status is approved.";
    } else if (
      [
        "PENDING_REVIEW",
        "PUBLIC_DOMAIN_REVIEW_REQUIRED",
      ].includes(rightsStatus)
    ) {
      rightsTone = "warn";
      rightsDetail =
        "Station may be saved as a draft, but rights review is still required.";
    } else if (rightsStatus === "BLOCKED") {
      rightsTone = "fail";
      rightsDetail =
        "Blocked content cannot be saved as an active station.";
    }

    checks.push({
      label: "Rights status",
      tone: rightsTone,
      detail: rightsDetail,
    });

    const scheduleMode = String(
      item.scheduleMode || "ALWAYS_ON"
    )
      .trim()
      .toUpperCase();

    const scheduleTimezone = String(
      item.scheduleTimezone || ""
    ).trim();

    const scheduleDays = Array.isArray(
      item.scheduleDays
    )
      ? item.scheduleDays
      : [];

    const scheduleStart = String(
      item.scheduleStart || ""
    ).trim();

    const scheduleEnd = String(
      item.scheduleEnd || ""
    ).trim();

    let scheduleTone = "pass";
    let scheduleDetail =
      "Always-on schedule is valid.";

    if (scheduleMode === "WEEKLY") {
      if (!scheduleTimezone) {
        scheduleTone = "fail";
        scheduleDetail =
          "A weekly schedule requires a time zone.";
      } else if (!scheduleDays.length) {
        scheduleTone = "fail";
        scheduleDetail =
          "Select at least one weekly schedule day.";
      } else {
        scheduleDetail =
          "Weekly schedule has selected days and a time zone.";
      }
    } else if (
      [
        "SCHEDULED",
        "SEASONAL",
        "SPECIAL_EVENT",
      ].includes(scheduleMode)
    ) {
      const startTime =
        Date.parse(scheduleStart);

      const endTime =
        Date.parse(scheduleEnd);

      if (!scheduleTimezone) {
        scheduleTone = "fail";
        scheduleDetail =
          "A schedule time zone is required.";
      } else if (
        !scheduleStart ||
        !scheduleEnd
      ) {
        scheduleTone = "fail";
        scheduleDetail =
          "Schedule start and end are required.";
      } else if (
        !Number.isFinite(startTime) ||
        !Number.isFinite(endTime)
      ) {
        scheduleTone = "fail";
        scheduleDetail =
          "Schedule dates are invalid.";
      } else if (endTime <= startTime) {
        scheduleTone = "fail";
        scheduleDetail =
          "Schedule end must be later than start.";
      } else {
        scheduleDetail =
          "Schedule window and time zone are valid.";
      }
    } else if (scheduleMode !== "ALWAYS_ON") {
      scheduleTone = "fail";
      scheduleDetail =
        "The selected schedule mode is not supported.";
    }

    checks.push({
      label: "Schedule",
      tone: scheduleTone,
      detail: scheduleDetail,
    });

    const failCount = checks.filter(
      (check) => check.tone === "fail"
    ).length;

    const warningCount = checks.filter(
      (check) => check.tone === "warn"
    ).length;

    return {
      checks,
      failCount,
      warningCount,
      ready:
        failCount === 0 &&
        warningCount === 0,
      label:
        failCount > 0
          ? "ACTION REQUIRED"
          : warningCount > 0
            ? "NEEDS REVIEW"
            : "READY TO SAVE",
    };
  }

  function saveNetworkStation() {
    const title = String(networkForm.title || "").trim();
    const videoId = String(networkForm.videoId || "").trim();
    const sourceType = String(
      networkForm.sourceType || (videoId ? "YOUTUBE" : "DIRECT_MP4")
    ).trim().toUpperCase();
    const sourceUrl = String(networkForm.sourceUrl || "").trim();
    const embedUrl = String(networkForm.embedUrl || "").trim();
    const id = cleanNetworkStationId(
      networkForm.id || editingNetworkStationId || title
    );

    const supportedSourceTypes = [
      "YOUTUBE",
      "DIRECT_MP4",
      "IFRAME",
      "HLS",
      "DASH",
    ];

    if (!title || !id) {
      setNetworkMessage(
        "Station title and station ID are required."
      );
      return;
    }

    if (!supportedSourceTypes.includes(sourceType)) {
      setNetworkMessage(
        "Unsupported source type. Select YouTube, Direct MP4, Iframe, HLS, or DASH."
      );
      return;
    }

    if (sourceType === "YOUTUBE") {
      if (!videoId) {
        setNetworkMessage(
          "A YouTube Video ID is required for a YouTube station."
        );
        return;
      }

      if (!isValidYouTubeVideoId(videoId)) {
        setNetworkMessage(
          "The YouTube Video ID must contain exactly 11 letters, numbers, underscores, or hyphens."
        );
        return;
      }
    }

    if (sourceType === "DIRECT_MP4") {
      const result = getValidatedHttpsUrl(sourceUrl);

      if (!result.valid) {
        setNetworkMessage(
          "Direct MP4 source validation failed: " +
            result.reason
        );
        return;
      }

      if (!result.pathname.endsWith(".mp4")) {
        setNetworkMessage(
          "A Direct MP4 source URL must point to an .mp4 file."
        );
        return;
      }
    }

    if (sourceType === "HLS") {
      const result = getValidatedHttpsUrl(sourceUrl);

      if (!result.valid) {
        setNetworkMessage(
          "HLS source validation failed: " +
            result.reason
        );
        return;
      }

      if (!result.pathname.endsWith(".m3u8")) {
        setNetworkMessage(
          "An HLS source URL must point to an .m3u8 manifest."
        );
        return;
      }
    }

    if (sourceType === "DASH") {
      const result = getValidatedHttpsUrl(sourceUrl);

      if (!result.valid) {
        setNetworkMessage(
          "DASH source validation failed: " +
            result.reason
        );
        return;
      }

      if (!result.pathname.endsWith(".mpd")) {
        setNetworkMessage(
          "A DASH source URL must point to an .mpd manifest."
        );
        return;
      }
    }

    if (sourceType === "IFRAME") {
      const iframeSource = embedUrl || sourceUrl;
      const result = getValidatedHttpsUrl(iframeSource);

      if (!result.valid) {
        setNetworkMessage(
          "Iframe source validation failed: " +
            result.reason
        );
        return;
      }
    }

    const fallbackUrl = String(
      networkForm.fallbackUrl || ""
    ).trim();

    const fallbackVideoId = String(
      networkForm.fallbackVideoId || ""
    ).trim();

    if (fallbackUrl) {
      const fallbackResult =
        getValidatedHttpsUrl(fallbackUrl);

      if (!fallbackResult.valid) {
        setNetworkMessage(
          "Fallback source validation failed: " +
            fallbackResult.reason
        );
        return;
      }
    }

    if (
      fallbackVideoId &&
      !isValidYouTubeVideoId(fallbackVideoId)
    ) {
      setNetworkMessage(
        "The fallback YouTube Video ID must contain exactly 11 letters, numbers, underscores, or hyphens."
      );
      return;
    }

    const duplicate = networkStations.some(
      (station) =>
        station.id === id &&
        station.id !== editingNetworkStationId
    );

    if (duplicate) {
      setNetworkMessage(
        "A station with that ID already exists."
      );
      return;
    }

    const duplicateSourceUrl =
      Boolean(sourceUrl) &&
      networkStations.some(
        (station) =>
          station.id !== editingNetworkStationId &&
          normalizeNetworkSourceValue(
            station.sourceUrl
          ) ===
            normalizeNetworkSourceValue(sourceUrl)
      );

    if (duplicateSourceUrl) {
      setNetworkMessage(
        "Another AGV Network station already uses this source URL."
      );
      return;
    }

    const duplicateEmbedUrl =
      Boolean(embedUrl) &&
      networkStations.some(
        (station) =>
          station.id !== editingNetworkStationId &&
          normalizeNetworkSourceValue(
            station.embedUrl
          ) ===
            normalizeNetworkSourceValue(embedUrl)
      );

    if (duplicateEmbedUrl) {
      setNetworkMessage(
        "Another AGV Network station already uses this embed URL."
      );
      return;
    }

    const duplicateVideoId =
      Boolean(videoId) &&
      networkStations.some(
        (station) =>
          station.id !== editingNetworkStationId &&
          String(station.videoId || "")
            .trim()
            .toLowerCase() ===
            videoId.toLowerCase()
      );

    if (duplicateVideoId) {
      setNetworkMessage(
        "Another AGV Network station already uses this YouTube Video ID."
      );
      return;
    }

    // PASS CCH-03C3B — RIGHTS, ATTRIBUTION, CATEGORY,
    // AND STRUCTURED SCHEDULE VALIDATION
    const validationIssues = [];

    const provider = String(
      networkForm.source || ""
    ).trim();

    const attribution = String(
      networkForm.attribution || ""
    ).trim();

    const categoryId = String(
      networkForm.categoryId || ""
    ).trim();

    const categoryLabel = String(
      networkForm.category || ""
    ).trim();

    const rightsStatus = String(
      networkForm.rightsStatus || ""
    )
      .trim()
      .toUpperCase();

    const approvedOrDraftRightsStatuses = [
      "PENDING_REVIEW",
      "PUBLIC_DOMAIN_REVIEW_REQUIRED",
      "APPROVED_EMBED",
      "WRITTEN_LICENSE",
      "AGV_OWNED",
    ];

    const scheduleMode = String(
      networkForm.scheduleMode || "ALWAYS_ON"
    )
      .trim()
      .toUpperCase();

    const supportedScheduleModes = [
      "ALWAYS_ON",
      "SCHEDULED",
      "WEEKLY",
      "SEASONAL",
      "SPECIAL_EVENT",
    ];

    const scheduleStart = String(
      networkForm.scheduleStart || ""
    ).trim();

    const scheduleEnd = String(
      networkForm.scheduleEnd || ""
    ).trim();

    const scheduleTimezone = String(
      networkForm.scheduleTimezone || ""
    ).trim();

    const scheduleDays = Array.isArray(
      networkForm.scheduleDays
    )
      ? networkForm.scheduleDays
          .map((value) =>
            String(value || "").trim().toUpperCase()
          )
          .filter(Boolean)
      : [];

    if (!provider) {
      validationIssues.push(
        "Provider / Source is required."
      );
    }

    if (!attribution) {
      validationIssues.push(
        "Attribution is required."
      );
    }

    if (!categoryId) {
      validationIssues.push(
        "Category ID is required."
      );
    }

    if (!categoryLabel) {
      validationIssues.push(
        "Category label is required."
      );
    }

    if (!rightsStatus) {
      validationIssues.push(
        "Rights status is required."
      );
    } else if (rightsStatus === "BLOCKED") {
      validationIssues.push(
        "Blocked content cannot be saved as an active AGV Network station."
      );
    } else if (
      !approvedOrDraftRightsStatuses.includes(
        rightsStatus
      )
    ) {
      validationIssues.push(
        "The selected rights status is not supported."
      );
    }

    if (!supportedScheduleModes.includes(scheduleMode)) {
      validationIssues.push(
        "The selected schedule mode is not supported."
      );
    }

    if (
      scheduleMode !== "ALWAYS_ON" &&
      !scheduleTimezone
    ) {
      validationIssues.push(
        "A schedule time zone is required."
      );
    }

    if (
      scheduleMode === "WEEKLY" &&
      scheduleDays.length === 0
    ) {
      validationIssues.push(
        "Weekly schedules must include at least one day."
      );
    }

    if (
      [
        "SCHEDULED",
        "SEASONAL",
        "SPECIAL_EVENT",
      ].includes(scheduleMode)
    ) {
      if (!scheduleStart) {
        validationIssues.push(
          "Schedule start date and time are required."
        );
      }

      if (!scheduleEnd) {
        validationIssues.push(
          "Schedule end date and time are required."
        );
      }

      const startTime = Date.parse(scheduleStart);
      const endTime = Date.parse(scheduleEnd);

      if (
        scheduleStart &&
        !Number.isFinite(startTime)
      ) {
        validationIssues.push(
          "Schedule start date and time are invalid."
        );
      }

      if (
        scheduleEnd &&
        !Number.isFinite(endTime)
      ) {
        validationIssues.push(
          "Schedule end date and time are invalid."
        );
      }

      if (
        Number.isFinite(startTime) &&
        Number.isFinite(endTime) &&
        endTime <= startTime
      ) {
        validationIssues.push(
          "Schedule end must be later than schedule start."
        );
      }
    }

    if (networkForm.sponsorEnabled === true) {
      const sponsorName = String(
        networkForm.sponsorName || ""
      ).trim();

      const sponsorDisclosure = String(
        networkForm.sponsorDisclosure || ""
      ).trim();

      const campaignStart = String(
        networkForm.campaignStart || ""
      ).trim();

      const campaignEnd = String(
        networkForm.campaignEnd || ""
      ).trim();

      const sponsorArtwork = String(
        networkForm.sponsorArtwork || ""
      ).trim();

      const sponsorClickUrl = String(
        networkForm.sponsorClickUrl || ""
      ).trim();

      if (!sponsorName) {
        validationIssues.push(
          "Sponsor name is required when sponsorship is enabled."
        );
      }

      if (!sponsorDisclosure) {
        validationIssues.push(
          "Sponsor disclosure is required when sponsorship is enabled."
        );
      }

      if (!campaignStart) {
        validationIssues.push(
          "Campaign start is required when sponsorship is enabled."
        );
      }

      if (!campaignEnd) {
        validationIssues.push(
          "Campaign end is required when sponsorship is enabled."
        );
      }

      if (campaignStart && campaignEnd) {
        const sponsorStartTime =
          new Date(campaignStart).getTime();

        const sponsorEndTime =
          new Date(campaignEnd).getTime();

        if (
          !Number.isFinite(sponsorStartTime) ||
          !Number.isFinite(sponsorEndTime)
        ) {
          validationIssues.push(
            "Campaign dates must be valid."
          );
        } else if (sponsorEndTime <= sponsorStartTime) {
          validationIssues.push(
            "Campaign end must be later than campaign start."
          );
        }
      }

      if (sponsorArtwork) {
        const artworkValidation =
          getValidatedHttpsUrl(sponsorArtwork);

        if (!artworkValidation.valid) {
          validationIssues.push(
            "Sponsor artwork must use a valid HTTPS URL."
          );
        }
      }

      if (sponsorClickUrl) {
        const clickValidation =
          getValidatedHttpsUrl(sponsorClickUrl);

        if (!clickValidation.valid) {
          validationIssues.push(
            "Sponsor click-through destination must use a valid HTTPS URL."
          );
        }
      }
    }

    if (validationIssues.length) {
      setNetworkMessage(
        "Station validation failed:\n\n• " +
          validationIssues.join("\n• ")
      );
      return;
    }

    const existing = networkStations.find(
      (station) => station.id === editingNetworkStationId
    );

    const stationRecord = {
      ...networkForm,
      id,
      title,
      videoId,
      source: String(networkForm.source || "").trim(),
      provider: String(networkForm.source || "").trim(),
      sourceType,
      sourceUrl,
      embedUrl,
      fallbackUrl: String(networkForm.fallbackUrl || "").trim(),
      categoryId:
        String(networkForm.categoryId || "").trim() || "uncategorized",
      category:
        String(networkForm.category || "").trim() || "Uncategorized",
      badge: String(networkForm.badge || "").trim() || "LIVE",
      schedule: String(networkForm.schedule || "").trim() || "24/7",
      scheduleMode:
        String(networkForm.scheduleMode || "ALWAYS_ON")
          .trim()
          .toUpperCase(),
      scheduleStart:
        String(networkForm.scheduleStart || "").trim(),
      scheduleEnd:
        String(networkForm.scheduleEnd || "").trim(),
      scheduleTimezone:
        String(
          networkForm.scheduleTimezone || "America/Chicago"
        ).trim(),
      scheduleDays: Array.isArray(networkForm.scheduleDays)
        ? networkForm.scheduleDays
            .map((value) =>
              String(value || "").trim().toUpperCase()
            )
            .filter(Boolean)
        : [],
      scheduleNotes:
        String(networkForm.scheduleNotes || "").trim(),
      thumbnail: String(networkForm.thumbnail || "").trim(),
      description: String(networkForm.description || "").trim(),
      attribution: String(networkForm.attribution || "").trim(),
      fallbackVideoId: String(networkForm.fallbackVideoId || "").trim(),
      enabled: existing ? existing.enabled !== false : true,
      rightsStatus:
        String(networkForm.rightsStatus || "").trim() || "PENDING_REVIEW",
      healthStatus:
        String(networkForm.healthStatus || "").trim() || "UNKNOWN",
      lastHealthCheck:
        String(networkForm.lastHealthCheck || "").trim(),
      lastSuccessfulPlayback:
        String(networkForm.lastSuccessfulPlayback || "").trim(),
      consecutiveFailures: Math.max(
        0,
        Number.parseInt(networkForm.consecutiveFailures, 10) || 0
      ),
      healthNotes:
        String(networkForm.healthNotes || "").trim(),
      views: Math.max(
        0,
        Number.parseInt(networkForm.views, 10) || 0
      ),
      watchMinutes: Math.max(
        0,
        Number.parseInt(networkForm.watchMinutes, 10) || 0
      ),
      completedViews: Math.max(
        0,
        Number.parseInt(networkForm.completedViews, 10) || 0
      ),
      clicks: Math.max(
        0,
        Number.parseInt(networkForm.clicks, 10) || 0
      ),
      averageWatchSeconds: Math.max(
        0,
        Number.parseInt(networkForm.averageWatchSeconds, 10) || 0
      ),
      lastViewed:
        String(networkForm.lastViewed || "").trim(),
      lastPublished:
        String(networkForm.lastPublished || "").trim(),
      analyticsNotes:
        String(networkForm.analyticsNotes || "").trim(),
      sponsorEnabled:
        networkForm.sponsorEnabled === true,
      sponsorName:
        String(networkForm.sponsorName || "").trim(),
      sponsorDisclosure:
        String(networkForm.sponsorDisclosure || "").trim(),
      campaignStart:
        String(networkForm.campaignStart || "").trim(),
      campaignEnd:
        String(networkForm.campaignEnd || "").trim(),
      sponsorArtwork:
        String(networkForm.sponsorArtwork || "").trim(),
      sponsorClickUrl:
        String(networkForm.sponsorClickUrl || "").trim(),
      sponsoredProgram:
        networkForm.sponsoredProgram === true,
      impressions: Math.max(
        0,
        Number.parseInt(networkForm.impressions, 10) || 0
      ),
      sponsorWatchMinutes: Math.max(
        0,
        Number.parseInt(
          networkForm.sponsorWatchMinutes,
          10
        ) || 0
      ),
    };

    if (editingNetworkStationId) {
      setNetworkStations((current) =>
        current.map((station) =>
          station.id === editingNetworkStationId ? stationRecord : station
        )
      );
      setNetworkMessage("Updated AGV Network station: " + title);
    } else {
      setNetworkStations((current) => [...current, stationRecord]);
      setNetworkMessage("Added AGV Network station: " + title);
    }

    resetNetworkForm();
  }

  function editNetworkStation(station) {
    setEditingNetworkStationId(station.id);
    setNetworkForm({
      id: station.id || "",
      title: station.title || "",
      source: station.source || station.provider || "",
      sourceType:
        station.sourceType || (station.videoId ? "YOUTUBE" : "DIRECT_MP4"),
      sourceUrl: station.sourceUrl || "",
      embedUrl: station.embedUrl || "",
      fallbackUrl: station.fallbackUrl || "",
      categoryId: station.categoryId || "space-observatories",
      category: station.category || "Space & Observatories",
      badge: station.badge || "LIVE",
      schedule: station.schedule || "24/7",
      scheduleMode: station.scheduleMode || "ALWAYS_ON",
      scheduleStart: station.scheduleStart || "",
      scheduleEnd: station.scheduleEnd || "",
      scheduleTimezone:
        station.scheduleTimezone || "America/Chicago",
      scheduleDays: Array.isArray(station.scheduleDays)
        ? station.scheduleDays
        : [],
      scheduleNotes: station.scheduleNotes || "",
      videoId: station.videoId || "",
      thumbnail: station.thumbnail || "",
      description: station.description || "",
      attribution: station.attribution || "",
      fallbackVideoId: station.fallbackVideoId || "",
      rightsStatus: station.rightsStatus || "PENDING_REVIEW",
      healthStatus: station.healthStatus || "UNKNOWN",
      lastHealthCheck: station.lastHealthCheck || "",
      lastSuccessfulPlayback:
        station.lastSuccessfulPlayback || "",
      consecutiveFailures: Math.max(
        0,
        Number.parseInt(station.consecutiveFailures, 10) || 0
      ),
      healthNotes: station.healthNotes || "",
      views: Math.max(
        0,
        Number.parseInt(station.views, 10) || 0
      ),
      watchMinutes: Math.max(
        0,
        Number.parseInt(station.watchMinutes, 10) || 0
      ),
      completedViews: Math.max(
        0,
        Number.parseInt(station.completedViews, 10) || 0
      ),
      clicks: Math.max(
        0,
        Number.parseInt(station.clicks, 10) || 0
      ),
      averageWatchSeconds: Math.max(
        0,
        Number.parseInt(station.averageWatchSeconds, 10) || 0
      ),
      lastViewed: station.lastViewed || "",
      lastPublished: station.lastPublished || "",
      analyticsNotes: station.analyticsNotes || "",
      sponsorEnabled:
        station.sponsorEnabled === true,
      sponsorName: station.sponsorName || "",
      sponsorDisclosure:
        station.sponsorDisclosure || "",
      campaignStart: station.campaignStart || "",
      campaignEnd: station.campaignEnd || "",
      sponsorArtwork: station.sponsorArtwork || "",
      sponsorClickUrl: station.sponsorClickUrl || "",
      sponsoredProgram:
        station.sponsoredProgram === true,
      impressions: Math.max(
        0,
        Number.parseInt(station.impressions, 10) || 0
      ),
      sponsorWatchMinutes: Math.max(
        0,
        Number.parseInt(
          station.sponsorWatchMinutes,
          10
        ) || 0
      ),
    });

    setNetworkMessage("Editing station: " + station.title);
  }

  function toggleNetworkStation(id) {
    setNetworkStations((current) =>
      current.map((station) =>
        station.id === id
          ? { ...station, enabled: station.enabled === false }
          : station
      )
    );
  }

  function moveNetworkStation(id, direction) {
    setNetworkStations((current) => {
      const index = current.findIndex((station) => station.id === id);
      const nextIndex = index + direction;

      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }

      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  function deleteNetworkStation(id) {
    const station = networkStations.find((item) => item.id === id);

    if (!station) return;

    const approved = window.confirm(
      'Remove "' + station.title + '" from AGV Network control?'
    );

    if (!approved) return;

    setNetworkStations((current) =>
      current.filter((item) => item.id !== id)
    );

    if (editingNetworkStationId === id) {
      resetNetworkForm();
    }

    setNetworkMessage("Removed AGV Network station: " + station.title);
  }

  if (!unlocked) {
    return (
      <div style={styles.page}>
        <header style={styles.header}>
          <div>
            <div style={styles.badge}>AGV SECURE ADMIN</div>
            <h1 style={styles.title}>Super Admin Locked</h1>
            <p style={styles.subtitle}>Enter the Super Admin PIN to continue.</p>
          </div>

          <button style={styles.secondaryButton} onClick={onBack}>
            Back to Landing
          </button>
        </header>

        <section style={styles.grid}>
          <div style={styles.card}>
            <h2>Enter Super Admin PIN</h2>

            <input
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Super Admin PIN"
              type="password"
              style={styles.input}
            />

            {pinMessage ? <p style={styles.error}>{pinMessage}</p> : null}

            <button style={styles.primaryButton} onClick={unlockPanel}>
              Unlock Super Admin
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <div style={styles.badge}>AGV SERVER-SIDE PLAN ENFORCEMENT</div>
          <h1 style={styles.title}>Super Admin Control Center</h1>
          <p style={styles.subtitle}>
            Manage rooms, subscription limits, Stripe upgrade paths, and AGV subscription service plan enforcement.
          </p>
          <p style={styles.serverMessage}>{subscriptionMessage}</p>
          <p style={styles.enforcementMessage}>{enforcementMessage}</p>
          {billingMessage ? <p style={styles.billingMessage}>{billingMessage}</p> : null}
        </div>

        <button style={styles.secondaryButton} onClick={onBack}>
          Back to Landing
        </button>

        <div
          style={{
            minWidth: 220,
            padding: 12,
            borderRadius: 16,
            border: "1px solid rgba(250,204,21,0.28)",
            background: "rgba(250,204,21,0.08)",
          }}
        >
          <label style={{ ...styles.label, marginBottom: 6 }}>
            Testing As
          </label>
          <select
            value={testPlan}
            onChange={(event) => {
              const nextTestPlan = normalizePlan(event.target.value);
              setTestPlan(nextTestPlan);
              sessionStorage.setItem("agv_super_admin_test_plan", nextTestPlan);
              sessionStorage.removeItem("agv_owner_test_plan");
              window.dispatchEvent(
                new CustomEvent("agv-super-admin-test-plan-changed", {
                  detail: { plan: nextTestPlan },
                })
              );
            }}
            style={styles.input}
          >
            <option value="FREE">Free</option>
            <option value="CREATOR">Creator</option>
            <option value="MINISTRY">Ministry</option>
            <option value="CONVENTION">Convention</option>
          </select>
          <div style={{ marginTop: 6, fontSize: 12, color: "#cbd5e1" }}>
            Session-only test tier. Your real account remains Convention.
          </div>
        </div>

        <button
          style={styles.primaryButton}
          onClick={() => {
            if (typeof onEnterHost === "function") onEnterHost();
          }}
        >
          Enter Host Platform - Founder Override
        </button>
      </header>

      {/* PASS_SA_UX_01_WORKSPACE_NAVIGATION_BAR */}
      <nav
        aria-label="Super Admin workspaces"
        style={{
          maxWidth: 1180,
          margin: "0 auto 18px",
          padding: 10,
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          borderRadius: 16,
          border: "1px solid rgba(148, 163, 184, 0.2)",
          background: "rgba(7, 18, 42, 0.88)",
          boxShadow: "0 14px 30px rgba(0, 0, 0, 0.2)",
        }}
      >
        {[
          ["dashboard", "Dashboard"],
          ["network", "AGV Network Control Center"],
          ["commercial-operations", "Commercial Operations"],
          ["media-review", "Founder Media Review"],
            ["sponsor-review", "Sponsor Review"],
          ["rooms", "Rooms"],
          ["financial", "Financial"],
          ["sentinel", "Sentinel"],
          ["legal", "Legal"],
        ].map(([workspaceId, label]) => {
          const isActive = activeAdminWorkspace === workspaceId;

          return (
            <button
              key={workspaceId}
              type="button"
              onClick={() => {
                selectAdminWorkspace(workspaceId);

                if (workspaceId === "media-review") {
                  loadFounderMediaReviewItems();
                }
              }}
              aria-pressed={isActive}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: isActive
                  ? "1px solid rgba(250, 204, 21, 0.7)"
                  : "1px solid rgba(148, 163, 184, 0.2)",
                background: isActive
                  ? "rgba(250, 204, 21, 0.14)"
                  : "rgba(15, 23, 42, 0.58)",
                color: isActive ? "#fde68a" : "#cbd5e1",
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: isActive
                  ? "0 0 18px rgba(250, 204, 21, 0.08)"
                  : "none",
              }}
            >
              {label}
            </button>
          );
        })}
      </nav>

      {/* PASS ANPE-03B2-R2 — ISOLATED READ-ONLY COMMERCIAL OPERATIONS CENTER */}
      {activeAdminWorkspace === "commercial-operations" ? (
        <CommercialOperationsCenter
          getAdminHeaders={getNetworkAdminHeaders}
        />
      ) : null}

      {/* PASS ANPE-03B2-R2 — PRESERVE EXISTING SHARED WORKSPACE RENDER PATH */}
      {activeAdminWorkspace !== "commercial-operations" ? (
        <>
      {/* PASS ASC-10B-R2 CLIENT SPONSOR REVIEW QUEUE */}
        {activeAdminWorkspace === "sponsor-review" ? (
          <SponsorReviewQueue
            getAdminHeaders={getNetworkAdminHeaders}
          />
        ) : null}

        {/* PASS CU-10D2 VISIBLE FOUNDER MEDIA REVIEW PANEL */}
      {activeAdminWorkspace === "media-review" ? (
        <section
          style={{
            maxWidth: 1180,
            margin: "0 auto 18px",
            padding: 20,
            borderRadius: 16,
            border:
              "1px solid rgba(250, 204, 21, 0.32)",
            background:
              "linear-gradient(145deg, rgba(7, 18, 42, 0.97), rgba(15, 23, 42, 0.94))",
            boxShadow:
              "0 18px 38px rgba(0, 0, 0, 0.28)",
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
                  letterSpacing: 1,
                }}
              >
                FOUNDER CONTROLLED MEDIA GOVERNANCE
              </div>

              <h2
                style={{
                  margin: "6px 0 0",
                  color: "#f8fafc",
                  fontSize: 25,
                }}
              >
                Founder Media Review
              </h2>

              <div
                style={{
                  marginTop: 7,
                  color: "#94a3b8",
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
              >
                Preview protected uploads and approve or reject
                them before any AGV Network publishing action.
              </div>
            </div>

            <button
              type="button"
              onClick={loadFounderMediaReviewItems}
              disabled={founderMediaReviewLoading}
              style={{
                ...styles.secondaryButton,
                opacity: founderMediaReviewLoading ? 0.55 : 1,
              }}
            >
              {founderMediaReviewLoading
                ? "Loading Review Queue..."
                : "Refresh Review Queue"}
            </button>
          </div>

          {founderMediaReviewError ? (
            <div
              style={{
                marginTop: 15,
                padding: 12,
                borderRadius: 10,
                border:
                  "1px solid rgba(248, 113, 113, 0.42)",
                background: "rgba(127, 29, 29, 0.2)",
                color: "#fecaca",
                fontSize: 13,
              }}
            >
              {founderMediaReviewError}
            </div>
          ) : null}

          <div
            style={{
              marginTop: 18,
              display: "grid",
              gridTemplateColumns: "minmax(260px, 0.8fr) minmax(0, 1.7fr)",
              gap: 18,
            }}
          >
            <div
              style={{
                padding: 14,
                borderRadius: 13,
                border:
                  "1px solid rgba(148, 163, 184, 0.22)",
                background: "rgba(15, 23, 42, 0.62)",
              }}
            >
              <div
                style={{
                  color: "#e2e8f0",
                  fontSize: 14,
                  fontWeight: 900,
                  marginBottom: 10,
                }}
              >
                Review Queue ({founderMediaReviewItems.length})
              </div>

              {!founderMediaReviewLoading &&
              founderMediaReviewItems.length === 0 ? (
                <div
                  style={{
                    color: "#94a3b8",
                    fontSize: 13,
                    lineHeight: 1.6,
                  }}
                >
                  No uploaded media is currently in the Founder
                  review queue. Press Refresh Review Queue after
                  completing a secure upload.
                </div>
              ) : null}

              <div
                style={{
                  display: "grid",
                  gap: 9,
                  maxHeight: 550,
                  overflowY: "auto",
                }}
              >
                {founderMediaReviewItems.map((item) => {
                  const selected =
                    selectedFounderMediaReview?.intakeId ===
                    item.intakeId;

                  return (
                    <button
                      key={item.intakeId}
                      type="button"
                      onClick={() =>
                        selectFounderMediaReviewItem(item)
                      }
                      style={{
                        padding: 12,
                        borderRadius: 10,
                        border: selected
                          ? "1px solid rgba(250, 204, 21, 0.68)"
                          : "1px solid rgba(148, 163, 184, 0.2)",
                        background: selected
                          ? "rgba(250, 204, 21, 0.11)"
                          : "rgba(2, 6, 23, 0.34)",
                        color: "#f8fafc",
                        textAlign: "left",
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 900,
                          fontSize: 14,
                        }}
                      >
                        {item.title || item.filename}
                      </div>

                      <div
                        style={{
                          marginTop: 5,
                          color: "#93c5fd",
                          fontSize: 11,
                          fontWeight: 800,
                          overflowWrap: "anywhere",
                        }}
                      >
                        {item.intakeId}
                      </div>

                      <div
                        style={{
                          marginTop: 6,
                          color: "#cbd5e1",
                          fontSize: 11,
                        }}
                      >
                        {item.status}
                      </div>

                      {item.linkedPartner ? (
                        <div
                          style={{
                            marginTop: 7,
                            padding: "6px 8px",
                            borderRadius: 7,
                            border:
                              "1px solid rgba(34, 197, 94, 0.28)",
                            background:
                              "rgba(20, 83, 45, 0.15)",
                            color: "#bbf7d0",
                            fontSize: 10,
                            lineHeight: 1.45,
                          }}
                        >
                          <strong>
                            Content Partner
                          </strong>
                          <div>
                            {item.linkedPartner.channelName ||
                              item.linkedPartner.partnerName ||
                              "Partner submission"}
                          </div>
                          <div
                            style={{
                              marginTop: 2,
                              color: "#86efac",
                              overflowWrap: "anywhere",
                            }}
                          >
                            {
                              item.linkedPartner
                                .submissionId
                            }
                          </div>
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              style={{
                padding: 16,
                borderRadius: 13,
                border:
                  "1px solid rgba(96, 165, 250, 0.24)",
                background: "rgba(15, 23, 42, 0.54)",
              }}
            >
              {selectedFounderMediaReview ? (
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 14,
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          margin: 0,
                          color: "#f8fafc",
                          fontSize: 21,
                        }}
                      >
                        {selectedFounderMediaReview.title ||
                          selectedFounderMediaReview.filename}
                      </h3>

                      <div
                        style={{
                          marginTop: 6,
                          color: "#93c5fd",
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      >
                        {selectedFounderMediaReview.intakeId}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: "7px 10px",
                        borderRadius: 999,
                        border:
                          "1px solid rgba(250, 204, 21, 0.35)",
                        background: "rgba(250, 204, 21, 0.1)",
                        color: "#fde68a",
                        fontSize: 11,
                        fontWeight: 900,
                      }}
                    >
                      {selectedFounderMediaReview.status}
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: 14,
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: 10,
                    }}
                  >
                    {[
                      [
                        "Original File",
                        selectedFounderMediaReview.filename,
                      ],
                      [
                        "Size",
                        formatMediaFileSize(
                          selectedFounderMediaReview.filesize
                        ),
                      ],
                      [
                        "Visibility",
                        selectedFounderMediaReview.visibility ||
                          "Private",
                      ],
                      [
                        "Attribution",
                        selectedFounderMediaReview.attribution ||
                          "Not supplied",
                      ],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        style={{
                          padding: 10,
                          borderRadius: 9,
                          border:
                            "1px solid rgba(148, 163, 184, 0.18)",
                          background: "rgba(2, 6, 23, 0.26)",
                        }}
                      >
                        <div
                          style={{
                            color: "#94a3b8",
                            fontSize: 10,
                            fontWeight: 900,
                            textTransform: "uppercase",
                          }}
                        >
                          {label}
                        </div>
                        <div
                          style={{
                            marginTop: 4,
                            color: "#e2e8f0",
                            fontSize: 12,
                            overflowWrap: "anywhere",
                          }}
                        >
                          {value}
                        </div>
                      </div>
                    ))}
                  </div>

                  {founderPartnerReviewLoading ? (
                    <div
                      style={{
                        marginTop: 14,
                        padding: 13,
                        borderRadius: 10,
                        border:
                          "1px solid rgba(96, 165, 250, 0.28)",
                        background:
                          "rgba(30, 64, 175, 0.11)",
                        color: "#bfdbfe",
                        fontSize: 12,
                      }}
                    >
                      Loading linked Content Partner submission...
                    </div>
                  ) : null}

                  {founderPartnerReviewDetail
                    ?.linkedPartnerSubmission ? (
                    <div
                      style={{
                        marginTop: 15,
                        padding: 15,
                        borderRadius: 13,
                        border:
                          "1px solid rgba(34, 197, 94, 0.34)",
                        background:
                          "linear-gradient(145deg, rgba(20, 83, 45, 0.18), rgba(2, 6, 23, 0.36))",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: 12,
                          flexWrap: "wrap",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              color: "#86efac",
                              fontSize: 11,
                              fontWeight: 950,
                              letterSpacing: 0.9,
                            }}
                          >
                            AGV CONTENT PARTNER SUBMISSION
                          </div>

                          <div
                            style={{
                              marginTop: 5,
                              color: "#f0fdf4",
                              fontSize: 18,
                              fontWeight: 950,
                            }}
                          >
                            {founderPartnerReviewDetail
                              .linkedPartnerSubmission
                              ?.film?.title ||
                              selectedFounderMediaReview.title ||
                              "Partner Film"}
                          </div>

                          <div
                            style={{
                              marginTop: 5,
                              color: "#a7f3d0",
                              fontSize: 11,
                              overflowWrap: "anywhere",
                            }}
                          >
                            {
                              founderPartnerReviewDetail
                                .linkedPartnerSubmission
                                .submissionId
                            }
                          </div>
                        </div>

                        <div
                          style={{
                            padding: "7px 10px",
                            borderRadius: 999,
                            border:
                              "1px solid rgba(34, 197, 94, 0.42)",
                            background:
                              "rgba(22, 101, 52, 0.2)",
                            color: "#bbf7d0",
                            fontSize: 10,
                            fontWeight: 950,
                          }}
                        >
                          OWNER PRIVATE
                        </div>
                      </div>

                      <div
                        style={{
                          marginTop: 14,
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(175px, 1fr))",
                          gap: 9,
                        }}
                      >
                        {[
                          [
                            "Channel",
                            founderPartnerReviewDetail
                              .linkedPartnerSubmission
                              ?.partner?.channelName ||
                              "Not supplied",
                          ],
                          [
                            "Partner",
                            founderPartnerReviewDetail
                              .linkedPartnerSubmission
                              ?.partner?.contactName ||
                              "Not supplied",
                          ],
                          [
                            "Email",
                            founderPartnerReviewDetail
                              .linkedPartnerSubmission
                              ?.partner?.contactEmail ||
                              "Not supplied",
                          ],
                          [
                            "Organization",
                            founderPartnerReviewDetail
                              .linkedPartnerSubmission
                              ?.partner?.organizationName ||
                              "Independent Partner",
                          ],
                          [
                            "Country",
                            founderPartnerReviewDetail
                              .linkedPartnerSubmission
                              ?.partner?.country ||
                              "Not supplied",
                          ],
                          [
                            "Genre",
                            founderPartnerReviewDetail
                              .linkedPartnerSubmission
                              ?.film?.genre ||
                              "Not supplied",
                          ],
                          [
                            "Runtime",
                            founderPartnerReviewDetail
                              .linkedPartnerSubmission
                              ?.film?.runtime ||
                              "Not supplied",
                          ],
                          [
                            "Language",
                            founderPartnerReviewDetail
                              .linkedPartnerSubmission
                              ?.film?.language ||
                              "Not supplied",
                          ],
                          [
                            "Rating",
                            founderPartnerReviewDetail
                              .linkedPartnerSubmission
                              ?.film?.rating ||
                              "Not supplied",
                          ],
                          [
                            "Release Type",
                            founderPartnerReviewDetail
                              .linkedPartnerSubmission
                              ?.releaseSetup?.releaseType ||
                              "Not supplied",
                          ],
                          [
                            "Premiere Date",
                            founderPartnerReviewDetail
                              .linkedPartnerSubmission
                              ?.releaseSetup
                              ?.preferredPremiereDate ||
                              "Not supplied",
                          ],
                          [
                            "Storage",
                            founderPartnerReviewDetail
                              .linkedPartnerSubmission
                              ?.upload?.storageStatus ||
                              "OWNER_PRIVATE",
                          ],
                        ].map(([label, value]) => (
                          <div
                            key={label}
                            style={{
                              padding: 10,
                              borderRadius: 9,
                              border:
                                "1px solid rgba(134, 239, 172, 0.16)",
                              background:
                                "rgba(2, 6, 23, 0.28)",
                            }}
                          >
                            <div
                              style={{
                                color: "#86efac",
                                fontSize: 9,
                                fontWeight: 950,
                                textTransform: "uppercase",
                                letterSpacing: 0.5,
                              }}
                            >
                              {label}
                            </div>
                            <div
                              style={{
                                marginTop: 4,
                                color: "#e2e8f0",
                                fontSize: 11,
                                overflowWrap: "anywhere",
                              }}
                            >
                              {String(value)}
                            </div>
                          </div>
                        ))}
                      </div>

                      {founderPartnerReviewDetail
                        .linkedPartnerSubmission?.film
                        ?.synopsis ? (
                        <div
                          style={{
                            marginTop: 11,
                            padding: 11,
                            borderRadius: 9,
                            background:
                              "rgba(2, 6, 23, 0.3)",
                            color: "#d1fae5",
                            fontSize: 12,
                            lineHeight: 1.6,
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          <strong
                            style={{
                              display: "block",
                              marginBottom: 5,
                              color: "#86efac",
                              fontSize: 10,
                              textTransform: "uppercase",
                            }}
                          >
                            Film Synopsis
                          </strong>
                          {
                            founderPartnerReviewDetail
                              .linkedPartnerSubmission
                              .film.synopsis
                          }
                        </div>
                      ) : null}

                      <div
                        style={{
                          marginTop: 12,
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(150px, 1fr))",
                          gap: 8,
                        }}
                      >
                        {[
                          [
                            "Rights Check",
                            founderPartnerReviewDetail
                              .reviewWorkspace
                              ?.rightsStatus ||
                              "NOT_STARTED",
                          ],
                          [
                            "Technical Review",
                            founderPartnerReviewDetail
                              .reviewWorkspace
                              ?.technicalReview ||
                              "NOT_STARTED",
                          ],
                          [
                            "Editorial Review",
                            founderPartnerReviewDetail
                              .reviewWorkspace
                              ?.editorialReview ||
                              "NOT_STARTED",
                          ],
                          [
                            "Approval",
                            founderPartnerReviewDetail
                              .reviewWorkspace
                              ?.approvalStatus ||
                              "NOT_STARTED",
                          ],
                          [
                            "Network Placement",
                            founderPartnerReviewDetail
                              .reviewWorkspace
                              ?.networkPlacement ||
                              "NOT_STARTED",
                          ],
                        ].map(([label, value]) => (
                          <div
                            key={label}
                            style={{
                              padding: 9,
                              borderRadius: 8,
                              border:
                                "1px solid rgba(250, 204, 21, 0.18)",
                              background:
                                "rgba(113, 63, 18, 0.08)",
                            }}
                          >
                            <div
                              style={{
                                color: "#fde68a",
                                fontSize: 9,
                                fontWeight: 900,
                                textTransform: "uppercase",
                              }}
                            >
                              {label}
                            </div>
                            <div
                              style={{
                                marginTop: 4,
                                color: "#fef3c7",
                                fontSize: 10,
                                fontWeight: 850,
                                overflowWrap: "anywhere",
                              }}
                            >
                              {String(value).replaceAll(
                                "_",
                                " "
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {founderPartnerReviewDetail
                        .linkedPartnerSubmission?.rights ? (
                        <div
                          style={{
                            marginTop: 12,
                            padding: 11,
                            borderRadius: 9,
                            border:
                              "1px solid rgba(96, 165, 250, 0.2)",
                            background:
                              "rgba(30, 64, 175, 0.08)",
                          }}
                        >
                          <div
                            style={{
                              color: "#bfdbfe",
                              fontSize: 10,
                              fontWeight: 950,
                              textTransform: "uppercase",
                              marginBottom: 7,
                            }}
                          >
                            Partner Rights Declarations
                          </div>

                          <div
                            style={{
                              display: "grid",
                              gap: 6,
                            }}
                          >
                            {Object.entries(
                              founderPartnerReviewDetail
                                .linkedPartnerSubmission
                                .rights
                            ).map(([key, value]) => (
                              <div
                                key={key}
                                style={{
                                  display: "flex",
                                  justifyContent:
                                    "space-between",
                                  gap: 12,
                                  padding: "6px 8px",
                                  borderRadius: 7,
                                  background:
                                    "rgba(2, 6, 23, 0.24)",
                                  color: "#dbeafe",
                                  fontSize: 10,
                                }}
                              >
                                <span
                                  style={{
                                    overflowWrap:
                                      "anywhere",
                                  }}
                                >
                                  {key
                                    .replace(
                                      /([A-Z])/g,
                                      " $1"
                                    )
                                    .replaceAll("_", " ")
                                    .trim()}
                                </span>

                                <strong
                                  style={{
                                    color:
                                      value === true
                                        ? "#86efac"
                                        : value === false
                                          ? "#fca5a5"
                                          : "#fde68a",
                                  }}
                                >
                                  {typeof value ===
                                  "boolean"
                                    ? value
                                      ? "CONFIRMED"
                                      : "NOT CONFIRMED"
                                    : String(
                                        value ||
                                          "Not supplied"
                                      )}
                                </strong>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <div
                        style={{
                          marginTop: 11,
                          padding: 10,
                          borderRadius: 9,
                          border:
                            "1px solid rgba(248, 113, 113, 0.22)",
                          background:
                            "rgba(127, 29, 29, 0.08)",
                          color: "#fecaca",
                          fontSize: 10,
                          lineHeight: 1.55,
                        }}
                      >
                        Partner declarations are review evidence only.
                        Founder approval, rights clearance, and publication
                        remain separate protected decisions.
                      </div>
                    </div>
                  ) : null}

                  {selectedFounderMediaReview.description ? (
                    <div
                      style={{
                        marginTop: 13,
                        padding: 11,
                        borderRadius: 9,
                        background: "rgba(2, 6, 23, 0.28)",
                        color: "#cbd5e1",
                        fontSize: 13,
                        lineHeight: 1.6,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {selectedFounderMediaReview.description}
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={requestFounderMediaPreview}
                    disabled={
                      founderMediaReviewAction === "preview"
                    }
                    style={{
                      ...styles.primaryButton,
                      marginTop: 15,
                    }}
                  >
                    {founderMediaReviewAction === "preview"
                      ? "Opening Private Preview..."
                      : "Open 5-Minute Private Preview"}
                  </button>

                  {founderMediaPreviewUrl ? (
                    <div
                      style={{
                        marginTop: 14,
                        padding: 10,
                        borderRadius: 11,
                        border:
                          "1px solid rgba(96, 165, 250, 0.35)",
                        background: "rgba(2, 6, 23, 0.5)",
                      }}
                    >
                      <video
                        key={founderMediaPreviewUrl}
                        src={founderMediaPreviewUrl}
                        controls
                        playsInline
                        preload="metadata"
                        style={{
                          width: "100%",
                          maxHeight: 430,
                          borderRadius: 8,
                          background: "#000",
                        }}
                      />

                      <div
                        style={{
                          marginTop: 7,
                          color: "#94a3b8",
                          fontSize: 11,
                        }}
                      >
                        Temporary protected preview expires:
                        {" "}
                        {founderMediaPreviewExpiresAt ||
                          "approximately five minutes"}
                      </div>
                    </div>
                  ) : null}

                  {selectedFounderMediaReview.status ===
                  "UPLOADED_PENDING_REVIEW" ? (
                    <div
                      style={{
                        marginTop: 17,
                        display: "grid",
                        gap: 13,
                      }}
                    >
                      <div
                        style={{
                          padding: 13,
                          borderRadius: 11,
                          border:
                            "1px solid rgba(34, 197, 94, 0.3)",
                          background: "rgba(22, 101, 52, 0.1)",
                        }}
                      >
                        <label
                          style={{
                            display: "block",
                            color: "#bbf7d0",
                            fontSize: 12,
                            fontWeight: 900,
                            marginBottom: 7,
                          }}
                        >
                          Founder approval note
                        </label>
                        <textarea
                          value={founderMediaReviewNote}
                          onChange={(event) =>
                            setFounderMediaReviewNote(
                              event.target.value
                            )
                          }
                          placeholder="Optional internal approval note"
                          rows={3}
                          style={{
                            width: "100%",
                            padding: 10,
                            borderRadius: 8,
                            border:
                              "1px solid rgba(148, 163, 184, 0.28)",
                            background: "rgba(2, 6, 23, 0.55)",
                            color: "#f8fafc",
                            resize: "vertical",
                          }}
                        />

                        <button
                          type="button"
                          onClick={approveFounderMediaReview}
                          disabled={
                            founderMediaReviewAction === "approve"
                          }
                          style={{
                            ...styles.primaryButton,
                            marginTop: 10,
                          }}
                        >
                          {founderMediaReviewAction === "approve"
                            ? "Saving Approval..."
                            : "Approve for Private Publishing"}
                        </button>
                      </div>

                      <div
                        style={{
                          padding: 13,
                          borderRadius: 11,
                          border:
                            "1px solid rgba(248, 113, 113, 0.3)",
                          background: "rgba(127, 29, 29, 0.1)",
                        }}
                      >
                        <label
                          style={{
                            display: "block",
                            color: "#fecaca",
                            fontSize: 12,
                            fontWeight: 900,
                            marginBottom: 7,
                          }}
                        >
                          Rejection reason
                        </label>
                        <textarea
                          value={founderMediaRejectReason}
                          onChange={(event) =>
                            setFounderMediaRejectReason(
                              event.target.value
                            )
                          }
                          placeholder="A reason is required to reject this upload"
                          rows={3}
                          style={{
                            width: "100%",
                            padding: 10,
                            borderRadius: 8,
                            border:
                              "1px solid rgba(248, 113, 113, 0.3)",
                            background: "rgba(2, 6, 23, 0.55)",
                            color: "#f8fafc",
                            resize: "vertical",
                          }}
                        />

                        <button
                          type="button"
                          onClick={rejectFounderMediaReview}
                          disabled={
                            founderMediaReviewAction === "reject"
                          }
                          style={{
                            ...styles.secondaryButton,
                            marginTop: 10,
                            border:
                              "1px solid rgba(248, 113, 113, 0.48)",
                            color: "#fecaca",
                          }}
                        >
                          {founderMediaReviewAction === "reject"
                            ? "Saving Rejection..."
                            : "Reject Media"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        marginTop: 16,
                        padding: 14,
                        borderRadius: 11,
                        border:
                          "1px solid rgba(148, 163, 184, 0.24)",
                        background: "rgba(2, 6, 23, 0.28)",
                      }}
                    >
                      <div
                        style={{
                          color: "#cbd5e1",
                          fontSize: 13,
                          fontWeight: 800,
                        }}
                      >
                        Review decision: {selectedFounderMediaReview.status}
                      </div>

                      {selectedFounderMediaReview.status ===
                      "APPROVED_FOR_PRIVATE_PUBLISHING" ? (
                        <div style={{ marginTop: 12 }}>
                          <div
                            style={{
                              marginBottom: 10,
                              color: "#bbf7d0",
                              fontSize: 12,
                              lineHeight: 1.6,
                            }}
                          >
                            Founder approval is complete. This will
                            publish the media only to the Owner-private
                            AGV Network test library.
                          </div>

                          <button
                            type="button"
                            onClick={
                              publishFounderMediaToPrivateNetwork
                            }
                            disabled={
                              founderMediaReviewAction ===
                              "publish"
                            }
                            style={{
                              ...styles.primaryButton,
                              width: "100%",
                            }}
                          >
                            {founderMediaReviewAction ===
                            "publish"
                              ? "Publishing to Private AGV Network..."
                              : "Publish to Private AGV Network"}
                          </button>
                        </div>
                      ) : null}

                      {selectedFounderMediaReview.status ===
                      "PUBLISHED_PRIVATE_TEST" ? (
                        <div style={{ marginTop: 12 }}>
                          <div
                            style={{
                              padding: 11,
                              borderRadius: 9,
                              border:
                                "1px solid rgba(34, 197, 94, 0.38)",
                              background: "rgba(22, 101, 52, 0.14)",
                              color: "#bbf7d0",
                              fontSize: 12,
                              lineHeight: 1.6,
                            }}
                          >
                            Published to AGV Network On Demand —
                            Owner Private Test. Public access remains
                            disabled.
                          </div>

                          <button
                            type="button"
                            onClick={
                              unpublishFounderMediaFromPrivateNetwork
                            }
                            disabled={
                              founderMediaReviewAction ===
                              "unpublish"
                            }
                            style={{
                              ...styles.secondaryButton,
                              width: "100%",
                              marginTop: 10,
                              border:
                                "1px solid rgba(248, 113, 113, 0.45)",
                              color: "#fecaca",
                            }}
                          >
                            {founderMediaReviewAction ===
                            "unpublish"
                              ? "Unpublishing from AGV Network..."
                              : "Unpublish from AGV Network"}
                          </button>
                        </div>
                      ) : null}

                      {selectedFounderMediaReview.status ===
                      "UNPUBLISHED" ? (
                        <div style={{ marginTop: 12 }}>
                          <div
                            style={{
                              marginBottom: 10,
                              color: "#fde68a",
                              fontSize: 12,
                              lineHeight: 1.6,
                            }}
                          >
                            This item has been removed from the private
                            test library. The protected stored file and
                            Founder approval remain available.
                          </div>

                          <button
                            type="button"
                            onClick={
                              publishFounderMediaToPrivateNetwork
                            }
                            disabled={
                              founderMediaReviewAction ===
                              "publish"
                            }
                            style={{
                              ...styles.primaryButton,
                              width: "100%",
                            }}
                          >
                            {founderMediaReviewAction ===
                            "publish"
                              ? "Republishing to Private AGV Network..."
                              : "Republish to Private AGV Network"}
                          </button>
                        </div>
                      ) : null}

                      {selectedFounderMediaReview.status ===
                      "REJECTED_BY_FOUNDER" ? (
                        <div
                          style={{
                            marginTop: 10,
                            color: "#fecaca",
                            fontSize: 12,
                            lineHeight: 1.6,
                          }}
                        >
                          This media was rejected and cannot be
                          published.
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              ) : (
                <div
                  style={{
                    color: "#94a3b8",
                    fontSize: 13,
                    lineHeight: 1.7,
                  }}
                >
                  Refresh the review queue and select an uploaded
                  media item to begin Founder review.
                </div>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {/* PASS CU-10H4 FOUNDER PUBLIC PUBLISHING CLIENT CONTROLS */}
      {activeAdminWorkspace === "media-review" ? (
        <section
          style={{
            maxWidth: 1180,
            margin: "0 auto 18px",
            padding: 20,
            borderRadius: 16,
            border:
              "1px solid rgba(34, 197, 94, 0.34)",
            background:
              "linear-gradient(145deg, rgba(5, 46, 22, 0.32), rgba(15, 23, 42, 0.96))",
            boxShadow:
              "0 18px 38px rgba(0, 0, 0, 0.25)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 14,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  color: "#86efac",
                  fontSize: 12,
                  fontWeight: 900,
                  letterSpacing: 1,
                }}
              >
                CONTROLLED AGV NETWORK PUBLICATION
              </div>
              <h3
                style={{
                  margin: "6px 0 0",
                  color: "#f8fafc",
                  fontSize: 22,
                }}
              >
                Founder Public Publishing Controls
              </h3>
              <div
                style={{
                  marginTop: 7,
                  color: "#94a3b8",
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
              >
                Stage, activate, or immediately stop public playback.
                Rights and stored-file verification are enforced again
                by the SERVER before activation.
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gap: 6,
                minWidth: 220,
              }}
            >
              <div
                style={{
                  padding: 9,
                  borderRadius: 9,
                  border:
                    "1px solid rgba(148, 163, 184, 0.22)",
                  background: "rgba(2, 6, 23, 0.38)",
                  color: "#e2e8f0",
                  fontSize: 11,
                }}
              >
                Registry: {selectedFounderMediaReview?.publicPublication
                  ?.registryStatus || "NOT_STAGED"}
              </div>
              <div
                style={{
                  padding: 9,
                  borderRadius: 9,
                  border:
                    selectedFounderMediaReview?.publicAccess === true
                      ? "1px solid rgba(34, 197, 94, 0.45)"
                      : "1px solid rgba(248, 113, 113, 0.34)",
                  background:
                    selectedFounderMediaReview?.publicAccess === true
                      ? "rgba(22, 101, 52, 0.16)"
                      : "rgba(127, 29, 29, 0.12)",
                  color:
                    selectedFounderMediaReview?.publicAccess === true
                      ? "#bbf7d0"
                      : "#fecaca",
                  fontSize: 11,
                  fontWeight: 900,
                }}
              >
                Public Access: {selectedFounderMediaReview?.publicAccess
                  ? "ENABLED"
                  : selectedFounderMediaReview?.publicPublication
                        ?.publicationMode === "SCHEDULED" ||
                      selectedFounderMediaReview?.publicationControl
                        ?.mode === "SCHEDULED"
                    ? "SCHEDULED"
                    : "DISABLED"}
              </div>
            </div>
          </div>

          {controlledPublicPublicationError ? (
            <div
              style={{
                marginTop: 14,
                padding: 11,
                borderRadius: 9,
                border:
                  "1px solid rgba(248, 113, 113, 0.42)",
                background: "rgba(127, 29, 29, 0.18)",
                color: "#fecaca",
                fontSize: 12,
              }}
            >
              {controlledPublicPublicationError}
            </div>
          ) : null}

          {controlledPublicPublicationError ===
          "Separate rights clearance is required for Partner or outside content."
            ? renderFounderAdminDecisionPanel(
                selectedFounderMediaReview,
                "controlled"
              )
            : null}

          {selectedFounderMediaReview ? (
            <div style={{ marginTop: 17 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
                  gap: 12,
                }}
              >
                <label
                  style={{
                    display: "grid",
                    gap: 6,
                    color: "#cbd5e1",
                    fontSize: 12,
                  }}
                >
                  Public title
                  <input
                    value={controlledPublicTitle}
                    onChange={(event) =>
                      setControlledPublicTitle(event.target.value)
                    }
                    style={{
                      padding: 10,
                      borderRadius: 8,
                      border:
                        "1px solid rgba(148, 163, 184, 0.3)",
                      background: "rgba(2, 6, 23, 0.62)",
                      color: "#f8fafc",
                    }}
                  />
                </label>

                <label
                  style={{
                    display: "grid",
                    gap: 6,
                    color: "#cbd5e1",
                    fontSize: 12,
                  }}
                >
                  Public attribution
                  <input
                    value={controlledPublicAttribution}
                    onChange={(event) =>
                      setControlledPublicAttribution(
                        event.target.value
                      )
                    }
                    style={{
                      padding: 10,
                      borderRadius: 8,
                      border:
                        "1px solid rgba(148, 163, 184, 0.3)",
                      background: "rgba(2, 6, 23, 0.62)",
                      color: "#f8fafc",
                    }}
                  />
                </label>
              </div>

              {/* PASS FPA-02 - FOUNDER PUBLIC ACCESS DECISION */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
                  gap: 12,
                  marginTop: 12,
                }}
              >
                <label
                  style={{
                    display: "grid",
                    gap: 6,
                    color: "#cbd5e1",
                    fontSize: 12,
                  }}
                >
                  Public access decision
                  <select
                    value={controlledPublicAccessMode}
                    onChange={(event) => {
                      const nextMode = event.target.value;

                      setControlledPublicAccessMode(nextMode);
                      setControlledPublicPublicationError(
                        ""
                      );

                      if (nextMode !== "SCHEDULED") {
                        setControlledPublicPublishAt("");
                      }
                    }}
                    style={{
                      padding: 10,
                      borderRadius: 8,
                      border:
                        "1px solid rgba(148, 163, 184, 0.3)",
                      background: "rgba(2, 6, 23, 0.62)",
                      color: "#f8fafc",
                    }}
                  >
                    <option value="ENABLED">
                      Enabled — publish after final Founder confirmation
                    </option>
                    <option value="DISABLED">
                      Disabled — keep private
                    </option>
                    <option value="SCHEDULED">
                      Scheduled — publish at a future date
                    </option>
                  </select>
                </label>

                {controlledPublicAccessMode === "SCHEDULED" ? (
                  <label
                    style={{
                      display: "grid",
                      gap: 6,
                      color: "#cbd5e1",
                      fontSize: 12,
                    }}
                  >
                    Scheduled publication date and time
                    <input
                      type="datetime-local"
                      value={controlledPublicPublishAt}
                      onChange={(event) =>
                        setControlledPublicPublishAt(
                          event.target.value
                        )
                      }
                      style={{
                        padding: 10,
                        borderRadius: 8,
                        border:
                          "1px solid rgba(250, 204, 21, 0.4)",
                        background: "rgba(2, 6, 23, 0.62)",
                        color: "#f8fafc",
                      }}
                    />
                  </label>
                ) : (
                  <div
                    style={{
                      padding: 11,
                      borderRadius: 8,
                      border:
                        "1px solid rgba(148, 163, 184, 0.22)",
                      background: "rgba(2, 6, 23, 0.38)",
                      color: "#94a3b8",
                      fontSize: 12,
                      lineHeight: 1.6,
                    }}
                  >
                    {controlledPublicAccessMode === "ENABLED"
                      ? "Enabled continues to the existing final Founder confirmation before public playback begins."
                      : "Disabled keeps the media private without changing its AGV ownership certification."}
                  </div>
                )}
              </div>

              <label
                style={{
                  display: "grid",
                  gap: 6,
                  marginTop: 12,
                  color: "#cbd5e1",
                  fontSize: 12,
                }}
              >
                Public description
                <textarea
                  value={controlledPublicDescription}
                  onChange={(event) =>
                    setControlledPublicDescription(event.target.value)
                  }
                  rows={3}
                  style={{
                    padding: 10,
                    borderRadius: 8,
                    border:
                      "1px solid rgba(148, 163, 184, 0.3)",
                    background: "rgba(2, 6, 23, 0.62)",
                    color: "#f8fafc",
                    resize: "vertical",
                  }}
                />
              </label>

              {selectedFounderMediaReview.status ===
              "PUBLISHED_PRIVATE_TEST" &&
              selectedFounderMediaReview?.rightsClearance?.status ===
                "CLEARED_FOR_PUBLIC_PUBLISHING" ? (
                <button
                  type="button"
                  onClick={stageFounderMediaForPublicPublication}
                  disabled={
                    controlledPublicPublicationAction === "stage" ||
                    controlledPublicAccessMode === "DISABLED" ||
                    (controlledPublicAccessMode ===
                      "SCHEDULED" &&
                      !controlledPublicPublishAt)
                  }
                  style={{
                    ...styles.primaryButton,
                    width: "100%",
                    marginTop: 14,
                    opacity:
                      controlledPublicAccessMode === "DISABLED"
                        ? 0.58
                        : 1,
                  }}
                >
                  {controlledPublicPublicationAction === "stage"
                    ? "Saving Founder Public Access Decision..."
                    : controlledPublicAccessMode ===
                        "SCHEDULED"
                      ? "Save Scheduled Publication"
                      : controlledPublicAccessMode ===
                          "ENABLED"
                        ? "Stage for Public Activation"
                        : "Public Access Remains Disabled"}
                </button>
              ) : null}

              {selectedFounderMediaReview.status ===
              "PUBLICATION_READY_STAGED" ? (
                <div
                  style={{
                    marginTop: 14,
                    padding: 14,
                    borderRadius: 11,
                    border:
                      "1px solid rgba(250, 204, 21, 0.38)",
                    background: "rgba(250, 204, 21, 0.08)",
                  }}
                >
                  <div
                    style={{
                      color: "#fde68a",
                      fontSize: 13,
                      fontWeight: 900,
                    }}
                  >
                    Final Founder activation
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      color: "#cbd5e1",
                      fontSize: 12,
                      lineHeight: 1.6,
                    }}
                  >
                    Enter PUBLISH PUBLICLY exactly. Activating this
                    control makes the media reachable through the
                    public AGV Network playback route.
                  </div>
                  <input
                    value={controlledPublicConfirmation}
                    onChange={(event) =>
                      setControlledPublicConfirmation(
                        event.target.value
                      )
                    }
                    placeholder="PUBLISH PUBLICLY"
                    style={{
                      width: "100%",
                      marginTop: 10,
                      padding: 10,
                      borderRadius: 8,
                      border:
                        "1px solid rgba(250, 204, 21, 0.4)",
                      background: "rgba(2, 6, 23, 0.68)",
                      color: "#f8fafc",
                    }}
                  />
                  <button
                    type="button"
                    onClick={activateFounderMediaPublicly}
                    disabled={
                      controlledPublicPublicationAction ===
                      "activate"
                    }
                    style={{
                      ...styles.primaryButton,
                      width: "100%",
                      marginTop: 10,
                    }}
                  >
                    {controlledPublicPublicationAction ===
                    "activate"
                      ? "Publishing Publicly..."
                      : "Publish Publicly"}
                  </button>
                </div>
              ) : null}

              {(selectedFounderMediaReview.status ===
                "PUBLICATION_READY_STAGED" ||
                selectedFounderMediaReview.status ===
                  "PUBLISHED_PUBLIC") ? (
                <div style={{ marginTop: 13 }}>
                  <textarea
                    value={controlledPublicRemovalReason}
                    onChange={(event) =>
                      setControlledPublicRemovalReason(
                        event.target.value
                      )
                    }
                    placeholder={
                      selectedFounderMediaReview.status ===
                      "PUBLISHED_PUBLIC"
                        ? "Required emergency-unpublish reason"
                        : "Required public-staging removal reason"
                    }
                    rows={3}
                    style={{
                      width: "100%",
                      padding: 10,
                      borderRadius: 8,
                      border:
                        "1px solid rgba(248, 113, 113, 0.35)",
                      background: "rgba(2, 6, 23, 0.62)",
                      color: "#f8fafc",
                      resize: "vertical",
                    }}
                  />

                  {selectedFounderMediaReview.status ===
                  "PUBLICATION_READY_STAGED" ? (
                    <button
                      type="button"
                      onClick={
                        unstageFounderMediaFromPublicPublication
                      }
                      disabled={
                        controlledPublicPublicationAction ===
                        "unstage"
                      }
                      style={{
                        ...styles.secondaryButton,
                        width: "100%",
                        marginTop: 9,
                      }}
                    >
                      {controlledPublicPublicationAction ===
                      "unstage"
                        ? "Removing from Public Staging..."
                        : "Remove from Public Staging"}
                    </button>
                  ) : null}

                  {selectedFounderMediaReview.status ===
                  "PUBLISHED_PUBLIC" ? (
                    <button
                      type="button"
                      onClick={emergencyUnpublishFounderMedia}
                      disabled={
                        controlledPublicPublicationAction ===
                        "emergency"
                      }
                      style={{
                        ...styles.secondaryButton,
                        width: "100%",
                        marginTop: 9,
                        border:
                          "1px solid rgba(248, 113, 113, 0.55)",
                        color: "#fecaca",
                      }}
                    >
                      {controlledPublicPublicationAction ===
                      "emergency"
                        ? "Stopping Public Access..."
                        : "Emergency Unpublish"}
                    </button>
                  ) : null}
                </div>
              ) : null}

              {selectedFounderMediaReview.status ===
              "PUBLISHED_PUBLIC" ? (
                <div
                  style={{
                    marginTop: 13,
                    padding: 12,
                    borderRadius: 10,
                    border:
                      "1px solid rgba(34, 197, 94, 0.45)",
                    background: "rgba(22, 101, 52, 0.16)",
                    color: "#bbf7d0",
                    fontSize: 12,
                    lineHeight: 1.6,
                  }}
                >
                  Public playback is active through:
                  <div
                    style={{
                      marginTop: 5,
                      color: "#93c5fd",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {selectedFounderMediaReview?.publicPublication
                      ?.playbackPath || "Public playback route active"}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div
              style={{
                marginTop: 17,
                color: "#94a3b8",
                fontSize: 13,
              }}
            >
              Select an item in Founder Media Review to open its
              controlled public-publication record.
            </div>
          )}
        </section>
      ) : null}
      {/* PASS CU-10G3B VISIBLE CONTROLLED PUBLIC RIGHTS REVIEW */}
      {activeAdminWorkspace === "media-review" ? (
        <section
          style={{
            maxWidth: 1180,
            margin: "0 auto 18px",
            padding: 20,
            borderRadius: 16,
            border:
              "1px solid rgba(96, 165, 250, 0.34)",
            background:
              "linear-gradient(145deg, rgba(7, 18, 42, 0.97), rgba(15, 23, 42, 0.94))",
            boxShadow:
              "0 18px 38px rgba(0, 0, 0, 0.26)",
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
                  color: "#93c5fd",
                  fontSize: 12,
                  fontWeight: 900,
                  letterSpacing: 1,
                }}
              >
                PUBLIC-PUBLISHING SAFETY GATE
              </div>

              <h2
                style={{
                  margin: "6px 0 0",
                  color: "#f8fafc",
                  fontSize: 25,
                }}
              >
                Controlled Public Rights Review
              </h2>

              <div
                style={{
                  marginTop: 7,
                  color: "#94a3b8",
                  fontSize: 13,
                  lineHeight: 1.6,
                  maxWidth: 760,
                }}
              >
                Document ownership, permission, license, public-domain,
                or government-work authority before any future public
                publishing action. Attribution alone is not rights proof.
              </div>
            </div>

            <button
              type="button"
              onClick={loadControlledMediaRightsQueue}
              disabled={controlledRightsLoading}
              style={{
                ...styles.secondaryButton,
                opacity: controlledRightsLoading ? 0.55 : 1,
              }}
            >
              {controlledRightsLoading
                ? "Loading Rights Record..."
                : "Load Rights Record"}
            </button>
          </div>

          <div
            style={{
              marginTop: 14,
              padding: 12,
              borderRadius: 10,
              border:
                "1px solid rgba(250, 204, 21, 0.32)",
              background: "rgba(250, 204, 21, 0.08)",
              color: "#fde68a",
              fontSize: 12,
              lineHeight: 1.6,
            }}
          >
            Public publishing and public playback remain disabled.
            Rights clearance only records future eligibility.
          </div>

          {controlledRightsError ? (
            <div
              style={{
                marginTop: 14,
                padding: 12,
                borderRadius: 10,
                border:
                  "1px solid rgba(248, 113, 113, 0.42)",
                background: "rgba(127, 29, 29, 0.2)",
                color: "#fecaca",
                fontSize: 13,
              }}
            >
              {controlledRightsError}
            </div>
          ) : null}

          {selectedFounderMediaReview ? (
            <div style={{ marginTop: 18 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <strong
                    style={{
                      color: "#f8fafc",
                      fontSize: 18,
                    }}
                  >
                    {selectedFounderMediaReview.title ||
                      selectedFounderMediaReview.filename}
                  </strong>
                  <div
                    style={{
                      marginTop: 4,
                      color: "#93c5fd",
                      fontSize: 11,
                      fontWeight: 800,
                    }}
                  >
                    {selectedFounderMediaReview.intakeId}
                  </div>
                </div>

                <div
                  style={{
                    padding: "7px 10px",
                    borderRadius: 999,
                    border:
                      "1px solid rgba(96, 165, 250, 0.34)",
                    background: "rgba(59, 130, 246, 0.12)",
                    color: "#bfdbfe",
                    fontSize: 11,
                    fontWeight: 900,
                  }}
                >
                  {getSelectedControlledRightsItem()?.rightsClearance
                    ?.status || "NOT_SUBMITTED"}
                </div>
              </div>

              {getSelectedControlledRightsItem()?.rightsClearance
                ?.status === "CLEARED_FOR_PUBLIC_PUBLISHING" ? (
                <div
                  style={{
                    marginTop: 15,
                    padding: 13,
                    borderRadius: 11,
                    border:
                      "1px solid rgba(34, 197, 94, 0.38)",
                    background: "rgba(22, 101, 52, 0.14)",
                    color: "#bbf7d0",
                    fontSize: 13,
                    lineHeight: 1.6,
                  }}
                >
                  Rights evidence has been Founder-certified for a
                  future controlled public-publishing pass. This item
                  is not publicly available.
                </div>
              ) : null}

              <div
                style={{
                  marginTop: 16,
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                  gap: 12,
                }}
              >
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ color: "#cbd5e1", fontSize: 12, fontWeight: 900 }}>
                    Rights basis
                  </span>
                  <select
                    value={controlledRightsBasis}
                    onChange={(event) =>
                      setControlledRightsBasis(event.target.value)
                    }
                    style={{
                      padding: 10,
                      borderRadius: 8,
                      border:
                        "1px solid rgba(148, 163, 184, 0.3)",
                      background: "rgba(2, 6, 23, 0.62)",
                      color: "#f8fafc",
                    }}
                  >
                    <option value="OWNED_ORIGINAL">Owned Original</option>
                    <option value="LICENSED">Licensed</option>
                    <option value="WRITTEN_PERMISSION">Written Permission</option>
                    <option value="PUBLIC_DOMAIN">Public Domain</option>
                    <option value="GOVERNMENT_WORK">Government Work</option>
                  </select>
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ color: "#cbd5e1", fontSize: 12, fontWeight: 900 }}>
                    License type
                  </span>
                  <input
                    value={controlledRightsLicenseType}
                    onChange={(event) =>
                      setControlledRightsLicenseType(event.target.value)
                    }
                    placeholder="Example: CC0 1.0 or signed distribution license"
                    style={{
                      padding: 10,
                      borderRadius: 8,
                      border:
                        "1px solid rgba(148, 163, 184, 0.3)",
                      background: "rgba(2, 6, 23, 0.62)",
                      color: "#f8fafc",
                    }}
                  />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ color: "#cbd5e1", fontSize: 12, fontWeight: 900 }}>
                    License URL
                  </span>
                  <input
                    value={controlledRightsLicenseUrl}
                    onChange={(event) =>
                      setControlledRightsLicenseUrl(event.target.value)
                    }
                    placeholder="Link to the license or permission record"
                    style={{
                      padding: 10,
                      borderRadius: 8,
                      border:
                        "1px solid rgba(148, 163, 184, 0.3)",
                      background: "rgba(2, 6, 23, 0.62)",
                      color: "#f8fafc",
                    }}
                  />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ color: "#cbd5e1", fontSize: 12, fontWeight: 900 }}>
                    Source URL
                  </span>
                  <input
                    value={controlledRightsSourceUrl}
                    onChange={(event) =>
                      setControlledRightsSourceUrl(event.target.value)
                    }
                    placeholder="Original source or provider record"
                    style={{
                      padding: 10,
                      borderRadius: 8,
                      border:
                        "1px solid rgba(148, 163, 184, 0.3)",
                      background: "rgba(2, 6, 23, 0.62)",
                      color: "#f8fafc",
                    }}
                  />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ color: "#cbd5e1", fontSize: 12, fontWeight: 900 }}>
                    Attribution
                  </span>
                  <input
                    value={controlledRightsAttribution}
                    onChange={(event) =>
                      setControlledRightsAttribution(event.target.value)
                    }
                    placeholder="Required attribution, when applicable"
                    style={{
                      padding: 10,
                      borderRadius: 8,
                      border:
                        "1px solid rgba(148, 163, 184, 0.3)",
                      background: "rgba(2, 6, 23, 0.62)",
                      color: "#f8fafc",
                    }}
                  />
                </label>
              </div>

              <label
                style={{
                  display: "grid",
                  gap: 6,
                  marginTop: 12,
                }}
              >
                <span style={{ color: "#cbd5e1", fontSize: 12, fontWeight: 900 }}>
                  Rights evidence reference — required
                </span>
                <textarea
                  value={controlledRightsEvidence}
                  onChange={(event) =>
                    setControlledRightsEvidence(event.target.value)
                  }
                  placeholder="Identify the contract, signed permission, license record, archive rights statement, government source, or ownership documentation."
                  rows={4}
                  style={{
                    padding: 10,
                    borderRadius: 8,
                    border:
                      "1px solid rgba(96, 165, 250, 0.34)",
                    background: "rgba(2, 6, 23, 0.62)",
                    color: "#f8fafc",
                    resize: "vertical",
                  }}
                />
              </label>

              <label
                style={{
                  display: "grid",
                  gap: 6,
                  marginTop: 12,
                }}
              >
                <span style={{ color: "#cbd5e1", fontSize: 12, fontWeight: 900 }}>
                  Internal rights notes
                </span>
                <textarea
                  value={controlledRightsNotes}
                  onChange={(event) =>
                    setControlledRightsNotes(event.target.value)
                  }
                  placeholder="Optional internal review notes"
                  rows={3}
                  style={{
                    padding: 10,
                    borderRadius: 8,
                    border:
                      "1px solid rgba(148, 163, 184, 0.3)",
                    background: "rgba(2, 6, 23, 0.62)",
                    color: "#f8fafc",
                    resize: "vertical",
                  }}
                />
              </label>

              <button
                type="button"
                onClick={submitControlledMediaRightsReview}
                disabled={controlledRightsAction === "submit"}
                style={{
                  ...styles.primaryButton,
                  marginTop: 13,
                }}
              >
                {controlledRightsAction === "submit"
                  ? "Submitting Rights Evidence..."
                  : "Submit for Controlled Rights Review"}
              </button>

              {getSelectedControlledRightsItem()?.rightsClearance
                ?.status === "RIGHTS_CLEARANCE_PENDING" ? (
                <div
                  style={{
                    marginTop: 16,
                    padding: 14,
                    borderRadius: 11,
                    border:
                      "1px solid rgba(34, 197, 94, 0.3)",
                    background: "rgba(22, 101, 52, 0.1)",
                  }}
                >
                  <div style={{ color: "#bbf7d0", fontWeight: 900, fontSize: 13 }}>
                    Founder rights certification
                  </div>

                  {[
                    [
                      controlledRightsCertifyAuthority,
                      setControlledRightsCertifyAuthority,
                      "I certify that AGV has authority to use and distribute this media.",
                    ],
                    [
                      controlledRightsCertifyEvidence,
                      setControlledRightsCertifyEvidence,
                      "I certify that the submitted rights evidence is accurate.",
                    ],
                    [
                      controlledRightsCertifyPublicUse,
                      setControlledRightsCertifyPublicUse,
                      "I certify that the documented rights permit public use.",
                    ],
                  ].map(([checked, setter, label]) => (
                    <label
                      key={label}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 9,
                        marginTop: 10,
                        color: "#d1fae5",
                        fontSize: 12,
                        lineHeight: 1.5,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) =>
                          setter(event.target.checked)
                        }
                      />
                      <span>{label}</span>
                    </label>
                  ))}

                  <textarea
                    value={controlledRightsCertification}
                    onChange={(event) =>
                      setControlledRightsCertification(
                        event.target.value
                      )
                    }
                    placeholder="Founder certification statement describing the authority and evidence reviewed"
                    rows={4}
                    style={{
                      width: "100%",
                      marginTop: 12,
                      padding: 10,
                      borderRadius: 8,
                      border:
                        "1px solid rgba(34, 197, 94, 0.32)",
                      background: "rgba(2, 6, 23, 0.62)",
                      color: "#f8fafc",
                      resize: "vertical",
                    }}
                  />

                  <button
                    type="button"
                    onClick={clearControlledMediaRights}
                    disabled={controlledRightsAction === "clear"}
                    style={{
                      ...styles.primaryButton,
                      marginTop: 10,
                    }}
                  >
                    {controlledRightsAction === "clear"
                      ? "Saving Founder Clearance..."
                      : "Certify Rights for Future Public Publishing"}
                  </button>
                </div>
              ) : null}

              {[
                "RIGHTS_CLEARANCE_PENDING",
                "CLEARED_FOR_PUBLIC_PUBLISHING",
              ].includes(
                getSelectedControlledRightsItem()?.rightsClearance
                  ?.status
              ) ? (
                <div
                  style={{
                    marginTop: 16,
                    padding: 14,
                    borderRadius: 11,
                    border:
                      "1px solid rgba(248, 113, 113, 0.3)",
                    background: "rgba(127, 29, 29, 0.1)",
                  }}
                >
                  <textarea
                    value={controlledRightsRevocationReason}
                    onChange={(event) =>
                      setControlledRightsRevocationReason(
                        event.target.value
                      )
                    }
                    placeholder="Required reason for revoking rights eligibility"
                    rows={3}
                    style={{
                      width: "100%",
                      padding: 10,
                      borderRadius: 8,
                      border:
                        "1px solid rgba(248, 113, 113, 0.3)",
                      background: "rgba(2, 6, 23, 0.62)",
                      color: "#f8fafc",
                      resize: "vertical",
                    }}
                  />

                  <button
                    type="button"
                    onClick={revokeControlledMediaRights}
                    disabled={controlledRightsAction === "revoke"}
                    style={{
                      ...styles.secondaryButton,
                      marginTop: 10,
                      border:
                        "1px solid rgba(248, 113, 113, 0.45)",
                      color: "#fecaca",
                    }}
                  >
                    {controlledRightsAction === "revoke"
                      ? "Revoking Rights Eligibility..."
                      : "Revoke Public-Publishing Eligibility"}
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div
              style={{
                marginTop: 18,
                color: "#94a3b8",
                fontSize: 13,
              }}
            >
              Select an item in Founder Media Review before opening
              its controlled rights record.
            </div>
          )}
        </section>
      ) : null}

      {/* PASS_NOC_01B_ADDITIONAL_ADMIN_CONTROLS */}
      <section
        style={{
          maxWidth: 1180,
          margin: "0 auto 18px",
          borderRadius: 16,
          border: "1px solid rgba(148, 163, 184, 0.22)",
          background: "rgba(7, 18, 42, 0.88)",
          overflow: "hidden",
          boxShadow: "0 14px 30px rgba(0, 0, 0, 0.2)",
        }}
      >
        <button
          type="button"
          onClick={toggleAdditionalAdminControls}
          aria-expanded={additionalAdminControlsOpen}
          style={{
            width: "100%",
            padding: "16px 18px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            border: 0,
            background: additionalAdminControlsOpen
              ? "rgba(250, 204, 21, 0.08)"
              : "transparent",
            color: "#f8fafc",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <div>
            <div
              style={{
                color: "#facc15",
                fontSize: 12,
                fontWeight: 900,
                letterSpacing: 1,
              }}
            >
              SUPER ADMIN TOOLS
            </div>
            <div
              style={{
                marginTop: 4,
                fontSize: 18,
                fontWeight: 900,
              }}
            >
              Additional Super Admin Controls
            </div>
            <div
              style={{
                marginTop: 4,
                color: "#94a3b8",
                fontSize: 13,
              }}
            >
              Operations, support, safety, finance, subscription, and room
              management tools.
            </div>
          </div>

          <div
            style={{
              flexShrink: 0,
              minWidth: 130,
              padding: "9px 13px",
              borderRadius: 10,
              border: "1px solid rgba(148, 163, 184, 0.28)",
              background: "rgba(15, 23, 42, 0.76)",
              color: additionalAdminControlsOpen ? "#fde68a" : "#cbd5e1",
              fontSize: 13,
              fontWeight: 900,
              textAlign: "center",
            }}
          >
            {additionalAdminControlsOpen ? "Hide Controls â–²" : "Show Controls â–¼"}
          </div>
        </button>

        {additionalAdminControlsOpen ? (
          <div
            style={{
              padding: "0 16px 16px",
              borderTop: "1px solid rgba(148, 163, 184, 0.14)",
            }}
          >
            <div style={{ maxWidth: 1180, margin: "18px auto" }}>
              <AgvOperationsWorker />
            </div>
      <div style={{ maxWidth: 1180, margin: "0 auto 18px" }}>
        <AgvSupportWorker />
      </div>
      <div style={{ maxWidth: 1180, margin: "0 auto 18px" }}>
        <AgvTrustSafetyComplianceWorker />
        <AgvFinanceOperationsWorker />
      </div>
      <section style={styles.planCard}>
        <div>
          <div style={styles.planBadge}>{limits.label || subscriptionPlan} Plan</div>
          <h2 style={styles.planTitle}>AGV SaaS Usage</h2>
          <p style={styles.planText}>{limits.note || "Subscription authority active."}</p>
          <p style={styles.planText}>
            Account: {account.name || "Not synced"} ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ {account.email || "No email"} ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢{" "}
            {account.organization || "No organization"}
          </p>
        </div>

        <div style={styles.planStats}>
          <div style={styles.statBox}>
            <strong>{roomsUsed}</strong>
            <span>Rooms Used</span>
          </div>

          <div style={styles.statBox}>
            <strong>{limits.maxRooms}</strong>
            <span>Room Limit</span>
          </div>

          <div style={styles.statBox}>
            <strong>{limits.maxViewers}</strong>
            <span>Viewer Limit</span>
          </div>

          <div style={styles.statBox}>
            <strong>{roomsRemaining}</strong>
            <span>Rooms Left</span>
          </div>
        </div>
      </section>

      <section style={styles.grid}>
        <div style={styles.card}>
          <h2>Create New Room</h2>

          <label style={styles.label}>AGV Subscription Plan</label>
          <select
            value={subscriptionPlan}
            onChange={(e) => saveSubscriptionPlan(e.target.value)}
            style={styles.input}
          >
            <option>FREE</option>
            <option>CREATOR</option>
            <option>MINISTRY</option>
            <option>CONVENTION</option>
          </select>

          <div style={styles.limitBox}>
            <strong>{limits.label || subscriptionPlan} Plan Includes:</strong>
            <div>Rooms: {limits.maxRooms}</div>
            <div>Viewer Limit: {limits.maxViewers}</div>
            <div>Private Rooms: {limits.allowPrivate ? "Included" : "Upgrade Required"}</div>
            <div>Ticket-Only Rooms: {limits.allowTicketOnly ? "Included" : "Upgrade Required"}</div>
          </div>

          <div style={styles.enforcementBox}>
            <strong>AGV Subscription Enforcement Check</strong>
            <div>{enforcementMessage}</div>
            {lastEnforcement ? (
              <>
                <div>Last Check: {lastEnforcement.check}</div>
                <div>Allowed: {lastEnforcement.allowed ? "Yes" : "No"}</div>
                <div>Reason: {lastEnforcement.reason}</div>
              </>
            ) : (
              <div>No room creation check has run yet.</div>
            )}
          </div>

          <label style={styles.label}>Room Name</label>
          <input
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="Example: Youth Teaching Hall"
            style={styles.input}
          />

          <label style={styles.label}>Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={styles.input}
          >
            <option>Convention</option>
            <option>Teaching</option>
            <option>Broadcast</option>
            <option>Media</option>
            <option>Community</option>
            <option>Backstage</option>
            <option>Private Session</option>
          </select>

          <label style={styles.label}>Room Privacy</label>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
            style={styles.input}
          >
            <option>Public</option>
            <option>Private</option>
            <option>Ticket Only</option>
          </select>

          <label style={styles.label}>Assigned Host</label>
          <input
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="Example: Pastor Smith"
            style={styles.input}
          />

          {upgradeMessage ? <div style={styles.upgradeBox}>{upgradeMessage}</div> : null}

          <button style={styles.primaryButton} onClick={createRoom}>
            Create Room
          </button>
        </div>

        <div style={styles.card}>
          <h2>Upgrade Path</h2>

          <div style={styles.upgradeGrid}>
            <UpgradeCard
              title="Free"
              text="1 room, 25 viewers, public rooms only."
              current={subscriptionPlan === "FREE"}
            />

            <UpgradeCard
              title="Creator"
              text="3 rooms, 100 viewers, private and ticket-only rooms."
              buttonText="Upgrade to Creator"
              onUpgrade={() => startCheckout("CREATOR")}
              current={subscriptionPlan === "CREATOR"}
            />

            <UpgradeCard
              title="Ministry / Pro"
              text="10 rooms, 500 viewers, church and conference ready."
              buttonText="Upgrade to Ministry"
              onUpgrade={() => startCheckout("MINISTRY")}
              current={subscriptionPlan === "MINISTRY"}
            />

            <UpgradeCard
              title="Convention"
              text="50 rooms, 2,000 viewers, full digital venue capability."
              buttonText="Upgrade to Convention"
              onUpgrade={() => startCheckout("CONVENTION")}
              current={subscriptionPlan === "CONVENTION"}
            />
          </div>
        </div>
      </section>
          </div>
        ) : null}
      </section>

      {/* PASS_NOC_01_AGV_NETWORK_OPERATIONS_CENTER */}
      {/* PASS NOC-02B1 NEW AGV NETWORK CONTROL CENTER */}
      <section
        id="agv-network-control-center"
        style={{ ...styles.cardWide, marginBottom: 18 }}
      >
        <div
          style={{
            marginBottom: 22,
            padding: 22,
            borderRadius: 18,
            border: "1px solid rgba(212, 175, 55, 0.42)",
            background:
              "linear-gradient(145deg, rgba(7, 18, 42, 0.98), rgba(16, 38, 78, 0.94))",
            boxShadow:
              "0 18px 42px rgba(0, 0, 0, 0.26), inset 0 1px 0 rgba(255, 255, 255, 0.04)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 18,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={styles.badge}>
                AGV NETWORK — FOUNDER CONTROL
              </div>

              <h1
                style={{
                  margin: "10px 0 6px",
                  fontSize: "clamp(28px, 4vw, 42px)",
                  lineHeight: 1.08,
                }}
              >
                AGV Network Control Center
              </h1>

              <p
                style={{
                  ...styles.subtitle,
                  margin: 0,
                  maxWidth: 790,
                }}
              >
                Manage the same AGV Network experience viewers see:
                Live Stations, On Demand, News, Education, Archives,
                Content Partners, rights, and protected publishing.
              </p>
            </div>

            <div
              style={{
                display: "flex",
                gap: 9,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 999,
                  border:
                    "1px solid rgba(74, 222, 128, 0.4)",
                  background:
                    "rgba(34, 197, 94, 0.1)",
                  color: "#bbf7d0",
                  fontSize: 12,
                  fontWeight: 900,
                  letterSpacing: 0.8,
                  whiteSpace: "nowrap",
                }}
              >
                CONTROL CENTER ACTIVE
              </div>

              <button
                type="button"
                style={styles.primaryButton}
                onClick={() =>
                  window.open(
                    "/?agvNetwork=1",
                    "_blank",
                    "noopener"
                  )
                }
              >
                Open Public AGV Network
              </button>
            </div>
          </div>

          <div
            style={{
              marginTop: 20,
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(155px, 1fr))",
              gap: 10,
            }}
          >
            {[
              ["home", "Home", "Network command overview"],
              ["live", "Live Stations", "Manage live station feeds"],
              ["ondemand", "On Demand", "Owner-private media library"],
              ["news", "News", "Sources and Partner news"],
              ["education", "Education", "Teaching and training media"],
              ["archives", "Archives", "Historical and preserved media"],
              ["partners", "Content Partners", "Filmmaker submission operations"],
              ["publishing", "Publishing", "Controlled intake and release"],
            ].map(([id, title, description]) => {
              const active =
                activeNetworkSection === id;

              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    selectNetworkSection(id);

                    if (id === "archives") {
                      loadPublicArchiveMediaCatalog();
                    }
                  }}
                  style={{
                    minHeight: 92,
                    padding: 13,
                    borderRadius: 12,
                    border: active
                      ? "1px solid rgba(250,204,21,0.8)"
                      : "1px solid rgba(148,163,184,0.2)",
                    background: active
                      ? "linear-gradient(145deg, rgba(250,204,21,0.2), rgba(112,79,10,0.24))"
                      : "linear-gradient(145deg, rgba(15,23,42,0.72), rgba(7,18,42,0.76))",
                    color: "#f8fafc",
                    textAlign: "left",
                    cursor: "pointer",
                    boxShadow: active
                      ? "0 0 24px rgba(250,204,21,0.11)"
                      : "inset 0 1px 0 rgba(255,255,255,0.03)",
                  }}
                >
                  <div
                    style={{
                      color: active
                        ? "#fde047"
                        : "#f8d66d",
                      fontSize: 13,
                      fontWeight: 900,
                    }}
                  >
                    {title}
                  </div>

                  <div
                    style={{
                      marginTop: 6,
                      color: active
                        ? "#e2e8f0"
                        : "#94a3b8",
                      fontSize: 11,
                      lineHeight: 1.4,
                    }}
                  >
                    {description}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* PASS NOC-02B2-V3 NETWORK WORKSPACES */}

        {activeNetworkSection === "home" ? (
          <section
            style={{
              marginBottom: 22,
              padding: 22,
              borderRadius: 18,
              border:
                "1px solid rgba(212,175,55,0.34)",
              background:
                "linear-gradient(145deg, rgba(7,18,42,0.94), rgba(15,23,42,0.78))",
            }}
          >
            <div style={styles.badge}>
              NETWORK OVERVIEW
            </div>

            <h2 style={{ margin: "8px 0 6px" }}>
              AGV Network Home
            </h2>

            <p
              style={{
                ...styles.meta,
                maxWidth: 820,
                lineHeight: 1.7,
              }}
            >
              Operate Live Stations, On Demand,
              News, Education, Archives, Content
              Partners, and protected publishing
              from one Founder-controlled workspace.
            </p>

            <div
              style={{
                marginTop: 18,
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 12,
              }}
            >
              {[
                [
                  "Live Stations",
                  networkStations.filter(
                    (station) =>
                      station.enabled !== false
                  ).length,
                ],
                [
                  "Private On Demand",
                  ownerPrivateMediaItems.length,
                ],
                [
                  "Founder Review Queue",
                  founderMediaReviewItems.length,
                ],
                [
                  "Public Network",
                  "Founder Controlled",
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    padding: 16,
                    borderRadius: 13,
                    border:
                      "1px solid rgba(148,163,184,0.18)",
                    background:
                      "rgba(2,6,23,0.34)",
                  }}
                >
                  <div
                    style={{
                      color: "#94a3b8",
                      fontSize: 11,
                      fontWeight: 900,
                      textTransform: "uppercase",
                    }}
                  >
                    {label}
                  </div>

                  <div
                    style={{
                      marginTop: 7,
                      color: "#f8fafc",
                      fontSize: 22,
                      fontWeight: 950,
                    }}
                  >
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {activeNetworkSection === "news" ? (
          <section style={styles.card}>
            <div style={styles.badge}>
              AGV NETWORK NEWS
            </div>
            <h2>News Operations</h2>
            <p style={styles.meta}>
              Manage approved independent
              journalists, public briefings,
              verified sources, local news, and
              breaking-news programming.
            </p>
            <div style={styles.enforcementBox}>
              No news source becomes public without
              Founder approval and source
              verification.
            </div>
          </section>
        ) : null}

        {activeNetworkSection === "education" ? (
          <section style={styles.card}>
            <div style={styles.badge}>
              AGV NETWORK EDUCATION
            </div>
            <h2>Education Operations</h2>
            <p style={styles.meta}>
              Organize teaching, training,
              University Pal, ministry education,
              and approved instructional media.
            </p>
            <div style={styles.enforcementBox}>
              Education publication remains
              Founder controlled.
            </div>
          </section>
        ) : null}

        {activeNetworkSection === "archives" ? (
          <section
            style={{
              ...styles.card,
              padding: 22,
              border:
                "1px solid rgba(212,175,55,0.38)",
              background:
                "linear-gradient(145deg, rgba(7,18,42,0.98), rgba(15,23,42,0.92))",
            }}
          >
            {/* PASS AGV-NETWORK-ARCHIVES-PUBLIC-CATALOG-01 */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 14,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={styles.badge}>
                  AGV NETWORK ARCHIVES
                </div>

                <h2
                  style={{
                    margin: "10px 0 6px",
                    fontSize: 28,
                  }}
                >
                  Public Archive Library
                </h2>

                <p
                  style={{
                    ...styles.meta,
                    margin: 0,
                    maxWidth: 780,
                    lineHeight: 1.65,
                  }}
                >
                  Historical, public-domain, documentary,
                  preserved, and AGV-owned programming published
                  through the controlled AGV Network media system.
                </p>
              </div>

              <button
                type="button"
                style={styles.secondaryButton}
                disabled={publicArchiveMediaLoading}
                onClick={loadPublicArchiveMediaCatalog}
              >
                {publicArchiveMediaLoading
                  ? "Loading Archives..."
                  : "Refresh Public Archives"}
              </button>
            </div>

            {publicArchiveMediaError ? (
              <div
                style={{
                  marginTop: 16,
                  padding: "12px 14px",
                  borderRadius: 12,
                  border:
                    "1px solid rgba(248,113,113,0.42)",
                  background:
                    "rgba(127,29,29,0.18)",
                  color: "#fecaca",
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
              >
                {publicArchiveMediaError}
              </div>
            ) : null}

            {!publicArchiveMediaLoading &&
            !publicArchiveMediaError &&
            publicArchiveMediaItems.length === 0 ? (
              <div
                style={{
                  marginTop: 18,
                  padding: 18,
                  borderRadius: 14,
                  border:
                    "1px dashed rgba(148,163,184,0.28)",
                  color: "#94a3b8",
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
              >
                Select Refresh Public Archives to load the current
                public AGV Network catalog.
              </div>
            ) : null}

            {publicArchiveMediaItems.length ? (
              <div
                style={{
                  marginTop: 20,
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(300px, 1fr))",
                  gap: 18,
                }}
              >
                {publicArchiveMediaItems.map((item) => {
                  const playbackUrl =
                    getPublicArchivePlaybackUrl(item);

                  const isPublicDomain =
                    String(item?.rightsBasis || "")
                      .toUpperCase() === "PUBLIC_DOMAIN";

                  const rightsLabel = isPublicDomain
                    ? "PUBLIC DOMAIN"
                    : String(item?.rightsBasis || "")
                        .toUpperCase() === "OWNED_ORIGINAL"
                      ? "AGV ORIGINAL"
                      : "RIGHTS CLEARED";

                  return (
                    <article
                      key={item.intakeId}
                      style={{
                        overflow: "hidden",
                        borderRadius: 16,
                        border:
                          "1px solid rgba(212,175,55,0.3)",
                        background:
                          "linear-gradient(145deg, rgba(7,18,42,0.98), rgba(15,23,42,0.96))",
                        boxShadow:
                          "0 18px 38px rgba(0,0,0,0.28)",
                      }}
                    >
                      <video
                        controls
                        playsInline
                        preload="metadata"
                        src={playbackUrl}
                        style={{
                          display: "block",
                          width: "100%",
                          aspectRatio: "16 / 9",
                          objectFit: "contain",
                          background: "#000",
                        }}
                      >
                        Your browser does not support HTML5 video.
                      </video>

                      <div style={{ padding: 16 }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent:
                              "space-between",
                            alignItems: "flex-start",
                            gap: 10,
                            flexWrap: "wrap",
                          }}
                        >
                          <h3
                            style={{
                              margin: 0,
                              flex: "1 1 220px",
                              color: "#f8fafc",
                              fontSize: 18,
                              lineHeight: 1.35,
                            }}
                          >
                            {item?.title ||
                              "AGV Network Archive"}
                          </h3>

                          <div
                            style={{
                              padding: "5px 9px",
                              borderRadius: 999,
                              border: isPublicDomain
                                ? "1px solid rgba(34,197,94,0.42)"
                                : "1px solid rgba(96,165,250,0.42)",
                              background: isPublicDomain
                                ? "rgba(22,101,52,0.22)"
                                : "rgba(30,64,175,0.22)",
                              color: isPublicDomain
                                ? "#bbf7d0"
                                : "#bfdbfe",
                              fontSize: 10,
                              fontWeight: 900,
                              letterSpacing: "0.06em",
                            }}
                          >
                            {rightsLabel}
                          </div>
                        </div>

                        <p
                          style={{
                            margin: "10px 0 0",
                            color: "#cbd5e1",
                            fontSize: 13,
                            lineHeight: 1.6,
                          }}
                        >
                          {item?.description ||
                            "AGV Network archival presentation."}
                        </p>

                        <div
                          style={{
                            marginTop: 14,
                            paddingTop: 12,
                            borderTop:
                              "1px solid rgba(148,163,184,0.16)",
                            color: "#93c5fd",
                            fontSize: 12,
                            lineHeight: 1.55,
                          }}
                        >
                          <strong>Attribution:</strong>{" "}
                          {item?.attribution ||
                            "Attribution on file"}
                        </div>

                        <div
                          style={{
                            marginTop: 6,
                            color: "#fde68a",
                            fontSize: 12,
                            lineHeight: 1.55,
                          }}
                        >
                          <strong>License:</strong>{" "}
                          {item?.licenseType ||
                            item?.rightsBasis ||
                            "Rights information on file"}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : null}
          </section>
        ) : null}

        {activeNetworkSection === "partners" ? (
          <section style={styles.card}>
            <div style={styles.badge}>
              CONTENT PARTNER OPERATIONS
            </div>
            <h2>Content Partners</h2>
            <p style={styles.meta}>
              Review filmmaker submissions,
              technical review, editorial review,
              linked intake, and Founder decisions.
            </p>
            {/* PASS CP-10 SUPER ADMIN FOUNDER REVIEW ONLY */}
            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >

              <button
                type="button"
                style={{
                  ...styles.primaryButton,
                  background: "rgba(15, 23, 42, 0.9)",
                  border: "1px solid rgba(250, 204, 21, 0.55)",
                  color: "#fde68a",
                }}
                onClick={() => {
                  selectAdminWorkspace("media-review");
                  loadFounderMediaReviewItems();
                }}
              >
                Open Founder Media Review
              </button>
            </div>
          </section>
        ) : null}

        <div
          style={{
            display:
              activeNetworkSection === "live"
                ? "block"
                : "none",
          }}
        >
        <div
          id="agv-network-live-stations"
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            alignItems: "start",
            flexWrap: "wrap",
            scrollMarginTop: 18,
          }}
        >
          <div>
            <div style={styles.badge}>STATION OPERATIONS</div>
            <h2 style={{ margin: "10px 0 6px" }}>
              AGV Network Station Control
            </h2>
            <p style={styles.meta}>
              Platform-owned 24/7 stations. These remain separate from host
              rooms and do not count against subscription room limits.
            </p>
          </div>

          <button
            style={styles.secondaryButton}
            onClick={() =>
              window.open("/?agvNetwork=1", "_blank", "noopener")
            }
          >
            Open AGV Network
          </button>
        </div>

        <div style={styles.enforcementBox}>{networkMessage}</div>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            marginTop: 12,
          }}
        >
          <button
            style={styles.primaryButton}
            disabled={networkSyncing}
            onClick={publishNetworkStations}
          >
            {networkSyncing ? "Working..." : "Publish Registry"}
          </button>

          <button
            style={styles.secondaryButton}
            disabled={networkSyncing}
            onClick={loadNetworkStationsFromServer}
          >
            Reload Server Registry
          </button>
        </div>
        </div>

        {/* PASS CU-10F1 OWNER PRIVATE AGV NETWORK LIBRARY PANEL */}
        <section
          id="agv-network-private-ondemand"
          style={{
            display:
              activeNetworkSection === "ondemand"
                ? "block"
                : "none",
            scrollMarginTop: 18,
            marginTop: 22,
            marginBottom: 22,
            padding: 22,
            borderRadius: 18,
            border:
              "1px solid rgba(96, 165, 250, 0.36)",
            background:
              "linear-gradient(145deg, rgba(7, 18, 42, 0.98), rgba(14, 31, 63, 0.95))",
            boxShadow:
              "0 18px 42px rgba(0, 0, 0, 0.26)",
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
              <div style={styles.badge}>OWNER PRIVATE MEDIA</div>
              <h2
                style={{
                  margin: "10px 0 6px",
                  fontSize: 28,
                }}
              >
                AGV Network On Demand — Private Library
              </h2>
              <p
                style={{
                  ...styles.meta,
                  margin: 0,
                  maxWidth: 760,
                  lineHeight: 1.6,
                }}
              >
                Founder-approved private test media. Playback uses
                temporary protected tickets and is not available to
                regular viewers.
              </p>
            </div>

            <button
              type="button"
              onClick={loadOwnerPrivateMediaLibrary}
              disabled={ownerPrivateMediaLoading}
              style={{
                ...styles.secondaryButton,
                opacity: ownerPrivateMediaLoading ? 0.55 : 1,
              }}
            >
              {ownerPrivateMediaLoading
                ? "Loading Private Library..."
                : "Refresh Private Library"}
            </button>
          </div>

          {ownerPrivateMediaError ? (
            <div
              style={{
                marginTop: 14,
                padding: 12,
                borderRadius: 10,
                border:
                  "1px solid rgba(248, 113, 113, 0.4)",
                background: "rgba(127, 29, 29, 0.18)",
                color: "#fecaca",
                fontSize: 13,
              }}
            >
              {ownerPrivateMediaError}
            </div>
          ) : null}

          <div
            style={{
              marginTop: 18,
              display: "grid",
              gridTemplateColumns: "minmax(250px, 0.8fr) minmax(0, 1.7fr)",
              gap: 18,
            }}
          >
            <div
              style={{
                padding: 13,
                borderRadius: 13,
                border:
                  "1px solid rgba(148, 163, 184, 0.2)",
                background: "rgba(15, 23, 42, 0.58)",
              }}
            >
              <div
                style={{
                  marginBottom: 10,
                  color: "#e2e8f0",
                  fontSize: 14,
                  fontWeight: 900,
                }}
              >
                Published Private Items ({ownerPrivateMediaItems.length})
              </div>

              {!ownerPrivateMediaLoading &&
              ownerPrivateMediaItems.length === 0 ? (
                <div
                  style={{
                    color: "#94a3b8",
                    fontSize: 13,
                    lineHeight: 1.6,
                  }}
                >
                  Press Refresh Private Library to load privately
                  published AGV Network media.
                </div>
              ) : null}

              <div
                style={{
                  display: "grid",
                  gap: 9,
                  maxHeight: 440,
                  overflowY: "auto",
                }}
              >
                {ownerPrivateMediaItems.map((item) => {
                  const selected =
                    selectedOwnerPrivateMedia?.intakeId ===
                    item.intakeId;

                  return (
                    <button
                      key={item.intakeId}
                      type="button"
                      onClick={() =>
                        selectOwnerPrivateMediaItem(item)
                      }
                      style={{
                        padding: 12,
                        borderRadius: 10,
                        border: selected
                          ? "1px solid rgba(96, 165, 250, 0.7)"
                          : "1px solid rgba(148, 163, 184, 0.2)",
                        background: selected
                          ? "rgba(59, 130, 246, 0.14)"
                          : "rgba(2, 6, 23, 0.32)",
                        color: "#f8fafc",
                        textAlign: "left",
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 900,
                          fontSize: 14,
                        }}
                      >
                        {item.title || item.filename}
                      </div>

                      <div
                        style={{
                          marginTop: 5,
                          color: "#93c5fd",
                          fontSize: 11,
                          fontWeight: 800,
                          overflowWrap: "anywhere",
                        }}
                      >
                        {item.intakeId}
                      </div>

                      <div
                        style={{
                          marginTop: 6,
                          color: "#bbf7d0",
                          fontSize: 11,
                        }}
                      >
                        OWNER PRIVATE TEST
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              style={{
                padding: 15,
                borderRadius: 13,
                border:
                  "1px solid rgba(96, 165, 250, 0.23)",
                background: "rgba(15, 23, 42, 0.5)",
              }}
            >
              {selectedOwnerPrivateMedia ? (
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 14,
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          margin: 0,
                          color: "#f8fafc",
                          fontSize: 22,
                        }}
                      >
                        {selectedOwnerPrivateMedia.title ||
                          selectedOwnerPrivateMedia.filename}
                      </h3>

                      <div
                        style={{
                          marginTop: 6,
                          color: "#93c5fd",
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      >
                        {selectedOwnerPrivateMedia.intakeId}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: "7px 10px",
                        borderRadius: 999,
                        border:
                          "1px solid rgba(34, 197, 94, 0.38)",
                        background: "rgba(22, 101, 52, 0.14)",
                        color: "#bbf7d0",
                        fontSize: 11,
                        fontWeight: 900,
                      }}
                    >
                      PRIVATE ON DEMAND
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: 14,
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                      gap: 10,
                    }}
                  >
                    {[
                      [
                        "Original File",
                        selectedOwnerPrivateMedia.filename,
                      ],
                      [
                        "Size",
                        formatMediaFileSize(
                          selectedOwnerPrivateMedia.filesize
                        ),
                      ],
                      [
                        "Published",
                        selectedOwnerPrivateMedia.publishedAt ||
                          "Private test publication",
                      ],
                      [
                        "Public Access",
                        selectedOwnerPrivateMedia?.publicAccess ===
                        true
                          ? "Enabled"
                          : selectedOwnerPrivateMedia
                                ?.publicPublication
                                ?.publicationMode ===
                              "SCHEDULED" ||
                            selectedOwnerPrivateMedia
                              ?.publicationControl?.mode ===
                              "SCHEDULED"
                            ? "Scheduled"
                            : "Disabled",
                      ],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        style={{
                          padding: 10,
                          borderRadius: 9,
                          border:
                            "1px solid rgba(148, 163, 184, 0.18)",
                          background: "rgba(2, 6, 23, 0.28)",
                        }}
                      >
                        <div
                          style={{
                            color: "#94a3b8",
                            fontSize: 10,
                            fontWeight: 900,
                            textTransform: "uppercase",
                          }}
                        >
                          {label}
                        </div>
                        <div
                          style={{
                            marginTop: 4,
                            color: "#e2e8f0",
                            fontSize: 12,
                            overflowWrap: "anywhere",
                          }}
                        >
                          {value}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* PASS FPA-03 - OWNER PRIVATE PUBLIC ACCESS DECISION */}
                  <div
                    style={{
                      marginTop: 13,
                      padding: 13,
                      borderRadius: 11,
                      border:
                        "1px solid rgba(250, 204, 21, 0.3)",
                      background:
                        "rgba(15, 23, 42, 0.64)",
                    }}
                  >
                    <div
                      style={{
                        color: "#fde68a",
                        fontSize: 12,
                        fontWeight: 900,
                        marginBottom: 9,
                      }}
                    >
                      Founder Public Access Decision
                    </div>

                    <select
                      value={ownerPrivatePublicAccessMode}
                      onChange={(event) => {
                        const nextMode = event.target.value;

                        setOwnerPrivatePublicAccessMode(
                          nextMode
                        );
                        setOwnerPrivatePublicError("");
                        setOwnerPrivatePublicConfirmation("");

                        if (nextMode !== "SCHEDULED") {
                          setOwnerPrivatePublicPublishAt("");
                        }
                      }}
                      style={{
                        width: "100%",
                        padding: 11,
                        borderRadius: 9,
                        border:
                          "1px solid rgba(148, 163, 184, 0.3)",
                        background:
                          "rgba(2, 6, 23, 0.72)",
                        color: "#f8fafc",
                      }}
                    >
                      <option value="ENABLED">
                        Enabled — publish publicly on AGV Network
                      </option>
                      <option value="DISABLED">
                        Disabled — keep private
                      </option>
                      <option value="SCHEDULED">
                        Scheduled — publish at a future date
                      </option>
                    </select>

                    {ownerPrivatePublicAccessMode === "SCHEDULED" ? (
                      <input
                        type="datetime-local"
                        value={ownerPrivatePublicPublishAt}
                        onChange={(event) =>
                          setOwnerPrivatePublicPublishAt(
                            event.target.value
                          )
                        }
                        style={{
                          width: "100%",
                          boxSizing: "border-box",
                          marginTop: 9,
                          padding: 11,
                          borderRadius: 9,
                          border:
                            "1px solid rgba(250, 204, 21, 0.42)",
                          background:
                            "rgba(2, 6, 23, 0.72)",
                          color: "#f8fafc",
                        }}
                      />
                    ) : null}

                    {ownerPrivatePublicAccessMode === "ENABLED" ? (
                      <input
                        value={ownerPrivatePublicConfirmation}
                        onChange={(event) =>
                          setOwnerPrivatePublicConfirmation(
                            event.target.value
                          )
                        }
                        placeholder="Type PUBLISH PUBLICLY"
                        style={{
                          width: "100%",
                          boxSizing: "border-box",
                          marginTop: 9,
                          padding: 11,
                          borderRadius: 9,
                          border:
                            "1px solid rgba(34, 197, 94, 0.42)",
                          background:
                            "rgba(2, 6, 23, 0.72)",
                          color: "#f8fafc",
                        }}
                      />
                    ) : null}

                    <button
                      type="button"
                      onClick={
                        applyOwnerPrivatePublicAccessDecision
                      }
                      disabled={
                        Boolean(ownerPrivatePublicAction)
                      }
                      style={{
                        ...styles.primaryButton,
                        width: "100%",
                        marginTop: 10,
                      }}
                    >
                      {ownerPrivatePublicAction
                        ? "Applying Founder Decision..."
                        : ownerPrivatePublicAccessMode ===
                            "ENABLED"
                          ? "Enable Public Access"
                          : ownerPrivatePublicAccessMode ===
                              "SCHEDULED"
                            ? "Save Scheduled Publication"
                            : "Keep Public Access Disabled"}
                    </button>

                    {ownerPrivatePublicError ? (
                      <div
                        style={{
                          marginTop: 9,
                          padding: 9,
                          borderRadius: 8,
                          border:
                            "1px solid rgba(248, 113, 113, 0.4)",
                          background:
                            "rgba(127, 29, 29, 0.18)",
                          color: "#fecaca",
                          fontSize: 12,
                        }}
                      >
                        {ownerPrivatePublicError}
                      </div>
                    ) : null}
                  </div>

                  {ownerPrivatePublicError ===
                  "Separate rights clearance is required for Partner or outside content."
                    ? renderFounderAdminDecisionPanel(
                        selectedOwnerPrivateMedia,
                        "owner-private"
                      )
                    : null}

                  {/* PASS PTK-03 - CONDITIONAL MEDIA ENFORCEMENT */}
                  {isOwnerPartnerMediaItem(
                    selectedOwnerPrivateMedia
                  ) ? (
                    <div
                      style={{
                        marginTop: 13,
                        padding: 13,
                        borderRadius: 11,
                        border:
                          "1px solid rgba(251, 146, 60, 0.5)",
                        background:
                          "rgba(124, 45, 18, 0.22)",
                      }}
                    >
                      <div
                        style={{
                          color: "#fed7aa",
                          fontSize: 13,
                          fontWeight: 900,
                        }}
                      >
                        Emergency Partner Takedown
                      </div>

                      <div
                        style={{
                          marginTop: 6,
                          color: "#cbd5e1",
                          fontSize: 12,
                          lineHeight: 1.55,
                        }}
                      >
                        Immediately stops public playback,
                        suspends the linked Partner submission,
                        and preserves the media as compliance
                        evidence.
                      </div>

                      {selectedOwnerPrivateMedia
                        ?.moderationStatus ===
                      "PARTNER_TAKEDOWN_HOLD" ? (
                        <div
                          style={{
                            marginTop: 10,
                            padding: 10,
                            borderRadius: 9,
                            border:
                              "1px solid rgba(248, 113, 113, 0.5)",
                            background:
                              "rgba(127, 29, 29, 0.3)",
                            color: "#fecaca",
                            fontSize: 12,
                            fontWeight: 900,
                          }}
                        >
                          TAKEDOWN HOLD ACTIVE
                          {selectedOwnerPrivateMedia
                            ?.moderation
                            ?.reason ? (
                            <div
                              style={{
                                marginTop: 5,
                                fontWeight: 500,
                                lineHeight: 1.5,
                              }}
                            >
                              {
                                selectedOwnerPrivateMedia
                                  .moderation.reason
                              }
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <>
                          <select
                            value={
                              ownerPartnerViolationCategory
                            }
                            onChange={(event) => {
                              setOwnerPartnerViolationCategory(
                                event.target.value
                              );
                              setOwnerPrivateMediaError("");
                            }}
                            style={{
                              width: "100%",
                              marginTop: 10,
                              padding: 11,
                              borderRadius: 9,
                              border:
                                "1px solid rgba(251, 146, 60, 0.48)",
                              background:
                                "rgba(2, 6, 23, 0.72)",
                              color: "#f8fafc",
                            }}
                          >
                            <option value="PLATFORM_POLICY_VIOLATION">
                              Platform policy violation
                            </option>
                            <option value="COPYRIGHT_VIOLATION">
                              Copyright violation
                            </option>
                            <option value="SAFETY_VIOLATION">
                              Safety violation
                            </option>
                            <option value="HARASSMENT_OR_ABUSE">
                              Harassment or abuse
                            </option>
                            <option value="FRAUD_OR_DECEPTION">
                              Fraud or deception
                            </option>
                            <option value="ILLEGAL_CONTENT">
                              Illegal content
                            </option>
                            <option value="OTHER">
                              Other violation
                            </option>
                          </select>

                          <textarea
                            value={
                              ownerPartnerTakedownReason
                            }
                            onChange={(event) => {
                              setOwnerPartnerTakedownReason(
                                event.target.value
                              );
                              setOwnerPrivateMediaError("");
                            }}
                            placeholder="Describe the violation and reason for immediate takedown"
                            rows={4}
                            style={{
                              width: "100%",
                              boxSizing: "border-box",
                              marginTop: 10,
                              padding: 11,
                              resize: "vertical",
                              borderRadius: 9,
                              border:
                                "1px solid rgba(251, 146, 60, 0.48)",
                              background:
                                "rgba(2, 6, 23, 0.72)",
                              color: "#f8fafc",
                              fontFamily: "inherit",
                            }}
                          />

                          <input
                            value={
                              ownerPartnerTakedownConfirmation
                            }
                            onChange={(event) => {
                              setOwnerPartnerTakedownConfirmation(
                                event.target.value
                              );
                              setOwnerPrivateMediaError("");
                            }}
                            placeholder="Type TAKE DOWN PARTNER MEDIA"
                            style={{
                              width: "100%",
                              boxSizing: "border-box",
                              marginTop: 10,
                              padding: 11,
                              borderRadius: 9,
                              border:
                                "1px solid rgba(248, 113, 113, 0.55)",
                              background:
                                "rgba(2, 6, 23, 0.72)",
                              color: "#f8fafc",
                            }}
                          />

                          <button
                            type="button"
                            onClick={
                              takeDownOwnerPartnerMediaItem
                            }
                            disabled={
                              Boolean(
                                ownerPartnerTakedownAction
                              ) ||
                              ownerPartnerTakedownConfirmation !==
                                "TAKE DOWN PARTNER MEDIA" ||
                              String(
                                ownerPartnerTakedownReason
                              ).trim().length < 10
                            }
                            style={{
                              width: "100%",
                              marginTop: 10,
                              padding: "11px 14px",
                              borderRadius: 9,
                              border:
                                "1px solid rgba(248, 113, 113, 0.65)",
                              background:
                                ownerPartnerTakedownConfirmation ===
                                  "TAKE DOWN PARTNER MEDIA" &&
                                String(
                                  ownerPartnerTakedownReason
                                ).trim().length >= 10
                                  ? "rgba(194, 65, 12, 0.9)"
                                  : "rgba(124, 45, 18, 0.35)",
                              color: "#fff",
                              fontWeight: 900,
                              cursor:
                                ownerPartnerTakedownConfirmation ===
                                  "TAKE DOWN PARTNER MEDIA" &&
                                String(
                                  ownerPartnerTakedownReason
                                ).trim().length >= 10
                                  ? "pointer"
                                  : "not-allowed",
                              opacity:
                                ownerPartnerTakedownAction
                                  ? 0.6
                                  : 1,
                            }}
                          >
                            {ownerPartnerTakedownAction
                              ? "Taking Down Partner Media..."
                              : "Emergency Partner Takedown"}
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    <div
                      style={{
                        marginTop: 13,
                        padding: 13,
                        borderRadius: 11,
                        border:
                          "1px solid rgba(248, 113, 113, 0.42)",
                        background:
                          "rgba(69, 10, 10, 0.24)",
                      }}
                    >
                      <div
                        style={{
                          color: "#fecaca",
                          fontSize: 12,
                          fontWeight: 900,
                        }}
                      >
                        Remove from AGV
                      </div>

                      <div
                        style={{
                          marginTop: 6,
                          color: "#cbd5e1",
                          fontSize: 12,
                          lineHeight: 1.55,
                        }}
                      >
                        Permanently removes this Founder or
                        test intake from the Owner Media
                        Library and AGV Network. An external
                        YouTube source is not deleted from
                        YouTube.
                      </div>

                      <input
                        value={
                          ownerPrivateMediaRemovalConfirmation
                        }
                        onChange={(event) => {
                          setOwnerPrivateMediaRemovalConfirmation(
                            event.target.value
                          );
                          setOwnerPrivateMediaError("");
                        }}
                        placeholder="Type REMOVE FROM AGV"
                        style={{
                          width: "100%",
                          boxSizing: "border-box",
                          marginTop: 10,
                          padding: 11,
                          borderRadius: 9,
                          border:
                            "1px solid rgba(248, 113, 113, 0.5)",
                          background:
                            "rgba(2, 6, 23, 0.72)",
                          color: "#f8fafc",
                        }}
                      />

                      <button
                        type="button"
                        onClick={
                          removeOwnerPrivateMediaItem
                        }
                        disabled={
                          Boolean(
                            ownerPrivateMediaRemovalAction
                          ) ||
                          ownerPrivateMediaRemovalConfirmation !==
                            "REMOVE FROM AGV"
                        }
                        style={{
                          width: "100%",
                          marginTop: 10,
                          padding: "11px 14px",
                          borderRadius: 9,
                          border:
                            "1px solid rgba(248, 113, 113, 0.58)",
                          background:
                            ownerPrivateMediaRemovalConfirmation ===
                            "REMOVE FROM AGV"
                              ? "rgba(185, 28, 28, 0.82)"
                              : "rgba(127, 29, 29, 0.28)",
                          color: "#fff",
                          fontWeight: 900,
                          cursor:
                            ownerPrivateMediaRemovalConfirmation ===
                            "REMOVE FROM AGV"
                              ? "pointer"
                              : "not-allowed",
                          opacity:
                            ownerPrivateMediaRemovalAction
                              ? 0.6
                              : 1,
                        }}
                      >
                        {ownerPrivateMediaRemovalAction
                          ? "Removing from AGV..."
                          : "Permanently Remove from AGV"}
                      </button>
                    </div>
                  )}

                  {selectedOwnerPrivateMedia.description ? (
                    <div
                      style={{
                        marginTop: 13,
                        padding: 11,
                        borderRadius: 9,
                        background: "rgba(2, 6, 23, 0.28)",
                        color: "#cbd5e1",
                        fontSize: 13,
                        lineHeight: 1.6,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {selectedOwnerPrivateMedia.description}
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={playOwnerPrivateMediaItem}
                    disabled={
                      ownerPrivateMediaAction === "preview" ||
                      !selectedOwnerPrivateMedia.privatePlaybackAvailable
                    }
                    style={{
                      ...styles.primaryButton,
                      marginTop: 15,
                      opacity:
                        selectedOwnerPrivateMedia.privatePlaybackAvailable
                          ? 1
                          : 0.5,
                    }}
                  >
                    {ownerPrivateMediaAction === "preview"
                      ? "Opening Protected Playback..."
                      : "Play Owner-Private Media"}
                  </button>

                  {ownerPrivateMediaPreviewUrl ? (
                    <div
                      style={{
                        marginTop: 14,
                        padding: 10,
                        borderRadius: 11,
                        border:
                          "1px solid rgba(96, 165, 250, 0.34)",
                        background: "rgba(2, 6, 23, 0.52)",
                      }}
                    >
                      {ownerPrivateYouTubeEmbedUrl(
                        selectedOwnerPrivateMedia
                      ) ? (
                        <div
                          style={{
                            width: "100%",
                            aspectRatio: "16 / 9",
                            borderRadius: 8,
                            overflow: "hidden",
                            background: "#000",
                          }}
                        >
                          <iframe
                            key={ownerPrivateMediaPreviewUrl}
                            title={
                              selectedOwnerPrivateMedia?.title ||
                              "Owner-private YouTube media"
                            }
                            src={ownerPrivateMediaPreviewUrl}
                            style={{
                              width: "100%",
                              height: "100%",
                              border: 0,
                            }}
                            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                            referrerPolicy="strict-origin-when-cross-origin"
                            allowFullScreen
                          />
                        </div>
                      ) : (
                        <video
                          key={ownerPrivateMediaPreviewUrl}
                          src={ownerPrivateMediaPreviewUrl}
                          controls
                          playsInline
                          preload="metadata"
                          style={{
                            width: "100%",
                            maxHeight: 430,
                            borderRadius: 8,
                            background: "#000",
                          }}
                        />
                      )}

                      <div
                        style={{
                          marginTop: 7,
                          color: "#94a3b8",
                          fontSize: 11,
                        }}
                      >
                        Protected playback expires: {" "}
                        {ownerPrivateMediaPreviewExpiresAt ||
                          "approximately five minutes"}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div
                  style={{
                    color: "#94a3b8",
                    fontSize: 13,
                    lineHeight: 1.7,
                  }}
                >
                  Refresh the private library and select a published
                  Owner-private media item.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* PASS_CU_01A_CONTROLLED_UPLOAD_CENTER_POLISH */}
        <section
          style={{
            display:
              activeNetworkSection === "publishing"
                ? "block"
                : "none",
            marginTop: 22,
            marginBottom: 22,
            padding: 24,
            border: "1px solid rgba(212, 175, 55, 0.45)",
            borderRadius: 18,
            background:
              "linear-gradient(145deg, rgba(7, 18, 42, 0.98), rgba(13, 31, 66, 0.94))",
            boxShadow:
              "0 20px 48px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.03)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 18,
              flexWrap: "wrap",
              alignItems: "flex-start",
            }}
          >
            <div>
              <div style={styles.badge}>MEDIA OPERATIONS</div>
              <h2 style={{ margin: "10px 0 6px", fontSize: 30 }}>
                Controlled Upload Center
              </h2>
              <p style={{ ...styles.subtitle, margin: 0, maxWidth: 760 }}>
                Guide each media asset through controlled intake, review,
                metadata preparation, rights approval, and registry publishing.
              </p>
            </div>

            <div
              style={{
                padding: "9px 14px",
                borderRadius: 999,
                border: "1px solid rgba(250, 204, 21, 0.42)",
                background: "rgba(250, 204, 21, 0.1)",
                color: "#fde68a",
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: 0.8,
              }}
            >
              PREVIEW MODE â€” CU-01A
            </div>
          </div>

          <div
            style={{
              marginTop: 22,
              display: "grid",
              gridTemplateColumns: "repeat(5, minmax(110px, 1fr))",
              gap: 10,
              overflowX: "auto",
              paddingBottom: 4,
            }}
          >
            {[
              ["01", "Upload", true],
              ["02", "Review", false],
              ["03", "Metadata", false],
              ["04", "Rights", false],
              ["05", "Publish", false],
            ].map(([number, label, active]) => (
              <div
                key={number}
                style={{
                  minWidth: 110,
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: active
                    ? "1px solid rgba(250, 204, 21, 0.65)"
                    : "1px solid rgba(148, 163, 184, 0.2)",
                  background: active
                    ? "rgba(250, 204, 21, 0.12)"
                    : "rgba(15, 23, 42, 0.48)",
                  boxShadow: active
                    ? "0 0 22px rgba(250, 204, 21, 0.08)"
                    : "none",
                }}
              >
                <div
                  style={{
                    color: active ? "#fde047" : "#64748b",
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: 1,
                  }}
                >
                  STEP {number}
                </div>
                <div
                  style={{
                    marginTop: 4,
                    color: active ? "#f8fafc" : "#94a3b8",
                    fontWeight: 800,
                  }}
                >
                  {label}
                </div>
              </div>
            ))}
          </div>

          <div
            onDragEnter={handleMediaDragOver}
            onDragOver={handleMediaDragOver}
            onDragLeave={handleMediaDragLeave}
            onDrop={handleMediaDrop}
            style={{
              marginTop: 20,
              padding: 34,
              minHeight: 220,
              border: mediaDragActive
                ? "2px dashed rgba(96, 165, 250, 0.95)"
                : "2px dashed rgba(212, 175, 55, 0.62)",
              borderRadius: 16,
              background: mediaDragActive
                ? "radial-gradient(circle at center, rgba(37, 99, 235, 0.22), rgba(2, 8, 23, 0.58))"
                : "radial-gradient(circle at center, rgba(30, 64, 175, 0.12), rgba(2, 8, 23, 0.52))",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              boxShadow: "inset 0 0 32px rgba(59, 130, 246, 0.05)",
            }}
          >
            <div
              style={{
                width: 70,
                height: 70,
                borderRadius: 20,
                display: "grid",
                placeItems: "center",
                border: "1px solid rgba(250, 204, 21, 0.4)",
                background: "rgba(250, 204, 21, 0.1)",
                fontSize: 36,
              }}
            >
              ðŸŽžï¸
            </div>

            <strong
              style={{
                marginTop: 16,
                fontSize: 22,
                letterSpacing: 0.3,
              }}
            >
              Drop Media Here
            </strong>

            <div style={{ ...styles.meta, marginTop: 8, fontSize: 15 }}>
              Add a video from this computer to begin controlled intake
            </div>

            <input
              ref={mediaInputRef}
              type="file"
              accept=".mp4,.mkv,.mov,.avi,.webm,video/mp4,video/webm,video/quicktime"
              onChange={handleMediaInputChange}
              style={{ display: "none" }}
            />

            <button
              type="button"
              style={{
                ...styles.primaryButton,
                marginTop: 18,
              }}
              onClick={() => mediaInputRef.current?.click()}
              title="Choose a supported video file from this computer."
            >
              Browse Computer
            </button>

            <div style={{ ...styles.meta, marginTop: 15 }}>
              MP4 Â· MKV Â· MOV Â· AVI Â· WEBM
            </div>
          </div>

          {selectedMediaFile && mediaPreviewUrl ? (
            <div
              style={{
                marginTop: 18,
                padding: 18,
                borderRadius: 16,
                border: "1px solid rgba(96, 165, 250, 0.3)",
                background:
                  "linear-gradient(180deg, rgba(15, 23, 42, 0.86), rgba(2, 8, 23, 0.96))",
                boxShadow: "0 18px 40px rgba(0, 0, 0, 0.22)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                  marginBottom: 12,
                }}
              >
                <div>
                  <strong style={{ fontSize: 18 }}>Local Video Preview</strong>
                  <div style={{ ...styles.meta, marginTop: 4 }}>
                    Browser preview only â€” this file has not been uploaded or published.
                  </div>
                </div>

                <button
                  type="button"
                  style={{
                    ...styles.secondaryButton,
                    padding: "9px 13px",
                  }}
                  onClick={() => mediaInputRef.current?.click()}
                >
                  Replace File
                </button>
              </div>

              <video
                key={mediaPreviewUrl}
                src={mediaPreviewUrl}
                controls
                preload="metadata"
                playsInline
                style={{
                  display: "block",
                  width: "100%",
                  maxHeight: 520,
                  borderRadius: 12,
                  background: "#000",
                  border: "1px solid rgba(148, 163, 184, 0.2)",
                }}
              >
                This browser cannot preview the selected video format.
              </video>

              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <span style={styles.meta}>{selectedMediaFile.name}</span>
                <span style={styles.meta}>
                  {formatMediaFileSize(selectedMediaFile.size)} Â· Local session only
                </span>
              </div>
            </div>
          ) : null}

          {selectedMediaFile ? (
            <div
              style={{
                marginTop: 18,
                padding: 20,
                borderRadius: 16,
                border: "1px solid rgba(212, 175, 55, 0.3)",
                background:
                  "linear-gradient(180deg, rgba(15, 23, 42, 0.82), rgba(2, 8, 23, 0.94))",
              }}
            >
              <div>
                <strong style={{ fontSize: 19 }}>Media Details & Rights Review</strong>
                <div style={{ ...styles.meta, marginTop: 5 }}>
                  Prepare this video for controlled upload. Nothing entered here publishes the file.
                </div>
              </div>

              <div
                style={{
                  marginTop: 18,
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                  gap: 14,
                }}
              >
                <label style={{ display: "grid", gap: 7 }}>
                  <span style={{ fontSize: 12, fontWeight: 800 }}>
                    Video Title *
                  </span>
                  <input
                    type="text"
                    value={mediaTitle}
                    onChange={(event) => setMediaTitle(event.target.value)}
                    placeholder="Enter the public-facing video title"
                    style={{
                      padding: "12px 13px",
                      borderRadius: 10,
                      border: "1px solid rgba(148, 163, 184, 0.28)",
                      background: "rgba(2, 8, 23, 0.72)",
                      color: "#f8fafc",
                      outline: "none",
                    }}
                  />
                </label>

                <label style={{ display: "grid", gap: 7 }}>
                  <span style={{ fontSize: 12, fontWeight: 800 }}>
                    Category *
                  </span>
                  <select
                    value={mediaCategory}
                    onChange={(event) => setMediaCategory(event.target.value)}
                    style={{
                      padding: "12px 13px",
                      borderRadius: 10,
                      border: "1px solid rgba(148, 163, 184, 0.28)",
                      background: "rgba(2, 8, 23, 0.92)",
                      color: "#f8fafc",
                      outline: "none",
                    }}
                  >
                    <option value="AGV Network">AGV Network</option>
                    <option value="Education">Education</option>
                    <option value="Ministry">Ministry</option>
                    <option value="Convention">Convention</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Community">Community</option>
                    <option value="Documentary">Documentary</option>
                  </select>
                </label>

                <label style={{ display: "grid", gap: 7 }}>
                  <span style={{ fontSize: 12, fontWeight: 800 }}>
                    Visibility *
                  </span>
                  <select
                    value={mediaVisibility}
                    onChange={(event) => setMediaVisibility(event.target.value)}
                    style={{
                      padding: "12px 13px",
                      borderRadius: 10,
                      border: "1px solid rgba(148, 163, 184, 0.28)",
                      background: "rgba(2, 8, 23, 0.92)",
                      color: "#f8fafc",
                      outline: "none",
                    }}
                  >
                    <option value="Private">Private â€” owner review only</option>
                    <option value="Unlisted">Unlisted â€” direct link only</option>
                    <option value="Public">Public â€” publish after approval</option>
                    <option value="Scheduled">Scheduled â€” release later</option>
                  </select>
                </label>

                <label style={{ display: "grid", gap: 7 }}>
                  <span style={{ fontSize: 12, fontWeight: 800 }}>
                    Source / Attribution
                  </span>
                  <input
                    type="text"
                    value={mediaAttribution}
                    onChange={(event) => setMediaAttribution(event.target.value)}
                    placeholder="Creator, provider, archive, or required credit"
                    style={{
                      padding: "12px 13px",
                      borderRadius: 10,
                      border: "1px solid rgba(148, 163, 184, 0.28)",
                      background: "rgba(2, 8, 23, 0.72)",
                      color: "#f8fafc",
                      outline: "none",
                    }}
                  />
                </label>
              </div>

              <label
                style={{
                  display: "grid",
                  gap: 7,
                  marginTop: 14,
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 800 }}>
                  Description *
                </span>
                <textarea
                  value={mediaDescription}
                  onChange={(event) => setMediaDescription(event.target.value)}
                  placeholder="Describe the video, its purpose, and what viewers should expect."
                  rows={4}
                  style={{
                    padding: "12px 13px",
                    borderRadius: 10,
                    border: "1px solid rgba(148, 163, 184, 0.28)",
                    background: "rgba(2, 8, 23, 0.72)",
                    color: "#f8fafc",
                    outline: "none",
                    resize: "vertical",
                    fontFamily: "inherit",
                  }}
                />
              </label>

              <label
                style={{
                  marginTop: 16,
                  padding: 14,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 11,
                  borderRadius: 12,
                  border: mediaRightsConfirmed
                    ? "1px solid rgba(34, 197, 94, 0.38)"
                    : "1px solid rgba(250, 204, 21, 0.28)",
                  background: mediaRightsConfirmed
                    ? "rgba(22, 101, 52, 0.13)"
                    : "rgba(113, 63, 18, 0.12)",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={mediaRightsConfirmed}
                  onChange={(event) =>
                    setMediaRightsConfirmed(event.target.checked)
                  }
                  style={{ marginTop: 3 }}
                />

                <span>
                  <strong style={{ display: "block", fontSize: 13 }}>
                    Rights and authorization confirmation *
                  </strong>
                  <span
                    style={{
                      display: "block",
                      marginTop: 4,
                      color: "#cbd5e1",
                      fontSize: 12,
                      lineHeight: 1.5,
                    }}
                  >
                    I confirm that AGV has permission to store, process, display,
                    and publish this media, including all video, music, images,
                    performances, and other included material.
                  </span>
                </span>
              </label>
            </div>
          ) : null}

          <div
            style={{
              marginTop: 18,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
              gap: 12,
            }}
          >
            {[
              [
                "Selected File",
                selectedMediaFile
                  ? `${selectedMediaFile.name} Â· ${formatMediaFileSize(selectedMediaFile.size)}`
                  : "No media selected",
                selectedMediaFile ? "SELECTED" : "WAITING",
              ],
              [
                "Metadata",
                mediaReadinessChecks.title && mediaReadinessChecks.description
                  ? "Required title and description completed"
                  : selectedMediaFile
                    ? "Title and description are required"
                    : "Waiting for media",
                mediaReadinessChecks.title && mediaReadinessChecks.description
                  ? "READY"
                  : selectedMediaFile
                    ? "REQUIRED"
                    : "WAITING",
              ],
              [
                "Rights Review",
                mediaReadinessChecks.rights
                  ? "Authorization confirmed"
                  : "Rights confirmation is required",
                mediaReadinessChecks.rights ? "READY" : "WAITING",
              ],
              [
                "Readiness Gate",
                mediaReadyForControlledUpload
                  ? "All controlled intake requirements passed"
                  : "Complete every required intake item",
                mediaReadyForControlledUpload ? "READY" : "LOCKED",
              ],
            ].map(([title, detail, status]) => (
              <div
                key={title}
                style={{
                  padding: 17,
                  borderRadius: 14,
                  border:
                    status === "READY"
                      ? "1px solid rgba(34, 197, 94, 0.3)"
                      : "1px solid rgba(148, 163, 184, 0.2)",
                  background:
                    status === "READY"
                      ? "rgba(22, 101, 52, 0.12)"
                      : "rgba(15, 23, 42, 0.5)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <strong>{title}</strong>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 900,
                      letterSpacing: 0.8,
                      color: status === "READY" ? "#86efac" : "#facc15",
                    }}
                  >
                    â— {status}
                  </span>
                </div>
                <div style={{ ...styles.meta, marginTop: 8 }}>{detail}</div>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: 18,
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1fr)",
              gap: 14,
            }}
          >
            <div
              style={{
                padding: 18,
                borderRadius: 14,
                border: "1px solid rgba(96, 165, 250, 0.22)",
                background: "rgba(15, 23, 42, 0.5)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <strong>Media Intake Queue</strong>
                <span style={{ ...styles.meta, fontSize: 12 }}>{selectedMediaFile ? "1 item" : "0 items"}</span>
              </div>

              <div
                style={{
                  marginTop: 14,
                  padding: 18,
                  borderRadius: 12,
                  border: selectedMediaFile
                    ? "1px solid rgba(96, 165, 250, 0.3)"
                    : "1px dashed rgba(148, 163, 184, 0.2)",
                  textAlign: selectedMediaFile ? "left" : "center",
                  color: selectedMediaFile ? "#e2e8f0" : "#94a3b8",
                  background: selectedMediaFile
                    ? "rgba(30, 64, 175, 0.1)"
                    : "transparent",
                }}
              >
                {selectedMediaFile ? (
                  <div>
                    <strong>{selectedMediaFile.name}</strong>
                    <div style={{ ...styles.meta, marginTop: 7 }}>
                      {formatMediaFileSize(selectedMediaFile.size)} Â·{" "}
                      {selectedMediaFile.type || "Unknown video type"} Â· Local only
                    </div>
                  </div>
                ) : (
                  "No media waiting for review."
                )}
              </div>
            </div>

            <div
              style={{
                padding: 18,
                borderRadius: 14,
                border: "1px solid rgba(96, 165, 250, 0.22)",
                background: "rgba(15, 23, 42, 0.5)",
              }}
            >
              <strong>AGV Intake Checks</strong>

              <div
                style={{
                  marginTop: 13,
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 9,
                }}
              >
                {[
                  "Format",
                  "Resolution",
                  "Codec",
                  "Thumbnail",
                  "Rights",
                  "Security",
                ].map((item) => (
                  <div
                    key={item}
                    style={{
                      padding: "9px 10px",
                      borderRadius: 10,
                      background: "rgba(30, 41, 59, 0.58)",
                      color: "#cbd5e1",
                      fontSize: 13,
                    }}
                  >
                    <span style={{ color: "#facc15", marginRight: 7 }}>â—‹</span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* PASS_CU_05_CONTROLLED_UPLOAD_READINESS_GATE_UI */}
          <div
            style={{
              marginTop: 17,
              padding: 18,
              borderRadius: 14,
              border: mediaReadyForControlledUpload
                ? "1px solid rgba(34, 197, 94, 0.42)"
                : "1px solid rgba(250, 204, 21, 0.3)",
              background: mediaReadyForControlledUpload
                ? "rgba(22, 101, 52, 0.13)"
                : "rgba(113, 63, 18, 0.12)",
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
                <strong style={{ fontSize: 18 }}>
                  {mediaReadyForControlledUpload
                    ? "Controlled Intake Ready"
                    : "Controlled Intake Requirements"}
                </strong>
                <div style={{ ...styles.meta, marginTop: 6 }}>
                  {mediaReadyForControlledUpload
                    ? "The selected media has passed the CLIENT readiness gate."
                    : "Complete every required item before continuing."}
                </div>
              </div>

              <span
                style={{
                  padding: "7px 11px",
                  borderRadius: 999,
                  border: mediaReadyForControlledUpload
                    ? "1px solid rgba(34, 197, 94, 0.38)"
                    : "1px solid rgba(250, 204, 21, 0.32)",
                  color: mediaReadyForControlledUpload ? "#86efac" : "#fde68a",
                  fontSize: 11,
                  fontWeight: 900,
                  letterSpacing: 0.8,
                }}
              >
                {mediaReadyForControlledUpload ? "READY" : "NOT READY"}
              </span>
            </div>

            <div
              style={{
                marginTop: 14,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 9,
              }}
            >
              {[
                ["Media file selected", mediaReadinessChecks.file],
                ["Video title entered", mediaReadinessChecks.title],
                ["Description entered", mediaReadinessChecks.description],
                ["Rights confirmed", mediaReadinessChecks.rights],
              ].map(([label, passed]) => (
                <div
                  key={label}
                  style={{
                    padding: "10px 11px",
                    borderRadius: 10,
                    background: passed
                      ? "rgba(22, 101, 52, 0.16)"
                      : "rgba(30, 41, 59, 0.58)",
                    color: passed ? "#bbf7d0" : "#cbd5e1",
                    fontSize: 13,
                  }}
                >
                  <span
                    style={{
                      marginRight: 8,
                      color: passed ? "#4ade80" : "#facc15",
                      fontWeight: 900,
                    }}
                  >
                    {passed ? "âœ“" : "â—‹"}
                  </span>
                  {label}
                </div>
              ))}
            </div>

            {/* PASS CU-08F1 â€” RESERVATION BUTTON STATUS */}
            <button
              type="button"
              disabled={
                !mediaReadyForControlledUpload ||
                controlledIntakeSubmitting ||
                Boolean(controlledIntakeReservation)
              }
              onClick={prepareControlledMediaSubmission}
              style={{
                ...styles.primaryButton,
                marginTop: 16,
                opacity:
                  mediaReadyForControlledUpload &&
                  !controlledIntakeSubmitting &&
                  !controlledIntakeReservation
                    ? 1
                    : 0.45,
                cursor:
                  mediaReadyForControlledUpload &&
                  !controlledIntakeSubmitting &&
                  !controlledIntakeReservation
                    ? "pointer"
                    : "not-allowed",
              }}
            >
              {controlledIntakeSubmitting
                ? "Reserving Intake..."
                : controlledIntakeReservation
                  ? "Intake Reserved"
                  : "Continue to Controlled Upload"}
            </button>
          </div>

          {preparedMediaSubmission && (
            <div
              style={{
                marginTop: 17,
                padding: 18,
                borderRadius: 14,
                border: "1px solid rgba(34, 197, 94, 0.38)",
                background: "rgba(22, 101, 52, 0.12)",
              }}
            >
              {/* PASS CU-08F2 â€” RESERVATION SUMMARY STATUS */}
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
                  <strong style={{ fontSize: 18 }}>
                    {controlledIntakeReservation
                      ? "Controlled Intake Reserved"
                      : controlledIntakeSubmitting
                        ? "Reserving Controlled Intake"
                        : controlledIntakeError
                          ? "Controlled Intake Reservation Failed"
                          : "Prepared for Secure Upload"}
                  </strong>

                  <div style={{ ...styles.meta, marginTop: 6 }}>
                    {controlledIntakeReservation
                      ? `Server intake ${preparedMediaSubmission.intakeId}`
                      : `Local intake record ${preparedMediaSubmission.intakeId}`}
                  </div>
                </div>

                <span
                  style={{
                    padding: "7px 11px",
                    borderRadius: 999,
                    border: controlledIntakeError
                      ? "1px solid rgba(248, 113, 113, 0.45)"
                      : "1px solid rgba(34, 197, 94, 0.38)",
                    color: controlledIntakeError ? "#fca5a5" : "#86efac",
                    fontSize: 11,
                    fontWeight: 900,
                    letterSpacing: 0.8,
                  }}
                >
                  {controlledIntakeReservation
                    ? preparedMediaSubmission.status ||
                      "AWAITING_SECURE_UPLOAD"
                    : controlledIntakeSubmitting
                      ? "RESERVING"
                      : controlledIntakeError
                        ? "RESERVATION FAILED"
                        : "PREPARED"}
                </span>
              </div>

              <div
                style={{
                  marginTop: 15,
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(210px, 1fr))",
                  gap: 10,
                }}
              >
                {[
                  ["Intake ID", preparedMediaSubmission.intakeId],
                  [
                    "Prepared",
                    new Date(
                      preparedMediaSubmission.preparedAt
                    ).toLocaleString(),
                  ],
                  ["File", preparedMediaSubmission.fileName],
                  [
                    "File Size",
                    formatMediaFileSize(preparedMediaSubmission.fileSize),
                  ],
                  ["Media Type", preparedMediaSubmission.mediaType],
                  ["Title", preparedMediaSubmission.title],
                  ["Category", preparedMediaSubmission.category],
                  ["Visibility", preparedMediaSubmission.visibility],
                  [
                    "Rights",
                    preparedMediaSubmission.rightsConfirmed
                      ? "Confirmed"
                      : "Not confirmed",
                  ],
                  [
                    "Attribution",
                    preparedMediaSubmission.attribution ||
                      "No attribution entered",
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    style={{
                      padding: 12,
                      borderRadius: 10,
                      border: "1px solid rgba(148, 163, 184, 0.18)",
                      background: "rgba(15, 23, 42, 0.5)",
                    }}
                  >
                    <div
                      style={{
                        color: "#94a3b8",
                        fontSize: 11,
                        fontWeight: 900,
                        letterSpacing: 0.7,
                        textTransform: "uppercase",
                      }}
                    >
                      {label}
                    </div>
                    <div
                      style={{
                        marginTop: 6,
                        color: "#e2e8f0",
                        fontSize: 13,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {value}
                    </div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 10,
                  border: "1px solid rgba(148, 163, 184, 0.18)",
                  background: "rgba(15, 23, 42, 0.5)",
                }}
              >
                <div
                  style={{
                    color: "#94a3b8",
                    fontSize: 11,
                    fontWeight: 900,
                    letterSpacing: 0.7,
                    textTransform: "uppercase",
                  }}
                >
                  Description
                </div>
                <div
                  style={{
                    marginTop: 6,
                    color: "#e2e8f0",
                    fontSize: 13,
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {preparedMediaSubmission.description}
                </div>
              </div>

              <div
                style={{
                  marginTop: 13,
                  color: "#bfdbfe",
                  fontSize: 12,
                  lineHeight: 1.6,
                }}
              >
                {/* PASS CU-08F3A â€” RESERVATION EXPLANATION */}
                {controlledMediaUploadResult
                  ? `Secure upload complete. Status: ${preparedMediaSubmission.status || "UPLOADED_PENDING_REVIEW"}. The media is stored privately and has not been published to AGV Network.`
                  : controlledMediaUploading
                    ? `Uploading the selected preview file: ${controlledMediaUploadProgress}% complete.`
                    : controlledMediaUploadError
                      ? `${controlledMediaUploadError} The selected preview file remains available locally.`
                      : controlledIntakeReservation
                        ? `Metadata reservation confirmed by the protected AGV server. Status: ${preparedMediaSubmission.status || "AWAITING_SECURE_UPLOAD"}. The selected preview file is ready for direct secure upload.`
                        : controlledIntakeSubmitting
                          ? "The protected AGV server is reserving this metadata. No media bytes are being transmitted."
                          : controlledIntakeError
                            ? `${controlledIntakeError} The prepared metadata and selected local file remain available.`
                            : "The metadata is prepared locally and ready for protected server reservation. No media bytes have been uploaded or transmitted."}
              </div>

              {/* PASS CU-09A3C DIRECT UPLOAD BUTTON */}
              {controlledIntakeReservation &&
                !controlledMediaUploadResult ? (
                <div style={{ marginTop: 15 }}>
                  {controlledMediaUploading ? (
                    <div>
                      <div
                        style={{
                          marginBottom: 7,
                          color: "#bfdbfe",
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      >
                        Upload progress: {controlledMediaUploadProgress}%
                      </div>

                      <div
                        style={{
                          marginBottom: 10,
                          height: 10,
                          borderRadius: 999,
                          background: "rgba(148, 163, 184, 0.2)",
                          border:
                            "1px solid rgba(148, 163, 184, 0.25)",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${controlledMediaUploadProgress}%`,
                            height: "100%",
                            background:
                              "linear-gradient(90deg, #2563eb, #22c55e)",
                            transition: "width 180ms ease",
                          }}
                        />
                      </div>
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={uploadSelectedPreviewMedia}
                    disabled={
                      controlledMediaUploading ||
                      !selectedMediaFile ||
                      preparedMediaSubmission?.status !==
                        "AWAITING_SECURE_UPLOAD"
                    }
                    style={{
                      ...styles.primaryButton,
                      width: "100%",
                      opacity:
                        controlledMediaUploading ||
                        !selectedMediaFile ||
                        preparedMediaSubmission?.status !==
                          "AWAITING_SECURE_UPLOAD"
                          ? 0.5
                          : 1,
                      cursor:
                        controlledMediaUploading ||
                        !selectedMediaFile ||
                        preparedMediaSubmission?.status !==
                          "AWAITING_SECURE_UPLOAD"
                          ? "not-allowed"
                          : "pointer",
                    }}
                  >
                    {controlledMediaUploading
                      ? `Uploading Selected Media — ${controlledMediaUploadProgress}%`
                      : "Upload Selected Preview Media to AGV"}
                  </button>
                </div>
              ) : null}

              {controlledMediaUploadResult ? (
                <div
                  style={{
                    marginTop: 15,
                    padding: 13,
                    borderRadius: 11,
                    border:
                      "1px solid rgba(34, 197, 94, 0.4)",
                    background: "rgba(22, 101, 52, 0.14)",
                    color: "#bbf7d0",
                    fontSize: 13,
                    lineHeight: 1.6,
                  }}
                >
                  <strong>Secure upload complete.</strong>
                  <div style={{ marginTop: 5 }}>
                    Status:{" "}
                    {preparedMediaSubmission.status ||
                      "UPLOADED_PENDING_REVIEW"}
                  </div>
                  <div>
                    The media is awaiting review and is not yet
                    published to AGV Network On Demand.
                  </div>
                </div>
              ) : null}

              {!controlledMediaUploadResult ? (
                <button
                  type="button"
                  onClick={cancelPreparedMediaSubmission}
                  disabled={controlledMediaUploading}
                  style={{
                    ...styles.secondaryButton,
                    marginTop: 15,
                    opacity: controlledMediaUploading ? 0.5 : 1,
                    cursor: controlledMediaUploading
                      ? "not-allowed"
                      : "pointer",
                  }}
                >
                  Cancel Prepared Submission
                </button>
              ) : null}
            </div>
          )}

          <div
            style={{
              marginTop: 17,
              padding: 15,
              borderRadius: 12,
              border: "1px solid rgba(96, 165, 250, 0.28)",
              background: "rgba(59, 130, 246, 0.08)",
              color: "#bfdbfe",
              fontSize: 13,
              lineHeight: 1.65,
            }}
          >
            <strong>Current Mode:</strong> CLIENT-to-SERVER metadata reservation — PASS CU-08.
            Metadata may be reserved by the protected AGV server. Media files are
            not uploaded, transmitted, stored, or published.
          </div>
        </section>

        <div
          style={{
            display:
              activeNetworkSection === "live"
                ? "block"
                : "none",
          }}
        >
        <div
          style={{
            marginTop: 18,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 12,
          }}
        >
          <label>
            <span style={styles.label}>Station Title</span>
            <input
              style={styles.input}
              value={networkForm.title}
              onChange={(event) =>
                setNetworkForm((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
            />
          </label>

          <label>
            <span style={styles.label}>Station ID</span>
            <input
              style={styles.input}
              value={networkForm.id}
              placeholder="generated-from-title"
              onChange={(event) =>
                setNetworkForm((current) => ({
                  ...current,
                  id: event.target.value,
                }))
              }
            />
          </label>

          <label>
            <span style={styles.label}>Provider / Source</span>
            <input
              style={styles.input}
              value={networkForm.source}
              onChange={(event) =>
                setNetworkForm((current) => ({
                  ...current,
                  source: event.target.value,
                }))
              }
            />
          </label>

          <label>
            <span style={styles.label}>Source Type</span>
            <select
              style={styles.input}
              value={networkForm.sourceType}
              onChange={(event) =>
                setNetworkForm((current) => ({
                  ...current,
                  sourceType: event.target.value,
                }))
              }
            >
              <option value="DIRECT_MP4">Direct MP4</option>
              <option value="YOUTUBE">YouTube</option>
              <option value="IFRAME">Iframe / Embedded Player</option>
              <option value="HLS">HLS Stream</option>
              <option value="DASH">DASH Stream</option>
            </select>
          </label>

          <label>
            <span style={styles.label}>Direct Media / Stream URL</span>
            <input
              style={styles.input}
              value={networkForm.sourceUrl}
              placeholder="https://...movie.mp4"
              onChange={(event) =>
                setNetworkForm((current) => ({
                  ...current,
                  sourceUrl: event.target.value,
                }))
              }
            />
          </label>

          <label>
            <span style={styles.label}>Embed URL</span>
            <input
              style={styles.input}
              value={networkForm.embedUrl}
              placeholder="Used for IFRAME sources"
              onChange={(event) =>
                setNetworkForm((current) => ({
                  ...current,
                  embedUrl: event.target.value,
                }))
              }
            />
          </label>

          <label>
            <span style={styles.label}>YouTube Video ID</span>
            <input
              style={styles.input}
              value={networkForm.videoId}
              placeholder="Used only for YOUTUBE sources"
              onChange={(event) =>
                setNetworkForm((current) => ({
                  ...current,
                  videoId: event.target.value,
                }))
              }
            />
          </label>

          <label>
            <span style={styles.label}>Fallback Source URL</span>
            <input
              style={styles.input}
              value={networkForm.fallbackUrl}
              onChange={(event) =>
                setNetworkForm((current) => ({
                  ...current,
                  fallbackUrl: event.target.value,
                }))
              }
            />
          </label>

          <label>
            <span style={styles.label}>Fallback YouTube Video ID</span>
            <input
              style={styles.input}
              value={networkForm.fallbackVideoId}
              onChange={(event) =>
                setNetworkForm((current) => ({
                  ...current,
                  fallbackVideoId: event.target.value,
                }))
              }
            />
          </label>

          <label>
            <span style={styles.label}>Category ID</span>
            <input
              style={styles.input}
              value={networkForm.categoryId}
              onChange={(event) =>
                setNetworkForm((current) => ({
                  ...current,
                  categoryId: event.target.value,
                }))
              }
            />
          </label>

          <label>
            <span style={styles.label}>Category Label</span>
            <input
              style={styles.input}
              value={networkForm.category}
              onChange={(event) =>
                setNetworkForm((current) => ({
                  ...current,
                  category: event.target.value,
                }))
              }
            />
          </label>

          <label>
            <span style={styles.label}>Badge</span>
            <input
              style={styles.input}
              value={networkForm.badge}
              onChange={(event) =>
                setNetworkForm((current) => ({
                  ...current,
                  badge: event.target.value,
                }))
              }
            />
          </label>

          <label>
            <span style={styles.label}>Schedule Mode</span>
            <select
              style={styles.input}
              value={networkForm.scheduleMode || "ALWAYS_ON"}
              onChange={(event) =>
                setNetworkForm((current) => ({
                  ...current,
                  scheduleMode: event.target.value,
                }))
              }
            >
              <option value="ALWAYS_ON">Always On</option>
              <option value="SCHEDULED">Scheduled Window</option>
              <option value="WEEKLY">Weekly Schedule</option>
              <option value="SEASONAL">Seasonal</option>
              <option value="SPECIAL_EVENT">Special Event</option>
            </select>
          </label>

          <label>
            <span style={styles.label}>Schedule Display</span>
            <input
              style={styles.input}
              value={networkForm.schedule || ""}
              placeholder="24/7 or viewer-facing schedule text"
              onChange={(event) =>
                setNetworkForm((current) => ({
                  ...current,
                  schedule: event.target.value,
                }))
              }
            />
          </label>

          <label>
            <span style={styles.label}>Schedule Start</span>
            <input
              type="datetime-local"
              style={styles.input}
              value={networkForm.scheduleStart || ""}
              disabled={
                (networkForm.scheduleMode || "ALWAYS_ON") ===
                "ALWAYS_ON"
              }
              onChange={(event) =>
                setNetworkForm((current) => ({
                  ...current,
                  scheduleStart: event.target.value,
                }))
              }
            />
          </label>

          <label>
            <span style={styles.label}>Schedule End</span>
            <input
              type="datetime-local"
              style={styles.input}
              value={networkForm.scheduleEnd || ""}
              disabled={
                (networkForm.scheduleMode || "ALWAYS_ON") ===
                "ALWAYS_ON"
              }
              onChange={(event) =>
                setNetworkForm((current) => ({
                  ...current,
                  scheduleEnd: event.target.value,
                }))
              }
            />
          </label>

          <label>
            <span style={styles.label}>Schedule Time Zone</span>
            <select
              style={styles.input}
              value={
                networkForm.scheduleTimezone ||
                "America/Chicago"
              }
              onChange={(event) =>
                setNetworkForm((current) => ({
                  ...current,
                  scheduleTimezone: event.target.value,
                }))
              }
            >
              <option value="America/Chicago">
                Central Time — America/Chicago
              </option>
              <option value="America/New_York">
                Eastern Time — America/New_York
              </option>
              <option value="America/Denver">
                Mountain Time — America/Denver
              </option>
              <option value="America/Los_Angeles">
                Pacific Time — America/Los_Angeles
              </option>
              <option value="UTC">UTC</option>
            </select>
          </label>

          <div
            style={{
              display:
                (networkForm.scheduleMode || "ALWAYS_ON") ===
                "WEEKLY"
                  ? "block"
                  : "none",
              gridColumn: "1 / -1",
              padding: 12,
              borderRadius: 10,
              border:
                "1px solid rgba(148,163,184,0.22)",
              background: "rgba(2,6,23,0.3)",
            }}
          >
            <div style={styles.label}>Weekly Days</div>
            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                marginTop: 8,
              }}
            >
              {[
                ["MON", "Mon"],
                ["TUE", "Tue"],
                ["WED", "Wed"],
                ["THU", "Thu"],
                ["FRI", "Fri"],
                ["SAT", "Sat"],
                ["SUN", "Sun"],
              ].map(([dayId, dayLabel]) => {
                const selectedDays = Array.isArray(
                  networkForm.scheduleDays
                )
                  ? networkForm.scheduleDays
                  : [];

                return (
                  <label
                    key={dayId}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "7px 9px",
                      borderRadius: 8,
                      border:
                        "1px solid rgba(148,163,184,0.25)",
                      background: selectedDays.includes(dayId)
                        ? "rgba(59,130,246,0.18)"
                        : "rgba(15,23,42,0.42)",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedDays.includes(dayId)}
                      onChange={(event) =>
                        setNetworkForm((current) => {
                          const currentDays = Array.isArray(
                            current.scheduleDays
                          )
                            ? current.scheduleDays
                            : [];

                          return {
                            ...current,
                            scheduleDays: event.target.checked
                              ? Array.from(
                                  new Set([
                                    ...currentDays,
                                    dayId,
                                  ])
                                )
                              : currentDays.filter(
                                  (value) => value !== dayId
                                ),
                          };
                        })
                      }
                    />
                    {dayLabel}
                  </label>
                );
              })}
            </div>
          </div>

          <label style={{ gridColumn: "1 / -1" }}>
            <span style={styles.label}>Schedule Notes</span>
            <textarea
              rows={3}
              style={{
                ...styles.input,
                minHeight: 82,
                resize: "vertical",
              }}
              value={networkForm.scheduleNotes || ""}
              placeholder="Seasonal dates, provider hours, blackout periods, or special-event notes"
              onChange={(event) =>
                setNetworkForm((current) => ({
                  ...current,
                  scheduleNotes: event.target.value,
                }))
              }
            />
          </label>

          <label>
            <span style={styles.label}>Thumbnail URL</span>
            <input
              style={styles.input}
              value={networkForm.thumbnail}
              onChange={(event) =>
                setNetworkForm((current) => ({
                  ...current,
                  thumbnail: event.target.value,
                }))
              }
            />
          </label>

          <label>
            <span style={styles.label}>Rights Status</span>
            <select
              style={styles.input}
              value={networkForm.rightsStatus}
              onChange={(event) =>
                setNetworkForm((current) => ({
                  ...current,
                  rightsStatus: event.target.value,
                }))
              }
            >
              <option value="PENDING_REVIEW">Pending Review</option>
              <option value="PUBLIC_DOMAIN_REVIEW_REQUIRED">
                Public Domain Ã¢â‚¬â€ Review Required
              </option>
              <option value="APPROVED_EMBED">Approved Embed</option>
              <option value="WRITTEN_LICENSE">Written License</option>
              <option value="AGV_OWNED">AGV Owned</option>
              <option value="BLOCKED">Blocked</option>
            </select>
          </label>

          <label>
            <span style={styles.label}>Health Status</span>
            <select
              style={styles.input}
              value={networkForm.healthStatus}
              onChange={(event) =>
                setNetworkForm((current) => ({
                  ...current,
                  healthStatus: event.target.value,
                }))
              }
            >
              <option value="UNKNOWN">Unknown</option>
              <option value="ONLINE">Online</option>
              <option value="DEGRADED">Degraded</option>
              <option value="OFFLINE">Offline</option>
            </select>
          </label>

          <label>
            <span style={styles.label}>Last Health Check</span>
            <input
              type="datetime-local"
              style={styles.input}
              value={networkForm.lastHealthCheck || ""}
              onChange={(event) =>
                setNetworkForm((current) => ({
                  ...current,
                  lastHealthCheck: event.target.value,
                }))
              }
            />
          </label>

          <label>
            <span style={styles.label}>
              Last Successful Playback
            </span>
            <input
              type="datetime-local"
              style={styles.input}
              value={networkForm.lastSuccessfulPlayback || ""}
              onChange={(event) =>
                setNetworkForm((current) => ({
                  ...current,
                  lastSuccessfulPlayback: event.target.value,
                }))
              }
            />
          </label>

          <label>
            <span style={styles.label}>
              Consecutive Failures
            </span>
            <input
              type="number"
              min="0"
              step="1"
              style={styles.input}
              value={networkForm.consecutiveFailures ?? 0}
              onChange={(event) =>
                setNetworkForm((current) => ({
                  ...current,
                  consecutiveFailures: Math.max(
                    0,
                    Number.parseInt(event.target.value, 10) || 0
                  ),
                }))
              }
            />
          </label>

          <label>
            <span style={styles.label}>Health Notes</span>
            <textarea
              rows={3}
              style={{
                ...styles.input,
                minHeight: 82,
                resize: "vertical",
              }}
              value={networkForm.healthNotes || ""}
              placeholder="Playback failures, provider notices, or monitoring notes"
              onChange={(event) =>
                setNetworkForm((current) => ({
                  ...current,
                  healthNotes: event.target.value,
                }))
              }
            />
          </label>
        </div>

        <label>
          <span style={styles.label}>Attribution</span>
          <input
            style={styles.input}
            value={networkForm.attribution}
            onChange={(event) =>
              setNetworkForm((current) => ({
                ...current,
                attribution: event.target.value,
              }))
            }
          />
        </label>

        <label>
          <span style={styles.label}>Description</span>
          <textarea
            style={{ ...styles.input, minHeight: 100, resize: "vertical" }}
            value={networkForm.description}
            onChange={(event) =>
              setNetworkForm((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
          />
        </label>

        <section
          style={{
            marginTop: 18,
            marginBottom: 16,
            padding: 16,
            borderRadius: 14,
            border:
              "1px solid rgba(250,204,21,0.34)",
            background:
              "rgba(113,63,18,0.12)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  color: "#fef3c7",
                  fontSize: 16,
                  fontWeight: 900,
                }}
              >
                Sponsorship
              </div>

              <div
                style={{
                  marginTop: 4,
                  color: "#cbd5e1",
                  fontSize: 11,
                  lineHeight: 1.5,
                }}
              >
                Configure program sponsorship and preserve
                campaign reporting fields with this station.
              </div>
            </div>

            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 10px",
                borderRadius: 10,
                border:
                  "1px solid rgba(250,204,21,0.32)",
                background:
                  "rgba(113,63,18,0.18)",
                color: "#fde68a",
                fontSize: 12,
                fontWeight: 900,
              }}
            >
              <input
                type="checkbox"
                checked={
                  networkForm.sponsorEnabled === true
                }
                onChange={(event) =>
                  setNetworkForm((current) => ({
                    ...current,
                    sponsorEnabled:
                      event.target.checked,
                  }))
                }
              />
              Sponsorship Enabled
            </label>
          </div>

          <div
            style={{
              marginTop: 15,
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 12,
              opacity:
                networkForm.sponsorEnabled === true
                  ? 1
                  : 0.62,
            }}
          >
            <label>
              <span style={styles.label}>Sponsor Name</span>
              <input
                style={styles.input}
                value={networkForm.sponsorName || ""}
                disabled={
                  networkForm.sponsorEnabled !== true
                }
                placeholder="Organization or underwriting partner"
                onChange={(event) =>
                  setNetworkForm((current) => ({
                    ...current,
                    sponsorName: event.target.value,
                  }))
                }
              />
            </label>

            <label>
              <span style={styles.label}>
                Sponsored Program
              </span>

              <div
                style={{
                  minHeight: 42,
                  display: "flex",
                  alignItems: "center",
                  padding: "0 11px",
                  borderRadius: 8,
                  border:
                    "1px solid rgba(148,163,184,0.28)",
                  background:
                    "rgba(2,6,23,0.48)",
                }}
              >
                <label
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    color: "#e2e8f0",
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={
                      networkForm.sponsoredProgram === true
                    }
                    disabled={
                      networkForm.sponsorEnabled !== true
                    }
                    onChange={(event) =>
                      setNetworkForm((current) => ({
                        ...current,
                        sponsoredProgram:
                          event.target.checked,
                      }))
                    }
                  />
                  Display sponsored-program designation
                </label>
              </div>
            </label>

            <label>
              <span style={styles.label}>
                Campaign Start
              </span>
              <input
                type="datetime-local"
                style={styles.input}
                value={networkForm.campaignStart || ""}
                disabled={
                  networkForm.sponsorEnabled !== true
                }
                onChange={(event) =>
                  setNetworkForm((current) => ({
                    ...current,
                    campaignStart: event.target.value,
                  }))
                }
              />
            </label>

            <label>
              <span style={styles.label}>
                Campaign End
              </span>
              <input
                type="datetime-local"
                style={styles.input}
                value={networkForm.campaignEnd || ""}
                disabled={
                  networkForm.sponsorEnabled !== true
                }
                onChange={(event) =>
                  setNetworkForm((current) => ({
                    ...current,
                    campaignEnd: event.target.value,
                  }))
                }
              />
            </label>

            <label>
              <span style={styles.label}>
                Sponsor Artwork URL
              </span>
              <input
                type="url"
                style={styles.input}
                value={networkForm.sponsorArtwork || ""}
                disabled={
                  networkForm.sponsorEnabled !== true
                }
                placeholder="https://.../sponsor-artwork.png"
                onChange={(event) =>
                  setNetworkForm((current) => ({
                    ...current,
                    sponsorArtwork:
                      event.target.value,
                  }))
                }
              />
            </label>

            <label>
              <span style={styles.label}>
                Click-Through Destination
              </span>
              <input
                type="url"
                style={styles.input}
                value={networkForm.sponsorClickUrl || ""}
                disabled={
                  networkForm.sponsorEnabled !== true
                }
                placeholder="https://sponsor.example"
                onChange={(event) =>
                  setNetworkForm((current) => ({
                    ...current,
                    sponsorClickUrl:
                      event.target.value,
                  }))
                }
              />
            </label>

            <label
              style={{
                gridColumn: "1 / -1",
              }}
            >
              <span style={styles.label}>
                Sponsor Disclosure
              </span>
              <textarea
                rows={3}
                style={{
                  ...styles.input,
                  minHeight: 86,
                  resize: "vertical",
                }}
                value={
                  networkForm.sponsorDisclosure || ""
                }
                disabled={
                  networkForm.sponsorEnabled !== true
                }
                placeholder="This program is sponsored or underwritten by..."
                onChange={(event) =>
                  setNetworkForm((current) => ({
                    ...current,
                    sponsorDisclosure:
                      event.target.value,
                  }))
                }
              />
            </label>
          </div>

          {(() => {
            const campaignStatus =
              getSponsorshipCampaignStatus(
                networkForm
              );

            const artworkValue = String(
              networkForm.sponsorArtwork || ""
            ).trim();

            const clickValue = String(
              networkForm.sponsorClickUrl || ""
            ).trim();

            const artworkValidation = artworkValue
              ? getValidatedHttpsUrl(artworkValue)
              : {
                  valid: false,
                  reason: "No artwork URL entered.",
                };

            const clickValidation = clickValue
              ? getValidatedHttpsUrl(clickValue)
              : {
                  valid: false,
                  reason: "No destination entered.",
                };

            return (
              <div
                style={{
                  marginTop: 14,
                  padding: 13,
                  borderRadius: 12,
                  border:
                    "1px solid rgba(250,204,21,0.22)",
                  background:
                    "rgba(2,6,23,0.34)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      color: "#fef3c7",
                      fontSize: 12,
                      fontWeight: 900,
                    }}
                  >
                    Campaign Preview
                  </div>

                  <span
                    style={{
                      padding: "6px 9px",
                      borderRadius: 999,
                      color: campaignStatus.color,
                      border: campaignStatus.border,
                      background:
                        campaignStatus.background,
                      fontSize: 10,
                      fontWeight: 900,
                      letterSpacing: "0.08em",
                    }}
                  >
                    {campaignStatus.label}
                  </span>
                </div>

                <div
                  style={{
                    marginTop: 12,
                    display: "grid",
                    gridTemplateColumns:
                      "minmax(180px, 280px) minmax(220px, 1fr)",
                    gap: 14,
                    alignItems: "start",
                  }}
                >
                  <div
                    style={{
                      minHeight: 150,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      borderRadius: 10,
                      border:
                        "1px solid rgba(148,163,184,0.22)",
                      background:
                        "rgba(15,23,42,0.72)",
                    }}
                  >
                    {artworkValidation.valid ? (
                      <img
                        src={artworkValidation.url}
                        alt={
                          networkForm.sponsorName
                            ? networkForm.sponsorName +
                              " sponsor artwork"
                            : "Sponsor artwork preview"
                        }
                        style={{
                          display: "block",
                          width: "100%",
                          maxHeight: 190,
                          objectFit: "contain",
                        }}
                        onError={(event) => {
                          event.currentTarget.style.display =
                            "none";
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          padding: 16,
                          color: "#94a3b8",
                          fontSize: 11,
                          lineHeight: 1.5,
                          textAlign: "center",
                        }}
                      >
                        Sponsor artwork preview will
                        appear here after a valid HTTPS
                        image URL is entered.
                      </div>
                    )}
                  </div>

                  <div>
                    <div
                      style={{
                        color:
                          artworkValue &&
                          !artworkValidation.valid
                            ? "#fca5a5"
                            : "#cbd5e1",
                        fontSize: 11,
                        lineHeight: 1.5,
                      }}
                    >
                      Artwork URL:{" "}
                      {artworkValue
                        ? artworkValidation.valid
                          ? "Valid HTTPS URL"
                          : artworkValidation.reason
                        : "Not entered"}
                    </div>

                    <div
                      style={{
                        marginTop: 7,
                        color:
                          clickValue &&
                          !clickValidation.valid
                            ? "#fca5a5"
                            : "#cbd5e1",
                        fontSize: 11,
                        lineHeight: 1.5,
                      }}
                    >
                      Destination URL:{" "}
                      {clickValue
                        ? clickValidation.valid
                          ? "Valid HTTPS URL"
                          : clickValidation.reason
                        : "Not entered"}
                    </div>

                    {clickValidation.valid ? (
                      <a
                        href={clickValidation.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "inline-flex",
                          marginTop: 12,
                          padding: "8px 11px",
                          borderRadius: 8,
                          border:
                            "1px solid rgba(250,204,21,0.34)",
                          background:
                            "rgba(113,63,18,0.18)",
                          color: "#fde68a",
                          fontSize: 11,
                          fontWeight: 900,
                          textDecoration: "none",
                        }}
                      >
                        Test Sponsor Destination
                      </a>
                    ) : null}

                    <div
                      style={{
                        marginTop: 12,
                        color: "#94a3b8",
                        fontSize: 10,
                        lineHeight: 1.5,
                      }}
                    >
                      Preview and destination testing do
                      not record impressions or clicks.
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(190px, 1fr))",
              gap: 10,
            }}
          >
            {[
              [
                "Campaign Impressions",
                Math.max(
                  0,
                  Number.parseInt(
                    networkForm.impressions,
                    10
                  ) || 0
                ),
              ],
              [
                "Sponsor Watch Minutes",
                Math.max(
                  0,
                  Number.parseInt(
                    networkForm.sponsorWatchMinutes,
                    10
                  ) || 0
                ),
              ],
            ].map(([label, value]) => (
              <div
                key={label}
                style={{
                  padding: 11,
                  borderRadius: 10,
                  border:
                    "1px solid rgba(250,204,21,0.22)",
                  background:
                    "rgba(2,6,23,0.34)",
                }}
              >
                <div
                  style={{
                    color: "#d6d3d1",
                    fontSize: 10,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  {label}
                </div>

                <div
                  style={{
                    marginTop: 6,
                    color: "#fef3c7",
                    fontSize: 16,
                    fontWeight: 900,
                  }}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section
          style={{
            marginTop: 18,
            marginBottom: 16,
            padding: 16,
            borderRadius: 14,
            border:
              "1px solid rgba(96,165,250,0.3)",
            background:
              "rgba(30,58,138,0.12)",
          }}
        >
          <div
            style={{
              color: "#dbeafe",
              fontSize: 16,
              fontWeight: 900,
            }}
          >
            Station Analytics
          </div>

          <div
            style={{
              marginTop: 4,
              color: "#94a3b8",
              fontSize: 11,
              lineHeight: 1.5,
            }}
          >
            Read-only operational placeholders. Live values will
            later be supplied by AGV playback and telemetry services.
          </div>

          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 10,
            }}
          >
            {[
              ["Views", networkForm.views ?? 0],
              ["Watch Minutes", networkForm.watchMinutes ?? 0],
              ["Completed Views", networkForm.completedViews ?? 0],
              ["Clicks", networkForm.clicks ?? 0],
              [
                "Average Watch Time",
                Math.floor(
                  Math.max(
                    0,
                    Number(networkForm.averageWatchSeconds) || 0
                  ) / 60
                ) +
                  "m " +
                  (Math.max(
                    0,
                    Number(networkForm.averageWatchSeconds) || 0
                  ) %
                    60) +
                  "s",
              ],
              [
                "Last Viewed",
                networkForm.lastViewed
                  ? new Date(
                      networkForm.lastViewed
                    ).toLocaleString()
                  : "Not recorded",
              ],
              [
                "Last Published",
                networkForm.lastPublished
                  ? new Date(
                      networkForm.lastPublished
                    ).toLocaleString()
                  : "Not recorded",
              ],
            ].map(([label, value]) => (
              <div
                key={label}
                style={{
                  padding: 11,
                  borderRadius: 10,
                  border:
                    "1px solid rgba(148,163,184,0.2)",
                  background:
                    "rgba(2,6,23,0.34)",
                }}
              >
                <div
                  style={{
                    color: "#94a3b8",
                    fontSize: 10,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  {label}
                </div>

                <div
                  style={{
                    marginTop: 6,
                    color: "#f8fafc",
                    fontSize: 15,
                    fontWeight: 900,
                  }}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>

          {networkForm.analyticsNotes ? (
            <div
              style={{
                marginTop: 12,
                padding: 11,
                borderRadius: 10,
                border:
                  "1px solid rgba(148,163,184,0.2)",
                background:
                  "rgba(2,6,23,0.34)",
                color: "#cbd5e1",
                fontSize: 12,
                lineHeight: 1.55,
                whiteSpace: "pre-wrap",
              }}
            >
              <strong>Analytics Notes:</strong>{" "}
              {networkForm.analyticsNotes}
            </div>
          ) : null}
        </section>

        {(() => {
          const validation =
            getLiveNetworkStationValidation(
              networkForm
            );

          const overallTone =
            validation.failCount > 0
              ? {
                  border:
                    "1px solid rgba(248,113,113,0.46)",
                  background:
                    "rgba(127,29,29,0.16)",
                  color: "#fecaca",
                }
              : validation.warningCount > 0
                ? {
                    border:
                      "1px solid rgba(250,204,21,0.46)",
                    background:
                      "rgba(161,98,7,0.16)",
                    color: "#fde68a",
                  }
                : {
                    border:
                      "1px solid rgba(34,197,94,0.46)",
                    background:
                      "rgba(22,101,52,0.16)",
                    color: "#bbf7d0",
                  };

          const checkTones = {
            pass: {
              label: "PASS",
              color: "#bbf7d0",
              background:
                "rgba(22,101,52,0.18)",
              border:
                "1px solid rgba(34,197,94,0.36)",
            },
            warn: {
              label: "WARN",
              color: "#fde68a",
              background:
                "rgba(161,98,7,0.18)",
              border:
                "1px solid rgba(250,204,21,0.36)",
            },
            fail: {
              label: "FAIL",
              color: "#fecaca",
              background:
                "rgba(127,29,29,0.18)",
              border:
                "1px solid rgba(248,113,113,0.36)",
            },
          };

          return (
            <section
              style={{
                marginTop: 18,
                marginBottom: 16,
                padding: 16,
                borderRadius: 14,
                border: overallTone.border,
                background:
                  overallTone.background,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div
                    style={{
                      color: "#f8fafc",
                      fontSize: 16,
                      fontWeight: 900,
                    }}
                  >
                    Station Validation
                  </div>

                  <div
                    style={{
                      marginTop: 4,
                      color: "#94a3b8",
                      fontSize: 11,
                    }}
                  >
                    Live advisory checks. Save
                    validation remains authoritative.
                  </div>
                </div>

                <div
                  style={{
                    padding: "7px 10px",
                    borderRadius: 999,
                    border: overallTone.border,
                    color: overallTone.color,
                    fontSize: 10,
                    fontWeight: 900,
                    letterSpacing: "0.08em",
                  }}
                >
                  {validation.label}
                </div>
              </div>

              <div
                style={{
                  marginTop: 14,
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(240px, 1fr))",
                  gap: 10,
                }}
              >
                {validation.checks.map(
                  (check) => {
                    const tone =
                      checkTones[check.tone] ||
                      checkTones.fail;

                    return (
                      <div
                        key={check.label}
                        style={{
                          padding: 11,
                          borderRadius: 10,
                          border: tone.border,
                          background:
                            tone.background,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent:
                              "space-between",
                            alignItems:
                              "center",
                            gap: 8,
                          }}
                        >
                          <strong
                            style={{
                              color: "#f8fafc",
                              fontSize: 12,
                            }}
                          >
                            {check.label}
                          </strong>

                          <span
                            style={{
                              color: tone.color,
                              fontSize: 9,
                              fontWeight: 900,
                              letterSpacing:
                                "0.08em",
                            }}
                          >
                            {tone.label}
                          </span>
                        </div>

                        <div
                          style={{
                            marginTop: 6,
                            color: tone.color,
                            fontSize: 11,
                            lineHeight: 1.5,
                          }}
                        >
                          {check.detail}
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </section>
          );
        })()}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button style={styles.primaryButton} onClick={saveNetworkStation}>
            {editingNetworkStationId ? "Update Station" : "Add Station"}
          </button>

          {editingNetworkStationId ? (
            <button style={styles.secondaryButton} onClick={resetNetworkForm}>
              Cancel Edit
            </button>
          ) : null}
        </div>

        <div style={{ marginTop: 22 }}>
          {networkStations.map((station, index) => (
            <div key={station.id} style={styles.roomCard}>
              <div style={styles.roomInfo}>
                <strong>{station.title}</strong>
                <div style={styles.meta}>ID: {station.id}</div>
                <div style={styles.meta}>
                  Source: {station.source || "Not entered"}
                </div>
                <div style={styles.meta}>
                  Category: {station.category || station.categoryId}
                </div>
                <div style={styles.meta}>
                  Rights: {station.rightsStatus || "PENDING_REVIEW"}
                </div>

                {(() => {
                  const readiness =
                    getNetworkStationReadiness(station);

                  const readinessColors = {
                    green: {
                      border:
                        "1px solid rgba(34,197,94,0.48)",
                      background:
                        "rgba(22,101,52,0.18)",
                      color: "#bbf7d0",
                    },
                    yellow: {
                      border:
                        "1px solid rgba(250,204,21,0.48)",
                      background:
                        "rgba(161,98,7,0.18)",
                      color: "#fde68a",
                    },
                    orange: {
                      border:
                        "1px solid rgba(251,146,60,0.48)",
                      background:
                        "rgba(154,52,18,0.18)",
                      color: "#fed7aa",
                    },
                    red: {
                      border:
                        "1px solid rgba(248,113,113,0.48)",
                      background:
                        "rgba(127,29,29,0.18)",
                      color: "#fecaca",
                    },
                  };

                  const tone =
                    readinessColors[readiness.tone] ||
                    readinessColors.red;

                  return (
                    <div
                      style={{
                        marginTop: 8,
                        padding: 11,
                        borderRadius: 11,
                        border: tone.border,
                        background: tone.background,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent:
                            "space-between",
                          alignItems: "center",
                          gap: 10,
                          flexWrap: "wrap",
                        }}
                      >
                        <strong
                          style={{
                            color: tone.color,
                            fontSize: 13,
                          }}
                        >
                          Readiness: {readiness.score}%
                        </strong>

                        <span
                          style={{
                            color: tone.color,
                            fontSize: 10,
                            fontWeight: 900,
                            letterSpacing: "0.08em",
                          }}
                        >
                          {readiness.label}
                        </span>
                      </div>

                      {readiness.missing.length ? (
                        <div
                          style={{
                            marginTop: 7,
                            color: tone.color,
                            fontSize: 11,
                            lineHeight: 1.55,
                          }}
                        >
                          Missing:{" "}
                          {readiness.missing.join(", ")}
                        </div>
                      ) : (
                        <div
                          style={{
                            marginTop: 7,
                            color: tone.color,
                            fontSize: 11,
                          }}
                        >
                          All station readiness checks passed.
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div
                  style={{
                    marginTop: 6,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "5px 9px",
                      borderRadius: 999,
                      border:
                        station.healthStatus === "ONLINE"
                          ? "1px solid rgba(34,197,94,0.42)"
                          : station.healthStatus === "DEGRADED"
                            ? "1px solid rgba(250,204,21,0.42)"
                            : station.healthStatus === "OFFLINE"
                              ? "1px solid rgba(248,113,113,0.42)"
                              : "1px solid rgba(148,163,184,0.32)",
                      background:
                        station.healthStatus === "ONLINE"
                          ? "rgba(22,101,52,0.18)"
                          : station.healthStatus === "DEGRADED"
                            ? "rgba(161,98,7,0.18)"
                            : station.healthStatus === "OFFLINE"
                              ? "rgba(127,29,29,0.18)"
                              : "rgba(51,65,85,0.24)",
                      color:
                        station.healthStatus === "ONLINE"
                          ? "#bbf7d0"
                          : station.healthStatus === "DEGRADED"
                            ? "#fde68a"
                            : station.healthStatus === "OFFLINE"
                              ? "#fecaca"
                              : "#cbd5e1",
                      fontSize: 11,
                      fontWeight: 900,
                    }}
                  >
                    <span aria-hidden="true">
                      {station.healthStatus === "ONLINE"
                        ? "●"
                        : station.healthStatus === "DEGRADED"
                          ? "▲"
                          : station.healthStatus === "OFFLINE"
                            ? "●"
                            : "○"}
                    </span>
                    {station.healthStatus || "UNKNOWN"}
                  </span>

                  <span style={styles.meta}>
                    Failures:{" "}
                    {Math.max(
                      0,
                      Number.parseInt(
                        station.consecutiveFailures,
                        10
                      ) || 0
                    )}
                  </span>
                </div>

                <div style={styles.meta}>
                  Last check:{" "}
                  {station.lastHealthCheck
                    ? new Date(
                        station.lastHealthCheck
                      ).toLocaleString()
                    : "Not recorded"}
                </div>

                <div style={styles.meta}>
                  Last successful playback:{" "}
                  {station.lastSuccessfulPlayback
                    ? new Date(
                        station.lastSuccessfulPlayback
                      ).toLocaleString()
                    : "Not recorded"}
                </div>

                {station.healthNotes ? (
                  <div
                    style={{
                      ...styles.meta,
                      marginTop: 4,
                      maxWidth: 560,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    Health notes: {station.healthNotes}
                  </div>
                ) : null}

                <div
                  style={{
                    marginTop: 9,
                    padding: 11,
                    borderRadius: 10,
                    border:
                      "1px solid rgba(96,165,250,0.25)",
                    background:
                      "rgba(30,58,138,0.1)",
                  }}
                >
                  <div
                    style={{
                      color: "#bfdbfe",
                      fontSize: 11,
                      fontWeight: 900,
                      marginBottom: 6,
                    }}
                  >
                    Analytics
                  </div>

                  <div style={styles.meta}>
                    Views:{" "}
                    {Math.max(
                      0,
                      Number.parseInt(station.views, 10) || 0
                    )}
                    {" · "}
                    Watch Minutes:{" "}
                    {Math.max(
                      0,
                      Number.parseInt(
                        station.watchMinutes,
                        10
                      ) || 0
                    )}
                  </div>

                  <div style={styles.meta}>
                    Completed Views:{" "}
                    {Math.max(
                      0,
                      Number.parseInt(
                        station.completedViews,
                        10
                      ) || 0
                    )}
                    {" · "}
                    Clicks:{" "}
                    {Math.max(
                      0,
                      Number.parseInt(station.clicks, 10) || 0
                    )}
                  </div>

                  <div style={styles.meta}>
                    Average Watch Time:{" "}
                    {Math.floor(
                      Math.max(
                        0,
                        Number(station.averageWatchSeconds) || 0
                      ) / 60
                    )}
                    m{" "}
                    {Math.max(
                      0,
                      Number(station.averageWatchSeconds) || 0
                    ) % 60}
                    s
                  </div>

                  <div style={styles.meta}>
                    Last Viewed:{" "}
                    {station.lastViewed
                      ? new Date(
                          station.lastViewed
                        ).toLocaleString()
                      : "Not recorded"}
                  </div>

                  <div style={styles.meta}>
                    Last Published:{" "}
                    {station.lastPublished
                      ? new Date(
                          station.lastPublished
                        ).toLocaleString()
                      : "Not recorded"}
                  </div>

                  {station.analyticsNotes ? (
                    <div
                      style={{
                        ...styles.meta,
                        marginTop: 4,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      Notes: {station.analyticsNotes}
                    </div>
                  ) : null}
                </div>

                {station.sponsorEnabled === true ? (
                  <div
                    style={{
                      marginTop: 9,
                      padding: 11,
                      borderRadius: 10,
                      border:
                        "1px solid rgba(250,204,21,0.3)",
                      background:
                        "rgba(113,63,18,0.13)",
                    }}
                  >
                    {(() => {
                      const campaignStatus =
                        getSponsorshipCampaignStatus(
                          station
                        );

                      return (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent:
                              "space-between",
                            gap: 8,
                            marginBottom: 6,
                            flexWrap: "wrap",
                          }}
                        >
                          <div
                            style={{
                              color: "#fde68a",
                              fontSize: 11,
                              fontWeight: 900,
                            }}
                          >
                            Sponsored Program
                          </div>

                          <span
                            style={{
                              padding: "5px 8px",
                              borderRadius: 999,
                              color:
                                campaignStatus.color,
                              border:
                                campaignStatus.border,
                              background:
                                campaignStatus.background,
                              fontSize: 9,
                              fontWeight: 900,
                              letterSpacing: "0.08em",
                            }}
                          >
                            {campaignStatus.label}
                          </span>
                        </div>
                      );
                    })()}

                    <div style={styles.meta}>
                      Sponsor:{" "}
                      {station.sponsorName ||
                        "Not entered"}
                    </div>

                    <div style={styles.meta}>
                      Campaign:{" "}
                      {station.campaignStart
                        ? new Date(
                            station.campaignStart
                          ).toLocaleString()
                        : "No start"}
                      {" — "}
                      {station.campaignEnd
                        ? new Date(
                            station.campaignEnd
                          ).toLocaleString()
                        : "No end"}
                    </div>

                    <div style={styles.meta}>
                      Impressions:{" "}
                      {Math.max(
                        0,
                        Number.parseInt(
                          station.impressions,
                          10
                        ) || 0
                      )}
                      {" · "}
                      Sponsor Watch Minutes:{" "}
                      {Math.max(
                        0,
                        Number.parseInt(
                          station.sponsorWatchMinutes,
                          10
                        ) || 0
                      )}
                    </div>
                  </div>
                ) : null}

                <div style={styles.meta}>
                  Status: {station.enabled === false ? "Disabled" : "Enabled"}
                </div>
              </div>

              <div style={styles.roomActions}>
                <button
                  style={styles.secondaryButton}
                  onClick={() => editNetworkStation(station)}
                >
                  Edit
                </button>

                <button
                  style={styles.secondaryButton}
                  onClick={() => toggleNetworkStation(station.id)}
                >
                  {station.enabled === false ? "Enable" : "Disable"}
                </button>

                <button
                  style={styles.secondaryButton}
                  disabled={index === 0}
                  onClick={() => moveNetworkStation(station.id, -1)}
                >
                  Move Up
                </button>

                <button
                  style={styles.secondaryButton}
                  disabled={index === networkStations.length - 1}
                  onClick={() => moveNetworkStation(station.id, 1)}
                >
                  Move Down
                </button>

                <button
                  style={styles.deleteButton}
                  onClick={() => deleteNetworkStation(station.id)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
        </div>
      </section>



      <section style={styles.cardWide}>
        <h2>Current Rooms</h2>

        {rooms.map((room) => (
          <div key={room.id} style={styles.roomCard}>
            <div style={styles.roomInfo}>
              <strong>{room.name}</strong>
              <div style={styles.meta}>ID: {room.id}</div>
              <div style={styles.meta}>Category: {room.category || "Convention"}</div>
              <div style={styles.meta}>
                Privacy: {room.visibility || (room.isPrivate ? "Private" : "Public")}
              </div>
              <div style={styles.meta}>
                AGV Flags: {room.isPrivate ? "Private" : "Public"} Ãƒâ€šÃ‚Â·{" "}
                {room.isLocked ? "Locked" : "Open"}
              </div>
              <div style={styles.meta}>Host: {room.host || "Unassigned"}</div>
              <div style={styles.meta}>Owner: {room.ownerName || "Not saved"}</div>
              <div style={styles.meta}>Organization: {room.organization || "Not saved"}</div>
              <div style={styles.meta}>
                Plan: {room.planLabel || room.createdByPlan || subscriptionPlan}
              </div>
            </div>

            <div style={styles.roomActions}>
              <select
                value={room.visibility || (room.isPrivate ? "Private" : "Public")}
                onChange={(e) => updateRoomVisibility(room.id, e.target.value)}
                style={styles.smallInput}
              >
                <option>Public</option>
                <option>Private</option>
                <option>Ticket Only</option>
              </select>

              <select
                value={room.status || "Standby"}
                onChange={(e) => updateRoomStatus(room.id, e.target.value)}
                style={styles.smallInput}
              >
                <option>Live Ready</option>
                <option>Standby</option>
                <option>Closed</option>
              </select>

              <button style={styles.deleteButton} onClick={() => deleteRoom(room.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </section>
        </>
      ) : null}
    </div>
  );
}

function UpgradeCard({ title, text, buttonText, onUpgrade, current }) {
  return (
    <div style={current ? styles.upgradeCardCurrent : styles.upgradeCard}>
      <strong>{title}</strong>
      <p>{text}</p>

      {current ? <div style={styles.currentPlan}>Current Plan</div> : null}

      {buttonText && !current ? (
        <button style={styles.upgradeButton} onClick={onUpgrade}>
          {buttonText}
        </button>
      ) : null}
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: 32,
    background:
      "radial-gradient(circle at top left, rgba(250,204,21,0.18), transparent 30%), linear-gradient(135deg, #050b16, #111827)",
    color: "#f8fafc",
    fontFamily: "Inter, system-ui, Arial, sans-serif",
  },
  header: {
    maxWidth: 1180,
    margin: "0 auto 24px",
    display: "flex",
    justifyContent: "space-between",
    gap: 20,
    alignItems: "center",
    flexWrap: "wrap",
  },
  badge: {
    color: "#facc15",
    fontWeight: 900,
    letterSpacing: "0.14em",
    fontSize: 12,
    marginBottom: 12,
  },
  title: {
    margin: 0,
    fontSize: "clamp(34px, 5vw, 58px)",
    fontWeight: 950,
  },
  subtitle: {
    color: "#cbd5e1",
    fontSize: 17,
    maxWidth: 760,
  },
  serverMessage: {
    color: "#facc15",
    fontWeight: 800,
    marginTop: 10,
  },
  enforcementMessage: {
    color: "#bbf7d0",
    fontWeight: 800,
    marginTop: 8,
  },
  billingMessage: {
    color: "#93c5fd",
    fontWeight: 800,
    marginTop: 8,
  },
  planCard: {
    maxWidth: 1180,
    margin: "0 auto 18px",
    background: "rgba(250,204,21,0.10)",
    border: "1px solid rgba(250,204,21,0.25)",
    borderRadius: 24,
    padding: 24,
    display: "flex",
    justifyContent: "space-between",
    gap: 18,
    flexWrap: "wrap",
  },
  planBadge: {
    display: "inline-block",
    padding: "8px 12px",
    borderRadius: 999,
    background: "rgba(250,204,21,0.16)",
    color: "#facc15",
    fontWeight: 950,
    marginBottom: 10,
  },
  planTitle: {
    margin: 0,
    fontSize: 28,
  },
  planText: {
    color: "#cbd5e1",
    marginBottom: 0,
  },
  planStats: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(100px, 1fr))",
    gap: 10,
    minWidth: 480,
  },
  statBox: {
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.07)",
    borderRadius: 16,
    padding: 14,
    display: "grid",
    gap: 4,
  },
  grid: {
    maxWidth: 1180,
    margin: "0 auto 18px",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 18,
  },
  card: {
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.14)",
    borderRadius: 24,
    padding: 24,
  },
  cardWide: {
    maxWidth: 1180,
    margin: "0 auto",
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.14)",
    borderRadius: 24,
    padding: 24,
  },
  label: {
    display: "block",
    marginTop: 14,
    marginBottom: 6,
    color: "#cbd5e1",
    fontWeight: 800,
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: 14,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.08)",
    color: "#fff",
    fontSize: 16,
  },
  smallInput: {
    width: "100%",
    boxSizing: "border-box",
    padding: 10,
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(15,23,42,0.95)",
    color: "#fff",
    fontSize: 14,
    fontWeight: 800,
  },
  limitBox: {
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "#cbd5e1",
    lineHeight: 1.7,
  },
  enforcementBox: {
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    background: "rgba(34,197,94,0.08)",
    border: "1px solid rgba(34,197,94,0.22)",
    color: "#bbf7d0",
    lineHeight: 1.7,
  },
  primaryButton: {
    marginTop: 18,
    border: "none",
    borderRadius: 14,
    padding: "14px 22px",
    background: "linear-gradient(135deg, #facc15, #c99a3b)",
    color: "#06111f",
    fontWeight: 950,
    cursor: "pointer",
  },
  secondaryButton: {
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: 14,
    padding: "14px 22px",
    background: "rgba(255,255,255,0.07)",
    color: "#fff",
    fontWeight: 850,
    cursor: "pointer",
  },
  upgradeBox: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    background: "rgba(250,204,21,0.12)",
    border: "1px solid rgba(250,204,21,0.35)",
    color: "#facc15",
    fontWeight: 800,
  },
  upgradeGrid: {
    display: "grid",
    gap: 12,
  },
  upgradeCard: {
    padding: 14,
    borderRadius: 14,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "#cbd5e1",
  },
  upgradeCardCurrent: {
    padding: 14,
    borderRadius: 14,
    background: "rgba(250,204,21,0.12)",
    border: "1px solid rgba(250,204,21,0.35)",
    color: "#fde68a",
  },
  upgradeButton: {
    marginTop: 10,
    border: "none",
    borderRadius: 12,
    padding: "10px 14px",
    background: "linear-gradient(135deg, #facc15, #c99a3b)",
    color: "#06111f",
    fontWeight: 950,
    cursor: "pointer",
  },
  currentPlan: {
    marginTop: 10,
    color: "#facc15",
    fontWeight: 950,
  },
  roomCard: {
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    background: "rgba(255,255,255,0.06)",
    display: "grid",
    gridTemplateColumns: "1fr 180px",
    gap: 14,
    alignItems: "start",
  },
  roomInfo: {
    minWidth: 0,
  },
  roomActions: {
    display: "grid",
    gap: 8,
  },
  meta: {
    color: "#94a3b8",
    fontSize: 14,
    marginTop: 4,
  },
  error: {
    color: "#fca5a5",
    fontWeight: 800,
  },
  deleteButton: {
    border: "none",
    borderRadius: 12,
    padding: "10px 14px",
    background: "#991b1b",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
  },
};
