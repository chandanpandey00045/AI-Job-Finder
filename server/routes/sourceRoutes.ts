import express from 'express';
import { getAllSourcesHealth, allAdapters } from '../adapters/index.js';
import { db } from '../db/database.js';

export const sourceRouter = express.Router();

// GET /api/sources
sourceRouter.get('/', async (_req, res) => {
  try {
    const healthList = await getAllSourcesHealth();
    return res.json({ sources: healthList });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/sources/search-urls
sourceRouter.get('/search-urls', (req, res) => {
  try {
    const row = db.prepare("SELECT preferred_titles, preferred_locations, primary_skills FROM candidate_profiles WHERE id = 'default_profile'").get() as any;
    const titles = row ? JSON.parse(row.preferred_titles || '[]') : ['Data Engineer'];
    const locations = row ? JSON.parse(row.preferred_locations || '[]') : ['Bengaluru'];
    const skills = row ? JSON.parse(row.primary_skills || '[]') : ['Python', 'SQL'];

    const query = { titles, locations, skills };

    const searchUrls: Record<string, string> = {};
    for (const [id, adapter] of Object.entries(allAdapters)) {
      if (adapter.generateSearchUrl) {
        searchUrls[id] = adapter.generateSearchUrl(query);
      }
    }

    return res.json({ searchUrls });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
