/**
 * Application Configuration
 * 
 * This file contains configuration settings and feature flags for the application.
 * Use this to enable/disable features or configure application behavior.
 */

// Feature Flags
export const featureFlags = {
  // Enable/disable features
  enableGrouping: true,
  enableFreehandDrawing: true,
  enableVisualization: true,
  enableAutoSave: false,
  enableCloudSync: false,
  enableRealTimeCollaboration: false,
  
  // Experimental features
  experimentalFeatures: {
    enhancedVisualization: false,
    aiSuggestions: false,
    gestureRecognition: false,
  }
};

// Application Settings
export const appSettings = {
  // Canvas settings
  canvas: {
    defaultImageUrl: "https://images2.dwell.com/photos/6133553759298379776/6297915443342360576/original.jpg?auto=format&q=35&w=1600",
    defaultColor: "#DD4627",
    selectionColor: "#4285F4",
    pointRadius: 8,
    lineWidth: 5,
    selectionLineWidth: 7,
  },
  
  // Session settings
  session: {
    defaultCountdown: 10,
    autoSaveInterval: 30000, // 30 seconds
  },
  
  // Animation settings
  animation: {
    transitionDuration: 800, // in milliseconds
    easingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
  },
  
  // UI settings
  ui: {
    traceboardWidth: "calc(24rem * 0.92)", // 92% of 24rem
    fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif",
    primaryColor: "#DD4627",
    backgroundColor: "#FBFAF8",
  }
};

// Environment-specific configuration
export const environmentConfig = {
  isDevelopment: typeof process !== 'undefined' && process.env?.NODE_ENV === "development",
  isProduction: typeof process !== 'undefined' && process.env?.NODE_ENV === "production",
  apiBaseUrl: (typeof process !== 'undefined' && process.env?.API_BASE_URL) || "https://api.example.com",
};

// Export a combined configuration object
export const config = {
  features: featureFlags,
  settings: appSettings,
  env: environmentConfig,
};

export default config; 