// AGV TEXT CLEANER V2 — DISPLAY ONLY
// Fixes corrupted mojibake text while preserving word spacing.
// This does not touch payments, tickets, LiveKit, rooms, Stripe, or server data.

(function () {
  const BAD_TEXT_PATTERN = /[ÃÂ ]|â€|â€™|â€œ|â€\u009d|â€“|â€”|â€¢|€|¢|š|¬|ƒ|‚|„|œ|™/;

  function compactText(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9@.]/g, "");
  }

  function knownReplacement(value) {
    const text = String(value || "");
    const compact = compactText(text);

    if (compact === "startyourdigitalvenue") {
      return "START YOUR DIGITAL VENUE";
    }

    if (compact.includes("turnyourliveeventintoaprofessionalonlinevenue")) {
      return "Turn your live event into a professional online venue.";
    }

    if (compact.includes("startfreewithonepublicagvhostroomthenupgradewhenyouraudiencegrows")) {
      return "Start free with one public AGV host room, then upgrade when your audience grows.";
    }

    if (compact === "customerdashboard") {
      return "CUSTOMER DASHBOARD";
    }

    if (compact === "currentagvplan") {
      return "Current AGV Plan";
    }

    if (compact.startsWith("currentagvplanloadedfromagvsubscriptionservice")) {
      const planMatch = text.match(/\b(Convention|Creator|Ministry|Pro|Free)\b/i);
      const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);

      const plan = planMatch ? planMatch[1] : "Convention";
      const email = emailMatch ? emailMatch[0] : "";

      return `Current AGV plan loaded from AGV subscription service: ${plan}.${email ? " Account synced for " + email + "." : ""}`;
    }

    if (compact === "agvaccount") {
      return "AGV Account";
    }

    if (compact === "viewerlimit") {
      return "Viewer Limit";
    }

    if (compact === "hostmode") {
      return "Host Mode";
    }

    if (compact === "hosttools") {
      return "Host Tools";
    }

    if (compact === "planauthority") {
      return "Plan Authority";
    }

    return null;
  }

  function repairText(value) {
    if (!value) return value;

    let text = String(value);

    // Turn common mojibake/corrupt fragments into spacing instead of deleting them.
    text = text
      .replace(/ÃƒÂ¢€šÂ¬Ã,Â¢/g, " ")
      .replace(/ÃƒÂ¢/g, " ")
      .replace(/Ã‚/g, " ")
      .replace(/Ã¢â‚¬Â¢/g, " ")
      .replace(/â€¢/g, " ")
      .replace(/â€“/g, " ")
      .replace(/â€”/g, " ")
      .replace(/â€™/g, "'")
      .replace(/â€œ/g, '"')
      .replace(/â€\u009d/g, '"')
      .replace(/[ÃÂ €¢š¬ƒ‚„œ™]/g, " ")
      .replace(/\s+,\s+/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();

    const known = knownReplacement(text);
    if (known) return known;

    // Restore common AGV UI spacing.
    text = text
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/\bAGV(?=[A-Z][a-z])/g, "AGV ")
      .replace(/\bViewerLimit\b/g, "Viewer Limit")
      .replace(/\bHostMode\b/g, "Host Mode")
      .replace(/\bHostTools\b/g, "Host Tools")
      .replace(/\bPlanAuthority\b/g, "Plan Authority")
      .replace(/\bCustomerDashboard\b/g, "Customer Dashboard")
      .replace(/\bCurrentAGVPlan\b/g, "Current AGV Plan")
      .replace(/\bAGVAccount\b/g, "AGV Account")
      .replace(/Name:(?=\S)/g, "Name: ")
      .replace(/Email:(?=\S)/g, "Email: ")
      .replace(/Plan:(?=\S)/g, "Plan: ")
      .replace(/Price:(?=\S)/g, "Price: ")
      .replace(/Rooms:(?=\S)/g, "Rooms: ")
      .replace(/:(?=\S)/g, ": ")
      .replace(/\s{2,}/g, " ")
      .trim();

    return text;
  }

  function needsRepair(value) {
    if (!value) return false;

    const text = String(value);
    const compact = compactText(text);

    return (
      BAD_TEXT_PATTERN.test(text) ||
      compact.includes("startyourdigitalvenue") ||
      compact.includes("turnyourliveeventintoaprofessionalonlinevenue") ||
      compact.includes("startfreewithonepublicagvhostroom") ||
      compact.includes("customerdashboard") ||
      compact.includes("currentagvplan") ||
      compact.includes("viewerlimit") ||
      compact.includes("agvaccount") ||
      /([a-z0-9])([A-Z])/.test(text) ||
      /:(?=\S)/.test(text)
    );
  }

  function shouldSkipElement(el) {
    if (!el || !el.tagName) return true;

    const tag = el.tagName.toLowerCase();

    return (
      tag === "script" ||
      tag === "style" ||
      tag === "noscript" ||
      tag === "code" ||
      tag === "pre" ||
      tag === "textarea" ||
      tag === "input"
    );
  }

  function cleanTextNodes(root) {
    if (!root) return;

    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const parent = node.parentElement;

          if (!parent || shouldSkipElement(parent)) {
            return NodeFilter.FILTER_REJECT;
          }

          if (!needsRepair(node.nodeValue || "")) {
            return NodeFilter.FILTER_SKIP;
          }

          return NodeFilter.FILTER_ACCEPT;
        },
      }
    );

    const nodes = [];

    while (walker.nextNode()) {
      nodes.push(walker.currentNode);
    }

    nodes.forEach((node) => {
      const cleaned = repairText(node.nodeValue);

      if (cleaned !== node.nodeValue) {
        node.nodeValue = cleaned;
      }
    });
  }

  function cleanAttributes(root) {
    if (!root || !root.querySelectorAll) return;

    root
      .querySelectorAll("[placeholder], [title], [aria-label], [alt]")
      .forEach((el) => {
        ["placeholder", "title", "aria-label", "alt"].forEach((attr) => {
          const value = el.getAttribute(attr);

          if (!needsRepair(value)) return;

          const cleaned = repairText(value);

          if (value && cleaned !== value) {
            el.setAttribute(attr, cleaned);
          }
        });
      });
  }

  function installLayoutGuard() {
    if (document.getElementById("agv-text-cleaner-style")) return;

    const style = document.createElement("style");
    style.id = "agv-text-cleaner-style";

    style.textContent = `
      html,
      body,
      #root {
        max-width: 100%;
        overflow-x: hidden !important;
      }

      h1,
      h2,
      h3,
      p,
      span,
      button,
      div {
        overflow-wrap: normal;
      }

      textarea,
      input,
      button,
      select {
        max-width: 100% !important;
      }
    `;

    document.head.appendChild(style);
  }

  let scheduled = false;

  function runCleaner() {
    if (scheduled) return;

    scheduled = true;

    window.requestAnimationFrame(() => {
      scheduled = false;
      installLayoutGuard();
      cleanTextNodes(document.body);
      cleanAttributes(document.body);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runCleaner);
  } else {
    runCleaner();
  }

  const observer = new MutationObserver(runCleaner);

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  window.addEventListener("load", runCleaner);
})();