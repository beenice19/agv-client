import React, { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";

const API_BASE = "http://127.0.0.1:8787";
const TOKEN_KEY = "stro_cheivery_auth_token";
const SESSION_KEY = "stro_cheivery_session_id";

const DEFAULT_ROOMS = [
  {
    id: "main-hall",
    name: "Main Hall",
    host: "Admin",
    assignedHost: "Admin",
    moderators: ["Admin"],
    isPrivate: false,
    isLocked: false,
    category: "Convention",
  },
  {
    id: "studio-a",
    name: "Studio A",
    host: "Admin",
    assignedHost: "Admin",
    moderators: [],
    isPrivate: false,
    isLocked: false,
    category: "Media",
  },
  {
    id: "radio-room",
    name: "Radio Room",
    host: "Admin",
    assignedHost: "Admin",
    moderators: [],
    isPrivate: false,
    isLocked: false,
    category: "Broadcast",
  },
  {
    id: "prayer-room",
    name: "Prayer Room",
    host: "Admin",
    assignedHost: "Admin",
    moderators: [],
    isPrivate: true,
    isLocked: false,
    category: "Community",
  },
  {
    id: "classroom-1",
    name: "Classroom 1",
    host: "Admin",
    assignedHost: "Admin",
    moderators: [],
    isPrivate: false,
    isLocked: false,
    category: "Teaching",
  },
  {
    id: "green-room",
    name: "Green Room",
    host: "Admin",
    assignedHost: "Admin",
    moderators: [],
    isPrivate: true,
    isLocked: false,
    category: "Backstage",
  },
];

function getClientSessionId() {
  const existing = window.sessionStorage.getItem(SESSION_KEY);
  if (existing) return existing;

  const created = `sc-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  window.sessionStorage.setItem(SESSION_KEY, created);
  return created;
}

function getStoredToken() {
  return window.localStorage.getItem(TOKEN_KEY) || "";
}

function App() {
  const [authToken, setAuthToken] = useState(() => getStoredToken());
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [loginUsername, setLoginUsername] = useState("admin");
  const [loginPassword, setLoginPassword] = useState("ElizabethT96#");
  const [loginError, setLoginError] = useState("");

  const [createUserUsername, setCreateUserUsername] = useState("");
  const [createUserDisplayName, setCreateUserDisplayName] = useState("");
  const [createUserPassword, setCreateUserPassword] = useState("");
  const [createUserRole, setCreateUserRole] = useState("user");
  const [adminUsers, setAdminUsers] = useState([]);

  const [clientSessionId] = useState(() => getClientSessionId());
  const [rooms, setRooms] = useState(DEFAULT_ROOMS);
  const [selectedRoomId, setSelectedRoomId] = useState(DEFAULT_ROOMS[0].id);
  const [selectedPanel, setSelectedPanel] = useState("chat");
  const [stageSize, setStageSize] = useState("full");

  const [chatInput, setChatInput] = useState("");
  const [messagesByRoom, setMessagesByRoom] = useState({});
  const [bulletinItemsByRoom, setBulletinItemsByRoom] = useState({});
  const [participantsByRoom, setParticipantsByRoom] = useState({});
  const [bulletinSourceByRoom, setBulletinSourceByRoom] = useState({});
  const [readerIndexByRoom, setReaderIndexByRoom] = useState({});
  const [readerPausedByRoom, setReaderPausedByRoom] = useState({});

  const [roomSearch, setRoomSearch] = useState("");
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [screenShareOn, setScreenShareOn] = useState(false);
  const [shareDocked, setShareDocked] = useState(false);

  const [localCameraStream, setLocalCameraStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);

  const [statusText, setStatusText] = useState("Ready");
  const [userRole, setUserRole] = useState("viewer");
  const [roomIsPrivate, setRoomIsPrivate] = useState(false);
  const [roomLocked, setRoomLocked] = useState(false);

  const [newRoomName, setNewRoomName] = useState("");
  const [newAnnouncement, setNewAnnouncement] = useState("");
  const [openedFromInvite, setOpenedFromInvite] = useState(false);
  const [sessionStartedAt, setSessionStartedAt] = useState(null);

  const [hostInput, setHostInput] = useState("");
  const [moderatorInput, setModeratorInput] = useState("");

  const stageVideoRef = useRef(null);
  const floatingCameraRef = useRef(null);
  const dockVideoRef = useRef(null);
  const fileInputRef = useRef(null);
  const previousRoomIdRef = useRef(null);
  const heartbeatRef = useRef(null);
  const socketRef = useRef(null);

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
        String(room.host || room.assignedHost || "").toLowerCase().includes(q)
      );
    });
  }, [roomSearch, rooms]);

  const roomMessages = messagesByRoom[selectedRoomId] || [];
  const roomBulletins = bulletinItemsByRoom[selectedRoomId] || [];
  const roomParticipants = participantsByRoom[selectedRoomId] || [];
  const readerIndex = readerIndexByRoom[selectedRoomId] || 0;
  const readerPaused = readerPausedByRoom[selectedRoomId] || false;
  const bulletinSource = bulletinSourceByRoom[selectedRoomId] || "manual";
  const displayName = authUser?.displayName || "";

  const stageViewportOuterStyle = {
    ...styles.stageViewportOuter,
    maxWidth: stageSize === "half" ? "820px" : "100%",
    margin: stageSize === "half" ? "0 auto" : "0",
  };

  const stageViewportStyle = {
    ...styles.stageViewport,
    aspectRatio: stageSize === "half" ? "16 / 10" : "16 / 9",
  };

  const inviteLink = useMemo(() => {
    if (!selectedRoomId) return "";
    const base = window.location.origin || "http://127.0.0.1:5175";
    return `${base}/?room=${encodeURIComponent(selectedRoomId)}`;
  }, [selectedRoomId]);

  const participantCount = roomParticipants.length;
  const liveStatusText = screenShareOn ? "Presenting" : cameraOn ? "Live" : "Idle";
  const isSuperadmin = authUser?.globalRole === "superadmin";

  const activeUsers = useMemo(() => {
    return adminUsers.filter((user) => user.isActive);
  }, [adminUsers]);

  const moderatorOptions = useMemo(() => {
    return activeUsers.filter((user) => {
      const display = String(user.displayName || "");
      if (!display) return false;
      if (display === (selectedRoom?.assignedHost || selectedRoom?.host || "")) return false;
      if (Array.isArray(selectedRoom?.moderators) && selectedRoom.moderators.includes(display)) return false;
      return true;
    });
  }, [activeUsers, selectedRoom]);

  const roleText =
    userRole === "superadmin"
      ? "ADMIN"
      : userRole === "host"
      ? "HOST"
      : userRole === "moderator"
      ? "MODERATOR"
      : "PARTICIPANT";

  const sessionModeLabel = screenShareOn
    ? "Screen Presentation"
    : cameraOn && micOn
    ? "Live Broadcast"
    : cameraOn
    ? "Camera Live"
    : "Standby";

  const sessionBannerText = screenShareOn
    ? "You are presenting to the room."
    : cameraOn
    ? "You are live on stage."
    : "Stage is ready. Start your session when you’re ready.";

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
    if (!authToken) {
      setAuthUser(null);
      setAuthLoading(false);
      setAdminUsers([]);
      disconnectSocket();
      return;
    }

    bootstrapAuthenticatedClient();
  }, [authToken]);

  useEffect(() => {
    if (!selectedRoom) return;

    setRoomIsPrivate(Boolean(selectedRoom?.isPrivate));
    setRoomLocked(Boolean(selectedRoom?.isLocked));
    setHostInput(selectedRoom?.assignedHost || selectedRoom?.host || "");
    setModeratorInput("");

    if (!authUser) {
      setUserRole("viewer");
      return;
    }

    if (authUser.globalRole === "superadmin") {
      setUserRole("superadmin");
      return;
    }

    if (selectedRoom.assignedHost === authUser.displayName || selectedRoom.host === authUser.displayName) {
      setUserRole("host");
      return;
    }

    if (Array.isArray(selectedRoom.moderators) && selectedRoom.moderators.includes(authUser.displayName)) {
      setUserRole("moderator");
      return;
    }

    setUserRole("viewer");
  }, [selectedRoom, authUser]);

  useEffect(() => {
    if (cameraOn || screenShareOn) {
      setSessionStartedAt((prev) => prev || new Date());
    } else {
      setSessionStartedAt(null);
    }
  }, [cameraOn, screenShareOn]);

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
    if (!authUser || !selectedRoomId) return;

    loadRoomStateFromServer(selectedRoomId);
    joinRoomPresence(selectedRoomId);

    if (socketRef.current) {
      socketRef.current.emit("room:subscribe", {
        roomId: selectedRoomId,
        sessionId: clientSessionId,
      });
    }

    return () => {
      if (socketRef.current && selectedRoomId) {
        socketRef.current.emit("room:unsubscribe", {
          roomId: selectedRoomId,
        });
      }
    };
  }, [selectedRoomId, authUser]);

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
  }, [selectedRoomId, authUser]);

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
        console.log(error);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      disconnectPresence();
      stopCameraTracks();
      stopScreenTracks();
      disconnectSocket();
    };
  }, []);

  async function bootstrapAuthenticatedClient() {
    setAuthLoading(true);

    const me = await fetchMe();
    if (!me) {
      logout();
      setAuthLoading(false);
      return;
    }

    setAuthUser(me);
    setStatusText(`Signed in as ${me.displayName}`);

    await loadRoomsFromServer();
    if (me.globalRole === "superadmin") {
      await loadAdminUsers();
    }

    connectSocket();
    setAuthLoading(false);
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
      if (selectedRoomId) {
        socket.emit("room:subscribe", {
          roomId: selectedRoomId,
          sessionId: clientSessionId,
        });
      }
    });

    socket.on("rooms:update", (payload) => {
      if (!Array.isArray(payload?.rooms)) return;
      setRooms(
        payload.rooms.map((room) => ({
          id: String(room.id),
          name: String(room.name),
          host: String(room.host || room.assignedHost || "Admin"),
          assignedHost: String(room.assignedHost || room.host || "Admin"),
          moderators: Array.isArray(room.moderators) ? room.moderators : [],
          isPrivate: Boolean(room.isPrivate),
          isLocked: Boolean(room.isLocked),
          category: String(room.category || "Room"),
        }))
      );
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
      applyRoomStateFromServer(payload.roomId, payload.state);
    });

    socket.on("room:snapshot", (payload) => {
      if (payload?.room) {
        const room = payload.room;
        const normalizedRoom = {
          id: String(room.id),
          name: String(room.name),
          host: String(room.host || room.assignedHost || "Admin"),
          assignedHost: String(room.assignedHost || room.host || "Admin"),
          moderators: Array.isArray(room.moderators) ? room.moderators : [],
          isPrivate: Boolean(room.isPrivate),
          isLocked: Boolean(room.isLocked),
          category: String(room.category || "Room"),
        };

        setRooms((prev) => {
          const exists = prev.some((item) => item.id === normalizedRoom.id);
          if (!exists) return [...prev, normalizedRoom];
          return prev.map((item) => (item.id === normalizedRoom.id ? normalizedRoom : item));
        });
      }

      if (payload?.state && payload?.room?.id) {
        applyRoomStateFromServer(payload.room.id, payload.state);
      }

      if (Array.isArray(payload?.participants) && payload?.room?.id) {
        setParticipantsByRoom((prev) => ({
          ...prev,
          [payload.room.id]: payload.participants,
        }));
      }
    });

    socket.on("disconnect", () => {
      setStatusText("Live sync disconnected");
    });
  }

  function disconnectSocket() {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }

  async function fetchJson(url, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };

    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    const res = await fetch(url, {
      ...options,
      headers,
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

  async function loadAdminUsers() {
    try {
      const { res, data } = await fetchJson(`${API_BASE}/api/admin/users`, {
        method: "GET",
      });

      if (!res.ok || !data?.ok || !Array.isArray(data?.users)) {
        return;
      }

      setAdminUsers(data.users);
    } catch (error) {
      console.log(error);
    }
  }

  async function handleLogin() {
    setLoginError("");

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: loginUsername,
          password: loginPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok || !data?.token || !data?.user) {
        setLoginError(data?.error || "Login failed");
        return;
      }

      window.localStorage.setItem(TOKEN_KEY, data.token);
      setAuthToken(data.token);
      setAuthUser(data.user);
      setStatusText(`Signed in as ${data.user.displayName}`);
    } catch (error) {
      setLoginError("Login failed");
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
    setBulletinSourceByRoom({});
    setStatusText("Signed out");
    disconnectSocket();
  }

  async function handleCreateUser() {
    if (!createUserUsername.trim() || !createUserDisplayName.trim() || !createUserPassword.trim()) {
      setStatusText("Enter username, display name, and password");
      return;
    }

    try {
      const { res, data } = await fetchJson(`${API_BASE}/api/auth/register`, {
        method: "POST",
        body: JSON.stringify({
          username: createUserUsername,
          displayName: createUserDisplayName,
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
      setHostInput(data.user.displayName);
      setModeratorInput(data.user.displayName);
      setStatusText(`User ${data.user.displayName} created`);
      await loadAdminUsers();
    } catch (error) {
      setStatusText("Could not create user");
    }
  }

  async function handleDeactivateUser(username) {
    try {
      const { res, data } = await fetchJson(`${API_BASE}/api/admin/users/${encodeURIComponent(username)}/deactivate`, {
        method: "POST",
      });

      if (!res.ok || !data?.ok) {
        setStatusText(data?.error || "Could not deactivate user");
        return;
      }

      setStatusText(`${data.user.displayName} deactivated`);
      loadAdminUsers();
    } catch (error) {
      setStatusText("Could not deactivate user");
    }
  }

  async function handleReactivateUser(username) {
    try {
      const { res, data } = await fetchJson(`${API_BASE}/api/admin/users/${encodeURIComponent(username)}/reactivate`, {
        method: "POST",
      });

      if (!res.ok || !data?.ok) {
        setStatusText(data?.error || "Could not reactivate user");
        return;
      }

      setStatusText(`${data.user.displayName} reactivated`);
      loadAdminUsers();
    } catch (error) {
      setStatusText("Could not reactivate user");
    }
  }

  async function loadRoomsFromServer() {
    try {
      const { res, data } = await fetchJson(`${API_BASE}/api/rooms`, {
        method: "GET",
      });

      if (!res.ok || !Array.isArray(data?.rooms) || data.rooms.length === 0) {
        applyInitialRoomFromUrl(DEFAULT_ROOMS);
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
        isLocked: Boolean(room.isLocked),
        category: String(room.category || "Room"),
      }));

      setRooms(normalized);
      applyInitialRoomFromUrl(normalized);
      setStatusText("Rooms loaded from server");
    } catch (error) {
      applyInitialRoomFromUrl(DEFAULT_ROOMS);
      setStatusText("Using local rooms");
    }
  }

  async function loadRoomStateFromServer(roomId) {
    try {
      const { res, data } = await fetchJson(`${API_BASE}/api/rooms/${encodeURIComponent(roomId)}/state`, {
        method: "GET",
      });

      if (!res.ok || !data?.ok || !data?.state) {
        return;
      }

      applyRoomStateFromServer(roomId, data.state);
    } catch (error) {
      console.log(error);
    }
  }

  async function joinRoomPresence(roomId) {
    if (!roomId || !authUser) return;

    const previousRoomId = previousRoomIdRef.current;
    if (previousRoomId && previousRoomId !== roomId) {
      await leaveRoomPresence(previousRoomId);
    }

    try {
      const { res, data } = await fetchJson(`${API_BASE}/api/rooms/${encodeURIComponent(roomId)}/presence/join`, {
        method: "POST",
        body: JSON.stringify({
          sessionId: clientSessionId,
        }),
      });

      if (!res.ok || !data?.ok) {
        setStatusText(data?.error || "Could not join room presence");
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
    if (!roomId || !authUser) return;

    try {
      const { res, data } = await fetchJson(`${API_BASE}/api/rooms/${encodeURIComponent(roomId)}/presence/heartbeat`, {
        method: "POST",
        body: JSON.stringify({
          sessionId: clientSessionId,
        }),
      });

      if (!res.ok || !data?.ok) {
        return;
      }

      setParticipantsByRoom((prev) => ({
        ...prev,
        [roomId]: Array.isArray(data.participants) ? data.participants : [],
      }));
    } catch (error) {
      console.log(error);
    }
  }

  async function leaveRoomPresence(roomId) {
    if (!roomId || !authUser) return;

    try {
      const { res, data } = await fetchJson(`${API_BASE}/api/rooms/${encodeURIComponent(roomId)}/presence/leave`, {
        method: "POST",
        body: JSON.stringify({
          sessionId: clientSessionId,
        }),
      });

      if (!res.ok || !data?.ok) {
        return;
      }

      setParticipantsByRoom((prev) => ({
        ...prev,
        [roomId]: Array.isArray(data.participants) ? data.participants : [],
      }));
    } catch (error) {
      console.log(error);
    }
  }

  async function disconnectPresence() {
    try {
      await fetch(`${API_BASE}/api/presence/disconnect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: clientSessionId,
        }),
        keepalive: true,
      });
    } catch (error) {
      console.log(error);
    }
  }

  function applyRoomStateFromServer(roomId, state) {
    const messages = Array.isArray(state?.messages) ? state.messages : [];
    const bulletins = Array.isArray(state?.bulletins) ? state.bulletins : [];
    const nextBulletinSource = String(state?.bulletinSource || "manual");

    setMessagesByRoom((prev) => ({
      ...prev,
      [roomId]: messages,
    }));

    setBulletinItemsByRoom((prev) => ({
      ...prev,
      [roomId]: bulletins,
    }));

    setBulletinSourceByRoom((prev) => ({
      ...prev,
      [roomId]: nextBulletinSource,
    }));

    setReaderIndexByRoom((prev) => ({
      ...prev,
      [roomId]: 0,
    }));

    setReaderPausedByRoom((prev) => ({
      ...prev,
      [roomId]: false,
    }));
  }

  function applyInitialRoomFromUrl(roomList) {
    const params = new URLSearchParams(window.location.search);
    const roomFromUrl = params.get("room");

    if (roomFromUrl) {
      const exists = roomList.some((room) => room.id === roomFromUrl);
      if (exists) {
        setSelectedRoomId(roomFromUrl);
        setOpenedFromInvite(true);
        setStatusText(`Opened room from link: ${roomFromUrl}`);
        return;
      }
    }

    setOpenedFromInvite(false);

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
      setStatusText(`${selectedRoom?.name || "Room"} audience link copied`);
    } catch (error) {
      setStatusText("Could not copy audience link");
      alert(`Copy this link manually:\n\n${inviteLink}`);
    }
  }

  async function handleCreateRoom() {
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

      const room = {
        id: String(data.room.id),
        name: String(data.room.name),
        host: String(data.room.host || data.room.assignedHost || displayName || "Admin"),
        assignedHost: String(data.room.assignedHost || data.room.host || displayName || "Admin"),
        moderators: Array.isArray(data.room.moderators) ? data.room.moderators : [],
        isPrivate: Boolean(data.room.isPrivate),
        isLocked: Boolean(data.room.isLocked),
        category: String(data.room.category || "Custom"),
      };

      setRooms((prev) => [...prev, room]);
      setSelectedRoomId(room.id);

      setNewRoomName("");
      setStatusText(`Room "${room.name}" created. You are now the host.`);

      if (data?.room?.id) {
        await loadRoomStateFromServer(data.room.id);
        await joinRoomPresence(data.room.id);
      }
    } catch (error) {
      setStatusText("Could not create room");
    }
  }

  async function handleAssignHost() {
    if (!selectedRoomId) return;

    const nextHost = hostInput.trim();
    if (!nextHost) {
      setStatusText("Enter a host display name first");
      return;
    }

    try {
      const { res, data } = await fetchJson(`${API_BASE}/api/rooms/${encodeURIComponent(selectedRoomId)}/assign-host`, {
        method: "POST",
        body: JSON.stringify({
          displayName: nextHost,
        }),
      });

      if (!res.ok || !data?.ok || !data?.room) {
        setStatusText(data?.error || "Could not assign host");
        return;
      }

      applyRoomUpdateFromServer(data.room);
      setStatusText(`${nextHost} is now the assigned host for ${data.room.name}`);
    } catch (error) {
      setStatusText("Could not assign host");
    }
  }

  async function handleAddModerator() {
    if (!selectedRoomId) return;

    const nextModerator = moderatorInput.trim();
    if (!nextModerator) {
      setStatusText("Enter a moderator display name first");
      return;
    }

    try {
      const { res, data } = await fetchJson(`${API_BASE}/api/rooms/${encodeURIComponent(selectedRoomId)}/add-moderator`, {
        method: "POST",
        body: JSON.stringify({
          displayName: nextModerator,
        }),
      });

      if (!res.ok || !data?.ok || !data?.room) {
        setStatusText(data?.error || "Could not add moderator");
        return;
      }

      applyRoomUpdateFromServer(data.room);
      setModeratorInput("");
      setStatusText(`${nextModerator} added as moderator`);
    } catch (error) {
      setStatusText("Could not add moderator");
    }
  }

  async function handleRemoveModerator(name) {
    if (!selectedRoomId || !name) return;

    try {
      const { res, data } = await fetchJson(`${API_BASE}/api/rooms/${encodeURIComponent(selectedRoomId)}/remove-moderator`, {
        method: "POST",
        body: JSON.stringify({
          displayName: name,
        }),
      });

      if (!res.ok || !data?.ok || !data?.room) {
        setStatusText(data?.error || "Could not remove moderator");
        return;
      }

      applyRoomUpdateFromServer(data.room);
      setStatusText(`${name} removed from moderators`);
    } catch (error) {
      setStatusText("Could not remove moderator");
    }
  }

  async function handleTogglePrivacy() {
    if (!selectedRoomId) return;

    try {
      const nextValue = !roomIsPrivate;

      const { res, data } = await fetchJson(`${API_BASE}/api/rooms/${encodeURIComponent(selectedRoomId)}/privacy`, {
        method: "POST",
        body: JSON.stringify({
          isPrivate: nextValue,
        }),
      });

      if (!res.ok || !data?.ok || !data?.room) {
        setStatusText(data?.error || "Could not update privacy");
        return;
      }

      applyRoomUpdateFromServer(data.room);
      setStatusText(nextValue ? "Room set to private" : "Room set to public");
    } catch (error) {
      setStatusText("Could not update privacy");
    }
  }

  async function handleToggleLock() {
    if (!selectedRoomId) return;

    try {
      const nextValue = !roomLocked;

      const { res, data } = await fetchJson(`${API_BASE}/api/rooms/${encodeURIComponent(selectedRoomId)}/lock`, {
        method: "POST",
        body: JSON.stringify({
          isLocked: nextValue,
        }),
      });

      if (!res.ok || !data?.ok || !data?.room) {
        setStatusText(data?.error || "Could not update room lock");
        return;
      }

      applyRoomUpdateFromServer(data.room);
      setStatusText(nextValue ? "Room locked" : "Room unlocked");
    } catch (error) {
      setStatusText("Could not update room lock");
    }
  }

  function applyRoomUpdateFromServer(roomFromServer) {
    const normalizedRoom = {
      id: String(roomFromServer.id),
      name: String(roomFromServer.name),
      host: String(roomFromServer.host || roomFromServer.assignedHost || "Admin"),
      assignedHost: String(roomFromServer.assignedHost || roomFromServer.host || "Admin"),
      moderators: Array.isArray(roomFromServer.moderators) ? roomFromServer.moderators : [],
      isPrivate: Boolean(roomFromServer.isPrivate),
      isLocked: Boolean(roomFromServer.isLocked),
      category: String(roomFromServer.category || "Room"),
    };

    setRooms((prev) =>
      prev.map((room) => (room.id === normalizedRoom.id ? normalizedRoom : room))
    );
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

      applyRoomStateFromServer(selectedRoomId, data.state);
      setChatInput("");
      setStatusText("Message sent");
    } catch (error) {
      setStatusText("Could not send message");
    }
  }

  async function handleAnnouncementAdd() {
    const text = newAnnouncement.trim();
    if (!text) return;

    if (userRole !== "superadmin" && userRole !== "host" && userRole !== "moderator") {
      setStatusText("Only Admin, host, or moderator can add bulletins");
      return;
    }

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

      applyRoomStateFromServer(selectedRoomId, data.state);
      setNewAnnouncement("");
      setStatusText("Announcement added");
    } catch (error) {
      setStatusText("Could not add bulletin");
    }
  }

  async function handleBulletinUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (userRole !== "superadmin" && userRole !== "host" && userRole !== "moderator") {
      setStatusText("Only Admin, host, or moderator can import bulletins");
      event.target.value = "";
      return;
    }

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

      const { res, data } = await fetchJson(`${API_BASE}/api/rooms/${encodeURIComponent(selectedRoomId)}/bulletins/import`, {
        method: "POST",
        body: JSON.stringify({
          lines,
        }),
      });

      if (!res.ok || !data?.ok || !data?.state) {
        setStatusText(data?.error || "Could not import bulletin text");
        return;
      }

      applyRoomStateFromServer(selectedRoomId, data.state);
      setStatusText(`Loaded ${lines.length} bulletin lines`);
    } catch (error) {
      alert("Could not read that text file.");
      setStatusText("Could not import bulletin text");
    } finally {
      event.target.value = "";
    }
  }

  function handleJoinRoom(roomId) {
    const room = rooms.find((item) => item.id === roomId);
    const roleForRoom =
      authUser?.globalRole === "superadmin"
        ? "superadmin"
        : room?.assignedHost === authUser?.displayName || room?.host === authUser?.displayName
        ? "host"
        : Array.isArray(room?.moderators) && room.moderators.includes(authUser?.displayName)
        ? "moderator"
        : "viewer";

    if (room?.isLocked && roleForRoom === "viewer") {
      setStatusText("This room is locked. Only Admin, host, or moderators can enter while locked.");
      return;
    }

    setSelectedRoomId(roomId);
    setOpenedFromInvite(false);

    const roomName = room?.name || "room";
    setStatusText(`Entered ${roomName}`);
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

  if (authLoading) {
    return (
      <div style={loginStyles.shell}>
        <div style={loginStyles.card}>
          <div style={loginStyles.logo}>AGV</div>
          <h1 style={loginStyles.title}>Avant Global Vision</h1>
          <div style={loginStyles.subtitle}>Loading Avant Global Vision...</div>
        </div>
      </div>
    );
  }

  if (!authUser) {
    return (
      <div style={loginStyles.shell}>
        <div style={loginStyles.card}>
          <div style={loginStyles.logo}>AGV</div>
          <h1 style={loginStyles.title}>Avant Global Vision</h1>
          <div style={loginStyles.subtitle}>Sign in to Avant Global Vision</div>

          <input
            style={loginStyles.input}
            value={loginUsername}
            onChange={(e) => setLoginUsername(e.target.value)}
            placeholder="Username"
          />

          <input
            style={loginStyles.input}
            type="password"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            placeholder="Password"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleLogin();
              }
            }}
          />

          <button style={loginStyles.button} onClick={handleLogin}>
            Sign In
          </button>

          {loginError ? <div style={loginStyles.error}>{loginError}</div> : null}

          <div style={loginStyles.helper}>
            Default Admin
            <br />
            Username: <strong>admin</strong>
            <br />
            Password: <strong>ElizabethT96#</strong>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.appShell}>
      <div style={styles.appBackground} />

      <header style={styles.header}>
        <div style={styles.brandRow}>
          <div style={styles.brandBadge}>AGV</div>
          <div>
            <h1 style={styles.title}>Avant Global Vision</h1>
            <div style={styles.subtitle}>Premium Live Broadcast Platform</div>
          </div>
        </div>

        <div style={styles.headerRight}>
          <div style={styles.headerStatus}>
            <span style={styles.statusDot} />
            <span>{statusText}</span>
          </div>
          <div style={styles.userPill}>
            {authUser.displayName} • {authUser.globalRole === "superadmin" ? "Admin" : "User"}
          </div>
          <button style={styles.leaveButton} onClick={logout}>
            Log Out
          </button>
        </div>
      </header>

      <main style={styles.main}>
        {openedFromInvite && (
          <section style={styles.inviteEntryBanner}>
            <div style={styles.inviteEntryTitle}>Entered from audience invite</div>
            <div style={styles.inviteEntryText}>
              You opened <strong>{selectedRoom?.name || "this room"}</strong> directly from an Avant Global Vision room link.
            </div>
          </section>
        )}

        <section style={styles.identitySection}>
          <div style={styles.identityCard}>
            <div style={styles.identityLeft}>
              <div style={styles.identityRoomName}>{selectedRoom?.name || "Room"}</div>
              <div style={styles.identitySubline}>
                Signed in as: {authUser.displayName} • Username: {authUser.username} • Room Role: {roleText}
              </div>
            </div>

            <div style={styles.identityStats}>
              <div style={styles.identityPill}>{roomIsPrivate ? "Private" : "Public"}</div>
              <div style={styles.identityPill}>{roomLocked ? "Locked" : "Unlocked"}</div>
              <div style={styles.identityPill}>{liveStatusText}</div>
              <div style={styles.identityPill}>
                {participantCount} {participantCount === 1 ? "Person" : "People"}
              </div>
              <div
                style={
                  userRole === "superadmin" || userRole === "host" || userRole === "moderator"
                    ? styles.identityRoleHost
                    : styles.identityRoleParticipant
                }
              >
                {roleText}
              </div>
            </div>
          </div>

          <div style={styles.inviteActionRow}>
            <button style={styles.invitePrimaryButton} onClick={copyInviteLink}>
              Invite Viewers to {selectedRoom?.name || "Room"}
            </button>
            <div style={styles.inviteActionText}>
              Authority now follows the authenticated account, not a typed display name.
            </div>
          </div>
        </section>

        <section style={styles.stageSection}>
          <div style={styles.stageSkinShell}>
            <div style={styles.stageSkinTopMarquee}>
              <div style={styles.stageSkinTopLine} />
              <div style={styles.stageSkinTitle}>ACADEMY STAGE</div>
              <div style={styles.stageSkinTopLine} />
            </div>

            <div style={styles.stageCurtainLeft} />
            <div style={styles.stageCurtainRight} />
            <div style={styles.stageGoldSweepLeft} />
            <div style={styles.stageGoldSweepRight} />

            <div style={styles.stageCard}>
              <div style={styles.sessionBanner}>
                <div>
                  <div style={styles.sessionBannerTitle}>{sessionModeLabel}</div>
                  <div style={styles.sessionBannerText}>{sessionBannerText}</div>
                </div>
                <div style={styles.sessionBannerMeta}>
                  <div style={styles.sessionMetaChip}>
                    {screenShareOn ? "Share Live" : cameraOn ? "Stage Live" : "Ready"}
                  </div>
                  <div style={styles.sessionMetaChip}>{micOn ? "Mic Open" : "Mic Muted"}</div>
                  <div style={styles.sessionMetaChip}>
                    {sessionStartedAt
                      ? `Started ${sessionStartedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
                      : "Session not started"}
                  </div>
                </div>
              </div>

              <div style={styles.stageHeader}>
                <div>
                  <div style={styles.stageTitle}>
                    {screenShareOn ? "Avant Global Vision Presentation Stage" : "Avant Global Vision Main Stage"}
                  </div>
                  <div style={styles.stageSubtitle}>
                    Avant Global Vision is live and ready for your broadcast, presentation, or event.
                  </div>
                </div>

                <div style={styles.stageMetaWrap}>
                  <div style={styles.metaPill}>{selectedRoom?.name || "Room"}</div>
                  <div style={styles.metaPill}>{roomIsPrivate ? "Private" : "Public"}</div>
                  <div style={styles.metaPill}>{roomLocked ? "Locked" : "Open"}</div>
                  <button
                    style={stageSize === "full" ? styles.stageModeButtonActive : styles.stageModeButton}
                    onClick={() => setStageSize("full")}
                  >
                    Full Stage
                  </button>
                  <button
                    style={stageSize === "half" ? styles.stageModeButtonActive : styles.stageModeButton}
                    onClick={() => setStageSize("half")}
                  >
                    Half Stage
                  </button>
                </div>
              </div>

              <div style={stageViewportOuterStyle}>
                <div style={styles.stagePedestalGlow} />
                <div style={stageViewportStyle}>
                  <div style={styles.stageGlow} />

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
                      <div style={styles.stagePlaceholderIcon}>AGV</div>
                      <div style={styles.stagePlaceholderTitle}>Avant Global Vision Stage Ready</div>
                      <div style={styles.stagePlaceholderText}>
                        Start your session:
                        <br />
                        • Turn on Camera
                        <br />
                        • Or Share your Screen
                        <br />
                        • Or Invite audience to Avant Global Vision
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
            </div>
          </div>
        </section>

        <section style={styles.controlSection}>
          <div style={styles.controlBar}>
            <button
              style={cameraOn ? styles.controlButtonActive : styles.controlButton}
              onClick={handleToggleCamera}
            >
              {cameraOn ? "Stop Camera" : "Start Camera"}
            </button>

            <button
              style={micOn ? styles.controlButtonActive : styles.controlButton}
              onClick={handleToggleMic}
            >
              {micOn ? "Mute Mic" : "Unmute Mic"}
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
              Dock Screen
            </button>

            <button
              style={selectedPanel === "controls" ? styles.controlButtonAccent : styles.controlButton}
              onClick={() => setSelectedPanel("controls")}
            >
              Control Center
            </button>
          </div>
        </section>

        <section style={styles.contentSection}>
          <div style={styles.roomRailCard}>
            <div style={styles.panelTopRow}>
              <div>
                <div style={styles.panelTitle}>Rooms</div>
                <div style={styles.panelSubtext}>Authenticated room access and live room updates for Avant Global Vision.</div>
              </div>
              <button style={styles.secondaryButton} onClick={loadRoomsFromServer}>
                Refresh Rooms
              </button>
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
                      {room.category} • {room.isPrivate ? "Private" : "Public"} • {room.isLocked ? "Locked" : "Open"}
                    </div>
                    <div style={styles.roomChipHost}>Host: {room.assignedHost || room.host || "Admin"}</div>
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
              Audience
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
                  <div style={styles.panelTitle}>Live Chat</div>
                  <div style={styles.panelSubtext}>Live room messaging powered by authenticated account identity.</div>
                </div>
              </div>

              <div style={styles.messageList}>
                {roomMessages.length === 0 ? (
                  <div style={styles.emptyState}>No messages yet. Start the conversation in this room.</div>
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
                  <div style={styles.panelTitle}>Broadcast Bulletin</div>
                  <div style={styles.panelSubtext}>Bulletin publishing now flows through authenticated account authority.</div>
                </div>
              </div>

              <div style={styles.bulletinActionRow}>
                <input
                  style={styles.composerInput}
                  value={newAnnouncement}
                  onChange={(e) => setNewAnnouncement(e.target.value)}
                  placeholder="Add single announcement..."
                />
                <button
                  style={
                    userRole === "superadmin" || userRole === "host" || userRole === "moderator"
                      ? styles.primaryButton
                      : styles.controlButtonDisabled
                  }
                  onClick={handleAnnouncementAdd}
                  disabled={userRole !== "superadmin" && userRole !== "host" && userRole !== "moderator"}
                >
                  Add
                </button>
                <button
                  style={
                    userRole === "superadmin" || userRole === "host" || userRole === "moderator"
                      ? styles.secondaryButton
                      : styles.controlButtonDisabled
                  }
                  onClick={triggerBulletinFile}
                  disabled={userRole !== "superadmin" && userRole !== "host" && userRole !== "moderator"}
                >
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
                    {readerWindow[0] ? <div style={styles.readerLineMuted}>{readerWindow[0]}</div> : <div style={styles.readerSpacer} />}
                    <div style={styles.readerLineActive}>{readerWindow[1] || "No bulletin text loaded."}</div>
                    {readerWindow[2] ? <div style={styles.readerLineNext}>{readerWindow[2]}</div> : <div style={styles.readerSpacer} />}
                    {readerWindow[3] ? <div style={styles.readerLineMuted}>{readerWindow[3]}</div> : <div style={styles.readerSpacer} />}
                  </div>

                  <div style={styles.readerControls}>
                    <button style={styles.secondaryButton} onClick={readerPrev}>Previous</button>
                    <button style={styles.primaryButton} onClick={toggleReaderPause}>{readerPaused ? "Resume" : "Pause"}</button>
                    <button style={styles.secondaryButton} onClick={readerNext}>Next</button>
                    <button style={styles.secondaryButton} onClick={readerReset}>Reset</button>
                  </div>
                </div>
              )}
            </section>
          )}

          {selectedPanel === "participants" && (
            <section style={styles.panelCard}>
              <div style={styles.panelTopRow}>
                <div>
                  <div style={styles.panelTitle}>Audience</div>
                  <div style={styles.panelSubtext}>Live presence now reflects authenticated user accounts.</div>
                </div>
              </div>

              <div style={styles.participantGrid}>
                {roomParticipants.length === 0 ? (
                  <div style={styles.emptyState}>No one is in this room yet.</div>
                ) : (
                  roomParticipants.map((person, index) => (
                    <div key={`${person.sessionId || person.name}-${index}`} style={styles.participantCard}>
                      <div style={styles.participantAvatar}>{initials(person.name || "P")}</div>
                      <div>
                        <div style={styles.participantName}>{person.name}</div>
                        <div style={styles.participantRole}>
                          {person.sessionId === clientSessionId ? "You" : person.role || "Participant"}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          )}

          {selectedPanel === "controls" && (
            <section style={styles.panelCard}>
              <div style={styles.panelTopRow}>
                <div>
                  <div style={styles.panelTitle}>Control Center</div>
                  <div style={styles.panelSubtext}>
                    Room authority now follows the signed-in account, not typed names.
                  </div>
                </div>
              </div>

              <div style={styles.controlGrid}>
                <div style={styles.controlBox}>
                  <div style={styles.controlBoxTitle}>Account</div>
                  <div style={styles.summaryList}>
                    <div style={styles.summaryRow}>
                      <span>Display Name</span>
                      <strong>{authUser.displayName}</strong>
                    </div>
                    <div style={styles.summaryRow}>
                      <span>Username</span>
                      <strong>{authUser.username}</strong>
                    </div>
                    <div style={styles.summaryRow}>
                      <span>Global Role</span>
                      <strong>{authUser.globalRole}</strong>
                    </div>
                    <div style={styles.summaryRow}>
                      <span>Room Role</span>
                      <strong>{roleText}</strong>
                    </div>
                  </div>
                </div>

                <div style={styles.controlBox}>
                  <div style={styles.controlBoxTitle}>Create Broadcast Room</div>
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
                  <div style={styles.controlBoxTitle}>Assign Host</div>
                  <div style={styles.inlineRow}>
                    <select
                      style={styles.composerInput}
                      value={hostInput}
                      onChange={(e) => setHostInput(e.target.value)}
                      disabled={!isSuperadmin}
                    >
                      <option value="">Select a durable user</option>
                      {activeUsers.map((user) => (
                        <option key={`host-${user.username}`} value={user.displayName}>
                          {user.displayName} ({user.username})
                        </option>
                      ))}
                    </select>
                    <button
                      style={isSuperadmin ? styles.primaryButton : styles.controlButtonDisabled}
                      onClick={handleAssignHost}
                      disabled={!isSuperadmin || !hostInput}
                    >
                      Assign Host
                    </button>
                  </div>
                  <div style={styles.helperText}>Only Admin can assign room hosts.</div>
                </div>

                <div style={styles.controlBox}>
                  <div style={styles.controlBoxTitle}>Add Moderator</div>
                  <div style={styles.inlineRow}>
                    <select
                      style={styles.composerInput}
                      value={moderatorInput}
                      onChange={(e) => setModeratorInput(e.target.value)}
                      disabled={userRole !== "superadmin" && userRole !== "host"}
                    >
                      <option value="">Select a durable user</option>
                      {moderatorOptions.map((user) => (
                        <option key={`mod-${user.username}`} value={user.displayName}>
                          {user.displayName} ({user.username})
                        </option>
                      ))}
                    </select>
                    <button
                      style={
                        userRole === "superadmin" || userRole === "host"
                          ? styles.primaryButton
                          : styles.controlButtonDisabled
                      }
                      onClick={handleAddModerator}
                      disabled={(userRole !== "superadmin" && userRole !== "host") || !moderatorInput}
                    >
                      Add Moderator
                    </button>
                  </div>
                  <div style={styles.helperText}>Target must be a real registered team account.</div>
                </div>

                <div style={styles.controlBox}>
                  <div style={styles.controlBoxTitle}>Room Actions</div>
                  <div style={styles.inlineRowWrap}>
                    <button
                      style={
                        userRole === "superadmin" || userRole === "host" || userRole === "moderator"
                          ? styles.secondaryButton
                          : styles.controlButtonDisabled
                      }
                      onClick={handleTogglePrivacy}
                      disabled={userRole !== "superadmin" && userRole !== "host" && userRole !== "moderator"}
                    >
                      Make {roomIsPrivate ? "Public" : "Private"}
                    </button>

                    <button
                      style={
                        userRole === "superadmin" || userRole === "host" || userRole === "moderator"
                          ? styles.secondaryButton
                          : styles.controlButtonDisabled
                      }
                      onClick={handleToggleLock}
                      disabled={userRole !== "superadmin" && userRole !== "host" && userRole !== "moderator"}
                    >
                      {roomLocked ? "Unlock Room" : "Lock Room"}
                    </button>
                  </div>
                </div>

                <div style={styles.controlBox}>
                  <div style={styles.controlBoxTitle}>Invite Viewers</div>
                  <textarea
                    readOnly
                    value={inviteLink}
                    style={styles.inviteTextarea}
                  />
                  <div style={styles.inlineRowWrap}>
                    <button
                      style={
                        userRole === "superadmin" || userRole === "host" || userRole === "moderator"
                          ? styles.primaryButton
                          : styles.controlButtonDisabled
                      }
                      onClick={copyInviteLink}
                      disabled={userRole !== "superadmin" && userRole !== "host" && userRole !== "moderator"}
                    >
                      Copy Audience Link
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
                      <span>Assigned Host</span>
                      <strong>{selectedRoom?.assignedHost || selectedRoom?.host || "Admin"}</strong>
                    </div>
                    <div style={styles.summaryRow}>
                      <span>Your Role</span>
                      <strong>{roleText}</strong>
                    </div>
                    <div style={styles.summaryRow}>
                      <span>Privacy</span>
                      <strong>{roomIsPrivate ? "Private" : "Public"}</strong>
                    </div>
                    <div style={styles.summaryRow}>
                      <span>Lock</span>
                      <strong>{roomLocked ? "Locked" : "Unlocked"}</strong>
                    </div>
                    <div style={styles.summaryRow}>
                      <span>Live Presence</span>
                      <strong>{roomParticipants.length}</strong>
                    </div>
                  </div>
                </div>

                <div style={styles.controlBox}>
                  <div style={styles.controlBoxTitle}>Moderators</div>
                  <div style={styles.moderatorList}>
                    {Array.isArray(selectedRoom?.moderators) && selectedRoom.moderators.length > 0 ? (
                      selectedRoom.moderators.map((name, index) => (
                        <div key={`${name}-${index}`} style={styles.moderatorRow}>
                          <div style={styles.moderatorPill}>{name}</div>
                          <button
                            style={
                              userRole === "superadmin" || userRole === "host"
                                ? styles.removeModeratorButton
                                : styles.controlButtonDisabled
                            }
                            onClick={() => handleRemoveModerator(name)}
                            disabled={userRole !== "superadmin" && userRole !== "host"}
                          >
                            Remove
                          </button>
                        </div>
                      ))
                    ) : (
                      <div style={styles.emptyStateSmall}>No moderators assigned yet.</div>
                    )}
                  </div>
                </div>

                {isSuperadmin && (
                  <>
                    <div style={styles.controlBox}>
                      <div style={styles.controlBoxTitle}>Create Team Account</div>
                      <div style={styles.inlineColumn}>
                        <input
                          style={styles.composerInput}
                          value={createUserUsername}
                          onChange={(e) => setCreateUserUsername(e.target.value)}
                          placeholder="Username"
                        />
                        <input
                          style={styles.composerInput}
                          value={createUserDisplayName}
                          onChange={(e) => setCreateUserDisplayName(e.target.value)}
                          placeholder="Display name"
                        />
                        <input
                          style={styles.composerInput}
                          type="password"
                          value={createUserPassword}
                          onChange={(e) => setCreateUserPassword(e.target.value)}
                          placeholder="Password"
                        />
                        <select
                          style={styles.composerInput}
                          value={createUserRole}
                          onChange={(e) => setCreateUserRole(e.target.value)}
                        >
                          <option value="user">user</option>
                          <option value="superadmin">superadmin</option>
                        </select>
                        <button style={styles.primaryButton} onClick={handleCreateUser}>
                          Create User
                        </button>
                      </div>
                    </div>

                    <div style={styles.controlBox}>
                      <div style={styles.controlBoxTitle}>Team Accounts</div>
                      <div style={styles.userAdminList}>
                        {adminUsers.length === 0 ? (
                          <div style={styles.emptyStateSmall}>No users loaded.</div>
                        ) : (
                          adminUsers.map((user) => (
                            <div key={user.username} style={styles.userAdminRow}>
                              <div>
                                <div style={styles.userAdminName}>
                                  {user.displayName} ({user.username})
                                </div>
                                <div style={styles.userAdminMeta}>
                                  {user.globalRole} • {user.isActive ? "active" : "inactive"}
                                </div>
                              </div>

                              <div style={styles.inlineRowWrap}>
                                {user.isActive ? (
                                  <button
                                    style={styles.removeModeratorButton}
                                    onClick={() => handleDeactivateUser(user.username)}
                                    disabled={user.username === "admin"}
                                  >
                                    Deactivate
                                  </button>
                                ) : (
                                  <button
                                    style={styles.primaryButton}
                                    onClick={() => handleReactivateUser(user.username)}
                                  >
                                    Reactivate
                                  </button>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
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
          background: rgba(255,255,255,0.06);
          border-radius: 999px;
        }

        ::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.18);
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

function initials(name) {
  return String(name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() || "")
    .join("");
}

const loginStyles = {
  shell: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(180deg, #09111f 0%, #0d1628 40%, #10192d 100%)",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 460,
    borderRadius: 24,
    padding: 28,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.04)",
    boxShadow: "0 18px 48px rgba(0,0,0,0.28)",
    color: "#ecf3ff",
  },
  logo: {
    width: 58,
    height: 58,
    borderRadius: 18,
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(135deg, #4d79ff, #18d2ff)",
    color: "white",
    fontWeight: 900,
    marginBottom: 18,
  },
  title: {
    margin: 0,
    fontSize: 28,
    fontWeight: 900,
  },
  subtitle: {
    color: "rgba(236,243,255,0.70)",
    marginTop: 8,
    marginBottom: 18,
  },
  input: {
    width: "100%",
    padding: "14px 14px",
    borderRadius: 14,
    outline: "none",
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(5,10,18,0.55)",
    color: "#ecf3ff",
    marginBottom: 12,
  },
  button: {
    width: "100%",
    padding: "14px 16px",
    borderRadius: 14,
    border: "1px solid rgba(24,210,255,0.24)",
    background: "rgba(24,210,255,0.18)",
    color: "#f3feff",
    cursor: "pointer",
    fontWeight: 800,
  },
  error: {
    marginTop: 14,
    color: "#ffb2b2",
  },
  helper: {
    marginTop: 16,
    padding: "12px 14px",
    borderRadius: 14,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "rgba(236,243,255,0.76)",
    lineHeight: 1.6,
    fontSize: 13,
  },
};

const styles = {
  appShell: {
    minHeight: "100vh",
    position: "relative",
    color: "#ecf3ff",
    background: "linear-gradient(180deg, #09111f 0%, #0d1628 40%, #10192d 100%)",
    overflowX: "hidden",
  },
  appBackground: {
    position: "fixed",
    inset: 0,
    background:
      "radial-gradient(circle at top left, rgba(69,121,255,0.18), transparent 28%), radial-gradient(circle at top right, rgba(0,217,255,0.10), transparent 24%), linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0))",
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
    padding: "18px 24px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    backdropFilter: "blur(18px)",
    background: "rgba(7, 14, 24, 0.82)",
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
    boxShadow: "0 10px 30px rgba(24, 210, 255, 0.18)",
  },
  title: {
    margin: 0,
    fontSize: 24,
    fontWeight: 800,
    letterSpacing: 0.2,
  },
  subtitle: {
    color: "rgba(236,243,255,0.68)",
    fontSize: 13,
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
    boxShadow: "0 0 0 4px rgba(56, 210, 122, 0.16)",
  },
  userPill: {
    padding: "10px 14px",
    borderRadius: 999,
    background: "rgba(77,121,255,0.16)",
    border: "1px solid rgba(77,121,255,0.28)",
    color: "#dce7ff",
    fontWeight: 600,
    fontSize: 13,
  },
  main: {
    width: "100%",
    maxWidth: 1480,
    margin: "0 auto",
    padding: "22px 18px 40px",
  },
  inviteEntryBanner: {
    marginBottom: 18,
    borderRadius: 18,
    padding: "14px 16px",
    border: "1px solid rgba(24,210,255,0.18)",
    background: "rgba(24,210,255,0.08)",
  },
  inviteEntryTitle: {
    fontWeight: 800,
    marginBottom: 6,
  },
  inviteEntryText: {
    color: "rgba(236,243,255,0.76)",
    lineHeight: 1.45,
  },
  identitySection: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    marginBottom: 18,
  },
  identityCard: {
    display: "flex",
    justifyContent: "space-between",
    gap: 14,
    flexWrap: "wrap",
    borderRadius: 22,
    padding: "16px 18px",
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.04)",
  },
  identityLeft: {
    minWidth: 240,
  },
  identityRoomName: {
    fontSize: 24,
    fontWeight: 800,
    marginBottom: 6,
  },
  identitySubline: {
    color: "rgba(236,243,255,0.66)",
    lineHeight: 1.45,
  },
  identityStats: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    alignItems: "center",
  },
  identityPill: {
    padding: "10px 14px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
    fontWeight: 700,
    fontSize: 13,
  },
  identityRoleHost: {
    padding: "10px 14px",
    borderRadius: 999,
    background: "rgba(77,121,255,0.16)",
    border: "1px solid rgba(77,121,255,0.28)",
    fontWeight: 800,
    fontSize: 13,
  },
  identityRoleParticipant: {
    padding: "10px 14px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
    fontWeight: 800,
    fontSize: 13,
  },
  inviteActionRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  invitePrimaryButton: {
    padding: "12px 16px",
    borderRadius: 14,
    border: "1px solid rgba(24,210,255,0.24)",
    background: "rgba(24,210,255,0.18)",
    color: "#f3feff",
    cursor: "pointer",
    fontWeight: 800,
  },
  inviteActionText: {
    color: "rgba(236,243,255,0.66)",
    fontSize: 13,
    maxWidth: 780,
    lineHeight: 1.45,
  },
  stageSection: {
    marginBottom: 18,
  },
  stageSkinShell: {
    position: "relative",
    borderRadius: 28,
    padding: 18,
    border: "1px solid rgba(255,255,255,0.08)",
    background:
      "linear-gradient(180deg, rgba(80,30,16,0.18), rgba(255,255,255,0.03)), linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
    boxShadow: "0 14px 50px rgba(0,0,0,0.30)",
    overflow: "hidden",
  },
  stageSkinTopMarquee: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    marginBottom: 16,
  },
  stageSkinTopLine: {
    height: 1,
    flex: 1,
    background: "linear-gradient(90deg, transparent, rgba(228,196,108,0.75), transparent)",
  },
  stageSkinTitle: {
    fontWeight: 900,
    letterSpacing: 2,
    color: "#f3d98b",
    fontSize: 15,
  },
  stageCurtainLeft: {
    position: "absolute",
    left: -40,
    top: 40,
    width: 90,
    height: 220,
    borderRadius: 999,
    background: "linear-gradient(180deg, rgba(122,12,24,0.28), rgba(64,4,10,0.04))",
    filter: "blur(10px)",
    pointerEvents: "none",
  },
  stageCurtainRight: {
    position: "absolute",
    right: -40,
    top: 40,
    width: 90,
    height: 220,
    borderRadius: 999,
    background: "linear-gradient(180deg, rgba(122,12,24,0.28), rgba(64,4,10,0.04))",
    filter: "blur(10px)",
    pointerEvents: "none",
  },
  stageGoldSweepLeft: {
    position: "absolute",
    left: 0,
    bottom: 80,
    width: 180,
    height: 180,
    background: "radial-gradient(circle, rgba(228,196,108,0.10), transparent 70%)",
    pointerEvents: "none",
  },
  stageGoldSweepRight: {
    position: "absolute",
    right: 0,
    bottom: 80,
    width: 180,
    height: 180,
    background: "radial-gradient(circle, rgba(228,196,108,0.10), transparent 70%)",
    pointerEvents: "none",
  },
  stageCard: {
    position: "relative",
    zIndex: 1,
    borderRadius: 24,
    padding: 18,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(0,0,0,0.10))",
  },
  sessionBanner: {
    display: "flex",
    justifyContent: "space-between",
    gap: 14,
    flexWrap: "wrap",
    marginBottom: 14,
    padding: "14px 16px",
    borderRadius: 18,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.06)",
  },
  sessionBannerTitle: {
    fontWeight: 800,
    fontSize: 16,
    marginBottom: 4,
  },
  sessionBannerText: {
    color: "rgba(236,243,255,0.68)",
  },
  sessionBannerMeta: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    alignItems: "center",
  },
  sessionMetaChip: {
    padding: "9px 12px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
    fontSize: 12,
    fontWeight: 700,
  },
  stageHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
    marginBottom: 14,
    flexWrap: "wrap",
  },
  stageTitle: {
    fontSize: 24,
    fontWeight: 800,
    marginBottom: 5,
  },
  stageSubtitle: {
    color: "rgba(236,243,255,0.68)",
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
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "rgba(236,243,255,0.86)",
    fontSize: 12,
    fontWeight: 600,
  },
  stageModeButton: {
    padding: "9px 12px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "#ecf3ff",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  },
  stageModeButtonActive: {
    padding: "9px 12px",
    borderRadius: 999,
    background: "rgba(24,210,255,0.16)",
    border: "1px solid rgba(24,210,255,0.28)",
    color: "#f3feff",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
  },
  stageViewportOuter: {
    position: "relative",
  },
  stagePedestalGlow: {
    position: "absolute",
    left: "50%",
    transform: "translateX(-50%)",
    bottom: -10,
    width: "55%",
    height: 50,
    background: "radial-gradient(circle, rgba(228,196,108,0.20), transparent 70%)",
    filter: "blur(10px)",
    pointerEvents: "none",
    zIndex: 0,
  },
  stageViewport: {
    position: "relative",
    width: "100%",
    aspectRatio: "16 / 9",
    borderRadius: 24,
    overflow: "hidden",
    background: "linear-gradient(180deg, rgba(7,12,22,0.92), rgba(10,18,30,0.98))",
    border: "1px solid rgba(255,255,255,0.08)",
    zIndex: 1,
  },
  stageGlow: {
    position: "absolute",
    inset: 0,
    background: "radial-gradient(circle at center, rgba(255,255,255,0.06), transparent 60%)",
    pointerEvents: "none",
    zIndex: 1,
  },
  stageVideo: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
    background: "#02060c",
    position: "relative",
    zIndex: 0,
  },
  stagePlaceholder: {
    width: "100%",
    height: "100%",
    display: "grid",
    placeItems: "center",
    textAlign: "center",
    padding: 24,
    background: "radial-gradient(circle at center, rgba(228,196,108,0.10), transparent 32%)",
  },
  stagePlaceholderIcon: {
    fontSize: 44,
    marginBottom: 10,
  },
  stagePlaceholderTitle: {
    fontSize: 22,
    fontWeight: 800,
    marginBottom: 8,
  },
  stagePlaceholderText: {
    color: "rgba(236,243,255,0.68)",
    maxWidth: 480,
    lineHeight: 1.6,
  },
  stageDockCluster: {
    position: "absolute",
    right: 16,
    bottom: 16,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    alignItems: "flex-end",
    zIndex: 2,
  },
  dockCardButton: {
    width: 240,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(7, 14, 24, 0.88)",
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
    color: "rgba(236,243,255,0.80)",
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
    color: "rgba(236,243,255,0.60)",
  },
  floatingCameraCard: {
    width: 180,
    borderRadius: 20,
    padding: 10,
    background: "rgba(7, 14, 24, 0.92)",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 18px 40px rgba(0,0,0,0.30)",
  },
  floatingCameraHeader: {
    fontSize: 12,
    fontWeight: 700,
    color: "rgba(236,243,255,0.82)",
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
    borderRadius: 22,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
  },
  controlButton: {
    padding: "11px 16px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.05)",
    color: "#ecf3ff",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 13,
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
    border: "1px solid rgba(24,210,255,0.30)",
    background: "rgba(24,210,255,0.18)",
    color: "#ecfcff",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 13,
  },
  controlButtonAccent: {
    padding: "11px 16px",
    borderRadius: 14,
    border: "1px solid rgba(77,121,255,0.30)",
    background: "rgba(77,121,255,0.18)",
    color: "#ecf2ff",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 13,
  },
  controlButtonDisabled: {
    padding: "11px 16px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.06)",
    background: "rgba(255,255,255,0.03)",
    color: "rgba(236,243,255,0.42)",
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
    borderRadius: 24,
    padding: 18,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.04)",
    boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
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
    color: "rgba(236,243,255,0.66)",
    fontSize: 13,
    lineHeight: 1.45,
  },
  searchInput: {
    width: "100%",
    padding: "13px 14px",
    borderRadius: 14,
    outline: "none",
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(5,10,18,0.55)",
    color: "#ecf3ff",
    marginBottom: 14,
  },
  roomRail: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 12,
  },
  roomChip: {
    textAlign: "left",
    padding: "14px 14px",
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.04)",
    cursor: "pointer",
    color: "#ecf3ff",
  },
  roomChipActive: {
    textAlign: "left",
    padding: "14px 14px",
    borderRadius: 18,
    border: "1px solid rgba(77,121,255,0.30)",
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
    color: "rgba(236,243,255,0.66)",
    marginBottom: 6,
  },
  roomChipHost: {
    fontSize: 12,
    color: "#dce7ff",
  },
  tabsRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  tab: {
    padding: "11px 16px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.04)",
    color: "#ecf3ff",
    cursor: "pointer",
    fontWeight: 700,
  },
  tabActive: {
    padding: "11px 16px",
    borderRadius: 14,
    border: "1px solid rgba(24,210,255,0.26)",
    background: "rgba(24,210,255,0.14)",
    color: "#f3feff",
    cursor: "pointer",
    fontWeight: 800,
  },
  panelCard: {
    borderRadius: 24,
    padding: 18,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.04)",
    boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
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
    background: "rgba(5,10,18,0.45)",
  },
  messageMeta: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 6,
    fontSize: 12,
    color: "rgba(236,243,255,0.62)",
  },
  messageSender: {
    fontWeight: 800,
    color: "#ecf3ff",
  },
  messageTime: {
    color: "rgba(236,243,255,0.54)",
  },
  messageText: {
    color: "#eff5ff",
    lineHeight: 1.5,
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
    background: "rgba(5,10,18,0.55)",
    color: "#ecf3ff",
  },
  primaryButton: {
    padding: "12px 16px",
    borderRadius: 14,
    border: "1px solid rgba(24,210,255,0.24)",
    background: "rgba(24,210,255,0.18)",
    color: "#f3feff",
    cursor: "pointer",
    fontWeight: 800,
  },
  secondaryButton: {
    padding: "12px 16px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.10)",
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
    border: "1px solid rgba(255,255,255,0.08)",
    color: "rgba(236,243,255,0.78)",
    fontSize: 13,
    fontWeight: 600,
  },
  marqueeShell: {
    overflow: "hidden",
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(5,10,18,0.55)",
    padding: "12px 0",
  },
  marqueeTrack: {
    display: "inline-flex",
    gap: 24,
    whiteSpace: "nowrap",
    minWidth: "max-content",
    paddingLeft: 18,
    paddingRight: 18,
    animationName: "stroBulletinScroll",
    animationTimingFunction: "linear",
    animationIterationCount: "infinite",
  },
  marqueeItem: {
    fontWeight: 700,
    color: "#ecf6ff",
    paddingRight: 18,
    borderRight: "1px solid rgba(255,255,255,0.10)",
  },
  readerShell: {
    borderRadius: 20,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(5,10,18,0.55)",
    padding: 16,
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
    color: "rgba(236,243,255,0.72)",
  },
  readerViewport: {
    minHeight: 220,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.06)",
    background: "rgba(255,255,255,0.03)",
    padding: 16,
    display: "grid",
    gridTemplateRows: "1fr 1.3fr 1fr 1fr",
    gap: 10,
    marginBottom: 14,
  },
  readerLineMuted: {
    color: "rgba(236,243,255,0.45)",
    fontSize: 15,
    lineHeight: 1.5,
  },
  readerLineActive: {
    color: "#ffffff",
    fontSize: 18,
    lineHeight: 1.6,
    fontWeight: 800,
    padding: "10px 12px",
    borderRadius: 14,
    background: "rgba(24,210,255,0.10)",
    border: "1px solid rgba(24,210,255,0.18)",
  },
  readerLineNext: {
    color: "rgba(236,243,255,0.78)",
    fontSize: 16,
    lineHeight: 1.5,
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
    background: "rgba(5,10,18,0.45)",
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
    color: "rgba(236,243,255,0.62)",
  },
  controlGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 14,
  },
  controlBox: {
    borderRadius: 20,
    padding: 14,
    border: "1px solid rgba(255,255,255,0.06)",
    background: "rgba(5,10,18,0.45)",
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
  inlineColumn: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
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
    background: "rgba(5,10,18,0.55)",
    color: "#ecf3ff",
    marginBottom: 12,
    fontFamily: "inherit",
  },
  moderatorList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  moderatorRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
  },
  moderatorPill: {
    padding: "10px 12px",
    borderRadius: 999,
    background: "rgba(77,121,255,0.16)",
    border: "1px solid rgba(77,121,255,0.28)",
    fontSize: 13,
    fontWeight: 700,
  },
  removeModeratorButton: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,100,100,0.22)",
    background: "rgba(255,100,100,0.14)",
    color: "#ffecec",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 12,
  },
  helperText: {
    marginTop: 10,
    color: "rgba(236,243,255,0.62)",
    fontSize: 13,
    lineHeight: 1.45,
  },
  emptyState: {
    padding: "18px 16px",
    borderRadius: 18,
    border: "1px dashed rgba(255,255,255,0.14)",
    color: "rgba(236,243,255,0.60)",
    background: "rgba(255,255,255,0.03)",
  },
  emptyStateSmall: {
    color: "rgba(236,243,255,0.60)",
    fontSize: 13,
  },
  userAdminList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  userAdminRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap",
    borderRadius: 14,
    padding: "12px 12px",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.06)",
  },
  userAdminName: {
    fontWeight: 800,
    marginBottom: 4,
  },
  userAdminMeta: {
    color: "rgba(236,243,255,0.62)",
    fontSize: 12,
  },
};

export default App;