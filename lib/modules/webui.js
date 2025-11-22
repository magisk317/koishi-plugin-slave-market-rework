const path = require('path');
const fs = require('fs');

function serializeBigInt(data) {
    if (typeof data === 'bigint') {
        return data.toString();
    }
    if (Array.isArray(data)) {
        return data.map(serializeBigInt);
    }
    if (typeof data === 'object' && data !== null) {
        return Object.fromEntries(
            Object.entries(data).map(([key, value]) => [key, serializeBigInt(value)])
        );
    }
    return data;
}

function createWebUI(ctx) {
    const logger = ctx.logger('slave-market-webui');

    // Check if server service is available
    if (!ctx.server) {
        logger.warn('Server service not available, WebUI will not be initialized');
        return;
    }

    // Serve static index.html
    ctx.server.get('/slave-market', (koaCtx) => {
        koaCtx.type = 'html';
        koaCtx.body = fs.createReadStream(path.resolve(__dirname, '../webui/index.html'));
    });

    // API: Stats
    ctx.server.get('/slave-market/api/stats', async (koaCtx) => {
        try {
            const totalUsers = await ctx.database.eval('player_market_users', { $count: 'userId' });
            const vipUsers = await ctx.database.eval('player_market_users', { $count: 'userId' }, { vipEndTime: { $gt: Date.now() } });
            const jailedUsers = await ctx.database.eval('player_market_users', { $count: 'userId' }, { prisonEndTime: { $gt: Date.now() } });

            // Calculate total money
            const totalMoney = await ctx.database.eval('player_market_users', { $sum: 'balance' }) || 0;

            koaCtx.body = serializeBigInt({
                success: true,
                data: {
                    totalUsers,
                    vipUsers,
                    jailedUsers,
                    totalMoney
                }
            });
        } catch (err) {
            logger.error('Failed to get stats:', err);
            koaCtx.status = 500;
            koaCtx.body = { success: false, message: err.message };
        }
    });

    // API: Users List
    ctx.server.get('/slave-market/api/users', async (koaCtx) => {
        try {
            const { page = 1, pageSize = 20, search = '' } = koaCtx.query;
            const limit = Math.min(100, Math.max(1, Number(pageSize)));
            const offset = (Number(page) - 1) * limit;

            const query = {};
            if (search) {
                query.$or = [
                    { nickname: { $regex: search } },
                    { userId: { $regex: search } }
                ];
            }

            const [data, total] = await Promise.all([
                ctx.database.get('player_market_users', query, { limit, offset, sort: { lastActiveTime: 'desc' } }),
                ctx.database.eval('player_market_users', { $count: 'userId' }, query)
            ]);

            koaCtx.body = serializeBigInt({
                success: true,
                data,
                total,
                page: Number(page),
                pageSize: limit
            });
        } catch (err) {
            logger.error('Failed to get users:', err);
            koaCtx.status = 500;
            koaCtx.body = { success: false, message: err.message };
        }
    });

    // API: Update VIP
    ctx.server.post('/slave-market/api/users/:userId/vip', async (koaCtx) => {
        try {
            const { userId } = koaCtx.params;
            const { duration } = koaCtx.request.body; // duration in milliseconds. 0 to revoke.

            if (typeof duration !== 'number') {
                koaCtx.status = 400;
                koaCtx.body = { success: false, message: 'Invalid duration' };
                return;
            }

            const now = Date.now();
            const vipEndTime = duration > 0 ? now + duration : 0;
            const autoTasks = duration > 0 ? { work: true, harvest: true, deposit: true } : { work: false, harvest: false, deposit: false };

            await ctx.database.set('player_market_users', { userId }, {
                vipEndTime,
                autoTasks
            });

            koaCtx.body = { success: true, message: 'VIP status updated' };
        } catch (err) {
            logger.error('Failed to update VIP:', err);
            koaCtx.status = 500;
            koaCtx.body = { success: false, message: err.message };
        }
    });

    // API: Update Jail
    ctx.server.post('/slave-market/api/users/:userId/jail', async (koaCtx) => {
        try {
            const { userId } = koaCtx.params;
            const { jailed } = koaCtx.request.body;

            if (typeof jailed !== 'boolean') {
                koaCtx.status = 400;
                koaCtx.body = { success: false, message: 'Invalid jailed status' };
                return;
            }

            const update = {};
            if (jailed) {
                update.prisonEndTime = Date.now() + 365 * 24 * 60 * 60 * 1000; // 1 year
                update.isInPrison = true;
            } else {
                update.prisonEndTime = 0;
                update.isInPrison = false;
            }

            await ctx.database.set('player_market_users', { userId }, update);

            koaCtx.body = { success: true, message: 'Jail status updated' };
        } catch (err) {
            logger.error('Failed to update Jail:', err);
            koaCtx.status = 500;
            koaCtx.body = { success: false, message: err.message };
        }
    });

    // API: Update Money
    ctx.server.post('/slave-market/api/users/:userId/money', async (koaCtx) => {
        try {
            const { userId } = koaCtx.params;
            const { amount } = koaCtx.request.body;

            if (typeof amount !== 'number') {
                koaCtx.status = 400;
                koaCtx.body = { success: false, message: 'Invalid amount' };
                return;
            }

            const { mode } = koaCtx.request.body;

            if (mode === 'add') {
                const user = (await ctx.database.get('player_market_users', { userId }))[0];
                if (!user) throw new Error('User not found');
                await ctx.database.set('player_market_users', { userId }, {
                    balance: user.balance + amount
                });
            } else {
                await ctx.database.set('player_market_users', { userId }, {
                    balance: amount
                });
            }

            koaCtx.body = { success: true, message: 'Balance updated' };
        } catch (err) {
            logger.error('Failed to update Money:', err);
            koaCtx.status = 500;
            koaCtx.body = { success: false, message: err.message };
        }
    });

    logger.info('WebUI initialized at /slave-market');
}

module.exports = { createWebUI };
