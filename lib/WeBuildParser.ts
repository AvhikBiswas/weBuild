// Enums for better type safety
export enum WeBuildActionType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  TERMINAL = "terminal",
}

// Interfaces for structure parsing
export interface WeBuildFileStructure {
  readonly fileName: string
  readonly action: WeBuildActionType
  readonly hasContent: boolean
  readonly contentSize: number
}

export interface WeBuildCommandStructure {
  readonly command: string
  readonly action: WeBuildActionType
}

export interface WeBuildStructureResult {
  readonly files: readonly WeBuildFileStructure[]
  readonly commands: readonly WeBuildCommandStructure[]
  readonly totalBlocks: number
  readonly fileTree: readonly string[]
}

export interface DirectoryStructure {
  readonly [key: string]: DirectoryStructure | string
}

// Error types
export class WeBuildStructureError extends Error {
  constructor(
    message: string,
    public readonly blockIndex?: number,
  ) {
    super(message)
    this.name = "WeBuildStructureError"
  }
}

// Main structure parser class (Singleton)
export class WeBuildStructureParser {
  private static instance: WeBuildStructureParser | null = null

  // Private constructor prevents direct instantiation
  private constructor() {}

  /**
   * Get the singleton instance of WeBuildStructureParser
   */
  public static getInstance(): WeBuildStructureParser {
    if (!WeBuildStructureParser.instance) {
      WeBuildStructureParser.instance = new WeBuildStructureParser()
    }
    return WeBuildStructureParser.instance
  }

  /**
   * Reset the singleton instance (useful for testing)
   */
  public static resetInstance(): void {
    WeBuildStructureParser.instance = null
  }

  /**
   * Parse weBuild format string and extract only structure information
   */
  public parseStructure(weBuildString: string): WeBuildStructureResult {
    if (!weBuildString || typeof weBuildString !== "string") {
      throw new WeBuildStructureError("Invalid weBuild string provided")
    }

    const files: WeBuildFileStructure[] = []
    const commands: WeBuildCommandStructure[] = []

    // Regular expression to match weBuild blocks
    const weBuildRegex = /<weBuild\s+([^>]+)>([\s\S]*?)<\/weBuild>/g

    let match: RegExpExecArray | null
    let blockIndex = 0

    while ((match = weBuildRegex.exec(weBuildString)) !== null) {
      try {
        const attributes = match[1]
        const content = match[2].trim()

        const action = this.extractAttribute(attributes, "action")

        if (!action || !Object.values(WeBuildActionType).includes(action as WeBuildActionType)) {
          throw new WeBuildStructureError(`Invalid action: ${action}`, blockIndex)
        }

        const actionType = action as WeBuildActionType

        if (actionType === WeBuildActionType.CREATE || actionType === WeBuildActionType.UPDATE) {
          const fileName = this.extractAttribute(attributes, "fileName")
          if (!fileName) {
            throw new WeBuildStructureError("fileName is required for create/update actions", blockIndex)
          }

          files.push({
            fileName,
            action: actionType,
            hasContent: content.length > 0,
            contentSize: content.length,
          })
        } else if (actionType === WeBuildActionType.TERMINAL) {
          const command = this.extractAttribute(attributes, "command")
          if (!command) {
            throw new WeBuildStructureError("command is required for terminal actions", blockIndex)
          }

          commands.push({
            command: command.trim(),
            action: actionType,
          })
        }

        blockIndex++
      } catch (error) {
        if (error instanceof WeBuildStructureError) {
          throw error
        }
        throw new WeBuildStructureError(`Error parsing block ${blockIndex}: ${error}`, blockIndex)
      }
    }

    const fileTree = this.buildFileTree(files.map((f) => f.fileName))

    return {
      files: Object.freeze(files),
      commands: Object.freeze(commands),
      totalBlocks: blockIndex,
      fileTree: Object.freeze(fileTree),
    }
  }

  /**
   * Generate structural weBuild format with filenames only (no content)
   */
  public generateStructureFormat(weBuildString: string): string {
    const { files, commands } = this.parseStructure(weBuildString)

    let result = ""

    // Add file structures
    files.forEach((file) => {
      result += `<weBuild action="${file.action}" fileName="${file.fileName}">\n`
      result += `// Content skipped (${file.contentSize} characters)\n`
      result += `</weBuild>\n\n`
    })

    // Add command structures
    commands.forEach((cmd) => {
      result += `<weBuild action="${cmd.action}" command="${cmd.command}">\n`
      result += `</weBuild>\n\n`
    })

    return result.trim()
  }

  /**
   * Get only filenames as an array
   */
  public getFileNames(weBuildString: string): readonly string[] {
    const { files } = this.parseStructure(weBuildString)
    return Object.freeze(files.map((f) => f.fileName))
  }

  /**
   * Get only commands as an array
   */
  public getCommands(weBuildString: string): readonly string[] {
    const { commands } = this.parseStructure(weBuildString)
    return Object.freeze(commands.map((c) => c.command))
  }

  /**
   * Get hierarchical directory structure
   */
  public getDirectoryStructure(weBuildString: string): DirectoryStructure {
    const fileNames = this.getFileNames(weBuildString)
    return this.buildDirectoryStructure(fileNames)
  }

  /**
   * Get flat file tree representation
   */
  public getFileTree(weBuildString: string): readonly string[] {
    const fileNames = this.getFileNames(weBuildString)
    return this.buildFileTree(fileNames)
  }

  /**
   * Extract attribute value from weBuild tag attributes
   */
  private extractAttribute(attributes: string, attributeName: string): string | null {
    const regex = new RegExp(`${attributeName}=["']([^"']+)["']`)
    const match = attributes.match(regex)
    return match ? match[1] : null
  }

  /**
   * Build hierarchical directory structure
   */
  private buildDirectoryStructure(fileNames: readonly string[]): DirectoryStructure {
    const structure: DirectoryStructure = {}

    fileNames.forEach((fileName) => {
      const parts = fileName.split("/")
      let current: any = structure

      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i]
        if (!current[part]) {
          current[part] = {}
        }
        current = current[part]
      }

      const filename = parts[parts.length - 1]
      current[filename] = "file"
    })

    return structure
  }

  /**
   * Build flat file tree with indentation
   */
  private buildFileTree(fileNames: readonly string[]): string[] {
    const tree: string[] = []
    const directories = new Set<string>()

    // First, collect all directories
    fileNames.forEach((fileName) => {
      const parts = fileName.split("/")
      for (let i = 1; i < parts.length; i++) {
        directories.add(parts.slice(0, i).join("/"))
      }
    })

    // Sort directories and files
    const allItems = [
      ...Array.from(directories).map((dir) => ({ type: "dir", path: dir })),
      ...fileNames.map((file) => ({ type: "file", path: file })),
    ].sort((a, b) => a.path.localeCompare(b.path))

    // Build tree with proper indentation
    allItems.forEach((item) => {
      const depth = item.path.split("/").length - 1
      const indent = "  ".repeat(depth)
      const name = item.path.split("/").pop() || item.path
      const icon = item.type === "dir" ? "📁" : "📄"

      tree.push(`${indent}${icon} ${name}`)
    })

    return tree
  }
}

// Factory function for getting singleton instance
export function getWeBuildStructureParser(): WeBuildStructureParser {
  return WeBuildStructureParser.getInstance()
}

export default WeBuildStructureParser
