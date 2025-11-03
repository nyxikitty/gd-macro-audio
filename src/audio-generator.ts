import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { RE3Parser } from './re3-parser';
import { Colors, log } from './colors';

const execAsync = promisify(exec);

interface InputAction {
    frame: number;
    down: boolean;
    button: number;
    isPlayer1?: boolean;
}

interface SoundLibrary {
    pressHard: string[];
    pressSoft: string[];
    release: string[];
}

interface MacroData {
    fps: number;
    actions: InputAction[];
}

interface ClickAnalysis {
    averageGap: number;
    medianGap: number;
    threshold: number;
    totalPresses: number;
    totalReleases: number;
}

export class MacroAudioGenerator {
    private macroPath: string;
    private soundsFolder: string;
    private sounds: SoundLibrary;
    private macroData: MacroData;
    private readonly maxBufferSize = 100 * 1024 * 1024;
    private readonly executionTimeout = 900000;
    private readonly chunkSize = 50;

    constructor(macroPath: string, soundsFolder: string) {
        this.macroPath = macroPath;
        this.soundsFolder = soundsFolder;
        this.sounds = {
            pressHard: [],
            pressSoft: [],
            release: []
        };
        this.macroData = {
            fps: 240,
            actions: []
        };
    }

    public async generate(outputPath: string): Promise<void> {
        await this.loadSoundLibrary();
        await this.loadMacroData();
        
        const analysis = this.analyzeClickPattern();
        await this.generateAudioFile(outputPath, analysis);
    }

    private async loadSoundLibrary(): Promise<void> {
        log.success('Loading sound files...');

        if (!fs.existsSync(this.soundsFolder)) {
            throw new Error(`Sounds folder not found: ${this.soundsFolder}`);
        }

        const files = fs.readdirSync(this.soundsFolder);

        for (const file of files) {
            const filePath = path.join(this.soundsFolder, file);
            const stats = fs.statSync(filePath);

            if (!stats.isFile() || !file.endsWith('.mp3')) {
                continue;
            }

            if (file.toLowerCase().includes('mousedownhard')) {
                this.sounds.pressHard.push(filePath);
                log.item(Colors.blue(file));
            } else if (file.toLowerCase().includes('mousedownsoft')) {
                this.sounds.pressSoft.push(filePath);
                log.item(Colors.magenta(file));
            } else if (file.toLowerCase().includes('mouseup')) {
                this.sounds.release.push(filePath);
                log.item(Colors.green(file));
            }
        }

        if (this.sounds.pressHard.length === 0 && this.sounds.pressSoft.length === 0) {
            throw new Error('No mouse click sounds found. Expected files: mouseDownHard.mp3, mouseDownSoft.mp3, mouseUp.mp3');
        }

        log.success(`Loaded ${Colors.bold(String(this.sounds.pressHard.length + this.sounds.pressSoft.length + this.sounds.release.length))} sound variations\n`);
    }

    private async loadMacroData(): Promise<void> {
        log.success('Parsing macro file...');

        if (!fs.existsSync(this.macroPath)) {
            throw new Error(`Macro file not found: ${this.macroPath}`);
        }

        if (this.macroPath.endsWith('.re3')) {
            const parser = new RE3Parser(this.macroPath);
            const data = parser.parse();

            this.macroData.fps = data.header.tps;
            this.macroData.actions = [
                ...data.inputFrames_p1,
                ...data.inputFrames_p2
            ].sort((a, b) => a.frame - b.frame);
        } else {
            const rawData = JSON.parse(fs.readFileSync(this.macroPath, 'utf8'));
            this.macroData.fps = rawData.fps || rawData.tps || rawData.header?.tps || 240;

            if (rawData.inputFrames_p1) {
                this.macroData.actions = [
                    ...rawData.inputFrames_p1,
                    ...rawData.inputFrames_p2
                ].sort((a, b) => a.frame - b.frame);
            } else if (rawData.clicks) {
                this.macroData.actions = rawData.clicks.map((c: any) => ({
                    frame: c.frame,
                    down: c.press,
                    button: c.button
                }));
            }
        }

        const duration = this.macroData.actions[this.macroData.actions.length - 1].frame / this.macroData.fps;
        log.item(`FPS: ${Colors.cyan(String(this.macroData.fps))}`);
        log.item(`Total actions: ${Colors.yellow(String(this.macroData.actions.length))}`);
        log.itemLast(`Duration: ${Colors.green(duration.toFixed(2) + 's')}\n`);
    }

    private analyzeClickPattern(): ClickAnalysis {
        log.success('Analyzing click patterns...');

        const presses = this.macroData.actions.filter(a => a.down);
        const releases = this.macroData.actions.filter(a => !a.down);
        const clickGaps: number[] = [];

        for (let i = 1; i < presses.length; i++) {
            const gap = (presses[i].frame - presses[i - 1].frame) / this.macroData.fps;
            clickGaps.push(gap);
        }

        clickGaps.sort((a, b) => a - b);
        const median = clickGaps[Math.floor(clickGaps.length / 2)] || 0.15;
        const average = clickGaps.reduce((a, b) => a + b, 0) / clickGaps.length || 0.15;
        const threshold = Math.min(median, 0.15);

        log.item(`Average gap: ${Colors.cyan(average.toFixed(3) + 's')}`);
        log.item(`Median gap: ${Colors.cyan(median.toFixed(3) + 's')}`);
        log.item(`Hard click threshold: ${Colors.yellow(threshold.toFixed(3) + 's')}`);
        log.item(`Total presses: ${Colors.green(String(presses.length))}`);
        log.itemLast(`Total releases: ${Colors.blue(String(releases.length))}\n`);

        return {
            averageGap: average,
            medianGap: median,
            threshold,
            totalPresses: presses.length,
            totalReleases: releases.length
        };
    }

    private selectRandomSound(soundArray: string[]): string {
        return soundArray[Math.floor(Math.random() * soundArray.length)];
    }

    private async generateAudioFile(outputPath: string, analysis: ClickAnalysis): Promise<void> {
        if (this.macroData.actions.length > 500) {
            await this.generateChunkedAudio(outputPath, analysis);
        } else {
            await this.generateDirectAudio(outputPath, analysis);
        }
    }

    private async generateDirectAudio(outputPath: string, analysis: ClickAnalysis): Promise<void> {
        log.success('Generating audio (direct method)...');

        const duration = this.macroData.actions[this.macroData.actions.length - 1].frame / this.macroData.fps + 2;
        const inputs: string[] = [];
        const filters: string[] = [];
        let lastPressTime = -999;

        for (let i = 0; i < this.macroData.actions.length; i++) {
            const action = this.macroData.actions[i];
            const time = action.frame / this.macroData.fps;

            let soundFile: string;
            if (action.down) {
                const timeSinceLastPress = time - lastPressTime;
                const isRapidClick = timeSinceLastPress < analysis.threshold;

                if (isRapidClick && this.sounds.pressHard.length > 0) {
                    soundFile = this.selectRandomSound(this.sounds.pressHard);
                } else if (this.sounds.pressSoft.length > 0) {
                    soundFile = this.selectRandomSound(this.sounds.pressSoft);
                } else {
                    soundFile = this.selectRandomSound(this.sounds.pressHard);
                }
                lastPressTime = time;
            } else {
                soundFile = this.selectRandomSound(this.sounds.release);
            }

            inputs.push(`-i "${soundFile}"`);

            const delayMs = Math.floor(time * 1000);
            filters.push(`[${i}:a]adelay=${delayMs}|${delayMs}[a${i}]`);

            if ((i + 1) % 50 === 0) {
                log.item(`Processing: ${Colors.yellow(String(i + 1))}/${Colors.dim(String(this.macroData.actions.length))}`);
            }
        }

        const volumePerInput = 1.0 / Math.sqrt(this.macroData.actions.length);
        const mixInputs = filters.map((_, i) => `[a${i}]`).join('');
        const mixFilter = `${mixInputs}amix=inputs=${this.macroData.actions.length}:duration=longest:dropout_transition=0:normalize=0,volume=${volumePerInput},alimiter=limit=0.95:attack=1:release=50[out]`;
        filters.push(mixFilter);

        const filterComplex = filters.join(';');
        const command = `ffmpeg -y ${inputs.join(' ')} -filter_complex "${filterComplex}" -map "[out]" -t ${duration} "${outputPath}"`;

        log.success('Mixing audio layers...\n');

        try {
            await execAsync(command, {
                maxBuffer: this.maxBufferSize,
                timeout: this.executionTimeout
            });
            log.success(`Audio generated successfully: ${Colors.bold(Colors.green(outputPath))}`);
        } catch (error) {
            log.error('Direct generation failed, falling back to chunked method...\n');
            await this.generateChunkedAudio(outputPath, analysis);
        }
    }

    private async generateChunkedAudio(outputPath: string, analysis: ClickAnalysis): Promise<void> {
        log.success('Generating audio (chunked method)...');

        const duration = this.macroData.actions[this.macroData.actions.length - 1].frame / this.macroData.fps + 2;
        const tempDir = path.join(__dirname, 'temp_audio');

        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const chunks: InputAction[][] = [];
        for (let i = 0; i < this.macroData.actions.length; i += this.chunkSize) {
            chunks.push(this.macroData.actions.slice(i, i + this.chunkSize));
        }

        log.item(`Processing ${Colors.cyan(String(chunks.length))} chunks...\n`);

        let lastPressTime = -999;
        const chunkFiles: string[] = [];

        for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
            const chunk = chunks[chunkIdx];
            const chunkOutput = path.join(tempDir, `chunk_${chunkIdx}.wav`);

            const inputs: string[] = [];
            const filters: string[] = [];

            for (let i = 0; i < chunk.length; i++) {
                const action = chunk[i];
                const time = action.frame / this.macroData.fps;

                let soundFile: string;
                if (action.down) {
                    const timeSinceLastPress = time - lastPressTime;
                    const isRapidClick = timeSinceLastPress < analysis.threshold;

                    if (isRapidClick && this.sounds.pressHard.length > 0) {
                        soundFile = this.selectRandomSound(this.sounds.pressHard);
                    } else if (this.sounds.pressSoft.length > 0) {
                        soundFile = this.selectRandomSound(this.sounds.pressSoft);
                    } else {
                        soundFile = this.selectRandomSound(this.sounds.pressHard);
                    }
                    lastPressTime = time;
                } else {
                    soundFile = this.selectRandomSound(this.sounds.release);
                }

                inputs.push(`-i "${soundFile}"`);
                const delayMs = Math.floor(time * 1000);
                filters.push(`[${i}:a]adelay=${delayMs}|${delayMs}[a${i}]`);
            }

            const volumePerInput = 1.0 / Math.sqrt(chunk.length);
            const mixInputs = filters.map((_, i) => `[a${i}]`).join('');
            const mixFilter = `${mixInputs}amix=inputs=${chunk.length}:duration=longest:dropout_transition=0:normalize=0,volume=${volumePerInput}[out]`;
            filters.push(mixFilter);

            const filterComplex = filters.join(';');
            const command = `ffmpeg -y ${inputs.join(' ')} -filter_complex "${filterComplex}" -map "[out]" -t ${duration} -ar 48000 -ac 2 "${chunkOutput}"`;

            try {
                await execAsync(command, { maxBuffer: this.maxBufferSize });
                chunkFiles.push(chunkOutput);
                log.item(`Chunk ${Colors.green(String(chunkIdx + 1))}/${Colors.dim(String(chunks.length))} complete`);
            } catch (error: any) {
                log.item(`Chunk ${Colors.red(String(chunkIdx + 1))} failed: ${error.message}`);
            }
        }

        log.success('\nMerging chunks...');

        const chunkInputs = chunkFiles.map(f => `-i "${f}"`).join(' ');
        const chunkMixInputs = chunkFiles.map((_, i) => `[${i}:a]`).join('');
        const volumePerChunk = 1.0 / Math.sqrt(chunkFiles.length);
        const mergeFilter = `${chunkMixInputs}amix=inputs=${chunkFiles.length}:duration=longest:dropout_transition=0:normalize=0,volume=${volumePerChunk},alimiter=limit=0.95:attack=1:release=50[out]`;

        const mergeCommand = `ffmpeg -y ${chunkInputs} -filter_complex "${mergeFilter}" -map "[out]" -t ${duration} "${outputPath}"`;

        try {
            await execAsync(mergeCommand, { maxBuffer: this.maxBufferSize });
            log.success(`Audio generated successfully: ${Colors.bold(Colors.green(outputPath))}`);
        } catch (error: any) {
            throw new Error(`Merge failed: ${error.message}`);
        }

        log.success('Cleaning up temporary files...');
        for (const file of chunkFiles) {
            try {
                fs.unlinkSync(file);
            } catch (e) {}
        }

        try {
            fs.rmdirSync(tempDir);
        } catch (e) {}
    }
}