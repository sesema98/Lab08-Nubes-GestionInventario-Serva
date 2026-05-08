const MODULE_TITLES = {
  auth: "Autenticación",
  rbac: "RBAC",
  abac: "ABAC",
  audit: "Auditoría",
};

const state = {
  token: null,
  currentUser: null,
  bootstrap: null,
  currentModule: "auth",
  currentAuthTab: "login",
  pendingChallengeId: null,
  pendingMethods: [],
  challengeExpiresAt: null,
  autoOtpMode: false,
  totpSetup: null,
  totpSetupError: "",
  totpQrRenderFailed: false,
  roles: [],
  users: [],
  products: [],
  productAction: null,
  inventoryReport: null,
  auditLogs: [],
  auditSummary: null,
};

const refs = {
  authShell: document.getElementById("authShell"),
  dashboardShell: document.getElementById("dashboardShell"),
  showLoginTabBtn: document.getElementById("showLoginTabBtn"),
  showRegisterTabBtn: document.getElementById("showRegisterTabBtn"),
  loginTab: document.getElementById("loginTab"),
  registerTab: document.getElementById("registerTab"),
  authPolicyNote: document.getElementById("authPolicyNote"),
  demoLoginButtons: document.getElementById("demoLoginButtons"),
  seedUsersList: document.getElementById("seedUsersList"),
  loginForm: document.getElementById("loginForm"),
  loginEmailInput: document.getElementById("loginEmailInput"),
  loginPasswordInput: document.getElementById("loginPasswordInput"),
  registerForm: document.getElementById("registerForm"),
  registerStoreSelect: document.getElementById("registerStoreSelect"),
  challengePanel: document.getElementById("challengePanel"),
  challengeActions: document.getElementById("challengeActions"),
  challengeMethods: document.getElementById("challengeMethods"),
  challengeSummary: document.getElementById("challengeSummary"),
  mfaMethodField: document.getElementById("mfaMethodField"),
  mfaMethodSelect: document.getElementById("mfaMethodSelect"),
  verifyMfaForm: document.getElementById("verifyMfaForm"),
  sendEmailCodeBtn: document.getElementById("sendEmailCodeBtn"),
  emailPreviewPanel: document.getElementById("emailPreviewPanel"),
  navButtons: document.querySelectorAll(".nav-button"),
  moduleViews: document.querySelectorAll(".module-view"),
  moduleTitle: document.getElementById("moduleTitle"),
  refreshDashboardBtn: document.getElementById("refreshDashboardBtn"),
  logoutBtn: document.getElementById("logoutBtn"),
  actionNotice: document.getElementById("actionNotice"),
  sessionBadge: document.getElementById("sessionBadge"),
  sessionSummary: document.getElementById("sessionSummary"),
  authSessionPanel: document.getElementById("authSessionPanel"),
  mfaControlPanel: document.getElementById("mfaControlPanel"),
  emailMfaForm: document.getElementById("emailMfaForm"),
  emailMfaSelect: document.getElementById("emailMfaSelect"),
  startTotpSetupBtn: document.getElementById("startTotpSetupBtn"),
  disableTotpBtn: document.getElementById("disableTotpBtn"),
  totpSetupBlock: document.getElementById("totpSetupBlock"),
  totpSetupPanel: document.getElementById("totpSetupPanel"),
  totpSetupError: document.getElementById("totpSetupError"),
  totpSetupQr: document.getElementById("totpSetupQr"),
  totpSetupSecret: document.getElementById("totpSetupSecret"),
  confirmTotpForm: document.getElementById("confirmTotpForm"),
  totpGuidePanel: document.getElementById("totpGuidePanel"),
  authRequirementsPanel: document.getElementById("authRequirementsPanel"),
  rbacMatrixPanel: document.getElementById("rbacMatrixPanel"),
  currentRoleCapabilitiesPanel: document.getElementById("currentRoleCapabilitiesPanel"),
  rolesTableBody: document.getElementById("rolesTableBody"),
  roleCreateForm: document.getElementById("roleCreateForm"),
  roleEditForm: document.getElementById("roleEditForm"),
  roleEditId: document.getElementById("roleEditId"),
  roleEditName: document.getElementById("roleEditName"),
  roleEditDescription: document.getElementById("roleEditDescription"),
  deleteRoleBtn: document.getElementById("deleteRoleBtn"),
  refreshRolesBtn: document.getElementById("refreshRolesBtn"),
  usersTableBody: document.getElementById("usersTableBody"),
  userCreateForm: document.getElementById("userCreateForm"),
  adminCreateStoreSelect: document.getElementById("adminCreateStoreSelect"),
  adminCreateRolesSelect: document.getElementById("adminCreateRolesSelect"),
  userEditForm: document.getElementById("userEditForm"),
  userEditPicker: document.getElementById("userEditPicker"),
  userEditId: document.getElementById("userEditId"),
  userEditEmail: document.getElementById("userEditEmail"),
  userEditFullName: document.getElementById("userEditFullName"),
  userEditStoreSelect: document.getElementById("userEditStoreSelect"),
  deactivateUserBtn: document.getElementById("deactivateUserBtn"),
  assignRoleForm: document.getElementById("assignRoleForm"),
  assignRoleUserSelect: document.getElementById("assignRoleUserSelect"),
  assignRoleRoleSelect: document.getElementById("assignRoleRoleSelect"),
  removeRoleForm: document.getElementById("removeRoleForm"),
  removeRoleUserSelect: document.getElementById("removeRoleUserSelect"),
  removeRoleRoleId: document.getElementById("removeRoleRoleId"),
  refreshUsersBtn: document.getElementById("refreshUsersBtn"),
  abacMatrixPanel: document.getElementById("abacMatrixPanel"),
  currentAbacCapabilitiesPanel: document.getElementById("currentAbacCapabilitiesPanel"),
  reportScopePanel: document.getElementById("reportScopePanel"),
  reportStoreTableBody: document.getElementById("reportStoreTableBody"),
  reportCategoryTableBody: document.getElementById("reportCategoryTableBody"),
  reportLowStockPanel: document.getElementById("reportLowStockPanel"),
  productsTableBody: document.getElementById("productsTableBody"),
  productFilterForm: document.getElementById("productFilterForm"),
  productFilterStoreSelect: document.getElementById("productFilterStoreSelect"),
  productCreateForm: document.getElementById("productCreateForm"),
  createProductBtn: document.getElementById("createProductBtn"),
  productCreateStoreSelect: document.getElementById("productCreateStoreSelect"),
  productUpdateForm: document.getElementById("productUpdateForm"),
  productSelectedSummary: document.getElementById("productSelectedSummary"),
  productUpdateId: document.getElementById("productUpdateId"),
  productUpdateName: document.getElementById("productUpdateName"),
  productUpdateDescription: document.getElementById("productUpdateDescription"),
  productUpdatePrice: document.getElementById("productUpdatePrice"),
  productUpdateStock: document.getElementById("productUpdateStock"),
  productUpdateCategory: document.getElementById("productUpdateCategory"),
  productUpdateStoreSelect: document.getElementById("productUpdateStoreSelect"),
  productUpdatePremium: document.getElementById("productUpdatePremium"),
  productDeleteForm: document.getElementById("productDeleteForm"),
  productDeleteId: document.getElementById("productDeleteId"),
  refreshProductsBtn: document.getElementById("refreshProductsBtn"),
  auditSummaryCards: document.getElementById("auditSummaryCards"),
  auditSummaryPanel: document.getElementById("auditSummaryPanel"),
  auditFilterForm: document.getElementById("auditFilterForm"),
  auditTableBody: document.getElementById("auditTableBody"),
  refreshAuditBtn: document.getElementById("refreshAuditBtn"),
  clearConsoleBtn: document.getElementById("clearConsoleBtn"),
  consoleOutput: document.getElementById("consoleOutput"),
};

function appendLog(title, payload) {
  const timestamp = new Date().toLocaleTimeString("es-PE");
  const sanitizedPayload = sanitizeLogPayload(payload);
  const friendlyMessage = getFriendlyMessage(title, sanitizedPayload);
  const isError = title.toLowerCase().includes("error");
  setNotice(friendlyMessage || getDefaultNotice(title, sanitizedPayload), isError ? "error" : "success");
  const content =
    typeof sanitizedPayload === "string"
      ? sanitizedPayload
      : JSON.stringify(sanitizedPayload, null, 2);
  refs.consoleOutput.textContent = `[${timestamp}] ${title}\n${friendlyMessage ? `${friendlyMessage}\n` : ""}${content}\n\n${refs.consoleOutput.textContent}`;
}

function setNotice(message, type = "info") {
  if (!refs.actionNotice || !message) {
    return;
  }
  refs.actionNotice.textContent = message;
  refs.actionNotice.className = `action-notice ${type}`;
}

function clearNotice() {
  if (!refs.actionNotice) {
    return;
  }
  refs.actionNotice.textContent = "";
  refs.actionNotice.className = "action-notice hidden";
}

function getDefaultNotice(title, payload) {
  if (title.toLowerCase().includes("error")) {
    return payload?.error || payload?.message || "No se pudo completar la accion.";
  }
  if (title.toLowerCase().includes("filtro")) {
    return "Filtro aplicado correctamente.";
  }
  if (title.toLowerCase().includes("cargando")) {
    return "";
  }
  return payload?.message || "Accion completada.";
}

function sanitizeLogPayload(value) {
  if (typeof value === "string") {
    return value.startsWith("data:image/") ? "[QR_DATA_URL_OCULTO]" : value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeLogPayload(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        key === "qrCodeDataUrl" ? "[QR_DATA_URL_OCULTO]" : sanitizeLogPayload(item),
      ])
    );
  }

  return value;
}

function getFriendlyMessage(title, payload) {
  const text = typeof payload === "string" ? payload : payload?.error || payload?.message || "";
  const normalizedTitle = title.toLowerCase();
  const normalizedText = String(text).toLowerCase();

  if (normalizedTitle.includes("login")) {
    return normalizedText.includes("credenciales")
      ? "No se pudo entrar: revisa correo y contraseña."
      : "No se pudo completar el inicio de sesión.";
  }
  if (normalizedTitle.includes("email")) {
    return "Si no llega el código, revisa SMTP. En laboratorio usa EMAIL_DELIVERY_MODE=preview.";
  }
  if (normalizedTitle.includes("mfa") || normalizedTitle.includes("totp")) {
    if (normalizedText.includes("inválido") || normalizedText.includes("invalido")) {
      return "El código no coincide. Espera uno nuevo e inténtalo otra vez.";
    }
    return "No se pudo completar MFA. Revisa que el método esté activo y que el código sea reciente.";
  }
  if (normalizedTitle.includes("qr")) {
    return "No se pudo generar el QR. Inicia sesión de nuevo y vuelve a intentarlo.";
  }
  return "";
}

function saveSession() {
  if (state.token && state.currentUser) {
    localStorage.setItem("techstore-token", state.token);
    localStorage.setItem("techstore-user", JSON.stringify(state.currentUser));
  } else {
    localStorage.removeItem("techstore-token");
    localStorage.removeItem("techstore-user");
  }
}

function restoreSession() {
  const token = localStorage.getItem("techstore-token");
  const user = localStorage.getItem("techstore-user");
  if (token && user) {
    state.token = token;
    try {
      state.currentUser = JSON.parse(user);
    } catch (_error) {
      state.currentUser = null;
    }
  }
}

async function api(path, options = {}) {
  const headers = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {}),
  };
  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw {
      status: response.status,
      ...data,
    };
  }

  return data;
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString("es-PE") : "N/A";
}

function formatCurrency(value) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
  }).format(Number(value || 0));
}

function optionalValue(value) {
  return value === "" ? undefined : value;
}

function selectedValues(select) {
  return Array.from(select.selectedOptions).map((option) => option.value);
}

function roleNames() {
  return state.currentUser?.roles || [];
}

function hasRole(roleName) {
  return roleNames().includes(roleName);
}

function canManageRbac() {
  return hasRole("Administrador");
}

function canReadUsers() {
  return hasRole("Administrador") || hasRole("Auditor");
}

function canCreateProduct() {
  return hasRole("Administrador") || hasRole("Gerente") || hasRole("Empleado");
}

function canUpdateProduct() {
  return hasRole("Administrador") || hasRole("Gerente") || hasRole("Empleado");
}

function canDeleteProduct() {
  return hasRole("Administrador") || hasRole("Gerente");
}

function canDeleteProductItem(product) {
  if (hasRole("Administrador")) {
    return true;
  }
  if (hasRole("Gerente")) {
    return !product.isPremium;
  }
  return false;
}

function canViewAudit() {
  return hasRole("Administrador") || hasRole("Auditor");
}

function ensureSession() {
  if (!state.token) {
    throw new Error("Debes iniciar sesión.");
  }
}

function setAuthTab(tab) {
  state.currentAuthTab = tab;
  refs.showLoginTabBtn.classList.toggle("active", tab === "login");
  refs.showRegisterTabBtn.classList.toggle("active", tab === "register");
  refs.loginTab.classList.toggle("active", tab === "login");
  refs.registerTab.classList.toggle("active", tab === "register");
}

function setModule(module) {
  state.currentModule = module;
  clearNotice();
  refs.navButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.module === module);
  });
  refs.moduleViews.forEach((view) => {
    view.classList.toggle("active", view.id === `module-${module}`);
  });
  refs.moduleTitle.textContent = MODULE_TITLES[module] || "Panel";
}

function toggleAppShell() {
  const authenticated = Boolean(state.token && state.currentUser);
  refs.authShell.classList.toggle("hidden", authenticated);
  refs.dashboardShell.classList.toggle("hidden", !authenticated);
}

function renderSeedUsers() {
  if (!state.bootstrap) {
    return;
  }
  const password = state.bootstrap.demoPassword;
  refs.authPolicyNote.innerHTML = `
    <strong>Password demo:</strong> <span class="mono">${password}</span><br />
    OTP simple: ${state.bootstrap.notes.email}<br />
    Google Authenticator: no requiere API externa, solo TOTP estándar.
  `;

  refs.seedUsersList.innerHTML = state.bootstrap.demoUsers
    .map(
      (user) => `
        <div class="detail-line">
          <span>
            <strong>${user.email}</strong><br />
            ${user.role} · ${user.store}
          </span>
          <button class="chip-button" type="button" data-demo-email="${user.email}">
            Usar
          </button>
        </div>
      `
    )
    .join("");

  refs.demoLoginButtons.innerHTML = state.bootstrap.demoUsers
    .map(
      (user) => `
        <button class="chip-button" type="button" data-demo-email="${user.email}">
          ${user.role}
        </button>
      `
    )
    .join("");
}

function fillStoreSelects() {
  if (!state.bootstrap) {
    return;
  }
  const options = state.bootstrap.stores
    .map((store) => `<option value="${store.id}">${store.name}</option>`)
    .join("");

  refs.registerStoreSelect.innerHTML = options;
  refs.adminCreateStoreSelect.innerHTML = options;
  refs.productCreateStoreSelect.innerHTML = options;
  refs.productFilterStoreSelect.innerHTML = `<option value="">Todas</option>${options}`;
  refs.userEditStoreSelect.innerHTML = `<option value="">Sin cambio</option>${options}`;
  refs.productUpdateStoreSelect.innerHTML = `<option value="">Sin cambio</option>${options}`;
}

function renderChallenge() {
  const active = Boolean(state.pendingChallengeId);
  refs.challengePanel.classList.toggle("hidden", !active);
  if (!active) {
    refs.challengeMethods.innerHTML = "";
    refs.challengeSummary.textContent = "";
    refs.emailPreviewPanel.classList.add("hidden");
    refs.emailPreviewPanel.innerHTML = "";
    refs.mfaMethodSelect.innerHTML = "";
    refs.challengeActions.classList.remove("hidden");
    refs.mfaMethodField.classList.remove("hidden");
    refs.sendEmailCodeBtn.disabled = false;
    return;
  }

  refs.challengeMethods.innerHTML = state.pendingMethods
    .map((method) => `<span class="tag">${method.toUpperCase()}</span>`)
    .join("");
  refs.mfaMethodSelect.innerHTML = state.pendingMethods
    .map((method) => `<option value="${method}">${method.toUpperCase()}</option>`)
    .join("");
  refs.challengeSummary.textContent = state.autoOtpMode
    ? "Se envió un código OTP automáticamente. Solo ingrésalo para completar el acceso."
    : "Elige el metodo activo, genera el codigo si es email, y escribelo antes de que expire.";
  refs.sendEmailCodeBtn.disabled = !state.pendingMethods.includes("email");
  refs.challengeActions.classList.toggle("hidden", state.autoOtpMode);
  refs.mfaMethodField.classList.toggle("hidden", state.autoOtpMode);
}

function clearChallenge() {
  state.pendingChallengeId = null;
  state.pendingMethods = [];
  state.challengeExpiresAt = null;
  state.autoOtpMode = false;
  renderChallenge();
}

function applyCurrentUser(user) {
  state.currentUser = user;
  saveSession();
  renderSession();
  renderCurrentRoleCapabilities();
  renderCurrentAbacCapabilities();
}

function isRenderableQrCodeDataUrl(value) {
  return typeof value === "string" && value.startsWith("data:image/");
}

function renderTotpSetup() {
  const qrSrc = state.totpSetup?.totp?.qrCodeDataUrl;
  const secret = String(state.totpSetup?.totp?.secret || "").trim();
  const hasSetup = Boolean(state.totpSetup?.totp);
  const hasQrValue = typeof qrSrc === "string" && qrSrc.length > 0;
  const hasRenderableQrCode = isRenderableQrCodeDataUrl(qrSrc) && !state.totpQrRenderFailed;
  const errorMessage =
    state.totpSetupError ||
    (hasSetup && !hasQrValue
      ? "El backend no devolvió un QR TOTP para esta cuenta."
      : hasSetup && !hasRenderableQrCode
        ? "El QR TOTP recibido es inválido o no pudo renderizarse. Debe llegar como data:image/png;base64,..."
        : "");
  const showBlock = hasSetup || Boolean(errorMessage);

  refs.totpSetupBlock.classList.toggle("hidden", !showBlock);
  refs.confirmTotpForm.classList.toggle("hidden", !hasSetup);

  if (!showBlock) {
    refs.totpSetupPanel.classList.remove("has-error");
    refs.totpSetupError.classList.add("hidden");
    refs.totpSetupError.textContent = "";
    refs.totpSetupQr.classList.add("hidden");
    refs.totpSetupQr.removeAttribute("src");
    refs.totpSetupQr.removeAttribute("width");
    refs.totpSetupQr.removeAttribute("height");
    refs.totpSetupSecret.classList.add("hidden");
    refs.totpSetupSecret.textContent = "";
    refs.confirmTotpForm.reset();
    return;
  }

  refs.totpSetupPanel.classList.toggle("has-error", Boolean(errorMessage));
  refs.totpSetupError.classList.toggle("hidden", !errorMessage);
  refs.totpSetupError.textContent = errorMessage;

  if (hasRenderableQrCode) {
    console.log("QR src usado por img:", state.totpSetup?.totp?.qrCodeDataUrl?.slice(0, 50));
    refs.totpSetupQr.onerror = () => {
      refs.totpSetupQr.onerror = null;
      state.totpQrRenderFailed = true;
      state.totpSetupError = "El navegador no pudo renderizar el QR devuelto por el backend.";
      renderTotpSetup();
    };
    refs.totpSetupQr.onload = () => {
      if (!state.totpQrRenderFailed) {
        return;
      }
      state.totpQrRenderFailed = false;
      state.totpSetupError = "";
      renderTotpSetup();
    };
    refs.totpSetupQr.src = qrSrc;
    refs.totpSetupQr.setAttribute("src", qrSrc);
    refs.totpSetupQr.width = 220;
    refs.totpSetupQr.height = 220;
    refs.totpSetupQr.classList.remove("hidden");
  } else {
    refs.totpSetupQr.onerror = null;
    refs.totpSetupQr.onload = null;
    refs.totpSetupQr.classList.add("hidden");
    refs.totpSetupQr.removeAttribute("src");
    refs.totpSetupQr.removeAttribute("width");
    refs.totpSetupQr.removeAttribute("height");
  }

  if (secret) {
    refs.totpSetupSecret.textContent = `Clave manual: ${secret}`;
    refs.totpSetupSecret.classList.remove("hidden");
  } else {
    refs.totpSetupSecret.textContent = "";
    refs.totpSetupSecret.classList.add("hidden");
  }
}

function renderSession() {
  if (!state.currentUser) {
    refs.sessionSummary.innerHTML = "<p>No hay sesión.</p>";
    refs.sessionBadge.textContent = "Sin sesión";
    refs.sessionBadge.className = "status-pill status-off";
    refs.authSessionPanel.innerHTML = "<p>No hay sesión activa.</p>";
    refs.mfaControlPanel.innerHTML = "<p>Inicia sesión para gestionar MFA.</p>";
    refs.emailMfaSelect.value = "none";
    refs.startTotpSetupBtn.disabled = true;
    refs.disableTotpBtn.classList.add("hidden");
    state.totpSetup = null;
    state.totpSetupError = "";
    state.totpQrRenderFailed = false;
    renderTotpSetup();
    refs.totpGuidePanel.innerHTML = "<p>Inicia sesión para ver el estado MFA de la cuenta actual.</p>";
    renderAdminControls();
    return;
  }

  refs.sessionBadge.textContent = "Sesión activa";
  refs.sessionBadge.className = "status-pill status-on";
  refs.sessionSummary.innerHTML = `
    <p><strong>${state.currentUser.fullName}</strong></p>
    <p>${state.currentUser.email}</p>
    <p>${state.currentUser.roles.join(", ")} · ${state.currentUser.store.name}</p>
  `;

  refs.authSessionPanel.innerHTML = `
    <div class="detail-line"><span>Usuario</span><strong>${state.currentUser.fullName}</strong></div>
    <div class="detail-line"><span>Email</span><strong>${state.currentUser.email}</strong></div>
    <div class="detail-line"><span>Tienda</span><strong>${state.currentUser.store.name}</strong></div>
    <div class="detail-line"><span>Roles</span><strong>${state.currentUser.roles.join(", ")}</strong></div>
    <div class="detail-line"><span>MFA por email</span><strong>${state.currentUser.mfaEmailEnabled ? "Sí" : "No"}</strong></div>
    <div class="detail-line"><span>TOTP</span><strong>${state.currentUser.mfaTotpEnabled ? "Sí" : "No"}</strong></div>
    <div class="detail-line"><span>JWT</span><strong class="mono">${state.token.slice(0, 36)}...</strong></div>
  `;

  refs.mfaControlPanel.innerHTML = `
    <div class="detail-line"><span>Metodo actual</span><strong>${getCurrentMfaLabel()}</strong></div>
    <div class="detail-line"><span>Para entrar</span><strong>${getCurrentMfaRequirement()}</strong></div>
    <div class="detail-line"><span>Estado QR</span><strong>${getTotpStatusLabel()}</strong></div>
    <div class="detail-line"><span>Aplicacion</span><strong>Google Authenticator o compatible.</strong></div>
    ${
      state.currentUser.mfaTotpEnabled
        ? `<div class="inline-warning">OTP ya esta configurado. Si cambias el metodo MFA, se pedira confirmacion antes de quitar el QR actual.</div>`
        : ""
    }
  `;

  refs.emailMfaSelect.value = state.totpSetup
    ? "totp"
    : state.currentUser.mfaTotpEnabled
    ? "totp"
    : state.currentUser.mfaEmailEnabled
      ? "email"
      : "none";
  refs.startTotpSetupBtn.disabled = false;
  refs.disableTotpBtn.classList.toggle("hidden", !state.currentUser.mfaTotpEnabled);
  renderTotpSetup();
  renderAdminControls();

  refs.totpGuidePanel.innerHTML = `
    <div class="detail-line"><span>Opcion principal</span><strong>OTP con Google Authenticator.</strong></div>
    <div class="detail-line"><span>Necesitas</span><strong>Celular con Google Authenticator instalado.</strong></div>
    <div class="detail-line"><span>Si ya esta activo</span><strong>No generes otro QR; solo usa el codigo de la app al entrar.</strong></div>
  `;
}

function getTotpStatusLabel() {
  if (state.currentUser?.mfaTotpEnabled) {
    return "Activo. Ya puedes usar tu app para entrar.";
  }
  if (state.totpSetup) {
    return "QR generado. Falta confirmar el codigo.";
  }
  return "Pendiente. Guarda OTP para generar el QR.";
}

function getCurrentMfaLabel() {
  if (state.currentUser?.mfaTotpEnabled) {
    return "OTP con app";
  }
  if (state.currentUser?.mfaEmailEnabled) {
    return "Codigo por email";
  }
  return "Sin MFA";
}

function getCurrentMfaRequirement() {
  if (state.currentUser?.mfaTotpEnabled) {
    return "Contraseña + codigo de la app.";
  }
  if (state.currentUser?.mfaEmailEnabled) {
    return "Contraseña + codigo del correo.";
  }
  return "Solo contraseña.";
}

function renderAuthRequirements() {
  if (!state.bootstrap) {
    refs.authRequirementsPanel.innerHTML = "<p>Cargando reglas...</p>";
    return;
  }
  refs.authRequirementsPanel.innerHTML = state.bootstrap.policies.authentication
    .slice(0, 4)
    .map((rule) => `<div class="detail-line"><span>${rule}</span></div>`)
    .join("") +
    `
      <div class="detail-line"><span>Email no llega</span><strong>Configura SMTP o usa preview.</strong></div>
      <div class="detail-line"><span>OTP falla</span><strong>Revisa hora del celular o genera otro QR.</strong></div>
    `;
}

function renderMatrix(headers, rows) {
  return `
    <table>
      <thead>
        <tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row) => `
              <tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>
            `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function renderRbacMatrix() {
  if (!state.bootstrap) {
    return;
  }
  const rows = Object.entries(state.bootstrap.policies.roles).map(([role, permissions]) => [
    role,
    permissions.roles.create ? "Sí" : "No",
    permissions.roles.read ? "Sí" : "No",
    permissions.roles.update ? "Sí" : "No",
    permissions.roles.delete ? "Sí" : "No",
    permissions.users.create ? "Sí" : "No",
    permissions.users.read ? "Sí" : "No",
    permissions.users.update ? "Sí" : "No",
    permissions.users.delete ? "Sí" : "No",
    permissions.users.assignRoles ? "Sí" : "No",
  ]);
  refs.rbacMatrixPanel.innerHTML = renderMatrix(
    [
      "Rol",
      "Crear rol",
      "Leer roles",
      "Editar rol",
      "Eliminar rol",
      "Crear usuario",
      "Leer usuarios",
      "Editar usuario",
      "Desactivar usuario",
      "Asignar roles",
    ],
    rows
  );
}

function renderCurrentRoleCapabilities() {
  if (!state.currentUser || !state.bootstrap) {
    refs.currentRoleCapabilitiesPanel.innerHTML = "<p>Inicia sesión para ver permisos.</p>";
    return;
  }

  const blocks = roleNames()
    .map((role) => {
      const config = state.bootstrap.policies.roles[role];
      if (!config) {
        return "";
      }
      return `
        <div class="detail-line">
          <span>
            <strong>${role}</strong><br />
            Roles: ${Object.entries(config.roles)
              .filter(([, allowed]) => allowed)
              .map(([key]) => key)
              .join(", ") || "sin privilegios"}<br />
            Usuarios: ${Object.entries(config.users)
              .filter(([, allowed]) => allowed)
              .map(([key]) => key)
              .join(", ") || "sin privilegios"}
          </span>
        </div>
      `;
    })
    .join("");

  refs.currentRoleCapabilitiesPanel.innerHTML = blocks || "<p>Sin roles cargados.</p>";
}

function renderAbacMatrix() {
  if (!state.bootstrap) {
    return;
  }
  const rows = Object.entries(state.bootstrap.policies.products).map(([role, rules]) => [
    role,
    rules.select,
    rules.insert,
    rules.update,
    rules.delete,
  ]);
  refs.abacMatrixPanel.innerHTML = renderMatrix(
    ["Rol", "SELECT", "INSERT", "UPDATE", "DELETE"],
    rows
  );
}

function renderCurrentAbacCapabilities() {
  if (!state.currentUser || !state.bootstrap) {
    refs.currentAbacCapabilitiesPanel.innerHTML = "<p>Inicia sesión para ver reglas ABAC.</p>";
    return;
  }

  refs.currentAbacCapabilitiesPanel.innerHTML = roleNames()
    .map((role) => {
      const rules = state.bootstrap.policies.products[role];
      if (!rules) {
        return "";
      }
      return `
        <div class="detail-line">
          <span>
            <strong>${role}</strong><br />
            SELECT: ${rules.select}<br />
            INSERT: ${rules.insert}<br />
            UPDATE: ${rules.update}<br />
            DELETE: ${rules.delete}
          </span>
        </div>
      `;
    })
    .join("");
}

function renderAdminControls() {
  const isAdmin = canManageRbac();
  [
    refs.roleCreateForm,
    refs.roleEditForm,
    refs.userCreateForm,
    refs.userEditForm,
    refs.assignRoleForm,
    refs.removeRoleForm,
  ].forEach((element) => {
    element.classList.toggle("hidden", !isAdmin);
  });

  refs.productCreateForm.classList.toggle("hidden", !canCreateProduct());
  refs.productUpdateForm.classList.toggle("hidden", !canUpdateProduct());
  refs.productDeleteForm.classList.toggle("hidden", !canDeleteProduct());
  refs.createProductBtn.classList.toggle("hidden", !canCreateProduct());
  refs.auditFilterForm.classList.toggle("hidden", !canViewAudit());
  refs.refreshAuditBtn.classList.toggle("hidden", !canViewAudit());
  updateProductFormVisibility();
  showProductAction(state.productAction);
}

function setFieldVisible(field, visible) {
  const wrapper = field?.closest("label");
  if (wrapper) {
    wrapper.classList.toggle("hidden", !visible);
  }
}

function updateProductFormVisibility() {
  const employeeOnly = hasRole("Empleado") && !hasRole("Administrador") && !hasRole("Gerente");
  const managerOnly = hasRole("Gerente") && !hasRole("Administrador");

  setFieldVisible(refs.productUpdateName, !employeeOnly);
  setFieldVisible(refs.productUpdateDescription, !employeeOnly);
  setFieldVisible(refs.productUpdatePrice, !employeeOnly);
  setFieldVisible(refs.productUpdateCategory, !employeeOnly && !managerOnly);
  setFieldVisible(refs.productUpdateStoreSelect, hasRole("Administrador"));
  setFieldVisible(refs.productUpdatePremium, !employeeOnly);

  const createPremiumLabel = refs.productCreateForm.querySelector("[name='isPremium']")?.closest("label");
  createPremiumLabel?.classList.toggle("hidden", !hasRole("Administrador") && !hasRole("Gerente"));

  if (state.currentUser && !hasRole("Administrador")) {
    refs.productCreateStoreSelect.value = String(state.currentUser.storeId);
    refs.productUpdateStoreSelect.value = "";
    setFieldVisible(refs.productCreateStoreSelect, false);
  } else {
    setFieldVisible(refs.productCreateStoreSelect, true);
  }
}

function showProductAction(action) {
  state.productAction = action;
  refs.productCreateForm.classList.toggle("hidden", action !== "create" || !canCreateProduct());
  refs.productUpdateForm.classList.toggle("hidden", action !== "update" || !canUpdateProduct());
  refs.productDeleteForm.classList.add("hidden");

  const target =
    action === "create"
      ? refs.productCreateForm
      : action === "update"
        ? refs.productUpdateForm
        : null;
  target?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderRolesTable() {
  if (!state.token) {
    refs.rolesTableBody.innerHTML = `<tr><td colspan="4">Inicia sesión para consultar roles.</td></tr>`;
    return;
  }

  refs.rolesTableBody.innerHTML =
    state.roles.length === 0
      ? `<tr><td colspan="4">No hay roles disponibles.</td></tr>`
      : state.roles
          .map(
            (role) => `
              <tr>
                <td>${role.id}</td>
                <td>${role.name}</td>
                <td>${role.description}</td>
                <td>${canManageRbac() ? `<button class="chip-button" type="button" data-role-id="${role.id}">Editar</button>` : "Solo lectura"}</td>
              </tr>
            `
          )
          .join("");
}

function renderUsersTable(message) {
  if (message) {
    refs.assignRoleUserSelect.innerHTML = "";
    refs.removeRoleUserSelect.innerHTML = "";
    refs.usersTableBody.innerHTML = `<tr><td colspan="6">${message}</td></tr>`;
    return;
  }
  refs.usersTableBody.innerHTML =
    state.users.length === 0
      ? `<tr><td colspan="6">No hay usuarios disponibles.</td></tr>`
      : state.users
          .map(
            (user) => `
              <tr>
                <td>${user.id}</td>
                <td>${user.email}</td>
                <td>${user.fullName}</td>
                <td>${user.store.name}</td>
                <td>${user.roles.join(", ")}</td>
                <td>${canManageRbac() ? `<button class="chip-button" type="button" data-user-id="${user.id}">Seleccionar</button>` : "Solo lectura"}</td>
              </tr>
            `
          )
          .join("");
}

function renderProductsTable(message) {
  if (message) {
    refs.productsTableBody.innerHTML = `<tr><td colspan="8">${message}</td></tr>`;
    return;
  }
  refs.productsTableBody.innerHTML =
    state.products.length === 0
      ? `<tr><td colspan="8">No hay productos visibles para esta cuenta.</td></tr>`
      : state.products
          .map(
            (product) => `
              <tr>
                <td>${product.id}</td>
                <td>${product.name}</td>
                <td>${product.store.name}</td>
                <td>${product.category}</td>
                <td>${formatCurrency(product.price)}</td>
                <td>${product.stock}</td>
                <td>${product.isPremium ? "Sí" : "No"}</td>
                <td>
                  <div class="row-actions">
                    ${canUpdateProduct() ? `<button class="chip-button" type="button" data-product-edit="${product.id}">Editar</button>` : ""}
                    ${canDeleteProductItem(product) ? `<button class="chip-button danger-chip" type="button" data-product-delete="${product.id}">Eliminar</button>` : ""}
                    ${!canUpdateProduct() && !canDeleteProductItem(product) ? "Solo lectura" : ""}
                  </div>
                </td>
              </tr>
            `
          )
          .join("");
}

function renderInventoryReport(message) {
  if (message) {
    refs.reportScopePanel.innerHTML = `<p>${message}</p>`;
    refs.reportStoreTableBody.innerHTML = `<tr><td colspan="5">${message}</td></tr>`;
    refs.reportCategoryTableBody.innerHTML = `<tr><td colspan="4">${message}</td></tr>`;
    refs.reportLowStockPanel.innerHTML = "<p>Sin reporte disponible.</p>";
    return;
  }

  if (!state.inventoryReport) {
    refs.reportScopePanel.innerHTML = "<p>Sin datos de reportes.</p>";
    refs.reportStoreTableBody.innerHTML = `<tr><td colspan="5">Sin datos.</td></tr>`;
    refs.reportCategoryTableBody.innerHTML = `<tr><td colspan="4">Sin datos.</td></tr>`;
    refs.reportLowStockPanel.innerHTML = "<p>Sin alertas disponibles.</p>";
    return;
  }

  const scopeLabel =
    state.inventoryReport.scope === "store"
      ? `Reporte filtrado para la tienda ${state.currentUser.store.name}.`
      : "Reporte global de inventario.";

  refs.reportScopePanel.innerHTML = `
    <div class="detail-line"><span>Alcance</span><strong>${scopeLabel}</strong></div>
    <div class="detail-line"><span>Generado</span><strong>${formatDate(state.inventoryReport.generatedAt)}</strong></div>
    <div class="detail-line"><span>Perfil habilitado</span><strong>${roleNames().join(", ")}</strong></div>
  `;

  refs.reportStoreTableBody.innerHTML =
    state.inventoryReport.storeSummary.length === 0
      ? `<tr><td colspan="5">Sin filas de resumen.</td></tr>`
      : state.inventoryReport.storeSummary
          .map(
            (item) => `
              <tr>
                <td>${item.name}</td>
                <td>${item.products}</td>
                <td>${item.premiumProducts}</td>
                <td>${item.totalStock}</td>
                <td>${formatCurrency(item.inventoryValue)}</td>
              </tr>
            `
          )
          .join("");

  refs.reportCategoryTableBody.innerHTML =
    state.inventoryReport.categorySummary.length === 0
      ? `<tr><td colspan="4">Sin categorías visibles.</td></tr>`
      : state.inventoryReport.categorySummary
          .map(
            (item) => `
              <tr>
                <td>${item.category}</td>
                <td>${item.products}</td>
                <td>${item.totalStock}</td>
                <td>${formatCurrency(item.inventoryValue)}</td>
              </tr>
            `
          )
          .join("");

  refs.reportLowStockPanel.innerHTML =
    state.inventoryReport.lowStockProducts.length === 0
      ? "<p>No hay productos con stock crítico.</p>"
      : state.inventoryReport.lowStockProducts
          .map(
            (item) => `
              <div class="detail-line">
                <span>${item.name}<br />${item.storeName}</span>
                <strong>${item.stock} und.</strong>
              </div>
            `
          )
          .join("");
}

function renderAuditSummary() {
  if (!state.auditSummary) {
    refs.auditSummaryCards.innerHTML = "";
    refs.auditSummaryPanel.innerHTML = "<p>Sin datos de auditoría.</p>";
    return;
  }

  refs.auditSummaryCards.innerHTML = [
    ["Total", state.auditSummary.totals.total],
    ["Permitidos", state.auditSummary.totals.allowed_total],
    ["Denegados", state.auditSummary.totals.denied_total],
    ["Denegados 24h", state.auditSummary.deniedLast24h],
  ]
    .map(
      ([label, value]) => `
        <article class="stat-card">
          <p class="stat-label">${label}</p>
          <p class="stat-value">${value}</p>
        </article>
      `
    )
    .join("");

  refs.auditSummaryPanel.innerHTML = state.auditSummary.topActions
    .map(
      (item) => `
        <div class="detail-line">
          <span>${item.action}</span>
          <strong>${item.total}</strong>
        </div>
      `
    )
    .join("");
}

function renderAuditTable(message) {
  if (message) {
    refs.auditTableBody.innerHTML = `<tr><td colspan="6">${message}</td></tr>`;
    return;
  }

  refs.auditTableBody.innerHTML =
    state.auditLogs.length === 0
      ? `<tr><td colspan="6">No hay logs para el filtro actual.</td></tr>`
      : state.auditLogs
          .map(
            (log) => `
              <tr>
                <td>${formatDate(log.created_at)}</td>
                <td>${log.user_email || "Sistema"}</td>
                <td>${log.action}</td>
                <td>${log.resource}${log.resource_id ? `#${log.resource_id}` : ""}</td>
                <td><span class="result-pill ${log.allowed ? "result-allowed" : "result-denied"}">${log.allowed ? "Permitido" : "Denegado"}</span></td>
                <td>${log.detail || ""}</td>
              </tr>
            `
          )
          .join("");
}

function fillRoleSelects() {
  const roleOptions = state.roles
    .map((role) => `<option value="${role.name}">${role.name}</option>`)
    .join("");
  refs.adminCreateRolesSelect.innerHTML = roleOptions;
  refs.assignRoleRoleSelect.innerHTML = roleOptions;
  const employeeOption = Array.from(refs.adminCreateRolesSelect.options).find(
    (option) => option.value === "Empleado"
  );
  if (employeeOption) {
    employeeOption.selected = true;
  }
}

function fillUserSelects() {
  const options = state.users
    .map((user) => `<option value="${user.id}">${user.email}</option>`)
    .join("");
  refs.assignRoleUserSelect.innerHTML = options;
  refs.removeRoleUserSelect.innerHTML = options;
  refs.userEditPicker.innerHTML = `<option value="">Selecciona un usuario</option>${options}`;
  updateRemoveRoleOptions(refs.removeRoleUserSelect.value);
}

function updateRemoveRoleOptions(userId) {
  const user = state.users.find((item) => String(item.id) === String(userId));
  refs.removeRoleRoleId.innerHTML = user?.roleDetails?.length
    ? user.roleDetails
        .map((role) => `<option value="${role.id}">${role.name}</option>`)
        .join("")
    : `<option value="">Sin roles asignados</option>`;
}

function populateRole(roleId) {
  const role = state.roles.find((item) => item.id === roleId);
  if (!role) {
    return;
  }
  refs.roleEditId.value = role.id;
  refs.roleEditName.value = role.name;
  refs.roleEditDescription.value = role.description;
  setNotice(`Rol "${role.name}" cargado para edición.`, "info");
}

function populateUser(userId) {
  const user = state.users.find((item) => item.id === userId);
  if (!user) {
    return;
  }
  refs.userEditId.value = user.id;
  refs.userEditPicker.value = String(user.id);
  refs.userEditEmail.value = user.email;
  refs.userEditFullName.value = user.fullName;
  refs.userEditStoreSelect.value = String(user.storeId);
  refs.userEditForm.elements.active.value = user.active ? "true" : "false";
  refs.userEditForm.elements.password.value = "";
  refs.assignRoleUserSelect.value = String(user.id);
  refs.removeRoleUserSelect.value = String(user.id);
  updateRemoveRoleOptions(user.id);
  setNotice(`Usuario ${user.email} cargado para edición.`, "info");
  refs.userEditForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function populateProduct(productId) {
  const product = state.products.find((item) => item.id === productId);
  if (!product) {
    return;
  }
  refs.productUpdateId.value = product.id;
  refs.productUpdateName.value = product.name;
  refs.productUpdateDescription.value = product.description;
  refs.productUpdatePrice.value = product.price;
  refs.productUpdateStock.value = product.stock;
  refs.productUpdateCategory.value = product.category;
  refs.productDeleteId.value = product.id;
  refs.productSelectedSummary.innerHTML = `
    <strong>${product.name}</strong>
    <span>${product.store.name} · ${product.category} · Stock ${product.stock}</span>
  `;
  if (hasRole("Gerente") && !hasRole("Administrador") && product.isPremium) {
    setNotice("Este producto es premium. Un gerente puede verlo y editarlo, pero no eliminarlo.", "info");
  } else {
    setNotice(`Producto "${product.name}" cargado para editar.`, "info");
  }
}

async function deleteProductById(productId) {
  const product = state.products.find((item) => item.id === productId);
  if (!product) {
    setNotice("Producto no encontrado en la lista actual.", "error");
    return;
  }
  if (!canDeleteProductItem(product)) {
    setNotice("Tu cuenta no puede eliminar este producto.", "error");
    return;
  }
  const confirmed = window.confirm(`¿Eliminar "${product.name}"? Esta accion no se puede deshacer.`);
  if (!confirmed) {
    setNotice("Eliminacion cancelada.", "info");
    return;
  }
  refs.productDeleteId.value = product.id;
  await handleDeleteProduct(new Event("submit"));
}

async function loadBootstrap() {
  const bootstrap = await api("/api/meta/bootstrap");
  state.bootstrap = bootstrap;
  renderSeedUsers();
  fillStoreSelects();
  renderAuthRequirements();
  renderRbacMatrix();
  renderAbacMatrix();
}

async function validateStoredSession() {
  if (!state.token) {
    return;
  }
  try {
    const me = await api("/api/auth/me");
    state.currentUser = me.user;
    saveSession();
  } catch (_error) {
    state.token = null;
    state.currentUser = null;
    saveSession();
  }
}

async function loadRoles() {
  try {
    ensureSession();
    const result = await api("/api/roles");
    state.roles = result.roles;
    renderRolesTable();
    fillRoleSelects();
  } catch (error) {
    state.roles = [];
    renderRolesTable();
    appendLog("Error cargando roles", error);
  }
}

async function loadUsers() {
  if (!(hasRole("Administrador") || hasRole("Auditor"))) {
    state.users = [];
    renderUsersTable("Solo Administrador o Auditor pueden consultar usuarios.");
    return;
  }

  try {
    const result = await api("/api/users");
    state.users = result.users;
    renderUsersTable();
    fillUserSelects();
  } catch (error) {
    state.users = [];
    renderUsersTable(error.error || "No se pudieron cargar los usuarios.");
    appendLog("Error cargando usuarios", error);
  }
}

async function loadInventoryReport() {
  if (!(hasRole("Administrador") || hasRole("Gerente") || hasRole("Auditor"))) {
    state.inventoryReport = null;
    renderInventoryReport("Solo Administrador, Gerente o Auditor pueden ver reportes.");
    return;
  }

  try {
    const result = await api("/api/reports/inventory");
    state.inventoryReport = result;
    renderInventoryReport();
  } catch (error) {
    state.inventoryReport = null;
    renderInventoryReport(error.error || "No se pudo cargar reportes.");
    appendLog("Error cargando reportes", error);
  }
}

async function loadProducts(filters = {}) {
  try {
    ensureSession();
    const params = new URLSearchParams(
      Object.entries(filters).filter(([, value]) => value !== undefined && value !== "")
    );
    const result = await api(`/api/products${params.toString() ? `?${params}` : ""}`);
    state.products = result.products;
    renderProductsTable();
    renderAdminControls();
  } catch (error) {
    state.products = [];
    renderProductsTable(error.error || "No se pudieron cargar productos.");
    appendLog("Error cargando productos", error);
  }
}

async function loadAudit(filters = {}) {
  if (!(hasRole("Administrador") || hasRole("Auditor"))) {
    state.auditSummary = null;
    state.auditLogs = [];
    renderAuditSummary();
    renderAuditTable("Solo Administrador o Auditor pueden ver auditoría.");
    return;
  }

  try {
    const summary = await api("/api/audit-logs/summary");
    const params = new URLSearchParams(
      Object.entries(filters).filter(([, value]) => value !== undefined && value !== "")
    );
    const logs = await api(`/api/audit-logs${params.toString() ? `?${params}` : ""}`);
    state.auditSummary = summary;
    state.auditLogs = logs.logs;
    renderAuditSummary();
    renderAuditTable();
  } catch (error) {
    state.auditSummary = null;
    state.auditLogs = [];
    renderAuditSummary();
    renderAuditTable(error.error || "No se pudo cargar auditoría.");
    appendLog("Error cargando auditoría", error);
  }
}

async function refreshDashboardData() {
  if (!state.token) {
    return;
  }
  renderCurrentRoleCapabilities();
  renderCurrentAbacCapabilities();
  await loadRoles();
  await loadUsers();
  await loadInventoryReport();
  await loadProducts();
  await loadAudit({ limit: 30 });
}

async function completeLogin(result) {
  state.token = result.token;
  state.totpSetup = null;
  state.totpSetupError = "";
  state.totpQrRenderFailed = false;
  clearChallenge();
  applyCurrentUser(result.user);
  toggleAppShell();
  await refreshDashboardData();
  setModule("auth");
}

async function handleRegister(event) {
  event.preventDefault();
  try {
    const form = event.currentTarget;
    const payload = {
      email: form.email.value,
      password: form.password.value,
      fullName: form.fullName.value,
      storeId: Number(form.storeId.value),
    };
    const result = await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    form.reset();
    if (refs.registerStoreSelect.options.length > 0) {
      refs.registerStoreSelect.selectedIndex = 0;
    }
    refs.loginEmailInput.value = payload.email;
    refs.loginPasswordInput.value = payload.password;
    setAuthTab("login");
    appendLog("Registro completado", result);
  } catch (error) {
    appendLog("Error en registro", error);
  }
}

async function handleLogin(event) {
  event.preventDefault();
  try {
    const result = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: refs.loginEmailInput.value,
        password: refs.loginPasswordInput.value,
      }),
    });

    if (result.mfaRequired) {
      state.pendingChallengeId = result.challengeId;
      state.pendingMethods = result.availableMethods;
      state.challengeExpiresAt = result.challengeExpiresAt;
      state.autoOtpMode =
        result.availableMethods.length === 1 && result.availableMethods[0] === "email";
      renderChallenge();
      if (state.autoOtpMode && result.autoDelivery) {
        refs.emailPreviewPanel.classList.remove("hidden");
        refs.emailPreviewPanel.innerHTML =
          result.autoDelivery.delivery.mode === "preview"
            ? `<p><strong>Modo preview:</strong> usa el código <span class="mono">${result.autoDelivery.delivery.previewCode}</span>.</p>`
            : `<p>El código OTP fue enviado por email real.</p>`;
      } else if (state.autoOtpMode) {
        await handleSendEmailCode();
      }
      appendLog("Challenge MFA recibido", result);
      return;
    }

    await completeLogin(result);
    appendLog("Login completado", result);
  } catch (error) {
    appendLog("Error en login", error);
  }
}

async function handleSendEmailCode() {
  try {
    const result = await api("/api/auth/mfa/email/send", {
      method: "POST",
      body: JSON.stringify({
        challengeId: state.pendingChallengeId,
      }),
    });
    refs.emailPreviewPanel.classList.remove("hidden");
    refs.emailPreviewPanel.innerHTML =
      result.delivery.mode === "preview"
        ? `<p><strong>Modo preview:</strong> usa el código <span class="mono">${result.delivery.previewCode}</span>.</p>`
        : `<p>El código fue enviado por email real.</p>`;
    appendLog("Código MFA por email emitido", result);
  } catch (error) {
    appendLog("Error enviando MFA email", error);
  }
}

async function handleVerifyMfa(event) {
  event.preventDefault();
  try {
    const form = event.currentTarget;
    const result = await api("/api/auth/mfa/verify", {
      method: "POST",
      body: JSON.stringify({
        challengeId: state.pendingChallengeId,
        method: refs.mfaMethodSelect.value,
        code: form.code.value,
      }),
    });
    await completeLogin(result);
    appendLog("MFA validado", result);
  } catch (error) {
    appendLog("Error validando MFA", error);
  }
}

async function handleEmailMfaPreference(event) {
  event.preventDefault();
  try {
    ensureSession();
    const selectedMethod = refs.emailMfaSelect.value;

    if (selectedMethod === "email") {
      if (state.currentUser.mfaEmailEnabled && !state.currentUser.mfaTotpEnabled) {
        setNotice("MFA por email ya esta activo. No se hizo ningun cambio.", "info");
        return;
      }
      if (state.currentUser.mfaTotpEnabled) {
        const confirmed = window.confirm(
          "Ya tienes OTP con app configurado. Si cambias a email, se desactivara el QR actual. ¿Estas seguro?"
        );
        if (!confirmed) {
          refs.emailMfaSelect.value = "totp";
          setNotice("Se mantuvo OTP con app como metodo MFA.", "info");
          return;
        }
        await api("/api/auth/mfa/totp", { method: "DELETE" });
      }
      const result = await api("/api/auth/mfa/email", {
        method: "PUT",
        body: JSON.stringify({ enabled: true }),
      });
      state.totpSetup = null;
      state.totpSetupError = "";
      state.totpQrRenderFailed = false;
      applyCurrentUser(result.user);
      appendLog("MFA por email activado", result);
      return;
    }

    if (selectedMethod === "totp") {
      if (state.currentUser.mfaTotpEnabled) {
        setNotice("OTP con app ya esta activo. No necesitas generar otro QR; usa Google Authenticator al iniciar sesion.", "info");
        return;
      }
      if (state.totpSetup) {
        setNotice("Ya tienes un QR pendiente. Escanealo con Google Authenticator y confirma el codigo.", "info");
        refs.totpSetupPanel.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      await api("/api/auth/mfa/email", {
        method: "PUT",
        body: JSON.stringify({ enabled: false }),
      });
      await handleStartTotpSetup();
      appendLog("Configura OTP", "Escanea el QR y confirma el codigo de tu app.");
      return;
    }

    let result = null;
    if (!state.currentUser.mfaTotpEnabled && !state.currentUser.mfaEmailEnabled && !state.totpSetup) {
      setNotice("MFA ya esta desactivado. No se hizo ningun cambio.", "info");
      return;
    }
    if (state.currentUser.mfaTotpEnabled) {
      const confirmed = window.confirm(
        "Ya tienes OTP con app configurado. Si continuas, se desactivara MFA para esta cuenta. ¿Estas seguro?"
      );
      if (!confirmed) {
        refs.emailMfaSelect.value = "totp";
        setNotice("Se mantuvo OTP con app como metodo MFA.", "info");
        return;
      }
      result = await api("/api/auth/mfa/totp", { method: "DELETE" });
    }
    result = await api("/api/auth/mfa/email", {
      method: "PUT",
      body: JSON.stringify({ enabled: false }),
    });
    state.totpSetup = null;
    state.totpSetupError = "";
    state.totpQrRenderFailed = false;
    applyCurrentUser(result.user);
    appendLog("MFA desactivado", result);
  } catch (error) {
    appendLog("Error actualizando MFA", error);
  }
}

async function handleStartTotpSetup() {
  try {
    ensureSession();
    if (state.currentUser.mfaTotpEnabled) {
      setNotice("OTP con app ya esta activo. No necesitas generar otro QR.", "info");
      return;
    }
    if (state.totpSetup) {
      setNotice("Ya tienes un QR pendiente. Escanealo con Google Authenticator y confirma el codigo.", "info");
      refs.totpSetupPanel.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const result = await api("/api/auth/mfa/totp/setup", {
      method: "POST",
    });
    const totp = result?.mfaSetup?.totp;
    state.totpSetup = totp
      ? {
          totp: {
            secret: totp.secret,
            otpauthUrl: totp.otpauthUrl,
            qrCodeDataUrl: totp.qrCodeDataUrl,
          },
        }
      : null;
    state.totpSetupError = totp
      ? ""
      : "La respuesta no incluyó mfaSetup.totp.qrCodeDataUrl.";
    state.totpQrRenderFailed = false;
    renderSession();
    requestAnimationFrame(() => {
      refs.totpSetupPanel.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    appendLog("QR TOTP generado", result);
  } catch (error) {
    state.totpSetup = null;
    state.totpSetupError = error.error || "No se pudo generar el QR TOTP.";
    state.totpQrRenderFailed = false;
    renderSession();
    appendLog("Error generando QR TOTP", error);
  }
}

async function handleConfirmTotp(event) {
  event.preventDefault();
  try {
    ensureSession();
    const form = event.currentTarget;
    const result = await api("/api/auth/mfa/totp/confirm", {
      method: "POST",
      body: JSON.stringify({
        code: form.code.value,
      }),
    });
    state.totpSetup = null;
    state.totpSetupError = "";
    state.totpQrRenderFailed = false;
    applyCurrentUser(result.user);
    form.reset();
    appendLog("MFA activado", result);
  } catch (error) {
    appendLog("Error confirmando TOTP", error);
  }
}

async function handleDisableTotp() {
  try {
    ensureSession();
    const result = await api("/api/auth/mfa/totp", {
      method: "DELETE",
    });
    state.totpSetup = null;
    state.totpSetupError = "";
    state.totpQrRenderFailed = false;
    applyCurrentUser(result.user);
    appendLog("MFA deshabilitado", result);
  } catch (error) {
    appendLog("Error deshabilitando TOTP", error);
  }
}

async function handleCreateRole(event) {
  event.preventDefault();
  if (!canManageRbac()) {
    setNotice("No puedes crear roles con esta cuenta. Solo Administrador puede hacerlo.", "error");
    return;
  }
  try {
    ensureSession();
    const form = event.currentTarget;
    const result = await api("/api/roles", {
      method: "POST",
      body: JSON.stringify({
        name: form.name.value,
        description: form.description.value,
      }),
    });
    appendLog("Rol creado", result);
    await loadRoles();
  } catch (error) {
    appendLog("Error creando rol", error);
  }
}

async function handleUpdateRole(event) {
  event.preventDefault();
  if (!canManageRbac()) {
    setNotice("No puedes actualizar roles con esta cuenta. Solo Administrador puede hacerlo.", "error");
    return;
  }
  if (!refs.roleEditId.value) {
    setNotice("Primero selecciona un rol de la tabla para actualizarlo.", "error");
    return;
  }
  try {
    ensureSession();
    const result = await api(`/api/roles/${refs.roleEditId.value}`, {
      method: "PUT",
      body: JSON.stringify({
        name: refs.roleEditName.value,
        description: refs.roleEditDescription.value,
      }),
    });
    appendLog("Rol actualizado", result);
    await loadRoles();
  } catch (error) {
    appendLog("Error actualizando rol", error);
  }
}

async function handleDeleteRole() {
  if (!canManageRbac()) {
    setNotice("No puedes eliminar roles con esta cuenta. Solo Administrador puede hacerlo.", "error");
    return;
  }
  if (!refs.roleEditId.value) {
    setNotice("Primero selecciona un rol de la tabla para eliminarlo.", "error");
    return;
  }
  try {
    ensureSession();
    const result = await api(`/api/roles/${refs.roleEditId.value}`, {
      method: "DELETE",
    });
    appendLog("Rol eliminado", result);
    await loadRoles();
  } catch (error) {
    appendLog("Error eliminando rol", error);
  }
}

async function handleCreateUser(event) {
  event.preventDefault();
  if (!canManageRbac()) {
    setNotice("No puedes crear usuarios con esta cuenta. Solo Administrador puede hacerlo.", "error");
    return;
  }
  try {
    ensureSession();
    const form = event.currentTarget;
    const result = await api("/api/users", {
      method: "POST",
      body: JSON.stringify({
        email: form.email.value,
        password: form.password.value,
        fullName: form.fullName.value,
        storeId: Number(form.storeId.value),
        roles: selectedValues(refs.adminCreateRolesSelect),
      }),
    });
    appendLog("Usuario creado", result);
    await loadUsers();
  } catch (error) {
    appendLog("Error creando usuario", error);
  }
}

async function handleUpdateUser(event) {
  event.preventDefault();
  if (!canManageRbac()) {
    setNotice("No puedes actualizar usuarios con esta cuenta. Solo Administrador puede hacerlo.", "error");
    return;
  }
  if (!refs.userEditId.value) {
    setNotice("Primero selecciona un usuario de la tabla para actualizarlo.", "error");
    return;
  }
  try {
    ensureSession();
    const form = event.currentTarget;
    const payload = {};
    const fields = {
      email: optionalValue(form.email.value),
      fullName: optionalValue(form.fullName.value),
      storeId: optionalValue(form.storeId.value),
      password: optionalValue(form.password.value),
      active: optionalValue(form.active.value),
    };

    Object.entries(fields).forEach(([key, value]) => {
      if (value !== undefined) {
        payload[key] = key === "storeId" ? Number(value) : value;
      }
    });

    const result = await api(`/api/users/${form.id.value}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    appendLog("Usuario actualizado", result);
    await loadUsers();
  } catch (error) {
    appendLog("Error actualizando usuario", error);
  }
}

async function handleDeactivateUser() {
  if (!canManageRbac()) {
    setNotice("No puedes desactivar usuarios con esta cuenta. Solo Administrador puede hacerlo.", "error");
    return;
  }
  if (!refs.userEditId.value) {
    setNotice("Primero selecciona un usuario de la tabla para desactivarlo.", "error");
    return;
  }
  try {
    ensureSession();
    const result = await api(`/api/users/${refs.userEditId.value}`, {
      method: "DELETE",
    });
    appendLog("Usuario desactivado", result);
    await loadUsers();
  } catch (error) {
    appendLog("Error desactivando usuario", error);
  }
}

async function handleAssignRole(event) {
  event.preventDefault();
  try {
    ensureSession();
    const result = await api(`/api/users/${refs.assignRoleUserSelect.value}/roles`, {
      method: "POST",
      body: JSON.stringify({
        roleName: refs.assignRoleRoleSelect.value,
      }),
    });
    appendLog("Rol asignado", result);
    await loadUsers();
  } catch (error) {
    appendLog("Error asignando rol", error);
  }
}

async function handleRemoveRole(event) {
  event.preventDefault();
  try {
    ensureSession();
    if (!refs.removeRoleRoleId.value) {
      setNotice("Ese usuario no tiene roles disponibles para retirar.", "error");
      return;
    }
    const result = await api(
      `/api/users/${refs.removeRoleUserSelect.value}/roles/${refs.removeRoleRoleId.value}`,
      { method: "DELETE" }
    );
    appendLog("Rol retirado", result);
    await loadUsers();
  } catch (error) {
    appendLog("Error retirando rol", error);
  }
}

async function handleFilterProducts(event) {
  event.preventDefault();
  try {
    const form = event.currentTarget;
    await loadProducts({
      storeId: optionalValue(form.storeId.value),
      category: optionalValue(form.category.value),
      premium: optionalValue(form.premium.value),
    });
    appendLog("Filtro de productos aplicado", {
      storeId: form.storeId.value,
      category: form.category.value,
      premium: form.premium.value,
    });
  } catch (error) {
    appendLog("Error filtrando productos", error);
  }
}

async function handleCreateProduct(event) {
  event.preventDefault();
  if (!canCreateProduct()) {
    setNotice("No puedes crear productos con esta cuenta.", "error");
    return;
  }
  try {
    ensureSession();
    const form = event.currentTarget;
    const result = await api("/api/products", {
      method: "POST",
      body: JSON.stringify({
        name: form.name.value,
        description: form.description.value,
        price: Number(form.price.value),
        stock: Number(form.stock.value),
        category: form.category.value,
        storeId: hasRole("Administrador") ? Number(form.storeId.value) : state.currentUser.storeId,
        isPremium: hasRole("Empleado") && !hasRole("Administrador") && !hasRole("Gerente") ? false : form.isPremium.checked,
      }),
    });
    appendLog("Producto creado", result);
    await loadProducts();
  } catch (error) {
    appendLog("Error creando producto", error);
  }
}

async function handleUpdateProduct(event) {
  event.preventDefault();
  if (!canUpdateProduct()) {
    setNotice("No puedes actualizar productos con esta cuenta.", "error");
    return;
  }
  try {
    ensureSession();
    const form = event.currentTarget;
    const payload = {};
    const employeeOnly = hasRole("Empleado") && !hasRole("Administrador") && !hasRole("Gerente");
    const managerOnly = hasRole("Gerente") && !hasRole("Administrador");
    const fields = employeeOnly
      ? {
          stock: optionalValue(form.stock.value),
        }
      : {
          name: optionalValue(form.name.value),
          description: optionalValue(form.description.value),
          price: optionalValue(form.price.value),
          stock: optionalValue(form.stock.value),
          category: managerOnly ? undefined : optionalValue(form.category.value),
          storeId: hasRole("Administrador") ? optionalValue(form.storeId.value) : undefined,
          isPremium: optionalValue(form.isPremium.value),
        };

    Object.entries(fields).forEach(([key, value]) => {
      if (value === undefined) {
        return;
      }
      if (["price", "stock", "storeId"].includes(key)) {
        payload[key] = Number(value);
      } else if (key === "isPremium") {
        payload[key] = value === "true";
      } else {
        payload[key] = value;
      }
    });

    const result = await api(`/api/products/${form.id.value}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    appendLog("Producto actualizado", result);
    await loadProducts();
  } catch (error) {
    appendLog("Error actualizando producto", error);
  }
}

async function handleDeleteProduct(event) {
  event.preventDefault();
  if (!canDeleteProduct()) {
    setNotice("No puedes eliminar productos con esta cuenta.", "error");
    return;
  }
  try {
    ensureSession();
    const result = await api(`/api/products/${refs.productDeleteId.value}`, {
      method: "DELETE",
    });
    appendLog("Producto eliminado", result);
    await loadProducts();
  } catch (error) {
    appendLog("Error eliminando producto", error);
  }
}

async function handleFilterAudit(event) {
  event.preventDefault();
  if (!canViewAudit()) {
    setNotice("No puedes consultar auditoria con esta cuenta. Solo Administrador o Auditor.", "error");
    return;
  }
  try {
    const form = event.currentTarget;
    await loadAudit({
      limit: optionalValue(form.limit.value),
      allowed: optionalValue(form.allowed.value),
      userId: optionalValue(form.userId.value),
      action: optionalValue(form.action.value),
    });
    appendLog("Filtro de auditoría aplicado", {
      limit: form.limit.value,
      allowed: form.allowed.value,
      userId: form.userId.value,
      action: form.action.value,
    });
  } catch (error) {
    appendLog("Error filtrando auditoría", error);
  }
}

function logout() {
  state.token = null;
  state.currentUser = null;
  state.totpSetup = null;
  state.totpSetupError = "";
  state.totpQrRenderFailed = false;
  state.roles = [];
  state.users = [];
  state.products = [];
  state.productAction = null;
  state.inventoryReport = null;
  state.auditLogs = [];
  state.auditSummary = null;
  clearChallenge();
  saveSession();
  toggleAppShell();
  renderSession();
  renderCurrentRoleCapabilities();
  renderCurrentAbacCapabilities();
  renderRolesTable();
  renderUsersTable("Inicia sesión como Administrador o Auditor para consultar usuarios.");
  renderInventoryReport("Inicia sesión como Administrador, Gerente o Auditor para ver reportes.");
  renderProductsTable("Inicia sesión para ver productos.");
  renderAuditSummary();
  renderAuditTable("Inicia sesión como Administrador o Auditor para ver auditoría.");
  setAuthTab("login");
}

function bindTableSelectors() {
  document.body.addEventListener("click", (event) => {
    const demo = event.target.closest("[data-demo-email]");
    if (demo) {
      refs.loginEmailInput.value = demo.dataset.demoEmail;
      refs.loginPasswordInput.value = state.bootstrap?.demoPassword || "TechStore2026!";
      setAuthTab("login");
      return;
    }

    const roleButton = event.target.closest("[data-role-id]");
    if (roleButton) {
      populateRole(Number(roleButton.dataset.roleId));
      setModule("rbac");
      return;
    }

    const userButton = event.target.closest("[data-user-id]");
    if (userButton) {
      populateUser(Number(userButton.dataset.userId));
      setModule("rbac");
      return;
    }

    const productButton = event.target.closest("[data-product-id]");
    if (productButton) {
      populateProduct(Number(productButton.dataset.productId));
      showProductAction("update");
      setModule("abac");
      return;
    }

    const productEditButton = event.target.closest("[data-product-edit]");
    if (productEditButton) {
      populateProduct(Number(productEditButton.dataset.productEdit));
      showProductAction("update");
      setModule("abac");
      return;
    }

    const productDeleteButton = event.target.closest("[data-product-delete]");
    if (productDeleteButton) {
      deleteProductById(Number(productDeleteButton.dataset.productDelete));
    }
  });
}

function bindEvents() {
  refs.showLoginTabBtn.addEventListener("click", () => setAuthTab("login"));
  refs.showRegisterTabBtn.addEventListener("click", () => setAuthTab("register"));
  refs.loginForm.addEventListener("submit", handleLogin);
  refs.registerForm.addEventListener("submit", handleRegister);
  refs.sendEmailCodeBtn.addEventListener("click", handleSendEmailCode);
  refs.verifyMfaForm.addEventListener("submit", handleVerifyMfa);
  refs.emailMfaForm.addEventListener("submit", handleEmailMfaPreference);
  refs.emailMfaSelect.addEventListener("change", (event) => {
    if (!state.currentUser?.mfaTotpEnabled || event.currentTarget.value === "totp") {
      return;
    }
    const confirmed = window.confirm(
      "Ya tienes OTP con app configurado. Si cambias el metodo MFA, se quitara el QR actual. ¿Estas seguro?"
    );
    if (!confirmed) {
      event.currentTarget.value = "totp";
      setNotice("Se mantuvo OTP con app como metodo MFA.", "info");
    }
  });
  refs.startTotpSetupBtn.addEventListener("click", handleStartTotpSetup);
  refs.disableTotpBtn.addEventListener("click", handleDisableTotp);
  refs.confirmTotpForm.addEventListener("submit", handleConfirmTotp);
  refs.navButtons.forEach((button) => {
    button.addEventListener("click", () => setModule(button.dataset.module));
  });
  refs.refreshDashboardBtn.addEventListener("click", refreshDashboardData);
  refs.logoutBtn.addEventListener("click", logout);
  refs.roleCreateForm.addEventListener("submit", handleCreateRole);
  refs.roleEditForm.addEventListener("submit", handleUpdateRole);
  refs.deleteRoleBtn.addEventListener("click", handleDeleteRole);
  refs.refreshRolesBtn.addEventListener("click", loadRoles);
  refs.refreshUsersBtn.addEventListener("click", loadUsers);
  refs.userCreateForm.addEventListener("submit", handleCreateUser);
  refs.userEditForm.addEventListener("submit", handleUpdateUser);
  refs.deactivateUserBtn.addEventListener("click", handleDeactivateUser);
  refs.assignRoleForm.addEventListener("submit", handleAssignRole);
  refs.removeRoleForm.addEventListener("submit", handleRemoveRole);
  refs.assignRoleUserSelect.addEventListener("change", (event) => {
    populateUser(Number(event.currentTarget.value));
  });
  refs.userEditPicker.addEventListener("change", (event) => {
    if (event.currentTarget.value) {
      populateUser(Number(event.currentTarget.value));
    }
  });
  refs.removeRoleUserSelect.addEventListener("change", (event) => {
    populateUser(Number(event.currentTarget.value));
    updateRemoveRoleOptions(event.currentTarget.value);
  });
  refs.productFilterForm.addEventListener("submit", handleFilterProducts);
  refs.createProductBtn.addEventListener("click", () => {
    if (!canCreateProduct()) {
      setNotice("Tu cuenta no puede crear productos.", "error");
      return;
    }
    showProductAction("create");
    setNotice("Completa los datos para crear un producto.", "info");
  });
  refs.productCreateForm.addEventListener("submit", handleCreateProduct);
  refs.productUpdateForm.addEventListener("submit", handleUpdateProduct);
  refs.productDeleteForm.addEventListener("submit", handleDeleteProduct);
  refs.refreshProductsBtn.addEventListener("click", () => loadProducts());
  refs.auditFilterForm.addEventListener("submit", handleFilterAudit);
  refs.refreshAuditBtn.addEventListener("click", () => loadAudit({ limit: 30 }));
  refs.clearConsoleBtn.addEventListener("click", () => {
    refs.consoleOutput.textContent = "Esperando acciones...";
  });
}

async function initialize() {
  restoreSession();
  bindEvents();
  bindTableSelectors();
  setAuthTab("login");
  setModule("auth");
  renderChallenge();
  renderRolesTable();
  renderUsersTable("Inicia sesión como Administrador o Auditor para consultar usuarios.");
  renderInventoryReport("Inicia sesión como Administrador, Gerente o Auditor para ver reportes.");
  renderProductsTable("Inicia sesión para ver productos.");
  renderAuditSummary();
  renderAuditTable("Inicia sesión como Administrador o Auditor para ver auditoría.");

  try {
    await loadBootstrap();
  } catch (error) {
    appendLog("Error cargando bootstrap", error);
  }

  await validateStoredSession();
  toggleAppShell();
  renderSession();
  renderCurrentRoleCapabilities();
  renderCurrentAbacCapabilities();

  if (state.token) {
    await refreshDashboardData();
  }
}

initialize();
