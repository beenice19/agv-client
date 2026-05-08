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

function getRoomFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get("room") || "main-hall";
  } catch {
    return "main-hall";
  }
}

export default function AppCore({ entryRole = "viewer" }) {
  const [rooms] = useState(DEFAULT_ROOMS);
  const [selectedRoomId, setSelectedRoomId] = useState(getRoomFromUrl);
  const [roleMode] = useState(
  entryRole === "host" ? "host" : "viewer"
);
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

  const isViewerOnly = roleMode === "viewer";
const isHost = roleMode === "host";

const isModerator = moderators.length > 0;

const canModerate =
  isHost || isModerator;
  const canControlStage = isHost;
  const viewerNeedsTicket = isViewerOnly && !ticketApproved;

  const selectedRoomMessages = messagesByRoom[selectedRoomId] || [];
  const selectedRoomBulletins = bulletinsByRoom[selectedRoomId] || [];

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
      }),
    });

    const data = await response.json();

    if (!response.ok || !data?.ok) {
      setStatus(data?.error || "Could not create event.");
      return;
    }

    setEvents(Array.isArray(data.events) ? data.events : []);
    setEventTitle("");
    setEventDescription("");
    setEventDate("");
    setEventTime("");
    setEventPrice("");
    setStatus("Event created.");
  } catch {
    setStatus("Could not reach event server on 8786.");
  }
}

async function deleteEvent(eventId) {
  if (!isHost) {
    setStatus("Host access required to delete events.");
    return;
  }

  try {
    const response = await fetch(`${EVENT_API_BASE}/api/events/${encodeURIComponent(eventId)}/delete`, {
      method: "POST",
    });

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

        onTrackSubscribed: (track) => {
          const element = track.attach();

          if (track.kind === "video") {
            showStageElement(element);
            setStatus("Receiving LiveKit video");
          }

          if (track.kind === "audio") {
            element.autoplay = true;
            element.style.display = "none";
            document.body.appendChild(element);
            audioElementsRef.current.push(element);
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
  {entryRole === "host"
    ? "Admin / Host"
    : "User / Viewer"}
</div>

          <button style={styles.dangerButton} onClick={disconnectFromLiveKit}>
            Disconnect
          </button>
        </div>
      </header>

      <main style={isViewerOnly ? styles.viewerMainGrid : styles.mainGrid}>
        {!isViewerOnly ? (
          <aside style={styles.leftPanel}>
            <div style={styles.panelTitle}>Rooms</div>

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
                Mode: {isViewerOnly ? "USER / VIEWER" : "ADMIN / HOST"} • LiveKit Room:{" "}
                {selectedRoomId}
              </div>
            </div>

            <div style={styles.identityChips}>
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
                Viewer access is locked until a valid ticket code is approved.
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
                    : "Start Host Camera to broadcast through LiveKit."}
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
    ? "Host Console"
    : isModerator
    ? "Moderator Console"
    : "Viewer Console"}
</span>
                <strong>
  {isHost
    ? "HOST"
    : isModerator
    ? "MODERATOR"
    : "VIEWER"}
</strong>
              </div>
              <div style={styles.participantRow}>
                <span>LiveKit room</span>
                <strong>{selectedRoomId}</strong>
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
  <div style={styles.controlTitle}>Event Creation System</div>

  <div style={styles.helperText}>
    Create AGV events tied to the current room. Events are stored on SERVER 8786.
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
    events.map((item) => (
      <div key={item.id} style={styles.controlBox}>
        <div style={styles.controlTitle}>{item.title}</div>

        <div style={styles.helperText}>
          Room: {item.roomId || "main-hall"} • Date: {item.eventDate || "Not set"} • Time:{" "}
          {item.startTime || "Not set"} • Price: {item.ticketPrice || "Not set"}
        </div>

        {item.description ? (
          <div style={styles.helperText}>{item.description}</div>
        ) : null}

        <button
          style={styles.dangerButton}
          onClick={() => deleteEvent(item.id)}
        >
          Delete Event
        </button>
      </div>
    ))
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
                  Host/Admin bypasses ticket lock. Viewer must verify a ticket before joining the room.
                </div>
              </div>
<div style={styles.controlBox}>
  <div style={styles.controlTitle}>
    Moderator Authority
  </div>

  <div style={styles.helperText}>
    Moderators can clear chat and manage bulletins
    but cannot control the broadcast stage.
  </div>

  <input
    style={styles.chatInput}
    value={moderatorInput}
    onChange={(event) =>
      setModeratorInput(event.target.value)
    }
    placeholder="Moderator name or email"
  />

  <button
    style={styles.secondaryButton}
    onClick={addModerator}
  >
    Add Moderator
  </button>

  <div style={styles.helperText}>
    Current Moderators:
  </div>

  {moderators.length ? (
    moderators.map((mod) => (
      <div key={mod.id} style={styles.participantRow}>
        <span>
          {mod.name || mod.email || "Moderator"}
        </span>

        <button
          style={styles.dangerButton}
          onClick={() => removeModerator(mod.id)}
        >
          Remove
        </button>
      </div>
    ))
  ) : (
    <div style={styles.emptyText}>
      No moderators assigned.
    </div>
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
  roomList: { display: "grid", gap: 10 },
  roomButton: { width: "100%", textAlign: "left", padding: 14, borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.05)", color: "#f8fafc", cursor: "pointer" },
  roomButtonActive: { width: "100%", textAlign: "left", padding: 14, borderRadius: 16, border: "1px solid rgba(212,175,55,0.55)", background: "rgba(212,175,55,0.14)", color: "#f8fafc", cursor: "pointer" },
  roomName: { fontSize: 15, fontWeight: 950, marginBottom: 5 },
  roomMeta: { color: "rgba(248,250,252,0.58)", fontSize: 12 },
  identityCard: { padding: 18, borderRadius: 22, background: "linear-gradient(180deg, rgba(19,27,45,0.92), rgba(10,14,24,0.86))", border: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" },
  roomHeadline: { fontSize: 24, fontWeight: 900, marginBottom: 5 },
  identityLine: { color: "rgba(248,250,252,0.62)", fontSize: 13 },
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
  viewerLockBox: { marginTop: 12, padding: 14, borderRadius: 18, background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.22)", color: "#dbeafe", fontSize: 13, lineHeight: 1.5 },
  participantRow: { display: "flex", justifyContent: "space-between", gap: 10, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", color: "#cbd5e1" },
  bulletinList: { display: "grid", gap: 8, maxHeight: 150, overflow: "auto", marginBottom: 12 },
  bulletinListTall: { display: "grid", gap: 8, maxHeight: 460, overflow: "auto" },
  bulletinItem: { padding: 10, borderRadius: 14,
  borderRadius: 14, background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.18)", color: "#fde68a", fontSize: 13, lineHeight: 1.4 },
  textarea: { width: "100%", minHeight: 80, resize: "vertical", boxSizing: "border-box", borderRadius: 14, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.07)", color: "#f8fafc", padding: 12, marginBottom: 10 },
  chatList: { display: "grid", gap: 10, minHeight: 340, maxHeight: 420, overflow: "auto", marginBottom: 12 },
  chatMessage: { padding: 11, borderRadius: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.07)", color: "#e5e7eb", fontSize: 14, lineHeight: 1.4 },
  chatMeta: { color: "#94a3b8", fontSize: 12, marginBottom: 5, fontWeight: 850 },
  chatComposer: { display: "grid", gridTemplateColumns: "1fr auto", gap: 8 },
  chatInput: { borderRadius: 14, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.07)", color: "#f8fafc", padding: "12px 13px", outline: "none" },
  emptyText: { color: "rgba(248,250,252,0.52)", fontSize: 13, padding: 10 },
};