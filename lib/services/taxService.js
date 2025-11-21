const RED_PACKET_EXPIRE = 24 * 60 * 60 * 1e3;
const MAX_PACKET_SHARES = 50;
const MIN_SHARE_AMOUNT = 500;
const MAX_SHARE_AMOUNT = 1e3;
const DISTRIBUTION_START_HOUR = 10;
const DISTRIBUTION_END_HOUR = 17;
const CHECK_INTERVAL = 60 * 60 * 1e3;

function startOfDay(timestamp = Date.now()) {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function resolveMeta(getScopeKey, target) {
  if (!target)
    return { scopeId: null, channelId: "", guildId: "", platform: "" };
  if (target.scopeId)
    return {
      scopeId: target.scopeId,
      channelId: target.channelId ?? "",
      guildId: target.guildId ?? "",
      platform: target.platform ?? ""
    };
  const scopeId = typeof getScopeKey === "function" ? getScopeKey(target) : null;
  return {
    scopeId,
    channelId: target.channelId ?? "",
    guildId: target.guildId ?? "",
    platform: target.platform ?? ""
  };
}

function generatePacketId() {
  return `TAX${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function resolveChannelKey(pool, fallbackUsers = []) {
  if (pool?.platform && pool?.channelId) {
    return `${pool.platform}:${pool.channelId}`;
  }
  const fallback = fallbackUsers.find((user) => user.lastChannelId);
  if (fallback?.lastChannelId) {
    return fallback.lastChannelId;
  }
  return pool?.channelId || "";
}

function planPackets(totalAmount) {
  const amount = Math.max(0, Math.floor(totalAmount));
  if (amount <= 0) return [];
  return [{ amount, shares: 10 }];
}

function createTaxService(ctx, options = {}) {
  const getScopeKey = options.getScopeKey;
  let timer = null;
  ctx.on("dispose", () => {
    if (timer)
      clearInterval(timer);
    timer = null;
  });

  async function recordTax(target, amount) {
    if (!amount || amount <= 0)
      return;
    const meta = resolveMeta(getScopeKey, target);
    if (!meta.scopeId)
      return;
    const todayKey = startOfDay();
    const records = await ctx.database.get("player_market_tax_pool", {
      scopeId: meta.scopeId,
      dateKey: todayKey,
      distributed: false
    });
    const payload = {
      amount,
      channelId: meta.channelId ?? "",
      guildId: meta.guildId ?? "",
      platform: meta.platform ?? "",
      updatedAt: Date.now()
    };
    if (records.length) {
      const record = records[0];
      await ctx.database.set("player_market_tax_pool", { id: record.id }, {
        amount: record.amount + amount,
        channelId: payload.channelId || record.channelId,
        guildId: payload.guildId || record.guildId,
        platform: payload.platform || record.platform,
        updatedAt: payload.updatedAt
      });
    } else {
      await ctx.database.create("player_market_tax_pool", {
        scopeId: meta.scopeId,
        platform: payload.platform,
        channelId: payload.channelId,
        guildId: payload.guildId,
        amount,
        dateKey: todayKey,
        distributed: false,
        createdAt: payload.updatedAt,
        updatedAt: payload.updatedAt
      });
    }
  }

  async function getPoolStatus(scopeId) {
    if (!scopeId)
      return { scopeId, amount: 0, updatedAt: 0 };
    const records = await ctx.database.get("player_market_tax_pool", {
      scopeId,
      distributed: false
    });
    if (!records.length)
      return { scopeId, amount: 0, updatedAt: 0 };
    const amount = records.reduce((sum, item) => sum + (item.amount || 0), 0);
    const updatedAt = records.reduce((max, item) => Math.max(max, item.updatedAt || 0), 0);
    return { scopeId, amount, updatedAt };
  }

  async function createSystemPacket(pool, amount, shares, cachedUsers) {
    const now = Date.now();
    const packet = {
      id: generatePacketId(),
      scopeId: pool.scopeId,
      channelId: pool.channelId ?? "",
      guildId: pool.guildId ?? "",
      senderId: "system",
      senderNickname: "系统红包",
      totalAmount: amount,
      remainingAmount: amount,
      totalShares: shares,
      remainingShares: shares,
      fee: 0,
      createdAt: now,
      expiresAt: startOfDay(now + RED_PACKET_EXPIRE),
      claims: [],
      isAdminPacket: true
    };
    await ctx.database.create("player_market_red_packets", packet);
    ctx.logger?.info?.(`[slave-market][tax] created packet ${packet.id} amount=${amount} shares=${shares}`);
    const users = Array.isArray(cachedUsers) ? cachedUsers : await ctx.database.get("player_market_users", { scopeId: pool.scopeId });
    const channelKey = resolveChannelKey(pool, users);
    if (channelKey) {
      const tip = `🎁 系统税收红包 ${packet.id} 已发放！
💰 总金额：${amount}金币（${shares}份）
⌛ 今日内使用"抢红包 ${packet.id}"领取，0点失效`;
      try {
        await ctx.broadcast([channelKey], tip);
      } catch (error) {
        ctx.logger?.warn?.(`[slave-market][tax] broadcast failed for ${channelKey}: ${error.message}`);
      }
    }
    return amount;
  }

  async function distributePools(force = false) {
    const now = Date.now();
    const todayStart = startOfDay(now);
    // Use UTC+8 for hour check
    const currentHour = new Date(now + 8 * 60 * 60 * 1e3).getUTCHours();

    ctx.logger?.info?.(`[slave-market][tax] checking distribution. Time: ${new Date(now).toISOString()}, Hour(UTC+8): ${currentHour}, Window: ${DISTRIBUTION_START_HOUR}-${DISTRIBUTION_END_HOUR}, Force: ${force}`);

    if (!force && (currentHour < DISTRIBUTION_START_HOUR || currentHour > DISTRIBUTION_END_HOUR)) {
      ctx.logger?.info?.(`[slave-market][tax] skipping distribution: outside time window (${currentHour})`);
      return;
    }

    try {
      const expiredPackets = await ctx.database.get("player_market_red_packets", {});
      const outdatedIds = expiredPackets.filter((p) => (p.expiresAt || 0) < todayStart).map((p) => p.id);
      for (const id of outdatedIds) {
        await ctx.database.remove("player_market_red_packets", { id });
      }
    } catch (error) {
      ctx.logger?.warn?.(`[slave-market][tax] cleanup failed: ${error.message}`);
    }

    // Find pools that haven't been distributed today
    const records = await ctx.database.get("player_market_tax_pool", {
      distributed: false
    });

    // Filter for pools created on or before today
    const threshold = todayStart;
    const pools = records.filter((record) => (record.dateKey || 0) <= threshold);

    if (!pools.length && !force) {
      ctx.logger?.info?.("[slave-market][tax] no pending pools found");
      return;
    }

    const [system] = await ctx.database.get("slave_market_system", {});
    if (!system) {
      ctx.logger?.warn?.("[slave-market][tax] system account not found");
      return;
    }

    let availableBalance = system.balance || 0;
    ctx.logger?.info?.(`[slave-market][tax] system balance: ${availableBalance}, pools found: ${pools.length}`);

    // If forced and no pools, maybe we want to distribute based on yesterday's data for all active scopes?
    // For now, let's just process the found pools, or if force is true and no pools, 
    // we might need to fetch ALL scopes and check if they had tax yesterday.
    // To keep it simple and safe: "Force" mainly overrides the time window. 
    // But the user requirement says "if tax is insufficient, use last time or yesterday's".

    // Let's iterate over found pools. If a pool has 0 amount (unlikely for 'distributed: false' unless manually created),
    // or very low amount, we check history.

    for (const pool of pools) {
      if (availableBalance <= 0) {
        ctx.logger?.warn?.("[slave-market][tax] system balance exhausted, stopping distribution");
        break;
      }

      let distributable = pool.amount || 0;
      let usedFallback = false;

      // Fallback logic: If amount is 0 (or low?), try to find yesterday's amount
      if (distributable <= 0) {
        const yesterdayKey = todayStart - 24 * 60 * 60 * 1e3;
        const [yesterdayPool] = await ctx.database.get("player_market_tax_pool", {
          scopeId: pool.scopeId,
          dateKey: yesterdayKey,
          distributed: true
        });
        if (yesterdayPool && yesterdayPool.amount > 0) {
          distributable = yesterdayPool.amount;
          usedFallback = true;
          ctx.logger?.info?.(`[slave-market][tax] using fallback amount ${distributable} from yesterday for scope ${pool.scopeId}`);
        }
      }

      // Cap at available balance
      if (distributable > availableBalance) {
        distributable = availableBalance;
      }

      if (distributable <= 0) continue;

      const users = await ctx.database.get("player_market_users", { scopeId: pool.scopeId });
      const packets = planPackets(distributable);
      let spent = 0;

      for (const packet of packets) {
        if (packet.amount <= 0 || packet.shares <= 0) continue;

        if (spent + packet.amount > distributable) {
          packet.amount = distributable - spent;
        }

        if (packet.amount <= 0) break;

        spent += await createSystemPacket(pool, packet.amount, packet.shares, users);
        availableBalance -= packet.amount;

        if (availableBalance <= 0) break;
      }

      // Update system balance
      if (spent > 0) {
        await ctx.database.set("slave_market_system", {}, { balance: Math.max(0, availableBalance) });
      }

      // Mark as distributed
      await ctx.database.set("player_market_tax_pool", { id: pool.id }, {
        amount: 0, // Reset amount as it's distributed
        distributed: true,
        updatedAt: Date.now()
      });

      // If we used fallback, we didn't actually consume the pool's original amount (which was 0),
      // but we deducted from system balance.
      // If we didn't use fallback, we distributed the pool's amount.
      // The logic above sets pool.amount to 0, which is correct for non-fallback.
      // For fallback, pool.amount was already 0, so setting it to 0 is fine.
    }
  }

  function start() {
    if (timer)
      clearInterval(timer);
    timer = setInterval(() => {
      distributePools(false).catch((error) => ctx.logger?.warn?.(`[slave-market][tax] distribute failed: ${error.message}`));
    }, CHECK_INTERVAL);
  }

  return {
    recordTax,
    getPoolStatus,
    distributePools, // Export for manual trigger
    start
  };
}

module.exports = { createTaxService };
