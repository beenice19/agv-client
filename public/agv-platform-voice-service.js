(function AGVPlatformVoiceServiceBootstrap(window, document) {
  "use strict";

  if (window.AGVVoiceService && window.AGVVoiceService.version) {
    return;
  }

  const STORAGE_KEY = "agvPlatformVoiceSettingsV1";
  const STYLE_ID = "agvPlatformVoiceServiceStyles";
  const PANEL_ID = "agvPlatformVoicePanel";
  const BUTTON_ID = "agvPlatformVoiceLauncher";

  const defaults = {
    enabled: true,
    autoSpeak: true,
    interrupt: true,
    voiceURI: "",
    voiceName: "",
    rate: 1,
    pitch: 1,
    volume: 1,
    profile: "teacher"
  };

  const profiles = {
    teacher: {
      label: "Teacher",
      rate: 0.96,
      pitch: 1,
      volume: 1
    },
    coach: {
      label: "Coach",
      rate: 1.04,
      pitch: 1.03,
      volume: 1
    },
    storyteller: {
      label: "Storyteller",
      rate: 0.9,
      pitch: 1.05,
      volume: 1
    },
    accessibility: {
      label: "Clear and Slow",
      rate: 0.82,
      pitch: 1,
      volume: 1
    }
  };

  let settings = readSettings();
  let voices = [];
  let speaking = false;
  let paused = false;
  let lastText = "";
  let currentUtterance = null;

  function supported() {
    return Boolean(
      window.speechSynthesis &&
      window.SpeechSynthesisUtterance
    );
  }

  function clamp(value, minimum, maximum, fallback) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return fallback;
    }

    return Math.min(maximum, Math.max(minimum, number));
  }

  function readSettings() {
    try {
      const stored = JSON.parse(
        window.localStorage.getItem(STORAGE_KEY) || "{}"
      );

      return Object.assign({}, defaults, stored);
    } catch (error) {
      return Object.assign({}, defaults);
    }
  }

  function saveSettings() {
    settings.rate = clamp(settings.rate, 0.5, 2, 1);
    settings.pitch = clamp(settings.pitch, 0.5, 2, 1);
    settings.volume = clamp(settings.volume, 0, 1, 1);

    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(settings)
      );
    } catch (error) {
      console.warn(
        "AGV Voice Service settings could not be saved.",
        error
      );
    }

    syncPanel();
    emit("agv:voice-settings-changed", {
      settings: getSettings()
    });

    return getSettings();
  }

  function getSettings() {
    return Object.assign({}, settings);
  }

  function normalizeText(value) {
    const temporary = document.createElement("div");
    temporary.innerHTML = String(value || "");

    return String(
      temporary.textContent ||
      temporary.innerText ||
      ""
    )
      .replace(/\s+/g, " ")
      .trim();
  }

  function preferredVoice(list) {
    const available = Array.isArray(list) ? list : voices;

    if (!available.length) {
      return null;
    }

    if (settings.voiceURI) {
      const exactURI = available.find(function(voice) {
        return voice.voiceURI === settings.voiceURI;
      });

      if (exactURI) {
        return exactURI;
      }
    }

    if (settings.voiceName) {
      const exactName = available.find(function(voice) {
        return voice.name === settings.voiceName;
      });

      if (exactName) {
        return exactName;
      }
    }

    const preferences = [
      /Microsoft Aria/i,
      /Microsoft Jenny/i,
      /Microsoft Ava/i,
      /Microsoft Sonia/i,
      /Google US English/i,
      /Samantha/i,
      /Karen/i
    ];

    for (const pattern of preferences) {
      const match = available.find(function(voice) {
        return pattern.test(voice.name) &&
          /^en([-_]|$)/i.test(voice.lang || "en");
      });

      if (match) {
        return match;
      }
    }

    return available.find(function(voice) {
      return /^en-US$/i.test(voice.lang || "");
    }) ||
    available.find(function(voice) {
      return /^en/i.test(voice.lang || "");
    }) ||
    available[0];
  }

  function loadVoices() {
    if (!supported()) {
      voices = [];
      syncPanel();
      return [];
    }

    voices = window.speechSynthesis
      .getVoices()
      .slice()
      .sort(function(a, b) {
        return (
          String(a.lang).localeCompare(String(b.lang)) ||
          String(a.name).localeCompare(String(b.name))
        );
      });

    const selected = preferredVoice(voices);

    if (selected && !settings.voiceURI) {
      settings.voiceURI = selected.voiceURI;
      settings.voiceName = selected.name;
      saveSettings();
    }

    renderVoiceOptions();
    return voices.slice();
  }

  function selectedVoice() {
    return preferredVoice(voices);
  }

  function emit(name, detail) {
    window.dispatchEvent(
      new CustomEvent(name, {
        detail: detail || {}
      })
    );
  }

  function stop() {
    if (supported()) {
      window.speechSynthesis.cancel();
    }

    currentUtterance = null;
    speaking = false;
    paused = false;
    syncPanel();

    emit("agv:voice-stopped", {});
  }

  function pause() {
    if (!supported() || !speaking) {
      return false;
    }

    window.speechSynthesis.pause();
    paused = true;
    syncPanel();

    return true;
  }

  function resume() {
    if (!supported() || !paused) {
      return false;
    }

    window.speechSynthesis.resume();
    paused = false;
    syncPanel();

    return true;
  }

  function speak(value, options) {
    const opts = Object.assign(
      {
        force: false,
        source: "agv-platform",
        interrupt: settings.interrupt
      },
      options || {}
    );

    const text = normalizeText(value);

    if (!text || !supported() || !settings.enabled) {
      return false;
    }

    if (!opts.force && !settings.autoSpeak) {
      return false;
    }

    if (opts.interrupt) {
      window.speechSynthesis.cancel();
    }

    const utterance =
      new window.SpeechSynthesisUtterance(text);

    const voice = selectedVoice();

    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang || "en-US";
    } else {
      utterance.lang = "en-US";
    }

    utterance.rate = clamp(settings.rate, 0.5, 2, 1);
    utterance.pitch = clamp(settings.pitch, 0.5, 2, 1);
    utterance.volume = clamp(settings.volume, 0, 1, 1);

    utterance.onstart = function() {
      speaking = true;
      paused = false;
      lastText = text;
      currentUtterance = utterance;
      syncPanel();

      emit("agv:voice-started", {
        text: text,
        source: opts.source,
        voice: voice ? voice.name : "Browser default"
      });
    };

    utterance.onend = function() {
      if (currentUtterance === utterance) {
        speaking = false;
        paused = false;
        currentUtterance = null;
        syncPanel();
      }

      emit("agv:voice-ended", {
        text: text,
        source: opts.source
      });
    };

    utterance.onerror = function(event) {
      if (
        event &&
        event.error !== "interrupted" &&
        event.error !== "canceled"
      ) {
        console.warn(
          "AGV Voice Service speech error:",
          event.error
        );
      }

      if (currentUtterance === utterance) {
        speaking = false;
        paused = false;
        currentUtterance = null;
        syncPanel();
      }
    };

    currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);

    return true;
  }

  function readSelection() {
    const selection = window.getSelection
      ? window.getSelection().toString()
      : "";

    const text = normalizeText(selection);

    if (!text) {
      emit("agv:voice-no-selection", {});
      return false;
    }

    return speak(text, {
      force: true,
      source: "selected-text",
      interrupt: true
    });
  }

  function repeat() {
    if (!lastText) {
      return false;
    }

    return speak(lastText, {
      force: true,
      source: "repeat",
      interrupt: true
    });
  }

  function setVoice(value) {
    const voice = voices.find(function(candidate) {
      return candidate.voiceURI === value ||
        candidate.name === value;
    });

    if (!voice) {
      return false;
    }

    settings.voiceURI = voice.voiceURI;
    settings.voiceName = voice.name;
    saveSettings();

    return true;
  }

  function setProfile(profileName) {
    const profile = profiles[profileName];

    if (!profile) {
      return false;
    }

    settings.profile = profileName;
    settings.rate = profile.rate;
    settings.pitch = profile.pitch;
    settings.volume = profile.volume;
    saveSettings();

    return true;
  }

  function setSetting(name, value) {
    if (!(name in defaults)) {
      return false;
    }

    settings[name] = value;
    saveSettings();

    return true;
  }

  function installStyles() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${BUTTON_ID}{
        position:fixed;
        right:22px;
        bottom:22px;
        z-index:2147483000;
        width:52px;
        height:52px;
        border-radius:50%;
        border:1px solid rgba(212,175,55,.65);
        background:linear-gradient(145deg,#14233f,#081224);
        color:#f5d979;
        font-size:23px;
        cursor:pointer;
        box-shadow:0 12px 34px rgba(0,0,0,.38);
      }

      #${BUTTON_ID}[data-speaking="true"]{
        box-shadow:
          0 0 0 5px rgba(212,175,55,.14),
          0 12px 34px rgba(0,0,0,.4);
      }

      #${PANEL_ID}{
        position:fixed;
        right:22px;
        bottom:84px;
        z-index:2147483000;
        width:min(360px,calc(100vw - 32px));
        max-height:calc(100vh - 110px);
        overflow:auto;
        display:none;
        padding:18px;
        border:1px solid rgba(212,175,55,.42);
        border-radius:18px;
        background:rgba(7,17,34,.98);
        color:#f8fafc;
        box-shadow:0 20px 55px rgba(0,0,0,.48);
        font-family:Inter,Segoe UI,Arial,sans-serif;
      }

      #${PANEL_ID}.isOpen{
        display:block;
      }

      #${PANEL_ID} h3{
        margin:0 0 4px;
        color:#f5d979;
        font-size:18px;
      }

      #${PANEL_ID} .agvVoiceSubtitle{
        margin:0 0 14px;
        color:#aebbd0;
        font-size:12px;
      }

      #${PANEL_ID} label{
        display:block;
        margin-top:12px;
        color:#d7dfec;
        font-size:12px;
        font-weight:700;
      }

      #${PANEL_ID} select,
      #${PANEL_ID} input[type="range"]{
        width:100%;
        margin-top:6px;
      }

      #${PANEL_ID} select{
        padding:9px;
        border:1px solid rgba(148,163,184,.34);
        border-radius:9px;
        background:#101d33;
        color:#f8fafc;
      }

      #${PANEL_ID} .agvVoiceToggle{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        margin-top:11px;
      }

      #${PANEL_ID} .agvVoiceToggle label{
        margin:0;
      }

      #${PANEL_ID} .agvVoiceActions{
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:8px;
        margin-top:16px;
      }

      #${PANEL_ID} button{
        padding:9px 10px;
        border:1px solid rgba(212,175,55,.34);
        border-radius:9px;
        background:#14233f;
        color:#f8fafc;
        cursor:pointer;
      }

      #${PANEL_ID} button:hover{
        border-color:#d4af37;
      }

      #${PANEL_ID} .agvVoiceStatus{
        margin-top:12px;
        padding:9px;
        border-radius:9px;
        background:rgba(59,130,246,.1);
        color:#bfdbfe;
        font-size:12px;
      }
    `;

    document.head.appendChild(style);
  }

  function ensureInterface() {
    if (!document.body) {
      return null;
    }

    installStyles();

    let launcher = document.getElementById(BUTTON_ID);

    if (!launcher) {
      launcher = document.createElement("button");
      launcher.id = BUTTON_ID;
      launcher.type = "button";
      launcher.title = "AGV Voice Service";
      launcher.setAttribute(
        "aria-label",
        "Open AGV Voice Service"
      );
      launcher.textContent = "🔊";

      launcher.addEventListener("click", function() {
        const panel = ensureInterface();

        if (panel) {
          panel.classList.toggle("isOpen");
        }
      });

      document.body.appendChild(launcher);
    }

    let panel = document.getElementById(PANEL_ID);

    if (!panel) {
      panel = document.createElement("section");
      panel.id = PANEL_ID;
      panel.setAttribute(
        "aria-label",
        "AGV Platform Voice Service"
      );

      panel.innerHTML = `
        <h3>AGV Voice Service</h3>
        <p class="agvVoiceSubtitle">
          Platform narration and classroom speech
        </p>

        <div class="agvVoiceToggle">
          <label for="agvVoiceEnabled">Voice enabled</label>
          <input id="agvVoiceEnabled" type="checkbox">
        </div>

        <div class="agvVoiceToggle">
          <label for="agvVoiceAutoSpeak">Speak AI replies</label>
          <input id="agvVoiceAutoSpeak" type="checkbox">
        </div>

        <div class="agvVoiceToggle">
          <label for="agvVoiceInterrupt">Interrupt old speech</label>
          <input id="agvVoiceInterrupt" type="checkbox">
        </div>

        <label for="agvVoiceProfile">Classroom voice profile</label>
        <select id="agvVoiceProfile">
          <option value="teacher">Teacher</option>
          <option value="coach">Coach</option>
          <option value="storyteller">Storyteller</option>
          <option value="accessibility">Clear and Slow</option>
        </select>

        <label for="agvVoiceSelect">Voice</label>
        <select id="agvVoiceSelect"></select>

        <label for="agvVoiceRate">
          Speed: <span id="agvVoiceRateValue">1.00</span>
        </label>
        <input
          id="agvVoiceRate"
          type="range"
          min="0.5"
          max="2"
          step="0.05"
        >

        <label for="agvVoicePitch">
          Pitch: <span id="agvVoicePitchValue">1.00</span>
        </label>
        <input
          id="agvVoicePitch"
          type="range"
          min="0.5"
          max="2"
          step="0.05"
        >

        <label for="agvVoiceVolume">
          Volume: <span id="agvVoiceVolumeValue">1.00</span>
        </label>
        <input
          id="agvVoiceVolume"
          type="range"
          min="0"
          max="1"
          step="0.05"
        >

        <div class="agvVoiceActions">
          <button type="button" data-action="read">
            Read Selection
          </button>
          <button type="button" data-action="repeat">
            Repeat
          </button>
          <button type="button" data-action="pause">
            Pause / Resume
          </button>
          <button type="button" data-action="stop">
            Stop Speaking
          </button>
        </div>

        <div class="agvVoiceStatus" id="agvVoiceStatus">
          Ready
        </div>
      `;

      document.body.appendChild(panel);
      bindInterface(panel);
    }

    renderVoiceOptions();
    syncPanel();

    return panel;
  }

  function bindInterface(panel) {
    const byId = function(id) {
      return panel.querySelector("#" + id);
    };

    byId("agvVoiceEnabled").addEventListener(
      "change",
      function(event) {
        settings.enabled = event.target.checked;

        if (!settings.enabled) {
          stop();
        }

        saveSettings();
      }
    );

    byId("agvVoiceAutoSpeak").addEventListener(
      "change",
      function(event) {
        settings.autoSpeak = event.target.checked;
        saveSettings();
      }
    );

    byId("agvVoiceInterrupt").addEventListener(
      "change",
      function(event) {
        settings.interrupt = event.target.checked;
        saveSettings();
      }
    );

    byId("agvVoiceProfile").addEventListener(
      "change",
      function(event) {
        setProfile(event.target.value);
      }
    );

    byId("agvVoiceSelect").addEventListener(
      "change",
      function(event) {
        setVoice(event.target.value);
      }
    );

    [
      ["agvVoiceRate", "rate"],
      ["agvVoicePitch", "pitch"],
      ["agvVoiceVolume", "volume"]
    ].forEach(function(entry) {
      byId(entry[0]).addEventListener(
        "input",
        function(event) {
          settings[entry[1]] = Number(event.target.value);
          saveSettings();
        }
      );
    });

    panel.addEventListener("click", function(event) {
      const button = event.target.closest("[data-action]");

      if (!button) {
        return;
      }

      const action = button.getAttribute("data-action");

      if (action === "read") {
        readSelection();
      } else if (action === "repeat") {
        repeat();
      } else if (action === "pause") {
        paused ? resume() : pause();
      } else if (action === "stop") {
        stop();
      }
    });
  }

  function renderVoiceOptions() {
    const select = document.getElementById("agvVoiceSelect");

    if (!select) {
      return;
    }

    const current = settings.voiceURI;
    select.innerHTML = "";

    if (!voices.length) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = supported()
        ? "Loading browser voices..."
        : "Speech is not supported";
      select.appendChild(option);
      return;
    }

    voices.forEach(function(voice) {
      const option = document.createElement("option");
      option.value = voice.voiceURI;
      option.textContent =
        voice.name + " — " + (voice.lang || "Unknown language");

      if (voice.voiceURI === current) {
        option.selected = true;
      }

      select.appendChild(option);
    });
  }

  function syncPanel() {
    const panel = document.getElementById(PANEL_ID);
    const launcher = document.getElementById(BUTTON_ID);

    if (launcher) {
      launcher.dataset.speaking = speaking ? "true" : "false";
      launcher.textContent = speaking ? "🗣️" : "🔊";
    }

    if (!panel) {
      return;
    }

    const setChecked = function(id, value) {
      const element = panel.querySelector("#" + id);

      if (element) {
        element.checked = Boolean(value);
      }
    };

    const setValue = function(id, value) {
      const element = panel.querySelector("#" + id);

      if (element) {
        element.value = String(value);
      }
    };

    const setText = function(id, value) {
      const element = panel.querySelector("#" + id);

      if (element) {
        element.textContent = String(value);
      }
    };

    setChecked("agvVoiceEnabled", settings.enabled);
    setChecked("agvVoiceAutoSpeak", settings.autoSpeak);
    setChecked("agvVoiceInterrupt", settings.interrupt);
    setValue("agvVoiceProfile", settings.profile);
    setValue("agvVoiceSelect", settings.voiceURI);
    setValue("agvVoiceRate", settings.rate);
    setValue("agvVoicePitch", settings.pitch);
    setValue("agvVoiceVolume", settings.volume);
    setText("agvVoiceRateValue", Number(settings.rate).toFixed(2));
    setText("agvVoicePitchValue", Number(settings.pitch).toFixed(2));
    setText(
      "agvVoiceVolumeValue",
      Number(settings.volume).toFixed(2)
    );

    setText(
      "agvVoiceStatus",
      !supported()
        ? "Speech synthesis is unavailable in this browser."
        : speaking
          ? paused
            ? "Speech paused"
            : "Speaking"
          : "Ready"
    );
  }

  const service = {
    version: "1.0.0",
    supported: supported,
    initialize: function() {
      ensureInterface();
      loadVoices();
      return service;
    },
    speak: speak,
    stop: stop,
    pause: pause,
    resume: resume,
    repeat: repeat,
    readSelection: readSelection,
    loadVoices: loadVoices,
    getVoices: function() {
      return voices.slice();
    },
    getSettings: getSettings,
    setSetting: setSetting,
    setVoice: setVoice,
    setProfile: setProfile,
    open: function() {
      const panel = ensureInterface();

      if (panel) {
        panel.classList.add("isOpen");
      }
    },
    close: function() {
      const panel = document.getElementById(PANEL_ID);

      if (panel) {
        panel.classList.remove("isOpen");
      }
    }
  };

  window.AGVVoiceService = service;

  if (supported()) {
    window.speechSynthesis.addEventListener(
      "voiceschanged",
      loadVoices
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      function() {
        service.initialize();
      },
      { once: true }
    );
  } else {
    service.initialize();
  }

  window.addEventListener("beforeunload", stop);
})(window, document);
