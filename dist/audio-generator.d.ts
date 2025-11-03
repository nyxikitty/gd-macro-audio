export declare class MacroAudioGenerator {
    private macroPath;
    private soundsFolder;
    private sounds;
    private macroData;
    private readonly maxBufferSize;
    private readonly executionTimeout;
    private readonly chunkSize;
    constructor(macroPath: string, soundsFolder: string);
    generate(outputPath: string): Promise<void>;
    private loadSoundLibrary;
    private loadMacroData;
    private analyzeClickPattern;
    private selectRandomSound;
    private generateAudioFile;
    private generateDirectAudio;
    private generateChunkedAudio;
}
//# sourceMappingURL=audio-generator.d.ts.map