// AGV CONTROL PANEL CLEANUP — DISPLAY ONLY
// Hides the old Gateway Connectivity / Coming Soon payment gateway block.
// This does not touch Stripe, tickets, LiveKit, rooms, vendors, or server data.

(function () {
  function normalizeText(value) {
    return String(value || "")
      .replace(/[ÃÂ ]|â€|â€™|â€œ|â€\u009d|â€“|â€”|â€¢|€|¢|š|¬|ƒ|‚|„|œ|™/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function isGatewayCleanupText(text) {
    const clean = normalizeText(text);

    return (
      clean.includes("gateway connectivity") ||
      clean.includes("current reported gateway") ||
      clean.includes("connect payment gateway") ||
      clean.includes("future gateway connection") ||
      clean.includes("manual reporting mode")
    );
  }

  function safeToHide(el) {
    if (!el || !el.tagName) return false;

    const tag = el.tagName.toLowerCase();

    if (
      tag === "body" ||
      tag === "html" ||
      el.id === "root"
    ) {
      return false;
    }

    const text = normalizeText(el.textContent);

    if (!isGatewayCleanupText(text)) return false;

    // Prevent hiding the whole app or a huge control panel by accident.
    return text.length > 0 && text.length < 1800;
  }

  function findBestBlock(startEl) {
    let current = startEl;
    let best = null;

    while (current && current !== document.body && current.id !== "root") {
      if (safeToHide(current)) {
        best = current;
      }

      current = current.parentElement;
    }

    return best || startEl;
  }

  function hideGatewayBlocks() {
    const matches = [];

    document
      .querySelectorAll("section, article, aside, div, button, p, h1, h2, h3, h4, span")
      .forEach((el) => {
        if (isGatewayCleanupText(el.textContent)) {
          const block = findBestBlock(el);

          if (block && safeToHide(block)) {
            matches.push(block);
          } else if (safeToHide(el)) {
            matches.push(el);
          }
        }
      });

    Array.from(new Set(matches))
      .sort((a, b) => normalizeText(a.textContent).length - normalizeText(b.textContent).length)
      .forEach((el) => {
        el.style.display = "none";
        el.setAttribute("data-agv-hidden", "gateway-connectivity-cleanup");
      });
  }

  let scheduled = false;

  function scheduleCleanup() {
    if (scheduled) return;

    scheduled = true;

    window.requestAnimationFrame(() => {
      scheduled = false;
      hideGatewayBlocks();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleCleanup);
  } else {
    scheduleCleanup();
  }

  window.addEventListener("load", scheduleCleanup);

  const observer = new MutationObserver(scheduleCleanup);

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });
})();
// AGV CONTROL PANEL VISUAL TRASH CLEANUP — DISPLAY ONLY
// Hides old development preview cards from the Control Panel.
// This does not touch Stripe, tickets, LiveKit, rooms, vendors, or server data.

(function () {
  if (window.__AGV_CONTROL_PANEL_VISUAL_TRASH_CLEANUP__) return;
  window.__AGV_CONTROL_PANEL_VISUAL_TRASH_CLEANUP__ = true;

  function cleanText(value) {
    return String(value || "")
      .replace(/[ÃÂ ]|â€|â€™|â€œ|â€\u009d|â€“|â€”|â€¢|€|¢|š|¬|ƒ|‚|„|œ|™/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function isOldVisualTrash(text) {
    const t = cleanText(text);

    return (
      t.includes("event landing page preview") ||
      t.includes("landing link:http://127.0.0.1") ||
      t.includes("landing link: http://127.0.0.1") ||
      t.includes("127.0.0.1:5175") ||
      t.includes("host:legacy agv owner") ||
      t.includes("host: legacy agv owner") ||
      t.includes("organization:agv") ||
      t.includes("organization: agv")
    );
  }

  function isProtectedShell(el) {
    if (!el || !el.tagName) return true;

    const tag = el.tagName.toLowerCase();

    return (
      tag === "html" ||
      tag === "body" ||
      el.id === "root"
    );
  }

  function safeToHide(el) {
    if (!el || isProtectedShell(el)) return false;

    const text = cleanText(el.textContent);

    // Avoid hiding the full Control Panel or the full app.
    if (!isOldVisualTrash(text)) return false;
    if (text.length < 20) return false;
    if (text.length > 1400) return false;

    return true;
  }

  function findBestTrashCard(startEl) {
    let node = startEl;
    let best = null;

    while (node && !isProtectedShell(node)) {
      if (safeToHide(node)) {
        best = node;
      }

      node = node.parentElement;
    }

    return best || startEl;
  }

  function hideOldVisualTrash() {
    const matches = [];

    document
      .querySelectorAll("section, article, aside, div, p, h1, h2, h3, h4, span")
      .forEach(function (el) {
        const text = el.textContent || "";

        if (!isOldVisualTrash(text)) return;

        const card = findBestTrashCard(el);

        if (card && safeToHide(card)) {
          matches.push(card);
        }
      });

    Array.from(new Set(matches)).forEach(function (el) {
      el.style.display = "none";
      el.style.visibility = "hidden";
      el.style.pointerEvents = "none";
      el.setAttribute("data-agv-hidden", "old-control-panel-visual-trash");
    });
  }

  let scheduled = false;

  function scheduleCleanup() {
    if (scheduled) return;

    scheduled = true;

    window.requestAnimationFrame(function () {
      scheduled = false;
      hideOldVisualTrash();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleCleanup);
  } else {
    scheduleCleanup();
  }

  window.addEventListener("load", scheduleCleanup);

  const observer = new MutationObserver(scheduleCleanup);

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true
  });
})();
// AGV CONTROL PANEL PRICING POLICY CLEANUP — DISPLAY ONLY
// Hides old AGV Pricing & Broadcast Fee Policy card from the Control Panel.
// This does not touch Stripe, tickets, LiveKit, rooms, vendors, revenue, or server data.

(function () {
  if (window.__AGV_HIDE_PRICING_POLICY_CARD__) return;
  window.__AGV_HIDE_PRICING_POLICY_CARD__ = true;

  function cleanText(value) {
    return String(value || "")
      .replace(/[ÃÂ ]|â€|â€™|â€œ|â€\u009d|â€“|â€”|â€¢|€|¢|š|¬|ƒ|‚|„|œ|™/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function isPricingPolicyCardText(text) {
    const t = cleanText(text);

    return (
      t.includes("agv pricing & broadcast fee policy") ||
      t.includes("agv pricing broadcast fee policy") ||
      t.includes("monthly subscriptions provide platform access") ||
      t.includes("agv ticket fee = 7%") ||
      t.includes("subscription = platform access") ||
      t.includes("broadcast delivery fees are billed separately")
    );
  }

  function isProtectedShell(el) {
    if (!el || !el.tagName) return true;

    const tag = el.tagName.toLowerCase();

    return (
      tag === "html" ||
      tag === "body" ||
      el.id === "root"
    );
  }

  function safeToHide(el) {
    if (!el || isProtectedShell(el)) return false;

    const text = cleanText(el.textContent);

    if (!isPricingPolicyCardText(text)) return false;

    // Prevent hiding the full app or full Control Panel.
    if (text.length < 20) return false;
    if (text.length > 1600) return false;

    return true;
  }

  function findBestPricingCard(startEl) {
    let node = startEl;
    let best = null;

    while (node && !isProtectedShell(node)) {
      if (safeToHide(node)) {
        best = node;
      }

      node = node.parentElement;
    }

    return best || startEl;
  }

  function hidePricingPolicyCard() {
    const matches = [];

    document
      .querySelectorAll("section, article, aside, div, p, h1, h2, h3, h4, span")
      .forEach(function (el) {
        const text = el.textContent || "";

        if (!isPricingPolicyCardText(text)) return;

        const card = findBestPricingCard(el);

        if (card && safeToHide(card)) {
          matches.push(card);
        }
      });

    Array.from(new Set(matches)).forEach(function (el) {
      el.style.display = "none";
      el.style.visibility = "hidden";
      el.style.pointerEvents = "none";
      el.setAttribute("data-agv-hidden", "pricing-broadcast-policy-cleanup");
    });
  }

  let scheduled = false;

  function scheduleCleanup() {
    if (scheduled) return;

    scheduled = true;

    window.requestAnimationFrame(function () {
      scheduled = false;
      hidePricingPolicyCard();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleCleanup);
  } else {
    scheduleCleanup();
  }

  window.addEventListener("load", scheduleCleanup);

  const observer = new MutationObserver(scheduleCleanup);

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true
  });
})();
// AGV CONTROL PANEL EVENT TEXT CLEANUP — DISPLAY ONLY
// Hides old Event Creation System helper text from the Control Panel.
// This does not touch event creation, tickets, rooms, LiveKit, Stripe, vendors, or server data.

(function () {
  if (window.__AGV_HIDE_EVENT_CREATION_HELP_TEXT__) return;
  window.__AGV_HIDE_EVENT_CREATION_HELP_TEXT__ = true;

  function cleanText(value) {
    return String(value || "")
      .replace(/[ÃÂ ]|â€|â€™|â€œ|â€\u009d|â€“|â€”|â€¢|€|¢|š|¬|ƒ|‚|„|œ|™/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function isEventCreationHelpText(text) {
    const t = cleanText(text);

    return (
      t.includes("event creation system") ||
      t.includes("events are stored on event server 8786") ||
      t.includes("create agv events tied to the current room") ||
      t.includes("create, refresh, review, and manage agv events tied to the current room")
    );
  }

  function isProtectedShell(el) {
    if (!el || !el.tagName) return true;

    const tag = el.tagName.toLowerCase();

    return (
      tag === "html" ||
      tag === "body" ||
      el.id === "root"
    );
  }

  function hasControls(el) {
    if (!el || !el.querySelector) return false;

    return !!el.querySelector("button, input, textarea, select, a, [role='button']");
  }

  function safeToHide(el) {
    if (!el || isProtectedShell(el)) return false;

    const text = cleanText(el.textContent);

    if (!isEventCreationHelpText(text)) return false;

    // Do not hide functional forms/buttons. Only hide text/helper cards.
    if (hasControls(el)) return false;

    // Avoid hiding the full Control Panel or the full app.
    if (text.length < 10) return false;
    if (text.length > 1000) return false;

    return true;
  }

  function findBestEventTextBlock(startEl) {
    let node = startEl;
    let best = null;

    while (node && !isProtectedShell(node)) {
      if (safeToHide(node)) {
        best = node;
      }

      node = node.parentElement;
    }

    return best || startEl;
  }

  function hideEventCreationHelpText() {
    const matches = [];

    document
      .querySelectorAll("section, article, aside, div, p, h1, h2, h3, h4, span")
      .forEach(function (el) {
        const text = el.textContent || "";

        if (!isEventCreationHelpText(text)) return;

        const block = findBestEventTextBlock(el);

        if (block && safeToHide(block)) {
          matches.push(block);
        }
      });

    Array.from(new Set(matches)).forEach(function (el) {
      el.style.display = "none";
      el.style.visibility = "hidden";
      el.style.pointerEvents = "none";
      el.setAttribute("data-agv-hidden", "event-creation-help-text-cleanup");
    });
  }

  let scheduled = false;

  function scheduleCleanup() {
    if (scheduled) return;

    scheduled = true;

    window.requestAnimationFrame(function () {
      scheduled = false;
      hideEventCreationHelpText();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleCleanup);
  } else {
    scheduleCleanup();
  }

  window.addEventListener("load", scheduleCleanup);

  const observer = new MutationObserver(scheduleCleanup);

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true
  });
})();