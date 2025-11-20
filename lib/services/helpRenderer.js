const path = require("path");
const fs = require("fs").promises;
const { buildFigurePayload } = require("../utils/figureHelper");

function stripHtml(html = "") {
  const text = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li>/gi, "• ")
    .replace(/<\/?strong>/gi, "")
    .replace(/<\/?em>/gi, "")
    .replace(/<\/?code[^>]*>/gi, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/<[^>]+>/g, "");
  return text.replace(/[ \t]+\n/g, "\n");
}

function createHelpRenderer(options = {}) {
  const templatePath = options.templatePath ?? path.join(__dirname, "..", "help_page.html");

  function extractSections(html) {
    const sections = [];
    const cleaned = html
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "");
    const bodyMatch = cleaned.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const body = bodyMatch ? bodyMatch[1] : cleaned;
    const containerMatch = body.match(/<div class="help-container">([\s\S]*?)<\/div>/i);
    const container = containerMatch ? containerMatch[1] : body;
    const h1Match = container.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    const taglineMatch = container.match(/<p class="tagline">([\s\S]*?)<\/p>/i);
    if (h1Match) {
      const header = stripHtml(h1Match[1]).trim();
      const tagline = taglineMatch ? stripHtml(taglineMatch[1]).trim() : "";
      sections.push(`${header}${tagline ? `\n${tagline}` : ""}`);
    }
    const sectionRegex = /<div class="section">([\s\S]*?)<\/div>/gi;
    let match;
    while ((match = sectionRegex.exec(container))) {
      const block = match[1];
      const titleMatch = block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
      const title = titleMatch ? stripHtml(titleMatch[1]).trim() : "说明";
      let content = block.replace(/<h2[^>]*>[\s\S]*?<\/h2>/i, "");
      content = stripHtml(content).replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
      if (content) {
        sections.push(`【${title}】\n${content}`);
      }
    }
    return sections.filter(Boolean);
  }

  return async function renderHelp(ctx, session) {
    try {
      const data = await fs.readFile(templatePath, "utf-8");
      const sections = extractSections(data);
      const payload = buildFigurePayload(session, sections);
      return payload.figure ?? payload.text;
    } catch (error) {
      ctx.logger?.warn?.("[slave-market] render help failed", error);
      return "⚠️ 帮助页面暂不可用，请稍后再试。";
    }
  };
}

module.exports = { createHelpRenderer };
