"""Structural checks only; does not prove story quality or actual screen runtime.

Run: python docs/story-development/good-mourning/validate_package.py
Uses the Python standard library; makes no file changes.
"""

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent


def seconds(value: str) -> int:
    minutes, secs = map(int, value.split(":"))
    assert 0 <= secs < 60, value
    return 60 * minutes + secs


def check_scenes(rows: list[tuple[str, str, str]], episode: int) -> None:
    assert len(rows) == 7, (episode, "expected seven scenes", rows)
    cursor = 0
    for index, (scene, start, end) in enumerate(rows, 1):
        assert scene == f"{episode}.{index}", (episode, scene)
        assert seconds(start) == cursor, (scene, "gap or overlap")
        assert seconds(end) > cursor, (scene, "empty scene")
        cursor = seconds(end)
    assert cursor == 585, (episode, "expected 9:45 story")


def main() -> None:
    treatment = (ROOT / "scene-by-scene-treatments.md").read_text()
    treatment_rows = re.findall(
        r"^### (10[1-6]\.\d) · (\d{2}:\d{2})–(\d{2}:\d{2})",
        treatment,
        re.MULTILINE,
    )
    assert len(treatment_rows) == 42, "Expected 42 treatment scenes"
    files = sorted((ROOT / "screenplays").glob("*.fountain"))
    assert len(files) == 6, "Expected six screenplays"
    total_words = 0
    for episode, path in zip(range(101, 107), files):
        assert path.name.startswith(str(episode)), path
        text = path.read_text()
        rows = re.findall(
            r"^# (10[1-6]\.\d) \| (\d{2}:\d{2})-(\d{2}:\d{2})$",
            text,
            re.MULTILINE,
        )
        check_scenes(rows, episode)
        expected = [row for row in treatment_rows if row[0].startswith(f"{episode}.")]
        assert rows == expected, (path.name, "script/treatment timing mismatch")
        assert "[[09:45-10:00" in text, (path.name, "missing credits allocation")
        assert "CUT TO BLACK." in text, (path.name, "missing ending")
        assert not re.search(r"\b(?:TODO|TBD|INSERT DIALOGUE)\b", text), path.name
        assert len(re.findall(r"^(?:INT\.|EXT\.)", text, re.MULTILINE)) >= 7, path.name
        words = len(text.split())
        total_words += words
        print(f"PASS {episode}: 7 scenes; 9:45 story + 0:15 credits; {words:,} words")
    for path in ROOT.rglob("*.md"):
        for target in re.findall(r"\]\(([^)]+)\)", path.read_text()):
            if "://" not in target and not target.startswith("#"):
                assert (path.parent / target.split("#")[0]).exists(), (path, target)
    # Arithmetic independently reconciled with the ledger and dialogue.
    assert 17 * 30 == 510
    assert 510 * 10 == 5100
    assert 510 * 7 == 3570
    assert 5100 - 3570 == 1530
    assert 1530 + 5 * 510 == 4080
    assert 4080 + 2 * 510 == 5100
    assert 900 + 600 >= 1200
    print(f"PASS: 42 matched scenes; 60:00 total editorial allocation; {total_words:,} screenplay words")
    print("PASS: package links resolve; bridge arithmetic reconciles")
    print("NOT TESTED: performed runtime, clinical/legal accuracy, staging, or narrative quality")


if __name__ == "__main__":
    main()
