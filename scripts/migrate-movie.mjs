import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = path.join(project, "data.js");
const source = fs.readFileSync(dataPath, "utf8").trim();
const archive = JSON.parse(source.replace(/^window\.TBJ_DATA=/, "").replace(/;$/, ""));
const movie = archive.collections.find((collection) => collection.slug === "movie");

if (!movie) throw new Error("Movie collection not found");

function validDateToken(name) {
  const matches = [...name.matchAll(/(?<!\d)(\d{6})(?!\d)/g)].map((match) => match[1]);
  return matches.filter((token) => {
    const year = 2000 + Number(token.slice(0, 2));
    const month = Number(token.slice(2, 4));
    const day = Number(token.slice(4, 6));
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  });
}

function titleYears(value) {
  return [...value.matchAll(/\b(20\d{2})\b/g)].map((match) => Number(match[1]));
}

function makeGallery(oldGallery, name, media, suffix) {
  const tokens = media.flatMap((item) => validDateToken(item.name));
  const fileYears = tokens.map((token) => 2000 + Number(token.slice(0, 2)));
  const fallbackYears = titleYears(`${name} ${oldGallery.name}`);
  const releaseYears = [...new Set(fileYears.length ? fileYears : fallbackYears)].sort((a, b) => b - a);
  const counts = (type) => media.filter((item) => item.type === type).length;
  const cover = media.find((item) => item.type === "image") || media.find((item) => item.type === "video");
  const dates = media.map((item) => item.modifiedTime).filter(Boolean).sort();
  const fallbackSort = releaseYears[0] ? `${String(releaseYears[0] - 2000).padStart(2, "0")}0000` : "";
  return {
    id: `${oldGallery.id}-series-${suffix}`,
    folderId: oldGallery.folderId,
    name,
    itemCount: media.length,
    imageCount: counts("image"),
    videoCount: counts("video"),
    audioCount: counts("audio"),
    documentCount: counts("document"),
    coverId: cover?.id || "",
    updatedAt: dates.at(-1) || oldGallery.updatedAt || "",
    releaseYears,
    releaseSort: tokens.sort().at(-1) || fallbackSort,
    groups: [{ name: "MAIN", media }],
  };
}

const galleries = [];
movie.galleries.forEach((oldGallery, galleryIndex) => {
  oldGallery.groups.forEach((group, groupIndex) => {
    if (group.name === "MAIN") {
      group.media.forEach((item, itemIndex) => {
        const name = item.name.replace(/\.[^.]+$/, "").trim() || item.name;
        galleries.push(makeGallery(oldGallery, name, [item], `${galleryIndex}-main-${itemIndex}`));
      });
      return;
    }
    galleries.push(makeGallery(oldGallery, group.name, group.media, `${galleryIndex}-${groupIndex}`));
  });
});

movie.galleries = galleries;
movie.galleryCount = galleries.length;
movie.itemCount = galleries.reduce((sum, gallery) => sum + gallery.itemCount, 0);
movie.imageCount = galleries.reduce((sum, gallery) => sum + gallery.imageCount, 0);
movie.videoCount = galleries.reduce((sum, gallery) => sum + gallery.videoCount, 0);
movie.documentCount = galleries.reduce((sum, gallery) => sum + gallery.documentCount, 0);

fs.writeFileSync(dataPath, `window.TBJ_DATA=${JSON.stringify(archive)};\n`, "utf8");
console.log(`Converted Movie into ${galleries.length} individual series galleries.`);
