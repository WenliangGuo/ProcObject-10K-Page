"""Score every test QA for the explorer shortlist (per-sample IoU, frozen metric code)."""
import json, sys
sys.path.insert(0, 'benchmark/evaluation')
from evaluate_grounding import IoU, _parse_intervals

PRED = 'benchmark/pred_results/'
MODELS = {
    'ours': 'qwen3vl_4b_object_ft_v2_predictions.json',
    'qwen4b': 'Qwen_Qwen3-VL-4B-Instruct_predictions.json',
    'gpt': 'gpt-5.4-mini_predictions.json',
    'claude': 'claude-sonnet-4-6_predictions.json',
    'blind': 'gpt-5.4-mini_blind_predictions.json',
}

def flat(d):
    return [r for k in d for r in d[k]] if isinstance(d, dict) else d

test = {r['id']: r for r in json.load(open('ProcObject-10K-release/data/testing.json'))}
preds = {m: {r['id']: r for r in flat(json.load(open(PRED + f)))} for m, f in MODELS.items()}

rows = []
for i, r in test.items():
    row = dict(id=i, qa_type=r['qa_type'], reasoning=r['reasoning'], source=r['source'],
               task=r['task'], dur=round(r['clip_end'] - r['clip_start'], 1),
               n_ev=len(r['evidence']))
    for m in ['ours', 'qwen4b', 'gpt', 'claude']:
        p = preds[m].get(i)
        row[m] = round(IoU(p['predicted_evidence'], r['evidence']), 3) if p else None
    rows.append(row)
json.dump(rows, open(sys.argv[1], 'w'))
print(len(rows))
