import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const archive = JSON.parse(read("data.js").trim().replace(/^window\.TBJ_DATA=/, "").replace(/;$/, ""));
const slugs = JSON.parse(read("scripts/generated-pages.json"));

test("all pages use the favicon and have no language toggle", () => {
  const pages = ["index.html", "scripts/tbj-collection-template.html", ...slugs.map((slug) => `${slug}/index.html`)];
  pages.forEach((page) => {
    const html = read(page);
    assert.match(html, /rel="icon"[^>]+icon\.png/);
    assert.doesNotMatch(html, /langToggle|Change language|>EN</);
  });
});

test("the interface is English-only", () => {
  ["landing.js", "gallery.js"].forEach((file) => {
    const source = read(file);
    assert.doesNotMatch(source, /tbzJapanLang|state\.lang|\bko\s*:/);
  });
});

test("Movie contains individual series galleries with release metadata", () => {
  const movie = archive.collections.find((collection) => collection.slug === "movie");
  assert.ok(movie);
  assert.equal(movie.galleryCount, movie.galleries.length);
  assert.ok(movie.galleryCount > 3);
  assert.equal(movie.itemCount, 254);
  assert.ok(movie.galleries.every((gallery) => Array.isArray(gallery.releaseYears)));
  assert.ok(movie.galleries.every((gallery) => typeof gallery.releaseSort === "string"));
  assert.ok(movie.galleries.every((gallery) => !/^20\d{2}(?:\s*-\s*20\d{2})?$/.test(gallery.name)));
});

test("Movie year filtering and newest-first defaults remain data-driven", () => {
  const script = read("gallery.js");
  const generator = read("scripts/update_the_b_japan.py");
  assert.match(script, /isMovie \? "newest" : "source"/);
  assert.match(script, /gallery\.releaseYears/);
  assert.match(script, /gallery\.releaseSort/);
  assert.match(generator, /def collect_movie_galleries/);
  assert.match(generator, /if slug == "movie"/);
});

test("the Pages artifact includes the favicon", () => {
  assert.match(read("scripts/prepare_site.py"), /"icon\.png"/);
});
