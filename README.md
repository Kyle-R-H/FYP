# FYP
Real-time Interactive Music Score Tracking Using Live Microphone Input

## Scores
Public Domain Scores: https://github.com/musetrainer/library/tree/master

## Layout
```
project/
├── input/
│   ├── Image/
│   ├── Midi/
│   └── MusicXML/
├── src/
│   ├── controller/
│   │   ├── audio/
│   │   │   ├── audioController.js
│   │   │   └── audioProcessor.js
│   │   ├── score/
│   │   │   ├── fileController.js
│   │   │   └── osmdController.js
│   │   ├── compare.js
│   │   └── helpers.js
│   ├── model/
│   │   └── values.js
│   ├── view/
│   │   ├── css/
│   │   │   └── light_theme.css
│   │   ├── index.html
│   │   └── ui.js
│   └── main.js
├── tmp/
├── .gitignore
├── dockerfile
├── package-lock.json
├── package.json
├── readme.md
└── server.js
```
## Changelog
### Till 06/03/26
- Score Input for musicxml files and error handling for other files
- Score control for moving the osmd cursor
- Audio input using webaudio api with playback
- Time and frequency domain graphed using html canvas based on tutorials and blogs listed in audio.js
- Data is displayed based on those graphs
- Signal Data somewhat displayed, WIP
- Score display using osmd with zoom functionality and default (error) score
- Meyda included and logs chroma values, rms, mfcc

### 18/03/26
- Display Score expected notes from osmd cursor

## 28/03/26
- Monophonic Pitch Detection