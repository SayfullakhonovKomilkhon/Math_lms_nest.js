export interface MonthTitle {
    place: 1 | 2 | 3;
    title: string;
    icon: string;
    description: string;
}
export interface MonthConfig {
    month: number;
    monthName: string;
    male: MonthTitle[];
    female: MonthTitle[];
}
export interface SpecialConfig {
    key: string;
    title: string;
    icon: string;
    description: string;
    condition: string;
}
export declare const MONTHLY_ACHIEVEMENTS: MonthConfig[];
export declare const SPECIAL_ACHIEVEMENTS: SpecialConfig[];
export declare function getTitleForStudent(month: number, place: 1 | 2 | 3, gender: 'MALE' | 'FEMALE'): MonthTitle | null;
