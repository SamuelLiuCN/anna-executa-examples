#!/usr/bin/env python3
"""Document Extractor — Executa stdio tool for MLPS Review.

The iframe sends a bounded base64 payload or download URL for user-selected docs.
This plugin extracts plain text and returns it to the app, where the host LLM
performs the MLPS review. Logs go to stderr; stdout is JSON-RPC only.
"""

from __future__ import annotations

import base64
import gc
import hashlib
import io
import json
import re
import sys
import tempfile
import time
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

import fitz
import pytesseract
from docx import Document
from PIL import Image


MAX_BYTES = 200 * 1024 * 1024
DEFAULT_MAX_CHARS = 500_000
DEFAULT_OCR_DPI = 120
DEFAULT_MAX_OCR_PAGES = 20
OCR_PAGE_TIMEOUT_SECONDS = 20
OCR_TOTAL_BUDGET_SECONDS = 120
DOWNLOAD_CACHE_DIR = Path(tempfile.gettempdir()) / "anna-mlps-review-cache"

MANIFEST: dict[str, Any] = {
    "name": "tool-intern2-document-extractor-u2n2j8x5",
    "display_name": "Document Extractor",
    "version": "0.1.1",
    "description": "Extract plain text from PDF, DOCX, TXT, and Markdown files for MLPS review.",
    "author": "Anna Developer",
    "license": "MIT",
    "tags": ["document", "pdf", "docx", "txt", "markdown", "mlps", "compliance"],
    "tools": [
        {
            "name": "extract_document",
            "description": "Extract plain text from a PDF, DOCX, TXT, or Markdown document.",
            "parameters": [
                {
                    "name": "filename",
                    "type": "string",
                    "description": "Original filename ending in .pdf, .docx, .txt, or .md.",
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
                    "name": "max_chars",
                    "type": "integer",
                    "description": "Maximum extracted text characters to return.",
                    "required": False,
                    "default": DEFAULT_MAX_CHARS,
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
        }
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


def _download_pdf_to_cache(download_url: str) -> Path:
    parsed = urllib.parse.urlparse(download_url or "")
    cache_key = f"{parsed.scheme}://{parsed.netloc}{parsed.path}"
    digest = hashlib.sha256(cache_key.encode("utf-8")).hexdigest()
    DOWNLOAD_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    path = DOWNLOAD_CACHE_DIR / f"{digest}.pdf"
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


def _open_pdf(source: bytes | str | Path) -> fitz.Document:
    if isinstance(source, (str, Path)):
        return fitz.open(str(source))
    return fitz.open(stream=source, filetype="pdf")


def _tesseract_lang(warnings: list[str]) -> str:
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
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise ValueError(f"{kind.upper()} 必须使用 UTF-8 编码：{exc}") from exc
    text = _clean_text(text)
    if not text:
        warnings.append(f"{kind.upper()} 未抽取到正文文本")
    return {
        "kind": kind,
        "text": text,
        "line_count": len(text.splitlines()) if text else 0,
        "warnings": warnings,
    }


def _extract_raw(
    filename: str,
    source: bytes | str | Path,
    mime_type: str = "",
    max_chars: int = DEFAULT_MAX_CHARS,
    max_ocr_pages: int = DEFAULT_MAX_OCR_PAGES,
    ocr_dpi: int = DEFAULT_OCR_DPI,
    page_start: int = 1,
    page_count: int = 0,
) -> dict[str, Any]:
    ext = _extension(filename)
    if ext not in {"pdf", "docx", "txt", "md", "markdown"}:
        raise ValueError("only .pdf, .docx, .txt, and .md are supported")
    source_size = Path(source).stat().st_size if isinstance(source, (str, Path)) else len(source)
    if source_size > MAX_BYTES:
        raise ValueError(f"file exceeds {MAX_BYTES} bytes")

    if ext == "pdf":
        result = _extract_pdf(source, max_chars, max_ocr_pages, ocr_dpi, page_start, page_count)
    elif ext == "docx":
        if not isinstance(source, bytes):
            source = Path(source).read_bytes()
        result = _extract_docx(source)
    else:
        if not isinstance(source, bytes):
            source = Path(source).read_bytes()
        result = _extract_text(source, "md" if ext in {"md", "markdown"} else "txt")

    max_chars = max(1_000, min(int(max_chars or DEFAULT_MAX_CHARS), DEFAULT_MAX_CHARS))
    text = result["text"]
    truncated = len(text) > max_chars
    if truncated:
        text = text[:max_chars]
        result["warnings"].append(
            f"文本超过 {max_chars} 字符，已截断后返回给界面"
        )

    result.update(
        {
            "filename": filename,
            "mime_type": mime_type or "",
            "size_bytes": source_size,
            "text": text,
            "char_count": len(text),
            "truncated": truncated,
        }
    )
    return result


def tool_extract_document(
    filename: str,
    bytes_b64: str = "",
    download_url: str = "",
    mime_type: str = "",
    max_chars: int = DEFAULT_MAX_CHARS,
    max_ocr_pages: int = DEFAULT_MAX_OCR_PAGES,
    ocr_dpi: int = DEFAULT_OCR_DPI,
    page_start: int = 1,
    page_count: int = 0,
) -> dict[str, Any]:
    filename = (filename or "").strip()
    ext = _extension(filename)
    if ext not in {"pdf", "docx", "txt", "md", "markdown"}:
        raise ValueError("only .pdf, .docx, .txt, and .md are supported")

    if download_url and ext == "pdf":
        source: bytes | Path = _download_pdf_to_cache(download_url)
    else:
        source = _download_bytes(download_url) if download_url else _decode_bytes(bytes_b64)
    return _extract_raw(
        filename,
        source,
        mime_type,
        max_chars,
        max_ocr_pages,
        ocr_dpi,
        page_start,
        page_count,
    )


TOOL_DISPATCH = {"extract_document": tool_extract_document}


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
