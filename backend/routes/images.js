const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { getDb } = require('../config/database');

const ALLOWED_TABLES = new Set(['menu_items', 'central_kitchen_items']);

const getPublicBaseUrl = (req) => (req ? `${req.protocol}://${req.get('host')}` : '');

const isGeneratedImageUrl = (url) => typeof url === 'string' && url.includes('/api/images/');

const imageVersion = (dataUrl) => crypto.createHash('sha1').update(dataUrl).digest('hex').slice(0, 10);

const toCachedImageUrl = (reqOrBase, table, id, imageUrl) => {
  if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.startsWith('data:image/')) {
    return imageUrl || null;
  }
  const base = typeof reqOrBase === 'string' ? reqOrBase : getPublicBaseUrl(reqOrBase);
  return `${base}/api/images/${table}/${id}?v=${imageVersion(imageUrl)}`;
};

const mapCachedImages = (req, table, rows, idField = 'id') => {
  if (!Array.isArray(rows)) return rows;
  const base = getPublicBaseUrl(req);
  return rows.map((row) => (
    row && row.image_url && typeof row.image_url === 'string' && row.image_url.startsWith('data:image/')
      ? { ...row, image_url: `${base}/api/images/${table}/${row[idField]}?v=${imageVersion(row.image_url)}` }
      : row
  ));
};

// Serve Base64 product images as immutable cached binary responses to cut Render API bandwidth
router.get('/:table/:id', async (req, res) => {
  const { table, id } = req.params;
  if (!ALLOWED_TABLES.has(table)) {
    return res.status(400).json({ success: false, error: 'Invalid table' });
  }
  const itemId = Number(id);
  if (!Number.isInteger(itemId) || itemId <= 0) {
    return res.status(400).json({ success: false, error: 'Invalid id' });
  }

  try {
    const db = getDb();
    const row = await db.prepare(`SELECT image_url FROM ${table} WHERE id = ?`).get(itemId);
    const dataUrl = row?.image_url;
    if (!dataUrl || typeof dataUrl !== 'string') {
      return res.status(404).end();
    }

    const match = /^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/.exec(dataUrl);
    if (!match) {
      return res.redirect(dataUrl);
    }

    const buf = Buffer.from(match[2], 'base64');
    res.set('Content-Type', match[1]);
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    return res.send(buf);
  } catch (err) {
    console.error('Image serve error:', err);
    return res.status(500).end();
  }
});

module.exports = router;
module.exports.getPublicBaseUrl = getPublicBaseUrl;
module.exports.isGeneratedImageUrl = isGeneratedImageUrl;
module.exports.toCachedImageUrl = toCachedImageUrl;
module.exports.mapCachedImages = mapCachedImages;
