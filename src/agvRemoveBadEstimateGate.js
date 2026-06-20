// PASS_CLIENT_REMOVE_BAD_ESTIMATE_GATE_MODULE_1A
// CLIENT ONLY — Remove the broken AGV Event Estimate Gate module from the page.
// This removes the full visible module, not just the zero-result display.

function textOf(el) {
  try {
    return String(el?.innerText || el?.textContent || "").toLowerCase();
  } catch {
    return "";
  }
}

function removeBadEstimateGate() {
  try {
    const all = Array.from(document.querySelectorAll("div, section, article, aside"));

    const candidates = all
      .filter((el) => {
        const text = textOf(el);
        return (
          text.includes("agv event estimate gate") &&
          text.includes("expected viewers") &&
          text.includes("event minutes") &&
          text.includes("interactive people") &&
          text.includes("estimate event")
        );
      })
      .filter((el) => {
        const text = textOf(el);
        // Do not remove the larger AGV Scale Status area if it also contains the Cloudflare buttons.
        return !text.includes("go live to cloudflare");
      })
      .sort((a, b) => textOf(a).length - textOf(b).length);

    if (candidates[0]) {
      candidates[0].remove();
      return true;
    }

    // Fallback: hide the smallest matching block if remove misses because of render timing.
    const fallback = all
      .filter((el) => textOf(el).includes("agv event estimate gate"))
      .sort((a, b) => textOf(a).length - textOf(b).length)[0];

    if (fallback && fallback !== document.body) {
      fallback.remove();
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

function startBadEstimateGateRemoval() {
  removeBadEstimateGate();

  try {
    const observer = new MutationObserver(() => {
      removeBadEstimateGate();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  } catch {}

  setInterval(removeBadEstimateGate, 1000);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startBadEstimateGateRemoval);
} else {
  startBadEstimateGateRemoval();
}
