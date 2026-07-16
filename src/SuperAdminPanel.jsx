import React, { useEffect, useState } from "react";

const ROOM_STORAGE_KEY = "agv_super_admin_rooms";
const NETWORK_STATION_STORAGE_KEY = "agv_network_stations";
const SUPER_ADMIN_PIN = "AGV-HOST-2026";

const SUBSCRIPTION_API_BASE =
  import.meta.env.VITE_AGV_SUBSCRIPTION_API_URL || "http://127.0.0.1:8792";

const BILLING_API_BASE =
  import.meta.env.VITE_AGV_BILLING_API_URL || "http://127.0.0.1:8793";

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
    videoId: "",
    thumbnail: "",
    description: "",
    attribution: "",
    fallbackVideoId: "",
    rightsStatus: "PENDING_REVIEW",
    healthStatus: "UNKNOWN",
  });

  const [editingNetworkStationId, setEditingNetworkStationId] = useState("");
  const [networkMessage, setNetworkMessage] = useState(
    "AGV Network stations are controlled separately from host rooms."
  );
  const [networkSyncing, setNetworkSyncing] = useState(false);
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
      videoId: "",
      thumbnail: "",
      description: "",
      attribution: "",
      fallbackVideoId: "",
      rightsStatus: "PENDING_REVIEW",
      healthStatus: "UNKNOWN",
    });
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

    const hasPlayableSource =
      (sourceType === "YOUTUBE" && Boolean(videoId)) ||
      (sourceType === "DIRECT_MP4" && Boolean(sourceUrl)) ||
      (sourceType === "IFRAME" && Boolean(embedUrl || sourceUrl)) ||
      (sourceType === "HLS" && Boolean(sourceUrl)) ||
      (sourceType === "DASH" && Boolean(sourceUrl));

    if (!title || !id || !hasPlayableSource) {
      setNetworkMessage(
        "Station title, station ID, and a valid source for the selected source type are required."
      );
      return;
    }

    const duplicate = networkStations.some(
      (station) =>
        station.id === id && station.id !== editingNetworkStationId
    );

    if (duplicate) {
      setNetworkMessage("A station with that ID already exists.");
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
      thumbnail: String(networkForm.thumbnail || "").trim(),
      description: String(networkForm.description || "").trim(),
      attribution: String(networkForm.attribution || "").trim(),
      fallbackVideoId: String(networkForm.fallbackVideoId || "").trim(),
      enabled: existing ? existing.enabled !== false : true,
      rightsStatus:
        String(networkForm.rightsStatus || "").trim() || "PENDING_REVIEW",
      healthStatus:
        String(networkForm.healthStatus || "").trim() || "UNKNOWN",
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
      videoId: station.videoId || "",
      thumbnail: station.thumbnail || "",
      description: station.description || "",
      attribution: station.attribution || "",
      fallbackVideoId: station.fallbackVideoId || "",
      rightsStatus: station.rightsStatus || "PENDING_REVIEW",
      healthStatus: station.healthStatus || "UNKNOWN",
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
              sessionStorage.setItem("agv_super_admin_test_plan", nextTestPlan); sessionStorage.removeItem("agv_owner_test_plan");
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

      <section style={styles.planCard}>
        <div>
          <div style={styles.planBadge}>{limits.label || subscriptionPlan} Plan</div>
          <h2 style={styles.planTitle}>AGV SaaS Usage</h2>
          <p style={styles.planText}>{limits.note || "Subscription authority active."}</p>
          <p style={styles.planText}>
            Account: {account.name || "Not synced"} â€¢ {account.email || "No email"} â€¢{" "}
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
      <section style={{ ...styles.cardWide, marginBottom: 18 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            alignItems: "start",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 style={{ marginTop: 0 }}>AGV Network Station Control</h2>
            <p style={styles.meta}>
              Platform-owned 24/7 stations. These remain separate from host
              rooms and do not count against subscription room limits.
            </p>
          </div>

          <button
            style={styles.secondaryButton}
            onClick={() =>
              window.open("/agv-network-earth-view.html", "_blank", "noopener")
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
            <span style={styles.label}>Schedule</span>
            <input
              style={styles.input}
              value={networkForm.schedule}
              onChange={(event) =>
                setNetworkForm((current) => ({
                  ...current,
                  schedule: event.target.value,
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
                <div style={styles.meta}>
                  Health: {station.healthStatus || "UNKNOWN"}
                </div>
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
                AGV Flags: {room.isPrivate ? "Private" : "Public"} Â·{" "}
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

