import { useEffect, useRef, useState } from "react";

const API_BASE = "http://127.0.0.1:8787";

export default function App() {
  const cameraStageVideoRef = useRef(null);
  const cameraFloatVideoRef = useRef(null);
  const shareMainVideoRef = useRef(null);
  const shareDockVideoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const shareStreamRef = useRef(null);
  const bulletinInputRef = useRef(null);

  const [selectedRoom, setSelectedRoom] = useState("Main Convention Hall");
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [statusText, setStatusText] = useState("System ready");
  const [programLive, setProgramLive] = useState(false);

  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState("");

  const [shareOn, setShareOn] = useState(false);
  const [shareExpanded, setShareExpanded] = useState(false);
  const [shareError, setShareError] = useState("");

  const [bulletinText, setBulletinText] = useState(
    "Convention announcements will appear here after you load a text file."
  );
  const [bulletinFileName, setBulletinFileName] = useState("");
  const [bulletinStatus, setBulletinStatus] = useState("No bulletin file loaded.");
  const [bulletinLoading, setBulletinLoading] = useState(true);
  const [bulletinSaving, setBulletinSaving] = useState(false);

  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(true);
  const [chatSending, setChatSending] = useState(false);
  const [roomSaving, setRoomSaving] = useState(false);
  const [roomDeleting, setRoomDeleting] = useState(false);
  const [roomFormName, setRoomFormName] = useState("");
  const [roomFormMeta, setRoomFormMeta] = useState("");
  const [dataError, setDataError] = useState("");

  const participants = [
    { id: 1, name: "Host Camera", role: "Primary Feed", status: "Online" },
    { id: 2, name: "Convention Desk", role: "Moderator", status: "Online" },
    { id: 3, name: "Program Director", role: "Speaker", status: "Online" },
    { id: 4, name: "Music Cue", role: "Support", status: "Standby" },
  ];

  function syncSelectedRoom(roomsList, preferredId = null) {
    if (!Array.isArray(roomsList) || roomsList.length === 0) {
      setSelectedRoom("");
      setSelectedRoomId(null);
      setRoomFormName("");
      setRoomFormMeta("");
      return;
    }

    let targetRoom =
      roomsList.find((room) => Number(room.id) === Number(preferredId)) ||
      roomsList.find((room) => Number(room.id) === Number(selectedRoomId)) ||
      roomsList.find((room) => room.name === selectedRoom) ||
      roomsList[0];

    setSelectedRoom(targetRoom.name);
    setSelectedRoomId(targetRoom.id);
    setRoomFormName(targetRoom.name);
    setRoomFormMeta(targetRoom.meta || "");
  }

  async function loadRooms(preferredId = null) {
    try {
      setRoomsLoading(true);
      setDataError("");
      const response = await fetch(`${API_BASE}/api/rooms`);
      if (!response.ok) {
        throw new Error("Could not load rooms.");
      }
      const data = await response.json();
      const nextRooms = Array.isArray(data) ? data : [];
      setRooms(nextRooms);
      syncSelectedRoom(nextRooms, preferredId);
    } catch (error) {
      setDataError(error.message || "Room data failed to load.");
    } finally {
      setRoomsLoading(false);
    }
  }

  async function loadChat({ silent = false } = {}) {
    try {
      if (!silent) {
        setChatLoading(true);
      }
      setDataError("");
      const response = await fetch(`${API_BASE}/api/chat`);
      if (!response.ok) {
        throw new Error("Could not load chat.");
      }
      const data = await response.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch (error) {
      setDataError(error.message || "Chat data failed to load.");
    } finally {
      if (!silent) {
        setChatLoading(false);
      }
    }
  }

  async function loadBulletin({ silent = false } = {}) {
    try {
      if (!silent) {
        setBulletinLoading(true);
      }
      setDataError("");
      const response = await fetch(`${API_BASE}/api/bulletin`);
      if (!response.ok) {
        throw new Error("Could not load bulletin.");
      }
      const data = await response.json();
      setBulletinText(typeof data.text === "string" ? data.text : "");
      setBulletinFileName(typeof data.fileName === "string" ? data.fileName : "");
      setBulletinStatus(
        typeof data.status === "string" ? data.status : "No bulletin file loaded."
      );
    } catch (error) {
      setDataError(error.message || "Bulletin data failed to load.");
    } finally {
      if (!silent) {
        setBulletinLoading(false);
      }
    }
  }

  async function handleCreateRoom() {
    const name = roomFormName.trim();
    const meta = roomFormMeta.trim();

    if (!name) {
      setStatusText("Room name is required");
      return;
    }

    try {
      setRoomSaving(true);
      setDataError("");
      const response = await fetch(`${API_BASE}/api/rooms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, meta }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Could not create room.");
      }

      const created = await response.json();
      setStatusText(`Room created: ${created.name}`);
      await loadRooms(created.id);
    } catch (error) {
      setDataError(error.message || "Room create failed.");
      setStatusText("Room create failed");
    } finally {
      setRoomSaving(false);
    }
  }

  async function handleUpdateRoom() {
    if (!selectedRoomId) {
      setStatusText("Select a room first");
      return;
    }

    const name = roomFormName.trim();
    const meta = roomFormMeta.trim();

    if (!name) {
      setStatusText("Room name is required");
      return;
    }

    try {
      setRoomSaving(true);
      setDataError("");
      const response = await fetch(`${API_BASE}/api/rooms/${selectedRoomId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, meta }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Could not update room.");
      }

      const updated = await response.json();
      setStatusText(`Room updated: ${updated.name}`);
      await loadRooms(updated.id);
    } catch (error) {
      setDataError(error.message || "Room update failed.");
      setStatusText("Room update failed");
    } finally {
      setRoomSaving(false);
    }
  }

  async function handleDeleteRoom() {
    if (!selectedRoomId) {
      setStatusText("Select a room first");
      return;
    }

    const confirmed = window.confirm(`Delete room "${selectedRoom}"?`);
    if (!confirmed) return;

    try {
      setRoomDeleting(true);
      setDataError("");
      const response = await fetch(`${API_BASE}/api/rooms/${selectedRoomId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Could not delete room.");
      }

      setStatusText(`Room deleted: ${selectedRoom}`);
      await loadRooms();
    } catch (error) {
      setDataError(error.message || "Room delete failed.");
      setStatusText("Room delete failed");
    } finally {
      setRoomDeleting(false);
    }
  }

  function handleNewRoomDraft() {
    setSelectedRoom("");
    setSelectedRoomId(null);
    setRoomFormName("");
    setRoomFormMeta("");
    setStatusText("New room draft ready");
  }

  async function startCamera() {
    setCameraError("");
    setStatusText("Starting camera...");

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("This browser does not support webcam access.");
      }

      stopCamera();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      cameraStreamRef.current = stream;
      setCameraOn(true);

      if (shareOn) {
        setStatusText("Camera is live in floating host box");
      } else {
        setStatusText("Camera is live on main stage");
      }
    } catch (error) {
      const message =
        error && error.message ? error.message : "Camera could not be started.";
      setCameraError(message);
      setCameraOn(false);
      setStatusText("Camera failed");
    }
  }

  function stopCamera() {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }

    if (cameraStageVideoRef.current) {
      cameraStageVideoRef.current.pause();
      cameraStageVideoRef.current.srcObject = null;
    }

    if (cameraFloatVideoRef.current) {
      cameraFloatVideoRef.current.pause();
      cameraFloatVideoRef.current.srcObject = null;
    }

    setCameraOn(false);
    setStatusText("Camera stopped");
  }

  async function startShare() {
    setShareError("");
    setStatusText("Starting screen share...");

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        throw new Error("This browser does not support screen sharing.");
      }

      stopShare();

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      const videoTrack = stream.getVideoTracks()[0];

      if (videoTrack) {
        videoTrack.onended = () => {
          stopShare();
        };
      }

      shareStreamRef.current = stream;
      setShareOn(true);
      setShareExpanded(false);

      if (cameraOn) {
        setStatusText("Screen share is live in dock box • host moved to floating camera box");
      } else {
        setStatusText("Screen share is live in dock box");
      }
    } catch (error) {
      const message =
        error && error.message ? error.message : "Screen share could not be started.";
      setShareError(message);
      setShareOn(false);
      setShareExpanded(false);
      setStatusText("Screen share failed");
    }
  }

  function stopShare() {
    if (shareStreamRef.current) {
      shareStreamRef.current.getTracks().forEach((track) => track.stop());
      shareStreamRef.current = null;
    }

    if (shareMainVideoRef.current) {
      shareMainVideoRef.current.pause();
      shareMainVideoRef.current.srcObject = null;
    }

    if (shareDockVideoRef.current) {
      shareDockVideoRef.current.pause();
      shareDockVideoRef.current.srcObject = null;
    }

    setShareOn(false);
    setShareExpanded(false);

    if (cameraOn) {
      setStatusText("Screen share stopped • camera returned to main stage");
    } else {
      setStatusText("Screen share stopped");
    }
  }

  function toggleShareView() {
    if (!shareOn) {
      setStatusText("Start screen share first");
      return;
    }

    if (shareExpanded) {
      setShareExpanded(false);
      setStatusText("Screen share returned to dock box");
    } else {
      setShareExpanded(true);
      setStatusText("Screen share expanded to main stage");
    }
  }

  function handleGoLive() {
    setProgramLive(true);
    setStatusText("Program is now live");
  }

  function handleEndLive() {
    setProgramLive(false);
    setStatusText("Program is no longer live");
  }

  function handleSelectRoom(room) {
    setSelectedRoom(room.name);
    setSelectedRoomId(room.id);
    setRoomFormName(room.name);
    setRoomFormMeta(room.meta || "");
    setStatusText(`Selected room: ${room.name}`);
  }

  function handleBulletinOpen() {
    if (bulletinInputRef.current) {
      bulletinInputRef.current.click();
    }
    setStatusText("Bulletin board ready for file import");
  }

  async function saveBulletinToServer(fileName, text) {
    const response = await fetch(`${API_BASE}/api/bulletin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileName,
        text,
      }),
    });

    if (!response.ok) {
      throw new Error("Could not save bulletin.");
    }

    return response.json();
  }

  function handleBulletinFileChange(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const isTextFile =
      file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt");

    if (!isTextFile) {
      setBulletinStatus("Only .txt bulletin files are supported right now.");
      return;
    }

    const reader = new FileReader();

    reader.onload = async function (loadEvent) {
      const text = loadEvent.target?.result;

      try {
        setBulletinSaving(true);
        const safeText = typeof text === "string" ? text : "";
        const saved = await saveBulletinToServer(file.name, safeText);

        setBulletinText(saved.text || "");
        setBulletinFileName(saved.fileName || "");
        setBulletinStatus(saved.status || `Loaded bulletin file: ${file.name}`);
        setStatusText(`Bulletin loaded: ${file.name}`);
      } catch (error) {
        setDataError(error.message || "Bulletin save failed.");
        setStatusText("Bulletin save failed");
      } finally {
        setBulletinSaving(false);
      }
    };

    reader.onerror = function () {
      setBulletinStatus("The bulletin file could not be read.");
      setStatusText("Bulletin load failed");
    };

    reader.readAsText(file);
  }

  async function handleSendMessage() {
    const trimmed = chatInput.trim();

    if (!trimmed) {
      setStatusText("Type a message before sending");
      return;
    }

    try {
      setChatSending(true);
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          author: "You",
          role: "Host",
          text: trimmed,
        }),
      });

      if (!response.ok) {
        throw new Error("Could not send message.");
      }

      setChatInput("");
      setStatusText("Message sent to chat");
      await loadChat({ silent: true });
    } catch (error) {
      setDataError(error.message || "Chat send failed.");
      setStatusText("Chat send failed");
    } finally {
      setChatSending(false);
    }
  }

  function handleChatKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  }

  useEffect(() => {
    loadRooms();
    loadChat();
    loadBulletin();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      loadChat({ silent: true });
      loadBulletin({ silent: true });
    }, 3000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    async function attachStreamToVideo(videoRef, stream) {
      if (!videoRef.current || !stream) return;

      try {
        if (videoRef.current.srcObject !== stream) {
          videoRef.current.srcObject = stream;
        }
        await videoRef.current.play().catch(() => {});
      } catch (error) {
        const message =
          error && error.message
            ? error.message
            : "Video preview could not start.";
        setCameraError(message);
        setStatusText("Camera preview failed");
      }
    }

    async function clearVideo(videoRef) {
      if (!videoRef.current) return;
      try {
        videoRef.current.pause();
      } catch {
        // ignore
      }
      videoRef.current.srcObject = null;
    }

    async function attachCamera() {
      if (!cameraOn || !cameraStreamRef.current) {
        clearVideo(cameraStageVideoRef);
        clearVideo(cameraFloatVideoRef);
        return;
      }

      if (shareOn) {
        clearVideo(cameraStageVideoRef);
        await attachStreamToVideo(cameraFloatVideoRef, cameraStreamRef.current);
      } else {
        clearVideo(cameraFloatVideoRef);
        await attachStreamToVideo(cameraStageVideoRef, cameraStreamRef.current);
      }
    }

    attachCamera();
  }, [cameraOn, shareOn, shareExpanded]);

  useEffect(() => {
    async function attachShareToVideo(videoRef, stream) {
      if (!videoRef.current || !stream) return;

      try {
        if (videoRef.current.srcObject !== stream) {
          videoRef.current.srcObject = stream;
        }
        await videoRef.current.play().catch(() => {});
      } catch (error) {
        const message =
          error && error.message
            ? error.message
            : "Screen share preview could not start.";
        setShareError(message);
        setStatusText("Screen share preview failed");
      }
    }

    async function clearVideo(videoRef) {
      if (!videoRef.current) return;
      try {
        videoRef.current.pause();
      } catch {
        // ignore
      }
      videoRef.current.srcObject = null;
    }

    async function attachShare() {
      if (shareOn && shareStreamRef.current) {
        await attachShareToVideo(shareDockVideoRef, shareStreamRef.current);

        if (shareExpanded) {
          await attachShareToVideo(shareMainVideoRef, shareStreamRef.current);
        } else {
          clearVideo(shareMainVideoRef);
        }
      } else {
        clearVideo(shareDockVideoRef);
        clearVideo(shareMainVideoRef);
      }
    }

    attachShare();
  }, [shareOn, shareExpanded]);

  useEffect(() => {
    return () => {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      }

      if (shareStreamRef.current) {
        shareStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const showFloatingCamera = shareOn && cameraOn;
  const showDockShare = shareOn && !shareExpanded;
  const showExpandedShare = shareOn && shareExpanded;
  const onlineCount = participants.filter((p) => p.status === "Online").length;

  return (
    <div style={appShell}>
      <div style={bgGlowOne} />
      <div style={bgGlowTwo} />

      <div style={pageWrap}>
        <header style={heroHeader}>
          <div style={heroContent}>
            <div style={eyebrow}>Stro Chievery</div>

            <h1 style={heroTitle}>Convention Broadcast Platform</h1>

            <p style={heroText}>
              Premium stage control with server-fed rooms, room admin tools, chat,
              bulletin board, live host camera, docked screen share, and participants.
            </p>

            <div style={heroStatsRow}>
              <StatusChip
                label={programLive ? "Program Live" : "Program Standby"}
                tone={programLive ? "green" : "slate"}
              />
              <StatusChip
                label={cameraOn ? "Camera Active" : "Camera Off"}
                tone={cameraOn ? "green" : "slate"}
              />
              <StatusChip
                label={shareOn ? (shareExpanded ? "Share on Stage" : "Share Docked") : "Share Off"}
                tone={shareOn ? "blue" : "slate"}
              />
              <StatusChip label={`${onlineCount} Online`} tone="purple" />
            </div>
          </div>

          <div style={heroActions}>
            <div style={topPill(programLive ? "green" : "slate")}>
              {programLive ? "● Live Now" : "● Standby"}
            </div>

            <div style={actionGrid}>
              <button onClick={handleGoLive} style={buttonPrimary}>
                Go Live
              </button>

              <button onClick={handleEndLive} style={buttonSecondary}>
                End Live
              </button>

              <button onClick={startCamera} style={buttonPurple}>
                Start Camera
              </button>

              <button onClick={stopCamera} style={buttonSecondary}>
                Stop Camera
              </button>

              <button onClick={startShare} style={buttonBlue}>
                Start Share
              </button>

              <button onClick={stopShare} style={buttonSecondary}>
                Stop Share
              </button>
            </div>
          </div>
        </header>

        {dataError ? <div style={dataErrorBox}>{dataError}</div> : null}

        <section style={mainGrid}>
          <aside style={sidebarPanel}>
            <div style={panelHeaderRow}>
              <div>
                <div style={sectionLabel}>Rooms</div>
                <div style={smallMutedText}>Choose the room feeding the main stage.</div>
              </div>

              <div style={miniBadge}>
                {roomsLoading ? "Loading..." : `${rooms.length} total`}
              </div>
            </div>

            <div style={roomListWrap}>
              {rooms.map((room) => {
                const active = selectedRoom === room.name;

                return (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => handleSelectRoom(room)}
                    style={roomCard(active)}
                  >
                    <div style={roomCardTopRow}>
                      <div style={roomName}>{room.name}</div>
                      <div style={roomDot(active)} />
                    </div>

                    <div style={roomMeta}>{room.meta}</div>
                  </button>
                );
              })}
            </div>

            <div style={roomAdminPanel}>
              <div style={sectionLabel}>Room Admin</div>

              <input
                value={roomFormName}
                onChange={(event) => setRoomFormName(event.target.value)}
                placeholder="Room name"
                style={textInput}
              />

              <textarea
                value={roomFormMeta}
                onChange={(event) => setRoomFormMeta(event.target.value)}
                placeholder="Room meta / description"
                rows={4}
                style={textAreaInput}
              />

              <div style={adminButtonGrid}>
                <button
                  type="button"
                  onClick={handleCreateRoom}
                  style={buttonPrimary}
                  disabled={roomSaving}
                >
                  {roomSaving ? "Saving..." : "Add Room"}
                </button>

                <button
                  type="button"
                  onClick={handleUpdateRoom}
                  style={buttonBlue}
                  disabled={roomSaving || !selectedRoomId}
                >
                  Update Room
                </button>

                <button
                  type="button"
                  onClick={handleDeleteRoom}
                  style={buttonDanger}
                  disabled={roomDeleting || !selectedRoomId}
                >
                  {roomDeleting ? "Deleting..." : "Delete Room"}
                </button>

                <button
                  type="button"
                  onClick={handleNewRoomDraft}
                  style={buttonSecondary}
                >
                  New Draft
                </button>
              </div>
            </div>
          </aside>

          <div style={centerColumn}>
            <section style={stagePanel}>
              <div style={stageHeaderRow}>
                <div>
                  <div style={sectionLabel}>Main Stage</div>
                  <h2 style={stageTitle}>{selectedRoom || "No room selected"}</h2>
                  <div style={smallMutedText}>Status: {statusText}</div>
                </div>

                <div style={stageHeaderActions}>
                  <div style={miniBadge}>
                    {shareOn
                      ? shareExpanded
                        ? "Share Fullscreen"
                        : "Share Docked"
                      : cameraOn
                        ? "Host Camera Live"
                        : "Stage Ready"}
                  </div>

                  <button onClick={handleBulletinOpen} style={buttonSecondary}>
                    Open Bulletin
                  </button>
                </div>
              </div>

              <div style={stageWrap}>
                <div style={stageGlow} />

                <div style={stageTopLeftBadges}>
                  <div style={stageGlassBadge}>{selectedRoom || "No room selected"}</div>

                  <div
                    style={stageGlassBadgeColor(
                      showExpandedShare
                        ? "blue"
                        : cameraOn && !shareOn
                          ? "green"
                          : shareOn
                            ? "blue"
                            : "slate"
                    )}
                  >
                    {showExpandedShare
                      ? "● Share on Stage"
                      : cameraOn && !shareOn
                        ? "● Host on Stage"
                        : shareOn
                          ? "● Share Active"
                          : "● Stage Idle"}
                  </div>
                </div>

                {showExpandedShare ? (
                  <video
                    ref={shareMainVideoRef}
                    autoPlay
                    playsInline
                    muted
                    style={stageVideo}
                  />
                ) : shareOn ? (
                  <div style={stageInfoScreen}>
                    <div style={stageInfoTitle}>Screen share is docked</div>

                    <div style={stageInfoText}>
                      The shared screen is parked in the TV dock box. Click the dock to bring it to the
                      main stage.
                      {cameraOn
                        ? " The host camera has moved into the floating box."
                        : " Start the camera to show the host in the floating box."}
                    </div>
                  </div>
                ) : cameraOn ? (
                  <video
                    ref={cameraStageVideoRef}
                    autoPlay
                    playsInline
                    muted
                    style={stageVideo}
                  />
                ) : (
                  <div style={stageInfoScreen}>
                    <div style={stageInfoTitle}>Stage camera area</div>

                    <div style={stageInfoText}>
                      Click <strong>Start Camera</strong> for webcam preview or <strong>Start Share</strong> to
                      place your screen into the dock box.
                    </div>

                    {cameraError ? <div style={errorBox}>Camera error: {cameraError}</div> : null}
                    {shareError ? <div style={errorBox}>Share error: {shareError}</div> : null}
                  </div>
                )}

                {showFloatingCamera ? (
                  <div style={floatingHostBox}>
                    <video
                      ref={cameraFloatVideoRef}
                      autoPlay
                      playsInline
                      muted
                      style={floatingVideo}
                    />

                    <div style={floatingLabel}>Host Camera</div>
                  </div>
                ) : null}

                {showDockShare ? (
                  <button
                    type="button"
                    onClick={toggleShareView}
                    title="Click to expand share to main stage"
                    style={shareDockButton}
                  >
                    <video
                      ref={shareDockVideoRef}
                      autoPlay
                      playsInline
                      muted
                      style={dockVideo}
                    />
                    <div style={dockOverlayLabel}>Share Dock — Click</div>
                  </button>
                ) : null}

                {showExpandedShare ? (
                  <button
                    type="button"
                    onClick={toggleShareView}
                    style={returnDockButton}
                  >
                    Return Share to Dock
                  </button>
                ) : null}

                <div
                  style={stageStateBadge(
                    shareOn ? "blue" : cameraOn ? "green" : "slate"
                  )}
                >
                  {shareOn
                    ? shareExpanded
                      ? "● Share Fullscreen"
                      : "● Share Docked"
                    : cameraOn
                      ? "● Camera Live"
                      : "● Stage Idle"}
                </div>

                <div style={stageFooterStrip}>
                  <div style={stageFooterItem}>
                    <span style={footerKeyDot(cameraOn ? "green" : "slate")} />
                    Camera {cameraOn ? "On" : "Off"}
                  </div>
                  <div style={stageFooterItem}>
                    <span style={footerKeyDot(shareOn ? "blue" : "slate")} />
                    Share {shareOn ? (shareExpanded ? "Expanded" : "Docked") : "Off"}
                  </div>
                  <div style={stageFooterItem}>
                    <span style={footerKeyDot(programLive ? "green" : "slate")} />
                    Program {programLive ? "Live" : "Standby"}
                  </div>
                </div>
              </div>
            </section>

            <section style={lowerGrid}>
              <div style={contentPanel}>
                <div style={panelHeaderRow}>
                  <div>
                    <div style={sectionLabel}>Live Chat</div>
                    <div style={smallMutedText}>
                      Server-fed room chat that refreshes automatically.
                    </div>
                  </div>

                  <div style={miniBadge}>
                    {chatLoading ? "Loading..." : `${messages.length} messages`}
                  </div>
                </div>

                <div style={chatFeed}>
                  {messages.map((message) => (
                    <div key={message.id} style={chatCard}>
                      <div style={chatCardTop}>
                        <div style={chatAuthor}>{message.author}</div>
                        <div style={chatTime}>{message.time}</div>
                      </div>

                      <div style={chatRole}>{message.role}</div>

                      <div style={chatText}>{message.text}</div>
                    </div>
                  ))}
                </div>

                <div style={chatComposer}>
                  <textarea
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                    onKeyDown={handleChatKeyDown}
                    placeholder="Type a live chat message..."
                    rows={3}
                    style={chatTextarea}
                  />

                  <button
                    type="button"
                    onClick={handleSendMessage}
                    style={buttonPrimary}
                    disabled={chatSending}
                  >
                    {chatSending ? "Sending..." : "Send"}
                  </button>
                </div>
              </div>

              <div style={contentPanel}>
                <div style={panelHeaderRow}>
                  <div>
                    <div style={sectionLabel}>Participants</div>
                    <div style={smallMutedText}>Live session roster for the current stage environment.</div>
                  </div>

                  <div style={miniBadge}>{participants.length} listed</div>
                </div>

                <div style={participantList}>
                  {participants.map((participant) => {
                    const online = participant.status === "Online";

                    return (
                      <div key={participant.id} style={participantCard}>
                        <div>
                          <div style={participantName}>{participant.name}</div>
                          <div style={participantRole}>{participant.role}</div>
                        </div>

                        <div style={participantStatus(online)}>
                          {online ? "● Online" : "● Standby"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>

          <aside style={sidebarPanel}>
            <div style={panelHeaderRow}>
              <div>
                <div style={sectionLabel}>Convention Bulletin Board</div>
                <div style={smallMutedText}>Import a bulletin text file and display convention announcements.</div>
              </div>

              <div style={miniBadge}>
                {bulletinLoading ? "Loading..." : bulletinSaving ? "Saving..." : "TXT"}
              </div>
            </div>

            <input
              ref={bulletinInputRef}
              type="file"
              accept=".txt,text/plain"
              onChange={handleBulletinFileChange}
              style={{ display: "none" }}
            />

            <button onClick={handleBulletinOpen} style={buttonPurple}>
              Choose Bulletin File
            </button>

            <div style={bulletinAlert}>
              {bulletinStatus}
            </div>

            <div style={bulletinFileBox}>
              File: <strong>{bulletinFileName || "None loaded"}</strong>
            </div>

            <div style={bulletinBoardWrap}>
              <div style={bulletinTickerHeader}>
                <span style={tickerDot} />
                Convention Feed
              </div>

              <div style={bulletinContent}>
                {bulletinText}
              </div>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}

function StatusChip({ label, tone = "slate" }) {
  return <div style={statusChip(tone)}>{label}</div>;
}

const appShell = {
  minHeight: "100vh",
  position: "relative",
  overflow: "hidden",
  background:
    "linear-gradient(180deg, #07111f 0%, #0d1730 42%, #121d39 70%, #172344 100%)",
  color: "#ffffff",
  fontFamily: 'Inter, "Segoe UI", Arial, sans-serif',
  padding: "24px",
};

const bgGlowOne = {
  position: "absolute",
  top: "-120px",
  left: "-120px",
  width: "420px",
  height: "420px",
  borderRadius: "999px",
  background: "radial-gradient(circle, rgba(14,165,233,0.18) 0%, rgba(14,165,233,0) 72%)",
  pointerEvents: "none",
};

const bgGlowTwo = {
  position: "absolute",
  right: "-140px",
  top: "80px",
  width: "420px",
  height: "420px",
  borderRadius: "999px",
  background: "radial-gradient(circle, rgba(139,92,246,0.16) 0%, rgba(139,92,246,0) 72%)",
  pointerEvents: "none",
};

const pageWrap = {
  maxWidth: "1550px",
  margin: "0 auto",
  display: "grid",
  gap: "18px",
  position: "relative",
  zIndex: 2,
};

const glassPanelBase = {
  background: "linear-gradient(180deg, rgba(17,24,43,0.9), rgba(15,23,42,0.88))",
  border: "1px solid rgba(255,255,255,0.08)",
  boxShadow: "0 24px 80px rgba(0,0,0,0.30)",
  backdropFilter: "blur(16px)",
};

const heroHeader = {
  ...glassPanelBase,
  borderRadius: "28px",
  padding: "24px",
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.1fr) auto",
  gap: "24px",
  alignItems: "center",
};

const heroContent = {
  display: "grid",
  gap: "12px",
};

const eyebrow = {
  fontSize: "12px",
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.4px",
  color: "#7dd3fc",
};

const heroTitle = {
  margin: 0,
  fontSize: "34px",
  lineHeight: 1.05,
  fontWeight: 900,
  letterSpacing: "-0.9px",
};

const heroText = {
  margin: 0,
  maxWidth: "860px",
  color: "#cad5ef",
  fontSize: "15px",
  lineHeight: 1.75,
};

const heroStatsRow = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  marginTop: "2px",
};

const heroActions = {
  display: "grid",
  gap: "12px",
  justifyItems: "end",
};

const actionGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(140px, 1fr))",
  gap: "10px",
};

const mainGrid = {
  display: "grid",
  gridTemplateColumns: "290px minmax(0, 1fr) 360px",
  gap: "18px",
  alignItems: "start",
};

const sidebarPanel = {
  ...glassPanelBase,
  borderRadius: "26px",
  padding: "18px",
};

const centerColumn = {
  display: "grid",
  gap: "18px",
};

const stagePanel = {
  ...glassPanelBase,
  borderRadius: "28px",
  padding: "18px",
};

const contentPanel = {
  ...glassPanelBase,
  borderRadius: "24px",
  padding: "18px",
};

const panelHeaderRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
  marginBottom: "14px",
};

const stageHeaderRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  flexWrap: "wrap",
  marginBottom: "14px",
};

const stageHeaderActions = {
  display: "flex",
  gap: "10px",
  alignItems: "center",
  flexWrap: "wrap",
};

const stageTitle = {
  marginTop: 0,
  marginBottom: "8px",
  fontSize: "26px",
  fontWeight: 900,
  letterSpacing: "-0.4px",
};

const sectionLabel = {
  fontSize: "12px",
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.4px",
  color: "#7dd3fc",
  marginBottom: "8px",
};

const smallMutedText = {
  color: "#cad5ef",
  fontSize: "13px",
  lineHeight: 1.65,
};

const miniBadge = {
  padding: "7px 10px",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.07)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "#e5e7eb",
  fontSize: "11px",
  fontWeight: 800,
  whiteSpace: "nowrap",
};

const roomListWrap = {
  display: "grid",
  gap: "10px",
  maxHeight: "430px",
  overflowY: "auto",
  paddingRight: "4px",
};

const roomCard = (active) => ({
  textAlign: "left",
  padding: "15px",
  borderRadius: "20px",
  border: active
    ? "1px solid rgba(96,165,250,0.50)"
    : "1px solid rgba(255,255,255,0.08)",
  background: active
    ? "linear-gradient(180deg, rgba(37,99,235,0.25), rgba(30,41,59,0.40))"
    : "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
  color: "#eff6ff",
  cursor: "pointer",
  boxShadow: active ? "0 16px 34px rgba(37,99,235,0.14)" : "none",
});

const roomCardTopRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
  marginBottom: "7px",
};

const roomName = {
  fontSize: "15px",
  fontWeight: 900,
};

const roomMeta = {
  fontSize: "13px",
  color: "#cad5ef",
  lineHeight: 1.6,
};

const roomDot = (active) => ({
  width: "10px",
  height: "10px",
  borderRadius: "999px",
  background: active ? "#60a5fa" : "rgba(255,255,255,0.26)",
  boxShadow: active ? "0 0 0 4px rgba(96,165,250,0.16)" : "none",
  flexShrink: 0,
});

const roomAdminPanel = {
  marginTop: "16px",
  padding: "14px",
  borderRadius: "20px",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
  display: "grid",
  gap: "10px",
};

const textInput = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "14px",
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.06)",
  color: "#ffffff",
  fontSize: "14px",
  outline: "none",
  boxSizing: "border-box",
};

const textAreaInput = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "14px",
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.06)",
  color: "#ffffff",
  fontSize: "14px",
  lineHeight: 1.6,
  outline: "none",
  resize: "vertical",
  boxSizing: "border-box",
};

const adminButtonGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
};

const stageWrap = {
  width: "100%",
  aspectRatio: "16 / 9",
  borderRadius: "30px",
  background:
    "linear-gradient(180deg, rgba(22,12,16,0.96), rgba(7,10,20,0.98))",
  border: "1px solid rgba(255,255,255,0.08)",
  display: "grid",
  placeItems: "center",
  textAlign: "center",
  padding: "18px",
  overflow: "hidden",
  position: "relative",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 18px 48px rgba(0,0,0,0.28)",
};

const stageGlow = {
  position: "absolute",
  inset: 0,
  background:
    "radial-gradient(circle at top center, rgba(125,211,252,0.10), transparent 24%), radial-gradient(circle at bottom right, rgba(59,130,246,0.10), transparent 22%)",
  pointerEvents: "none",
};

const stageTopLeftBadges = {
  position: "absolute",
  top: "14px",
  left: "14px",
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  zIndex: 3,
};

const stageGlassBadge = {
  padding: "8px 12px",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "#e5e7eb",
  fontSize: "12px",
  fontWeight: 800,
  backdropFilter: "blur(8px)",
};

const stageGlassBadgeColor = (tone) => ({
  ...stageGlassBadge,
  background:
    tone === "blue"
      ? "rgba(14,165,233,0.18)"
      : tone === "green"
        ? "rgba(22,163,74,0.18)"
        : "rgba(255,255,255,0.08)",
  color:
    tone === "blue"
      ? "#bae6fd"
      : tone === "green"
        ? "#a7f3d0"
        : "#e5e7eb",
});

const stageVideo = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  borderRadius: "22px",
  background: "#000",
  position: "relative",
  zIndex: 1,
};

const stageInfoScreen = {
  position: "relative",
  zIndex: 1,
  display: "grid",
  placeItems: "center",
  width: "100%",
  height: "100%",
  borderRadius: "22px",
  border: "1px solid rgba(255,255,255,0.06)",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
  padding: "28px",
};

const stageInfoTitle = {
  fontSize: "30px",
  fontWeight: 900,
  marginBottom: "12px",
};

const stageInfoText = {
  fontSize: "15px",
  lineHeight: 1.8,
  color: "#cad5ef",
  maxWidth: "720px",
};

const errorBox = {
  marginTop: "16px",
  padding: "12px 14px",
  borderRadius: "14px",
  background: "rgba(127,29,29,0.30)",
  border: "1px solid rgba(248,113,113,0.40)",
  color: "#fecaca",
  fontSize: "14px",
  lineHeight: 1.6,
  maxWidth: "780px",
  marginLeft: "auto",
  marginRight: "auto",
};

const dataErrorBox = {
  padding: "12px 14px",
  borderRadius: "16px",
  background: "rgba(127,29,29,0.26)",
  border: "1px solid rgba(248,113,113,0.40)",
  color: "#fecaca",
  fontSize: "14px",
  lineHeight: 1.6,
};

const floatingHostBox = {
  position: "absolute",
  right: "18px",
  bottom: "18px",
  width: "200px",
  aspectRatio: "4 / 5",
  borderRadius: "24px",
  overflow: "hidden",
  border: "1px solid rgba(255,255,255,0.16)",
  boxShadow: "0 18px 38px rgba(0,0,0,0.42)",
  background: "rgba(3,7,18,0.94)",
  zIndex: 5,
};

const floatingVideo = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  background: "#000",
};

const floatingLabel = {
  position: "absolute",
  left: "10px",
  right: "10px",
  bottom: "10px",
  padding: "7px 10px",
  borderRadius: "999px",
  background: "rgba(0,0,0,0.58)",
  color: "#ffffff",
  fontSize: "11px",
  fontWeight: 800,
  textAlign: "center",
};

const shareDockButton = {
  position: "absolute",
  left: "18px",
  bottom: "18px",
  width: "172px",
  aspectRatio: "1 / 1",
  borderRadius: "24px",
  overflow: "hidden",
  border: "1px solid rgba(255,255,255,0.16)",
  boxShadow: "0 16px 34px rgba(0,0,0,0.36)",
  background: "rgba(3,7,18,0.92)",
  cursor: "pointer",
  padding: 0,
  zIndex: 5,
};

const dockVideo = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  background: "#000",
};

const dockOverlayLabel = {
  position: "absolute",
  left: "8px",
  right: "8px",
  bottom: "8px",
  padding: "7px 8px",
  borderRadius: "999px",
  background: "rgba(0,0,0,0.58)",
  color: "#ffffff",
  fontSize: "11px",
  fontWeight: 800,
  textAlign: "center",
};

const returnDockButton = {
  position: "absolute",
  left: "18px",
  bottom: "18px",
  minHeight: "38px",
  padding: "8px 13px",
  borderRadius: "999px",
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(0,0,0,0.58)",
  color: "#ffffff",
  fontSize: "12px",
  fontWeight: 800,
  cursor: "pointer",
  zIndex: 5,
};

const stageStateBadge = (tone) => ({
  position: "absolute",
  top: "14px",
  right: "14px",
  padding: "8px 12px",
  borderRadius: "999px",
  background:
    tone === "blue"
      ? "rgba(14,165,233,0.18)"
      : tone === "green"
        ? "rgba(22,163,74,0.18)"
        : "rgba(255,255,255,0.08)",
  color:
    tone === "blue"
      ? "#bae6fd"
      : tone === "green"
        ? "#a7f3d0"
        : "#e5e7eb",
  border: "1px solid rgba(255,255,255,0.08)",
  fontSize: "12px",
  fontWeight: 800,
  backdropFilter: "blur(8px)",
  zIndex: 5,
});

const stageFooterStrip = {
  position: "absolute",
  left: "18px",
  right: "18px",
  bottom: "18px",
  display: "flex",
  justifyContent: "center",
  gap: "10px",
  flexWrap: "wrap",
  pointerEvents: "none",
};

const stageFooterItem = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  padding: "8px 12px",
  borderRadius: "999px",
  background: "rgba(0,0,0,0.38)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "#e5e7eb",
  fontSize: "11px",
  fontWeight: 800,
  backdropFilter: "blur(10px)",
};

const footerKeyDot = (tone) => ({
  width: "8px",
  height: "8px",
  borderRadius: "999px",
  background:
    tone === "blue"
      ? "#38bdf8"
      : tone === "green"
        ? "#4ade80"
        : "#94a3b8",
  flexShrink: 0,
});

const lowerGrid = {
  display: "grid",
  gridTemplateColumns: "1.25fr 0.75fr",
  gap: "18px",
};

const chatFeed = {
  borderRadius: "20px",
  border: "1px solid rgba(255,255,255,0.08)",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.03))",
  padding: "14px",
  maxHeight: "370px",
  overflowY: "auto",
  display: "grid",
  gap: "10px",
};

const chatCard = {
  padding: "12px 13px",
  borderRadius: "17px",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(17,24,43,0.78)",
  display: "grid",
  gap: "6px",
};

const chatCardTop = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  flexWrap: "wrap",
};

const chatAuthor = {
  fontSize: "14px",
  fontWeight: 900,
  color: "#ffffff",
};

const chatTime = {
  fontSize: "12px",
  color: "#98a8ca",
};

const chatRole = {
  fontSize: "11px",
  color: "#7dd3fc",
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.32px",
};

const chatText = {
  fontSize: "14px",
  color: "#eef4ff",
  lineHeight: 1.72,
  whiteSpace: "pre-wrap",
};

const chatComposer = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: "10px",
  alignItems: "stretch",
  marginTop: "14px",
};

const chatTextarea = {
  width: "100%",
  resize: "none",
  padding: "12px 14px",
  borderRadius: "16px",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.06)",
  color: "#ffffff",
  fontSize: "14px",
  lineHeight: 1.6,
  outline: "none",
};

const participantList = {
  display: "grid",
  gap: "10px",
  maxHeight: "435px",
  overflowY: "auto",
};

const participantCard = {
  padding: "13px",
  borderRadius: "17px",
  border: "1px solid rgba(255,255,255,0.08)",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
};

const participantName = {
  fontSize: "14px",
  fontWeight: 900,
  color: "#ffffff",
  marginBottom: "4px",
};

const participantRole = {
  fontSize: "13px",
  color: "#cad5ef",
};

const participantStatus = (online) => ({
  padding: "6px 10px",
  borderRadius: "999px",
  background: online ? "rgba(22,163,74,0.18)" : "rgba(255,255,255,0.08)",
  color: online ? "#a7f3d0" : "#e5e7eb",
  fontSize: "12px",
  fontWeight: 800,
  whiteSpace: "nowrap",
});

const bulletinAlert = {
  padding: "12px",
  borderRadius: "14px",
  background: "rgba(245,158,11,0.18)",
  border: "1px solid rgba(251,191,36,0.22)",
  color: "#fde68a",
  fontSize: "13px",
  lineHeight: 1.6,
  marginTop: "14px",
};

const bulletinFileBox = {
  padding: "12px",
  borderRadius: "14px",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "#dbeafe",
  fontSize: "13px",
  lineHeight: 1.6,
  marginTop: "14px",
};

const bulletinBoardWrap = {
  borderRadius: "20px",
  border: "1px solid rgba(255,255,255,0.08)",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
  marginTop: "14px",
  overflow: "hidden",
};

const bulletinTickerHeader = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "12px 14px",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.04)",
  color: "#dbeafe",
  fontSize: "12px",
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.3px",
};

const tickerDot = {
  width: "8px",
  height: "8px",
  borderRadius: "999px",
  background: "#38bdf8",
  boxShadow: "0 0 0 4px rgba(56,189,248,0.12)",
};

const bulletinContent = {
  padding: "14px",
  maxHeight: "540px",
  overflowY: "auto",
  whiteSpace: "pre-wrap",
  lineHeight: 1.78,
  color: "#eef4ff",
  fontSize: "14px",
};

const statusChip = (tone) => ({
  padding: "8px 12px",
  borderRadius: "999px",
  background:
    tone === "green"
      ? "rgba(22,163,74,0.18)"
      : tone === "blue"
        ? "rgba(14,165,233,0.18)"
        : tone === "purple"
          ? "rgba(139,92,246,0.18)"
          : "rgba(255,255,255,0.07)",
  border: "1px solid rgba(255,255,255,0.08)",
  color:
    tone === "green"
      ? "#a7f3d0"
      : tone === "blue"
        ? "#bae6fd"
        : tone === "purple"
          ? "#ddd6fe"
          : "#e5e7eb",
  fontSize: "12px",
  fontWeight: 800,
});

const topPill = (tone) => ({
  padding: "9px 13px",
  borderRadius: "999px",
  background:
    tone === "green"
      ? "rgba(22,163,74,0.18)"
      : "rgba(255,255,255,0.08)",
  color: tone === "green" ? "#a7f3d0" : "#e5e7eb",
  fontSize: "12px",
  fontWeight: 900,
  border: "1px solid rgba(255,255,255,0.08)",
});

const buttonBase = {
  minHeight: "42px",
  padding: "10px 14px",
  borderRadius: "14px",
  fontWeight: 800,
  cursor: "pointer",
  transition: "all 0.18s ease",
  letterSpacing: "0.1px",
};

const buttonPrimary = {
  ...buttonBase,
  border: "none",
  background: "linear-gradient(180deg, #3b82f6, #2563eb)",
  color: "#fff",
  boxShadow: "0 10px 24px rgba(37,99,235,0.22)",
};

const buttonSecondary = {
  ...buttonBase,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.08)",
  color: "#fff",
};

const buttonPurple = {
  ...buttonBase,
  border: "none",
  background: "linear-gradient(180deg, #8b5cf6, #7c3aed)",
  color: "#fff",
  boxShadow: "0 10px 24px rgba(124,58,237,0.22)",
};

const buttonBlue = {
  ...buttonBase,
  border: "none",
  background: "linear-gradient(180deg, #0ea5e9, #2563eb)",
  color: "#fff",
  boxShadow: "0 10px 24px rgba(14,165,233,0.20)",
};

const buttonDanger = {
  ...buttonBase,
  border: "none",
  background: "linear-gradient(180deg, #ef4444, #dc2626)",
  color: "#fff",
  boxShadow: "0 10px 24px rgba(220,38,38,0.22)",
};