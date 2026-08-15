(() => {
  "use strict";
  const DATA = window.TBJ_DATA;
  if (!DATA) return;

  const slug = document.body.dataset.collection;
  const collection = DATA.collections.find((item) => item.slug === slug);
  if (!collection) {
    document.body.innerHTML = '<p class="noscript">Collection not found. <a href="../index.html">Return to THE B JAPAN</a>.</p>';
    return;
  }

  const copy = {
    mainArchive: "MAIN ARCHIVE ↗",
    backToArchive: "THE B JAPAN",
    galleries: "GALLERIES",
    media: "MEDIA",
    updated: "UPDATED",
    searchGalleries: "SEARCH GALLERIES...",
    sort: "SORT",
    year: "YEAR",
    allYears: "ALL YEARS",
    sourceOrder: "SOURCE ORDER",
    newest: "NEWEST",
    largest: "MOST MEDIA",
    openSource: "OPEN SOURCE FOLDER",
    noResults: "NO GALLERIES FOUND",
    backTop: "BACK TO TOP ↑",
    openFolder: "OPEN FOLDER",
    openDocument: "OPEN DOCUMENT",
    downloadNote: "OPEN OR DOWNLOAD EACH FILE USING THE LINKS BELOW.",
    liveDocument: "THIS DOCUMENT IS LOADED LIVE FROM GOOGLE DOCS. EDITS APPEAR HERE AUTOMATICALLY.",
    openGallery: "OPEN GALLERY",
    results: "GALLERIES",
    view: "VIEW",
    download: "DOWNLOAD",
    play: "PLAY",
    images: "PHOTOS",
    videos: "VIDEOS",
    documents: "DOCUMENTS",
  };
  const isMovie = slug === "movie";
  const state = { query: "", sort: isMovie ? "newest" : "source", year: "all", current: null };
  const $ = (selector) => document.querySelector(selector);
  const driveFolder = (id) => `https://drive.google.com/drive/folders/${encodeURIComponent(id)}`;
  const thumb = (id, width = 1000) => `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w${width}`;
  const view = (id) => `https://drive.google.com/file/d/${encodeURIComponent(id)}/view`;
  const download = (id) => `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`;
  const preview = (id) => `https://drive.google.com/file/d/${encodeURIComponent(id)}/preview`;
  const docPreview = (id) => `https://docs.google.com/document/d/${encodeURIComponent(id)}/preview`;
  const docView = (id) => `https://docs.google.com/document/d/${encodeURIComponent(id)}/edit?usp=sharing`;
  const QA_TITLES = new Map([
    ["더비재팬 모바일 Q&A 고민상담 아카이브 (한)", "Q&A Counseling Corner"],
    ["더비재팬 모바일 Q&A 아카이브 (한)", "Q&A"],
  ]);
  const number = (value) => new Intl.NumberFormat("en-US").format(value || 0);
  const date = (value) => {
    if (!value) return "—";
    return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" })
      .format(new Date(value))
      .toUpperCase();
  };

  function displayGalleries() {
    if (collection.slug !== "q-a") return collection.galleries;
    const documents = collection.galleries
      .flatMap((gallery) => gallery.groups.flatMap((group) => group.media))
      .filter((item) => item.mimeType === "application/vnd.google-apps.document");
    return documents.map((item) => ({
      id: `doc-${item.id}`,
      folderId: collection.id,
      documentId: item.id,
      name: QA_TITLES.get(item.name) || item.name,
      itemCount: 1,
      imageCount: 0,
      videoCount: 0,
      audioCount: 0,
      documentCount: 1,
      coverId: "",
      updatedAt: item.modifiedTime,
      groups: [{ name: "GOOGLE DOCS", media: [item] }],
    }));
  }

  function searchableText(gallery) {
    const groupText = gallery.groups
      .flatMap((group) => [group.name, ...group.media.map((item) => item.name)])
      .join(" ");
    return `${gallery.name} ${(gallery.releaseYears || []).join(" ")} ${groupText}`.toLocaleLowerCase();
  }

  function sortedGalleries() {
    const items = displayGalleries()
      .map((gallery, index) => ({ gallery, index }))
      .filter(({ gallery }) => searchableText(gallery).includes(state.query))
      .filter(({ gallery }) => state.year === "all" || (gallery.releaseYears || []).includes(Number(state.year)));
    if (state.sort === "newest") {
      items.sort((a, b) => {
        if (isMovie) {
          const byRelease = (b.gallery.releaseSort || "").localeCompare(a.gallery.releaseSort || "");
          if (byRelease) return byRelease;
        } else {
          const byUpdate = (b.gallery.updatedAt || "").localeCompare(a.gallery.updatedAt || "");
          if (byUpdate) return byUpdate;
        }
        return b.index - a.index;
      });
    }
    if (state.sort === "largest") items.sort((a, b) => b.gallery.itemCount - a.gallery.itemCount);
    if (state.sort === "az") items.sort((a, b) => a.gallery.name.localeCompare(b.gallery.name, undefined, { numeric: true }));
    return items;
  }

  function galleryCard(gallery, index) {
    const article = document.createElement("article");
    article.className = "card";
    const imageButton = document.createElement("button");
    imageButton.className = "thumb";
    imageButton.type = "button";
    imageButton.dataset.open = gallery.id;
    imageButton.setAttribute("aria-label", `${copy.openGallery}: ${gallery.name}`);
    if (gallery.coverId) {
      const image = document.createElement("img");
      image.src = thumb(gallery.coverId);
      image.alt = "";
      image.loading = "lazy";
      image.referrerPolicy = "no-referrer";
      imageButton.append(image);
    } else {
      const placeholder = document.createElement("span");
      placeholder.className = "thumb-placeholder";
      placeholder.textContent = gallery.documentCount ? "DOCUMENT" : "FOLDER";
      imageButton.append(placeholder);
    }
    const badge = document.createElement("span");
    badge.className = "number";
    badge.textContent = String(index + 1).padStart(2, "0");
    const count = document.createElement("span");
    count.className = "photo-count";
    count.textContent = `${number(gallery.itemCount)} ${copy.media}`;
    imageButton.append(badge, count);

    const info = document.createElement("div");
    info.className = "card-info";
    const eyebrow = document.createElement("span");
    eyebrow.className = "eyebrow";
    const years = (gallery.releaseYears || []).join(" · ");
    eyebrow.textContent = isMovie && years ? `${collection.nameEn} / ${years}` : `${collection.nameEn} / ${String(index + 1).padStart(2, "0")}`;
    const title = document.createElement("h2");
    title.textContent = gallery.name;
    const meta = document.createElement("div");
    meta.className = "meta";
    const values = [
      [copy.images, number(gallery.imageCount)],
      [copy.videos, number(gallery.videoCount)],
      [copy.documents, number(gallery.documentCount)],
      [isMovie && years ? copy.year : copy.updated, isMovie && years ? years : date(gallery.updatedAt)],
    ];
    values.forEach(([label, value]) => {
      const labelElement = document.createElement("span");
      labelElement.textContent = label;
      const valueElement = document.createElement("strong");
      valueElement.textContent = value;
      meta.append(labelElement, valueElement);
    });
    const actions = document.createElement("div");
    actions.className = "card-actions";
    const openButton = document.createElement("button");
    openButton.type = "button";
    openButton.dataset.open = gallery.id;
    openButton.textContent = `${copy.openGallery} →`;
    const source = document.createElement("a");
    source.href = gallery.documentId ? docView(gallery.documentId) : driveFolder(gallery.folderId);
    source.target = "_blank";
    source.rel = "noopener noreferrer";
    source.textContent = `${gallery.documentId ? copy.openDocument : copy.openFolder} ↗`;
    actions.append(openButton, source);
    info.append(eyebrow, title, meta, actions);
    article.append(imageButton, info);
    return article;
  }

  function renderCards() {
    const items = sortedGalleries();
    const cards = $("#cards");
    cards.replaceChildren();
    items.forEach(({ gallery }, index) => cards.append(galleryCard(gallery, index)));
    const yearLabel = isMovie && state.year !== "all" ? `${state.year} · ` : "";
    $("#resultsCount").textContent = `${yearLabel}${number(items.length)} ${copy.results}`;
    $("#empty").hidden = items.length !== 0;
  }

  function mediaCard(item) {
    const figure = document.createElement("figure");
    figure.className = `photo media-${item.type}`;
    if (item.type === "image") {
      const image = document.createElement("img");
      image.src = thumb(item.id, 1600);
      image.alt = item.name;
      image.loading = "lazy";
      image.referrerPolicy = "no-referrer";
      if (item.width && item.height) {
        image.width = item.width;
        image.height = item.height;
      }
      figure.append(image);
    } else if (item.type === "video") {
      const playButton = document.createElement("button");
      playButton.className = "media-preview";
      playButton.type = "button";
      playButton.dataset.play = item.id;
      playButton.setAttribute("aria-label", `${copy.play}: ${item.name}`);
      const image = document.createElement("img");
      image.src = thumb(item.id, 1200);
      image.alt = "";
      image.loading = "lazy";
      image.referrerPolicy = "no-referrer";
      const badge = document.createElement("span");
      badge.className = "play-badge";
      badge.textContent = `▶ ${copy.play}`;
      playButton.append(image, badge);
      figure.append(playButton);
    } else {
      const documentCover = document.createElement("a");
      documentCover.className = "document-cover";
      documentCover.href = view(item.id);
      documentCover.target = "_blank";
      documentCover.rel = "noopener noreferrer";
      const type = document.createElement("strong");
      type.textContent = item.type === "audio" ? "AUDIO" : "DOCUMENT";
      const hint = document.createElement("span");
      hint.textContent = `${copy.view} ↗`;
      documentCover.append(type, hint);
      figure.append(documentCover);
    }
    const bar = document.createElement("figcaption");
    bar.className = "photo-bar";
    const name = document.createElement("span");
    name.className = "photo-name";
    name.title = item.name;
    name.textContent = item.name;
    const links = document.createElement("span");
    links.className = "photo-links";
    if (item.type === "video") {
      const playLink = document.createElement("button");
      playLink.type = "button";
      playLink.dataset.play = item.id;
      playLink.textContent = `${copy.play} ▶`;
      links.append(playLink);
    }
    const viewLink = document.createElement("a");
    viewLink.href = view(item.id);
    viewLink.target = "_blank";
    viewLink.rel = "noopener noreferrer";
    viewLink.textContent = `${copy.view} ↗`;
    const downloadLink = document.createElement("a");
    downloadLink.href = download(item.id);
    downloadLink.target = "_blank";
    downloadLink.rel = "noopener noreferrer";
    downloadLink.textContent = `${copy.download} ↓`;
    links.append(viewLink, downloadLink);
    bar.append(name, links);
    figure.append(bar);
    return figure;
  }

  function renderOpenGallery() {
    const gallery = state.current;
    if (!gallery) return;
    $("#dialogTitle").textContent = gallery.name;
    $("#dialogKicker").textContent = `${collection.nameEn} · ${number(gallery.itemCount)} ${copy.media}`;
    const dialogLink = $("#dialogDrive");
    const dialogLinkLabel = dialogLink.querySelector("span");
    const note = $(".gallery-note");
    const groups = $("#galleryGroups");
    groups.replaceChildren();
    if (gallery.documentId) {
      dialogLink.href = docView(gallery.documentId);
      dialogLinkLabel.textContent = copy.openDocument;
      note.textContent = copy.liveDocument;
      const reader = document.createElement("div");
      reader.className = "google-doc-reader";
      const frame = document.createElement("iframe");
      frame.src = docPreview(gallery.documentId);
      frame.title = gallery.name;
      frame.loading = "eager";
      frame.referrerPolicy = "no-referrer";
      reader.append(frame);
      groups.append(reader);
      return;
    }
    dialogLink.href = driveFolder(gallery.folderId);
    dialogLinkLabel.textContent = copy.openFolder;
    note.textContent = copy.downloadNote;
    gallery.groups.forEach((group) => {
      const section = document.createElement("section");
      section.className = "scan-group";
      const heading = document.createElement("h3");
      heading.className = "group-heading";
      heading.textContent = `${group.name} / ${number(group.media.length)} ${copy.media}`;
      const grid = document.createElement("div");
      grid.className = "photo-grid";
      group.media.forEach((item) => grid.append(mediaCard(item)));
      section.append(heading, grid);
      groups.append(section);
    });
  }

  function openGallery(id) {
    state.current = displayGalleries().find((gallery) => gallery.id === id);
    if (!state.current) return;
    renderOpenGallery();
    $("#galleryDialog").showModal();
    document.body.classList.add("modal-open");
  }
  function openPlayer(id) {
    $("#videoPlayer").src = preview(id);
    $("#playerOverlay").hidden = false;
  }
  function closePlayer() {
    $("#playerOverlay").hidden = true;
    $("#videoPlayer").removeAttribute("src");
  }

  function initializeMovieFilters() {
    $("#sortFilter").value = state.sort;
    if (!isMovie) return;
    const years = [...new Set(displayGalleries().flatMap((gallery) => gallery.releaseYears || []))].sort((a, b) => b - a);
    const yearFilter = $("#yearFilter");
    yearFilter.replaceChildren(new Option(copy.allYears, "all"));
    years.forEach((year) => yearFilter.add(new Option(String(year), String(year))));
    $("#yearFilterLabel").hidden = false;
    $("#filterRow").classList.remove("single-filter");
  }

  document.documentElement.lang = "en";
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = copy[element.dataset.i18n];
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    element.placeholder = copy[element.dataset.i18nPlaceholder];
  });
  const title = $("#collectionTitle");
  title.replaceChildren();
  const solid = document.createElement("span");
  solid.className = "solid";
  solid.textContent = collection.nameEn;
  const outline = document.createElement("span");
  outline.className = "outline";
  outline.textContent = "THE B JAPAN";
  title.append(solid, outline);
  $(".collection-masthead").classList.toggle("title-long", solid.textContent.length > 17);
  $(".collection-masthead").classList.toggle("title-very-long", solid.textContent.length > 23);
  $("#galleryCount").textContent = number(displayGalleries().length);
  $("#mediaCount").textContent = number(collection.itemCount);
  $("#updatedDate").textContent = date(collection.updatedAt);
  document.title = `${collection.nameEn} — THE B JAPAN`;
  $("#collectionDrive").href = driveFolder(collection.id);
  initializeMovieFilters();
  $("#search").addEventListener("input", (event) => {
    state.query = event.target.value.trim().toLocaleLowerCase();
    renderCards();
  });
  $("#sortFilter").addEventListener("change", (event) => {
    state.sort = event.target.value;
    renderCards();
  });
  $("#yearFilter").addEventListener("change", (event) => {
    state.year = event.target.value;
    renderCards();
  });
  $("#cards").addEventListener("click", (event) => {
    const target = event.target.closest("[data-open]");
    if (target) openGallery(target.dataset.open);
  });
  $("#galleryGroups").addEventListener("click", (event) => {
    const target = event.target.closest("[data-play]");
    if (target) openPlayer(target.dataset.play);
  });
  $("#closePlayer").addEventListener("click", closePlayer);
  $("#playerOverlay").addEventListener("click", (event) => {
    if (event.target === $("#playerOverlay")) closePlayer();
  });
  $("#closeDialog").addEventListener("click", () => $("#galleryDialog").close());
  $("#galleryDialog").addEventListener("close", () => {
    closePlayer();
    document.body.classList.remove("modal-open");
    state.current = null;
    $("#galleryGroups").replaceChildren();
  });
  $("#galleryDialog").addEventListener("click", (event) => {
    if (event.target === $("#galleryDialog")) $("#galleryDialog").close();
  });
  renderCards();
})();
