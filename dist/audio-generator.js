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
exports.MacroAudioGenerator = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const re3_parser_1 = require("./re3-parser");
const colors_1 = require("./colors");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class MacroAudioGenerator {
    constructor(macroPath, soundsFolder) {
        this.maxBufferSize = 100 * 1024 * 1024;
        this.executionTimeout = 900000;
        this.chunkSize = 50;
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
    async generate(outputPath) {
        await this.loadSoundLibrary();
        await this.loadMacroData();
        const analysis = this.analyzeClickPattern();
        await this.generateAudioFile(outputPath, analysis);
    }
    async loadSoundLibrary() {
        colors_1.log.success('Loading sound files...');
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
                colors_1.log.item(colors_1.Colors.blue(file));
            }
            else if (file.toLowerCase().includes('mousedownsoft')) {
                this.sounds.pressSoft.push(filePath);
                colors_1.log.item(colors_1.Colors.magenta(file));
            }
            else if (file.toLowerCase().includes('mouseup')) {
                this.sounds.release.push(filePath);
                colors_1.log.item(colors_1.Colors.green(file));
            }
        }
        if (this.sounds.pressHard.length === 0 && this.sounds.pressSoft.length === 0) {
            throw new Error('No mouse click sounds found. Expected files: mouseDownHard.mp3, mouseDownSoft.mp3, mouseUp.mp3');
        }
        colors_1.log.success(`Loaded ${colors_1.Colors.bold(String(this.sounds.pressHard.length + this.sounds.pressSoft.length + this.sounds.release.length))} sound variations\n`);
    }
    async loadMacroData() {
        colors_1.log.success('Parsing macro file...');
        if (!fs.existsSync(this.macroPath)) {
            throw new Error(`Macro file not found: ${this.macroPath}`);
        }
        if (this.macroPath.endsWith('.re3')) {
            const parser = new re3_parser_1.RE3Parser(this.macroPath);
            const data = parser.parse();
            this.macroData.fps = data.header.tps;
            this.macroData.actions = [
                ...data.inputFrames_p1,
                ...data.inputFrames_p2
            ].sort((a, b) => a.frame - b.frame);
        }
        else {
            const rawData = JSON.parse(fs.readFileSync(this.macroPath, 'utf8'));
            this.macroData.fps = rawData.fps || rawData.tps || rawData.header?.tps || 240;
            if (rawData.inputFrames_p1) {
                this.macroData.actions = [
                    ...rawData.inputFrames_p1,
                    ...rawData.inputFrames_p2
                ].sort((a, b) => a.frame - b.frame);
            }
            else if (rawData.clicks) {
                this.macroData.actions = rawData.clicks.map((c) => ({
                    frame: c.frame,
                    down: c.press,
                    button: c.button
                }));
            }
        }
        const duration = this.macroData.actions[this.macroData.actions.length - 1].frame / this.macroData.fps;
        colors_1.log.item(`FPS: ${colors_1.Colors.cyan(String(this.macroData.fps))}`);
        colors_1.log.item(`Total actions: ${colors_1.Colors.yellow(String(this.macroData.actions.length))}`);
        colors_1.log.itemLast(`Duration: ${colors_1.Colors.green(duration.toFixed(2) + 's')}\n`);
    }
    analyzeClickPattern() {
        colors_1.log.success('Analyzing click patterns...');
        const presses = this.macroData.actions.filter(a => a.down);
        const releases = this.macroData.actions.filter(a => !a.down);
        const clickGaps = [];
        for (let i = 1; i < presses.length; i++) {
            const gap = (presses[i].frame - presses[i - 1].frame) / this.macroData.fps;
            clickGaps.push(gap);
        }
        clickGaps.sort((a, b) => a - b);
        const median = clickGaps[Math.floor(clickGaps.length / 2)] || 0.15;
        const average = clickGaps.reduce((a, b) => a + b, 0) / clickGaps.length || 0.15;
        const threshold = Math.min(median, 0.15);
        colors_1.log.item(`Average gap: ${colors_1.Colors.cyan(average.toFixed(3) + 's')}`);
        colors_1.log.item(`Median gap: ${colors_1.Colors.cyan(median.toFixed(3) + 's')}`);
        colors_1.log.item(`Hard click threshold: ${colors_1.Colors.yellow(threshold.toFixed(3) + 's')}`);
        colors_1.log.item(`Total presses: ${colors_1.Colors.green(String(presses.length))}`);
        colors_1.log.itemLast(`Total releases: ${colors_1.Colors.blue(String(releases.length))}\n`);
        return {
            averageGap: average,
            medianGap: median,
            threshold,
            totalPresses: presses.length,
            totalReleases: releases.length
        };
    }
    selectRandomSound(soundArray) {
        return soundArray[Math.floor(Math.random() * soundArray.length)];
    }
    async generateAudioFile(outputPath, analysis) {
        if (this.macroData.actions.length > 500) {
            await this.generateChunkedAudio(outputPath, analysis);
        }
        else {
            await this.generateDirectAudio(outputPath, analysis);
        }
    }
    async generateDirectAudio(outputPath, analysis) {
        colors_1.log.success('Generating audio (direct method)...');
        const duration = this.macroData.actions[this.macroData.actions.length - 1].frame / this.macroData.fps + 2;
        const inputs = [];
        const filters = [];
        let lastPressTime = -999;
        for (let i = 0; i < this.macroData.actions.length; i++) {
            const action = this.macroData.actions[i];
            const time = action.frame / this.macroData.fps;
            let soundFile;
            if (action.down) {
                const timeSinceLastPress = time - lastPressTime;
                const isRapidClick = timeSinceLastPress < analysis.threshold;
                if (isRapidClick && this.sounds.pressHard.length > 0) {
                    soundFile = this.selectRandomSound(this.sounds.pressHard);
                }
                else if (this.sounds.pressSoft.length > 0) {
                    soundFile = this.selectRandomSound(this.sounds.pressSoft);
                }
                else {
                    soundFile = this.selectRandomSound(this.sounds.pressHard);
                }
                lastPressTime = time;
            }
            else {
                soundFile = this.selectRandomSound(this.sounds.release);
            }
            inputs.push(`-i "${soundFile}"`);
            const delayMs = Math.floor(time * 1000);
            filters.push(`[${i}:a]adelay=${delayMs}|${delayMs}[a${i}]`);
            if ((i + 1) % 50 === 0) {
                colors_1.log.item(`Processing: ${colors_1.Colors.yellow(String(i + 1))}/${colors_1.Colors.dim(String(this.macroData.actions.length))}`);
            }
        }
        const volumePerInput = 1.0 / Math.sqrt(this.macroData.actions.length);
        const mixInputs = filters.map((_, i) => `[a${i}]`).join('');
        const mixFilter = `${mixInputs}amix=inputs=${this.macroData.actions.length}:duration=longest:dropout_transition=0:normalize=0,volume=${volumePerInput},alimiter=limit=0.95:attack=1:release=50[out]`;
        filters.push(mixFilter);
        const filterComplex = filters.join(';');
        const command = `ffmpeg -y ${inputs.join(' ')} -filter_complex "${filterComplex}" -map "[out]" -t ${duration} "${outputPath}"`;
        colors_1.log.success('Mixing audio layers...\n');
        try {
            await execAsync(command, {
                maxBuffer: this.maxBufferSize,
                timeout: this.executionTimeout
            });
            colors_1.log.success(`Audio generated successfully: ${colors_1.Colors.bold(colors_1.Colors.green(outputPath))}`);
        }
        catch (error) {
            colors_1.log.error('Direct generation failed, falling back to chunked method...\n');
            await this.generateChunkedAudio(outputPath, analysis);
        }
    }
    async generateChunkedAudio(outputPath, analysis) {
        colors_1.log.success('Generating audio (chunked method)...');
        const duration = this.macroData.actions[this.macroData.actions.length - 1].frame / this.macroData.fps + 2;
        const tempDir = path.join(__dirname, 'temp_audio');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        const chunks = [];
        for (let i = 0; i < this.macroData.actions.length; i += this.chunkSize) {
            chunks.push(this.macroData.actions.slice(i, i + this.chunkSize));
        }
        colors_1.log.item(`Processing ${colors_1.Colors.cyan(String(chunks.length))} chunks...\n`);
        let lastPressTime = -999;
        const chunkFiles = [];
        for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
            const chunk = chunks[chunkIdx];
            const chunkOutput = path.join(tempDir, `chunk_${chunkIdx}.wav`);
            const inputs = [];
            const filters = [];
            for (let i = 0; i < chunk.length; i++) {
                const action = chunk[i];
                const time = action.frame / this.macroData.fps;
                let soundFile;
                if (action.down) {
                    const timeSinceLastPress = time - lastPressTime;
                    const isRapidClick = timeSinceLastPress < analysis.threshold;
                    if (isRapidClick && this.sounds.pressHard.length > 0) {
                        soundFile = this.selectRandomSound(this.sounds.pressHard);
                    }
                    else if (this.sounds.pressSoft.length > 0) {
                        soundFile = this.selectRandomSound(this.sounds.pressSoft);
                    }
                    else {
                        soundFile = this.selectRandomSound(this.sounds.pressHard);
                    }
                    lastPressTime = time;
                }
                else {
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
                colors_1.log.item(`Chunk ${colors_1.Colors.green(String(chunkIdx + 1))}/${colors_1.Colors.dim(String(chunks.length))} complete`);
            }
            catch (error) {
                colors_1.log.item(`Chunk ${colors_1.Colors.red(String(chunkIdx + 1))} failed: ${error.message}`);
            }
        }
        colors_1.log.success('\nMerging chunks...');
        const chunkInputs = chunkFiles.map(f => `-i "${f}"`).join(' ');
        const chunkMixInputs = chunkFiles.map((_, i) => `[${i}:a]`).join('');
        const volumePerChunk = 1.0 / Math.sqrt(chunkFiles.length);
        const mergeFilter = `${chunkMixInputs}amix=inputs=${chunkFiles.length}:duration=longest:dropout_transition=0:normalize=0,volume=${volumePerChunk},alimiter=limit=0.95:attack=1:release=50[out]`;
        const mergeCommand = `ffmpeg -y ${chunkInputs} -filter_complex "${mergeFilter}" -map "[out]" -t ${duration} "${outputPath}"`;
        try {
            await execAsync(mergeCommand, { maxBuffer: this.maxBufferSize });
            colors_1.log.success(`Audio generated successfully: ${colors_1.Colors.bold(colors_1.Colors.green(outputPath))}`);
        }
        catch (error) {
            throw new Error(`Merge failed: ${error.message}`);
        }
        colors_1.log.success('Cleaning up temporary files...');
        for (const file of chunkFiles) {
            try {
                fs.unlinkSync(file);
            }
            catch (e) { }
        }
        try {
            fs.rmdirSync(tempDir);
        }
        catch (e) { }
    }
}
exports.MacroAudioGenerator = MacroAudioGenerator;
//# sourceMappingURL=audio-generator.js.map