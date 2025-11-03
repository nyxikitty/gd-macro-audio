"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = exports.Colors = void 0;
class Colors {
    static wrap(code, text, closeCode = 39) {
        if (!this.enabled)
            return text;
        return `\x1b[${code}m${text}\x1b[${closeCode}m`;
    }
    static reset(text) {
        return this.wrap(0, text, 0);
    }
    static bold(text) {
        return this.wrap(1, text, 22);
    }
    static dim(text) {
        return this.wrap(2, text, 22);
    }
    static cyan(text) {
        return this.wrap(36, text);
    }
    static green(text) {
        return this.wrap(32, text);
    }
    static yellow(text) {
        return this.wrap(33, text);
    }
    static red(text) {
        return this.wrap(31, text);
    }
    static blue(text) {
        return this.wrap(34, text);
    }
    static magenta(text) {
        return this.wrap(35, text);
    }
    static gray(text) {
        return this.wrap(90, text);
    }
    static white(text) {
        return this.wrap(97, text);
    }
    static bgCyan(text) {
        return this.wrap(46, text, 49);
    }
    static bgGreen(text) {
        return this.wrap(42, text, 49);
    }
    static bgYellow(text) {
        return this.wrap(43, text, 49);
    }
    static bgRed(text) {
        return this.wrap(41, text, 49);
    }
    static success(text) {
        return this.green(this.bold(text));
    }
    static error(text) {
        return this.red(this.bold(text));
    }
    static warning(text) {
        return this.yellow(this.bold(text));
    }
    static info(text) {
        return this.cyan(this.bold(text));
    }
    static disable() {
        this.enabled = false;
    }
    static enable() {
        this.enabled = true;
    }
}
exports.Colors = Colors;
Colors.enabled = process.stdout.isTTY !== false;
exports.log = {
    success: (message) => console.log(Colors.success('[+]') + ' ' + Colors.green(message)),
    error: (message) => console.log(Colors.error('[-]') + ' ' + Colors.red(message)),
    warning: (message) => console.log(Colors.warning('[!]') + ' ' + Colors.yellow(message)),
    info: (message) => console.log(Colors.info('[•]') + ' ' + Colors.cyan(message)),
    item: (message) => console.log(Colors.gray('    ├─') + ' ' + Colors.white(message)),
    itemLast: (message) => console.log(Colors.gray('    └─') + ' ' + Colors.white(message)),
    header: (message) => console.log('\n' + Colors.bold(Colors.cyan(message)) + '\n'),
    line: (char = '═', length = 60) => console.log(Colors.gray(char.repeat(length)))
};
//# sourceMappingURL=colors.js.map