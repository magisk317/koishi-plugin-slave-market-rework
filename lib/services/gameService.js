function createGameService() {
  async function ensureInitialState(ctx, config) {
    const stats = await ctx.database.get("game_statistics", {});
    if (!stats.length) {
      await ctx.database.create("game_statistics", {
        totalTransactions: 0,
        totalWorkIncome: 0,
        totalRobAmount: 0,
        activePlayers: 0,
        gameStartTime: Date.now(),
        gameStatus: "running"
      });
    }
    const system = await ctx.database.get("slave_market_system", {});
    if (!system.length) {
      await ctx.database.create("slave_market_system", {
        balance: config.初始余额,
        isFinancialCrisis: false
      });
    }
  }

  async function resetGame(ctx, config) {
    await ctx.database.remove("player_market_users", {});
    await ctx.database.remove("game_statistics", {});
    await ctx.database.create("game_statistics", {
      totalTransactions: 0,
      totalWorkIncome: 0,
      totalRobAmount: 0,
      activePlayers: 0,
      gameStartTime: Date.now(),
      gameStatus: "running"
    });
    await ctx.database.remove("slave_market_system", {});
    await ctx.database.create("slave_market_system", {
      balance: config.初始余额,
      isFinancialCrisis: false
    });
  }

  return { ensureInitialState, resetGame };
}

module.exports = { createGameService };
