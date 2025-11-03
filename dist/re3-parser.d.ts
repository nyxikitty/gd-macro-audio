interface Header {
    tps: number;
    p1_physic_count: number;
    p2_physic_count: number;
    p1_input_count: number;
    p2_input_count: number;
}
interface PhysicsFrame {
    frame: number;
    x: number;
    y: number;
    rotation: number;
    y_accel: number;
    player: boolean;
}
interface InputFrame {
    frame: number;
    down: boolean;
    button: number;
    isPlayer1: boolean;
}
interface ParsedReplay {
    header: Header;
    physicFrames_p1: PhysicsFrame[];
    physicFrames_p2: PhysicsFrame[];
    inputFrames_p1: InputFrame[];
    inputFrames_p2: InputFrame[];
}
interface ReplayStatistics {
    tps: number;
    duration: number;
    totalFrames: number;
    player1: {
        clicks: number;
        releases: number;
        totalInputs: number;
        physicFrames: number;
    };
    player2: {
        clicks: number;
        releases: number;
        totalInputs: number;
        physicFrames: number;
    };
}
export declare class RE3Parser {
    private buffer;
    private offset;
    private cachedData;
    constructor(filePath: string);
    private readFloat;
    private readDouble;
    private readUInt32;
    private readByte;
    private readBool;
    parse(): ParsedReplay;
    private parsePhysicsFrame;
    private parseInputFrame;
    getStatistics(): ReplayStatistics;
    exportToJSON(outputPath: string): ParsedReplay;
}
export {};
//# sourceMappingURL=re3-parser.d.ts.map