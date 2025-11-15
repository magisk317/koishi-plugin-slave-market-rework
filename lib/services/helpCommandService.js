function createHelpCommandService(options = {}) {
  const { setupMessageRecall, renderHelp } = options;

  function registerHelpCommand(ctx, config) {
    if (!setupMessageRecall || !renderHelp) return;
    const slaveCommand = ctx.command("大牛马时代");
    slaveCommand.subcommand("玩家帮助", "查看所有可用命令").action(async ({ session }) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      return await respond(await renderHelp(ctx));
    });
  }

  return { registerHelpCommand };
}

module.exports = { createHelpCommandService };
