// PASS_CLIENT_STRIPE_BROADCAST_SUCCESS_HANDLER_1A
// CLIENT ONLY — Handles Stripe Broadcast Pack return URLs.
// This confirms payment with SERVER 8794 before any Broadcast Credits can be added.

const AGV_USAGE_API_BASE =
  import.meta.env.VITE_AGV_FREE_TOKEN_API_URL ||
  import.meta.env.VITE_AGV_USAGE_WALLET_API_URL ||
  "http://127.0.0.1:8794";

function agvShowBroadcastPackBanner(type, title, message) {
  try {
    const old = document.getElementById("agv-broadcast-pack-return-banner");
    if (old) old.remove();

    const banner = document.createElement("div");
    banner.id = "agv-broadcast-pack-return-banner";

    const bg =
      type === "success"
        ? "linear-gradient(135deg, rgba(16,185,129,.96), rgba(5,150,105,.96))"
        : type === "warning"
        ? "linear-gradient(135deg, rgba(245,158,11,.97), rgba(217,119,6,.97))"
        : "linear-gradient(135deg, rgba(220,38,38,.97), rgba(153,27,27,.97))";

    banner.style.cssText = [
      "position:fixed",
      "top:18px",
      "left:50%",
      "transform:translateX(-50%)",
      "z-index:999999",
      "max-width:720px",
      "width:calc(100% - 32px)",
      "padding:16px 18px",
      "border-radius:18px",
      "box-shadow:0 20px 70px rgba(0,0,0,.35)",
      "color:white",
      "font-family:system-ui,-apple-system,Segoe UI,sans-serif",
      "border:1px solid rgba(255,255,255,.25)",
      "background:" + bg,
    ].join(";");

    banner.innerHTML =
      '<div style="font-weight:900;font-size:16px;letter-spacing:.02em;margin-bottom:4px;">' +
      title +
      '</div>' +
      '<div style="font-size:14px;line-height:1.35;opacity:.96;">' +
      message +
      '</div>' +
      '<button type="button" style="margin-top:10px;border:1px solid rgba(255,255,255,.4);background:rgba(0,0,0,.18);color:white;border-radius:999px;padding:6px 12px;font-weight:800;cursor:pointer;">Close</button>';

    banner.querySelector("button").onclick = () => banner.remove();
    document.body.appendChild(banner);

    setTimeout(() => {
      if (document.getElementById("agv-broadcast-pack-return-banner")) {
        banner.remove();
      }
    }, 15000);
  } catch {}
}

function agvCleanBroadcastPackUrl() {
  try {
    const url = new URL(window.location.href);

    url.searchParams.delete("agvBroadcastPack");
    url.searchParams.delete("checkoutId");
    url.searchParams.delete("session_id");
    url.searchParams.delete("stripeSessionId");
    url.searchParams.delete("packId");

    const clean =
      url.pathname +
      (url.searchParams.toString() ? "?" + url.searchParams.toString() : "") +
      url.hash;

    window.history.replaceState({}, document.title, clean);
  } catch {}
}

async function agvHandleBroadcastPackStripeReturn() {
  if (typeof window === "undefined") return;

  const params = new URLSearchParams(window.location.search);
  const result = params.get("agvBroadcastPack");
  const checkoutId = params.get("checkoutId") || "";
  const stripeSessionId = params.get("session_id") || params.get("stripeSessionId") || "";
  const packId = params.get("packId") || "";

  if (!result) return;

  if (result === "cancel") {
    agvShowBroadcastPackBanner(
      "warning",
      "Broadcast Pack Checkout Cancelled",
      "No Broadcast Credits were added. You can return to the Event Estimate Gate and try again."
    );

    localStorage.setItem(
      "agvBroadcastPackLastResult",
      JSON.stringify({
        ok: false,
        cancelled: true,
        packId,
        checkoutId,
        stripeSessionId,
        at: new Date().toISOString(),
      })
    );

    agvCleanBroadcastPackUrl();
    return;
  }

  if (result !== "success") return;

  if (!checkoutId && !stripeSessionId) {
    agvShowBroadcastPackBanner(
      "error",
      "Broadcast Pack Return Missing Checkout ID",
      "Stripe returned to AGV, but no checkout ID was found. No Broadcast Credits were added."
    );
    agvCleanBroadcastPackUrl();
    return;
  }

  const confirmKey = "agv-broadcast-pack-confirm:" + (checkoutId || stripeSessionId);

  if (sessionStorage.getItem(confirmKey) === "done") {
    agvCleanBroadcastPackUrl();
    return;
  }

  sessionStorage.setItem(confirmKey, "running");

  try {
    const response = await fetch(
      AGV_USAGE_API_BASE + "/api/usage/confirm-broadcast-pack-checkout",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkoutId,
          stripeSessionId,
        }),
      }
    );

    const data = await response.json().catch(() => ({
      ok: false,
      error: "SERVER 8794 returned a non-JSON response.",
    }));

    localStorage.setItem(
      "agvBroadcastPackLastResult",
      JSON.stringify({
        ...data,
        checkoutId,
        stripeSessionId,
        packId,
        at: new Date().toISOString(),
      })
    );

    window.dispatchEvent(
      new CustomEvent("agv:broadcast-pack-checkout-confirmed", {
        detail: data,
      })
    );

    if (data.ok && (data.paid || data.credited || data.alreadyCredited)) {
      agvShowBroadcastPackBanner(
        "success",
        "Broadcast Pack Added",
        "Stripe confirmed payment. AGV Broadcast Credits are now available for this account."
      );
      sessionStorage.setItem(confirmKey, "done");
    } else if (data.reason === "STRIPE_PAYMENT_NOT_CONFIRMED") {
      agvShowBroadcastPackBanner(
        "warning",
        "Payment Not Confirmed Yet",
        "Stripe has not confirmed payment. Broadcast Credits were not added."
      );
      sessionStorage.setItem(confirmKey, "done");
    } else {
      agvShowBroadcastPackBanner(
        "error",
        "Broadcast Pack Confirmation Failed",
        data.error || "AGV could not confirm the Broadcast Pack checkout."
      );
      sessionStorage.removeItem(confirmKey);
    }

    agvCleanBroadcastPackUrl();
  } catch (err) {
    agvShowBroadcastPackBanner(
      "error",
      "SERVER 8794 Not Reachable",
      "AGV could not reach the Usage Wallet Server to confirm the Broadcast Pack checkout."
    );

    localStorage.setItem(
      "agvBroadcastPackLastResult",
      JSON.stringify({
        ok: false,
        error: err.message,
        checkoutId,
        stripeSessionId,
        packId,
        at: new Date().toISOString(),
      })
    );

    sessionStorage.removeItem(confirmKey);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", agvHandleBroadcastPackStripeReturn);
} else {
  agvHandleBroadcastPackStripeReturn();
}
