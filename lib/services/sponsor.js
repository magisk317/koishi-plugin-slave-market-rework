const path = require("path");
const fs = require("fs").promises;
const { h } = require("koishi");
const { buildFigurePayload } = require("../utils/figureHelper");

function createSponsorService(options = {}) {
  const sponsorQrPath = options.imagePath ?? path.join(__dirname, "..", "ai.png");
  let sponsorFigureCache = null;
  let sponsorFallback = null;

  async function loadSponsorFigure(session) {
    if (sponsorFigureCache) return sponsorFigureCache;
    try {
      const buffer = await fs.readFile(sponsorQrPath);
      sponsorFigureCache = h("figure", {}, [
        h("message", { userId: session?.userId || session?.selfId || "" }, "🎁 赞助权益：\n- 自动功能全面解锁\n- 专属装扮与称号\n- 提前体验新玩法\n- 专属客服支持"),
        h("image", { url: `base64://${buffer.toString("base64")}` })
      ]);
    } catch (error) {
      sponsorFallback = "📁 赞赏码暂不可用，请联系管理员获取二维码";
      console.error("Sponsor QR load failed:", { path: sponsorQrPath, error });
    }
    return sponsorFigureCache;
  }

  async function withSponsorQr(session, message) {
    const figure = await loadSponsorFigure(session);
    if (figure) {
      return figure;
    }
    const payload = buildFigurePayload(session, [
      message,
      sponsorFallback || "📁 赞赏码暂不可用，请联系管理员获取二维码"
    ]);
    return payload.figure ?? payload.text;
  }

  return { withSponsorQr };
}

module.exports = { createSponsorService };
