import importlib.util
import tempfile
import unittest
from pathlib import Path

MODULE = Path(__file__).resolve().parents[1] / "plugins/pdf-export/build.py"
plugin = None
if MODULE.is_file():
    spec = importlib.util.spec_from_file_location("pdf_plugin_build", MODULE)
    plugin = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(plugin)


@unittest.skipIf(plugin is None, "Optional PDF plugin is not installed")
class PluginPackagingTests(unittest.TestCase):
    def test_package_is_assets_only_and_repeated_packaging_does_not_duplicate_hooks(self):
        with tempfile.TemporaryDirectory() as directory:
            site = Path(directory)
            (site / "index.html").write_text("<head></head><body>site</body>", encoding="utf-8")
            plugin.package_plugin(site)
            plugin.package_plugin(site)
            index = (site / "index.html").read_text(encoding="utf-8")
            self.assertEqual(index.count(plugin.START), 1)
            self.assertIn("prepare.js?v=", index)
            self.assertEqual({file.name for file in (site / "plugins/pdf-export").iterdir()}, set(plugin.ASSETS))
            self.assertEqual(list(site.rglob("*.pdf")), [])
            self.assertEqual(list(site.rglob("manifest.json")), [])

    def test_paths_reject_traversal_and_symlinks(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "link").symlink_to(root, target_is_directory=True)
            for path in ("../private", "/etc/passwd", "a/../../b", "a\\b", "link/file"):
                with self.subTest(path=path), self.assertRaises(ValueError):
                    plugin.safe_path(root, path)

    def test_malformed_hook_is_rejected(self):
        with self.assertRaises(ValueError):
            plugin.inject_plugin("<head>" + plugin.START + "</head>", {}, "https://example.com/")


if __name__ == "__main__":
    unittest.main()
