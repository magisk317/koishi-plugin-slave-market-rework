function createWorkService(deps) {
  const { getUser, registrationGuide, transactionService } = deps;

  async function work(ctx, config, session) {
    const user = await getUser(ctx, session.userId, session);
    if (!user) {
      return registrationGuide();
    }
    const now = Date.now();
    if (now - user.lastWorkTime < config.打工冷却) {
      const remainingTime = Math.ceil((config.打工冷却 - (now - user.lastWorkTime)) / 1e3 / 60);
      return `打工CD中，还需要等待${remainingTime}分钟`;
    }
    const baseIncome = Math.floor(user.price * config.打工基础收入);
    const weatherRate = ctx.weatherService.getWorkIncomeRate();
    const income = Math.floor(baseIncome * weatherRate);
    const employerShare = user.employer ? Math.floor(income * config.牛马主加成) : 0;
    const updatedBalance = user.balance + income;
    await ctx.database.set("player_market_users", { userId: user.userId }, {
      balance: updatedBalance,
      lastWorkTime: now
    });
    user.balance = updatedBalance;
    user.lastWorkTime = now;
    await transactionService?.logTransaction(ctx, { ...user }, {
      direction: "income",
      category: transactionService?.categories.WORK,
      amount: income,
      description: `打工收入（${weatherStatus.weatherEffect.name}）`,
      balanceAfter: updatedBalance
    });
    if (user.employer) {
      const employer = await getUser(ctx, user.employer, session);
      if (employer) {
        const employerBalance = employer.balance + employerShare;
        await ctx.database.set("player_market_users", { userId: user.employer }, {
          balance: employerBalance
        });
        employer.balance = employerBalance;
        await transactionService?.logTransaction(ctx, { ...employer }, {
          direction: "income",
          category: transactionService?.categories.EMPLOYER_SHARE,
          amount: employerShare,
          description: `${user.nickname} 打工分成`,
          balanceAfter: employerBalance,
          relatedUserId: user.userId
        });
      }
    }
    const weatherStatus = ctx.weatherService.getWeatherStatus();
    return `✅ 打工成功！
💰 基础收入：${baseIncome}金币
🌤️ 天气加成：${weatherStatus.weatherEffect.name}（${(weatherRate * 100).toFixed(0)}%）
💰 最终收入：${income}金币${user.employer ? `
👑 牛马主分成：${employerShare}金币` : ""}`;
  }

  return { work };
}

module.exports = { createWorkService };
