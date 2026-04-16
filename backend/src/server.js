import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config.js';
import './db.js';
import { loadUser } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import supervisionRoutes from './routes/supervision.js';
import workbenchRoutes from './routes/workbench.js';
import systemRoutes from './routes/system.js';

const app = express();

app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(cors({
  origin: config.frontendOrigin,
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser(config.sessionSecret));
app.use(loadUser);

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'research-lifecycle-manager-backend' });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/supervision', supervisionRoutes);
app.use('/api/workbench', workbenchRoutes);
app.use('/api/system', systemRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(config.port, () => {
  console.log(`research-lifecycle-manager backend listening on http://localhost:${config.port}`);
});
