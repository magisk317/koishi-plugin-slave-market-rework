const PROGRESSIVE_THRESHOLD = 1e4;
const PROGRESSIVE_STEP = 0.1;
const PROGRESSIVE_MAX_RATE = 0.8;

function resolvePurchaseTaxRate(config) {
  const rate = Number(config?.购买税率);
  if (!Number.isFinite(rate)) return 0.1;
  return Math.max(0, rate);
}

function resolveProgressiveTaxRate(baseRate, depositAmount = 0) {
  const normalizedRate = Number(baseRate);
  if (!Number.isFinite(normalizedRate) || normalizedRate <= 0)
    return 0;
  const deposit = Math.max(0, Number(depositAmount) || 0);
  const tier = Math.max(0, Math.floor(deposit / PROGRESSIVE_THRESHOLD));
  const progressiveRate = normalizedRate + tier * PROGRESSIVE_STEP;
  return Math.min(PROGRESSIVE_MAX_RATE, progressiveRate);
}

function calculateProgressiveAmount(baseRate, amount, depositAmount, options = {}) {
  if (!amount || amount <= 0)
    return 0;
  const rate = resolveProgressiveTaxRate(baseRate, depositAmount);
  if (rate <= 0)
    return 0;
  let fee = Math.floor(amount * rate);
  if (Number.isFinite(options.minimum) && options.minimum > 0) {
    fee = Math.max(options.minimum, fee);
  }
  return Math.max(0, fee);
}

function calculatePurchaseTax(config, amount, user) {
  if (!amount || amount <= 0) return 0;
  const rate = resolvePurchaseTaxRate(config);
  if (rate <= 0) return 0;
  return Math.max(0, Math.floor(amount * resolveProgressiveTaxRate(rate, user?.deposit ?? 0)));
}

function resolveFinancialFeeConfig(config) {
  const raw = config?.金融手续费 ?? {};
  const ratio = Number(raw.比例);
  const minimum = Number(raw.最低);
  return {
    ratio: Number.isFinite(ratio) ? Math.max(0, ratio) : 0.1,
    minimum: Number.isFinite(minimum) ? Math.max(0, minimum) : 10,
  };
}

function calculateFinancialFee(config, amount, user) {
  if (!amount || amount <= 0) return 0;
  const { ratio, minimum } = resolveFinancialFeeConfig(config);
  const percentFee = calculateProgressiveAmount(ratio, amount, user?.deposit ?? 0, { minimum });
  return Math.max(0, percentFee);
}

async function creditSystemAccount(ctx, amount) {
  if (!ctx || !amount || amount <= 0) return;
  const [system] = await ctx.database.get("slave_market_system", {});
  if (!system) return;
  await ctx.database.set("slave_market_system", {}, {
    balance: system.balance + amount,
  });
}

async function ensureSufficientBalance(ctx, user, requiredAmount, options = {}) {
  const { privileged = false } = options;
  if (!ctx || !user || privileged) {
    return { user, withdrawn: 0, notice: "" };
  }
  if (!Number.isFinite(requiredAmount) || requiredAmount <= 0) {
    return { user, withdrawn: 0, notice: "" };
  }
  const deposit = Math.max(0, user.deposit ?? 0);
  if (user.balance >= requiredAmount || deposit <= 0) {
    return { user, withdrawn: 0, notice: "" };
  }
  const deficit = requiredAmount - user.balance;
  const withdrawAmount = Math.min(deficit, deposit);
  if (withdrawAmount <= 0) {
    return { user, withdrawn: 0, notice: "" };
  }
  const updatedUser = {
    ...user,
    balance: user.balance + withdrawAmount,
    deposit: deposit - withdrawAmount,
  };
  await ctx.database.set("player_market_users", { userId: user.userId }, {
    balance: updatedUser.balance,
    deposit: updatedUser.deposit,
  });
  return {
    user: updatedUser,
    withdrawn: withdrawAmount,
    notice: `💡 已自动从银行取出${withdrawAmount}金币，当前余额：${updatedUser.balance}金币`,
  };
}

module.exports = {
  calculatePurchaseTax,
  calculateFinancialFee,
  resolveProgressiveTaxRate,
  calculateProgressiveAmount,
  creditSystemAccount,
  ensureSufficientBalance,
};
