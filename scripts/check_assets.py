"""交付物自检：JSON、SVG、Markdown 内部链接、占位符、统计。"""

import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
errors: list[str] = []
warnings: list[str] = []

# 1. JSON
for p in (ROOT / "data").glob("*.json"):
    try:
        json.loads(p.read_text(encoding="utf-8"))
    except Exception as exc:  # noqa: BLE001
        errors.append(f"JSON 解析失败 {p.name}: {exc}")

# 2. SVG 格式
for p in (ROOT / "docs" / "assets").glob("*.svg"):
    try:
        ET.parse(p)
    except Exception as exc:  # noqa: BLE001
        errors.append(f"SVG 格式错误 {p.name}: {exc}")

# 3. Markdown 内部链接
link_re = re.compile(r"\[[^\]]+\]\(([^)]+)\)")
for md in list(ROOT.glob("*.md")) + list((ROOT / "docs").glob("*.md")):
    text = md.read_text(encoding="utf-8")
    for target in link_re.findall(text):
        if target.startswith(("http://", "https://", "#", "mailto:")):
            continue
        target = target.split("#")[0]
        resolved = (md.parent / target).resolve()
        if not resolved.exists():
            errors.append(f"{md.relative_to(ROOT)}: 链接不存在 -> {target}")

# 4. 占位符
for md in list(ROOT.glob("*.md")) + list((ROOT / "docs").glob("*.md")):
    text = md.read_text(encoding="utf-8")
    for token in ("TODO", "TBD", "FIXME", "Lorem ipsum", "xxx"):
        if token in text:
            warnings.append(f"{md.relative_to(ROOT)}: 含占位符 {token}")

# 5. 统计
entries = json.loads((ROOT / "data" / "entries.json").read_text(encoding="utf-8"))["entries"]
years = {}
for e in entries:
    years.setdefault(e["year"], []).append(e)
bad = {y: len(v) for y, v in years.items() if len(v) != 4}
if bad:
    errors.append(f"每年 4 条不满足: {bad}")

kinds = {}
for e in entries:
    kinds[e["kind"]] = kinds.get(e["kind"], 0) + 1

docs = sorted((ROOT / "docs").glob("*.md"))
print(f"文档 {len(docs)} 篇，数据 {len(entries)} 条，类别 {kinds}")
print(f"年份覆盖 {min(years)}–{max(years)}，共 {len(years)} 年")

if errors:
    print("\n错误：")
    for e in errors:
        print("  -", e)
if warnings:
    print("\n提示：")
    for w in warnings:
        print("  -", w)
if not errors:
    print("\n自检通过。")
raise SystemExit(1 if errors else 0)
