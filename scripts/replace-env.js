const fs = require('fs');
const path = require('path');

const appName = process.env.STING_APP_NAME || 'SearchClimber.ai';
const microUrl = process.env.STING_MICRO_URL || 'https://droppin.shop';
const shireUrl = process.env.STING_SHIRE_URL || 'https://shire.droppin.shop';

const templatePath = path.join(__dirname, '../src/environments/environment.template.ts');
const outputPath = path.join(__dirname, '../src/environments/environment.prod.ts');
let content = fs.readFileSync(templatePath, 'utf8');

content = content.replace(/REPLACE_WITH_APP_NAME/g, appName);
content = content.replace(/REPLACE_WITH_MICROSERVICE_URL/g, microUrl);
// Only replace the const assignment — not the sentinel check in SHIRE_BASE_URL ternary.
content = content.replace(
  /const shireBaseUrl = 'REPLACE_WITH_SHIRE_URL';/,
  `const shireBaseUrl = '${shireUrl}';`,
);

fs.writeFileSync(outputPath, content);
console.log('Environment configured:', { appName, microUrl, shireUrl: shireUrl || null });
