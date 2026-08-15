#!/usr/bin/env python3
"""Synchronise the public THE B JAPAN Google Drive tree with the static archive."""

from __future__ import annotations

import argparse
import datetime
import json
import os
import re
import shutil
import time
import unicodedata
import urllib.parse
import urllib.request
from pathlib import Path

ROOT_FOLDER_ID = "1566L4BS7RgAtc448tqdZuk0tW1xE1Xo5"
FOLDER_MIME = "application/vnd.google-apps.folder"
PROJECT_DIR = Path(__file__).resolve().parents[1]


def natural_key(value: str):
    return [int(part) if part.isdigit() else part.casefold() for part in re.split(r"(\d+)", value)]


def request_json(url: str):
    for attempt in range(5):
        try:
            request = urllib.request.Request(url, headers={"User-Agent": "TBJ-Archive/1.0"})
            with urllib.request.urlopen(request, timeout=45) as response:
                return json.load(response)
        except Exception:
            if attempt == 4:
                raise
            time.sleep(2**attempt)


def list_children(folder_id: str, api_key: str):
    files = []
    page_token = None
    while True:
        params = {
            "q": f"'{folder_id}' in parents and trashed = false",
            "key": api_key,
            "pageSize": "1000",
            "orderBy": "folder,name_natural",
            "fields": "nextPageToken,files(id,name,mimeType,size,modifiedTime,imageMediaMetadata(width,height),videoMediaMetadata(width,height,durationMillis))",
        }
        if page_token:
            params["pageToken"] = page_token
        url = "https://www.googleapis.com/drive/v3/files?" + urllib.parse.urlencode(params)
        payload = request_json(url)
        files.extend(payload.get("files", []))
        page_token = payload.get("nextPageToken")
        if not page_token:
            return sorted(files, key=lambda item: natural_key(item.get("name", "")))


def crawl(folder_id: str, api_key: str, name: str = "THE B JAPAN"):
    result = {"id": folder_id, "name": name, "mimeType": FOLDER_MIME, "children": []}
    for item in list_children(folder_id, api_key):
        if item.get("mimeType") == FOLDER_MIME:
            node = crawl(item["id"], api_key, item["name"])
            if item.get("modifiedTime"):
                node["modifiedTime"] = item["modifiedTime"]
            result["children"].append(node)
        else:
            result["children"].append(item)
    return result


def clean_collection_name(name: str):
    return re.sub(r"^\s*\d+\s*[.\-_]\s*", "", name).strip()


def bilingual_name(name: str):
    cleaned = clean_collection_name(name)
    match = re.match(r"^(.*?)\s*\(([^()]*)\)\s*$", cleaned)
    if match and re.search(r"[\uac00-\ud7af]", match.group(2)):
        return match.group(1).strip(), match.group(2).strip()
    return cleaned, ""


def slugify(value: str):
    english, _ = bilingual_name(value)
    normalized = unicodedata.normalize("NFKD", english).encode("ascii", "ignore").decode("ascii").replace("'", "")
    slug = re.sub(r"[^a-z0-9]+", "-", normalized.casefold()).strip("-")
    return slug or "collection"


def media_type(mime: str):
    if mime.startswith("image/"):
        return "image"
    if mime.startswith("video/"):
        return "video"
    if mime.startswith("audio/"):
        return "audio"
    return "document"


def media_record(item: dict):
    image_meta = item.get("imageMediaMetadata") or {}
    video_meta = item.get("videoMediaMetadata") or {}
    return {
        "id": item["id"],
        "name": item.get("name", "File"),
        "type": media_type(item.get("mimeType", "")),
        "mimeType": item.get("mimeType", ""),
        "modifiedTime": item.get("modifiedTime", ""),
        "width": image_meta.get("width") or video_meta.get("width"),
        "height": image_meta.get("height") or video_meta.get("height"),
        "durationMillis": video_meta.get("durationMillis"),
    }


def media_date_token(name: str):
    """Return the newest valid YYMMDD token found in a Drive filename."""
    tokens = []
    for match in re.finditer(r"(?<!\d)(\d{6})(?!\d)", name):
        token = match.group(1)
        year = 2000 + int(token[:2])
        month = int(token[2:4])
        day = int(token[4:6])
        try:
            datetime.date(year, month, day)
        except ValueError:
            continue
        tokens.append(token)
    return max(tokens, default="")


def movie_release_data(gallery: dict, fallback_year: int | None = None):
    tokens = [
        media_date_token(item["name"])
        for group in gallery["groups"]
        for item in group["media"]
    ]
    tokens = [token for token in tokens if token]
    years = sorted({2000 + int(token[:2]) for token in tokens}, reverse=True)
    if not years:
        years = sorted({int(year) for year in re.findall(r"\b(20\d{2})\b", gallery["name"])}, reverse=True)
    if not years and fallback_year:
        years = [fallback_year]
    gallery["releaseYears"] = years
    sort_year = years[0] if years else fallback_year
    gallery["releaseSort"] = max(tokens, default=f"{sort_year - 2000:02d}0000" if sort_year else "")
    return gallery


def collect_gallery(folder: dict):
    groups = []

    def walk(node: dict, relative_parts: list[str]):
        local_media = [
            media_record(child)
            for child in node.get("children", [])
            if child.get("mimeType") != FOLDER_MIME
        ]
        if local_media:
            groups.append({
                "name": " / ".join(relative_parts) if relative_parts else "MAIN",
                "media": sorted(local_media, key=lambda item: natural_key(item["name"])),
            })
        for child in node.get("children", []):
            if child.get("mimeType") == FOLDER_MIME:
                walk(child, relative_parts + [child["name"]])

    walk(folder, [])
    media = [item for group in groups for item in group["media"]]
    counts = {kind: sum(item["type"] == kind for item in media) for kind in ("image", "video", "audio", "document")}
    dates = [item["modifiedTime"] for item in media if item.get("modifiedTime")]
    cover = next((item["id"] for item in media if item["type"] == "image"), "")
    if not cover:
        cover = next((item["id"] for item in media if item["type"] == "video"), "")
    return {
        "id": folder["id"],
        "folderId": folder["id"],
        "name": folder["name"].strip(),
        "itemCount": len(media),
        "imageCount": counts["image"],
        "videoCount": counts["video"],
        "audioCount": counts["audio"],
        "documentCount": counts["document"],
        "coverId": cover,
        "updatedAt": max(dates, default=folder.get("modifiedTime", "")),
        "groups": groups,
    }


def collect_movie_galleries(collection_folder: dict):
    """Turn Movie's year folders into metadata and each series into a gallery."""
    galleries = []

    def add_loose_file(item: dict, parent_id: str, fallback_year: int | None):
        record = media_record(item)
        name = re.sub(r"\.[^.]+$", "", record["name"]).strip() or record["name"]
        gallery = {
            "id": f"movie-file-{item['id']}",
            "folderId": parent_id,
            "name": name,
            "itemCount": 1,
            "imageCount": int(record["type"] == "image"),
            "videoCount": int(record["type"] == "video"),
            "audioCount": int(record["type"] == "audio"),
            "documentCount": int(record["type"] == "document"),
            "coverId": record["id"] if record["type"] in ("image", "video") else "",
            "updatedAt": record.get("modifiedTime", ""),
            "groups": [{"name": "MAIN", "media": [record]}],
        }
        galleries.append(movie_release_data(gallery, fallback_year))

    for top_folder in collection_folder.get("children", []):
        if top_folder.get("mimeType") != FOLDER_MIME:
            add_loose_file(top_folder, collection_folder["id"], None)
            continue
        year_match = re.search(r"\b(20\d{2})\b", top_folder.get("name", ""))
        if not year_match:
            gallery = collect_gallery(top_folder)
            if gallery["itemCount"]:
                galleries.append(movie_release_data(gallery))
            continue
        fallback_year = int(year_match.group(1))
        for child in top_folder.get("children", []):
            if child.get("mimeType") == FOLDER_MIME:
                gallery = collect_gallery(child)
                if gallery["itemCount"]:
                    galleries.append(movie_release_data(gallery, fallback_year))
            else:
                add_loose_file(child, top_folder["id"], fallback_year)
    return galleries


def build_archive(tree: dict):
    collections = []
    used_slugs = set()
    for position, folder in enumerate(tree.get("children", []), start=1):
        if folder.get("mimeType") != FOLDER_MIME:
            continue
        slug = slugify(folder["name"])
        base = slug
        suffix = 2
        while slug in used_slugs:
            slug = f"{base}-{suffix}"
            suffix += 1
        used_slugs.add(slug)
        name_en, name_ko = bilingual_name(folder["name"])
        if slug == "movie":
            galleries = collect_movie_galleries(folder)
        else:
            galleries = [collect_gallery(child) for child in folder.get("children", []) if child.get("mimeType") == FOLDER_MIME]
            loose = {
                "id": folder["id"],
                "name": "MAIN",
                "children": [child for child in folder.get("children", []) if child.get("mimeType") != FOLDER_MIME],
            }
            main_gallery = collect_gallery(loose)
            if main_gallery["itemCount"]:
                main_gallery["id"] = f"{folder['id']}-main"
                main_gallery["folderId"] = folder["id"]
                galleries.insert(0, main_gallery)
        galleries = [gallery for gallery in galleries if gallery["itemCount"]]
        dates = [gallery["updatedAt"] for gallery in galleries if gallery.get("updatedAt")]
        collections.append({
            "position": position,
            "id": folder["id"],
            "slug": slug,
            "name": clean_collection_name(folder["name"]),
            "nameEn": name_en,
            "nameKo": name_ko,
            "galleryCount": len(galleries),
            "itemCount": sum(gallery["itemCount"] for gallery in galleries),
            "imageCount": sum(gallery["imageCount"] for gallery in galleries),
            "videoCount": sum(gallery["videoCount"] for gallery in galleries),
            "documentCount": sum(gallery["documentCount"] for gallery in galleries),
            "updatedAt": max(dates, default=folder.get("modifiedTime", "")),
            "galleries": galleries,
        })
    dates = [collection["updatedAt"] for collection in collections if collection.get("updatedAt")]
    return {
        "version": 1,
        "sourceFolderId": ROOT_FOLDER_ID,
        "updatedAt": max(dates, default=""),
        "collectionCount": len(collections),
        "itemCount": sum(collection["itemCount"] for collection in collections),
        "imageCount": sum(collection["imageCount"] for collection in collections),
        "videoCount": sum(collection["videoCount"] for collection in collections),
        "documentCount": sum(collection["documentCount"] for collection in collections),
        "collections": collections,
    }


def write_outputs(archive: dict):
    payload = json.dumps(archive, ensure_ascii=False, separators=(",", ":"))
    (PROJECT_DIR / "data.js").write_text(f"window.TBJ_DATA={payload};\n", encoding="utf-8")
    template = (PROJECT_DIR / "scripts" / "tbj-collection-template.html").read_text(encoding="utf-8")
    for collection in archive["collections"]:
        target_dir = PROJECT_DIR / collection["slug"]
        target_dir.mkdir(parents=True, exist_ok=True)
        (target_dir / "index.html").write_text(template.replace("{{COLLECTION_SLUG}}", collection["slug"]), encoding="utf-8")
        (target_dir / ".generated-tbj-page").write_text("generated by scripts/update_the_b_japan.py\n", encoding="utf-8")

    manifest_path = PROJECT_DIR / "scripts" / "generated-pages.json"
    previous = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else []
    current = [collection["slug"] for collection in archive["collections"]]
    for stale_slug in set(previous) - set(current):
        stale_dir = (PROJECT_DIR / stale_slug).resolve()
        old_marker = stale_dir / ".generated-scan-page"
        new_marker = stale_dir / ".generated-tbj-page"
        if stale_dir.parent == PROJECT_DIR.resolve() and (old_marker.exists() or new_marker.exists()):
            shutil.rmtree(stale_dir)
    manifest_path.write_text(json.dumps(current, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--tree-file", type=Path, help="Use a saved Drive tree instead of the API")
    args = parser.parse_args()
    if args.tree_file:
        tree = json.loads(args.tree_file.read_text(encoding="utf-8"))
    else:
        api_key = os.environ.get("GOOGLE_DRIVE_API_KEY", "").strip()
        if not api_key:
            raise SystemExit("GOOGLE_DRIVE_API_KEY is required")
        tree = crawl(ROOT_FOLDER_ID, api_key)
    archive = build_archive(tree)
    write_outputs(archive)
    print(f"Updated {archive['collectionCount']} collections and {archive['itemCount']} media files.")


if __name__ == "__main__":
    main()
