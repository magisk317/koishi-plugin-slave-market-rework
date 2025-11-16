function createMessageRecallHelpers(logDebug) {
  let responseHook = null;

  function setResponseHook(fn) {
    responseHook = typeof fn === "function" ? fn : null;
  }
  function shouldEnableRecall(config, actionKey) {
    if (!config?.enabled) return false;
    if (!actionKey) return true;
    if (config[actionKey] === false) return false;
    return true;
  }

  function scheduleMessageRecall(ctx, session, config, actionKey, sendResult) {
    if (!sendResult) {
      logDebug?.(ctx, "scheduleMessageRecall skipped (no result)", {
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
      logDebug?.(ctx, "scheduleMessageRecall queue", { actionKey, messageId: id, delay });
      setTimeout(() => {
        session.bot
          ?.deleteMessage(session.channelId, id)
          .then(() => logDebug?.(ctx, "messageRecall delete success", { actionKey, messageId: id }))
          .catch((error) =>
            ctx.logger.warn(`撤回 slave-market 消息失败: ${error.message}`, { actionKey, messageId: id }),
          );
      }, delay);
    }
  }

  async function invokeSendWithRecall(session, ctx, recallConfig, actionKey, sendFn, args) {
    if (!shouldEnableRecall(recallConfig, actionKey)) return sendFn(...args);
    const result = await sendFn(...args);
    logDebug?.(ctx, "messageRecall send result", {
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
    const disabledResponder = async (content) => {
      if (content == null) return null;
      if (responseHook) {
        await responseHook({
          session,
          ctx,
          config,
          actionKey,
          content,
          sendExtra: (message) => session?.send?.(message ?? ""),
        });
      }
      return content;
    };
    if (!session?.send) return disabledResponder;
    if (!shouldEnableRecall(recallConfig, actionKey)) {
      logDebug?.(ctx, "setupMessageRecall skipped", { actionKey });
      return disabledResponder;
    }
    logDebug?.(ctx, "setupMessageRecall applied", { actionKey });
    return async (content) => {
      if (content == null) return null;
      await sendWithRecall(session, ctx, config, actionKey, content);
      if (responseHook) {
        await responseHook({
          session,
          ctx,
          config,
          actionKey,
          content,
          sendExtra: (message, overrideKey) =>
            sendWithRecall(session, ctx, config, overrideKey ?? actionKey, message),
        });
      }
      return null;
    };
  }

  return {
    setupMessageRecall,
    sendWithRecall,
    createRecallSender,
    setResponseHook,
  };
}

module.exports = { createMessageRecallHelpers };
