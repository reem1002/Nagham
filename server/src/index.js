import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';

await connectDB();
const app = createApp();
app.listen(env.port, '0.0.0.0', () => {
  console.log(`Nagham API running on http://localhost:${env.port}`);
});
