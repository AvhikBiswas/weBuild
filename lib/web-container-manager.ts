import { WebContainer } from '@webcontainer/api'

// Inline types and enums to avoid import issues
export enum WeBuildActionType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  TERMINAL = 'terminal'
}

export interface WeBuildFileStructure {
  readonly fileName: string;
  readonly action: WeBuildActionType;
  readonly hasContent: boolean;
  readonly contentSize: number;
}

export interface WeBuildCommandStructure {
  readonly command: string;
  readonly action: WeBuildActionType;
}

export interface WeBuildStructureResult {
  readonly files: readonly WeBuildFileStructure[];
  readonly commands: readonly WeBuildCommandStructure[];
  readonly totalBlocks: number;
}

export interface FileSystemTree {
  [key: string]: {
    file?: {
      contents: string
    }
    directory?: FileSystemTree
  }
}

export class WebContainerManager {
  private static instance: WebContainerManager | null = null
  private webcontainer: WebContainer | null = null
  private isInitializing = false
  private initPromise: Promise<WebContainer> | null = null
  private serverUrl: string | null = null
  private serverReadyCallbacks: Set<(url: string) => void> = new Set()
  private serverProcess: any = null
  private isServerStarting = false

  private constructor() {}

  /**
   * Get the singleton instance of WebContainerManager
   */
  public static getInstance(): WebContainerManager {
    if (!WebContainerManager.instance) {
      WebContainerManager.instance = new WebContainerManager()
    }
    return WebContainerManager.instance
  }

  /**
   * Reset the singleton instance (useful for testing)
   */
  public static resetInstance(): void {
    if (WebContainerManager.instance?.webcontainer) {
      // Clean up existing container if any
      WebContainerManager.instance.cleanup()
    }
    WebContainerManager.instance = null
  }

  /**
   * Initialize WebContainer if not already initialized
   */
  private async initializeContainer(): Promise<WebContainer> {
    // Return existing container if available
    if (this.webcontainer) {
      return this.webcontainer
    }

    // Return existing initialization promise if in progress
    if (this.initPromise) {
      return this.initPromise
    }

    // Create new initialization promise
    this.initPromise = this.doInitialize()
    
    try {
      const container = await this.initPromise
      return container
    } catch (error) {
      // Clear the promise on error so we can retry
      this.initPromise = null
      throw error
    }
  }

  /**
   * Actual initialization logic
   */
  private async doInitialize(): Promise<WebContainer> {
    this.isInitializing = true

    try {
      console.log('Initializing WebContainer...')
      
      // Try to boot WebContainer with error handling
      this.webcontainer = await WebContainer.boot({
        // Add configuration to prevent multiple instances
        coep: 'require-corp',
        workdirName: 'webuild-app'
      })
      
      console.log('WebContainer initialized successfully')
      
      // Set up basic package.json if not exists
      await this.ensurePackageJson()
      
      return this.webcontainer
    } catch (error) {
      console.error('Failed to initialize WebContainer:', error)
      
      // Clean up on failure
      this.webcontainer = null
      this.isInitializing = false
      
      // Provide more specific error messages
      let errorMessage = 'WebContainer initialization failed'
      if (error instanceof Error) {
        if (error.message.includes('Unable to create more instances')) {
          errorMessage = 'WebContainer instance limit reached. Please refresh the page to reset.'
        } else if (error.message.includes('SharedArrayBuffer')) {
          errorMessage = 'WebContainer requires cross-origin isolation. Please check your browser settings.'
        } else {
          errorMessage = `WebContainer initialization failed: ${error.message}`
        }
      }
      
      throw new Error(errorMessage)
    } finally {
      this.isInitializing = false
    }
  }

  /**
   * Ensure package.json exists with basic configuration
   */
  private async ensurePackageJson(): Promise<void> {
    if (!this.webcontainer) return

    try {
      await this.webcontainer.fs.readFile('package.json', 'utf8')
    } catch {
      // package.json doesn't exist, create a basic one
      const packageJson = {
        name: 'webuild-preview',
        version: '1.0.0',
        type: 'module',
        scripts: {
          dev: 'vite --port 3000 --host',
          build: 'vite build',
          preview: 'vite preview'
        },
        dependencies: {
          react: '^18.2.0',
          'react-dom': '^18.2.0'
        },
        devDependencies: {
          '@types/react': '^18.2.0',
          '@types/react-dom': '^18.2.0',
          '@vitejs/plugin-react': '^4.0.0',
          typescript: '^5.0.0',
          vite: '^4.4.0'
        }
      }

      await this.webcontainer.fs.writeFile('package.json', JSON.stringify(packageJson, null, 2))
      
      // Create basic vite config
      const viteConfig = `
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0',
    strictPort: true
  },
  optimizeDeps: {
    include: ['react', 'react-dom']
  }
})
`
      await this.webcontainer.fs.writeFile('vite.config.ts', viteConfig)

      // Create basic index.html
      const indexHtml = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>WeBuild Preview</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`
      await this.webcontainer.fs.writeFile('index.html', indexHtml)

      // Ensure src directory exists
      await this.webcontainer.fs.mkdir('src', { recursive: true })

      // Create basic main.tsx if it doesn't exist
      const mainTsx = `
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
`
      
      try {
        await this.webcontainer.fs.readFile('src/main.tsx', 'utf8')
      } catch {
        await this.webcontainer.fs.writeFile('src/main.tsx', mainTsx)
      }

      // Create basic App.tsx if it doesn't exist
      const appTsx = `
import React from 'react'

function App() {
  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui' }}>
      <h1>WeBuild Preview</h1>
      <p>Your application will appear here.</p>
    </div>
  )
}

export default App
`
      
      try {
        await this.webcontainer.fs.readFile('src/App.tsx', 'utf8')
      } catch {
        await this.webcontainer.fs.writeFile('src/App.tsx', appTsx)
      }
    }
  }

  /**
   * Parse weBuild format string and extract structure information
   */
  private parseWeBuildStructure(weBuildString: string): WeBuildStructureResult {
    if (!weBuildString || typeof weBuildString !== 'string') {
      throw new Error('Invalid weBuild string provided')
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
        
        const action = this.extractAttribute(attributes, 'action')
        
        if (!action || !Object.values(WeBuildActionType).includes(action as WeBuildActionType)) {
          throw new Error(`Invalid action: ${action}`)
        }

        const actionType = action as WeBuildActionType

        if (actionType === WeBuildActionType.CREATE || actionType === WeBuildActionType.UPDATE) {
          const fileName = this.extractAttribute(attributes, 'fileName')
          if (!fileName) {
            throw new Error('fileName is required for create/update actions')
          }

          files.push({
            fileName,
            action: actionType,
            hasContent: content.length > 0,
            contentSize: content.length
          })
        } else if (actionType === WeBuildActionType.TERMINAL) {
          const command = this.extractAttribute(attributes, 'command')
          if (!command) {
            throw new Error('command is required for terminal actions')
          }

          commands.push({ 
            command: command.trim(),
            action: actionType
          })
        }

        blockIndex++
      } catch (error) {
        throw new Error(`Error parsing block ${blockIndex}: ${error}`)
      }
    }

    return {
      files: Object.freeze(files),
      commands: Object.freeze(commands),
      totalBlocks: blockIndex
    }
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
   * Extract file content from weBuild string
   */
  private extractFileContent(weBuildString: string, fileName: string): string {
    const regex = new RegExp(`<weBuild[^>]*fileName=["']${fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>([\\s\\S]*?)<\\/weBuild>`, 'g')
    const match = regex.exec(weBuildString)
    return match ? match[1].trim() : ''
  }

  /**
   * Update files in WebContainer based on weBuild string
   */
  public async updateFiles(weBuildString: string): Promise<void> {
    try {
      const container = await this.initializeContainer()
      const structure = this.parseWeBuildStructure(weBuildString)

      // Handle file operations
      for (const file of structure.files) {
        if (file.action === WeBuildActionType.DELETE) {
          try {
            await container.fs.rm(file.fileName, { recursive: true })
            console.log(`Deleted: ${file.fileName}`)
          } catch (error) {
            console.warn(`Could not delete ${file.fileName}:`, error)
          }
        } else {
          // CREATE or UPDATE
          const content = this.extractFileContent(weBuildString, file.fileName)
          
          // Ensure directory exists
          const dirPath = file.fileName.substring(0, file.fileName.lastIndexOf('/'))
          if (dirPath) {
            await container.fs.mkdir(dirPath, { recursive: true })
          }
          
          await container.fs.writeFile(file.fileName, content)
          console.log(`${file.action === WeBuildActionType.CREATE ? 'Created' : 'Updated'}: ${file.fileName}`)
        }
      }

      // Handle terminal commands
      for (const cmd of structure.commands) {
        console.log(`Executing command: ${cmd.command}`)
        try {
          const process = await container.spawn('sh', ['-c', cmd.command])
          
          process.output.pipeTo(new WritableStream({
            write(data) {
              console.log(`Command output: ${data}`)
            }
          }))

          const exitCode = await process.exit
          if (exitCode !== 0) {
            console.warn(`Command "${cmd.command}" exited with code ${exitCode}`)
          }
        } catch (error) {
          console.warn(`Failed to execute command "${cmd.command}":`, error)
        }
      }

      // Start or restart development server if not already running
      await this.startDevServer()

    } catch (error) {
      console.error('Failed to update files:', error)
      throw error
    }
  }

  /**
   * Start development server with better error handling
   */
  private async startDevServer(): Promise<void> {
    if (!this.webcontainer || this.isServerStarting) return

    this.isServerStarting = true

    try {
      // Kill existing server process if running
      if (this.serverProcess) {
        try {
          this.serverProcess.kill()
        } catch (e) {
          console.warn('Could not kill existing server process:', e)
        }
        this.serverProcess = null
      }

      // Install dependencies if needed
      console.log('Installing dependencies...')
      const installProcess = await this.webcontainer.spawn('npm', ['install'], {
        env: { NODE_ENV: 'development' }
      })
      
      installProcess.output.pipeTo(new WritableStream({
        write(data) {
          console.log(`npm install: ${data}`)
        }
      }))
      
      const installExitCode = await installProcess.exit
      
      if (installExitCode !== 0) {
        console.warn('npm install failed, but continuing...')
      }

      // Start dev server
      console.log('Starting development server...')
      this.serverProcess = await this.webcontainer.spawn('npm', ['run', 'dev'], {
        env: { NODE_ENV: 'development' }
      })
      
      // Set up server ready listener
      this.webcontainer.on('server-ready', (port, url) => {
        console.log(`Server ready at ${url}`)
        this.serverUrl = url
        this.isServerStarting = false
        this.serverReadyCallbacks.forEach(callback => callback(url))
      })

      // Log server output
      this.serverProcess.output.pipeTo(new WritableStream({
        write(data) {
          console.log(`Dev server: ${data}`)
          // Check for common server ready messages
          if (data.includes('ready') || data.includes('Local:') || data.includes('localhost:3000')) {
            if (!this.serverUrl) {
              const url = 'http://localhost:3000'
              this.serverUrl = url
              this.isServerStarting = false
              this.serverReadyCallbacks.forEach(callback => callback(url))
            }
          }
        }
      }))

      // Handle server process exit
      this.serverProcess.exit.then((exitCode: number) => {
        console.log(`Dev server exited with code ${exitCode}`)
        this.isServerStarting = false
        if (exitCode !== 0) {
          console.error('Dev server crashed')
          this.serverUrl = null
        }
      })

    } catch (error) {
      console.error('Failed to start dev server:', error)
      this.isServerStarting = false
      throw error
    }
  }

  /**
   * Get current server URL
   */
  public getServerUrl(): string | null {
    return this.serverUrl
  }

  /**
   * Register callback for server ready event
   */
  public onServerReady(callback: (url: string) => void): () => void {
    this.serverReadyCallbacks.add(callback)
    
    // If server is already ready, call callback immediately
    if (this.serverUrl) {
      callback(this.serverUrl)
    }

    // Return cleanup function
    return () => {
      this.serverReadyCallbacks.delete(callback)
    }
  }

  /**
   * Get WebContainer instance (for advanced usage)
   */
  public async getContainer(): Promise<WebContainer> {
    return this.initializeContainer()
  }

  /**
   * Check if container is ready
   */
  public isReady(): boolean {
    return this.webcontainer !== null && !this.isInitializing
  }

  /**
   * Cleanup WebContainer
   */
  public async cleanup(): Promise<void> {
    // Kill server process
    if (this.serverProcess) {
      try {
        this.serverProcess.kill()
      } catch (e) {
        console.warn('Could not kill server process:', e)
      }
      this.serverProcess = null
    }

    // Cleanup WebContainer
    if (this.webcontainer) {
      try {
        await this.webcontainer.teardown()
      } catch (e) {
        console.warn('Could not teardown WebContainer:', e)
      }
      this.webcontainer = null
    }

    // Reset state
    this.serverUrl = null
    this.isInitializing = false
    this.isServerStarting = false
    this.initPromise = null
    this.serverReadyCallbacks.clear()
  }
}

// Export singleton instance getter
export function getWebContainerManager(): WebContainerManager {
  return WebContainerManager.getInstance()
}