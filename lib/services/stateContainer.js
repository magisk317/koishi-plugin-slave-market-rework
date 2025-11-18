function createStateContainer() {
  let runtimeConfig = null;
  let ensureAdminVipPrivileges = null;
  let permissionService = null;
  let pluginDisabled = false;

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
    getPermissionService: () => permissionService,
    setPluginDisabled: (disabled) => {
      pluginDisabled = Boolean(disabled);
    },
    isPluginDisabled: () => pluginDisabled
  };
}

module.exports = { createStateContainer };
