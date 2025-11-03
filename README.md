# GD Macro to Click Sounds

Converts Geometry Dash macro files (.re3) into audio with realistic mouse click sounds.

**Example output:** [Bloodbath macro with click sounds](https://github.com/nyxikitty/gd-macro-audio/blob/main/dist/Generated/Bloodbath_2025-11-03T09-31-45.mp3)

## What it does

Takes your GD macro replay files and generates an MP3 with click sounds synced to the inputs. Analyzes click patterns to determine whether to use hard or soft click sounds based on timing.

## Requirements

- Node.js 16+
- FFmpeg (needs to be in your PATH)

## Setup

```bash
npm install
npm run build
```

## Usage

```bash
npm start
```

It'll ask you for:
1. Path to your .re3 or .json macro file
2. Path to your click sounds folder (if it can't find it automatically)
3. Output filename (optional - it'll auto-generate one with timestamp if you skip this)

## Click Sounds

Put your click sound recordings in a `ClickSounds` folder. Name them like this:

- `mouseDownHard.mp3`, `mouseDownHard1.mp3`, `mouseDownHard2.mp3` (for rapid clicks)
- `mouseDownSoft.mp3`, `mouseDownSoft1.mp3`, `mouseDownSoft2.mp3` (for normal clicks)
- `mouseUp.mp3`, `mouseUp1.mp3`, `mouseUp2.mp3` (for releases)

The more variations you have, the better. The tool randomly picks from available sounds.

## How it works

- Parses the binary .re3 format (or JSON macros)
- Analyzes timing between clicks to figure out which sound to use
- If clicks are rapid (< 150ms apart), uses hard clicks
- Otherwise uses soft clicks
- Processes in chunks for large macros to avoid running out of memory
- Volume is normalized so it doesn't clip

## Output

Files are saved in `dist/generated/` with the format:
`MacroName_YYYY-MM-DDTHH-MM-SS.mp3`

## Structure

```
src/
├── cli.ts              - Interactive CLI
├── audio-generator.ts  - Audio processing
├── re3-parser.ts       - Binary parser for .re3 files
└── colors.ts           - Console colors
```

## Notes

For really long macros (500+ actions), it automatically switches to chunked processing which takes longer but won't crash.
