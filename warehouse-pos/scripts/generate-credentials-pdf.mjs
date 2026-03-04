#!/usr/bin/env node
/**
 * Generates HunnidOfficial_Login_Credentials.pdf from the HTML credentials doc.
 * Run from warehouse-pos: node scripts/generate-credentials-pdf.mjs
 */
import { chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const htmlPath = path.join(root, 'docs', 'HunnidOfficial_Login_Credentials.html');
const pdfPath = path.join(root, 'docs', 'HunnidOfficial_Login_Credentials.pdf');

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle' });
await page.pdf({
  path: pdfPath,
  format: 'A4',
  margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
  printBackground: true,
});
await browser.close();
console.log('PDF saved:', pdfPath);
