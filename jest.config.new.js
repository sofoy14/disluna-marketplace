/**
 * Configuración de Jest para Tests de Regresión
 * 
 * Configuración optimizada para tests del sistema legal con mocks apropiados.
 */

module.exports = {
  // Entorno de testing
  testEnvironment: 'node',
  
  // Directorios de tests
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.js'
  ],
  
  // Directorios a ignorar
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/dist/',
    '/build/'
  ],
  
  // Configuración de módulos
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  
  // Extensiones de archivos
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json'
  ],
  
  // Transformación de archivos
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  
  // Configuración de TypeScript
  preset: 'ts-jest',
  
  // Configuración de cobertura
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  
  // Archivos a incluir en cobertura
  collectCoverageFrom: [
    'lib/**/*.{ts,tsx}',
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
    '!**/__tests__/**'
  ],
  
  // Umbrales de cobertura
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  // Configuración de timeouts
  testTimeout: 30000, // 30 segundos para tests de integración
  
  // Configuración de setup
  setupFilesAfterEnv: [
    '<rootDir>/__tests__/setup.ts'
  ],
  
  // Configuración de mocks
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  // Configuración de verbose
  verbose: true,
  
  // Configuración de errores
  errorOnDeprecated: true,
  
  // Configuración de globals
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json'
    }
  },
  
  // Configuración de transformación de archivos estáticos
  transformIgnorePatterns: [
    '/node_modules/(?!(some-es6-module)/)'
  ],
  
  // Configuración de reporters
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'coverage',
      outputName: 'junit.xml',
      suiteName: 'Legal Assistant Tests'
    }]
  ],
  
  // Configuración de watchman
  watchman: false,
  
  // Configuración de cache
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache'
}







