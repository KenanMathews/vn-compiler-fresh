/**
 * CLI Help and Version Display
 */

export function showHelp(): void {
    console.log(`
🎮 VN Compiler - Visual Novel Compiler with Input Helpers

USAGE:
  vn-compiler <command> [options]

COMMANDS:
  compile <input>     Compile YAML script to HTML game
  validate <input>    Validate YAML script without compiling  
  init <name>         Create new VN project from template
  serve <input>       Start development server with hot reload

COMPILE OPTIONS:
  -o, --output <file>     Output HTML file (default: game.html)
  -a, --assets <dir>      Assets directory to process
  -c, --css <file>        Custom CSS file to include
  -j, --js <file>         Custom JavaScript file to include
  --minify                Minify HTML output (default: false)
  --dev                   Development mode with debug info

VALIDATE OPTIONS:
  -v, --verbose           Show detailed validation output

INIT OPTIONS:
  -t, --template <type>   Project template: basic, interactive, media-rich (default: basic)
  --directory <dir>       Create project in specific directory
  --author <name>         Set author name in project config
  --description <text>    Set project description

SERVE OPTIONS:
  -p, --port <number>     Port for dev server (default: 3000)
  -w, --watch             Watch for file changes (default: true)

GLOBAL OPTIONS:
  -h, --help              Show help information
  --version               Show version number
  --verbose               Enable verbose logging
  --config <file>         Load configuration from file

EXAMPLES:
  # Basic compilation
  vn-compiler compile story.yaml

  # Production build with assets
  vn-compiler compile story.yaml -o index.html -a ./assets --minify

  # Create new project
  vn-compiler init my-novel --template interactive --author "Your Name"

  # Development server
  vn-compiler serve story.yaml --port 8080

  # Validation only
  vn-compiler validate story.yaml --verbose

YAML INPUT HELPER SYNTAX:
  {{input:varName:placeholder:type}}
  {{input:varName:placeholder:type:options}}

INPUT TYPES:
  text                    Text input field
  number                  Number input with optional min/max/step
  select                  Dropdown with options (option1,option2,option3)
  checkbox                Checkbox for boolean values
  radio                   Radio buttons with options
  textarea                Multi-line text input
  range                   Slider with min/max/step values

INPUT EXAMPLES:
  {{input:playerName:Enter your name:text}}
  {{input:age:Your age:number:min:16,max:100}}
  {{input:class:Choose class:select:Warrior,Mage,Rogue}}
  {{input:difficulty:Difficulty:range:min:1,max:10,step:1}}

**Styling & Theming:**

The VN Compiler uses a single base theme that can be customized with CSS:

\`\`\`bash
# Add custom CSS on top of base theme
vn-compiler compile story.yaml --css custom.css
\`\`\`

**Base Theme Colors:**
- Primary: #e92932 (red accent)
- Background: #221112 (dark)
- Secondary: #472426 (dark red)
- Text: #ffffff (white)

ASSET SUPPORT:
  Images: .jpg, .jpeg, .png, .gif, .webp, .svg, .bmp
  Audio:  .mp3, .wav, .ogg, .m4a, .aac, .flac
  Video:  .mp4, .webm, .avi, .mov, .wmv, .flv

ASSET HELPERS:
  {{showImage "filename"}}
  {{playAudio "filename"}}  
  {{playVideo "filename"}}

For more information and examples:
  https://github.com/vn-compiler/vn-compiler

Report bugs and issues:
  https://github.com/vn-compiler/vn-compiler/issues
`);
}

export function showVersion(version: string): void {
    console.log(`
🎮 VN Compiler v${version}

A powerful Visual Novel compiler that transforms YAML scripts into 
standalone HTML games with embedded input helpers and assets.

Built with:
    • VN Engine for script execution
    • Handlebars for templating  
    • Deno/TypeScript for development
    • Modern web technologies

Copyright (c) 2024 VN Compiler Team
Released under the MIT License
`);
}

export function showCommandHelp(command: string): void {
    switch (command) {
      case 'compile':
        showCompileHelp();
        break;
      case 'validate':
        showValidateHelp();
        break;
      case 'init':
        showInitHelp();
        break;
      case 'serve':
        showServeHelp();
        break;
      default:
        console.log(`Unknown command: ${command}`);
        showHelp();
    }
}

function showCompileHelp(): void {
    console.log(`
🔨 VN Compiler - COMPILE Command

Compile YAML visual novel scripts into standalone HTML games.

USAGE:
  vn-compiler compile <input.yaml> [options]

REQUIRED:
  <input.yaml>            Path to YAML script file

OPTIONS:
  -o, --output <file>     Output HTML file (default: game.html)
  -a, --assets <dir>      Directory containing game assets
  -c, --css <file>        Custom CSS file to include
  -j, --js <file>         Custom JavaScript file to include
  --minify                Minify HTML output (default: false)
  --dev                   Include debug information and tools

EXAMPLES:
  # Basic compilation
  vn-compiler compile story.yaml

  # Full production build
  vn-compiler compile story.yaml \\
    --output dist/game.html \\
    --assets ./assets \\
    --minify

  # Development build with custom styling
  vn-compiler compile story.yaml \\
    --css custom.css \\
    --js custom.js \\
    --dev

YAML SCRIPT FORMAT:
  intro:
    - "Welcome to the game!"
    - "What's your name? {{input:playerName:Enter name:text}}"
    - "Hello {{playerName}}!"

  chapter1:
    - speaker: "Narrator"
      text: "Your adventure begins..."
      choices:
        - text: "Go left"
          goto: "left_path"
        - text: "Go right" 
          goto: "right_path"
`);
}

function showValidateHelp(): void {
    console.log(`
✅ VN Compiler - VALIDATE Command

Validate YAML visual novel scripts without compiling.

USAGE:
  vn-compiler validate <input.yaml> [options]

REQUIRED:
  <input.yaml>            Path to YAML script file

OPTIONS:
  -v, --verbose           Show detailed validation information
  --config <file>         Use custom validation rules

VALIDATION CHECKS:
  • YAML syntax and structure
  • Scene references and flow
  • Input helper syntax
  • Asset references
  • Variable usage
  • Template syntax

EXAMPLES:
  # Basic validation
  vn-compiler validate story.yaml

  # Detailed validation output
  vn-compiler validate story.yaml --verbose

EXIT CODES:
  0    Validation successful
  1    Validation failed with errors
  2    File not found or permission error
`);
}

function showInitHelp(): void {
    console.log(`
🚀 VN Compiler - INIT Command

Create new visual novel projects from templates.

USAGE:
  vn-compiler init <project-name> [options]

REQUIRED:
  <project-name>          Name of the project to create

OPTIONS:
  -t, --template <type>   Template type (default: basic)
  --directory <dir>       Create in specific directory
  --author <name>         Set author name
  --description <text>    Set project description
  --title <title>         Set game title

TEMPLATES:
  basic                   Simple story with text and choices
  interactive             Story with input helpers and variables
  media-rich              Full-featured with assets and themes

EXAMPLES:
  # Basic project
  vn-compiler init my-novel

  # Interactive project with metadata
  vn-compiler init adventure-game \\
    --template interactive \\
    --author "Jane Developer" \\
    --title "The Great Adventure" \\
    --description "An epic interactive story"

  # Media-rich project in custom directory
  vn-compiler init epic-novel \\
    --template media-rich \\
    --directory ./projects/

CREATED STRUCTURE:
  my-novel/
  ├── story.yaml          # Main script file
  ├── vn-config.json      # Project configuration
  ├── assets/             # Assets directory
  │   ├── images/
  │   ├── audio/
  │   └── video/
  ├── styles/
  │   └── custom.css      # Custom styling
  ├── scripts/
  │   └── custom.js       # Custom JavaScript
  └── README.md           # Project documentation
`);
}

function showServeHelp(): void {
    console.log(`
🌐 VN Compiler - SERVE Command

Start development server with hot reload for rapid prototyping.

USAGE:
  vn-compiler serve <input.yaml> [options]

REQUIRED:
  <input.yaml>            Path to YAML script file

OPTIONS:
  -p, --port <number>     Server port (default: 3000)
  -w, --watch             Watch for file changes (default: true)
  --no-watch              Disable file watching
  --assets <dir>          Assets directory to serve

FEATURES:
  • Live reload on file changes
  • Real-time compilation
  • Asset serving
  • Error reporting
  • Debug information

EXAMPLES:
  # Start development server
  vn-compiler serve story.yaml

  # Custom port with assets
  vn-compiler serve story.yaml \\
    --port 8080 \\
    --assets ./game-assets

  # Production preview (no watch)
  vn-compiler serve story.yaml \\
    --no-watch

SERVER ENDPOINTS:
  /                       Game HTML
  /assets/*               Static assets
  /api/reload             WebSocket for live reload
  /api/status             Compilation status
  /api/validate           Script validation
`);
}
