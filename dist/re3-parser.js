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
exports.RE3Parser = void 0;
const fs = __importStar(require("fs"));
class RE3Parser {
    constructor(filePath) {
        this.offset = 0;
        this.cachedData = null;
        this.buffer = fs.readFileSync(filePath);
    }
    readFloat() {
        const value = this.buffer.readFloatLE(this.offset);
        this.offset += 4;
        return value;
    }
    readDouble() {
        const value = this.buffer.readDoubleLE(this.offset);
        this.offset += 8;
        return value;
    }
    readUInt32() {
        const value = this.buffer.readUInt32LE(this.offset);
        this.offset += 4;
        return value;
    }
    readByte() {
        const value = this.buffer.readUInt8(this.offset);
        this.offset += 1;
        return value;
    }
    readBool() {
        const value = this.buffer.readUInt8(this.offset) !== 0;
        this.offset += 1;
        return value;
    }
    parse() {
        if (this.cachedData) {
            return this.cachedData;
        }
        this.offset = 0;
        const result = {
            header: {},
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
    parsePhysicsFrame() {
        const frame = this.readUInt32();
        const x = this.readFloat();
        const y = this.readFloat();
        const rotation = this.readFloat();
        const y_accel = this.readDouble();
        const player = this.readBool();
        this.offset += 7;
        return { frame, x, y, rotation, y_accel, player };
    }
    parseInputFrame() {
        const frame = this.readUInt32();
        const down = this.readBool();
        this.offset += 3;
        const button = this.readUInt32();
        const isPlayer1 = this.readBool();
        this.offset += 3;
        return { frame, down, button, isPlayer1 };
    }
    getStatistics() {
        const data = this.parse();
        const p1Presses = data.inputFrames_p1.filter(i => i.down).length;
        const p1Releases = data.inputFrames_p1.filter(i => !i.down).length;
        const p2Presses = data.inputFrames_p2.filter(i => i.down).length;
        const p2Releases = data.inputFrames_p2.filter(i => !i.down).length;
        const lastFrame = Math.max(data.inputFrames_p1.length > 0 ? data.inputFrames_p1[data.inputFrames_p1.length - 1].frame : 0, data.inputFrames_p2.length > 0 ? data.inputFrames_p2[data.inputFrames_p2.length - 1].frame : 0);
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
    exportToJSON(outputPath) {
        const data = this.parse();
        fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
        return data;
    }
}
exports.RE3Parser = RE3Parser;
//# sourceMappingURL=re3-parser.js.map