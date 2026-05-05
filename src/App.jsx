import React, { useEffect, useState } from "react";
import AppCore from "./AppCore.jsx";

/*
ENV SWITCH (LOCAL vs LIVE)
*/
const LOCAL_API = "http://127.0.0.1:8787";
const REMOTE_API = "https://agv-ticket-server-clean.onrender.com";

const API_BASE =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? LOCAL_API
    : REMOTE_API;

export default function App() {
  const [entered, setEntered] = useState(false);
  const [ticketApproved, setTicketApproved] = useState(false);
  const [showTicketAdmin, setShowTicketAdmin] = useState(false);
  const [autoRoom, setAutoRoom] = useState(null);

  /*
  AUTO JOIN FROM LINK
  */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("ticket");

    if (!code) return;

    autoJoin(code);
  }, []);

  async function autoJoin(code) {
    try {
      const res = await fetch(`${API_BASE}/api/tickets/${code}`);
      const data = await res.json();

      if (!data.ok) return;

      localStorage.setItem("agv_ticket_code", data.ticket.code);
      localStorage.setItem("agv_ticket_room", data.ticket.roomId);

      setAutoRoom(data.ticket.roomId);
      setEntered(true);
      setTicketApproved(true);
    } catch {
      console.log("Auto join failed");
    }
  }

  if (showTicketAdmin) {
    return <TicketAdminPanel onBack={() => setShowTicketAdmin(false)} />;
  }

  if (entered && !ticketApproved) {
    return (
      <TicketGate
        onApproved={(roomId) => {
          setAutoRoom(roomId);
          setTicketApproved(true);
        }}
      />
    );
  }

  if (entered && ticketApproved) {
    return <AppCore autoRoom={autoRoom} />;
  }

  return (
    <AgvLandingPage
      onEnter={() => setEntered(true)}
      onAdmin={() => setShowTicketAdmin(true)}
    />
  );
}

/*
TICKET GATE
*/
function TicketGate({ onApproved }) {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");

  async function verifyTicket() {
    try {
      const res = await fetch(`${API_BASE}/api/tickets/${code}`);
      const data = await res.json();

      if (!data.ok) {
        setMessage("Invalid ticket");
        return;
      }

      localStorage.setItem("agv_ticket_code", data.ticket.code);
      localStorage.setItem("agv_ticket_room", data.ticket.roomId);

      onApproved(data.ticket.roomId);
    } catch {
      setMessage("Server error");
    }
  }

  return (
    <div style={{ textAlign: "center", marginTop: 100 }}>
      <h1>Enter Ticket Code</h1>

      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="AGV-XXXXX"
      />

      <br /><br />

      <button onClick={verifyTicket}>Enter</button>

      {message && <p>{message}</p>}
    </div>
  );
}

/*
ADMIN PANEL (MINIMAL SAFE)
*/
function TicketAdminPanel({ onBack }) {
  return (
    <div style={{ textAlign: "center", marginTop: 100 }}>
      <h1>Admin Panel</h1>
      <button onClick={onBack}>Back</button>
    </div>
  );
}

/*
LANDING PAGE (MINIMAL SAFE)
*/
function AgvLandingPage({ onEnter, onAdmin }) {
  return (
    <div style={{ textAlign: "center", marginTop: 100 }}>
      <h1>Avant Global Vision</h1>

      <button onClick={onEnter}>Enter Platform</button>
      <br /><br />
      <button onClick={onAdmin}>Admin</button>
    </div>
  );
}