const STORAGE_KEY = "teacherHoursEntries";
const THEME_STORAGE_KEY = "teacherHoursTheme";

const TEACHER_YEAR_START = "2026-08-10";
const TEACHER_YEAR_END = "2027-06-09";
const CONTRACT_DAY_START = "07:30";
const CONTRACT_DAY_END = "15:30";

const SCHOOL_HOLIDAYS = [
  "2026-09-07",
  "2026-10-12",
  "2026-11-03",
  "2026-11-23",
  "2026-11-24",
  "2026-11-25",
  "2026-11-26",
  "2026-11-27",
  "2026-12-21",
  "2026-12-22",
  "2026-12-23",
  "2026-12-24",
  "2026-12-25",
  "2026-12-28",
  "2026-12-29",
  "2026-12-30",
  "2026-12-31",
  "2027-01-01",
  "2027-01-18",
  "2027-02-15",
  "2027-03-26",
  "2027-04-12",
  "2027-04-13",
  "2027-04-14",
  "2027-04-15",
  "2027-04-16",
  "2027-05-31"
];

const SUBCATEGORY_DATA = {
  planning: ["Lesson Planning", "Curriculum Mapping", "Resource Creation"],
  grading: ["Weekly Quizzes", "Midterms/Finals", "Essay Feedback", "Data Entry"],
  meetings: ["Department Meeting", "IEP/504 Meeting", "Staff Development", "PLC"],
  parentContact: ["Phone Calls", "Emails", "Parent-Teacher Conference"],
  profDev: ["Webinar", "Workshop", "Independent Reading"],
  emails: ["General Correspondence", "Student Support"],
  events: ["Back to School Night", "Orientation"],
  afterSchoolActivities: ["Tutoring", "Club Advising", "Sports Coaching"]
};

const CATEGORY_LABELS = {
  planning: "Planning & Prep",
  grading: "Grading & Assessment",
  meetings: "Meetings",
  parentContact: "Parent Contact",
  profDev: "Professional Development",
  emails: "Emails & Communication",
  events: "Events",
  afterSchoolActivities: "After-School Activities"
};

const logForm = document.getElementById("logForm");
const workDateInput = document.getElementById("workDate");
const timePeriodInput = document.getElementById("timePeriod");
const activityInput = document.getElementById("activity");
const subcategoryInput = document.getElementById("subcategory");
const durationInput = document.getElementById("duration");
const notesInput = document.getElementById("notes");
const entriesList = document.getElementById("entriesList");
const entriesCount = document.getElementById("entriesCount");
const formStatus = document.getElementById("formStatus");
const lockoutMessage = document.getElementById("lockoutMessage");
const submitButton = document.getElementById("submitButton");
const clearFormButton = document.getElementById("clearFormButton");
const exportCsvButton = document.getElementById("exportCsvButton");
const exportJsonButton = document.getElementById("exportJsonButton");
const statWeek = document.getElementById("statWeek");
const statMonth = document.getElementById("statMonth");
const statYear = document.getElementById("statYear");
const themeToggle = document.getElementById("themeToggle");

const fields = {
  workDate: workDateInput,
  timePeriod: timePeriodInput,
  activity: activityInput,
  duration: durationInput,
  notes: notesInput
};

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Could not load entries:", error);
    return [];
  }
}

function saveEntries(entries) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (error) {
    console.error("Could not save entries:", error);
    showFormStatus("Your browser could not save this data.", "error");
  }
}

function formatLocalDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateString) {
  const date = new Date(dateString + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function isWeekend(dateString) {
  const date = new Date(dateString + "T00:00:00");
  const day = date.getDay();
  return day === 0 || day === 6;
}

function isSchoolHoliday(dateString) {
  return SCHOOL_HOLIDAYS.includes(dateString);
}

function isWithinTeacherYear(dateString) {
  return dateString >= TEACHER_YEAR_START && dateString <= TEACHER_YEAR_END;
}

function isRegularTeacherWorkday(dateString) {
  return isWithinTeacherYear(dateString) && !isWeekend(dateString) && !isSchoolHoliday(dateString);
}

function timeToMinutes(timeString) {
  const [hours, minutes] = timeString.split(":").map(Number);
  return hours * 60 + minutes;
}

function isWithinContractHours(date = new Date()) {
  const currentMinutes = date.getHours() * 60 + date.getMinutes();
  return currentMinutes >= timeToMinutes(CONTRACT_DAY_START) &&
    currentMinutes < timeToMinutes(CONTRACT_DAY_END);
}

function isLoggingLockedNow(date = new Date()) {
  const today = formatLocalDate(date);
  return isRegularTeacherWorkday(today) && isWithinContractHours(date);
}

function getWeekBounds(now = new Date()) {
  const date = new Date(now);
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;

  const start = new Date(date);
  start.setDate(date.getDate() + mondayOffset);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function getSchoolYearBounds() {
  return {
    start: new Date(TEACHER_YEAR_START + "T00:00:00"),
    end: new Date(TEACHER_YEAR_END + "T23:59:59")
  };
}

function updateStats(entries) {
  const now = new Date();
  const weekBounds = getWeekBounds(now);
  const schoolYearBounds = getSchoolYearBounds();

  let weekTotal = 0;
  let monthTotal = 0;
  let yearTotal = 0;

  entries.forEach((entry) => {
    const entryDate = new Date(entry.date + "T00:00:00");
    const hours = Number.parseFloat(entry.hours);

    if (Number.isNaN(hours)) {
      return;
    }

    if (entryDate >= weekBounds.start && entryDate <= weekBounds.end) {
      weekTotal += hours;
    }

    if (
      entryDate.getMonth() === now.getMonth() &&
      entryDate.getFullYear() === now.getFullYear()
    ) {
      monthTotal += hours;
    }

    if (entryDate >= schoolYearBounds.start && entryDate <= schoolYearBounds.end) {
      yearTotal += hours;
    }
  });

  statWeek.textContent = weekTotal.toFixed(1);
  statMonth.textContent = monthTotal.toFixed(1);
  statYear.textContent = yearTotal.toFixed(1);
}

function populateSubcategories(activityKey) {
  subcategoryInput.innerHTML = "";

  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "Select if applicable";
  subcategoryInput.appendChild(defaultOption);

  if (!activityKey || !SUBCATEGORY_DATA[activityKey]) {
    return;
  }

  SUBCATEGORY_DATA[activityKey].forEach((subcategory) => {
    const option = document.createElement("option");
    option.value = subcategory;
    option.textContent = subcategory;
    subcategoryInput.appendChild(option);
  });
}

function clearForm() {
  logForm.reset();
  workDateInput.value = formatLocalDate();
  populateSubcategories("");
  clearAllErrors();
  clearFormStatus();
}

function showFormStatus(message, type = "success") {
  formStatus.textContent = message;
  formStatus.classList.remove("success-banner", "warning-banner");
  formStatus.classList.add(type === "error" ? "warning-banner" : "success-banner");
  formStatus.style.display = "block";
}

function clearFormStatus() {
  formStatus.textContent = "";
  formStatus.style.display = "none";
}

function createEmptyState() {
  const paragraph = document.createElement("p");
  paragraph.className = "empty-state";
  paragraph.textContent = "No entries yet. Log your first hours to get started.";
  return paragraph;
}

function deleteEntry(id) {
  const updatedEntries = loadEntries().filter((entry) => entry.id !== id);
  saveEntries(updatedEntries);
  renderEntries();
  showFormStatus("Entry deleted.", "success");
}

function createEntryCard(entry) {
  const card = document.createElement("article");
  card.className = "entry-card";

  const content = document.createElement("div");

  const heading = document.createElement("h3");
  heading.textContent = formatDisplayDate(entry.date);
  content.appendChild(heading);

  const meta = document.createElement("p");
  meta.className = "entry-meta";
  meta.textContent = `${Number(entry.hours).toFixed(1)} hrs — ${CATEGORY_LABELS[entry.activity] || entry.activity}`;
  content.appendChild(meta);

  const tagRow = document.createElement("div");
  tagRow.className = "tag-row";

  if (entry.timePeriod) {
    const timeTag = document.createElement("span");
    timeTag.className = "tag";
    timeTag.textContent = entry.timePeriod.replace(/-/g, " ");
    tagRow.appendChild(timeTag);
  }

  if (entry.subcategory) {
    const subTag = document.createElement("span");
    subTag.className = "tag";
    subTag.textContent = entry.subcategory;
    tagRow.appendChild(subTag);
  }

  if (tagRow.children.length > 0) {
    content.appendChild(tagRow);
  }

  if (entry.notes) {
    const notes = document.createElement("p");
    notes.className = "entry-notes";
    notes.textContent = entry.notes;
    content.appendChild(notes);
  }

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "delete-button";
  deleteButton.textContent = "Delete";
  deleteButton.setAttribute("aria-label", `Delete entry for ${formatDisplayDate(entry.date)}`);
  deleteButton.addEventListener("click", () => deleteEntry(entry.id));

  card.appendChild(content);
  card.appendChild(deleteButton);

  return card;
}

function renderEntries() {
  const entries = loadEntries();
  updateStats(entries);
  entriesList.innerHTML = "";
  entriesCount.textContent = `(${entries.length})`;

  if (entries.length === 0) {
    entriesList.appendChild(createEmptyState());
    return;
  }

  const sortedEntries = [...entries].sort((a, b) => {
    const dateDifference = new Date(b.date) - new Date(a.date);
    if (dateDifference !== 0) {
      return dateDifference;
    }
    return new Date(b.savedAt) - new Date(a.savedAt);
  });

  sortedEntries.forEach((entry) => {
    entriesList.appendChild(createEntryCard(entry));
  });
}

function updateLoggingAvailability() {
  const locked = isLoggingLockedNow();

  lockoutMessage.style.display = locked ? "block" : "none";
  submitButton.disabled = locked;
  submitButton.textContent = locked ? "Unavailable During School Day" : "Log These Hours";

  if (locked) {
    submitButton.setAttribute("aria-disabled", "true");
  } else {
    submitButton.removeAttribute("aria-disabled");
  }
}

function getPreferredTheme() {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);

  if (savedTheme === "dark" || savedTheme === "light") {
    return savedTheme;
  }

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}

function applyTheme(theme) {
  const isDark = theme === "dark";
  document.body.classList.toggle("dark-mode", isDark);

  themeToggle.textContent = isDark ? "Light Mode" : "Dark Mode";
  themeToggle.setAttribute(
    "aria-label",
    isDark ? "Switch to light mode" : "Switch to dark mode"
  );
  themeToggle.setAttribute("aria-pressed", String(isDark));
}

function saveTheme(theme) {
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

function toggleTheme() {
  const newTheme = document.body.classList.contains("dark-mode") ? "light" : "dark";
  applyTheme(newTheme);
  saveTheme(newTheme);
}

function setFieldError(fieldName, message) {
  const field = fields[fieldName];
  const errorElement = document.getElementById(`${fieldName}Error`);

  if (!field || !errorElement) {
    return;
  }

  field.classList.add("input-error");
  field.setAttribute("aria-invalid", "true");
  errorElement.textContent = message;
}

function clearFieldError(fieldName) {
  const field = fields[fieldName];
  const errorElement = document.getElementById(`${fieldName}Error`);

  if (!field || !errorElement) {
    return;
  }

  field.classList.remove("input-error");
  field.removeAttribute("aria-invalid");
  errorElement.textContent = "";
}

function clearAllErrors() {
  Object.keys(fields).forEach((fieldName) => {
    clearFieldError(fieldName);
  });
}

function validateEntry(entry) {
  clearAllErrors();
  const errors = [];

  if (!entry.date) {
    errors.push({ field: "workDate", message: "Please choose a work date." });
  } else {
    const entryDate = new Date(entry.date + "T00:00:00");

    if (Number.isNaN(entryDate.getTime())) {
      errors.push({ field: "workDate", message: "Please enter a valid date." });
    } else if (entry.date > formatLocalDate()) {
      errors.push({ field: "workDate", message: "Work date cannot be in the future." });
    } else if (isRegularTeacherWorkday(entry.date)) {
      errors.push({
        field: "workDate",
        message: "Regular school weekdays are not allowed unless the date is a listed school holiday."
      });
    }
  }

  if (!entry.timePeriod) {
    errors.push({ field: "timePeriod", message: "Please choose a time period." });
  } else if (entry.timePeriod === "weekend" && entry.date && !isWeekend(entry.date)) {
    errors.push({
      field: "timePeriod",
      message: "Weekend can only be used for Saturday or Sunday dates."
    });
  } else if (entry.timePeriod === "holiday-break" && entry.date && !isSchoolHoliday(entry.date)) {
    errors.push({
      field: "timePeriod",
      message: "Holiday / Break can only be used on listed school holidays."
    });
  }

  if (!entry.activity) {
    errors.push({ field: "activity", message: "Please choose an activity category." });
  }

  if (Number.isNaN(entry.hours) || entry.hours <= 0 || entry.hours > 24) {
    errors.push({
      field: "duration",
      message: "Please enter a valid number of hours between 0.5 and 24."
    });
  }

  if (entry.notes.length > 500) {
    errors.push({
      field: "notes",
      message: "Notes must be 500 characters or fewer."
    });
  }

  errors.forEach((error) => {
    setFieldError(error.field, error.message);
  });

  return errors;
}

function formatDateForFilename(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function escapeCsvValue(value) {
  const stringValue = value == null ? "" : String(value);
  const escapedValue = stringValue.replace(/"/g, '""');
  return `"${escapedValue}"`;
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function exportEntriesToCsv() {
  const entries = loadEntries();

  if (entries.length === 0) {
    showFormStatus("There are no entries to export yet.", "error");
    return;
  }

  const headers = [
    "Date",
    "Time Period",
    "Activity",
    "Subcategory",
    "Hours",
    "Notes",
    "Saved At"
  ];

  const rows = entries.map((entry) => [
    entry.date || "",
    entry.timePeriod ? entry.timePeriod.replace(/-/g, " ") : "",
    CATEGORY_LABELS[entry.activity] || entry.activity || "",
    entry.subcategory || "",
    entry.hours ?? "",
    entry.notes || "",
    entry.savedAt || ""
  ]);

  const csvLines = [
    headers.map(escapeCsvValue).join(","),
    ...rows.map((row) => row.map(escapeCsvValue).join(","))
  ];

  const csvContent = csvLines.join("\n");
  const filename = `teacher-hours-export-${formatDateForFilename()}.csv`;

  downloadFile(csvContent, filename, "text/csv;charset=utf-8;");
  showFormStatus("CSV exported successfully.", "success");
}

function exportEntriesToJson() {
  const entries = loadEntries();

  if (entries.length === 0) {
    showFormStatus("There are no entries to back up yet.", "error");
    return;
  }

  const backupData = {
    exportedAt: new Date().toISOString(),
    app: "Teacher Hours Tracker",
    version: 1,
    entries
  };

  const jsonContent = JSON.stringify(backupData, null, 2);
  const filename = `teacher-hours-backup-${formatDateForFilename()}.json`;

  downloadFile(jsonContent, filename, "application/json;charset=utf-8;");
  showFormStatus("Backup downloaded successfully.", "success");
}

activityInput.addEventListener("change", (event) => {
  populateSubcategories(event.target.value);
  clearFieldError("activity");
});

workDateInput.addEventListener("input", () => clearFieldError("workDate"));
timePeriodInput.addEventListener("change", () => clearFieldError("timePeriod"));
durationInput.addEventListener("input", () => clearFieldError("duration"));
notesInput.addEventListener("input", () => clearFieldError("notes"));

clearFormButton.addEventListener("click", () => {
  clearForm();
});

themeToggle.addEventListener("click", () => {
  toggleTheme();
});

exportCsvButton.addEventListener("click", () => {
  clearFormStatus();
  exportEntriesToCsv();
});

exportJsonButton.addEventListener("click", () => {
  clearFormStatus();
  exportEntriesToJson();
});

logForm.addEventListener("submit", (event) => {
  event.preventDefault();
  clearFormStatus();

  if (isLoggingLockedNow()) {
    showFormStatus(
      "You cannot log hours during the regular school day (7:30 AM–3:30 PM) on active school days.",
      "error"
    );
    lockoutMessage.focus();
    updateLoggingAvailability();
    return;
  }

  const newEntry = {
    id: window.crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    date: workDateInput.value,
    activity: activityInput.value,
    subcategory: subcategoryInput.value.trim(),
    timePeriod: timePeriodInput.value,
    hours: Number.parseFloat(durationInput.value),
    notes: notesInput.value.trim(),
    savedAt: new Date().toISOString()
  };

  const errors = validateEntry(newEntry);

  if (errors.length > 0) {
    showFormStatus("Please correct the highlighted fields and try again.", "error");
    const firstInvalidField = fields[errors[0].field];
    if (firstInvalidField) {
      firstInvalidField.focus();
    }
    return;
  }

  const entries = loadEntries();
  entries.push(newEntry);
  saveEntries(entries);

  clearForm();
  renderEntries();
  updateLoggingAvailability();
  showFormStatus("Your hours were saved.", "success");
});

function initializeApp() {
  applyTheme(getPreferredTheme());
  workDateInput.value = formatLocalDate();
  populateSubcategories("");
  renderEntries();
  updateLoggingAvailability();
  window.setInterval(updateLoggingAvailability, 60000);
}

initializeApp();