from __future__ import annotations

import argparse
import re
from pathlib import Path


def _extract_code_blocks(text: str) -> list[list[str]]:
    blocks: list[list[str]] = []
    in_code = False
    current: list[str] = []

    for line in text.splitlines():
        if line.startswith("```"):
            if in_code:
                blocks.append(current)
                current = []
                in_code = False
            else:
                in_code = True
            continue

        if in_code:
            current.append(line.rstrip())

    return blocks


def _is_legend_block(block_lines: list[str]) -> bool:
    block = "\n".join(block_lines)
    return "[x] = Must have" in block and "[~] = Nice to have" in block


def _extract_feature_map_lines(feature_map_text: str) -> set[str]:
    lines: set[str] = set()
    for block in _extract_code_blocks(feature_map_text):
        if _is_legend_block(block):
            continue
        for line in block:
            if line:
                lines.add(line)
    return lines


_STATUS_RE = re.compile(r"\[(x|~|\?|-)\]")


def _status_of_line(line: str) -> str | None:
    match = _STATUS_RE.search(line)
    return match.group(1) if match else None


def _feature_map_section_summaries(feature_map_text: str) -> tuple[dict[str, dict[str, int]], int]:
    summaries: dict[str, dict[str, int]] = {}
    status_total = 0

    def ensure(section: str) -> dict[str, int]:
        if section not in summaries:
            summaries[section] = {
                "line_total": 0,
                "x": 0,
                "~": 0,
                "?": 0,
                "-": 0,
                "status_total": 0,
                "unmarked_total": 0,
            }
        return summaries[section]

    for block in _extract_code_blocks(feature_map_text):
        if _is_legend_block(block):
            continue
        header = next((ln for ln in block if ln.strip()), "")
        if not header:
            continue

        if header in {"EDITOR", "PLAYER", "PUBLIC PAGES", "STATE & API", "UI CORE"}:
            section = header
        elif header in {"TECH REPLACEMENTS", "BEHAVIOR CHANGES TO CONSIDER"}:
            section = "MIGRATION NOTES"
        else:
            section = "UNKNOWN"

        section_summary = ensure(section)

        for line in block:
            if not line or line == header:
                continue
            section_summary["line_total"] += 1
            status = _status_of_line(line)
            if status:
                section_summary[status] += 1
                section_summary["status_total"] += 1
                status_total += 1
            else:
                if section == "MIGRATION NOTES" and header == "TECH REPLACEMENTS" and "→" in line:
                    section_summary["unmarked_total"] += 1
                elif section == "UNKNOWN":
                    section_summary["unmarked_total"] += 1

    return summaries, status_total


def _looks_like_feature_map_line(line: str) -> bool:
    if not line:
        return False
    if "├──" in line or "└──" in line or "│" in line:
        return True
    if any(token in line for token in ("[x]", "[~]", "[-]", "[?]")):
        return True
    if line in {"EDITOR", "PLAYER", "PUBLIC PAGES", "STATE & API", "UI CORE"}:
        return True
    if line in {"TECH REPLACEMENTS", "BEHAVIOR CHANGES TO CONSIDER"}:
        return True
    return False


def _extract_plan_feature_like_lines(plan_text: str) -> set[str]:
    lines: set[str] = set()
    for raw in plan_text.splitlines():
        line = raw.rstrip()
        if _looks_like_feature_map_line(line):
            lines.add(line)
    return lines


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Verifies that every feature line from FEATURE_MAP.md is present in "
            "Frontend_Migration_Plan.md (exact line match)."
        )
    )
    parser.add_argument(
        "--feature-map",
        default="FEATURE_MAP.md",
        help="Path to FEATURE_MAP.md (default: FEATURE_MAP.md)",
    )
    parser.add_argument(
        "--plan",
        default="Frontend_Migration_Plan.md",
        help="Path to Frontend_Migration_Plan.md (default: Frontend_Migration_Plan.md)",
    )
    args = parser.parse_args()

    feature_map_path = Path(args.feature_map)
    plan_path = Path(args.plan)

    feature_map_text = feature_map_path.read_text(encoding="utf-8")
    plan_text = plan_path.read_text(encoding="utf-8")

    feature_map_lines = _extract_feature_map_lines(feature_map_text)
    plan_lines = _extract_plan_feature_like_lines(plan_text)

    missing = sorted(feature_map_lines - plan_lines)
    extra = sorted(plan_lines - feature_map_lines)

    print(f"FEATURE_MAP feature lines: {len(feature_map_lines)}")
    print(f"Plan feature-like lines:   {len(plan_lines)}")
    print(f"Missing lines:             {len(missing)}")
    print(f"Extra lines:               {len(extra)}")

    summaries, status_total = _feature_map_section_summaries(feature_map_text)
    section_order = ["EDITOR", "PLAYER", "PUBLIC PAGES", "STATE & API", "UI CORE", "MIGRATION NOTES", "UNKNOWN"]

    print("\n--- Feature Counts (status-tagged items) ---")
    print(f"Total status-tagged items: {status_total}")
    for section in section_order:
        if section not in summaries:
            continue
        s = summaries[section]
        print(
            f"{section}: lines={s['line_total']}, status={s['status_total']} "
            f"(x={s['x']}, ~={s['~']}, ?={s['?']}, -={s['-']})"
            + (f", unmarked={s['unmarked_total']}" if s.get("unmarked_total") else "")
        )

    if missing:
        print("\n--- Missing (present in FEATURE_MAP, absent in plan) ---")
        for line in missing:
            print(line)

    if extra:
        print("\n--- Extra (present in plan, absent in FEATURE_MAP) ---")
        for line in extra:
            print(line)

    return 0 if not missing and not extra else 1


if __name__ == "__main__":
    raise SystemExit(main())
