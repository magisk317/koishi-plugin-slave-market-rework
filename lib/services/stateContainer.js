function createStateContainer() {
  let runtimeConfig = null;
  let ensureAdminVipPrivileges = null;
  let permissionService = null;

  return {
    setRuntimeConfig: (config) => {
      runtimeConfig = config;
    },
    getRuntimeConfig: () => runtimeConfig,
    setEnsureAdminVipPrivileges: (handler) => {
      ensureAdminVipPrivileges = handler;
    },
    getEnsureAdminVipPrivileges: () => ensureAdminVipPrivileges,
    setPermissionService: (service) => {
      permissionService = service;
    },
    getPermissionService: () => permissionService
  };
}

module.exports = { createStateContainer };
