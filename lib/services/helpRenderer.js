const path = require("path");
const fs = require("fs").promises;

function htmlToText(html = "") {
  if (!html) return "";
  let text = html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<!--([\s\S]*?)-->/g, "");

  text = text
    .replace(/<br\s*\/?/gi, "\n")
    .replace(/<\/(div|p|h1|h2|h3|h4|h5|li|section|article|ul|ol)>/gi, "\n")
    .replace(/<li>/gi, "- ")
    .replace(/<\/?(strong|em|code)[^>]*>/gi, "");

  text = text.replace(/<[^>]+>/g, "");

  text = text
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

function createHelpRenderer(options = {}) {
  const templatePath = options.templatePath ?? path.join(__dirname, "..", "help_page.html");

  return async function renderHelp(ctx) {
    try {
      const data = await fs.readFile(templatePath, "utf-8");
      const text = htmlToText(data);
      return text || "⚠️ 帮助内容为空，请稍后再试。";
    } catch (error) {
      ctx.logger?.warn?.("[slave-market] render help failed", error);
      return "⚠️ 帮助页面暂不可用，请稍后再试。";
    }
  };
}

module.exports = { createHelpRenderer };
