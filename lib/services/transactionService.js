const { getScopeKey } = require("../utils/playerHelpers");

const TransactionCategory = {
  WORK: "work_income",
  EMPLOYER_SHARE: "employer_share",
  FARM_SEED: "farm_seed",
  FARM_HARVEST: "farm_harvest",
  ROB_GAIN: "robbery_gain",
  ROB_LOSS: "robbery_loss",
  ROB_PENALTY: "robbery_penalty",
  RANSOM_PAY: "ransom_pay",
  RANSOM_INCOME: "ransom_income",
  PURCHASE: "purchase_player",
  FORCE_PURCHASE: "force_purchase",
  FORCE_COMPENSATION: "force_compensation",
  BANK_DEPOSIT: "bank_deposit",
  BANK_WITHDRAW: "bank_withdraw",
  BANK_PENALTY: "bank_penalty",
  BANK_INTEREST: "bank_interest",
  CREDIT_UPGRADE: "credit_upgrade",
  LOAN_RECEIVE: "loan_receive",
  LOAN_REPAY: "loan_repay",
  TRANSFER_OUT: "transfer_out",
  TRANSFER_IN: "transfer_in",
  BODYGUARD: "bodyguard_purchase",
  APPEARANCE: "appearance_purchase",
  WELFARE: "welfare_income",
  RED_PACKET_SEND: "red_packet_send",
  RED_PACKET_RECEIVE: "red_packet_receive",
  JAIL_DISTRIBUTION: "jail_distribution",
  JAIL_BAIL: "jail_bail"
};

const MAX_FETCH_LIMIT = 50;

function clampLimit(limit) {
  const value = Math.floor(Number(limit));
  if (!Number.isFinite(value) || value <= 0) return 10;
  return Math.min(MAX_FETCH_LIMIT, Math.max(1, value));
}

function resolveCategoryLabel(category) {
  switch (category) {
    case TransactionCategory.WORK:
      return "打工收入";
    case TransactionCategory.EMPLOYER_SHARE:
      return "牛马分成";
    case TransactionCategory.FARM_SEED:
      return "种植成本";
    case TransactionCategory.FARM_HARVEST:
      return "收成收入";
    case TransactionCategory.ROB_GAIN:
      return "抢劫所得";
    case TransactionCategory.ROB_LOSS:
      return "被抢损失";
    case TransactionCategory.ROB_PENALTY:
      return "抢劫罚金";
    case TransactionCategory.RANSOM_PAY:
      return "赎身支出";
    case TransactionCategory.RANSOM_INCOME:
      return "赎身收入";
    case TransactionCategory.PURCHASE:
      return "购买牛马";
    case TransactionCategory.FORCE_PURCHASE:
      return "强制买卖";
    case TransactionCategory.FORCE_COMPENSATION:
      return "强制补偿";
    case TransactionCategory.BANK_DEPOSIT:
      return "银行存款";
    case TransactionCategory.BANK_WITHDRAW:
      return "银行取款";
    case TransactionCategory.BANK_PENALTY:
      return "银行罚金";
    case TransactionCategory.BANK_INTEREST:
      return "银行利息";
    case TransactionCategory.CREDIT_UPGRADE:
      return "财富升级";
    case TransactionCategory.LOAN_RECEIVE:
      return "贷款入账";
    case TransactionCategory.LOAN_REPAY:
      return "贷款还款";
    case TransactionCategory.TRANSFER_OUT:
      return "转账支出";
    case TransactionCategory.TRANSFER_IN:
      return "转账收入";
    case TransactionCategory.BODYGUARD:
      return "保镖费用";
    case TransactionCategory.APPEARANCE:
      return "装扮消费";
    case TransactionCategory.WELFARE:
      return "福报收入";
    case TransactionCategory.RED_PACKET_SEND:
      return "红包发出";
    case TransactionCategory.RED_PACKET_RECEIVE:
      return "红包收入";
    case TransactionCategory.JAIL_DISTRIBUTION:
      return "监狱分配";
    case TransactionCategory.JAIL_BAIL:
      return "监狱保释";
    default:
      return category || "其他";
  }
}

function createTransactionService() {
  async function logTransaction(ctx, user, entry = {}) {
    if (!ctx || !user) return;
    const amountValue = Math.floor(Number(entry.amount));
    if (!Number.isFinite(amountValue) || amountValue <= 0) return;
    const direction = entry.direction === "income" ? "income" : "expense";
    const scopeId = user.scopeId || (entry.session ? getScopeKey(entry.session) : getScopeKey());
    const balanceAfter = Number.isFinite(entry.balanceAfter)
      ? Math.max(0, Math.floor(entry.balanceAfter))
      : direction === "income"
        ? Math.max(0, Math.floor((user.balance ?? 0) + amountValue))
        : Math.max(0, Math.floor((user.balance ?? 0) - amountValue));
    await ctx.database.create("player_market_transactions", {
      userId: user.userId,
      scopeId,
      direction,
      category: entry.category || "general",
      amount: amountValue,
      balanceAfter,
      description: entry.description || "",
      relatedUserId: entry.relatedUserId || "",
      metadata: entry.metadata || {},
      isFee: Boolean(entry.isFee),
      createdAt: entry.timestamp ?? Date.now()
    });
  }

  async function getStatement(ctx, user, options = {}) {
    if (!ctx || !user) return [];
    const limit = clampLimit(options.limit);
    const rows = await ctx.database.get("player_market_transactions", { userId: user.userId });
    const filtered = rows
      .filter((row) => {
        if (!options.includeFee && row.isFee) return false;
        if (options.direction && row.direction !== options.direction) return false;
        if (options.category && row.category !== options.category) return false;
        return true;
      })
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return filtered.slice(0, limit);
  }

  function summarize(entries) {
    return entries.reduce((map, entry) => {
      const category = entry.category || "general";
      if (!map[category]) {
        map[category] = { income: 0, expense: 0 };
      }
      const bucket = map[category];
      if (entry.direction === "income") {
        bucket.income += entry.amount || 0;
      } else {
        bucket.expense += entry.amount || 0;
      }
      return map;
    }, {});
  }

  return {
    logTransaction,
    getStatement,
    summarize,
    resolveCategoryLabel,
    categories: TransactionCategory
  };
}

module.exports = { createTransactionService };
