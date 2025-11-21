const { randomInt } = require("../utils/random");
const { ensureSufficientBalance } = require("../utils/economy");

const RED_PACKET_FEE_RATE = 0.05;
const RED_PACKET_EXPIRE = 10 * 60 * 1e3;
const RED_PACKET_MAX_SHARES = 50;

function createRedPacketModule(deps) {
  const { setupMessageRecall, checkTaxBeforeCommand, getUser3, getScopeKey, isAdmin, transactionService } = deps;

  function generateRedPacketId() {
    return `HB${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  }

  function allocateRedPacketAmount(packet) {
    if (packet.remainingShares <= 1) return packet.remainingAmount;
    const average = packet.remainingAmount / packet.remainingShares;
    const minAvg = Math.max(1, Math.floor(average * 0.8));
    const maxAvg = Math.max(minAvg, Math.floor(average * 1.2));
    const maxRemain = packet.remainingAmount - (packet.remainingShares - 1);
    const picked = randomInt(minAvg, maxAvg);
    return Math.max(1, Math.min(maxRemain, picked));
  }

  async function sendRedPacket(ctx, config, session, totalAmount, shareCount) {
    let sender = await getUser3(ctx, session.userId, session);
    if (typeof sender === "string") return sender;
    const amount = Math.floor(totalAmount);
    const shares = Math.floor(shareCount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return "❌ 红包金额必须为正整数";
    }
    if (!Number.isFinite(shares) || shares <= 0) {
      return "❌ 红包份数必须为正整数";
    }
    if (shares > RED_PACKET_MAX_SHARES) {
      return `❌ 单次最多可分${RED_PACKET_MAX_SHARES}份`;
    }
    if (amount < shares) {
      return "❌ 红包金额必须不小于份数";
    }
    const privileged = isAdmin(ctx, config, sender.userId, session);
    const fee = privileged ? 0 : Math.ceil(amount * RED_PACKET_FEE_RATE);
    const totalCost = amount + fee;
    let autoWithdrawNotice = "";
    if (!privileged) {
      const cover = await ensureSufficientBalance(ctx, sender, totalCost, { privileged });
      sender = cover.user;
      autoWithdrawNotice = cover.notice;
    }
    if (!privileged && sender.balance < totalCost) {
      const notice = autoWithdrawNotice ? `\n${autoWithdrawNotice}` : "";
      return `❌ 红包发送失败：需要${totalCost}金币（含手续费${fee}），当前余额${sender.balance}${notice}`;
    }
    if (!privileged) {
      const balanceAfter = sender.balance - totalCost;
      await ctx.database.set("player_market_users", { userId: sender.userId }, {
        balance: balanceAfter
      });
      sender.balance = balanceAfter;
      await transactionService?.logTransaction(ctx, { ...sender }, {
        direction: "expense",
        category: transactionService?.categories.RED_PACKET_SEND,
        amount,
        description: `发送红包 ${amount} 金币`,
        balanceAfter
      });
      if (fee > 0) {
        const [system] = await ctx.database.get("slave_market_system", {});
        if (system) {
          await ctx.database.set("slave_market_system", {}, { balance: system.balance + fee });
        }
        await transactionService?.logTransaction(ctx, { ...sender }, {
          direction: "expense",
          category: transactionService?.categories.RED_PACKET_SEND,
          amount: fee,
          description: "红包手续费",
          balanceAfter,
          isFee: true
        });
      }
    }
    const now = Date.now();
    const packet = {
      id: generateRedPacketId(),
      scopeId: getScopeKey(session),
      channelId: session.channelId ?? "",
      guildId: session.guildId ?? "",
      senderId: sender.userId,
      senderNickname: sender.nickname,
      totalAmount: amount,
      remainingAmount: amount,
      totalShares: shares,
      remainingShares: shares,
      fee,
      createdAt: now,
      expiresAt: now + RED_PACKET_EXPIRE,
      claims: [],
      isAdminPacket: privileged
    };
    await ctx.database.create("player_market_red_packets", packet);
    const notice = autoWithdrawNotice ? `\n${autoWithdrawNotice}` : "";
    return `✅ 红包已发出！
🎁 红包ID：${packet.id}
💰 总金额：${amount}金币（${shares}份）
💸 扣除手续费：${fee}金币
📣 大家发送"抢红包 ${packet.id}"即可领取${notice}`;
  }

  async function grabRedPacket(ctx, config, session, packetId) {
    const user = await getUser3(ctx, session.userId, session);
    if (typeof user === "string") return user;
    if (!packetId) {
      return "❌ 请输入红包ID";
    }
    const packets = await ctx.database.get("player_market_red_packets", { id: packetId.trim() });
    if (!packets.length) {
      return "❌ 红包不存在或已被领取完";
    }
    const packet = packets[0];
    const scopeId = getScopeKey(session);
    if (packet.scopeId !== scopeId) {
      return "❌ 该红包不属于当前群聊";
    }
    const now = Date.now();
    if (packet.expiresAt && now > packet.expiresAt) {
      await ctx.database.set("player_market_red_packets", { id: packet.id }, {
        remainingAmount: 0,
        remainingShares: 0
      });
      return "❌ 红包已过期";
    }
    if (packet.remainingShares <= 0 || packet.remainingAmount <= 0) {
      return "❌ 红包已经被抢完啦";
    }
    const claims = Array.isArray(packet.claims) ? packet.claims : [];
    if (claims.some((claim) => claim.userId === user.userId)) {
      return "❌ 你已经抢过该红包";
    }
    const amount = allocateRedPacketAmount(packet);
    const updatedClaims = [...claims, {
      userId: user.userId,
      nickname: user.nickname,
      amount,
      time: now
    }];
    const balanceAfter = user.balance + amount;
    await ctx.database.set("player_market_users", { userId: user.userId }, {
      balance: balanceAfter
    });
    await transactionService?.logTransaction(ctx, { ...user, balance: balanceAfter }, {
      direction: "income",
      category: transactionService?.categories.RED_PACKET_RECEIVE,
      amount,
      description: `抢红包 ${packet.id}`,
      balanceAfter
    });
    await ctx.database.set("player_market_red_packets", { id: packet.id }, {
      remainingAmount: Math.max(0, packet.remainingAmount - amount),
      remainingShares: Math.max(0, packet.remainingShares - 1),
      claims: updatedClaims
    });
    return `🎉 抢到${amount}金币！
📦 红包剩余：${Math.max(0, packet.remainingShares - 1)}份，${Math.max(0, packet.remainingAmount - amount)}金币`;
  }

  function registerRedPacketCommands(ctx, config) {
    const slaveCommand = ctx.command("大牛马时代");
    slaveCommand.subcommand("发红包 <amount:number> <count:number>", "发放群红包，5%手续费").action(async ({ session }, amount, count) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
      if (taxCheck) return await respond(taxCheck);
      return await respond(await sendRedPacket(ctx, config, session, amount, count));
    });
    slaveCommand.subcommand("发送税收红包", "【管理员】强制发放税收红包")
      .action(async ({ session }) => {
        const respond = setupMessageRecall(session, ctx, config, "general");
        if (!isAdmin(ctx, config, session.userId, session)) {
          return await respond("❌ 只有管理员可以使用此指令");
        }
        try {
          await ctx.taxService.distributePools(true);
          return await respond("✅ 已触发税收红包发放流程，请留意群内通知。");
        } catch (error) {
          return await respond(`❌ 发放失败：${error.message}`);
        }
      });

    slaveCommand.subcommand("抢红包 <packetId:string>", "领取指定ID的红包")
      .action(async ({ session }, packetId) => {
        const respond = setupMessageRecall(session, ctx, config, "general");
        const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
        if (taxCheck) return await respond(taxCheck);
        return await respond(await grabRedPacket(ctx, config, session, packetId));
      });
  }

  return {
    registerRedPacketCommands
  };
}

module.exports = { createRedPacketModule };
