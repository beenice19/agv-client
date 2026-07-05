// AGV FREE PLAN LOCKDOWN
// Free users should only access Chat and Bulletin.
// This hides/disables paid host tools, vendor dock, ticket revenue, event creation, and room creation on Free Plan.
(function () {
  if (window.__AGV_FREE_PLAN_LOCKDOWN__) return;
  window.__AGV_FREE_PLAN_LOCKDOWN__ = true;
  function textOf(el) {
    return String((el && (el.innerText || el.textContent)) || "")
      .replace(/\s+/g, " ")
      .trim();
  }
  function lowerText(el) {
    return textOf(el).toLowerCase();
  }
  function pageText() {
    return lowerText(document.body);
  }
  function isFreePlan() {
    const text = pageText();
    return (
      /freeplan\s*active/i.test(text) ||
      /active\s*plan\s*:\s*free\b/i.test(text) ||
      /\bplan\s*:\s*free\b/i.test(text)
    );
  }
  function hide(el) {
    if (!el || el === document.body || el === document.documentElement) return;
    el.style.setProperty("display", "none", "important");
    el.style.setProperty("visibility", "hidden", "important");
    el.setAttribute("aria-hidden", "true");
    el.setAttribute("data-agv-free-plan-hidden", "true");
  }
  function disable(el) {
    if (!el) return;
    el.setAttribute("disabled", "disabled");
    el.setAttribute("aria-disabled", "true");
    el.style.setProperty("pointer-events", "none", "important");
    el.style.setProperty("opacity", "0.45", "important");
  }
  function closestCard(el) {
    if (!el) return null;
    let node = el;
    while (node && node !== document.body && node !== document.documentElement) {
      const tag = String(node.tagName || "").toLowerCase();
      const cls = String(node.className || "").toLowerCase();
      const id = String(node.id || "").toLowerCase();
      const txt = lowerText(node);
      const looksLikePanel =
        tag === "section" ||
        tag === "article" ||
        tag === "aside" ||
        cls.includes("card") ||
        cls.includes("panel") ||
        cls.includes("dock") ||
        cls.includes("tool") ||
        cls.includes("control") ||
        cls.includes("room") ||
        cls.includes("event") ||
        cls.includes("revenue") ||
        id.includes("control") ||
        id.includes("event") ||
        id.includes("revenue") ||
        id.includes("room");
      if (looksLikePanel && txt.length < 2500) {
        return node;
      }
      node = node.parentElement;
    }
    return el;
  }
  function hideByPhrase(phrases) {
    const nodes = Array.from(document.querySelectorAll("div, section, article, aside, form, button, a, h1, h2, h3, h4, p, span"));
    phrases.forEach(function (phrase) {
      const wanted = phrase.toLowerCase();
      nodes.forEach(function (el) {
        const txt = lowerText(el);
        if (!txt || !txt.includes(wanted)) return;
        const card = closestCard(el);
        hide(card || el);
      });
    });
  }
  function hideExactButtons(labels) {
    const buttons = Array.from(document.querySelectorAll("button, [role='button'], a"));
    buttons.forEach(function (btn) {
      const label = lowerText(btn);
      labels.forEach(function (wanted) {
        if (label === wanted.toLowerCase()) {
          hide(btn);
        }
      });
    });
  }
  function disableDangerousControls() {
    const dangerousWords = [
      "vendor",
      "financial",
      "revenue",
      "ticket revenue",
      "ticketed",
      "event",
      "create event",
      "create host-owned room",
      "room name",
      "host-owned room",
      "payment gateway",
      "checkout",
      "stripe"
    ];
    const controls = Array.from(document.querySelectorAll("button, a, input, textarea, select"));
    controls.forEach(function (el) {
      const combined = [
        textOf(el),
        el.getAttribute("placeholder"),
        el.getAttribute("name"),
        el.getAttribute("id"),
        el.getAttribute("title"),
        el.getAttribute("aria-label")
      ].join(" ").toLowerCase();
      if (dangerousWords.some(function (word) { return combined.includes(word); })) {
        disable(el);
      }
    });
  }
  function addFreeNotice() {
    if (document.getElementById("agv-free-plan-lockdown-notice")) return;
    const notice = document.createElement("div");
    notice.id = "agv-free-plan-lockdown-notice";
    notice.textContent = "Free Plan Access: Chat and Bulletin are available. Vendor, ticketing, events, and host revenue tools require a paid AGV plan.";
    notice.style.cssText = [
      "border:1px solid rgba(255,210,0,.55)",
      "background:rgba(255,210,0,.08)",
      "color:#ffe88a",
      "padding:14px 16px",
      "border-radius:16px",
      "font-weight:700",
      "margin:12px 0",
      "line-height:1.35"
    ].join(";");
    const target =
      Array.from(document.querySelectorAll("aside, section, div"))
        .find(function (el) {
          const txt = lowerText(el);
          return txt.includes("chat") && txt.includes("bulletin");
        }) || document.body;
    target.insertBefore(notice, target.firstChild);
  }
  function runLockdown() {
    if (!document.body || !isFreePlan()) return;
    hideExactButtons([
      "Ticket OK"
    ]);
    hideByPhrase([
      "Control Center Host Tools",
      "Open Vendor Financial Dock",
      "Vendor Financial Dock",
      "Tickets & Revenue",
      "Ticket Revenue Report",
      "7% AGV Platform Fee Tracking",
      "Create Host-Owned Room",
      "Room name, example",
      "Event Creation System",
      "Create, refresh, review",
      "Events are stored",
      "Create Event",
      "Ticketed Event",
      "Event Landing Page Preview",
      "Gateway Connectivity",
      "Connect Payment Gateway",
      "AGV Pricing & Broadcast Fee Policy"
    ]);
    disableDangerousControls();
    addFreeNotice();
  }
  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(function () {
      scheduled = false;
      runLockdown();
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", schedule);
  } else {
    schedule();
  }
  window.addEventListener("load", schedule);
  window.addEventListener("focus", schedule);
  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true
  });
  setInterval(schedule, 1000);
})();

