import React, { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8787";
const TOKEN_KEY = "stro_cheivery_auth_token";
const SESSION_KEY = "stro_cheivery_session_id";
const DEVICE_CAMERA_KEY = "agv_selected_camera_device_id";
const DEVICE_MIC_KEY = "agv_selected_mic_device_id";

const DEFAULT_ROOMS = [
  { id: "main-hall", name: "Main Hall", category: "Convention", isPrivate: false, isLocked: false, assignedHost: "Admin", host: "Admin", moderators: ["Admin"] },
  { id: "studio-a", name: "Studio A", category: "Media", isPrivate: false, isLocked: false, assignedHost: "Admin", host: "Admin", moderators: [] },
  { id: "radio-room", name: "Radio Room", category: "Broadcast", isPrivate: false, isLocked: false, assignedHost: "Admin", host: "Admin", moderators: [] },
  { id: "prayer-room", name: "Prayer Room", category: "Community", isPrivate: true, isLocked: false, assignedHost: "Admin", host: "Admin", moderators: [] },
  { id: "classroom-1", name: "Classroom 1", category: "Teaching", isPrivate: false, isLocked: false, assignedHost: "Admin", host: "Admin", moderators: [] },
  { id: "green-room", name: "Green Room", category: "Backstage", isPrivate: true, isLocked: false, assignedHost: "Admin", host: "Admin", moderators: [] },
];

const RTC_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

function getClientSessionId() {
  const existing = window.sessionStorage.getItem(SESSION_KEY);
  if (existing) return existing;

  const created = `agv-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  window.sessionStorage.setItem(SESSION_KEY, created);
  return created;
}

function normalizeRoom(room, index = 0) {
  return {
    id: String(room?.id || `room-${index + 1}`),
    name: String(room?.name || `Room ${index + 1}`),
    category: String(room?.category || "Room"),
    isPrivate: Boolean(room?.isPrivate),
    isLocked: Boolean(room?.isLocked),
    assignedHost: String(room?.assignedHost || room?.host || "Admin"),
    host: String(room?.host || room?.assignedHost || "Admin"),
    moderators: Array.isArray(room?.moderators) ? room.moderators : [],
  };
}

function normalizeStageKind(file) {
  const type = String(file?.type || "").toLowerCase();
  const name = String(file?.name || "").toLowerCase();

  if (type.startsWith("image/")) return "image";
  if (type === "video/mp4" || name.endsWith(".mp4")) return "video";
  if (type === "application/pdf" || name.endsWith(".pdf")) return "pdf";

  return "unsupported";
}

function App() {
  const [authToken, setAuthToken] = useState(() => window.localStorage.getItem(TOKEN_KEY) || "");
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [rooms, setRooms] = useState(DEFAULT_ROOMS);
  const [selectedRoomId, setSelectedRoomId] = useState(DEFAULT_ROOMS[0].id);
  const [selectedPanel, setSelectedPanel] = useState("chat");
  const [roomSearch, setRoomSearch] = useState("");

  const [messagesByRoom, setMessagesByRoom] = useState({});
  const [bulletinItemsByRoom, setBulletinItemsByRoom] = useState({});
  const [participantsByRoom, setParticipantsByRoom] = useState({});
  const [bulletinSourceByRoom, setBulletinSourceByRoom] = useState({});
  const [chatInput, setChatInput] = useState("");
  const [newAnnouncement, setNewAnnouncement] = useState("");

  const [adminUsers, setAdminUsers] = useState([]);
  const [createUserUsername, setCreateUserUsername] = useState("");
  const [createUserDisplayName, setCreateUserDisplayName] = useState("");
  const [createUserPassword, setCreateUserPassword] = useState("");
  const [createUserRole, setCreateUserRole] = useState("user");

  const [hostInput, setHostInput] = useState("");
  const [moderatorInput, setModeratorInput] = useState("");
  const [newRoomName, setNewRoomName] = useState("");

  const [statusText, setStatusText] = useState("Ready");
  const [clientSessionId] = useState(() => getClientSessionId());

  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [screenShareOn, setScreenShareOn] = useState(false);

  const [localCameraStream, setLocalCameraStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [remoteStageStream, setRemoteStageStream] = useState(null);

  const [broadcastInfo, setBroadcastInfo] = useState(null);
  const [broadcastMode, setBroadcastMode] = useState("");

  const [stageContent, setStageContent] = useState(null);

  const [cameraDevices, setCameraDevices] = useState([]);
  const [microphoneDevices, setMicrophoneDevices] = useState([]);
  const [selectedCameraDeviceId, setSelectedCameraDeviceId] = useState(() => window.localStorage.getItem(DEVICE_CAMERA_KEY) || "");
  const [selectedMicDeviceId, setSelectedMicDeviceId] = useState(() => window.localStorage.getItem(DEVICE_MIC_KEY) || "");

  const stageVideoRef = useRef(null);
  const stageContentFileRef = useRef(null);
  const bulletinFileRef = useRef(null);
  const socketRef = useRef(null);
  const heartbeatRef = useRef(null);
  const previousRoomIdRef = useRef(null);

  const localBroadcastStreamRef = useRef(null);
  const hostPeerConnectionsRef = useRef({});
  const viewerPeerConnectionRef = useRef(null);
  const remoteStageStreamRef = useRef(null);

  const selectedRoom = useMemo(() => {
    return rooms.find((room) => room.id === selectedRoomId) || rooms[0];
  }, [rooms, selectedRoomId]);

  const selectedRoomMessages = messagesByRoom[selectedRoomId] || [];
  const selectedRoomBulletins = bulletinItemsByRoom[selectedRoomId] || [];
  const selectedRoomParticipants = participantsByRoom[selectedRoomId] || [];

  const userRole = useMemo(() => {
    if (!authUser || !selectedRoom) return "viewer";

    if (authUser.globalRole === "superadmin") return "superadmin";

    if (selectedRoom.assignedHost === authUser.displayName || selectedRoom.host === authUser.displayName) {
      return "host";
    }

    if (Array.isArray(selectedRoom.moderators) && selectedRoom.moderators.includes(authUser.displayName)) {
      return "moderator";
    }

    return "viewer";
  }, [authUser, selectedRoom]);

  const isSuperadmin = userRole === "superadmin";
  const isHost = userRole === "host";
  const isModerator = userRole === "moderator";
  const isViewerOnly = userRole === "viewer";
  const canOperateRoom = isSuperadmin || isHost || isModerator;
  const canControlStage = isSuperadmin || isHost;

  const roleText = isSuperadmin ? "ADMIN" : isHost ? "HOST" : isModerator ? "MODERATOR" : "VIEWER";

  const activeStageStream = canControlStage
    ? screenShareOn
      ? screenStream
      : cameraOn
      ? localCameraStream
      : null
    : remoteStageStream;

  const liveStatusText = broadcastInfo
    ? `${String(broadcastInfo.mode || "stage").toUpperCase()} LIVE`
    : stageContent
    ? "File on Stage"
    : "Standby";

  const filteredRooms = useMemo(() => {
    const q = roomSearch.trim().toLowerCase();

    if (!q) return rooms;

    return rooms.filter((room) => {
      return (
        room.name.toLowerCase().includes(q) ||
        room.category.toLowerCase().includes(q) ||
        String(room.assignedHost || room.host || "").toLowerCase().includes(q)
      );
    });
  }, [rooms, roomSearch]);

  const inviteLink = useMemo(() => {
    const base = window.location.origin || "http://127.0.0.1:5175";
    return `${base}/?room=${encodeURIComponent(selectedRoomId)}`;
  }, [selectedRoomId]);

  useEffect(() => {
    if (isViewerOnly && selectedPanel === "controls") {
      setSelectedPanel("chat");
    }
  }, [isViewerOnly, selectedPanel]);

  useEffect(() => {
    if (!authToken) {
      setAuthUser(null);
      setAuthLoading(false);
      disconnectSocket();
      return;
    }

    bootstrap();
  }, [authToken]);

  useEffect(() => {
    if (!authUser || !selectedRoomId) return;

    loadRoomState(selectedRoomId);
    joinPresence(selectedRoomId);

    if (socketRef.current) {
      socketRef.current.emit("room:subscribe", {
        roomId: selectedRoomId,
        sessionId: clientSessionId,
      });

      if (isViewerOnly) {
        socketRef.current.emit("viewer:request-stage", {
          roomId: selectedRoomId,
        });
      }
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.emit("room:unsubscribe", {
          roomId: selectedRoomId,
        });
      }

      closeViewerPeer();
    };
  }, [authUser, selectedRoomId, isViewerOnly]);

  useEffect(() => {
    if (heartbeatRef.current) {
      window.clearInterval(heartbeatRef.current);
    }

    if (!authUser || !selectedRoomId) return;

    heartbeatRef.current = window.setInterval(() => {
      sendPresenceHeartbeat(selectedRoomId);
    }, 10000);

    return () => {
      if (heartbeatRef.current) {
        window.clearInterval(heartbeatRef.current);
      }
    };
  }, [authUser, selectedRoomId]);

  useEffect(() => {
    const stageVideo = stageVideoRef.current;
    if (!stageVideo) return;

    if (activeStageStream) {
      if (stageVideo.srcObject !== activeStageStream) {
        stageVideo.srcObject = activeStageStream;
      }
      return;
    }

    stageVideo.srcObject = null;
  }, [activeStageStream]);

  useEffect(() => {
    loadMediaDevices();

    const handleBeforeUnload = () => {
      try {
        navigator.sendBeacon(
          `${API_BASE}/api/presence/disconnect`,
          new Blob(
            [JSON.stringify({ sessionId: clientSessionId })],
            { type: "application/json" }
          )
        );
      } catch (error) {
        // Safe no-op.
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      stopCameraTracks();
      stopScreenTracks();
      closeAllPeerConnections();
      disconnectSocket();

      if (stageContent?.localObjectUrl) {
        URL.revokeObjectURL(stageContent.localObjectUrl);
      }
    };
  }, []);

  async function bootstrap() {
    setAuthLoading(true);

    const me = await fetchMe();

    if (!me) {
      logout();
      setAuthLoading(false);
      return;
    }

    setAuthUser(me);
    setStatusText(`Signed in as ${me.displayName}`);

    await loadRooms();

    if (me.globalRole === "superadmin") {
      await loadAdminUsers();
    }

    connectSocket();
    setAuthLoading(false);
  }

  function authHeaders() {
    return {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    };
  }

  async function fetchJson(url, options = {}) {
    const res = await fetch(url, {
      ...options,
      headers: {
        ...authHeaders(),
        ...(options.headers || {}),
      },
    });

    let data = null;

    try {
      data = await res.json();
    } catch (error) {
      data = null;
    }

    return { res, data };
  }

  async function fetchMe() {
    try {
      const { res, data } = await fetchJson(`${API_BASE}/api/auth/me`, {
        method: "GET",
      });

      if (!res.ok || !data?.ok || !data?.user) {
        return null;
      }

      return data.user;
    } catch (error) {
      return null;
    }
  }

  async function handleLogin() {
    setLoginError("");

    const username = loginUsername.trim();
    const password = loginPassword;

    if (!username || !password) {
      setLoginError("Enter your username and password.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok || !data?.token || !data?.user) {
        setLoginError(data?.error || "Sign-in failed. Check your account details or invitation.");
        return;
      }

      window.localStorage.setItem(TOKEN_KEY, data.token);
      setAuthToken(data.token);
      setAuthUser(data.user);
      setStatusText(`Signed in as ${data.user.displayName}`);
    } catch (error) {
      setLoginError("Login failed. Make sure SERVER is running on port 8787.");
    }
  }

  function logout() {
    window.localStorage.removeItem(TOKEN_KEY);
    setAuthToken("");
    setAuthUser(null);
    setAdminUsers([]);
    setMessagesByRoom({});
    setBulletinItemsByRoom({});
    setParticipantsByRoom({});
    setStatusText("Signed out");

    stopCameraTracks();
    stopScreenTracks();
    closeAllPeerConnections();
    disconnectSocket();
  }

  async function loadRooms() {
    try {
      const { res, data } = await fetchJson(`${API_BASE}/api/rooms`, {
        method: "GET",
      });

      if (!res.ok || !Array.isArray(data?.rooms)) {
        setRooms(DEFAULT_ROOMS);
        applyRoomFromUrl(DEFAULT_ROOMS);
        setStatusText("Using local room list");
        return;
      }

      const normalized = data.rooms.map(normalizeRoom);
      setRooms(normalized);
      applyRoomFromUrl(normalized);
      setStatusText("Rooms loaded");
    } catch (error) {
      setRooms(DEFAULT_ROOMS);
      applyRoomFromUrl(DEFAULT_ROOMS);
      setStatusText("Using local room list");
    }
  }

  function applyRoomFromUrl(roomList) {
    const params = new URLSearchParams(window.location.search);
    const roomFromUrl = params.get("room");

    if (roomFromUrl && roomList.some((room) => room.id === roomFromUrl)) {
      setSelectedRoomId(roomFromUrl);
      return;
    }

    if (!roomList.some((room) => room.id === selectedRoomId) && roomList[0]) {
      setSelectedRoomId(roomList[0].id);
    }
  }

  async function loadRoomState(roomId) {
    try {
      const { res, data } = await fetchJson(`${API_BASE}/api/rooms/${encodeURIComponent(roomId)}/state`, {
        method: "GET",
      });

      if (!res.ok || !data?.ok || !data?.state) {
        return;
      }

      applyRoomState(roomId, data.state);
      setBroadcastInfo(data.broadcast || null);

      if (data.broadcast && isViewerOnly && socketRef.current) {
        socketRef.current.emit("viewer:request-stage", {
          roomId,
        });
      }
    } catch (error) {
      // Safe no-op.
    }
  }

  function applyRoomState(roomId, state) {
    setMessagesByRoom((prev) => ({
      ...prev,
      [roomId]: Array.isArray(state?.messages) ? state.messages : [],
    }));

    setBulletinItemsByRoom((prev) => ({
      ...prev,
      [roomId]: Array.isArray(state?.bulletins) ? state.bulletins : [],
    }));

    setBulletinSourceByRoom((prev) => ({
      ...prev,
      [roomId]: String(state?.bulletinSource || "manual"),
    }));
  }

  async function joinPresence(roomId) {
    if (!authUser || !roomId) return;

    const previousRoomId = previousRoomIdRef.current;

    if (previousRoomId && previousRoomId !== roomId) {
      await leavePresence(previousRoomId);
    }

    try {
      const { res, data } = await fetchJson(`${API_BASE}/api/rooms/${encodeURIComponent(roomId)}/presence/join`, {
        method: "POST",
        body: JSON.stringify({
          sessionId: clientSessionId,
        }),
      });

      if (!res.ok || !data?.ok) {
        setStatusText(data?.error || "Could not join room");
        return;
      }

      setParticipantsByRoom((prev) => ({
        ...prev,
        [roomId]: Array.isArray(data.participants) ? data.participants : [],
      }));

      previousRoomIdRef.current = roomId;
    } catch (error) {
      setStatusText("Could not join room presence");
    }
  }

  async function sendPresenceHeartbeat(roomId) {
    if (!authUser || !roomId) return;

    try {
      const { res, data } = await fetchJson(`${API_BASE}/api/rooms/${encodeURIComponent(roomId)}/presence/heartbeat`, {
        method: "POST",
        body: JSON.stringify({
          sessionId: clientSessionId,
        }),
      });

      if (res.ok && data?.ok) {
        setParticipantsByRoom((prev) => ({
          ...prev,
          [roomId]: Array.isArray(data.participants) ? data.participants : [],
        }));
      }
    } catch (error) {
      // Safe no-op.
    }
  }

  async function leavePresence(roomId) {
    if (!authUser || !roomId) return;

    try {
      const { res, data } = await fetchJson(`${API_BASE}/api/rooms/${encodeURIComponent(roomId)}/presence/leave`, {
        method: "POST",
        body: JSON.stringify({
          sessionId: clientSessionId,
        }),
      });

      if (res.ok && data?.ok) {
        setParticipantsByRoom((prev) => ({
          ...prev,
          [roomId]: Array.isArray(data.participants) ? data.participants : [],
        }));
      }
    } catch (error) {
      // Safe no-op.
    }
  }

  function connectSocket() {
    disconnectSocket();

    const socket = io(API_BASE, {
      transports: ["websocket", "polling"],
      auth: {
        token: authToken,
      },
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setStatusText("Live sync connected");

      socket.emit("room:subscribe", {
        roomId: selectedRoomId,
        sessionId: clientSessionId,
      });

      if (isViewerOnly) {
        socket.emit("viewer:request-stage", {
          roomId: selectedRoomId,
        });
      }
    });

    socket.on("disconnect", () => {
      setStatusText("Live sync disconnected");
    });

    socket.on("rooms:update", (payload) => {
      if (!Array.isArray(payload?.rooms)) return;

      setRooms(payload.rooms.map(normalizeRoom));
    });

    socket.on("presence:update", (payload) => {
      if (!payload?.roomId || !Array.isArray(payload?.participants)) return;

      setParticipantsByRoom((prev) => ({
        ...prev,
        [payload.roomId]: payload.participants,
      }));
    });

    socket.on("roomstate:update", (payload) => {
      if (!payload?.roomId || !payload?.state) return;

      applyRoomState(payload.roomId, payload.state);
    });

    socket.on("room:snapshot", (payload) => {
      if (payload?.room) {
        const normalized = normalizeRoom(payload.room);

        setRooms((prev) => {
          const exists = prev.some((room) => room.id === normalized.id);

          if (!exists) {
            return [...prev, normalized];
          }

          return prev.map((room) => (room.id === normalized.id ? normalized : room));
        });
      }

      if (payload?.state && payload?.room?.id) {
        applyRoomState(payload.room.id, payload.state);
      }

      if (Array.isArray(payload?.participants) && payload?.room?.id) {
        setParticipantsByRoom((prev) => ({
          ...prev,
          [payload.room.id]: payload.participants,
        }));
      }

      if (payload?.broadcast !== undefined) {
        setBroadcastInfo(payload.broadcast || null);

        if (payload.broadcast && isViewerOnly && socketRef.current) {
          socketRef.current.emit("viewer:request-stage", {
            roomId: payload.room?.id || selectedRoomId,
          });
        }
      }
    });

    socket.on("broadcast:update", (payload) => {
      if (payload?.roomId !== selectedRoomId) return;

      setBroadcastInfo(payload.broadcast || null);

      if (payload.broadcast && isViewerOnly) {
        socket.emit("viewer:request-stage", {
          roomId: selectedRoomId,
        });
      }

      if (!payload.broadcast) {
        closeViewerPeer();
      }
    });

    socket.on("broadcast:error", (payload) => {
      if (payload?.error) {
        setStatusText(payload.error);
      }
    });

    socket.on("viewer:request-stage", async (payload) => {
      if (!canControlStage) return;
      if (payload?.roomId !== selectedRoomId) return;
      if (!payload?.viewerSocketId) return;

      await createOfferForViewer(payload.viewerSocketId);
    });

    socket.on("webrtc:offer", async (payload) => {
      if (!isViewerOnly) return;
      if (payload?.roomId !== selectedRoomId) return;

      await handleViewerOffer(payload);
    });

    socket.on("webrtc:answer", async (payload) => {
      if (!canControlStage) return;
      if (payload?.roomId !== selectedRoomId) return;

      await handleHostAnswer(payload);
    });

    socket.on("webrtc:ice-candidate", async (payload) => {
      if (payload?.roomId !== selectedRoomId) return;

      await handleIceCandidate(payload);
    });

    socket.on("webrtc:stage-ended", (payload) => {
      if (payload?.roomId !== selectedRoomId) return;

      closeViewerPeer();
      setRemoteStageStream(null);
      setBroadcastInfo(null);
      setStatusText("Stage broadcast ended");
    });
  }

  function disconnectSocket() {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }

  async function loadAdminUsers() {
    if (!isSuperadmin && authUser?.globalRole !== "superadmin") return;

    try {
      const { res, data } = await fetchJson(`${API_BASE}/api/admin/users`, {
        method: "GET",
      });

      if (res.ok && data?.ok && Array.isArray(data.users)) {
        setAdminUsers(data.users);
      }
    } catch (error) {
      // Safe no-op.
    }
  }

  function blockViewer(actionName) {
    if (isViewerOnly) {
      setSelectedPanel("chat");
      setStatusText(`Viewer mode: ${actionName} is locked.`);
      return true;
    }

    return false;
  }

  async function handleCreateRoom() {
    if (blockViewer("room creation")) return;

    const name = newRoomName.trim();
    if (!name) return;

    try {
      const { res, data } = await fetchJson(`${API_BASE}/api/rooms`, {
        method: "POST",
        body: JSON.stringify({
          name,
          category: "Custom",
          isPrivate: false,
        }),
      });

      if (!res.ok || !data?.ok || !data?.room) {
        setStatusText(data?.error || "Could not create room");
        return;
      }

      const room = normalizeRoom(data.room);

      setRooms((prev) => [...prev, room]);
      setSelectedRoomId(room.id);
      setNewRoomName("");
      setStatusText(`Room created: ${room.name}`);
    } catch (error) {
      setStatusText("Could not create room");
    }
  }

  async function handleCreateUser() {
    if (!isSuperadmin) {
      setStatusText("Admin only.");
      return;
    }

    if (!createUserUsername.trim() || !createUserDisplayName.trim() || !createUserPassword.trim()) {
      setStatusText("Enter username, display name, and password.");
      return;
    }

    try {
      const { res, data } = await fetchJson(`${API_BASE}/api/auth/register`, {
        method: "POST",
        body: JSON.stringify({
          username: createUserUsername.trim(),
          displayName: createUserDisplayName.trim(),
          password: createUserPassword,
          globalRole: createUserRole,
        }),
      });

      if (!res.ok || !data?.ok) {
        setStatusText(data?.error || "Could not create user");
        return;
      }

      setCreateUserUsername("");
      setCreateUserDisplayName("");
      setCreateUserPassword("");
      setCreateUserRole("user");
      setStatusText(`User created: ${data.user.displayName}`);

      await loadAdminUsers();
    } catch (error) {
      setStatusText("Could not create user");
    }
  }

  async function handleDeactivateUser(username) {
    if (!isSuperadmin) return;

    try {
      const { res, data } = await fetchJson(`${API_BASE}/api/admin/users/${encodeURIComponent(username)}/deactivate`, {
        method: "POST",
      });

      if (!res.ok || !data?.ok) {
        setStatusText(data?.error || "Could not deactivate user");
        return;
      }

      setStatusText(`${data.user.displayName} deactivated`);
      await loadAdminUsers();
    } catch (error) {
      setStatusText("Could not deactivate user");
    }
  }

  async function handleReactivateUser(username) {
    if (!isSuperadmin) return;

    try {
      const { res, data } = await fetchJson(`${API_BASE}/api/admin/users/${encodeURIComponent(username)}/reactivate`, {
        method: "POST",
      });

      if (!res.ok || !data?.ok) {
        setStatusText(data?.error || "Could not reactivate user");
        return;
      }

      setStatusText(`${data.user.displayName} reactivated`);
      await loadAdminUsers();
    } catch (error) {
      setStatusText("Could not reactivate user");
    }
  }

  async function handleAssignHost() {
    if (!isSuperadmin) {
      setStatusText("Only Admin can assign a room host.");
      return;
    }

    const displayName = hostInput.trim();
    if (!displayName) return;

    try {
      const { res, data } = await fetchJson(`${API_BASE}/api/rooms/${encodeURIComponent(selectedRoomId)}/assign-host`, {
        method: "POST",
        body: JSON.stringify({
          displayName,
        }),
      });

      if (!res.ok || !data?.ok || !data?.room) {
        setStatusText(data?.error || "Could not assign host");
        return;
      }

      updateRoom(data.room);
      setStatusText(`${displayName} assigned as host`);
    } catch (error) {
      setStatusText("Could not assign host");
    }
  }

  async function handleAddModerator() {
    if (!canOperateRoom) {
      setStatusText("Only Admin, host, or moderator can manage this room.");
      return;
    }

    const displayName = moderatorInput.trim();
    if (!displayName) return;

    try {
      const { res, data } = await fetchJson(`${API_BASE}/api/rooms/${encodeURIComponent(selectedRoomId)}/add-moderator`, {
        method: "POST",
        body: JSON.stringify({
          displayName,
        }),
      });

      if (!res.ok || !data?.ok || !data?.room) {
        setStatusText(data?.error || "Could not add moderator");
        return;
      }

      updateRoom(data.room);
      setModeratorInput("");
      setStatusText(`${displayName} added as moderator`);
    } catch (error) {
      setStatusText("Could not add moderator");
    }
  }

  async function handleRemoveModerator(displayName) {
    if (!canOperateRoom) return;

    try {
      const { res, data } = await fetchJson(`${API_BASE}/api/rooms/${encodeURIComponent(selectedRoomId)}/remove-moderator`, {
        method: "POST",
        body: JSON.stringify({
          displayName,
        }),
      });

      if (!res.ok || !data?.ok || !data?.room) {
        setStatusText(data?.error || "Could not remove moderator");
        return;
      }

      updateRoom(data.room);
      setStatusText(`${displayName} removed as moderator`);
    } catch (error) {
      setStatusText("Could not remove moderator");
    }
  }

  async function handleTogglePrivacy() {
    if (!canOperateRoom) {
      setStatusText("Viewer mode: privacy control is locked.");
      return;
    }

    try {
      const { res, data } = await fetchJson(`${API_BASE}/api/rooms/${encodeURIComponent(selectedRoomId)}/privacy`, {
        method: "POST",
        body: JSON.stringify({
          isPrivate: !selectedRoom.isPrivate,
        }),
      });

      if (!res.ok || !data?.ok || !data?.room) {
        setStatusText(data?.error || "Could not update privacy");
        return;
      }

      updateRoom(data.room);
      setStatusText(data.room.isPrivate ? "Room set to private" : "Room set to public");
    } catch (error) {
      setStatusText("Could not update privacy");
    }
  }

  async function handleToggleLock() {
    if (!canOperateRoom) {
      setStatusText("Viewer mode: lock control is locked.");
      return;
    }

    try {
      const { res, data } = await fetchJson(`${API_BASE}/api/rooms/${encodeURIComponent(selectedRoomId)}/lock`, {
        method: "POST",
        body: JSON.stringify({
          isLocked: !selectedRoom.isLocked,
        }),
      });

      if (!res.ok || !data?.ok || !data?.room) {
        setStatusText(data?.error || "Could not update lock");
        return;
      }

      updateRoom(data.room);
      setStatusText(data.room.isLocked ? "Room locked" : "Room unlocked");
    } catch (error) {
      setStatusText("Could not update lock");
    }
  }

  function updateRoom(roomFromServer) {
    const room = normalizeRoom(roomFromServer);

    setRooms((prev) => prev.map((item) => (item.id === room.id ? room : item)));
  }

  async function handleSendMessage() {
    const text = chatInput.trim();
    if (!text) return;

    try {
      const { res, data } = await fetchJson(`${API_BASE}/api/rooms/${encodeURIComponent(selectedRoomId)}/messages`, {
        method: "POST",
        body: JSON.stringify({
          text,
        }),
      });

      if (!res.ok || !data?.ok || !data?.state) {
        setStatusText(data?.error || "Could not send message");
        return;
      }

      applyRoomState(selectedRoomId, data.state);
      setChatInput("");
      setStatusText("Message sent");
    } catch (error) {
      setStatusText("Could not send message");
    }
  }

  async function handleAnnouncementAdd() {
    if (!canOperateRoom) {
      setStatusText("Viewer mode: bulletin posting is locked.");
      return;
    }

    const text = newAnnouncement.trim();
    if (!text) return;

    try {
      const { res, data } = await fetchJson(`${API_BASE}/api/rooms/${encodeURIComponent(selectedRoomId)}/bulletins/add`, {
        method: "POST",
        body: JSON.stringify({
          text,
        }),
      });

      if (!res.ok || !data?.ok || !data?.state) {
        setStatusText(data?.error || "Could not add bulletin");
        return;
      }

      applyRoomState(selectedRoomId, data.state);
      setNewAnnouncement("");
      setStatusText("Bulletin added");
    } catch (error) {
      setStatusText("Could not add bulletin");
    }
  }

  async function handleBulletinUpload(event) {
    if (!canOperateRoom) {
      setStatusText("Viewer mode: bulletin import is locked.");
      event.target.value = "";
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      if (!lines.length) {
        setStatusText("That bulletin file is empty.");
        return;
      }

      const { res, data } = await fetchJson(`${API_BASE}/api/rooms/${encodeURIComponent(selectedRoomId)}/bulletins/import`, {
        method: "POST",
        body: JSON.stringify({
          lines,
        }),
      });

      if (!res.ok || !data?.ok || !data?.state) {
        setStatusText(data?.error || "Could not import bulletins");
        return;
      }

      applyRoomState(selectedRoomId, data.state);
      setStatusText(`Imported ${lines.length} bulletin lines`);
    } catch (error) {
      setStatusText("Could not import bulletin file");
    } finally {
      event.target.value = "";
    }
  }

  function handleJoinRoom(roomId) {
    const room = rooms.find((item) => item.id === roomId);

    const nextRole =
      authUser?.globalRole === "superadmin"
        ? "superadmin"
        : room?.assignedHost === authUser?.displayName || room?.host === authUser?.displayName
        ? "host"
        : Array.isArray(room?.moderators) && room.moderators.includes(authUser?.displayName)
        ? "moderator"
        : "viewer";

    if (room?.isLocked && nextRole === "viewer") {
      setStatusText("This room is locked. Only Admin, host, or moderators can enter.");
      return;
    }

    setSelectedRoomId(roomId);

    const url = new URL(window.location.href);
    url.searchParams.set("room", roomId);
    window.history.replaceState({}, "", url.toString());

    setStatusText(`Entered ${room?.name || "room"}`);
  }

  async function copyInviteLink() {
    if (isViewerOnly) {
      setStatusText("Viewer mode: invite tools are locked.");
      return;
    }

    try {
      await navigator.clipboard.writeText(inviteLink);
      setStatusText(`Invite link copied for ${selectedRoom?.name || "room"}`);
    } catch (error) {
      alert(`Copy this link manually:\n\n${inviteLink}`);
    }
  }

  async function loadMediaDevices() {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;

      const devices = await navigator.mediaDevices.enumerateDevices();

      setCameraDevices(devices.filter((device) => device.kind === "videoinput"));
      setMicrophoneDevices(devices.filter((device) => device.kind === "audioinput"));
    } catch (error) {
      setStatusText("Could not load media devices");
    }
  }

  function buildCameraConstraints() {
    if (!selectedCameraDeviceId) return true;

    return {
      deviceId: { exact: selectedCameraDeviceId },
      width: { ideal: 1280 },
      height: { ideal: 720 },
    };
  }

  function buildMicConstraints() {
    if (!selectedMicDeviceId) return true;

    return {
      deviceId: { exact: selectedMicDeviceId },
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    };
  }

  function handleSelectCameraDevice(deviceId) {
    setSelectedCameraDeviceId(deviceId);

    if (deviceId) {
      window.localStorage.setItem(DEVICE_CAMERA_KEY, deviceId);
    } else {
      window.localStorage.removeItem(DEVICE_CAMERA_KEY);
    }

    setStatusText("Camera selection saved. Restart camera to apply.");
  }

  function handleSelectMicDevice(deviceId) {
    setSelectedMicDeviceId(deviceId);

    if (deviceId) {
      window.localStorage.setItem(DEVICE_MIC_KEY, deviceId);
    } else {
      window.localStorage.removeItem(DEVICE_MIC_KEY);
    }

    setStatusText("Microphone selection saved. Restart mic/camera to apply.");
  }

  async function handleToggleCamera() {
    if (!canControlStage) {
      setStatusText("Viewer mode: camera is locked.");
      return;
    }

    if (cameraOn) {
      stopCameraTracks();
      setCameraOn(false);

      if (!screenShareOn) {
        stopBroadcast();
      }

      setStatusText("Camera off");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: buildCameraConstraints(),
        audio: micOn ? buildMicConstraints() : false,
      });

      setLocalCameraStream(stream);
      setCameraOn(true);
      setStatusText("Camera live for room viewers");

      if (!screenShareOn) {
        startBroadcast(stream, "camera");
      }

      await loadMediaDevices();
    } catch (error) {
      setStatusText("Camera access failed");
      alert("Could not access your camera.");
    }
  }

  async function handleToggleMic() {
    if (!canControlStage) {
      setStatusText("Viewer mode: microphone is locked.");
      return;
    }

    if (localCameraStream) {
      const next = !micOn;

      localCameraStream.getAudioTracks().forEach((track) => {
        track.enabled = next;
      });

      setMicOn(next);
      setStatusText(next ? "Mic live" : "Mic muted");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: buildMicConstraints(),
      });

      setLocalCameraStream(stream);
      setMicOn(true);
      setStatusText("Mic live");
      await loadMediaDevices();
    } catch (error) {
      setStatusText("Mic access failed");
      alert("Could not access your microphone.");
    }
  }

  async function handleToggleScreenShare() {
    if (!canControlStage) {
      setStatusText("Viewer mode: screen share is locked.");
      return;
    }

    if (screenShareOn) {
      returnToCameraAfterScreenShare();
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
          returnToCameraAfterScreenShare();
        };
      }

      setScreenStream(stream);
      setScreenShareOn(true);
      setStatusText("Screen sharing live for room viewers");

      startBroadcast(stream, "screen");
    } catch (error) {
      setStatusText("Screen share canceled");
    }
  }

  function returnToCameraAfterScreenShare() {
    stopScreenTracks();
    setScreenShareOn(false);

    if (cameraOn && localCameraStream) {
      setStatusText("Screen share ended. Returning viewers to host camera.");
      startBroadcast(localCameraStream, "camera");
      return;
    }

    stopBroadcast();
    setStatusText("Screen share ended");
  }

  function startBroadcast(stream, mode) {
    if (!socketRef.current || !selectedRoomId || !stream) return;

    closeHostPeerConnections();

    localBroadcastStreamRef.current = stream;
    setBroadcastMode(mode);

    socketRef.current.emit("broadcast:start", {
      roomId: selectedRoomId,
      mode,
    });

    setBroadcastInfo({
      hostName: authUser?.displayName || "Host",
      mode,
      startedAt: new Date().toISOString(),
    });
  }

  function stopBroadcast() {
    if (socketRef.current && selectedRoomId) {
      socketRef.current.emit("broadcast:stop", {
        roomId: selectedRoomId,
      });
    }

    closeHostPeerConnections();
    localBroadcastStreamRef.current = null;
    setBroadcastMode("");
    setBroadcastInfo(null);
  }

  async function createOfferForViewer(viewerSocketId) {
    const stream = localBroadcastStreamRef.current || activeStageStream;
    const socket = socketRef.current;

    if (!socket || !stream || !viewerSocketId) return;

    const existing = hostPeerConnectionsRef.current[viewerSocketId];

    if (existing) {
      existing.close();
      delete hostPeerConnectionsRef.current[viewerSocketId];
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    hostPeerConnectionsRef.current[viewerSocketId] = pc;

    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("webrtc:ice-candidate", {
          roomId: selectedRoomId,
          targetSocketId: viewerSocketId,
          candidate: event.candidate,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (["failed", "disconnected", "closed"].includes(pc.connectionState)) {
        pc.close();
        delete hostPeerConnectionsRef.current[viewerSocketId];
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socket.emit("webrtc:offer", {
      roomId: selectedRoomId,
      viewerSocketId,
      description: pc.localDescription,
    });
  }

  async function handleViewerOffer(payload) {
    const socket = socketRef.current;

    if (!socket || !payload?.description || !payload?.hostSocketId) return;

    closeViewerPeer();

    const pc = new RTCPeerConnection(RTC_CONFIG);
    viewerPeerConnectionRef.current = pc;

    const inboundStream = new MediaStream();
    remoteStageStreamRef.current = inboundStream;
    setRemoteStageStream(inboundStream);

    pc.ontrack = (event) => {
      const sourceStream = event.streams?.[0];

      if (sourceStream) {
        sourceStream.getTracks().forEach((track) => {
          inboundStream.addTrack(track);
        });
      } else if (event.track) {
        inboundStream.addTrack(event.track);
      }

      const nextStream = new MediaStream(inboundStream.getTracks());
      remoteStageStreamRef.current = nextStream;
      setRemoteStageStream(nextStream);
      setStatusText(`Receiving live stage from ${payload.hostName || "host"}`);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("webrtc:ice-candidate", {
          roomId: selectedRoomId,
          targetSocketId: payload.hostSocketId,
          candidate: event.candidate,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (["failed", "disconnected", "closed"].includes(pc.connectionState)) {
        setStatusText("Viewer stage connection ended");
      }
    };

    await pc.setRemoteDescription(payload.description);

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    socket.emit("webrtc:answer", {
      roomId: selectedRoomId,
      hostSocketId: payload.hostSocketId,
      description: pc.localDescription,
    });
  }

  async function handleHostAnswer(payload) {
    const pc = hostPeerConnectionsRef.current[payload?.viewerSocketId];

    if (!pc || !payload?.description) return;

    try {
      await pc.setRemoteDescription(payload.description);
      setStatusText(`Viewer connected: ${payload.viewerName || "viewer"}`);
    } catch (error) {
      setStatusText("Could not finish viewer connection");
    }
  }

  async function handleIceCandidate(payload) {
    if (!payload?.candidate) return;

    const fromSocketId = payload.fromSocketId;
    const hostPc = hostPeerConnectionsRef.current[fromSocketId];
    const viewerPc = viewerPeerConnectionRef.current;

    try {
      if (hostPc) {
        await hostPc.addIceCandidate(payload.candidate);
      } else if (viewerPc) {
        await viewerPc.addIceCandidate(payload.candidate);
      }
    } catch (error) {
      // ICE candidates can arrive during close/reconnect. Safe no-op.
    }
  }

  function closeViewerPeer() {
    if (viewerPeerConnectionRef.current) {
      viewerPeerConnectionRef.current.close();
      viewerPeerConnectionRef.current = null;
    }

    remoteStageStreamRef.current = null;
    setRemoteStageStream(null);
  }

  function closeHostPeerConnections() {
    Object.values(hostPeerConnectionsRef.current).forEach((pc) => {
      pc.close();
    });

    hostPeerConnectionsRef.current = {};
  }

  function closeAllPeerConnections() {
    closeViewerPeer();
    closeHostPeerConnections();
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

  function handleOpenGoogleDrive() {
    if (blockViewer("Google Drive")) return;

    setStatusText("Google Drive opened");
    window.open("https://drive.google.com", "_blank", "noopener,noreferrer");
  }

  function handleChooseStageContent(event) {
    if (!canControlStage) {
      setStatusText("Viewer mode: stage file upload is locked.");
      event.target.value = "";
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    const kind = normalizeStageKind(file);

    if (kind === "unsupported") {
      setStatusText("Choose a JPG, PNG, MP4, WEBP, or PDF stage file.");
      event.target.value = "";
      return;
    }

    if (stageContent?.localObjectUrl) {
      URL.revokeObjectURL(stageContent.localObjectUrl);
    }

    const url = URL.createObjectURL(file);

    setStageContent({
      kind,
      name: file.name,
      type: file.type || kind,
      url,
      localObjectUrl: url,
      updatedBy: authUser?.displayName || "Host",
      updatedAt: new Date().toISOString(),
    });

    setStatusText(`Stage content loaded: ${file.name}`);
    event.target.value = "";
  }

  function handleClearStageContent() {
    if (!canControlStage) {
      setStatusText("Viewer mode: stage content control is locked.");
      return;
    }

    if (stageContent?.localObjectUrl) {
      URL.revokeObjectURL(stageContent.localObjectUrl);
    }

    setStageContent(null);
    setStatusText("Stage content cleared");
  }

  function renderStageContent() {
    if (!stageContent?.url) return null;

    if (stageContent.kind === "image") {
      return (
        <img
          src={stageContent.url}
          alt={stageContent.name || "Stage content"}
          style={styles.stageImage}
        />
      );
    }

    if (stageContent.kind === "video") {
      return (
        <video
          src={stageContent.url}
          controls
          autoPlay
          playsInline
          style={styles.stageVideo}
        />
      );
    }

    if (stageContent.kind === "pdf") {
      return (
        <iframe
          title={stageContent.name || "Stage PDF"}
          src={stageContent.url}
          style={styles.stageFrame}
        />
      );
    }

    return null;
  }

  if (authLoading) {
    return (
      <div style={styles.loginShell}>
        <div style={styles.loginCard}>
          <div style={styles.logo}>AGV</div>
          <h1 style={styles.loginTitle}>Avant Global Vision</h1>
          <p style={styles.loginSubtitle}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!authUser) {
    return (
      <div style={styles.loginShell}>
        <div style={styles.loginCard}>
          <div style={styles.logo}>AGV</div>
          <h1 style={styles.loginTitle}>Avant Global Vision</h1>
          <p style={styles.loginSubtitle}>
            {window.location.search.includes("room=")
              ? "Sign in to enter your invited room."
              : "Sign in to your broadcast platform."}
          </p>

          <input
            style={styles.loginInput}
            value={loginUsername}
            onChange={(event) => setLoginUsername(event.target.value)}
            placeholder="Username"
            autoComplete="username"
          />

          <input
            style={styles.loginInput}
            type="password"
            value={loginPassword}
            onChange={(event) => setLoginPassword(event.target.value)}
            placeholder="Password"
            autoComplete="current-password"
            onKeyDown={(event) => {
              if (event.key === "Enter") handleLogin();
            }}
          />

          <button style={styles.loginButton} onClick={handleLogin}>
            Sign In
          </button>

          {loginError ? <div style={styles.loginError}>{loginError}</div> : null}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.appShell}>
      <header style={styles.header}>
        <div style={styles.brandRow}>
          <div style={styles.logoSmall}>AGV</div>
          <div>
            <h1 style={styles.title}>Avant Global Vision</h1>
            <div style={styles.subtitle}>Online Convention Center / Teaching Platform</div>
          </div>
        </div>

        <div style={styles.headerRight}>
          <div style={styles.statusPill}>{statusText}</div>
          <div style={styles.userPill}>
            {authUser.displayName} • {roleText}
          </div>
          <button style={styles.dangerButton} onClick={logout}>
            Log Out
          </button>
        </div>
      </header>

      <main style={styles.mainGrid}>
        <aside style={styles.leftPanel}>
          <div style={styles.panelTitle}>Rooms</div>

          <input
            style={styles.input}
            value={roomSearch}
            onChange={(event) => setRoomSearch(event.target.value)}
            placeholder="Search rooms"
          />

          <div style={styles.roomList}>
            {filteredRooms.map((room) => (
              <button
                key={room.id}
                style={room.id === selectedRoomId ? styles.roomButtonActive : styles.roomButton}
                onClick={() => handleJoinRoom(room.id)}
              >
                <div style={styles.roomName}>{room.name}</div>
                <div style={styles.roomMeta}>
                  {room.category} • {room.isPrivate ? "Private" : "Public"} • {room.isLocked ? "Locked" : "Open"}
                </div>
                <div style={styles.roomMeta}>
                  Host: {room.assignedHost || room.host || "Admin"}
                </div>
              </button>
            ))}
          </div>

          {!isViewerOnly ? (
            <div style={styles.controlBox}>
              <div style={styles.controlTitle}>Create Room</div>
              <input
                style={styles.input}
                value={newRoomName}
                onChange={(event) => setNewRoomName(event.target.value)}
                placeholder="New room name"
              />
              <button style={styles.primaryButton} onClick={handleCreateRoom}>
                Create Room
              </button>
            </div>
          ) : (
            <div style={styles.viewerLockBox}>
              Viewer mode: room creation and control tools are locked.
            </div>
          )}
        </aside>

        <section style={styles.centerPanel}>
          <div style={styles.identityCard}>
            <div>
              <div style={styles.roomHeadline}>{selectedRoom?.name || "Room"}</div>
              <div style={styles.identityLine}>
                Signed in as {authUser.displayName} • Room Role: {roleText}
              </div>
            </div>

            <div style={styles.identityChips}>
              <span style={styles.chip}>{selectedRoom?.isPrivate ? "Private" : "Public"}</span>
              <span style={styles.chip}>{selectedRoom?.isLocked ? "Locked" : "Open"}</span>
              <span style={styles.chip}>{liveStatusText}</span>
              <span style={styles.chip}>
                {selectedRoomParticipants.length} people
              </span>
            </div>
          </div>

          <div style={styles.stageShell}>
            <div style={styles.stageTop}>ACADEMY STAGE</div>

            <div style={styles.stageViewport}>
              {activeStageStream ? (
                <video
                  ref={stageVideoRef}
                  autoPlay
                  playsInline
                  muted={canControlStage}
                  controls={!canControlStage}
                  style={styles.stageVideo}
                />
              ) : stageContent?.url ? (
                renderStageContent()
              ) : (
                <div style={styles.stagePlaceholder}>
                  <div style={styles.stageBadge}>AGV</div>
                  <div style={styles.stagePlaceholderTitle}>
                    {isViewerOnly ? "Audience Stage Ready" : "Avant Global Vision Stage Ready"}
                  </div>
                  <div style={styles.stagePlaceholderText}>
                    {isViewerOnly
                      ? "You are in viewer mode. When the host starts camera or screen share, the stage will receive it here."
                      : "Start camera/screen share for viewers, or bring a JPG, PNG, WEBP, MP4, or PDF file onto the stage."}
                  </div>
                </div>
              )}
            </div>

            {canControlStage ? (
              <>
                <div style={styles.stageControls}>
                  <button
                    style={cameraOn ? styles.activeButton : styles.primaryButton}
                    onClick={handleToggleCamera}
                  >
                    {cameraOn ? "Stop Camera" : "Start Camera"}
                  </button>

                  <button
                    style={micOn ? styles.activeButton : styles.secondaryButton}
                    onClick={handleToggleMic}
                  >
                    {micOn ? "Mute Mic" : "Start Mic"}
                  </button>

                  <button
                    style={screenShareOn ? styles.activeButton : styles.primaryButton}
                    onClick={handleToggleScreenShare}
                  >
                    {screenShareOn ? "Stop Share" : "Share Screen"}
                  </button>

                  <button
                    style={styles.secondaryButton}
                    onClick={() => stageContentFileRef.current?.click()}
                  >
                    Bring File to Stage
                  </button>

                  <button
                    style={styles.secondaryButton}
                    onClick={handleClearStageContent}
                  >
                    Clear Stage File
                  </button>

                  <select
                    style={styles.select}
                    value={selectedCameraDeviceId}
                    onChange={(event) => handleSelectCameraDevice(event.target.value)}
                  >
                    <option value="">Default Camera</option>
                    {cameraDevices.map((device, index) => (
                      <option key={device.deviceId || index} value={device.deviceId}>
                        {device.label || `Camera ${index + 1}`}
                      </option>
                    ))}
                  </select>

                  <select
                    style={styles.select}
                    value={selectedMicDeviceId}
                    onChange={(event) => handleSelectMicDevice(event.target.value)}
                  >
                    <option value="">Default Mic</option>
                    {microphoneDevices.map((device, index) => (
                      <option key={device.deviceId || index} value={device.deviceId}>
                        {device.label || `Mic ${index + 1}`}
                      </option>
                    ))}
                  </select>
                </div>

                <input
                  ref={stageContentFileRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.mp4,.pdf,image/*,video/mp4,application/pdf"
                  style={{ display: "none" }}
                  onChange={handleChooseStageContent}
                />
              </>
            ) : (
              <div style={styles.viewerStageNotice}>
                Viewer access confirmed: stage controls are hidden and locked.
              </div>
            )}
          </div>

          <div style={styles.bottomGrid}>
            <div style={styles.card}>
              <div style={styles.panelTitle}>Participants</div>

              {selectedRoomParticipants.length ? (
                selectedRoomParticipants.map((person, index) => (
                  <div key={person.sessionId || index} style={styles.participantRow}>
                    <span>{person.name || "Participant"}</span>
                    <strong>{String(person.role || "viewer").toUpperCase()}</strong>
                  </div>
                ))
              ) : (
                <div style={styles.emptyText}>No participants listed yet.</div>
              )}
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

              {canOperateRoom ? (
                <>
                  <textarea
                    style={styles.textarea}
                    value={newAnnouncement}
                    onChange={(event) => setNewAnnouncement(event.target.value)}
                    placeholder="Add bulletin"
                  />

                  <div style={styles.row}>
                    <button style={styles.primaryButton} onClick={handleAnnouncementAdd}>
                      Add Bulletin
                    </button>

                    <button
                      style={styles.secondaryButton}
                      onClick={() => bulletinFileRef.current?.click()}
                    >
                      Import Text
                    </button>
                  </div>

                  <input
                    ref={bulletinFileRef}
                    type="file"
                    accept=".txt,text/plain"
                    style={{ display: "none" }}
                    onChange={handleBulletinUpload}
                  />
                </>
              ) : (
                <div style={styles.viewerLockBox}>
                  Viewer mode: bulletin editing is locked.
                </div>
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

          {selectedPanel === "chat" && (
            <div style={styles.card}>
              <div style={styles.panelTitle}>Room Chat</div>

              <div style={styles.chatList}>
                {selectedRoomMessages.length ? (
                  selectedRoomMessages.map((message, index) => (
                    <div key={message.id || index} style={styles.chatMessage}>
                      <div style={styles.chatMeta}>
                        {message.sender || "User"} • {message.time || ""}
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
                  onChange={(event) => setChatInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") handleSendMessage();
                  }}
                  placeholder="Type message"
                />

                <button style={styles.primaryButton} onClick={handleSendMessage}>
                  Send
                </button>
              </div>
            </div>
          )}

          {selectedPanel === "bulletin" && (
            <div style={styles.card}>
              <div style={styles.panelTitle}>Bulletin Feed</div>
              <div style={styles.helperText}>
                Source: {bulletinSourceByRoom[selectedRoomId] || "manual"}
              </div>

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
          )}

          {selectedPanel === "controls" && !isViewerOnly && (
            <div style={styles.card}>
              <div style={styles.panelTitle}>Control Center</div>

              <button style={styles.primaryButton} onClick={copyInviteLink}>
                Copy Invite Link
              </button>

              <button style={styles.secondaryButton} onClick={handleOpenGoogleDrive}>
                Open Google Drive
              </button>

              <div style={styles.controlBox}>
                <div style={styles.controlTitle}>Room Settings</div>

                <button style={styles.secondaryButton} onClick={handleTogglePrivacy}>
                  {selectedRoom?.isPrivate ? "Set Public" : "Set Private"}
                </button>

                <button style={styles.secondaryButton} onClick={handleToggleLock}>
                  {selectedRoom?.isLocked ? "Unlock Room" : "Lock Room"}
                </button>
              </div>

              {isSuperadmin ? (
                <>
                  <div style={styles.controlBox}>
                    <div style={styles.controlTitle}>Assign Host</div>

                    <input
                      style={styles.input}
                      value={hostInput}
                      onChange={(event) => setHostInput(event.target.value)}
                      placeholder="Display name"
                    />

                    <button style={styles.primaryButton} onClick={handleAssignHost}>
                      Assign Host
                    </button>
                  </div>

                  <div style={styles.controlBox}>
                    <div style={styles.controlTitle}>Create User</div>

                    <input
                      style={styles.input}
                      value={createUserUsername}
                      onChange={(event) => setCreateUserUsername(event.target.value)}
                      placeholder="Username"
                    />

                    <input
                      style={styles.input}
                      value={createUserDisplayName}
                      onChange={(event) => setCreateUserDisplayName(event.target.value)}
                      placeholder="Display name"
                    />

                    <input
                      style={styles.input}
                      type="password"
                      value={createUserPassword}
                      onChange={(event) => setCreateUserPassword(event.target.value)}
                      placeholder="Password"
                    />

                    <select
                      style={styles.select}
                      value={createUserRole}
                      onChange={(event) => setCreateUserRole(event.target.value)}
                    >
                      <option value="user">User</option>
                      <option value="superadmin">Superadmin</option>
                    </select>

                    <button style={styles.primaryButton} onClick={handleCreateUser}>
                      Create User
                    </button>
                  </div>

                  <div style={styles.controlBox}>
                    <div style={styles.controlTitle}>Users</div>

                    {adminUsers.map((user) => (
                      <div key={user.username} style={styles.userRow}>
                        <span>
                          {user.displayName} ({user.username})
                        </span>

                        <button
                          style={user.isActive ? styles.smallDangerButton : styles.smallButton}
                          onClick={() =>
                            user.isActive
                              ? handleDeactivateUser(user.username)
                              : handleReactivateUser(user.username)
                          }
                        >
                          {user.isActive ? "Deactivate" : "Reactivate"}
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}

              {canOperateRoom ? (
                <div style={styles.controlBox}>
                  <div style={styles.controlTitle}>Moderators</div>

                  <input
                    style={styles.input}
                    value={moderatorInput}
                    onChange={(event) => setModeratorInput(event.target.value)}
                    placeholder="Display name"
                  />

                  <button style={styles.primaryButton} onClick={handleAddModerator}>
                    Add Moderator
                  </button>

                  {(selectedRoom?.moderators || []).map((name) => (
                    <div key={name} style={styles.userRow}>
                      <span>{name}</span>

                      <button style={styles.smallDangerButton} onClick={() => handleRemoveModerator(name)}>
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )}

          {isViewerOnly ? (
            <div style={styles.viewerLockBox}>
              Viewer Mode Active: Control Center, Google Drive, stage camera, mic,
              screen share, host assignment, room creation, and bulletin editing are locked.
            </div>
          ) : null}
        </aside>
      </main>
    </div>
  );
}

const styles = {
  appShell: {
    minHeight: "100vh",
    background: "radial-gradient(circle at top left, #172033 0%, #080b12 42%, #05070c 100%)",
    color: "#f8fafc",
    fontFamily: "Inter, Segoe UI, Arial, sans-serif",
  },
  header: {
    minHeight: 76,
    padding: "14px 22px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(5,8,14,0.88)",
    position: "sticky",
    top: 0,
    zIndex: 20,
    backdropFilter: "blur(14px)",
  },
  brandRow: {
    display: "flex",
    alignItems: "center",
    gap: 14,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 18,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #d4af37, #8a6d1d)",
    color: "#111827",
    fontSize: 24,
    fontWeight: 950,
    margin: "0 auto 16px",
  },
  logoSmall: {
    width: 48,
    height: 48,
    borderRadius: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #d4af37, #8a6d1d)",
    color: "#111827",
    fontSize: 18,
    fontWeight: 950,
  },
  title: {
    margin: 0,
    fontSize: 24,
    fontWeight: 900,
    letterSpacing: -0.4,
  },
  subtitle: {
    color: "rgba(248,250,252,0.62)",
    fontSize: 13,
    marginTop: 3,
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  statusPill: {
    padding: "9px 12px",
    borderRadius: 999,
    background: "rgba(34,197,94,0.12)",
    border: "1px solid rgba(34,197,94,0.22)",
    color: "#bbf7d0",
    fontSize: 12,
    maxWidth: 360,
  },
  userPill: {
    padding: "9px 12px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.09)",
    fontSize: 12,
  },
  mainGrid: {
    display: "grid",
    gridTemplateColumns: "280px minmax(520px, 1fr) 360px",
    gap: 18,
    padding: 18,
    alignItems: "start",
  },
  leftPanel: {
    background: "rgba(15,23,42,0.72)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 22,
    padding: 16,
    position: "sticky",
    top: 96,
  },
  centerPanel: {
    display: "grid",
    gap: 16,
  },
  rightPanel: {
    background: "rgba(15,23,42,0.72)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 22,
    padding: 16,
    position: "sticky",
    top: 96,
  },
  identityCard: {
    padding: 18,
    borderRadius: 22,
    background: "linear-gradient(180deg, rgba(19,27,45,0.92), rgba(10,14,24,0.86))",
    border: "1px solid rgba(255,255,255,0.08)",
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "center",
    flexWrap: "wrap",
  },
  roomHeadline: {
    fontSize: 24,
    fontWeight: 900,
    marginBottom: 5,
  },
  identityLine: {
    color: "rgba(248,250,252,0.62)",
    fontSize: 13,
  },
  identityChips: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  chip: {
    padding: "8px 11px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.09)",
    fontSize: 12,
    fontWeight: 800,
  },
  stageShell: {
    borderRadius: 28,
    padding: 18,
    background: "linear-gradient(180deg, rgba(30,17,12,0.96), rgba(9,8,12,0.95))",
    border: "1px solid rgba(212,175,55,0.28)",
    boxShadow: "0 30px 90px rgba(0,0,0,0.35)",
  },
  stageTop: {
    textAlign: "center",
    color: "#facc15",
    fontWeight: 950,
    letterSpacing: 4,
    fontSize: 13,
    marginBottom: 14,
  },
  stageViewport: {
    aspectRatio: "16 / 9",
    borderRadius: 22,
    overflow: "hidden",
    background: "linear-gradient(135deg, #020617, #111827)",
    border: "1px solid rgba(255,255,255,0.12)",
    position: "relative",
  },
  stageVideo: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    background: "#020617",
  },
  stageImage: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    background: "#020617",
  },
  stageFrame: {
    width: "100%",
    height: "100%",
    border: 0,
    background: "#ffffff",
  },
  stagePlaceholder: {
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    textAlign: "center",
    padding: 30,
  },
  stageBadge: {
    width: 86,
    height: 86,
    borderRadius: 26,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #d4af37, #854d0e)",
    color: "#111827",
    fontWeight: 950,
    fontSize: 28,
    marginBottom: 18,
  },
  stagePlaceholderTitle: {
    fontSize: 28,
    fontWeight: 950,
    marginBottom: 8,
  },
  stagePlaceholderText: {
    maxWidth: 620,
    color: "rgba(248,250,252,0.66)",
    lineHeight: 1.6,
  },
  stageControls: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 14,
    alignItems: "center",
  },
  viewerStageNotice: {
    marginTop: 14,
    padding: 12,
    borderRadius: 16,
    background: "rgba(59,130,246,0.12)",
    border: "1px solid rgba(96,165,250,0.25)",
    color: "#bfdbfe",
    fontWeight: 800,
    fontSize: 13,
  },
  bottomGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1.2fr",
    gap: 16,
  },
  card: {
    background: "rgba(15,23,42,0.82)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 20,
    padding: 16,
  },
  panelTitle: {
    fontSize: 15,
    fontWeight: 950,
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  roomList: {
    display: "grid",
    gap: 10,
    marginTop: 12,
  },
  roomButton: {
    textAlign: "left",
    padding: 12,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.05)",
    color: "#f8fafc",
    cursor: "pointer",
  },
  roomButtonActive: {
    textAlign: "left",
    padding: 12,
    borderRadius: 16,
    border: "1px solid rgba(212,175,55,0.35)",
    background: "rgba(212,175,55,0.13)",
    color: "#f8fafc",
    cursor: "pointer",
  },
  roomName: {
    fontWeight: 900,
    marginBottom: 4,
  },
  roomMeta: {
    fontSize: 12,
    color: "rgba(248,250,252,0.58)",
    lineHeight: 1.45,
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(2,6,23,0.72)",
    color: "#f8fafc",
    outline: "none",
    marginBottom: 10,
  },
  textarea: {
    width: "100%",
    minHeight: 82,
    boxSizing: "border-box",
    padding: "11px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(2,6,23,0.72)",
    color: "#f8fafc",
    outline: "none",
    marginTop: 10,
    resize: "vertical",
  },
  select: {
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(2,6,23,0.92)",
    color: "#f8fafc",
    outline: "none",
  },
  primaryButton: {
    padding: "10px 14px",
    borderRadius: 14,
    border: "1px solid rgba(212,175,55,0.35)",
    background: "linear-gradient(135deg, #d4af37, #a16207)",
    color: "#111827",
    fontWeight: 950,
    cursor: "pointer",
  },
  secondaryButton: {
    padding: "10px 14px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.07)",
    color: "#f8fafc",
    fontWeight: 850,
    cursor: "pointer",
  },
  activeButton: {
    padding: "10px 14px",
    borderRadius: 14,
    border: "1px solid rgba(34,197,94,0.35)",
    background: "rgba(34,197,94,0.18)",
    color: "#bbf7d0",
    fontWeight: 950,
    cursor: "pointer",
  },
  dangerButton: {
    padding: "9px 12px",
    borderRadius: 14,
    border: "1px solid rgba(248,113,113,0.22)",
    background: "rgba(127,29,29,0.35)",
    color: "#fecaca",
    fontWeight: 900,
    cursor: "pointer",
  },
  smallButton: {
    padding: "7px 10px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.07)",
    color: "#f8fafc",
    cursor: "pointer",
  },
  smallDangerButton: {
    padding: "7px 10px",
    borderRadius: 12,
    border: "1px solid rgba(248,113,113,0.22)",
    background: "rgba(127,29,29,0.35)",
    color: "#fecaca",
    cursor: "pointer",
  },
  row: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 10,
  },
  tabRow: {
    display: "flex",
    gap: 8,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    padding: "10px 8px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.05)",
    color: "#f8fafc",
    cursor: "pointer",
    fontWeight: 800,
  },
  tabActive: {
    flex: 1,
    padding: "10px 8px",
    borderRadius: 14,
    border: "1px solid rgba(212,175,55,0.35)",
    background: "rgba(212,175,55,0.15)",
    color: "#fef3c7",
    cursor: "pointer",
    fontWeight: 900,
  },
  chatList: {
    height: 360,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    paddingRight: 4,
  },
  chatMessage: {
    padding: 11,
    borderRadius: 14,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.07)",
    lineHeight: 1.5,
  },
  chatMeta: {
    color: "rgba(248,250,252,0.58)",
    fontSize: 12,
    fontWeight: 800,
    marginBottom: 4,
  },
  chatComposer: {
    display: "flex",
    gap: 8,
    marginTop: 12,
  },
  chatInput: {
    flex: 1,
    padding: "11px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(2,6,23,0.72)",
    color: "#f8fafc",
    outline: "none",
  },
  bulletinList: {
    display: "grid",
    gap: 8,
    maxHeight: 220,
    overflowY: "auto",
  },
  bulletinListTall: {
    display: "grid",
    gap: 8,
    height: 440,
    overflowY: "auto",
  },
  bulletinItem: {
    padding: 11,
    borderRadius: 14,
    background: "rgba(212,175,55,0.08)",
    border: "1px solid rgba(212,175,55,0.15)",
    lineHeight: 1.45,
  },
  participantRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    padding: 10,
    borderRadius: 14,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.07)",
    marginBottom: 8,
  },
  controlBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 18,
    background: "rgba(2,6,23,0.42)",
    border: "1px solid rgba(255,255,255,0.07)",
  },
  controlTitle: {
    fontWeight: 950,
    marginBottom: 10,
  },
  userRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
    alignItems: "center",
    padding: "9px 0",
    borderBottom: "1px solid rgba(255,255,255,0.07)",
    fontSize: 13,
  },
  emptyText: {
    color: "rgba(248,250,252,0.58)",
    fontSize: 13,
    lineHeight: 1.5,
  },
  helperText: {
    color: "rgba(248,250,252,0.58)",
    fontSize: 13,
    lineHeight: 1.5,
    marginBottom: 10,
  },
  viewerLockBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 16,
    background: "rgba(59,130,246,0.10)",
    border: "1px solid rgba(96,165,250,0.20)",
    color: "#bfdbfe",
    fontSize: 13,
    lineHeight: 1.5,
    fontWeight: 750,
  },
  loginShell: {
    minHeight: "100vh",
    background: "radial-gradient(circle at top, #1e293b 0%, #020617 58%, #000 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#f8fafc",
    fontFamily: "Inter, Segoe UI, Arial, sans-serif",
    padding: 24,
  },
  loginCard: {
    width: "100%",
    maxWidth: 420,
    padding: 28,
    borderRadius: 26,
    background: "rgba(15,23,42,0.90)",
    border: "1px solid rgba(255,255,255,0.10)",
    boxShadow: "0 30px 90px rgba(0,0,0,0.45)",
    textAlign: "center",
  },
  loginTitle: {
    margin: "0 0 8px",
    fontSize: 30,
    fontWeight: 950,
  },
  loginSubtitle: {
    margin: "0 0 20px",
    color: "rgba(248,250,252,0.62)",
    lineHeight: 1.5,
  },
  loginInput: {
    width: "100%",
    boxSizing: "border-box",
    padding: "13px 14px",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(2,6,23,0.78)",
    color: "#f8fafc",
    outline: "none",
    marginBottom: 12,
    fontSize: 15,
  },
  loginButton: {
    width: "100%",
    padding: "13px 14px",
    borderRadius: 16,
    border: "1px solid rgba(212,175,55,0.35)",
    background: "linear-gradient(135deg, #d4af37, #a16207)",
    color: "#111827",
    fontWeight: 950,
    fontSize: 15,
    cursor: "pointer",
  },
  loginError: {
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    background: "rgba(127,29,29,0.32)",
    border: "1px solid rgba(248,113,113,0.22)",
    color: "#fecaca",
    fontSize: 13,
    lineHeight: 1.45,
  },
};

export default App;