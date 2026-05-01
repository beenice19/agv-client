import React, { useEffect, useMemo, useRef, useState } from "react";

const API_BASE = "http://127.0.0.1:8787";

const DEFAULT_ROOMS = [
  {
    id: "main-hall",
    name: "Main Hall",
    host: "Admin",
    assignedHost: "Admin",
    moderators: ["Admin"],
    isPrivate: false,
    category: "Convention",
  },
  {
    id: "studio-a",
    name: "Studio A",
    host: "Admin",
    assignedHost: "Admin",
    moderators: [],
    isPrivate: false,
    category: "Media",
  },
  {
    id: "radio-room",
    name: "Radio Room",
    host: "Admin",
    assignedHost: "Admin",
    moderators: [],
    isPrivate: false,
    category: "Broadcast",
  },
  {
    id: "prayer-room",
    name: "Prayer Room",
    host: "Admin",
    assignedHost: "Admin",
    moderators: [],
    isPrivate: true,
    category: "Community",
  },
  {
    id: "classroom-1",
    name: "Classroom 1",
    host: "Admin",
    assignedHost: "Admin",
    moderators: [],
    isPrivate: false,
    category: "Teaching",
  },
  {
    id: "green-room",
    name: "Green Room",
    host: "Admin",
    assignedHost: "Admin",
    moderators: [],
    isPrivate: true,
    category: "Backstage",
  },
];

function App() {
  const [displayName, setDisplayName] = useState("Admin");
  const [rooms, setRooms] = useState(DEFAULT_ROOMS);
  const [selectedRoomId, setSelectedRoomId] = useState(DEFAULT_ROOMS[0].id);

  const [statusText, setStatusText] = useState("Ready");
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [screenShareOn, setScreenShareOn] = useState(false);
  const [userRole, setUserRole] = useState("superadmin");

  const [localCameraStream, setLocalCameraStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);

  const [hostInput, setHostInput] = useState("");
  const [moderatorInput, setModeratorInput] = useState("");

  const stageVideoRef = useRef(null);

  const selectedRoom = useMemo(() => {
    return rooms.find((room) => room.id === selectedRoomId) || rooms[0];
  }, [rooms, selectedRoomId]);

  useEffect(() => {
    loadRoomsFromServer();
  }, []);

  useEffect(() => {
    if (!selectedRoom) return;

    if (displayName.trim() === "Admin") {
      setUserRole("superadmin");
      return;
    }

    if (
      selectedRoom.assignedHost === displayName.trim() ||
      selectedRoom.host === displayName.trim()
    ) {
      setUserRole("host");
      return;
    }

    if (
      Array.isArray(selectedRoom.moderators) &&
      selectedRoom.moderators.includes(displayName.trim())
    ) {
      setUserRole("moderator");
      return;
    }

    setUserRole("viewer");
  }, [selectedRoom, displayName]);

  useEffect(() => {
    const video = stageVideoRef.current;
    if (!video) return;

    if (screenShareOn && screenStream) {
      if (video.srcObject !== screenStream) {
        video.srcObject = screenStream;
      }
      return;
    }

    if (cameraOn && localCameraStream) {
      if (video.srcObject !== localCameraStream) {
        video.srcObject = localCameraStream;
      }
      return;
    }

    video.srcObject = null;
  }, [cameraOn, screenShareOn, localCameraStream, screenStream]);

  useEffect(() => {
    return () => {
      stopCameraTracks();
      stopScreenTracks();
    };
  }, []);

  async function loadRoomsFromServer() {
    try {
      const res = await fetch(
        `${API_BASE}/api/rooms?user=${encodeURIComponent(displayName.trim() || "Admin")}`
      );

      if (!res.ok) {
        throw new Error("Room fetch failed");
      }

      const data = await res.json();

      if (!Array.isArray(data?.rooms) || data.rooms.length === 0) {
        setRooms(DEFAULT_ROOMS);
        setStatusText("Using local rooms");
        return;
      }

      const normalized = data.rooms.map((room, index) => ({
        id: String(room.id || room.slug || room.roomId || `room-${index + 1}`),
        name: String(room.name || room.title || `Room ${index + 1}`),
        host: String(room.host || room.assignedHost || "Admin"),
        assignedHost: String(room.assignedHost || room.host || "Admin"),
        moderators: Array.isArray(room.moderators) ? room.moderators : [],
        isPrivate: Boolean(room.isPrivate || room.private || false),
        category: String(room.category || "Room"),
        myRole: String(room.myRole || "viewer"),
        permissions: room.permissions || {},
      }));

      setRooms(normalized);

      const stillExists = normalized.some((room) => room.id === selectedRoomId);
      if (!stillExists && normalized.length > 0) {
        setSelectedRoomId(normalized[0].id);
      }

      setStatusText("Rooms loaded from server");
    } catch (error) {
      console.error(error);
      setRooms(DEFAULT_ROOMS);
      setStatusText("Using local rooms");
    }
  }

  async function handleToggleCamera() {
    if (userRole !== "host" && userRole !== "superadmin") {
      setStatusText("Only the assigned host can use the stage camera");
      return;
    }

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
    if (userRole !== "host" && userRole !== "superadmin") {
      setStatusText("Only the assigned host can use the microphone");
      return;
    }

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
    if (userRole !== "host" && userRole !== "superadmin") {
      setStatusText("Only the assigned host can share the stage");
      return;
    }

    if (screenShareOn) {
      stopScreenTracks();
      setScreenShareOn(false);
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
          setStatusText("Screen share ended");
        };
      }

      setScreenStream(stream);
      setScreenShareOn(true);
      setStatusText("Screen sharing live");
    } catch (error) {
      console.error(error);
      setStatusText("Screen share canceled");
    }
  }

  async function handleAssignHost() {
    const nextHost = hostInput.trim();

    if (!nextHost) {
      setStatusText("Enter a host name first");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/rooms/${selectedRoom.id}/assign-host`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          actingUser: displayName.trim(),
          user: nextHost,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatusText(data?.error || "Could not assign host");
        return;
      }

      setStatusText(`Assigned host: ${nextHost}`);
      setHostInput("");
      await loadRoomsFromServer();
    } catch (error) {
      console.error(error);
      setStatusText("Could not assign host");
    }
  }

  async function handleAddModerator() {
    const nextModerator = moderatorInput.trim();

    if (!nextModerator) {
      setStatusText("Enter a moderator name first");
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE}/api/rooms/${selectedRoom.id}/add-moderator`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            actingUser: displayName.trim(),
            user: nextModerator,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setStatusText(data?.error || "Could not add moderator");
        return;
      }

      setStatusText(`Added moderator: ${nextModerator}`);
      setModeratorInput("");
      await loadRoomsFromServer();
    } catch (error) {
      console.error(error);
      setStatusText("Could not add moderator");
    }
  }

  async function handleRemoveModerator(name) {
    try {
      const res = await fetch(
        `${API_BASE}/api/rooms/${selectedRoom.id}/remove-moderator`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            actingUser: displayName.trim(),
            user: name,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setStatusText(data?.error || "Could not remove moderator");
        return;
      }

      setStatusText(`Removed moderator: ${name}`);
      await loadRoomsFromServer();
    } catch (error) {
      console.error(error);
      setStatusText("Could not remove moderator");
    }
  }

  async function handleTogglePrivacy() {
    try {
      const res = await fetch(`${API_BASE}/api/rooms/${selectedRoom.id}/privacy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          actingUser: displayName.trim(),
          isPrivate: !selectedRoom.isPrivate,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatusText(data?.error || "Could not change privacy");
        return;
      }

      setStatusText(
        !selectedRoom.isPrivate ? "Room set to private" : "Room set to public"
      );
      await loadRoomsFromServer();
    } catch (error) {
      console.error(error);
      setStatusText("Could not change privacy");
    }
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

  function roleLabel(role) {
    if (role === "superadmin") return "ADMIN";
    if (role === "host") return "HOST";
    if (role === "moderator") return "MODERATOR";
    return "PARTICIPANT";
  }

  const canManageModerators =
    userRole === "superadmin" || userRole === "host";

  const canAssignHost = userRole === "superadmin";

  const canManagePrivacy =
    userRole === "superadmin" || userRole === "host" || userRole === "moderator";

  return (
    <div style={styles.appShell}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Stro Cheivery</h1>
          <div style={styles.subtitle}>Safe Pass 2 — Client Authority Surface</div>
        </div>

        <div style={styles.statusWrap}>
          <div style={styles.statusPill}>{statusText}</div>
        </div>
      </div>

      <div style={styles.content}>
        <div style={styles.topBar}>
          <div style={styles.card}>
            <label style={styles.label}>Display Name</label>
            <input
              style={styles.input}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter display name"
            />
            <button
              onClick={loadRoomsFromServer}
              style={{ ...styles.secondaryButton, marginTop: 10, width: "100%" }}
            >
              Refresh Role / Rooms
            </button>
          </div>

          <div style={styles.card}>
            <div style={styles.infoLabel}>Current Room</div>
            <div style={styles.infoValue}>{selectedRoom?.name || "Room"}</div>
            <div style={styles.smallText}>
              {selectedRoom?.category || "Room"} •{" "}
              {selectedRoom?.isPrivate ? "Private" : "Public"}
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.infoLabel}>Assigned Host</div>
            <div style={styles.infoValue}>
              {selectedRoom?.assignedHost || selectedRoom?.host || "Admin"}
            </div>
            <div style={styles.smallText}>
              Moderators:{" "}
              {selectedRoom?.moderators?.length
                ? selectedRoom.moderators.join(", ")
                : "None"}
            </div>
          </div>

          <div style={styles.roleCard(userRole)}>
            <div style={styles.infoLabel}>Your Role</div>
            <div style={styles.infoValue}>{roleLabel(userRole)}</div>
          </div>
        </div>

        <div style={styles.roomGrid}>
          {rooms.map((room) => {
            const active = room.id === selectedRoomId;

            return (
              <button
                key={room.id}
                onClick={() => {
                  setSelectedRoomId(room.id);
                  setStatusText(`Entered ${room.name}`);
                }}
                style={active ? styles.roomButtonActive : styles.roomButton}
              >
                <div style={styles.roomName}>{room.name}</div>
                <div style={styles.roomMeta}>
                  {room.category} • {room.isPrivate ? "Private" : "Public"}
                </div>
                <div style={styles.roomHost}>
                  Host: {room.assignedHost || room.host || "Admin"}
                </div>
                <div style={styles.roomMeta}>
                  Mods: {room.moderators?.length ? room.moderators.join(", ") : "None"}
                </div>
              </button>
            );
          })}
        </div>

        <div style={styles.mainGrid}>
          <div style={styles.leftColumn}>
            <div style={styles.controlBar}>
              <button onClick={handleToggleCamera} style={styles.actionButton}>
                {cameraOn ? "Stop Camera" : "Start Camera"}
              </button>

              <button onClick={handleToggleMic} style={styles.actionButton}>
                {micOn ? "Mute Mic" : "Unmute Mic"}
              </button>

              <button onClick={handleToggleScreenShare} style={styles.actionButton}>
                {screenShareOn ? "Stop Share" : "Share Screen"}
              </button>
            </div>

            <div style={styles.stageShell}>
              <div style={styles.stageHeader}>
                <div style={styles.stageTitle}>Main Stage</div>
                <div style={styles.stageMeta}>
                  {screenShareOn ? "Screen Share Live" : cameraOn ? "Camera Live" : "Idle"}
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
                  <div style={styles.placeholder}>
                    <div style={styles.placeholderTitle}>Stage Ready</div>
                    <div style={styles.placeholderText}>
                      Host or Admin can start camera or screen share.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={styles.rightColumn}>
            <div style={styles.panel}>
              <div style={styles.panelTitle}>Authority Panel</div>

              <div style={styles.ruleRow}>
                <span>Admin</span>
                <span>All rooms / all controls</span>
              </div>
              <div style={styles.ruleRow}>
                <span>Host</span>
                <span>Stage + moderator management</span>
              </div>
              <div style={styles.ruleRow}>
                <span>Moderator</span>
                <span>Room operations only</span>
              </div>
              <div style={styles.ruleRow}>
                <span>Viewer</span>
                <span>Watch only</span>
              </div>
            </div>

            <div style={styles.panel}>
              <div style={styles.panelTitle}>Assign Host</div>
              <input
                style={styles.input}
                value={hostInput}
                onChange={(e) => setHostInput(e.target.value)}
                placeholder="Enter new host name"
              />
              <button
                onClick={handleAssignHost}
                style={canAssignHost ? styles.actionButton : styles.disabledButton}
                disabled={!canAssignHost}
              >
                Assign Host
              </button>
            </div>

            <div style={styles.panel}>
              <div style={styles.panelTitle}>Moderators</div>
              <input
                style={styles.input}
                value={moderatorInput}
                onChange={(e) => setModeratorInput(e.target.value)}
                placeholder="Enter moderator name"
              />
              <button
                onClick={handleAddModerator}
                style={canManageModerators ? styles.actionButton : styles.disabledButton}
                disabled={!canManageModerators}
              >
                Add Moderator
              </button>

              <div style={{ marginTop: 12 }}>
                {selectedRoom?.moderators?.length ? (
                  selectedRoom.moderators.map((name) => (
                    <div key={name} style={styles.modRow}>
                      <span>{name}</span>
                      <button
                        onClick={() => handleRemoveModerator(name)}
                        style={
                          canManageModerators ? styles.smallDangerButton : styles.disabledSmallButton
                        }
                        disabled={!canManageModerators}
                      >
                        Remove
                      </button>
                    </div>
                  ))
                ) : (
                  <div style={styles.smallText}>No moderators assigned</div>
                )}
              </div>
            </div>

            <div style={styles.panel}>
              <div style={styles.panelTitle}>Room Privacy</div>
              <div style={styles.smallText}>
                Current: {selectedRoom?.isPrivate ? "Private" : "Public"}
              </div>
              <button
                onClick={handleTogglePrivacy}
                style={canManagePrivacy ? styles.secondaryButton : styles.disabledButton}
                disabled={!canManagePrivacy}
              >
                Make {selectedRoom?.isPrivate ? "Public" : "Private"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function enableAudioTracks(stream, enabled) {
  stream.getAudioTracks().forEach((track) => {
    track.enabled = enabled;
  });
}

const styles = {
  appShell: {
    minHeight: "100vh",
    background: "#0b1220",
    color: "#ffffff",
    fontFamily: "Arial, Helvetica, sans-serif",
    padding: 20,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    marginBottom: 20,
    flexWrap: "wrap",
  },
  title: {
    margin: 0,
    fontSize: 32,
  },
  subtitle: {
    marginTop: 6,
    color: "#a7b4d6",
  },
  statusWrap: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  statusPill: {
    background: "#16233d",
    border: "1px solid #2b426f",
    borderRadius: 999,
    padding: "10px 14px",
  },
  content: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  topBar: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 14,
  },
  card: {
    background: "#121b2f",
    border: "1px solid #243556",
    borderRadius: 14,
    padding: 14,
  },
  roleCard: (role) => ({
    background:
      role === "superadmin" || role === "host" || role === "moderator"
        ? "#14253d"
        : "#121b2f",
    border:
      role === "superadmin" || role === "host" || role === "moderator"
        ? "1px solid #3e6bb0"
        : "1px solid #243556",
    borderRadius: 14,
    padding: 14,
  }),
  label: {
    display: "block",
    marginBottom: 8,
    color: "#a7b4d6",
    fontSize: 13,
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 10,
    border: "1px solid #31476f",
    outline: "none",
    background: "#0d1526",
    color: "#ffffff",
    marginBottom: 10,
    boxSizing: "border-box",
  },
  infoLabel: {
    color: "#a7b4d6",
    fontSize: 13,
    marginBottom: 8,
  },
  infoValue: {
    fontWeight: 700,
    fontSize: 18,
  },
  smallText: {
    color: "#a7b4d6",
    fontSize: 13,
    marginTop: 8,
    lineHeight: 1.4,
  },
  roomGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 12,
  },
  roomButton: {
    textAlign: "left",
    background: "#121b2f",
    border: "1px solid #243556",
    borderRadius: 14,
    padding: 14,
    color: "#ffffff",
    cursor: "pointer",
  },
  roomButtonActive: {
    textAlign: "left",
    background: "#183153",
    border: "1px solid #5c8ee6",
    borderRadius: 14,
    padding: 14,
    color: "#ffffff",
    cursor: "pointer",
  },
  roomName: {
    fontWeight: 700,
    fontSize: 18,
    marginBottom: 6,
  },
  roomMeta: {
    color: "#a7b4d6",
    fontSize: 13,
    marginBottom: 6,
  },
  roomHost: {
    color: "#dbe8ff",
    fontSize: 14,
    fontWeight: 600,
  },
  mainGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.5fr) minmax(320px, 0.9fr)",
    gap: 20,
    alignItems: "start",
  },
  leftColumn: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  rightColumn: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  controlBar: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  actionButton: {
    background: "#315ea8",
    border: "1px solid #5f8fe4",
    color: "#ffffff",
    borderRadius: 10,
    padding: "12px 16px",
    cursor: "pointer",
  },
  secondaryButton: {
    background: "#17263f",
    border: "1px solid #36537f",
    color: "#ffffff",
    borderRadius: 10,
    padding: "12px 16px",
    cursor: "pointer",
  },
  disabledButton: {
    background: "#1a2130",
    border: "1px solid #2d384e",
    color: "#7f8aa3",
    borderRadius: 10,
    padding: "12px 16px",
    cursor: "not-allowed",
  },
  smallDangerButton: {
    background: "#5a1f2a",
    border: "1px solid #9d4658",
    color: "#ffffff",
    borderRadius: 8,
    padding: "8px 10px",
    cursor: "pointer",
  },
  disabledSmallButton: {
    background: "#1a2130",
    border: "1px solid #2d384e",
    color: "#7f8aa3",
    borderRadius: 8,
    padding: "8px 10px",
    cursor: "not-allowed",
  },
  stageShell: {
    background: "#121b2f",
    border: "1px solid #243556",
    borderRadius: 18,
    padding: 14,
  },
  stageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
    flexWrap: "wrap",
  },
  stageTitle: {
    fontSize: 18,
    fontWeight: 700,
  },
  stageMeta: {
    color: "#a7b4d6",
    fontSize: 13,
  },
  stageViewport: {
    width: "100%",
    maxWidth: "100%",
    aspectRatio: "16 / 9",
    background: "#000000",
    borderRadius: 14,
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  stageVideo: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    background: "#000000",
  },
  placeholder: {
    textAlign: "center",
    padding: 24,
    color: "#dce7ff",
  },
  placeholderTitle: {
    fontSize: 22,
    fontWeight: 700,
    marginBottom: 8,
  },
  placeholderText: {
    color: "#a7b4d6",
  },
  panel: {
    background: "#121b2f",
    border: "1px solid #243556",
    borderRadius: 14,
    padding: 14,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 12,
  },
  ruleRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    padding: "8px 0",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    fontSize: 14,
  },
  modRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    padding: "8px 0",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
};

export default App;