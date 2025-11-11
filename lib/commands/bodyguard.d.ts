import { Context, Session } from 'koishi';
import { Config } from '../config/player_market';
import { BodyguardMarket } from '../models/player_market';
export declare const bodyguardData: BodyguardMarket;
export declare function bodyguardMarket(ctx: Context, config: Config, session: Session): Promise<string>;
export declare function hireBodyguard(ctx: Context, config: Config, session: Session, guardName: string): Promise<string>;
export declare function bodyguardStatus(ctx: Context, config: Config, session: Session): Promise<string>;
