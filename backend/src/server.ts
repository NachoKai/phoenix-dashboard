import dotenv from 'dotenv';
import cors from 'cors';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { cleanupExpiredCache } from './db/index.js';
import { apiRouter } from './routes/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const __root = path.resolve(__dirname, '../..');

dotenv.config({ path: path.join(__root, '.env') });

const PORT = Number(process.env.PORT) || 3001;

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', apiRouter);

const frontendDist = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(frontendDist, 'index.html'), (err) => {
    if (err) next();
  });
});

cleanupExpiredCache();
setInterval(cleanupExpiredCache, 60 * 60 * 1000);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Moto Dashboard API running on http://0.0.0.0:${PORT}`);
});
