#!/usr/bin/env python3
"""Document Extractor — Executa stdio tool for MLPS Review.

The iframe sends a bounded base64 payload or download URL for user-selected docs.
This plugin extracts plain text and returns it to the app, where the host LLM
performs the MLPS review. Logs go to stderr; stdout is JSON-RPC only.
"""

from __future__ import annotations

import base64
import csv
import gc
import hashlib
import io
import json
import os
import platform
import re
import shutil
import subprocess
import sys
import tarfile
import tempfile
import time
import urllib.parse
import urllib.request
from pathlib import Path
from pathlib import PurePosixPath
from typing import Any
import zipfile

import fitz
import pytesseract
from docx import Document
from PIL import Image


MAX_BYTES = 200 * 1024 * 1024
MAX_ARCHIVE_UNCOMPRESSED_BYTES = 500 * 1024 * 1024
MAX_ARCHIVE_FILES = 200
MAX_ARCHIVE_DEPTH = 5
MAX_ARCHIVE_SKIPPED_DETAILS = 80
DEFAULT_MAX_CHARS = 500_000
DEFAULT_OCR_DPI = 120
DEFAULT_MAX_OCR_PAGES = 20
OCR_PAGE_TIMEOUT_SECONDS = 20
OCR_TOTAL_BUDGET_SECONDS = 120
DOWNLOAD_CACHE_DIR = Path(tempfile.gettempdir()) / "anna-mlps-review-cache"
ARCHIVE_CACHE_DIR = DOWNLOAD_CACHE_DIR / "archives"
TESSERACT_CANDIDATE_PATHS = [
    "/opt/homebrew/bin/tesseract",
    "/usr/local/bin/tesseract",
    "/usr/bin/tesseract",
]
TESSDATA_CANDIDATE_DIRS = [
    "/opt/homebrew/share/tessdata",
    "/usr/local/share/tessdata",
    "/usr/share/tessdata",
    "/usr/share/tesseract-ocr/4.00/tessdata",
    "/usr/share/tesseract-ocr/5/tessdata",
]

MANIFEST: dict[str, Any] = {
    "name": "tool-intern2-document-extractor-u2n2j8x5",
    "display_name": "Document Extractor",
    "version": "0.1.12",
    "description": "Extract plain text from PDF, DOCX, XLSX, CSV, TXT, Markdown, and archive files for MLPS review.",
    "author": "Anna Developer",
    "license": "MIT",
    "tags": ["document", "pdf", "docx", "xlsx", "csv", "archive", "txt", "markdown", "mlps", "compliance"],
    "tools": [
        {
            "name": "extract_document",
            "description": "Extract plain text from a PDF, DOCX, XLSX, CSV, TXT, or Markdown document.",
            "parameters": [
                {
                    "name": "filename",
                    "type": "string",
                    "description": "Original filename ending in .pdf, .docx, .xlsx, .csv, .txt, or .md.",
                    "required": True,
                },
                {
                    "name": "mime_type",
                    "type": "string",
                    "description": "Browser-provided MIME type.",
                    "required": False,
                    "default": "",
                },
                {
                    "name": "bytes_b64",
                    "type": "string",
                    "description": "Base64-encoded document bytes. Intended for files up to 8 MiB.",
                    "required": False,
                    "default": "",
                },
                {
                    "name": "download_url",
                    "type": "string",
                    "description": "Short-lived HTTPS URL returned by Anna host upload for large files.",
                    "required": False,
                    "default": "",
                },
                {
                    "name": "local_path",
                    "type": "string",
                    "description": "Local dev-only path under the user's Downloads directory.",
                    "required": False,
                    "default": "",
                },
                {
                    "name": "archive_cache_id",
                    "type": "string",
                    "description": "Archive cache id returned by list_archive when extracting a single entry via extract_document.",
                    "required": False,
                    "default": "",
                },
                {
                    "name": "entry_id",
                    "type": "string",
                    "description": "Optional archive entry id returned by list_archive. When present, filename must be the archive filename.",
                    "required": False,
                    "default": "",
                },
                {
                    "name": "max_chars",
                    "type": "integer",
                    "description": "Maximum extracted text characters to return.",
                    "required": False,
                    "default": DEFAULT_MAX_CHARS,
                },
                {
                    "name": "text_offset",
                    "type": "integer",
                    "description": "0-based text offset for chunked extraction. Use next_text_offset until has_more_text is false.",
                    "required": False,
                    "default": 0,
                },
                {
                    "name": "max_ocr_pages",
                    "type": "integer",
                    "description": "Maximum pages to OCR when a PDF has no text layer.",
                    "required": False,
                    "default": DEFAULT_MAX_OCR_PAGES,
                },
                {
                    "name": "ocr_dpi",
                    "type": "integer",
                    "description": "PDF render DPI used for OCR.",
                    "required": False,
                    "default": DEFAULT_OCR_DPI,
                },
                {
                    "name": "page_start",
                    "type": "integer",
                    "description": "1-based first PDF page to process.",
                    "required": False,
                    "default": 1,
                },
                {
                    "name": "page_count",
                    "type": "integer",
                    "description": "Maximum number of PDF pages to process in this call. 0 means all remaining pages.",
                    "required": False,
                    "default": 0,
                },
            ],
        },
        {
            "name": "list_archive",
            "description": "Recursively list supported documents inside a ZIP or TAR.GZ archive.",
            "parameters": [
                {"name": "filename", "type": "string", "description": "Original archive filename.", "required": True},
                {"name": "bytes_b64", "type": "string", "description": "Base64-encoded archive bytes.", "required": False, "default": ""},
                {"name": "download_url", "type": "string", "description": "Short-lived HTTPS URL returned by Anna host upload.", "required": False, "default": ""},
                {"name": "local_path", "type": "string", "description": "Local dev-only path under the user's Downloads directory.", "required": False, "default": ""},
                {"name": "max_files", "type": "integer", "description": "Maximum supported files to return.", "required": False, "default": MAX_ARCHIVE_FILES},
                {"name": "max_depth", "type": "integer", "description": "Maximum nested archive depth.", "required": False, "default": MAX_ARCHIVE_DEPTH},
                {"name": "max_uncompressed_bytes", "type": "integer", "description": "Maximum total uncompressed bytes to scan.", "required": False, "default": MAX_ARCHIVE_UNCOMPRESSED_BYTES},
            ],
        },
        {
            "name": "import_archive_chunk",
            "description": "Import a local archive into the extractor cache in bounded base64 chunks, then return archive_cache_id.",
            "parameters": [
                {"name": "filename", "type": "string", "description": "Original archive filename.", "required": True},
                {"name": "upload_id", "type": "string", "description": "Client-generated id for this chunked import.", "required": True},
                {"name": "chunk_b64", "type": "string", "description": "Base64-encoded archive chunk.", "required": True},
                {"name": "offset", "type": "integer", "description": "Byte offset of this chunk in the original file.", "required": True},
                {"name": "total_size", "type": "integer", "description": "Total archive size in bytes.", "required": True},
                {"name": "done", "type": "boolean", "description": "True when this is the final chunk.", "required": False, "default": False},
            ],
        },
        {
            "name": "extract_archive_entry",
            "description": "Extract one listed archive entry by entry_id. PDF entries support page_start/page_count.",
            "parameters": [
                {"name": "filename", "type": "string", "description": "Original archive filename.", "required": True},
                {"name": "entry_id", "type": "string", "description": "Entry id returned by list_archive.", "required": True},
                {"name": "bytes_b64", "type": "string", "description": "Base64-encoded archive bytes.", "required": False, "default": ""},
                {"name": "download_url", "type": "string", "description": "Short-lived HTTPS URL returned by Anna host upload.", "required": False, "default": ""},
                {"name": "local_path", "type": "string", "description": "Local dev-only path under the user's Downloads directory.", "required": False, "default": ""},
                {"name": "max_chars", "type": "integer", "description": "Maximum extracted text characters to return.", "required": False, "default": DEFAULT_MAX_CHARS},
                {"name": "text_offset", "type": "integer", "description": "0-based text offset for chunked extraction. Use next_text_offset until has_more_text is false.", "required": False, "default": 0},
                {"name": "max_ocr_pages", "type": "integer", "description": "Maximum pages to OCR when a PDF entry has no text layer.", "required": False, "default": DEFAULT_MAX_OCR_PAGES},
                {"name": "ocr_dpi", "type": "integer", "description": "PDF render DPI used for OCR.", "required": False, "default": DEFAULT_OCR_DPI},
                {"name": "page_start", "type": "integer", "description": "1-based first PDF page to process.", "required": False, "default": 1},
                {"name": "page_count", "type": "integer", "description": "Maximum number of PDF pages to process in this call.", "required": False, "default": 0},
            ],
        },
        {
            "name": "diagnose_environment",
            "description": "Return a small runtime diagnostic report for document extraction and OCR dependencies.",
            "parameters": [],
        },
    ],
    "runtime": {"type": "uv", "min_version": "0.1.0"},
}


def _clean_text(text: str) -> str:
    text = text.replace("\x00", "")
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]{2,}", " ", text)
    return text.strip()


def _extension(filename: str) -> str:
    return (filename.rsplit(".", 1)[-1] if "." in filename else "").lower()


def _archive_kind(filename: str) -> str:
    lower = (filename or "").lower()
    if lower.endswith(".zip"):
        return "zip"
    if lower.endswith(".tar.gz") or lower.endswith(".tgz"):
        return "tar.gz"
    return ""


def _supported_document_ext(filename: str) -> str:
    ext = _extension(filename)
    return ext if ext in {"pdf", "docx", "xlsx", "csv", "txt", "md", "markdown"} else ""


def _unsupported_office_ext(filename: str) -> str:
    ext = _extension(filename)
    return ext if ext in {"doc", "xls"} else ""


def _decode_bytes(bytes_b64: str) -> bytes:
    if not bytes_b64:
        raise ValueError("bytes_b64 is required")
    try:
        raw = base64.b64decode(bytes_b64, validate=True)
    except Exception as exc:  # noqa: BLE001
        raise ValueError(f"invalid base64 payload: {exc}") from exc
    if len(raw) > MAX_BYTES:
        raise ValueError(f"file exceeds {MAX_BYTES} bytes")
    return raw


def _download_bytes(download_url: str) -> bytes:
    parsed = urllib.parse.urlparse(download_url or "")
    is_local_http = (
        parsed.scheme == "http"
        and parsed.hostname in {"localhost", "127.0.0.1", "::1"}
    )
    if parsed.scheme != "https" and not is_local_http:
        raise ValueError("download_url must be https or localhost http")
    req = urllib.request.Request(download_url, method="GET")
    with urllib.request.urlopen(req, timeout=300) as resp:  # noqa: S310 - host-issued URL
        chunks: list[bytes] = []
        total = 0
        while True:
            chunk = resp.read(1024 * 1024)
            if not chunk:
                break
            total += len(chunk)
            if total > MAX_BYTES:
                raise ValueError(f"download exceeds {MAX_BYTES} bytes")
            chunks.append(chunk)
    return b"".join(chunks)


def _download_to_cache(download_url: str, suffix: str = ".bin") -> Path:
    parsed = urllib.parse.urlparse(download_url or "")
    cache_key = f"{parsed.scheme}://{parsed.netloc}{parsed.path}"
    digest = hashlib.sha256(cache_key.encode("utf-8")).hexdigest()
    DOWNLOAD_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    safe_suffix = suffix if suffix.startswith(".") and re.match(r"^\.[A-Za-z0-9_.-]+$", suffix) else ".bin"
    path = DOWNLOAD_CACHE_DIR / f"{digest}{safe_suffix}"
    if path.exists() and path.stat().st_size > 0:
        return path

    is_local_http = (
        parsed.scheme == "http"
        and parsed.hostname in {"localhost", "127.0.0.1", "::1"}
    )
    if parsed.scheme != "https" and not is_local_http:
        raise ValueError("download_url must be https or localhost http")

    tmp_path = path.with_suffix(".pdf.part")
    req = urllib.request.Request(download_url, method="GET")
    total = 0
    with urllib.request.urlopen(req, timeout=300) as resp:  # noqa: S310 - host-issued URL
        with tmp_path.open("wb") as out:
            while True:
                chunk = resp.read(1024 * 1024)
                if not chunk:
                    break
                total += len(chunk)
                if total > MAX_BYTES:
                    tmp_path.unlink(missing_ok=True)
                    raise ValueError(f"download exceeds {MAX_BYTES} bytes")
                out.write(chunk)
    tmp_path.replace(path)
    return path


def _download_pdf_to_cache(download_url: str) -> Path:
    return _download_to_cache(download_url, ".pdf")


def _load_local_dev_path(filename: str, local_path: str) -> Path:
    if not local_path:
        raise ValueError("local_path is required")
    path = Path(local_path).expanduser().resolve()
    downloads = (Path.home() / "Downloads").resolve()
    if downloads not in path.parents:
        raise ValueError("local_path is only allowed under the user's Downloads directory")
    if path.name != Path(filename).name:
        raise ValueError("local_path filename must match filename")
    if not path.is_file():
        raise ValueError(f"local_path does not exist: {path}")
    if path.stat().st_size > MAX_BYTES:
        raise ValueError(f"file exceeds {MAX_BYTES} bytes")
    return path


def _archive_suffix(filename: str) -> str:
    lower = filename.lower()
    if lower.endswith(".tar.gz"):
        return ".tar.gz"
    if lower.endswith(".tgz"):
        return ".tgz"
    if lower.endswith(".zip"):
        return ".zip"
    return ".archive"


def _cache_bytes(raw: bytes, suffix: str) -> str:
    if len(raw) > MAX_BYTES:
        raise ValueError(f"file exceeds {MAX_BYTES} bytes")
    ARCHIVE_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    digest = hashlib.sha256(raw).hexdigest()
    path = ARCHIVE_CACHE_DIR / f"{digest}{_archive_suffix(suffix)}"
    if not path.exists() or path.stat().st_size != len(raw):
        tmp_path = path.with_suffix(path.suffix + ".part")
        tmp_path.write_bytes(raw)
        tmp_path.replace(path)
    return digest


def _cache_import_chunk(
    filename: str,
    upload_id: str,
    chunk_b64: str,
    offset: int,
    total_size: int,
    done: bool,
) -> dict[str, Any]:
    if not _archive_kind(filename):
        raise ValueError("only .zip, .tar.gz, and .tgz archives can be imported")
    safe_upload_id = re.sub(r"[^A-Za-z0-9_-]", "", upload_id or "")
    if len(safe_upload_id) < 8 or len(safe_upload_id) > 96:
        raise ValueError("invalid upload_id")
    offset = int(offset or 0)
    total_size = int(total_size or 0)
    if offset < 0 or total_size <= 0 or total_size > MAX_BYTES:
        raise ValueError(f"invalid archive size; maximum is {MAX_BYTES} bytes")
    try:
        chunk = base64.b64decode(chunk_b64 or "", validate=True)
    except Exception as exc:  # noqa: BLE001
        raise ValueError(f"invalid chunk_b64 payload: {exc}") from exc
    if offset + len(chunk) > total_size:
        raise ValueError("chunk exceeds declared total_size")

    ARCHIVE_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    part_path = ARCHIVE_CACHE_DIR / f"import-{safe_upload_id}{_archive_suffix(filename)}.part"
    if offset == 0 and part_path.exists():
        part_path.unlink()
    mode = "r+b" if part_path.exists() else "w+b"
    with part_path.open(mode) as out:
        out.seek(offset)
        out.write(chunk)
    received = part_path.stat().st_size
    if received > MAX_BYTES:
        part_path.unlink(missing_ok=True)
        raise ValueError(f"archive exceeds {MAX_BYTES} bytes")
    if not done:
        return {
            "complete": False,
            "received_bytes": received,
            "total_size": total_size,
        }
    if received != total_size:
        raise ValueError(f"incomplete archive import: received {received} of {total_size} bytes")

    digest = hashlib.sha256()
    with part_path.open("rb") as src:
        while True:
            chunk = src.read(1024 * 1024)
            if not chunk:
                break
            digest.update(chunk)
    cache_id = digest.hexdigest()
    final_path = ARCHIVE_CACHE_DIR / f"{cache_id}{_archive_suffix(filename)}"
    if final_path.exists():
        part_path.unlink(missing_ok=True)
    else:
        part_path.replace(final_path)
    return {
        "complete": True,
        "archive_cache_id": cache_id,
        "received_bytes": total_size,
        "total_size": total_size,
    }


def _cached_archive_path(cache_id: str) -> Path:
    safe = re.sub(r"[^a-fA-F0-9]", "", cache_id or "")
    if len(safe) != 64:
        raise ValueError("invalid archive_cache_id")
    for path in ARCHIVE_CACHE_DIR.glob(f"{safe}.*"):
        if path.is_file():
            return path
    raise ValueError("archive_cache_id not found")


def _cache_id_from_path(path: Path) -> str:
    name = path.name
    match = re.match(r"^([a-fA-F0-9]{64})\.", name)
    return match.group(1) if match else ""


def _load_source(
    filename: str,
    bytes_b64: str,
    download_url: str,
    local_path: str = "",
    cache_download: bool = False,
    archive_cache_id: str = "",
) -> bytes | Path:
    if archive_cache_id:
        return _cached_archive_path(archive_cache_id)
    if local_path:
        return _load_local_dev_path(filename, local_path)
    if download_url and cache_download:
        return _download_to_cache(download_url, _archive_suffix(filename))
    if download_url and _extension(filename) == "pdf":
        return _download_pdf_to_cache(download_url)
    return _download_bytes(download_url) if download_url else _decode_bytes(bytes_b64)


def _open_pdf(source: bytes | str | Path) -> fitz.Document:
    if isinstance(source, (str, Path)):
        return fitz.open(str(source))
    return fitz.open(stream=source, filetype="pdf")


def _is_executable_file(path: str) -> bool:
    return bool(path) and Path(path).is_file() and os.access(path, os.X_OK)


def _resolve_tesseract() -> dict[str, Any]:
    candidates: list[tuple[str, str]] = []
    env_cmd = os.environ.get("TESSERACT_CMD", "").strip()
    if env_cmd:
        candidates.append(("TESSERACT_CMD", env_cmd))

    path_cmd = shutil.which("tesseract")
    if path_cmd:
        candidates.append(("PATH", path_cmd))

    for candidate_path in TESSERACT_CANDIDATE_PATHS:
        candidates.append(("known_path", candidate_path))

    attempted: list[str] = []
    seen: set[str] = set()
    resolved_path = ""
    resolution_source = ""
    for source, candidate_path in candidates:
        candidate_path = str(Path(candidate_path).expanduser())
        if candidate_path in seen:
            continue
        seen.add(candidate_path)
        attempted.append(candidate_path)
        if _is_executable_file(candidate_path):
            resolved_path = candidate_path
            resolution_source = source
            break

    tessdata_prefix = os.environ.get("TESSDATA_PREFIX", "").strip()
    tessdata_source = "TESSDATA_PREFIX" if tessdata_prefix else ""
    if tessdata_prefix and not Path(tessdata_prefix).is_dir():
        tessdata_prefix = ""
        tessdata_source = ""
    if not tessdata_prefix:
        for candidate_dir in TESSDATA_CANDIDATE_DIRS:
            if Path(candidate_dir).is_dir():
                tessdata_prefix = candidate_dir
                tessdata_source = "known_path"
                break

    if resolved_path:
        pytesseract.pytesseract.tesseract_cmd = resolved_path
    if tessdata_prefix:
        os.environ["TESSDATA_PREFIX"] = tessdata_prefix

    return {
        "available": bool(resolved_path),
        "path": resolved_path,
        "resolution_source": resolution_source,
        "attempted_paths": attempted,
        "tessdata_prefix": tessdata_prefix,
        "tessdata_source": tessdata_source,
    }


def _tesseract_lang(warnings: list[str]) -> str:
    resolved = _resolve_tesseract()
    if not resolved["available"]:
        warnings.append(
            "Tesseract 未找到，已尝试："
            + "、".join(resolved["attempted_paths"])
        )
        return "eng"
    try:
        langs = set(pytesseract.get_languages(config=""))
    except Exception as exc:  # noqa: BLE001
        warnings.append(f"Tesseract 语言列表读取失败：{exc}")
        return "eng"
    preferred = [lang for lang in ("chi_sim", "eng") if lang in langs]
    if "chi_sim" not in langs:
        warnings.append("Tesseract 未安装中文语言包 chi_sim，OCR 将使用 eng，中文识别质量会明显下降")
    return "+".join(preferred) if preferred else "eng"


def _ocr_pdf(
    source: bytes | str | Path,
    page_count: int,
    warnings: list[str],
    max_chars: int,
    max_ocr_pages: int,
    ocr_dpi: int,
    page_start: int,
    requested_page_count: int,
) -> dict[str, Any]:
    try:
        doc = _open_pdf(source)
    except Exception as exc:  # noqa: BLE001
        warnings.append(f"PDF OCR 打开失败：{exc}")
        return {"pages": [], "ocr_page_count": 0, "ocr_lang": ""}

    lang = _tesseract_lang(warnings)
    start_index = max(0, min(int(page_start or 1) - 1, max(page_count - 1, 0)))
    remaining_pages = page_count - start_index
    requested_page_count = int(requested_page_count or 0)
    if requested_page_count <= 0:
        requested_page_count = remaining_pages
    max_ocr_pages = max(
        1,
        min(int(max_ocr_pages or DEFAULT_MAX_OCR_PAGES), requested_page_count, remaining_pages),
    )
    ocr_dpi = max(96, min(int(ocr_dpi or DEFAULT_OCR_DPI), 240))
    zoom = ocr_dpi / 72
    matrix = fitz.Matrix(zoom, zoom)
    pages: list[str] = []
    started_at = time.monotonic()
    attempted_pages = 0

    try:
        for page_index in range(max_ocr_pages):
            if sum(len(p) for p in pages) >= max_chars:
                warnings.append(f"OCR 文本已达到 {max_chars} 字符上限，提前停止")
                break
            if time.monotonic() - started_at >= OCR_TOTAL_BUDGET_SECONDS:
                warnings.append(
                    f"OCR 已运行约 {OCR_TOTAL_BUDGET_SECONDS} 秒，提前返回已识别文本"
                )
                break
            absolute_page_index = start_index + page_index
            attempted_pages = page_index + 1
            try:
                page = doc.load_page(absolute_page_index)
                pix = page.get_pixmap(matrix=matrix, colorspace=fitz.csRGB, alpha=False)
                image = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
                try:
                    text = pytesseract.image_to_string(
                        image,
                        lang=lang,
                        config="--psm 6",
                        timeout=OCR_PAGE_TIMEOUT_SECONDS,
                    )
                finally:
                    image.close()
                    del image
                    del pix
                    del page
                    gc.collect()
            except RuntimeError as exc:
                warnings.append(f"第 {absolute_page_index + 1} 页 OCR 超时或失败：{exc}")
                continue
            except Exception as exc:  # noqa: BLE001
                warnings.append(f"第 {absolute_page_index + 1} 页 OCR 失败：{exc}")
                continue
            cleaned = _clean_text(text)
            if cleaned:
                pages.append(f"--- 第 {absolute_page_index + 1} 页（OCR）---\n{cleaned}")
    finally:
        doc.close()

    attempted_end_page = start_index + attempted_pages
    if page_count > attempted_end_page:
        warnings.append(
            f"PDF 共 {page_count} 页，本次尝试 OCR 第 {start_index + 1}-{attempted_end_page} 页，识别到 {len(pages)} 页文本"
        )
    return {
        "pages": pages,
        "ocr_attempted_pages": attempted_pages,
        "ocr_page_count": len(pages),
        "ocr_lang": lang,
    }


def _extract_pdf(
    source: bytes | str | Path,
    max_chars: int = DEFAULT_MAX_CHARS,
    max_ocr_pages: int = DEFAULT_MAX_OCR_PAGES,
    ocr_dpi: int = DEFAULT_OCR_DPI,
    page_start: int = 1,
    page_count: int = 0,
) -> dict[str, Any]:
    warnings: list[str] = []
    try:
        doc = _open_pdf(source)
    except Exception as exc:  # noqa: BLE001
        raise ValueError(f"PDF 打开失败，文件可能不完整或格式异常：{exc}") from exc

    total_pages = doc.page_count
    start_index = max(0, min(int(page_start or 1) - 1, max(total_pages - 1, 0)))
    requested_page_count = int(page_count or 0)
    if requested_page_count <= 0:
        requested_page_count = total_pages - start_index
    end_index = min(total_pages, start_index + max(1, requested_page_count))
    pages: list[str] = []
    attempted_pages = 0

    try:
        for index in range(start_index, end_index):
            display_page = index + 1
            attempted_pages = index - start_index + 1
            try:
                page = doc.load_page(index)
                text = page.get_text("text") or ""
            except Exception as exc:  # noqa: BLE001
                warnings.append(f"第 {display_page} 页文本层抽取失败：{exc}")
                text = ""
            cleaned = _clean_text(text)
            if cleaned:
                pages.append(f"--- 第 {display_page} 页 ---\n{cleaned}")
            if sum(len(p) for p in pages) >= max_chars:
                warnings.append(f"文本已达到 {max_chars} 字符上限，提前停止普通文本抽取")
                break
    finally:
        doc.close()
    ocr_used = False
    ocr_page_count = 0
    ocr_lang = ""
    if not pages:
        warnings.append("PDF 未抽取到文本层，正在尝试 OCR 识别扫描页")
        ocr = _ocr_pdf(
            source,
            total_pages,
            warnings,
            max_chars,
            max_ocr_pages,
            ocr_dpi,
            start_index + 1,
            end_index - start_index,
        )
        pages = ocr["pages"]
        ocr_used = True
        attempted_pages = int(ocr["ocr_attempted_pages"])
        ocr_page_count = int(ocr["ocr_page_count"])
        ocr_lang = str(ocr["ocr_lang"])
        if not pages:
            warnings.append("OCR 未识别到可分析文本")
    elif end_index < total_pages:
        warnings.append(
            f"PDF 共 {total_pages} 页，本次处理第 {start_index + 1}-{start_index + attempted_pages} 页"
        )
    next_page = start_index + attempted_pages + 1
    return {
        "kind": "pdf",
        "text": _clean_text("\n\n".join(pages)),
        "page_count": total_pages,
        "page_start": start_index + 1,
        "processed_page_count": attempted_pages,
        "next_page": next_page if next_page <= total_pages else None,
        "ocr_used": ocr_used,
        "ocr_page_count": ocr_page_count,
        "ocr_lang": ocr_lang,
        "warnings": warnings,
    }


def _iter_table_text(doc: Document) -> list[str]:
    chunks: list[str] = []
    for table_index, table in enumerate(doc.tables, start=1):
        rows: list[str] = []
        for row in table.rows:
            cells = [_clean_text(cell.text) for cell in row.cells]
            rows.append(" | ".join(cell for cell in cells if cell))
        if rows:
            chunks.append(f"--- 表格 {table_index} ---\n" + "\n".join(rows))
    return chunks


def _extract_docx(raw: bytes) -> dict[str, Any]:
    doc = Document(io.BytesIO(raw))
    paragraphs = [_clean_text(p.text) for p in doc.paragraphs if p.text.strip()]
    tables = _iter_table_text(doc)
    text = _clean_text("\n\n".join([*paragraphs, *tables]))
    warnings: list[str] = []
    if not text:
        warnings.append("DOCX 未抽取到正文文本")
    return {
        "kind": "docx",
        "text": text,
        "paragraph_count": len(paragraphs),
        "table_count": len(doc.tables),
        "warnings": warnings,
    }


def _extract_text(raw: bytes, kind: str) -> dict[str, Any]:
    warnings: list[str] = []
    text = _decode_text_with_fallback(raw, ["utf-8-sig", "utf-8"])
    text = _clean_text(text)
    if not text:
        warnings.append(f"{kind.upper()} 未抽取到正文文本")
    return {
        "kind": kind,
        "text": text,
        "line_count": len(text.splitlines()) if text else 0,
        "warnings": warnings,
    }


def _decode_text_with_fallback(raw: bytes, encodings: list[str]) -> str:
    last_error: Exception | None = None
    for encoding in encodings:
        try:
            return raw.decode(encoding)
        except UnicodeDecodeError as exc:
            last_error = exc
    raise ValueError(f"文本编码无法识别，请使用 UTF-8 或 GB18030 编码：{last_error}")


def _extract_csv(raw: bytes) -> dict[str, Any]:
    warnings: list[str] = []
    text = _decode_text_with_fallback(raw, ["utf-8-sig", "utf-8", "gb18030"])
    sample = text[:4096]
    try:
        dialect = csv.Sniffer().sniff(sample)
    except Exception:  # noqa: BLE001
        dialect = csv.excel
    rows: list[str] = []
    try:
        reader = csv.reader(io.StringIO(text), dialect)
        for row_index, row in enumerate(reader, start=1):
            cells = [_clean_text(cell) for cell in row]
            rows.append(" | ".join(cells))
            if row_index >= 5000:
                warnings.append("CSV 超过 5000 行，已截断读取")
                break
    except Exception as exc:  # noqa: BLE001
        raise ValueError(f"CSV 解析失败：{exc}") from exc
    extracted = _clean_text("\n".join(row for row in rows if row.strip()))
    if not extracted:
        warnings.append("CSV 未抽取到正文文本")
    return {
        "kind": "csv",
        "text": extracted,
        "row_count": len(rows),
        "warnings": warnings,
    }


def _extract_xlsx(raw: bytes) -> dict[str, Any]:
    try:
        from openpyxl import load_workbook
    except Exception as exc:  # noqa: BLE001
        raise RuntimeError("缺少 openpyxl 依赖，无法抽取 XLSX 文件") from exc

    warnings: list[str] = []
    try:
        workbook = load_workbook(io.BytesIO(raw), read_only=True, data_only=True)
    except Exception as exc:  # noqa: BLE001
        raise ValueError(f"XLSX 打开失败：{exc}") from exc

    sheet_chunks: list[str] = []
    sheet_count = 0
    row_count = 0
    try:
        for sheet in workbook.worksheets:
            sheet_count += 1
            rows: list[str] = []
            for index, row in enumerate(sheet.iter_rows(values_only=True), start=1):
                values = [
                    _clean_text(str(value))
                    for value in row
                    if value is not None and _clean_text(str(value))
                ]
                if values:
                    rows.append(" | ".join(values))
                row_count += 1
                if index >= 2000:
                    warnings.append(f"工作表 {sheet.title} 超过 2000 行，已截断读取")
                    break
            if rows:
                sheet_chunks.append(f"--- 工作表：{sheet.title} ---\n" + "\n".join(rows))
    finally:
        workbook.close()

    text = _clean_text("\n\n".join(sheet_chunks))
    if not text:
        warnings.append("XLSX 未抽取到正文文本")
    return {
        "kind": "xlsx",
        "text": text,
        "sheet_count": sheet_count,
        "row_count": row_count,
        "warnings": warnings,
    }


def _extract_raw(
    filename: str,
    source: bytes | str | Path,
    mime_type: str = "",
    max_chars: int = DEFAULT_MAX_CHARS,
    text_offset: int = 0,
    max_ocr_pages: int = DEFAULT_MAX_OCR_PAGES,
    ocr_dpi: int = DEFAULT_OCR_DPI,
    page_start: int = 1,
    page_count: int = 0,
) -> dict[str, Any]:
    ext = _extension(filename)
    if not _supported_document_ext(filename):
        raise ValueError("only .pdf, .docx, .xlsx, .csv, .txt, and .md are supported")
    source_size = Path(source).stat().st_size if isinstance(source, (str, Path)) else len(source)
    if source_size > MAX_BYTES:
        raise ValueError(f"file exceeds {MAX_BYTES} bytes")
    max_chars = max(1_000, min(int(max_chars or DEFAULT_MAX_CHARS), DEFAULT_MAX_CHARS))
    text_offset = max(0, int(text_offset or 0))
    extraction_char_budget = min(DEFAULT_MAX_CHARS, text_offset + max_chars)

    if ext == "pdf":
        result = _extract_pdf(source, extraction_char_budget, max_ocr_pages, ocr_dpi, page_start, page_count)
    elif ext == "docx":
        if not isinstance(source, bytes):
            source = Path(source).read_bytes()
        result = _extract_docx(source)
    elif ext == "xlsx":
        if not isinstance(source, bytes):
            source = Path(source).read_bytes()
        result = _extract_xlsx(source)
    elif ext == "csv":
        if not isinstance(source, bytes):
            source = Path(source).read_bytes()
        result = _extract_csv(source)
    else:
        if not isinstance(source, bytes):
            source = Path(source).read_bytes()
        result = _extract_text(source, "md" if ext in {"md", "markdown"} else "txt")

    full_text = result["text"]
    total_char_count = len(full_text)
    text = full_text[text_offset:text_offset + max_chars]
    has_more_text = text_offset + len(text) < total_char_count
    if has_more_text:
        result["warnings"].append(
            f"本次返回文本分块 {text_offset}-{text_offset + len(text)} / {total_char_count} 字符"
        )

    result.update(
        {
            "filename": filename,
            "mime_type": mime_type or "",
            "size_bytes": source_size,
            "text": text,
            "char_count": len(text),
            "total_char_count": total_char_count,
            "text_offset": text_offset,
            "next_text_offset": text_offset + len(text) if has_more_text and text else None,
            "has_more_text": has_more_text,
            "truncated": has_more_text,
        }
    )
    return result


def _entry_id(chain: list[str]) -> str:
    raw = json.dumps(chain, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()[:24]


def _legacy_entry_chain(entry_id: str) -> list[str]:
    padded = entry_id + ("=" * (-len(entry_id) % 4))
    try:
        value = json.loads(base64.urlsafe_b64decode(padded.encode("ascii")).decode("utf-8"))
    except Exception as exc:  # noqa: BLE001
        raise ValueError(f"invalid entry_id: {exc}") from exc
    if not isinstance(value, list) or not value or not all(isinstance(item, str) and item for item in value):
        raise ValueError("invalid entry_id payload")
    return value


def _entry_chain(entry_id: str, archive_name: str, source: bytes | str | Path) -> list[str]:
    try:
        return _legacy_entry_chain(entry_id)
    except ValueError:
        chain = _find_archive_entry_chain_by_id(archive_name, source, entry_id)
        if chain:
            return chain
        raise ValueError("archive entry_id not found")


def _safe_archive_path(name: str) -> str:
    normalized = (name or "").replace("\\", "/").strip("/")
    if not normalized:
        return ""
    parts = PurePosixPath(normalized).parts
    if any(part in {"", ".", ".."} for part in parts):
        return ""
    if (name or "").startswith(("/", "\\")):
        return ""
    return "/".join(parts)


def _skip_reason(name: str, size_bytes: int, is_dir: bool = False, unsafe: bool = False) -> str:
    safe = _safe_archive_path(name)
    base = safe.rsplit("/", 1)[-1] if safe else name
    if is_dir:
        return "目录"
    if unsafe or not safe:
        return "不安全路径"
    if safe.startswith("__MACOSX/") or base in {".DS_Store"} or base.startswith("._"):
        return "macOS 元数据"
    if base.startswith("~$") or base.startswith(".~"):
        return "Office 临时文件"
    if _unsupported_office_ext(base):
        return "旧版 Office 格式暂不支持"
    if _archive_kind(base) or _supported_document_ext(base):
        if size_bytes > MAX_BYTES:
            return f"文件超过 {MAX_BYTES} 字节"
        return ""
    return "不支持的文件类型"


def _is_silent_archive_metadata(name: str) -> bool:
    safe = _safe_archive_path(name)
    return safe == "__MACOSX" or safe.startswith("__MACOSX/")


def _zip_display_name(info: zipfile.ZipInfo) -> str:
    if info.flag_bits & 0x800:
        return info.filename
    try:
        raw = info.filename.encode("cp437")
    except Exception:  # noqa: BLE001
        return info.filename
    for encoding in ("utf-8", "gb18030"):
        try:
            return raw.decode(encoding)
        except UnicodeDecodeError:
            continue
    return info.filename


def _source_fileobj(source: bytes | str | Path) -> io.BytesIO | Path:
    if isinstance(source, (str, Path)):
        return Path(source)
    return io.BytesIO(source)


def _open_zip(source: bytes | str | Path) -> zipfile.ZipFile:
    fileobj = _source_fileobj(source)
    return zipfile.ZipFile(fileobj if not isinstance(fileobj, Path) else str(fileobj))


def _open_tar(source: bytes | str | Path) -> tarfile.TarFile:
    fileobj = _source_fileobj(source)
    if isinstance(fileobj, Path):
        return tarfile.open(str(fileobj), mode="r:*")
    return tarfile.open(fileobj=fileobj, mode="r:*")


def _archive_member_kind(filename: str) -> str:
    archive = _archive_kind(filename)
    if archive:
        return "archive"
    return _supported_document_ext(filename)


def _make_entry(chain: list[str], display_path: str, size_bytes: int) -> dict[str, Any]:
    return {
        "entry_id": _entry_id(chain),
        "path": display_path,
        "filename": display_path.rsplit("/", 1)[-1],
        "kind": _archive_member_kind(display_path),
        "size_bytes": size_bytes,
    }


def _list_archive_source(
    archive_name: str,
    source: bytes | str | Path,
    chain: list[str],
    prefix: str,
    depth: int,
    limits: dict[str, int],
    state: dict[str, Any],
) -> None:
    if depth > limits["max_depth"]:
        state["warnings"].append(f"压缩包嵌套深度超过 {limits['max_depth']}，已跳过：{prefix or archive_name}")
        return

    kind = _archive_kind(archive_name)
    if not kind:
        state["warnings"].append(f"不支持的压缩包格式：{archive_name}")
        return

    def consider_file(name: str, size_bytes: int, read_bytes: Any, unsafe: bool = False, display_name: str = "") -> None:
        safe_name = _safe_archive_path(name)
        safe_display_name = _safe_archive_path(display_name or name) or safe_name
        if _is_silent_archive_metadata(safe_name) or _is_silent_archive_metadata(safe_display_name):
            return
        display_path = f"{prefix}/{safe_display_name}" if prefix and safe_display_name else safe_display_name
        reason = _skip_reason(name, size_bytes, False, unsafe)
        if reason:
            state["skipped"].append({"path": display_path or name, "size_bytes": size_bytes, "reason": reason})
            return
        if state["total_uncompressed_bytes"] + size_bytes > limits["max_uncompressed_bytes"]:
            state["skipped"].append({"path": display_path, "size_bytes": size_bytes, "reason": "超过压缩包总解压大小限制"})
            state["truncated"] = True
            return
        state["total_uncompressed_bytes"] += size_bytes

        child_chain = [*chain, safe_name]
        if _archive_kind(safe_name):
            try:
                nested = read_bytes()
            except Exception as exc:  # noqa: BLE001
                state["skipped"].append({"path": display_path, "size_bytes": size_bytes, "reason": f"嵌套压缩包读取失败：{exc}"})
                return
            _list_archive_source(safe_name, nested, child_chain, display_path, depth + 1, limits, state)
            return

        if len(state["entries"]) >= limits["max_files"]:
            state["skipped"].append({"path": display_path, "size_bytes": size_bytes, "reason": "超过可处理文件数量限制"})
            state["truncated"] = True
            return
        state["entries"].append(_make_entry(child_chain, display_path, size_bytes))

    def read_tar_member(archive: tarfile.TarFile, member: tarfile.TarInfo) -> bytes:
        stream = archive.extractfile(member)
        return stream.read() if stream else b""

    try:
        if kind == "zip":
            with _open_zip(source) as archive:
                for info in archive.infolist():
                    unsafe = not _safe_archive_path(info.filename)
                    if info.is_dir():
                        continue
                    consider_file(
                        info.filename,
                        int(info.file_size or 0),
                        lambda i=info: archive.read(i),
                        unsafe,
                        _zip_display_name(info),
                    )
        else:
            with _open_tar(source) as archive:
                for member in archive.getmembers():
                    unsafe = not _safe_archive_path(member.name) or member.issym() or member.islnk() or member.isdev()
                    if member.isdir():
                        continue
                    consider_file(
                        member.name,
                        int(member.size or 0),
                        lambda m=member: read_tar_member(archive, m),
                        unsafe,
                    )
    except (zipfile.BadZipFile, tarfile.TarError) as exc:
        raise ValueError(f"压缩包打开失败：{exc}") from exc


def _find_archive_entry_chain_by_id(
    archive_name: str,
    source: bytes | str | Path,
    target_entry_id: str,
    chain: list[str] | None = None,
    depth: int = 1,
) -> list[str] | None:
    if depth > MAX_ARCHIVE_DEPTH:
        return None
    chain = chain or []
    kind = _archive_kind(archive_name)
    if not kind:
        return None

    def consider_member(name: str, size_bytes: int, read_bytes: Any, unsafe: bool = False) -> list[str] | None:
        safe_name = _safe_archive_path(name)
        if unsafe or not safe_name or _is_silent_archive_metadata(safe_name):
            return None
        if _skip_reason(safe_name, size_bytes):
            return None
        child_chain = [*chain, safe_name]
        if _entry_id(child_chain) == target_entry_id:
            return child_chain
        if _archive_kind(safe_name):
            try:
                nested = read_bytes()
            except Exception:  # noqa: BLE001
                return None
            return _find_archive_entry_chain_by_id(safe_name, nested, target_entry_id, child_chain, depth + 1)
        return None

    if kind == "zip":
        with _open_zip(source) as archive:
            for info in archive.infolist():
                if info.is_dir():
                    continue
                found = consider_member(
                    info.filename,
                    int(info.file_size or 0),
                    lambda i=info: archive.read(i),
                    not _safe_archive_path(info.filename),
                )
                if found:
                    return found
    else:
        with _open_tar(source) as archive:
            for member in archive.getmembers():
                if member.isdir():
                    continue
                found = consider_member(
                    member.name,
                    int(member.size or 0),
                    lambda m=member: (archive.extractfile(m).read() if archive.extractfile(m) else b""),
                    not _safe_archive_path(member.name) or member.issym() or member.islnk() or member.isdev(),
                )
                if found:
                    return found
    return None


def _read_archive_entry_source(
    archive_name: str,
    source: bytes | str | Path,
    chain: list[str],
    depth: int = 1,
) -> tuple[str, bytes]:
    if depth > MAX_ARCHIVE_DEPTH:
        raise ValueError(f"压缩包嵌套深度超过 {MAX_ARCHIVE_DEPTH}")
    if not chain:
        raise ValueError("empty archive entry chain")

    target = chain[0]
    kind = _archive_kind(archive_name)
    if kind == "zip":
        with _open_zip(source) as archive:
            try:
                info = archive.getinfo(target)
            except KeyError as exc:
                raise ValueError(f"压缩包中未找到文件：{target}") from exc
            if info.is_dir():
                raise ValueError(f"压缩包条目是目录：{target}")
            data = archive.read(info)
    elif kind == "tar.gz":
        with _open_tar(source) as archive:
            try:
                member = archive.getmember(target)
            except KeyError as exc:
                raise ValueError(f"压缩包中未找到文件：{target}") from exc
            if member.isdir() or member.issym() or member.islnk() or member.isdev():
                raise ValueError(f"压缩包条目不是普通文件：{target}")
            stream = archive.extractfile(member)
            if stream is None:
                raise ValueError(f"压缩包条目无法读取：{target}")
            data = stream.read()
    else:
        raise ValueError(f"不支持的压缩包格式：{archive_name}")

    if len(data) > MAX_BYTES:
        raise ValueError(f"压缩包内文件超过 {MAX_BYTES} 字节：{target}")
    if len(chain) == 1:
        return target, data
    if not _archive_kind(target):
        raise ValueError(f"条目不是嵌套压缩包：{target}")
    return _read_archive_entry_source(target, data, chain[1:], depth + 1)


def tool_extract_document(
    filename: str,
    bytes_b64: str = "",
    download_url: str = "",
    local_path: str = "",
    archive_cache_id: str = "",
    entry_id: str = "",
    mime_type: str = "",
    max_chars: int = DEFAULT_MAX_CHARS,
    text_offset: int = 0,
    max_ocr_pages: int = DEFAULT_MAX_OCR_PAGES,
    ocr_dpi: int = DEFAULT_OCR_DPI,
    page_start: int = 1,
    page_count: int = 0,
) -> dict[str, Any]:
    filename = (filename or "").strip()
    if entry_id:
        if not _archive_kind(filename):
            raise ValueError("entry_id requires an archive filename")
        source = _load_source(filename, bytes_b64, download_url, local_path, cache_download=True, archive_cache_id=archive_cache_id)
        chain = _entry_chain(entry_id, filename, source)
        if any(not _safe_archive_path(item) for item in chain):
            raise ValueError("archive entry contains unsafe path")
        entry_name, entry_bytes = _read_archive_entry_source(filename, source, chain)
        if not _supported_document_ext(entry_name):
            raise ValueError("archive entry type is not supported")
        result = _extract_raw(
            entry_name,
            entry_bytes,
            mime_type,
            max_chars,
            text_offset,
            max_ocr_pages,
            ocr_dpi,
            page_start,
            page_count,
        )
        result.update(
            {
                "archive_filename": filename,
                "entry_id": entry_id,
                "entry_path": "/".join(chain),
                "filename": "/".join(chain),
            }
        )
        return result

    if not _supported_document_ext(filename):
        raise ValueError("only .pdf, .docx, .xlsx, .csv, .txt, and .md are supported")

    source = _load_source(filename, bytes_b64, download_url, local_path)
    return _extract_raw(
        filename,
        source,
        mime_type,
        max_chars,
        text_offset,
        max_ocr_pages,
        ocr_dpi,
        page_start,
        page_count,
    )


def tool_list_archive(
    filename: str,
    bytes_b64: str = "",
    download_url: str = "",
    local_path: str = "",
    archive_cache_id: str = "",
    mime_type: str = "",
    max_files: int = MAX_ARCHIVE_FILES,
    max_depth: int = MAX_ARCHIVE_DEPTH,
    max_uncompressed_bytes: int = MAX_ARCHIVE_UNCOMPRESSED_BYTES,
) -> dict[str, Any]:
    filename = (filename or "").strip()
    if not _archive_kind(filename):
        raise ValueError("only .zip, .tar.gz, and .tgz archives are supported")
    source = _load_source(filename, bytes_b64, download_url, local_path, cache_download=True, archive_cache_id=archive_cache_id)
    cache_id = archive_cache_id
    if isinstance(source, bytes):
        cache_id = _cache_bytes(source, filename)
        source = _cached_archive_path(cache_id)
    elif isinstance(source, (str, Path)):
        cache_id = _cache_id_from_path(Path(source)) or archive_cache_id
    source_size = Path(source).stat().st_size if isinstance(source, (str, Path)) else len(source)
    if source_size > MAX_BYTES:
        raise ValueError(f"archive exceeds {MAX_BYTES} bytes")

    limits = {
        "max_files": max(1, min(int(max_files or MAX_ARCHIVE_FILES), MAX_ARCHIVE_FILES)),
        "max_depth": max(1, min(int(max_depth or MAX_ARCHIVE_DEPTH), MAX_ARCHIVE_DEPTH)),
        "max_uncompressed_bytes": max(
            1024 * 1024,
            min(int(max_uncompressed_bytes or MAX_ARCHIVE_UNCOMPRESSED_BYTES), MAX_ARCHIVE_UNCOMPRESSED_BYTES),
        ),
    }
    state: dict[str, Any] = {
        "entries": [],
        "skipped": [],
        "warnings": [],
        "total_uncompressed_bytes": 0,
        "truncated": False,
    }
    _list_archive_source(filename, source, [], "", 1, limits, state)
    return {
        "kind": "archive",
        "archive_kind": _archive_kind(filename),
        "filename": filename,
        "size_bytes": source_size,
        "entries": state["entries"],
        "skipped": state["skipped"][:MAX_ARCHIVE_SKIPPED_DETAILS],
        "warnings": state["warnings"],
        "file_count": len(state["entries"]),
        "skipped_count": len(state["skipped"]),
        "skipped_detail_count": min(len(state["skipped"]), MAX_ARCHIVE_SKIPPED_DETAILS),
        "total_uncompressed_bytes": state["total_uncompressed_bytes"],
        "archive_cache_id": cache_id,
        "truncated": state["truncated"],
        "limits": limits,
    }


def tool_import_archive_chunk(
    filename: str,
    upload_id: str,
    chunk_b64: str,
    offset: int,
    total_size: int,
    done: bool = False,
) -> dict[str, Any]:
    return _cache_import_chunk(filename, upload_id, chunk_b64, offset, total_size, bool(done))


def tool_extract_archive_entry(
    filename: str,
    entry_id: str,
    bytes_b64: str = "",
    download_url: str = "",
    local_path: str = "",
    archive_cache_id: str = "",
    mime_type: str = "",
    max_chars: int = DEFAULT_MAX_CHARS,
    text_offset: int = 0,
    max_ocr_pages: int = DEFAULT_MAX_OCR_PAGES,
    ocr_dpi: int = DEFAULT_OCR_DPI,
    page_start: int = 1,
    page_count: int = 0,
) -> dict[str, Any]:
    filename = (filename or "").strip()
    if not _archive_kind(filename):
        raise ValueError("only .zip, .tar.gz, and .tgz archives are supported")
    source = _load_source(filename, bytes_b64, download_url, local_path, cache_download=True, archive_cache_id=archive_cache_id)
    chain = _entry_chain(entry_id, filename, source)
    if any(not _safe_archive_path(item) for item in chain):
        raise ValueError("archive entry contains unsafe path")
    entry_name, entry_bytes = _read_archive_entry_source(filename, source, chain)
    if not _supported_document_ext(entry_name):
        raise ValueError("archive entry type is not supported")
    result = _extract_raw(
        entry_name,
        entry_bytes,
        "",
        max_chars,
        text_offset,
        max_ocr_pages,
        ocr_dpi,
        page_start,
        page_count,
    )
    result.update(
        {
            "archive_filename": filename,
            "entry_id": entry_id,
            "entry_path": "/".join(chain),
            "filename": "/".join(chain),
        }
    )
    return result


def tool_diagnose_environment() -> dict[str, Any]:
    tesseract = _resolve_tesseract()
    tesseract_path = tesseract["path"]
    tesseract_version = ""
    tesseract_languages: list[str] = []
    tesseract_error = ""
    if tesseract_path:
        try:
            version = subprocess.run(
                [tesseract_path, "--version"],
                check=False,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                timeout=5,
            )
            tesseract_version = (version.stdout or "").splitlines()[0][:160] if version.stdout else ""
        except Exception as exc:  # noqa: BLE001
            tesseract_error = f"tesseract --version failed: {exc}"
        try:
            langs = subprocess.run(
                [tesseract_path, "--list-langs"],
                check=False,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                timeout=5,
            )
            lines = [line.strip() for line in (langs.stdout or "").splitlines() if line.strip()]
            tesseract_languages = [line for line in lines if not line.lower().startswith("list of available")]
        except Exception as exc:  # noqa: BLE001
            tesseract_error = f"{tesseract_error}; tesseract --list-langs failed: {exc}".strip("; ")
    else:
        attempted = "、".join(tesseract["attempted_paths"])
        tesseract_error = f"tesseract executable not found; attempted: {attempted}"

    return {
        "plugin_version": MANIFEST["version"],
        "python": sys.version.split()[0],
        "platform": platform.platform(),
        "executable": sys.executable,
        "dependencies": {
            "fitz": getattr(fitz, "__doc__", "available").splitlines()[0][:80] if getattr(fitz, "__doc__", "") else "available",
            "pytesseract": getattr(pytesseract, "__version__", "available"),
            "PIL": getattr(Image, "__version__", "available"),
        },
        "tesseract": {
            "available": bool(tesseract_path),
            "path": tesseract_path or "",
            "resolution_source": tesseract["resolution_source"],
            "attempted_paths": tesseract["attempted_paths"],
            "tessdata_prefix": tesseract["tessdata_prefix"],
            "tessdata_source": tesseract["tessdata_source"],
            "version": tesseract_version,
            "languages": tesseract_languages[:40],
            "has_chi_sim": "chi_sim" in tesseract_languages,
            "error": tesseract_error,
        },
        "limits": {
            "max_bytes": MAX_BYTES,
            "default_max_chars": DEFAULT_MAX_CHARS,
            "default_max_ocr_pages": DEFAULT_MAX_OCR_PAGES,
            "ocr_total_budget_seconds": OCR_TOTAL_BUDGET_SECONDS,
        },
    }


TOOL_DISPATCH = {
    "extract_document": tool_extract_document,
    "list_archive": tool_list_archive,
    "import_archive_chunk": tool_import_archive_chunk,
    "extract_archive_entry": tool_extract_archive_entry,
    "diagnose_environment": tool_diagnose_environment,
}


def handle_describe(_params: dict[str, Any]) -> dict[str, Any]:
    return MANIFEST


def handle_invoke(params: dict[str, Any]) -> dict[str, Any]:
    tool_name = params.get("tool")
    args = params.get("arguments") or {}
    if not isinstance(args, dict):
        raise ValueError("`arguments` must be an object")
    fn = TOOL_DISPATCH.get(tool_name)
    if fn is None:
        raise ValueError(f"unknown tool: {tool_name!r}")
    try:
        payload = fn(**args)
    except Exception as exc:  # noqa: BLE001
        return {"success": False, "error": f"{type(exc).__name__}: {exc}"}
    return {"success": True, "data": payload}


def handle_health(_params: dict[str, Any]) -> dict[str, Any]:
    return {"status": "ok", "max_bytes": MAX_BYTES}


METHOD_DISPATCH = {
    "describe": handle_describe,
    "invoke": handle_invoke,
    "health": handle_health,
}


def send(message: dict[str, Any]) -> None:
    sys.stdout.write(json.dumps(message, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def main() -> None:
    print("[document-extractor] ready", file=sys.stderr)
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            request = json.loads(line)
        except json.JSONDecodeError as exc:
            send(
                {
                    "jsonrpc": "2.0",
                    "id": None,
                    "error": {"code": -32700, "message": f"parse error: {exc}"},
                }
            )
            continue

        req_id = request.get("id")
        method = request.get("method")
        params = request.get("params") or {}
        handler = METHOD_DISPATCH.get(method)
        if handler is None:
            send(
                {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "error": {"code": -32601, "message": f"method not found: {method}"},
                }
            )
            continue
        try:
            result = handler(params)
            send({"jsonrpc": "2.0", "id": req_id, "result": result})
        except Exception as exc:  # noqa: BLE001
            send(
                {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "error": {"code": -32000, "message": str(exc)},
                }
            )


if __name__ == "__main__":
    main()
