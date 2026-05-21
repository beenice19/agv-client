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

const SUBSCRIPTION_API_BASE =
  import.meta.env.VITE_AGV_SUBSCRIPTION_API_URL || "http://127.0.0.1:8792";

const TICKET_API_BASE =
  import.meta.env.VITE_AGV_TICKET_API_URL ||
  "https://agv-ticket-server-clean.onrender.com";

const TICKET_STORAGE_KEY = "agv_ticket_code";

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

  const [events, setEvents] = useState([]);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [eventPrice, setEventPrice] = useState("");

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
  const isSuperAdmin =
    isHost &&
    localStorage.getItem("agv_host_pin_verified") === "true" &&
    !isAccountHost;

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
  const viewerNeedsTicket = isViewerOnly && currentPlan !== "FREE" && !ticketApproved;

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

    try {
      const response = await fetch(
        `${MODERATOR_API_BASE}/api/moderators/${encodeURIComponent(selectedRoomId)}/remove`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ moderatorId }),
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

  function showStageElement(element) {
    if (!stageRef.current || !element) return;

    element.style.width = "100%";
    element.style.height = "100%";
    element.style.objectFit = "contain";
    element.style.background = "#020617";

    stageRef.current.innerHTML = "";
    stageRef.current.appendChild(element);
  }

  async function connectToRoom(nextRole = roleMode, roomId = selectedRoomId) {
    if (nextRole === "viewer" && !ticketApproved) {
      setStatus(currentPlan === "FREE" ? "Free viewer access allowed." : "Ticket required before viewer can join the room.");
      setTicketMessage(currentPlan === "FREE" ? "Free viewer access is unlocked." : "Enter a valid ticket code to unlock viewer access.");
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
        showStageElement(published.videoTrack.attach());
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

      await publishAgvScreenShare(room);
      setScreenOn(true);
      setStatus("Screen share is live");
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

  async function joinAsViewer() {
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

  function copyInviteLink() {
    const base = window.location.origin || "http://127.0.0.1:5175";
    const invite = `${base}/?room=${encodeURIComponent(selectedRoomId)}`;

    navigator.clipboard
      ?.writeText(invite)
      .then(() => setStatus(`Invite copied for ${selectedRoom?.name}`))
      .catch(() => alert(invite));
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

      {!isViewerOnly ? (
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

            <div style={styles.roomList}>
              {rooms.map((room) => (
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

                <button style={styles.secondaryButton} onClick={() => connectToRoom("host", selectedRoomId)}>
                  Connect Host
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
              <div style={styles.panelTitle}>Control Center</div>

              <div style={styles.controlBox}>
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
                <button style={styles.secondaryButton} onClick={syncPlanFromSubscriptionServer}>
                  Refresh Plan From AGV subscription service
                </button>
              </div>

              <div style={styles.controlBox}>
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

              <button style={styles.primaryButton} onClick={copyInviteLink}>
                Copy Room Invite
              </button>

              <button style={styles.secondaryButton} onClick={() => window.open("https://drive.google.com", "_blank")}>
                Open Google Drive
              </button>

              <div style={styles.controlBox}>
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