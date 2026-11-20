import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from scripts import build_site
from scripts.build_site import LOCAL_ASSETS, ContentError, PluginError, version_asset_urls


class AssetVersionTests(unittest.TestCase):
    def test_versions_follow_bytes_and_refresh_changed_note_data(self):
        template = "\n".join(f'<script src="assets/{name}"></script>' for name in LOCAL_ASSETS)
        with tempfile.TemporaryDirectory() as directory:
            assets = Path(directory)
            for name in LOCAL_ASSETS:
                (assets / name).write_text("original", encoding="utf-8")
            first = version_asset_urls(template, assets)
            self.assertNotEqual(first, template)
            self.assertEqual(first.count("?v="), len(LOCAL_ASSETS))

            data_file = assets / "papers.js"
            original_stat = data_file.stat()
            os.utime(data_file, (1, 1))
            self.assertEqual(first, version_asset_urls(template, assets))

            data_file.write_text("new note", encoding="utf-8")
            os.utime(data_file, ns=(original_stat.st_atime_ns, original_stat.st_mtime_ns))
            updated = version_asset_urls(template, assets)
            self.assertNotEqual(first, updated)
            for old, new, name in zip(first.splitlines(), updated.splitlines(), LOCAL_ASSETS):
                if name == "papers.js":
                    self.assertNotEqual(old, new)
                else:
                    self.assertEqual(old, new)

    def test_missing_template_reference_is_reported(self):
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaises(ContentError):
                version_asset_urls("<html></html>", Path(directory))


class PluginIntegrationTests(unittest.TestCase):
    def test_plain_build_calls_plugin_after_core_build(self):
        calls = []
        with patch("sys.argv", ["build_site.py"]), patch.object(build_site, "load_papers", return_value=[]), \
                patch.object(build_site, "build", side_effect=lambda _: calls.append("site")), \
                patch.object(build_site, "run_pdf_export_plugin", side_effect=lambda: calls.append("plugin")):
            self.assertEqual(build_site.main(), 0)
        self.assertEqual(calls, ["site", "plugin"])

    def test_check_and_skip_flags_do_not_run_plugin(self):
        for flag in ("--check", "--skip-plugins"):
            with self.subTest(flag=flag), patch("sys.argv", ["build_site.py", flag]), \
                    patch.object(build_site, "load_papers", return_value=[]), \
                    patch.object(build_site, "build") as build, patch.object(build_site, "run_pdf_export_plugin") as plugin:
                self.assertEqual(build_site.main(), 0)
                plugin.assert_not_called()
                self.assertEqual(build.call_count, 0 if flag == "--check" else 1)

    def test_absent_or_disabled_plugin_needs_no_additional_runtime(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(build_site, "ROOT", Path(directory)), \
                patch.dict(os.environ, {"ENABLE_PDF_EXPORT": "true"}), patch.object(build_site.subprocess, "run") as run:
            build_site.run_pdf_export_plugin()
            run.assert_not_called()
            entry = Path(directory) / "plugins/pdf-export/build.py"
            entry.parent.mkdir(parents=True)
            entry.write_text("# trusted local plugin", encoding="utf-8")
            with patch.dict(os.environ, {"ENABLE_PDF_EXPORT": "false"}):
                build_site.run_pdf_export_plugin()
            run.assert_not_called()
            build_site.run_pdf_export_plugin()
            run.assert_called_once_with([build_site.sys.executable, str(entry)], cwd=Path(directory), check=True)

    def test_invalid_setting_and_symlink_are_rejected(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(build_site, "ROOT", Path(directory)):
            with patch.dict(os.environ, {"ENABLE_PDF_EXPORT": "maybe"}), self.assertRaises(PluginError):
                build_site.run_pdf_export_plugin()
            (Path(directory) / "plugins").symlink_to(Path(directory), target_is_directory=True)
            with patch.dict(os.environ, {"ENABLE_PDF_EXPORT": "true"}), self.assertRaises(PluginError):
                build_site.run_pdf_export_plugin()

    def test_plugin_failure_is_not_reported_as_success(self):
        with patch("sys.argv", ["build_site.py"]), patch.object(build_site, "load_papers", return_value=[]), \
                patch.object(build_site, "build"), patch.object(build_site, "run_pdf_export_plugin", side_effect=PluginError("test")):
            self.assertEqual(build_site.main(), 1)


if __name__ == "__main__":
    unittest.main()
