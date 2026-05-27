import {
  Room,
  RoomEvent,
  createLocalAudioTrack,
  createLocalVideoTrack,
} from "livekit-client";

// PASS34B_CLEAN_LIVEKIT_BRIDGE_REBUILD
// CLIENT SECOND — clean bridge for PASS34A server lane.
// This file connects only to the configured AGV server token route.
// No old localhost, old ticket server, or separate token-server fallback is used.

const MAIN_API_BASE =
  import.meta.env.VITE_API_BASE_URL || "https://agv-server.onrender.com";

const TOKEN_URL =
  import.meta.env.VITE_AGV_LIVEKIT_TOKEN_URL ||
  `${MAIN_API_BASE}/api/livekit/token`;

function getOptionalAuthToken() {
  try {
    return (
      window.localStorage.getItem("stro_cheivery_auth_token") ||
      window.localStorage.getItem("agv_auth_token") ||
      window.localStorage.getItem("agv_server_token") ||
      window.localStorage.getItem("agvToken") ||
      window.localStorage.getItem("token") ||
      ""
    );
  } catch {
    return "";
  }
}

function cleanText(value, fallback = "") {
  return String(value ?? fallback).trim();
}

function makeSafeError(error, fallback = "LiveKit connection failed.") {
  if (!error) return fallback;
  if (typeof error?.message === "string" && error.message.trim()) {
    return error.message.trim();
  }
  return fallback;
}

async function requestAgvLiveKitToken({ roomName, identity, name, role }) {
  const authToken = getOptionalAuthToken();

  const headers = {
    "Content-Type": "application/json",
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      roomName,
      identity,
      name,
      role,
    }),
  });

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok || !data?.ok) {
    const serverMessage =
      data?.message ||
      data?.error ||
      `LiveKit token request failed with status ${response.status}`;

    throw new Error(serverMessage);
  }

  const serverUrl = data.server_url || data.url;
  const participantToken = data.participant_token || data.token;

  if (!serverUrl) {
    throw new Error("LiveKit token response did not include server_url.");
  }

  if (!participantToken) {
    throw new Error("LiveKit token response did not include participant_token.");
  }

  return {
    ...data,
    server_url: serverUrl,
    participant_token: participantToken,
  };
}

export async function createAgvLiveKitRoom({
  roomName = "main-hall",
  identity = `guest-${Date.now()}`,
  name = identity,
  role = "viewer",
  onConnected,
  onDisconnected,
  onTrackSubscribed,
  onTrackUnsubscribed,
  onParticipantConnected,
  onParticipantDisconnected,
  onError,
} = {}) {
  try {
    const tokenData = await requestAgvLiveKitToken({
      roomName: cleanText(roomName, "main-hall"),
      identity: cleanText(identity, `guest-${Date.now()}`),
      name: cleanText(name, identity),
      role: cleanText(role, "viewer"),
    });

    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      stopLocalTrackOnUnpublish: true,
    });

    room.on(RoomEvent.Connected, () => {
      if (onConnected) onConnected(room, tokenData);
    });

    room.on(RoomEvent.Disconnected, () => {
      if (onDisconnected) onDisconnected(room, tokenData);
    });

    room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      if (onTrackSubscribed) {
        onTrackSubscribed(track, publication, participant, room);
      }
    });

    room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
      if (onTrackUnsubscribed) {
        onTrackUnsubscribed(track, publication, participant, room);
      }
    });

    room.on(RoomEvent.ParticipantConnected, (participant) => {
      if (onParticipantConnected) onParticipantConnected(participant, room);
    });

    room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      if (onParticipantDisconnected) onParticipantDisconnected(participant, room);
    });

    await room.connect(tokenData.server_url, tokenData.participant_token, {
      autoSubscribe: true,
    });

    return {
      ok: true,
      room,
      tokenData,
    };
  } catch (error) {
    console.error("AGV LIVEKIT CONNECT ERROR:", error);

    if (onError) onError(error);

    return {
      ok: false,
      error: makeSafeError(error),
      room: null,
    };
  }
}

export async function publishAgvHostCamera(room) {
  if (!room) {
    throw new Error("No LiveKit room is connected.");
  }

  const videoTrack = await createLocalVideoTrack({
    resolution: {
      width: 960,
      height: 540,
      frameRate: 24,
    },
  });

  const audioTrack = await createLocalAudioTrack({
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  });

  await room.localParticipant.publishTrack(videoTrack, {
    name: "agv-host-camera",
  });

  await room.localParticipant.publishTrack(audioTrack, {
    name: "agv-host-audio",
  });

  return {
    videoTrack,
    audioTrack,
  };
}

export async function publishAgvScreenShare(room) {
  if (!room) {
    throw new Error("No LiveKit room is connected.");
  }

  if (!navigator?.mediaDevices?.getDisplayMedia) {
    throw new Error("Screen sharing is not supported in this browser.");
  }

  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: true,
  });

  const videoTrack = stream.getVideoTracks()[0] || null;
  const audioTrack = stream.getAudioTracks()[0] || null;

  if (!videoTrack) {
    throw new Error("No screen video track was selected.");
  }

  await room.localParticipant.publishTrack(videoTrack, {
    name: "agv-screen-share-video",
  });

  if (audioTrack) {
    await room.localParticipant.publishTrack(audioTrack, {
      name: "agv-screen-share-audio",
    });
  }

  return {
    stream,
    videoTrack,
    audioTrack,
  };
}

export async function stopAgvScreenShare(room) {
  if (!room) {
    throw new Error("No LiveKit room is connected.");
  }

  const publications = Array.from(
    room.localParticipant?.trackPublications?.values?.() || []
  );

  for (const publication of publications) {
    const track = publication?.track;
    const name = publication?.trackName || track?.name || "";

    if (
      name.includes("agv-screen-share") ||
      track?.mediaStreamTrack?.label?.toLowerCase?.().includes("screen")
    ) {
      try {
        await room.localParticipant.unpublishTrack(track);
      } catch {}
      try {
        track?.stop?.();
      } catch {}
      try {
        track?.mediaStreamTrack?.stop?.();
      } catch {}
    }
  }

  return {
    ok: true,
  };
}

export function disconnectAgvLiveKitRoom(room) {
  if (!room) return;

  try {
    const publications = Array.from(
      room.localParticipant?.trackPublications?.values?.() || []
    );

    for (const publication of publications) {
      const track = publication?.track;
      try {
        room.localParticipant.unpublishTrack(track);
      } catch {}
      try {
        track?.stop?.();
      } catch {}
      try {
        track?.mediaStreamTrack?.stop?.();
      } catch {}
    }
  } catch {}

  try {
    room.disconnect();
  } catch {}
}
