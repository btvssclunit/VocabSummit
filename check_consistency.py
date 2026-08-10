#!/usr/bin/env python3
# 跨源流一致性检查 · Vocab Summit
# 用法: python3 check_consistency.py  (与四个 *_词语总表.xlsx 放同一文件夹)
# 同一词语在不同源流的 拼音/词性/中文释义 不一致时打印警告。
# 生成 JSON 前先跑一次；也可直接并入 generate_vocab_json.py。
import openpyxl, collections, sys, os

FILES = {'g1':'G1_CL_词语总表.xlsx','g2':'G2_CL_词语总表.xlsx',
         'g3':'G3_CL_词语总表.xlsx','hcl':'G3_HCL_词语总表.xlsx'}
# 有意保留的差异（词, 字段）: 绷 两源流各教一个义项 (g3 bēng 拉紧 / hcl běng 板脸), 2026-08 凯欣审定
WHITELIST = {('绷','拼音'), ('绷','中文释义')}

occ = collections.defaultdict(dict)
for s, f in FILES.items():
    if not os.path.exists(f): sys.exit(f'找不到 {f}')
    ws = openpyxl.load_workbook(f, read_only=True)['词语总表']
    for r in ws.iter_rows(min_row=2, values_only=True):
        if r[5]: occ[r[5]][s] = {'拼音': r[6], '词性': r[7], '中文释义': r[8]}

n = 0
for w, per in sorted(occ.items()):
    if len(per) < 2: continue
    for field in ('拼音','词性','中文释义'):
        vals = {s: p[field] for s, p in per.items()}
        if len(set(vals.values())) > 1 and (w, field) not in WHITELIST:
            n += 1
            print(f'⚠ {w} · {field} 不一致: ' + ' | '.join(f'{s}={v}' for s, v in vals.items()))
print(f'\n{"✓ 全部一致（白名单外）" if n == 0 else f"共 {n} 处不一致，请先在母表统一再生成 JSON"}')
