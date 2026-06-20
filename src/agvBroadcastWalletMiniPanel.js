// PASS_CLIENT_BROADCAST_WALLET_PANEL_1A
// CLIENT ONLY — Shows Broadcast Credit balance, purchased credits, last Stripe result, and refresh button.

const AGV_USAGE_API_BASE =
  import.meta.env.VITE_AGV_FREE_TOKEN_API_URL ||
  import.meta.env.VITE_AGV_USAGE_WALLET_API_URL ||
  "http://127.0.0.1:8794";

const PANEL_ID = "agv-broadcast-wallet-mini-panel";

function moneySafe(value) {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  return n.toLocaleString();
}

function getLastBroadcastPackResult() {
  try {
    const raw = localStorage.getItem("agvBroadcastPackLastResult");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getWalletIdentity(lastResult) {
  const checkout = lastResult?.checkout || {};
  const wallet = lastResult?.wallet || {};

  return {
    userId:
      wallet.userId ||
      checkout.userId ||
      localStorage.getItem("agvBroadcastWalletUserId") ||
      "creator-test-user",
    plan:
      wallet.plan ||
      checkout.plan ||
      localStorage.getItem("agvBroadcastWalletPlan") ||
      "CREATOR",
  };
}

function getLastStatusText(lastResult) {
  if (!lastResult) return "No recent Stripe Broadcast Pack activity";

  if (lastResult.ok && (lastResult.paid || lastResult.credited || lastResult.alreadyCredited)) {
    return lastResult.alreadyCredited ? "Already credited" : "Paid and credited";
  }

  if (lastResult.reason === "STRIPE_PAYMENT_NOT_CONFIRMED") {
    return "Payment not confirmed";
  }

  if (lastResult.cancelled) {
    return "Checkout cancelled";
  }

  if (lastResult.error) {
    return "Error: " + lastResult.error;
  }

  return "Status unknown";
}

function createPanelShell() {
  let panel = document.getElementById(PANEL_ID);
  if (panel) return panel;

  panel = document.createElement("aside");
  panel.id = PANEL_ID;

  panel.style.cssText = [
    "position:fixed",
    "right:18px",
    "bottom:18px",
    "z-index:999998",
    "width:330px",
    "max-width:calc(100vw - 32px)",
    "border-radius:20px",
    "overflow:hidden",
    "box-shadow:0 18px 55px rgba(0,0,0,.38)",
    "border:1px solid rgba(255,255,255,.18)",
    "background:linear-gradient(145deg, rgba(15,23,42,.96), rgba(30,41,59,.96))",
    "color:#fff",
    "font-family:system-ui,-apple-system,Segoe UI,sans-serif"
  ].join(";");

  document.body.appendChild(panel);
  return panel;
}

function renderPanel(state) {
  const panel = createPanelShell();

  const open = localStorage.getItem("agvBroadcastWalletPanelOpen") !== "closed";
  const wallet = state.wallet || {};
  const last = state.lastResult || null;

  const lastPack =
    last?.pack?.name ||
    last?.checkout?.packId ||
    last?.packId ||
    "—";

  const lastCheckoutStatus =
    last?.checkout?.status ||
    last?.stripePaymentStatus ||
    last?.reason ||
    "—";

  panel.innerHTML =
    '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:13px 14px;background:linear-gradient(90deg, rgba(245,158,11,.28), rgba(59,130,246,.18));border-bottom:1px solid rgba(255,255,255,.13);">' +
      '<div>' +
        '<div style="font-size:13px;font-weight:950;letter-spacing:.08em;text-transform:uppercase;color:#fbbf24;">AGV Broadcast Wallet</div>' +
        '<div style="font-size:12px;color:rgba(255,255,255,.72);margin-top:2px;">Client credit status</div>' +
      '</div>' +
      '<button id="agv-wallet-toggle" type="button" style="border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.10);color:#fff;border-radius:999px;padding:6px 10px;font-weight:900;cursor:pointer;">' +
        (open ? "Hide" : "Show") +
      '</button>' +
    '</div>' +
    (open
      ? '<div style="padding:14px;">' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">' +
            '<div style="border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:10px;background:rgba(255,255,255,.06);">' +
              '<div style="font-size:11px;color:rgba(255,255,255,.64);font-weight:800;text-transform:uppercase;">Current Balance</div>' +
              '<div style="font-size:22px;font-weight:950;margin-top:4px;">' + moneySafe(wallet.broadcastCreditsBalance) + '</div>' +
              '<div style="font-size:11px;color:rgba(255,255,255,.55);">Broadcast Credits</div>' +
            '</div>' +
            '<div style="border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:10px;background:rgba(255,255,255,.06);">' +
              '<div style="font-size:11px;color:rgba(255,255,255,.64);font-weight:800;text-transform:uppercase;">Purchased</div>' +
              '<div style="font-size:22px;font-weight:950;margin-top:4px;">' + moneySafe(wallet.purchasedBroadcastCredits) + '</div>' +
              '<div style="font-size:11px;color:rgba(255,255,255,.55);">Lifetime added</div>' +
            '</div>' +
          '</div>' +

          '<div style="border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:11px;background:rgba(0,0,0,.16);margin-bottom:10px;">' +
            '<div style="font-size:11px;color:rgba(255,255,255,.64);font-weight:800;text-transform:uppercase;">Last Stripe Broadcast Pack Result</div>' +
            '<div style="font-size:13px;font-weight:850;margin-top:5px;line-height:1.35;">' + getLastStatusText(last) + '</div>' +
            '<div style="font-size:12px;color:rgba(255,255,255,.60);margin-top:6px;">Pack: ' + String(lastPack) + '</div>' +
            '<div style="font-size:12px;color:rgba(255,255,255,.60);margin-top:3px;">Checkout status: ' + String(lastCheckoutStatus) + '</div>' +
          '</div>' +

          '<div style="display:flex;gap:8px;align-items:center;">' +
            '<button id="agv-wallet-refresh" type="button" style="flex:1;border:0;background:linear-gradient(135deg,#f59e0b,#d97706);color:#111827;border-radius:12px;padding:10px 12px;font-weight:950;cursor:pointer;">Refresh Wallet</button>' +
            '<button id="agv-wallet-clear-last" type="button" style="border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.08);color:#fff;border-radius:12px;padding:10px 12px;font-weight:850;cursor:pointer;">Clear</button>' +
          '</div>' +

          '<div id="agv-wallet-panel-message" style="font-size:12px;color:rgba(255,255,255,.62);margin-top:10px;line-height:1.3;">' +
            (state.message || "Wallet uses SERVER 8794 when available.") +
          '</div>' +
        '</div>'
      : "");

  const toggle = panel.querySelector("#agv-wallet-toggle");
  if (toggle) {
    toggle.onclick = () => {
      localStorage.setItem("agvBroadcastWalletPanelOpen", open ? "closed" : "open");
      agvRefreshBroadcastWalletPanel("Panel toggled.");
    };
  }

  const refresh = panel.querySelector("#agv-wallet-refresh");
  if (refresh) {
    refresh.onclick = () => agvRefreshBroadcastWalletPanel("Refreshing wallet...");
  }

  const clear = panel.querySelector("#agv-wallet-clear-last");
  if (clear) {
    clear.onclick = () => {
      localStorage.removeItem("agvBroadcastPackLastResult");
      agvRefreshBroadcastWalletPanel("Last Stripe result cleared.");
    };
  }
}

async function agvRefreshBroadcastWalletPanel(message) {
  const lastResult = getLastBroadcastPackResult();
  const identity = getWalletIdentity(lastResult);

  localStorage.setItem("agvBroadcastWalletUserId", identity.userId);
  localStorage.setItem("agvBroadcastWalletPlan", identity.plan);

  let wallet = lastResult?.wallet || null;
  let nextMessage = message || "";

  try {
    const url =
      AGV_USAGE_API_BASE +
      "/api/usage/wallet?userId=" +
      encodeURIComponent(identity.userId) +
      "&plan=" +
      encodeURIComponent(identity.plan);

    const response = await fetch(url);
    const data = await response.json();

    if (data && data.ok && data.wallet) {
      wallet = data.wallet;
      nextMessage = "Wallet refreshed from SERVER 8794.";
    } else {
      nextMessage = data?.error || "SERVER 8794 wallet refresh did not return a wallet.";
    }
  } catch (err) {
    nextMessage = "SERVER 8794 not reachable. Showing last known wallet if available.";
  }

  renderPanel({
    wallet,
    lastResult,
    message: nextMessage,
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => agvRefreshBroadcastWalletPanel("Wallet panel loaded."));
} else {
  agvRefreshBroadcastWalletPanel("Wallet panel loaded.");
}

window.addEventListener("agv:broadcast-pack-checkout-confirmed", () => {
  setTimeout(() => agvRefreshBroadcastWalletPanel("Stripe result received. Wallet refreshed."), 500);
});
