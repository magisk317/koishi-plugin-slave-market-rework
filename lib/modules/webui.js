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

function createWebUI(ctx, config, deps) {
    const logger = ctx.logger('slave-market-webui');
    const { plant, crops, harvest } = deps || {};

    // Generate Admin Token
    const adminToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    logger.info(`WebUI Admin Token: ${adminToken}`);

    // Command to get Admin Token
    ctx.command('大牛马时代.webui_admin', '获取WebUI管理员令牌', { authority: 3 })
        .action(() => {
            return `WebUI 管理员令牌: ${adminToken}\n请妥善保管，不要泄露给他人。`;
        });

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
            // Use in-memory counting for reliability (since select().count() is failing)
            const allUsers = await ctx.database.get('player_market_users', {});
            logger.info(`[Stats Debug] Total records fetched: ${allUsers.length}`);

            const totalUsers = allUsers.length;
            const vipUsers = allUsers.filter(u => u.vipEndTime > Date.now()).length;
            const jailedUsers = allUsers.filter(u => u.prisonEndTime > Date.now()).length;

            // Calculate total money in memory as well to be consistent
            const totalMoney = allUsers.reduce((sum, user) => sum + (BigInt(user.balance || 0)), BigInt(0));

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

    // Helper: Verify Admin
    function verifyAdmin(token) {
        return token === adminToken;
    }

    // API: Users List (Protected)
    ctx.server.get('/slave-market/api/users', async (koaCtx) => {
        try {
            const { page = 1, pageSize = 20, search = '', adminToken: token } = koaCtx.query;

            if (!verifyAdmin(token)) {
                koaCtx.status = 403;
                koaCtx.body = { success: false, message: 'Unauthorized: Admin token required' };
                return;
            }

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

    // API: Update VIP (Protected)
    ctx.server.post('/slave-market/api/users/:userId/vip', async (koaCtx) => {
        try {
            const { userId } = koaCtx.params;
            const { duration, adminToken: token } = koaCtx.request.body; // duration in milliseconds. 0 to revoke.

            if (!verifyAdmin(token)) {
                koaCtx.status = 403;
                koaCtx.body = { success: false, message: 'Unauthorized' };
                return;
            }

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

    // API: Update Jail (Protected)
    ctx.server.post('/slave-market/api/users/:userId/jail', async (koaCtx) => {
        try {
            const { userId } = koaCtx.params;
            const { jailed, adminToken: token } = koaCtx.request.body;

            if (!verifyAdmin(token)) {
                koaCtx.status = 403;
                koaCtx.body = { success: false, message: 'Unauthorized' };
                return;
            }

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

    // API: Update Money (Protected)
    ctx.server.post('/slave-market/api/users/:userId/money', async (koaCtx) => {
        try {
            const { userId } = koaCtx.params;
            const { amount, adminToken: token } = koaCtx.request.body;

            if (!verifyAdmin(token)) {
                koaCtx.status = 403;
                koaCtx.body = { success: false, message: 'Unauthorized' };
                return;
            }

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

    // API: Get Crops
    ctx.server.get('/slave-market/api/crops', async (koaCtx) => {
        koaCtx.body = { success: true, data: crops || [] };
    });

    // Helper: Verify Authentication (Updated for Admin & Timestamp-Code)
    const authCodes = new Map(); // userId -> { code, timestamp, expiry }

    // API: Request Login Code
    ctx.server.post('/slave-market/api/auth/code', async (koaCtx) => {
        try {
            const { userId } = koaCtx.request.body;
            if (!userId) {
                koaCtx.status = 400;
                koaCtx.body = { success: false, message: 'Missing userId' };
                return;
            }

            const user = (await ctx.database.get('player_market_users', { userId }))[0];
            if (!user) {
                koaCtx.status = 404;
                koaCtx.body = { success: false, message: 'User not found' };
                return;
            }

            // Determine target channel
            const channelId = user.lastChannelId || user.registerChannelId;
            const guildId = user.lastGuildId || user.registerGuildId;

            if (!channelId) {
                koaCtx.status = 400;
                koaCtx.body = { success: false, message: 'Unable to determine user channel. Please interact with the bot in a group first.' };
                return;
            }

            // Generate Code
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            const timestamp = Date.now();
            const expiry = timestamp + 5 * 60 * 1000; // 5 minutes

            authCodes.set(userId, { code, timestamp, expiry });

            // Send Message
            const bot = ctx.bots.find(b => b.platform === 'onebot') || ctx.bots[0]; // Prefer OneBot, fallback to first
            if (bot) {
                try {
                    await bot.sendMessage(channelId, `[WebUI 登录请求]\n时间戳: ${timestamp}\n验证码: ${code}\n(5分钟内有效)`);
                } catch (sendErr) {
                    logger.error('Failed to send auth code:', sendErr);
                    koaCtx.status = 500;
                    koaCtx.body = { success: false, message: 'Failed to send verification code to group.' };
                    return;
                }
            } else {
                koaCtx.status = 500;
                koaCtx.body = { success: false, message: 'No bot instance available.' };
                return;
            }

            koaCtx.body = { success: true, timestamp, message: 'Verification code sent to your group.' };
        } catch (err) {
            logger.error('Failed to request auth code:', err);
            koaCtx.status = 500;
            koaCtx.body = { success: false, message: err.message };
        }
    });

    function verifyAuth(user, tokenOrPassword, providedAdminToken) {
        // Admin Override
        if (providedAdminToken && providedAdminToken === adminToken) {
            return 'ADMIN';
        }

        if (!user || !tokenOrPassword) return null;

        // Check Timestamp-Code (OTP)
        const authData = authCodes.get(user.userId);
        if (authData && authData.code === tokenOrPassword && Date.now() < authData.expiry) {
            // Optional: Check if timestamp matches? The user checks it visually.
            // We just verify the code here.
            return 'OTP';
        }

        // Check Password
        if (user.webuiPassword && user.webuiPassword === tokenOrPassword) {
            return 'PASSWORD';
        }

        return null;
    }

    // API: Plant Crop
    ctx.server.post('/slave-market/api/users/:userId/plant', async (koaCtx) => {
        try {
            const { userId } = koaCtx.params;
            const { cropName, token, adminToken: providedAdminToken } = koaCtx.request.body;

            if (!plant) throw new Error('Plant function not available');

            // Verify Auth
            const user = (await ctx.database.get('player_market_users', { userId }))[0];
            if (!user) throw new Error('User not found');

            const authType = verifyAuth(user, token, providedAdminToken);
            if (!authType) {
                koaCtx.status = 403;
                koaCtx.body = { success: false, message: 'Invalid or expired credentials' };
                return;
            }

            const mockSession = {
                userId,
                platform: 'webui',
                selfId: 'webui',
                guildId: 'webui',
                channelId: 'webui'
            };

            const result = await plant(ctx, config, mockSession, cropName);

            koaCtx.body = { success: true, message: typeof result === 'string' ? result : 'Operation completed' };
        } catch (err) {
            logger.error('Failed to plant crop:', err);
            koaCtx.status = 500;
            koaCtx.body = { success: false, message: err.message };
        }
    });

    // API: Harvest Crop
    ctx.server.post('/slave-market/api/users/:userId/harvest', async (koaCtx) => {
        try {
            const { userId } = koaCtx.params;
            const { token, adminToken: providedAdminToken } = koaCtx.request.body;

            if (!harvest) throw new Error('Harvest function not available');

            // Verify Auth
            const user = (await ctx.database.get('player_market_users', { userId }))[0];
            if (!user) throw new Error('User not found');

            const authType = verifyAuth(user, token, providedAdminToken);
            if (!authType) {
                koaCtx.status = 403;
                koaCtx.body = { success: false, message: 'Invalid or expired credentials' };
                return;
            }

            const mockSession = {
                userId,
                platform: 'webui',
                selfId: 'webui',
                guildId: 'webui',
                channelId: 'webui'
            };

            const result = await harvest(ctx, config, mockSession);

            koaCtx.body = { success: true, message: typeof result === 'string' ? result : 'Operation completed' };
        } catch (err) {
            logger.error('Failed to harvest crop:', err);
            koaCtx.status = 500;
            koaCtx.body = { success: false, message: err.message };
        }
    });

    // API: Get Single User Profile (Protected)
    ctx.server.get('/slave-market/api/profile', async (koaCtx) => {
        try {
            const { userId, token } = koaCtx.query;

            if (!userId || !token) {
                koaCtx.status = 400;
                koaCtx.body = { success: false, message: 'Missing userId or token' };
                return;
            }

            const user = (await ctx.database.get('player_market_users', { userId }))[0];

            if (!user) {
                koaCtx.status = 404;
                koaCtx.body = { success: false, message: 'User not found' };
                return;
            }

            const authType = verifyAuth(user, token);
            if (!authType) {
                koaCtx.status = 403;
                koaCtx.body = { success: false, message: 'Invalid or expired credentials' };
                return;
            }

            // Don't expose sensitive data
            const { webuiToken, webuiPassword, ...safeUser } = user;

            koaCtx.body = serializeBigInt({
                success: true,
                data: safeUser,
                authType // Return auth type to frontend to trigger password change if needed
            });
        } catch (err) {
            logger.error('Failed to get profile:', err);
            koaCtx.status = 500;
            koaCtx.body = { success: false, message: err.message };
        }
    });

    // API: Set/Change Password
    ctx.server.post('/slave-market/api/users/:userId/password', async (koaCtx) => {
        try {
            const { userId } = koaCtx.params;
            const { token, newPassword } = koaCtx.request.body;

            if (!newPassword || newPassword.length < 6) {
                koaCtx.status = 400;
                koaCtx.body = { success: false, message: 'Password must be at least 6 characters' };
                return;
            }

            const user = (await ctx.database.get('player_market_users', { userId }))[0];
            if (!user) throw new Error('User not found');

            const authType = verifyAuth(user, token);
            if (!authType) {
                koaCtx.status = 403;
                koaCtx.body = { success: false, message: 'Invalid or expired credentials' };
                return;
            }

            // Update password and clear OTP
            await ctx.database.set('player_market_users', { userId }, {
                webuiPassword: newPassword,
                webuiToken: '', // Invalidate OTP
                webuiTokenTime: 0
            });

            koaCtx.body = { success: true, message: 'Password set successfully' };
        } catch (err) {
            logger.error('Failed to set password:', err);
            koaCtx.status = 500;
            koaCtx.body = { success: false, message: err.message };
        }
    });

    logger.info('WebUI initialized at /slave-market');
}

module.exports = { createWebUI };
