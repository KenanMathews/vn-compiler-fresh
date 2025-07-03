# VN Compiler - Visual Novel Development Framework

A powerful, production-ready compiler that transforms YAML narratives into standalone HTML games. Built on the robust VN Engine library with advanced tooling, modern development workflows, and sophisticated input systems.

## Key Features

- Single-File Compilation - Complete games in standalone HTML files with embedded assets
- Development Server - Live reload, validation API, and static file serving
- Advanced Input System - Rich form controls with real-time validation
- Comprehensive Validation - YAML structure, scene references, and asset validation
- Modern UI - Vertical feed interface with smooth animations
- Hot Reload - Instant preview of changes during development
- Asset Management - Intelligent bundling and optimization
- TypeScript Development - Full type safety with Deno runtime

## Table of Contents

- Quick Start
- CLI Commands
- Development Workflow
- YAML Structure
- Input Helpers
- Advanced Features
- Configuration

## Quick Start

### Prerequisites

- Deno 1.40+ installed
- Basic knowledge of YAML

### Installation & Setup

```bash
# Clone the VN Compiler
git clone <your-repo-url> vn-compiler
cd vn-compiler

# Build the compiler
deno task build

# Create your first story
cp examples/story.yaml my-story.yaml

# Start development server with live reload
./bin/vn-compiler serve my-story.yaml

# Or compile to production HTML
./bin/vn-compiler compile my-story.yaml --output my-game.html --minify
```

### Your First Game

Create a `story.yaml` file:

```yaml
title: "My First VN Game"
description: "An interactive visual novel"
author: "Your Name"

variables:
  playerName: ""
  score: 0
  hasVisitedForest: false

assets:
  - name: "character_portrait"
    url: "character.png"
    type: "image"
    description: "Main character portrait"

scenes:
  intro:
    - "Welcome to my visual novel!"
    - "{{input \"playerName\" \"What's your name?\" \"text\"}}"
    - "Nice to meet you, {{playerName}}!"
    - text: "Ready to begin your adventure?"
      choices:
        - text: "Let's go!"
          goto: forest_entrance
        - text: "Tell me more"
          goto: tutorial

  tutorial:
    - "This game demonstrates VN Compiler features:"
    - "• Interactive input elements"
    - "• Variable tracking and interpolation"
    - "• Scene navigation with choices"
    - "• Asset integration"
    - text: "Ready now?"
      choices:
        - text: "Start the adventure!"
          goto: forest_entrance

  forest_entrance:
    - "You stand at the edge of a mysterious forest, {{playerName}}."
    - "The trees whisper secrets in the wind..."
    - text: "What do you do?"
      choices:
        - text: "Enter the forest bravely"
          action:
            - type: setVar
              key: score
              value: "{{score + 10}}"
            - type: setVar
              key: hasVisitedForest
              value: true
            - type: goToScene
              scene: deep_forest
        - text: "Look for another path"
          goto: alternative_path

  deep_forest:
    - "You venture into the forest with courage, {{playerName}}!"
    - "Your bravery has earned you {{score}} points."
    - "The adventure continues..."
    - text: "End of demo. Play again?"
      choices:
        - text: "Start over"
          goto: intro

  alternative_path:
    - "You find a safer path around the forest."
    - "Sometimes wisdom is better than courage, {{playerName}}."
    - text: "End of demo. Play again?"
      choices:
        - text: "Start over"
          goto: intro
```

## CLI Commands

### compile - Build Production Game

Compile YAML scripts into standalone HTML games.

```bash
# Basic compilation
vn-compiler compile story.yaml

# Production build with optimization
vn-compiler compile story.yaml \
  --output game.html \
  --minify \
  --assets ./assets \
  --css custom.css \
  --js analytics.js

# Development build with debugging
vn-compiler compile story.yaml --dev --verbose
```

**Options:**
- `-o, --output <file>` - Output HTML file (default: `game.html`)
- `-a, --assets <dir>` - Assets directory to bundle
- `-c, --css <file>` - Custom CSS file to include
- `-j, --js <file>` - Custom JavaScript file to include
- `--minify` - Minify HTML output for production
- `--dev` - Include debug information
- `--verbose` - Detailed compilation logging

### serve - Development Server

Start a development server with live reload and validation.

```bash
# Development server with live reload (default)
vn-compiler serve story.yaml

# Custom port and assets
vn-compiler serve story.yaml \
  --port 8080 \
  --assets ./game-assets

# Production preview (no file watching)
vn-compiler serve story.yaml --no-watch

# With custom JavaScript injection
vn-compiler serve story.yaml \
  --js analytics.js \
  --css custom.css
```

**Options:**
- `-p, --port <number>` - Server port (default: `3000`)
- `-w, --watch` - Watch for file changes (default: `true`)
- `--no-watch` - Disable file watching
- `--assets <dir>` - Assets directory to serve
- `-j, --js <file>` - Custom JavaScript to inject
- `-c, --css <file>` - Custom CSS to inject

**Server Endpoints:**
- `http://localhost:3000/` - Your game
- `http://localhost:3000/api/status` - Compilation status
- `http://localhost:3000/api/validate` - Real-time validation
- `ws://localhost:3000/ws` - WebSocket for live reload
- `http://localhost:3000/<filename>` - Static files from current directory

### validate - Script Validation

Validate YAML structure and content without compiling.

```bash
# Basic validation
vn-compiler validate story.yaml

# Detailed validation report
vn-compiler validate story.yaml --verbose
```

**Validation Checks:**
- YAML syntax correctness
- Required sections (`scenes`)
- Recommended metadata (`title`, `description`)
- Asset structure and references
- Scene naming conventions
- Template syntax validation
- Variable and scene reference integrity

### init - Create New Project

Create a new VN project from templates.

```bash
# Basic project
vn-compiler init my-novel

# Interactive project with metadata
vn-compiler init my-adventure \
  --template interactive \
  --author "Your Name" \
  --description "An epic adventure"

# Media-rich project in specific directory
vn-compiler init multimedia-story \
  --template media-rich \
  --directory ./projects
```

**Options:**
- `-t, --template <type>` - Project template: `basic`, `interactive`, `media-rich`
- `--directory <dir>` - Create project in specific directory
- `--author <name>` - Set author name
- `--description <text>` - Set project description

## Development Workflow

### 1. Start Development Server
```bash
vn-compiler serve story.yaml
```
- File watching enabled by default
- Live reload on changes
- Real-time validation
- Static file serving

### 2. Edit Your YAML
- Make changes to your story file
- See instant updates in browser
- Check validation messages in console

### 3. Test Locally
- Use browser dev tools for debugging
- Test all story paths and choices
- Validate input helpers and variables

### 4. Build for Production
```bash
vn-compiler compile story.yaml --output index.html --minify
```

## YAML Structure

### Complete Game Structure

```yaml
# Metadata (recommended)
title: "Game Title"
description: "Game description"
author: "Your Name"

# Game variables (optional)
variables:
  playerName: ""
  score: 0
  inventory: []

# Assets (optional)
assets:
  - name: "character"
    url: "character.png"
    type: "image"
    description: "Main character portrait"
  - name: "bgm"
    url: "background.mp3"
    type: "audio"

# Scenes (required)
scenes:
  scene_name:
    - "Simple text line"
    - speaker: "Character Name"
      say: "Dialogue with speaker"
    - text: "Choice prompt"
      choices:
        - text: "Option 1"
          goto: scene1
        - text: "Option 2"
          action:
            - type: setVar
              key: score
              value: "{{score + 10}}"
            - type: goToScene
              scene: scene2
```

### Scene Elements

**Text Lines:**
```yaml
- "Simple narrator text"
- speaker: "Character"
  say: "Character dialogue"
```

**Choices:**
```yaml
- text: "What do you choose?"
  choices:
    - text: "Option A"
      goto: sceneA
    - text: "Option B"
      action:
        - type: setVar
          key: variable
          value: "new_value"
        - type: goToScene
          scene: sceneB
```

**Actions:**
```yaml
action:
  - type: setVar
    key: variableName
    value: "{{expression}}"
  - type: goToScene
    scene: targetScene
```

## Input Helpers

### Syntax
```yaml
"{{input \"variableName\" \"placeholder\" \"type\" \"options\"}}"
```

### Input Types

**Text Input:**
```yaml
- "{{input \"playerName\" \"Enter your name\" \"text\"}}"
```

**Number Input:**
```yaml
- "{{input \"age\" \"Your age\" \"number\" \"min:16,max:100\"}}"
```

**Select Dropdown:**
```yaml
- "{{input \"class\" \"Choose class\" \"select\" \"Warrior,Mage,Rogue\"}}"
```

**Checkbox:**
```yaml
- "{{input \"agreed\" \"I agree to terms\" \"checkbox\"}}"
```

**Radio Buttons:**
```yaml
- "{{input \"difficulty\" \"Difficulty\" \"radio\" \"Easy,Normal,Hard\"}}"
```

**Range Slider:**
```yaml
- "{{input \"volume\" \"Volume\" \"range\" \"min:0,max:100,step:5\"}}"
```

**Textarea:**
```yaml
- "{{input \"story\" \"Tell your story\" \"textarea\"}}"
```

### Variable Interpolation

Use Handlebars syntax to display variables:

```yaml
- "Hello {{playerName}}, your score is {{score}}!"
- "You chose {{favoriteColor}} as your favorite color."
- "{{#if hasKey}}You have the magic key!{{/if}}"
```

## Advanced Features

### Custom Styling

Add custom CSS to your compiled game:

```bash
vn-compiler compile story.yaml --css custom.css
```

**Example custom.css:**
```css
/* Override theme colors */
:root {
  --primary-color: #ff6b6b;
  --background-color: #2c3e50;
  --text-color: #ecf0f1;
}

/* Custom choice button styling */
.choice-button {
  background: linear-gradient(45deg, #ff6b6b, #ee5a6f);
  border-radius: 25px;
  box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3);
}

/* Custom input styling */
.vn-input {
  border: 2px solid var(--primary-color);
  border-radius: 10px;
  padding: 12px;
}
```

### Custom JavaScript

Inject custom JavaScript for analytics, integrations, or custom features:

```bash
vn-compiler compile story.yaml --js analytics.js
```

**Example analytics.js:**
```javascript
// Google Analytics integration
gtag('config', 'GA_MEASUREMENT_ID');

// Track story progress
window.vnRuntime.on('sceneChange', (sceneName) => {
  gtag('event', 'scene_change', {
    scene_name: sceneName,
    custom_parameter: 'value'
  });
});

// Track choices
window.vnRuntime.on('choiceMade', (choice) => {
  gtag('event', 'choice_made', {
    choice_text: choice.text,
    scene_name: choice.scene
  });
});
```

### Asset Management

Include images, audio, and video in your games:

```yaml
assets:
  - name: "forest_bg"
    url: "backgrounds/forest.jpg"
    type: "image"
    description: "Forest background"
  
  - name: "sword_sound"
    url: "sfx/sword.wav" 
    type: "audio"
    description: "Sword swing sound effect"

  - name: "intro_video"
    url: "videos/intro.mp4"
    type: "video"
    description: "Game introduction video"
```

**Supported Formats:**
- Images: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.svg`, `.bmp`
- Audio: `.mp3`, `.wav`, `.ogg`, `.m4a`, `.aac`, `.flac`  
- Video: `.mp4`, `.webm`, `.avi`, `.mov`, `.wmv`, `.flv`

### Static File Serving

During development, the server automatically serves files from your current directory:

```
project/
├── story.yaml          # Your main script
├── character.png       # → http://localhost:3000/character.png
├── audio/
│   └── bgm.mp3        # → http://localhost:3000/audio/bgm.mp3
└── backgrounds/
    └── forest.jpg     # → http://localhost:3000/backgrounds/forest.jpg
```

## Configuration

### Environment Variables

```bash
# Debug mode
export VN_DEBUG=true

# Custom port  
export VN_PORT=8080

# Asset directory
export VN_ASSETS_DIR=./game-assets
```

### Project Configuration

Create a `vn-config.json` file:

```json
{
  "title": "My Game",
  "author": "Developer Name", 
  "description": "Game description",
  "assets": {
    "directory": "./assets",
    "optimize": true
  },
  "build": {
    "minify": true,
    "target": "modern"
  },
  "dev": {
    "port": 3000,
    "watch": true,
    "livereload": true
  }
}
```

Use with:
```bash
vn-compiler compile story.yaml --config vn-config.json
```

## Deployment

### Single-File Deployment

VN Compiler produces completely self-contained HTML files:

```bash
# Production build
vn-compiler compile story.yaml --output game.html --minify

# Deploy anywhere - no server required!
# - Upload to web hosting
# - Share via email  
# - Distribute on CD/USB
# - Host on GitHub Pages
```

### Web Server Deployment

For advanced features like save games:

```bash
# Build with server features
vn-compiler compile story.yaml --output index.html --dev

# Deploy to web server
# - Apache/Nginx
# - Netlify/Vercel  
# - GitHub Pages
# - Any static host
```

## Troubleshooting

### Common Issues

**File watching not working:**
```bash
# Ensure watch is enabled (default)
vn-compiler serve story.yaml --watch

# Or explicitly disable
vn-compiler serve story.yaml --no-watch
```

**Missing custom JS file warning:**
```bash
# Remove --js flag if file doesn't exist
vn-compiler serve story.yaml
# Instead of: vn-compiler serve story.yaml --js missing-file.js
```

**Validation errors:**
```bash
# Check YAML structure
vn-compiler validate story.yaml --verbose

# Common fixes:
# - Ensure 'scenes:' section exists
# - Check asset 'name' fields are strings
# - Verify scene references in 'goto' statements
```

### Debug Mode

Enable detailed logging:

```bash
# Verbose compilation
vn-compiler compile story.yaml --verbose --dev

# Debug development server
vn-compiler serve story.yaml --verbose
```

## Documentation

- VN Engine Documentation: `./vn-EngineREADME.md` - Core engine features
- API Reference: Generated TypeScript documentation
- Examples: `./examples/` - Sample projects and templates

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make changes and test thoroughly
4. Build and test: `deno task build && deno task test`
5. Submit a pull request

## License

Released under the MIT License. See `LICENSE` file for details.

---

**Made with ❤️ by the VN Compiler Team**

Transform your stories into interactive experiences with the power of modern web technologies!
