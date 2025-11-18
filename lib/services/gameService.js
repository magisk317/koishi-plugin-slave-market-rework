const { calculatePriceBonus } = require("../modules/appearance");

function resolveInitialPrice(config) {
  const value = Number(config?.初始身价);
  if (!Number.isFinite(value)) return 0;
  return Math.max(1, Math.floor(value));
}

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
        isFinancialCrisis: false,
        isDisabled: false
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
      isFinancialCrisis: false,
      isDisabled: false
    });
  }

  async function normalizePlayerPrices(ctx, config) {
    if (!ctx?.database) return;
    const basePrice = resolveInitialPrice(config);
    if (basePrice <= 0) return;
    const users = await ctx.database.get("player_market_users", {});
    if (!users.length) return;
    for (const user of users) {
      const bonus = typeof calculatePriceBonus === "function" ? calculatePriceBonus(user.equipped || {}) : 0;
      const targetPrice = Math.max(1, basePrice + (Number.isFinite(bonus) ? bonus : 0));
      if (user.price !== targetPrice) {
        await ctx.database.set("player_market_users", { userId: user.userId }, {
          price: targetPrice,
        });
      }
    }
  }

  return { ensureInitialState, resetGame, normalizePlayerPrices };
}

module.exports = { createGameService };
