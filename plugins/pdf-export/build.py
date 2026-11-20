"""Package the optional browser-side PDF plugin. Never render notes or generate PDFs."""
from __future__ import annotations

import hashlib
import html
import json
import shutil
import sys
import tempfile
from pathlib import Path
from urllib.parse import urlsplit

PLUGIN = Path(__file__).resolve().parent
ROOT = PLUGIN.parents[1]
ASSETS = ("plugin.css", "export.css", "prepare.js", "plugin.js")
START = "<!-- pdf-export:start -->"
END = "<!-- pdf-export:end -->"


def safe_path(root: Path, relative: str) -> Path:
    parts = relative.split("/")
    if not relative or "\\" in relative or any(part in {"", ".", ".."} for part in parts):
        raise ValueError("invalid-plugin-path")
    current = root.resolve(strict=True)
    for part in parts:
        current = current / part
        if current.is_symlink():
            raise ValueError("plugin-symlink-not-allowed")
    if not current.resolve().is_relative_to(root.resolve()):
        raise ValueError("plugin-path-outside-root")
    return current


def public_base_url() -> str:
    config = json.loads(safe_path(PLUGIN, "config.json").read_text(encoding="utf-8"))
    if not isinstance(config, dict) or set(config) != {"publicBaseUrl"}:
        raise ValueError("invalid-plugin-config")
    value = config["publicBaseUrl"]
    if not isinstance(value, str) or len(value) > 2048 or any(char.isspace() or ord(char) < 32 or ord(char) == 127 for char in value):
        raise ValueError("invalid-public-base-url")
    url = urlsplit(value)
    _ = url.port  # Validate the optional port, including malformed values.
    if url.scheme != "https" or not url.hostname or url.username or url.password or url.query or url.fragment or not url.path.endswith("/"):
        raise ValueError("invalid-public-base-url")
    return value


def inject_plugin(index: str, versions: dict[str, str], public_url: str) -> str:
    if START in index:
        start = index.index(START)
        if END not in index[start:] or index.count(START) != 1:
            raise ValueError("invalid-plugin-markers")
        index = index[:start] + index[index.index(END, start) + len(END):]
    if index.count("</head>") != 1:
        raise ValueError("invalid-site-head")
    base = "plugins/pdf-export/"
    references = [
        START,
        f'<link rel="stylesheet" href="{base}plugin.css?v={versions["plugin.css"]}" />',
        f'<script src="{base}prepare.js?v={versions["prepare.js"]}" defer></script>',
        f'<script src="{base}plugin.js?v={versions["plugin.js"]}" data-export-style="export.css?v={versions["export.css"]}" data-public-base-url="{html.escape(public_url, quote=True)}" defer></script>',
        END,
    ]
    return index.replace("</head>", "\n".join(references) + "\n</head>")


def package_plugin(site: Path = ROOT / "dist") -> None:
    if site.is_symlink():
        raise ValueError("site-symlink-not-allowed")
    index_path = safe_path(site, "index.html")
    destination = safe_path(site, "plugins/pdf-export")
    index = index_path.read_text(encoding="utf-8")
    payload = {name: safe_path(PLUGIN, name).read_bytes() for name in ASSETS}
    versions = {name: hashlib.sha256(data).hexdigest()[:16] for name, data in payload.items()}
    updated = inject_plugin(index, versions, public_base_url())
    with tempfile.TemporaryDirectory(prefix=".pdf-export-assets-", dir=site) as directory:
        staging = Path(directory)
        for name, data in payload.items():
            (staging / name).write_bytes(data)
        staging.chmod(0o755)  # Published static assets must be readable by the hosting server.
        destination.parent.mkdir(parents=True, exist_ok=True)
        if destination.exists():
            shutil.rmtree(destination)
        staging.rename(destination)
    index_path.write_text(updated, encoding="utf-8")


if __name__ == "__main__":
    try:
        package_plugin()
    except (OSError, ValueError):
        print("PDF 插件资源接入失败，请检查插件文件及配置。", file=sys.stderr)
        sys.exit(1)
    print("已接入 PDF 插件：点击笔记中的按钮时按需导出。")
