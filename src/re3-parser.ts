import * as fs from 'fs';

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

export class RE3Parser {
    private buffer: Buffer;
    private offset: number = 0;
    private cachedData: ParsedReplay | null = null;

    constructor(filePath: string) {
        this.buffer = fs.readFileSync(filePath);
    }

    private readFloat(): number {
        const value = this.buffer.readFloatLE(this.offset);
        this.offset += 4;
        return value;
    }

    private readDouble(): number {
        const value = this.buffer.readDoubleLE(this.offset);
        this.offset += 8;
        return value;
    }

    private readUInt32(): number {
        const value = this.buffer.readUInt32LE(this.offset);
        this.offset += 4;
        return value;
    }

    private readByte(): number {
        const value = this.buffer.readUInt8(this.offset);
        this.offset += 1;
        return value;
    }

    private readBool(): boolean {
        const value = this.buffer.readUInt8(this.offset) !== 0;
        this.offset += 1;
        return value;
    }

    public parse(): ParsedReplay {
        if (this.cachedData) {
            return this.cachedData;
        }

        this.offset = 0;

        const result: ParsedReplay = {
            header: {} as Header,
            physicFrames_p1: [],
            physicFrames_p2: [],
            inputFrames_p1: [],
            inputFrames_p2: []
        };

        result.header.tps = this.readFloat();
        result.header.p1_physic_count = this.readUInt32();
        result.header.p2_physic_count = this.readUInt32();
        result.header.p1_input_count = this.readUInt32();
        result.header.p2_input_count = this.readUInt32();

        for (let i = 0; i < result.header.p1_physic_count; i++) {
            result.physicFrames_p1.push(this.parsePhysicsFrame());
        }

        for (let i = 0; i < result.header.p2_physic_count; i++) {
            result.physicFrames_p2.push(this.parsePhysicsFrame());
        }

        for (let i = 0; i < result.header.p1_input_count; i++) {
            result.inputFrames_p1.push(this.parseInputFrame());
        }

        for (let i = 0; i < result.header.p2_input_count; i++) {
            result.inputFrames_p2.push(this.parseInputFrame());
        }

        this.cachedData = result;
        return result;
    }

    private parsePhysicsFrame(): PhysicsFrame {
        const frame = this.readUInt32();
        const x = this.readFloat();
        const y = this.readFloat();
        const rotation = this.readFloat();
        const y_accel = this.readDouble();
        const player = this.readBool();

        this.offset += 7;

        return { frame, x, y, rotation, y_accel, player };
    }

    private parseInputFrame(): InputFrame {
        const frame = this.readUInt32();
        const down = this.readBool();

        this.offset += 3;

        const button = this.readUInt32();
        const isPlayer1 = this.readBool();

        this.offset += 3;

        return { frame, down, button, isPlayer1 };
    }

    public getStatistics(): ReplayStatistics {
        const data = this.parse();

        const p1Presses = data.inputFrames_p1.filter(i => i.down).length;
        const p1Releases = data.inputFrames_p1.filter(i => !i.down).length;
        const p2Presses = data.inputFrames_p2.filter(i => i.down).length;
        const p2Releases = data.inputFrames_p2.filter(i => !i.down).length;

        const lastFrame = Math.max(
            data.inputFrames_p1.length > 0 ? data.inputFrames_p1[data.inputFrames_p1.length - 1].frame : 0,
            data.inputFrames_p2.length > 0 ? data.inputFrames_p2[data.inputFrames_p2.length - 1].frame : 0
        );

        return {
            tps: data.header.tps,
            duration: lastFrame / data.header.tps,
            totalFrames: lastFrame,
            player1: {
                clicks: p1Presses,
                releases: p1Releases,
                totalInputs: p1Presses + p1Releases,
                physicFrames: data.header.p1_physic_count
            },
            player2: {
                clicks: p2Presses,
                releases: p2Releases,
                totalInputs: p2Presses + p2Releases,
                physicFrames: data.header.p2_physic_count
            }
        };
    }

    public exportToJSON(outputPath: string): ParsedReplay {
        const data = this.parse();
        fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
        return data;
    }
}
