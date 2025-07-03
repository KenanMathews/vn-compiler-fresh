import type { CLIArgs, InitProjectOptions, ProjectConfig, Logger } from "../../types/compiler.ts";
import { ensureDir } from "@std/fs";
import { join } from "@std/path";

/**
 * Init command implementation
 * Creates new VN projects from templates
 */
export async function initCommand(args: CLIArgs, logger: Logger): Promise<void> {
  try {
    if (args._.length < 2) {
      logger.error("❌ Project name is required");
      logger.info("Usage: vn-compiler init <project-name> [options]");
      logger.info("Run 'vn-compiler help init' for more information");
      Deno.exit(1);
    }

    const projectName = args._[1];
    logger.info(`🚀 Creating new VN project: ${projectName}`);

    const validTemplates = ['basic', 'interactive', 'media-rich'] as const;
    const template = args.template && validTemplates.includes(args.template) 
      ? args.template 
      : 'basic';
      
    const options: InitProjectOptions = {
      name: projectName,
      template,
      directory: args.directory || './',
      title: args.title || projectName,
      author: args.author,
      description: args.description
    };

    validateInitOptions(options, logger);

    const creator = new ProjectCreator(logger);
    await creator.createProject(options);

    logger.info(`✅ Project '${projectName}' created successfully!`);
    logger.info("📝 Next steps:");
    logger.info(`   1. cd ${projectName}/`);
    logger.info("   2. Edit story.yaml to create your visual novel");
    logger.info("   3. vn-compiler compile story.yaml");
    logger.info("   4. Open the generated HTML file in a browser");

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`❌ Project creation failed: ${errorMessage}`);
    
    if (args.verbose && error instanceof Error && error.stack) {
      logger.debug("Stack trace:");
      logger.debug(error.stack);
    }
    
    Deno.exit(1);
  }
}

/**
 * Project Creator class
 */
class ProjectCreator {
  constructor(private logger: Logger) {}

  async createProject(options: InitProjectOptions): Promise<void> {
    const projectPath = join(options.directory || './', options.name);
    
    try {
      const stat = await Deno.stat(projectPath);
      if (stat.isDirectory) {
        throw new Error(`Directory '${options.name}' already exists`);
      }
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) {
        throw error;
      }
    }

    this.logger.step(1, 6, "Creating directory structure...");
    await this.createDirectoryStructure(projectPath);

    this.logger.step(2, 6, "Generating project configuration...");
    await this.createProjectConfig(projectPath, options);

    this.logger.step(3, 6, "Creating story template...");
    await this.createStoryTemplate(projectPath, options);

    this.logger.step(4, 6, "Setting up assets...");
    await this.createAssetsStructure(projectPath, options);

    this.logger.step(5, 6, "Creating style templates...");
    await this.createStyleTemplates(projectPath, options);

    this.logger.step(6, 6, "Generating documentation...");
    await this.createDocumentation(projectPath, options);

    this.logger.success("🎉 Project structure created!");
  }

  private async createDirectoryStructure(projectPath: string): Promise<void> {
    const directories = [
      projectPath,
      join(projectPath, 'assets'),
      join(projectPath, 'assets', 'images'),
      join(projectPath, 'assets', 'audio'),
      join(projectPath, 'assets', 'video'),
      join(projectPath, 'styles'),
      join(projectPath, 'scripts'),
      join(projectPath, 'dist')
    ];

    for (const dir of directories) {
      await ensureDir(dir);
      this.logger.debug(`📁 Created directory: ${dir}`);
    }
  }

  private async createProjectConfig(projectPath: string, options: InitProjectOptions): Promise<void> {
    const config: ProjectConfig = {
      title: options.title || options.name,
      author: options.author,
      description: options.description,
      version: "1.0.0",
      input: "story.yaml",
      output: "dist/index.html",
      assetsDir: "assets",
      theme: "base",
      customCSS: "styles/custom.css",
      customJS: "scripts/custom.js",
      minify: false,
      metadata: {
        created: new Date().toISOString(),
        template: options.template,
        tags: ["visual-novel", "interactive-fiction"]
      }
    };

    const configPath = join(projectPath, 'vn-config.json');
    await Deno.writeTextFile(configPath, JSON.stringify(config, null, 2));
    this.logger.debug(`📋 Created config: ${configPath}`);
  }

  private async createStoryTemplate(projectPath: string, options: InitProjectOptions): Promise<void> {
    let template: string;

    switch (options.template) {
      case 'basic':
        template = this.getBasicStoryTemplate(options);
        break;
      case 'interactive':
        template = this.getInteractiveStoryTemplate(options);
        break;
      case 'media-rich':
        template = this.getMediaRichStoryTemplate(options);
        break;
      default:
        template = this.getBasicStoryTemplate(options);
    }

    const storyPath = join(projectPath, 'story.yaml');
    await Deno.writeTextFile(storyPath, template);
    this.logger.debug(`📖 Created story: ${storyPath}`);
  }

  private async createAssetsStructure(projectPath: string, options: InitProjectOptions): Promise<void> {
    if (options.template === 'media-rich') {
      await this.createPlaceholderAssets(projectPath);
    }

    const assetsReadme = `# Assets Directory

This directory contains all game assets:

## Images (/images)
- Character portraits
- Background images  
- UI elements
- Supported formats: .jpg, .jpeg, .png, .gif, .webp, .svg, .bmp

## Audio (/audio)
- Background music
- Sound effects
- Voice acting
- Supported formats: .mp3, .wav, .ogg, .m4a, .aac, .flac

## Video (/video)  
- Cutscenes
- Animated sequences
- Supported formats: .mp4, .webm, .avi, .mov, .wmv, .flv

## Asset Usage in YAML

\`\`\`yaml
scene_name:
  - "{{showImage 'character-portrait'}}"
  - "{{playAudio 'background-music'}}"
  - text: "A dramatic moment unfolds..."
    actions:
      - type: playVideo
        asset: cutscene-intro
\`\`\`

## Asset Optimization Tips

- Keep images under 1MB for faster loading
- Use .webp format for better compression
- Compress audio files appropriately
- Consider progressive JPEG for large images
`;

    const readmePath = join(projectPath, 'assets', 'README.md');
    await Deno.writeTextFile(readmePath, assetsReadme);
  }

  private async createPlaceholderAssets(projectPath: string): Promise<void> {
    const placeholderSVG = `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#f0f0f0"/>
  <text x="50%" y="50%" font-family="Arial" font-size="16" fill="#666" text-anchor="middle" dy="0.3em">
    Placeholder Image
  </text>
</svg>`;

    const imagePath = join(projectPath, 'assets', 'images', 'placeholder.svg');
    await Deno.writeTextFile(imagePath, placeholderSVG);
    this.logger.debug(`🖼️  Created placeholder image: ${imagePath}`);
  }

  private async createStyleTemplates(projectPath: string, options: InitProjectOptions): Promise<void> {
    const customCSS = `


:root {
  --primary-color: #007bff;
  --secondary-color: #6c757d;
  --background-color: #ffffff;
  --text-color: #333333;
}


.vn-dialogue {
  
}

.vn-speaker {
  
}

.vn-choice {
  
}


.vn-input {
  
}


.vn-scene[data-scene-type="intro"] {
  text-align: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.vn-scene[data-scene-type="ending"] {
  background: #f8f9fa;
  border: 2px solid #28a745;
}


@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.vn-dialogue {
  animation: fadeIn 0.5s ease-out;
}


@media (max-width: 768px) {
  .vn-container {
    padding: 10px;
    margin: 10px;
  }
  
  .vn-choice {
    font-size: 14px;
    padding: 10px 15px;
  }
}


@media print {
  .vn-controls {
    display: none;
  }
  
  .vn-dialogue {
    break-inside: avoid;
  }
}
`;

    const cssPath = join(projectPath, 'styles', 'custom.css');
    await Deno.writeTextFile(cssPath, customCSS);
    this.logger.debug(`🎨 Created CSS: ${cssPath}`);

    const customJS = `

window.addEventListener('vn-game-ready', function(event) {
  console.log('🎮 Game is ready!', event.detail);
  
  initializeCustomFeatures();
});

function initializeCustomFeatures() {
  setupKeyboardShortcuts();
  
  addCustomUI();
  
}

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', function(event) {
    if (event.code === 'Space' || event.code === 'Enter') {
      const continueBtn = document.getElementById('vn-continue');
      if (continueBtn && continueBtn.style.display !== 'none') {
        continueBtn.click();
        event.preventDefault();
      }
    }
    
    if (event.code.startsWith('Digit')) {
      const choiceIndex = parseInt(event.code.replace('Digit', '')) - 1;
      const choices = document.querySelectorAll('.vn-choice');
      if (choices[choiceIndex]) {
        choices[choiceIndex].click();
        event.preventDefault();
      }
    }
    
    if (event.code === 'KeyS' && event.ctrlKey) {
      const saveBtn = document.getElementById('vn-save');
      if (saveBtn) {
        saveBtn.click();
        event.preventDefault();
      }
    }
  });
}

function addCustomUI() {
  const progressBar = document.createElement('div');
  progressBar.id = 'progress-bar';
  progressBar.style.cssText = \`
    position: fixed;
    top: 0;
    left: 0;
    width: 0%;
    height: 3px;
    background: var(--primary-color, #007bff);
    transition: width 0.3s ease;
    z-index: 1000;
  \`;
  document.body.appendChild(progressBar);
  
  window.addEventListener('vn-scene-changed', function(event) {
    const totalScenes = window.VN_RUNTIME_DATA?.config?.totalScenes || 1;
    const currentIndex = event.detail.history.length;
    const progress = (currentIndex / totalScenes) * 100;
    progressBar.style.width = Math.min(progress, 100) + '%';
  });
}

function customSaveHandler(saveData) {
  console.log('💾 Custom save handler', saveData);
  
  const customSaveKey = '${options.name.replace(/[^a-zA-Z0-9]/g, '_')}_save';
  localStorage.setItem(customSaveKey, JSON.stringify(saveData));
}

function customLoadHandler() {
  console.log('📁 Custom load handler');
  
  const customSaveKey = '${options.name.replace(/[^a-zA-Z0-9]/g, '_')}_save';
  const saveData = localStorage.getItem(customSaveKey);
  
  if (saveData) {
    try {
      return JSON.parse(saveData);
    } catch (error) {
      console.error('Failed to parse save data:', error);
    }
  }
  
  return null;
}

window.customGameFeatures = {
  save: customSaveHandler,
  load: customLoadHandler
};
`;

    const jsPath = join(projectPath, 'scripts', 'custom.js');
    await Deno.writeTextFile(jsPath, customJS);
    this.logger.debug(`⚙️  Created JS: ${jsPath}`);
  }

  private async createDocumentation(projectPath: string, options: InitProjectOptions): Promise<void> {
    const readme = `# ${options.title || options.name}

${options.description ? `${options.description}\n\n` : ''}A visual novel created with VN Compiler.

## Project Structure

\`\`\`
${options.name}/
├── story.yaml          # Main visual novel script
├── vn-config.json      # Project configuration
├── assets/             # Game assets (images, audio, video)
│   ├── images/
│   ├── audio/
│   └── video/
├── styles/
│   └── custom.css      # Custom styling
├── scripts/
│   └── custom.js       # Custom JavaScript
├── dist/               # Compiled output
└── README.md           # This file
\`\`\`

## Getting Started

1. **Edit the Story**: Open \`story.yaml\` and create your visual novel
2. **Add Assets**: Place images, audio, and video files in the \`assets/\` directory
3. **Customize Styling**: Modify \`styles/custom.css\` to change the appearance
4. **Add Interactivity**: Edit \`scripts/custom.js\` for custom functionality

## Compilation

### Basic Compilation
\`\`\`bash
vn-compiler compile story.yaml
\`\`\`

### Production Build
\`\`\`bash
vn-compiler compile story.yaml --output dist/game.html --assets assets --minify
\`\`\`

### Development Server
\`\`\`bash
vn-compiler serve story.yaml --port 3000
\`\`\`

## YAML Script Guide

### Basic Scene Structure
\`\`\`yaml
scene_name:
  - "Simple dialogue text"
  - speaker: "Character Name"
    text: "Dialogue with speaker"
  - text: "Text with choices"
    choices:
      - text: "Choice 1"
        goto: "scene1"
      - text: "Choice 2"  
        goto: "scene2"
\`\`\`

### Input Helpers
\`\`\`yaml
intro:
  - "What's your name?"
  - "{{input:playerName:Enter your name:text}}"
  - "Hello {{playerName}}!"
  - "How old are you?"
  - "{{input:age:Your age:number:min:16,max:100}}"
\`\`\`

### Assets
\`\`\`yaml
scene_with_media:
  - "{{showImage 'character-portrait'}}"
  - "{{playAudio 'background-music'}}"
  - text: "Enjoy this scene with media!"
\`\`\`

### Variables and Flags
\`\`\`yaml
game_logic:
  - text: "Making a choice affects the story"
    choices:
      - text: "Be kind"
        actions:
          - type: setFlag
            flag: "kind_player"
          - type: addVar
            key: "karma"
            value: 1
        goto: "kind_path"
      - text: "Be mean"
        actions:
          - type: setFlag  
            flag: "mean_player"
          - type: addVar
            key: "karma"
            value: -1
        goto: "mean_path"

kind_path:
  - text: "{{#if hasFlag('kind_player')}}Your kindness is remembered.{{/if}}"

mean_path:
  - text: "{{#if hasFlag('mean_player')}}Your meanness has consequences.{{/if}}"
\`\`\`

## Configuration

Edit \`vn-config.json\` to customize project settings:

\`\`\`json
{
  "title": "${options.title || options.name}",
  "theme": "modern",
  "customCSS": "styles/custom.css",
  "customJS": "scripts/custom.js",
  "minify": false
}
\`\`\`

## Themes

Available themes:
- **modern**: Clean, contemporary design with gradients
- **classic**: Traditional serif fonts with simple borders  
- **dark**: Dark mode theme with blue accents

## Asset Guidelines

- **Images**: Keep under 1MB, use .webp for better compression
- **Audio**: Use .mp3 or .ogg for good browser support
- **Video**: Use .mp4 for best compatibility

## Deployment

After compilation, the generated HTML file is completely standalone:

1. Upload \`dist/game.html\` to any web hosting service
2. No server-side requirements - works with static hosting
3. All assets are embedded or referenced appropriately

## Resources

- [VN Compiler Documentation](https://github.com/vn-compiler/vn-compiler)
- [VN Engine Documentation](https://github.com/vn-engine/vn-engine)
- [Handlebars Template Guide](https://handlebarsjs.com/guide/)
- [YAML Syntax Reference](https://yaml.org/spec/1.2/spec.html)

## License

${options.author ? `Copyright (c) ${new Date().getFullYear()} ${options.author}` : 'Your game license here'}
`;

    const readmePath = join(projectPath, 'README.md');
    await Deno.writeTextFile(readmePath, readme);
    this.logger.debug(`📚 Created README: ${readmePath}`);
  }

  private getBasicStoryTemplate(options: InitProjectOptions): string {
    return `# ${options.title || options.name}
# A basic visual novel template

intro:
  - "Welcome to ${options.title || options.name}!"
  - speaker: "Narrator"
    text: "This is a basic visual novel template."
  - text: "What would you like to do?"
    choices:
      - text: "Learn about the story"
        goto: "story_info"
      - text: "Start the adventure"
        goto: "chapter1"
      - text: "See the ending"
        goto: "ending"

story_info:
  - speaker: "Narrator"
    text: "This story was created with VN Compiler."
  - "You can edit the story.yaml file to create your own narrative."
  - text: "Ready to begin?"
    choices:
      - text: "Yes, let's start!"
        goto: "chapter1"
      - text: "Go back to menu"
        goto: "intro"

chapter1:
  - speaker: "Narrator"
    text: "Chapter 1: The Beginning"
  - "You find yourself at the start of an adventure."
  - "The path ahead is filled with possibilities."
  - text: "Which way do you go?"
    choices:
      - text: "Take the left path"
        goto: "left_path"
      - text: "Take the right path"
        goto: "right_path"
      - text: "Stay where you are"
        goto: "stay_put"

left_path:
  - "You chose the left path."
  - speaker: "Voice"
    text: "Interesting choice..."
  - "The path leads to a mysterious forest."
  - text: "Continue exploring?"
    choices:
      - text: "Yes, continue"
        goto: "forest_adventure"
      - text: "Turn back"
        goto: "chapter1"

right_path:
  - "You chose the right path."
  - "This path leads to a bustling town."
  - speaker: "Townsperson"
    text: "Welcome, traveler!"
  - text: "What do you do?"
    choices:
      - text: "Explore the town"
        goto: "town_adventure"
      - text: "Ask for directions"
        goto: "get_directions"

stay_put:
  - "You decide to stay where you are."
  - "Sometimes the best choice is to wait and observe."
  - speaker: "Narrator"
    text: "Patience can be a virtue."
  - text: "After some time, you notice something interesting..."
    choices:
      - text: "Investigate"
        goto: "investigation"
      - text: "Continue waiting"
        goto: "ending"

forest_adventure:
  - "The forest is dark and mysterious."
  - "You hear sounds of wildlife all around you."
  - "This leads to many more adventures..."
  - goto: "ending"

town_adventure:
  - "The town is full of interesting people and places."
  - "You spend time exploring markets, taverns, and shops."
  - "This opens up new story possibilities..."
  - goto: "ending"

get_directions:
  - speaker: "Townsperson"
    text: "Ah, you seek guidance! The wise choice."
  - "They provide you with helpful information."
  - goto: "ending"

investigation:
  - "Your investigation reveals hidden secrets."
  - "This discovery changes everything..."
  - goto: "ending"

ending:
  - speaker: "Narrator"
    text: "And so your adventure comes to a close."
  - "Thank you for playing ${options.title || options.name}!"
  - "This was just a basic template - now create your own story!"
  - text: "Play again?"
    choices:
      - text: "Start over"
        goto: "intro"
      - text: "Exit"
        # No goto means the game ends here
`;
  }

  private getInteractiveStoryTemplate(options: InitProjectOptions): string {
    return `# ${options.title || options.name}
# Interactive visual novel with input helpers and variables

intro:
  - "Welcome to ${options.title || options.name}!"
  - "This is an interactive story that remembers your choices."
  - "First, let's get to know you better."
  - "What's your name?"
  - "{{input:playerName:Enter your name:text}}"
  - "Nice to meet you, {{playerName}}!"
  - "What's your age?"
  - "{{input:age:Your age:number:min:16,max:100}}"
  - text: "How would you describe yourself?"
    choices:
      - text: "Adventurous"
        actions:
          - type: setFlag
            flag: "adventurous"
          - type: setVar
            key: "personality"
            value: "adventurous"
        goto: "personality_set"
      - text: "Cautious"
        actions:
          - type: setFlag
            flag: "cautious"
          - type: setVar
            key: "personality"
            value: "cautious"
        goto: "personality_set"
      - text: "Curious"
        actions:
          - type: setFlag
            flag: "curious"
          - type: setVar
            key: "personality"
            value: "curious"
        goto: "personality_set"

personality_set:
  - "Great! So you're {{playerName}}, {{age}} years old, and {{personality}}."
  - text: "Let's begin your adventure!"
    actions:
      - type: setVar
        key: "score"
        value: 0
      - type: setVar
        key: "chapter"
        value: 1
    goto: "chapter1"

chapter1:
  - speaker: "Narrator"
    text: "Chapter {{chapter}}: The Mysterious Door"
  - "{{#if hasFlag('adventurous')}}Your adventurous spirit draws you forward.{{/if}}"
  - "{{#if hasFlag('cautious')}}You proceed carefully, examining everything.{{/if}}"
  - "{{#if hasFlag('curious')}}Your curiosity is piqued by the strange markings.{{/if}}"
  - "You find yourself before an ancient door with strange symbols."
  - "What's your approach?"
  - "{{input:approach:How do you approach the door?:select:Examine closely,Touch the symbols,Step back and observe,Try to open it}}"
  - text: "You decide to {{approach}}."
    choices:
      - text: "Continue with this approach"
        goto: "door_result"
      - text: "Change your mind"
        goto: "chapter1"

door_result:
  - "{{#if eq approach 'Examine closely'}}Your careful examination reveals hidden details.{{/if}}"
  - "{{#if eq approach 'Touch the symbols'}}The symbols glow as you touch them!{{/if}}"
  - "{{#if eq approach 'Step back and observe'}}From a distance, you notice a pattern.{{/if}}"
  - "{{#if eq approach 'Try to open it'}}The door creaks open with surprising ease.{{/if}}"
  - actions:
      - type: addVar
        key: "score"
        value: 10
      - type: addVar
        key: "chapter"
        value: 1
  - "Score: {{score}} | Age: {{age}} | Personality: {{personality}}"
  - goto: "chapter2"

chapter2:
  - speaker: "Narrator"
    text: "Chapter {{chapter}}: The Choice of Paths"
  - "Beyond the door lie three paths."
  - "How confident do you feel about your choice?"
  - "{{input:confidence:Rate your confidence (1-10):range:min:1,max:10,step:1}}"
  - "{{#if gt confidence 7}}Your high confidence shows in your posture.{{/if}}"
  - "{{#if lt confidence 4}}You feel uncertain about what lies ahead.{{/if}}"
  - text: "Which path calls to you?"
    choices:
      - text: "The bright, well-lit path"
        actions:
          - type: setFlag
            flag: "chose_light"
          - type: addVar
            key: "score"
            value: 5
        goto: "light_path"
      - text: "The dark, mysterious path"
        actions:
          - type: setFlag
            flag: "chose_dark"
          - type: addVar
            key: "score"
            value: 10
        goto: "dark_path"
      - text: "The middle path with flickering torches"
        actions:
          - type: setFlag
            flag: "chose_middle"
          - type: addVar
            key: "score"
            value: 7
        goto: "middle_path"

light_path:
  - "{{#if hasFlag('adventurous')}}Even on the safe path, you look for excitement.{{/if}}"
  - "The bright path is safe and pleasant."
  - "You encounter friendly travelers who share stories."
  - "What do you ask them?"
  - "{{input:question:What do you want to know?:textarea}}"
  - "You ask: '{{question}}'"
  - "The travelers provide helpful information based on your question."
  - actions:
      - type: addVar
        key: "score"
        value: 5
  - goto: "convergence"

dark_path:
  - "{{#if hasFlag('cautious')}}Despite your caution, you've chosen the risky path.{{/if}}"
  - "The dark path is challenging but rewarding."
  - "You discover hidden treasures and ancient secrets."
  - "Your confidence level of {{confidence}} serves you well here."
  - actions:
      - type: addVar
        key: "score"
        value: 15
      - type: setFlag
        flag: "found_treasure"
  - goto: "convergence"

middle_path:
  - "{{#if hasFlag('curious')}}Your curiosity about the flickering lights pays off.{{/if}}"
  - "The middle path offers balanced challenges and rewards."
  - "You learn valuable skills along the way."
  - actions:
      - type: addVar
        key: "score"
        value: 10
      - type: setFlag
        flag: "learned_skills"
  - goto: "convergence"

convergence:
  - speaker: "Narrator"
    text: "The paths converge at a great hall."
  - "{{playerName}}, your journey has brought you here."
  - "Final Score: {{score}}"
  - "{{#if hasFlag('found_treasure')}}Your treasure glints in the light.{{/if}}"
  - "{{#if hasFlag('learned_skills')}}Your new skills will serve you well.{{/if}}"
  - "{{#if gt score 25}}You have achieved a high score! Well done!{{/if}}"
  - "{{#if lt score 15}}Your journey was cautious but meaningful.{{/if}}"
  - text: "How do you feel about your adventure?"
    choices:
      - text: "Satisfied with my choices"
        goto: "good_ending"
      - text: "I'd like to try different paths"
        goto: "intro"
      - text: "Tell me more about this world"
        goto: "lore_ending"

good_ending:
  - speaker: "{{playerName}}"
    text: "This has been an amazing adventure!"
  - "Your personality ({{personality}}) shaped your unique journey."
  - "Thank you for playing ${options.title || options.name}!"
  - "Your story, your choices, your adventure."

lore_ending:
  - "The world you've explored has many more secrets..."
  - "{{#if hasFlag('found_treasure')}}The treasure you found is just one of many.{{/if}}"
  - "Perhaps {{playerName}} will return for more adventures."
  - "The story continues..."

# Special scene for testing all input types
input_showcase:
  - "Let's test all the input helpers!"
  - "Text: {{input:testText:Enter some text:text}}"
  - "Number: {{input:testNumber:Pick a number:number:min:1,max:100}}"
  - "Select: {{input:testSelect:Choose option:select:Option A,Option B,Option C}}"
  - "Checkbox: {{input:testCheck:Check this:checkbox}}"
  - "Radio: {{input:testRadio:Pick one:radio:Red,Green,Blue}}"
  - "Range: {{input:testRange:Slide me:range:min:0,max:10,step:1}}"
  - "Textarea: {{input:testArea:Long text:textarea}}"
  - "Results: {{testText}}, {{testNumber}}, {{testSelect}}, {{testCheck}}, {{testRadio}}, {{testRange}}"
  - "{{testArea}}"
`;
  }

  private getMediaRichStoryTemplate(options: InitProjectOptions): string {
    return `# ${options.title || options.name}
# Media-rich visual novel with images, audio, and video

intro:
  - "{{showImage 'placeholder'}}"
  - speaker: "Narrator"
    text: "Welcome to ${options.title || options.name}!"
  - "{{playAudio 'intro-music'}}"
  - "This story features rich media integration."
  - "What's your name, adventurer?"
  - "{{input:playerName:Enter your name:text}}"
  - "Welcome to our world, {{playerName}}!"
  - text: "Choose your character class:"
    choices:
      - text: "🗡️ Warrior"
        actions:
          - type: setVar
            key: "characterClass"
            value: "warrior"
          - type: setVar
            key: "health"
            value: 100
          - type: setVar
            key: "strength"
            value: 80
        goto: "warrior_intro"
      - text: "🔮 Mage"
        actions:
          - type: setVar
            key: "characterClass"
            value: "mage"
          - type: setVar
            key: "health"
            value: 70
          - type: setVar
            key: "magic"
            value: 90
        goto: "mage_intro"
      - text: "🏹 Archer"
        actions:
          - type: setVar
            key: "characterClass"
            value: "archer"
          - type: setVar
            key: "health"
            value: 85
          - type: setVar
            key: "agility"
            value: 85
        goto: "archer_intro"

warrior_intro:
  - "{{showImage 'warrior-portrait'}}"
  - speaker: "{{playerName}}"
    text: "I am {{playerName}}, a mighty warrior!"
  - "{{playAudio 'sword-clash'}}"
  - "Health: {{health}} | Strength: {{strength}}"
  - goto: "first_quest"

mage_intro:
  - "{{showImage 'mage-portrait'}}"
  - speaker: "{{playerName}}"
    text: "I am {{playerName}}, master of the arcane!"
  - "{{playAudio 'magic-spell'}}"
  - "Health: {{health}} | Magic: {{magic}}"
  - goto: "first_quest"

archer_intro:
  - "{{showImage 'archer-portrait'}}"
  - speaker: "{{playerName}}"
    text: "I am {{playerName}}, swift and precise!"
  - "{{playAudio 'bow-string'}}"
  - "Health: {{health}} | Agility: {{agility}}"
  - goto: "first_quest"

first_quest:
  - "{{showImage 'village-scene'}}"
  - "{{playAudio 'village-ambience'}}"
  - speaker: "Village Elder"
    text: "{{playerName}}, we need your help!"
  - "A terrible monster has been terrorizing our village."
  - "{{showImage 'monster-silhouette'}}"
  - "Will you help us, brave {{characterClass}}?"
  - text: "How do you respond?"
    choices:
      - text: "Of course! I'll defeat this monster!"
        actions:
          - type: setFlag
            flag: "accepted_quest"
          - type: addVar
            key: "reputation"
            value: 10
        goto: "quest_accepted"
      - text: "Tell me more about this monster first."
        goto: "monster_info"
      - text: "I need to prepare before I can help."
        goto: "preparation"

quest_accepted:
  - "{{playAudio 'heroic-music'}}"
  - speaker: "Village Elder"
    text: "Bless you, {{playerName}}! You are our hero!"
  - "The villagers cheer as you accept the quest."
  - "{{showImage 'cheering-crowd'}}"
  - actions:
      - type: addVar
        key: "reputation"
        value: 5
  - goto: "journey_begins"

monster_info:
  - speaker: "Village Elder"
    text: "The beast is unlike anything we've seen before."
  - "{{showImage 'monster-description'}}"
  - "It breathes fire and has scales like armor."
  - "{{#if eq characterClass 'mage'}}Your magical knowledge might be especially useful.{{/if}}"
  - "{{#if eq characterClass 'warrior'}}Your strength will be tested against its armor.{{/if}}"
  - "{{#if eq characterClass 'archer'}}Your precision could find its weak spots.{{/if}}"
  - text: "Now will you help us?"
    choices:
      - text: "Yes, I'll face this challenge!"
        actions:
          - type: setFlag
            flag: "accepted_quest"
          - type: setFlag
            flag: "knows_monster"
        goto: "quest_accepted"
      - text: "I need time to think about this."
        goto: "preparation"

preparation:
  - "{{showImage 'equipment-shop'}}"
  - "You visit the local equipment shop."
  - "{{playAudio 'shop-ambience'}}"
  - speaker: "Shopkeeper"
    text: "What can I get for you, {{playerName}}?"
  - "What would you like to buy?"
  - "{{input:equipment:Choose your equipment:select:Healing Potion,Magic Scroll,Steel Armor,Silver Arrows,Crystal Shield}}"
  - "You purchase {{equipment}}."
  - actions:
      - type: setVar
        key: "equipment"
        value: "{{equipment}}"
      - type: setFlag
        flag: "has_equipment"
  - text: "Ready for your quest now?"
    choices:
      - text: "Yes, I'm prepared!"
        actions:
          - type: setFlag
            flag: "accepted_quest"
        goto: "quest_accepted"

journey_begins:
  - "{{showImage 'forest-path'}}"
  - "{{playAudio 'forest-sounds'}}"
  - "You set out on the path to the monster's lair."
  - "The journey through the dark forest is treacherous."
  - "{{#if hasFlag('has_equipment')}}Your {{equipment}} gives you confidence.{{/if}}"
  - text: "You hear a roar in the distance. What do you do?"
    choices:
      - text: "Charge toward the sound!"
        actions:
          - type: setFlag
            flag: "aggressive_approach"
        goto: "monster_encounter"
      - text: "Approach carefully and quietly"
        actions:
          - type: setFlag
            flag: "stealthy_approach"
        goto: "monster_encounter"
      - text: "Call out to the monster"
        actions:
          - type: setFlag
            flag: "diplomatic_approach"
        goto: "monster_encounter"

monster_encounter:
  - "{{showImage 'monster-lair'}}"
  - "{{playAudio 'monster-roar'}}"
  - "You arrive at the monster's lair!"
  - "{{showImage 'fierce-dragon'}}"
  - "The beast is enormous - a fearsome dragon!"
  
  # Different outcomes based on approach
  - if: "hasFlag('aggressive_approach')"
    then:
      - "{{#if eq characterClass 'warrior'}}Your warrior instincts serve you well!{{/if}}"
      - "You charge into battle with fierce determination!"
      - "{{playAudio 'battle-music'}}"
      - goto: "battle_sequence"
    else:
      - if: "hasFlag('stealthy_approach')"
        then:
          - "{{#if eq characterClass 'archer'}}Your archer training helps you stay hidden!{{/if}}"
          - "You observe the dragon, looking for weaknesses."
          - "{{showImage 'dragon-weak-spot'}}"
          - "You notice a loose scale on its neck!"
          - goto: "strategic_battle"
        else:
          - if: "hasFlag('diplomatic_approach')"
            then:
              - "{{#if eq characterClass 'mage'}}Your magical wisdom guides you!{{/if}}"
              - speaker: "{{playerName}}"
                text: "Great dragon, why do you terrorize the village?"
              - "{{playAudio 'dragon-speech'}}"
              - speaker: "Dragon"
                text: "They stole my precious eggs!"
              - "A diplomatic solution might be possible..."
              - goto: "peaceful_resolution"

battle_sequence:
  - "{{playVideo 'battle-cutscene'}}"
  - "An epic battle ensues!"
  - "Your {{characterClass}} abilities are put to the test!"
  - "{{#if hasFlag('has_equipment')}}Your {{equipment}} proves invaluable!{{/if}}"
  - actions:
      - type: addVar
        key: "battle_score"
        value: 50
  - goto: "victory"

strategic_battle:
  - "Using your knowledge of the weak spot, you plan your attack."
  - "{{#if eq characterClass 'archer'}}Your arrow finds its mark perfectly!{{/if}}"
  - "{{#if eq characterClass 'mage'}}Your spell targets the vulnerable scale!{{/if}}"
  - "{{#if eq characterClass 'warrior'}}Your sword strikes true!{{/if}}"
  - "{{playAudio 'victory-fanfare'}}"
  - actions:
      - type: addVar
        key: "battle_score"
        value: 75
  - goto: "victory"

peaceful_resolution:
  - speaker: "{{playerName}}"
    text: "The villagers didn't know about your eggs. Let's resolve this peacefully."
  - "You negotiate between the dragon and the village."
  - "{{showImage 'peace-treaty'}}"
  - "A solution is reached that satisfies everyone!"
  - "{{playAudio 'peaceful-music'}}"
  - actions:
      - type: setFlag
        flag: "peaceful_ending"
      - type: addVar
        key: "reputation"
        value: 50
  - goto: "peaceful_ending"

victory:
  - "{{showImage 'victory-scene'}}"
  - "{{playAudio 'victory-music'}}"
  - "You have defeated the dragon!"
  - "Battle Score: {{battle_score}}"
  - "The village is safe thanks to your heroism!"
  - goto: "hero_ending"

hero_ending:
  - "{{showImage 'hero-celebration'}}"
  - speaker: "Village Elder"
    text: "{{playerName}} the {{characterClass}}, you are our greatest hero!"
  - "The villagers celebrate your victory with a great feast."
  - "Your reputation: {{reputation}}"
  - "{{#if hasFlag('knows_monster')}}Your preparation and knowledge made all the difference.{{/if}}"
  - "Thank you for playing ${options.title || options.name}!"

peaceful_ending:
  - "{{showImage 'harmony-scene'}}"
  - speaker: "Dragon"
    text: "Thank you, wise {{playerName}}, for bringing peace."
  - "The dragon and villagers now live in harmony."
  - "Your diplomatic skills saved the day without violence."
  - "Reputation: {{reputation}}"
  - "Sometimes the greatest victories come through understanding."
  - "Thank you for playing ${options.title || options.name}!"

# Hidden scene accessible via debug
media_showcase:
  - "Media Showcase Scene"
  - "Image: {{showImage 'placeholder'}}"
  - "Audio: {{playAudio 'background-music'}}"
  - "Video: {{playVideo 'intro-cutscene'}}"
  - "All media types in one scene!"
`;
  }
}

/**
 * Validate init options
 */
function validateInitOptions(options: InitProjectOptions, logger: Logger): void {
  const validTemplates = ['basic', 'interactive', 'media-rich'];
  
  if (!validTemplates.includes(options.template)) {
    logger.error(`❌ Invalid template: ${options.template}`);
    logger.info(`Available templates: ${validTemplates.join(', ')}`);
    throw new Error(`Invalid template: ${options.template}`);
  }

  if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(options.name)) {
    logger.error("❌ Project name must start with a letter and contain only letters, numbers, hyphens, and underscores");
    throw new Error("Invalid project name");
  }

  if (options.name.length > 50) {
    logger.warn("⚠️  Project name is very long and may cause issues");
  }
}
