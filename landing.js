(() => {
  "use strict";
  const DATA = window.TBJ_DATA;
  if (!DATA) return;

  const copy = {
    mainArchive: "MAIN ARCHIVE ↗",
    collections: "COLLECTIONS",
    media: "MEDIA",
    updated: "UPDATED",
    searchCollections: "SEARCH COLLECTIONS...",
    contents: "CONTENTS",
    openSource: "OPEN SOURCE FOLDER",
    noCollections: "NO COLLECTIONS FOUND",
    backTop: "BACK TO TOP ↑",
    galleries: "GALLERIES",
  };
  const state = { query: "" };
  const $ = (selector) => document.querySelector(selector);
  const driveFolder = (id) => `https://drive.google.com/drive/folders/${encodeURIComponent(id)}`;
  const number = (value) => new Intl.NumberFormat("en-US").format(value || 0);
  const date = (value) => {
    if (!value) return "—";
    return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" })
      .format(new Date(value))
      .toUpperCase();
  };

  function folderCard(collection, index) {
    const link = document.createElement("a");
    link.className = "folder";
    link.href = `${collection.slug}/index.html`;
    const position = document.createElement("span");
    position.className = "folder-number";
    position.textContent = String(index + 1).padStart(2, "0");
    const title = document.createElement("strong");
    title.textContent = collection.nameEn;
    const meta = document.createElement("small");
    meta.textContent = `${number(collection.galleryCount)} ${copy.galleries} · ${number(collection.itemCount)} ${copy.media} →`;
    link.append(position, title, meta);
    return link;
  }

  function render() {
    const grid = $("#folderGrid");
    grid.replaceChildren();
    const visible = DATA.collections.filter((collection) =>
      `${collection.name} ${collection.nameEn}`.toLocaleLowerCase().includes(state.query),
    );
    visible.forEach((collection, index) => grid.append(folderCard(collection, index)));
    $("#visibleCollections").textContent = number(visible.length);
    $("#empty").hidden = visible.length !== 0;
  }

  document.documentElement.lang = "en";
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = copy[element.dataset.i18n];
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    element.placeholder = copy[element.dataset.i18nPlaceholder];
  });
  $("#collectionCount").textContent = number(DATA.collectionCount);
  $("#mediaCount").textContent = number(DATA.itemCount);
  $("#updatedDate").textContent = date(DATA.updatedAt);
  $("#rootDrive").href = driveFolder(DATA.sourceFolderId);
  $("#collectionSearch").addEventListener("input", (event) => {
    state.query = event.target.value.trim().toLocaleLowerCase();
    render();
  });
  render();
})();
