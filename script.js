const STORAGE_KEY = "saisikaMecApplications_v1";
const ADMIN_PASSWORD = "hafeez1310"; // Demo only. Do not use this for real confidential data.

const admissionForm = document.getElementById("admissionForm");
const admissionView = document.getElementById("admissionView");
const adminView = document.getElementById("adminView");
const loginPanel = document.getElementById("loginPanel");
const dashboardPanel = document.getElementById("dashboardPanel");
const toast = document.getElementById("toast");
let isAdminLoggedIn = false;
let toastTimer;

function getApplications() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(data) ? data : [];
  } catch (error) {
    return [];
  }
}

function saveApplications(apps) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(apps));
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
}

function switchView(viewId) {
  admissionView.hidden = viewId !== "admissionView";
  adminView.hidden = viewId !== "adminView";
  document.querySelectorAll(".nav-button").forEach(button => {
    button.classList.toggle("active", button.dataset.view === viewId);
  });
  if (viewId === "adminView") {
    if (isAdminLoggedIn) renderApplications();
    else {
      loginPanel.hidden = false;
      dashboardPanel.hidden = true;
    }
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll(".nav-button").forEach(button => {
  button.addEventListener("click", () => switchView(button.dataset.view));
});

document.getElementById("formDate").valueAsDate = new Date();
document.getElementById("signdate").valueAsDate = new Date();

admissionForm.addEventListener("submit", event => {
  event.preventDefault();
  const formData = new FormData(admissionForm);
  const application = {};
  formData.forEach((value, key) => application[key] = String(value).trim());
  application.id = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
  application["Submitted At"] = new Date().toLocaleString();
  application["Application Status"] = "Submitted";

  try {
    const apps = getApplications();
    apps.unshift(application);
    saveApplications(apps);
    admissionForm.reset();
    document.getElementById("formDate").valueAsDate = new Date();
    document.getElementById("signdate").valueAsDate = new Date();
    showToast("Application saved in this browser.");
    if (isAdminLoggedIn) renderApplications();
  } catch (error) {
    alert("The application could not be saved. Your browser storage may be full or disabled. Export any existing records before trying again.");
  }
});

admissionForm.addEventListener("reset", () => {
  setTimeout(() => {
    document.getElementById("formDate").valueAsDate = new Date();
    document.getElementById("signdate").valueAsDate = new Date();
  }, 0);
});

document.getElementById("printBlankButton").addEventListener("click", () => window.print());

document.getElementById("loginForm").addEventListener("submit", event => {
  event.preventDefault();
  const entered = document.getElementById("adminPassword").value;
  const message = document.getElementById("loginMessage");
  if (entered === ADMIN_PASSWORD) {
    isAdminLoggedIn = true;
    loginPanel.hidden = true;
    dashboardPanel.hidden = false;
    message.textContent = "";
    document.getElementById("adminPassword").value = "";
    renderApplications();
    showToast("Admin portal opened.");
  } else {
    message.textContent = "Incorrect password. Please try again.";
  }
});

document.getElementById("logoutButton").addEventListener("click", () => {
  isAdminLoggedIn = false;
  loginPanel.hidden = false;
  dashboardPanel.hidden = true;
  document.getElementById("adminPassword").value = "";
  document.getElementById("searchApplications").value = "";
  showToast("You have logged out.");
});

document.getElementById("searchApplications").addEventListener("input", renderApplications);

function renderApplications() {
  if (!isAdminLoggedIn) return;
  const query = document.getElementById("searchApplications").value.trim().toLowerCase();
  const allApps = getApplications();
  const filtered = allApps.filter(app =>
    [app["Full Name"], app["Course Applied For"], app["Telephone Number"], app.id]
      .some(value => String(value || "").toLowerCase().includes(query))
  );
  document.getElementById("applicationCount").textContent =
    `${filtered.length} shown · ${allApps.length} total application${allApps.length === 1 ? "" : "s"}`;

  const list = document.getElementById("applicationsList");
  list.replaceChildren();
  document.getElementById("emptyMessage").hidden = filtered.length > 0;

  filtered.forEach(app => {
    const card = document.createElement("article");
    card.className = "application-card";

    const details = document.createElement("div");
    const name = document.createElement("p");
    name.className = "applicant-name";
    name.textContent = app["Full Name"] || "Unnamed applicant";
    const meta = document.createElement("p");
    meta.className = "applicant-meta";
    meta.textContent = `${app["Course Applied For"] || "Course not entered"} · ${app["Telephone Number"] || "No phone number"} · ${app["Submitted At"] || ""}`;
    details.append(name, meta);

    const actions = document.createElement("div");
    actions.className = "application-actions";
    const openButton = makeButton("Open / Print", "primary", () => openPrintableApplication(app));
    const deleteButton = makeButton("Delete", "danger-outline", () => deleteApplication(app.id));
    actions.append(openButton, deleteButton);
    card.append(details, actions);
    list.append(card);
  });
}

function makeButton(label, className, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `button ${className}`;
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function deleteApplication(id) {
  if (!confirm("Delete this application from this browser? This cannot be undone.")) return;
  saveApplications(getApplications().filter(app => app.id !== id));
  renderApplications();
  showToast("Application deleted.");
}

document.getElementById("deleteAllButton").addEventListener("click", () => {
  const apps = getApplications();
  if (!apps.length) return showToast("There are no applications to delete.");
  if (!confirm(`Delete all ${apps.length} saved applications from this browser? Export a backup first if needed.`)) return;
  saveApplications([]);
  renderApplications();
  showToast("All local applications deleted.");
});

document.getElementById("exportButton").addEventListener("click", exportApplications);

function exportApplications() {
  const apps = getApplications();
  const blob = new Blob([JSON.stringify(apps, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `saisika-applications-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast("Application backup downloaded.");
}

function openPrintableApplication(app) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Your browser blocked the print page. Allow pop-ups for this file and try again.");
    return;
  }

  const rows = Object.entries(app)
    .filter(([key]) => key !== "id")
    .map(([key, value]) => `<tr><th>${escapeHTML(key)}</th><td>${escapeHTML(String(value ?? ""))}</td></tr>`)
    .join("");

  printWindow.document.open();
  printWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SAISIKA MEC SKILL SCHOOL - Application</title>
<style>
*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#172033;margin:28px;line-height:1.45}
header{text-align:center;border-bottom:2px solid #173b60;padding-bottom:12px}
h1{font-size:22px;margin-bottom:4px}h2{font-size:17px;margin-top:5px}
table{width:100%;border-collapse:collapse;margin-top:22px}
th,td{border:1px solid #8b98a8;padding:9px;text-align:left;vertical-align:top;overflow-wrap:anywhere}
th{width:34%;background:#eef3f8}
.actions{display:flex;gap:8px;margin-top:20px}
button{padding:10px 15px;cursor:pointer;border:0;border-radius:6px;background:#245f9c;color:white;font-weight:bold}
button:last-child{background:#e8edf3;color:#173b60}
@media print{body{margin:10mm}.actions{display:none}}
</style>
</head>
<body>
<header>
<h1>SAISIKA MEC SKILL SCHOOL</h1>
<h2>ADMISSION APPLICATION RECORD</h2>
<p>Print date: ${escapeHTML(new Date().toLocaleString())}</p>
</header>
<table>${rows}</table>
<div class="actions">
<button onclick="window.print()">Print Application</button>
<button onclick="window.close()">Close Page</button>
</div>
</body></html>`);
  printWindow.document.close();
}

function escapeHTML(value) {
  return value.replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}
