function createPermissionService(deps) {
  const { ensureScopedId, getUser6 } = deps;

  function isAdmin(ctx, config, userId, session) {
    const scopedId = ensureScopedId(session, userId);
    const result = config.管理员列表.includes(scopedId);
    if (config?.调试日志) {
      ctx.logger?.info?.(`[slave-market][debug] isAdmin check`, {
        scopedId,
        result,
        admins: config.管理员列表
      });
    }
    return result;
  }

  async function checkTaxBeforeCommand(ctx, config, session) {
    const user = await getUser6(ctx, session.userId, session);
    if (typeof user === "string") return user;
    if (isAdmin(ctx, config, user.userId, session)) {
      return null;
    }
    if (user.isInJail) {
      const command = session.content.trim();
      const allowedCommands = ["监狱状态", "监狱打工"];
      if (!allowedCommands.some((cmd) => command.startsWith(cmd))) {
        return "❌ 你在监狱中，只能使用以下命令：\n• 监狱状态\n• 监狱打工";
      }
    }
    return null;
  }

  return { isAdmin, checkTaxBeforeCommand };
}

module.exports = { createPermissionService };
