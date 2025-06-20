import { WebContainer, FileSystemTree } from '@webcontainer/api';

// Enums for better type safety
export enum WeBuildActionType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  TERMINAL = 'terminal'
}

// Core interfaces
export interface WeBuildAction {
  readonly action: WeBuildActionType;
  readonly fileName?: string;
  readonly command?: string;
  readonly content?: string;
}

export interface ParsedWeBuildFile {
  readonly fileName: string;
  readonly content: string;
}

export interface ParsedWeBuildCommand {
  readonly command: string;
}

export interface WeBuildParseResult {
  readonly files: readonly ParsedWeBuildFile[];
  readonly commands: readonly ParsedWeBuildCommand[];
}

// File system types
export interface FileNode {
  readonly file: {
    readonly contents: string;
  };
}

export interface DirectoryNode {
  readonly directory: Record<string, FileNode | DirectoryNode>;
}

export type FileSystemNode = FileNode | DirectoryNode;

// Configuration interfaces
export interface ParserOptions {
  readonly validateContent?: boolean;
  readonly maxFileSize?: number;
  readonly allowedExtensions?: readonly string[];
}

export interface ExecutionOptions {
  readonly timeout?: number;
  readonly workingDirectory?: string;
  readonly env?: Record<string, string>;
}

// Error types
export class WeBuildParseError extends Error {
  constructor(
    message: string,
    public readonly fileName?: string,
    public readonly lineNumber?: number
  ) {
    super(message);
    this.name = 'WeBuildParseError';
  }
}

export class WebContainerError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly fileName?: string
  ) {
    super(message);
    this.name = 'WebContainerError';
  }
}

// SINGLETON IMPLEMENTATION
export class WeBuildParser {
  private static instance: WeBuildParser | null = null;
  private webContainer: WebContainer | null = null;
  private readonly options: Required<ParserOptions>;

  // Private constructor prevents direct instantiation
  private constructor(options: ParserOptions = {}) {
    this.options = {
      validateContent: true,
      maxFileSize: 1024 * 1024, // 1MB
      allowedExtensions: ['.js', '.ts', '.tsx', '.jsx', '.json', '.css', '.html', '.md', '.txt'],
      ...options
    };
  }

  /**
   * Get the singleton instance of WeBuildParser
   */
  public static getInstance(options?: ParserOptions): WeBuildParser {
    if (!WeBuildParser.instance) {
      WeBuildParser.instance = new WeBuildParser(options);
    }
    return WeBuildParser.instance;
  }

  /**
   * Reset the singleton instance (useful for testing)
   */
  public static resetInstance(): void {
    WeBuildParser.instance = null;
  }

  /**
   * Set the WebContainer instance for the singleton
   */
  public setWebContainer(webContainer: WebContainer): void {
    this.webContainer = webContainer;
  }

  /**
   * Check if WebContainer is available
   */
  public hasWebContainer(): boolean {
    return this.webContainer !== null;
  }

  /**
   * Parse weBuild format string and extract files and commands
   */
  public parseWeBuildFormat(weBuildString: string): WeBuildParseResult {
    if (!weBuildString || typeof weBuildString !== 'string') {
      throw new WeBuildParseError('Invalid weBuild string provided');
    }

    const files: ParsedWeBuildFile[] = [];
    const commands: ParsedWeBuildCommand[] = [];

    // Regular expression to match weBuild blocks
    const weBuildRegex = /<weBuild\s+([^>]+)>([\s\S]*?)<\/weBuild>/g;
    
    let match: RegExpExecArray | null;
    let blockIndex = 0;

    while ((match = weBuildRegex.exec(weBuildString)) !== null) {
      try {
        const attributes = match[1];
        const content = match[2].trim();
        
        const action = this.extractAttribute(attributes, 'action');
        
        if (!action || !Object.values(WeBuildActionType).includes(action as WeBuildActionType)) {
          throw new WeBuildParseError(`Invalid action: ${action}`, undefined, blockIndex);
        }

        const actionType = action as WeBuildActionType;

        if (actionType === WeBuildActionType.CREATE || actionType === WeBuildActionType.UPDATE) {
          const fileName = this.extractAttribute(attributes, 'fileName');
          if (!fileName) {
            throw new WeBuildParseError('fileName is required for create/update actions', undefined, blockIndex);
          }

          if (!content) {
            throw new WeBuildParseError('Content is required for create/update actions', fileName, blockIndex);
          }

          this.validateFile(fileName, content);

          files.push({
            fileName,
            content: this.cleanContent(content)
          });
        } else if (actionType === WeBuildActionType.TERMINAL) {
          const command = this.extractAttribute(attributes, 'command');
          if (!command) {
            throw new WeBuildParseError('command is required for terminal actions', undefined, blockIndex);
          }

          commands.push({ command: command.trim() });
        }

        blockIndex++;
      } catch (error) {
        if (error instanceof WeBuildParseError) {
          throw error;
        }
        throw new WeBuildParseError(`Error parsing block ${blockIndex}: ${error}`, undefined, blockIndex);
      }
    }

    return { files: Object.freeze(files), commands: Object.freeze(commands) };
  }

  /**
   * Extract attribute value from weBuild tag attributes
   */
  private extractAttribute(attributes: string, attributeName: string): string | null {
    const regex = new RegExp(`${attributeName}=["']([^"']+)["']`);
    const match = attributes.match(regex);
    return match ? match[1] : null;
  }

  /**
   * Validate file name and content
   */
  private validateFile(fileName: string, content: string): void {
    if (!this.options.validateContent) return;

    // Validate file name
    if (fileName.includes('..') || fileName.startsWith('/')) {
      throw new WeBuildParseError(`Invalid file path: ${fileName}`, fileName);
    }

    // Validate file extension
    const extension = fileName.substring(fileName.lastIndexOf('.'));
    if (extension && !this.options.allowedExtensions.includes(extension)) {
      throw new WeBuildParseError(`File extension not allowed: ${extension}`, fileName);
    }

    // Validate file size
    if (content.length > this.options.maxFileSize) {
      throw new WeBuildParseError(`File too large: ${content.length} bytes`, fileName);
    }
  }

  /**
   * Clean content by removing extra whitespace and normalizing line endings
   */
  private cleanContent(content: string): string {
    return content
      .replace(/^\n+/, '') // Remove leading newlines
      .replace(/\n+$/, '') // Remove trailing newlines
      .replace(/\r\n/g, '\n'); // Normalize line endings
  }

  /**
   * Create files in WebContainer from parsed weBuild format
   */
  public async createFilesInWebContainer(
    weBuildString: string,
    webContainer?: WebContainer
  ): Promise<void> {
    const container = this.getWebContainer(webContainer);
    const { files } = this.parseWeBuildFormat(weBuildString);

    try {
      // Create directory structure for files
      const directories = this.extractDirectories(files);
      await this.createDirectories(container, directories);

      // Create files
      await this.writeFiles(container, files);
    } catch (error) {
      throw new WebContainerError(
        `Failed to create files: ${error}`,
        'createFiles'
      );
    }
  }

  /**
   * Execute terminal commands from parsed weBuild format
   */
  public async executeCommandsInWebContainer(
    weBuildString: string,
    webContainer?: WebContainer,
    options: ExecutionOptions = {}
  ): Promise<void> {
    const container = this.getWebContainer(webContainer);
    const { commands } = this.parseWeBuildFormat(weBuildString);

    for (const cmd of commands) {
      try {
        console.log(`Executing command: ${cmd.command}`);
        
        const process = await container.spawn('sh', ['-c', cmd.command], {
          cwd: options.workingDirectory,
          env: options.env
        });
        
        // Handle timeout if specified
        let timeoutId: NodeJS.Timeout | undefined;
        if (options.timeout) {
          timeoutId = setTimeout(() => {
            process.kill();
          }, options.timeout);
        }

        // Stream output
        process.output.pipeTo(
          new WritableStream({
            write(data: string) {
              console.log(data);
            }
          })
        );

        const exitCode = await process.exit;
        
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        if (exitCode !== 0) {
          throw new WebContainerError(
            `Command failed with exit code: ${exitCode}`,
            'executeCommand'
          );
        }
      } catch (error) {
        throw new WebContainerError(
          `Error executing command '${cmd.command}': ${error}`,
          'executeCommand'
        );
      }
    }
  }

  /**
   * Parse and setup complete project in WebContainer
   */
  public async setupProjectInWebContainer(
    weBuildString: string,
    webContainer?: WebContainer,
    options: ExecutionOptions = {}
  ): Promise<void> {
    const container = this.getWebContainer(webContainer);

    console.log('Setting up project in WebContainer...');

    try {
      // First create all files
      await this.createFilesInWebContainer(weBuildString, container);

      // Then execute commands
      await this.executeCommandsInWebContainer(weBuildString, container, options);

      console.log('Project setup complete!');
    } catch (error) {
      throw new WebContainerError(
        `Failed to setup project: ${error}`,
        'setupProject'
      );
    }
  }

  /**
   * Get file structure from parsed weBuild format
   */
  public getFileStructure(weBuildString: string): Readonly<Record<string, string>> {
    const { files } = this.parseWeBuildFormat(weBuildString);
    const structure: Record<string, string> = {};

    files.forEach(file => {
      structure[file.fileName] = file.content;
    });

    return Object.freeze(structure);
  }

  /**
   * Convert parsed files to WebContainer FileSystemTree format
   */
  public toFileSystemTree(weBuildString: string): FileSystemTree {
    const { files } = this.parseWeBuildFormat(weBuildString);
    const tree: FileSystemTree = {};

    files.forEach(file => {
      const parts = file.fileName.split('/');
      let current: any = tree;

      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!current[part]) {
          current[part] = {
            directory: {}
          };
        }
        current = current[part].directory;
      }

      const fileName = parts[parts.length - 1];
      current[fileName] = {
        file: {
          contents: file.content
        }
      };
    });

    return tree;
  }

  /**
   * Mount files directly using WebContainer mount API
   */
  public async mountProject(
    weBuildString: string,
    webContainer?: WebContainer,
    options: ExecutionOptions = {}
  ): Promise<void> {
    const container = this.getWebContainer(webContainer);

    try {
      const fileSystemTree = this.toFileSystemTree(weBuildString);
      
      await container.mount(fileSystemTree);
      console.log('Project mounted successfully!');
      
      // Execute any terminal commands after mounting
      await this.executeCommandsInWebContainer(weBuildString, container, options);
    } catch (error) {
      throw new WebContainerError(
        `Error mounting project: ${error}`,
        'mountProject'
      );
    }
  }

  /**
   * Helper method to get WebContainer instance
   */
  private getWebContainer(webContainer?: WebContainer): WebContainer {
    const container = webContainer || this.webContainer;
    if (!container) {
      throw new WebContainerError(
        'WebContainer instance is required. Use setWebContainer() or pass it as parameter.',
        'getWebContainer'
      );
    }
    return container;
  }

  /**
   * Extract directories from file list
   */
  private extractDirectories(files: readonly ParsedWeBuildFile[]): Set<string> {
    const directories = new Set<string>();
    
    files.forEach(file => {
      const parts = file.fileName.split('/');
      if (parts.length > 1) {
        for (let i = 1; i < parts.length; i++) {
          directories.add(parts.slice(0, i).join('/'));
        }
      }
    });

    return directories;
  }

  /**
   * Create directories in WebContainer
   */
  private async createDirectories(
    container: WebContainer,
    directories: Set<string>
  ): Promise<void> {
    for (const dir of directories) {
      try {
        await container.fs.mkdir(dir, { recursive: true });
      } catch (error) {
        // Directory might already exist, log warning but continue
        console.warn(`Could not create directory ${dir}:`, error);
      }
    }
  }

  /**
   * Write files to WebContainer
   */
  private async writeFiles(
    container: WebContainer,
    files: readonly ParsedWeBuildFile[]
  ): Promise<void> {
    for (const file of files) {
      try {
        await container.fs.writeFile(file.fileName, file.content);
        console.log(`Created file: ${file.fileName}`);
      } catch (error) {
        throw new WebContainerError(
          `Error writing file: ${error}`,
          'writeFile',
          file.fileName
        );
      }
    }
  }

  /**
   * Get parser statistics
   */
  public getStats(weBuildString: string): {
    readonly totalFiles: number;
    readonly totalCommands: number;
    readonly filesByExtension: Readonly<Record<string, number>>;
    readonly totalSize: number;
  } {
    const { files, commands } = this.parseWeBuildFormat(weBuildString);
    
    const filesByExtension: Record<string, number> = {};
    let totalSize = 0;

    files.forEach(file => {
      const extension = file.fileName.substring(file.fileName.lastIndexOf('.')) || 'no-extension';
      filesByExtension[extension] = (filesByExtension[extension] || 0) + 1;
      totalSize += file.content.length;
    });

    return {
      totalFiles: files.length,
      totalCommands: commands.length,
      filesByExtension: Object.freeze(filesByExtension),
      totalSize
    };
  }
}

// Factory function for getting singleton instance
export function getWeBuildParser(options?: ParserOptions): WeBuildParser {
  return WeBuildParser.getInstance(options);
}

// Legacy factory function (deprecated, use getWeBuildParser instead)
export function createWeBuildParser(
  webContainer?: WebContainer,
  options?: ParserOptions
): WeBuildParser {
  const parser = WeBuildParser.getInstance(options);
  if (webContainer) {
    parser.setWebContainer(webContainer);
  }
  return parser;
}

// Type guards
export function isFileNode(node: FileSystemNode): node is FileNode {
  return 'file' in node;
}

export function isDirectoryNode(node: FileSystemNode): node is DirectoryNode {
  return 'directory' in node;
}

export default WeBuildParser;

/*
// Example usage with Singleton pattern
async function singletonExample() {
  console.log('=== Singleton Pattern Example ===');
  
  try {
    // Boot WebContainer
    const webContainer = await WebContainer.boot();
    
    // Get singleton instance
    const parser = getWeBuildParser({
      validateContent: true,
      maxFileSize: 2 * 1024 * 1024 // 2MB
    });
    
    // Set WebContainer on singleton
    parser.setWebContainer(webContainer);
    
    // Use the same instance throughout your app
    const parser2 = getWeBuildParser(); // Returns same instance
    console.log('Same instance?', parser === parser2); // true
    
    const realWeBuildCode = `
<weBuild action="create" fileName="package.json">
{
  "name": "singleton-webuild-app",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build"
  },
  "dependencies": {
    "next": "15.2.4",
    "react": "^19",
    "react-dom": "^19"
  }
}
</weBuild>

<weBuild action="create" fileName="app/page.tsx">
export default function HomePage() {
  return (
    <div className="text-center p-8">
      <h1>Singleton WeBuild Parser</h1>
      <p>Single instance across the entire application!</p>
    </div>
  );
}
</weBuild>

<weBuild action="terminal" command="npm install">
</weBuild>
    `;
    
    // Use singleton to process weBuild format
    await parser.setupProjectInWebContainer(realWeBuildCode);
    
    console.log('✅ Singleton pattern working correctly!');
    
  } catch (error) {
    console.error('❌ Error with singleton example:', error);
  }
}
*/