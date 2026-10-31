'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const PORT = Number(process.env.PORT) || 3000;
const MAX_MESSAGES = 100;
const messages = [];
const clients = new Set();
const recentSends = new Map();

const assets = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/style.css': ['style.css', 'text/css; charset=utf-8'],
  '/app.js': ['app.js', 'application/javascript; charset=utf-8'],
};

function json(res, status, value) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(JSON.stringify(value));
}

function sendEvent(res, name, data) {
  res.write(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`);
}

function broadcast(name, data) {
  for (const client of clients) {
    try {
      sendEvent(client, name, data);
    } catch (_) {
      clients.delete(client);
    }
  }
}

function updateCount() {
  broadcast('presence', { count: clients.size });
}

async function readJSON(req) {
  let size = 0;
  const parts = [];
  for await (const part of req) {
    size += part.length;
    if (size > 4096) {
      const error = new Error('İstek çok büyük.');
      error.status = 413;
      throw error;
    }
    parts.push(part);
  }
  try {
    return JSON.parse(Buffer.concat(parts).toString('utf8'));
  } catch (_) {
    const error = new Error('Geçersiz JSON.');
    error.status = 400;
    throw error;
  }
}

const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;

  if (req.method === 'GET' && pathname === '/health') {
    return json(res, 200, { ok: true });
  }

  if (req.method === 'GET' && pathname === '/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'X-Content-Type-Options': 'nosniff',
    });
    res.write(': connected\n\n');
    clients.add(res);
    sendEvent(res, 'history', messages);
    updateCount();

    const keepAlive = setInterval(() => {
      if (!res.destroyed) res.write(': ping\n\n');
    }, 25000);
    req.on('close', () => {
      clearInterval(keepAlive);
      clients.delete(res);
      updateCount();
    });
    return;
  }

  if (req.method === 'POST' && pathname === '/api/messages') {
    try {
      const body = await readJSON(req);
      const nickname = typeof body?.nickname === 'string' ? body.nickname.trim() : '';
      const text = typeof body?.text === 'string' ? body.text.trim() : '';
      const clientId = typeof body?.clientId === 'string' ? body.clientId : '';

      if (!nickname || nickname.length > 24 || !text || text.length > 500 || clientId.length > 100) {
        return json(res, 400, { error: 'Takma ad (1–24) ve mesaj (1–500) karakter olmalı.' });
      }

      const address = req.socket.remoteAddress || 'unknown';
      const now = Date.now();
      if (now - (recentSends.get(address) || 0) < 700) {
        return json(res, 429, { error: 'Çok hızlı mesaj gönderiyorsun. Biraz yavaşla.' });
      }
      recentSends.set(address, now);

      const message = {
        id: randomUUID(),
        nickname,
        text,
        clientId,
        createdAt: new Date(now).toISOString(),
      };
      messages.push(message);
      if (messages.length > MAX_MESSAGES) messages.shift();
      broadcast('message', message);
      return json(res, 201, { ok: true });
    } catch (error) {
      return json(res, error.status || 500, { error: error.status ? error.message : 'Sunucu hatası.' });
    }
  }

  if (req.method === 'GET' && Object.hasOwn(assets, pathname)) {
    const [filename, mimeType] = assets[pathname];
    try {
      const contents = await fs.promises.readFile(path.join(__dirname, 'public', filename));
      res.writeHead(200, {
        'Content-Type': mimeType,
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'self'; connect-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
      });
      res.end(contents);
    } catch (_) {
      json(res, 500, { error: 'Sayfa yüklenemedi.' });
    }
    return;
  }

  json(res, 404, { error: 'Sayfa bulunamadı.' });
});

setInterval(() => {
  const limit = Date.now() - 60_000;
  for (const [address, time] of recentSends) {
    if (time < limit) recentSends.delete(address);
  }
}, 60_000).unref();

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Genel sohbet hazır: http://localhost:${PORT}`);
});
