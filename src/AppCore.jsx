import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  createAgvLiveKitRoom,
  publishAgvHostCamera,
  publishAgvScreenShare,
  stopAgvScreenShare,
  disconnectAgvLiveKitRoom,
} from "./agvLiveKitBridge";

const CHAT_API_BASE =
  import.meta.env.VITE_AGV_CHAT_API_URL || "http://127.0.0.1:8788";

const BULLETIN_API_BASE =
  import.meta.env.VITE_AGV_BULLETIN_API_URL || "http://127.0.0.1:8785";

const MODERATOR_API_BASE =
  import.meta.env.VITE_AGV_MODERATOR_API_URL || "http://127.0.0.1:8789";

const EVENT_API_BASE =
  import.meta.env.VITE_AGV_EVENT_API_URL || "http://127.0.0.1:8786";

const REVENUE_API_BASE =
  import.meta.env.VITE_AGV_REVENUE_API_URL || "http://127.0.0.1:8794";

// PASS_FEE1_AGV_EVENT_FEE_STRUCTURE
const AGV_TICKET_PLATFORM_FEE_RATE = 0.07;
const AGV_TICKET_PLATFORM_FEE_LABEL = "7% ticket platform fee";
const AGV_EVENT_FEE_STRUCTURE_LABEL =
  "7% ticket platform fee + broadcast delivery service fee + payment processing";

const SUBSCRIPTION_API_BASE =
  import.meta.env.VITE_AGV_SUBSCRIPTION_API_URL || "http://127.0.0.1:8792";
// PASS34C_CLIENT_CONFIG_CLEANUP
const TICKET_API_BASE =
  import.meta.env.VITE_AGV_TICKET_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "https://agv-server.onrender.com";

const TICKET_STORAGE_KEY = "agv_ticket_code";

// PASS32D_C_V3_HOST_ROOM_CREATION_UI
const ROOM_API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_AGV_SERVER_API_URL ||
  "http://127.0.0.1:8787";

const DEFAULT_ROOMS = [
  { id: "main-hall", name: "Main Hall", category: "Convention", isPrivate: false, isLocked: false },
  { id: "studio-a", name: "Studio A", category: "Media", isPrivate: false, isLocked: false },
  { id: "radio-room", name: "Radio Room", category: "Broadcast", isPrivate: false, isLocked: false },
  { id: "classroom-1", name: "Classroom 1", category: "Teaching", isPrivate: false, isLocked: false },
  { id: "prayer-room", name: "Prayer Room", category: "Community", isPrivate: true, isLocked: true },
  { id: "green-room", name: "Green Room", category: "Backstage", isPrivate: true, isLocked: true },
];

const PLAN_LIMITS = {
  FREE: {
    label: "Free",
    hostLabel: "FREE HOST",
    maxRooms: 1,
    maxViewers: 25,
    allowPrivate: false,
    allowTicketOnly: false,
  },
  CREATOR: {
    label: "Creator",
    hostLabel: "CREATOR HOST",
    maxRooms: 3,
    maxViewers: 100,
    allowPrivate: true,
    allowTicketOnly: true,
  },
  MINISTRY: {
    label: "Ministry / Pro",
    hostLabel: "MINISTRY HOST",
    maxRooms: 10,
    maxViewers: 500,
    allowPrivate: true,
    allowTicketOnly: true,
  },
  CONVENTION: {
    label: "Convention",
    hostLabel: "CONVENTION HOST",
    maxRooms: 50,
    maxViewers: 2000,
    allowPrivate: true,
    allowTicketOnly: true,
  },
  INTERNAL_TEST: {
    label: "Internal Test",
    hostLabel: "CREATOR HOST",
    maxRooms: 3,
    maxViewers: 100,
    allowPrivate: true,
    allowTicketOnly: true,
  },
};

function normalizePlan(plan) {
  const cleanPlan = String(plan || "FREE").trim().toUpperCase();

  if (cleanPlan === "INTERNAL_TEST") return "CREATOR";

  return PLAN_LIMITS[cleanPlan] ? cleanPlan : "FREE";
}

function getLocalCurrentPlan() {
  return normalizePlan(
    localStorage.getItem("agv_current_plan") ||
      localStorage.getItem("agv_viewer_plan") ||
      "FREE"
  );
}

function getRoomFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get("room") || "main-hall";
  } catch {
    return "main-hall";
  }
}

// PASS32E_B_EVENT_LANDING_ROUTE_SHELL
function getEventFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get("event") || "";
  } catch {
    return "";
  }
}

function getFreeAccount() {
  try {
    return JSON.parse(localStorage.getItem("agv_free_account") || "null");
  } catch {
    return null;
  }
}

function getStoredAccount() {
  try {
    const account = JSON.parse(localStorage.getItem("agv_account") || "null");

    if (account?.email) {
      return {
        name: account.name || "",
        email: String(account.email || "").trim().toLowerCase(),
        organization: account.organization || "",
        plan: normalizePlan(account.plan || getLocalCurrentPlan()),
      };
    }
  } catch {}

  const freeAccount = getFreeAccount();

  if (freeAccount?.email) {
    return {
      name: freeAccount.name || "",
      email: String(freeAccount.email || "").trim().toLowerCase(),
      organization: freeAccount.organization || "",
      plan: normalizePlan(freeAccount.plan || getLocalCurrentPlan()),
    };
  }

  return {
    name: "",
    email: "",
    organization: "",
    plan: getLocalCurrentPlan(),
  };
}

function getCurrentOwnerId() {
  const freeAccount = getFreeAccount();

  if (freeAccount?.email) {
    return freeAccount.email.trim().toLowerCase();
  }

  if (localStorage.getItem("agv_host_pin_verified") === "true") {
    return "agv-super-admin";
  }

  return "unknown-user";
}

function buildRoomPlanCategory(plan) {
  const normalized = normalizePlan(plan);
  const limits = PLAN_LIMITS[normalized] || PLAN_LIMITS.FREE;

  if (normalized === "FREE") return "Free Starter";

  return `${limits.label} Workspace`;
}

function syncRoomsForCurrentPlan(existingRooms, currentPlan, ownerId, freeAccount) {
  const normalizedPlan = normalizePlan(currentPlan);
  const limits = PLAN_LIMITS[normalizedPlan] || PLAN_LIMITS.FREE;

  if (!Array.isArray(existingRooms) || existingRooms.length === 0) {
    return DEFAULT_ROOMS;
  }

  if (!freeAccount?.email) {
    return existingRooms;
  }

  let changed = false;

  const syncedRooms = existingRooms.map((room) => {
    const roomOwnerId = String(room.ownerId || room.ownerEmail || "").trim().toLowerCase();

    const isOwnedByCurrentAccount =
      roomOwnerId === ownerId ||
      room.host === freeAccount.name ||
      room.ownerEmail === freeAccount.email;

    if (!isOwnedByCurrentAccount) return room;

    const updatedRoom = {
      ...room,
      ownerId,
      ownerName: room.ownerName || freeAccount.name,
      ownerEmail: room.ownerEmail || freeAccount.email,
      createdByPlan: normalizedPlan,
      planMode: normalizedPlan,
      planLabel: limits.label,
      planHostLabel: limits.hostLabel,
      maxViewers: limits.maxViewers,
      maxRooms: limits.maxRooms,
      allowPrivate: limits.allowPrivate,
      allowTicketOnly: limits.allowTicketOnly,
      category: buildRoomPlanCategory(normalizedPlan),
    };

    if (
      updatedRoom.createdByPlan !== room.createdByPlan ||
      updatedRoom.planMode !== room.planMode ||
      updatedRoom.planHostLabel !== room.planHostLabel ||
      updatedRoom.category !== room.category
    ) {
      changed = true;
    }

    return updatedRoom;
  });

  if (changed) {
    try {
      localStorage.setItem("agv_super_admin_rooms", JSON.stringify(syncedRooms));
    } catch {}
  }

  return syncedRooms;
}

export default function AppCore({ entryRole = "viewer" }) {
  const freeAccount = getFreeAccount();
  const storedAccount = getStoredAccount();
  const currentOwnerId = getCurrentOwnerId();

  const [currentPlan, setCurrentPlan] = useState(getLocalCurrentPlan);

  const [rooms, setRooms] = useState(() => {
    try {
      const saved = localStorage.getItem("agv_super_admin_rooms");

      if (saved) {
        const parsedRooms = JSON.parse(saved);
        return syncRoomsForCurrentPlan(
          parsedRooms,
          getLocalCurrentPlan(),
          getCurrentOwnerId(),
          getFreeAccount()
        );
      }
    } catch {}

    return DEFAULT_ROOMS;
  });

  const [selectedRoomId, setSelectedRoomId] = useState(getRoomFromUrl);
  const [roleMode] = useState(entryRole === "host" ? "host" : "viewer");
  const [selectedPanel, setSelectedPanel] = useState("chat");

  const [moderators, setModerators] = useState([]);
  const [moderatorInput, setModeratorInput] = useState("");
  // PASS32D_C_V3_HOST_ROOM_CREATION_UI
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomCategory, setNewRoomCategory] = useState("Custom");
  const [newRoomPrivate, setNewRoomPrivate] = useState(false);
  const [newRoomTicketOnly, setNewRoomTicketOnly] = useState(false);
  const [roomCreateWorking, setRoomCreateWorking] = useState(false);

    const [events, setEvents] = useState([]);
  // PASS32E_B_EVENT_LANDING_ROUTE_SHELL
  const [eventLandingDismissed, setEventLandingDismissed] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [eventPrice, setEventPrice] = useState("");

  const [revenueReports, setRevenueReports] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("agv_revenue_reports_v1") || "[]");
    } catch {
      return [];
    }
  });

  const [revenueEventName, setRevenueEventName] = useState("");
  const [revenueRoomId, setRevenueRoomId] = useState("");
  const [revenueEventDate, setRevenueEventDate] = useState("");
  const [revenueTicketsSold, setRevenueTicketsSold] = useState("");
  const [revenueGross, setRevenueGross] = useState("");
  const [revenueRefunds, setRevenueRefunds] = useState("");
  const [revenueGateway, setRevenueGateway] = useState("");
  const [revenueNotes, setRevenueNotes] = useState("");

  

  // PASS31IB_REVENUE_ADMIN_PIN_SAFE_V2
  const [revenueAdminPin, setRevenueAdminPin] = useState(() => {
    return localStorage.getItem("agv_revenue_admin_pin") || "";
  });
const [hostVendorAgreementAccepted, setHostVendorAgreementAccepted] = useState(() => {
    return window.localStorage.getItem("agv_host_vendor_agreement_v1") === "accepted";
  });

  const [status, setStatus] = useState("AGV LiveKit platform ready");

  const [ticketCode, setTicketCode] = useState(
    () => window.localStorage.getItem(TICKET_STORAGE_KEY) || ""
  );

  const [ticketApproved, setTicketApproved] = useState(
    () => Boolean(window.localStorage.getItem(TICKET_STORAGE_KEY))
  );

  const [ticketMessage, setTicketMessage] = useState("");
  const [ticketWorking, setTicketWorking] = useState(false);

  const [livekitRoom, setLivekitRoom] = useState(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [screenOn, setScreenOn] = useState(false);

  // PASS_BCAST5_HOST_BROADCAST_CONTROLS
  // PASS_BCAST_DIRECT2_HOST_DIRECT_BROADCAST_BUTTONS
  const [broadcastWorking, setBroadcastWorking] = useState(false);
  const [broadcastStatus, setBroadcastStatus] = useState("Broadcast standby.");
  const [broadcastLive, setBroadcastLive] = useState(false);
  const [broadcastEgressId, setBroadcastEgressId] = useState("");
  const [broadcastLastEgressId, setBroadcastLastEgressId] = useState("");

  const [messagesByRoom, setMessagesByRoom] = useState({});
  const [chatInput, setChatInput] = useState("");

  const [bulletinsByRoom, setBulletinsByRoom] = useState({
    "main-hall": [
      "Welcome to Avant Global Vision.",
      "The host will begin the broadcast shortly.",
      "Viewer controls are locked for a clean audience experience.",
    ],
  });

  const [newBulletin, setNewBulletin] = useState("");

  const stageRef = useRef(null);
  const audioElementsRef = useRef([]);
  const localTracksRef = useRef([]);
  const chatPollRef = useRef(null);

  const selectedRoom = useMemo(() => {
    return rooms.find((room) => room.id === selectedRoomId) || rooms[0];
  }, [rooms, selectedRoomId]);

  const currentPlanLimits = PLAN_LIMITS[currentPlan] || PLAN_LIMITS.FREE;

  const isViewerOnly = roleMode === "viewer";
  const isHost = roleMode === "host";
  const isAccountHost = Boolean(freeAccount?.email) && isHost;
  const ownerSuperAdminMode =
    localStorage.getItem("agv_owner_super_admin_mode") === "true" &&
    localStorage.getItem("agv_host_pin_verified") === "true";
  const isSuperAdmin =
    isHost &&
    localStorage.getItem("agv_host_pin_verified") === "true" &&
    (!isAccountHost || ownerSuperAdminMode);

  const hostModeLabel = isViewerOnly
    ? "USER / VIEWER"
    : isSuperAdmin
    ? "ADMIN / HOST"
    : currentPlanLimits.hostLabel;

  const participantRoleLabel = isHost
    ? isSuperAdmin
      ? "HOST"
      : currentPlanLimits.hostLabel
    : "VIEWER";

  const isModerator = moderators.length > 0;
  const canModerate = isHost || isModerator;
  const canControlStage = isHost;
  const paidBusinessToolsLocked = currentPlan === "FREE" && !isSuperAdmin;
  const hostVendorAgreementRequired =
    isHost && currentPlan !== "FREE" && !isSuperAdmin && !hostVendorAgreementAccepted;
  const viewerNeedsTicket = isViewerOnly && currentPlan !== "FREE" && !ticketApproved;
  // PASS32E_B_EVENT_LANDING_ROUTE_SHELL
  const eventIdFromUrl = getEventFromUrl();

  const selectedLandingEvent = useMemo(() => {
    if (!eventIdFromUrl) return null;

    const cleanEventId = String(eventIdFromUrl || "").trim().toLowerCase();

    return (
      events.find((item) => {
        const itemId = String(item?.id || "").trim().toLowerCase();
        const itemTitle = String(item?.title || "").trim().toLowerCase();

        return itemId === cleanEventId || itemTitle === cleanEventId;
      }) || null
    );
  }, [events, eventIdFromUrl]);

  const showEventLandingRoute =
    Boolean(eventIdFromUrl) && !eventLandingDismissed && isViewerOnly;

  // PASS31X_OWNER_ROOM_VISIBILITY
  const visibleRooms = useMemo(() => {
    const roomList = Array.isArray(rooms) ? rooms : [];

    if (isSuperAdmin) {
      return roomList;
    }

    if (isViewerOnly) {
      return roomList.filter((room) => room.id === selectedRoomId);
    }

    const currentEmail = String(storedAccount?.email || freeAccount?.email || "").trim().toLowerCase();
    const currentName = String(storedAccount?.name || freeAccount?.name || "").trim().toLowerCase();

    // PASS32D_D_FREE_ROOM_VISIBILITY_GUARD
    const ownedRooms = roomList.filter((room) => {
      const roomOwnerId = String(room.ownerId || room.ownerEmail || room.createdBy || "").trim().toLowerCase();
      const roomOwnerEmail = String(room.ownerEmail || room.createdBy || "").trim().toLowerCase();
      const roomHostName = String(room.host || room.ownerName || "").trim().toLowerCase();

      return (
        Boolean(currentOwnerId && roomOwnerId && roomOwnerId === currentOwnerId) ||
        Boolean(currentEmail && roomOwnerEmail && roomOwnerEmail === currentEmail) ||
        Boolean(currentName && roomHostName && roomHostName === currentName)
      );
    });

    if (currentPlan === "FREE") {
      return ownedRooms.slice(0, 1);
    }

    return roomList.filter((room) => {
      const isDefaultStarterRoom = DEFAULT_ROOMS.some((defaultRoom) => defaultRoom.id === room.id);

      const roomOwnerId = String(room.ownerId || room.ownerEmail || room.createdBy || "").trim().toLowerCase();
      const roomOwnerEmail = String(room.ownerEmail || room.createdBy || "").trim().toLowerCase();
      const roomHostName = String(room.host || room.ownerName || "").trim().toLowerCase();

      const ownedByCurrentAccount =
        Boolean(currentOwnerId && roomOwnerId && roomOwnerId === currentOwnerId) ||
        Boolean(currentEmail && roomOwnerEmail && roomOwnerEmail === currentEmail) ||
        Boolean(currentName && roomHostName && roomHostName === currentName);

      return isDefaultStarterRoom || ownedByCurrentAccount;
    });
  }, [
    rooms,
    isSuperAdmin,
    isViewerOnly,
    selectedRoomId,
    currentOwnerId,
    storedAccount?.email,
    storedAccount?.name,
    freeAccount?.email,
    freeAccount?.name,
    currentPlan,
  ]);

  // PASS32D_C_V3_HOST_ROOM_CREATION_UI
  const ownedRoomCount = useMemo(() => {
    const currentEmail = String(storedAccount?.email || freeAccount?.email || "").trim().toLowerCase();

    return (Array.isArray(rooms) ? rooms : []).filter((room) => {
      const roomOwnerId = String(room.ownerId || room.ownerEmail || room.createdBy || "").trim().toLowerCase();
      const roomOwnerEmail = String(room.ownerEmail || room.createdBy || "").trim().toLowerCase();

      return (
        Boolean(currentOwnerId && roomOwnerId && roomOwnerId === currentOwnerId) ||
        Boolean(currentEmail && roomOwnerEmail && roomOwnerEmail === currentEmail)
      );
    }).length;
  }, [rooms, currentOwnerId, storedAccount?.email, freeAccount?.email]);

  const roomLimitReached = !isSuperAdmin && ownedRoomCount >= currentPlanLimits.maxRooms;
  const [viewerAudioEnabled, setViewerAudioEnabled] = useState(false);
  const [viewerMuted, setViewerMuted] = useState(false);
  const [viewerVolume, setViewerVolume] = useState(1);
  const [viewerAudioMessage, setViewerAudioMessage] = useState(
    isViewerOnly
      ? "Tap to hear the host. On mobile, tap once here, then use your phone volume buttons."
      : ""
  );

  const selectedRoomMessages = messagesByRoom[selectedRoomId] || [];
  const selectedRoomBulletins = bulletinsByRoom[selectedRoomId] || [];

  useEffect(() => {
    syncPlanFromSubscriptionServer();
  }, []);

  useEffect(() => {
    const syncedRooms = syncRoomsForCurrentPlan(
      rooms,
      currentPlan,
      currentOwnerId,
      freeAccount
    );

    setRooms(syncedRooms);
  }, [currentPlan]);

  useEffect(() => {
    loadChat(selectedRoomId);
    loadModerators(selectedRoomId);
    loadEvents();

    if (chatPollRef.current) window.clearInterval(chatPollRef.current);

    chatPollRef.current = window.setInterval(() => {
      loadChat(selectedRoomId, true);
      loadBulletins(selectedRoomId, true);
    }, 2000);

    return () => {
      if (chatPollRef.current) window.clearInterval(chatPollRef.current);
    };
  }, [selectedRoomId]);

  useEffect(() => {
    return () => {
      disconnectFromLiveKit();
    };
  }, []);

  async function syncPlanFromSubscriptionServer() {
    const localPlan = getLocalCurrentPlan();

    setCurrentPlan(localPlan);

    try {
      const response = await fetch(`${SUBSCRIPTION_API_BASE}/api/subscription`);
      const data = await response.json();

      if (!response.ok || !data?.ok) {
        setStatus(`Plan sync local fallback: ${PLAN_LIMITS[localPlan]?.label || localPlan}`);
        return;
      }

      const serverPlan = normalizePlan(data.plan || localPlan);

      localStorage.setItem("agv_current_plan", serverPlan);
      setCurrentPlan(serverPlan);

      const syncedRooms = syncRoomsForCurrentPlan(
        rooms,
        serverPlan,
        currentOwnerId,
        freeAccount
      );

      setRooms(syncedRooms);

      setStatus(`Plan synced from AGV subscription service: ${PLAN_LIMITS[serverPlan]?.label || serverPlan}`);
    } catch {
      setStatus(`AGV subscription service offline. Using local plan: ${PLAN_LIMITS[localPlan]?.label || localPlan}`);
    }
  }

  function canDeleteEvent(item) {
    if (isSuperAdmin) return true;

    if (!item) return false;

    const eventOwnerId = String(item.ownerId || item.createdBy || "").trim().toLowerCase();
    const eventOwnerEmail = String(item.ownerEmail || "").trim().toLowerCase();
    const currentEmail = String(storedAccount?.email || freeAccount?.email || "").trim().toLowerCase();

    if (eventOwnerEmail && currentEmail && eventOwnerEmail === currentEmail) return true;
    if (eventOwnerId && eventOwnerId === currentOwnerId) return true;

    return false;
  }

  async function verifyTicket() {
    const code = ticketCode.trim().toUpperCase();

    if (!code) {
      setTicketMessage("Enter your ticket code.");
      return;
    }

    setTicketWorking(true);
    setTicketMessage("");

    try {
      const response = await fetch(`${TICKET_API_BASE}/api/tickets/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (!response.ok || !data?.ok) {
        setTicketApproved(false);
        setTicketMessage(data?.message || "Ticket failed.");
        setTicketWorking(false);
        return;
      }

      window.localStorage.setItem(TICKET_STORAGE_KEY, code);
      setTicketCode(code);
      setTicketApproved(true);
      setTicketMessage("Ticket approved. Viewer access unlocked.");
      setStatus("Ticket approved for viewer access");
    } catch {
      setTicketMessage("Unable to verify ticket server.");
    }

    setTicketWorking(false);
  }

  function clearTicket() {
    window.localStorage.removeItem(TICKET_STORAGE_KEY);
    setTicketCode("");
    setTicketApproved(false);
    setTicketMessage("Ticket cleared.");
    disconnectFromLiveKit();
  }

  async function loadEvents(quiet = false) {
    try {
      const response = await fetch(`${EVENT_API_BASE}/api/events`);
      const data = await response.json();

      if (!response.ok || !data?.ok) {
        if (!quiet) setStatus("Event server not connected.");
        return;
      }

      setEvents(Array.isArray(data.events) ? data.events : []);

      if (!quiet) setStatus("Event system loaded.");
    } catch {
      if (!quiet) setStatus("Event server offline. Start SERVER 8786.");
    }
  }

  async function createEvent() {
    if (!isHost) {
      setStatus("Host access required to create events.");
      return;
    }

    if (paidBusinessToolsLocked) {
      setStatus("Event creation is included with paid AGV plans. Upgrade to Creator, Ministry, or Convention.");
      return;
    }

    if (hostVendorAgreementRequired) {
      setStatus("Host/Vendor Agreement required before creating ticketed AGV events.");
      return;
    }

    const title = eventTitle.trim();

    if (!title) {
      setStatus("Enter an event title.");
      return;
    }

    const ownerName =
      storedAccount?.name ||
      freeAccount?.name ||
      "AGV Super Admin";

    const ownerEmail =
      String(storedAccount?.email || freeAccount?.email || "admin@agv.local")
        .trim()
        .toLowerCase();

    const ownerOrganization =
      storedAccount?.organization ||
      freeAccount?.organization ||
      "";

    const ownerPlan = normalizePlan(
      storedAccount?.plan ||
        freeAccount?.plan ||
        currentPlan
    );

    try {
      const response = await fetch(`${EVENT_API_BASE}/api/events/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description: eventDescription.trim(),
          roomId: selectedRoomId,
          eventDate: eventDate.trim(),
          startTime: eventTime.trim(),
          ticketPrice: eventPrice.trim(),
          status: "draft",

          ownerId: currentOwnerId,
          ownerName,
          ownerEmail,
          organization: ownerOrganization,
          ownerOrganization,

          createdByAccount: Boolean(ownerEmail),
          createdByPlan: ownerPlan,
          plan: ownerPlan,
          planLabel: PLAN_LIMITS[ownerPlan]?.label || currentPlanLimits.label,

          maxViewers: currentPlanLimits.maxViewers,
          allowPrivate: currentPlanLimits.allowPrivate,
          allowTicketOnly: currentPlanLimits.allowTicketOnly,

          requesterId: currentOwnerId,
          requesterEmail: ownerEmail,
          requesterRole: isSuperAdmin ? "super-admin" : "owner",
        }),
      });

      const data = await response.json();

      if (!response.ok || !data?.ok) {
        setStatus(data?.error || "Could not create event.");
        return;
      }

      const returnedEvents = Array.isArray(data.events) ? data.events : [];

      const normalizedEvents = returnedEvents.map((item) => {
        if (item.id === data.event?.id || item.title === title) {
          return {
            ...item,
            ownerId: item.ownerId || currentOwnerId,
            ownerName: item.ownerName || ownerName,
            ownerEmail: item.ownerEmail || ownerEmail,
            organization: item.organization || item.ownerOrganization || ownerOrganization,
            createdByAccount: Boolean(item.createdByAccount || ownerEmail),
            createdByPlan: item.createdByPlan || ownerPlan,
            plan: item.plan || ownerPlan,
            planLabel: item.planLabel || PLAN_LIMITS[ownerPlan]?.label || currentPlanLimits.label,
          };
        }

        return item;
      });

      setEvents(normalizedEvents);
      setEventTitle("");
      setEventDescription("");
      setEventDate("");
      setEventTime("");
      setEventPrice("");
      setStatus(
        `Event created for ${ownerName} / ${ownerOrganization || "AGV Account"} under ${PLAN_LIMITS[ownerPlan]?.label || ownerPlan} plan.`
      );
    } catch {
      setStatus("Could not reach event server on 8786.");
    }
  }

  async function deleteEvent(eventId) {
    const targetEvent = events.find((item) => item.id === eventId);

    if (!targetEvent) {
      setStatus("Event not found.");
      return;
    }

    if (!canDeleteEvent(targetEvent)) {
      setStatus("Only the event owner or Super Admin can delete this show.");
      return;
    }

    try {
      const response = await fetch(
        `${EVENT_API_BASE}/api/events/${encodeURIComponent(eventId)}/delete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requesterId: currentOwnerId,
            requesterEmail: storedAccount?.email || freeAccount?.email || "",
            requesterRole: isSuperAdmin ? "super-admin" : "owner",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data?.ok) {
        setStatus(data?.error || "Could not delete event.");
        return;
      }

      setEvents(Array.isArray(data.events) ? data.events : []);
      setStatus("Event deleted.");
    } catch {
      setStatus("Could not reach event server on 8786.");
    }
  }

  async function loadModerators(roomId, quiet = false) {
    try {
      const response = await fetch(
        `${MODERATOR_API_BASE}/api/moderators/${encodeURIComponent(roomId)}`
      );

      const data = await response.json();

      if (!response.ok || !data?.ok) {
        if (!quiet) setStatus("Moderator server not connected.");
        return;
      }

      setModerators(Array.isArray(data.moderators) ? data.moderators : []);

      if (!quiet) setStatus("Moderator authority loaded.");
    } catch {
      if (!quiet) setStatus("Moderator server offline. Start SERVER 8789.");
    }
  }

  async function addModerator() {
    if (!isHost) {
      setStatus("Host access required to add moderators.");
      return;
    }

    if (paidBusinessToolsLocked) {
      setStatus("Moderator controls are included with paid AGV plans. Upgrade to Creator, Ministry, or Convention.");
      return;
    }

    const value = moderatorInput.trim();

    if (!value) {
      setStatus("Enter moderator name or email.");
      return;
    }

    try {
      const response = await fetch(
        `${MODERATOR_API_BASE}/api/moderators/${encodeURIComponent(selectedRoomId)}/add`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: value,
            email: value.includes("@") ? value : "",
            plan: currentPlan,
            currentPlan,
            createdByPlan: currentPlan,
            requesterRole: isSuperAdmin ? "super-admin" : "owner",
            requesterEmail: storedAccount?.email || freeAccount?.email || "",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data?.ok) {
        setStatus(data?.error || "Could not add moderator.");
        return;
      }

      setModerators(Array.isArray(data.moderators) ? data.moderators : []);
      setModeratorInput("");
      setStatus("Moderator added to room.");
    } catch {
      setStatus("Could not reach moderator server on 8789.");
    }
  }

  async function removeModerator(moderatorId) {
    if (!isHost) {
      setStatus("Host access required to remove moderators.");
      return;
    }

    if (paidBusinessToolsLocked) {
      setStatus("Removing moderators is included with paid AGV plans. Upgrade to Creator, Ministry, or Convention.");
      return;
    }

    try {
      const response = await fetch(
        `${MODERATOR_API_BASE}/api/moderators/${encodeURIComponent(selectedRoomId)}/remove`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            moderatorId,
            plan: currentPlan,
            currentPlan,
            createdByPlan: currentPlan,
            requesterRole: isSuperAdmin ? "super-admin" : "owner",
            requesterEmail: storedAccount?.email || freeAccount?.email || "",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data?.ok) {
        setStatus(data?.error || "Could not remove moderator.");
        return;
      }

      setModerators(Array.isArray(data.moderators) ? data.moderators : []);
      setStatus("Moderator removed.");
    } catch {
      setStatus("Could not reach moderator server on 8789.");
    }
  }

  async function loadBulletins(roomId, quiet = false) {
    try {
      const response = await fetch(
        `${BULLETIN_API_BASE}/api/bulletins/${encodeURIComponent(roomId)}`
      );

      const data = await response.json();

      if (!response.ok || !data?.ok || !Array.isArray(data.bulletins)) {
        if (!quiet) setStatus("Bulletin server not connected.");
        return;
      }

      setBulletinsByRoom((prev) => ({
        ...prev,
        [roomId]: data.bulletins,
      }));

      if (!quiet) setStatus("Bulletin system connected.");
    } catch {
      if (!quiet) setStatus("Bulletin server offline. Start SERVER 8785.");
    }
  }

  async function loadChat(roomId, quiet = false) {
    try {
      const response = await fetch(`${CHAT_API_BASE}/api/chat/${encodeURIComponent(roomId)}`);
      const data = await response.json();

      if (!response.ok || !data?.ok || !Array.isArray(data.messages)) {
        if (!quiet) setStatus("Chat server not connected.");
        return;
      }

      setMessagesByRoom((prev) => ({ ...prev, [roomId]: data.messages }));
      if (!quiet) setStatus("Real chat connected");
    } catch {
      if (!quiet) setStatus("Chat server offline. Start SERVER chat on 8788.");
    }
  }

  async function sendMessage() {
    if (viewerNeedsTicket) {
      setStatus("Viewer mode: ticket required before chat.");
      return;
    }

    const text = chatInput.trim();
    if (!text) return;

    try {
      const response = await fetch(`${CHAT_API_BASE}/api/chat/${encodeURIComponent(selectedRoomId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, sender: roleMode === "host" ? "Host" : "Viewer", role: roleMode }),
      });

      const data = await response.json();

      if (!response.ok || !data?.ok) {
        setStatus(data?.error || "Could not send chat message.");
        return;
      }

      setMessagesByRoom((prev) => ({
        ...prev,
        [selectedRoomId]: Array.isArray(data.messages) ? data.messages : prev[selectedRoomId] || [],
      }));

      setChatInput("");
      setStatus("Chat message sent");
    } catch {
      setStatus("Could not reach chat server on 8788.");
    }
  }

  async function clearChat() {
    if (!canModerate) {
      setStatus("Moderator or Host access required.");
      return;
    }

    try {
      const response = await fetch(`${CHAT_API_BASE}/api/chat/${encodeURIComponent(selectedRoomId)}/clear`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok || !data?.ok) {
        setStatus("Could not clear chat.");
        return;
      }

      setMessagesByRoom((prev) => ({ ...prev, [selectedRoomId]: [] }));
      setStatus("Chat cleared");
    } catch {
      setStatus("Could not reach chat server on 8788.");
    }
  }

  function clearStage() {
    if (stageRef.current) stageRef.current.innerHTML = "";

    audioElementsRef.current.forEach((el) => {
      try {
        el.remove();
      } catch {}
    });

    audioElementsRef.current = [];
  }

  function cleanupLocalTracks() {
    localTracksRef.current.forEach((track) => {
      try {
        track.stop();
      } catch {}
    });

    localTracksRef.current = [];
  }

  // PASS_STAGE1_V2_FULL_SCREEN_SHARE_STAGE_FIT
  function showStageElement(element) {
    if (!stageRef.current || !element) return;

    try {
      stageRef.current.style.position = "relative";
      stageRef.current.style.overflow = "hidden";
      stageRef.current.style.display = "flex";
      stageRef.current.style.alignItems = "center";
      stageRef.current.style.justifyContent = "center";
      stageRef.current.style.background = "#000";
    } catch {}

    element.style.width = "100%";
    element.style.height = "100%";
    element.style.maxWidth = "100%";
    element.style.maxHeight = "100%";
    element.style.display = "block";
    element.style.objectFit = "contain";
    element.style.background = "#000";

    if (element.tagName === "VIDEO") {
      element.autoplay = true;
      element.playsInline = true;
      element.muted = true;
    }

    stageRef.current.innerHTML = "";
    stageRef.current.appendChild(element);
  }

  function showStageTrack(track, label = "Live stage") {
    if (!track || typeof track.attach !== "function") return false;

    const element = track.attach();
    showStageElement(element);
    setStatus(label);
    return true;
  }


  // PASS_BCAST2_VIEWER_BROADCAST_PLAYER
  async function fetchAgvBroadcastState() {
    try {
      const response = await fetch(`${ROOM_API_BASE}/api/broadcast/state`, {
        method: "GET",
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        return null;
      }

      return data.state || null;
    } catch {
      return null;
    }
  }

  function showBroadcastPlaceholder(state, message = "Broadcast mode is live, but no playback URL is configured yet.") {
    const box = document.createElement("div");
    box.style.width = "100%";
    box.style.height = "100%";
    box.style.minHeight = "420px";
    box.style.display = "flex";
    box.style.flexDirection = "column";
    box.style.alignItems = "center";
    box.style.justifyContent = "center";
    box.style.textAlign = "center";
    box.style.padding = "32px";
    box.style.background = "linear-gradient(135deg, #020617, #111827, #1f2937)";
    box.style.color = "#f9fafb";
    box.style.border = "1px solid rgba(245, 158, 11, 0.45)";
    box.style.borderRadius = "18px";

    const title = document.createElement("div");
    title.textContent = state?.title || "AGV Broadcast";
    title.style.fontSize = "26px";
    title.style.fontWeight = "800";
    title.style.marginBottom = "12px";

    const body = document.createElement("div");
    body.textContent = message;
    body.style.fontSize = "16px";
    body.style.opacity = "0.9";
    body.style.maxWidth = "720px";

    const room = document.createElement("div");
    room.textContent = `Room: ${state?.roomId || "main-hall"}`;
    room.style.marginTop = "18px";
    room.style.fontSize = "13px";
    room.style.opacity = "0.75";

    box.appendChild(title);
    box.appendChild(body);
    box.appendChild(room);

    showStageElement(box);
  }

  // PASS_SCALE8_CLOUDFLARE_STREAM_PLAYER_EMBED
  // CLIENT — Prefer Cloudflare Stream iframe player when AGV only has a Cloudflare HLS URL.
  function agvCloudflareEmbedFromHlsUrl(url) {
    const raw = url == null ? "" : String(url).trim();

    if (!raw) return "";

    try {
      const parsed = new URL(raw);
      const parts = parsed.pathname.split("/").filter(Boolean);

      // Expected Cloudflare Stream Live HLS path:
      // /<video-or-live-input-id>/manifest/video.m3u8
      if (
        parsed.hostname.includes("cloudflarestream.com") &&
        parts.length >= 3 &&
        parts[1] === "manifest" &&
        parts[2] === "video.m3u8"
      ) {
        return parsed.origin + "/" + parts[0] + "/iframe";
      }
    } catch {}

    return "";
  }

  function showAgvBroadcastPlayer(state) {
    // PASS_BCAST6_CLOUDFLARE_VIEWER_PLAYER_FIX
    // CLIENT — Do not treat a Cloudflare .m3u8 HLS manifest as an iframe.
    // If the server gives AGV only HLS, convert it into the Cloudflare Stream iframe player.
    const rawEmbedUrl = state?.embedUrl ? String(state.embedUrl).trim() : "";
    const rawPlaybackUrl =
      rawEmbedUrl ||
      (state?.playbackUrl ? String(state.playbackUrl).trim() : "") ||
      (state?.hlsUrl ? String(state.hlsUrl).trim() : "");

    const embedIsHls = rawEmbedUrl.toLowerCase().includes(".m3u8");
    const directIframeEmbedUrl = rawEmbedUrl && !embedIsHls ? rawEmbedUrl : "";

    const hlsCandidate =
      (state?.hlsUrl ? String(state.hlsUrl).trim() : "") ||
      (state?.playbackUrl ? String(state.playbackUrl).trim() : "") ||
      (embedIsHls ? rawEmbedUrl : "");

    const cloudflareEmbedUrl =
      directIframeEmbedUrl ||
      agvCloudflareEmbedFromHlsUrl(hlsCandidate);

    const playbackUrl = cloudflareEmbedUrl || rawPlaybackUrl;
    const playbackMode = cloudflareEmbedUrl
      ? "cloudflare-embed"
      : playbackUrl.toLowerCase().includes(".m3u8")
        ? "hls"
        : "iframe";

    const isHls = playbackMode === "hls";
    const isCloudflareEmbed = playbackMode === "cloudflare-embed";

    if (!playbackUrl) {
      showBroadcastPlaceholder(state);
      return false;
    }

    const wrap = document.createElement("div");
    wrap.style.width = "100%";
    wrap.style.height = "100%";
    wrap.style.minHeight = "420px";
    wrap.style.background = "#020617";
    wrap.style.borderRadius = "18px";
    wrap.style.overflow = "hidden";
    wrap.style.border = "1px solid rgba(245, 158, 11, 0.35)";
    wrap.style.display = "flex";
    wrap.style.flexDirection = "column";

    const header = document.createElement("div");
    header.style.padding = "10px 14px";
    header.style.background = "rgba(15, 23, 42, 0.95)";
    header.style.color = "#f9fafb";
    header.style.fontWeight = "800";
    header.style.letterSpacing = "0.02em";
    header.textContent = state?.title || "AGV Broadcast";

    const sub = document.createElement("div");
    sub.style.fontSize = "12px";
    sub.style.fontWeight = "500";
    sub.style.opacity = "0.75";
    sub.style.marginTop = "3px";
    sub.textContent = isCloudflareEmbed
      ? (state?.message || "Broadcast mode is live.") + " Cloudflare Stream player is active."
      : state?.message || "Broadcast mode is live.";

    header.appendChild(sub);

    
    

    // PASS_BCAST6B_SECOND_HLS_CONSTS_REMOVED

    

    // CLIENT — duplicate playback mode declarations removed.

    

    let player;

    if (isHls) {
      // PASS_SCALE6_BROADCAST_WAITING_SCREEN
      // CLIENT — professional waiting screen while Cloudflare HLS is not playing yet.
      const frame = document.createElement("div");
      frame.style.position = "relative";
      frame.style.width = "100%";
      frame.style.height = "100%";
      frame.style.flex = "1";
      frame.style.minHeight = "360px";
      frame.style.background =
        "radial-gradient(circle at top, rgba(245,158,11,0.14), rgba(15,23,42,0.98) 45%, #020617 100%)";
      frame.style.display = "flex";
      frame.style.alignItems = "center";
      frame.style.justifyContent = "center";
      frame.style.overflow = "hidden";

      const video = document.createElement("video");
      video.src = playbackUrl;
      video.controls = true;
      video.autoplay = true;
      video.playsInline = true;
      video.style.background = "transparent";
      video.style.width = "100%";
      video.style.height = "100%";
      video.style.flex = "1";
      video.style.objectFit = "contain";

      const waiting = document.createElement("div");
      waiting.style.position = "absolute";
      waiting.style.inset = "0";
      waiting.style.display = "flex";
      waiting.style.flexDirection = "column";
      waiting.style.alignItems = "center";
      waiting.style.justifyContent = "center";
      waiting.style.textAlign = "center";
      waiting.style.padding = "28px";
      waiting.style.color = "#f9fafb";
      waiting.style.background =
        "linear-gradient(180deg, rgba(15,23,42,0.86), rgba(2,6,23,0.94))";
      waiting.style.pointerEvents = "none";

      const badge = document.createElement("div");
      badge.textContent = "AGV";
      badge.style.width = "66px";
      badge.style.height = "66px";
      badge.style.borderRadius = "20px";
      badge.style.display = "flex";
      badge.style.alignItems = "center";
      badge.style.justifyContent = "center";
      badge.style.marginBottom = "18px";
      badge.style.background = "linear-gradient(135deg, #facc15, #a16207)";
      badge.style.color = "#111827";
      badge.style.fontWeight = "950";
      badge.style.fontSize = "24px";
      badge.style.boxShadow = "0 20px 50px rgba(0,0,0,0.35)";

      const titleWait = document.createElement("div");
      titleWait.textContent = "AGV Broadcast is preparing.";
      titleWait.style.fontSize = "28px";
      titleWait.style.fontWeight = "950";
      titleWait.style.marginBottom = "10px";

      const bodyWait = document.createElement("div");
      bodyWait.textContent =
        "The event will begin shortly. Scale delivery powered by Cloudflare.";
      bodyWait.style.fontSize = "16px";
      bodyWait.style.maxWidth = "620px";
      bodyWait.style.opacity = "0.86";
      bodyWait.style.lineHeight = "1.5";

      const subWait = document.createElement("div");
      subWait.textContent =
        "If you are the host, make sure the registered broadcast source is feeding Cloudflare RTMPS.";
      subWait.style.fontSize = "13px";
      subWait.style.maxWidth = "680px";
      subWait.style.opacity = "0.62";
      subWait.style.marginTop = "12px";
      subWait.style.lineHeight = "1.5";

      waiting.appendChild(badge);
      waiting.appendChild(titleWait);
      waiting.appendChild(bodyWait);
      waiting.appendChild(subWait);

      const hideWaiting = () => {
        waiting.style.display = "none";
      };

      const showWaiting = () => {
        waiting.style.display = "flex";
      };

      video.addEventListener("playing", hideWaiting);
      video.addEventListener("canplay", hideWaiting);
      video.addEventListener("loadeddata", hideWaiting);
      video.addEventListener("waiting", showWaiting);
      video.addEventListener("stalled", showWaiting);
      video.addEventListener("error", showWaiting);

      frame.appendChild(video);
      frame.appendChild(waiting);
      player = frame;
    } else {
      player = document.createElement("iframe");
      player.src = playbackUrl;
      player.allow = "accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen";
      player.allowFullscreen = true;
      player.referrerPolicy = "no-referrer-when-downgrade";
      player.style.border = "0";
      player.style.width = "100%";
      player.style.height = "100%";
      player.style.flex = "1";
      player.style.background = "#000";

      if (isCloudflareEmbed) {
        player.title = "AGV Cloudflare Stream Player";
        player.style.minHeight = "420px";
      }
    }

    wrap.appendChild(header);
    wrap.appendChild(player);

    showStageElement(wrap);
    return true;
  }

  async function tryJoinBroadcastViewer(roomId = selectedRoomId) {
    const state = await fetchAgvBroadcastState();

    if (!state?.isLive || state?.viewerMode !== "broadcast") {
      return false;
    }

    const stateRoom = String(state.roomId || "main-hall");
    const requestedRoom = String(roomId || "main-hall");

    if (stateRoom !== requestedRoom && stateRoom !== "all") {
      return false;
    }

    clearStage();
    cleanupLocalTracks();

    if (livekitRoom) {
      disconnectAgvLiveKitRoom(livekitRoom);
      setLivekitRoom(null);
    }

    const displayed = showAgvBroadcastPlayer(state);

    setCameraOn(false);
    setScreenOn(false);
    setStatus(
      displayed
        ? `Broadcast viewer mode: ${state.title || requestedRoom}`
        : "Broadcast viewer mode is live, waiting for playback URL."
    );

    return true;
  }


  async function connectToRoom(nextRole = roleMode, roomId = selectedRoomId) {
    // PASS31R_V3_VIEWER_TICKET_GUARD
    if (nextRole === "viewer" && currentPlan !== "FREE" && !ticketApproved) {
      setStatus("Ticket required before viewer can join the room.");
      setTicketMessage("Enter a valid ticket code to unlock viewer access.");
      return null;
    }

    try {
      if (livekitRoom) {
        disconnectAgvLiveKitRoom(livekitRoom);
        setLivekitRoom(null);
      }

      clearStage();
      cleanupLocalTracks();

      setStatus(`Connecting to ${roomId} as ${nextRole.toUpperCase()}...`);

      const result = await createAgvLiveKitRoom({
        roomName: roomId,
        identity: `${nextRole}-${roomId}-${Date.now()}`,
        name: `${nextRole.toUpperCase()} AGV`,
        role: nextRole,

        onTrackSubscribed: (track, publication, participant) => {
          const element = track.attach();

          if (track.kind === "video") {
            showStageElement(element);
            setStatus("Receiving LiveKit video");
          }

          if (track.kind === "audio") {
            rememberViewerAudioElement(element, publication, track);

            if (isViewerOnly && viewerAudioEnabled) {
              setTimeout(() => {
                try {
                  element.muted = false;
                  element.volume = Number(viewerVolume || 1);
                  element.play?.();
                } catch {}
              }, 100);
            }

            setStatus("Receiving LiveKit audio");
          }
        },

        onDisconnected: () => setStatus("Disconnected from LiveKit"),
        onError: (error) => setStatus(error.message || "LiveKit connection failed."),
      });

      if (!result.ok || !result.room) {
        setStatus(result.error || "LiveKit connection failed.");
        return null;
      }

      setLivekitRoom(result.room);
      setStatus(`Connected to ${roomId} as ${nextRole.toUpperCase()}`);
      return result.room;
    } catch {
      setStatus("LiveKit connection failed. Check token server 8790.");
      return null;
    }
  }

  async function startHostCamera() {
    if (!canControlStage) {
      setStatus("Viewer mode: camera controls are locked.");
      return;
    }

    const room = livekitRoom || (await connectToRoom("host", selectedRoomId));
    if (!room) return;

    try {
      setStatus("Starting host camera...");
      const published = await publishAgvHostCamera(room);

      if (published?.videoTrack) {
        localTracksRef.current.push(published.videoTrack);
        showStageTrack(published.videoTrack, "Host camera is live");
      }

      if (published?.audioTrack) localTracksRef.current.push(published.audioTrack);

      setCameraOn(true);
      setStatus("Host camera is live");
    } catch {
      setStatus("Camera failed. Check permission or selected device.");
    }
  }

  async function toggleScreenShare() {
    if (!canControlStage) {
      setStatus("Viewer mode: screen share controls are locked.");
      return;
    }

    const room = livekitRoom || (await connectToRoom("host", selectedRoomId));
    if (!room) return;

    try {
      if (screenOn) {
        await stopAgvScreenShare(room);
        setScreenOn(false);
        setStatus("Screen share stopped");
        return;
      }

      const published = await publishAgvScreenShare(room);

      const screenVideoTrack =
        published?.videoTrack ||
        published?.screenVideoTrack ||
        published?.track ||
        published?.screenTrack ||
        null;

      if (screenVideoTrack) {
        localTracksRef.current.push(screenVideoTrack);
        showStageTrack(screenVideoTrack, "Screen share is live");
      } else {
        setStatus("Screen share is live. Waiting for screen track preview...");
      }

      setScreenOn(true);
    } catch {
      setStatus("Screen share failed or was canceled.");
    }
  }

  function rememberViewerAudioElement(element, publication, track) {
    if (!element) return null;

    try {
      const trackSid =
        publication?.trackSid ||
        publication?.sid ||
        track?.sid ||
        track?.mediaStreamTrack?.id ||
        "";

      if (trackSid) {
        element.dataset.agvTrackSid = String(trackSid);
      }

      element.setAttribute("data-agv-livekit-audio", "true");
      element.autoplay = false;
      element.controls = false;
      element.playsInline = true;
      element.style.position = "fixed";
      element.style.left = "-9999px";
      element.style.bottom = "0";
      element.style.width = "1px";
      element.style.height = "1px";
      element.style.opacity = "0.01";
      element.muted = viewerMuted;
      element.volume = viewerMuted ? 0 : Number(viewerVolume || 1);

      if (!document.body.contains(element)) {
        document.body.appendChild(element);
      }

      if (!audioElementsRef.current.includes(element)) {
        audioElementsRef.current.push(element);
      }
    } catch {}

    return element;
  }

  function attachExistingViewerAudioTracks() {
    if (!isViewerOnly || !livekitRoom) return [];

    const attached = [];

    try {
      const participants = Array.from(livekitRoom.remoteParticipants?.values?.() || []);

      participants.forEach((participant) => {
        const publications = [
          ...Array.from(participant.audioTrackPublications?.values?.() || []),
          ...Array.from(participant.trackPublications?.values?.() || []),
        ];

        publications.forEach((publication) => {
          try {
            const track = publication?.track;
            const kind = String(track?.kind || publication?.kind || "").toLowerCase();

            if (!track || kind !== "audio" || typeof track.attach !== "function") return;

            const trackSid =
              publication?.trackSid ||
              publication?.sid ||
              track?.sid ||
              track?.mediaStreamTrack?.id ||
              "";

            const alreadyAttached = audioElementsRef.current.some((element) => {
              return trackSid && element?.dataset?.agvTrackSid === String(trackSid);
            });

            if (alreadyAttached) return;

            const element = track.attach();
            rememberViewerAudioElement(element, publication, track);
            attached.push(element);
          } catch {}
        });
      });
    } catch {}

    return attached;
  }

  async function playViewerAudioElements() {
    const existingElements = [
      ...audioElementsRef.current,
      ...Array.from(document.querySelectorAll("audio[data-agv-livekit-audio='true']")),
      ...Array.from(document.querySelectorAll("audio")),
    ].filter(Boolean);

    const uniqueElements = Array.from(new Set(existingElements));
    let started = 0;

    for (const media of uniqueElements) {
      try {
        media.muted = false;
        media.volume = Number(viewerVolume || 1);
        media.playsInline = true;

        if (typeof media.play === "function") {
          await media.play();
        }

        started += 1;
      } catch {}
    }

    return started;
  }

  function applyViewerAudioSettings() {
    if (!isViewerOnly) return;

    attachExistingViewerAudioTracks();

    const mediaElements = Array.from(
      new Set([
        ...audioElementsRef.current,
        ...Array.from(document.querySelectorAll("audio[data-agv-livekit-audio='true']")),
        ...Array.from(document.querySelectorAll("audio")),
      ])
    ).filter(Boolean);

    mediaElements.forEach((media) => {
      try {
        media.muted = viewerMuted;
        media.volume = viewerMuted ? 0 : Number(viewerVolume || 1);
        media.playsInline = true;
      } catch {}
    });
  }

  useEffect(() => {
    if (!isViewerOnly) return;

    applyViewerAudioSettings();

    const interval = window.setInterval(() => {
      applyViewerAudioSettings();
    }, 2000);

    return () => window.clearInterval(interval);
  }, [isViewerOnly, viewerMuted, viewerVolume]);

  async function enableViewerAudio() {
    if (!isViewerOnly) return;

    try {
      if (livekitRoom && typeof livekitRoom.startAudio === "function") {
        await livekitRoom.startAudio();
      }
    } catch {}

    attachExistingViewerAudioTracks();

    let started = await playViewerAudioElements();

    setViewerMuted(false);
    setViewerAudioEnabled(true);

    if (started > 0) {
      setViewerAudioMessage(
        "Viewer audio enabled. On iPhone/iPad, turn Silent Mode off and use the side volume buttons."
      );
      setStatus("Viewer audio enabled.");
    } else {
      setViewerAudioMessage(
        "Audio unlock requested. If sound is still low, use your phone/tablet volume buttons and make sure silent mode is off."
      );
      setStatus("Viewer audio unlock requested.");
    }

    setTimeout(applyViewerAudioSettings, 250);
    setTimeout(() => {
      try {
        attachExistingViewerAudioTracks();
        playViewerAudioElements();
      } catch {}
    }, 900);
  }

  function toggleViewerMute() {
    if (!isViewerOnly) return;

    const nextMuted = !viewerMuted;
    setViewerMuted(nextMuted);

    setViewerAudioMessage(
      nextMuted
        ? "Viewer audio muted."
        : "Viewer audio unmuted. Use your device volume buttons if you are on mobile."
    );

    setTimeout(applyViewerAudioSettings, 0);
  }

  function changeViewerVolume(nextValue) {
    const nextVolume = Math.max(0, Math.min(1, Number(nextValue || 0)));

    setViewerVolume(nextVolume);
    setViewerMuted(nextVolume === 0);

    setViewerAudioMessage(
      "Viewer volume adjusted. On some mobile browsers, the phone/tablet volume buttons control final loudness."
    );

    setTimeout(applyViewerAudioSettings, 0);
  }

  function openAgvAcademyCompanion() {
    try {
      const companionUrl =
        import.meta.env.VITE_AGV_ACADEMY_URL ||
        "/agv-academy-companion.html";

      const finalUrl = new URL(companionUrl, window.location.origin);

      window.open(finalUrl.toString(), "_blank", "noopener,noreferrer");
      setStatus("AGV Companion Teacher Toolkit / Student Portal opened in a new tab.");
    } catch {
      window.open("/agv-academy-companion.html", "_blank", "noopener,noreferrer");
      setStatus("AGV Companion opened in a new tab.");
    }
  }

  async function copyViewerRoomLink() {
    try {
      const baseUrl = window.location.origin || "https://agv-client.vercel.app";
      const targetRoomId = selectedRoomId || localStorage.getItem("agv_ticket_room_id") || "main-hall";
      const viewerUrl = new URL(baseUrl);

      viewerUrl.searchParams.set("room", targetRoomId);
      viewerUrl.searchParams.set("role", "viewer");

      await navigator.clipboard.writeText(viewerUrl.toString());

      setStatus(`Viewer link copied for room: ${targetRoomId}`);
    } catch {
      const fallbackRoomId = selectedRoomId || localStorage.getItem("agv_ticket_room_id") || "main-hall";
      const fallbackUrl = `${window.location.origin || "https://agv-client.vercel.app"}?room=${encodeURIComponent(
        fallbackRoomId
      )}&role=viewer`;

      try {
        window.prompt("Copy this viewer link:", fallbackUrl);
      } catch {}

      setStatus("Viewer link ready to copy.");
    }
  }

  // PASS_BCAST5_HOST_BROADCAST_CONTROLS
  async function refreshBroadcastStatus() {
    try {
      const response = await fetch(`${ROOM_API_BASE}/api/broadcast/direct/health`);
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        setBroadcastStatus(data?.error || "Broadcast status check failed.");
        return null;
      }

      const isLive = data.broadcastStatus === "live" || data.viewerMode === "broadcast";
      setBroadcastLive(Boolean(isLive));
      setBroadcastEgressId("");
      setBroadcastLastEgressId("");
      setBroadcastStatus(
        isLive
          ? "Direct Cloudflare broadcast is live."
          : "Direct Cloudflare broadcast is off."
      );

      return data;
    } catch (error) {
      setBroadcastStatus(`Direct broadcast status error: ${error?.message || "unknown error"}`);
      return null;
    }
  }

  async function startCloudflareBroadcast() {
    if (!isHost) {
      setBroadcastStatus("Only host/admin can start broadcast.");
      return;
    }

    setBroadcastWorking(true);
    setBroadcastStatus("Starting scale broadcast through Supabase / Cloudflare...");

    try {
      const response = await fetch(`${ROOM_API_BASE}/api/broadcast/direct/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: selectedRoomId || "main-hall",
          title: "AGV Main Hall Supabase Scale Broadcast",
          message: "AGV is using Supabase as the source registry for main-hall.",
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        const msg = data?.error || data?.message || "Direct Cloudflare broadcast could not start.";
        setBroadcastStatus(`Direct broadcast start failed: ${msg}`);
        return;
      }

      setBroadcastLive(true);
      setBroadcastEgressId("");
      setBroadcastStatus("Scale broadcast is live. Cloudflare is the mass delivery path.");
    } catch (error) {
      setBroadcastStatus(`Direct broadcast start error: ${error?.message || "unknown error"}`);
    } finally {
      setBroadcastWorking(false);
    }
  }

  async function stopCloudflareBroadcast() {
    if (!isHost) {
      setBroadcastStatus("Only host/admin can stop broadcast.");
      return;
    }

    setBroadcastWorking(true);
    setBroadcastStatus("Stopping scale broadcast...");

    try {
      const response = await fetch(`${ROOM_API_BASE}/api/broadcast/direct/stop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Main Hall Supabase scale broadcast stopped.",
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        const msg = data?.error || data?.message || "Direct Cloudflare broadcast could not stop.";
        setBroadcastStatus(`Direct broadcast stop failed: ${msg}`);
        return;
      }

      setBroadcastLive(false);
      setBroadcastLastEgressId("");
      setBroadcastEgressId("");
      setBroadcastStatus("Scale broadcast stopped. Viewer mode returned to LiveKit.");
    } catch (error) {
      setBroadcastStatus(`Direct broadcast stop error: ${error?.message || "unknown error"}`);
    } finally {
      setBroadcastWorking(false);
    }
  }


  async function joinAsViewer() {
    const usedBroadcastMode = await tryJoinBroadcastViewer(selectedRoomId);

    if (usedBroadcastMode) {
      return;
    }

    await connectToRoom("viewer", selectedRoomId);
  }

  function disconnectFromLiveKit() {
    cleanupLocalTracks();

    if (livekitRoom) disconnectAgvLiveKitRoom(livekitRoom);

    clearStage();
    setLivekitRoom(null);
    setCameraOn(false);
    setScreenOn(false);
    setStatus("Disconnected");
  }

  function getServerAuthToken() {
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

  async function createHostOwnedRoom() {
    if (!isHost) {
      setStatus("Host access required to create rooms.");
      return;
    }

    const cleanName = newRoomName.trim();
    const cleanCategory = newRoomCategory.trim() || "Custom";

    if (!cleanName) {
      setStatus("Enter a room name.");
      return;
    }

    // PASS32D_E_FREE_ROOM_CREATION_BLOCK
    if (!isSuperAdmin && currentPlan === "FREE" && ownedRoomCount >= 1) {
      setStatus("Free plan limit reached. Free hosts can create only 1 owned room. Upgrade to Creator to add more rooms.");
      return;
    }

    if (!isSuperAdmin && ownedRoomCount >= currentPlanLimits.maxRooms) {
      setStatus(`Room limit reached for ${currentPlanLimits.label}. Limit: ${currentPlanLimits.maxRooms} room(s).`);
      return;
    }

    const ownerEmail = String(storedAccount?.email || freeAccount?.email || "admin@agv.local").trim().toLowerCase();
    const ownerName = storedAccount?.name || freeAccount?.name || "AGV Host";
    const organization = storedAccount?.organization || freeAccount?.organization || "Not set";

    const payload = {
      name: cleanName,
      category: cleanCategory,
      isPrivate: Boolean(newRoomPrivate && currentPlanLimits.allowPrivate),
      allowTicketOnly: Boolean(newRoomTicketOnly && currentPlanLimits.allowTicketOnly),
      ownerId: currentOwnerId,
      ownerEmail,
      ownerName,
      organization,
      currentPlan,
      plan: currentPlan,
      createdByPlan: currentPlan,
      requesterId: currentOwnerId,
      requesterEmail: ownerEmail,
      requesterRole: isSuperAdmin ? "super-admin" : "owner",
    };

    setRoomCreateWorking(true);
    setStatus("Creating host-owned room...");

    try {
      const token = getServerAuthToken();
      const headers = { "Content-Type": "application/json" };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${ROOM_API_BASE}/api/rooms`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);

      if (response.ok && data?.ok) {
        const nextRooms = Array.isArray(data.rooms)
          ? data.rooms
          : data.room
          ? [...rooms, data.room]
          : rooms;

        const syncedRooms = syncRoomsForCurrentPlan(nextRooms, currentPlan, currentOwnerId, freeAccount);

        setRooms(syncedRooms);
        localStorage.setItem("agv_super_admin_rooms", JSON.stringify(syncedRooms));

        if (data.room?.id) {
          handleJoinRoom(data.room.id);
        }

        setNewRoomName("");
        setNewRoomCategory("Custom");
        setNewRoomPrivate(false);
        setNewRoomTicketOnly(false);
        setStatus(`Room created: ${data.room?.name || cleanName}`);
        return;
      }

      setStatus(data?.error || "SERVER room creation not available. Saving locally for this host.");
    } catch {
      setStatus("SERVER room creation offline. Saving locally for this host.");
    } finally {
      setRoomCreateWorking(false);
    }

    const fallbackIdBase = cleanName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || `room-${Date.now()}`;

    let fallbackId = fallbackIdBase;
    let attempt = 1;

    while (rooms.some((room) => room.id === fallbackId)) {
      attempt += 1;
      fallbackId = `${fallbackIdBase}-${attempt}`;
    }

    const fallbackRoom = {
      id: fallbackId,
      name: cleanName,
      category: cleanCategory,
      isPrivate: Boolean(newRoomPrivate && currentPlanLimits.allowPrivate),
      isLocked: false,
      allowTicketOnly: Boolean(newRoomTicketOnly && currentPlanLimits.allowTicketOnly),
      ownerId: currentOwnerId,
      ownerEmail,
      ownerName,
      organization,
      createdBy: currentOwnerId,
      createdByPlan: currentPlan,
      planMode: currentPlan,
      planLabel: currentPlanLimits.label,
      planHostLabel: currentPlanLimits.hostLabel,
      maxRooms: currentPlanLimits.maxRooms,
      maxViewers: currentPlanLimits.maxViewers,
      createdAt: new Date().toISOString(),
    };

    const nextRooms = syncRoomsForCurrentPlan([...rooms, fallbackRoom], currentPlan, currentOwnerId, freeAccount);

    setRooms(nextRooms);
    localStorage.setItem("agv_super_admin_rooms", JSON.stringify(nextRooms));
    handleJoinRoom(fallbackRoom.id);

    setNewRoomName("");
    setNewRoomCategory("Custom");
    setNewRoomPrivate(false);
    setNewRoomTicketOnly(false);
    setStatus(`Room created locally: ${fallbackRoom.name}. SERVER auth connection can be wired later.`);
  }
  function handleJoinRoom(roomId) {
    disconnectFromLiveKit();
    setSelectedRoomId(roomId);

    const url = new URL(window.location.href);
    url.searchParams.set("room", roomId);
    window.history.replaceState({}, "", url.toString());

    setStatus(`Entered ${rooms.find((room) => room.id === roomId)?.name || roomId}`);
  }

  async function addBulletin() {
    if (!canModerate) {
      setStatus("Moderator or Host access required.");
      return;
    }

    const text = newBulletin.trim();
    if (!text) return;

    try {
      const response = await fetch(
        `${BULLETIN_API_BASE}/api/bulletins/${encodeURIComponent(selectedRoomId)}/add`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data?.ok || !Array.isArray(data.bulletins)) {
        setStatus(data?.error || "Could not add bulletin.");
        return;
      }

      setBulletinsByRoom((prev) => ({
        ...prev,
        [selectedRoomId]: data.bulletins,
      }));

      setNewBulletin("");
      setStatus("Bulletin added and synced.");
    } catch {
      setStatus("Could not reach bulletin server on 8785.");
    }
  }

  async function clearBulletins() {
    if (!canModerate) {
      setStatus("Moderator or Host access required.");
      return;
    }

    const confirmed = window.confirm(
      "Clear the bulletin board for this room? This will remove the old bulletin information for everyone viewing this room."
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `${BULLETIN_API_BASE}/api/bulletins/${encodeURIComponent(selectedRoomId)}/clear`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      const data = await response.json();

      if (!response.ok || !data?.ok) {
        setStatus(data?.error || "Could not clear bulletin board.");
        return;
      }

      const nextBulletins = Array.isArray(data.bulletins)
        ? data.bulletins
        : Array.isArray(data?.state?.bulletins)
        ? data.state.bulletins
        : [];

      setBulletinsByRoom((prev) => ({
        ...prev,
        [selectedRoomId]: nextBulletins,
      }));

      setNewBulletin("");
      setStatus("Bulletin board cleared.");
      await loadBulletins(selectedRoomId, true);
    } catch {
      setStatus("Could not reach bulletin server on 8785.");
    }
  }
  function moneyValue(value) {
    const number = Number(String(value || "").replace(/[^0-9.-]/g, ""));
    return Number.isFinite(number) ? number : 0;
  }

  function formatMoney(value) {
    return moneyValue(value).toLocaleString(undefined, {
      style: "currency",
      currency: "USD",
    });
  }

    function saveRevenueReports(nextReports) {
    setRevenueReports(nextReports);

    try {
      localStorage.setItem("agv_revenue_reports_v1", JSON.stringify(nextReports));
    } catch {}
  }

  function getRevenueAdminHeaders() {
    const cleanPin = String(revenueAdminPin || "").trim();

    if (!cleanPin) {
      return {};
    }

    return {
      "x-agv-admin-pin": cleanPin,
    };
  }

  function saveRevenueAdminPin() {
    const cleanPin = String(revenueAdminPin || "").trim();

    if (!cleanPin) {
      localStorage.removeItem("agv_revenue_admin_pin");
      setStatus("Revenue Admin PIN cleared from this browser.");
      return;
    }

    localStorage.setItem("agv_revenue_admin_pin", cleanPin);
    setStatus("Revenue Admin PIN saved in this browser for admin review.");
  }

  function clearRevenueAdminPin() {
    localStorage.removeItem("agv_revenue_admin_pin");
    setRevenueAdminPin("");
    setStatus("Revenue Admin PIN cleared from this browser.");
  }

  async function sendRevenueReportToServer(report) {
    const response = await fetch(`${REVENUE_API_BASE}/api/revenue-reports/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(report),
    });

    const data = await response.json();

    if (!response.ok || !data?.ok) {
      throw new Error(data?.error || "Revenue server rejected the report.");
    }

    return data;
  }
  async function loadRevenueReportsFromServer() {
    if (!isSuperAdmin) {
      setStatus("Super Admin access required to review AGV revenue reports.");
      return;
    }

    if (!String(revenueAdminPin || "").trim()) {
      setStatus("Enter and save the Revenue Admin PIN before loading AGV revenue reports.");
      return;
    }

    setStatus("Loading AGV revenue reports from secure revenue server...");

    try {
      const response = await fetch(`${REVENUE_API_BASE}/api/revenue-reports`, {
        headers: getRevenueAdminHeaders(),
      });

      const data = await response.json();

      if (!response.ok || !data?.ok || !Array.isArray(data.reports)) {
        setStatus(data?.error || "Could not load AGV revenue reports. Check Revenue Admin PIN.");
        return;
      }

      saveRevenueReports(data.reports);
      setStatus(`Loaded ${data.reports.length} AGV revenue report(s) from secure revenue server.`);
    } catch {
      setStatus("Revenue review server offline or unreachable.");
    }
  }

  async function updateRevenueReportStatus(reportId, nextStatus) {
    if (!isSuperAdmin) {
      setStatus("Super Admin access required to update revenue report status.");
      return;
    }

    if (!String(revenueAdminPin || "").trim()) {
      setStatus("Enter and save the Revenue Admin PIN before updating report status.");
      return;
    }

    const adminNotes = window.prompt(
      `Optional admin note for status: ${nextStatus}`,
      ""
    );

    setStatus(`Updating revenue report to ${nextStatus}...`);

    try {
      const response = await fetch(
        `${REVENUE_API_BASE}/api/revenue-reports/${encodeURIComponent(reportId)}/status`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getRevenueAdminHeaders(),
          },
          body: JSON.stringify({
            status: nextStatus,
            adminNotes: adminNotes || "",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data?.ok || !Array.isArray(data.reports)) {
        setStatus(data?.error || "Could not update revenue report status. Check Revenue Admin PIN.");
        return;
      }

      saveRevenueReports(data.reports);
      setStatus(`Revenue report marked as ${nextStatus}.`);
    } catch {
      setStatus("Revenue review server offline. Could not update status.");
    }
  }

  async function submitRevenueReport() {
    if (paidBusinessToolsLocked) {
      setStatus("Revenue reporting is included with paid AGV plans. Upgrade to Creator, Ministry, or Convention.");
      return;
    }

    if (hostVendorAgreementRequired) {
      setStatus("Host/Vendor Agreement required before submitting AGV ticket revenue reports.");
      return;
    }

    const cleanEventName = revenueEventName.trim();
    const cleanRoomId = revenueRoomId.trim() || selectedRoomId;
    const cleanGateway = revenueGateway.trim();
    const gross = moneyValue(revenueGross);
    const refunds = moneyValue(revenueRefunds);
    const netRevenue = Math.max(0, gross - refunds);
    const agvFee = Number((netRevenue * AGV_TICKET_PLATFORM_FEE_RATE).toFixed(2));

    if (!cleanEventName) {
      setStatus("Enter the event name before submitting a revenue report.");
      return;
    }

    if (!cleanGateway) {
      setStatus("Enter the payment gateway used by the host/vendor.");
      return;
    }

    if (gross <= 0) {
      setStatus("Enter gross collected ticket revenue before submitting the report.");
      return;
    }

    const ownerEmail = String(storedAccount?.email || freeAccount?.email || "admin@agv.local")
      .trim()
      .toLowerCase();

    const report = {
      id: `revenue-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      eventName: cleanEventName,
      roomId: cleanRoomId,
      eventDate: revenueEventDate.trim(),
      ticketsSold: Number(revenueTicketsSold || 0),
      grossRevenue: gross,
      refunds,
      netRevenue,
      agvFee,
      feeRate: AGV_TICKET_PLATFORM_FEE_RATE,
      gateway: cleanGateway,
      notes: revenueNotes.trim(),
      status: "Reported",
      ownerId: currentOwnerId,
      ownerName: storedAccount?.name || freeAccount?.name || "AGV Host",
      ownerEmail,
      organization: storedAccount?.organization || freeAccount?.organization || "Not set",
      // PASS31K_OWNER_ADMIN_REVENUE_PLAN

      plan: isSuperAdmin ? "OWNER_ADMIN" : currentPlan,
      createdAt: new Date().toISOString(),
    };

    setStatus("Submitting revenue report to AGV revenue server...");

    try {
      const data = await sendRevenueReportToServer(report);
      const serverReport = data.report || report;
      const nextReports = Array.isArray(data.reports)
        ? data.reports
        : [serverReport, ...revenueReports];

      saveRevenueReports(nextReports);

      setRevenueEventName("");
      setRevenueRoomId("");
      setRevenueEventDate("");
      setRevenueTicketsSold("");
      setRevenueGross("");
      setRevenueRefunds("");
      setRevenueGateway("");
      setRevenueNotes("");

      setStatus(
        `Revenue report saved to SERVER 8794. AGV 7% ticket platform fee: ${formatMoney(
          serverReport.agvFee ?? agvFee
        )}.`
      );
    } catch (error) {
      const fallbackReport = {
        ...report,
        serverSync: "pending",
        serverError: error?.message || "Revenue server unavailable.",
      };

      const nextReports = [fallbackReport, ...revenueReports];
      saveRevenueReports(nextReports);

      setRevenueEventName("");
      setRevenueRoomId("");
      setRevenueEventDate("");
      setRevenueTicketsSold("");
      setRevenueGross("");
      setRevenueRefunds("");
      setRevenueGateway("");
      setRevenueNotes("");

      setStatus(
        `Revenue report saved locally. SERVER 8794 was not reachable. AGV 7% ticket platform fee: ${formatMoney(agvFee)}.`
      );
    }
  }

  function clearRevenueReportsLocal() {
    if (!window.confirm("Clear local AGV revenue reports from this browser?")) return;

    saveRevenueReports([]);
    setStatus("Local revenue reports cleared from this browser.");
  }
  function acceptHostVendorAgreement() {
    window.localStorage.setItem("agv_host_vendor_agreement_v1", "accepted");
    window.localStorage.setItem("agv_host_vendor_agreement_accepted_at", new Date().toISOString());
    window.localStorage.setItem("agv_host_vendor_agreement_plan", currentPlan);
    window.localStorage.setItem("agv_host_vendor_agreement_owner_email", storedAccount?.email || freeAccount?.email || "");
    setHostVendorAgreementAccepted(true);
    setStatus("Host/Vendor Agreement accepted. Ticketed event tools are unlocked for this paid account.");
  }

  function copyInviteLink() {
    const base = window.location.origin || "http://127.0.0.1:5175";
    const invite = `${base}/?room=${encodeURIComponent(selectedRoomId)}`;

    navigator.clipboard
      ?.writeText(invite)
      .then(() => setStatus(`Invite copied for ${selectedRoom?.name}`))
      .catch(() => alert(invite));
  }

  // PASS32B_V2_EVENT_LANDING_PAGE_SHELL
  function buildEventLandingLink(item) {
    const base = window.location.origin || "http://127.0.0.1:5175";
    const eventId = item?.id || item?.title || "agv-event";
    const roomId = item?.roomId || selectedRoomId || "main-hall";

    return `${base}/?event=${encodeURIComponent(eventId)}&room=${encodeURIComponent(roomId)}`;
  }

  function copyEventLandingLink(item) {
    const link = buildEventLandingLink(item);

    navigator.clipboard
      ?.writeText(link)
      .then(() => setStatus(`Event landing link copied for ${item?.title || "AGV event"}`))
      .catch(() => alert(link));
  }

  function previewEventLandingPage(item) {
    const link = buildEventLandingLink(item);
    const title = item?.title || "AGV Event";
    const roomId = item?.roomId || selectedRoomId || "main-hall";
    const date = item?.eventDate || "Date not set";
    const time = item?.startTime || "Time not set";
    const price = item?.ticketPrice || "Free / Not set";
    const host = item?.ownerName || item?.ownerEmail || item?.ownerId || "AGV Host";
    const organization = item?.organization || item?.ownerOrganization || "AGV";
    const description = item?.description || "No event description saved yet.";

    const summary =
      `AGV Event Landing Page Preview\n\n` +
      `Event: ${title}\n` +
      `Host: ${host}\n` +
      `Organization: ${organization}\n` +
      `Room: ${roomId}\n` +
      `Date: ${date}\n` +
      `Time: ${time}\n` +
      `Ticket Price: ${price}\n\n` +
      `Description:\n${description}\n\n` +
      `Landing Link:\n${link}\n\n` +
      `This is a CLIENT-only preview shell. Full public event routing and ticket checkout come in a later SERVER pass.`;

    alert(summary);
  }

  // PASS32E_B_EVENT_LANDING_ROUTE_SHELL
  // PASS32G_EVENT_LANDING_PAGE_UPGRADE
  if (showEventLandingRoute) {
    const landingRoomId = selectedLandingEvent?.roomId || selectedRoomId || "main-hall";
    const landingTitle = selectedLandingEvent?.title || "AGV Event";
    const landingHost =
      selectedLandingEvent?.ownerName ||
      selectedLandingEvent?.ownerEmail ||
      selectedLandingEvent?.ownerId ||
      "AGV Host";
    const landingOrganization =
      selectedLandingEvent?.organization ||
      selectedLandingEvent?.ownerOrganization ||
      "Avant Global Vision";
    const landingDate = selectedLandingEvent?.eventDate || "Date not set";
    const landingTime = selectedLandingEvent?.startTime || "Time not set";
    const landingPrice = selectedLandingEvent?.ticketPrice || "Free / Not set";
    const landingDescription =
      selectedLandingEvent?.description ||
      "This AGV public event page is ready. Full event details will appear when the event server returns this event.";

    const shareLandingLink = () => {
      const link = window.location.href;

      navigator.clipboard
        ?.writeText(link)
        .then(() => setStatus("Event landing link copied."))
        .catch(() => alert(link));
    };

    return (
      <main
        style={{
          minHeight: "100vh",
          background:
            "radial-gradient(circle at 20% 0%, rgba(250,204,21,0.26), transparent 32%), radial-gradient(circle at 80% 20%, rgba(180,83,9,0.22), transparent 30%), linear-gradient(135deg, #020617, #0f172a 48%, #1f1306)",
          color: "#f8fafc",
          padding: 22,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <section
          style={{
            width: "min(1100px, 100%)",
            border: "1px solid rgba(212,175,55,0.34)",
            borderRadius: 34,
            padding: 24,
            background: "linear-gradient(180deg, rgba(15,23,42,0.94), rgba(3,7,18,0.92))",
            boxShadow: "0 34px 110px rgba(0,0,0,0.42)",
          }}
        >
          <div
            style={{
              borderRadius: 28,
              padding: 24,
              background:
                "linear-gradient(135deg, rgba(212,175,55,0.20), rgba(15,23,42,0.72)), radial-gradient(circle at top right, rgba(250,204,21,0.22), transparent 38%)",
              border: "1px solid rgba(212,175,55,0.26)",
              marginBottom: 18,
            }}
          >
            <div
              style={{
                color: "#facc15",
                fontWeight: 950,
                letterSpacing: 4,
                fontSize: 12,
                marginBottom: 12,
                textTransform: "uppercase",
              }}
            >
              Avant Global Vision Presents
            </div>

            <h1
              style={{
                fontSize: "clamp(34px, 6vw, 64px)",
                lineHeight: 0.98,
                margin: "0 0 14px",
                fontWeight: 950,
                letterSpacing: "-1.6px",
              }}
            >
              {landingTitle}
            </h1>

            <p
              style={{
                color: "#dbeafe",
                fontSize: 17,
                lineHeight: 1.65,
                margin: "0 0 22px",
                maxWidth: 820,
              }}
            >
              {landingDescription}
            </p>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <span
                style={{
                  padding: "9px 12px",
                  borderRadius: 999,
                  background: "rgba(250,204,21,0.14)",
                  border: "1px solid rgba(250,204,21,0.26)",
                  color: "#fde68a",
                  fontWeight: 900,
                  fontSize: 12,
                }}
              >
                Room: {landingRoomId}
              </span>

              <span
                style={{
                  padding: "9px 12px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  color: "#e2e8f0",
                  fontWeight: 900,
                  fontSize: 12,
                }}
              >
                Host: {landingHost}
              </span>

              <span
                style={{
                  padding: "9px 12px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  color: "#e2e8f0",
                  fontWeight: 900,
                  fontSize: 12,
                }}
              >
                {landingOrganization}
              </span>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.2fr) minmax(280px, 0.8fr)",
              gap: 18,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 12,
              }}
            >
              <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 20, padding: 16, background: "rgba(255,255,255,0.05)" }}>
                <div style={{ color: "#94a3b8", fontSize: 12, fontWeight: 850, marginBottom: 6 }}>Date</div>
                <div style={{ fontWeight: 950, fontSize: 18 }}>{landingDate}</div>
              </div>

              <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 20, padding: 16, background: "rgba(255,255,255,0.05)" }}>
                <div style={{ color: "#94a3b8", fontSize: 12, fontWeight: 850, marginBottom: 6 }}>Time</div>
                <div style={{ fontWeight: 950, fontSize: 18 }}>{landingTime}</div>
              </div>

              <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 20, padding: 16, background: "rgba(255,255,255,0.05)" }}>
                <div style={{ color: "#94a3b8", fontSize: 12, fontWeight: 850, marginBottom: 6 }}>Ticket</div>
                <div style={{ fontWeight: 950, fontSize: 18 }}>{landingPrice}</div>
              </div>

              <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 20, padding: 16, background: "rgba(255,255,255,0.05)" }}>
                <div style={{ color: "#94a3b8", fontSize: 12, fontWeight: 850, marginBottom: 6 }}>Platform</div>
                <div style={{ fontWeight: 950, fontSize: 18 }}>AGV Live Stage</div>
              </div>

              <div
                style={{
                  gridColumn: "1 / -1",
                  border: "1px solid rgba(212,175,55,0.22)",
                  borderRadius: 22,
                  padding: 18,
                  background: "rgba(212,175,55,0.08)",
                }}
              >
                <div style={{ color: "#facc15", fontWeight: 950, marginBottom: 8 }}>
                  About this AGV event
                </div>

                <div style={{ color: "#cbd5e1", lineHeight: 1.65 }}>
                  This public event page gives viewers a clean place to understand the event before entering the room.
                  Ticket purchase, ticket code entry, and direct checkout routing can be connected in the next pass.
                </div>
              </div>

              {!selectedLandingEvent ? (
                <div
                  style={{
                    gridColumn: "1 / -1",
                    border: "1px solid rgba(250,204,21,0.28)",
                    background: "rgba(250,204,21,0.10)",
                    borderRadius: 18,
                    padding: 14,
                    color: "#fde68a",
                    fontWeight: 800,
                  }}
                >
                  Event details are loading or the event server is offline. You can still enter the assigned AGV room.
                </div>
              ) : null}
            </div>

            <aside
              style={{
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 24,
                padding: 18,
                background: "rgba(2,6,23,0.52)",
                display: "grid",
                gap: 12,
                alignContent: "start",
              }}
            >
              <div style={{ color: "#facc15", fontWeight: 950, fontSize: 18 }}>
                Enter the AGV room
              </div>

              <div style={{ color: "#cbd5e1", lineHeight: 1.55, fontSize: 14 }}>
                Join the live room for this event. Ticket validation and checkout can be connected next.
              </div>

              <button
                style={{
                  border: 0,
                  borderRadius: 999,
                  padding: "14px 18px",
                  background: "linear-gradient(135deg, #facc15, #d97706)",
                  color: "#111827",
                  fontWeight: 950,
                  cursor: "pointer",
                }}
                onClick={() => {
                  setEventLandingDismissed(true);
                  handleJoinRoom(landingRoomId);
                }}
              >
                Enter Event Room
              </button>

              <button
                style={{
                  border: "1px solid rgba(250,204,21,0.28)",
                  borderRadius: 999,
                  padding: "13px 18px",
                  background: "rgba(250,204,21,0.10)",
                  color: "#fde68a",
                  fontWeight: 950,
                  cursor: "pointer",
                }}
                onClick={shareLandingLink}
              >
                Share Event Link
              </button>

              <button
                style={{
                  border: "1px solid rgba(255,255,255,0.14)",
                  borderRadius: 999,
                  padding: "13px 18px",
                  background: "rgba(255,255,255,0.06)",
                  color: "#f8fafc",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
                onClick={() => {
                  const url = new URL(window.location.href);
                  url.searchParams.delete("event");
                  window.history.replaceState({}, "", url.toString());
                  setEventLandingDismissed(true);
                }}
              >
                Continue to AGV
              </button>

              <div
                style={{
                  marginTop: 8,
                  paddingTop: 14,
                  borderTop: "1px solid rgba(255,255,255,0.10)",
                  color: "#94a3b8",
                  fontSize: 13,
                  lineHeight: 1.5,
                }}
              >
                Powered by Avant Global Vision — a digital stage, teaching, convention, and broadcast platform.
              </div>
            </aside>
          </div>
        </section>
      </main>
    );
  }
  return (
    <div style={styles.appShell}>
      <header style={styles.header}>
        <div style={styles.brandRow}>
          <div style={styles.logoSmall}>AGV</div>
          <div>
            <h1 style={styles.title}>Avant Global Vision</h1>
            <div style={styles.subtitle}>LiveKit Digital Convention Platform</div>
          </div>
        </div>

        <div style={styles.headerRight}>
          <div style={styles.statusPill}>{status}</div>

          <div style={styles.roleSelect}>
            {entryRole === "host" ? hostModeLabel : "User / Viewer"}
          </div>

          <button style={styles.dangerButton} onClick={disconnectFromLiveKit}>
            Disconnect
          </button>
        </div>
      </header>

      {!isViewerOnly ? (
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: 10,
            padding: "0 18px 0 18px",
          }}
        >
          <button
            type="button"
            onClick={copyViewerRoomLink}
            style={{
              border: "1px solid rgba(250, 204, 21, 0.45)",
              background: "rgba(250, 204, 21, 0.12)",
              color: "#fde68a",
              borderRadius: 14,
              padding: "10px 14px",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Copy Viewer Link
          </button>
        </div>
      ) : null}

      {isViewerOnly ? (
        <div
          style={{
            margin: "0 18px 12px 18px",
            padding: "12px",
            borderRadius: 16,
            border: "1px solid rgba(96, 165, 250, 0.35)",
            background: "rgba(15, 23, 42, 0.82)",
            boxShadow: "0 14px 30px rgba(0,0,0,0.28)",
            color: "#e5e7eb",
            display: "grid",
            gap: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <div>
              <div style={{ fontWeight: 900, color: "#bfdbfe" }}>
                Viewer Audio
              </div>
              <div style={{ fontSize: 12, opacity: 0.82 }}>
                {viewerAudioMessage}
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <button
                type="button"
                onClick={enableViewerAudio}
                style={{
                  border: "1px solid rgba(34, 197, 94, 0.55)",
                  background: viewerAudioEnabled
                    ? "rgba(34, 197, 94, 0.22)"
                    : "rgba(34, 197, 94, 0.14)",
                  color: "#bbf7d0",
                  borderRadius: 14,
                  padding: "10px 14px",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                {viewerAudioEnabled ? "Audio Enabled" : "Tap to Hear Audio"}
              </button>

              <button
                type="button"
                onClick={toggleViewerMute}
                style={{
                  border: "1px solid rgba(250, 204, 21, 0.45)",
                  background: "rgba(250, 204, 21, 0.12)",
                  color: "#fde68a",
                  borderRadius: 14,
                  padding: "10px 14px",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                {viewerMuted ? "Unmute" : "Mute"}
              </button>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "90px 1fr 54px",
              alignItems: "center",
              gap: 10,
              fontSize: 13,
            }}
          >
            <span style={{ color: "#cbd5e1", fontWeight: 800 }}>Volume</span>
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(Number(viewerVolume || 0) * 100)}
              onChange={(event) =>
                changeViewerVolume(Number(event.target.value) / 100)
              }
              style={{ width: "100%" }}
              aria-label="Viewer volume"
            />
            <span style={{ color: "#cbd5e1", textAlign: "right" }}>
              {Math.round(Number(viewerVolume || 0) * 100)}%
            </span>
          </div>

          <div style={{ fontSize: 12, opacity: 0.72 }}>
            Mobile note: after tapping audio, turn Silent Mode off and use your phone/tablet volume
            buttons for final loudness.
          </div>
        </div>
      ) : null}

      {!isViewerOnly && currentPlan !== "FREE" ? (
        <div
          style={{
            margin: "0 18px 12px 18px",
            padding: "14px",
            borderRadius: 18,
            border: "1px solid rgba(242, 198, 74, 0.38)",
            background:
              "linear-gradient(135deg, rgba(242,198,74,0.12), rgba(22,198,163,0.10), rgba(15,23,42,0.86))",
            boxShadow: "0 14px 30px rgba(0,0,0,0.28)",
            color: "#e5e7eb",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ minWidth: 240 }}>
            <div style={{ fontWeight: 950, color: "#fde68a", fontSize: 15 }}>
              AGV Companion Education Toolkit
            </div>
            <div style={{ fontSize: 12, opacity: 0.82, lineHeight: 1.5 }}>
              Open the Teacher Toolkit and Student Portal in a separate tab, then screen-share it to your AGV class.
            </div>
          </div>

          <button
            type="button"
            onClick={openAgvAcademyCompanion}
            style={{
              border: "1px solid rgba(242, 198, 74, 0.55)",
              background: "linear-gradient(135deg, #f2c64a, #fff0bd)",
              color: "#07111f",
              borderRadius: 999,
              padding: "11px 16px",
              fontWeight: 950,
              cursor: "pointer",
              boxShadow: "0 10px 24px rgba(242,198,74,0.16)",
            }}
          >
            Open Teacher Toolkit / Student Portal
          </button>
        </div>
      ) : !isViewerOnly && currentPlan === "FREE" ? (
        <div
          style={{
            margin: "0 18px 12px 18px",
            padding: "14px",
            borderRadius: 18,
            border: "1px solid rgba(22, 198, 163, 0.34)",
            background:
              "linear-gradient(135deg, rgba(22,198,163,0.11), rgba(242,198,74,0.08), rgba(15,23,42,0.86))",
            boxShadow: "0 14px 30px rgba(0,0,0,0.22)",
            color: "#e5e7eb",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ minWidth: 240 }}>
            <div style={{ fontWeight: 950, color: "#99f6e4", fontSize: 15 }}>
              Unlock AGV Companion With Any Paid Plan
            </div>
            <div style={{ fontSize: 12, opacity: 0.86, lineHeight: 1.5 }}>
              Upgrade to Creator, Ministry, or Convention and receive the AGV Companion Teacher Toolkit
              and Student Portal included with your subscription.
            </div>
          </div>

          <div
            style={{
              border: "1px solid rgba(22, 198, 163, 0.42)",
              background: "rgba(3, 17, 14, 0.72)",
              color: "#ccfbf1",
              borderRadius: 999,
              padding: "10px 14px",
              fontWeight: 900,
              minWidth: 280,
              maxWidth: 520,
              overflow: "hidden",
              boxShadow: "0 10px 24px rgba(22,198,163,0.14)",
            }}
            aria-label="AGV Companion paid plan message"
          >
            <marquee behavior="scroll" direction="left" scrollamount="4">
              Unlock AGV Companion With Any Paid Plan — Upgrade to Creator, Ministry, or Convention and receive the AGV Companion Teacher Toolkit and Student Portal included with your subscription.
            </marquee>
          </div>
        </div>
      ) : null}

      <main style={isViewerOnly ? styles.viewerMainGrid : styles.mainGrid}>
        {!isViewerOnly ? (
          <aside style={styles.leftPanel}>
            <div style={styles.panelTitle}>Rooms</div>

            <div style={styles.planCardMini}>
              <div style={styles.planMiniTitle}>{currentPlanLimits.label} Plan Active</div>
              <div style={styles.planMiniText}>
                {currentPlanLimits.maxRooms} rooms • {currentPlanLimits.maxViewers} viewers
              </div>
              <button style={styles.secondaryButtonFull} onClick={syncPlanFromSubscriptionServer}>
                Refresh Plan Sync
              </button>
            </div>

            <div style={styles.controlBox}>
              <div style={styles.controlTitle}>Create Host-Owned Room</div>

              <div style={styles.helperText}>
                Room usage: {ownedRoomCount} of {currentPlanLimits.maxRooms} owned room(s) used • Plan: {currentPlanLimits.label}
              </div>

              {!isSuperAdmin && currentPlan === "FREE" && ownedRoomCount >= 1 ? (
                <div style={styles.viewerLockBox}>
                  Free plan limit reached. Free hosts can create only 1 owned room. Upgrade to Creator to add more rooms.
                </div>
              ) : roomLimitReached ? (
                <div style={styles.viewerLockBox}>
                  Room limit reached for this plan. Upgrade to add more host-owned rooms.
                </div>
              ) : (
                <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                  <input
                    style={styles.chatInput}
                    value={newRoomName}
                    onChange={(event) => setNewRoomName(event.target.value)}
                    placeholder="Room name, example: Youth Teaching Room"
                  />

                  <input
                    style={styles.chatInput}
                    value={newRoomCategory}
                    onChange={(event) => setNewRoomCategory(event.target.value)}
                    placeholder="Room category, example: Teaching, Podcast, Vendor Booth"
                  />

                  <label style={styles.helperText}>
                    <input
                      type="checkbox"
                      checked={newRoomPrivate}
                      disabled={!currentPlanLimits.allowPrivate && !isSuperAdmin}
                      onChange={(event) => setNewRoomPrivate(event.target.checked)}
                    />{" "}
                    Private room {currentPlanLimits.allowPrivate || isSuperAdmin ? "" : "(upgrade required)"}
                  </label>

                  <label style={styles.helperText}>
                    <input
                      type="checkbox"
                      checked={newRoomTicketOnly}
                      disabled={!currentPlanLimits.allowTicketOnly && !isSuperAdmin}
                      onChange={(event) => setNewRoomTicketOnly(event.target.checked)}
                    />{" "}
                    Ticket-only room {currentPlanLimits.allowTicketOnly || isSuperAdmin ? "" : "(upgrade required)"}
                  </label>

                  <button
                    style={styles.primaryButton}
                    onClick={createHostOwnedRoom}
                    disabled={roomCreateWorking}
                  >
                    {roomCreateWorking ? "Creating Room..." : "Create Room"}
                  </button>
                </div>
              )}
            </div>
            <div style={styles.roomList}>
              {visibleRooms.map((room) => (
                <button
                  key={room.id}
                  style={room.id === selectedRoomId ? styles.roomButtonActive : styles.roomButton}
                  onClick={() => handleJoinRoom(room.id)}
                >
                  <div style={styles.roomName}>{room.name}</div>
                  <div style={styles.roomMeta}>
                    {room.category} • {room.isPrivate ? "Private" : "Public"} •{" "}
                    {room.isLocked ? "Locked" : "Open"}
                  </div>
                  {room.ownerId === currentOwnerId ? (
                    <div style={styles.roomPlanMeta}>
                      {room.planHostLabel || currentPlanLimits.hostLabel}
                    </div>
                  ) : null}
                </button>
              ))}
            </div>
          </aside>
        ) : null}

        <section style={styles.centerPanel}>
          <div style={styles.identityCard}>
            <div>
              <div style={styles.roomHeadline}>{selectedRoom?.name || "Room"}</div>
              <div style={styles.identityLine}>
                Mode: {hostModeLabel} • LiveKit Room: {selectedRoomId}
              </div>

              {!isViewerOnly ? (
                <>
                  <div style={styles.identityLine}>Owner ID: {currentOwnerId}</div>
                  <div style={styles.identityLine}>
                    Active Plan: {currentPlanLimits.label} • Rooms: {currentPlanLimits.maxRooms} • Viewers:{" "}
                    {currentPlanLimits.maxViewers}
                  </div>
                  <div style={styles.identityLine}>
                    Account: {storedAccount?.name || freeAccount?.name || "AGV Host"} •{" "}
                    {storedAccount?.organization || freeAccount?.organization || "Organization not set"}
                  </div>
                </>
              ) : null}
            </div>

            <div style={styles.identityChips}>
              <span style={styles.chip}>{currentPlanLimits.label}</span>
              <span style={styles.chip}>{selectedRoom?.isPrivate ? "Private" : "Public"}</span>
              <span style={styles.chip}>{selectedRoom?.isLocked ? "Locked" : "Open"}</span>
              <span style={styles.chip}>{livekitRoom ? "Connected" : "Standby"}</span>
              <span style={styles.chip}>{ticketApproved ? "Ticket OK" : "Ticket Needed"}</span>
            </div>
          </div>

          {viewerNeedsTicket ? (
            <div style={styles.ticketGate}>
              <div style={styles.ticketBadge}>AGV TICKET LOCK</div>
              <h2 style={styles.ticketTitle}>Enter your event ticket code</h2>
              <p style={styles.ticketText}>
                Viewer access is locked until a valid ticket code is approved. Free plan public rooms do not require a ticket.
              </p>

              <input
                style={styles.ticketInput}
                value={ticketCode}
                onChange={(event) => setTicketCode(event.target.value)}
                placeholder="Example: AGV-XXXXXX"
              />

              <button style={styles.primaryButton} onClick={verifyTicket}>
                {ticketWorking ? "Checking..." : "Verify Ticket"}
              </button>

              {ticketMessage ? <div style={styles.ticketMessage}>{ticketMessage}</div> : null}
            </div>
          ) : null}

          <div style={styles.stageShell}>
            <div style={styles.stageTop}>AGV LIVE STAGE</div>

            <div ref={stageRef} style={styles.stageViewport}>
              <div style={styles.stagePlaceholder}>
                <div style={styles.stageBadge}>AGV</div>
                <div style={styles.stagePlaceholderTitle}>
                  {isViewerOnly ? "Audience Stage Ready" : "Host Stage Ready"}
                </div>
                <div style={styles.stagePlaceholderText}>
                  {isViewerOnly
                    ? "Click Join Viewer to receive the host LiveKit stream."
                    : `Start Host Camera to broadcast through LiveKit as ${hostModeLabel}.`}
                </div>
              </div>
            </div>

            {canControlStage ? (
              <div style={styles.stageControls}>
                <button style={cameraOn ? styles.activeButton : styles.primaryButton} onClick={startHostCamera}>
                  {cameraOn ? "Camera Live" : "Start Host Camera"}
                </button>

                <button style={screenOn ? styles.activeButton : styles.secondaryButton} onClick={toggleScreenShare}>
                  {screenOn ? "Stop Share" : "Share Screen"}
                </button>

                {/* PASS_SCALE5B_SAFE_SCALE_STATUS_BUTTON */}
                <div
                  style={{
                    width: "100%",
                    marginTop: "10px",
                    padding: "12px",
                    borderRadius: "14px",
                    border: "1px solid rgba(245, 158, 11, 0.35)",
                    background: "rgba(15, 23, 42, 0.72)",
                    color: "#f9fafb",
                  }}
                >
                  <div
                    style={{
                      fontSize: "12px",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "#fbbf24",
                      fontWeight: 900,
                      marginBottom: "8px",
                    }}
                  >
                    AGV Scale Status
                  </div>

                  {/* PASS_SCALE5C_SAFE_START_STOP_SCALE_BUTTONS */}
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      flexWrap: "wrap",
                      marginBottom: "10px",
                    }}
                  >
                    {/* PASS_SCALE10B_ONE_BUTTON_CLOUDFLARE_BROADCAST_UI */}
                    {/* PASS_BCAST5_CLIENT_WORKING_EGRESS_BUTTONS */}
                    <button
                      style={broadcastLive ? styles.activeButton : styles.primaryButton}
                      disabled={broadcastWorking}
                      onClick={async () => {
                        setBroadcastWorking(true);
                        setBroadcastStatus("Starting AGV LiveKit → Cloudflare broadcast...");

                        try {
                          const response = await fetch("https://agv-server.onrender.com/api/broadcast/egress/start", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              roomId: selectedRoomId || "main-hall",
                              title: "AGV LiveKit to Cloudflare Teaching Broadcast",
                              // PASS_BCAST7B_CLIENT_TEACHING_SCREENSHARE_LAYOUT
                              // CLIENT SECOND — request screen-share-first teaching layout for Cloudflare viewers.
                              layout: "screen-share",
                              broadcastLayout: "teaching-screen-share",
                              message: "AGV is live through LiveKit egress to Cloudflare Stream. Teaching screen-share layout is enabled.",
                            }),
                          });

                          const data = await response.json().catch(() => null);

                          if (!response.ok || !data?.ok) {
                            const preflight = data?.trackPreflight;
                            const detail = preflight
                              ? " Participants: " +
                                (preflight.participantCount ?? "unknown") +
                                " | Video Tracks: " +
                                (preflight.videoTrackCount ?? "unknown") +
                                " | Active Video: " +
                                (preflight.activeVideoTrackCount ?? "unknown")
                              : "";
                            throw new Error((data?.error || "LiveKit → Cloudflare broadcast start failed.") + detail);
                          }

                          setBroadcastLive(true);

                          setBroadcastStatus(
                            "LiveKit → Cloudflare Live | Player: " +
                              (data.playback?.player || "Cloudflare iframe") +
                              " | Egress: " +
                              (data.egressId || data.state?.egressId || data.egress?.egressId || "started") +
                              " | Participants: " +
                              (data.trackPreflight?.participantCount ?? "unknown") +
                              " | Active Video: " +
                              (data.trackPreflight?.activeVideoTrackCount ?? "unknown") +
                              " | Viewer Mode: " +
                              (data.state?.viewerMode || "broadcast")
                          );
                        } catch (error) {
                          setBroadcastStatus("LiveKit → Cloudflare broadcast start error: " + (error?.message || String(error)));
                        } finally {
                          setBroadcastWorking(false);
                        }
                      }}
                    >
                      {broadcastWorking ? "Going Live..." : "Go Live to Cloudflare"}
                    </button>

                    <button
                      style={styles.secondaryButton}
                      disabled={broadcastWorking}
                      onClick={async () => {
                        setBroadcastWorking(true);
                        setBroadcastStatus("Ending AGV LiveKit → Cloudflare broadcast...");

                        try {
                          const response = await fetch("https://agv-server.onrender.com/api/broadcast/egress/stop", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              roomId: selectedRoomId || "main-hall",
                              message: "AGV LiveKit to Cloudflare broadcast stopped from AGV client.",
                            }),
                          });

                          const data = await response.json().catch(() => null);

                          if (!response.ok || !data?.ok) {
                            throw new Error(data?.error || "LiveKit → Cloudflare broadcast stop failed.");
                          }

                          setBroadcastLive(false);

                          setBroadcastStatus(
                            "LiveKit → Cloudflare Ended | Viewer Mode: " +
                              (data.state?.viewerMode || "livekit") +
                              " | Source: " +
                              (data.source?.status || "standby") +
                              " | Egress: " +
                              (data.state?.egressStatus || "state-reset")
                          );
                        } catch (error) {
                          setBroadcastStatus("LiveKit → Cloudflare broadcast stop error: " + (error?.message || String(error)));
                        } finally {
                          setBroadcastWorking(false);
                        }
                      }}
                    >
                      {broadcastWorking ? "Ending Broadcast..." : "End Cloudflare Broadcast"}
                    </button>

                    <button
                      style={styles.secondaryButton}
                      disabled={broadcastWorking}
                      onClick={async () => {
                        setBroadcastWorking(true);
                        setBroadcastStatus("Checking AGV LiveKit → Cloudflare broadcast status...");

                        try {
                          const response = await fetch("https://agv-server.onrender.com/api/broadcast/egress/health");
                          const data = await response.json().catch(() => null);

                          if (!response.ok || !data?.ok) {
                            throw new Error(data?.error || "LiveKit → Cloudflare broadcast status failed.");
                          }

                          setBroadcastLive(data.viewerMode === "broadcast" || data.broadcastStatus === "live");

                          setBroadcastStatus(
                            "BCAST-4 Status | Ready: " +
                              (data.exchangeReady ? "Yes" : "No") +
                              " | Live: " +
                              (data.exchangeLive ? "Yes" : "No") +
                              " | Player: " +
                              (data.player || "unknown") +
                              " | Source: " +
                              (data.sourceStatus || "unknown") +
                              " | Viewer: " +
                              (data.viewerMode || "unknown") +
                              " | Broadcast: " +
                              (data.broadcastStatus || "unknown") +
                              " | Egress: " +
                              (data.egress?.active ? "active" : data.egress?.found ? "found/not active" : "none")
                          );
                        } catch (error) {
                          setBroadcastStatus("LiveKit → Cloudflare broadcast status error: " + (error?.message || String(error)));
                        } finally {
                          setBroadcastWorking(false);
                        }
                      }}
                    >
                      {broadcastWorking ? "Checking Exchange..." : "Exchange Status"}
                    </button>

                    <button
                      style={broadcastLive ? styles.activeButton : styles.primaryButton}
                      disabled={broadcastWorking}
                      onClick={startCloudflareBroadcast}
                    >
                      {broadcastWorking && !broadcastLive
                        ? "Starting Scale..."
                        : broadcastLive
                          ? "Scale Live"
                          : "Start Scale Broadcast"}
                    </button>

                    <button
                      style={styles.secondaryButton}
                      disabled={broadcastWorking}
                      onClick={stopCloudflareBroadcast}
                    >
                      {broadcastWorking && broadcastLive
                        ? "Stopping Scale..."
                        : "Stop Scale Broadcast"}
                    </button>

                    <button
                      style={styles.secondaryButton}
                      disabled={broadcastWorking}
                      onClick={async () => {
                        setBroadcastWorking(true);
                        setBroadcastStatus("Checking Supabase / Cloudflare scale status...");

                      try {
                        const sourceRes = await fetch("https://agv-server.onrender.com/api/broadcast/sources-db/main-hall");
                        const healthRes = await fetch("https://agv-server.onrender.com/api/broadcast/direct/health");

                        const sourceData = await sourceRes.json();
                        const healthData = await healthRes.json();

                        if (!sourceRes.ok || !healthRes.ok) {
                          throw new Error(sourceData?.error || healthData?.error || "Scale status check failed.");
                        }

                        const source = sourceData?.source || {};
                        const isLive =
                          healthData?.broadcastStatus === "live" ||
                          healthData?.viewerMode === "broadcast";

                        setBroadcastLive(Boolean(isLive));
                        setBroadcastStatus(
                          "Registry: Supabase | Delivery: Cloudflare | Source: " +
                            (source.sourceName || "AGV Main Cloudflare Broadcast Source") +
                            " | Source Status: " +
                            (source.status || "unknown") +
                            " | Viewer Mode: " +
                            (healthData.viewerMode || "unknown") +
                            " | Direct Mode: " +
                            (healthData.directMode ? "on" : "off") +
                            " | Egress: not used"
                        );
                      } catch (error) {
                        setBroadcastStatus("Scale status error: " + (error?.message || String(error)));
                      } finally {
                        setBroadcastWorking(false);
                      }
                    }}
                    >
                      {broadcastWorking ? "Checking Scale Status..." : "Scale Status"}
                    </button>

                    {/* PASS_SCALE8B_B_PLAYBACK_VERIFY_BUTTON */}
                    <button
                      style={styles.secondaryButton}
                      disabled={broadcastWorking}
                      onClick={async () => {
                        setBroadcastWorking(true);
                        setBroadcastStatus("Verifying Cloudflare playback URL...");

                        try {
                          const response = await fetch("https://agv-server.onrender.com/api/broadcast/playback/verify?roomId=main-hall");
                          const data = await response.json().catch(() => null);

                          if (!response.ok || !data?.ok) {
                            throw new Error(data?.error || "Playback verification failed.");
                          }

                          const ready = Boolean(data.playbackReady);
                          const urls = data.urls || {};
                          const hlsConfigured = urls.hlsConfigured ? "configured" : "missing";
                          const embedConfigured = urls.embedConfigured ? "configured" : "missing";
                          const playerType = urls.embedConfigured ? "Cloudflare iframe" : "HLS fallback";

                          setBroadcastLive(data.viewerMode === "broadcast" || data.broadcastStatus === "live");

                          setBroadcastStatus(
                            "Playback Ready: " +
                              (ready ? "Yes" : "No") +
                              " | Player: " +
                              playerType +
                              " | HLS: " +
                              hlsConfigured +
                              " | Embed: " +
                              embedConfigured +
                              " | Viewer Mode: " +
                              (data.viewerMode || "unknown") +
                              " | Source Status: " +
                              (data.sourceStatus || "unknown")
                          );
                        } catch (error) {
                          setBroadcastStatus("Playback verify error: " + (error?.message || String(error)));
                        } finally {
                          setBroadcastWorking(false);
                        }
                      }}
                    >
                      {broadcastWorking ? "Verifying Playback..." : "Verify Playback"}
                    </button>
                    
                    {/* PASS_SCALE9_SAFE_LIVEKIT_BRIDGE_BUTTONS */}
                    <button
                      style={styles.secondaryButton}
                      disabled={broadcastWorking}
                      onClick={async () => {
                        setBroadcastWorking(true);
                        setBroadcastStatus("Checking LiveKit → Cloudflare bridge health...");

                        try {
                          const response = await fetch("https://agv-server.onrender.com/api/broadcast/bridge/health");
                          const data = await response.json().catch(() => null);

                          if (!response.ok || !data?.ok) {
                            throw new Error(data?.error || "Bridge health check failed.");
                          }

                          setBroadcastLive(data.viewerMode === "broadcast" || data.broadcastStatus === "live");

                          setBroadcastStatus(
                            "Bridge Health: " +
                              (data.bridgeReady ? "Ready" : "Not Ready") +
                              " | Viewer Mode: " +
                              (data.viewerMode || "unknown") +
                              " | Broadcast: " +
                              (data.broadcastStatus || "unknown") +
                              " | Egress: " +
                              (data.egressId || "none") +
                              " | LiveKit: " +
                              (data.config?.livekitConfigured ? "configured" : "missing") +
                              " | Cloudflare RTMPS: " +
                              (data.config?.cloudflareRtmpConfigured ? "configured" : "missing")
                          );
                        } catch (error) {
                          setBroadcastStatus("Bridge health error: " + (error?.message || String(error)));
                        } finally {
                          setBroadcastWorking(false);
                        }
                      }}
                    >
                      {broadcastWorking ? "Checking Bridge..." : "Bridge Health"}
                    </button>

                    <button
                      style={broadcastLive ? styles.activeButton : styles.primaryButton}
                      disabled={broadcastWorking}
                      onClick={async () => {
                        setBroadcastWorking(true);
                        setBroadcastStatus("Starting LiveKit → Cloudflare bridge...");

                        try {
                          const response = await fetch("https://agv-server.onrender.com/api/broadcast/bridge/start", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              roomId: selectedRoomId || "main-hall",
                              title: "AGV LiveKit to Cloudflare Bridge",
                              layout: "speaker-dark",
                              message: "AGV is bridging the LiveKit room to Cloudflare.",
                            }),
                          });

                          const data = await response.json().catch(() => null);

                          if (!response.ok || !data?.ok) {
                            const preflight = data?.trackPreflight;
                            const detail = preflight
                              ? " Participants: " +
                                (preflight.participantCount ?? "unknown") +
                                " | Video Tracks: " +
                                (preflight.videoTrackCount ?? "unknown") +
                                " | Active Video: " +
                                (preflight.activeVideoTrackCount ?? "unknown")
                              : "";
                            throw new Error((data?.error || "Bridge start failed.") + detail);
                          }

                          setBroadcastLive(true);

                          setBroadcastStatus(
                            "LiveKit Bridge Live | Egress: " +
                              (data.state?.egressId || data.egress?.egressId || "started") +
                              " | Participants: " +
                              (data.trackPreflight?.participantCount ?? "unknown") +
                              " | Active Video: " +
                              (data.trackPreflight?.activeVideoTrackCount ?? "unknown") +
                              " | Viewer Mode: " +
                              (data.state?.viewerMode || "broadcast")
                          );
                        } catch (error) {
                          setBroadcastStatus("Bridge start error: " + (error?.message || String(error)));
                        } finally {
                          setBroadcastWorking(false);
                        }
                      }}
                    >
                      {broadcastWorking ? "Starting Bridge..." : "Start LiveKit Bridge"}
                    </button>

                    <button
                      style={styles.secondaryButton}
                      disabled={broadcastWorking}
                      onClick={async () => {
                        setBroadcastWorking(true);
                        setBroadcastStatus("Stopping LiveKit → Cloudflare bridge...");

                        try {
                          let currentEgressId = "";

                          try {
                            const currentRes = await fetch("https://agv-server.onrender.com/api/broadcast/bridge/egress/current");
                            const currentData = await currentRes.json().catch(() => null);
                            currentEgressId =
                              currentData?.egressId ||
                              currentData?.egress?.egressId ||
                              currentData?.state?.lastEgressId ||
                              "";
                          } catch {}

                          const response = await fetch("https://agv-server.onrender.com/api/broadcast/bridge/stop", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              roomId: selectedRoomId || "main-hall",
                              egressId: currentEgressId,
                              message: "LiveKit to Cloudflare bridge stopped from AGV client.",
                            }),
                          });

                          const data = await response.json().catch(() => null);

                          if (!response.ok || !data?.ok) {
                            throw new Error(data?.error || "Bridge stop failed.");
                          }

                          setBroadcastLive(false);

                          setBroadcastStatus(
                            "LiveKit Bridge Stopped | Viewer Mode: " +
                              (data.state?.viewerMode || "livekit") +
                              " | Source: " +
                              (data.source?.status || "standby") +
                              " | Stopped: " +
                              (data.stopped ? "Yes" : data.stopError ? "Warning" : "State Reset")
                          );
                        } catch (error) {
                          setBroadcastStatus("Bridge stop error: " + (error?.message || String(error)));
                        } finally {
                          setBroadcastWorking(false);
                        }
                      }}
                    >
                      {broadcastWorking ? "Stopping Bridge..." : "Stop LiveKit Bridge"}
                    </button>

                    <button
                      style={styles.secondaryButton}
                      disabled={broadcastWorking}
                      onClick={async () => {
                        setBroadcastWorking(true);
                        setBroadcastStatus("Checking bridge egress status...");

                        try {
                          const response = await fetch("https://agv-server.onrender.com/api/broadcast/bridge/egress/current");
                          const data = await response.json().catch(() => null);

                          if (!response.ok || !data?.ok) {
                            throw new Error(data?.error || "Bridge egress status check failed.");
                          }

                          const egress = data.egress || {};
                          const found = Boolean(data.found);

                          setBroadcastLive(data.state?.viewerMode === "broadcast" || data.state?.broadcastStatus === "live");

                          setBroadcastStatus(
                            "Bridge Egress: " +
                              (found ? (egress.egressId || data.egressId || "found") : "none") +
                              " | Status: " +
                              (egress.status || data.state?.egressStatus || "none") +
                              " | Error: " +
                              (egress.error || data.state?.egressError || "none") +
                              " | Viewer Mode: " +
                              (data.state?.viewerMode || "unknown")
                          );
                        } catch (error) {
                          setBroadcastStatus("Bridge egress status error: " + (error?.message || String(error)));
                        } finally {
                          setBroadcastWorking(false);
                        }
                      }}
                    >
                      {broadcastWorking ? "Checking Egress..." : "Bridge Egress Status"}
                    </button>
                    
                    {/* PASS_SCALE8D_B_LIVE_PLAYBACK_DEBUG_BUTTON */}
                    <button
                      style={styles.secondaryButton}
                      disabled={broadcastWorking}
                      onClick={async () => {
                        setBroadcastWorking(true);
                        setBroadcastStatus("Running Cloudflare live playback debug...");

                        try {
                          const response = await fetch("https://agv-server.onrender.com/api/broadcast/playback/debug?roomId=main-hall");
                          const data = await response.json().catch(() => null);

                          if (!response.ok || !data?.ok) {
                            throw new Error(data?.error || "Playback debug failed.");
                          }

                          const summary = data.summary || {};
                          const interpretation = data.interpretation || {};
                          const blockers = Array.isArray(interpretation.blockers)
                            ? interpretation.blockers
                            : [];

                          setBroadcastLive(
                            summary.viewerMode === "broadcast" ||
                              summary.broadcastStatus === "live"
                          );

                          setBroadcastStatus(
                            "Debug Playback | URL Ready: " +
                              (summary.playbackReady ? "Yes" : "No") +
                              " | Player: " +
                              (summary.player || "unknown") +
                              " | Source: " +
                              (summary.sourceStatus || "unknown") +
                              " | Viewer: " +
                              (summary.viewerMode || "unknown") +
                              " | Broadcast: " +
                              (summary.broadcastStatus || "unknown") +
                              " | Egress: " +
                              (summary.egressActive ? "active" : summary.egressFound ? "found/not active" : "none") +
                              " | Server Chain: " +
                              (summary.serverChainReady ? "ready" : "not ready") +
                              " | Browser Video: " +
                              (summary.browserVideoConfirmed ? "confirmed" : "not confirmed by server") +
                              (blockers.length ? " | Blockers: " + blockers.join(" / ") : "")
                          );
                        } catch (error) {
                          setBroadcastStatus("Playback debug error: " + (error?.message || String(error)));
                        } finally {
                          setBroadcastWorking(false);
                        }
                      }}
                    >
                      {broadcastWorking ? "Debugging Playback..." : "Debug Playback"}
                    </button>
                  </div>

                  <div
                    style={{
                      marginTop: "10px",
                      padding: "10px",
                      borderRadius: "10px",
                      background: "rgba(2, 6, 23, 0.55)",
                      border: "1px solid rgba(148, 163, 184, 0.22)",
                      fontSize: "13px",
                      lineHeight: "1.45",
                    }}
                  >
                    <strong>Status:</strong> {broadcastStatus || "Scale backend ready. Click Scale Status."}
                    <div style={{ color: "rgba(255,255,255,0.68)", marginTop: "4px" }}>
                      {/* PASS_SCALE8C_DUAL_BROADCAST_PATH_HELPER_TEXT */}
                      Scale paths: Supabase registry → Cloudflare delivery → AGV viewer. Direct Cloudflare source and LiveKit → Cloudflare bridge are supported.
                    </div>
                  </div>
                </div>


                {/* PASS31V_B_SWAP_DRIVE_CONNECT_HOST */}
                <button style={styles.secondaryButton} onClick={() => window.open("https://drive.google.com", "_blank")}>
                  Open Google Drive
                </button>
              </div>
            ) : (
              <div style={styles.stageControls}>
                <button style={viewerNeedsTicket ? styles.lockedButton : styles.primaryButton} onClick={joinAsViewer}>
                  {viewerNeedsTicket ? "Ticket Required" : "Join Viewer"}
                </button>

                {ticketApproved ? (
                  <button style={styles.secondaryButton} onClick={clearTicket}>
                    Clear Ticket
                  </button>
                ) : null}
              </div>
            )}
          </div>

          <div style={styles.bottomGrid}>
            <div style={styles.card}>
              <div style={styles.panelTitle}>Participants</div>
              <div style={styles.participantRow}>
                <span>
                  {isHost
                    ? isSuperAdmin
                      ? "Host Console"
                      : `${currentPlanLimits.label} Host Console`
                    : isModerator
                    ? "Moderator Console"
                    : "Viewer Console"}
                </span>
                <strong>{participantRoleLabel}</strong>
              </div>
              <div style={styles.participantRow}>
                <span>LiveKit room</span>
                <strong>{selectedRoomId}</strong>
              </div>
              <div style={styles.participantRow}>
                <span>Plan viewers</span>
                <strong>{currentPlanLimits.maxViewers}</strong>
              </div>
            </div>

            <div style={styles.card}>
              <div style={styles.panelTitle}>Bulletin Board</div>

              <div style={styles.bulletinList}>
                {selectedRoomBulletins.length ? (
                  selectedRoomBulletins.map((item, index) => (
                    <div key={`${item}-${index}`} style={styles.bulletinItem}>
                      {item}
                    </div>
                  ))
                ) : (
                  <div style={styles.emptyText}>No bulletins loaded.</div>
                )}
              </div>

              {!isViewerOnly ? (
                <>
                  <textarea
                    style={styles.textarea}
                    value={newBulletin}
                    onChange={(event) => setNewBulletin(event.target.value)}
                    placeholder="Add bulletin"
                  />

                  <button style={styles.primaryButton} onClick={addBulletin}>
                    Add Bulletin
                  </button>

                  <button
                    style={{
                      ...styles.dangerButton,
                      width: "100%",
                      justifyContent: "center",
                      marginTop: 8,
                    }}
                    onClick={clearBulletins}
                  >
                    Clear Bulletin Board
                  </button>
                </>
              ) : (
                <div style={styles.viewerLockBox}>Viewer mode: bulletin editing is locked.</div>
              )}
            </div>
          </div>
        </section>

        <aside style={styles.rightPanel}>
          <div style={styles.tabRow}>
            <button
              style={selectedPanel === "chat" ? styles.tabActive : styles.tab}
              onClick={() => setSelectedPanel("chat")}
            >
              Chat
            </button>

            <button
              style={selectedPanel === "bulletin" ? styles.tabActive : styles.tab}
              onClick={() => setSelectedPanel("bulletin")}
            >
              Bulletin
            </button>

            {!isViewerOnly ? (
              <button
                style={selectedPanel === "controls" ? styles.tabActive : styles.tab}
                onClick={() => setSelectedPanel("controls")}
              >
                Control
              </button>
            ) : null}
          </div>

          {selectedPanel === "chat" ? (
            <div style={styles.card}>
              <div style={styles.panelTitle}>Room Chat</div>

              <div style={styles.chatList}>
                {selectedRoomMessages.length ? (
                  selectedRoomMessages.map((message) => (
                    <div key={message.id} style={styles.chatMessage}>
                      <div style={styles.chatMeta}>
                        {message.sender} • {message.time}
                      </div>
                      <div>{message.text}</div>
                    </div>
                  ))
                ) : (
                  <div style={styles.emptyText}>No messages yet.</div>
                )}
              </div>

              <div style={styles.chatComposer}>
                <input
                  style={styles.chatInput}
                  value={chatInput}
                  disabled={viewerNeedsTicket}
                  onChange={(event) => setChatInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") sendMessage();
                  }}
                  placeholder={viewerNeedsTicket ? "Ticket required before chat" : "Type message"}
                />

                <button style={viewerNeedsTicket ? styles.lockedButton : styles.primaryButton} onClick={sendMessage}>
                  Send
                </button>
              </div>

              {!isViewerOnly ? (
                <button style={styles.secondaryButtonFull} onClick={clearChat}>
                  Clear Chat
                </button>
              ) : null}
            </div>
          ) : null}

          {selectedPanel === "bulletin" ? (
            <div style={styles.card}>
              <div style={styles.panelTitle}>Bulletin Feed</div>

              <div style={styles.bulletinListTall}>
                {selectedRoomBulletins.length ? (
                  selectedRoomBulletins.map((item, index) => (
                    <div key={`${item}-feed-${index}`} style={styles.bulletinItem}>
                      {item}
                    </div>
                  ))
                ) : (
                  <div style={styles.emptyText}>No bulletins loaded.</div>
                )}
              </div>
            </div>
          ) : null}

          {selectedPanel === "controls" && !isViewerOnly ? (
            <div style={styles.card}>
                            {/* PASS31U_V2_CONTROL_CENTER_SECTIONS */}
              <div style={styles.panelTitle}>Control Center — Host Tools</div>
              <div style={styles.helperText}>
                Organized host tools for plan authority, tickets, revenue, events, files, invites, and moderation.
              </div>

              <div style={styles.controlBox}>
                
              <div
                style={{
                  marginTop: 14,
                  marginBottom: 10,
                  padding: "10px 12px",
                  borderRadius: 14,
                  border: "1px solid rgba(212,175,55,0.28)",
                  background: "rgba(212,175,55,0.10)",
                  color: "#fef3c7",
                }}
              >
                <div style={{ fontWeight: 950, fontSize: 13, letterSpacing: 0.4 }}>
                  Plan & Authority
                </div>
                <div style={{ fontSize: 11, color: "rgba(254,243,199,0.72)", marginTop: 3 }}>
                  Confirm host plan limits, room access, and subscription authority.
                </div>
              </div>
                <div style={styles.controlTitle}>Plan Authority</div>
                <div style={styles.helperText}>
                  Current Plan: {currentPlanLimits.label} • Host Mode: {hostModeLabel}
                </div>
                <div style={styles.helperText}>
                  Room Limit: {currentPlanLimits.maxRooms} • Viewer Limit: {currentPlanLimits.maxViewers}
                </div>
                <div style={styles.helperText}>
                  Private Rooms: {currentPlanLimits.allowPrivate ? "Allowed" : "Upgrade required"} • Ticket-Only Rooms:{" "}
                  {currentPlanLimits.allowTicketOnly ? "Allowed" : "Upgrade required"}
                </div>
                
                {/* PASS_PRICING_2_CLIENT_FEE_POLICY_DISPLAY */}
                <div
                  style={{
                    marginTop: 10,
                    marginBottom: 10,
                    padding: "12px 14px",
                    borderRadius: 14,
                    border: "1px solid rgba(250,204,21,0.35)",
                    background:
                      "linear-gradient(135deg, rgba(120,53,15,0.42), rgba(15,23,42,0.84))",
                    boxShadow: "0 14px 34px rgba(0,0,0,0.22)",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 950,
                      color: "#fde68a",
                      fontSize: 13,
                      letterSpacing: 0.35,
                      marginBottom: 6,
                    }}
                  >
                    AGV Pricing & Broadcast Fee Policy
                  </div>

                  <div
                    style={{
                      fontSize: 12,
                      color: "rgba(255,255,255,0.86)",
                      lineHeight: 1.55,
                    }}
                  >
                    Monthly subscriptions provide platform access. Paid ticketed events include a
                    <strong> 7% AGV ticket platform fee</strong>. Broadcast delivery fees are billed
                    separately to cover Cloudflare and streaming usage. Payment processing fees are
                    passed through separately. Large audience broadcasts, conventions, international
                    events, and high-viewer programs may require a custom quote before going live.
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 6,
                      marginTop: 10,
                    }}
                  >
                    <span style={styles.chip}>Subscription = Platform Access</span>
                    <span style={styles.chip}>AGV Ticket Fee = 7%</span>
                    <span style={styles.chip}>Broadcast Delivery = Separate</span>
                    <span style={styles.chip}>Processing = Pass Through</span>
                    <span style={styles.chip}>Large Event = Custom Quote</span>
                  </div>
                </div>

<button style={styles.secondaryButton} onClick={syncPlanFromSubscriptionServer}>
                  Refresh Plan From AGV subscription service
                </button>
              </div>

              <div style={styles.controlBox}>
                {paidBusinessToolsLocked ? (
                  <div
                    style={{
                      border: "1px solid rgba(250, 204, 21, 0.34)",
                      background: "rgba(250, 204, 21, 0.10)",
                      color: "#fde68a",
                      borderRadius: 14,
                      padding: 10,
                      marginBottom: 10,
                      fontSize: 12,
                      fontWeight: 850,
                      lineHeight: 1.5,
                    }}
                  >
                    Events and moderator controls are paid-plan tools. Upgrade to Creator, Ministry, or Convention.
                  </div>
                ) : null}

                {hostVendorAgreementRequired ? (
                  <div
                    style={{
                      border: "1px solid rgba(22, 198, 163, 0.38)",
                      background: "rgba(2, 6, 23, 0.92)",
                      color: "#e5e7eb",
                      borderRadius: 16,
                      padding: 14,
                      marginBottom: 12,
                      boxShadow: "0 14px 30px rgba(0,0,0,0.24)",
                    }}
                  >
                    <div style={{ color: "#99f6e4", fontWeight: 950, fontSize: 14, marginBottom: 8 }}>
                      AGV Host/Vendor Agreement Required
                    </div>

                    <div style={{ fontSize: 12, lineHeight: 1.55, opacity: 0.94, display: "grid", gap: 6 }}>
                      <div>
                        By creating ticketed events or leasing digital room access through AGV, the host agrees that
                        they are an independent vendor / contractor and not an employee, partner, or agent of AGV.
                      </div>

                      <div>
                        The host is responsible for their own payment gateway, ticket sales, taxes, refunds,
                        chargebacks, customer disputes, business licenses, event promises, and legal compliance.
                      </div>

                      <div>
                        If the host uses an outside payment provider, the host agrees to report collected ticket revenue
                        and pay AGV a 7% ticket platform fee based on collected ticket revenue after refunds, plus applicable broadcast delivery service fees and payment processing.
                      </div>

                      <div>
                        AGV provides digital room technology, ticket verification, and platform access only. AGV does
                        not guarantee sales, attendance, revenue, event success, or customer satisfaction.
                      </div>
                    </div>

                    <button
                      style={{
                        ...styles.primaryButton,
                        width: "100%",
                        justifyContent: "center",
                        marginTop: 12,
                      }}
                      onClick={acceptHostVendorAgreement}
                    >
                      I Agree — Unlock Ticketed Event Tools
                    </button>
                  </div>
                ) : null}
                <div style={styles.controlBox}>
                  
              <div
                style={{
                  marginTop: 14,
                  marginBottom: 10,
                  padding: "10px 12px",
                  borderRadius: 14,
                  border: "1px solid rgba(212,175,55,0.28)",
                  background: "rgba(212,175,55,0.10)",
                  color: "#fef3c7",
                }}
              >
                <div style={{ fontWeight: 950, fontSize: 13, letterSpacing: 0.4 }}>
                  Tickets & Revenue
                </div>
                <div style={{ fontSize: 11, color: "rgba(254,243,199,0.72)", marginTop: 3 }}>
                  Manage ticketed event agreement, revenue reporting, and AGV room leasing fee tracking.
                </div>
              </div>
                  {/* PASS31Z_VENDOR_FINANCIAL_HUB */}
                  <div style={styles.ownerSyncBox}>
                    <div style={styles.ownerSyncTitle}>Vendor Financial Hub</div>

                    <div style={styles.helperText}>
                      Connect vendor payment workflow, track ticket revenue, review AGV's 7% ticket platform fee, track broadcast delivery service fees, account for payment processing, and prepare for future gateway automation.
                    </div>

                    <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                      <div style={styles.eventOwnerCard}>
                        <div style={styles.eventOwnerTitle}>Gateway Connectivity</div>
                        <div style={styles.helperText}>
                          Status: Manual reporting mode • Future gateway connection: Ready for SERVER integration
                        </div>
                        <div style={styles.helperText}>
                          Current reported gateway: {revenueGateway || revenueReports?.[0]?.gateway || "Not connected / not reported"}
                        </div>
                        <button
                          style={styles.secondaryButton}
                          onClick={() =>
                            setStatus("Vendor gateway onboarding shell is ready. SERVER Stripe Connect foundation is the next required step.")
                          }
                        >
                          Connect Payment Gateway — Coming Soon
                        </button>
                      </div>

                      <div style={styles.eventOwnerCard}>
                        <div style={styles.eventOwnerTitle}>Receivables Snapshot</div>
                        <div style={styles.helperText}>
                          Tickets sold: {revenueTicketsSold || revenueReports?.[0]?.ticketsSold || 0}
                        </div>
                        <div style={styles.helperText}>
                          Gross ticket revenue: {formatMoney(moneyValue(revenueGross) || revenueReports?.[0]?.grossRevenue || 0)}
                        </div>
                        <div style={styles.helperText}>
                          Refunds / adjustments: {formatMoney(moneyValue(revenueRefunds) || revenueReports?.[0]?.refunds || 0)}
                        </div>
                        <div style={styles.helperText}>
                          Net vendor receivable:{" "}
                          {formatMoney(
                            Math.max(
                              0,
                              (moneyValue(revenueGross) || revenueReports?.[0]?.grossRevenue || 0) -
                                (moneyValue(revenueRefunds) || revenueReports?.[0]?.refunds || 0)
                            )
                          )}
                        </div>
                      </div>

                      <div style={styles.eventOwnerCard}>
                        <div style={styles.eventOwnerTitle}>AGV 7% Platform Fee Payable</div>
                        <div style={styles.helperText}>Fee rate: 7% ticket platform fee. Broadcast delivery service fee and payment processing are separate.</div>
                        <div style={styles.helperText}>
                          AGV payable estimate:{" "}
                          {formatMoney(
                            Math.max(
                              0,
                              (moneyValue(revenueGross) || revenueReports?.[0]?.grossRevenue || 0) -
                                (moneyValue(revenueRefunds) || revenueReports?.[0]?.refunds || 0)
                            ) * AGV_TICKET_PLATFORM_FEE_RATE
                          )}
                        </div>
                        <div style={styles.helperText}>
                          Revenue server: SERVER 8794 reporting path already prepared
                        </div>
                      </div>

                      <div style={styles.eventOwnerCard}>
                        <div style={styles.eventOwnerTitle}>Onboarding Steps</div>
                        <div style={styles.helperText}>1. Accept Host/Vendor Agreement</div>
                        <div style={styles.helperText}>2. Choose payment gateway or manual reporting</div>
                        <div style={styles.helperText}>3. Report ticket revenue after event</div>
                        <div style={styles.helperText}>4. Review AGV 7% ticket platform fee</div>
                        <div style={styles.helperText}>5. Future: connect Stripe/payment gateway automation</div>
                      </div>
                    </div>
                  </div>

                  <div style={styles.controlTitle}>Ticket Revenue Report / 7% AGV Platform Fee Tracking</div>
                  <div style={styles.helperText}>
                    Paid hosts who use their own payment gateway can report ticket revenue here.
                    AGV calculates a 7% ticket platform fee based on net collected ticket revenue after refunds. Broadcast delivery service fees and payment processing are separate.
                    Official AGV event fee structure: 7% ticket platform fee + broadcast delivery service fee + payment processing.
                  </div>

                  {paidBusinessToolsLocked ? (
                    <div style={styles.viewerLockBox}>
                      Revenue reports are paid-plan tools. Upgrade to Creator, Ministry, or Convention.
                    </div>
                  ) : hostVendorAgreementRequired ? (
                    <div style={styles.viewerLockBox}>
                      Host/Vendor Agreement required before submitting ticket revenue reports.
                    </div>
                  ) : (
                    <>
                      <input
                        style={styles.chatInput}
                        value={revenueEventName}
                        onChange={(event) => setRevenueEventName(event.target.value)}
                        placeholder="Event name"
                      />

                      <input
                        style={styles.chatInput}
                        value={revenueRoomId}
                        onChange={(event) => setRevenueRoomId(event.target.value)}
                        placeholder={`Room ID - default: ${selectedRoomId}`}
                      />

                      <input
                        style={styles.chatInput}
                        value={revenueEventDate}
                        onChange={(event) => setRevenueEventDate(event.target.value)}
                        placeholder="Event date"
                        type="date"
                      />

                      <input
                        style={styles.chatInput}
                        value={revenueTicketsSold}
                        onChange={(event) => setRevenueTicketsSold(event.target.value)}
                        placeholder="Tickets sold"
                        type="number"
                        min="0"
                      />

                      <input
                        style={styles.chatInput}
                        value={revenueGross}
                        onChange={(event) => setRevenueGross(event.target.value)}
                        placeholder="Gross collected ticket revenue"
                        inputMode="decimal"
                      />

                      <input
                        style={styles.chatInput}
                        value={revenueRefunds}
                        onChange={(event) => setRevenueRefunds(event.target.value)}
                        placeholder="Refunds issued"
                        inputMode="decimal"
                      />

                      <input
                        style={styles.chatInput}
                        value={revenueGateway}
                        onChange={(event) => setRevenueGateway(event.target.value)}
                        placeholder="Payment gateway used - Stripe, PayPal, Square, Cash App, Eventbrite, etc."
                      />

                      <textarea
                        style={styles.textarea}
                        value={revenueNotes}
                        onChange={(event) => setRevenueNotes(event.target.value)}
                        placeholder="Host/vendor notes"
                      />

                      <div style={styles.ownerSyncBox}>
                        <div style={styles.ownerSyncTitle}>AGV 7% Ticket Platform Fee Preview</div>
                        <div style={styles.helperText}>
                          Gross: {formatMoney(revenueGross)} • Refunds: {formatMoney(revenueRefunds)}
                        </div>
                        <div style={styles.helperText}>
                          Net collected revenue: {formatMoney(Math.max(0, moneyValue(revenueGross) - moneyValue(revenueRefunds)))}
                        </div>
                        <div style={styles.helperText}>
                          AGV 7% ticket platform fee:{" "}
                          {formatMoney(Math.max(0, moneyValue(revenueGross) - moneyValue(revenueRefunds)) * AGV_TICKET_PLATFORM_FEE_RATE)}
                        </div>
                      </div>

                      <div style={styles.buttonRow}>
                        <button style={styles.primaryButton} onClick={submitRevenueReport}>
                          Submit Revenue Report
                        </button>

                        <button style={styles.secondaryButton} onClick={clearRevenueReportsLocal}>
                          Clear Local Reports
                        </button>
                      </div>
                    </>
                  )}

                  <div style={styles.ownerSyncBox}>
                    <div style={styles.ownerSyncTitle}>Local Revenue Reports</div>

                    {revenueReports.length ? (
                      <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
                        {revenueReports.slice(0, 5).map((report) => (
                          <div key={report.id} style={styles.eventOwnerCard}>
                            <div style={styles.eventOwnerTitle}>
                              {report.eventName} • {report.status || "Reported"}
                            </div>
                            <div style={styles.helperText}>
                              Room: {report.roomId || "Not set"} • Gateway: {report.gateway || "Not set"}
                            </div>
                            <div style={styles.helperText}>
                              Tickets: {report.ticketsSold || 0} • Net: {formatMoney(report.netRevenue)} • AGV 7% Platform Fee:{" "}
                              {formatMoney(report.agvFee)}
                            </div>
                            <div style={styles.helperText}>
                              Host: {report.ownerName || "AGV Host"} • {report.organization || "Organization not set"}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={styles.emptyText}>No local revenue reports submitted yet.</div>
                    )}
                                    </div>

                  {isSuperAdmin ? (
                    <div style={styles.ownerSyncBox}>
                      <div style={styles.ownerSyncTitle}>Admin Revenue Review Dashboard</div>
                      <div style={styles.helperText}>
                        Owner/Admin review area for vendor ticket revenue reports and AGV 7% ticket platform fees.
                      </div>

                      <div style={styles.ownerSyncBox}>
                        <div style={styles.ownerSyncTitle}>Revenue Admin PIN</div>
                        <div style={styles.helperText}>
                          Enter your private AGV Revenue Admin PIN to load reports and update invoice status.
                        </div>

                        <input
                          style={styles.chatInput}
                          value={revenueAdminPin}
                          onChange={(event) => setRevenueAdminPin(event.target.value)}
                          placeholder="Revenue Admin PIN"
                          type="password"
                        />

                        <div style={styles.buttonRow}>
                          <button style={styles.secondaryButton} onClick={saveRevenueAdminPin}>
                            Save PIN
                          </button>

                          <button style={styles.dangerButton} onClick={clearRevenueAdminPin}>
                            Clear PIN
                          </button>
                        </div>
                      </div>

                      <button style={styles.secondaryButton} onClick={loadRevenueReportsFromServer}>
                        Load Reports From Secure Revenue Server
                      </button>

                      {revenueReports.length ? (
                        <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                          {revenueReports.map((report) => (
                            <div key={report.id} style={styles.eventOwnerCard}>
                              <div style={styles.eventOwnerTitle}>
                                {report.eventName} • {report.status || "Reported"}
                              </div>

                              <div style={styles.helperText}>
                                Host: {report.ownerName || "AGV Host"} • {report.organization || "Organization not set"}
                              </div>

                              <div style={styles.helperText}>
                                Email: {report.ownerEmail || "Not saved"} • Plan: {report.plan || "Not saved"}
                              </div>

                              <div style={styles.helperText}>
                                Room: {report.roomId || "main-hall"} • Date: {report.eventDate || "Not set"} • Gateway:{" "}
                                {report.gateway || "Not reported"}
                              </div>

                              <div style={styles.helperText}>
                                Tickets: {report.ticketsSold || 0} • Gross: {formatMoney(report.grossRevenue)} • Refunds:{" "}
                                {formatMoney(report.refunds)}
                              </div>

                              <div style={styles.helperText}>
                                Net Revenue: {formatMoney(report.netRevenue)} • AGV 7% Platform Fee Owed:{" "}
                                {formatMoney(report.agvFee)}
                              </div>

                              {report.notes ? (
                                <div style={styles.helperText}>Host Notes: {report.notes}</div>
                              ) : null}

                              {report.adminNotes ? (
                                <div style={styles.helperText}>Admin Notes: {report.adminNotes}</div>
                              ) : null}

                              <div
                                style={{
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: 8,
                                  marginTop: 10,
                                }}
                              >
                                <button
                                  style={styles.secondaryButton}
                                  onClick={() => updateRevenueReportStatus(report.id, "Reported")}
                                >
                                  Reported
                                </button>

                                <button
                                  style={styles.secondaryButton}
                                  onClick={() => updateRevenueReportStatus(report.id, "Invoiced")}
                                >
                                  Invoiced
                                </button>

                                <button
                                  style={styles.primaryButton}
                                  onClick={() => updateRevenueReportStatus(report.id, "Paid")}
                                >
                                  Paid
                                </button>

                                <button
                                  style={styles.secondaryButton}
                                  onClick={() => updateRevenueReportStatus(report.id, "Disputed")}
                                >
                                  Disputed
                                </button>

                                <button
                                  style={styles.dangerButton}
                                  onClick={() => updateRevenueReportStatus(report.id, "Closed")}
                                >
                                  Closed
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={styles.emptyText}>
                          No revenue reports loaded yet. Click “Load Reports From SERVER 8794.”
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
                
              <div
                style={{
                  marginTop: 14,
                  marginBottom: 10,
                  padding: "10px 12px",
                  borderRadius: 14,
                  border: "1px solid rgba(212,175,55,0.28)",
                  background: "rgba(212,175,55,0.10)",
                  color: "#fef3c7",
                }}
              >
                <div style={{ fontWeight: 950, fontSize: 13, letterSpacing: 0.4 }}>
                  Events
                </div>
                <div style={{ fontSize: 11, color: "rgba(254,243,199,0.72)", marginTop: 3 }}>
                  Create, refresh, review, and manage AGV events tied to the current room.
                </div>
              </div>
                <div style={styles.controlTitle}>Event Creation System</div>

                <div style={styles.helperText}>
                  Create AGV events tied to the current room. Events are stored on SERVER 8786.
                </div>

                <div style={styles.ownerSyncBox}>
                  <div style={styles.ownerSyncTitle}>Event Owner Sync</div>
                  <div style={styles.helperText}>Owner: {storedAccount?.name || freeAccount?.name || "AGV Host"}</div>
                  <div style={styles.helperText}>Email: {storedAccount?.email || freeAccount?.email || "admin@agv.local"}</div>
                  <div style={styles.helperText}>Organization: {storedAccount?.organization || freeAccount?.organization || "Not set"}</div>
                  <div style={styles.helperText}>Plan: {currentPlanLimits.label}</div>
                </div>

                <input
                  style={styles.chatInput}
                  value={eventTitle}
                  onChange={(event) => setEventTitle(event.target.value)}
                  placeholder="Event title"
                />

                <textarea
                  style={styles.textarea}
                  value={eventDescription}
                  onChange={(event) => setEventDescription(event.target.value)}
                  placeholder="Event description"
                />

                <input
                  style={styles.chatInput}
                  value={eventDate}
                  onChange={(event) => setEventDate(event.target.value)}
                  placeholder="Event date, example: 2026-05-06"
                />

                <input
                  style={styles.chatInput}
                  value={eventTime}
                  onChange={(event) => setEventTime(event.target.value)}
                  placeholder="Start time, example: 6:00 PM"
                />

                <input
                  style={styles.chatInput}
                  value={eventPrice}
                  onChange={(event) => setEventPrice(event.target.value)}
                  placeholder="Ticket price, example: 15.00"
                />

                <button style={styles.primaryButton} onClick={createEvent}>
                  Create Event
                </button>

                <button style={styles.secondaryButton} onClick={() => loadEvents()}>
                  Refresh Events
                </button>

                <div style={styles.helperText}>Current Events:</div>

                {events.length ? (
                  events.map((item) => {
                    const allowedToDelete = canDeleteEvent(item);

                    return (
                      <div key={item.id} style={styles.controlBox}>
                        <div style={styles.controlTitle}>{item.title}</div>

                        <div style={styles.helperText}>
                          Room: {item.roomId || "main-hall"} • Date: {item.eventDate || "Not set"} • Time:{" "}
                          {item.startTime || "Not set"} • Price: {item.ticketPrice || "Not set"}
                        </div>

                        <div style={styles.eventOwnerCard}>
                          <div style={styles.eventOwnerTitle}>Ownership</div>
                          <div style={styles.helperText}>
                            Owner: {item.ownerName || item.ownerEmail || item.ownerId || "Legacy event without owner"}
                          </div>
                          <div style={styles.helperText}>
                            Email: {item.ownerEmail || "Not saved"}
                          </div>
                          <div style={styles.helperText}>
                            Organization: {item.organization || item.ownerOrganization || "Not saved"}
                          </div>
                          <div style={styles.helperText}>
                            Plan: {item.plan || item.planLabel || item.createdByPlan || "Legacy"}
                          </div>
                          <div style={styles.helperText}>
                            Account-Owned: {item.createdByAccount ? "Yes" : "Legacy / Not marked"}
                          </div>
                        </div>

                        {item.description ? (
                          <div style={styles.helperText}>{item.description}</div>
                        ) : null}

                        <div style={styles.ownerSyncBox}>
                          <div style={styles.ownerSyncTitle}>Event Landing Page Preview</div>

                          <div style={styles.helperText}>
                            Public-facing event shell for sharing this show outside the control room.
                          </div>

                          <div style={styles.eventOwnerCard}>
                            <div style={styles.eventOwnerTitle}>{item.title || "AGV Event"}</div>

                            <div style={styles.helperText}>
                              Host: {item.ownerName || item.ownerEmail || item.ownerId || "AGV Host"}
                            </div>

                            <div style={styles.helperText}>
                              Organization: {item.organization || item.ownerOrganization || "AGV"}
                            </div>

                            <div style={styles.helperText}>
                              Room: {item.roomId || "main-hall"} • Date: {item.eventDate || "Not set"} • Time:{" "}
                              {item.startTime || "Not set"}
                            </div>

                            <div style={styles.helperText}>
                              Ticket Price: {item.ticketPrice || "Free / Not set"}
                            </div>

                            <div style={styles.helperText}>
                              Landing Link: {buildEventLandingLink(item)}
                            </div>
                          </div>

                          <div style={styles.buttonRow}>
                            <button style={styles.secondaryButton} onClick={() => copyEventLandingLink(item)}>
                              Copy Event Landing Link
                            </button>

                            <button style={styles.secondaryButton} onClick={() => previewEventLandingPage(item)}>
                              Preview Event Landing Page
                            </button>
                          </div>
                        </div>

                        {allowedToDelete ? (
                          <button
                            style={styles.dangerButton}
                            onClick={() => deleteEvent(item.id)}
                          >
                            Delete Event
                          </button>
                        ) : (
                          <div style={styles.viewerLockBox}>
                            Delete locked: only the event owner or Super Admin can delete this show.
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div style={styles.emptyText}>No events created yet.</div>
                )}
              </div>

              
              <div
                style={{
                  marginTop: 14,
                  marginBottom: 10,
                  padding: "10px 12px",
                  borderRadius: 14,
                  border: "1px solid rgba(212,175,55,0.28)",
                  background: "rgba(212,175,55,0.10)",
                  color: "#fef3c7",
                }}
              >
                <div style={{ fontWeight: 950, fontSize: 13, letterSpacing: 0.4 }}>
                  Files & Invites
                </div>
                <div style={{ fontSize: 11, color: "rgba(254,243,199,0.72)", marginTop: 3 }}>
                  Share the room invite link and open external file tools when needed.
                </div>
              </div>
              <button style={styles.primaryButton} onClick={copyInviteLink}>
                Copy Room Invite
              </button>


              <button style={styles.secondaryButton} onClick={() => connectToRoom("host", selectedRoomId)}>
                Connect Host
              </button>

              <div style={styles.controlBox}>
                
              <div
                style={{
                  marginTop: 14,
                  marginBottom: 10,
                  padding: "10px 12px",
                  borderRadius: 14,
                  border: "1px solid rgba(212,175,55,0.28)",
                  background: "rgba(212,175,55,0.10)",
                  color: "#fef3c7",
                }}
              >
                <div style={{ fontWeight: 950, fontSize: 13, letterSpacing: 0.4 }}>
                  System & Moderation
                </div>
                <div style={{ fontSize: 11, color: "rgba(254,243,199,0.72)", marginTop: 3 }}>
                  Review ticket lock rules and assign moderators for chat and bulletin support.
                </div>
              </div>
                <div style={styles.controlTitle}>Ticket Lock Pass</div>
                <div style={styles.helperText}>
                  Host/Admin bypasses ticket lock. Paid or ticket-only viewers must verify a ticket before joining the room. Free public rooms do not require a ticket.
                </div>
              </div>

              <div style={styles.controlBox}>
                <div style={styles.controlTitle}>Moderator Authority</div>

                <div style={styles.helperText}>
                  Moderators can clear chat and manage bulletins but cannot control the broadcast stage.
                </div>

                <input
                  style={styles.chatInput}
                  value={moderatorInput}
                  onChange={(event) => setModeratorInput(event.target.value)}
                  placeholder="Moderator name or email"
                />

                <button style={styles.secondaryButton} onClick={addModerator}>
                  Add Moderator
                </button>

                <div style={styles.helperText}>Current Moderators:</div>

                {moderators.length ? (
                  moderators.map((mod) => (
                    <div key={mod.id} style={styles.participantRow}>
                      <span>{mod.name || mod.email || "Moderator"}</span>

                      <button
                        style={styles.dangerButton}
                        onClick={() => removeModerator(mod.id)}
                      >
                        Remove
                      </button>
                    </div>
                  ))
                ) : (
                  <div style={styles.emptyText}>No moderators assigned.</div>
                )}
              </div>
            </div>
          ) : null}
        </aside>
      </main>
    </div>
  );
}

const styles = {
  appShell: { minHeight: "100vh", background: "radial-gradient(circle at top left, #172033 0%, #080b12 42%, #05070c 100%)", color: "#f8fafc", fontFamily: "Inter, Segoe UI, Arial, sans-serif" },
  header: { minHeight: 76, padding: "14px 22px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(5,8,14,0.88)", position: "sticky", top: 0, zIndex: 20, backdropFilter: "blur(14px)" },
  brandRow: { display: "flex", alignItems: "center", gap: 14 },
  logoSmall: { width: 48, height: 48, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #d4af37, #8a6d1d)", color: "#111827", fontSize: 18, fontWeight: 950 },
  title: { margin: 0, fontSize: 24, fontWeight: 900, letterSpacing: -0.4 },
  subtitle: { color: "rgba(248,250,252,0.62)", fontSize: 13, marginTop: 3 },
  headerRight: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" },
  statusPill: { padding: "9px 12px", borderRadius: 999, background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.22)", color: "#bbf7d0", fontSize: 12, maxWidth: 420 },
  roleSelect: { border: "1px solid rgba(255,255,255,0.14)", borderRadius: 999, padding: "9px 12px", background: "#0f172a", color: "#f8fafc", fontWeight: 850 },
  mainGrid: { display: "grid", gridTemplateColumns: "280px minmax(520px, 1fr) 360px", gap: 18, padding: 18, alignItems: "start" },
  viewerMainGrid: { display: "grid", gridTemplateColumns: "minmax(520px, 1fr) 360px", gap: 18, padding: 18, alignItems: "start" },
  leftPanel: { background: "rgba(15,23,42,0.72)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 22, padding: 16, position: "sticky", top: 96 },
  centerPanel: { display: "grid", gap: 16 },
  rightPanel: { background: "rgba(15,23,42,0.72)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 22, padding: 16, position: "sticky", top: 96 },
  panelTitle: { fontSize: 16, fontWeight: 950, marginBottom: 12 },
  planCardMini: { border: "1px solid rgba(212,175,55,0.25)", background: "rgba(212,175,55,0.10)", borderRadius: 18, padding: 14, marginBottom: 14 },
  planMiniTitle: { color: "#facc15", fontWeight: 950, marginBottom: 5 },
  planMiniText: { color: "#cbd5e1", fontSize: 12, lineHeight: 1.4, marginBottom: 10 },
  roomList: { display: "grid", gap: 10 },
  roomButton: { width: "100%", textAlign: "left", padding: 14, borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.05)", color: "#f8fafc", cursor: "pointer" },
  roomButtonActive: { width: "100%", textAlign: "left", padding: 14, borderRadius: 16, border: "1px solid rgba(212,175,55,0.55)", background: "rgba(212,175,55,0.14)", color: "#f8fafc", cursor: "pointer" },
  roomName: { fontSize: 15, fontWeight: 950, marginBottom: 5 },
  roomMeta: { color: "rgba(248,250,252,0.58)", fontSize: 12 },
  roomPlanMeta: { color: "#facc15", fontSize: 11, fontWeight: 950, marginTop: 7, letterSpacing: 0.5 },
  identityCard: { padding: 18, borderRadius: 22, background: "linear-gradient(180deg, rgba(19,27,45,0.92), rgba(10,14,24,0.86))", border: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" },
  roomHeadline: { fontSize: 24, fontWeight: 900, marginBottom: 5 },
  identityLine: { color: "rgba(248,250,252,0.62)", fontSize: 13, marginTop: 4 },
  identityChips: { display: "flex", gap: 8, flexWrap: "wrap" },
  chip: { padding: "8px 11px", borderRadius: 999, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.09)", fontSize: 12, fontWeight: 800 },
  ticketGate: { borderRadius: 24, padding: 22, background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.28)", display: "grid", gap: 12 },
  ticketBadge: { color: "#facc15", fontWeight: 950, letterSpacing: 2, fontSize: 12 },
  ticketTitle: { margin: 0, fontSize: 26, fontWeight: 950 },
  ticketText: { margin: 0, color: "#cbd5e1" },
  ticketInput: { borderRadius: 15, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.08)", color: "#f8fafc", padding: "13px 14px", fontSize: 16, fontWeight: 850 },
  ticketMessage: { color: "#fde68a", fontWeight: 850 },
  stageShell: { borderRadius: 28, padding: 18, background: "linear-gradient(180deg, rgba(30,17,12,0.96), rgba(9,8,12,0.95))", border: "1px solid rgba(212,175,55,0.28)", boxShadow: "0 30px 90px rgba(0,0,0,0.35)" },
  stageTop: { textAlign: "center", color: "#facc15", fontWeight: 950, letterSpacing: 4, fontSize: 13, marginBottom: 14 },
  stageViewport: { aspectRatio: "16 / 9", borderRadius: 22, overflow: "hidden", background: "linear-gradient(135deg, #020617, #111827)", border: "1px solid rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center" },
  stagePlaceholder: { height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", textAlign: "center", padding: 30 },
  stageBadge: { width: 86, height: 86, borderRadius: 26, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #d4af37, #854d0e)", color: "#111827", fontWeight: 950, fontSize: 28, marginBottom: 18 },
  stagePlaceholderTitle: { fontSize: 28, fontWeight: 950, marginBottom: 8 },
  stagePlaceholderText: { maxWidth: 620, color: "rgba(248,250,252,0.66)", lineHeight: 1.6 },
  stageControls: { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14, alignItems: "center" },
  bottomGrid: { display: "grid", gridTemplateColumns: "0.8fr 1.2fr", gap: 16 },
  card: { background: "rgba(15,23,42,0.72)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 22, padding: 16 },
  tabRow: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 },
  tab: { border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 10, background: "rgba(255,255,255,0.05)", color: "#f8fafc", fontWeight: 850, cursor: "pointer" },
  tabActive: { border: "1px solid rgba(212,175,55,0.48)", borderRadius: 14, padding: 10, background: "rgba(212,175,55,0.16)", color: "#facc15", fontWeight: 950, cursor: "pointer" },
  primaryButton: { border: 0, borderRadius: 15, padding: "12px 14px", background: "linear-gradient(135deg, #d4af37, #8a6d1d)", color: "#111827", fontWeight: 950, cursor: "pointer" },
  secondaryButton: { border: "1px solid rgba(255,255,255,0.14)", borderRadius: 15, padding: "12px 14px", background: "rgba(255,255,255,0.08)", color: "#f8fafc", fontWeight: 850, cursor: "pointer" },
  secondaryButtonFull: { width: "100%", marginTop: 10, border: "1px solid rgba(255,255,255,0.14)", borderRadius: 15, padding: "12px 14px", background: "rgba(255,255,255,0.08)", color: "#f8fafc", fontWeight: 850, cursor: "pointer" },
  activeButton: { border: "1px solid rgba(34,197,94,0.42)", borderRadius: 15, padding: "12px 14px", background: "rgba(34,197,94,0.18)", color: "#bbf7d0", fontWeight: 950, cursor: "pointer" },
  lockedButton: { border: "1px solid rgba(148,163,184,0.22)", borderRadius: 15, padding: "12px 14px", background: "rgba(148,163,184,0.10)", color: "#94a3b8", fontWeight: 950, cursor: "not-allowed" },
  dangerButton: { border: "1px solid rgba(239,68,68,0.35)", borderRadius: 999, padding: "9px 12px", background: "rgba(239,68,68,0.12)", color: "#fecaca", fontWeight: 850, cursor: "pointer" },
  controlBox: { marginTop: 14, display: "grid", gap: 10, padding: 14, borderRadius: 18, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" },
  controlTitle: { fontWeight: 950, color: "#facc15" },
  helperText: { color: "rgba(248,250,252,0.62)", fontSize: 13, lineHeight: 1.5 },
  ownerSyncBox: { marginTop: 10, padding: 12, borderRadius: 16, background: "rgba(212,175,55,0.10)", border: "1px solid rgba(212,175,55,0.20)" },
  ownerSyncTitle: { color: "#facc15", fontWeight: 950, marginBottom: 4 },
  eventOwnerCard: { marginTop: 8, padding: 12, borderRadius: 16, background: "rgba(59,130,246,0.10)", border: "1px solid rgba(59,130,246,0.18)" },
  eventOwnerTitle: { color: "#bfdbfe", fontWeight: 950, marginBottom: 4 },
  viewerLockBox: { marginTop: 12, padding: 14, borderRadius: 18, background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.22)", color: "#dbeafe", fontSize: 13, lineHeight: 1.5 },
  participantRow: { display: "flex", justifyContent: "space-between", gap: 10, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", color: "#cbd5e1" },
  bulletinList: { display: "grid", gap: 8, maxHeight: 150, overflow: "auto", marginBottom: 12 },
  bulletinListTall: { display: "grid", gap: 8, maxHeight: 460, overflow: "auto" },
  bulletinItem: { padding: 10, borderRadius: 14, background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.18)", color: "#fde68a", fontSize: 13, lineHeight: 1.4 },
  textarea: { width: "100%", minHeight: 80, resize: "vertical", boxSizing: "border-box", borderRadius: 14, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.07)", color: "#f8fafc", padding: 12, marginBottom: 10 },
  chatList: { display: "grid", gap: 10, minHeight: 340, maxHeight: 420, overflow: "auto", marginBottom: 12 },
  chatMessage: { padding: 11, borderRadius: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.07)", color: "#e5e7eb", fontSize: 14, lineHeight: 1.4 },
  chatMeta: { color: "#94a3b8", fontSize: 12, marginBottom: 5, fontWeight: 850 },
  chatComposer: { display: "grid", gridTemplateColumns: "1fr auto", gap: 8 },
  chatInput: { borderRadius: 14, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.07)", color: "#f8fafc", padding: "12px 13px", outline: "none" },
  emptyText: { color: "rgba(248,250,252,0.52)", fontSize: 13, padding: 10 },
};

// PASS_CLEAN_SCALE1_HIDE_ENGINEERING_BROADCAST_CONTROLS
// CLIENT — Hide engineering broadcast controls from the visible AGV host panel.
// Keeps product controls visible: Go Live to Cloudflare, End Cloudflare Broadcast,
// screenshot controls, play/camera/screen-share controls, and Google Drive.
if (typeof window !== "undefined" && !window.__AGV_CLEAN_SCALE1_HIDE_ENGINEERING_CONTROLS__) {
  window.__AGV_CLEAN_SCALE1_HIDE_ENGINEERING_CONTROLS__ = true;

  const agvEngineeringButtonLabels = new Set([
    "Scale Status",
    "Checking Scale Status...",
    "Verify Playback",
    "Verifying Playback...",
    "Bridge Health",
    "Checking Bridge...",
    "Start LiveKit Bridge",
    "Starting Bridge...",
    "Stop LiveKit Bridge",
    "Stopping Bridge...",
    "Bridge Egress Status",
    "Checking Egress...",
    "Debug Playback",
    "Debugging Playback...",
    "Exchange Status",
    "Checking Exchange...",
    "Start Scale Broadcast",
    "Starting Scale Broadcast...",
    "Stop Scale Broadcast",
    "Stopping Scale Broadcast..."
  ]);

  const agvShouldHideEngineeringControl = (element) => {
    const text = (element?.textContent || "").replace(/\s+/g, " ").trim();
    return agvEngineeringButtonLabels.has(text);
  };

  const agvHideEngineeringControls = () => {
    try {
      const controls = document.querySelectorAll("button, a");
      controls.forEach((control) => {
        if (agvShouldHideEngineeringControl(control)) {
          control.style.display = "none";
          control.setAttribute("data-agv-hidden-engineering-control", "true");
          control.setAttribute("aria-hidden", "true");
          control.setAttribute("tabindex", "-1");
        }
      });
    } catch {}
  };

  const agvStartEngineeringControlCleaner = () => {
    agvHideEngineeringControls();

    try {
      const observer = new MutationObserver(() => agvHideEngineeringControls());
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        characterData: true
      });
      window.__AGV_CLEAN_SCALE1_OBSERVER__ = observer;
    } catch {}

    setTimeout(agvHideEngineeringControls, 250);
    setTimeout(agvHideEngineeringControls, 1000);
    setTimeout(agvHideEngineeringControls, 2500);
  };

  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", agvStartEngineeringControlCleaner, { once: true });
  } else {
    agvStartEngineeringControlCleaner();
  }
}

