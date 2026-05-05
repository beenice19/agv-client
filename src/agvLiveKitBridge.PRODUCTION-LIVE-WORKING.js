import {
  Room,
  RoomEvent,
  createLocalAudioTrack,
  createLocalVideoTrack,
} from "livekit-client";

const TOKEN_KEY = "stro_cheivery_auth_token";

const MAIN_API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8787";

const TOKEN_URL =
  import.meta.env.VITE_AGV_LIVEKIT_TOKEN_URL ||
  `${MAIN_API_BASE}/api/livekit/token`;

function getAuthToken() {
  return window.localStorage.getItem(TOKEN_KEY) || "";
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
    const authToken = getAuthToken();

    const tokenResponse = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({
        roomName,
        identity,
        name,
        role,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.ok) {
      throw new Error(tokenData.error || "Failed to get LiveKit token.");
    }

    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      stopLocalTrackOnUnpublish: true,
    });

    room.on(RoomEvent.Connected, () => {
      if (onConnected) onConnected(room);
    });

    room.on(RoomEvent.Disconnected, () => {
      if (onDisconnected) onDisconnected(room);
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
      error: error.message || "LiveKit connection failed.",
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
    source: "camera",
    simulcast: true,
    videoEncoding: {
      maxBitrate: 900_000,
      maxFramerate: 24,
    },
  });

  await room.localParticipant.publishTrack(audioTrack, {
    name: "agv-host-audio",
    source: "microphone",
    audioEncoding: {
      maxBitrate: 64_000,
    },
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

  await room.localParticipant.setScreenShareEnabled(true);

  return {
    ok: true,
  };
}

export async function stopAgvScreenShare(room) {
  if (!room) {
    throw new Error("No LiveKit room is connected.");
  }

  await room.localParticipant.setScreenShareEnabled(false);

  return {
    ok: true,
  };
}

export function disconnectAgvLiveKitRoom(room) {
  if (room) {
    room.disconnect();
  }
}