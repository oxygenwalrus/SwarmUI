export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Check if we're in development mode (Vite uses import.meta.env)
const isDevelopment = import.meta.env?.DEV ?? true;

class Logger {
    private formatMessage(level: LogLevel, message: string): string {
        const timestamp = new Date().toLocaleTimeString();
        return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    }

    debug(message: string, ...args: unknown[]) {
        // Only log debug in development
        if (isDevelopment) {
            console.debug(this.formatMessage('debug', message), ...args);
        }
    }

    info(message: string, ...args: unknown[]) {
        console.info(this.formatMessage('info', message), ...args);
    }

    warn(message: string, ...args: unknown[]) {
        console.warn(this.formatMessage('warn', message), ...args);
    }

    error(message: string, ...args: unknown[]) {
        console.error(this.formatMessage('error', message), ...args);
    }

    group(label: string) {
        if (isDevelopment) {
            console.groupCollapsed(`[${new Date().toLocaleTimeString()}] ${label}`);
        }
    }

    groupEnd() {
        if (isDevelopment) {
            console.groupEnd();
        }
    }
}

export const logger = new Logger();
