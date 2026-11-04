#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""校验 data/*.json 并生成分时期代表作清单文档（docs/03–08）。

用法：
    python scripts/build_docs.py            # 校验 + 生成
    python scripts/build_docs.py --check    # 只校验

约定：
- 每年 4 条；1996–2025 为核心 120 条，不设观察位。
- 同一作品只出现一次；同一创作者原则上不超过 2 次（超过时打印提示，不报错）。
"""

from __future__ import annotations

import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
DOCS = ROOT / "docs"

KIND_LABEL = {
    "anime": "动画",
    "manga": "漫画",
    "game": "游戏",
    "illustration": "插画",
}
FACET_LABEL = {
    "line": "线",
    "eye": "眼",
    "face": "脸",
    "color": "色",
    "body": "身",
    "hair": "发",
    "staging": "演",
    "texture": "质",
    "proportion": "比例",
}
PERIOD_DOC = {
    "P1": "03-年度代表作-1996-1999.md",
    "P2": "04-年度代表作-2000-2004.md",
    "P3": "05-年度代表作-2005-2009.md",
    "P4": "06-年度代表作-2010-2014.md",
    "P5": "07-年度代表作-2015-2019.md",
    "P6": "08-年度代表作-2020-2025.md",
}
PROVISIONAL_DOC = "09-年度代表作-2026-观察中.md"

YEAR_KEYWORD: dict[int, str] = {}

PERIOD_INTRO = {
    "P1": (
        "EVA 在 1996 年 3 月播完最后一话，随后 1997 年的剧场版把它推到顶点。"
        "这一期的人物画风仍以赛璐璐为基础，但数字合成已经开始改变影调：阴影变薄、颜色变冷，"
        "人物被画得又瘦又长。选片的重心放在『线条的两种极端』——贞本义行式的削瘦细线，"
        "与结城信辉、CLAMP 式的端正装饰。"
        "\n\n> 本期**没有插画席位**：1990 年代的插画尚未独立成为大众现象，"
        "插画师的影响主要经由游戏与动画实现（如藤岛康介之于《樱花大战》、吉成钢之于《女神侧身像》）。"
        "这是研究结论，不是漏选——详见 `00-研究框架与范围.md` §4.2。"
    ),
    "P2": (
        "2000 年前后，数字作画全面替代赛璐璐，涂法在几年内被统一成『动画涂＋高光』。"
        "副作用是五官被拆成可复用的零件：平井脸、ぷに顔、属性标签。这一期的选片刻意保留"
        "『工业标准』与『反工业标准』两条线——《高达 SEED》与《攻壳 SAC》同年，就是最好的对照。"
    ),
    "P3": (
        "角色第一次比作品更有名。京都动画把脸做成品牌，轻小说插画反向定义动画脸，"
        "初音未来则让插画师成为角色的作者。这一期的关键词是『透明感』：上色变薄，"
        "眼睛变大，鼻口被压缩到几乎不存在。"
    ),
    "P4": (
        "从『记号』转向『信息』。眼睛被画出虹膜层次，皮肤被画出通透感，作画者本人成为话题。"
        "同时，剧场动画与 TV 动画的分辨率差距被拉开，『高精细』成为一种独立的美学主张。"
    ),
    "P5": (
        "海外市场成为主战场，『日本动画脸』被全球消费；内部却裂成三条互不相让的路线："
        "马越嘉彦式的太线、鬼灭式的和风浮世绘、以及西屋太志/山田尚子式的极简。"
        "这一期再没有一个统一的主流。"
    ),
    "P6": (
        "『可爱』被拆解重组，线条重新变少。3DCG 学会了手绘的崩坏，插画与动画的边界被 SNS 抹平，"
        "中国团队的『赛璐璐 3D』成为全球审美的最大公约数。这一期的选片偏向『谁能定义下一个十年』。"
    ),
}


def load() -> tuple[dict, dict, list[dict]]:
    meta = json.loads((DATA / "periods.json").read_text(encoding="utf-8"))
    entries = json.loads((DATA / "entries.json").read_text(encoding="utf-8"))
    return meta, entries["meta"], entries["entries"]


def validate(periods: dict, entries: list[dict]) -> list[str]:
    errors: list[str] = []
    ids = Counter(e["id"] for e in entries)
    for k, v in ids.items():
        if v > 1:
            errors.append(f"重复 id：{k}")

    by_year: dict[int, list[dict]] = defaultdict(list)
    for e in entries:
        by_year[e["year"]].append(e)

    for year in range(1996, 2026):
        n = len(by_year.get(year, []))
        if n != 4:
            errors.append(f"{year} 年有 {n} 条，应为 4 条")

    kinds = Counter(e["kind"] for e in entries)
    for k in kinds:
        if k not in KIND_LABEL:
            errors.append(f"未知类别：{k}")

    core = [e for e in entries if e["status"] == "core"]
    anime_core = [e for e in core if e["kind"] == "anime"]
    if len(core) != 120:
        errors.append(f"核心条目 {len(core)} 条，应为 120 条")
    if len(anime_core) < 60:
        errors.append(f"核心动画 {len(anime_core)} 条，应 ≥60 条")

    # 时期一致性
    range_of = {p["id"]: p["range"] for p in periods["periods"]}
    for e in entries:
        if e['year'] not in range(1996, 2026) or e['status'] != 'core':
            errors.append(f"范围外或非核心条目：{e['id']}")
        lo, hi = range_of[e["period"]]
        if not (lo <= e["year"] <= hi):
            errors.append(f"{e['id']} 的年份 {e['year']} 不在 {e['period']}（{lo}-{hi}）内")

    # 作品唯一性
    dup = Counter(e["zh"] for e in entries)
    for k, v in dup.items():
        if v > 1:
            errors.append(f"作品重复出现：{k}")

    # 创作者复用提示
    creators = Counter(e["creator"] for e in entries if e.get("creator"))
    for k, v in creators.items():
        if v > 2:
            print(f"提示：创作者『{k}』出现 {v} 次（约定上限 2 次）")

    return errors


def cell(text: str | None) -> str:
    return (text or "—").replace("|", "／")


def work_name(e: dict) -> str:
    if e["kind"] == "illustration":
        rep = e.get("rep")
        return f"**{e['zh']}**" + (f"<br><span>{rep}</span>" if rep else "")
    ja = e.get("ja") or ""
    en = e.get("en") or ""
    extra = " / ".join(x for x in [ja if ja and ja != e["zh"] else "", en if en and en != e["zh"] else ""] if x)
    return f"**{e['zh']}**<br><span>{extra}</span>" if extra else f"**{e['zh']}**"


def staff(e: dict) -> str:
    creator = e.get("creator") or "—"
    designer = e.get("designer") or ""
    org = e.get("org") or ""
    original = e.get("originalDesigner") or ""
    if e["kind"] == "illustration":
        return "插画师"
    line2 = " · ".join(x for x in [f"角色原案 {original}" if original else "", f"角色设计 {designer}" if designer else "", org] if x)
    return f"{creator}<br><span>{line2}</span>" if line2 else creator


def render_period(period: dict, entries: list[dict], prev_next: str) -> str:
    pid = period["id"]
    years = sorted({e["year"] for e in entries})
    lines: list[str] = []
    lines.append(f"# {period['label']} 年度代表作｜{period['name']}")
    lines.append("")
    lines.append(f"> 分期：**{period['label']}｜{period['name']}——{period['subname']}**")
    lines.append(">")
    lines.append(f"> 一句话：{period['oneLiner']}")
    lines.append(f"> 期关键词：{'、'.join(period['keywords'])}")
    lines.append("")
    lines.append(PERIOD_INTRO[pid])
    lines.append("")
    lines.append("> 读法：每行末的『维度』是这件作品最适合用来说明人物画风的哪一面（" + "、".join(FACET_LABEL.values()) + "）。"
                 "详情参见 `02-各时期画风研究.md`；数据源为 `data/entries.json`。")
    lines.append("")

    for year in years:
        rows = [e for e in entries if e["year"] == year]
        lines.append(f"## {year}｜{YEAR_KEYWORD.get(year, '四件样本的并行观察')}")
        lines.append("")
        lines.append("| # | 类别 | 作品 | 主创 / 制作 | 维度 | 入选理由 |")
        lines.append("|---|------|------|-------------|------|----------|")
        for i, e in enumerate(rows, 1):
            lines.append(
                f"| {i} | {KIND_LABEL[e['kind']]} | {work_name(e)} | {staff(e)} | "
                f"{FACET_LABEL[e.get('facet', 'line')]} | {cell(e['why'])} |"
            )
        lines.append("")
        if any(e.get("yearNote") for e in rows):
            notes = "；".join(f"{e['zh']}：{e['yearNote']}" for e in rows if e.get("yearNote"))
            lines.append(f"*年份说明：{notes}*")
            lines.append("")

    kinds = Counter(e["kind"] for e in entries)
    lines.append(f"## 本期小结")
    lines.append("")
    lines.append(
        f"共 {len(entries)} 条：动画 {kinds.get('anime', 0)}、漫画 {kinds.get('manga', 0)}、"
        f"游戏 {kinds.get('game', 0)}、插画 {kinds.get('illustration', 0)}。"
    )
    lines.append("")
    lines.append(prev_next)
    lines.append("")
    return "\n".join(lines)


def main() -> int:
    periods, meta, entries = load()
    PERIOD_INTRO.update({p["id"]: p["oneLiner"] for p in periods["periods"]})
    PERIOD_INTRO.update({p["id"]: p["oneLiner"] for p in periods["periods"]})
    errors = validate(periods, entries)
    if errors:
        print("校验失败：")
        for e in errors:
            print("  -", e)
        return 1

    kinds = Counter(e["kind"] for e in entries)
    core = [e for e in entries if e["status"] == "core"]
    anime_core = sum(1 for e in core if e["kind"] == "anime")
    print(f"OK：{len(entries)} 条（核心 {len(core)} / 观察 {len(entries) - len(core)}）")
    print(f"    类别：{dict(kinds)}")
    print(f"    核心动画：{anime_core}/{len(core)} = {anime_core / len(core):.1%}")
    for p in periods["periods"]:
        rows = [e for e in entries if e["period"] == p["id"] and e["status"] == "core"]
        c = Counter(e["kind"] for e in rows)
        print(
            f"    {p['id']} {p['label']}: {len(rows)} 条 "
            f"(动画 {c.get('anime', 0)} / 漫画 {c.get('manga', 0)} / "
            f"游戏 {c.get('game', 0)} / 插画 {c.get('illustration', 0)})"
        )

    if "--check" in sys.argv:
        return 0

    by_period: dict[str, list[dict]] = defaultdict(list)
    for e in entries:
        by_period[e["period"]].append(e)

    order = [p["id"] for p in periods["periods"]]
    for idx, pid in enumerate(order):
        period = next(p for p in periods["periods"] if p["id"] == pid)
        kind_order = {"anime": 0, "manga": 1, "game": 2, "illustration": 3}
        rows = sorted(by_period[pid], key=lambda e: (e["year"], kind_order[e["kind"]], e.get("order", 50), e["id"]))
        if pid == "P6":
            core_rows = [e for e in rows if e["status"] == "core"]
            prov = [e for e in rows if e["status"] == "provisional"]
            prev = f"上一期：[{periods['periods'][idx - 1]['label']}]({PERIOD_DOC[periods['periods'][idx - 1]['id']]})"
            nxt = "[赏析规范](10-赏析写作规范与样例.md)"
            doc = render_period(period, core_rows, f"{prev}｜下一期：{nxt}")
            (DOCS / PERIOD_DOC[pid]).write_text(doc, encoding="utf-8")
        else:
            prev_p = periods["periods"][idx - 1]
            next_p = periods["periods"][idx + 1]
            prev = f"上一期：[{prev_p['label']}]({PERIOD_DOC[prev_p['id']]})"
            nxt = f"下一期：[{next_p['label']}]({PERIOD_DOC[next_p['id']]})"
            doc = render_period(period, rows, f"{prev}｜{nxt}")
            (DOCS / PERIOD_DOC[pid]).write_text(doc, encoding="utf-8")
        print(f"  写入 docs/{PERIOD_DOC[pid]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
