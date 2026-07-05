// AGV FREE PLAN ROOM CREATION LOCK
// Targeted guard only: blocks Free Plan users from creating custom/host-owned rooms.
// Does not hide the whole app. Does not touch Chat or Bulletin.
(function () {
  if (window.__AGV_FREE_ROOM_CREATE_LOCK__) return;
  window.__AGV_FREE_ROOM_CREATE_LOCK__ = true;
  function textOf(el) {
    return String((el && (el.innerText || el.textContent)) || "")
      .replace(/\s+/g, " ")
      .trim();
  }
  function lower(value) {
    return String(value || "").toLowerCase();
  }
  function bodyText() {
    return textOf(document.body).toLowerCase();
  }
  function isFreePlan() {
    const text = bodyText();
    return (
      text.includes("freeplan active") ||
      /plan\s*:\s*free\b/i.test(text) ||
      /active\s*plan\s*:\s*free\b/i.test(text)
    );
  }
  function isRoomCreateControl(el) {
    if (!el) return false;
    const combined = [
      textOf(el),
      el.getAttribute && el.getAttribute("placeholder"),
      el.getAttribute && el.getAttribute("name"),
      el.getAttribute && el.getAttribute("id"),
      el.getAttribute && el.getAttribute("title"),
      el.getAttribute && el.getAttribute("aria-label")
    ].join(" ").toLowerCase();
    return (
      combined.includes("create host-owned room") ||
      combined.includes("create room") ||
      combined.includes("room name, example") ||
      combined.includes("ticket-only room") ||
      combined.includes("private room")
    );
  }
  function findRoomCreatePanel() {
    const candidates = Array.from(document.querySelectorAll("div, section, article, aside, form"));
    const matches = candidates
      .filter(function (el) {
        const txt = textOf(el).toLowerCase();
        return (
          txt.includes("create host-owned room") &&
          (
            txt.includes("create room") ||
            txt.includes("room name") ||
            txt.includes("ticket-only room") ||
            txt.includes("private room")
          )
        );
      })
      .map(function (el) {
        const rect = el.getBoundingClientRect();
        return {
          el: el,
          textLength: textOf(el).length,
          area: Math.max(1, rect.width) * Math.max(1, rect.height)
        };
      })
      .filter(function (item) {
        // Safety: never allow this script to pick the whole app/body/root.
        return (
          item.el !== document.body &&
          item.el !== document.documentElement &&
          item.textLength < 1600 &&
          item.area < 900000
        );
      })
      .sort(function (a, b) {
        return a.area - b.area;
      });
    return matches.length ? matches[0].el : null;
  }
  function hideRoomCreatePanel() {
    const panel = findRoomCreatePanel();
    if (!panel) return;
    panel.style.setProperty("display", "none", "important");
    panel.style.setProperty("visibility", "hidden", "important");
    panel.setAttribute("aria-hidden", "true");
    panel.setAttribute("data-agv-free-room-create-hidden", "true");
  }
  function disableRoomCreateControls() {
    const controls = Array.from(document.querySelectorAll("button, input, textarea, select, label"));
    controls.forEach(function (el) {
      if (!isRoomCreateControl(el)) return;
      el.setAttribute("disabled", "disabled");
      el.setAttribute("aria-disabled", "true");
      el.style.setProperty("pointer-events", "none", "important");
      el.style.setProperty("opacity", "0.45", "important");
    });
  }
  function blockEvent(e) {
    if (!isFreePlan()) return;
    const target = e.target && e.target.closest
      ? e.target.closest("button, a, input, textarea, select, label, form")
      : e.target;
    if (!target) return;
    const panel = findRoomCreatePanel();
    if (
      isRoomCreateControl(target) ||
      (panel && panel.contains(target))
    ) {
      e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === "function") {
        e.stopImmediatePropagation();
      }
      return false;
    }
  }
  function addNoticeOnce() {
    if (document.getElementById("agv-free-room-lock-notice")) return;
    const roomsPanel = Array.from(document.querySelectorAll("aside, section, div"))
      .find(function (el) {
        const txt = textOf(el).toLowerCase();
        return txt.includes("rooms") && txt.includes("freeplan active");
      });
    if (!roomsPanel) return;
    const notice = document.createElement("div");
    notice.id = "agv-free-room-lock-notice";
    notice.textContent = "Free Plan: Chat and Bulletin access only. Custom rooms require a paid AGV plan.";
    notice.style.cssText = [
      "border:1px solid rgba(255,210,0,.55)",
      "background:rgba(255,210,0,.08)",
      "color:#ffe88a",
      "padding:12px 14px",
      "border-radius:14px",
      "font-weight:700",
      "margin:12px 0",
      "line-height:1.35"
    ].join(";");
    roomsPanel.insertBefore(notice, roomsPanel.firstChild);
  }
  function run() {
    if (!document.body || !isFreePlan()) return;
    hideRoomCreatePanel();
    disableRoomCreateControls();
    addNoticeOnce();
  }
  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(function () {
      scheduled = false;
      run();
    });
  }
  document.addEventListener("click", blockEvent, true);
  document.addEventListener("submit", blockEvent, true);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Enter") blockEvent(e);
  }, true);
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
