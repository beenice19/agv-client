/*
  PASS_AGV_UP_COURSE_WORKSPACE_DELIVERY_2B

  Teacher Course Upload now writes files and approved links to the
  protected University Pal Resource Server.

  Visible resources are received by registered students through
  the Student Course Workspace.
*/

(function(){
  "use strict";

  /*
    PASS_AGV_UP_AUTOMATIC_STUDENT_LINK_2C
  */

  const HANDOUT_KEYS_STORAGE =
    "agvUniversityPalStudentHandoutKeys";

  const UNIVERSITY_PAL_DATA_STORAGE =
    "agvUniversityPalPass2";

  const STUDENT_WORKSPACE_PATH =
    "/addons/university-pal/agv-university-pal-student-workspace.html";

  const SUPABASE_SETTINGS_STORAGE =
    "agvUniversityPalSupabaseSettings";

  const RESOURCE_API_STORAGE =
    "agvUniversityPalResourceApiBase";

  const ROLE_STORAGE =
    "agvUniversityPalRoleMode";

  const TEACHER_ROLE =
    "instructor";

  const SUPABASE_LIBRARY_URL =
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

  const DOCUMENT_LIMIT =
    25 * 1024 * 1024;

  const VIDEO_LIMIT =
    250 * 1024 * 1024;

  let resources = [];

  let workspaceContextPromise =
    null;

  function byId(id){
    return document.getElementById(id);
  }

  function text(value){
    return String(
      value == null ? "" : value
    ).trim();
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

  function agvSessionToken(){
    try {
      return (
        localStorage.getItem(
          "agv_auth_token"
        ) ||
        localStorage.getItem(
          "agv_server_token"
        ) ||
        localStorage.getItem(
          "agvToken"
        ) ||
        localStorage.getItem(
          "token"
        ) ||
        ""
      );
    } catch(error) {
      return "";
    }
  }

  function resourceApiBase(){
    const configured =
      text(
        localStorage.getItem(
          RESOURCE_API_STORAGE
        )
      );

    if (configured) {
      return configured.replace(
        /\/+$/,
        ""
      );
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

  function selectedCourse(){
    const select =
      byId("courseName");

    const option =
      select?.options[
        select.selectedIndex
      ];

    return {
      id:
        text(select?.value),
      name:
        text(
          option?.dataset?.courseName ||
          option?.textContent
        ),
      classCode:
        text(
          option?.dataset?.classCode
        )
    };
  }

  function handoutKeys(courseId){
    const collection =
      readJson(
        HANDOUT_KEYS_STORAGE,
        {}
      );

    return (
      collection &&
      typeof collection === "object"
        ? collection[courseId] || {}
        : {}
    );
  }

  function currentCourseRecord(courseId){
    const data =
      readJson(
        UNIVERSITY_PAL_DATA_STORAGE,
        {}
      );

    const courses =
      Array.isArray(data?.classes)
        ? data.classes
        : [];

    return (
      courses.find(function(course){
        return (
          text(course?.id) ===
          text(courseId)
        );
      }) ||
      null
    );
  }

  function saveHandoutKeys(
    courseId,
    keys
  ){
    const allKeys =
      readJson(
        HANDOUT_KEYS_STORAGE,
        {}
      );

    const collection =
      allKeys &&
      typeof allKeys === "object" &&
      !Array.isArray(allKeys)
        ? allKeys
        : {};

    collection[courseId] =
      keys;

    localStorage.setItem(
      HANDOUT_KEYS_STORAGE,
      JSON.stringify(collection)
    );
  }

  function createUuid(){
    if (
      window.crypto &&
      typeof window.crypto.randomUUID ===
        "function"
    ) {
      return window.crypto.randomUUID();
    }

    return (
      "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"
    ).replace(
      /[xy]/g,
      function(character){
        const random =
          Math.random() * 16 | 0;

        const value =
          character === "x"
            ? random
            : (
                random & 0x3 |
                0x8
              );

        return value.toString(16);
      }
    );
  }

  function createPrivateEditToken(){
    const bytes =
      new Uint8Array(32);

    window.crypto.getRandomValues(
      bytes
    );

    return Array.from(bytes)
      .map(function(value){
        return value
          .toString(16)
          .padStart(2,"0");
      })
      .join("");
  }

  function studentWorkspaceLink(
    publicToken
  ){
    const destination =
      new URL(
        STUDENT_WORKSPACE_PATH,
        window.location.origin
      );

    destination.searchParams.set(
      "publicToken",
      publicToken
    );

    return destination.toString();
  }

  async function copyText(value){
    const cleanValue =
      text(value);

    if (!cleanValue) {
      return false;
    }

    if (
      navigator.clipboard &&
      window.isSecureContext
    ) {
      await navigator.clipboard.writeText(
        cleanValue
      );

      return true;
    }

    const temporary =
      document.createElement(
        "textarea"
      );

    temporary.value =
      cleanValue;

    temporary.style.position =
      "fixed";

    temporary.style.opacity =
      "0";

    document.body.appendChild(
      temporary
    );

    temporary.select();

    const copied =
      document.execCommand("copy");

    temporary.remove();

    return copied;
  }

  function showStudentWorkspaceLink(
    context
  ){
    const publicToken =
      text(
        context?.keys?.publicToken
      );

    if (!publicToken) {
      return;
    }

    const link =
      studentWorkspaceLink(
        publicToken
      );

    let panel =
      byId(
        "agvStudentWorkspaceLinkPanel"
      );

    if (!panel) {
      panel =
        document.createElement(
          "section"
        );

      panel.id =
        "agvStudentWorkspaceLinkPanel";

      panel.className =
        "prototypeNotice";

      panel.style.margin =
        "14px 0 18px";

      panel.style.borderColor =
        "rgba(34,197,94,.55)";

      panel.innerHTML =
        '<strong style="display:block;margin-bottom:8px;color:#bbf7d0;">' +
          'Student Course Workspace Link' +
        '</strong>' +
        '<p style="margin:0 0 10px;line-height:1.55;">' +
          'Share this permanent AGV link with students registered for this course. ' +
          'Protected file access links are refreshed whenever the workspace opens.' +
        '</p>' +
        '<input ' +
          'id="agvStudentWorkspaceShareLink" ' +
          'type="text" ' +
          'readonly ' +
          'style="width:100%;margin-bottom:10px;"' +
        '>' +
        '<div style="display:flex;flex-wrap:wrap;gap:8px;">' +
          '<button ' +
            'id="agvCopyStudentWorkspaceLink" ' +
            'type="button" ' +
            'class="primaryButton"' +
          '>' +
            'Copy Student Link' +
          '</button>' +
          '<button ' +
            'id="agvOpenStudentWorkspaceLink" ' +
            'type="button" ' +
            'class="primaryButton"' +
          '>' +
            'Open Student Workspace' +
          '</button>' +
        '</div>';

      const status =
        byId(
          "agvCourseWorkspaceDeliveryStatus"
        );

      if (status?.parentElement) {
        status.insertAdjacentElement(
          "afterend",
          panel
        );
      } else {
        byId("materialsList")
          ?.parentElement
          ?.insertBefore(
            panel,
            byId("materialsList")
          );
      }

      byId(
        "agvCopyStudentWorkspaceLink"
      )?.addEventListener(
        "click",
        async function(){
          const input =
            byId(
              "agvStudentWorkspaceShareLink"
            );

          try {
            await copyText(
              input?.value
            );

            setDeliveryStatus(
              "Student Course Workspace link copied.",
              "success"
            );
          } catch(error) {
            setDeliveryStatus(
              "The student link could not be copied automatically. Select and copy it manually.",
              "error"
            );
          }
        }
      );

      byId(
        "agvOpenStudentWorkspaceLink"
      )?.addEventListener(
        "click",
        function(){
          const input =
            byId(
              "agvStudentWorkspaceShareLink"
            );

          if (input?.value) {
            window.open(
              input.value,
              "_blank",
              "noopener,noreferrer"
            );
          }
        }
      );
    }

    const input =
      byId(
        "agvStudentWorkspaceShareLink"
      );

    if (input) {
      input.value =
        link;
    }
  }

  function requireContext(){
    const role =
      text(
        localStorage.getItem(
          ROLE_STORAGE
        )
      );

    if (role !== TEACHER_ROLE) {
      throw new Error(
        "Instructor access is required."
      );
    }

    const course =
      selectedCourse();

    if (!course.id) {
      throw new Error(
        "Select a course before sending materials."
      );
    }

    const token =
      agvSessionToken();

    if (!token) {
      throw new Error(
        "The verified AGV host session was not found. Sign in to AGV again."
      );
    }

    const apiBase =
      resourceApiBase();

    if (!apiBase) {
      throw new Error(
        "The University Pal Resource Server URL is not configured."
      );
    }

    return {
      course,
      keys:
        handoutKeys(course.id),
      token,
      apiBase
    };
  }

  async function ensureWorkspaceContext(){
    const initial =
      requireContext();

    if (
      text(
        initial.keys?.publicToken
      ) &&
      text(
        initial.keys?.editToken
      )
    ) {
      showStudentWorkspaceLink(
        initial
      );

      return initial;
    }

    if (workspaceContextPromise) {
      return workspaceContextPromise;
    }

    workspaceContextPromise =
      (async function(){
        const context =
          requireContext();

        setDeliveryStatus(
          "Creating the selected course’s Student Course Workspace."
        );

        await ensureSupabaseLibrary();

        const settings =
          supabaseSettings();

        const client =
          window.supabase.createClient(
            settings.url,
            settings.anonKey,
            {
              auth:{
                persistSession:false,
                autoRefreshToken:false,
                detectSessionInUrl:false
              }
            }
          );

        const courseRecord =
          currentCourseRecord(
            context.course.id
          ) || {};

        const publicToken =
          createUuid();

        const editToken =
          createPrivateEditToken();

        const handoutTitle =
          (
            context.course.name ||
            "AGV University Pal Course"
          ) +
          " Course Workspace";

        const result =
          await client.rpc(
            "agv_up_publish_student_handout",
            {
              p_public_token:
                publicToken,
              p_edit_token:
                editToken,
              p_local_class_id:
                String(
                  context.course.id
                ),
              p_supabase_class_id:
                /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
                  .test(
                    text(
                      courseRecord.supabaseId
                    )
                  )
                    ? text(
                        courseRecord.supabaseId
                      )
                    : null,
              p_course_name:
                context.course.name ||
                "AGV University Pal Course",
              p_class_code:
                context.course.classCode ||
                courseRecord.classCode ||
                null,
              p_instructor_name:
                courseRecord.instructor ||
                null,
              p_handout_title:
                handoutTitle,
              p_introduction:
                "Files, links, handouts, and learning resources provided for this course.",
              p_modules:[],
              p_assignments:[],
              p_announcements:[],
              p_calendar_events:[],
              p_expires_at:null
            }
          );

        if (result.error) {
          throw new Error(
            "Course Workspace creation failed: " +
            result.error.message
          );
        }

        const keys = {
          publicToken,
          editToken,
          handoutTitle,
          introduction:
            "Course Workspace resources",
          lastPublishedAt:
            new Date().toISOString(),
          version:
            result.data?.[0]?.version ||
            1
        };

        saveHandoutKeys(
          context.course.id,
          keys
        );

        const completed = {
          ...context,
          keys
        };

        showStudentWorkspaceLink(
          completed
        );

        setDeliveryStatus(
          "Course Workspace created. Files and links can now be delivered to students.",
          "success"
        );

        return completed;
      })();

    try {
      return await workspaceContextPromise;
    } finally {
      workspaceContextPromise =
        null;
    }
  }

  async function apiFetch(
    path,
    options
  ){
    const context =
      requireContext();

    const configuration =
      options || {};

    const response =
      await fetch(
        context.apiBase + path,
        {
          method:
            configuration.method ||
            "GET",
          headers:{
            "Content-Type":
              "application/json",
            "Authorization":
              "Bearer " +
              context.token
          },
          body:
            configuration.body ===
              undefined
              ? undefined
              : JSON.stringify(
                  configuration.body
                )
        }
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
        "The Course Workspace resource request failed."
      );
    }

    return result;
  }

  function setDeliveryStatus(
    message,
    type
  ){
    const target =
      byId(
        "agvCourseWorkspaceDeliveryStatus"
      );

    if (!target) {
      return;
    }

    target.textContent =
      message;

    target.dataset.type =
      type || "info";

    target.style.borderColor =
      type === "error"
        ? "rgba(248,113,113,.55)"
        : type === "success"
          ? "rgba(34,197,94,.55)"
          : "rgba(91,147,255,.45)";

    target.style.color =
      type === "error"
        ? "#fecaca"
        : type === "success"
          ? "#bbf7d0"
          : "#dbeafe";
  }

  function humanSize(bytes){
    const value =
      Number(bytes || 0);

    if (!value) {
      return "";
    }

    if (value < 1024) {
      return value + " B";
    }

    if (value < 1048576) {
      return (
        value / 1024
      ).toFixed(1) + " KB";
    }

    return (
      value / 1048576
    ).toFixed(1) + " MB";
  }

  function accessLabel(resource){
    const mode =
      text(
        resource?.displayMode
      ).toLowerCase();

    if (mode === "video") {
      return "Watch";
    }

    if (mode === "download") {
      return "Download";
    }

    return "Open";
  }

  function renderResources(){
    const target =
      byId("materialsList");

    if (!target) {
      return;
    }

    if (!resources.length) {
      target.innerHTML =
        '<div class="emptyState">' +
          'No files or links have been sent to this course’s Course Workspace yet.' +
        '</div>';

      return;
    }

    target.innerHTML =
      resources.map(function(resource){
        const accessUrl =
          text(resource.accessUrl);

        const meta = [
          text(resource.category),
          text(resource.originalFileName),
          humanSize(
            resource.fileSizeBytes
          ),
          resource.isVisible === false
            ? "Hidden from students"
            : "Visible in Course Workspace"
        ].filter(Boolean).join(" · ");

        return (
          '<article class="materialCard">' +
            '<div class="materialHeader">' +
              '<div>' +
                '<strong>' +
                  escapeHtml(
                    resource.title ||
                    resource.originalFileName ||
                    "Course Resource"
                  ) +
                '</strong>' +
                (
                  meta
                    ? (
                        '<div class="materialMeta">' +
                          escapeHtml(meta) +
                        '</div>'
                      )
                    : ""
                ) +
              '</div>' +
            '</div>' +
            (
              text(resource.description)
                ? (
                    '<p>' +
                      escapeHtml(
                        resource.description
                      ) +
                    '</p>'
                  )
                : ""
            ) +
            (
              accessUrl
                ? (
                    '<div class="materialActions">' +
                      '<a class="actionButton" ' +
                      'href="' +
                      escapeHtml(accessUrl) +
                      '" target="_blank" ' +
                      'rel="noopener noreferrer">' +
                        escapeHtml(
                          accessLabel(resource)
                        ) +
                      '</a>' +
                    '</div>'
                  )
                : ""
            ) +
          '</article>'
        );
      }).join("");
  }

  async function loadCourseResources(){
    try {
      const context =
        await ensureWorkspaceContext();

      setDeliveryStatus(
        "Loading files and links already sent to " +
        context.course.name +
        "."
      );

      const result =
        await apiFetch(
          "/api/university-pal/resources/manage/list",
          {
            method:"POST",
            body:{
              publicToken:
                context.keys.publicToken,
              editToken:
                context.keys.editToken
            }
          }
        );

      resources =
        Array.isArray(result.resources)
          ? result.resources
          : [];

      renderResources();

      setDeliveryStatus(
        resources.length
          ? (
              resources.length +
              " resource(s) are connected to this course’s Course Workspace."
            )
          : "This course’s Course Workspace is ready for its first file or link.",
        "success"
      );
    } catch(error) {
      resources = [];
      renderResources();

      setDeliveryStatus(
        error?.message ||
        "Course Workspace resources could not be loaded.",
        "error"
      );
    }
  }

  function ensureSupabaseLibrary(){
    if (
      window.supabase &&
      typeof window.supabase.createClient ===
        "function"
    ) {
      return Promise.resolve();
    }

    return new Promise(function(
      resolve,
      reject
    ){
      const existing =
        document.querySelector(
          'script[data-agv-course-workspace-supabase="true"]'
        );

      if (existing) {
        existing.addEventListener(
          "load",
          resolve,
          {
            once:true
          }
        );

        existing.addEventListener(
          "error",
          function(){
            reject(
              new Error(
                "The Supabase upload library could not be loaded."
              )
            );
          },
          {
            once:true
          }
        );

        return;
      }

      const script =
        document.createElement(
          "script"
        );

      script.src =
        SUPABASE_LIBRARY_URL;

      script.async = true;

      script.dataset
        .agvCourseWorkspaceSupabase =
        "true";

      script.onload = function(){
        resolve();
      };

      script.onerror = function(){
        reject(
          new Error(
            "The Supabase upload library could not be loaded."
          )
        );
      };

      document.head.appendChild(
        script
      );
    });
  }

  function supabaseSettings(){
    const settings =
      readJson(
        SUPABASE_SETTINGS_STORAGE,
        {}
      );

    if (
      !text(settings?.url) ||
      !text(settings?.anonKey)
    ) {
      throw new Error(
        "Connect University Pal to Supabase before uploading files."
      );
    }

    return settings;
  }

  function validateFile(file){
    if (!file) {
      throw new Error(
        "Choose a course file first."
      );
    }

    const extension =
      "." +
      text(
        file.name.split(".").pop()
      ).toLowerCase();

    const allowed =
      new Set([
        ".pdf",
        ".txt",
        ".doc",
        ".docx",
        ".xls",
        ".xlsx",
        ".mp4"
      ]);

    if (!allowed.has(extension)) {
      throw new Error(
        "Use PDF, TXT, Word, Excel, or MP4 files."
      );
    }

    const maximum =
      extension === ".mp4"
        ? VIDEO_LIMIT
        : DOCUMENT_LIMIT;

    if (file.size > maximum) {
      throw new Error(
        extension === ".mp4"
          ? "MP4 videos are limited to 250 MB during this validation pass."
          : "Documents are limited to 25 MB during this validation pass."
      );
    }
  }

  async function sendFileToWorkspace(){
    const context =
      await ensureWorkspaceContext();

    const fileInput =
      byId("fileInput");

    const file =
      fileInput?.files?.[0];

    validateFile(file);

    const button =
      byId("addButton");

    if (button) {
      button.disabled = true;
    }

    try {
      setDeliveryStatus(
        "Creating protected upload authorization for " +
        file.name +
        "."
      );

      const ticket =
        await apiFetch(
          "/api/university-pal/resources/upload-ticket",
          {
            method:"POST",
            body:{
              publicToken:
                context.keys.publicToken,
              editToken:
                context.keys.editToken,
              title:
                text(
                  byId(
                    "materialTitle"
                  )?.value
                ),
              description:
                text(
                  byId(
                    "materialInstructions"
                  )?.value
                ),
              category:
                "Course Workspace Material",
              displayMode:"",
              file:{
                originalFileName:
                  file.name,
                fileSizeBytes:
                  file.size,
                mimeType:
                  file.type ||
                  "application/octet-stream"
              }
            }
          }
        );

      await ensureSupabaseLibrary();

      const settings =
        supabaseSettings();

      const client =
        window.supabase.createClient(
          settings.url,
          settings.anonKey,
          {
            auth:{
              persistSession:false,
              autoRefreshToken:false,
              detectSessionInUrl:false
            }
          }
        );

      setDeliveryStatus(
        "Uploading " +
        file.name +
        " to protected Course Workspace storage."
      );

      const uploadResult =
        await client.storage
          .from(ticket.bucket)
          .uploadToSignedUrl(
            ticket.path,
            ticket.uploadToken,
            file,
            {
              contentType:
                ticket.mimeType,
              upsert:false
            }
          );

      if (uploadResult.error) {
        throw uploadResult.error;
      }

      setDeliveryStatus(
        "Upload complete. Publishing the resource to Course Workspace."
      );

      await apiFetch(
        "/api/university-pal/resources/complete-upload",
        {
          method:"POST",
          body:{
            editToken:
              context.keys.editToken,
            uploadTicket:
              ticket.uploadTicket,
            isVisible:true
          }
        }
      );

      if (fileInput) {
        fileInput.value = "";
      }

      const selectedFile =
        byId("selectedFile");

      if (selectedFile) {
        selectedFile.textContent =
          "No file selected";
      }

      [
        "materialTitle",
        "materialInstructions"
      ].forEach(function(id){
        const element =
          byId(id);

        if (element) {
          element.value = "";
        }
      });

      setDeliveryStatus(
        "File sent successfully. Registered students can now receive it in Course Workspace.",
        "success"
      );

      await loadCourseResources();
    } finally {
      if (button) {
        button.disabled = false;
      }
    }
  }

  async function sendExternalLink(){
    const context =
      await ensureWorkspaceContext();

    const url =
      text(
        byId(
          "agvWorkspaceExternalUrl"
        )?.value
      );

    const title =
      text(
        byId(
          "agvWorkspaceExternalTitle"
        )?.value
      );

    const description =
      text(
        byId(
          "agvWorkspaceExternalDescription"
        )?.value
      );

    if (!url || !title) {
      throw new Error(
        "Enter both the resource link and its title."
      );
    }

    let parsed;

    try {
      parsed =
        new URL(url);
    } catch(error) {
      throw new Error(
        "Enter a valid HTTPS resource link."
      );
    }

    if (parsed.protocol !== "https:") {
      throw new Error(
        "External Course Workspace links must use HTTPS."
      );
    }

    const button =
      byId(
        "agvWorkspaceExternalButton"
      );

    if (button) {
      button.disabled = true;
    }

    try {
      setDeliveryStatus(
        "Sending the external resource to Course Workspace."
      );

      await apiFetch(
        "/api/university-pal/resources/external",
        {
          method:"POST",
          body:{
            publicToken:
              context.keys.publicToken,
            editToken:
              context.keys.editToken,
            externalUrl:url,
            title,
            description,
            category:
              "Course Workspace Link",
            isVisible:true
          }
        }
      );

      [
        "agvWorkspaceExternalUrl",
        "agvWorkspaceExternalTitle",
        "agvWorkspaceExternalDescription"
      ].forEach(function(id){
        const element =
          byId(id);

        if (element) {
          element.value = "";
        }
      });

      setDeliveryStatus(
        "Link sent successfully. Registered students can now open it from Course Workspace.",
        "success"
      );

      await loadCourseResources();
    } finally {
      if (button) {
        button.disabled = false;
      }
    }
  }

  function installExternalLinkEditor(){
    if (
      byId(
        "agvWorkspaceExternalEditor"
      )
    ) {
      return;
    }

    const materialsList =
      byId("materialsList");

    const panel =
      materialsList?.closest(
        ".panel"
      );

    if (!panel) {
      return;
    }

    const editor =
      document.createElement(
        "section"
      );

    editor.id =
      "agvWorkspaceExternalEditor";

    editor.style.marginBottom =
      "18px";

    editor.innerHTML =
      '<div class="field">' +
        '<label for="agvWorkspaceExternalUrl">' +
          'External Resource Link' +
        '</label>' +
        '<input id="agvWorkspaceExternalUrl" ' +
        'type="url" ' +
        'placeholder="https://drive.google.com/... or another approved HTTPS link">' +
      '</div>' +
      '<div class="field">' +
        '<label for="agvWorkspaceExternalTitle">' +
          'Link Title' +
        '</label>' +
        '<input id="agvWorkspaceExternalTitle" ' +
        'type="text" ' +
        'placeholder="Example: Week 1 Reading">' +
      '</div>' +
      '<div class="field">' +
        '<label for="agvWorkspaceExternalDescription">' +
          'Student Instructions' +
        '</label>' +
        '<textarea id="agvWorkspaceExternalDescription" ' +
        'placeholder="Optional directions for students"></textarea>' +
      '</div>' +
      '<button id="agvWorkspaceExternalButton" ' +
      'class="primaryButton" type="button">' +
        'Send Link to Course Workspace' +
      '</button>' +
      '<div id="agvCourseWorkspaceDeliveryStatus" ' +
      'class="prototypeNotice" ' +
      'style="margin:14px 0 0;">' +
        'Select a course to load its Course Workspace resources.' +
      '</div>';

    panel.insertBefore(
      editor,
      materialsList
    );

    byId(
      "agvWorkspaceExternalButton"
    )?.addEventListener(
      "click",
      function(){
        sendExternalLink()
          .catch(function(error){
            setDeliveryStatus(
              error?.message ||
              "The link could not be sent.",
              "error"
            );
          });
      }
    );
  }

  function interceptTemporaryUpload(){
    const button =
      byId("addButton");

    if (!button) {
      return;
    }

    button.textContent =
      "Send File to Course Workspace";

    button.addEventListener(
      "click",
      function(event){
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        sendFileToWorkspace()
          .catch(function(error){
            setDeliveryStatus(
              error?.message ||
              "The file could not be sent to Course Workspace.",
              "error"
            );
          });
      },
      true
    );
  }

  function updatePageLanguage(){
    const subtitle =
      document.querySelector(
        ".agvCourseUploadSubtitle"
      );

    if (subtitle) {
      subtitle.textContent =
        "Course Upload to Student Course Workspace";
    }

    const materialsList =
      byId("materialsList");

    const panel =
      materialsList?.closest(
        ".panel"
      );

    const heading =
      panel?.querySelector("h2");

    const introduction =
      panel?.querySelector(
        ".panelIntro"
      );

    if (heading) {
      heading.textContent =
        "Course Workspace Delivery";
    }

    if (introduction) {
      introduction.textContent =
        "Files and links listed here are delivered to registered students in the selected course’s Course Workspace.";
    }

    const prototypeNotice =
      Array.from(
        document.querySelectorAll(
          ".prototypeNotice"
        )
      ).find(function(element){
        return element.textContent
          .includes(
            "Production candidate"
          );
      });

    if (prototypeNotice) {
      prototypeNotice.innerHTML =
        '<strong>Course Workspace connection:</strong> ' +
        'Visible files and links are stored through the protected University Pal Resource Server and delivered to registered students.';
    }
  }

  function bindCourseRefresh(){
    const select =
      byId("courseName");

    if (!select) {
      return;
    }

    select.addEventListener(
      "change",
      function(){
        window.setTimeout(
          loadCourseResources,
          0
        );
      }
    );
  }

  function initialize(){
    updatePageLanguage();
    installExternalLinkEditor();
    interceptTemporaryUpload();
    bindCourseRefresh();

    window.setTimeout(
      loadCourseResources,
      150
    );

    window.setTimeout(
      loadCourseResources,
      700
    );
  }

  if (
    document.readyState ===
    "loading"
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