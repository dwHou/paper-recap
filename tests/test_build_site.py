import os
import tempfile
import unittest
from pathlib import Path

from scripts.build_site import LOCAL_ASSETS, ContentError, version_asset_urls


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


if __name__ == "__main__":
    unittest.main()
