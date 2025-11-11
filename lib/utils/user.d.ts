import { Context, Session } from 'koishi';
import { UserData } from '../models/player_market';
export declare function getUser(ctx: Context, userId: string, session?: Session): Promise<UserData | string>;
