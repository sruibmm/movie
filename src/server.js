import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
app.use(cors());

// --- محطة بث الفيديو "التوربو" ---
app.get('/fast-stream', async (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) return res.status(400).send('No URL');

  try {
    const response = await fetch(videoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://iwaatch.com/',
        'Range': req.headers.range // ضروري جداً لدعم التقديم (Seeking) بسرعة
      }
    });

    // نقل الترويسات لضمان التوافق مع الآيباد
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Accept-Ranges', 'bytes');
    if (response.headers.get('content-range')) {
        res.setHeader('Content-Range', response.headers.get('content-range'));
    }
    if (response.headers.get('content-length')) {
        res.setHeader('Content-Length', response.headers.get('content-length'));
    }

    // ضخ البيانات مباشرة بأقصى سرعة يسمح بها السيرفر
    response.body.pipe(res);
  } catch (error) {
    console.error("Fast Stream Error:", error);
    res.status(500).send("Streaming Error");
  }
});

// بروكسي الترجمة (كما هو)
app.get('/proxy-vtt', async (req, res) => {
  try {
    const response = await fetch(req.query.url);
    const text = await response.text();
    res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(text);
  } catch (e) { res.status(500).send("VTT Error"); }
});

app.listen(3001, '0.0.0.0', () => console.log("🚀 Turbo Server Ready: 3001"));