const RED_PACKET_EXPIRE = 10 * 60 * 1e3;
const MAX_PACKET_SHARES = 50;
const MIN_SHARE_AMOUNT = 500;
const MAX_SHARE_AMOUNT = 1e3;
const DISTRIBUTION_HOUR = 10;
const CHECK_INTERVAL = 5 * 60 * 1e3;

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

function planPackets(totalAmount, participantCount) {
  const packets = [];
  let remaining = Math.max(0, Math.floor(totalAmount));
  const participants = Math.max(1, Math.min(MAX_PACKET_SHARES, participantCount || 1));
  while (remaining >= MIN_SHARE_AMOUNT) {
    let shares = Math.min(participants, Math.max(1, Math.floor(remaining / MIN_SHARE_AMOUNT)));
    shares = Math.max(1, Math.min(shares, MAX_PACKET_SHARES));
    const minPacketAmount = shares * MIN_SHARE_AMOUNT;
    if (remaining < minPacketAmount && shares > 1) {
      shares = Math.max(1, Math.floor(remaining / MIN_SHARE_AMOUNT));
    }
    if (shares <= 0)
      break;
    const maxPacketAmount = shares * MAX_SHARE_AMOUNT;
    const avg = Math.min(MAX_SHARE_AMOUNT, Math.max(MIN_SHARE_AMOUNT, Math.floor(remaining / shares)));
    const packetAmount = Math.max(minPacketAmount, Math.min(remaining, maxPacketAmount, avg * shares));
    packets.push({ amount: packetAmount, shares });
    remaining -= packetAmount;
    if (remaining < MIN_SHARE_AMOUNT)
      break;
  }
  if (!packets.length && totalAmount > 0) {
    packets.push({ amount: Math.floor(totalAmount), shares: 1 });
    remaining = 0;
  }
  if (remaining > 0 && packets.length) {
    packets[packets.length - 1].amount += remaining;
  }
  return packets;
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
      expiresAt: now + RED_PACKET_EXPIRE,
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
⌛ 请在10分钟内使用"抢红包 ${packet.id}"领取`;
      try {
        await ctx.broadcast([channelKey], tip);
      } catch (error) {
        ctx.logger?.warn?.(`[slave-market][tax] broadcast failed for ${channelKey}: ${error.message}`);
      }
    }
    return amount;
  }

  async function distributePools() {
    const now = Date.now();
    const todayStart = startOfDay(now);
    const threshold = todayStart - 24 * 60 * 60 * 1e3;
    if (now < todayStart + DISTRIBUTION_HOUR * 60 * 60 * 1e3)
      return;
    const records = await ctx.database.get("player_market_tax_pool", {
      distributed: false
    });
    const pools = records.filter((record) => (record.dateKey || 0) <= threshold);
    if (!pools.length)
      return;
    const [system] = await ctx.database.get("slave_market_system", {});
    if (!system)
      return;
    let availableBalance = system.balance || 0;
    for (const pool of pools) {
      if (availableBalance <= 0)
        break;
      const distributable = Math.min(pool.amount || 0, availableBalance);
      if (distributable <= 0)
        continue;
      const users = await ctx.database.get("player_market_users", { scopeId: pool.scopeId });
      const packets = planPackets(distributable, users.length || 1);
      let spent = 0;
      for (const packet of packets) {
        if (packet.amount <= 0 || packet.shares <= 0)
          continue;
        if (spent + packet.amount > distributable) {
          packet.amount = distributable - spent;
        }
        if (packet.amount <= 0)
          break;
        spent += await createSystemPacket(pool, packet.amount, packet.shares, users);
        availableBalance -= packet.amount;
        if (availableBalance <= 0)
          break;
      }
      const remainder = Math.max(0, (pool.amount || 0) - spent);
      if (spent > 0) {
        await ctx.database.set("slave_market_system", {}, { balance: Math.max(0, availableBalance) });
      }
      await ctx.database.set("player_market_tax_pool", { id: pool.id }, {
        amount: 0,
        distributed: true,
        updatedAt: Date.now()
      });
      if (remainder > 0) {
        await recordTax({
          scopeId: pool.scopeId,
          channelId: pool.channelId,
          guildId: pool.guildId,
          platform: pool.platform
        }, remainder);
      }
    }
  }

  function start() {
    if (timer)
      clearInterval(timer);
    timer = setInterval(() => {
      distributePools().catch((error) => ctx.logger?.warn?.(`[slave-market][tax] distribute failed: ${error.message}`));
    }, CHECK_INTERVAL);
  }

  return {
    recordTax,
    start
  };
}

module.exports = { createTaxService };
