import React, { useEffect, useState } from "react";

const ROOM_STORAGE_KEY = "agv_super_admin_rooms";
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

export default function SuperAdminPanel({ onBack }) {
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

  const [roomName, setRoomName] = useState("");
  const [category, setCategory] = useState("Convention");
  const [visibility, setVisibility] = useState("Public");
  const [host, setHost] = useState("Unassigned");

  const [planRules, setPlanRules] = useState(FALLBACK_PLAN_LIMITS);
  const [subscriptionPlan, setSubscriptionPlan] = useState("FREE");
  const [subscriptionMessage, setSubscriptionMessage] = useState(
    "Subscription server not checked yet."
  );
  const [upgradeMessage, setUpgradeMessage] = useState("");
  const [billingMessage, setBillingMessage] = useState("");

  const limits = planRules[subscriptionPlan] || FALLBACK_PLAN_LIMITS.FREE;
  const roomsUsed = rooms.length;
  const roomsRemaining = Math.max(limits.maxRooms - roomsUsed, 0);

  useEffect(() => {
    localStorage.setItem(ROOM_STORAGE_KEY, JSON.stringify(rooms));
  }, [rooms]);

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

      if (data.limits) {
        setPlanRules((current) => ({
          ...current,
          [data.plan]: {
            ...(current[data.plan] || {}),
            ...data.limits,
          },
        }));
      }

      setSubscriptionMessage("Subscription loaded from SERVER 8792.");
    } catch {
      setSubscriptionMessage("Subscription server offline. Using local fallback rules.");
    }
  }

  async function saveSubscriptionPlan(nextPlan) {
    setSubscriptionPlan(nextPlan);
    setUpgradeMessage("");

    try {
      const response = await fetch(`${SUBSCRIPTION_API_BASE}/api/subscription/plan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan: nextPlan }),
      });

      const data = await response.json();

      if (!response.ok || !data?.ok) {
        setSubscriptionMessage(data?.error || "Could not save subscription plan.");
        return;
      }

      setSubscriptionPlan(data.plan || nextPlan);

      if (data.limits) {
        setPlanRules((current) => ({
          ...current,
          [data.plan]: {
            ...(current[data.plan] || {}),
            ...data.limits,
          },
        }));
      }

      setSubscriptionMessage(`Saved ${data.plan} plan to SERVER 8792.`);
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

  function createRoom() {
    const cleanName = roomName.trim();

    if (!cleanName) {
      setUpgradeMessage("Enter a room name before creating a room.");
      return;
    }

    if (rooms.length >= limits.maxRooms) {
      setUpgradeMessage(
        `${limits.label || subscriptionPlan} allows ${limits.maxRooms} room(s). Upgrade to create more rooms.`
      );
      return;
    }

    if (visibility === "Private" && !limits.allowPrivate) {
      setUpgradeMessage("Private rooms require Creator plan or higher.");
      return;
    }

    if (visibility === "Ticket Only" && !limits.allowTicketOnly) {
      setUpgradeMessage("Ticket-only rooms require Creator plan or higher.");
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
      ...privacy,
    };

    setRooms([...rooms, newRoom]);
    setRoomName("");
    setCategory("Convention");
    setVisibility("Public");
    setHost("Unassigned");
    setUpgradeMessage("");
  }

  function deleteRoom(id) {
    setRooms(rooms.filter((room) => room.id !== id));
  }

  function updateRoomVisibility(id, nextVisibility) {
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
          <div style={styles.badge}>AGV BILLING FOUNDATION</div>
          <h1 style={styles.title}>Super Admin Control Center</h1>
          <p style={styles.subtitle}>
            Manage rooms, subscription limits, and Stripe-ready upgrade paths.
          </p>
          <p style={styles.serverMessage}>{subscriptionMessage}</p>
          {billingMessage ? <p style={styles.billingMessage}>{billingMessage}</p> : null}
        </div>

        <button style={styles.secondaryButton} onClick={onBack}>
          Back to Landing
        </button>
      </header>

      <section style={styles.planCard}>
        <div>
          <div style={styles.planBadge}>{limits.label || subscriptionPlan} Plan</div>
          <h2 style={styles.planTitle}>AGV SaaS Usage</h2>
          <p style={styles.planText}>{limits.note || "Subscription authority active."}</p>
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
                AGV Flags: {room.isPrivate ? "Private" : "Public"} ·{" "}
                {room.isLocked ? "Locked" : "Open"}
              </div>
              <div style={styles.meta}>Host: {room.host || "Unassigned"}</div>
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