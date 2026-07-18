// AGV PUBLIC SESSION SAFETY
// Prevents founder/test account data from appearing for public visitors.
// Safe version: only clears storage fields that actually contain the blocked founder email.

(function () {
  if (window.__AGV_PUBLIC_SESSION_SAFETY__) return;
  window.__AGV_PUBLIC_SESSION_SAFETY__ = true;

  const BLOCKED_EMAILS = []; // Founder/Owner email must never be blocked

  function hasBlockedEmail(value) {
    const text = String(value || "").toLowerCase();
    return BLOCKED_EMAILS.some((email) => text.includes(email));
  }

  function removeBlockedEmail(value) {
    let text = String(value || "");

    BLOCKED_EMAILS.forEach((email) => {
      const escaped = email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      text = text.replace(new RegExp(escaped, "gi"), "");
    });

    return text.replace(/\s{2,}/g, " ").trim();
  }

  function cleanStorageArea(store) {
    if (!store) return;

    const keysToRemove = [];

    for (let i = 0; i < store.length; i++) {
      const key = store.key(i);
      const value = store.getItem(key);

      if (hasBlockedEmail(key) || hasBlockedEmail(value)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => {
      try {
        store.removeItem(key);
      } catch (e) {}
    });
  }

  function cleanStorage() {
    try {
      cleanStorageArea(window.localStorage);
      cleanStorageArea(window.sessionStorage);
    } catch (e) {}
  }

  function cleanInputs() {
    document.querySelectorAll("input, textarea").forEach((el) => {
      const type = String(el.type || "").toLowerCase();
      const name = String(el.name || "").toLowerCase();
      const id = String(el.id || "").toLowerCase();

      const isEmail =
        type === "email" ||
        name.includes("email") ||
        id.includes("email");

      if (hasBlockedEmail(el.value)) {
        el.value = "";
        el.setAttribute("value", "");
      }

      if (hasBlockedEmail(el.getAttribute("value"))) {
        el.setAttribute("value", "");
      }

      if (hasBlockedEmail(el.getAttribute("placeholder"))) {
        el.setAttribute("placeholder", isEmail ? "Enter your email" : "");
      }
    });
  }

  function cleanAttributes() {
    document.querySelectorAll("*").forEach((el) => {
      ["value", "placeholder", "title", "aria-label", "data-email"].forEach((attr) => {
        const value = el.getAttribute(attr);

        if (hasBlockedEmail(value)) {
          el.setAttribute(attr, attr === "placeholder" ? "Enter your email" : removeBlockedEmail(value));
        }
      });
    });
  }

  function cleanTextNodes(root) {
    if (!root) return;

    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          return hasBlockedEmail(node.nodeValue)
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_SKIP;
        }
      }
    );

    const nodes = [];

    while (walker.nextNode()) {
      nodes.push(walker.currentNode);
    }

    nodes.forEach((node) => {
      node.nodeValue = removeBlockedEmail(node.nodeValue);
    });
  }

  function run() {
    cleanStorage();
    cleanInputs();
    cleanAttributes();
    cleanTextNodes(document.body);
  }

  function scheduleRun() {
    window.requestAnimationFrame(run);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleRun);
  } else {
    scheduleRun();
  }

  window.addEventListener("load", scheduleRun);
  window.addEventListener("focus", scheduleRun);

  const observer = new MutationObserver(scheduleRun);

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["value", "placeholder", "title", "aria-label", "data-email"]
  });

  setInterval(scheduleRun, 1500);
})();