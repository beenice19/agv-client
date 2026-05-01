import React, { useEffect, useMemo, useRef, useState } from "react";

const API_BASE = "http://127.0.0.1:8787";

const DEFAULT_ROOMS = [
  { id: "main-hall", name: "Main Hall", host: "Admin", isPrivate: false, category: "Convention" },
  { id: "studio-a", name: "Studio A", host: "Admin", isPrivate: false, category: "Media" },
  { id: "radio-room", name: "Radio Room", host: "Admin", isPrivate: false, category: "Broadcast" },
  { id: "prayer-room", name: "Prayer Room", host: "Admin", isPrivate: true, category: "Community" },
  { id: "classroom-1", name: "Classroom 1", host: "Admin", isPrivate: false, category: "Teaching" },
  { id: "green-room", name: "Green Room", host: "Admin", isPrivate: true, category: "Backstage" },
];

function App() {
  const [displayName, setDisplayName] = useState("Admin");
  const [rooms, setRooms] = useState(DEFAULT_ROOMS);
  const [selectedRoomId, setSelectedRoomId] = useState(DEFAULT_ROOMS[0].id);
  const [selectedPanel, setSelectedPanel] = useState("chat");

  const [chatInput, setChatInput] = useState("");
  const [messagesByRoom, setMessagesByRoom] = useState({
    "main-hall": [
      { id: 1, sender: "System", text: "Welcome to Stro Cheivery.", time: timeNow() },
      { id: 2, sender: "Admin", text: "Main stage is ready.", time: timeNow() },
    ],
  });

  const [bulletinItemsByRoom, setBulletinItemsByRoom] = useState({
    "main-hall": [
      "Welcome to Stro Cheivery.",
      "Convention bulletin board is active.",
      "Upload a text file to scroll announcements.",
    ],
  });

  const [participantsByRoom, setParticipantsByRoom] = useState({
    "main-hall": ["Admin", "Host Assistant", "Viewer 1", "Viewer 2"],
  });

  const [roomSearch, setRoomSearch] = useState("");
  const [bulletinSourceByRoom, setBulletinSourceByRoom] = useState({
    "main-hall": "manual",
  });
  const [readerIndexByRoom, setReaderIndexByRoom] = useState({
    "main-hall": 0,
  });
  const [readerPausedByRoom, setReaderPausedByRoom] = useState({
    "main-hall": false,
  });

  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [screenShareOn, setScreenShareOn] = useState(false);
  const [shareDocked, setShareDocked] = useState(false);

  const [localCameraStream, setLocalCameraStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);

  const [statusText, setStatusText] = useState("Ready");
  const [isAdmin] = useState(true);
  const [roomIsPrivate, setRoomIsPrivate] = useState(false);
  const [roomLocked, setRoomLocked] = useState(false);

  const [newRoomName, setNewRoomName] = useState("");
  const [newAnnouncement, setNewAnnouncement] = useState("");

  const stageVideoRef = useRef(null);
  const floatingCameraRef = useRef(null);
  const dockVideoRef = useRef(null);
  const fileInputRef = useRef(null);

  const selectedRoom = useMemo(() => {
    return rooms.find((room) => room.id === selectedRoomId) || rooms[0];
  }, [rooms, selectedRoomId]);

  const filteredRooms = useMemo(() => {
    const q = roomSearch.trim().toLowerCase();
    if (!q) return rooms;
    return rooms.filter((room) => {
      return (
        room.name.toLowerCase().includes(q) ||
        room.category.toLowerCase().includes(q) ||
        room.host.toLowerCase().includes(q)
      );
    });
  }, [roomSearch, rooms]);

  const roomMessages = messagesByRoom[selectedRoomId] || [];
  const roomBulletins = bulletinItemsByRoom[selectedRoomId] || [];
  const roomParticipants = participantsByRoom[selectedRoomId] || [displayName];
  const readerIndex = readerIndexByRoom[selectedRoomId] || 0;
  const readerPaused = readerPausedByRoom[selectedRoomId] || false;
  const bulletinSource = bulletinSourceByRoom[selectedRoomId] || "manual";

  const inviteLink = useMemo(() => {
    if (!selectedRoomId) return "";
    const base = window.location.origin || "http://127.0.0.1:5175";
    return `${base}/?room=${encodeURIComponent(selectedRoomId)}`;
  }, [selectedRoomId]);

  const bulletinStats = useMemo(() => {
    const totalChars = roomBulletins.join(" ").length;
    const totalLines = roomBulletins.length;
    return { totalChars, totalLines };
  }, [roomBulletins]);

  const useReaderMode = useMemo(() => {
    if (bulletinSource === "imported" && bulletinStats.totalLines >= 6) return true;
    if (bulletinSource === "imported" && bulletinStats.totalChars >= 320) return true;
    if (bulletinStats.totalLines >= 10) return true;
    if (bulletinStats.totalChars >= 500) return true;
    return false;
  }, [bulletinSource, bulletinStats]);

  const tickerDurationSeconds = useMemo(() => {
    const totalChars = roomBulletins.join(" ").length;
    return Math.max(60, Math.min(180, Math.ceil(totalChars / 4)));
  }, [roomBulletins]);

  const marqueeItems = useMemo(() => {
    const base = roomBulletins.length ? roomBulletins : ["No announcements loaded."];
    return [...base, ...base];
  }, [roomBulletins]);

  const readerWindow = useMemo(() => {
    const lines = roomBulletins.length ? roomBulletins : ["No announcements loaded."];
    const safeIndex = Math.min(readerIndex, Math.max(lines.length - 1, 0));

    return [
      lines[safeIndex - 1] || "",
      lines[safeIndex] || "",
      lines[safeIndex + 1] || "",
      lines[safeIndex + 2] || "",
    ];
  }, [roomBulletins, readerIndex]);

  useEffect(() => {
    setRoomIsPrivate(Boolean(selectedRoom?.isPrivate));
  }, [selectedRoom]);

  useEffect(() => {
    loadRoomsFromServer();
  }, []);

  useEffect(() => {
    const stageVideo = stageVideoRef.current;
    if (!stageVideo) return;

    if (screenShareOn && !shareDocked && screenStream) {
      if (stageVideo.srcObject !== screenStream) {
        stageVideo.srcObject = screenStream;
      }
      return;
    }

    if (localCameraStream) {
      if (stageVideo.srcObject !== localCameraStream) {
        stageVideo.srcObject = localCameraStream;
      }
      return;
    }

    stageVideo.srcObject = null;
  }, [screenShareOn, shareDocked, screenStream, localCameraStream]);

  useEffect(() => {
    const floatingVideo = floatingCameraRef.current;
    if (!floatingVideo) return;

    if (cameraOn && screenShareOn && localCameraStream) {
      if (floatingVideo.srcObject !== localCameraStream) {
        floatingVideo.srcObject = localCameraStream;
      }
      return;
    }

    floatingVideo.srcObject = null;
  }, [cameraOn, screenShareOn, localCameraStream]);

  useEffect(() => {
    const dockVideo = dockVideoRef.current;
    if (!dockVideo) return;

    if (screenShareOn && shareDocked && screenStream) {
      if (dockVideo.srcObject !== screenStream) {
        dockVideo.srcObject = screenStream;
      }
      return;
    }

    dockVideo.srcObject = null;
  }, [screenShareOn, shareDocked, screenStream]);

  useEffect(() => {
    syncRoomToUrl(selectedRoomId);
  }, [selectedRoomId]);

  useEffect(() => {
    if (!useReaderMode) return;
    if (readerPaused) return;
    if (roomBulletins.length <= 1) return;

    const interval = window.setInterval(() => {
      setReaderIndexByRoom((prev) => {
        const current = prev[selectedRoomId] || 0;
        const next = current + 1 >= roomBulletins.length ? 0 : current + 1;
        return {
          ...prev,
          [selectedRoomId]: next,
        };
      });
    }, 4200);

    return () => window.clearInterval(interval);
  }, [useReaderMode, readerPaused, roomBulletins, selectedRoomId]);

  useEffect(() => {
    return () => {
      stopCameraTracks();
      stopScreenTracks();
    };
  }, []);

  async function loadRoomsFromServer() {
    try {
      const res = await fetch(`${API_BASE}/api/rooms`);
      if (!res.ok) throw new Error("Room fetch failed");

      const data = await res.json();
      if (!Array.isArray(data?.rooms) || data.rooms.length === 0) {
        applyInitialRoomFromUrl(DEFAULT_ROOMS);
        return;
      }

      const normalized = data.rooms.map((room, index) => ({
        id: String(room.id || room.slug || room.roomId || `room-${index + 1}`),
        name: String(room.name || room.title || `Room ${index + 1}`),
        host: String(room.host || room.assignedHost || "Admin"),
        isPrivate: Boolean(room.isPrivate || room.private || false),
        category: String(room.category || "Room"),
      }));

      setRooms(normalized);
      applyInitialRoomFromUrl(normalized);
    } catch (error) {
      console.log("Using local room fallback.", error);
      applyInitialRoomFromUrl(DEFAULT_ROOMS);
    }
  }

  function applyInitialRoomFromUrl(roomList) {
    const params = new URLSearchParams(window.location.search);
    const roomFromUrl = params.get("room");

    if (roomFromUrl) {
      const exists = roomList.some((room) => room.id === roomFromUrl);
      if (exists) {
        setSelectedRoomId(roomFromUrl);
        setStatusText(`Opened room from link: ${roomFromUrl}`);
        return;
      }
    }

    const currentExists = roomList.some((room) => room.id === selectedRoomId);
    if (!currentExists && roomList.length > 0) {
      setSelectedRoomId(roomList[0].id);
    }
  }

  function syncRoomToUrl(roomId) {
    if (!roomId) return;
    const url = new URL(window.location.href);
    url.searchParams.set("room", roomId);
    window.history.replaceState({}, "", url.toString());
  }

  async function copyInviteLink() {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setStatusText("Invite link copied");
    } catch (error) {
      console.error(error);
      setStatusText("Could not copy invite link");
      alert(`Copy this link manually:\n\n${inviteLink}`);
    }
  }

  async function handleToggleCamera() {
    if (cameraOn && localCameraStream) {
      stopCameraTracks();
      setCameraOn(false);
      setStatusText("Camera off");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: micOn,
      });

      setLocalCameraStream(stream);
      setCameraOn(true);

      if (micOn) {
        enableAudioTracks(stream, true);
      }

      setStatusText("Camera live");
    } catch (error) {
      console.error(error);
      setStatusText("Camera access failed");
      alert("Could not access your camera.");
    }
  }

  async function handleToggleMic() {
    if (localCameraStream) {
      const nextMicOn = !micOn;
      enableAudioTracks(localCameraStream, nextMicOn);
      setMicOn(nextMicOn);
      setStatusText(nextMicOn ? "Mic live" : "Mic muted");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: cameraOn,
        audio: true,
      });

      setLocalCameraStream(stream);
      setMicOn(true);

      if (cameraOn) {
        setCameraOn(true);
      }

      setStatusText("Mic live");
    } catch (error) {
      console.error(error);
      setStatusText("Mic access failed");
      alert("Could not access your microphone.");
    }
  }

  async function handleToggleScreenShare() {
    if (screenShareOn) {
      stopScreenTracks();
      setScreenShareOn(false);
      setShareDocked(false);
      setStatusText("Screen share ended");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      const track = stream.getVideoTracks()[0];
      if (track) {
        track.onended = () => {
          stopScreenTracks();
          setScreenShareOn(false);
          setShareDocked(false);
          setStatusText("Screen share ended");
        };
      }

      setScreenStream(stream);
      setScreenShareOn(true);
      setShareDocked(false);
      setStatusText("Screen sharing live");
    } catch (error) {
      console.error(error);
      setStatusText("Screen share canceled");
    }
  }

  function handleDockShare() {
    if (!screenShareOn) return;
    setShareDocked(true);
    setStatusText("Screen share docked");
  }

  function handleExpandShare() {
    if (!screenShareOn) return;
    setShareDocked(false);
    setStatusText("Screen share on stage");
  }

  function handleSendMessage() {
    const text = chatInput.trim();
    if (!text) return;

    const nextMessage = {
      id: Date.now(),
      sender: displayName || "Admin",
      text,
      time: timeNow(),
    };

    setMessagesByRoom((prev) => {
      const current = prev[selectedRoomId] || [];
      return {
        ...prev,
        [selectedRoomId]: [...current, nextMessage],
      };
    });

    setChatInput("");
    setStatusText("Message sent");
  }

  function handleAnnouncementAdd() {
    const text = newAnnouncement.trim();
    if (!text) return;

    setBulletinItemsByRoom((prev) => {
      const current = prev[selectedRoomId] || [];
      return {
        ...prev,
        [selectedRoomId]: [text, ...current],
      };
    });

    setBulletinSourceByRoom((prev) => ({
      ...prev,
      [selectedRoomId]: "manual",
    }));

    setReaderIndexByRoom((prev) => ({
      ...prev,
      [selectedRoomId]: 0,
    }));

    setReaderPausedByRoom((prev) => ({
      ...prev,
      [selectedRoomId]: false,
    }));

    setNewAnnouncement("");
    setStatusText("Announcement added");
  }

  async function handleBulletinUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      if (lines.length === 0) {
        alert("That text file is empty.");
        return;
      }

      setBulletinItemsByRoom((prev) => ({
        ...prev,
        [selectedRoomId]: lines,
      }));

      setBulletinSourceByRoom((prev) => ({
        ...prev,
        [selectedRoomId]: "imported",
      }));

      setReaderIndexByRoom((prev) => ({
        ...prev,
        [selectedRoomId]: 0,
      }));

      setReaderPausedByRoom((prev) => ({
        ...prev,
        [selectedRoomId]: false,
      }));

      setStatusText(`Loaded ${lines.length} bulletin lines`);
    } catch (error) {
      console.error(error);
      alert("Could not read that text file.");
    } finally {
      event.target.value = "";
    }
  }

  function handleCreateRoom() {
    const name = newRoomName.trim();
    if (!name) return;

    const id = slugify(name);
    const exists = rooms.some((room) => room.id === id);
    if (exists) {
      setStatusText("Room already exists");
      return;
    }

    const room = {
      id,
      name,
      host: displayName || "Admin",
      isPrivate: false,
      category: "Custom",
    };

    setRooms((prev) => [...prev, room]);

    setParticipantsByRoom((prev) => ({
      ...prev,
      [id]: [displayName || "Admin"],
    }));

    setMessagesByRoom((prev) => ({
      ...prev,
      [id]: [{ id: Date.now(), sender: "System", text: `${name} created.`, time: timeNow() }],
    }));

    setBulletinItemsByRoom((prev) => ({
      ...prev,
      [id]: [`Welcome to ${name}.`],
    }));

    setBulletinSourceByRoom((prev) => ({
      ...prev,
      [id]: "manual",
    }));

    setReaderIndexByRoom((prev) => ({
      ...prev,
      [id]: 0,
    }));

    setReaderPausedByRoom((prev) => ({
      ...prev,
      [id]: false,
    }));

    setSelectedRoomId(id);
    setNewRoomName("");
    setStatusText(`Room "${name}" created`);
  }

  function handleJoinRoom(roomId) {
    setSelectedRoomId(roomId);

    setParticipantsByRoom((prev) => {
      const current = prev[roomId] || [];
      const userName = displayName || "Admin";
      if (current.includes(userName)) return prev;
      return {
        ...prev,
        [roomId]: [...current, userName],
      };
    });

    const roomName = rooms.find((room) => room.id === roomId)?.name || "room";
    setStatusText(`Entered ${roomName}`);
  }

  function toggleRoomPrivacy() {
    const next = !roomIsPrivate;
    setRoomIsPrivate(next);

    setRooms((prev) =>
      prev.map((room) =>
        room.id === selectedRoomId
          ? {
              ...room,
              isPrivate: next,
            }
          : room
      )
    );

    setStatusText(next ? "Room set to private" : "Room set to public");
  }

  function toggleRoomLock() {
    const next = !roomLocked;
    setRoomLocked(next);
    setStatusText(next ? "Room locked" : "Room unlocked");
  }

  function stopCameraTracks() {
    if (localCameraStream) {
      localCameraStream.getTracks().forEach((track) => track.stop());
    }
    setLocalCameraStream(null);
    setMicOn(false);
  }

  function stopScreenTracks() {
    if (screenStream) {
      screenStream.getTracks().forEach((track) => track.stop());
    }
    setScreenStream(null);
  }

  function triggerBulletinFile() {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }

  function toggleReaderPause() {
    setReaderPausedByRoom((prev) => ({
      ...prev,
      [selectedRoomId]: !readerPaused,
    }));
    setStatusText(readerPaused ? "Bulletin reader resumed" : "Bulletin reader paused");
  }

  function readerNext() {
    if (roomBulletins.length <= 1) return;
    setReaderIndexByRoom((prev) => {
      const current = prev[selectedRoomId] || 0;
      const next = current + 1 >= roomBulletins.length ? 0 : current + 1;
      return {
        ...prev,
        [selectedRoomId]: next,
      };
    });
  }

  function readerPrev() {
    if (roomBulletins.length <= 1) return;
    setReaderIndexByRoom((prev) => {
      const current = prev[selectedRoomId] || 0;
      const next = current - 1 < 0 ? roomBulletins.length - 1 : current - 1;
      return {
        ...prev,
        [selectedRoomId]: next,
      };
    });
  }

  function readerReset() {
    setReaderIndexByRoom((prev) => ({
      ...prev,
      [selectedRoomId]: 0,
    }));
    setReaderPausedByRoom((prev) => ({
      ...prev,
      [selectedRoomId]: false,
    }));
    setStatusText("Bulletin reader reset");
  }

  const stageTitle = screenShareOn && !shareDocked ? "Live Screen Share" : "Live Stage";
  const stageSubtitle =
    screenShareOn && !shareDocked
      ? "Shared content is filling the main stage."
      : cameraOn
      ? `${displayName || "Admin"} is on camera`
      : "Stage is ready for host camera or screen share.";

  return (
    <div style={styles.appShell}>
      <div style={styles.appBackground} />

      <header style={styles.header}>
        <div style={styles.brandRow}>
          <div style={styles.brandBadge}>SC</div>
          <div>
            <h1 style={styles.title}>Stro Cheivery</h1>
            <div style={styles.subtitle}>Polished 3-Zone Working Layout</div>
          </div>
        </div>

        <div style={styles.headerRight}>
          <div style={styles.headerStatus}>
            <span style={styles.statusDot} />
            <span>{statusText}</span>
          </div>
          <div style={styles.userPill}>{displayName || "Admin"}</div>
        </div>
      </header>

      <main style={styles.main}>
        <section style={styles.stageSection}>
          <div style={styles.stageCard}>
            <div style={styles.stageHeader}>
              <div>
                <div style={styles.stageTitle}>{stageTitle}</div>
                <div style={styles.stageSubtitle}>{stageSubtitle}</div>
              </div>

              <div style={styles.stageMetaWrap}>
                <div style={styles.metaPill}>{selectedRoom?.name || "Room"}</div>
                <div style={styles.metaPill}>{roomIsPrivate ? "Private" : "Public"}</div>
                <div style={styles.metaPill}>{roomLocked ? "Locked" : "Open"}</div>
              </div>
            </div>

            <div style={styles.stageViewport}>
              {screenShareOn || cameraOn ? (
                <video
                  ref={stageVideoRef}
                  autoPlay
                  playsInline
                  muted
                  style={styles.stageVideo}
                />
              ) : (
                <div style={styles.stagePlaceholder}>
                  <div style={styles.stagePlaceholderIcon}>🎬</div>
                  <div style={styles.stagePlaceholderTitle}>Main Stage Ready</div>
                  <div style={styles.stagePlaceholderText}>
                    Turn on camera or start screen share to populate the stage.
                  </div>
                </div>
              )}

              {screenShareOn && (
                <div style={styles.stageDockCluster}>
                  {shareDocked && (
                    <button style={styles.dockCardButton} onClick={handleExpandShare}>
                      <div style={styles.dockLabel}>Shared Screen</div>
                      <video
                        ref={dockVideoRef}
                        autoPlay
                        playsInline
                        muted
                        style={styles.dockVideo}
                      />
                      <div style={styles.dockHint}>Click to return to stage</div>
                    </button>
                  )}

                  {cameraOn && (
                    <div style={styles.floatingCameraCard}>
                      <div style={styles.floatingCameraHeader}>Host Camera</div>
                      <video
                        ref={floatingCameraRef}
                        autoPlay
                        playsInline
                        muted
                        style={styles.floatingCameraVideo}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        <section style={styles.controlSection}>
          <div style={styles.controlBar}>
            <button
              style={cameraOn ? styles.controlButtonActive : styles.controlButton}
              onClick={handleToggleCamera}
            >
              {cameraOn ? "Camera On" : "Camera Off"}
            </button>

            <button
              style={micOn ? styles.controlButtonActive : styles.controlButton}
              onClick={handleToggleMic}
            >
              {micOn ? "Mic On" : "Mic Off"}
            </button>

            <button
              style={screenShareOn ? styles.controlButtonShare : styles.controlButton}
              onClick={handleToggleScreenShare}
            >
              {screenShareOn ? "Stop Share" : "Share Screen"}
            </button>

            <button
              style={!screenShareOn || shareDocked ? styles.controlButtonDisabled : styles.controlButton}
              onClick={handleDockShare}
              disabled={!screenShareOn || shareDocked}
            >
              Dock Share
            </button>

            <button
              style={selectedPanel === "controls" ? styles.controlButtonAccent : styles.controlButton}
              onClick={() => setSelectedPanel("controls")}
            >
              Room Tools
            </button>

            <button style={styles.leaveButton} onClick={() => setStatusText("Room left")}>
              Leave Room
            </button>
          </div>
        </section>

        <section style={styles.contentSection}>
          <div style={styles.roomRailCard}>
            <div style={styles.panelTopRow}>
              <div>
                <div style={styles.panelTitle}>Rooms</div>
                <div style={styles.panelSubtext}>Switch rooms without crowding the stage.</div>
              </div>
            </div>

            <input
              style={styles.searchInput}
              value={roomSearch}
              onChange={(e) => setRoomSearch(e.target.value)}
              placeholder="Search rooms..."
            />

            <div style={styles.roomRail}>
              {filteredRooms.map((room) => {
                const active = room.id === selectedRoomId;
                return (
                  <button
                    key={room.id}
                    onClick={() => handleJoinRoom(room.id)}
                    style={active ? styles.roomChipActive : styles.roomChip}
                  >
                    <div style={styles.roomChipTitle}>{room.name}</div>
                    <div style={styles.roomChipMeta}>
                      {room.category} • {room.isPrivate ? "Private" : "Public"}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={styles.tabsRow}>
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
            <button
              style={selectedPanel === "participants" ? styles.tabActive : styles.tab}
              onClick={() => setSelectedPanel("participants")}
            >
              Participants
            </button>
            <button
              style={selectedPanel === "controls" ? styles.tabActive : styles.tab}
              onClick={() => setSelectedPanel("controls")}
            >
              Controls
            </button>
          </div>

          {selectedPanel === "chat" && (
            <section style={styles.panelCard}>
              <div style={styles.panelTopRow}>
                <div>
                  <div style={styles.panelTitle}>Room Chat</div>
                  <div style={styles.panelSubtext}>
                    Focused conversation for {selectedRoom?.name || "this room"}.
                  </div>
                </div>
              </div>

              <div style={styles.messageList}>
                {roomMessages.length === 0 ? (
                  <div style={styles.emptyState}>No messages yet.</div>
                ) : (
                  roomMessages.map((message) => (
                    <div key={message.id} style={styles.messageCard}>
                      <div style={styles.messageMeta}>
                        <span style={styles.messageSender}>{message.sender}</span>
                        <span style={styles.messageTime}>{message.time}</span>
                      </div>
                      <div style={styles.messageText}>{message.text}</div>
                    </div>
                  ))
                )}
              </div>

              <div style={styles.composerRow}>
                <input
                  style={styles.composerInput}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type a message..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSendMessage();
                    }
                  }}
                />
                <button style={styles.primaryButton} onClick={handleSendMessage}>
                  Send
                </button>
              </div>
            </section>
          )}

          {selectedPanel === "bulletin" && (
            <section style={styles.panelCard}>
              <div style={styles.panelTopRow}>
                <div>
                  <div style={styles.panelTitle}>Convention Bulletin Board</div>
                  <div style={styles.panelSubtext}>
                    Short notices stay in ticker mode. Large imported files switch to Reader Mode automatically.
                  </div>
                </div>
              </div>

              <div style={styles.bulletinActionRow}>
                <input
                  style={styles.composerInput}
                  value={newAnnouncement}
                  onChange={(e) => setNewAnnouncement(e.target.value)}
                  placeholder="Add single announcement..."
                />
                <button style={styles.primaryButton} onClick={handleAnnouncementAdd}>
                  Add
                </button>
                <button style={styles.secondaryButton} onClick={triggerBulletinFile}>
                  Import Text File
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt"
                  style={{ display: "none" }}
                  onChange={handleBulletinUpload}
                />
              </div>

              <div style={styles.bulletinStatusBar}>
                {useReaderMode
                  ? `Reader Mode • ${roomBulletins.length} lines • ${readerPaused ? "Paused" : "Auto-advancing"}`
                  : `Ticker Mode • ${roomBulletins.length} lines • ${tickerDurationSeconds} second cycle`}
              </div>

              {!useReaderMode && (
                <div style={styles.marqueeShell}>
                  <div
                    style={{
                      ...styles.marqueeTrack,
                      animationDuration: `${tickerDurationSeconds}s`,
                    }}
                  >
                    {marqueeItems.map((item, index) => (
                      <span key={`${item}-${index}`} style={styles.marqueeItem}>
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {useReaderMode && (
                <div style={styles.readerShell}>
                  <div style={styles.readerHeaderRow}>
                    <div style={styles.readerTitle}>Bulletin Reader</div>
                    <div style={styles.readerCount}>
                      Line {Math.min(readerIndex + 1, Math.max(roomBulletins.length, 1))} of{" "}
                      {Math.max(roomBulletins.length, 1)}
                    </div>
                  </div>

                  <div style={styles.readerViewport}>
                    {readerWindow[0] ? (
                      <div style={styles.readerLineMuted}>{readerWindow[0]}</div>
                    ) : (
                      <div style={styles.readerSpacer} />
                    )}

                    <div style={styles.readerLineActive}>
                      {readerWindow[1] || "No bulletin text loaded."}
                    </div>

                    {readerWindow[2] ? (
                      <div style={styles.readerLineNext}>{readerWindow[2]}</div>
                    ) : (
                      <div style={styles.readerSpacer} />
                    )}

                    {readerWindow[3] ? (
                      <div style={styles.readerLineMuted}>{readerWindow[3]}</div>
                    ) : (
                      <div style={styles.readerSpacer} />
                    )}
                  </div>

                  <div style={styles.readerControls}>
                    <button style={styles.secondaryButton} onClick={readerPrev}>
                      Previous
                    </button>
                    <button style={styles.primaryButton} onClick={toggleReaderPause}>
                      {readerPaused ? "Resume" : "Pause"}
                    </button>
                    <button style={styles.secondaryButton} onClick={readerNext}>
                      Next
                    </button>
                    <button style={styles.secondaryButton} onClick={readerReset}>
                      Reset
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          {selectedPanel === "participants" && (
            <section style={styles.panelCard}>
              <div style={styles.panelTopRow}>
                <div>
                  <div style={styles.panelTitle}>Participants</div>
                  <div style={styles.panelSubtext}>Visible presence for the active room.</div>
                </div>
              </div>

              <div style={styles.participantGrid}>
                {roomParticipants.map((name, index) => (
                  <div key={`${name}-${index}`} style={styles.participantCard}>
                    <div style={styles.participantAvatar}>{initials(name)}</div>
                    <div>
                      <div style={styles.participantName}>{name}</div>
                      <div style={styles.participantRole}>
                        {name === displayName ? "You" : index === 0 ? "Host" : "Participant"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {selectedPanel === "controls" && (
            <section style={styles.panelCard}>
              <div style={styles.panelTopRow}>
                <div>
                  <div style={styles.panelTitle}>Room Controls</div>
                  <div style={styles.panelSubtext}>
                    Organized admin actions without crowding the stage.
                  </div>
                </div>
              </div>

              <div style={styles.controlGrid}>
                <div style={styles.controlBox}>
                  <div style={styles.controlBoxTitle}>Identity</div>
                  <input
                    style={styles.composerInput}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Display name"
                  />
                </div>

                <div style={styles.controlBox}>
                  <div style={styles.controlBoxTitle}>Create Room</div>
                  <div style={styles.inlineRow}>
                    <input
                      style={styles.composerInput}
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      placeholder="New room name"
                    />
                    <button style={styles.primaryButton} onClick={handleCreateRoom}>
                      Create
                    </button>
                  </div>
                </div>

                <div style={styles.controlBox}>
                  <div style={styles.controlBoxTitle}>Visibility</div>
                  <div style={styles.inlineRowWrap}>
                    <button style={styles.secondaryButton} onClick={toggleRoomPrivacy}>
                      Make {roomIsPrivate ? "Public" : "Private"}
                    </button>
                    <button style={styles.secondaryButton} onClick={toggleRoomLock}>
                      {roomLocked ? "Unlock Room" : "Lock Room"}
                    </button>
                  </div>
                </div>

                <div style={styles.controlBox}>
                  <div style={styles.controlBoxTitle}>
                    {(selectedRoom?.name || "Room")} Invite Link
                  </div>
                  <div style={styles.summaryList}>
                    <div style={styles.summaryRow}>
                      <span>Current room</span>
                      <strong>{selectedRoom?.name || "—"}</strong>
                    </div>
                  </div>
                  <textarea
                    readOnly
                    value={inviteLink}
                    style={styles.inviteTextarea}
                  />
                  <div style={styles.inlineRowWrap}>
                    <button style={styles.primaryButton} onClick={copyInviteLink}>
                      Copy {(selectedRoom?.name || "Room")} Link
                    </button>
                  </div>
                </div>

                <div style={styles.controlBox}>
                  <div style={styles.controlBoxTitle}>Room Summary</div>
                  <div style={styles.summaryList}>
                    <div style={styles.summaryRow}>
                      <span>Room</span>
                      <strong>{selectedRoom?.name || "—"}</strong>
                    </div>
                    <div style={styles.summaryRow}>
                      <span>Host</span>
                      <strong>{selectedRoom?.host || "Admin"}</strong>
                    </div>
                    <div style={styles.summaryRow}>
                      <span>Mode</span>
                      <strong>
                        {screenShareOn ? "Screen Share Live" : cameraOn ? "Camera Live" : "Idle"}
                      </strong>
                    </div>
                    <div style={styles.summaryRow}>
                      <span>Admin</span>
                      <strong>{isAdmin ? "Yes" : "No"}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}
        </section>
      </main>

      <style>{`
        @keyframes stroBulletinScroll {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }

        body {
          margin: 0;
          background: #08111f;
          font-family: Inter, Arial, Helvetica, sans-serif;
        }

        * {
          box-sizing: border-box;
        }

        ::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }

        ::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.05);
          border-radius: 999px;
        }

        ::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.16);
          border-radius: 999px;
        }
      `}</style>
    </div>
  );
}

function enableAudioTracks(stream, enabled) {
  stream.getAudioTracks().forEach((track) => {
    track.enabled = enabled;
  });
}

function timeNow() {
  return new Date().toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function initials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() || "")
    .join("");
}

const styles = {
  appShell: {
    minHeight: "100vh",
    position: "relative",
    color: "#ecf3ff",
    background: "linear-gradient(180deg, #08111f 0%, #0d1728 42%, #111d31 100%)",
    overflowX: "hidden",
  },
  appBackground: {
    position: "fixed",
    inset: 0,
    background:
      "radial-gradient(circle at top left, rgba(69,121,255,0.16), transparent 28%), radial-gradient(circle at top right, rgba(0,217,255,0.08), transparent 24%), radial-gradient(circle at bottom center, rgba(255,255,255,0.03), transparent 35%)",
    pointerEvents: "none",
  },
  header: {
    position: "sticky",
    top: 0,
    zIndex: 50,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    padding: "16px 24px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    backdropFilter: "blur(18px)",
    background: "rgba(7, 14, 24, 0.84)",
    boxShadow: "0 8px 28px rgba(0,0,0,0.18)",
  },
  brandRow: {
    display: "flex",
    alignItems: "center",
    gap: 14,
  },
  brandBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(135deg, #4d79ff, #18d2ff)",
    color: "white",
    fontWeight: 800,
    letterSpacing: 0.4,
    boxShadow: "0 12px 30px rgba(24, 210, 255, 0.18)",
  },
  title: {
    margin: 0,
    fontSize: 24,
    fontWeight: 800,
    letterSpacing: 0.15,
  },
  subtitle: {
    color: "rgba(236,243,255,0.64)",
    fontSize: 12,
    marginTop: 3,
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  headerStatus: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 14px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.04)",
    color: "rgba(236,243,255,0.88)",
    fontSize: 13,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    background: "#38d27a",
    boxShadow: "0 0 0 4px rgba(56, 210, 122, 0.14)",
  },
  userPill: {
    padding: "10px 14px",
    borderRadius: 999,
    background: "rgba(77,121,255,0.14)",
    border: "1px solid rgba(77,121,255,0.24)",
    color: "#dce7ff",
    fontWeight: 700,
    fontSize: 13,
  },
  main: {
    width: "100%",
    maxWidth: 1440,
    margin: "0 auto",
    padding: "20px 18px 42px",
  },
  stageSection: {
    marginBottom: 16,
  },
  stageCard: {
    borderRadius: 30,
    padding: 20,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.025))",
    boxShadow: "0 20px 55px rgba(0,0,0,0.28)",
  },
  stageHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  stageTitle: {
    fontSize: 26,
    fontWeight: 800,
    marginBottom: 4,
  },
  stageSubtitle: {
    color: "rgba(236,243,255,0.66)",
    fontSize: 14,
  },
  stageMetaWrap: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  metaPill: {
    padding: "9px 12px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "rgba(236,243,255,0.84)",
    fontSize: 12,
    fontWeight: 700,
  },
  stageViewport: {
    position: "relative",
    width: "100%",
    aspectRatio: "16 / 9",
    borderRadius: 26,
    overflow: "hidden",
    background: "linear-gradient(180deg, rgba(7,12,22,0.94), rgba(10,18,30,0.98))",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
  },
  stageVideo: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
    background: "#02060c",
  },
  stagePlaceholder: {
    width: "100%",
    height: "100%",
    display: "grid",
    placeItems: "center",
    textAlign: "center",
    padding: 28,
    background: "radial-gradient(circle at center, rgba(77,121,255,0.12), transparent 32%)",
  },
  stagePlaceholderIcon: {
    fontSize: 46,
    marginBottom: 10,
  },
  stagePlaceholderTitle: {
    fontSize: 22,
    fontWeight: 800,
    marginBottom: 8,
  },
  stagePlaceholderText: {
    color: "rgba(236,243,255,0.66)",
    maxWidth: 480,
    lineHeight: 1.55,
  },
  stageDockCluster: {
    position: "absolute",
    right: 16,
    bottom: 16,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    alignItems: "flex-end",
  },
  dockCardButton: {
    width: 236,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(7, 14, 24, 0.9)",
    borderRadius: 20,
    padding: 10,
    textAlign: "left",
    cursor: "pointer",
    color: "#ecf3ff",
    boxShadow: "0 18px 40px rgba(0,0,0,0.30)",
  },
  dockLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: "rgba(236,243,255,0.78)",
    marginBottom: 8,
  },
  dockVideo: {
    width: "100%",
    aspectRatio: "16 / 9",
    borderRadius: 14,
    background: "#02060c",
    objectFit: "cover",
    display: "block",
  },
  dockHint: {
    marginTop: 8,
    fontSize: 11,
    color: "rgba(236,243,255,0.56)",
  },
  floatingCameraCard: {
    width: 176,
    borderRadius: 20,
    padding: 10,
    background: "rgba(7, 14, 24, 0.92)",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 18px 40px rgba(0,0,0,0.30)",
  },
  floatingCameraHeader: {
    fontSize: 12,
    fontWeight: 700,
    color: "rgba(236,243,255,0.8)",
    marginBottom: 8,
  },
  floatingCameraVideo: {
    width: "100%",
    aspectRatio: "4 / 3",
    borderRadius: 14,
    background: "#02060c",
    objectFit: "cover",
    display: "block",
  },
  controlSection: {
    marginBottom: 18,
  },
  controlBar: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    padding: "14px 16px",
    borderRadius: 24,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 12px 30px rgba(0,0,0,0.18)",
  },
  controlButton: {
    padding: "11px 16px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.05)",
    color: "#ecf3ff",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 13,
    transition: "transform 0.15s ease",
  },
  controlButtonActive: {
    padding: "11px 16px",
    borderRadius: 14,
    border: "1px solid rgba(56,210,122,0.24)",
    background: "rgba(56,210,122,0.18)",
    color: "#f3fff7",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 13,
  },
  controlButtonShare: {
    padding: "11px 16px",
    borderRadius: 14,
    border: "1px solid rgba(24,210,255,0.26)",
    background: "rgba(24,210,255,0.16)",
    color: "#ecfcff",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 13,
  },
  controlButtonAccent: {
    padding: "11px 16px",
    borderRadius: 14,
    border: "1px solid rgba(77,121,255,0.28)",
    background: "rgba(77,121,255,0.18)",
    color: "#ecf2ff",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 13,
  },
  controlButtonDisabled: {
    padding: "11px 16px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.05)",
    background: "rgba(255,255,255,0.025)",
    color: "rgba(236,243,255,0.40)",
    cursor: "not-allowed",
    fontWeight: 700,
    fontSize: 13,
  },
  leaveButton: {
    padding: "11px 16px",
    borderRadius: 14,
    border: "1px solid rgba(255,100,100,0.22)",
    background: "rgba(255,100,100,0.14)",
    color: "#ffecec",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 13,
  },
  contentSection: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  roomRailCard: {
    borderRadius: 26,
    padding: 18,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.04)",
    boxShadow: "0 12px 30px rgba(0,0,0,0.18)",
  },
  panelTopRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  panelTitle: {
    fontSize: 20,
    fontWeight: 800,
    marginBottom: 4,
  },
  panelSubtext: {
    color: "rgba(236,243,255,0.62)",
    fontSize: 13,
    lineHeight: 1.5,
  },
  searchInput: {
    width: "100%",
    padding: "13px 14px",
    borderRadius: 14,
    outline: "none",
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(5,10,18,0.48)",
    color: "#ecf3ff",
    marginBottom: 14,
  },
  roomRail: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: 12,
  },
  roomChip: {
    textAlign: "left",
    padding: "14px 14px",
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.07)",
    background: "rgba(255,255,255,0.04)",
    cursor: "pointer",
    color: "#ecf3ff",
  },
  roomChipActive: {
    textAlign: "left",
    padding: "14px 14px",
    borderRadius: 18,
    border: "1px solid rgba(77,121,255,0.28)",
    background: "rgba(77,121,255,0.16)",
    cursor: "pointer",
    color: "#ecf3ff",
    boxShadow: "0 10px 24px rgba(77,121,255,0.14)",
  },
  roomChipTitle: {
    fontSize: 15,
    fontWeight: 800,
    marginBottom: 4,
  },
  roomChipMeta: {
    fontSize: 12,
    color: "rgba(236,243,255,0.62)",
  },
  tabsRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  tab: {
    padding: "11px 16px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.07)",
    background: "rgba(255,255,255,0.04)",
    color: "#ecf3ff",
    cursor: "pointer",
    fontWeight: 700,
  },
  tabActive: {
    padding: "11px 16px",
    borderRadius: 14,
    border: "1px solid rgba(24,210,255,0.24)",
    background: "rgba(24,210,255,0.14)",
    color: "#f3feff",
    cursor: "pointer",
    fontWeight: 800,
    boxShadow: "0 8px 18px rgba(24,210,255,0.10)",
  },
  panelCard: {
    borderRadius: 26,
    padding: 18,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.04)",
    boxShadow: "0 12px 30px rgba(0,0,0,0.18)",
  },
  messageList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    marginBottom: 14,
  },
  messageCard: {
    borderRadius: 18,
    padding: "12px 14px",
    border: "1px solid rgba(255,255,255,0.06)",
    background: "rgba(5,10,18,0.42)",
  },
  messageMeta: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 6,
    fontSize: 12,
    color: "rgba(236,243,255,0.58)",
  },
  messageSender: {
    fontWeight: 800,
    color: "#ecf3ff",
  },
  messageTime: {
    color: "rgba(236,243,255,0.50)",
  },
  messageText: {
    color: "#eff5ff",
    lineHeight: 1.55,
  },
  composerRow: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
  },
  composerInput: {
    flex: 1,
    minWidth: 220,
    padding: "13px 14px",
    borderRadius: 14,
    outline: "none",
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(5,10,18,0.48)",
    color: "#ecf3ff",
  },
  primaryButton: {
    padding: "12px 16px",
    borderRadius: 14,
    border: "1px solid rgba(24,210,255,0.22)",
    background: "rgba(24,210,255,0.18)",
    color: "#f3feff",
    cursor: "pointer",
    fontWeight: 800,
  },
  secondaryButton: {
    padding: "12px 16px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.05)",
    color: "#ecf3ff",
    cursor: "pointer",
    fontWeight: 700,
  },
  bulletinActionRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    alignItems: "center",
    marginBottom: 14,
  },
  bulletinStatusBar: {
    marginBottom: 12,
    padding: "10px 12px",
    borderRadius: 14,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.07)",
    color: "rgba(236,243,255,0.78)",
    fontSize: 13,
    fontWeight: 600,
  },
  marqueeShell: {
    overflow: "hidden",
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(5,10,18,0.48)",
    padding: "12px 0",
  },
  marqueeTrack: {
    display: "inline-flex",
    gap: 24,
    whiteSpace: "nowrap",
    minWidth: "max-content",
    animation: "stroBulletinScroll linear infinite",
    paddingLeft: 18,
    paddingRight: 18,
  },
  marqueeItem: {
    fontWeight: 700,
    color: "#ecf6ff",
    paddingRight: 18,
    borderRight: "1px solid rgba(255,255,255,0.10)",
  },
  readerShell: {
    borderRadius: 22,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(5,10,18,0.48)",
    padding: 16,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
  },
  readerHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    marginBottom: 14,
    flexWrap: "wrap",
  },
  readerTitle: {
    fontWeight: 800,
    fontSize: 16,
  },
  readerCount: {
    fontSize: 13,
    color: "rgba(236,243,255,0.70)",
  },
  readerViewport: {
    minHeight: 230,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.06)",
    background: "rgba(255,255,255,0.03)",
    padding: 16,
    display: "grid",
    gridTemplateRows: "1fr 1.35fr 1fr 1fr",
    gap: 10,
    marginBottom: 14,
  },
  readerLineMuted: {
    color: "rgba(236,243,255,0.42)",
    fontSize: 15,
    lineHeight: 1.55,
  },
  readerLineActive: {
    color: "#ffffff",
    fontSize: 18,
    lineHeight: 1.6,
    fontWeight: 800,
    padding: "10px 12px",
    borderRadius: 14,
    background: "rgba(24,210,255,0.10)",
    border: "1px solid rgba(24,210,255,0.16)",
  },
  readerLineNext: {
    color: "rgba(236,243,255,0.76)",
    fontSize: 16,
    lineHeight: 1.55,
  },
  readerSpacer: {
    minHeight: 20,
  },
  readerControls: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    alignItems: "center",
  },
  participantGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 12,
  },
  participantCard: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    borderRadius: 18,
    padding: "14px",
    border: "1px solid rgba(255,255,255,0.06)",
    background: "rgba(5,10,18,0.42)",
  },
  participantAvatar: {
    width: 46,
    height: 46,
    borderRadius: 14,
    display: "grid",
    placeItems: "center",
    fontWeight: 800,
    color: "white",
    background: "linear-gradient(135deg, #4d79ff, #18d2ff)",
    boxShadow: "0 8px 22px rgba(77,121,255,0.18)",
  },
  participantName: {
    fontWeight: 800,
    marginBottom: 4,
  },
  participantRole: {
    fontSize: 12,
    color: "rgba(236,243,255,0.60)",
  },
  controlGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 14,
  },
  controlBox: {
    borderRadius: 22,
    padding: 14,
    border: "1px solid rgba(255,255,255,0.06)",
    background: "rgba(5,10,18,0.42)",
  },
  controlBoxTitle: {
    fontSize: 15,
    fontWeight: 800,
    marginBottom: 12,
  },
  inlineRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    alignItems: "center",
  },
  inlineRowWrap: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  summaryList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    marginBottom: 12,
  },
  summaryRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 14,
    paddingBottom: 8,
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    color: "rgba(236,243,255,0.82)",
  },
  inviteTextarea: {
    width: "100%",
    minHeight: 84,
    resize: "vertical",
    padding: "12px 14px",
    borderRadius: 14,
    outline: "none",
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(5,10,18,0.48)",
    color: "#ecf3ff",
    marginBottom: 12,
    fontFamily: "inherit",
  },
  emptyState: {
    padding: "18px 16px",
    borderRadius: 18,
    border: "1px dashed rgba(255,255,255,0.12)",
    color: "rgba(236,243,255,0.56)",
    background: "rgba(255,255,255,0.03)",
  },
};

export default App;