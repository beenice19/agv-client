/*
  PASS_AGV_UP_STUDENT_COURSE_WORKSPACE_LOGIC_2A

  Student-only enrolled-class workspace.

  Reads:
    agvUniversityPalPass2
    agvUniversityPalStudentHandoutKeys
    agvUniversityPalSupabaseSettings
    agvUniversityPalResourceApiBase

  Public resource reads never use the private handout edit token.
*/

(function(){
  "use strict";

  const ROLE_KEY =
    "agvUniversityPalRoleMode";

  const STUDENT_ROLE =
    "student";

  const DATA_KEY =
    "agvUniversityPalPass2";

  const HANDOUT_KEYS_KEY =
    "agvUniversityPalStudentHandoutKeys";

  const SUPABASE_SETTINGS_KEY =
    "agvUniversityPalSupabaseSettings";

  const RESOURCE_API_KEY =
    "agvUniversityPalResourceApiBase";

  const UNIVERSITY_PAL_PATH =
    "/addons/university-pal/agv-university-pal.html";

  function byId(id){
    return document.getElementById(id);
  }

  function text(value){
    return String(value == null ? "" : value).trim();
  }

  function escapeHtml(value){
    return text(value)
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#039;");
  }

  function readJson(key,fallback){
    try {
      const parsed =
        JSON.parse(
          localStorage.getItem(key) || ""
        );

      return parsed == null
        ? fallback
        : parsed;
    } catch(error) {
      return fallback;
    }
  }

  function safeUrl(value){
    try {
      const parsed =
        new URL(
          text(value),
          window.location.origin
        );

      return (
        parsed.protocol === "http:" ||
        parsed.protocol === "https:"
      )
        ? parsed.toString()
        : "";
    } catch(error) {
      return "";
    }
  }

  function resourceApiBase(){
    const stored =
      text(
        localStorage.getItem(
          RESOURCE_API_KEY
        )
      );

    if (stored) {
      return stored.replace(/\/+$/,"");
    }

    if (
      window.location.hostname ===
        "127.0.0.1" ||
      window.location.hostname ===
        "localhost"
    ) {
      return "http://127.0.0.1:8802";
    }

    return "";
  }

  function activeStudent(data){
    const students =
      Array.isArray(data?.students)
        ? data.students
        : [];

    return (
      students.find(function(student){
        return (
          text(student?.id) ===
          text(data?.activeStudentId)
        );
      }) ||
      students[0] ||
      null
    );
  }

  function registeredCourses(data,student){
    const registrations =
      Array.isArray(data?.registrations)
        ? data.registrations
        : [];

    const classes =
      Array.isArray(data?.classes)
        ? data.classes
        : [];

    return registrations
      .filter(function(registration){
        return (
          text(registration?.studentId) ===
            text(student?.id) &&
          text(registration?.status)
            .toLowerCase() !==
            "withdrawn"
        );
      })
      .map(function(registration){
        const course =
          classes.find(function(item){
            return (
              text(item?.id) ===
              text(registration?.classId)
            );
          });

        return {
          registration,
          course:
            course || {
              id:
                registration.classId,
              className:
                registration.className,
              classCode:
                registration.classCode,
              instructor:
                registration.instructor,
              programType:
                registration.programType
            }
        };
      })
      .sort(function(left,right){
        return text(
          left.course?.className
        ).localeCompare(
          text(right.course?.className),
          undefined,
          {
            sensitivity:"base"
          }
        );
      });
  }

  function handoutKeys(){
    const keys =
      readJson(
        HANDOUT_KEYS_KEY,
        {}
      );

    return (
      keys &&
      typeof keys === "object" &&
      !Array.isArray(keys)
    )
      ? keys
      : {};
  }

  function buildHandoutLink(
    publicToken,
    apiBase
  ){
    const settings =
      readJson(
        SUPABASE_SETTINGS_KEY,
        {}
      );

    if (
      !publicToken ||
      !text(settings?.url) ||
      !text(settings?.anonKey)
    ) {
      return "";
    }

    const destination =
      new URL(
        UNIVERSITY_PAL_PATH,
        window.location.origin
      );

    const hash =
      new URLSearchParams();

    hash.set(
      "agvUpHandout",
      publicToken
    );

    hash.set(
      "agvUpSbUrl",
      text(settings.url)
    );

    hash.set(
      "agvUpSbKey",
      text(settings.anonKey)
    );

    if (apiBase) {
      hash.set(
        "agvUpResourceApi",
        apiBase
      );
    }

    destination.hash =
      hash.toString();

    return destination.toString();
  }

  async function loadResources(
    publicToken,
    apiBase
  ){
    if (!publicToken) {
      return {
        resources:[],
        error:
          "The teacher has not published course materials yet."
      };
    }

    if (!apiBase) {
      return {
        resources:[],
        error:
          "The University Pal Resource Server URL is not configured on this device."
      };
    }

    try {
      const response =
        await fetch(
          apiBase +
          "/api/university-pal/resources/public/" +
          encodeURIComponent(
            publicToken
          )
        );

      const result =
        await response.json()
          .catch(function(){
            return null;
          });

      if (
        !response.ok ||
        !result ||
        result.ok !== true
      ) {
        throw new Error(
          result?.error ||
          "Course resources could not be loaded."
        );
      }

      return {
        resources:
          Array.isArray(result.resources)
            ? result.resources
            : [],
        handoutTitle:
          text(result.handoutTitle),
        error:""
      };
    } catch(error) {
      return {
        resources:[],
        error:
          error?.message ||
          "Course resources could not be loaded."
      };
    }
  }

  function resourceButtonLabel(resource){
    const mode =
      text(
        resource?.displayMode ||
        resource?.display_mode
      ).toLowerCase();

    if (mode === "video") {
      return "Watch";
    }

    if (mode === "download") {
      return "Download";
    }

    return "Open";
  }

  function resourceMarkup(resource){
    const accessUrl =
      safeUrl(
        resource?.accessUrl ||
        resource?.externalUrl ||
        resource?.external_url
      );

    const title =
      text(resource?.title) ||
      text(resource?.originalFileName) ||
      "Course Resource";

    const category =
      text(resource?.category);

    const description =
      text(resource?.description);

    return (
      '<article class="resourceItem">' +
        '<div class="resourceTitle">' +
          escapeHtml(title) +
        '</div>' +
        (
          category
            ? (
                '<div class="resourceMeta">' +
                  escapeHtml(category) +
                '</div>'
              )
            : ""
        ) +
        (
          description
            ? (
                '<div class="resourceDescription">' +
                  escapeHtml(description) +
                '</div>'
              )
            : ""
        ) +
        (
          accessUrl
            ? (
                '<a class="resourceAction" ' +
                'target="_blank" ' +
                'rel="noopener noreferrer" ' +
                'href="' +
                escapeHtml(accessUrl) +
                '">' +
                  escapeHtml(
                    resourceButtonLabel(resource)
                  ) +
                '</a>'
              )
            : (
                '<div class="resourceDescription">' +
                  'This resource does not currently have an access link.' +
                '</div>'
              )
        ) +
      '</article>'
    );
  }

  async function renderCourse(
    container,
    item,
    keys,
    apiBase
  ){
    const registration =
      item.registration || {};

    const course =
      item.course || {};

    const courseId =
      text(
        course.id ||
        registration.classId
      );

    const courseKeys =
      keys[courseId] || {};

    const publicToken =
      text(courseKeys.publicToken);

    const handoutLink =
      buildHandoutLink(
        publicToken,
        apiBase
      );

    const card =
      document.createElement(
        "article"
      );

    card.className =
      "courseCard";

    card.innerHTML =
      '<div class="courseHeader">' +
        '<div>' +
          '<div class="courseCode">' +
            escapeHtml(
              course.classCode ||
              registration.classCode ||
              "AGV COURSE"
            ) +
          '</div>' +
          '<h2>' +
            escapeHtml(
              course.className ||
              registration.className ||
              "Registered Course"
            ) +
          '</h2>' +
          '<div class="courseMeta">' +
            (
              text(
                course.instructor ||
                registration.instructor
              )
                ? (
                    "Instructor: " +
                    escapeHtml(
                      course.instructor ||
                      registration.instructor
                    )
                  )
                : "Instructor information pending"
            ) +
          '</div>' +
        '</div>' +
        '<span class="statusBadge">' +
          escapeHtml(
            registration.completionStatus ||
            registration.status ||
            "Registered"
          ) +
        '</span>' +
      '</div>' +
      '<div class="courseActions"></div>' +
      '<div class="resourceSection">' +
        '<h3>Handouts and Student Resources</h3>' +
        '<div class="resourceBody">' +
          'Loading materials…' +
        '</div>' +
      '</div>';

    container.appendChild(card);

    const actions =
      card.querySelector(
        ".courseActions"
      );

    if (handoutLink && actions) {
      actions.insertAdjacentHTML(
        "beforeend",
        '<a class="actionButton" ' +
        'target="_blank" ' +
        'rel="noopener noreferrer" ' +
        'href="' +
        escapeHtml(handoutLink) +
        '">' +
          'Open Course Handout' +
        '</a>'
      );
    }

    const resourceBody =
      card.querySelector(
        ".resourceBody"
      );

    const result =
      await loadResources(
        publicToken,
        apiBase
      );

    if (!resourceBody) {
      return;
    }

    if (result.resources.length) {
      resourceBody.innerHTML =
        result.resources
          .map(resourceMarkup)
          .join("");

      return;
    }

    resourceBody.innerHTML =
      '<div class="notice">' +
        escapeHtml(
          result.error ||
          "No student resources have been published for this course yet."
        ) +
      '</div>';
  }

  /*
    PASS_AGV_UP_AUTOMATIC_STUDENT_LINK_2C

    Allows a permanent Course Workspace share link to load its
    published resources on another device.

    The public token is an unguessable bearer link.
    Individual private-file access URLs are freshly signed by SERVER.
  */

  function sharedPublicToken(){
    const parameters =
      new URLSearchParams(
        window.location.search
      );

    const token =
      text(
        parameters.get(
          "publicToken"
        )
      );

    return (
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        .test(token)
    )
      ? token
      : "";
  }

  async function renderSharedWorkspace(
    publicToken
  ){
    const accessMessage =
      byId("accessMessage");

    const emptyMessage =
      byId("emptyMessage");

    const list =
      byId("courseList");

    const summary =
      byId("studentSummary");

    if (list) {
      list.innerHTML = "";
    }

    if (accessMessage) {
      accessMessage.hidden = true;
    }

    if (emptyMessage) {
      emptyMessage.hidden = true;
    }

    if (!resourceApiBase()) {
      if (accessMessage) {
        accessMessage.hidden = false;
        accessMessage.textContent =
          "The University Pal Resource Server URL is not configured for this Course Workspace link.";
      }

      return;
    }

    try {
      const response =
        await fetch(
          resourceApiBase() +
          "/api/university-pal/resources/public/" +
          encodeURIComponent(
            publicToken
          )
        );

      const result =
        await response.json()
          .catch(function(){
            return null;
          });

      if (
        !response.ok ||
        !result ||
        result.ok !== true
      ) {
        throw new Error(
          result?.error ||
          "This Course Workspace link is unavailable."
        );
      }

      const resources =
        Array.isArray(result.resources)
          ? result.resources
          : [];

      if (summary) {
        summary.hidden = false;
      }

      if (byId("studentName")) {
        byId("studentName").textContent =
          text(result.courseName) ||
          "AGV University Pal Course";
      }

      if (byId("studentEmail")) {
        byId("studentEmail").textContent =
          text(result.handoutTitle) ||
          "Shared Student Course Workspace";
      }

      if (byId("registrationCount")) {
        byId("registrationCount").textContent =
          resources.length +
          (
            resources.length === 1
              ? " student resource"
              : " student resources"
          );
      }

      if (!list) {
        return;
      }

      const card =
        document.createElement(
          "article"
        );

      card.className =
        "courseCard";

      card.innerHTML =
        '<div class="courseHeader">' +
          '<div>' +
            '<div class="courseCode">' +
              'AGV UNIVERSITY PAL' +
            '</div>' +
            '<h2>' +
              escapeHtml(
                result.courseName ||
                "Course Workspace"
              ) +
            '</h2>' +
            '<div class="courseMeta">' +
              escapeHtml(
                result.handoutTitle ||
                "Student Resources"
              ) +
            '</div>' +
          '</div>' +
          '<span class="statusBadge">' +
            'Available' +
          '</span>' +
        '</div>' +
        '<div class="resourceSection">' +
          '<h3>Handouts and Student Resources</h3>' +
          '<div class="resourceBody"></div>' +
        '</div>';

      list.appendChild(card);

      const body =
        card.querySelector(
          ".resourceBody"
        );

      if (!body) {
        return;
      }

      if (resources.length) {
        body.innerHTML =
          resources
            .map(resourceMarkup)
            .join("");
      } else {
        body.innerHTML =
          '<div class="notice">' +
            'The teacher has not uploaded any visible files or links yet.' +
          '</div>';
      }
    } catch(error) {
      if (accessMessage) {
        accessMessage.hidden = false;
        accessMessage.textContent =
          error?.message ||
          "This Course Workspace link could not be opened.";
      }
    }
  }

  async function renderWorkspace(){
    const publicToken =
      sharedPublicToken();

    if (publicToken) {
      await renderSharedWorkspace(
        publicToken
      );

      return;
    }

    const role =
      text(
        localStorage.getItem(
          ROLE_KEY
        )
      );

    const accessMessage =
      byId("accessMessage");

    const emptyMessage =
      byId("emptyMessage");

    const list =
      byId("courseList");

    const summary =
      byId("studentSummary");

    if (list) {
      list.innerHTML = "";
    }

    if (accessMessage) {
      accessMessage.hidden = true;
    }

    if (emptyMessage) {
      emptyMessage.hidden = true;
    }

    if (summary) {
      summary.hidden = true;
    }

    if (role !== STUDENT_ROLE) {
      if (accessMessage) {
        accessMessage.hidden = false;
        accessMessage.textContent =
          "Student access required. Return to AGV University Pal and select the Student role.";
      }

      return;
    }

    const data =
      readJson(
        DATA_KEY,
        {}
      );

    const student =
      activeStudent(data);

    if (!student) {
      if (emptyMessage) {
        emptyMessage.hidden = false;
        emptyMessage.textContent =
          "No active student record is selected in AGV University Pal.";
      }

      return;
    }

    const courses =
      registeredCourses(
        data,
        student
      );

    if (summary) {
      summary.hidden = false;
    }

    if (byId("studentName")) {
      byId("studentName").textContent =
        [
          student.firstName,
          student.lastName
        ]
          .filter(Boolean)
          .join(" ")
          .trim() ||
        "AGV University Pal Student";
    }

    if (byId("studentEmail")) {
      byId("studentEmail").textContent =
        text(student.email);
    }

    if (byId("registrationCount")) {
      byId("registrationCount").textContent =
        courses.length +
        (
          courses.length === 1
            ? " registered course"
            : " registered courses"
        );
    }

    if (!courses.length) {
      if (emptyMessage) {
        emptyMessage.hidden = false;
        emptyMessage.textContent =
          "This student is not currently registered for a course.";
      }

      return;
    }

    const keys =
      handoutKeys();

    const apiBase =
      resourceApiBase();

    for (const item of courses) {
      await renderCourse(
        list,
        item,
        keys,
        apiBase
      );
    }
  }

  function initialize(){
    const refreshButton =
      byId("refreshWorkspaceBtn");

    if (refreshButton) {
      refreshButton.addEventListener(
        "click",
        renderWorkspace
      );
    }

    window.addEventListener(
      "storage",
      function(event){
        if (
          event.key === DATA_KEY ||
          event.key === HANDOUT_KEYS_KEY ||
          event.key === ROLE_KEY
        ) {
          renderWorkspace();
        }
      }
    );

    window.addEventListener(
      "focus",
      renderWorkspace
    );

    renderWorkspace();
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