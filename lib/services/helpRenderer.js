const path = require("path");
const fs = require("fs").promises;
const { h } = require("koishi");

function createHelpRenderer(options = {}) {
  const templatePath = options.templatePath ?? path.join(__dirname, "..", "help_page.html");

  return async function renderHelp(ctx) {
    try {
      const data = await fs.readFile(templatePath, "utf-8");
      const page = await ctx.puppeteer.page();
      await page.setContent(data, { waitUntil: "networkidle0" });
      await page.waitForSelector(".help-container", { visible: true });
      const container = await page.$(".help-container");
      if (!container) {
        ctx.logger?.warn?.("[slave-market] 未找到帮助页面容器");
        return "未找到目标 <div>";
      }
      const screenshot = await container.screenshot();
      await page.close();
      return h.image(screenshot, "image/png");
    } catch (error) {
      console.error("Puppeteer error:", error);
      return "Puppeteer error: " + error.message;
    }
  };
}

module.exports = { createHelpRenderer };
