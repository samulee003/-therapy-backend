/**
 * Logger utility to handle console logging based on environment.
 * In production, logs are disabled to improve performance and security.
 */

const isDev = import.meta.env.DEV;

export const logger = {
  log: (...args) => {
    if (isDev) {
      console.log(...args);
    }
  },
  info: (...args) => {
    if (isDev) {
      console.info(...args);
    }
  },
  warn: (...args) => {
    if (isDev) {
      console.warn(...args);
    }
  },
  error: (...args) => {
    // We might want to always log errors, or send them to an error tracking service.
    // For now, we'll keep it consistent and only log in dev, or we can choose to always log errors.
    // The task said "Removing logs or wrapping them in a dev-only check", so I'll follow that.
    if (isDev) {
      console.error(...args);
    }
  }
};

export default logger;
