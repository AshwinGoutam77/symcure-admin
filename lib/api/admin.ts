import {
  adminDelete,
  adminGet,
  adminPatch,
  adminPost,
  adminPut,
  queryString,
  unwrapData,
  clearAdminTokens,
} from "./client";

export type AdminPermission = {
  key: string;
  name: string;
  slug: string;
  icon?: string;
  parent_id?: string | number | null;
  sort_order?: number;
  is_system?: boolean;
  permissions: {
    view: boolean;
    add: boolean;
    edit: boolean;
    delete: boolean;
    export: boolean;
  };
};

export type AdminSession = {
  user: any;
  role: {
    id: string | number;
    name: string;
    slug: string;
    is_super_admin: boolean;
  };
  permissions: AdminPermission[];
};

export async function getAdminMe() {
  return unwrapData<AdminSession>(await adminGet("/admin/me"));
}

export async function updateAdminProfile(body: {
  full_name?: string;
  email?: string;
  mobile?: string;
}) {
  return unwrapData(await adminPatch("/admin/me/profile", body));
}

export async function changeAdminPassword(body: {
  current_password: string;
  new_password: string;
  new_password_confirmation: string;
}) {
  return unwrapData(await adminPost("/admin/me/change-password", body));
}

export async function loginAdmin(body: {
  login: string;
  password: string;
  device_id?: string;
}) {
  return unwrapData(await adminPost("/auth/admin/login", body));
}

export async function logoutAdmin() {
  clearAdminTokens();
  return { message: "Logged out" };
}

export async function getDashboard() {
  return unwrapData(await adminGet("/admin/dashboard"));
}

export async function getDoctors(params: Record<string, unknown> = {}) {
  return unwrapData(await adminGet(`/admin/doctors${queryString(params)}`));
}
export async function getDoctor(id: string) {
  return unwrapData(await adminGet(`/admin/doctors/${encodeURIComponent(id)}`));
}
export async function getDoctorSchedule(id: string) {
  return unwrapData(await adminGet(`/admin/doctors/${encodeURIComponent(id)}/schedule`));
}
export async function updateDoctor(id: string, body: Record<string, unknown>) {
  return unwrapData(await adminPatch(`/admin/doctors/${encodeURIComponent(id)}`, body));
}
export async function setDoctorStatus(id: string, body: { status: "active" | "suspended"; reason?: string }) {
  return unwrapData(await adminPatch(`/admin/doctors/${encodeURIComponent(id)}/status`, body));
}
export async function setDoctorCommission(id: string, body: Record<string, unknown>) {
  return unwrapData(await adminPatch(`/admin/doctors/${encodeURIComponent(id)}/commission`, body));
}
export async function deleteDoctor(id: string) {
  return adminDelete(`/admin/doctors/${encodeURIComponent(id)}`);
}

export async function getApplications(params: Record<string, unknown> = {}) {
  return unwrapData(await adminGet(`/admin/doctor-applications${queryString(params)}`));
}
export async function getApplication(id: string) {
  return unwrapData(await adminGet(`/admin/doctor-applications/${encodeURIComponent(id)}`));
}
export async function getApplicationDocumentUrl(
  applicationId: string,
  documentId: string,
) {
  return unwrapData(
    await adminGet(
      `/admin/doctor-applications/${encodeURIComponent(
        applicationId,
      )}/documents/${encodeURIComponent(documentId)}/url`,
    ),
  );
}
export async function approveApplication(id: string, review_note?: string) {
  return unwrapData(await adminPost(`/admin/doctor-applications/${encodeURIComponent(id)}/approve`, { review_note }));
}
export async function rejectApplication(id: string, rejection_reason: string) {
  return unwrapData(await adminPost(`/admin/doctor-applications/${encodeURIComponent(id)}/reject`, { rejection_reason }));
}
export async function deleteApplication(id: string) {
  return adminDelete(`/admin/doctor-applications/${encodeURIComponent(id)}`);
}

export async function getAppointments(params: Record<string, unknown> = {}) {
  return unwrapData(await adminGet(`/admin/appointments${queryString(params)}`));
}
export async function getAppointment(id: string) {
  return unwrapData(await adminGet(`/admin/appointments/${encodeURIComponent(id)}`));
}

export async function getPatients(params: Record<string, unknown> = {}) {
  return unwrapData(await adminGet(`/admin/patients${queryString(params)}`));
}
export async function getPatient(id: string) {
  return unwrapData(await adminGet(`/admin/patients/${encodeURIComponent(id)}`));
}
export async function setPatientStatus(id: string, status: "active" | "suspended") {
  return unwrapData(await adminPatch(`/admin/patients/${encodeURIComponent(id)}/status`, { status }));
}
export async function deletePatient(id: string) {
  return adminDelete(`/admin/patients/${encodeURIComponent(id)}`);
}

export async function getEarnings(params: Record<string, unknown>) {
  return unwrapData(await adminGet(`/admin/earnings${queryString(params)}`));
}

export async function getActivityLogs(params: Record<string, unknown> = {}) {
  return unwrapData(await adminGet(`/admin/activity-logs${queryString(params)}`));
}
export async function getActivityLog(id: string) {
  return unwrapData(await adminGet(`/admin/activity-logs/${encodeURIComponent(id)}`));
}

export async function getRoles(params: Record<string, unknown> = {}) {
  return unwrapData(await adminGet(`/admin/roles${queryString(params)}`));
}
export async function getRole(id: string) {
  return unwrapData(await adminGet(`/admin/roles/${encodeURIComponent(id)}`));
}
export async function createRole(body: Record<string, unknown>) {
  return unwrapData(await adminPost("/admin/roles", body));
}
export async function updateRole(id: string, body: Record<string, unknown>) {
  return unwrapData(await adminPatch(`/admin/roles/${encodeURIComponent(id)}`, body));
}
export async function deleteRole(id: string) {
  return adminDelete(`/admin/roles/${encodeURIComponent(id)}`);
}
export async function getMenus(params: Record<string, unknown> = {}) {
  return unwrapData(await adminGet(`/admin/menus${queryString(params)}`));
}
export async function createMenu(body: Record<string, unknown>) {
  return unwrapData(await adminPost("/admin/menus", body));
}
export async function updateMenu(id: string, body: Record<string, unknown>) {
  return unwrapData(await adminPatch(`/admin/menus/${encodeURIComponent(id)}`, body));
}
export async function setMenuStatus(id: string, is_active: boolean) {
  return unwrapData(await adminPatch(`/admin/menus/${encodeURIComponent(id)}/status`, { is_active }));
}
export async function deleteMenu(id: string) {
  return adminDelete(`/admin/menus/${encodeURIComponent(id)}`);
}
export async function getRolePermissions(roleId: string) {
  return unwrapData(await adminGet(`/admin/role-permissions${queryString({ role_id: roleId })}`));
}
export async function saveRolePermissions(roleId: string, permissions: unknown[]) {
  return unwrapData(await adminPut(`/admin/role-permissions/${encodeURIComponent(roleId)}`, { permissions }));
}

export async function getSystemUsers(params: Record<string, unknown> = {}) {
  return unwrapData(await adminGet(`/admin/system-users${queryString(params)}`));
}
export async function getSystemUserRoles() {
  return unwrapData(await adminGet("/admin/system-users/roles"));
}
export async function getSystemUser(id: string) {
  return unwrapData(await adminGet(`/admin/system-users/${encodeURIComponent(id)}`));
}
export async function createSystemUser(body: Record<string, unknown>) {
  return unwrapData(await adminPost("/admin/system-users", body));
}
export async function updateSystemUser(id: string, body: Record<string, unknown>) {
  return unwrapData(await adminPatch(`/admin/system-users/${encodeURIComponent(id)}`, body));
}
export async function setSystemUserStatus(id: string, status: "active" | "inactive") {
  return unwrapData(await adminPatch(`/admin/system-users/${encodeURIComponent(id)}/status`, { status }));
}
export async function resetSystemUserPassword(id: string, new_password: string) {
  return unwrapData(await adminPost(`/admin/system-users/${encodeURIComponent(id)}/reset-password`, { new_password }));
}
export async function deleteSystemUser(id: string) {
  return adminDelete(`/admin/system-users/${encodeURIComponent(id)}`);
}

export async function getMasters() {
  return unwrapData(await adminGet("/admin/masters"));
}
export async function getMaster(resource: string, params: Record<string, unknown> = {}) {
  return unwrapData(await adminGet(`/admin/masters/${encodeURIComponent(resource)}${queryString(params)}`));
}
export async function createMaster(resource: string, body: Record<string, unknown>) {
  return unwrapData(await adminPost(`/admin/masters/${encodeURIComponent(resource)}`, body));
}
export async function updateMaster(resource: string, id: string, body: Record<string, unknown>) {
  return unwrapData(await adminPatch(`/admin/masters/${encodeURIComponent(resource)}/${encodeURIComponent(id)}`, body));
}
export async function setMasterStatus(resource: string, id: string, is_active: boolean) {
  return unwrapData(await adminPatch(`/admin/masters/${encodeURIComponent(resource)}/${encodeURIComponent(id)}/status`, { is_active }));
}

export async function importMaster(resource: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  return unwrapData(
    await adminPost(`/admin/imports/${encodeURIComponent(resource)}`, form),
  );
}

export async function getSystemSettings() {
  return unwrapData(await adminGet("/admin/system-settings"));
}
export async function updateSystemSettings(body: Record<string, unknown>) {
  return unwrapData(await adminPut("/admin/system-settings", body));
}
export async function getPaymentSettings() {
  return unwrapData(await adminGet("/admin/payment-settings"));
}
export async function updatePaymentSettings(body: Record<string, unknown>) {
  return unwrapData(await adminPut("/admin/payment-settings", body));
}
export async function getAppSettings() {
  return unwrapData(await adminGet("/admin/app-settings"));
}
export async function updateAppSettings(patient_app_version: string) {
  return unwrapData(await adminPut("/admin/app-settings", { patient_app_version }));
}
export async function getAppContent() {
  return unwrapData(await adminGet("/admin/app-content"));
}
export async function getAppContentBySlug(slug: string) {
  return unwrapData(await adminGet(`/admin/app-content/${encodeURIComponent(slug)}`));
}
export async function updateAppContent(slug: string, body: Record<string, unknown>) {
  return unwrapData(await adminPut(`/admin/app-content/${encodeURIComponent(slug)}`, body));
}
export async function getSeasonalHealth(params: Record<string, unknown> = {}) {
  return unwrapData(await adminGet(`/admin/seasonal-health${queryString(params)}`));
}
export async function createSeasonalHealth(body: Record<string, unknown>) {
  return unwrapData(await adminPost("/admin/seasonal-health", body));
}
export async function updateSeasonalHealth(id: string, body: Record<string, unknown>) {
  return unwrapData(await adminPatch(`/admin/seasonal-health/${encodeURIComponent(id)}`, body));
}
export async function deleteSeasonalHealth(id: string) {
  return adminDelete(`/admin/seasonal-health/${encodeURIComponent(id)}`);
}
export async function getDoctorDocuments(applicationId: string | number) {
  return unwrapData(
    await adminGet(
      `/admin/doctor-applications/${encodeURIComponent(
        String(applicationId),
      )}/documents`,
    ),
  );
}
export async function getDoctorRegistrationLookups() {
  return unwrapData(
    await adminGet("/doctor-registration/lookups"),
  );
}

// ============================================================
// App Specialty Groups
// ============================================================

export async function getAppSpecialtyGroups(
  params: Record<string, unknown> = {},
) {
  return unwrapData(
    await adminGet(
      `/admin/app-specialty-groups${queryString(params)}`,
    ),
  );
}

export async function getAppSpecialtyGroup(id: string) {
  return unwrapData(
    await adminGet(
      `/admin/app-specialty-groups/${encodeURIComponent(id)}`,
    ),
  );
}

export async function getAppSpecialtyGroupSpecializationOptions(
  params: Record<string, unknown> = {},
) {
  return unwrapData(
    await adminGet(
      `/admin/app-specialty-groups/specialization-options${queryString(params)}`,
    ),
  );
}

export async function createAppSpecialtyGroup(
  body: Record<string, unknown> | FormData,
) {
  return unwrapData(
    await adminPost("/admin/app-specialty-groups", body),
  );
}

export async function updateAppSpecialtyGroup(
  id: string,
  body: Record<string, unknown>,
) {
  return unwrapData(
    await adminPatch(
      `/admin/app-specialty-groups/${encodeURIComponent(id)}`,
      body,
    ),
  );
}

export async function setAppSpecialtyGroupStatus(
  id: string,
  is_active: boolean,
) {
  return unwrapData(
    await adminPatch(
      `/admin/app-specialty-groups/${encodeURIComponent(id)}/status`,
      { is_active },
    ),
  );
}

export async function uploadAppSpecialtyGroupImage(
  id: string,
  file: File,
) {
  const form = new FormData();
  form.append("image", file);

  return unwrapData(
    await adminPost(
      `/admin/app-specialty-groups/${encodeURIComponent(id)}/image`,
      form,
    ),
  );
}

export async function deleteAppSpecialtyGroupImage(id: string) {
  return adminDelete(
    `/admin/app-specialty-groups/${encodeURIComponent(id)}/image`,
  );
}

export async function deleteAppSpecialtyGroup(id: string) {
  return adminDelete(
    `/admin/app-specialty-groups/${encodeURIComponent(id)}`,
  );
}