import { VNCompiler } from "../../core/compiler.ts";
import type { CLIArgs, ValidationResult, ValidationError, Logger } from "../../types/compiler.ts";
import { validateInputFile } from "../../utils/file-system.ts";
import { parse as parseYAML } from "@std/yaml";

/**
 * Validate command implementation
 * Validates YAML scripts without compiling them
 */
export async function validateCommand(args: CLIArgs, logger: Logger): Promise<void> {
  try {
    if (args._.length < 2) {
      logger.error("❌ Input file is required");
      logger.info("Usage: vn-compiler validate <input.yaml> [options]");
      logger.info("Run 'vn-compiler help validate' for more information");
      Deno.exit(1);
    }

    const inputFile = args._[1];
    logger.info(`🔍 Validating script: ${inputFile}`);

    await validateInputFile(inputFile, logger);

    const content = await Deno.readTextFile(inputFile);
    logger.debug(`📄 File read: ${content.length} characters`);

    const validator = new ScriptValidator(logger);
    const result = await validator.validate(content, inputFile);

    displayValidationResults(result, args.verbose || false, logger);

    if (!result.valid) {
      Deno.exit(1);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);    
    logger.error(`❌ Validation failed: ${errorMessage}`);
    
    if (args.verbose && error instanceof Error && error.stack) {
      logger.debug("Stack trace:");
      logger.debug(error.stack);
    }
    
    Deno.exit(2);
  }
}

/**
 * Script Validator class
 */
export class ScriptValidator {
  constructor(private logger: Logger) {}

  async validate(content: string, fileName: string): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    try {
      this.logger.debug("🔍 Checking YAML syntax...");
      let parsedYAML: any;
      
      try {
        parsedYAML = parseYAML(content);
      } catch (yamlError: any) {
        errors.push({
          type: 'syntax',
          message: `YAML syntax error: ${yamlError.message}`,
          location: {
            line: yamlError.mark?.line,
            column: yamlError.mark?.column
          },
          suggestion: "Check indentation, quotes, and YAML structure"
        });
        return { valid: false, errors, warnings };
      }

      this.logger.debug("🏗️  Validating full YAML structure...");
      this.validateFullStructure(parsedYAML, errors, warnings);

      // Only proceed with scene validation if structure is valid
      if (parsedYAML && parsedYAML.scenes) {
        this.logger.debug("🎬 Checking scene content...");
        this.validateScenes(parsedYAML.scenes, errors, warnings);

        this.logger.debug("🔗 Checking scene references...");
        this.validateSceneReferences(parsedYAML.scenes, errors, warnings);

        this.logger.debug("📝 Checking input helpers...");
        this.validateInputHelpers(parsedYAML.scenes, errors, warnings);

        this.logger.debug("🎨 Checking template syntax...");
        await this.validateTemplateSyntax(parsedYAML.scenes, errors, warnings);

        if (parsedYAML.assets) {
          this.logger.debug("🖼️  Checking asset references...");
          this.validateAssetReferences(parsedYAML.scenes, errors, warnings);
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Validation error: ${errorMessage}`);
      
      errors.push({
        type: 'syntax',
        message: `Validation failed: ${errorMessage}`,
        suggestion: "Check script syntax and structure"
      });
      
      return { valid: false, errors, warnings };
    }
  }

  private validateFullStructure(parsedYAML: any, errors: ValidationError[], warnings: string[]): void {
    if (!parsedYAML || typeof parsedYAML !== 'object') {
      errors.push({
        type: 'syntax',
        message: "Script must be a YAML object with game structure",
        suggestion: "Ensure your script is a valid YAML object with title, scenes, etc."
      });
      return;
    }

    // Validate required sections
    if (!parsedYAML.scenes) {
      errors.push({
        type: 'syntax',
        message: "Missing required 'scenes' section",
        suggestion: "Add a 'scenes:' section with your scene definitions"
      });
    }

    // Validate optional but recommended sections
    if (!parsedYAML.title) {
      warnings.push("Consider adding a 'title' field for your game");
    } else if (typeof parsedYAML.title !== 'string') {
      errors.push({
        type: 'syntax',
        message: "Title must be a string",
        suggestion: "Set title as a quoted string: title: \"Your Game Title\""
      });
    }

    if (!parsedYAML.description) {
      warnings.push("Consider adding a 'description' field for your game");
    } else if (typeof parsedYAML.description !== 'string') {
      warnings.push("Description should be a string");
    }

    // Validate variables section
    if (parsedYAML.variables && typeof parsedYAML.variables !== 'object') {
      errors.push({
        type: 'syntax',
        message: "Variables section must be an object",
        suggestion: "Define variables as key-value pairs: variables: { playerName: \"\", score: 0 }"
      });
    }

    // Validate assets section
    if (parsedYAML.assets) {
      if (!Array.isArray(parsedYAML.assets)) {
        errors.push({
          type: 'syntax',
          message: "Assets section must be an array",
          suggestion: "Define assets as an array of asset objects"
        });
      } else {
        this.validateAssetsStructure(parsedYAML.assets, errors, warnings);
      }
    }

    // Validate scenes section structure
    if (parsedYAML.scenes && typeof parsedYAML.scenes !== 'object') {
      errors.push({
        type: 'syntax',
        message: "Scenes section must be an object",
        suggestion: "Define scenes as an object with scene names as keys"
      });
    }
  }

  private validateAssetsStructure(assets: any[], errors: ValidationError[], warnings: string[]): void {
    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i];
      
      if (!asset || typeof asset !== 'object') {
        errors.push({
          type: 'syntax',
          message: `Asset at index ${i} must be an object`,
          suggestion: "Define each asset with name, url, and type fields"
        });
        continue;
      }

      // Required asset fields
      if (!asset.name || typeof asset.name !== 'string') {
        errors.push({
          type: 'syntax',
          message: `Asset at index ${i} missing or invalid 'name' field`,
          suggestion: "Add a string 'name' field to identify the asset"
        });
      }

      if (!asset.url || typeof asset.url !== 'string') {
        errors.push({
          type: 'syntax',
          message: `Asset '${asset.name || i}' missing or invalid 'url' field`,
          suggestion: "Add a string 'url' field with the asset file path or URL"
        });
      }

      if (!asset.type || typeof asset.type !== 'string') {
        errors.push({
          type: 'syntax',
          message: `Asset '${asset.name || i}' missing or invalid 'type' field`,
          suggestion: "Add a 'type' field: 'image', 'audio', or 'video'"
        });
      } else if (!['image', 'audio', 'video'].includes(asset.type)) {
        warnings.push(`Asset '${asset.name}' has unusual type '${asset.type}' (expected: image, audio, video)`);
      }

      // Optional description
      if (asset.description && typeof asset.description !== 'string') {
        warnings.push(`Asset '${asset.name}' description should be a string`);
      }
    }
  }

  private validateScenes(parsedYAML: any, errors: ValidationError[], warnings: string[]): void {
    if (!parsedYAML || typeof parsedYAML !== 'object') {
      errors.push({
        type: 'syntax',
        message: "Scenes must be an object with scene definitions",
        suggestion: "Define scenes as an object with scene names as keys"
      });
      return;
    }

    const sceneNames = Object.keys(parsedYAML);
    
    if (sceneNames.length === 0) {
      errors.push({
        type: 'syntax',
        message: "No scenes defined",
        suggestion: "Add at least one scene to your scenes section"
      });
      return;
    }

    // Validate scene names
    for (const sceneName of sceneNames) {
      if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(sceneName)) {
        warnings.push(`Scene name '${sceneName}' may cause issues (use only letters, numbers, underscores)`);
      }
      
      if (sceneName.length > 50) {
        warnings.push(`Scene name '${sceneName}' is very long (${sceneName.length} characters)`);
      }
    }

    // Check for reserved scene names
    const reservedNames = ['constructor', 'prototype', '__proto__'];
    for (const reserved of reservedNames) {
      if (sceneNames.includes(reserved)) {
        errors.push({
          type: 'reference',
          message: `Scene name '${reserved}' is reserved and cannot be used`,
          suggestion: `Rename scene '${reserved}' to something else`
        });
      }
    }

    // Validate individual scenes
    for (const [sceneName, sceneData] of Object.entries(parsedYAML)) {
      if (!Array.isArray(sceneData)) {
        errors.push({
          type: 'syntax',
          message: `Scene '${sceneName}' must be an array of instructions`,
          location: { scene: sceneName },
          suggestion: "Convert scene content to a YAML array"
        });
        continue;
      }

      if (sceneData.length === 0) {
        warnings.push(`Scene '${sceneName}' is empty`);
        continue;
      }

      for (let i = 0; i < sceneData.length; i++) {
        this.validateInstruction(sceneData[i], sceneName, i, errors, warnings);
      }
    }
  }

  private validateInstruction(instruction: any, sceneName: string, index: number, errors: ValidationError[], warnings: string[]): void {
    const location = { scene: sceneName, line: index + 1 };

    if (typeof instruction === 'string') {
      if (instruction.trim().length === 0) {
        warnings.push(`Empty text instruction in scene '${sceneName}' at line ${index + 1}`);
      }
      return;
    }

    if (typeof instruction !== 'object' || instruction === null) {
      errors.push({
        type: 'syntax',
        message: `Invalid instruction type in scene '${sceneName}' at line ${index + 1}`,
        location,
        suggestion: "Instructions must be strings or objects"
      });
      return;
    }

    if (instruction.choices) {
      this.validateChoices(instruction.choices, sceneName, index, errors, warnings);
    }

    if (instruction.actions) {
      this.validateActions(instruction.actions, sceneName, index, errors, warnings);
    }

    if (instruction.condition || instruction.if) {
      this.validateCondition(instruction.condition || instruction.if, sceneName, index, errors, warnings);
    }

    if (instruction.goto || instruction.jump) {
    }
  }

  private validateChoices(choices: any, sceneName: string, index: number, errors: ValidationError[], warnings: string[]): void {
    const location = { scene: sceneName, line: index + 1 };

    if (!Array.isArray(choices)) {
      errors.push({
        type: 'syntax',
        message: `Choices in scene '${sceneName}' must be an array`,
        location,
        suggestion: "Convert choices to a YAML array"
      });
      return;
    }

    if (choices.length === 0) {
      warnings.push(`Empty choices array in scene '${sceneName}' at line ${index + 1}`);
      return;
    }

    if (choices.length > 6) {
      warnings.push(`Many choices (${choices.length}) in scene '${sceneName}' - consider splitting`);
    }

    for (let i = 0; i < choices.length; i++) {
      const choice = choices[i];
      
      if (!choice.text) {
        errors.push({
          type: 'syntax',
          message: `Choice ${i + 1} in scene '${sceneName}' missing text`,
          location,
          suggestion: "All choices must have a 'text' property"
        });
      }

      if (choice.text && choice.text.length > 100) {
        warnings.push(`Very long choice text (${choice.text.length} chars) in scene '${sceneName}'`);
      }
    }
  }

  private validateActions(actions: any, sceneName: string, index: number, errors: ValidationError[], warnings: string[]): void {
    const location = { scene: sceneName, line: index + 1 };

    if (!Array.isArray(actions)) {
      errors.push({
        type: 'syntax',
        message: `Actions in scene '${sceneName}' must be an array`,
        location,
        suggestion: "Convert actions to a YAML array"
      });
      return;
    }

    const validActionTypes = ['setVar', 'addVar', 'setFlag', 'clearFlag', 'addToList', 'addTime'];
    
    for (const action of actions) {
      if (!action.type) {
        errors.push({
          type: 'syntax',
          message: `Action missing 'type' in scene '${sceneName}'`,
          location,
          suggestion: "All actions must have a 'type' property"
        });
        continue;
      }

      if (!validActionTypes.includes(action.type)) {
        errors.push({
          type: 'syntax',
          message: `Unknown action type '${action.type}' in scene '${sceneName}'`,
          location,
          suggestion: `Use one of: ${validActionTypes.join(', ')}`
        });
      }

      this.validateActionProperties(action, sceneName, index, errors, warnings);
    }
  }

  private validateActionProperties(action: any, sceneName: string, index: number, errors: ValidationError[], warnings: string[]): void {
    const location = { scene: sceneName, line: index + 1 };

    switch (action.type) {
      case 'setVar':
      case 'addVar':
        if (!action.key) {
          errors.push({
            type: 'syntax',
            message: `${action.type} action missing 'key' property in scene '${sceneName}'`,
            location,
            suggestion: "Add a 'key' property to specify the variable name"
          });
        }
        if (action.value === undefined) {
          warnings.push(`${action.type} action in scene '${sceneName}' has undefined value`);
        }
        break;

      case 'setFlag':
      case 'clearFlag':
        if (!action.flag) {
          errors.push({
            type: 'syntax',
            message: `${action.type} action missing 'flag' property in scene '${sceneName}'`,
            location,
            suggestion: "Add a 'flag' property to specify the flag name"
          });
        }
        break;

      case 'addToList':
        if (!action.list || !action.item) {
          errors.push({
            type: 'syntax',
            message: `addToList action missing 'list' or 'item' property in scene '${sceneName}'`,
            location,
            suggestion: "Add both 'list' and 'item' properties"
          });
        }
        break;

      case 'addTime':
        if (typeof action.minutes !== 'number') {
          errors.push({
            type: 'syntax',
            message: `addTime action 'minutes' must be a number in scene '${sceneName}'`,
            location,
            suggestion: "Set 'minutes' to a numeric value"
          });
        }
        break;
    }
  }

  private validateCondition(condition: string, sceneName: string, index: number, errors: ValidationError[], warnings: string[]): void {
    const location = { scene: sceneName, line: index + 1 };

    if (typeof condition !== 'string') {
      errors.push({
        type: 'syntax',
        message: `Condition in scene '${sceneName}' must be a string`,
        location,
        suggestion: "Convert condition to a string expression"
      });
      return;
    }

    if (condition.trim().length === 0) {
      errors.push({
        type: 'syntax',
        message: `Empty condition in scene '${sceneName}'`,
        location,
        suggestion: "Provide a valid condition expression"
      });
    }

    const hasValidPattern = /hasFlag\(|playerChose\(|[a-zA-Z_][a-zA-Z0-9_.]*\s*(eq|ne|gt|lt|gte|lte)/.test(condition);
    if (!hasValidPattern && condition.includes('=')) {
      warnings.push(`Condition in scene '${sceneName}' uses '=' - consider using 'eq' instead`);
    }
  }

  private validateSceneReferences(parsedYAML: any, errors: ValidationError[], warnings: string[]): void {
    const sceneNames = new Set(Object.keys(parsedYAML));
    const referencedScenes = new Set<string>();

    for (const [sceneName, sceneData] of Object.entries(parsedYAML)) {
      if (!Array.isArray(sceneData)) continue;

      for (let i = 0; i < sceneData.length; i++) {
        const instruction = sceneData[i];
        this.collectSceneReferences(instruction, referencedScenes);
      }
    }

    for (const referencedScene of referencedScenes) {
      if (!sceneNames.has(referencedScene)) {
        errors.push({
          type: 'reference',
          message: `Scene '${referencedScene}' is referenced but not defined`,
          suggestion: `Create scene '${referencedScene}' or fix the reference`
        });
      }
    }

    const reachableScenes = this.findReachableScenes(parsedYAML, sceneNames);
    for (const sceneName of sceneNames) {
      if (!reachableScenes.has(sceneName)) {
        warnings.push(`Scene '${sceneName}' may be unreachable from the starting scene`);
      }
    }
  }

  private collectSceneReferences(instruction: any, referencedScenes: Set<string>): void {
    if (typeof instruction === 'string') return;
    if (!instruction || typeof instruction !== 'object') return;

    if (instruction.goto) {
      referencedScenes.add(instruction.goto);
    }
    if (instruction.jump) {
      referencedScenes.add(instruction.jump);
    }

    if (instruction.choices && Array.isArray(instruction.choices)) {
      for (const choice of instruction.choices) {
        if (choice.goto) {
          referencedScenes.add(choice.goto);
        }
      }
    }

    if (instruction.then && Array.isArray(instruction.then)) {
      for (const subInstruction of instruction.then) {
        this.collectSceneReferences(subInstruction, referencedScenes);
      }
    }
    if (instruction.else && Array.isArray(instruction.else)) {
      for (const subInstruction of instruction.else) {
        this.collectSceneReferences(subInstruction, referencedScenes);
      }
    }
  }

  private findReachableScenes(parsedYAML: any, allScenes: Set<string>): Set<string> {
    const reachable = new Set<string>();
    const queue: string[] = [];

    const sceneNames = Array.from(allScenes);
    const startingScenes = sceneNames.filter(name => 
      name.toLowerCase().includes('start') || 
      name.toLowerCase().includes('intro') || 
      name.toLowerCase().includes('begin')
    );

    if (startingScenes.length > 0) {
      queue.push(...startingScenes);
    } else {
      queue.push(sceneNames[0]);
    }

    while (queue.length > 0) {
      const sceneName = queue.shift()!;
      if (reachable.has(sceneName)) continue;

      reachable.add(sceneName);
      const references = new Set<string>();
      
      const sceneData = parsedYAML[sceneName];
      if (Array.isArray(sceneData)) {
        for (const instruction of sceneData) {
          this.collectSceneReferences(instruction, references);
        }
      }

      for (const ref of references) {
        if (allScenes.has(ref) && !reachable.has(ref)) {
          queue.push(ref);
        }
      }
    }

    return reachable;
  }

  private validateInputHelpers(parsedYAML: any, errors: ValidationError[], warnings: string[]): void {
    const inputPattern = /\{\{input:([^:}]+):([^:}]*):([^:}]*):?([^}]*)\}\}/g;
    
    for (const [sceneName, sceneData] of Object.entries(parsedYAML)) {
      if (!Array.isArray(sceneData)) continue;

      for (let i = 0; i < sceneData.length; i++) {
        const instruction = sceneData[i];
        this.validateInstructionInputHelpers(instruction, sceneName, i, errors, warnings, inputPattern);
      }
    }
  }

  private validateInstructionInputHelpers(instruction: any, sceneName: string, index: number, errors: ValidationError[], warnings: string[], inputPattern: RegExp): void {
    const location = { scene: sceneName, line: index + 1 };

    const validateText = (text: string, context: string) => {
      let match;
      inputPattern.lastIndex = 0;
      
      while ((match = inputPattern.exec(text)) !== null) {
        const [fullMatch, varName, placeholder, type, options] = match;
        
        if (!/^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(varName.trim())) {
          errors.push({
            type: 'template',
            message: `Invalid variable name '${varName}' in input helper in scene '${sceneName}' ${context}`,
            location,
            suggestion: "Variable names must start with letter or underscore"
          });
        }

        const validTypes = ['text', 'number', 'select', 'checkbox', 'radio', 'textarea', 'range'];
        const normalizedType = type.trim().toLowerCase();
        if (normalizedType && !validTypes.includes(normalizedType)) {
          errors.push({
            type: 'template',
            message: `Unknown input type '${type}' in scene '${sceneName}' ${context}`,
            location,
            suggestion: `Use one of: ${validTypes.join(', ')}`
          });
        }

        if ((normalizedType === 'select' || normalizedType === 'radio') && options.trim()) {
          if (!options.includes(',')) {
            warnings.push(`Input helper in scene '${sceneName}' ${context} has single option for ${normalizedType} type`);
          }
        }
      }
    };

    if (typeof instruction === 'string') {
      validateText(instruction, 'text');
    } else if (instruction && typeof instruction === 'object') {
      if (instruction.text) {
        validateText(instruction.text, 'text');
      }
      if (instruction.speaker) {
        validateText(instruction.speaker, 'speaker');
      }
      if (instruction.choices && Array.isArray(instruction.choices)) {
        for (let j = 0; j < instruction.choices.length; j++) {
          if (instruction.choices[j].text) {
            validateText(instruction.choices[j].text, `choice ${j + 1}`);
          }
        }
      }
    }
  }

  private async validateTemplateSyntax(parsedYAML: any, errors: ValidationError[], warnings: string[]): Promise<void> {
    try {
      const compiler = new VNCompiler(this.logger);
      await compiler.initialize();
      const vnEngine = compiler.getVNEngine();

      for (const [sceneName, sceneData] of Object.entries(parsedYAML)) {
        if (!Array.isArray(sceneData)) continue;

        for (let i = 0; i < sceneData.length; i++) {
          const instruction = sceneData[i];
          this.validateInstructionTemplates(instruction, sceneName, i, vnEngine, errors, warnings);
        }
      }

      compiler.destroy();
    } catch (error) {
      warnings.push("Could not validate template syntax - VN Engine initialization failed");
    }
  }

  private validateInstructionTemplates(instruction: any, sceneName: string, index: number, vnEngine: any, errors: ValidationError[], warnings: string[]): void {
    const location = { scene: sceneName, line: index + 1 };

    const validateTemplate = (template: string, context: string) => {
      try {
        const result = vnEngine.validateTemplate(template);
        if (!result.valid && result.error) {
          errors.push({
            type: 'template',
            message: `Template error in scene '${sceneName}' ${context}: ${result.error}`,
            location,
            suggestion: "Check Handlebars syntax and helper usage"
          });
        }
      } catch (error) {
        warnings.push(`Could not validate template in scene '${sceneName}' ${context}`);
      }
    };

    if (typeof instruction === 'string') {
      validateTemplate(instruction, 'text');
    } else if (instruction && typeof instruction === 'object') {
      if (instruction.text) {
        validateTemplate(instruction.text, 'text');
      }
      if (instruction.speaker) {
        validateTemplate(instruction.speaker, 'speaker');
      }
      if (instruction.choices && Array.isArray(instruction.choices)) {
        for (let j = 0; j < instruction.choices.length; j++) {
          if (instruction.choices[j].text) {
            validateTemplate(instruction.choices[j].text, `choice ${j + 1}`);
          }
        }
      }
    }
  }

  private validateAssetReferences(parsedYAML: any, errors: ValidationError[], warnings: string[]): void {
    const assetPattern = /\{\{(showImage|playAudio|playVideo)\s+['"']([^'"]+)['"']/g;
    const referencedAssets = new Set<string>();

    for (const [sceneName, sceneData] of Object.entries(parsedYAML)) {
      if (!Array.isArray(sceneData)) continue;

      for (let i = 0; i < sceneData.length; i++) {
        const instruction = sceneData[i];
        this.collectAssetReferences(instruction, referencedAssets);
      }
    }

    if (referencedAssets.size > 0) {
      warnings.push(`Found ${referencedAssets.size} asset references - ensure assets directory is provided during compilation`);
    }
  }

  private collectAssetReferences(instruction: any, referencedAssets: Set<string>): void {
    const assetPattern = /\{\{(showImage|playAudio|playVideo)\s+['"']([^'"]+)['"']/g;

    const extractFromText = (text: string) => {
      let match;
      while ((match = assetPattern.exec(text)) !== null) {
        referencedAssets.add(match[2]);
      }
    };

    if (typeof instruction === 'string') {
      extractFromText(instruction);
    } else if (instruction && typeof instruction === 'object') {
      if (instruction.text) extractFromText(instruction.text);
      if (instruction.speaker) extractFromText(instruction.speaker);
      if (instruction.choices && Array.isArray(instruction.choices)) {
        for (const choice of instruction.choices) {
          if (choice.text) extractFromText(choice.text);
        }
      }
    }
  }
}

/**
 * Display validation results in a formatted way
 */
function displayValidationResults(result: ValidationResult, verbose: boolean, logger: Logger): void {
  if (result.valid) {
    logger.success("✅ Validation passed!");
    
    if (result.warnings.length > 0) {
      logger.warn(`⚠️  ${result.warnings.length} warning(s):`);
      result.warnings.forEach(warning => {
        logger.warn(`   ${warning}`);
      });
    } else {
      logger.info("   No warnings found");
    }
    
    return;
  }

  logger.error(`❌ Validation failed with ${result.errors.length} error(s):`);
  
  result.errors.forEach((error, index) => {
    logger.error(`\n${index + 1}. ${error.message}`);
    
    if (error.location) {
      const location = [];
      if (error.location.scene) location.push(`Scene: ${error.location.scene}`);
      if (error.location.line) location.push(`Line: ${error.location.line}`);
      if (error.location.column) location.push(`Column: ${error.location.column}`);
      
      if (location.length > 0) {
        logger.error(`   Location: ${location.join(', ')}`);
      }
    }
    
    if (error.suggestion) {
      logger.info(`   💡 Suggestion: ${error.suggestion}`);
    }
  });

  if (verbose && result.warnings.length > 0) {
    logger.warn(`\n⚠️  ${result.warnings.length} warning(s):`);
    result.warnings.forEach(warning => {
      logger.warn(`   ${warning}`);
    });
  }
}
