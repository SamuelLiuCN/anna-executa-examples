# MLPS Review — Anna App example

Manage companies, MLPS projects, company knowledge bases, and review records.
Upload PDF, Office, text, CSV, and archive documents up to 200 MB. Ordinary
PDF/DOCX/PPTX/XLSX/XLS files are read through Anna native Agent Session
`doc_read` / `sheet_read` tools when available; archives and OCR fallback still
use the bundled Python Executa. The app retrieves relevant company knowledge and
asks the host LLM to review the content against MLPS 2.0 / 等保 baseline control
areas.

## Run locally

```bash
cd examples/anna-app-mlps-review
anna-app dev
```

Open the printed local harness URL. The bundle calls:

- `anna.tools.invoke({ tool_id, method: "extract_document", args })`
- `anna.agent.session.catalog()` / `anna.agent.session(...).run({ attachments, allowed_tools })` for native `doc_read` / `sheet_read`
- `anna.files.upload_init(...)` / browser `PUT` / `anna.files.upload_finalize(...)` for files above 8 MB
- `anna.files.download_url(...)`, `anna.files.download(...)`, `anna.files.list(...)`, `anna.files.delete(...)`
- `anna.storage.get(...)` / `anna.storage.set(...)` / `anna.storage.list(...)` / `anna.storage.delete(...)`
- `anna.llm.complete({ messages, systemPrompt, maxTokens })`
- `anna.window.set_title({ title })`

## Project layout

```text
anna-app-mlps-review/
├── app.json
├── manifest.json
├── bundle/
│   ├── index.html
│   ├── style.css
│   ├── anna-tool-ids.js
│   └── app.js
└── executas/
    └── document-extractor/
        ├── executa.json
        ├── pyproject.toml
        └── document_extractor_plugin.py
```

The staging tool id is `tool-intern2-document-extractor-u2n2j8x5`. During
`anna-app dev` / publish, Anna writes `bundle/anna-tool-ids.js` with the active
tool id for the `document-extractor` bundled handle.

## Native document parsing

The app prefers Anna platform parsing for ordinary documents:

- `doc_read`: PDF, DOCX, PPTX attachments.
- `sheet_read`: XLSX, XLS attachments.
- TXT/MD/CSV: read directly in the app.

If platform parsing is unavailable, returns empty text, or identifies a scanned
PDF, the app falls back to the bundled `document-extractor` and records the
fallback reason in extraction warnings. ZIP/TAR.GZ still use Executa for
recursive listing and per-entry extraction.

## Data model

The app stores structured indexes in Anna app-scoped storage:

- `mlps:v1:index`
- `mlps:v1:companies`
- `mlps:v1:projects`
- `mlps:v1:reviews`
- `mlps:v1:knowledge`

Large objects are stored in Anna APS files under `mlps-review/companies/...`.
Knowledge base entries keep the original file and an editable extracted text
copy. Review records keep the source file, extracted text, report, parameters,
and knowledge references used by the run.

## OCR for scanned PDFs

The Python Executa first tries the PDF text layer. If no text is found, it
renders pages with PyMuPDF and runs Tesseract OCR.

For Chinese scanned PDFs, install the Chinese Tesseract language data on the
machine running Anna Agent / the local harness:

```bash
brew install tesseract tesseract-lang
tesseract --list-langs
```

OCR runs in batches because one Anna tool call has a hard timeout. Increase the
"处理页数上限" control when you need more pages; the app processes the PDF in
smaller batches and shows progress.

## Publish to staging

The bundled `document-extractor` Executa must be installable by the selected
Anna Agent in staging. Its `executa.json` keeps both profiles:

- `local`: local/dev shim for `anna-app dev`.
- `binary`: staging/production distribution using per-platform release assets.

For staging, build and publish with the repository workflow:

```bash
# GitHub Actions -> Anna App - build & publish
# app: anna-app-mlps-review
# lifecycle: cut
```

The workflow builds Anna binary archives for the Executa tag
`document-extractor-v0.1.12`. Each archive contains a `manifest.json` and
`bin/tool-intern2-document-extractor-u2n2j8x5`, matching the official binary
packaging guide:

- `tool-intern2-document-extractor-u2n2j8x5-darwin-arm64.tar.gz`
- `tool-intern2-document-extractor-u2n2j8x5-darwin-x86_64.tar.gz`
- `tool-intern2-document-extractor-u2n2j8x5-linux-x86_64.tar.gz`

It then runs `anna-app apps push --profile binary` and
`anna-app apps cut <version>`, so the frozen app version points at an
installable Executa distribution instead of the local dev shim.

If publishing manually, upload equivalent assets first, make sure
`executas/document-extractor/executa.json` points at those URLs, then run:

```bash
anna-app apps push --profile binary
anna-app apps cut 0.1.12 --changelog "Use native doc_read/sheet_read with Executa fallback"
```

OCR still requires the runtime machine to provide the Tesseract executable and
Chinese language data. If the staging Agent does not have them, PDF/DOCX/TXT
extraction still works, but scanned Chinese PDF OCR will return a clear
Tesseract/language warning.
