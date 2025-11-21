const { createTransactionService } = require("./transactionService");
const transactionService = createTransactionService();
const categories = transactionService.categories;
function formatNumber(value) {
  return (value ?? 0).toLocaleString("zh-CN");
}

function createReportService(ctx, options = {}) {
  const getConfig = options.getConfig ?? (() => ({}));
  const setupMessageRecall = options.setupMessageRecall;
  let intervalTimer = null;

  async function collectStatistics(config) {
    const [users, statsRows, systemRows, transactions] = await Promise.all([
      ctx.database.get("player_market_users", {}),
      ctx.database.get("game_statistics", {}),
      ctx.database.get("slave_market_system", {}),
      ctx.database.get("player_market_transactions", {})
    ]);
    const stats = statsRows[0] || {};
    const system = systemRows[0] || {};
    const totalTransactions = transactions.length || stats.totalTransactions || 0;
    const totalWorkIncome = transactions.reduce(
      (sum, tx) => sum + (tx.category === categories.WORK && tx.direction === "income" ? tx.amount || 0 : 0),
      0
    ) || stats.totalWorkIncome || 0;
    const totalRobAmount = transactions.reduce(
      (sum, tx) => sum + (tx.category === categories.ROB_GAIN ? tx.amount || 0 : 0),
      0
    ) || stats.totalRobAmount || 0;
    const totalPlayers = users.length;
    const totalBalance = users.reduce((sum, user) => sum + (user.balance || 0), 0);
    const totalDeposit = users.reduce((sum, user) => sum + (user.deposit || 0), 0);
    const totalWealth = totalBalance + totalDeposit;
    const activeWindowHours = Math.max(1, config?.统计报告?.统计范围小时 ?? 24);
    const threshold = Date.now() - activeWindowHours * 60 * 60 * 1e3;
    const activePlayers = users.filter((user) => (user.lastActiveTime || 0) >= threshold).length;
    const rankingLimit = Math.max(1, config?.统计报告?.展示数量 ?? 5);
    const wealthRanking = [...users].sort((a, b) => (b.balance + b.deposit) - (a.balance + a.deposit)).slice(0, rankingLimit);
    const workRanking = [...users].sort((a, b) => (b.price || 0) - (a.price || 0)).slice(0, rankingLimit);
    return {
      totalPlayers,
      activePlayers,
      totalBalance,
      totalDeposit,
      totalWealth,
      stats,
      system,
      wealthRanking,
      workRanking,
      rankingLimit,
      totals: { totalTransactions, totalWorkIncome, totalRobAmount }
    };
  }

  function formatRanking(list, formatter) {
    if (!list.length) return "暂无数据";
    return list.map((user, idx) => `${idx + 1}. ${formatter(user)}`).join("\n");
  }

  async function generateReportText(config = getConfig()) {
    const data = await collectStatistics(config);
    const wealthRankingText = formatRanking(data.wealthRanking, (user) => `${user.nickname} - 总资产 ${formatNumber(user.balance + (user.deposit || 0))}`);
    const workRankingText = formatRanking(data.workRanking, (user) => `${user.nickname} - 当前身价 ${formatNumber(user.price || 0)}`);
    return `=== 游戏运行报告 ===
👥 总玩家数：${formatNumber(data.totalPlayers)}
🟢 活跃玩家（${config?.统计报告?.统计范围小时 ?? 24}h）：${formatNumber(data.activePlayers)}
💰 玩家余额：${formatNumber(data.totalBalance)}
🏦 银行存款：${formatNumber(data.totalDeposit)}
💎 玩家总资产：${formatNumber(data.totalWealth)}
🏛️ 系统资金：${formatNumber(data.system.balance || 0)}
📈 总交易次数：${formatNumber(data.totals.totalTransactions)}
💼 总打工收入：${formatNumber(data.totals.totalWorkIncome)}
🪙 总抢劫金额：${formatNumber(data.totals.totalRobAmount)}

💹 财富榜（前${data.rankingLimit}）：
${wealthRankingText}

💼 身价榜（前${data.rankingLimit}）：
${workRankingText}`;
  }

  async function emitReport(reason) {
    const config = getConfig();
    if (!config?.统计报告?.启用) return;
    try {
      const message = await generateReportText(config);
      ctx.logger.info(`[slave-market][report][${reason}]\n${message}`);
    } catch (error) {
      ctx.logger.warn(`[slave-market][report] ${reason} failed: ${error.message}`);
    }
  }

  function start() {
    const config = getConfig();
    if (!config?.统计报告?.启用) return;
    const interval = Math.max(5 * 60 * 1e3, config.统计报告.间隔 ?? 60 * 60 * 1e3);
    emitReport("startup");
    intervalTimer = setInterval(() => emitReport("interval"), interval);
  }

  function registerReportCommand() {
    if (!setupMessageRecall) return;
    ctx.command("大牛马时代.数据报告", "查看游戏统计报告").alias("活动统计").action(async ({ session }) => {
      const config = getConfig();
      const respond = setupMessageRecall(session, ctx, config, "general");
      return await respond(await generateReportText(config));
    });
  }

  return {
    start,
    registerReportCommand,
    generateReportText
  };
}

module.exports = { createReportService };
