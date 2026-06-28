import React, { useEffect, useMemo, useState } from "react";
import AppCore from "./AppCore.jsx";
import { createAgvLiveKitRoom, disconnectAgvLiveKitRoom } from "./agvLiveKitBridge.js";
import SuperAdminPanel from "./SuperAdminPanel.jsx";

// PASS34D_CLIENT_CONFIG_CLEANUP
const TICKET_API_BASE =
  import.meta.env.VITE_AGV_TICKET_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "https://agv-server.onrender.com";
const TEMP_LOCAL_HOST_PIN = "AGV-HOST-2026";

const SUBSCRIPTION_API_BASE =
  import.meta.env.VITE_AGV_SUBSCRIPTION_API_URL ||
  "https://agv-subscription-server.onrender.com";

const BILLING_API_BASE =
  import.meta.env.VITE_AGV_BILLING_API_URL ||
  "https://agv-billing-server.onrender.com";

const EVENT_API_BASE =
  import.meta.env.VITE_AGV_EVENT_API_URL ||
  "https://agv-event-server.onrender.com";
// PASS_CLIENT_BROADCAST_PACK_STRIPE_BUTTONS_2
// CLIENT — Broadcast Credit Pack checkout API base.
// Set VITE_AGV_USAGE_API_URL in production to the deployed Broadcast Credits server.
const USAGE_API_BASE =
  import.meta.env.VITE_AGV_USAGE_API_URL ||
  import.meta.env.VITE_AGV_WALLET_API_URL ||
  "http://127.0.0.1:8794";

const PLAN_LIMITS = {
  FREE: {
    label: "Free",
    price: "$0",
    rooms: 1,
    viewers: 25,
    privateRooms: "No",
    ticketOnly: "No",
    description: "Starter access for trying AGV with one public room.",
  },
  CREATOR: {
    label: "Creator",
    price: "$29/mo",
    rooms: 3,
    viewers: 100,
    privateRooms: "Yes",
    ticketOnly: "Yes",
    description: "Creator-level access for podcasters, teachers, coaches, and small events.",
  },
  MINISTRY: {
    label: "Ministry / Pro",
    price: "$99/mo",
    rooms: 10,
    viewers: 500,
    privateRooms: "Yes",
    ticketOnly: "Yes",
    description: "Expanded access for churches, ministries, schools, and conferences.",
  },
  CONVENTION: {
    label: "Convention",
    price: "$299/mo",
    rooms: 50,
    viewers: 2000,
    privateRooms: "Yes",
    ticketOnly: "Yes",
    description: "Large digital venue access for conventions and major productions.",
  },
  INTERNAL_TEST: {
    label: "Internal Test",
    price: "$1/mo",
    rooms: 3,
    viewers: 100,
    privateRooms: "Yes",
    ticketOnly: "Yes",
    description: "Internal AGV billing test plan. Hidden from public pricing.",
  },
};

const DEFAULT_TICKET_ROOMS = [
  {
    id: "main-hall",
    name: "Main Hall",
    source: "Default Room",
  },
];

function readBillingFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    return {
      status: params.get("billing") || "",
      plan: (params.get("plan") || "").toUpperCase(),
    };
  } catch {
    return { status: "", plan: "" };
  }
}

function cleanPublicPlan(plan) {
  if (plan === "INTERNAL_TEST") return "CREATOR";
  return PLAN_LIMITS[plan] ? plan : "FREE";
}

function normalizeRoomId(value) {
  const clean = String(value || "").trim();

  if (!clean) return "main-hall";

  return clean.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "main-hall";
}

function cleanRoomName(value, fallback = "Main Hall") {
  const clean = String(value || "").trim();
  return clean || fallback;
}

function uniqueRooms(roomList) {
  const map = new Map();

  roomList.forEach((room) => {
    const id = normalizeRoomId(room.id || room.roomId || room.livekitRoom || room.name);
    const name = cleanRoomName(room.name || room.title || room.roomName || id, id);

    if (!map.has(id)) {
      map.set(id, {
        id,
        name,
        source: room.source || "Room",
      });
    }
  });

  return Array.from(map.values());
}

function getStoredAccount() {
  try {
    const freeAccount = JSON.parse(localStorage.getItem("agv_free_account") || "null");

    if (freeAccount?.email) {
      return {
        name: freeAccount.name || "",
        email: String(freeAccount.email || "").trim().toLowerCase(),
        organization: freeAccount.organization || "",
        plan: cleanPublicPlan(freeAccount.plan || localStorage.getItem("agv_current_plan") || "FREE"),
      };
    }
  } catch {}

  try {
    const account = JSON.parse(localStorage.getItem("agv_account") || "null");

    if (account?.email) {
      return {
        name: account.name || "",
        email: String(account.email || "").trim().toLowerCase(),
        organization: account.organization || "",
        plan: cleanPublicPlan(account.plan || localStorage.getItem("agv_current_plan") || "FREE"),
      };
    }
  } catch {}

  return {
    name: "",
    email: "",
    organization: "",
    plan: cleanPublicPlan(localStorage.getItem("agv_current_plan") || "FREE"),
  };
}

function saveStoredAccount(account) {
  if (!account) return;

  const cleanAccount = {
    name: account.name || "",
    email: String(account.email || "").trim().toLowerCase(),
    organization: account.organization || "",
    plan: cleanPublicPlan(account.plan || "FREE"),
    updatedAt: account.updatedAt || new Date().toISOString(),
  };

  localStorage.setItem("agv_account", JSON.stringify(cleanAccount));

  if (cleanAccount.email) {
    const existingFree = (() => {
      try {
        return JSON.parse(localStorage.getItem("agv_free_account") || "null") || {};
      } catch {
        return {};
      }
    })();

    localStorage.setItem(
      "agv_free_account",
      JSON.stringify({
        ...existingFree,
        name: cleanAccount.name || existingFree.name || "",
        email: cleanAccount.email,
        organization: cleanAccount.organization || existingFree.organization || "",
        plan: cleanAccount.plan,
        ownerId: cleanAccount.email,
        updatedAt: cleanAccount.updatedAt,
        createdAt: existingFree.createdAt || new Date().toISOString(),
      })
    );
  }
}

function normalizeTicketResponse(data) {
  if (!data) return [];

  if (Array.isArray(data)) return data;
  if (Array.isArray(data.tickets)) return data.tickets;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.data)) return data.data;

  return [];
}

export default function App() {
  // PASS_BCAST6_AGV_BROADCAST_LAYOUT_PAGE
  // Hidden broadcast layout URL:
  // https://agv-client.vercel.app/?agvBroadcastLayout=1&roomId=main-hall
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("agvBroadcastLayout") === "1") {
      return <AgvBroadcastLayoutPage />;
    }
  } catch {}
  const [entryMode, setEntryMode] = useState("");
  const [directViewerEntry, setDirectViewerEntry] = useState(false);
  const [ticketApproved, setTicketApproved] = useState(false);
  const [showTicketAdmin, setShowTicketAdmin] = useState(false);
  const [showSuperAdmin, setShowSuperAdmin] = useState(false);

  const [billingReturn, setBillingReturn] = useState(() => readBillingFromUrl());
  const [account, setAccount] = useState(() => getStoredAccount());

  const [currentPlan, setCurrentPlan] = useState(() => {
    const billing = readBillingFromUrl();
    return cleanPublicPlan(billing.plan || localStorage.getItem("agv_current_plan") || getStoredAccount().plan || "FREE");
  });

  const [planMessage, setPlanMessage] = useState("Checking AGV plan status...");
  const [planLoaded, setPlanLoaded] = useState(false);

  useEffect(() => {
    syncPlanAfterStripeReturn();
  }, []);

  async function upsertAccountToServer(accountData, planOverride, markLogin = false) {
    const cleanAccount = {
      name: accountData?.name || "",
      email: String(accountData?.email || "").trim().toLowerCase(),
      organization: accountData?.organization || "",
      plan: cleanPublicPlan(planOverride || accountData?.plan || currentPlan || "FREE"),
    };

    if (!cleanAccount.email) {
      return null;
    }

    const response = await fetch(`${SUBSCRIPTION_API_BASE}/api/account/upsert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: cleanAccount.name,
        email: cleanAccount.email,
        organization: cleanAccount.organization,
        role: "owner",
        plan: cleanAccount.plan,
        markLogin,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data?.ok) {
      throw new Error(data?.error || "Account sync failed.");
    }

    const returnedAccount = data.account || cleanAccount;
    const syncedAccount = {
      name: returnedAccount.name || cleanAccount.name,
      email: returnedAccount.email || cleanAccount.email,
      organization: returnedAccount.organization || cleanAccount.organization,
      plan: cleanPublicPlan(returnedAccount.plan || cleanAccount.plan),
      updatedAt: returnedAccount.updatedAt || new Date().toISOString(),
    };

    setAccount(syncedAccount);
    saveStoredAccount(syncedAccount);

    if (syncedAccount.plan) {
      setCurrentPlan(cleanPublicPlan(syncedAccount.plan));
      localStorage.setItem("agv_current_plan", cleanPublicPlan(syncedAccount.plan));
    }

    return syncedAccount;
  }

  async function syncPlanAfterStripeReturn() {
    const billing = readBillingFromUrl();
    const returnedPlan = cleanPublicPlan(billing.plan);
    const storedAccount = getStoredAccount();

    if (billing.status === "success") {
      localStorage.setItem("agv_payment_success", "true");
      localStorage.setItem("agv_last_checkout_plan", billing.plan || returnedPlan);
      localStorage.setItem("agv_current_plan", returnedPlan);

      const upgradedAccount = {
        ...storedAccount,
        plan: returnedPlan,
      };

      setCurrentPlan(returnedPlan);
      setBillingReturn(billing);
      setAccount(upgradedAccount);
      saveStoredAccount(upgradedAccount);

      try {
        await fetch(`${SUBSCRIPTION_API_BASE}/api/subscription/plan`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: returnedPlan }),
        });

        if (upgradedAccount.email) {
          await upsertAccountToServer(upgradedAccount, returnedPlan, true);
          setPlanMessage(
            `Payment successful. Your AGV ${PLAN_LIMITS[returnedPlan]?.label || returnedPlan} plan is active and your account is synced.`
          );
        } else {
          setPlanMessage(
            `Payment successful. Your AGV ${PLAN_LIMITS[returnedPlan]?.label || returnedPlan} plan is active. Add account details through free signup to complete account sync.`
          );
        }
      } catch {
        setPlanMessage(
          `Payment successful. AGV saved your ${PLAN_LIMITS[returnedPlan]?.label || returnedPlan} plan locally, but AGV subscription service account sync could not be reached.`
        );
      }

      setPlanLoaded(true);
      return;
    }

    if (billing.status === "cancelled") {
      setBillingReturn(billing);
      setPlanMessage("Checkout was cancelled. No plan change was made.");
      setPlanLoaded(true);
      return;
    }

    try {
      const response = await fetch(`${SUBSCRIPTION_API_BASE}/api/subscription`);
      const data = await response.json();

      if (response.ok && data?.ok) {
        const serverPlan = cleanPublicPlan(data.plan || "FREE");

        setCurrentPlan(serverPlan);
        localStorage.setItem("agv_current_plan", serverPlan);

        if (data.account?.email) {
          const serverAccount = {
            name: data.account.name || "",
            email: data.account.email || "",
            organization: data.account.organization || "",
            plan: cleanPublicPlan(data.account.plan || serverPlan),
            updatedAt: data.account.updatedAt || new Date().toISOString(),
          };

          setAccount(serverAccount);
          saveStoredAccount(serverAccount);

          setPlanMessage(
            `Current AGV plan loaded from AGV subscription service: ${PLAN_LIMITS[serverPlan]?.label || serverPlan}. Account synced for ${serverAccount.email}.`
          );
        } else {
          const localAccount = getStoredAccount();

          if (localAccount.email) {
            try {
              await upsertAccountToServer(localAccount, serverPlan, true);
              setPlanMessage(
                `Current AGV plan loaded from AGV subscription service: ${PLAN_LIMITS[serverPlan]?.label || serverPlan}. Local account synced.`
              );
            } catch {
              setPlanMessage(
                `Current AGV plan loaded from AGV subscription service: ${PLAN_LIMITS[serverPlan]?.label || serverPlan}. Account fields are not synced yet.`
              );
            }
          } else {
            setPlanMessage(
              `Current AGV plan loaded from AGV subscription service: ${PLAN_LIMITS[serverPlan]?.label || serverPlan}. Account fields are not synced yet.`
            );
          }
        }
      } else {
        const localPlan = cleanPublicPlan(localStorage.getItem("agv_current_plan") || "FREE");
        setCurrentPlan(localPlan);
        setPlanMessage(`Using local AGV plan status: ${PLAN_LIMITS[localPlan]?.label || localPlan}.`);
      }
    } catch {
      const localPlan = cleanPublicPlan(localStorage.getItem("agv_current_plan") || "FREE");
      setCurrentPlan(localPlan);
      setPlanMessage(`AGV subscription service is offline. Using saved AGV plan status: ${PLAN_LIMITS[localPlan]?.label || localPlan}.`);
    }

    setPlanLoaded(true);
  }

  function clearBillingMessage() {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("billing");
      url.searchParams.delete("plan");
      window.history.replaceState({}, "", url.toString());
    } catch {}

    setBillingReturn({ status: "", plan: "" });
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roleParam = String(params.get("role") || params.get("mode") || "").trim().toLowerCase();
    const roomParam = params.get("room") || params.get("roomId") || params.get("r");

    const isViewerLink =
      roleParam === "viewer" ||
      roleParam === "watch" ||
      roleParam === "audience";

    if (!isViewerLink) return;

    const targetRoomId = normalizeRoomId(
      roomParam ||
        localStorage.getItem("agv_ticket_room_id") ||
        "main-hall"
    );

    localStorage.setItem("agv_ticket_code", "DIRECT-VIEWER-LINK");
    localStorage.setItem("agv_ticket_room_id", targetRoomId);
    localStorage.setItem("agv_ticket_event_name", "AGV Public Room");
    localStorage.setItem("agv_direct_viewer_link", "true");

    setTicketApproved(true);
    setDirectViewerEntry(true);
    setEntryMode("viewer");
  }, []);

  if (showSuperAdmin) {
    return <SuperAdminPanel onBack={() => setShowSuperAdmin(false)} />;
  }

  if (showTicketAdmin) {
    return <TicketAdminPanel onBack={() => setShowTicketAdmin(false)} />;
  }

  if (entryMode === "free-signup") {
    return (
      <FreeSignupGate
        currentPlan={currentPlan}
        onBack={() => setEntryMode("")}
        onApproved={(newAccount) => {
          const syncedAccount = {
            ...newAccount,
            plan: cleanPublicPlan(newAccount?.plan || "FREE"),
          };

          setAccount(syncedAccount);
          setCurrentPlan(syncedAccount.plan);
          localStorage.setItem("agv_current_plan", syncedAccount.plan);
          saveStoredAccount(syncedAccount);
          setEntryMode("host-approved");
        }}
      />
    );
  }

  if (entryMode === "host") {
    return (
      <HostPinGate
        account={account}
        onApproved={async () => {
          const storedAccount = getStoredAccount();

          if (storedAccount.email) {
            try {
              await upsertAccountToServer(storedAccount, currentPlan, true);
            } catch {}
          }

          setEntryMode("host-approved");
        }}
        onBack={() => setEntryMode("")}
      />
    );
  }

  if (entryMode === "host-approved") {
    return <AppCore entryRole="host" />;
  }

  if (entryMode === "viewer" && !ticketApproved && currentPlan !== "FREE" && !directViewerEntry) {
    return (
      <TicketGate
        onBack={() => setEntryMode("")}
        onApproved={() => setTicketApproved(true)}
      />
    );
  }

  if (entryMode === "viewer" && (ticketApproved || currentPlan === "FREE" || directViewerEntry)) {
    return <AppCore entryRole="viewer" />;
  }

  const isAgvOwnerRequest = (() => {
    try {
      const params = new URLSearchParams(window.location.search);

      return (
        window.location.pathname === "/agv-owner" ||
        window.location.pathname === "/agv-owner.html" ||
        params.get("agvOwner") === "1" ||
        window.location.hash === "#agv-owner"
      );
    } catch {
      return false;
    }
  })();

  if (isAgvOwnerRequest) {
    return (
      <AgvOwnerAccessPage
        onPublicHome={() => {
          try {
            window.location.href = "/";
          } catch {
            setShowTicketAdmin(false);
            setShowSuperAdmin(false);
            setEntryMode("");
          }
        }}
        onSuperAdmin={() => {
          setShowTicketAdmin(false);
          setShowSuperAdmin(true);
        }}
        onTicketAdmin={() => {
          setShowSuperAdmin(false);
          setShowTicketAdmin(true);
        }}
        onHostEnter={() => {
          setShowTicketAdmin(false);
          setShowSuperAdmin(false);
          setEntryMode("host");
        }}
      />
    );
  }

  return (
    <AgvLandingPage
      currentPlan={currentPlan}
      account={account}
      planMessage={planMessage}
      planLoaded={planLoaded}
      billingReturn={billingReturn}
      onClearBillingMessage={clearBillingMessage}
      onFreeStart={() => setEntryMode("free-signup")}
      onHostEnter={() => {
        // PASS_CLIENT_HOST_LOGIN_BYPASS_FIX_1
        // CLIENT - Always show the Host/Admin login gate before entering the platform.
        // Forgot Host Password belongs on that login gate, not on the live stage.
        setEntryMode("host");
      }}
      onViewerEnter={() => {
        if (currentPlan === "FREE") {
          localStorage.setItem("agv_ticket_code", "FREE-ROOM");
          localStorage.setItem("agv_ticket_room_id", "main-hall");
          localStorage.setItem("agv_ticket_event_name", "Free AGV Room");
          setTicketApproved(true);
        }
        setEntryMode("viewer");
      }}
      onAdmin={() => setShowTicketAdmin(true)}
      onSuperAdmin={() => setShowSuperAdmin(true)}
    />
  );
}

function FreeSignupGate({ currentPlan, onApproved, onBack }) {
  const [name, setName] = useState(() => getStoredAccount().name || "");
  const [email, setEmail] = useState(() => getStoredAccount().email || "");
  const [organization, setOrganization] = useState(() => getStoredAccount().organization || "");
  const [roomName, setRoomName] = useState("My First AGV Room");
  const [message, setMessage] = useState("");

  async function createFreeAccount() {
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanOrg = organization.trim();
    const cleanRoom = roomName.trim() || "My First AGV Room";
    const activePlan = cleanPublicPlan(currentPlan || localStorage.getItem("agv_current_plan") || "FREE");

    if (!cleanName || !cleanEmail || !cleanOrg) {
      setMessage("Enter your name, email, and organization to sync your AGV account.");
      return;
    }

    const freeRoomId = normalizeRoomId(cleanRoom);

    const account = {
      name: cleanName,
      email: cleanEmail,
      organization: cleanOrg,
      plan: activePlan,
      ownerId: cleanEmail,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const freeRoom = {
      id: freeRoomId,
      name: cleanRoom,
      category: activePlan === "FREE" ? "Free Starter" : `${PLAN_LIMITS[activePlan]?.label || activePlan} Workspace`,
      visibility: "Public",
      host: cleanName,
      ownerId: cleanEmail,
      ownerName: cleanName,
      ownerEmail: cleanEmail,
      createdByPlan: activePlan,
      plan: activePlan,
      mode: activePlan === "FREE" ? "FREE HOST" : `${PLAN_LIMITS[activePlan]?.label || activePlan} HOST`.toUpperCase(),
      status: "Live Ready",
      isPrivate: false,
      isLocked: false,
    };

    localStorage.setItem("agv_free_account", JSON.stringify(account));
    localStorage.setItem("agv_account", JSON.stringify(account));
    localStorage.setItem("agv_host_pin_verified", "true");
    localStorage.setItem("agv_free_signup_complete", "true");
    localStorage.setItem("agv_current_plan", activePlan);

    try {
      localStorage.setItem("agv_super_admin_rooms", JSON.stringify([freeRoom]));
    } catch {}

    try {
      await fetch(`${SUBSCRIPTION_API_BASE}/api/subscription/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: activePlan }),
      });

      await fetch(`${SUBSCRIPTION_API_BASE}/api/account/upsert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          organization: cleanOrg,
          role: "owner",
          plan: activePlan,
          markLogin: true,
        }),
      });

      setMessage("Account synced with AGV subscription service.");
    } catch {
      setMessage("Account saved in this browser. AGV subscription service was not reachable.");
    }

    onApproved(account);
  }

  return (
    <div style={styles.page}>
      <main style={styles.finalCta}>
        <div style={styles.badge}>AGV ACCOUNT SYNC</div>
        <h1 style={styles.ctaTitle}>Create or Sync Your AGV Account</h1>
        <p style={styles.ctaText}>
          This connects your name, email, organization, and current AGV plan to AGV subscription service.
        </p>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          style={styles.ticketInput}
        />

        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          style={styles.ticketInput}
        />

        <input
          value={organization}
          onChange={(e) => setOrganization(e.target.value)}
          placeholder="Organization, church, school, or brand"
          style={styles.ticketInput}
        />

        <input
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          placeholder="First room name"
          style={styles.ticketInput}
        />

        {message ? <p style={message.includes("SERVER") ? styles.errorText : styles.adminMessage}>{message}</p> : null}

        <div style={styles.buttonRow}>
          <button style={styles.primaryButton} onClick={createFreeAccount}>
            Sync AGV Account
          </button>

          <button style={styles.secondaryButton} onClick={onBack}>
            Back
          </button>
        </div>
      </main>
    </div>
  );
}


// PASS_BCAST6_AGV_BROADCAST_LAYOUT_PAGE
function AgvBroadcastLayoutPage() {
  const [status, setStatus] = useState("Connecting AGV broadcast layout...");
  const [screenReady, setScreenReady] = useState(false);
  const [hostReady, setHostReady] = useState(false);

  useEffect(() => {
    let activeRoom = null;
    let disposed = false;
    const attachedElements = [];

    const params = new URLSearchParams(window.location.search);
    const roomId = normalizeRoomId(params.get("roomId") || params.get("room") || "main-hall");

    function getLayer(id) {
      return document.getElementById(id);
    }

    function clearLayer(id) {
      const layer = getLayer(id);
      if (layer) layer.innerHTML = "";
    }

    function prepareVideoElement(element, mode) {
      element.autoplay = true;
      element.playsInline = true;
      element.muted = true;
      element.style.display = "block";
      element.style.background = "#000";
      element.style.objectFit = "contain";

      if (mode === "screen") {
        element.style.width = "100%";
        element.style.height = "100%";
        element.style.maxWidth = "100%";
        element.style.maxHeight = "100%";
      }

      if (mode === "host") {
        element.style.width = "100%";
        element.style.height = "100%";
        element.style.objectFit = "cover";
        element.style.borderRadius = "18px";
      }
    }

    function attachAudioTrack(track) {
      if (!track || typeof track.attach !== "function") return;

      try {
        const audio = track.attach();
        audio.autoplay = true;
        audio.hidden = true;
        audio.style.display = "none";
        document.body.appendChild(audio);
        attachedElements.push(audio);
      } catch {}
    }

    function attachVideoTrack(track, publication, participant) {
      if (!track || typeof track.attach !== "function") return;

      const trackName = String(publication?.trackName || track?.name || "").toLowerCase();
      const identity = String(participant?.identity || "").toLowerCase();
      const source = String(publication?.source || track?.source || "").toLowerCase();

      const isScreen =
        trackName.includes("screen") ||
        trackName.includes("share") ||
        source.includes("screen") ||
        source.includes("share");

      const isHost =
        trackName.includes("host") ||
        trackName.includes("camera") ||
        identity.includes("host") ||
        identity.includes("admin");

      try {
        const element = track.attach();

        if (isScreen) {
          clearLayer("agv-broadcast-screen-layer");
          prepareVideoElement(element, "screen");
          getLayer("agv-broadcast-screen-layer")?.appendChild(element);
          attachedElements.push(element);
          setScreenReady(true);
          setStatus("Screen share is full-screen.");
          return;
        }

        if (isHost) {
          clearLayer("agv-broadcast-host-layer");
          prepareVideoElement(element, "host");
          getLayer("agv-broadcast-host-layer")?.appendChild(element);
          attachedElements.push(element);
          setHostReady(true);
          return;
        }

        if (!screenReady) {
          clearLayer("agv-broadcast-screen-layer");
          prepareVideoElement(element, "screen");
          getLayer("agv-broadcast-screen-layer")?.appendChild(element);
          attachedElements.push(element);
          setScreenReady(true);
        }
      } catch {}
    }

    function handleTrack(track, publication, participant) {
      if (!track) return;

      if (track.kind === "audio") {
        attachAudioTrack(track);
        return;
      }

      if (track.kind === "video") {
        attachVideoTrack(track, publication, participant);
      }
    }

    function attachExistingTracks(room) {
      try {
        Array.from(room?.remoteParticipants?.values?.() || []).forEach((participant) => {
          Array.from(participant?.trackPublications?.values?.() || []).forEach((publication) => {
            const track = publication?.track;
            if (track) handleTrack(track, publication, participant);
          });
        });
      } catch {}
    }

    async function connectBroadcastLayout() {
      setStatus(`Connecting broadcast layout to ${roomId}...`);

      const result = await createAgvLiveKitRoom({
        roomName: roomId,
        identity: `agv-broadcast-layout-${Date.now()}`,
        name: "AGV Broadcast Layout",
        role: "viewer",
        onConnected: (room) => {
          activeRoom = room;
          setStatus(`AGV broadcast layout connected to ${roomId}.`);
          setTimeout(() => attachExistingTracks(room), 800);
          setTimeout(() => attachExistingTracks(room), 1800);
        },
        onDisconnected: () => {
          if (!disposed) setStatus("AGV broadcast layout disconnected.");
        },
        onTrackSubscribed: (track, publication, participant) => {
          handleTrack(track, publication, participant);
        },
        onParticipantConnected: () => {
          setTimeout(() => attachExistingTracks(activeRoom), 500);
        },
        onError: (error) => {
          setStatus(error?.message || "AGV broadcast layout connection failed.");
        },
      });

      if (!result?.ok) {
        setStatus(result?.error || "AGV broadcast layout could not connect.");
        return;
      }

      activeRoom = result.room;
    }

    connectBroadcastLayout();

    return () => {
      disposed = true;

      attachedElements.forEach((element) => {
        try {
          element.remove();
        } catch {}
      });

      try {
        disconnectAgvLiveKitRoom(activeRoom);
      } catch {}
    };
  }, []);

  return (
    <div style={{
      width: "100vw",
      height: "100vh",
      background: "#020617",
      color: "#f8fafc",
      overflow: "hidden",
      position: "relative",
      fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    }}>
      <div id="agv-broadcast-screen-layer" style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#000",
        overflow: "hidden"
      }}>
        {!screenReady ? (
          <div style={{
            textAlign: "center",
            padding: 40,
            maxWidth: 900
          }}>
            <div style={{
              fontSize: 16,
              letterSpacing: 4,
              color: "#f59e0b",
              fontWeight: 900,
              marginBottom: 20
            }}>
              AVANT GLOBAL VISION
            </div>
            <div style={{
              fontSize: 46,
              lineHeight: 1.05,
              fontWeight: 900,
              marginBottom: 18
            }}>
              AGV Broadcast Stage
            </div>
            <div style={{
              fontSize: 20,
              color: "#cbd5e1"
            }}>
              Waiting for screen share...
            </div>
          </div>
        ) : null}
      </div>

      <div id="agv-broadcast-host-layer" style={{
        position: "absolute",
        right: 34,
        bottom: 34,
        width: "22vw",
        minWidth: 260,
        maxWidth: 420,
        aspectRatio: "16 / 9",
        borderRadius: 22,
        overflow: "hidden",
        background: "#111827",
        border: "3px solid rgba(245, 158, 11, 0.85)",
        boxShadow: "0 24px 80px rgba(0,0,0,0.55)",
        display: hostReady ? "block" : "none"
      }} />

      <div style={{
        position: "absolute",
        left: 28,
        top: 24,
        padding: "10px 16px",
        borderRadius: 999,
        background: "rgba(2, 6, 23, 0.72)",
        border: "1px solid rgba(245, 158, 11, 0.45)",
        color: "#facc15",
        fontSize: 14,
        fontWeight: 900,
        letterSpacing: 2,
        textTransform: "uppercase"
      }}>
        AGV Live Broadcast
      </div>

      <div style={{
        position: "absolute",
        left: 28,
        bottom: 24,
        padding: "10px 14px",
        borderRadius: 14,
        background: "rgba(2, 6, 23, 0.68)",
        color: "#e5e7eb",
        fontSize: 14,
        maxWidth: "70vw"
      }}>
        {status}
      </div>
    </div>
  );
}


function HostPinGate({ onApproved, onBack }) {
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);


  // PASS_CLIENT_FORGOT_HOST_PASSWORD_LOGIN_GATE_1
  // CLIENT - Forgot Host Password UI belongs on the Host/Admin login gate.
  const [hostResetOpen, setHostResetOpen] = useState(false);
  const [hostResetEmail, setHostResetEmail] = useState(() => {
    try {
      const account =
        JSON.parse(localStorage.getItem("agv_account") || "null") ||
        JSON.parse(localStorage.getItem("agv_free_account") || "null") ||
        {};
      return String(account?.email || "").trim().toLowerCase();
    } catch {
      return "";
    }
  });
  const [hostResetCode, setHostResetCode] = useState("");
  const [hostResetNewPassword, setHostResetNewPassword] = useState("");
  const [hostResetWorking, setHostResetWorking] = useState(false);
  const [hostResetMessage, setHostResetMessage] = useState("");
  async function requestHostPasswordResetFromGate() {
    const email = String(hostResetEmail || "").trim().toLowerCase();
    if (!email) {
      setHostResetMessage("Enter the host account email first.");
      return;
    }
    setHostResetWorking(true);
    setHostResetMessage("Requesting host password reset code...");
    try {
      const response = await fetch(SUBSCRIPTION_API_BASE + "/api/account/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.ok === false) {
        throw new Error(data?.message || data?.error || "Password reset request failed.");
      }
      setHostResetEmail(email);
      setHostResetMessage(
        data?.message ||
          "Password reset code requested. Check the SERVER 8792 console or configured delivery method."
      );
    } catch (error) {
      setHostResetMessage(error?.message || "Unable to request host password reset code.");
    } finally {
      setHostResetWorking(false);
    }
  }
  async function confirmHostPasswordResetFromGate() {
    const email = String(hostResetEmail || "").trim().toLowerCase();
    const resetCode = String(hostResetCode || "").trim();
    const newPassword = String(hostResetNewPassword || "");
    if (!email || !resetCode || !newPassword) {
      setHostResetMessage("Enter email, reset code, and new password.");
      return;
    }
    if (newPassword.length < 8) {
      setHostResetMessage("New password must be at least 8 characters.");
      return;
    }
    setHostResetWorking(true);
    setHostResetMessage("Confirming host password reset...");
    try {
      const response = await fetch(SUBSCRIPTION_API_BASE + "/api/account/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, resetCode, newPassword }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.ok === false) {
        throw new Error(data?.message || data?.error || "Password reset failed.");
      }
      setHostResetCode("");
      setHostResetNewPassword("");
      setHostResetMessage(data?.message || "Password reset successful. Enter your host PIN to continue.");
    } catch (error) {
      setHostResetMessage(error?.message || "Unable to confirm host password reset.");
    } finally {
      setHostResetWorking(false);
    }
  }
  async function verifyHostPin() {
    const cleanPin = pin.trim();

    if (!cleanPin) {
      setMessage("Enter host PIN.");
      return;
    }

    if (cleanPin === TEMP_LOCAL_HOST_PIN) {
      localStorage.setItem("agv_host_pin_verified", "true");
      onApproved();
      return;
    }

    setWorking(true);
    setMessage("");

    try {
      const response = await fetch(`${TICKET_API_BASE}/api/tickets/list`, {
        method: "GET",
        headers: { "x-agv-admin-pin": cleanPin },
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setMessage(data.message || "Invalid host PIN.");
        setWorking(false);
        return;
      }

      localStorage.setItem("agv_host_pin_verified", "true");
      onApproved();
    } catch {
      setMessage("Unable to verify host PIN.");
    }

    setWorking(false);
  }

  return (
    <div style={styles.page}>
      <main style={styles.finalCta}>
        <div style={styles.badge}>AGV HOST SECURITY</div>
        <h1 style={styles.ctaTitle}>Host / Admin Access</h1>
        <p style={styles.ctaText}>
          Enter your AGV host PIN to access the admin broadcast platform.
        </p>

        <input
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="Enter Host PIN"
          type="password"
          style={styles.ticketInput}
        />

        {message ? <p style={styles.errorText}>{message}</p> : null}

        <div style={styles.buttonRow}>
          <button style={styles.primaryButton} onClick={verifyHostPin}>
            {working ? "Checking..." : "Enter Host Platform"}
          </button>
          <div
            style={{
              marginTop: 14,
              border: "1px solid rgba(212,175,55,0.26)",
              borderRadius: 20,
              padding: 14,
              background: "rgba(212,175,55,0.08)",
            }}
          >
            <button
              type="button"
              style={{
                border: "1px solid rgba(250,204,21,0.32)",
                borderRadius: 999,
                padding: "10px 14px",
                background: "rgba(250,204,21,0.12)",
                color: "#fde68a",
                fontWeight: 950,
                cursor: "pointer",
                width: "100%",
              }}
              onClick={() => setHostResetOpen((open) => !open)}
            >
              {hostResetOpen ? "Close Password Reset" : "Forgot Host Password?"}
            </button>
            {hostResetOpen ? (
              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                <div style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.55 }}>
                  Reset your host account password before entering the AGV platform.
                </div>
                <input
                  value={hostResetEmail}
                  onChange={(event) => setHostResetEmail(event.target.value)}
                  placeholder="Host account email"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.14)",
                    padding: "12px 14px",
                    background: "rgba(15,23,42,0.82)",
                    color: "#f8fafc",
                    outline: "none",
                  }}
                />
                <button
                  type="button"
                  onClick={requestHostPasswordResetFromGate}
                  disabled={hostResetWorking}
                  style={{
                    border: 0,
                    borderRadius: 999,
                    padding: "11px 14px",
                    background: "linear-gradient(135deg, #facc15, #d97706)",
                    color: "#111827",
                    fontWeight: 950,
                    cursor: hostResetWorking ? "not-allowed" : "pointer",
                    opacity: hostResetWorking ? 0.68 : 1,
                  }}
                >
                  {hostResetWorking ? "Working..." : "Request Reset Code"}
                </button>
                <input
                  value={hostResetCode}
                  onChange={(event) => setHostResetCode(event.target.value)}
                  placeholder="Reset code"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.14)",
                    padding: "12px 14px",
                    background: "rgba(15,23,42,0.82)",
                    color: "#f8fafc",
                    outline: "none",
                  }}
                />
                <input
                  type="password"
                  value={hostResetNewPassword}
                  onChange={(event) => setHostResetNewPassword(event.target.value)}
                  placeholder="New host password"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.14)",
                    padding: "12px 14px",
                    background: "rgba(15,23,42,0.82)",
                    color: "#f8fafc",
                    outline: "none",
                  }}
                />
                <button
                  type="button"
                  onClick={confirmHostPasswordResetFromGate}
                  disabled={hostResetWorking}
                  style={{
                    border: "1px solid rgba(255,255,255,0.14)",
                    borderRadius: 999,
                    padding: "11px 14px",
                    background: "rgba(255,255,255,0.08)",
                    color: "#f8fafc",
                    fontWeight: 950,
                    cursor: hostResetWorking ? "not-allowed" : "pointer",
                    opacity: hostResetWorking ? 0.68 : 1,
                  }}
                >
                  Confirm Password Reset
                </button>
                {hostResetMessage ? (
                  <div style={{ color: "#fde68a", fontSize: 13, lineHeight: 1.55 }}>
                    {hostResetMessage}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <button style={styles.secondaryButton} onClick={onBack}>
            Back
          </button>
        </div>
      </main>
    </div>
  );
}

function TicketGate({ onApproved, onBack }) {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);
  const [subscriptionPlan, setSubscriptionPlan] = useState("FREE");
  const [subscriptionLimits, setSubscriptionLimits] = useState({
    label: "Free",
    maxRooms: 1,
    maxViewers: 25,
    allowPrivate: false,
    allowTicketOnly: false,
  });
  const [subscriptionMessage, setSubscriptionMessage] = useState(
    "Subscription server not checked yet."
  );

  useEffect(() => {
    loadSubscription();
  }, []);

  async function loadSubscription() {
    try {
      const response = await fetch(`${SUBSCRIPTION_API_BASE}/api/subscription`);
      const data = await response.json();

      if (!response.ok || !data?.ok) {
        setSubscriptionMessage("Subscription server responded, but did not approve.");
        return;
      }

      setSubscriptionPlan(data.plan || "FREE");
      if (data.limits) setSubscriptionLimits(data.limits);
      setSubscriptionMessage("Viewer Gate connected to AGV subscription service.");
    } catch {
      setSubscriptionMessage("Subscription server offline. Using local fallback.");
    }
  }

  async function verifyTicket() {
    const cleanCode = code.trim().toUpperCase();

    if (!cleanCode) {
      setMessage("Enter your ticket code.");
      return;
    }

    setWorking(true);
    setMessage("");

    try {
      const response = await fetch(`${TICKET_API_BASE}/api/tickets/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: cleanCode, subscriptionPlan }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setMessage(data.message || "Ticket failed.");
        setWorking(false);
        return;
      }

      const ticketRoomId = normalizeRoomId(
        data.ticket?.roomId ||
          data.ticket?.room ||
          data.roomId ||
          "main-hall"
      );

      localStorage.setItem("agv_ticket_code", cleanCode);
      localStorage.setItem("agv_viewer_plan", subscriptionPlan);
      localStorage.setItem("agv_ticket_room_id", ticketRoomId);
      localStorage.setItem("agv_ticket_event_name", data.ticket?.eventName || "");

      try {
        const url = new URL(window.location.href);
        url.searchParams.set("room", ticketRoomId);
        window.history.replaceState({}, "", url.toString());
      } catch {}

      onApproved();
    } catch {
      setMessage("Unable to verify ticket. Please try again.");
    }

    setWorking(false);
  }

  return (
    <div style={styles.page}>
      <main style={styles.finalCta}>
        <div style={styles.badge}>AGV SUBSCRIPTION-AWARE VIEWER ACCESS</div>
        <h1 style={styles.ctaTitle}>Enter your event ticket code</h1>

        <div style={styles.subscriptionCard}>
          <div style={styles.planBadge}>
            {subscriptionLimits.label || subscriptionPlan} Plan
          </div>
          <p style={styles.adminMessage}>{subscriptionMessage}</p>
        </div>

        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Example: AGV-F2BG5J"
          style={styles.ticketInput}
        />

        {message ? <p style={styles.errorText}>{message}</p> : null}

        <div style={styles.buttonRow}>
          <button style={styles.primaryButton} onClick={verifyTicket}>
            {working ? "Checking..." : "Verify Ticket"}
          </button>

          <button style={styles.secondaryButton} onClick={onBack}>
            Back
          </button>
        </div>
      </main>
    </div>
  );
}

function TicketAdminPanel({ onBack }) {
  const [adminPin, setAdminPin] = useState(() => localStorage.getItem("agv_ticket_admin_pin") || "");
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [message, setMessage] = useState("Enter the ticket admin PIN used by the AGV ticket server.");
  const [working, setWorking] = useState(false);
  const [tickets, setTickets] = useState([]);

  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [eventName, setEventName] = useState("AGV Live Event");
  const [roomId, setRoomId] = useState("main-hall");
  const [roomOptions, setRoomOptions] = useState(DEFAULT_TICKET_ROOMS);
  const [roomMessage, setRoomMessage] = useState("Room list not synced yet.");

  useEffect(() => {
    loadTicketRooms();
  }, []);

    async function loadTicketRooms() {
    const collectedRooms = [...DEFAULT_TICKET_ROOMS];

    try {
      const savedRooms = JSON.parse(localStorage.getItem("agv_super_admin_rooms") || "[]");

      if (Array.isArray(savedRooms)) {
        savedRooms.forEach((room) => {
          const exactRoomId = normalizeRoomId(room.id || room.roomId || room.livekitRoom || room.name);
          const exactRoomName = cleanRoomName(room.name || room.roomName || room.title || exactRoomId, exactRoomId);

          collectedRooms.push({
            id: exactRoomId,
            name: exactRoomName,
            source: "Super Admin Room",
          });
        });
      }
    } catch {}

    const mergedRooms = uniqueRooms(collectedRooms);

    setRoomOptions(mergedRooms);

    if (!mergedRooms.some((room) => room.id === roomId)) {
      setRoomId(mergedRooms[0]?.id || "main-hall");
    }

    setRoomMessage(
      `Room source locked: ${mergedRooms.length} real platform room option(s) loaded from Main Hall and Super Admin rooms only.`
    );
  }

  async function loadTickets(pinOverride) {
    const cleanPin = String(pinOverride || adminPin || "").trim();

    if (!cleanPin) {
      setMessage("Enter the AGV ticket admin PIN.");
      return;
    }

    setWorking(true);
    setMessage("Checking ticket admin access...");

    try {
      const response = await fetch(`${TICKET_API_BASE}/api/tickets/list`, {
        method: "GET",
        headers: {
          "x-agv-admin-pin": cleanPin,
        },
      });

      const data = await response.json();

      if (!response.ok || !data?.ok) {
        setAdminUnlocked(false);
        setTickets([]);
        setMessage(data?.message || data?.error || "Ticket admin access denied. Check the AGV ticket admin PIN.");
        setWorking(false);
        return;
      }

      localStorage.setItem("agv_ticket_admin_pin", cleanPin);
      setAdminUnlocked(true);
      setTickets(normalizeTicketResponse(data));
      setMessage("Ticket Admin connected to the AGV ticket server.");
      await loadTicketRooms();
    } catch {
      setAdminUnlocked(false);
      setMessage("Failed to fetch ticket list. Remote ticket server could not be reached from the browser.");
    }

    setWorking(false);
  }

  async function createTicket() {
    const cleanPin = String(adminPin || "").trim();
    const cleanBuyerName = buyerName.trim();
    const cleanBuyerEmail = buyerEmail.trim().toLowerCase();
    const cleanEventName = eventName.trim() || "AGV Live Event";
    const cleanRoomId = normalizeRoomId(roomId || "main-hall");

    if (!cleanPin) {
      setMessage("Enter the AGV ticket admin PIN first.");
      return;
    }

    if (!cleanBuyerName || !cleanBuyerEmail) {
      setMessage("Enter buyer name and buyer email before creating a ticket.");
      return;
    }

    setWorking(true);
    setMessage("Creating ticket...");

    try {
      const response = await fetch(`${TICKET_API_BASE}/api/tickets/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-agv-admin-pin": cleanPin,
        },
        body: JSON.stringify({
          buyerName: cleanBuyerName,
          buyerEmail: cleanBuyerEmail,
          eventName: cleanEventName,
          roomId: cleanRoomId,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data?.ok) {
        setMessage(data?.message || data?.error || "Ticket could not be created.");
        setWorking(false);
        return;
      }

      setBuyerName("");
      setBuyerEmail("");
      setMessage(`Ticket created for ${cleanRoomId}${data.ticket?.code ? `: ${data.ticket.code}` : "."}`);

      await loadTickets(cleanPin);
    } catch {
      setMessage("Failed to fetch while creating ticket. Check the AGV ticket server and browser connection.");
    }

    setWorking(false);
  }

  function clearStoredPin() {
    localStorage.removeItem("agv_ticket_admin_pin");
    setAdminPin("");
    setAdminUnlocked(false);
    setTickets([]);
    setMessage("Stored ticket admin PIN cleared.");
  }

  return (
    <div style={styles.page}>
      <header style={styles.nav}>
        <div style={styles.brand}>
          <div style={styles.logoMark}>AGV</div>
          <div>
            <div style={styles.brandName}>Ticket Admin</div>
            <div style={styles.brandSub}>AGV ticket server control panel</div>
          </div>
        </div>

        <div style={styles.navActions}>
          <button style={styles.navButton} onClick={onBack}>
            Back to Landing
          </button>
        </div>
      </header>

      <main style={styles.shell}>
        <section style={styles.dashboardSection}>
          <div>
            <div style={styles.badgeSmall}>AGV TICKET ROOM SYNC</div>
            <h1 style={styles.sectionTitle}>Ticket Control Center</h1>
            <p style={styles.sectionText}>
              This panel now uses only Main Hall and real Super Admin rooms for ticket room assignment.
            </p>
            <p style={message.includes("denied") || message.includes("Failed") ? styles.errorText : styles.adminMessage}>
              {message}
            </p>
          </div>

          <div style={styles.accountCard}>
            <div>
              <div style={styles.accountTitle}>AGV Ticket Server</div>
              <div style={styles.accountLine}>{TICKET_API_BASE}</div>
              <div style={styles.accountLine}>
                Status: {adminUnlocked ? "Connected" : "Locked / Not verified"}
              </div>
              <div style={styles.accountLine}>
                Rooms Available: {roomOptions.length}
              </div>
            </div>

            <div style={adminUnlocked ? styles.accountBadgeGood : styles.accountBadgeWarn}>
              {adminUnlocked ? "Ticket Admin Connected" : "PIN Required"}
            </div>
          </div>
        </section>

        <section style={styles.planSection}>
          <h2 style={styles.sectionTitle}>Admin PIN</h2>
          <p style={styles.sectionText}>
            Use your AGV ticket admin PIN.
          </p>

          <input
            value={adminPin}
            onChange={(e) => setAdminPin(e.target.value)}
            placeholder="AGV ticket admin PIN"
            type="password"
            style={styles.ticketInput}
          />

          <div style={styles.buttonRow}>
            <button style={styles.primaryButton} onClick={() => loadTickets()}>
              {working ? "Working..." : "Connect / Refresh Tickets"}
            </button>

            <button style={styles.secondaryButton} onClick={loadTicketRooms}>
              Refresh Room List
            </button>

            <button style={styles.secondaryButton} onClick={clearStoredPin}>
              Clear Stored PIN
            </button>
          </div>
        </section>

        {adminUnlocked ? (
          <section style={styles.planSection}>
            <h2 style={styles.sectionTitle}>Create Ticket</h2>
            <p style={styles.sectionText}>
              Create a ticket for a buyer and assign it to any synced AGV room.
            </p>

            <div style={styles.subscriptionCard}>
              <div style={styles.planBadge}>Room Sync Active</div>
              <p style={styles.adminMessage}>{roomMessage}</p>
            </div>

            <input
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              placeholder="Buyer name"
              style={styles.ticketInput}
            />

            <input
              value={buyerEmail}
              onChange={(e) => setBuyerEmail(e.target.value)}
              placeholder="Buyer email"
              style={styles.ticketInput}
            />

            <input
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="Event name"
              style={styles.ticketInput}
            />

            <select
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              style={styles.ticketSelect}
            >
              {roomOptions.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name} — {room.id} — {room.source}
                </option>
              ))}
            </select>

            <div style={styles.buttonRow}>
              <button style={styles.primaryButton} onClick={createTicket}>
                {working ? "Working..." : "Create Ticket"}
              </button>

              <button style={styles.secondaryButton} onClick={() => loadTickets()}>
                Refresh Ticket List
              </button>
            </div>
          </section>
        ) : null}

        <section style={styles.dashboardSection}>
          <div>
            <div style={styles.badgeSmall}>TICKET LIST</div>
            <h2 style={styles.sectionTitle}>Current Tickets</h2>
            <p style={styles.sectionText}>
              {tickets.length ? `${tickets.length} ticket(s) loaded.` : "No tickets loaded yet."}
            </p>
          </div>

          <div style={styles.ticketList}>
            {tickets.length ? (
              tickets.map((ticket, index) => {
                const code = ticket.code || ticket.ticketCode || ticket.id || `ticket-${index}`;
                const buyer = ticket.buyerName || ticket.name || "Unnamed buyer";
                const email = ticket.buyerEmail || ticket.email || "No email";
                const event = ticket.eventName || ticket.event || "AGV Event";
                const room = ticket.roomId || ticket.room || "main-hall";
                const used = Boolean(ticket.used || ticket.redeemed || ticket.checkedIn);

                return (
                  <div key={`${code}-${index}`} style={styles.ticketCard}>
                    <div>
                      <div style={styles.ticketCode}>{code}</div>
                      <div style={styles.accountLine}>Buyer: {buyer}</div>
                      <div style={styles.accountLine}>Email: {email}</div>
                      <div style={styles.accountLine}>Event: {event}</div>
                      <div style={styles.accountLine}>Room: {room}</div>
                    </div>

                    <div style={used ? styles.accountBadgeWarn : styles.accountBadgeGood}>
                      {used ? "Used" : "Active"}
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={styles.subscriptionCard}>
                <p style={styles.sectionText}>
                  Enter the AGV ticket admin PIN and click Connect / Refresh Tickets.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}


function AgvOwnerAccessPage({
  onPublicHome,
  onSuperAdmin,
  onTicketAdmin,
  onHostEnter,
}) {
  function openAcademyCompanion() {
    localStorage.setItem("agv_owner_companion_access", "true");
    localStorage.setItem("agv_host_pin_verified", "true");
    localStorage.setItem("agv_owner_companion_access_at", new Date().toISOString());
    localStorage.setItem("agv_owner_companion_access", "true");
    localStorage.setItem("agv_host_pin_verified", "true");
    localStorage.setItem("agv_current_plan", "CONVENTION");
    localStorage.setItem("agv_owner_companion_access_at", new Date().toISOString());
    window.open("/agv-academy-companion.html?owner=1&admin=1&plan=CONVENTION", "_blank", "noopener,noreferrer");
  }

  
  
  return (
    <div style={styles.page}>
      <div style={styles.goldGlow}></div>
      <div style={styles.blueGlow}></div>

      <header style={styles.nav}>
        <div style={styles.brand}>
          <div style={styles.logoMark}>AGV</div>
          <div>
            <div style={styles.brandName}>AGV Owner Access</div>
            <div style={styles.brandSub}>Private business tools and ticket booth entry</div>
          </div>
        </div>

        <div style={styles.navActions}>
          <button style={styles.navButton} onClick={onPublicHome}>
            Public Home
          </button>
        </div>
      </header>

      <main style={styles.shell}>
        <section style={styles.hero}>
          <div style={styles.badge}>PRIVATE BUSINESS OWNER PAGE</div>
          <h1 style={styles.title}>Business tools are separate from the public splash page.</h1>
          <p style={styles.subtitle}>
            Use this owner access page to reach AGV business tools without exposing Super Admin
            or Ticket Admin buttons on the public customer entrance.
          </p>
        </section>

        <section style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
          marginTop: 24,
        }}>
          <div style={styles.subscriptionCard}>
            <div style={styles.badgeSmall}>OWNER ACCESS</div>
            <h2 style={styles.sectionTitle}>Super Admin / Host</h2>
            <p style={styles.sectionText}>
              Open the secured host/admin access gate for broadcast platform control.
            </p>
            <button style={styles.primaryButton} onClick={onSuperAdmin}>
              Open Super Admin
            </button>
          </div>

          <div style={styles.subscriptionCard}>
            <div style={styles.badgeSmall}>TICKET BOOTH</div>
            <h2 style={styles.sectionTitle}>Ticket Admin</h2>
            <p style={styles.sectionText}>
              Create tickets, refresh issued tickets, and manage event access from the ticket server.
            </p>
            <button style={styles.primaryButton} onClick={onTicketAdmin}>
              Open Ticket Booth
            </button>
          </div>

          <div style={styles.subscriptionCard}>
            <div style={styles.badgeSmall}>EDUCATION COMPANION</div>
            <h2 style={styles.sectionTitle}>Teacher Toolkit / Student Portal</h2>
            <p style={styles.sectionText}>
              Open AGV Academy Companion in a separate tab for courses, schedules, handouts, and replay links.
            </p>
            <button style={styles.primaryButton} onClick={openAcademyCompanion}>
              Open AGV Companion
            </button>
          </div>

          <div style={styles.subscriptionCard}>
            <div style={styles.badgeSmall}>HOST ENTRY</div>
            <h2 style={styles.sectionTitle}>Regular Host Entry</h2>
            <p style={styles.sectionText}>
              Enter the host platform through the normal host access workflow.
            </p>
            <button style={styles.secondaryButton} onClick={onHostEnter}>
              Open Host Entry
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

function AgvLandingPage({
  currentPlan,
  account,
  planMessage,
  planLoaded,
  billingReturn,
  onClearBillingMessage,
  onFreeStart,
  onHostEnter,
  onViewerEnter,
  onAdmin,
  onSuperAdmin,
}) {
  const [billingMessage, setBillingMessage] = useState("");
  // PASS_CLIENT_BROADCAST_PACK_BUTTON_FEEDBACK_2
  const [broadcastPackMessage, setBroadcastPackMessage] = useState("");

  const activePlan = PLAN_LIMITS[currentPlan] || PLAN_LIMITS.FREE;
  const accountReady = Boolean(account?.email);

  async function startCheckout(plan) {
    setBillingMessage(`Starting ${plan} checkout...`);

    try {
      const response = await fetch(`${BILLING_API_BASE}/api/billing/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      const data = await response.json();

      if (!response.ok || !data?.ok) {
        setBillingMessage(data?.error || "Stripe checkout is not ready yet.");
        return;
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch {
      setBillingMessage("Could not reach the remote billing server.");
    }
  }


  async function startBroadcastPackCheckout(packId) {
    // PASS_CLIENT_BROADCAST_PACK_PLAN_RESOLVER_2
    let publicPlan = cleanPublicPlan(
      currentPlan ||
        account?.plan ||
        localStorage.getItem("agv_current_plan") ||
        "FREE"
    );

    let customerEmail = String(account?.email || "").trim().toLowerCase();

    setBillingMessage("");
    setBroadcastPackMessage("Checking your AGV plan before checkout...");

    if (!customerEmail || publicPlan === "FREE") {
      const subscriptionBases = [SUBSCRIPTION_API_BASE];

      if (import.meta.env.DEV && !subscriptionBases.includes("http://127.0.0.1:8792")) {
        subscriptionBases.push("http://127.0.0.1:8792");
      }

      for (const base of subscriptionBases) {
        try {
          const response = await fetch(`${base}/api/subscription`);
          const data = await response.json();

          if (!response.ok || !data?.ok) continue;

          const serverPlan = cleanPublicPlan(
            data.plan ||
              data.account?.plan ||
              publicPlan
          );

          if (serverPlan && serverPlan !== "FREE") {
            publicPlan = serverPlan;
            localStorage.setItem("agv_current_plan", serverPlan);
          }

          const serverEmail = String(data.account?.email || "").trim().toLowerCase();
          if (!customerEmail && serverEmail) {
            customerEmail = serverEmail;
          }

          if (customerEmail && publicPlan !== "FREE") break;
        } catch {
          // Try the next subscription source when available.
        }
      }
    }

    if (!customerEmail) {
      setBroadcastPackMessage("Sync your AGV account email first, then choose a Broadcast Credit Pack.");
      return;
    }

    if (publicPlan === "FREE") {
      setBroadcastPackMessage("Broadcast Credit Packs are available after upgrading from the Free plan.");
      return;
    }

    setBroadcastPackMessage(`Opening Stripe checkout for your ${PLAN_LIMITS[publicPlan]?.label || publicPlan} Broadcast Credit Pack...`);

    try {
      const response = await fetch(`${USAGE_API_BASE}/api/usage/create-broadcast-pack-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: customerEmail,
          plan: publicPlan,
          packId,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data?.ok) {
        setBroadcastPackMessage(
          data?.error ||
            "Broadcast Credit Pack checkout is not available yet. Please try again shortly."
        );
        return;
      }

      if (data.checkoutUrl) {
        setBroadcastPackMessage("Stripe checkout is ready. Redirecting now...");
        window.location.assign(data.checkoutUrl);
        return;
      }

      setBroadcastPackMessage("Checkout started, but Stripe did not return a checkout link.");
    } catch {
      setBroadcastPackMessage("Could not reach Broadcast Credit Pack checkout. Make sure the Broadcast Credits server is running.");
    }
  }
  async function openBillingPortal() {
    setBillingMessage("Opening Stripe Billing Portal...");

    const customerEmail = String(account?.email || "").trim().toLowerCase();

    if (!customerEmail) {
      setBillingMessage(
        "Sync your AGV account email first, then open Manage Billing."
      );
      return;
    }

    try {
      const response = await fetch(
        `${BILLING_API_BASE}/api/billing/create-portal-session`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customerEmail }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data?.ok) {
        setBillingMessage(
          data?.error ||
            "Stripe Billing Portal is not ready for this account yet."
        );
        return;
      }

      if (data.portalUrl) {
        window.location.href = data.portalUrl;
        return;
      }

      setBillingMessage("Billing Portal opened, but no portal URL was returned.");
    } catch {
      setBillingMessage("Could not reach the remote billing server.");
    }
  }

  const billingStatusCard = useMemo(() => {
    if (billingReturn.status === "success") {
      return {
        badge: "PAYMENT SUCCESSFUL",
        title: "Your AGV plan is active",
        text:
          billingReturn.plan === "INTERNAL_TEST"
            ? "Internal test checkout completed. AGV activated Creator-level access for this test."
            : `Stripe returned a successful checkout for the ${activePlan.label} plan.`,
        tone: "success",
      };
    }

    if (billingReturn.status === "cancelled") {
      return {
        badge: "CHECKOUT CANCELLED",
        title: "No payment was completed",
        text: "The checkout was cancelled. Your AGV plan was not changed.",
        tone: "warning",
      };
    }

    return null;
  }, [billingReturn.status, billingReturn.plan, activePlan.label]);

  return (
    <div style={styles.page}>
      <header style={styles.nav}>
        <div style={styles.brand}>
          <div style={styles.logoMark}>AGV</div>
          <div>
            <div style={styles.brandName}>Avant Global Vision</div>
            <div style={styles.brandSub}>Digital Convention + Broadcast Platform</div>
          </div>
        </div>

        <div style={styles.navActions}>
          <button style={styles.navButtonGold} onClick={onViewerEnter}>Verify Event Ticket</button>
        </div>
      </header>

      <main style={styles.shell}>
        <section style={styles.hero}>
          <div style={styles.badge}>START YOUR DIGITAL VENUE</div>
          <h1 style={styles.title}>
            Turn your live event into a professional online venue.
          </h1>
          <p style={styles.subtitle}>
            Start free with one public AGV host room, then upgrade when your audience grows.
          </p>

          {billingMessage ? <p style={styles.adminMessage}>{billingMessage}</p> : null}
        </section>

        {billingStatusCard ? (
          <section
            style={
              billingStatusCard.tone === "success"
                ? styles.successPanel
                : styles.warningPanel
            }
          >
            <div>
              <div style={styles.statusBadge}>{billingStatusCard.badge}</div>
              <h2 style={styles.successTitle}>{billingStatusCard.title}</h2>
              <p style={styles.successText}>{billingStatusCard.text}</p>
              <p style={styles.successSubText}>{planMessage}</p>
            </div>

            <div style={styles.successActions}>
              <button
                style={styles.primaryButton}
                onClick={() => {
                  onHostEnter();
                }}
              >
                Enter AGV Platform
              </button>

              <button style={styles.secondaryButton} onClick={onClearBillingMessage}>
                Clear Message
              </button>
            </div>
          </section>
        ) : null}

        <section style={styles.dashboardSection}>
          <div>
            <div style={styles.badgeSmall}>CUSTOMER DASHBOARD</div>
            <h2 style={styles.sectionTitle}>Current AGV Plan</h2>
            <p style={styles.sectionText}>
              {planLoaded ? planMessage : "Loading your AGV plan status..."}
            </p>
          </div>

          <div style={styles.dashboardGrid}>
            <DashboardStat label="Plan" value={activePlan.label} />
            <DashboardStat label="Price" value={activePlan.price} />
            <DashboardStat label="Rooms" value={activePlan.rooms} />
            <DashboardStat label="Viewer Limit" value={activePlan.viewers} />
            <DashboardStat label="Private Rooms" value={activePlan.privateRooms} />
            <DashboardStat label="Ticket-Only" value={activePlan.ticketOnly} />
          </div>

          <div style={styles.accountCard}>
            <div>
              <div style={styles.accountTitle}>AGV Account</div>
              <div style={styles.accountLine}>
                Name: {account?.name || "Not synced yet"}
              </div>
              <div style={styles.accountLine}>
                Email: {account?.email || "Not synced yet"}
              </div>
              <div style={styles.accountLine}>
                Organization: {account?.organization || "Not synced yet"}
              </div>
            </div>

            <div style={accountReady ? styles.accountBadgeGood : styles.accountBadgeWarn}>
              {accountReady ? "Account Synced" : "Sync Needed"}
            </div>
          </div>

          <div style={styles.dashboardFooter}>
            <p style={styles.cardText}>{activePlan.description}</p>

            <div style={styles.buttonRowLeft}>
              <button
                style={styles.primaryButton}
                onClick={() => {
                  onHostEnter();
                }}
              >
                Enter Platform
              </button>

              <button style={styles.secondaryButton} onClick={onFreeStart}>
                {accountReady ? "Update Account" : "Sync Account"}
              </button>
              <button style={styles.secondaryButton} onClick={openBillingPortal}>
                Manage Billing / Cancel Subscription
              </button>
            </div>
          </div>
        </section>


        {/* PASS_CLIENT_BROADCAST_CREDITS_AWARENESS_1 */}
        <section style={{ ...styles.dashboardSection, alignItems: "stretch" }}>
          <div>
            <div style={styles.badgeSmall}>LIVE USAGE INCLUDED</div>
            <h2 style={styles.sectionTitle}>Every AGV plan includes live usage.</h2>
            <p style={styles.sectionText}>
              AGV is built for everyday live rooms, classes, meetings, ministry, podcasts,
              paid events, and larger online programs. Each plan includes live usage so hosts
              can start with confidence before adding more reach.
            </p>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
              gap: 12,
            }}
          >
            <div style={styles.subscriptionCard}>
              <div style={styles.badgeSmall}>START</div>
              <h3 style={styles.accountTitle}>Included live room usage</h3>
              <p style={styles.cardText}>
                Use your plan for normal AGV rooms, teaching, meetings, small events, and host-led sessions.
              </p>
            </div>
            <div style={styles.subscriptionCard}>
              <div style={styles.badgeSmall}>GROW</div>
              <h3 style={styles.accountTitle}>Add reach when needed</h3>
              <p style={styles.cardText}>
                When your audience grows, Broadcast Credit Packs help support larger programs before showtime.
              </p>
            </div>
            <div style={styles.subscriptionCard}>
              <div style={styles.badgeSmall}>PROTECT THE SHOW</div>
              <h3 style={styles.accountTitle}>Plan before going live</h3>
              <p style={styles.cardText}>
                AGV helps hosts understand usage before major events so the broadcast experience stays smooth.
              </p>
            </div>
          </div>
        </section>
        <section style={styles.planSection}>
          <h2 style={styles.sectionTitle}>Choose Your AGV Plan</h2>
          <p style={styles.sectionText}>
            Upgrade when your digital venue needs more rooms, privacy, ticketing, and viewer capacity.
          </p>

          <div style={styles.publicPlanGrid}>
            <PublicPlanCard
              title="Free"
              price="$0"
              text="1 public host room, 25 viewers, starter live usage included. Try before you buy."
              buttonText="Start Free"
              onClick={onFreeStart}
              active={currentPlan === "FREE"}
            />

            <PublicPlanCard
              title="Creator"
              price="$29/mo"
              text="3 rooms, 100 viewers, private rooms, ticket-only rooms, and monthly live usage."
              buttonText={currentPlan === "CREATOR" ? "Current Plan" : "Upgrade to Creator"}
              onClick={() => currentPlan === "CREATOR" ? null : startCheckout("CREATOR")}
              featured
              active={currentPlan === "CREATOR"}
            />

            <PublicPlanCard
              title="Ministry / Pro"
              price="$99/mo"
              text="10 rooms, 500 viewers, expanded live usage for church, teaching, and conference programs."
              buttonText={currentPlan === "MINISTRY" ? "Current Plan" : "Upgrade to Ministry"}
              onClick={() => currentPlan === "MINISTRY" ? null : startCheckout("MINISTRY")}
              active={currentPlan === "MINISTRY"}
            />

            <PublicPlanCard
              title="Convention"
              price="$299/mo"
              text="50 rooms, 2,000 viewers, high-capacity live usage for conventions and large events."
              buttonText={currentPlan === "CONVENTION" ? "Current Plan" : "Upgrade to Convention"}
              onClick={() => currentPlan === "CONVENTION" ? null : startCheckout("CONVENTION")}
              active={currentPlan === "CONVENTION"}
            />
          </div>

          <div
            style={{
              marginTop: 18,
              border: "1px solid rgba(212,175,55,0.26)",
              borderRadius: 24,
              padding: 18,
              background:
                "linear-gradient(180deg, rgba(212,175,55,0.10), rgba(15,23,42,0.70))",
            }}
          >
            <div style={styles.badgeSmall}>BROADCAST CREDIT PACKS</div>
            <h3 style={styles.sectionTitle}>Need more broadcast reach?</h3>
            <p style={styles.sectionText}>
              Plans include live usage. For larger audiences, longer programs, or special events,
              hosts can add Broadcast Credit Packs before going live. This helps AGV scale your
              program safely without interrupting the show.
            </p>
            {broadcastPackMessage ? (
              <p
                style={{
                  ...styles.adminMessage,
                  marginTop: 14,
                  marginBottom: 0,
                }}
              >
                {broadcastPackMessage}
              </p>
            ) : null}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                gap: 12,
                marginTop: 14,
              }}
            >
              <div style={styles.subscriptionCard}>
                <div style={styles.badgeSmall}>STARTER PACK</div>
                <h3 style={styles.accountTitle}>Small events</h3>
                <p style={styles.cardText}>Helpful for short programs, small paid events, and light extra reach.</p>
                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={() => startBroadcastPackCheckout("starter")}
                >
                  Buy Starter Pack — $59
                </button>
              </div>
              <div style={styles.subscriptionCard}>
                <div style={styles.badgeSmall}>GROWTH PACK</div>
                <h3 style={styles.accountTitle}>Growing audiences</h3>
                <p style={styles.cardText}>Built for hosts expecting more viewers or longer broadcast time.</p>
                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={() => startBroadcastPackCheckout("growth")}
                >
                  Buy Growth Pack — $199
                </button>
              </div>
              <div style={styles.subscriptionCard}>
                <div style={styles.badgeSmall}>EVENT PACK</div>
                <h3 style={styles.accountTitle}>Major programs</h3>
                <p style={styles.cardText}>Recommended for fundraisers, conferences, seminars, and ticketed events.</p>
                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={() => startBroadcastPackCheckout("event")}
                >
                  Buy Event Pack — $799
                </button>
              </div>
              <div style={styles.subscriptionCard}>
                <div style={styles.badgeSmall}>CONVENTION PACK</div>
                <h3 style={styles.accountTitle}>Large gatherings</h3>
                <p style={styles.cardText}>Designed for conventions, multi-room programs, and high-attendance events.</p>
                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={() => startBroadcastPackCheckout("convention")}
                >
                  Buy Convention Pack — $1,999
                </button>
              </div>
            </div>
            <p style={{ ...styles.cardText, marginTop: 14 }}>
              Broadcast Credit Packs are optional add-ons for larger events. Everyday hosts can start with the live usage included in their plan.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

function DashboardStat({ label, value }) {
  return (
    <div style={styles.dashboardStat}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function PublicPlanCard({ title, price, text, buttonText, onClick, featured, active }) {
  return (
    <div
      style={
        active
          ? styles.publicPlanCardActive
          : featured
          ? styles.publicPlanCardFeatured
          : styles.publicPlanCard
      }
    >
      <div style={styles.planBadge}>{active ? `${title} · Active` : title}</div>
      <h3 style={styles.planPrice}>{price}</h3>
      <p style={styles.cardText}>{text}</p>
      <button
        style={active ? styles.activePlanButton : styles.primaryButton}
        onClick={onClick}
        disabled={active}
      >
        {buttonText}
      </button>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    width: "100%",
    background:
      "radial-gradient(circle at top left, rgba(250,204,21,0.20), transparent 34%), linear-gradient(135deg, #050b16 0%, #071526 44%, #111827 100%)",
    color: "#f8fafc",
    fontFamily: "Inter, system-ui, Segoe UI, sans-serif",
    padding: 24,
    boxSizing: "border-box",
  },
  nav: {
    maxWidth: 1240,
    margin: "0 auto 28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  navActions: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  brand: { display: "flex", alignItems: "center", gap: 12 },
  logoMark: {
    width: 48,
    height: 48,
    borderRadius: 16,
    background: "linear-gradient(135deg, #facc15, #c99a3b)",
    color: "#07111f",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 950,
  },
  brandName: { fontSize: 18, fontWeight: 950 },
  brandSub: { color: "#94a3b8", fontSize: 13, marginTop: 2 },
  navButton: {
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: 14,
    padding: "12px 18px",
    background: "rgba(255,255,255,0.07)",
    color: "#f8fafc",
    fontWeight: 850,
    cursor: "pointer",
  },
  navButtonGold: {
    border: "none",
    borderRadius: 14,
    padding: "12px 18px",
    background: "linear-gradient(135deg, #facc15, #c99a3b)",
    color: "#06111f",
    fontWeight: 950,
    cursor: "pointer",
  },
  shell: { maxWidth: 1240, margin: "0 auto", display: "grid", gap: 26 },
  hero: { textAlign: "center", padding: "40px 12px 12px" },
  badge: {
    display: "inline-flex",
    padding: "9px 16px",
    borderRadius: 999,
    border: "1px solid rgba(250,204,21,0.65)",
    color: "#facc15",
    fontSize: 12,
    fontWeight: 950,
    letterSpacing: "0.16em",
    marginBottom: 22,
    background: "rgba(250,204,21,0.08)",
  },
  badgeSmall: {
    display: "inline-flex",
    padding: "7px 12px",
    borderRadius: 999,
    border: "1px solid rgba(250,204,21,0.50)",
    color: "#facc15",
    fontSize: 11,
    fontWeight: 950,
    letterSpacing: "0.13em",
    marginBottom: 12,
    background: "rgba(250,204,21,0.08)",
  },
  title: {
    maxWidth: 980,
    margin: "0 auto",
    fontSize: "clamp(40px, 7vw, 78px)",
    lineHeight: 0.96,
    fontWeight: 950,
  },
  subtitle: {
    maxWidth: 850,
    margin: "24px auto 0",
    color: "#cbd5e1",
    fontSize: "clamp(17px, 2vw, 22px)",
    lineHeight: 1.55,
  },
  successPanel: {
    border: "1px solid rgba(34,197,94,0.34)",
    background: "linear-gradient(135deg, rgba(34,197,94,0.16), rgba(250,204,21,0.08))",
    borderRadius: 28,
    padding: 28,
    display: "flex",
    justifyContent: "space-between",
    gap: 18,
    alignItems: "center",
    flexWrap: "wrap",
  },
  warningPanel: {
    border: "1px solid rgba(250,204,21,0.34)",
    background: "rgba(250,204,21,0.10)",
    borderRadius: 28,
    padding: 28,
    display: "flex",
    justifyContent: "space-between",
    gap: 18,
    alignItems: "center",
    flexWrap: "wrap",
  },
  statusBadge: {
    display: "inline-flex",
    padding: "8px 12px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.10)",
    color: "#facc15",
    fontSize: 12,
    fontWeight: 950,
    letterSpacing: "0.14em",
    marginBottom: 12,
  },
  successTitle: {
    margin: 0,
    fontSize: "clamp(28px, 4vw, 42px)",
    fontWeight: 950,
  },
  successText: {
    margin: "10px 0 0",
    color: "#dbeafe",
    fontSize: 17,
    lineHeight: 1.5,
    maxWidth: 760,
  },
  successSubText: {
    margin: "10px 0 0",
    color: "#fde68a",
    fontWeight: 850,
    lineHeight: 1.5,
  },
  successActions: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
  },
  dashboardSection: {
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    borderRadius: 28,
    padding: 28,
    display: "grid",
    gap: 20,
  },
  dashboardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(6, minmax(120px, 1fr))",
    gap: 12,
  },
  dashboardStat: {
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(7,17,31,0.72)",
    borderRadius: 18,
    padding: 16,
    display: "grid",
    gap: 5,
  },
  accountCard: {
    border: "1px solid rgba(250,204,21,0.22)",
    background: "rgba(7,17,31,0.72)",
    borderRadius: 22,
    padding: 20,
    display: "flex",
    justifyContent: "space-between",
    gap: 18,
    alignItems: "center",
    flexWrap: "wrap",
  },
  accountTitle: {
    fontSize: 18,
    fontWeight: 950,
    color: "#facc15",
    marginBottom: 8,
  },
  accountLine: {
    color: "#cbd5e1",
    fontSize: 14,
    lineHeight: 1.6,
  },
  accountBadgeGood: {
    borderRadius: 999,
    padding: "10px 14px",
    background: "rgba(34,197,94,0.16)",
    border: "1px solid rgba(34,197,94,0.34)",
    color: "#bbf7d0",
    fontWeight: 950,
  },
  accountBadgeWarn: {
    borderRadius: 999,
    padding: "10px 14px",
    background: "rgba(250,204,21,0.12)",
    border: "1px solid rgba(250,204,21,0.34)",
    color: "#fde68a",
    fontWeight: 950,
  },
  dashboardFooter: {
    display: "flex",
    justifyContent: "space-between",
    gap: 18,
    alignItems: "center",
    flexWrap: "wrap",
  },
  buttonRowLeft: {
    display: "flex",
    justifyContent: "flex-start",
    gap: 14,
    flexWrap: "wrap",
  },
  planSection: {
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    borderRadius: 28,
    padding: 28,
    marginBottom: 36,
  },
  sectionTitle: {
    margin: 0,
    fontSize: "clamp(30px, 4vw, 48px)",
    fontWeight: 950,
  },
  sectionText: {
    margin: "10px 0 0",
    color: "#cbd5e1",
    fontSize: 16,
    lineHeight: 1.5,
  },
  publicPlanGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 16,
    marginTop: 20,
  },
  publicPlanCard: {
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(7,17,31,0.76)",
    borderRadius: 22,
    padding: 22,
    display: "grid",
    gap: 12,
  },
  publicPlanCardFeatured: {
    border: "1px solid rgba(250,204,21,0.42)",
    background: "rgba(250,204,21,0.10)",
    borderRadius: 22,
    padding: 22,
    display: "grid",
    gap: 12,
  },
  publicPlanCardActive: {
    border: "1px solid rgba(34,197,94,0.42)",
    background: "rgba(34,197,94,0.12)",
    borderRadius: 22,
    padding: 22,
    display: "grid",
    gap: 12,
  },
  planBadge: {
    display: "inline-block",
    padding: "8px 12px",
    borderRadius: 999,
    background: "rgba(250,204,21,0.16)",
    color: "#facc15",
    fontWeight: 950,
    width: "fit-content",
  },
  planPrice: { margin: 0, fontSize: 30, fontWeight: 950 },
  cardText: { margin: 0, color: "#cbd5e1", lineHeight: 1.55, fontSize: 15 },
  finalCta: {
    textAlign: "center",
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    borderRadius: 28,
    padding: "38px 24px",
    margin: "60px auto 30px",
    maxWidth: 980,
  },
  ctaTitle: { margin: 0, fontSize: "clamp(30px, 4vw, 48px)", fontWeight: 950 },
  ctaText: {
    maxWidth: 720,
    margin: "16px auto 0",
    color: "#cbd5e1",
    fontSize: 17,
    lineHeight: 1.55,
  },
  ticketInput: {
    width: "min(520px, 100%)",
    marginTop: 16,
    padding: "16px 18px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.08)",
    color: "#fff",
    fontSize: 18,
    fontWeight: 800,
    textAlign: "center",
  },
  ticketSelect: {
    width: "min(720px, 100%)",
    marginTop: 16,
    padding: "16px 18px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(15,23,42,0.98)",
    color: "#fff",
    fontSize: 16,
    fontWeight: 800,
    textAlign: "center",
  },
  buttonRow: {
    display: "flex",
    justifyContent: "center",
    gap: 14,
    flexWrap: "wrap",
    marginTop: 32,
  },
  primaryButton: {
    border: "none",
    borderRadius: 16,
    padding: "15px 24px",
    fontSize: 16,
    fontWeight: 950,
    cursor: "pointer",
    background: "linear-gradient(135deg, #facc15, #c99a3b)",
    color: "#06111f",
  },
  secondaryButton: {
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: 16,
    padding: "15px 24px",
    fontSize: 16,
    fontWeight: 850,
    cursor: "pointer",
    background: "rgba(255,255,255,0.07)",
    color: "#f8fafc",
  },
  activePlanButton: {
    border: "1px solid rgba(34,197,94,0.32)",
    borderRadius: 16,
    padding: "15px 24px",
    fontSize: 16,
    fontWeight: 950,
    cursor: "not-allowed",
    background: "rgba(34,197,94,0.16)",
    color: "#bbf7d0",
  },
  subscriptionCard: {
    border: "1px solid rgba(250,204,21,0.24)",
    background: "rgba(250,204,21,0.10)",
    borderRadius: 24,
    padding: 24,
    display: "grid",
    gap: 16,
    marginTop: 24,
  },
  ticketList: {
    display: "grid",
    gap: 12,
  },
  ticketCard: {
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(7,17,31,0.72)",
    borderRadius: 20,
    padding: 18,
    display: "flex",
    justifyContent: "space-between",
    gap: 18,
    alignItems: "center",
    flexWrap: "wrap",
  },
  ticketCode: {
    color: "#facc15",
    fontSize: 22,
    fontWeight: 950,
    letterSpacing: "0.05em",
    marginBottom: 8,
  },
  adminMessage: { marginTop: 16, color: "#facc15", fontWeight: 850 },
  errorText: { color: "#fca5a5", fontWeight: 800 },
};