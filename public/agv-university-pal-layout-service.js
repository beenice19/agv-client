(function AGVUniversityPalLayoutService(window, document) {
  "use strict";

  const STYLE_ID = "agvUniversityPalPolishedLayoutStyles";
  const SERVICE_VERSION = "1.0.0";

  if (
    window.AGVUniversityPalLayoutService &&
    window.AGVUniversityPalLayoutService.version
  ) {
    return;
  }

  function addStyles() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = STYLE_ID;

    style.textContent = `
      body.agvUpAiClassroomOpen {
        overflow: hidden !important;
      }

      body.agvUpAiClassroomOpen #agvPlatformVoiceLauncher {
        display: none !important;
      }

      .agvUpAiBackdrop {
        position: fixed !important;
        inset: 0 !important;
        z-index: 10045 !important;
        display: none !important;
        padding: 14px !important;
        overflow: hidden !important;
        background:
          radial-gradient(
            circle at 15% 8%,
            rgba(37,99,235,.16),
            transparent 34%
          ),
          radial-gradient(
            circle at 86% 9%,
            rgba(250,204,21,.08),
            transparent 30%
          ),
          rgba(2,6,23,.97) !important;
        backdrop-filter: blur(12px);
      }

      .agvUpAiBackdrop.isOpen {
        display: block !important;
      }

      .agvUpAiPanel {
        width: 100% !important;
        max-width: 1660px !important;
        height: calc(100vh - 28px) !important;
        min-height: 0 !important;
        margin: 0 auto !important;
        display: grid !important;
        grid-template-columns: minmax(0,1fr) minmax(330px,420px) !important;
        grid-template-rows: minmax(0,1fr) !important;
        overflow: hidden !important;
        border: 1px solid rgba(148,163,184,.18) !important;
        border-radius: 22px !important;
        background:
          linear-gradient(
            145deg,
            rgba(5,13,28,.99),
            rgba(10,22,42,.99)
          ) !important;
        box-shadow: 0 30px 90px rgba(0,0,0,.55) !important;
      }

      .agvUpAiMainColumn {
        min-width: 0;
        min-height: 0;
        display: grid;
        grid-template-rows:
          auto
          auto
          auto
          auto
          minmax(220px,1fr)
          auto;
        overflow: hidden;
        border-right: 1px solid rgba(148,163,184,.15);
      }

      .agvUpAiSideColumn {
        min-width: 0;
        min-height: 0;
        display: flex;
        flex-direction: column;
        gap: 14px;
        padding: 16px;
        overflow-y: auto;
        overflow-x: hidden;
        background:
          linear-gradient(
            180deg,
            rgba(8,17,34,.96),
            rgba(7,15,30,.99)
          );
        scrollbar-width: thin;
        scrollbar-color:
          rgba(250,204,21,.38)
          rgba(15,23,42,.35);
      }

      .agvUpAiHeader {
        grid-column: auto !important;
        grid-row: auto !important;
        padding: 20px 26px 18px !important;
        background:
          linear-gradient(
            180deg,
            rgba(7,16,32,.98),
            rgba(7,16,32,.88)
          ) !important;
        border-bottom: 1px solid rgba(148,163,184,.15) !important;
      }

      .agvUpAiTitle {
        font-size: clamp(1.65rem,2.3vw,2.35rem) !important;
        line-height: 1.05 !important;
        letter-spacing: -.025em;
      }

      .agvUpAiSubtitle {
        max-width: 700px;
        margin-top: 8px !important;
        color: #9eacc2 !important;
      }

      .agvUpAiClose {
        min-width: 92px;
        padding: 12px 17px !important;
        border-radius: 12px !important;
      }

      .agvUpAiControls {
        grid-column: auto !important;
        grid-row: auto !important;
        display: grid !important;
        grid-template-columns:
          repeat(4,minmax(130px,1fr)) !important;
        gap: 14px !important;
        padding: 16px 26px !important;
        border-bottom: 1px solid rgba(148,163,184,.12);
      }

      .agvUpAiField {
        min-width: 0;
      }

      .agvUpAiSelect,
      .agvUpAiInput {
        min-height: 46px !important;
        border-radius: 12px !important;
        background: rgba(4,11,24,.88) !important;
      }

      .agvUpAiQuickActions {
        grid-column: auto !important;
        grid-row: auto !important;
        display: flex !important;
        flex-wrap: nowrap !important;
        gap: 9px !important;
        padding: 12px 26px !important;
        overflow-x: auto !important;
        border-bottom: 1px solid rgba(148,163,184,.11);
      }

      .agvUpAiQuickButton {
        flex: 0 0 auto;
        min-height: 38px;
        padding: 8px 15px !important;
        border-radius: 999px !important;
      }

      .agvUpAiInstructorNote {
        grid-column: auto !important;
        grid-row: auto !important;
        margin: 10px 26px 0 !important;
        border-radius: 12px !important;
      }

      .agvUpAiMessages {
        grid-column: auto !important;
        grid-row: auto !important;
        min-width: 0 !important;
        min-height: 0 !important;
        height: auto !important;
        padding: 22px 30px !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
        background:
          radial-gradient(
            circle at 50% 0,
            rgba(37,99,235,.06),
            transparent 42%
          );
        scrollbar-width: thin;
      }

      .agvUpAiMessage {
        max-width: min(82%,900px) !important;
        margin-bottom: 16px !important;
        padding: 15px 18px !important;
        border-radius: 17px !important;
        font-size: .98rem;
        line-height: 1.62 !important;
        box-shadow: 0 10px 24px rgba(0,0,0,.12);
      }

      .agvUpAiMessage.user {
        background:
          linear-gradient(
            145deg,
            rgba(30,64,175,.48),
            rgba(20,52,110,.48)
          ) !important;
        border-color: rgba(96,165,250,.42) !important;
      }

      .agvUpAiMessage.assistant {
        background:
          linear-gradient(
            145deg,
            rgba(17,29,51,.96),
            rgba(13,24,44,.96)
          ) !important;
        border: 1px solid rgba(148,163,184,.18) !important;
      }

      .agvUpAiComposer {
        grid-column: auto !important;
        grid-row: auto !important;
        position: relative !important;
        padding: 16px 26px 18px !important;
        border-top: 1px solid rgba(148,163,184,.14) !important;
        background: rgba(5,13,28,.98) !important;
      }

      .agvUpAiComposerRow {
        align-items: stretch !important;
      }

      .agvUpAiTextarea {
        min-height: 76px !important;
        max-height: 150px !important;
        padding: 15px 17px !important;
        border-radius: 14px !important;
      }

      .agvUpAiSend {
        min-width: 118px !important;
        border-radius: 14px !important;
        background:
          linear-gradient(
            145deg,
            rgba(250,204,21,.22),
            rgba(180,130,15,.19)
          ) !important;
      }

      .agvUpVoiceStudioShell {
        flex: 0 0 auto;
        border: 1px solid rgba(250,204,21,.48);
        border-radius: 18px;
        overflow: hidden;
        background:
          linear-gradient(
            145deg,
            rgba(10,24,46,.99),
            rgba(7,17,34,.99)
          );
        box-shadow:
          0 16px 38px rgba(0,0,0,.28),
          inset 0 1px rgba(255,255,255,.025);
      }

      .agvUpVoiceStudioHeading {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 17px 18px;
        border-bottom: 1px solid rgba(148,163,184,.13);
        color: #facc15;
        font-weight: 950;
        letter-spacing: .04em;
        text-transform: uppercase;
      }

      .agvUpVoiceStudioHeadingIcon {
        font-size: 1.15rem;
      }

      #agvPlatformVoicePanel {
        position: static !important;
        inset: auto !important;
        z-index: auto !important;
        display: block !important;
        width: 100% !important;
        max-width: none !important;
        max-height: none !important;
        overflow: visible !important;
        padding: 17px !important;
        border: 0 !important;
        border-radius: 0 !important;
        background: transparent !important;
        box-shadow: none !important;
      }

      #agvPlatformVoicePanel > h3,
      #agvPlatformVoicePanel > .agvVoiceSubtitle {
        display: none !important;
      }

      #agvPlatformVoicePanel label {
        color: #dbe5f3 !important;
      }

      #agvPlatformVoicePanel select {
        min-height: 43px;
        border-radius: 11px !important;
      }

      #agvPlatformVoicePanel .agvVoiceActions {
        grid-template-columns: repeat(2,minmax(0,1fr)) !important;
        gap: 9px !important;
      }

      #agvPlatformVoicePanel button {
        min-height: 45px;
        border-radius: 11px !important;
      }

      #agvPlatformVoicePanel .agvVoiceStatus {
        border: 1px solid rgba(96,165,250,.18);
      }

      .agvUpAdvancedTools {
        flex: 0 0 auto;
        display: grid;
        gap: 10px;
      }

      .agvUpAdvancedToolsTitle {
        padding: 3px 3px 0;
        color: #94a3b8;
        font-size: .7rem;
        font-weight: 950;
        letter-spacing: .12em;
        text-transform: uppercase;
      }

      .agvUpToolDisclosure {
        border: 1px solid rgba(148,163,184,.16);
        border-radius: 14px;
        overflow: hidden;
        background: rgba(15,23,42,.62);
      }

      .agvUpToolDisclosure[open] {
        border-color: rgba(250,204,21,.25);
      }

      .agvUpToolDisclosure > summary {
        list-style: none;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 13px 14px;
        color: #e5edf8;
        font-size: .78rem;
        font-weight: 900;
        cursor: pointer;
        user-select: none;
      }

      .agvUpToolDisclosure > summary::-webkit-details-marker {
        display: none;
      }

      .agvUpToolDisclosure > summary::after {
        content: "+";
        color: #facc15;
        font-size: 1rem;
      }

      .agvUpToolDisclosure[open] > summary::after {
        content: "−";
      }

      .agvUpToolDisclosureBody {
        padding: 0 10px 10px;
      }

      .agvUpToolDisclosureBody >
      .agvUpAiContextCard,
      .agvUpToolDisclosureBody >
      .agvUpTutorCard,
      .agvUpToolDisclosureBody >
      .agvUpQuizCard,
      .agvUpToolDisclosureBody >
      .agvUpInstructorCard,
      .agvUpToolDisclosureBody >
      .agvUpProviderCard,
      .agvUpToolDisclosureBody >
      .agvUpSafetyCard {
        display: block !important;
        position: static !important;
        inset: auto !important;
        grid-column: auto !important;
        grid-row: auto !important;
        width: auto !important;
        max-width: none !important;
        max-height: none !important;
        margin: 0 !important;
        overflow: visible !important;
        border-radius: 12px !important;
      }

      @media (max-width: 1100px) {
        .agvUpAiBackdrop {
          padding: 0 !important;
          overflow-y: auto !important;
        }

        .agvUpAiPanel {
          height: auto !important;
          min-height: 100vh !important;
          grid-template-columns: 1fr !important;
          grid-template-rows: auto auto !important;
          overflow: visible !important;
          border-radius: 0 !important;
        }

        .agvUpAiMainColumn {
          min-height: 760px;
          border-right: 0;
          border-bottom: 1px solid rgba(148,163,184,.15);
        }

        .agvUpAiSideColumn {
          max-height: none;
          overflow: visible;
        }
      }

      @media (max-width: 760px) {
        .agvUpAiMainColumn {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          overflow: visible;
        }

        .agvUpAiControls {
          grid-template-columns: repeat(2,minmax(0,1fr)) !important;
          padding: 14px 16px !important;
        }

        .agvUpAiHeader {
          padding: 17px 16px !important;
        }

        .agvUpAiHeaderTop {
          align-items: flex-start !important;
        }

        .agvUpAiQuickActions {
          padding: 10px 16px !important;
        }

        .agvUpAiInstructorNote {
          margin: 10px 16px 0 !important;
        }

        .agvUpAiMessages {
          min-height: 430px !important;
          padding: 18px 15px !important;
        }

        .agvUpAiMessage {
          max-width: 94% !important;
        }

        .agvUpAiComposer {
          padding: 13px 15px 16px !important;
        }

        .agvUpAiSideColumn {
          padding: 14px;
        }
      }

      @media (max-width: 520px) {
        .agvUpAiControls {
          grid-template-columns: 1fr !important;
        }

        .agvUpAiComposerRow {
          flex-direction: column;
        }

        .agvUpAiSend {
          width: 100%;
          min-height: 48px;
        }

        #agvPlatformVoicePanel .agvVoiceActions {
          grid-template-columns: 1fr !important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function makeDisclosure(card, title) {
    if (
      !card ||
      card.closest(".agvUpToolDisclosure")
    ) {
      return null;
    }

    const disclosure = document.createElement("details");
    disclosure.className = "agvUpToolDisclosure";

    const summary = document.createElement("summary");
    summary.textContent = title;

    const body = document.createElement("div");
    body.className = "agvUpToolDisclosureBody";

    disclosure.appendChild(summary);
    disclosure.appendChild(body);
    body.appendChild(card);

    return disclosure;
  }

  function ensureColumns(panel) {
    let main = panel.querySelector(
      ":scope > .agvUpAiMainColumn"
    );

    let side = panel.querySelector(
      ":scope > .agvUpAiSideColumn"
    );

    if (!main) {
      main = document.createElement("main");
      main.className = "agvUpAiMainColumn";
      main.setAttribute(
        "aria-label",
        "University Pal teaching workspace"
      );
      panel.insertBefore(main, panel.firstChild);
    }

    if (!side) {
      side = document.createElement("aside");
      side.className = "agvUpAiSideColumn";
      side.setAttribute(
        "aria-label",
        "AGV Voice Studio and classroom tools"
      );
      panel.appendChild(side);
    }

    return {
      main: main,
      side: side
    };
  }

  function organizePrimaryContent(panel, main) {
    [
      ".agvUpAiHeader",
      ".agvUpAiControls",
      ".agvUpAiQuickActions",
      ".agvUpAiInstructorNote",
      ".agvUpAiMessages",
      ".agvUpAiComposer"
    ].forEach(function(selector) {
      const element = panel.querySelector(
        ":scope > " + selector
      );

      if (element) {
        main.appendChild(element);
      }
    });
  }

  function ensureVoiceStudio(side) {
    let shell = side.querySelector(
      ":scope > .agvUpVoiceStudioShell"
    );

    if (!shell) {
      shell = document.createElement("section");
      shell.className = "agvUpVoiceStudioShell";

      const heading = document.createElement("div");
      heading.className = "agvUpVoiceStudioHeading";
      heading.innerHTML =
        '<span class="agvUpVoiceStudioHeadingIcon">◖▮◗</span>' +
        "<span>AGV Voice Studio</span>";

      shell.appendChild(heading);
      side.insertBefore(shell, side.firstChild);
    }

    const voicePanel = document.getElementById(
      "agvPlatformVoicePanel"
    );

    if (voicePanel && voicePanel.parentElement !== shell) {
      shell.appendChild(voicePanel);
      voicePanel.classList.add("isOpen");
    }

    return shell;
  }

  function ensureAdvancedTools(side) {
    let tools = side.querySelector(
      ":scope > .agvUpAdvancedTools"
    );

    if (!tools) {
      tools = document.createElement("section");
      tools.className = "agvUpAdvancedTools";

      const title = document.createElement("div");
      title.className = "agvUpAdvancedToolsTitle";
      title.textContent = "Classroom and Instructor Tools";

      tools.appendChild(title);
      side.appendChild(tools);
    }

    return tools;
  }

  function organizeToolCards(panel, tools) {
    const cardDefinitions = [
      [".agvUpAiContextCard", "Lesson Context"],
      [".agvUpTutorCard", "Guided Tutor"],
      [".agvUpQuizCard", "Quiz and Assessment"],
      [".agvUpInstructorCard", "Instructor Studio"],
      [".agvUpProviderCard", "Live AI Provider"],
      [".agvUpSafetyCard", "Classroom Safety"]
    ];

    cardDefinitions.forEach(function(definition) {
      const card = panel.querySelector(
        ":scope > " + definition[0]
      );

      if (!card) {
        return;
      }

      const disclosure = makeDisclosure(
        card,
        definition[1]
      );

      if (disclosure) {
        tools.appendChild(disclosure);
      }
    });
  }

  function organize() {
    addStyles();

    const panel = document.querySelector(
      ".agvUpAiPanel"
    );

    if (!panel) {
      return false;
    }

    const columns = ensureColumns(panel);

    organizePrimaryContent(
      panel,
      columns.main
    );

    ensureVoiceStudio(columns.side);

    const tools = ensureAdvancedTools(
      columns.side
    );

    organizeToolCards(panel, tools);

    document.body.classList.toggle(
      "agvUpAiClassroomOpen",
      Boolean(
        document
          .getElementById("agvUpAiBackdrop")
          ?.classList.contains("isOpen")
      )
    );

    return true;
  }

  let scheduled = false;

  function scheduleOrganize() {
    if (scheduled) {
      return;
    }

    scheduled = true;

    window.requestAnimationFrame(function() {
      scheduled = false;
      organize();
    });
  }

  const observer = new MutationObserver(
    scheduleOrganize
  );

  function start() {
    addStyles();
    organize();

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"]
    });

    window.addEventListener(
      "agv:voice-settings-changed",
      scheduleOrganize
    );
  }

  window.AGVUniversityPalLayoutService = {
    version: SERVICE_VERSION,
    organize: organize,
    refresh: scheduleOrganize
  };

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      start,
      { once: true }
    );
  } else {
    start();
  }
})(window, document);
