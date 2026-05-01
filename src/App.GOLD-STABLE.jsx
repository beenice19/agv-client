import { useEffect, useRef, useState } from "react";

const API_BASE = "http://127.0.0.1:8787/api";

export default function App() {
  const cameraStageVideoRef = useRef(null);
  const cameraFloatVideoRef = useRef(null);
  const shareMainVideoRef = useRef(null);
  const shareDockVideoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const shareStreamRef = useRef(null);
  const bulletinInputRef = useRef(null);

  const [userId, setUserId] = useState("byron-admin");
  const [displayName, setDisplayName] = useState("Byron");

  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState(null);

  const [statusText, setStatusText] = useState("System ready");
  const [serverError, setServerError] = useState("");
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

  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState([
    {
      id: 1,
      author: "Convention Desk",
      role: "Moderator",
      time: "Just now",
      text: "Welcome to Stro Chievery. Layout shell is back online.",
    },
    {
      id: 2,
      author: "Production",
      role: "Support",
      time: "1 min ago",
      text: "Screen share dock box is now restored.",
    },
  ]);

  const [miniHubOpen, setMiniHubOpen] = useState(false);
  const [miniHubTab, setMiniHubTab] = useState("auth");

  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomMeta, setNewRoomMeta] = useState("");

  const [hostUserIdInput, setHostUserIdInput] = useState("");
  const [hostDisplayNameInput, setHostDisplayNameInput] = useState("");

  const [moderatorUserIdInput, setModeratorUserIdInput] = useState("");
  const [moderatorDisplayNameInput, setModeratorDisplayNameInput] = useState("");

  const participants = [
    { id: 1, name: "Host Camera", role: "Primary Feed", status: "Online" },
    { id: 2, name: "Convention Desk", role: "Moderator", status: "Online" },
    { id: 3, name: "Program Director", role: "Speaker", status: "Online" },
    { id: 4, name: "Music Cue", role: "Support", status: "Standby" },
  ];

  const selectedRoom =
    rooms.find((room) => String(room.id) === String(selectedRoomId)) || null;

  const permissions = selectedRoom?.myPermissions || {
    serverRole: "viewer",
    isAssignedHost: false,
    isModerator: false,
    canPublishMedia: false,
    canAssignHost: false,
    canManageModerators: false,
    canManageRoom: false,
    canToggleVisibility: false,
    canToggleStatus: false,
  };

  async function apiGet(path) {
    const response = await fetch(`${API_BASE}${path}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || "Request failed.");
    }
    return data;
  }

  async function apiPost(path, body) {
    const response = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body || {}),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || "Request failed.");
    }
    return data;
  }

  function actorQuery() {
    const params = new URLSearchParams({
      userId: userId.trim(),
      displayName: displayName.trim(),
    });
    return params.toString();
  }

  async function loadRooms(preferredRoomId = null) {
    try {
      setServerError("");
      const data = await apiGet(`/rooms?${actorQuery()}`);
      const nextRooms = Array.isArray(data.rooms) ? data.rooms : [];
      setRooms(nextRooms);

      const nextSelectedId =
        preferredRoomId ||
        selectedRoomId ||
        (nextRooms.length > 0 ? nextRooms[0].id : null);

      if (nextSelectedId) {
        setSelectedRoomId(nextSelectedId);
      }

      const currentRoom =
        nextRooms.find((room) => String(room.id) === String(nextSelectedId)) || null;

      if (currentRoom) {
        setProgramLive(currentRoom.status === "live");
      }
    } catch (error) {
      setServerError(error.message || "Could not load rooms.");
    }
  }

  async function refreshRooms() {
    await loadRooms(selectedRoomId);
    setStatusText("Rooms refreshed");
  }

  async function handleSelectRoom(roomId) {
    setSelectedRoomId(roomId);
    await loadRooms(roomId);
    const room = rooms.find((entry) => String(entry.id) === String(roomId));
    if (room) {
      setStatusText(`Selected room: ${room.name}`);
    }
  }

  async function handleAddRoom() {
    const trimmedName = newRoomName.trim();
    const trimmedMeta = newRoomMeta.trim();

    if (!trimmedName) {
      setStatusText("Enter a room name first");
      return;
    }

    try {
      setServerError("");
      const data = await apiPost("/rooms", {
        userId: userId.trim(),
        displayName: displayName.trim(),
        name: trimmedName,
        meta: trimmedMeta || "New room • Ready",
      });

      const createdRoom = data.room;
      setNewRoomName("");
      setNewRoomMeta("");
      setMiniHubOpen(false);
      setStatusText(`Added room: ${createdRoom.name}`);
      await loadRooms(createdRoom.id);
    } catch (error) {
      setServerError(error.message || "Could not add room.");
    }
  }

  async function handleAssignHost() {
    if (!selectedRoom) {
      setStatusText("Select a room first");
      return;
    }

    if (!hostUserIdInput.trim()) {
      setStatusText("Enter a host user ID");
      return;
    }

    try {
      setServerError("");
      const data = await apiPost(
        `/rooms/${selectedRoom.id}/permissions/assign-host`,
        {
          userId: userId.trim(),
          displayName: displayName.trim(),
          targetUserId: hostUserIdInput.trim(),
          targetDisplayName: hostDisplayNameInput.trim() || hostUserIdInput.trim(),
        }
      );

      const updatedRoom = data.room;
      setHostUserIdInput("");
      setHostDisplayNameInput("");
      setStatusText(`Assigned host: ${updatedRoom.assignedHost?.displayName || "Host"}`);
      await loadRooms(updatedRoom.id);
    } catch (error) {
      setServerError(error.message || "Could not assign host.");
    }
  }

  async function handleAddModerator() {
    if (!selectedRoom) {
      setStatusText("Select a room first");
      return;
    }

    if (!moderatorUserIdInput.trim()) {
      setStatusText("Enter a moderator user ID");
      return;
    }

    try {
      setServerError("");
      const data = await apiPost(
        `/rooms/${selectedRoom.id}/permissions/moderators`,
        {
          userId: userId.trim(),
          displayName: displayName.trim(),
          action: "add",
          targetUserId: moderatorUserIdInput.trim(),
          targetDisplayName:
            moderatorDisplayNameInput.trim() || moderatorUserIdInput.trim(),
        }
      );

      setModeratorUserIdInput("");
      setModeratorDisplayNameInput("");
      setStatusText("Moderator added");
      await loadRooms(data.room.id);
    } catch (error) {
      setServerError(error.message || "Could not add moderator.");
    }
  }

  async function handleRemoveModerator(modUserId, modDisplayName) {
    if (!selectedRoom) return;

    try {
      setServerError("");
      const data = await apiPost(
        `/rooms/${selectedRoom.id}/permissions/moderators`,
        {
          userId: userId.trim(),
          displayName: displayName.trim(),
          action: "remove",
          targetUserId: modUserId,
          targetDisplayName: modDisplayName || modUserId,
        }
      );

      setStatusText("Moderator removed");
      await loadRooms(data.room.id);
    } catch (error) {
      setServerError(error.message || "Could not remove moderator.");
    }
  }

  async function startCamera() {
    if (!permissions.canPublishMedia) {
      setStatusText("Camera is blocked for your current role");
      return;
    }

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
    if (!permissions.canPublishMedia) {
      setStatusText("Screen share is blocked for your current role");
      return;
    }

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

  function handleBulletinOpen() {
    if (bulletinInputRef.current) {
      bulletinInputRef.current.click();
    }
    setStatusText("Bulletin board ready for file import");
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

    reader.onload = function (loadEvent) {
      const text = loadEvent.target?.result;

      if (typeof text === "string" && text.trim().length > 0) {
        setBulletinText(text);
        setBulletinFileName(file.name);
        setBulletinStatus(`Loaded bulletin file: ${file.name}`);
        setStatusText(`Bulletin loaded: ${file.name}`);
      } else {
        setBulletinText("The selected bulletin file was empty.");
        setBulletinFileName(file.name);
        setBulletinStatus(`Loaded bulletin file: ${file.name}`);
        setStatusText("Bulletin file was empty");
      }
    };

    reader.onerror = function () {
      setBulletinStatus("The bulletin file could not be read.");
      setStatusText("Bulletin load failed");
    };

    reader.readAsText(file);
  }

  function handleSendMessage() {
    const trimmed = chatInput.trim();

    if (!trimmed) {
      setStatusText("Type a message before sending");
      return;
    }

    const newMessage = {
      id: Date.now(),
      author: displayName || "You",
      role: permissions.serverRole || "viewer",
      time: "Now",
      text: trimmed,
    };

    setMessages((current) => [...current, newMessage]);
    setChatInput("");
    setStatusText("Message sent to chat");
  }

  function handleChatKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  }

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
      } catch {}
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
      } catch {}
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
    loadRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  return (
    <div style={pageStyle}>
      <div style={pageWrap}>
        <header style={headerStyle}>
          <div style={headerLeftStyle}>
            <div style={eyebrowStyle}>Stro Chievery</div>
            <h1 style={titleStyle}>Convention Broadcast Platform</h1>
            <p style={subtitleStyle}>
              Premium stage shell with rooms, webcam, docked screen share, floating host camera, bulletin board, chat, and participants.
            </p>
          </div>

          <div style={headerRightStyle}>
            <div
              style={{
                padding: "8px 12px",
                borderRadius: "999px",
                background: programLive
                  ? "rgba(22, 163, 74, 0.18)"
                  : "rgba(255,255,255,0.08)",
                color: programLive ? "#a7f3d0" : "#e5e7eb",
                fontSize: "12px",
                fontWeight: 800,
              }}
            >
              {programLive ? "● Live Now" : "● Standby"}
            </div>

            <div style={headerButtonWrapStyle}>
              <button onClick={refreshRooms} style={buttonSecondary}>
                Refresh
              </button>

              <button onClick={handleGoLive} style={buttonPrimary}>
                Go Live
              </button>

              <button onClick={handleEndLive} style={buttonSecondary}>
                End Live
              </button>

              <button
                onClick={startCamera}
                style={permissions.canPublishMedia ? buttonPurple : disabledButton}
              >
                Start Camera
              </button>

              <button onClick={stopCamera} style={buttonSecondary}>
                Stop Camera
              </button>

              <button
                onClick={startShare}
                style={permissions.canPublishMedia ? buttonBlue : disabledButton}
              >
                Start Share
              </button>

              <button onClick={stopShare} style={buttonSecondary}>
                Stop Share
              </button>
            </div>
          </div>
        </header>

        {serverError ? <div style={errorBannerStyle}>{serverError}</div> : null}

        <section style={workspaceStyle}>
          <aside style={panelStyle}>
            <div style={sectionLabel}>Rooms</div>

            <p style={helperText}>
              Click a room to change the selected stage target.
            </p>

            <div style={roomsScrollStyle}>
              {rooms.map((room) => {
                const active = String(selectedRoomId) === String(room.id);

                return (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => handleSelectRoom(room.id)}
                    style={{
                      ...roomCardStyle,
                      ...(active ? roomCardActiveStyle : {}),
                    }}
                  >
                    <div style={roomTitleStyle}>{room.name}</div>

                    <div style={roomMetaStyle}>{room.meta}</div>

                    <div style={roomSubMetaStyle}>
                      Host: {room.assignedHost?.displayName || "Unassigned"} • {room.status}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <div style={centerColumnStyle}>
            <section style={panelStyle}>
              <div style={stageHeaderStyle}>
                <div>
                  <div style={sectionLabel}>Main Stage</div>

                  <h2 style={stageTitleStyle}>
                    {selectedRoom?.name || "No Room Selected"}
                  </h2>

                  <div style={helperText}>Status: {statusText}</div>
                  <div style={helperText}>
                    Role: <strong>{permissions.serverRole}</strong>
                  </div>
                </div>

                <button onClick={handleBulletinOpen} style={buttonSecondary}>
                  Open Bulletin
                </button>
              </div>

              <div style={stageViewportStyle}>
                <div style={stageGlowStyle} />

                <div style={stageBadgeWrapStyle}>
                  <div style={stageBadgeStyle}>
                    {selectedRoom?.name || "Stage"}
                  </div>

                  <div
                    style={{
                      ...stageBadgeStyle,
                      background: showExpandedShare
                        ? "rgba(14,165,233,0.18)"
                        : cameraOn && !shareOn
                        ? "rgba(22,163,74,0.18)"
                        : "rgba(255,255,255,0.08)",
                      color: showExpandedShare
                        ? "#bae6fd"
                        : cameraOn && !shareOn
                        ? "#a7f3d0"
                        : "#e5e7eb",
                    }}
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
                    style={mainMediaStyle}
                  />
                ) : shareOn ? (
                  <div style={centerMessageWrapStyle}>
                    <div style={centerMessageTitleStyle}>
                      Screen share is docked
                    </div>

                    <div style={centerMessageTextStyle}>
                      The shared screen is parked in the TV dock box. Click the dock to bring it to the main stage.
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
                    style={mainMediaStyle}
                  />
                ) : (
                  <div style={centerMessageWrapStyle}>
                    <div style={centerMessageTitleStyle}>
                      Stage camera area
                    </div>

                    <div style={centerMessageTextStyle}>
                      Click <strong>Start Camera</strong> for webcam preview or <strong>Start Share</strong> to place your screen into the dock box.
                    </div>

                    {cameraError ? (
                      <div style={errorBoxStyle}>
                        Camera error: {cameraError}
                      </div>
                    ) : null}

                    {shareError ? (
                      <div style={errorBoxStyle}>
                        Share error: {shareError}
                      </div>
                    ) : null}
                  </div>
                )}

                {showFloatingCamera ? (
                  <div style={floatingHostBoxStyle}>
                    <video
                      ref={cameraFloatVideoRef}
                      autoPlay
                      playsInline
                      muted
                      style={floatingVideoStyle}
                    />

                    <div style={floatingLabelStyle}>
                      Host Camera
                    </div>
                  </div>
                ) : null}

                {showDockShare ? (
                  <button
                    type="button"
                    onClick={toggleShareView}
                    title="Click to expand share to main stage"
                    style={shareDockButtonStyle}
                  >
                    <video
                      ref={shareDockVideoRef}
                      autoPlay
                      playsInline
                      muted
                      style={shareDockVideoStyle}
                    />
                    <div style={floatingLabelStyle}>
                      Share Dock — Click
                    </div>
                  </button>
                ) : null}

                {showExpandedShare ? (
                  <button
                    type="button"
                    onClick={toggleShareView}
                    style={returnDockButtonStyle}
                  >
                    Return Share to Dock
                  </button>
                ) : null}

                <div
                  style={{
                    ...topRightPillStyle,
                    background: shareOn
                      ? "rgba(14, 165, 233, 0.18)"
                      : cameraOn
                      ? "rgba(22, 163, 74, 0.18)"
                      : "rgba(255,255,255,0.08)",
                    color: shareOn ? "#bae6fd" : cameraOn ? "#a7f3d0" : "#e5e7eb",
                  }}
                >
                  {shareOn
                    ? shareExpanded
                      ? "● Share Fullscreen"
                      : "● Share Docked"
                    : cameraOn
                    ? "● Camera Live"
                    : "● Stage Idle"}
                </div>
              </div>
            </section>

            <section style={lowerGridStyle}>
              <div style={panelStyle}>
                <div style={sectionLabel}>Live Chat</div>

                <p style={helperText}>
                  Send live room messages while keeping the stage visible above.
                </p>

                <div style={chatScrollStyle}>
                  {messages.map((message) => (
                    <div key={message.id} style={chatCardStyle}>
                      <div style={chatTopStyle}>
                        <div style={chatAuthorStyle}>{message.author}</div>

                        <div style={chatTimeStyle}>{message.time}</div>
                      </div>

                      <div style={chatRoleStyle}>{message.role}</div>

                      <div style={chatTextStyle}>{message.text}</div>
                    </div>
                  ))}
                </div>

                <div style={chatComposeStyle}>
                  <textarea
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                    onKeyDown={handleChatKeyDown}
                    placeholder="Type a live chat message..."
                    rows={3}
                    style={chatTextareaStyle}
                  />

                  <button type="button" onClick={handleSendMessage} style={buttonPrimary}>
                    Send
                  </button>
                </div>
              </div>

              <div style={panelStyle}>
                <div style={sectionLabel}>Participants</div>

                <p style={helperText}>
                  Live session roster for the current stage environment.
                </p>

                <div style={participantsScrollStyle}>
                  {participants.map((participant) => {
                    const online = participant.status === "Online";

                    return (
                      <div key={participant.id} style={participantCardStyle}>
                        <div>
                          <div style={participantNameStyle}>{participant.name}</div>

                          <div style={participantRoleStyle}>{participant.role}</div>
                        </div>

                        <div
                          style={{
                            ...participantPillStyle,
                            background: online
                              ? "rgba(22, 163, 74, 0.18)"
                              : "rgba(255,255,255,0.08)",
                            color: online ? "#a7f3d0" : "#e5e7eb",
                          }}
                        >
                          {online ? "● Online" : "● Standby"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>

          <aside style={panelStyle}>
            <div style={sectionLabel}>Convention Bulletin Board</div>

            <p style={helperText}>
              Import a bulletin text file and display convention announcements.
            </p>

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

            <div style={bulletinStatusStyle}>
              {bulletinStatus}
            </div>

            <div style={bulletinFileStyle}>
              File: <strong>{bulletinFileName || "None loaded"}</strong>
            </div>

            <div style={bulletinBodyStyle}>{bulletinText}</div>
          </aside>
        </section>

        <div style={miniHubDockStyle}>
          {miniHubOpen ? (
            <div style={miniHubPanelStyle}>
              <div style={miniHubHeaderStyle}>
                <div>
                  <div style={miniHubEyebrowStyle}>Mini Control Hub</div>
                  <div style={miniHubTitleStyle}>Quick admin tools</div>
                </div>

                <button
                  type="button"
                  onClick={() => setMiniHubOpen(false)}
                  style={hubCloseButtonStyle}
                >
                  ✕
                </button>
              </div>

              <div style={miniHubTabsStyle}>
                <button
                  type="button"
                  onClick={() => setMiniHubTab("auth")}
                  style={miniTabButton(miniHubTab === "auth")}
                >
                  🛡 Auth
                </button>
                <button
                  type="button"
                  onClick={() => setMiniHubTab("host")}
                  style={miniTabButton(miniHubTab === "host")}
                >
                  👑 Host
                </button>
                <button
                  type="button"
                  onClick={() => setMiniHubTab("room")}
                  style={miniTabButton(miniHubTab === "room")}
                >
                  ➕ Room
                </button>
                <button
                  type="button"
                  onClick={() => setMiniHubTab("mods")}
                  style={miniTabButton(miniHubTab === "mods")}
                >
                  👥 Mods
                </button>
              </div>

              <div style={miniHubBodyStyle}>
                {miniHubTab === "auth" ? (
                  <div style={hubBodyStyle}>
                    <div style={hubTitleStyle}>Authorization</div>

                    <input
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                      placeholder="Display name"
                      style={hubInputStyle}
                    />

                    <input
                      value={userId}
                      onChange={(event) => setUserId(event.target.value)}
                      placeholder="User ID"
                      style={hubInputStyle}
                    />

                    <button type="button" onClick={refreshRooms} style={buttonPrimary}>
                      Refresh Permissions
                    </button>

                    <div style={hubTextStyle}>
                      Role: <strong>{permissions.serverRole}</strong>
                    </div>
                    <div style={hubTextStyle}>
                      Host:{" "}
                      <strong>{selectedRoom?.assignedHost?.displayName || "Unassigned"}</strong>
                    </div>
                    <div style={hubTextStyle}>
                      Can Publish Media:{" "}
                      <strong>{permissions.canPublishMedia ? "Yes" : "No"}</strong>
                    </div>
                    <div style={hubTextStyle}>
                      Can Assign Host:{" "}
                      <strong>{permissions.canAssignHost ? "Yes" : "No"}</strong>
                    </div>
                    <div style={hubTextStyle}>
                      Can Manage Moderators:{" "}
                      <strong>{permissions.canManageModerators ? "Yes" : "No"}</strong>
                    </div>
                  </div>
                ) : null}

                {miniHubTab === "host" ? (
                  <div style={hubBodyStyle}>
                    <div style={hubTitleStyle}>Assign host</div>

                    <div style={hubTextStyle}>
                      Current host:{" "}
                      <strong>{selectedRoom?.assignedHost?.displayName || "Unassigned"}</strong>
                    </div>

                    <input
                      value={hostUserIdInput}
                      onChange={(event) => setHostUserIdInput(event.target.value)}
                      placeholder="New host user ID"
                      style={hubInputStyle}
                    />

                    <input
                      value={hostDisplayNameInput}
                      onChange={(event) => setHostDisplayNameInput(event.target.value)}
                      placeholder="New host display name"
                      style={hubInputStyle}
                    />

                    <button
                      type="button"
                      onClick={handleAssignHost}
                      style={permissions.canAssignHost ? buttonPrimary : disabledButton}
                    >
                      Assign Host
                    </button>
                  </div>
                ) : null}

                {miniHubTab === "room" ? (
                  <div style={hubBodyStyle}>
                    <div style={hubTitleStyle}>Add room</div>

                    <input
                      value={newRoomName}
                      onChange={(event) => setNewRoomName(event.target.value)}
                      placeholder="Room name"
                      style={hubInputStyle}
                    />

                    <textarea
                      value={newRoomMeta}
                      onChange={(event) => setNewRoomMeta(event.target.value)}
                      placeholder="Room description / meta"
                      rows={3}
                      style={hubTextareaStyle}
                    />

                    <button
                      type="button"
                      onClick={handleAddRoom}
                      style={buttonPrimary}
                    >
                      Add Room
                    </button>
                  </div>
                ) : null}

                {miniHubTab === "mods" ? (
                  <div style={hubBodyStyle}>
                    <div style={hubTitleStyle}>Moderators</div>

                    <div style={moderatorsListStyle}>
                      {selectedRoom?.moderators?.length ? (
                        selectedRoom.moderators.map((mod) => (
                          <div key={mod.userId} style={moderatorRowStyle}>
                            <div style={hubTextStyle}>
                              {mod.displayName} • {mod.userId}
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                handleRemoveModerator(mod.userId, mod.displayName)
                              }
                              style={
                                permissions.canManageModerators
                                  ? smallDangerButton
                                  : disabledSmallButton
                              }
                            >
                              Remove
                            </button>
                          </div>
                        ))
                      ) : (
                        <div style={hubTextStyle}>No moderators assigned.</div>
                      )}
                    </div>

                    <input
                      value={moderatorUserIdInput}
                      onChange={(event) => setModeratorUserIdInput(event.target.value)}
                      placeholder="Moderator user ID"
                      style={hubInputStyle}
                    />

                    <input
                      value={moderatorDisplayNameInput}
                      onChange={(event) =>
                        setModeratorDisplayNameInput(event.target.value)
                      }
                      placeholder="Moderator display name"
                      style={hubInputStyle}
                    />

                    <button
                      type="button"
                      onClick={handleAddModerator}
                      style={
                        permissions.canManageModerators ? buttonPrimary : disabledButton
                      }
                    >
                      Add Moderator
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          <div style={miniHubBarStyle}>
            <button
              type="button"
              onClick={() => {
                setMiniHubOpen(true);
                setMiniHubTab("auth");
              }}
              style={hubIconButtonStyle}
              title="Authorization"
            >
              🛡
            </button>

            <button
              type="button"
              onClick={() => {
                setMiniHubOpen(true);
                setMiniHubTab("host");
              }}
              style={hubIconButtonStyle}
              title="Host"
            >
              👑
            </button>

            <button
              type="button"
              onClick={() => {
                setMiniHubOpen(true);
                setMiniHubTab("room");
              }}
              style={hubIconButtonStyle}
              title="Room tools"
            >
              ➕
            </button>

            <button
              type="button"
              onClick={() => {
                setMiniHubOpen(true);
                setMiniHubTab("mods");
              }}
              style={hubIconButtonStyle}
              title="Moderators"
            >
              👥
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function miniTabButton(active) {
  return {
    minHeight: "34px",
    padding: "8px 10px",
    borderRadius: "12px",
    border: active
      ? "1px solid rgba(96, 165, 250, 0.32)"
      : "1px solid rgba(255,255,255,0.08)",
    background: active
      ? "linear-gradient(180deg, rgba(30,64,175,0.28), rgba(30,41,59,0.20))"
      : "rgba(255,255,255,0.06)",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
    fontSize: "12px",
  };
}

const pageStyle = {
  minHeight: "100vh",
  background: "linear-gradient(180deg, #0b1020 0%, #12192f 45%, #1a223d 100%)",
  color: "#ffffff",
  fontFamily: 'Inter, "Segoe UI", Arial, sans-serif',
  padding: "24px",
};

const pageWrap = {
  maxWidth: "1500px",
  margin: "0 auto",
  display: "grid",
  gap: "16px",
};

const headerStyle = {
  background: "rgba(17, 24, 43, 0.92)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "24px",
  boxShadow: "0 26px 70px rgba(0,0,0,0.28)",
  padding: "24px",
  display: "grid",
  gridTemplateColumns: "1.1fr 0.9fr",
  gap: "18px",
  alignItems: "start",
};

const headerLeftStyle = {
  display: "grid",
  gap: "10px",
};

const headerRightStyle = {
  display: "grid",
  justifyItems: "end",
  gap: "12px",
};

const headerButtonWrapStyle = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  justifyContent: "flex-end",
};

const workspaceStyle = {
  display: "grid",
  gridTemplateColumns: "280px minmax(0, 1fr) 340px",
  gap: "16px",
  alignItems: "start",
};

const centerColumnStyle = {
  display: "grid",
  gap: "16px",
};

const lowerGridStyle = {
  display: "grid",
  gridTemplateColumns: "1.25fr 0.75fr",
  gap: "16px",
};

const panelStyle = {
  background: "rgba(17, 24, 43, 0.92)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "24px",
  boxShadow: "0 26px 70px rgba(0,0,0,0.28)",
  padding: "18px",
};

const sectionLabel = {
  fontSize: "12px",
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.4px",
  color: "#7dd3fc",
  marginBottom: "8px",
};

const helperText = {
  marginTop: 0,
  color: "#cad5ef",
  lineHeight: 1.7,
  fontSize: "14px",
};

const eyebrowStyle = {
  fontSize: "12px",
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.4px",
  color: "#7dd3fc",
  marginBottom: "8px",
};

const titleStyle = {
  margin: 0,
  fontSize: "32px",
  fontWeight: 900,
  letterSpacing: "-0.8px",
};

const subtitleStyle = {
  marginTop: "12px",
  marginBottom: 0,
  fontSize: "16px",
  lineHeight: 1.7,
  color: "#cad5ef",
  maxWidth: "860px",
};

const errorBannerStyle = {
  padding: "12px 14px",
  borderRadius: "14px",
  background: "rgba(127, 29, 29, 0.30)",
  border: "1px solid rgba(248, 113, 113, 0.40)",
  color: "#fecaca",
  fontSize: "14px",
};

const roomsScrollStyle = {
  display: "grid",
  gap: "10px",
  marginTop: "14px",
  maxHeight: "720px",
  overflowY: "auto",
  paddingRight: "4px",
};

const roomCardStyle = {
  textAlign: "left",
  padding: "14px",
  borderRadius: "18px",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.04))",
  color: "#eff6ff",
  cursor: "pointer",
};

const roomCardActiveStyle = {
  border: "1px solid rgba(96, 165, 250, 0.45)",
  background: "linear-gradient(180deg, rgba(30,64,175,0.28), rgba(30,41,59,0.20))",
};

const roomTitleStyle = {
  fontSize: "15px",
  fontWeight: 900,
  marginBottom: "6px",
};

const roomMetaStyle = {
  fontSize: "13px",
  color: "#cad5ef",
  lineHeight: 1.6,
};

const roomSubMetaStyle = {
  fontSize: "12px",
  color: "#93c5fd",
  marginTop: "6px",
};

const stageHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  flexWrap: "wrap",
  marginBottom: "14px",
};

const stageTitleStyle = {
  marginTop: 0,
  marginBottom: "8px",
  fontSize: "24px",
  fontWeight: 900,
};

const stageViewportStyle = {
  width: "100%",
  aspectRatio: "16 / 9",
  borderRadius: "28px",
  background:
    "linear-gradient(180deg, rgba(26, 12, 8, 0.94), rgba(10, 7, 14, 0.96))",
  border: "1px solid rgba(255,255,255,0.08)",
  display: "grid",
  placeItems: "center",
  textAlign: "center",
  padding: "18px",
  overflow: "hidden",
  position: "relative",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
};

const stageGlowStyle = {
  position: "absolute",
  inset: 0,
  background:
    "radial-gradient(circle at top center, rgba(125,211,252,0.08), transparent 24%), radial-gradient(circle at bottom right, rgba(59,130,246,0.10), transparent 22%)",
  pointerEvents: "none",
};

const stageBadgeWrapStyle = {
  position: "absolute",
  top: "14px",
  left: "14px",
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  zIndex: 3,
};

const stageBadgeStyle = {
  padding: "8px 12px",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.08)",
  color: "#e5e7eb",
  fontSize: "12px",
  fontWeight: 800,
  backdropFilter: "blur(8px)",
};

const mainMediaStyle = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  borderRadius: "20px",
  background: "#000",
  position: "relative",
  zIndex: 1,
};

const centerMessageWrapStyle = {
  position: "relative",
  zIndex: 1,
  display: "grid",
  placeItems: "center",
  width: "100%",
  height: "100%",
  borderRadius: "20px",
  border: "1px solid rgba(255,255,255,0.06)",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
};

const centerMessageTitleStyle = {
  fontSize: "30px",
  fontWeight: 900,
  marginBottom: "10px",
};

const centerMessageTextStyle = {
  fontSize: "15px",
  lineHeight: 1.7,
  color: "#cad5ef",
  maxWidth: "700px",
};

const errorBoxStyle = {
  marginTop: "14px",
  padding: "12px",
  borderRadius: "14px",
  background: "rgba(127, 29, 29, 0.3)",
  border: "1px solid rgba(248, 113, 113, 0.4)",
  color: "#fecaca",
  fontSize: "14px",
  lineHeight: 1.6,
  maxWidth: "760px",
  marginLeft: "auto",
  marginRight: "auto",
};

const floatingHostBoxStyle = {
  position: "absolute",
  right: "18px",
  bottom: "18px",
  width: "190px",
  aspectRatio: "4 / 5",
  borderRadius: "22px",
  overflow: "hidden",
  border: "1px solid rgba(255,255,255,0.16)",
  boxShadow: "0 18px 36px rgba(0,0,0,0.38)",
  background: "rgba(3, 7, 18, 0.94)",
  zIndex: 5,
};

const floatingVideoStyle = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  background: "#000",
};

const floatingLabelStyle = {
  position: "absolute",
  left: "8px",
  right: "8px",
  bottom: "8px",
  padding: "6px 8px",
  borderRadius: "999px",
  background: "rgba(0,0,0,0.58)",
  color: "#ffffff",
  fontSize: "11px",
  fontWeight: 800,
  textAlign: "center",
};

const shareDockButtonStyle = {
  position: "absolute",
  left: "18px",
  bottom: "18px",
  width: "168px",
  aspectRatio: "1 / 1",
  borderRadius: "22px",
  overflow: "hidden",
  border: "1px solid rgba(255,255,255,0.16)",
  boxShadow: "0 16px 34px rgba(0,0,0,0.34)",
  background: "rgba(3, 7, 18, 0.92)",
  cursor: "pointer",
  padding: 0,
  zIndex: 5,
};

const shareDockVideoStyle = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  background: "#000",
};

const returnDockButtonStyle = {
  position: "absolute",
  left: "18px",
  bottom: "18px",
  minHeight: "36px",
  padding: "8px 12px",
  borderRadius: "999px",
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(0,0,0,0.58)",
  color: "#ffffff",
  fontSize: "12px",
  fontWeight: 800,
  cursor: "pointer",
  zIndex: 5,
};

const topRightPillStyle = {
  position: "absolute",
  top: "14px",
  right: "14px",
  padding: "8px 12px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 800,
  backdropFilter: "blur(8px)",
  zIndex: 5,
};

const chatScrollStyle = {
  borderRadius: "18px",
  border: "1px solid rgba(255,255,255,0.08)",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.04))",
  padding: "14px",
  maxHeight: "360px",
  overflowY: "auto",
  display: "grid",
  gap: "10px",
  marginTop: "14px",
};

const chatCardStyle = {
  padding: "12px",
  borderRadius: "16px",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(17, 24, 43, 0.78)",
  display: "grid",
  gap: "6px",
};

const chatTopStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  flexWrap: "wrap",
};

const chatAuthorStyle = {
  fontSize: "14px",
  fontWeight: 900,
  color: "#ffffff",
};

const chatTimeStyle = {
  fontSize: "12px",
  color: "#98a8ca",
};

const chatRoleStyle = {
  fontSize: "12px",
  color: "#7dd3fc",
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.3px",
};

const chatTextStyle = {
  fontSize: "14px",
  color: "#eef4ff",
  lineHeight: 1.7,
  whiteSpace: "pre-wrap",
};

const chatComposeStyle = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: "10px",
  alignItems: "stretch",
  marginTop: "14px",
};

const chatTextareaStyle = {
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

const participantsScrollStyle = {
  display: "grid",
  gap: "10px",
  maxHeight: "425px",
  overflowY: "auto",
  marginTop: "14px",
};

const participantCardStyle = {
  padding: "12px",
  borderRadius: "16px",
  border: "1px solid rgba(255,255,255,0.08)",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.04))",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
};

const participantNameStyle = {
  fontSize: "14px",
  fontWeight: 900,
  color: "#ffffff",
  marginBottom: "4px",
};

const participantRoleStyle = {
  fontSize: "13px",
  color: "#cad5ef",
};

const participantPillStyle = {
  padding: "6px 10px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 800,
  whiteSpace: "nowrap",
};

const bulletinStatusStyle = {
  padding: "12px",
  borderRadius: "14px",
  background: "rgba(245, 158, 11, 0.18)",
  border: "1px solid rgba(251, 191, 36, 0.22)",
  color: "#fde68a",
  fontSize: "13px",
  lineHeight: 1.6,
  marginTop: "14px",
};

const bulletinFileStyle = {
  padding: "12px",
  borderRadius: "14px",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "#dbeafe",
  fontSize: "13px",
  lineHeight: 1.6,
  marginTop: "14px",
};

const bulletinBodyStyle = {
  borderRadius: "18px",
  border: "1px solid rgba(255,255,255,0.08)",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.04))",
  padding: "14px",
  maxHeight: "520px",
  overflowY: "auto",
  whiteSpace: "pre-wrap",
  lineHeight: 1.7,
  color: "#eef4ff",
  fontSize: "14px",
  marginTop: "14px",
};

const miniHubDockStyle = {
  position: "fixed",
  right: "24px",
  bottom: "24px",
  zIndex: 50,
  display: "grid",
  gap: "12px",
  justifyItems: "end",
};

const miniHubPanelStyle = {
  width: "320px",
  borderRadius: "20px",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(8, 14, 28, 0.95)",
  boxShadow: "0 22px 50px rgba(0,0,0,0.35)",
  overflow: "hidden",
  backdropFilter: "blur(12px)",
};

const miniHubHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "12px 14px",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
};

const miniHubEyebrowStyle = {
  fontSize: "11px",
  fontWeight: 800,
  color: "#7dd3fc",
  textTransform: "uppercase",
  letterSpacing: "0.4px",
};

const miniHubTitleStyle = {
  fontSize: "14px",
  fontWeight: 900,
  color: "#ffffff",
  marginTop: "4px",
};

const miniHubTabsStyle = {
  display: "flex",
  gap: "8px",
  padding: "12px 12px 0 12px",
  flexWrap: "wrap",
};

const miniHubBodyStyle = {
  padding: "14px",
};

const hubBodyStyle = {
  display: "grid",
  gap: "10px",
};

const hubTitleStyle = {
  fontSize: "15px",
  fontWeight: 900,
  color: "#ffffff",
};

const hubTextStyle = {
  fontSize: "13px",
  color: "#dbeafe",
  lineHeight: 1.6,
};

const hubInputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.06)",
  color: "#fff",
  fontSize: "14px",
  outline: "none",
  boxSizing: "border-box",
};

const hubTextareaStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.06)",
  color: "#fff",
  fontSize: "14px",
  outline: "none",
  resize: "vertical",
  boxSizing: "border-box",
};

const moderatorsListStyle = {
  display: "grid",
  gap: "8px",
};

const moderatorRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
  padding: "10px",
  borderRadius: "12px",
  background: "rgba(255,255,255,0.06)",
};

const miniHubBarStyle = {
  display: "flex",
  gap: "8px",
  padding: "10px",
  borderRadius: "18px",
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(8, 14, 28, 0.92)",
  boxShadow: "0 18px 40px rgba(0,0,0,0.30)",
  backdropFilter: "blur(10px)",
};

const hubIconButtonStyle = {
  width: "42px",
  height: "42px",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.06)",
  color: "#fff",
  fontSize: "18px",
  cursor: "pointer",
};

const hubCloseButtonStyle = {
  width: "34px",
  height: "34px",
  borderRadius: "10px",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.06)",
  color: "#fff",
  fontSize: "14px",
  cursor: "pointer",
};

const buttonPrimary = {
  minHeight: "40px",
  padding: "10px 14px",
  borderRadius: "14px",
  border: "none",
  background: "linear-gradient(180deg, #3b82f6, #2563eb)",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
};

const buttonSecondary = {
  minHeight: "40px",
  padding: "10px 14px",
  borderRadius: "14px",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.08)",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
};

const buttonPurple = {
  minHeight: "40px",
  padding: "10px 14px",
  borderRadius: "14px",
  border: "none",
  background: "linear-gradient(180deg, #8b5cf6, #7c3aed)",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
};

const buttonBlue = {
  minHeight: "40px",
  padding: "10px 14px",
  borderRadius: "14px",
  border: "none",
  background: "linear-gradient(180deg, #0ea5e9, #2563eb)",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
};

const disabledButton = {
  minHeight: "40px",
  padding: "10px 14px",
  borderRadius: "14px",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.04)",
  color: "rgba(255,255,255,0.45)",
  fontWeight: 800,
  cursor: "not-allowed",
};

const smallDangerButton = {
  minHeight: "32px",
  padding: "6px 10px",
  borderRadius: "10px",
  border: "none",
  background: "linear-gradient(180deg, #ef4444, #b91c1c)",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
  fontSize: "12px",
};

const disabledSmallButton = {
  minHeight: "32px",
  padding: "6px 10px",
  borderRadius: "10px",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.04)",
  color: "rgba(255,255,255,0.45)",
  fontWeight: 800,
  cursor: "not-allowed",
  fontSize: "12px",
}; 
