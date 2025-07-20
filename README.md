# VN Compiler - Visual Novel Development Framework

A powerful, production-ready compiler that transforms YAML narratives into standalone HTML games. Built on the robust VN Engine library with advanced tooling, modern development workflows, and sophisticated input systems.

## Key Features

- Single-File Compilation - Complete games in standalone HTML files with embedded assets
- Development Server - Live reload, validation API, and static file serving
- API Server - Remote compilation for web applications and tools
- Advanced Input System - Rich form controls with real-time validation
- Interactive Components - Persistent UI elements with lifecycle management
- Built-in Themes - 5 professional themes for different story genres
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
- Interactive Components
- API Server & Remote Compilation
- Advanced Features
- External Dependencies
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
styles:
  theme: "ocean_blue"

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
  --theme mystical_purple \
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
- `--theme <name>` - Built-in theme: `dark_historical`, `ocean_blue`, `forest_green`, `mystical_purple`, `clean_light`
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

### server - API Server for Remote Compilation

Start an API server that allows remote compilation from web applications and other tools.

```bash
# Start API server on default port 8080
vn-compiler server

# Custom port and CORS settings
vn-compiler server \
  --port 9000 \
  --cors "https://myapp.com" \
  --workdir /tmp/vn-sessions

# Production API server
vn-compiler server \
  --port 8080 \
  --cors "*" \
  --verbose
```

**Options:**
- `-p, --port <number>` - Server port (default: `8080`)
- `--cors <origin>` - CORS origin (default: `*`)
- `--workdir <path>` - Working directory for sessions (default: `./vn-server-temp`)
- `--verbose` - Enable detailed logging

**API Endpoints:**
- `POST /api/session` - Create new compilation session
- `POST /api/session/:id/script` - Upload YAML script content
- `POST /api/session/:id/asset` - Upload asset file  
- `POST /api/session/:id/compile` - Compile the project
- `GET /api/session/:id/download` - Download compiled HTML
- `GET /api/session/:id/status` - Get session status
- `DELETE /api/session/:id` - Delete session
- `GET /health` - Health check endpoint

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
styles:
  theme: "ocean_blue"

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

**Button Input:**
```yaml
- "{{input \"actionBtn\" \"Click Me\" \"button\" \"type:primary,action:start_game,icon:⚡\"}}"
- "{{input \"menuBtn\" \"Settings\" \"button\" \"type:menu,scene:settings,confirm:true\"}}"
```

**Button Options:**
- `type`: `primary`, `secondary`, `menu`, `choice`, `custom`
- `action`: Custom action to trigger
- `scene`: Scene to navigate to
- `setVar`: Variable to set (format: `varName:value`)
- `call`: Function to call
- `confirm`: Show confirmation dialog (`true`/`false`)
- `confirmText`: Custom confirmation message
- `icon`: Icon to display (emoji, HTML, or CSS class)
- `size`: `large` for bigger buttons
- `disabled`: `true` to disable button
- `loading`: `true` to show loading spinner

### Variable Interpolation

Use Handlebars syntax to display variables:

```yaml
- "Hello {{playerName}}, your score is {{score}}!"
- "You chose {{favoriteColor}} as your favorite color."
- "{{#if hasKey}}You have the magic key!{{/if}}"
```

## Interactive Components

Create persistent UI components that enhance your visual novel with custom interactive elements.

### Creating Components

Use the `{{component}}` helper to create, mount, and control components:

```yaml
scenes:
  chapter1:
    - "Welcome to Chapter 1!"
    # Create a persistent status bar
    - '{{component "create" "StatusBar" "components/status-bar.js" "components/status-bar.css" "status-ui" "persistent=true,playerName={{playerName}},score={{score}}"}}'
    - "Your adventure begins now..."
```

### Component Lifecycle & Cleanup

**Automatic Cleanup:**
- **Scene Components**: Automatically destroyed when leaving a scene
- **Persistent Components**: Survive scene transitions and must be manually unmounted
- **Save/Load**: Component states are preserved in save games

**Cleanup Examples:**
```yaml
# Scene component - auto-cleanup
- '{{component "create" "BattleUI" "battle.js" "battle.css" "battle" "health={{health}}"}}'

# Persistent component - manual cleanup required  
- '{{component "create" "StatusBar" "status.js" "status.css" "status" "persistent=true"}}'
# Later, manually remove:
- '{{component "unmount" "StatusBar-status"}}'
```

**Component State Management:**
- Components can implement `getState()` and `setState()` for save/load
- Visibility states are automatically preserved
- Scene change notifications for persistent components via `onSceneChange()`

### Component Lifecycle

**Create and Mount:**
```yaml
- '{{component "create" "ComponentName" "script.js" "style.css" "instance-id" "config=value,option=true"}}'
```

**Update Component:**
```yaml
- '{{component "update" "ComponentName-instance-id" "newValue={{variable}},score={{score}}"}}'
```

**Show/Hide:**
```yaml
- '{{component "show" "ComponentName-instance-id"}}'
- '{{component "hide" "ComponentName-instance-id"}}'
```

**Remove Component:**
```yaml
- '{{component "unmount" "ComponentName-instance-id"}}'
```

### Component Types

**Persistent Components** - Survive scene transitions:
```yaml
- '{{component "create" "InventoryUI" "inventory.js" "inventory.css" "inv" "persistent=true,items={{inventory}}"}}'
```

**Scene Components** - Auto-cleanup on scene change:
```yaml
- '{{component "create" "BattleUI" "battle.js" "battle.css" "battle" "health={{health}},mana={{mana}}"}}'
```

### Example Component Class

**components/status-bar.js:**
```javascript
class StatusBar extends BaseVNComponent {
  constructor(vnEngine, config = {}) {
    super(vnEngine, config);
    this.playerName = config.playerName || 'Player';
    this.score = config.score || 0;
  }

  render() {
    return `
      <div class="status-bar">
        <span class="player-name">${this.playerName}</span>
        <span class="score">Score: ${this.score}</span>
      </div>
    `;
  }

  update(newConfig) {
    this.playerName = newConfig.playerName || this.playerName;
    this.score = newConfig.score || this.score;
    this.refresh();
  }
}
```

## API Server & Remote Compilation

The VN Compiler includes a powerful API server that enables remote compilation from web applications, mobile apps, and other tools. This allows you to build visual novel editors, online platforms, and integrated development environments.

### Starting the API Server

```bash
# Basic API server
vn-compiler server

# Production configuration
vn-compiler server \
  --port 8080 \
  --cors "https://yourdomain.com" \
  --workdir /var/vn-sessions \
  --verbose
```

### API Workflow

1. **Create Session** - Initialize a new compilation workspace
2. **Upload Script** - Send your YAML visual novel script
3. **Upload Assets** - Upload images, audio, and other files
4. **Compile** - Transform everything into a standalone HTML game
5. **Download** - Retrieve the completed game file

### Session Management

**Create a New Session:**
```javascript
const response = await fetch('http://localhost:8080/api/session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'My Visual Novel',
    author: 'Your Name',
    description: 'An epic adventure',
    customCSS: 'body { background: #000; }',
    minify: true
  })
});

const session = await response.json();
console.log('Session ID:', session.sessionId);
```

**Upload YAML Script:**
```javascript
// Method 1: Raw YAML content
await fetch(`http://localhost:8080/api/session/${sessionId}/script`, {
  method: 'POST',
  headers: { 'Content-Type': 'text/plain' },
  body: yamlContent
});

// Method 2: Form data with file
const formData = new FormData();
formData.append('script', scriptFile);
await fetch(`http://localhost:8080/api/session/${sessionId}/script`, {
  method: 'POST',
  body: formData
});
```

**Upload Assets:**
```javascript
const formData = new FormData();
formData.append('asset', imageFile);
formData.append('filename', 'character.png');

await fetch(`http://localhost:8080/api/session/${sessionId}/asset`, {
  method: 'POST',
  body: formData
});
```

**Compile Project:**
```javascript
const compileResponse = await fetch(`http://localhost:8080/api/session/${sessionId}/compile`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    minify: true,
    title: 'Custom Game Title'
  })
});

const result = await compileResponse.json();
if (result.status === 'compiled') {
  console.log('✅ Compilation successful!');
  console.log('Stats:', result.stats);
} else {
  console.error('❌ Compilation failed:', result.error);
}
```

**Download Compiled Game:**
```javascript
const gameResponse = await fetch(`http://localhost:8080/api/session/${sessionId}/download`);
const gameHTML = await gameResponse.text();

// Save to file or display in iframe
const blob = new Blob([gameHTML], { type: 'text/html' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'my-game.html';
a.click();
```

### Session Status & Management

**Check Session Status:**
```javascript
const status = await fetch(`http://localhost:8080/api/session/${sessionId}/status`)
  .then(r => r.json());

console.log('Session status:', status.status); // 'created', 'ready', 'compiled'
console.log('Has script:', status.hasScript);
console.log('Asset count:', status.assetCount);
console.log('Has compiled output:', status.hasCompiledOutput);
```

**Delete Session:**
```javascript
await fetch(`http://localhost:8080/api/session/${sessionId}`, {
  method: 'DELETE'
});
```

### Error Handling

```javascript
async function compileVisualNovel(yamlContent, assets = []) {
  try {
    // Create session
    const session = await fetch('http://localhost:8080/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'My Game' })
    }).then(r => r.json());

    const sessionId = session.sessionId;

    // Upload script
    await fetch(`http://localhost:8080/api/session/${sessionId}/script`, {
      method: 'POST',
      body: yamlContent
    });

    // Upload assets
    for (const asset of assets) {
      const formData = new FormData();
      formData.append('asset', asset.file);
      formData.append('filename', asset.filename);
      
      await fetch(`http://localhost:8080/api/session/${sessionId}/asset`, {
        method: 'POST',
        body: formData
      });
    }

    // Compile
    const compileResult = await fetch(`http://localhost:8080/api/session/${sessionId}/compile`, {
      method: 'POST'
    }).then(r => r.json());

    if (compileResult.status !== 'compiled') {
      throw new Error(compileResult.error || 'Compilation failed');
    }

    // Download
    const gameHTML = await fetch(`http://localhost:8080/api/session/${sessionId}/download`)
      .then(r => r.text());

    // Cleanup
    await fetch(`http://localhost:8080/api/session/${sessionId}`, {
      method: 'DELETE'
    });

    return gameHTML;

  } catch (error) {
    console.error('Compilation failed:', error);
    throw error;
  }
}
```

### Integration Examples

**React Component:**
```jsx
function VisualNovelCompiler() {
  const [script, setScript] = useState('');
  const [compiling, setCompiling] = useState(false);
  const [result, setResult] = useState(null);

  const handleCompile = async () => {
    setCompiling(true);
    try {
      const gameHTML = await compileVisualNovel(script);
      setResult(gameHTML);
    } catch (error) {
      console.error('Failed to compile:', error);
    } finally {
      setCompiling(false);
    }
  };

  return (
    <div>
      <textarea 
        value={script}
        onChange={(e) => setScript(e.target.value)}
        placeholder="Enter your YAML script..."
      />
      <button onClick={handleCompile} disabled={compiling}>
        {compiling ? 'Compiling...' : 'Compile Game'}
      </button>
      {result && (
        <iframe 
          srcDoc={result}
          style={{ width: '100%', height: '600px' }}
        />
      )}
    </div>
  );
}
```

**Node.js Backend:**
```javascript
const express = require('express');
const multer = require('multer');
const fetch = require('node-fetch');

const app = express();
const upload = multer();

app.post('/compile-vn', upload.fields([
  { name: 'script' },
  { name: 'assets' }
]), async (req, res) => {
  try {
    const vnCompilerAPI = 'http://localhost:8080';
    
    // Create session
    const session = await fetch(`${vnCompilerAPI}/api/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: req.body.title })
    }).then(r => r.json());

    // Upload script and assets
    // ... (implementation similar to examples above)

    // Return compiled game
    const gameHTML = await fetch(`${vnCompilerAPI}/api/session/${session.sessionId}/download`)
      .then(r => r.text());
    
    res.setHeader('Content-Type', 'text/html');
    res.send(gameHTML);
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## Advanced Features

### Built-in Themes & Styling

VN Compiler includes 5 professionally designed themes that can be applied to your visual novels. Themes use CSS variables for consistent styling and can be customized further with custom CSS.

#### Available Themes

**Dark Themes:**

- **`dark_historical`** (default) - Classic dark red theme for dramatic historical narratives
- **`ocean_blue`** - Cool blue theme for sci-fi and technological narratives  
- **`forest_green`** - Natural green theme for adventure and nature stories
- **`mystical_purple`** - Purple theme for fantasy and magical stories

**Light Themes:**

- **`clean_light`** - Minimal light theme for educational and accessible content

#### Using Themes

**In YAML Metadata:**
```yaml
title: "My Visual Novel"
author: "Your Name"
styles:
  theme: "ocean_blue"  # Set theme for the entire game

scenes:
  intro:
    - "Welcome to the sci-fi adventure!"
```

**Via CLI:**
```bash
# Compile with specific theme
vn-compiler compile story.yaml --theme ocean_blue

# Theme + custom CSS
vn-compiler compile story.yaml \
  --theme mystical_purple \
  --css custom.css
```

**Via API Server:**
```javascript
// Set theme in session creation
const session = await fetch('http://localhost:8080/api/session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'My Game',
    theme: 'forest_green'  // Apply theme
  })
});
```

#### Theme Variables

Each theme provides CSS variables you can use in custom CSS:

```css
/* Primary colors */
--vn-bg-primary          /* Main background */
--vn-bg-secondary        /* Secondary background */
--vn-accent-primary      /* Primary accent color */
--vn-text-primary        /* Main text color */

/* Component colors */
--vn-component-persistent /* Persistent component indicator */
--vn-component-scene     /* Scene component indicator */

/* Utility colors */
--vn-success-color       /* Success state */
--vn-error-color         /* Error state */
--vn-warning-color       /* Warning state */

/* Legacy compatibility */
--primary-color          /* Backwards compatibility */
--background-color       /* Backwards compatibility */
--text-color            /* Backwards compatibility */
```

#### Custom Theme Example

```css
/* custom.css - Override theme variables */
:root {
  --vn-accent-primary: #ff6b6b;        /* Custom accent */
  --vn-bg-primary: #1a1a2e;           /* Custom background */
  --vn-text-primary: #e94560;         /* Custom text color */
}

/* Style specific components */
.vn-choice-button {
  background: linear-gradient(45deg, var(--vn-accent-primary), var(--vn-accent-secondary));
  border-radius: 15px;
  box-shadow: 0 4px 15px var(--vn-shadow-accent);
}

.vn-input {
  border: 2px solid var(--vn-accent-primary);
  background: var(--vn-bg-secondary);
  color: var(--vn-text-primary);
}
```

### Button Actions & Events

Buttons support rich interactions beyond simple clicks:

```javascript
// Listen for button actions
window.addEventListener('vn-button-action', (event) => {
  const { action, button, varName } = event.detail;
  console.log(`Button action: ${action}`);
});

// Custom button functions
window.myCustomAction = (buttonElement, varName) => {
  // Your custom logic here
  console.log(`Custom action for ${varName}`);
};
```

**Button Features:**
- Loading states with spinners
- Confirmation dialogs
- Variable setting
- Scene navigation
- Custom function calls
- Icon support (emoji, SVG, CSS classes)
- Accessibility features (ARIA labels, keyboard navigation)

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

### External Dependencies

Include external JavaScript libraries in your visual novels using the dependency system. Add popular libraries like Lodash, Chart.js, and animation frameworks to enhance your games.

#### YAML Configuration

**Full Dependency Configuration:**
```yaml
title: "My Game"
dependencies:
  - name: "lodash"
    version: "4.17.21"
    url: "https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.21/lodash.min.js"
    type: "script"
  - name: "chart.js"
    version: "3.9.1"
    url: "https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js"
    type: "script"

scenes:
  intro:
    - "Welcome to a game with external libraries!"
```

**Quick Dependencies (Popular Libraries):**
```yaml
dependencies_quick:
  - "lodash@4.17.21"
  - "chart.js@3.9.1"
  - "anime.js@3.2.1"
```

#### Using Dependencies

Dependencies are available in custom JavaScript and components:

```javascript
// Use in custom.js
const uniqueItems = _.uniq(gameState.inventory);

// Create charts
const chart = new Chart(ctx, {
  type: 'bar',
  data: { labels: ['HP', 'MP'], datasets: [{ data: [100, 50] }] }
});

// Animate elements
anime({ targets: '.choice', scale: [1, 1.1, 1], duration: 300 });
```

#### Compilation

```bash
# Dependencies loaded automatically
vn-compiler compile story.yaml

# Development server shows dependency status
vn-compiler serve story.yaml
# Output: 📦 Processed 3 dependencies (1 bundled, 2 CDN)
```

Dependencies are loaded from CDN by default for optimal performance. The compiler automatically handles bundling and provides statistics about loaded libraries.

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

### API Server Deployment

Deploy the VN Compiler as a service for remote compilation:

```bash
# Production API server
vn-compiler server \
  --port 8080 \
  --cors "https://yourdomain.com" \
  --workdir /var/vn-sessions

# Or with Docker
docker run -p 8080:8080 -v /var/vn-sessions:/app/sessions vn-compiler server
```

**Use Cases:**
- **Web-based Visual Novel Editors**: Integrate compilation into browser-based tools
- **Mobile App Backends**: Compile VN games from mobile applications  
- **Content Management Systems**: Allow non-technical users to create games
- **Educational Platforms**: Provide VN creation tools for students
- **Game Development Pipelines**: Automated compilation in CI/CD workflows

### Production Deployment

**Docker Setup:**
```dockerfile
FROM denoland/deno:1.40.0

WORKDIR /app
COPY . .
RUN deno cache cli.ts

EXPOSE 8080
CMD ["deno", "run", "--allow-all", "cli.ts", "server", "--port", "8080"]
```

**Environment Variables:**
```bash
# API server configuration
VN_API_PORT=8080
VN_CORS_ORIGIN=https://yourdomain.com
VN_WORK_DIR=/var/vn-sessions
VN_VERBOSE=true
```

### Security Considerations

- **CORS Configuration**: Set specific origins in production, not `*`
- **Rate Limiting**: Implement rate limiting for API endpoints
- **File Upload Limits**: Monitor asset upload sizes
- **Session Cleanup**: Sessions auto-cleanup, but monitor disk usage
- **Input Validation**: Validate YAML content and asset types

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