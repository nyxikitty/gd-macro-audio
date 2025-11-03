"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const readline = __importStar(require("readline"));
const audio_generator_1 = require("./audio-generator");
const colors_1 = require("./colors");
const VERSION = '0.2';
class CLI {
    constructor() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }
    prompt(question) {
        return new Promise((resolve) => {
            this.rl.question(question, (answer) => {
                let cleaned = answer.trim();
                if ((cleaned.startsWith('"') && cleaned.endsWith('"')) ||
                    (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
                    cleaned = cleaned.slice(1, -1);
                }
                resolve(cleaned);
            });
        });
    }
    printHeader() {
        console.log(colors_1.Colors.cyan('╔═══════════════════════════════════════════════════════════╗'));
        console.log(colors_1.Colors.cyan('║') + colors_1.Colors.bold(colors_1.Colors.white('   GD Macro To Click Sounds')) + colors_1.Colors.cyan(' v' + VERSION) + '                         ' + colors_1.Colors.cyan('║'));
        console.log(colors_1.Colors.cyan('╚═══════════════════════════════════════════════════════════╝\n'));
    }
    async checkSoundsFolder(soundsPath) {
        colors_1.log.info(`Checking ${colors_1.Colors.dim(soundsPath)}...`);
        if (!fs.existsSync(soundsPath)) {
            colors_1.log.error('Sounds folder not found\n');
            colors_1.log.error('Please provide multiple recordings of mouse clicks');
            colors_1.log.warning('Multiple sound variations of clicks can be more believable\n');
            colors_1.log.warning('Working file names:');
            colors_1.log.item(colors_1.Colors.dim('mouseDownHard.mp3'));
            colors_1.log.item(colors_1.Colors.dim('mouseDownHard1.mp3'));
            colors_1.log.item(colors_1.Colors.dim('mouseDownSoft.mp3'));
            colors_1.log.item(colors_1.Colors.dim('mouseDownSoft1.mp3'));
            colors_1.log.item(colors_1.Colors.dim('mouseUp.mp3'));
            colors_1.log.itemLast(colors_1.Colors.dim('mouseUp1.mp3\n'));
            return false;
        }
        const files = fs.readdirSync(soundsPath);
        const soundFiles = files.filter(f => f.endsWith('.mp3') && (f.toLowerCase().includes('mousedown') ||
            f.toLowerCase().includes('mouseup')));
        if (soundFiles.length === 0) {
            colors_1.log.error('No sound files found in folder\n');
            colors_1.log.error('Please provide multiple recordings of mouse clicks');
            colors_1.log.warning('Multiple sound variations of clicks can be more believable\n');
            colors_1.log.warning('Working file names:');
            colors_1.log.item(colors_1.Colors.dim('mouseDownHard.mp3'));
            colors_1.log.item(colors_1.Colors.dim('mouseDownHard1.mp3'));
            colors_1.log.item(colors_1.Colors.dim('mouseDownSoft.mp3'));
            colors_1.log.item(colors_1.Colors.dim('mouseDownSoft1.mp3'));
            colors_1.log.item(colors_1.Colors.dim('mouseUp.mp3'));
            colors_1.log.itemLast(colors_1.Colors.dim('mouseUp1.mp3\n'));
            return false;
        }
        return true;
    }
    async run() {
        this.printHeader();
        colors_1.log.success('Loading...');
        colors_1.log.success('Unpacking parser...');
        await new Promise(resolve => setTimeout(resolve, 100));
        let macroPath = '';
        let isValidPath = false;
        while (!isValidPath) {
            macroPath = await this.prompt(colors_1.Colors.cyan('\nPlease enter the path to the macro or .re3 file:\n') + colors_1.Colors.yellow('> '));
            if (!macroPath) {
                colors_1.log.error('No path provided. Please try again.\n');
                continue;
            }
            if (!fs.existsSync(macroPath)) {
                colors_1.log.error(`File not found: ${colors_1.Colors.dim(macroPath)}\n`);
                continue;
            }
            const ext = path.extname(macroPath).toLowerCase();
            if (ext !== '.re3' && ext !== '.json') {
                colors_1.log.error('Invalid file type. Expected .re3 or .json file\n');
                continue;
            }
            isValidPath = true;
        }
        console.log('');
        let soundsPath;
        const currentDirSounds = path.join(process.cwd(), 'ClickSounds');
        const macroDirSounds = path.join(path.dirname(macroPath), 'ClickSounds');
        if (fs.existsSync(currentDirSounds)) {
            soundsPath = currentDirSounds;
        }
        else if (fs.existsSync(macroDirSounds)) {
            soundsPath = macroDirSounds;
        }
        else {
            soundsPath = await this.prompt(colors_1.Colors.cyan('Please enter the path to the sounds folder:\n') + colors_1.Colors.yellow('> '));
        }
        console.log('');
        const hasValidSounds = await this.checkSoundsFolder(soundsPath);
        if (!hasValidSounds) {
            this.rl.close();
            process.exit(1);
        }
        const macroName = path.basename(macroPath, path.extname(macroPath));
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const outputDir = path.join(__dirname, 'Generated');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        const defaultOutput = path.join(outputDir, `${macroName}_${timestamp}.mp3`);
        const customOutput = await this.prompt(colors_1.Colors.cyan(`\nEnter output file name (or press Enter for default):\n`) + colors_1.Colors.dim(`Default: ${path.basename(defaultOutput)}\n`) + colors_1.Colors.yellow('> '));
        const outputPath = customOutput
            ? path.join(outputDir, customOutput.endsWith('.mp3') ? customOutput : `${customOutput}.mp3`)
            : defaultOutput;
        colors_1.log.line();
        console.log('');
        try {
            const generator = new audio_generator_1.MacroAudioGenerator(macroPath, soundsPath);
            await generator.generate(outputPath);
            console.log('');
            colors_1.log.line();
            colors_1.log.success('Generation complete!');
            colors_1.log.info(`Saved to: ${colors_1.Colors.bold(colors_1.Colors.white(path.relative(process.cwd(), outputPath)))}`);
            colors_1.log.line();
            console.log('');
        }
        catch (error) {
            colors_1.log.error(`Error: ${error.message}`);
            colors_1.log.error('Generation failed\n');
            this.rl.close();
            process.exit(1);
        }
        this.rl.close();
    }
}
const cli = new CLI();
cli.run().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
//# sourceMappingURL=cli.js.map