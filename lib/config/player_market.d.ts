import { Schema } from 'koishi';
import { WeatherConfig } from './weather';
export interface Config {
    初始余额: number;
    初始身价: number;
    初始存款上限: number;
    初始信用等级: number;
    自动注册: boolean;
    赎身倍率: number;
    中介费: number;
    赎身提升: number;
    打工基础收入: number;
    牛马主加成: number;
    购买冷却: number;
    打工冷却: number;
    抢劫冷却: number;
    转账冷却: number;
    种地冷却: number;
    抢劫成功率: number;
    抢劫策略: {
        名称: string;
        描述: string;
        成功率: number;
        抢夺比例: number;
        惩罚比例: number;
    }[];
    决斗成功率: number;
    存款利率: number;
    利息最大时间: number;
    信用升级费用: number;
    转账手续费: number;
    决斗提升: number;
    决斗降低: number;
    保镖价格: number[];
    保镖保护时间: number;
    保镖保护概率: number;
    weather: WeatherConfig;
    messageRecall: {
        enabled: boolean;
        delay: number;
    };
    福利等级: {
        基础工资: number[];
        培训费用: number[];
        培训提升: number[];
        福利间隔: number;
        培训间隔: number;
        虐待惩罚: number;
        虐待间隔: number;
    };
    监狱系统: {
        监狱打工收入: number;
        监狱打工间隔: number;
        监狱打工次数上限: number;
        工作收入倍率: number;
    };
    管理员列表: string[];
    牛马福利: {
        基础福利比例: number;
        等级加成: number;
        培训费用比例: number;
        培训冷却: number;
    };
    注册激励: {
        启用: boolean;
        开始时间: string;
        结束时间: string;
        奖励金额: number;
    };
}
export declare const Config: Schema<Schemastery.ObjectS<{
    初始余额: Schema<number, number>;
    初始身价: Schema<number, number>;
    初始存款上限: Schema<number, number>;
    初始信用等级: Schema<number, number>;
    自动注册: Schema<boolean, boolean>;
    赎身倍率: Schema<number, number>;
    中介费: Schema<number, number>;
    赎身提升: Schema<number, number>;
    打工基础收入: Schema<number, number>;
    牛马主加成: Schema<number, number>;
    购买冷却: Schema<number, number>;
    打工冷却: Schema<number, number>;
    抢劫冷却: Schema<number, number>;
    转账冷却: Schema<number, number>;
    种地冷却: Schema<number, number>;
    抢劫成功率: Schema<number, number>;
    抢劫策略: Schema<{
        名称: string;
        描述: string;
        成功率: number;
        抢夺比例: number;
        惩罚比例: number;
    }[], {
        名称: string;
        描述: string;
        成功率: number;
        抢夺比例: number;
        惩罚比例: number;
    }[]>;
    决斗成功率: Schema<number, number>;
    存款利率: Schema<number, number>;
    利息最大时间: Schema<number, number>;
    信用升级费用: Schema<number, number>;
    转账手续费: Schema<number, number>;
    决斗提升: Schema<number, number>;
    决斗降低: Schema<number, number>;
    保镖价格: Schema<number[], number[]>;
    保镖保护时间: Schema<number, number>;
    保镖保护概率: Schema<number, number>;
    weather: Schema<Schemastery.ObjectS<{
        季节持续天数: Schema<number, number>;
        天气更新间隔: Schema<number, number>;
        开始时间: Schema<number, number>;
    }>, Schemastery.ObjectT<{
        季节持续天数: Schema<number, number>;
        天气更新间隔: Schema<number, number>;
        开始时间: Schema<number, number>;
    }>>;
    messageRecall: Schema<Schemastery.ObjectS<{
        enabled: Schema<boolean, boolean>;
        delay: Schema<number, number>;
    }>, Schemastery.ObjectT<{
        enabled: Schema<boolean, boolean>;
        delay: Schema<number, number>;
    }>>;
    福利等级: Schema<Schemastery.ObjectS<{
        基础工资: Schema<number[], number[]>;
        培训费用: Schema<number[], number[]>;
        培训提升: Schema<number[], number[]>;
        福利间隔: Schema<number, number>;
        培训间隔: Schema<number, number>;
        虐待惩罚: Schema<number, number>;
        虐待间隔: Schema<number, number>;
    }>, Schemastery.ObjectT<{
        基础工资: Schema<number[], number[]>;
        培训费用: Schema<number[], number[]>;
        培训提升: Schema<number[], number[]>;
        福利间隔: Schema<number, number>;
        培训间隔: Schema<number, number>;
        虐待惩罚: Schema<number, number>;
        虐待间隔: Schema<number, number>;
    }>>;
    监狱系统: Schema<Schemastery.ObjectS<{
        监狱打工收入: Schema<number, number>;
        监狱打工间隔: Schema<number, number>;
        监狱打工次数上限: Schema<number, number>;
        工作收入倍率: Schema<number, number>;
    }>, Schemastery.ObjectT<{
        监狱打工收入: Schema<number, number>;
        监狱打工间隔: Schema<number, number>;
        监狱打工次数上限: Schema<number, number>;
        工作收入倍率: Schema<number, number>;
    }>>;
    管理员列表: Schema<string[], string[]>;
    牛马福利: Schema<Schemastery.ObjectS<{
        基础福利比例: Schema<number, number>;
        等级加成: Schema<number, number>;
        培训费用比例: Schema<number, number>;
        培训冷却: Schema<number, number>;
    }>, Schemastery.ObjectT<{
        基础福利比例: Schema<number, number>;
        等级加成: Schema<number, number>;
        培训费用比例: Schema<number, number>;
        培训冷却: Schema<number, number>;
    }>>;
    注册激励: Schema<Schemastery.ObjectS<{
        启用: Schema<boolean, boolean>;
        开始时间: Schema<string, string>;
        结束时间: Schema<string, string>;
        奖励金额: Schema<number, number>;
    }>, Schemastery.ObjectT<{
        启用: Schema<boolean, boolean>;
        开始时间: Schema<string, string>;
        结束时间: Schema<string, string>;
        奖励金额: Schema<number, number>;
    }>>;
}>, Schemastery.ObjectT<{
    初始余额: Schema<number, number>;
    初始身价: Schema<number, number>;
    初始存款上限: Schema<number, number>;
    初始信用等级: Schema<number, number>;
    自动注册: Schema<boolean, boolean>;
    赎身倍率: Schema<number, number>;
    中介费: Schema<number, number>;
    赎身提升: Schema<number, number>;
    打工基础收入: Schema<number, number>;
    牛马主加成: Schema<number, number>;
    购买冷却: Schema<number, number>;
    打工冷却: Schema<number, number>;
    抢劫冷却: Schema<number, number>;
    转账冷却: Schema<number, number>;
    种地冷却: Schema<number, number>;
    抢劫成功率: Schema<number, number>;
    抢劫策略: Schema<{
        名称: string;
        描述: string;
        成功率: number;
        抢夺比例: number;
        惩罚比例: number;
    }[], {
        名称: string;
        描述: string;
        成功率: number;
        抢夺比例: number;
        惩罚比例: number;
    }[]>;
    决斗成功率: Schema<number, number>;
    存款利率: Schema<number, number>;
    利息最大时间: Schema<number, number>;
    信用升级费用: Schema<number, number>;
    转账手续费: Schema<number, number>;
    决斗提升: Schema<number, number>;
    决斗降低: Schema<number, number>;
    保镖价格: Schema<number[], number[]>;
    保镖保护时间: Schema<number, number>;
    保镖保护概率: Schema<number, number>;
    weather: Schema<Schemastery.ObjectS<{
        季节持续天数: Schema<number, number>;
        天气更新间隔: Schema<number, number>;
        开始时间: Schema<number, number>;
    }>, Schemastery.ObjectT<{
        季节持续天数: Schema<number, number>;
        天气更新间隔: Schema<number, number>;
        开始时间: Schema<number, number>;
    }>>;
    messageRecall: Schema<Schemastery.ObjectS<{
        enabled: Schema<boolean, boolean>;
        delay: Schema<number, number>;
    }>, Schemastery.ObjectT<{
        enabled: Schema<boolean, boolean>;
        delay: Schema<number, number>;
    }>>;
    福利等级: Schema<Schemastery.ObjectS<{
        基础工资: Schema<number[], number[]>;
        培训费用: Schema<number[], number[]>;
        培训提升: Schema<number[], number[]>;
        福利间隔: Schema<number, number>;
        培训间隔: Schema<number, number>;
        虐待惩罚: Schema<number, number>;
        虐待间隔: Schema<number, number>;
    }>, Schemastery.ObjectT<{
        基础工资: Schema<number[], number[]>;
        培训费用: Schema<number[], number[]>;
        培训提升: Schema<number[], number[]>;
        福利间隔: Schema<number, number>;
        培训间隔: Schema<number, number>;
        虐待惩罚: Schema<number, number>;
        虐待间隔: Schema<number, number>;
    }>>;
    监狱系统: Schema<Schemastery.ObjectS<{
        监狱打工收入: Schema<number, number>;
        监狱打工间隔: Schema<number, number>;
        监狱打工次数上限: Schema<number, number>;
        工作收入倍率: Schema<number, number>;
    }>, Schemastery.ObjectT<{
        监狱打工收入: Schema<number, number>;
        监狱打工间隔: Schema<number, number>;
        监狱打工次数上限: Schema<number, number>;
        工作收入倍率: Schema<number, number>;
    }>>;
    管理员列表: Schema<string[], string[]>;
    牛马福利: Schema<Schemastery.ObjectS<{
        基础福利比例: Schema<number, number>;
        等级加成: Schema<number, number>;
        培训费用比例: Schema<number, number>;
        培训冷却: Schema<number, number>;
    }>, Schemastery.ObjectT<{
        基础福利比例: Schema<number, number>;
        等级加成: Schema<number, number>;
        培训费用比例: Schema<number, number>;
        培训冷却: Schema<number, number>;
    }>>;
    注册激励: Schema<Schemastery.ObjectS<{
        启用: Schema<boolean, boolean>;
        开始时间: Schema<string, string>;
        结束时间: Schema<string, string>;
        奖励金额: Schema<number, number>;
    }>, Schemastery.ObjectT<{
        启用: Schema<boolean, boolean>;
        开始时间: Schema<string, string>;
        结束时间: Schema<string, string>;
        奖励金额: Schema<number, number>;
    }>>;
}>>;
