export declare class Colors {
    private static enabled;
    private static wrap;
    static reset(text: string): string;
    static bold(text: string): string;
    static dim(text: string): string;
    static cyan(text: string): string;
    static green(text: string): string;
    static yellow(text: string): string;
    static red(text: string): string;
    static blue(text: string): string;
    static magenta(text: string): string;
    static gray(text: string): string;
    static white(text: string): string;
    static bgCyan(text: string): string;
    static bgGreen(text: string): string;
    static bgYellow(text: string): string;
    static bgRed(text: string): string;
    static success(text: string): string;
    static error(text: string): string;
    static warning(text: string): string;
    static info(text: string): string;
    static disable(): void;
    static enable(): void;
}
export declare const log: {
    success: (message: string) => void;
    error: (message: string) => void;
    warning: (message: string) => void;
    info: (message: string) => void;
    item: (message: string) => void;
    itemLast: (message: string) => void;
    header: (message: string) => void;
    line: (char?: string, length?: number) => void;
};
//# sourceMappingURL=colors.d.ts.map