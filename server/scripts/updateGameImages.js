import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const serverRoot = resolve(fileURLToPath(new URL('../', import.meta.url)));
const seedFilePath = resolve(serverRoot, 'src/seeds/seedDb.js');
const overridesPath = resolve(serverRoot, 'src/seeds/gameImageOverrides.json');

const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function extractFamobiTitles(seedSource) {
  const titles = [];
  const regex = /famobi\('([^']+)',\s*'((?:[^'\\]|\\.)+)'/g;
  let match;
  while ((match = regex.exec(seedSource))) {
    titles.push(match[2].replace(/\\'/g, "'"));
  }
  return [...new Set(titles)];
}

async function fetchDuckDuckGoVqd(query) {
  const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`;
  const response = await fetch(searchUrl, { headers: { 'User-Agent': userAgent } });
  const html = await response.text();
  const match = html.match(/vqd=\"([^\"]+)\"/);
  if (!match) {
    throw new Error(`Could not extract vqd for query: ${query}`);
  }
  return { searchUrl, vqd: match[1] };
}

async function searchImage(query) {
  const { searchUrl, vqd } = await fetchDuckDuckGoVqd(query);
  const apiUrl = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${encodeURIComponent(vqd)}&f=,,,&p=1`;
  const response = await fetch(apiUrl, {
    headers: {
      'User-Agent': userAgent,
      Referer: searchUrl,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Image search failed for ${query}: ${response.status}`);
  }

  const data = await response.json();
  const results = Array.isArray(data.results) ? data.results : [];
  const filtered = results.filter((result) => result?.image || result?.thumbnail);
  if (!filtered.length) return null;

  const normalizedQuery = query.toLowerCase();
  const exactMatch = filtered.find((result) =>
    `${result.title || ''} ${result.source || ''} ${result.url || ''}`.toLowerCase().includes(normalizedQuery)
  );

  const pick = exactMatch || filtered[0];
  return pick.image || pick.thumbnail || null;
}

async function main() {
  const seedSource = await readFile(seedFilePath, 'utf8');
  const titles = extractFamobiTitles(seedSource);

  const overrides = {};
  for (const title of titles) {
    const query = `${title} game cover`;
    try {
      const imageUrl = await searchImage(query);
      if (imageUrl) {
        overrides[title] = imageUrl;
        console.log(`✓ ${title}`);
      } else {
        console.log(`- ${title} (no image found)`);
      }
    } catch (error) {
      console.warn(`⚠ ${title} failed: ${error.message}`);
    }
  }

  await writeFile(overridesPath, `${JSON.stringify(overrides, null, 2)}\n`, 'utf8');
  console.log(`\nWrote ${Object.keys(overrides).length} image overrides to ${overridesPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});