export class Colors {
    private static enabled = process.stdout.isTTY !== false;

    private static wrap(code: number, text: string, closeCode: number = 39): string {
        if (!this.enabled) return text;
        return `\x1b[${code}m${text}\x1b[${closeCode}m`;
    }

    static reset(text: string): string {
        return this.wrap(0, text, 0);
    }

    static bold(text: string): string {
        return this.wrap(1, text, 22);
    }

    static dim(text: string): string {
        return this.wrap(2, text, 22);
    }

    static cyan(text: string): string {
        return this.wrap(36, text);
    }

    static green(text: string): string {
        return this.wrap(32, text);
    }

    static yellow(text: string): string {
        return this.wrap(33, text);
    }

    static red(text: string): string {
        return this.wrap(31, text);
    }

    static blue(text: string): string {
        return this.wrap(34, text);
    }

    static magenta(text: string): string {
        return this.wrap(35, text);
    }

    static gray(text: string): string {
        return this.wrap(90, text);
    }

    static white(text: string): string {
        return this.wrap(97, text);
    }

    static bgCyan(text: string): string {
        return this.wrap(46, text, 49);
    }

    static bgGreen(text: string): string {
        return this.wrap(42, text, 49);
    }

    static bgYellow(text: string): string {
        return this.wrap(43, text, 49);
    }

    static bgRed(text: string): string {
        return this.wrap(41, text, 49);
    }

    static success(text: string): string {
        return this.green(this.bold(text));
    }

    static error(text: string): string {
        return this.red(this.bold(text));
    }

    static warning(text: string): string {
        return this.yellow(this.bold(text));
    }

    static info(text: string): string {
        return this.cyan(this.bold(text));
    }

    static disable(): void {
        this.enabled = false;
    }

    static enable(): void {
        this.enabled = true;
    }
}

export const log = {
    success: (message: string) => console.log(Colors.success('[+]') + ' ' + Colors.green(message)),
    error: (message: string) => console.log(Colors.error('[-]') + ' ' + Colors.red(message)),
    warning: (message: string) => console.log(Colors.warning('[!]') + ' ' + Colors.yellow(message)),
    info: (message: string) => console.log(Colors.info('[•]') + ' ' + Colors.cyan(message)),
    item: (message: string) => console.log(Colors.gray('    ├─') + ' ' + Colors.white(message)),
    itemLast: (message: string) => console.log(Colors.gray('    └─') + ' ' + Colors.white(message)),
    header: (message: string) => console.log('\n' + Colors.bold(Colors.cyan(message)) + '\n'),
    line: (char: string = '═', length: number = 60) => console.log(Colors.gray(char.repeat(length)))
};