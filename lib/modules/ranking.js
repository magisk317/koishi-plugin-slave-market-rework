function createRankingModule(deps) {
  const { setupMessageRecall, checkTaxBeforeCommand, createScopeFilter } = deps;

  function buildRankingMessage(title, entries) {
    if (!entries.length) return "暂无排行数据";
    const list = entries.map((user, index) => `${index + 1}. ${user.nickname} - ${user.value}`);
    return `=== ${title} ===\n${list.join("\n")}`;
  }

  function registerRankingCommands(ctx, config) {
    const slaveCommand = ctx.command("大牛马时代");
    slaveCommand.subcommand("牛马排行", "查看拥有牛马数量最多的玩家排行").action(async ({ session }) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
      if (taxCheck) return await respond(taxCheck);
      const users = await ctx.database.get("player_market_users", createScopeFilter(session));
      const sorted = users
        .sort((a, b) => b.employeeCount - a.employeeCount)
        .slice(0, 20)
        .map((user) => ({ nickname: user.nickname, value: `拥有牛马: ${user.employeeCount}个` }));
      return await respond(buildRankingMessage("牛马拥有量排行榜(前20名)", sorted));
    });
    slaveCommand.subcommand("身价排行", "查看身价最高的玩家排行").action(async ({ session }) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
      if (taxCheck) return await respond(taxCheck);
      const users = await ctx.database.get("player_market_users", createScopeFilter(session));
      const sorted = users
        .sort((a, b) => b.price - a.price)
        .slice(0, 20)
        .map((user) => ({ nickname: user.nickname, value: `身价: ${user.price}` }));
      return await respond(buildRankingMessage("牛马身价排行榜(前20名)", sorted));
    });
    slaveCommand.subcommand("资金排行", "查看总资产最多的玩家排行").action(async ({ session }) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
      if (taxCheck) return await respond(taxCheck);
      const users = await ctx.database.get("player_market_users", createScopeFilter(session));
      const sorted = users
        .sort((a, b) => b.balance + b.deposit - (a.balance + a.deposit))
        .slice(0, 20)
        .map((user) => ({
          nickname: user.nickname,
          value: `总资产: ${user.balance + user.deposit}(余额:${user.balance} + 存款:${user.deposit})`,
        }));
      return await respond(buildRankingMessage("资金排行榜(前20名)", sorted));
    });
  }

  return { registerRankingCommands };
}

module.exports = { createRankingModule };
