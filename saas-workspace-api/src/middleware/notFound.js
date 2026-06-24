/*
 * src/middleware/notFound.js
 *
 * 404 handler that returns an animated HTML page when the client
 * prefers HTML (Accept header includes "text/html"), otherwise it
 * returns the standard JSON payload used throughout the API.
 */

'use strict';

module.exports = (req, res, _next) => {
  const accept = req.headers.accept || '';
  const isHtml = accept.includes('text/html');

  if (isHtml) {
    // Minimal HTML with CSS animation – no external assets.
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>404 – Not Found</title>
  <style>
    body {
      margin: 0;
      height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      background: linear-gradient(135deg, #0d0d0d, #1a1a2e);
      color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      overflow: hidden;
    }
    .container {
      text-align: center;
    }
    .title {
      font-size: 6rem;
      font-weight: 800;
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(8px);
      border-radius: 1rem;
      padding: 0.5rem 1rem;
      animation: float 3s ease-in-out infinite;
    }
    .subtitle {
      margin-top: 1rem;
      font-size: 1.5rem;
      opacity: 0.9;
    }
    .description {
      margin-top: 0.5rem;
      font-size: 1rem;
      opacity: 0.7;
    }
    @keyframes float {
      0%, 100% { transform: translateY(0) rotate(0deg); }
      50% { transform: translateY(-20px) rotate(2deg); }
    }
    /* Subtle floating shapes */
    .shape {
      position: absolute;
      border-radius: 50%;
      background: rgba(255,255,255,0.07);
      animation: drift 10s linear infinite;
    }
    .shape:nth-child(1) { width: 120px; height: 120px; top: 10%; left: 15%; }
    .shape:nth-child(2) { width: 80px; height: 80px; top: 70%; left: 80%; }
    .shape:nth-child(3) { width: 150px; height: 150px; top: 50%; left: 40%; }
    @keyframes drift {
      0% { transform: translate(0,0) rotate(0deg); }
      100% { transform: translate(200px,-200px) rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="shape"></div>
  <div class="shape"></div>
  <div class="shape"></div>
  <div class="container">
    <div class="title">404</div>
    <div class="subtitle">Route not found</div>
    <div class="description">The endpoint you are looking for does not exist.</div>
  </div>
</body>
</html>`;
    res.status(404).type('html').send(html);
  } else {
    // API JSON response – matches the existing format used elsewhere.
    res.status(404).json({
      success: false,
      error: { message: 'Route not found', code: 'NOT_FOUND' },
    });
  }
};
