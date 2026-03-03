const fs = require('fs');

const apiKey =
  process.env.WEATHER_API_KEY || '';
const apiUrl =
  process.env.WEATHER_API_URL ||
  'https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/';

const content = `export const environment = {
  production: true,
  weatherApiKey: '${apiKey}',
  weatherApiUrl: '${apiUrl}',
};
`;

fs.writeFileSync('src/environments/environment.ts', content, {
  encoding: 'utf8',
});
console.log('Generated src/environments/environment.ts for Netlify build');

