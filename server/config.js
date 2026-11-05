import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Переменные окружения читаются из файла .env, если он существует
try {
  process.loadEnvFile(path.join(__dirname, '..', '.env'));
} catch {
  // файла .env нет - используются значения по умолчанию
}

const DEFAULT_PORT = 3000;

export const config = {
  port: Number(process.env.PORT) || DEFAULT_PORT,
  dbPath: process.env.DB_PATH || path.join(__dirname, '..', 'data', 'moneta.db'),
  clientDir: path.join(__dirname, '..', 'client'),
  migrationsDir: path.join(__dirname, 'db', 'migrations'),
};
