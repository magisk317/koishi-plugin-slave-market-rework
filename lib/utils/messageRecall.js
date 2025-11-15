function createMessageRecallHelpers(logDebug) {
  function shouldEnableRecall(config, actionKey) {
    if (!config?.enabled) return false;
    if (!actionKey) return true;
    if (config[actionKey] === false) return false;
    return true;
  }

  function scheduleMessageRecall(ctx, session, config, actionKey, sendResult) {
    if (!sendResult) {
      ctx.logger.info("[slave-market][recall] no send result to schedule", {
        actionKey,
        sessionId: session.messageId,
      });
      return;
    }
    const delaySeconds = Number(config?.delay ?? 60);
    const delay = Number.isFinite(delaySeconds) ? Math.max(0, delaySeconds) * 1000 : 60_000;
    const ids = Array.isArray(sendResult) ? sendResult : [sendResult];
    logDebug?.(ctx, "scheduleMessageRecall", { actionKey, delay, messageIds: ids });
    for (const id of ids) {
      if (!id) continue;
      ctx.logger.info("[slave-market][recall] schedule delete", { actionKey, messageId: id, delay });
      setTimeout(() => {
        session.bot
          ?.deleteMessage(session.channelId, id)
          .then(() => ctx.logger.info("[slave-market][recall] delete success", { actionKey, messageId: id }))
          .catch((error) =>
            ctx.logger.warn(`撤回 slave-market 消息失败: ${error.message}`, { actionKey, messageId: id }),
          );
      }, delay);
    }
  }

  async function invokeSendWithRecall(session, ctx, recallConfig, actionKey, sendFn, args) {
    if (!shouldEnableRecall(recallConfig, actionKey)) return sendFn(...args);
    const result = await sendFn(...args);
    ctx.logger.info("[slave-market][recall] send result", {
      actionKey,
      hasResult: Boolean(result),
    });
    logDebug?.(ctx, "invokeSendWithRecall", { actionKey, hasResult: Boolean(result) });
    scheduleMessageRecall(ctx, session, recallConfig, actionKey, result);
    return result;
  }

  function createRecallSender(session, ctx, config, actionKey, baseSend) {
    const recallConfig = config.messageRecall;
    const sender = baseSend ?? session.send.bind(session);
    if (!shouldEnableRecall(recallConfig, actionKey)) {
      return (...args) => sender(...args);
    }
    return (...args) => invokeSendWithRecall(session, ctx, recallConfig, actionKey, sender, args);
  }

  function sendWithRecall(session, ctx, config, actionKey, ...args) {
    return createRecallSender(session, ctx, config, actionKey)(...args);
  }

  function setupMessageRecall(session, ctx, config, actionKey) {
    const recallConfig = config.messageRecall;
    const disabledResponder = async (content) => content;
    if (!session?.send) return disabledResponder;
    if (!shouldEnableRecall(recallConfig, actionKey)) {
      ctx.logger.info("[slave-market][recall] setup skipped", { actionKey, enabled: false });
      logDebug?.(ctx, "setupMessageRecall skipped", { actionKey });
      return disabledResponder;
    }
    ctx.logger.info("[slave-market][recall] setup applied", { actionKey, enabled: true });
    logDebug?.(ctx, "setupMessageRecall applied", { actionKey });
    return async (content) => {
      if (content == null) return null;
      await sendWithRecall(session, ctx, config, actionKey, content);
      return null;
    };
  }

  return {
    setupMessageRecall,
    sendWithRecall,
    createRecallSender,
  };
}

module.exports = { createMessageRecallHelpers };
