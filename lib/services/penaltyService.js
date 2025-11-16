function createPenaltyService(deps) {
  const { getUser2, logDebug } = deps;
  const records = new Map();
  const DEFAULTS = {
    启用: true,
    初始罚款: 100,
    倍率: 2,
    追踪窗口: 5 * 60 * 1e3,
  };
  const ERROR_KEYWORDS = ["❌", "失败", "错误", "无法", "不能", "不足", "未注册", "禁止", "不允许", "⚠️", "必须", "无效"];

  function resolveConfig(config) {
    return { ...DEFAULTS, ...(config?.重复指令惩罚 ?? {}) };
  }

  function isCommandError(content) {
    if (content == null) return false;
    const text = String(content);
    return ERROR_KEYWORDS.some((keyword) => text.includes(keyword));
  }

  function resolveCommandKey(session, actionKey) {
    const rawInput = session?.content ?? "";
    const trimmed = rawInput.trim();
    if (trimmed) {
      const [firstToken] = trimmed.split(/\s+/);
      if (firstToken) return firstToken;
      return trimmed;
    }
    const commandName = session?.argv?.command?.name ?? session?.command?.name ?? "";
    if (commandName) return commandName;
    return actionKey ?? "";
  }

  function resetRecord(userId) {
    if (!userId) return;
    records.delete(userId);
  }

  function isIgnoredCommand(commandKey, runtimeConfig) {
    const ignoreList = Array.isArray(runtimeConfig?.忽略指令) ? runtimeConfig.忽略指令 : [];
    if (!ignoreList.length || !commandKey) return false;
    return ignoreList.some((item) => item && commandKey.includes(item));
  }

  async function handleResponse(payload) {
    const { session, ctx, config, actionKey, content, sendExtra } = payload;
    const runtimeConfig = resolveConfig(config);
    if (!runtimeConfig.启用) return;
    const userId = session?.userId;
    if (!userId) return;
    if (!isCommandError(content)) {
      resetRecord(userId);
      return;
    }
    const commandKey = resolveCommandKey(session, actionKey);
    if (!commandKey) return;
    if (isIgnoredCommand(commandKey, runtimeConfig)) {
      return;
    }
    const now = Date.now();
    const last = records.get(userId);
    let record = last;
    if (!record || record.commandKey !== commandKey || now - record.timestamp > runtimeConfig.追踪窗口) {
      record = { commandKey, count: 0 };
    }
    record.count += 1;
    record.timestamp = now;
    records.set(userId, record);
    const user = await getUser2(ctx, session.userId, session);
    if (!user) return;
    if (record.count === 1) {
      const warning = `⚠️ 检测到你在重复尝试「${commandKey}」。请检查指令格式，继续试错将被罚款。`;
      await sendExtra?.(warning, "penalty");
      return;
    }
    const baseFine = runtimeConfig.初始罚款;
    const multiplier = Math.max(1, runtimeConfig.倍率);
    const fine = Math.max(0, Math.floor(baseFine * Math.pow(multiplier, record.count - 2)));
    if (fine <= 0) return;
    const deduction = Math.min(user.balance, fine);
    if (deduction <= 0) {
      await sendExtra?.("⚠️ 已触发惩罚逻辑，但你当前余额不足。请不要继续试错。", "penalty");
      return;
    }
    await ctx.database.set("player_market_users", { userId: user.userId }, {
      balance: user.balance - deduction,
    });
    logDebug?.(ctx, "repeat command penalty", {
      userId: user.userId,
      commandKey,
      count: record.count,
      fine: deduction,
    });
    const tip =
      record.count === 2
        ? `💥 再次尝试失败，扣除 ${deduction} 金币。继续试错将按倍率加倍惩罚。`
        : `💥 第 ${record.count} 次重复错误，扣除 ${deduction} 金币（倍率加成）。请立即停止。`;
    await sendExtra?.(tip, "penalty");
  }

  return {
    handleResponse,
  };
}

module.exports = { createPenaltyService };
