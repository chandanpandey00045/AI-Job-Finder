import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  databasePath: process.env.DATABASE_PATH || path.resolve(process.cwd(), 'server/data/job_finder.db'),
  resumeStoragePath: process.env.RESUME_STORAGE_PATH || path.resolve(process.cwd(), 'server/uploads/resumes'),
  
  // AI Config
  aiProvider: process.env.AI_PROVIDER || 'deterministic',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  geminiApiKey: process.env.GEMINI_API_KEY || '',

  // Adzuna API
  adzunaAppId: process.env.ADZUNA_APP_ID || '',
  adzunaAppKey: process.env.ADZUNA_APP_KEY || '',
  adzunaCountry: process.env.ADZUNA_COUNTRY || 'in',

  // Rate Limits
  linkedinDailyMax: parseInt(process.env.LINKEDIN_DAILY_MAX_APPS || '25', 10),
  naukriDailyMax: parseInt(process.env.NAUKRI_DAILY_MAX_APPS || '30', 10),
  indeedDailyMax: parseInt(process.env.INDEED_DAILY_MAX_APPS || '30', 10),

  // Search Schedule
  defaultSearchIntervalHours: parseInt(process.env.DEFAULT_SEARCH_INTERVAL_HOURS || '24', 10),
  autoSearchEnabled: process.env.AUTO_SEARCH_ENABLED === 'true'
};
