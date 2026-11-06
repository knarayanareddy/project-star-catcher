"""Validate the reorganized story library using only Python's standard library.

Run from the repository root:
    python docs/story-development/validate_library.py

Checks organization, local Markdown links, the existing package validators,
standalone use of the three scripted packages, and treatment-stage timings.
Does not generate audio, modify authored scripts, or test performed runtime.
"""

from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent.parent
FOLDERS = (
    "star-catcher",
    "good-mourning",
    "the-republic-of-tomorrow",
    "nobody-owns-tuesday",
    "the-department-of-missing-rooms",
    "the-town-that-forgot-the-dark",
    "shared",
)
PACKAGES = (
    ("good-mourning", "validate_package.py", []),
    ("the-department-of-missing-rooms", "prepare_narration.py", ["--check"]),
    ("the-town-that-forgot-the-dark", "prepare_narration.py", ["--check"]),
)


def check_links() -> None:
    files = [REPO / "README.md", *sorted(ROOT.rglob("*.md"))]
    for path in files:
        for target in re.findall(r"\]\(([^)]+)\)", path.read_text()):
            if "://" in target or target.startswith(("#", "mailto:")):
                continue
            destination = (path.parent / target.split("#")[0]).resolve()
            assert destination.exists(), (path.relative_to(REPO), target)
    print(f"PASS: local Markdown links resolve in {len(files)} documents", flush=True)


def seconds(value: str) -> int:
    minutes, secs = map(int, value.split(":"))
    assert 0 <= secs < 60
    return minutes * 60 + secs


def check_treatment(folder: str) -> None:
    text = (ROOT / folder / "series-bible.md").read_text()
    episodes = re.split(r"^### Episode \d+[^\n]*\n", text, flags=re.MULTILINE)[1:]
    assert len(episodes) == 6, (folder, "expected six episodes")
    for number, episode in enumerate(episodes, 1):
        ranges = re.findall(r"\*\*(\d+:\d\d)–(\d+:\d\d)", episode)
        assert len(ranges) == 5, (folder, number, "expected five outline movements")
        cursor = 0
        for start, end in ranges:
            assert seconds(start) == cursor, (folder, number, "gap/overlap")
            assert seconds(end) > cursor
            cursor = seconds(end)
        assert cursor == 600, (folder, number, "expected 10:00")
    print(f"PASS: {folder}: six complete 10:00 outline allocations", flush=True)


def main() -> None:
    for folder in FOLDERS:
        assert (ROOT / folder / "README.md").exists(), (folder, "missing entry point")
    assert (ROOT / "star-catcher/arc-review.md").exists()
    assert len(list(ROOT.glob("*/series-bible.md"))) == 5
    assert not (ROOT / "narrated-mini-series").exists(), "Legacy combined folder still present"
    check_links()
    for folder, script, args in PACKAGES:
        subprocess.run([sys.executable, str(ROOT / folder / script), *args], check=True)
    for folder in ("the-republic-of-tomorrow", "nobody-owns-tuesday"):
        check_treatment(folder)
    # Each authored production package must work when copied without its siblings.
    # Scratch copies are outside the repository and are removed automatically.
    with tempfile.TemporaryDirectory(prefix="story-library-check-") as tmp:
        for folder, script, args in PACKAGES:
            copied = Path(tmp) / folder
            shutil.copytree(ROOT / folder, copied)
            subprocess.run(
                [sys.executable, script, *args],
                cwd=copied,
                check=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
            )
            print(f"PASS: {folder} validates as a standalone copied folder", flush=True)
    assert len(list((ROOT / "good-mourning/screenplays").glob("*.fountain"))) == 6
    for folder in ("the-department-of-missing-rooms", "the-town-that-forgot-the-dark"):
        assert len(list((ROOT / folder / "narration").glob("*.txt"))) == 6
    print("PASS: six screenplays and twelve narration-only exports accounted for", flush=True)
    print("NOT TESTED: performed runtime, audio/video quality, or production readiness", flush=True)


if __name__ == "__main__":
    main()
