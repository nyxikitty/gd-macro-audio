import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { MacroAudioGenerator } from './audio-generator';
import { Colors, log } from './colors';

const VERSION = '0.2';

class CLI {
    private rl: readline.Interface;

    constructor() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    private prompt(question: string): Promise<string> {
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

    private printHeader(): void {
        console.log(Colors.cyan('╔═══════════════════════════════════════════════════════════╗'));
        console.log(Colors.cyan('║') + Colors.bold(Colors.white('   GD Macro To Click Sounds')) + Colors.cyan(' v' + VERSION) + '                         ' + Colors.cyan('║'));
        console.log(Colors.cyan('╚═══════════════════════════════════════════════════════════╝\n'));
    }

    private async checkSoundsFolder(soundsPath: string): Promise<boolean> {
        log.info(`Checking ${Colors.dim(soundsPath)}...`);

        if (!fs.existsSync(soundsPath)) {
            log.error('Sounds folder not found\n');
            log.error('Please provide multiple recordings of mouse clicks');
            log.warning('Multiple sound variations of clicks can be more believable\n');
            log.warning('Working file names:');
            log.item(Colors.dim('mouseDownHard.mp3'));
            log.item(Colors.dim('mouseDownHard1.mp3'));
            log.item(Colors.dim('mouseDownSoft.mp3'));
            log.item(Colors.dim('mouseDownSoft1.mp3'));
            log.item(Colors.dim('mouseUp.mp3'));
            log.itemLast(Colors.dim('mouseUp1.mp3\n'));
            return false;
        }

        const files = fs.readdirSync(soundsPath);
        const soundFiles = files.filter(f => f.endsWith('.mp3') && (
            f.toLowerCase().includes('mousedown') ||
            f.toLowerCase().includes('mouseup')
        ));

        if (soundFiles.length === 0) {
            log.error('No sound files found in folder\n');
            log.error('Please provide multiple recordings of mouse clicks');
            log.warning('Multiple sound variations of clicks can be more believable\n');
            log.warning('Working file names:');
            log.item(Colors.dim('mouseDownHard.mp3'));
            log.item(Colors.dim('mouseDownHard1.mp3'));
            log.item(Colors.dim('mouseDownSoft.mp3'));
            log.item(Colors.dim('mouseDownSoft1.mp3'));
            log.item(Colors.dim('mouseUp.mp3'));
            log.itemLast(Colors.dim('mouseUp1.mp3\n'));
            return false;
        }

        return true;
    }

    public async run(): Promise<void> {
        this.printHeader();

        log.success('Loading...');
        log.success('Unpacking parser...');

        await new Promise(resolve => setTimeout(resolve, 100));

        let macroPath = '';
        let isValidPath = false;

        while (!isValidPath) {
            macroPath = await this.prompt(Colors.cyan('\nPlease enter the path to the macro or .re3 file:\n') + Colors.yellow('> '));

            if (!macroPath) {
                log.error('No path provided. Please try again.\n');
                continue;
            }

            if (!fs.existsSync(macroPath)) {
                log.error(`File not found: ${Colors.dim(macroPath)}\n`);
                continue;
            }

            const ext = path.extname(macroPath).toLowerCase();
            if (ext !== '.re3' && ext !== '.json') {
                log.error('Invalid file type. Expected .re3 or .json file\n');
                continue;
            }

            isValidPath = true;
        }

        console.log('');

        let soundsPath: string;
        
        const currentDirSounds = path.join(process.cwd(), 'ClickSounds');
        const macroDirSounds = path.join(path.dirname(macroPath), 'ClickSounds');
        
        if (fs.existsSync(currentDirSounds)) {
            soundsPath = currentDirSounds;
        } else if (fs.existsSync(macroDirSounds)) {
            soundsPath = macroDirSounds;
        } else {
            soundsPath = await this.prompt(Colors.cyan('Please enter the path to the sounds folder:\n') + Colors.yellow('> '));
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
        const customOutput = await this.prompt(Colors.cyan(`\nEnter output file name (or press Enter for default):\n`) + Colors.dim(`Default: ${path.basename(defaultOutput)}\n`) + Colors.yellow('> '));
        
        const outputPath = customOutput 
            ? path.join(outputDir, customOutput.endsWith('.mp3') ? customOutput : `${customOutput}.mp3`)
            : defaultOutput;

        log.line();
        console.log('');

        try {
            const generator = new MacroAudioGenerator(macroPath, soundsPath);
            await generator.generate(outputPath);

            console.log('');
            log.line();
            log.success('Generation complete!');
            log.info(`Saved to: ${Colors.bold(Colors.white(path.relative(process.cwd(), outputPath)))}`);
            log.line();
            console.log('');
        } catch (error: any) {
            log.error(`Error: ${error.message}`);
            log.error('Generation failed\n');
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