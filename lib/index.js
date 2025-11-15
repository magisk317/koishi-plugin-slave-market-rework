const { createSponsorService } = require("./services/sponsor");
const { createUserService } = require("./services/userService");
const { WeatherService } = require("./services/weatherService");
const { createAutoTaskScheduler } = require("./services/autoTaskScheduler");
const { BackupService } = require("./services/backupService");
const { createHelpRenderer } = require("./services/helpRenderer");
const { createGameService } = require("./services/gameService");
const { createReportService } = require("./services/reportService");
const { createHelpCommandService } = require("./services/helpCommandService");
const { createWorkService } = require("./services/workService");
const { createPermissionService } = require("./services/permissionService");
const { registerModels } = require("./services/modelInitializer");
const { createProfileRenderer } = require("./services/profileRenderer");
const { createStateContainer } = require("./services/stateContainer");
const { Config } = require("./config");
const gameService = createGameService();
const { ensureInitialState, resetGame } = gameService;
const nodePath = require("path");
const {
  registrationGuide,
  createScopeFilter,
  getScopeKey,
  ensureScopedId,
  resolveTargetUser
} = require("./utils/playerHelpers");
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  Config: () => Config2,
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(src_exports);

const state = createStateContainer();
const ADMIN_VIP_END_TIME = new Date("2099-12-31T23:59:59Z").getTime();
const HOUR_IN_MS = 60 * 60 * 1e3;
const { createMessageRecallHelpers } = require("./utils/messageRecall");
const { createBankModule } = require("./modules/bank");
const { createInfoModule } = require("./modules/info");
const { createVipModule } = require("./modules/vip");
const { createFarmModule } = require("./modules/farm");
const { createBodyguardModule } = require("./modules/bodyguard");
const { createAppearanceModule } = require("./modules/appearance");
const { createRedPacketModule } = require("./modules/redPacket");
const { createMarketModule } = require("./modules/market");
const { createJailModule } = require("./modules/jail");
const { createRankingModule } = require("./modules/ranking");
const { createAdminModule } = require("./modules/admin");
const { createMiscModule } = require("./modules/misc");

let deposit,
  withdraw,
  claimInterest,
  bankInfo,
  upgradeCredit,
  applyLoan,
  repayLoan,
  transfer;

function getLoanConfig(config) {
  return config.贷款系统 ?? {
    基础额度: 1e3,
    等级加成: 500,
    利率: 0.02
  };
}
__name(getLoanConfig, "getLoanConfig");
function calculateLoanLimit(user, config) {
  const loanConfig = getLoanConfig(config);
  const level = Math.max(1, user.loanCreditLevel ?? 1);
  return Math.floor(loanConfig.基础额度 + (level - 1) * loanConfig.等级加成);
}
__name(calculateLoanLimit, "calculateLoanLimit");
async function accrueLoanInterest(ctx, config, user) {
  if (!user?.loanBalance || user.loanBalance <= 0)
    return user;
  const lastTime = user.lastLoanInterestTime || user.registerTime || Date.now();
  const now = Date.now();
  const elapsedHours = Math.floor((now - lastTime) / HOUR_IN_MS);
  if (elapsedHours <= 0)
    return user;
  const loanConfig = getLoanConfig(config);
  const rate = loanConfig.利率 ?? 0.02;
  const interest = Math.max(1, Math.floor(user.loanBalance * rate * elapsedHours));
  const nextTime = lastTime + elapsedHours * HOUR_IN_MS;
  await ctx.database.set("player_market_users", { userId: user.userId }, {
    loanBalance: user.loanBalance + interest,
    lastLoanInterestTime: nextTime
  });
  logDebug(ctx, "loan interest accrued", {
    userId: user.userId,
    interest,
    elapsedHours
  });
  return { ...user, loanBalance: user.loanBalance + interest, lastLoanInterestTime: nextTime };
}
__name(accrueLoanInterest, "accrueLoanInterest");
function formatCostTip(privileged, amount) {
  return `${amount}金币`;
}
__name(formatCostTip, "formatCostTip");

function logDebug(ctx, message, payload = {}) {
  const config = state.getRuntimeConfig();
  if (!config?.调试日志)
    return;
  try {
    ctx.logger?.info?.(`[slave-market][debug] ${message}`, payload);
  } catch (error) {
    console.warn("[slave-market][debug] log failed", error);
  }
}
__name(logDebug, "logDebug");
const {
  setupMessageRecall,
  sendWithRecall,
  createRecallSender
} = createMessageRecallHelpers(logDebug);
const {
  getUser,
  getUser2,
  getUser3,
  getUser6
} = createUserService({
  getIsAdmin: () => (state.getPermissionService() ? state.getPermissionService().isAdmin : null),
  sendWithRecall,
  ADMIN_VIP_END_TIME,
  getRuntimeConfig: state.getRuntimeConfig,
  getEnsureAdminVipPrivileges: () => state.getEnsureAdminVipPrivileges()
});
const permissionService = createPermissionService({
  ensureScopedId,
  getUser6
});
state.setPermissionService(permissionService);
const { isAdmin, checkTaxBeforeCommand } = permissionService;
const { work } = createWorkService({
  getUser,
  registrationGuide
});
const profileRenderer = createProfileRenderer();
const {
  registerFarmCommands,
  formatCropLabel,
  crops,
  harvest
} = createFarmModule({
  setupMessageRecall,
  checkTaxBeforeCommand,
  isAdmin,
  formatCostTip,
  getUser,
  registrationGuide
});
const { registerAppearanceCommands } = createAppearanceModule({
  setupMessageRecall,
  checkTaxBeforeCommand,
  isAdmin,
  formatCostTip,
  getUser6
});
const {
  registerBodyguardCommands,
  bodyguardData
} = createBodyguardModule({
  setupMessageRecall,
  checkTaxBeforeCommand,
  isAdmin,
  formatCostTip,
  getUser,
  registrationGuide
});
const { registerInfoCommands } = createInfoModule({
  setupMessageRecall,
  accrueLoanInterest,
  calculateLoanLimit,
  formatCropLabel,
  crops,
  bodyguardData,
  getUser2,
  getUser6,
  registrationGuide,
  renderProfileCard: profileRenderer.renderProfileCard
});
const { registerMarketCommands } = createMarketModule({
  setupMessageRecall,
  checkTaxBeforeCommand,
  registrationGuide,
  isAdmin,
  bodyguardData,
  work,
  getUser2,
  createScopeFilter,
  resolveTargetUser
});
const { registerRedPacketCommands } = createRedPacketModule({
  setupMessageRecall,
  checkTaxBeforeCommand,
  getUser3,
  getScopeKey,
  isAdmin
});
const { registerJailCommands } = createJailModule({
  setupMessageRecall,
  checkTaxBeforeCommand,
  getUser6
});
const { registerRankingCommands } = createRankingModule({
  setupMessageRecall,
  checkTaxBeforeCommand,
  createScopeFilter
});
const { registerAdminCommands } = createAdminModule({
  setupMessageRecall,
  isAdmin,
  createScopeFilter,
  resetGame
});
const sponsorService = createSponsorService({ imagePath: nodePath.join(__dirname, "..", "ai.png") });
const { withSponsorQr } = sponsorService;
const { registerMiscCommands } = createMiscModule({
  setupMessageRecall,
  withSponsorQr
});

// src/index.ts
var name = "player-market";
var Config2 = Config;
var inject = {
  required: ["database", "puppeteer"],
  optional: ["recall"],
  weather: WeatherService
};
async function apply(ctx, config) {
  state.setRuntimeConfig(config);
  registerModels(ctx);
  ctx.backupService = new BackupService(ctx, config.备份设置 ?? {});
  ctx.backupService.start();
  ctx.on("ready", async () => {
    await ensureInitialState(ctx, config);
  });
  ctx.weatherService = new WeatherService(ctx, config.weather);
  const autoTaskScheduler = createAutoTaskScheduler({
    ctx,
    getConfig: state.getRuntimeConfig,
    executeAutoTasks
  });
  autoTaskScheduler.start();
  const helpTemplateSetting = config?.帮助页面?.模板路径 || "help_page.html";
  const resolvedHelpTemplate = nodePath.isAbsolute(helpTemplateSetting) ? helpTemplateSetting : nodePath.join(__dirname, helpTemplateSetting);
  const html_help = createHelpRenderer({ templatePath: resolvedHelpTemplate });
  const reportService = createReportService(ctx, {
    getConfig: state.getRuntimeConfig,
    setupMessageRecall
  });
  const helpCommandService = createHelpCommandService({
    setupMessageRecall,
    renderHelp: html_help
  });
  registerAllCommands(ctx, config);
  helpCommandService.registerHelpCommand(ctx, config);
  reportService.registerReportCommand();
  reportService.start();
;
}
__name(apply, "apply");
({
  deposit,
  withdraw,
  claimInterest,
  bankInfo,
  upgradeCredit,
  applyLoan,
  repayLoan,
  transfer,
  registerBankCommands
} = createBankModule({
  getUser3,
  accrueLoanInterest,
  calculateLoanLimit,
  formatCostTip,
  isAdmin,
  setupMessageRecall,
  checkTaxBeforeCommand,
  registrationGuide,
  resolveTargetUser
}));
const {
  registerVipCommands,
  executeAutoTasks,
  ensureAdminVipPrivileges
} = createVipModule({
  setupMessageRecall,
  withSponsorQr,
  isAdmin,
  ensureScopedId,
  getUser,
  registrationGuide,
  work,
  deposit,
  harvest,
  logDebug,
  getRuntimeConfig: state.getRuntimeConfig,
  ADMIN_VIP_END_TIME,
  HOUR_IN_MS
});
state.setEnsureAdminVipPrivileges(ensureAdminVipPrivileges);
const commandRegistrations = [
  registerInfoCommands,
  registerBankCommands,
  registerFarmCommands,
  registerAppearanceCommands,
  registerBodyguardCommands,
  registerRedPacketCommands,
  registerMarketCommands,
  registerJailCommands,
  registerRankingCommands,
  registerAdminCommands,
  registerMiscCommands,
  registerVipCommands
];
function registerAllCommands(ctx, config) {
  for (const register of commandRegistrations) {
    register(ctx, config);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Config,
  apply,
  inject,
  name
});
