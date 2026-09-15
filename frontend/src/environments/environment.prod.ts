// Production / staging build. Replaced into environment.ts at build time via
// angular.json → configurations.production.fileReplacements.
//
// Set these to your deployed backend's public URL (the Node host — Render / Railway / Fly / VPS),
// NOT Vercel. Example: https://markops-api.onrender.com
export const environment = {
  production: true,
  apiUrl: 'https://REPLACE-WITH-YOUR-API-HOST/api',
  socketUrl: 'https://REPLACE-WITH-YOUR-API-HOST',
};
