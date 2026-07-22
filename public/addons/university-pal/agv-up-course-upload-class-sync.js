/*
  PASS_AGV_UP_COURSE_CATALOG_SYNC_1G

  Synchronizes the Teacher Course Upload selector with the real
  AGV University Pal class catalog.

  Source:
    localStorage key: agvUniversityPalPass2
    collection: classes
*/

(function(){
  "use strict";

  const UNIVERSITY_PAL_STORAGE =
    "agvUniversityPalPass2";

  const SELECT_ID =
    "courseName";

  function text(value){
    return String(value || "").trim();
  }

  function readUniversityPalData(){
    try {
      const parsed =
        JSON.parse(
          localStorage.getItem(
            UNIVERSITY_PAL_STORAGE
          ) || "{}"
        );

      return (
        parsed &&
        typeof parsed === "object"
          ? parsed
          : {}
      );
    } catch(error) {
      console.warn(
        "AGV University Pal class catalog could not be read.",
        error
      );

      return {};
    }
  }

  function normalizedClasses(data){
    const classes =
      Array.isArray(data?.classes)
        ? data.classes
        : [];

    return classes
      .map(function(course,index){
        const id =
          text(course?.id) ||
          "CLASS-" + String(index + 1);

        const name =
          text(course?.className) ||
          text(course?.courseName) ||
          text(course?.name);

        const code =
          text(course?.classCode) ||
          text(course?.code);

        return {
          id:id,
          name:name,
          code:code,
          instructor:
            text(course?.instructor),
          startDate:
            text(course?.startDate),
          endDate:
            text(course?.endDate)
        };
      })
      .filter(function(course){
        return Boolean(
          course.id &&
          course.name
        );
      })
      .sort(function(a,b){
        return (
          a.name.localeCompare(
            b.name,
            undefined,
            {
              sensitivity:"base"
            }
          )
        );
      });
  }

  function optionLabel(course){
    return course.code
      ? course.code + " - " + course.name
      : course.name;
  }

  function selectedCourseId(select){
    const selected =
      select.options[
        select.selectedIndex
      ];

    return (
      text(select.dataset.selectedCourseId) ||
      text(selected?.value)
    );
  }

  function synchronizeCourseSelector(){
    const select =
      document.getElementById(
        SELECT_ID
      );

    if (!select) {
      return;
    }

    const previousId =
      selectedCourseId(select);

    const data =
      readUniversityPalData();

    const classes =
      normalizedClasses(data);

    const preferredId =
      previousId ||
      text(data.activeClassId) ||
      text(data.activeWorkspaceClassId);

    select.replaceChildren();

    const placeholder =
      document.createElement("option");

    placeholder.value = "";

    placeholder.textContent =
      classes.length
        ? "Select a course"
        : "No classes available";

    select.appendChild(
      placeholder
    );

    classes.forEach(function(course){
      const option =
        document.createElement("option");

      option.value =
        course.id;

      option.textContent =
        optionLabel(course);

      option.dataset.courseId =
        course.id;

      option.dataset.courseName =
        course.name;

      option.dataset.classCode =
        course.code;

      option.dataset.instructor =
        course.instructor;

      option.dataset.startDate =
        course.startDate;

      option.dataset.endDate =
        course.endDate;

      select.appendChild(option);
    });

    const preferredOption =
      Array.from(select.options)
        .find(function(option){
          return (
            option.value ===
            preferredId
          );
        });

    if (preferredOption) {
      select.value =
        preferredOption.value;
    } else {
      select.value = "";
    }

    select.dataset.selectedCourseId =
      select.value;

    select.disabled =
      classes.length === 0;

    select.dispatchEvent(
      new Event(
        "change",
        {
          bubbles:true
        }
      )
    );
  }

  function rememberSelection(){
    const select =
      document.getElementById(
        SELECT_ID
      );

    if (!select) {
      return;
    }

    select.dataset.selectedCourseId =
      select.value;
  }

  function initializeCourseSync(){
    synchronizeCourseSelector();

    const select =
      document.getElementById(
        SELECT_ID
      );

    if (select) {
      select.addEventListener(
        "change",
        rememberSelection
      );
    }

    window.addEventListener(
      "storage",
      function(event){
        if (
          event.key ===
          UNIVERSITY_PAL_STORAGE
        ) {
          synchronizeCourseSelector();
        }
      }
    );

    window.addEventListener(
      "focus",
      synchronizeCourseSelector
    );

    document.addEventListener(
      "visibilitychange",
      function(){
        if (
          document.visibilityState ===
          "visible"
        ) {
          synchronizeCourseSelector();
        }
      }
    );
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      initializeCourseSync,
      {
        once:true
      }
    );
  } else {
    initializeCourseSync();
  }
})();