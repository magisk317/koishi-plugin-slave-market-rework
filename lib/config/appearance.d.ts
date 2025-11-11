export declare enum AppearanceType {
    衣服 = "clothes",// 衣服
    配饰 = "accessories",// 配饰
    发型 = "hairstyle",// 发型
    妆容 = "makeup"
}
export declare enum Quality {
    普通 = "normal",// 普通
    稀有 = "rare",// 稀有
    史诗 = "epic",// 史诗
    传说 = "legendary"
}
export interface Appearance {
    id: string;
    name: string;
    type: AppearanceType;
    quality: Quality;
    price: number;
    priceBonus: number;
    description: string;
}
export declare const appearances: Appearance[];
