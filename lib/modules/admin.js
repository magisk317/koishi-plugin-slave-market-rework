const fs = require("fs");
const path = require("path");

function createAdminModule(deps) {
  const { setupMessageRecall, isAdmin, createScopeFilter, resetGame, setPluginDisabled, isPluginDisabled } = deps;

  function listBackups() {
    const backupDir = path.join(process.cwd(), "backups");
    if (!fs.existsSync(backupDir)) return [];
    return fs
      .readdirSync(backupDir)
      .filter((file) => file.startsWith("backup_") && file.endsWith(".json"))
      .map((file) => ({
        name: file,
        time: fs.statSync(path.join(backupDir, file)).mtime.toLocaleString(),
      }))
      .sort((a, b) => b.time.localeCompare(a.time));
  }

  async function persistDisabledState(ctx, config, disabled) {
    const [system] = await ctx.database.get("slave_market_system", {});
    if (!system) {
      await ctx.database.create("slave_market_system", {
        balance: config.初始余额,
        isFinancialCrisis: false,
        isDisabled: disabled,
      });
    } else {
      await ctx.database.set("slave_market_system", { id: system.id }, { isDisabled: disabled });
    }
    if (typeof setPluginDisabled === "function") {
      setPluginDisabled(disabled);
    }
  }

  function registerAdminCommands(ctx, config) {
    const slaveCommand = ctx.command("大牛马时代");

    slaveCommand.subcommand("重置游戏", "重置整个游戏（仅管理员可用）").action(async ({ session }) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      if (!isAdmin(ctx, config, session.userId, session)) {
        return await respond("只有管理员可以重置游戏");
      }
      await resetGame(ctx, config);
      if (typeof setPluginDisabled === "function") {
        setPluginDisabled(false);
      }
      return await respond("游戏已重置");
    });

    slaveCommand.subcommand("备份列表", "查看可用的备份文件").action(async ({ session }) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      if (!isAdmin(ctx, config, session.userId, session)) {
        return await respond("只有管理员可以查看备份列表");
      }
      const files = listBackups();
      if (!files.length) return await respond("暂无备份文件");
      return await respond(
        `=== 备份列表 ===\n${files
          .map((file) => `${file.name}\n创建时间：${file.time}`)
          .join("\n\n")}`,
      );
    });

    slaveCommand.subcommand("恢复备份 <backupFile:string>", "从指定备份文件恢复数据").action(async ({ session }, backupFile) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      if (!isAdmin(ctx, config, session.userId, session)) {
        return await respond("只有管理员可以恢复备份");
      }
      const success = await ctx.backupService.restoreFromBackup(backupFile);
      return await respond(success ? "✅ 备份恢复成功" : "❌ 备份恢复失败");
    });

    slaveCommand.subcommand("立即备份", "立即创建一次备份").action(async ({ session }) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      if (!isAdmin(ctx, config, session.userId, session)) {
        return await respond("只有管理员可以创建备份");
      }
      await ctx.backupService.createBackup();
      return await respond("✅ 备份创建成功");
    });

    slaveCommand.subcommand("添加管理员 <nickname:string>", "添加管理员（仅管理员可用）").action(async ({ session }, nickname) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      if (!isAdmin(ctx, config, session.userId, session)) {
        return await respond("只有管理员可以添加管理员");
      }
      const users = await ctx.database.get("player_market_users", createScopeFilter(session));
      const targetUser = users.find((user) => user.nickname === nickname);
      if (!targetUser) {
        return await respond("❌ 找不到该玩家，请确保昵称正确");
      }
      if (config.管理员列表.includes(targetUser.userId)) {
        return await respond("该用户已经是管理员");
      }
      config.管理员列表.push(targetUser.userId);
      return await respond(`✅ 已添加管理员：${targetUser.nickname}(${targetUser.userId})`);
    });

    slaveCommand.subcommand("移除管理员 <nickname:string>", "移除管理员（仅管理员可用）").action(async ({ session }, nickname) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      if (!isAdmin(ctx, config, session.userId, session)) {
        return await respond("只有管理员可以移除管理员");
      }
      const users = await ctx.database.get("player_market_users", createScopeFilter(session));
      const targetUser = users.find((user) => user.nickname === nickname);
      if (!targetUser) {
        return await respond("❌ 找不到该玩家，请确保昵称正确");
      }
      const index = config.管理员列表.indexOf(targetUser.userId);
      if (index === -1) {
        return await respond("该用户不是管理员");
      }
      config.管理员列表.splice(index, 1);
      return await respond(`✅ 已移除管理员：${targetUser.nickname}(${targetUser.userId})`);
    });

    slaveCommand.subcommand("管理员列表", "查看所有管理员（仅管理员可用）").action(async ({ session }) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      if (!isAdmin(ctx, config, session.userId, session)) {
        return await respond("只有管理员可以查看管理员列表");
      }
      const adminUsers = await ctx.database.get("player_market_users", createScopeFilter(session, {
        userId: { $in: config.管理员列表 },
      }));
      if (!adminUsers.length) return await respond("暂无管理员");
      const adminList = adminUsers.map((user) => `${user.nickname}(${user.userId})`).join("\n");
      return await respond(`=== 管理员列表 ===\n${adminList}`);
    });

    slaveCommand.subcommand("禁用牛马", "禁用所有牛马功能（仅管理员）").action(async ({ session }) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      if (!isAdmin(ctx, config, session.userId, session)) {
        return await respond("只有管理员可以执行此操作");
      }
      if (isPluginDisabled?.()) {
        return await respond("⚠️ 牛马系统已处于禁用状态");
      }
      try {
        await persistDisabledState(ctx, config, true);
        return await respond("✅ 已禁用牛马系统，所有相关指令将暂停响应");
      } catch (error) {
        ctx.logger?.warn?.("[slave-market] disable command failed", error);
        return await respond("❌ 禁用失败，请稍后再试");
      }
    });

    slaveCommand.subcommand("启用牛马", "启用所有牛马功能（仅管理员）").action(async ({ session }) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      if (!isAdmin(ctx, config, session.userId, session)) {
        return await respond("只有管理员可以执行此操作");
      }
      if (!isPluginDisabled?.()) {
        return await respond("✅ 牛马系统已处于启用状态");
      }
      try {
        await persistDisabledState(ctx, config, false);
        return await respond("✅ 已恢复牛马系统，现在可以正常使用所有指令");
      } catch (error) {
        ctx.logger?.warn?.("[slave-market] enable command failed", error);
        return await respond("❌ 启用失败，请稍后再试");
      }
    });
  }

  return { registerAdminCommands };
}

module.exports = { createAdminModule };
