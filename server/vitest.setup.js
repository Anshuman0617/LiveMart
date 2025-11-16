// Load environment variables for tests
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file from server directory (if it exists)
// This will load any existing .env file values
dotenv.config({ path: join(__dirname, '.env') });

// Set default test API key if not already set
// This ensures tests have a value even if .env file doesn't exist or doesn't have the key
// Tests can override this in beforeEach if needed
if (!process.env.GOOGLE_MAPS_API_KEY) {
  process.env.GOOGLE_MAPS_API_KEY = 'test-api-key-for-tests';
}

// Suppress console.warn for the specific Google Maps API key warning in tests
// (The actual code will still work, we just don't want the warning in test output)
const originalWarn = console.warn;
console.warn = (...args) => {
  const message = args[0]?.toString() || '';
  if (message.includes('GOOGLE_MAPS_API_KEY missing')) {
    // Suppress this specific warning in tests
    return;
  }
  originalWarn.apply(console, args);
};

