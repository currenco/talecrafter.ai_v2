import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { URL } from 'node:url';
import { existsSync, readFileSync } from 'node:fs';
import ts from 'typescript';

const root = new URL('../', import.meta.url);
registerHooks({
  resolve(specifier, context, next) {
    const url = specifier.startsWith('@/') ? new URL(specifier.slice(2), root)
      : specifier.startsWith('.') ? new URL(specifier, context.parentURL) : null;
    if (url?.href.startsWith(root.href) && existsSync(new URL(`${url.href}.ts`))) {
      return next(`${url.href}.ts`, context);
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.startsWith(root.href) && url.endsWith('.ts')) {
      return { format: 'module', shortCircuit: true, source: ts.transpileModule(readFileSync(new URL(url), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
      }).outputText };
    }
    return next(url, context);
  },
});

const { pageMetadata, publicPageMetadata, rootMetadata } = await import('../lib/seo/metadata.ts');
const { storyMetadata, storyStructuredData } = await import('../lib/seo/story.ts');
const { serializeJsonLd } = await import('../lib/seo/structured-data.ts');
const { sitemapIndex, sitemapXml, staticSitemapXml, storySitemapXml, sitemapUnavailable } = await import('../lib/seo/sitemap.ts');
const { default: robots } = await import('../app/robots.ts');
const { privacyPolicy, termsAndConditions, legalContactEmail, legalEffectiveDate } = await import('../lib/legal/policies.ts');

test('legal pages include the confirmed contact and public metadata without draft or vendor-list sections', () => {
  assert.equal(legalContactEmail, 'contact@talecrafterai.com');
  assert.equal(legalEffectiveDate, '2026-10-17');
  for (const document of [privacyPolicy, termsAndConditions]) {
    const metadata = publicPageMetadata(document.path);
    assert.equal(metadata.robots.index, true);
    assert.equal(metadata.alternates.canonical, `https://www.talecrafterai.com${document.path}`);
    assert.ok(staticSitemapXml().includes(document.path));
    assert.equal(new Set(document.sections.map(section => section.id)).size, document.sections.length);
    assert.ok(document.sections.every(section => section.paragraphs.length > 0));
    assert.ok(document.sections.some(section => section.links?.some(link => link.href === `mailto:${legalContactEmail}`)));
    assert.doesNotMatch(JSON.stringify(document), /Draft for review|this draft|proposed|before final|Service providers and AI processing|Neon|Cloudinary|Vercel|Render|Gemini|Razorpay|India|individual operator|\bLtd\b|\bLLC\b/i);
  }
  assert.match(JSON.stringify(privacyPolicy), /Google Analytics/);
  assert.match(JSON.stringify(privacyPolicy), /AI requests can include your prompts/);
});

test('only explicitly public pages opt into indexing with production canonical URLs', () => {
  assert.equal(rootMetadata.robots.index, false);
  for (const path of ['/', '/about', '/pricing', '/explore', '/how-to-use']) {
    const metadata = publicPageMetadata(path);
    assert.equal(metadata.robots.index, true);
    assert.match(metadata.alternates.canonical, /^https:\/\/www\.talecrafterai\.com/);
    assert.ok(metadata.description.length > 30);
    assert.equal(metadata.openGraph.url, metadata.alternates.canonical);
  }
  assert.throws(() => publicPageMetadata('/dashboard'));
});

test('sign-in variants consolidate to a non-indexable sign-in page', () => {
  const layout = readFileSync(new URL('../app/(auth)/sign-in/layout.tsx', import.meta.url), 'utf8');
  assert.match(layout, /path: "\/sign-in"/);
  assert.match(layout, /index: false/);
  const metadata = pageMetadata({ title: 'Sign in', description: 'Account access', path: '/sign-in', index: false });
  assert.equal(metadata.alternates.canonical, 'https://www.talecrafterai.com/sign-in');
  assert.equal(metadata.robots.index, false);
});

test('public stories provide readable chapter text while the client-only reader loads', () => {
  const reader = readFileSync(new URL('../app/story/[slug]/StoryPageClient.tsx', import.meta.url), 'utf8');
  assert.match(reader, /loading: ReadableBookFallback/);
  assert.match(reader, /<BookTextContext.Provider value=\{chapters\}>/);
  const fallback = reader.slice(reader.indexOf('function ReadableBookFallback'), reader.indexOf('type FlipBookHandle'));
  assert.match(fallback, /getCleanChapterText\(chapter\)/);
  assert.match(fallback, /aria-label="Story text"/);
});

test('story metadata uses public content and JSON-LD cannot inject executable scripts', () => {
  const story = { slug: 'a-story', output: { title: '</script><script>alert(1)</script>', chapters: [{ textPrompt: 'An illustrated journey.' }] }, coverImage: 'javascript:alert(1)', userEmail: 'private@example.invalid' };
  const metadata = storyMetadata(story);
  assert.equal(metadata.alternates.canonical, 'https://www.talecrafterai.com/story/a-story');
  assert.equal(metadata.description, 'An illustrated journey.');
  assert.match(metadata.openGraph.images[0].url, /^https:/);
  const serialized = serializeJsonLd(storyStructuredData(story));
  assert.doesNotMatch(serialized, /<|private@example/);
  assert.equal(JSON.parse(serialized)['@graph'][0].name, story.output.title);
});

test('sitemaps shard published stories and escape URLs without inventing modification dates', () => {
  assert.equal((sitemapIndex(1001, 1000).match(/<sitemap>/g) || []).length, 3);
  assert.match(sitemapIndex(1001, 1000), /stories-1.xml/);
  assert.doesNotMatch(staticSitemapXml(), /lastmod|dashboard|sign-in|create-story/);
  assert.match(sitemapXml([{ url: 'https://example.com/?a=1&b=2', updatedAt: 'invalid' }]), /&amp;/);
  const xml = storySitemapXml({ items: [{ slug: 'story & title', updatedAt: '2026-10-17T00:00:00Z' }] });
  assert.match(xml, /story%20%26%20title/);
  assert.match(xml, /<lastmod>2026-10-17T00:00:00.000Z<\/lastmod>/);
  assert.equal(sitemapUnavailable().status, 503);
  assert.equal(robots().sitemap, 'https://www.talecrafterai.com/sitemap.xml');
  assert.ok(!robots().rules.disallow.includes('/sign-in'));
});
