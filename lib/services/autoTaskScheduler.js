function createAutoTaskScheduler(options) {
  const { ctx, getConfig, executeAutoTasks } = options || {};
  if (!ctx) throw new Error("ctx is required for auto task scheduler");
  if (typeof getConfig !== "function") throw new Error("getConfig is required for auto task scheduler");
  if (typeof executeAutoTasks !== "function") throw new Error("executeAutoTasks is required for auto task scheduler");

  async function run(label = "interval") {
    const config = getConfig();
    if (!config) return;
    try {
      await executeAutoTasks(ctx, config);
    } catch (error) {
      ctx.logger?.warn?.(`[slave-market][auto-task] ${label} failed: ${error.message}`);
    }
  }

  function start() {
    ctx.on("ready", () => run("ready"));
    const interval = Math.max(1e3, getConfig()?.打工冷却 ?? 60 * 1e3);
    ctx.setInterval(() => run("interval"), interval);
  }

  return { start, run };
}

module.exports = { createAutoTaskScheduler };
