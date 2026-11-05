import { createApp } from './app.js';
import { config } from './config.js';
import { migrate } from './db/migrate.js';

// Перед запуском сервера база данных приводится к актуальной схеме
const applied = migrate();
if (applied.length) console.log(`Применены миграции: ${applied.join(', ')}`);

const app = createApp();
app.listen(config.port, () => {
  console.log(`Монета запущена: http://localhost:${config.port}`);
});
