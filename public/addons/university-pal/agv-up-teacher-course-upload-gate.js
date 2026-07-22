/*
  PASS_AGV_UP_TEACHER_COURSE_UPLOAD_GATE_1A

  Teacher-only Course Upload launcher and direct-page gate.

  This uses the current AGV University Pal role layer:
    localStorage key: agvUniversityPalRoleMode
    allowed role: instructor

  No credentials, passwords, service keys, or Super Admin settings
  are stored in this file.
*/

(function(){
  "use strict";

  const ROLE_KEY =
    "agvUniversityPalRoleMode";

  const TEACHER_ROLE =
    "instructor";

  const GRANT_KEY =
    "agvUniversityPalTeacherUploadGrant";

  const SESSION_KEY =
    "agvUniversityPalTeacherUploadSession";

  const UNIVERSITY_PAL_PATH =
    "/addons/university-pal/agv-university-pal.html";

  const COURSE_UPLOAD_PATH =
    "/addons/university-pal/agv-university-pal-course-upload.html";

  const GRANT_LIFETIME_MS =
    2 * 60 * 1000;

  const SESSION_LIFETIME_MS =
    8 * 60 * 60 * 1000;

  function safeParse(value){
    try {
      return JSON.parse(value);
    } catch (error) {
      return null;
    }
  }

  function currentRole(){
    return String(
      localStorage.getItem(ROLE_KEY) || ""
    ).trim();
  }

  function isTeacher(){
    return currentRole() === TEACHER_ROLE;
  }

  function createNonce(){
    if (
      window.crypto &&
      typeof window.crypto.randomUUID ===
        "function"
    ) {
      return window.crypto.randomUUID();
    }

    const randomPart =
      Math.random().toString(36).slice(2);

    return (
      Date.now().toString(36) +
      "-" +
      randomPart
    );
  }

  function openTeacherCourseUpload(){
    if (!isTeacher()) {
      window.alert(
        "Teacher access required. Select Instructor / Trainer mode."
      );

      return;
    }

    const nonce = createNonce();

    localStorage.setItem(
      GRANT_KEY,
      JSON.stringify({
        nonce:nonce,
        role:TEACHER_ROLE,
        expiresAt:
          Date.now() +
          GRANT_LIFETIME_MS
      })
    );

    const destination =
      new URL(
        COURSE_UPLOAD_PATH,
        window.location.origin
      );

    destination.searchParams.set(
      "agvTeacherGrant",
      nonce
    );

    window.open(
      destination.toString(),
      "_blank",
      "noopener,noreferrer"
    );
  }

  function syncTeacherLauncher(button){
    const allowed = isTeacher();

    button.style.display =
      allowed
        ? ""
        : "none";

    button.disabled = !allowed;

    button.setAttribute(
      "aria-hidden",
      allowed
        ? "false"
        : "true"
    );
  }

  function mountTeacherLauncher(){
    const status =
      document.getElementById(
        "roleModeStatus"
      );

    if (!status) {
      return;
    }

    let button =
      document.getElementById(
        "agvUpTeacherCourseUploadBtn"
      );

    if (!button) {
      button =
        document.createElement("button");

      button.id =
        "agvUpTeacherCourseUploadBtn";

      button.type = "button";
      button.className = "wide blue";

      button.textContent =
        "Open Teacher Course Upload";

      button.style.marginTop = "12px";

      button.addEventListener(
        "click",
        openTeacherCourseUpload
      );

      status.insertAdjacentElement(
        "afterend",
        button
      );
    }

    syncTeacherLauncher(button);

    const roleSelect =
      document.getElementById(
        "roleModeSelect"
      );

    if (roleSelect) {
      roleSelect.addEventListener(
        "change",
        function(){
          window.setTimeout(
            function(){
              syncTeacherLauncher(button);
            },
            0
          );
        }
      );
    }

    const observer =
      new MutationObserver(
        function(){
          syncTeacherLauncher(button);
        }
      );

    observer.observe(
      status,
      {
        childList:true,
        subtree:true,
        characterData:true
      }
    );

    window.addEventListener(
      "storage",
      function(event){
        if (event.key === ROLE_KEY) {
          syncTeacherLauncher(button);
        }
      }
    );
  }

  function allowExistingSession(){
    const session =
      safeParse(
        sessionStorage.getItem(
          SESSION_KEY
        )
      );

    return Boolean(
      isTeacher() &&
      session &&
      session.role === TEACHER_ROLE &&
      Number(session.expiresAt || 0) >
        Date.now()
    );
  }

  function consumeTeacherGrant(){
    if (!isTeacher()) {
      return false;
    }

    const params =
      new URL(
        window.location.href
      ).searchParams;

    const requestedNonce =
      params.get("agvTeacherGrant");

    if (!requestedNonce) {
      return false;
    }

    const grant =
      safeParse(
        localStorage.getItem(
          GRANT_KEY
        )
      );

    const valid = Boolean(
      grant &&
      grant.role === TEACHER_ROLE &&
      grant.nonce === requestedNonce &&
      Number(grant.expiresAt || 0) >
        Date.now()
    );

    localStorage.removeItem(
      GRANT_KEY
    );

    if (!valid) {
      return false;
    }

    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        role:TEACHER_ROLE,
        expiresAt:
          Date.now() +
          SESSION_LIFETIME_MS
      })
    );

    window.history.replaceState(
      {},
      document.title,
      COURSE_UPLOAD_PATH
    );

    return true;
  }

  function renderTeacherAccessRequired(){
    const blockingStyle =
      document.getElementById(
        "agvUpTeacherBlockingStyle"
      );

    if (blockingStyle) {
      blockingStyle.remove();
    }

    document.body.innerHTML = `
      <main style="
        min-height:100vh;
        display:flex;
        align-items:center;
        justify-content:center;
        padding:24px;
        background:
          radial-gradient(
            circle at 12% 8%,
            rgba(255,159,28,.18),
            transparent 30%
          ),
          linear-gradient(
            145deg,
            #0b121e,
            #172136
          );
        color:#f8fafc;
        font-family:
          Inter,
          ui-sans-serif,
          system-ui,
          sans-serif;
      ">
        <section style="
          width:min(560px,100%);
          padding:28px;
          border:1px solid rgba(246,200,76,.42);
          border-radius:22px;
          background:rgba(15,23,35,.96);
          box-shadow:0 20px 60px rgba(0,0,0,.35);
          text-align:center;
        ">
          <div style="
            display:inline-flex;
            padding:6px 11px;
            border-radius:999px;
            background:linear-gradient(
              135deg,
              #f6c84c,
              #ff9f1c
            );
            color:#111827;
            font-size:12px;
            font-weight:900;
          ">
            AGV University Pal
          </div>

          <h1 style="
            margin:18px 0 8px;
            font-size:30px;
          ">
            Teacher Access Required
          </h1>

          <p style="
            margin:0 auto 22px;
            max-width:430px;
            color:#a8b4c7;
            line-height:1.65;
          ">
            Course Upload is available only to an
            Instructor / Trainer who opens it from
            AGV University Pal.
          </p>

          <a
            href="${UNIVERSITY_PAL_PATH}"
            style="
              display:inline-flex;
              align-items:center;
              justify-content:center;
              min-height:46px;
              padding:10px 18px;
              border-radius:11px;
              background:linear-gradient(
                135deg,
                #5b93ff,
                #2f6fed
              );
              color:#ffffff;
              font-weight:900;
              text-decoration:none;
            "
          >
            Return to AGV University Pal
          </a>

          <p style="
            margin:18px 0 0;
            color:#86efac;
            font-size:12px;
            font-weight:800;
          ">
            Protected by AGV Sentinel
          </p>
        </section>
      </main>
    `;
  }

  function blockCourseUpload(){
    document.documentElement.setAttribute(
      "data-agv-teacher-access",
      "denied"
    );

    const style =
      document.createElement("style");

    style.id =
      "agvUpTeacherBlockingStyle";

    style.textContent =
      "body{display:none!important;}";

    document.head.appendChild(style);

    if (
      document.readyState ===
      "loading"
    ) {
      document.addEventListener(
        "DOMContentLoaded",
        renderTeacherAccessRequired,
        {
          once:true
        }
      );
    } else {
      renderTeacherAccessRequired();
    }
  }

  const currentPath =
    window.location.pathname
      .toLowerCase();

  if (
    currentPath.endsWith(
      COURSE_UPLOAD_PATH.toLowerCase()
    )
  ) {
    const allowed =
      allowExistingSession() ||
      consumeTeacherGrant();

    if (allowed) {
      document.documentElement.setAttribute(
        "data-agv-teacher-access",
        "allowed"
      );

      window.addEventListener(
        "storage",
        function(event){
          if (
            event.key === ROLE_KEY &&
            !isTeacher()
          ) {
            sessionStorage.removeItem(
              SESSION_KEY
            );

            window.location.reload();
          }
        }
      );
    } else {
      blockCourseUpload();
    }

    return;
  }

  if (
    currentPath.endsWith(
      UNIVERSITY_PAL_PATH.toLowerCase()
    )
  ) {
    if (
      document.readyState ===
      "loading"
    ) {
      document.addEventListener(
        "DOMContentLoaded",
        mountTeacherLauncher,
        {
          once:true
        }
      );
    } else {
      mountTeacherLauncher();
    }
  }
})();
/*
  PASS_AGV_UP_TEACHER_UPLOAD_TAB_1D

  Adds a teacher-only Course Upload tab to AGV University Pal.
  Clicking the tab opens the clean Course Upload application.

  The previous automatic redirect is intentionally removed.
*/

(function(){
  "use strict";

  const ROLE_KEY =
    "agvUniversityPalRoleMode";

  const TEACHER_ROLE =
    "instructor";

  const GRANT_KEY =
    "agvUniversityPalTeacherUploadGrant";

  const UNIVERSITY_PAL_PATH =
    "/addons/university-pal/agv-university-pal.html";

  const COURSE_UPLOAD_PATH =
    "/addons/university-pal/agv-university-pal-course-upload.html";

  const TAB_ID =
    "agvUpTeacherCourseUploadTab";

  function currentRole(){
    return String(
      localStorage.getItem(ROLE_KEY) || ""
    ).trim();
  }

  function isTeacher(){
    return currentRole() === TEACHER_ROLE;
  }

  function createNonce(){
    if (
      window.crypto &&
      typeof window.crypto.randomUUID ===
        "function"
    ) {
      return window.crypto.randomUUID();
    }

    return (
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2)
    );
  }

  function openCourseUpload(event){
    if (event) {
      event.preventDefault();
      event.stopPropagation();

      if (
        typeof event.stopImmediatePropagation ===
          "function"
      ) {
        event.stopImmediatePropagation();
      }
    }

    if (!isTeacher()) {
      window.alert(
        "Teacher access required."
      );

      return;
    }

    const nonce = createNonce();

    localStorage.setItem(
      GRANT_KEY,
      JSON.stringify({
        nonce:nonce,
        role:TEACHER_ROLE,
        expiresAt:
          Date.now() +
          (2 * 60 * 1000)
      })
    );

    const destination =
      new URL(
        COURSE_UPLOAD_PATH,
        window.location.origin
      );

    destination.searchParams.set(
      "agvTeacherGrant",
      nonce
    );

    destination.searchParams.set(
      "openedFromTeacherTab",
      "1"
    );

    window.location.assign(
      destination.toString()
    );
  }

  function findTabContainer(){
    const workspaceTab =
      document.querySelector(
        '.tab[data-tab="workspaceView"]'
      );

    if (workspaceTab?.parentElement) {
      return {
        container:workspaceTab.parentElement,
        workspaceTab:workspaceTab
      };
    }

    const firstTab =
      document.querySelector(
        ".tab[data-tab]"
      );

    return {
      container:firstTab?.parentElement || null,
      workspaceTab:null
    };
  }

  function createTeacherTab(){
    let tab =
      document.getElementById(
        TAB_ID
      );

    if (tab) {
      return tab;
    }

    const tabLocation =
      findTabContainer();

    if (!tabLocation.container) {
      return null;
    }

    tab =
      document.createElement("button");

    tab.id = TAB_ID;
    tab.type = "button";
    tab.className = "tab";

    tab.setAttribute(
      "data-agv-teacher-upload-tab",
      "true"
    );

    tab.textContent =
      "Teacher Course Upload";

    tab.addEventListener(
      "click",
      openCourseUpload,
      true
    );

    if (
      tabLocation.workspaceTab &&
      tabLocation.workspaceTab.nextSibling
    ) {
      tabLocation.container.insertBefore(
        tab,
        tabLocation.workspaceTab.nextSibling
      );
    } else {
      tabLocation.container.appendChild(
        tab
      );
    }

    return tab;
  }

  function removeSeparateLauncher(){
    const launcher =
      document.getElementById(
        "agvUpTeacherCourseUploadBtn"
      );

    if (launcher) {
      launcher.remove();
    }
  }

  /*
    PASS_AGV_UP_TEACHER_NAVIGATION_FIX_1E

    When Instructor mode is selected while the legacy workspace is
    active, immediately move to the first available normal tab.
  */

  function moveTeacherAwayFromLegacyWorkspace(){
    const workspace =
      document.getElementById(
        "workspaceView"
      );

    if (
      !workspace ||
      !workspace.classList.contains(
        "active"
      )
    ) {
      return;
    }

    const nextTab =
      Array.from(
        document.querySelectorAll(
          ".tab[data-tab]"
        )
      ).find(function(button){
        return (
          button.dataset.tab !==
            "workspaceView" &&
          !button.disabled &&
          window.getComputedStyle(
            button
          ).display !== "none"
        );
      });

    if (nextTab) {
      nextTab.click();
      return;
    }

    workspace.classList.remove(
      "active"
    );

    workspace.style.display =
      "none";
  }
  function syncTeacherTab(){
    const teacher =
      isTeacher();

    const tab =
      createTeacherTab();

    const workspaceTab =
      document.querySelector(
        '.tab[data-tab="workspaceView"]'
      );

    removeSeparateLauncher();

    if (tab) {
      tab.style.setProperty(
        "display",
        teacher
          ? ""
          : "none",
        "important"
      );

      tab.disabled = !teacher;

      tab.setAttribute(
        "aria-hidden",
        teacher
          ? "false"
          : "true"
      );
    }

    if (workspaceTab) {
      if (teacher) {
        workspaceTab.style.setProperty(
          "display",
          "none",
          "important"
        );

        workspaceTab.setAttribute(
          "aria-hidden",
          "true"
        );

        moveTeacherAwayFromLegacyWorkspace();
      } else {
        workspaceTab.style.removeProperty(
          "display"
        );

        workspaceTab.removeAttribute(
          "aria-hidden"
        );
      }
    }
  }

  function initializeTeacherTab(){
    syncTeacherTab();

    const roleSelect =
      document.getElementById(
        "roleModeSelect"
      );

    if (roleSelect) {
      roleSelect.addEventListener(
        "change",
        function(){
          window.setTimeout(
            syncTeacherTab,
            0
          );

          window.setTimeout(
            syncTeacherTab,
            150
          );

          window.setTimeout(
            syncTeacherTab,
            500
          );
        }
      );
    }

    const roleStatus =
      document.getElementById(
        "roleModeStatus"
      );

    if (roleStatus) {
      const observer =
        new MutationObserver(
          syncTeacherTab
        );

      observer.observe(
        roleStatus,
        {
          childList:true,
          subtree:true,
          characterData:true
        }
      );
    }

    window.addEventListener(
      "storage",
      function(event){
        if (event.key === ROLE_KEY) {
          syncTeacherTab();
        }
      }
    );

    window.setTimeout(
      syncTeacherTab,
      250
    );

    window.setTimeout(
      syncTeacherTab,
      900
    );
  }

  const currentPath =
    window.location.pathname
      .toLowerCase();

  if (
    !currentPath.endsWith(
      UNIVERSITY_PAL_PATH.toLowerCase()
    )
  ) {
    return;
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      initializeTeacherTab,
      {
        once:true
      }
    );
  } else {
    initializeTeacherTab();
  }
})();
/*
  PASS_AGV_UP_REMOVE_COURSE_WORKSPACE_1F

  Permanently removes the unused Course Workspace tab and view
  from the visible AGV University Pal interface.

  The Teacher Course Upload tab remains available to instructors.
*/

(function(){
  "use strict";

  const WORKSPACE_VIEW_ID =
    "workspaceView";

  const WORKSPACE_LABEL =
    "Course Workspace";

  let removalScheduled = false;

  function normalizeText(value){
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function isCourseWorkspaceTab(element){
    return (
      element?.dataset?.tab ===
        WORKSPACE_VIEW_ID
    );
  }

  function firstAvailableTab(){
    return Array.from(
      document.querySelectorAll(
        ".tab[data-tab]"
      )
    ).find(function(tab){
      return (
        !isCourseWorkspaceTab(tab) &&
        !tab.disabled &&
        window.getComputedStyle(tab)
          .display !== "none"
      );
    });
  }

  function removeCourseWorkspace(){
    removalScheduled = false;

    const workspace =
      document.getElementById(
        WORKSPACE_VIEW_ID
      );

    const workspaceWasActive =
      Boolean(
        workspace &&
        workspace.classList.contains(
          "active"
        )
      );

    const workspaceTabs =
      Array.from(
        document.querySelectorAll(
          ".tab, button"
        )
      ).filter(
        isCourseWorkspaceTab
      );

    const tabWasActive =
      workspaceTabs.some(function(tab){
        return (
          tab.classList.contains(
            "active"
          ) ||
          tab.getAttribute(
            "aria-selected"
          ) === "true"
        );
      });

    workspaceTabs.forEach(function(tab){
      tab.remove();
    });

    if (workspace) {
      workspace.classList.remove(
        "active"
      );

      workspace.hidden = true;

      workspace.setAttribute(
        "aria-hidden",
        "true"
      );

      workspace.style.setProperty(
        "display",
        "none",
        "important"
      );
    }

    if (
      workspaceWasActive ||
      tabWasActive
    ) {
      const replacementTab =
        firstAvailableTab();

      if (replacementTab) {
        replacementTab.click();
      }
    }
  }

  function scheduleRemoval(){
    if (removalScheduled) {
      return;
    }

    removalScheduled = true;

    window.requestAnimationFrame(
      removeCourseWorkspace
    );
  }

  function installPermanentHideStyle(){
    if (
      document.getElementById(
        "agvUpRemoveCourseWorkspaceStyle"
      )
    ) {
      return;
    }

    const style =
      document.createElement("style");

    style.id =
      "agvUpRemoveCourseWorkspaceStyle";

    style.textContent = `
      .tab[data-tab="workspaceView"],
      #workspaceView {
        display:none !important;
      }
    `;

    document.head.appendChild(style);
  }

  function initializeRemoval(){
    installPermanentHideStyle();
    removeCourseWorkspace();

    const observer =
      new MutationObserver(
        scheduleRemoval
      );

    observer.observe(
      document.body,
      {
        childList:true,
        subtree:true
      }
    );

    window.setTimeout(
      removeCourseWorkspace,
      100
    );

    window.setTimeout(
      removeCourseWorkspace,
      500
    );

    window.setTimeout(
      removeCourseWorkspace,
      1200
    );
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      initializeRemoval,
      {
        once:true
      }
    );
  } else {
    initializeRemoval();
  }
})();
/*
  PASS_AGV_UP_STUDENT_COURSE_WORKSPACE_2A

  Adds a student-only Course Workspace tab.
  The old workspace remains removed.
  The new tab opens a clean student receiving page.
*/

(function(){
  "use strict";

  const ROLE_KEY =
    "agvUniversityPalRoleMode";

  const STUDENT_ROLE =
    "student";

  const TAB_ID =
    "agvUpStudentCourseWorkspaceTab";

  const WORKSPACE_PATH =
    "/addons/university-pal/agv-university-pal-student-workspace.html";

  function isStudent(){
    return (
      String(
        localStorage.getItem(
          ROLE_KEY
        ) || ""
      ).trim() === STUDENT_ROLE
    );
  }

  function findTabContainer(){
    const tabs =
      document.querySelector(
        ".tabs.noPrint"
      );

    if (tabs) {
      return tabs;
    }

    const firstTab =
      document.querySelector(
        ".tab[data-tab]"
      );

    return firstTab?.parentElement || null;
  }

  function openWorkspace(event){
    event?.preventDefault();
    event?.stopPropagation();

    if (
      typeof event?.stopImmediatePropagation ===
        "function"
    ) {
      event.stopImmediatePropagation();
    }

    if (!isStudent()) {
      window.alert(
        "Student access required."
      );

      return;
    }

    window.location.assign(
      WORKSPACE_PATH +
      "?openedFromStudentTab=1"
    );
  }

  function ensureTab(){
    let tab =
      document.getElementById(
        TAB_ID
      );

    if (tab) {
      return tab;
    }

    const container =
      findTabContainer();

    if (!container) {
      return null;
    }

    tab =
      document.createElement(
        "button"
      );

    tab.id = TAB_ID;
    tab.type = "button";
    tab.className = "tab";
    tab.textContent =
      "Course Workspace";

    tab.setAttribute(
      "data-agv-student-workspace-tab",
      "true"
    );

    tab.addEventListener(
      "click",
      openWorkspace,
      true
    );

    container.appendChild(tab);

    return tab;
  }

  function syncTab(){
    const tab =
      ensureTab();

    if (!tab) {
      return;
    }

    const allowed =
      isStudent();

    tab.style.setProperty(
      "display",
      allowed ? "" : "none",
      "important"
    );

    tab.disabled = !allowed;

    tab.setAttribute(
      "aria-hidden",
      allowed ? "false" : "true"
    );
  }

  function initialize(){
    syncTab();

    const roleSelect =
      document.getElementById(
        "roleModeSelect"
      );

    if (roleSelect) {
      roleSelect.addEventListener(
        "change",
        function(){
          window.setTimeout(
            syncTab,
            0
          );

          window.setTimeout(
            syncTab,
            150
          );

          window.setTimeout(
            syncTab,
            500
          );
        }
      );
    }

    const roleStatus =
      document.getElementById(
        "roleModeStatus"
      );

    if (roleStatus) {
      new MutationObserver(
        syncTab
      ).observe(
        roleStatus,
        {
          childList:true,
          subtree:true,
          characterData:true
        }
      );
    }

    window.addEventListener(
      "storage",
      function(event){
        if (event.key === ROLE_KEY) {
          syncTab();
        }
      }
    );

    window.setTimeout(
      syncTab,
      250
    );

    window.setTimeout(
      syncTab,
      900
    );
  }

  if (
    document.readyState === "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      initialize,
      {
        once:true
      }
    );
  } else {
    initialize();
  }
})();