const { h } = require("koishi");
function chunkForwardMessages(text, maxLines = 8) {
  if (!text) return [];
  const paragraphs = text
    .split(/\n{2,}/)
    .map((block) => block.split("\n").map((line) => line.trim()).filter(Boolean))
    .filter((block) => block.length);
  const messages = [];
  for (const block of paragraphs) {
    for (let i = 0; i < block.length; i += maxLines) {
      const chunk = block.slice(i, i + maxLines).join("\n");
      if (chunk) messages.push(chunk);
    }
  }
  return messages;
}
function createHelpCommandService(options = {}) {
  const { setupMessageRecall, renderHelp } = options;

  function registerHelpCommand(ctx, config) {
    if (!setupMessageRecall || !renderHelp) return;
    const slaveCommand = ctx.command("大牛马时代");
    slaveCommand.subcommand("玩家帮助", "查看所有可用命令").action(async ({ session }) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      const raw = await renderHelp(ctx, session);
      const segments = typeof raw === "string" ? chunkForwardMessages(raw) : [];
      const payload = segments.length ? h("message", { forward: true }, ...segments) : raw;
      return await respond(payload);
    });
  }

  return { registerHelpCommand };
}

module.exports = { createHelpCommandService };
