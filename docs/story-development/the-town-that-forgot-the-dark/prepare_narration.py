"""Extract and structurally check the series narration scripts.

Run from the repository root:
    python docs/story-development/the-town-that-forgot-the-dark/prepare_narration.py --write
    python docs/story-development/the-town-that-forgot-the-dark/prepare_narration.py --check

Only standard-library modules are used. --write creates the six narration-only
text files from the source treatments. --check verifies those files are current.
Neither mode synthesizes audio or validates performed runtime or story quality.
"""

import argparse
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent
SERIES = {"series-bible.md": "forgotten-dark"}
EXPECTED_TIMES = [
    ("00:00", "00:45"),
    ("00:45", "01:30"),
    ("01:30", "02:15"),
    ("02:15", "03:00"),
    ("03:00", "03:45"),
]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    action = parser.add_mutually_exclusive_group(required=True)
    action.add_argument("--write", action="store_true")
    action.add_argument("--check", action="store_true")
    args = parser.parse_args()
    total_words = 0
    total_episodes = 0
    for filename, slug in SERIES.items():
        source = (ROOT / filename).read_text()
        episodes = list(re.finditer(r"^### Episode ([1-6]) — “([^”]+)”$", source, re.MULTILINE))
        assert len(episodes) == 6, (filename, "expected six episodes")
        assert [m.group(1) for m in episodes] == list("123456")
        for index, match in enumerate(episodes):
            end = episodes[index + 1].start() if index + 1 < len(episodes) else len(source)
            body = source[match.end():end]
            times = re.findall(r"^#### (\d\d:\d\d)–(\d\d:\d\d)$", body, re.MULTILINE)
            assert times == EXPECTED_TIMES, (filename, match.group(1), times)
            voiceovers = re.findall(r"^\*\*VO:\*\* (.+)$", body, re.MULTILINE)
            assert len(voiceovers) == 5, (filename, match.group(1), "expected five spoken passages")
            assert "03:45–04:00" in body, (filename, "missing end-card allocation")
            text = "\n\n".join(voiceovers) + "\n"
            destination = ROOT / "narration" / f"{int(match.group(1)):02d}.txt"
            if args.write:
                destination.parent.mkdir(parents=True, exist_ok=True)
                destination.write_text(text)
            else:
                assert destination.exists(), destination
                assert destination.read_text() == text, (destination, "stale extraction; run --write")
            word_count = len(text.split())
            # A broad guard against accidental inclusion of a full bible or an empty beat.
            assert 150 <= word_count <= 450, (destination, word_count)
            for beat_number, paragraph in enumerate(voiceovers, 1):
                assert len(paragraph.split()) <= 85, (destination, beat_number, "review 45-second window")
            total_words += word_count
            total_episodes += 1
            print(f"PASS {slug}/{match.group(1)}: five VO beats; {word_count} words; 3:45 story + 0:15 end card")
    assert total_episodes == 6
    for markdown in ROOT.rglob("*.md"):
        for target in re.findall(r"\]\(([^)]+)\)", markdown.read_text()):
            if "://" not in target and not target.startswith("#"):
                assert (markdown.parent / target.split("#")[0]).exists(), (markdown, target)
    print(f"PASS: 6 episodes, 30 matched VO windows, {total_words} spoken-script words")
    print("PASS: local links resolve; narration-only files match source")
    print("NOT VERIFIED: actual reading pace, final runtime, animation, or audio quality")


if __name__ == "__main__":
    main()
