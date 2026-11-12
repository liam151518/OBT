#!/bin/zsh
# Rebuild the OBT knowledge graph from the current code, then re-cluster.
# Doc concepts in graphify-out/.graphify_semantic.json are merged back in
# when that file exists, so a code refresh does not drop the brand nodes.
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$(pwd)"
PY="/Users/liamsantos/.local/share/uv/tools/graphifyy/bin/python"
if [[ ! -x "$PY" ]]; then
  PY="$(command -v python3)"
fi
"$PY" - "$ROOT" <<'PY'
import json, sys
from pathlib import Path
from graphify.detect import detect
from graphify.extract import collect_files, extract
from graphify.build import build_from_json
from graphify.cluster import cluster, score_all
from graphify.analyze import god_nodes, surprising_connections, suggest_questions
from graphify.report import generate
from graphify.export import to_json
from graphify.watch import _read_build_excludes, _read_build_gitignore

root = Path(sys.argv[1])
out = root / "graphify-out"
out.mkdir(exist_ok=True)
detection = detect(root, extra_excludes=_read_build_excludes(out), gitignore=_read_build_gitignore(out))
(out / ".graphify_detect.json").write_text(json.dumps(detection, ensure_ascii=False), encoding="utf-8")
code_files = []
for f in detection.get("files", {}).get("code", []):
    p = Path(f)
    code_files.extend(collect_files(p) if p.is_dir() else [p])
ast = extract(code_files, cache_root=root, root=root, parallel=False) if code_files else {"nodes": [], "edges": []}
sem_path = out / ".graphify_semantic.json"
sem = json.loads(sem_path.read_text(encoding="utf-8")) if sem_path.is_file() else {"nodes": [], "edges": [], "hyperedges": []}
for n in sem.get("nodes", []):
    n.setdefault("_origin", "semantic")
for e in sem.get("edges", []):
    e.setdefault("_origin", "semantic")
seen = {n["id"] for n in ast["nodes"]}
nodes = list(ast["nodes"])
for n in sem.get("nodes", []):
    if n["id"] not in seen:
        nodes.append(n)
        seen.add(n["id"])
extraction = {
    "nodes": nodes,
    "edges": ast["edges"] + sem.get("edges", []),
    "hyperedges": sem.get("hyperedges", []),
    "input_tokens": 0,
    "output_tokens": 0,
}
(out / ".graphify_extract.json").write_text(json.dumps(extraction, ensure_ascii=False), encoding="utf-8")
G = build_from_json(extraction, root=str(root), directed=False)
if G.number_of_nodes() == 0:
    raise SystemExit("graph is empty")
communities = cluster(G)
cohesion = score_all(G, communities)
labels = {cid: "Community " + str(cid) for cid in communities}
gods = god_nodes(G)
surprises = surprising_connections(G, communities)
questions = suggest_questions(G, communities, labels)
wrote = to_json(G, communities, str(out / "graph.json"))
if not wrote:
    raise SystemExit("refused to shrink graph.json")
report = generate(G, communities, cohesion, labels, gods, surprises, detection, {"input": 0, "output": 0}, str(root), suggested_questions=questions)
(out / "GRAPH_REPORT.md").write_text(report, encoding="utf-8")
print(f"Graph: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges, {len(communities)} communities")
PY
