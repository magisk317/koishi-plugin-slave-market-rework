import { Context, Session } from 'koishi';
import { Config } from '../config/player_market';
export declare function appearanceShop(ctx: Context, config: Config, session: Session): Promise<string>;
export declare function buyAppearance(ctx: Context, config: Config, session: Session, itemName: string): Promise<string>;
export declare function equipAppearance(ctx: Context, config: Config, session: Session, itemName: string): Promise<string>;
export declare function checkAppearance(ctx: Context, config: Config, session: Session): Promise<string>;
export declare function calculatePriceBonus(equipped: Record<string, string | null>): number;
export declare function checkAppearanceInventory(ctx: Context, config: Config, session: Session): Promise<string>;
export declare function unequipAppearance(ctx: Context, config: Config, session: Session, itemName: string): Promise<string>;
