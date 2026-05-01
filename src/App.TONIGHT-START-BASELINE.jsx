import { useEffect, useRef, useState } from "react";

export default function App() {
  const cameraStageVideoRef = useRef(null);
  const cameraFloatVideoRef = useRef(null);
  const shareMainVideoRef = useRef(null);
  const shareDockVideoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const shareStreamRef = useRef(null);
  const bulletinInputRef = useRef(null);

  const [selectedRoom, setSelectedRoom] = useState("Main Convention Hall");
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
  const [miniHubTab, setMiniHubTab] = useState("host");

  const rooms = [
    { id: 1, name: "Main Convention Hall", meta: "245 watching • Host ready • Main stage" },
    { id: 2, name: "Leadership Forum", meta: "82 watching • Panel session • Waiting room open" },
    { id: 3, name: "Youth Experience", meta: "128 watching • Interactive session • Music cue loaded" },
    { id: 4, name: "Prayer Chapel", meta: "34 watching • Quiet room • Reflection mode" },
    { id: 5, name: "Study Hall", meta: "56 watching • Notes available • Breakout learning" },
    { id: 6, name: "Speaker Green Room", meta: "12 watching • Private prep • Speakers waiting" },
    { id: 7, name: "Admin Operations", meta: "9 watching • Moderator desk • Control center" },
    { id: 8, name: "Auxiliary Room A", meta: "23 watching • Overflow feed • Support session" },
  ];

  const participants = [
    { id: 1, name: "Host Camera", role: "Primary Feed", status: "Online" },
    { id: 2, name: "Convention Desk", role: "Moderator", status: "Online" },
    { id: 3, name: "Program Director", role: "Speaker", status: "Online" },
    { id: 4, name: "Music Cue", role: "Support", status: "Standby" },
  ];

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

  function handleSelectRoom(roomName) {
    setSelectedRoom(roomName);
    setStatusText(`Selected room: ${roomName}`);
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
      author: "You",
      role: "Host",
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
      } catch {
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

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #0b1020 0%, #12192f 45%, #1a223d 100%)",
        color: "#ffffff",
        fontFamily: 'Inter, "Segoe UI", Arial, sans-serif',
        padding: "24px",
      }}
    >
      <div
        style={{
          maxWidth: "1500px",
          margin: "0 auto",
          display: "grid",
          gap: "16px",
        }}
      >
        <header
          style={{
            background: "rgba(17, 24, 43, 0.92)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "24px",
            boxShadow: "0 26px 70px rgba(0,0,0,0.28)",
            padding: "24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "12px",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.4px",
                color: "#7dd3fc",
                marginBottom: "8px",
              }}
            >
              Stro Chievery
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: "32px",
                fontWeight: 900,
                letterSpacing: "-0.8px",
              }}
            >
              Convention Broadcast Platform
            </h1>

            <p
              style={{
                marginTop: "12px",
                marginBottom: 0,
                fontSize: "16px",
                lineHeight: 1.7,
                color: "#cad5ef",
                maxWidth: "860px",
              }}
            >
              Premium stage shell with rooms, webcam, docked screen share, floating host camera, bulletin board, chat, and participants.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
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
        </header>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "280px minmax(0, 1fr) 340px",
            gap: "16px",
            alignItems: "start",
          }}
        >
          <aside style={panelStyle}>
            <div style={sectionLabel}>Rooms</div>

            <p style={helperText}>
              Click a room to change the selected stage target.
            </p>

            <div
              style={{
                display: "grid",
                gap: "10px",
                marginTop: "14px",
                maxHeight: "720px",
                overflowY: "auto",
                paddingRight: "4px",
              }}
            >
              {rooms.map((room) => {
                const active = selectedRoom === room.name;

                return (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => handleSelectRoom(room.name)}
                    style={{
                      textAlign: "left",
                      padding: "14px",
                      borderRadius: "18px",
                      border: active
                        ? "1px solid rgba(96, 165, 250, 0.45)"
                        : "1px solid rgba(255,255,255,0.08)",
                      background: active
                        ? "linear-gradient(180deg, rgba(30,64,175,0.28), rgba(30,41,59,0.20))"
                        : "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.04))",
                      color: "#eff6ff",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "15px",
                        fontWeight: 900,
                        marginBottom: "6px",
                      }}
                    >
                      {room.name}
                    </div>

                    <div
                      style={{
                        fontSize: "13px",
                        color: "#cad5ef",
                        lineHeight: 1.6,
                      }}
                    >
                      {room.meta}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <div
            style={{
              display: "grid",
              gap: "16px",
            }}
          >
            <section style={panelStyle}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "16px",
                  flexWrap: "wrap",
                  marginBottom: "14px",
                }}
              >
                <div>
                  <div style={sectionLabel}>Main Stage</div>

                  <h2
                    style={{
                      marginTop: 0,
                      marginBottom: "8px",
                      fontSize: "24px",
                      fontWeight: 900,
                    }}
                  >
                    {selectedRoom}
                  </h2>

                  <div style={helperText}>Status: {statusText}</div>
                </div>

                <button onClick={handleBulletinOpen} style={buttonSecondary}>
                  Open Bulletin
                </button>
              </div>

              <div
                style={{
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
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "radial-gradient(circle at top center, rgba(125,211,252,0.08), transparent 24%), radial-gradient(circle at bottom right, rgba(59,130,246,0.10), transparent 22%)",
                    pointerEvents: "none",
                  }}
                />

                <div
                  style={{
                    position: "absolute",
                    top: "14px",
                    left: "14px",
                    display: "flex",
                    gap: "8px",
                    flexWrap: "wrap",
                    zIndex: 3,
                  }}
                >
                  <div
                    style={{
                      padding: "8px 12px",
                      borderRadius: "999px",
                      background: "rgba(255,255,255,0.08)",
                      color: "#e5e7eb",
                      fontSize: "12px",
                      fontWeight: 800,
                      backdropFilter: "blur(8px)",
                    }}
                  >
                    {selectedRoom}
                  </div>

                  <div
                    style={{
                      padding: "8px 12px",
                      borderRadius: "999px",
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
                      fontSize: "12px",
                      fontWeight: 800,
                      backdropFilter: "blur(8px)",
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
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      borderRadius: "20px",
                      background: "#000",
                      position: "relative",
                      zIndex: 1,
                    }}
                  />
                ) : shareOn ? (
                  <div
                    style={{
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
                    }}
                  >
                    <div style={{ maxWidth: "700px", padding: "24px" }}>
                      <div
                        style={{
                          fontSize: "28px",
                          fontWeight: 900,
                          marginBottom: "10px",
                        }}
                      >
                        Screen share is docked
                      </div>

                      <div
                        style={{
                          fontSize: "15px",
                          lineHeight: 1.7,
                          color: "#cad5ef",
                        }}
                      >
                        The shared screen is parked in the TV dock box. Click the dock to bring it to the main stage.
                        {cameraOn
                          ? " The host camera has moved into the floating box."
                          : " Start the camera to show the host in the floating box."}
                      </div>
                    </div>
                  </div>
                ) : cameraOn ? (
                  <video
                    ref={cameraStageVideoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      borderRadius: "20px",
                      background: "#000",
                      position: "relative",
                      zIndex: 1,
                    }}
                  />
                ) : (
                  <div style={{ position: "relative", zIndex: 1 }}>
                    <div
                      style={{
                        fontSize: "30px",
                        fontWeight: 900,
                        marginBottom: "10px",
                      }}
                    >
                      Stage camera area
                    </div>

                    <div
                      style={{
                        fontSize: "15px",
                        lineHeight: 1.7,
                        color: "#cad5ef",
                        maxWidth: "700px",
                      }}
                    >
                      Click <strong>Start Camera</strong> for webcam preview or <strong>Start Share</strong> to place your screen into the dock box.
                    </div>

                    {cameraError ? (
                      <div
                        style={{
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
                        }}
                      >
                        Camera error: {cameraError}
                      </div>
                    ) : null}

                    {shareError ? (
                      <div
                        style={{
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
                        }}
                      >
                        Share error: {shareError}
                      </div>
                    ) : null}
                  </div>
                )}

                {showFloatingCamera ? (
                  <div
                    style={{
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
                    }}
                  >
                    <video
                      ref={cameraFloatVideoRef}
                      autoPlay
                      playsInline
                      muted
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        background: "#000",
                      }}
                    />

                    <div
                      style={{
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
                      }}
                    >
                      Host Camera
                    </div>
                  </div>
                ) : null}

                {showDockShare ? (
                  <button
                    type="button"
                    onClick={toggleShareView}
                    title="Click to expand share to main stage"
                    style={{
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
                    }}
                  >
                    <video
                      ref={shareDockVideoRef}
                      autoPlay
                      playsInline
                      muted
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        background: "#000",
                      }}
                    />
                    <div
                      style={{
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
                      }}
                    >
                      Share Dock — Click
                    </div>
                  </button>
                ) : null}

                {showExpandedShare ? (
                  <button
                    type="button"
                    onClick={toggleShareView}
                    style={{
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
                    }}
                  >
                    Return Share to Dock
                  </button>
                ) : null}

                <div
                  style={{
                    position: "absolute",
                    top: "14px",
                    right: "14px",
                    padding: "8px 12px",
                    borderRadius: "999px",
                    background: shareOn
                      ? "rgba(14, 165, 233, 0.18)"
                      : cameraOn
                      ? "rgba(22, 163, 74, 0.18)"
                      : "rgba(255,255,255,0.08)",
                    color: shareOn ? "#bae6fd" : cameraOn ? "#a7f3d0" : "#e5e7eb",
                    fontSize: "12px",
                    fontWeight: 800,
                    backdropFilter: "blur(8px)",
                    zIndex: 5,
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

            <section
              style={{
                display: "grid",
                gridTemplateColumns: "1.25fr 0.75fr",
                gap: "16px",
              }}
            >
              <div style={panelStyle}>
                <div style={sectionLabel}>Live Chat</div>

                <p style={helperText}>
                  Send live room messages while keeping the stage visible above.
                </p>

                <div
                  style={{
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
                  }}
                >
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      style={{
                        padding: "12px",
                        borderRadius: "16px",
                        border: "1px solid rgba(255,255,255,0.08)",
                        background: "rgba(17, 24, 43, 0.78)",
                        display: "grid",
                        gap: "6px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: "10px",
                          flexWrap: "wrap",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "14px",
                            fontWeight: 900,
                            color: "#ffffff",
                          }}
                        >
                          {message.author}
                        </div>

                        <div
                          style={{
                            fontSize: "12px",
                            color: "#98a8ca",
                          }}
                        >
                          {message.time}
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize: "12px",
                          color: "#7dd3fc",
                          fontWeight: 800,
                          textTransform: "uppercase",
                          letterSpacing: "0.3px",
                        }}
                      >
                        {message.role}
                      </div>

                      <div
                        style={{
                          fontSize: "14px",
                          color: "#eef4ff",
                          lineHeight: 1.7,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {message.text}
                      </div>
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: "10px",
                    alignItems: "stretch",
                    marginTop: "14px",
                  }}
                >
                  <textarea
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                    onKeyDown={handleChatKeyDown}
                    placeholder="Type a live chat message..."
                    rows={3}
                    style={{
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
                    }}
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

                <div
                  style={{
                    display: "grid",
                    gap: "10px",
                    maxHeight: "425px",
                    overflowY: "auto",
                    marginTop: "14px",
                  }}
                >
                  {participants.map((participant) => {
                    const online = participant.status === "Online";

                    return (
                      <div
                        key={participant.id}
                        style={{
                          padding: "12px",
                          borderRadius: "16px",
                          border: "1px solid rgba(255,255,255,0.08)",
                          background:
                            "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.04))",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "12px",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: "14px",
                              fontWeight: 900,
                              color: "#ffffff",
                              marginBottom: "4px",
                            }}
                          >
                            {participant.name}
                          </div>

                          <div
                            style={{
                              fontSize: "13px",
                              color: "#cad5ef",
                            }}
                          >
                            {participant.role}
                          </div>
                        </div>

                        <div
                          style={{
                            padding: "6px 10px",
                            borderRadius: "999px",
                            background: online
                              ? "rgba(22, 163, 74, 0.18)"
                              : "rgba(255,255,255,0.08)",
                            color: online ? "#a7f3d0" : "#e5e7eb",
                            fontSize: "12px",
                            fontWeight: 800,
                            whiteSpace: "nowrap",
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

            <div
              style={{
                padding: "12px",
                borderRadius: "14px",
                background: "rgba(245, 158, 11, 0.18)",
                border: "1px solid rgba(251, 191, 36, 0.22)",
                color: "#fde68a",
                fontSize: "13px",
                lineHeight: 1.6,
                marginTop: "14px",
              }}
            >
              {bulletinStatus}
            </div>

            <div
              style={{
                padding: "12px",
                borderRadius: "14px",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#dbeafe",
                fontSize: "13px",
                lineHeight: 1.6,
                marginTop: "14px",
              }}
            >
              File: <strong>{bulletinFileName || "None loaded"}</strong>
            </div>

            <div
              style={{
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
              }}
            >
              {bulletinText}
            </div>
          </aside>
        </section>

        <div
          style={{
            position: "fixed",
            right: "22px",
            bottom: "22px",
            zIndex: 50,
            display: "grid",
            gap: "10px",
            alignItems: "end",
            justifyItems: "end",
          }}
        >
          {miniHubOpen ? (
            <div
              style={{
                width: "300px",
                borderRadius: "20px",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(8, 14, 28, 0.95)",
                boxShadow: "0 22px 50px rgba(0,0,0,0.35)",
                overflow: "hidden",
                backdropFilter: "blur(12px)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 14px",
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 800, color: "#7dd3fc", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                    Mini Control Hub
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: 900, color: "#ffffff", marginTop: "4px" }}>
                    Quick admin shell
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setMiniHubOpen(false)}
                  style={iconButtonGhost}
                >
                  ✕
                </button>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  padding: "12px 12px 0 12px",
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  onClick={() => setMiniHubTab("host")}
                  style={miniTabButton(miniHubTab === "host")}
                >
                  👑 Host
                </button>
                <button
                  type="button"
                  onClick={() => setMiniHubTab("auth")}
                  style={miniTabButton(miniHubTab === "auth")}
                >
                  🛡 Auth
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

              <div style={{ padding: "14px" }}>
                {miniHubTab === "host" ? (
                  <div style={hubBodyStyle}>
                    <div style={hubTitleStyle}>Host controls</div>
                    <div style={hubTextStyle}>Current room: <strong>{selectedRoom}</strong></div>
                    <div style={hubTextStyle}>Host tools will live here in the compact version.</div>
                    <div style={hubNoteStyle}>Next pass can wire assign-host without touching the stage layout.</div>
                  </div>
                ) : null}

                {miniHubTab === "auth" ? (
                  <div style={hubBodyStyle}>
                    <div style={hubTitleStyle}>Authorization</div>
                    <div style={hubTextStyle}>Authorization status can be shown here as a small compact panel.</div>
                    <div style={hubTextStyle}>This keeps host/auth visible without bringing back a giant admin column.</div>
                    <div style={hubNoteStyle}>UI shell only in this pass. No logic changes yet.</div>
                  </div>
                ) : null}

                {miniHubTab === "room" ? (
                  <div style={hubBodyStyle}>
                    <div style={hubTitleStyle}>Room tools</div>
                    <div style={hubTextStyle}>Add room / edit room / manage page can be rebuilt here as compact actions.</div>
                    <div style={hubTextStyle}>That keeps the left rail and stage clean.</div>
                    <div style={hubNoteStyle}>This is the safe shell before we wire logic back in.</div>
                  </div>
                ) : null}

                {miniHubTab === "mods" ? (
                  <div style={hubBodyStyle}>
                    <div style={hubTitleStyle}>Moderators</div>
                    <div style={hubTextStyle}>Moderator tools can be rebuilt here as a compact list and quick action set.</div>
                    <div style={hubTextStyle}>No interference with camera, share, dock, or bulletin.</div>
                    <div style={hubNoteStyle}>Layout-only shell in this pass.</div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          <div
            style={{
              display: "flex",
              gap: "8px",
              padding: "10px",
              borderRadius: "18px",
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(8, 14, 28, 0.92)",
              boxShadow: "0 18px 40px rgba(0,0,0,0.30)",
              backdropFilter: "blur(10px)",
            }}
          >
            <button
              type="button"
              onClick={() => {
                setMiniHubOpen(true);
                setMiniHubTab("host");
              }}
              style={iconButton}
              title="Host"
            >
              👑
            </button>
            <button
              type="button"
              onClick={() => {
                setMiniHubOpen(true);
                setMiniHubTab("auth");
              }}
              style={iconButton}
              title="Authorization"
            >
              🛡
            </button>
            <button
              type="button"
              onClick={() => {
                setMiniHubOpen(true);
                setMiniHubTab("room");
              }}
              style={iconButton}
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
              style={iconButton}
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
    border: active ? "1px solid rgba(96, 165, 250, 0.32)" : "1px solid rgba(255,255,255,0.08)",
    background: active
      ? "linear-gradient(180deg, rgba(30,64,175,0.28), rgba(30,41,59,0.20))"
      : "rgba(255,255,255,0.06)",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
    fontSize: "12px",
  };
}

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

const hubNoteStyle = {
  fontSize: "12px",
  color: "#93c5fd",
  lineHeight: 1.6,
};

const iconButton = {
  width: "42px",
  height: "42px",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.06)",
  color: "#fff",
  fontSize: "18px",
  cursor: "pointer",
};

const iconButtonGhost = {
  width: "34px",
  height: "34px",
  borderRadius: "10px",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.06)",
  color: "#fff",
  fontSize: "14px",
  cursor: "pointer",
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
    
