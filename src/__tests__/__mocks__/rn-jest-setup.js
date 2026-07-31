// Mock de react-native/jest/setup.js
// El archivo original usa ESM (import) que Jest no puede procesar en modo CommonJS
// cuando pnpm resuelve el path real del store (.pnpm/react-native@.../jest/setup.js).
// Este mock vacío reemplaza ese setup — nuestro jest.setup.js en la raíz
// ya cubre todos los mocks necesarios para los tests del proyecto.
