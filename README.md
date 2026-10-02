# ProcObject-10K project page

Static project page for **ProcObject-10K: Benchmarking Object-Centric Procedural Understanding in
Instructional Videos** (NeurIPS 2026, Evaluations & Datasets Track). Served by GitHub Pages from the
repository root; no build step is needed to view it.

Preview locally (the page loads its data as plain `<script>` files, so opening `index.html`
directly also works):

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

## Layout

```
index.html                 the page
static/css/                bulma.min.css + index.css (shared look with the DynamicHOI page)
static/js/                 index.js (navbar, BibTeX copy), charts.js (SVG charts + result tables),
                           explorer.js (QA Explorer + QA-type cards);
                           icons are inline SVG (Font Awesome 5 Free paths)
static/data/               generated data: results.js, stats.js, explorer.js
static/images/             paper figures, favicon, social preview
static/videos/explorer/    ten muted 360p test clips (+ posters) used by the Explorer
tools/                     scripts that regenerate everything under static/data and the media
tools/paper/               verbatim copies of the arXiv 2512.03479v2 TeX tables the numbers come from
```

## Regenerating the assets

Every number on the page comes from the camera-ready paper; the charts in the Statistics block are
computed from the released annotations. The scripts below are run from the `object_vqa` research
repository root, which holds the test split, the saved benchmark predictions and the source videos:

```bash
PAGE=/path/to/ProcObject-10K-Page
python3 $PAGE/tools/parse_tables.py $PAGE      # arXiv v2 tables  -> static/data/results.js
python3 $PAGE/tools/make_stats.py $PAGE        # released QA      -> static/data/stats.js
python3 $PAGE/tools/make_explorer.py $PAGE     # clips, posters, saved predictions -> static/data/explorer.js
python3 $PAGE/tools/make_social.py $PAGE       # static/images/social.jpg
```

`make_explorer.py` scores each prediction with the benchmark's own `evaluate_grounding.py`, so the IoU
shown for each example matches what the benchmark would report for it. The ten examples are chosen for
illustration and deliberately mixed (ours best on five, a baseline best on four, and on one no model
gets IoU above 7%);
the page says so. The Explorer's "Ours" row is the released checkpoint (linked from the GitHub repo),
whose saved predictions average slightly differently from the paper's Table 2, so the page shows no
aggregate computed from them.

Links (all live as of 2026-10-01): the Code button → `github.com/WenliangGuo/ProcObject-10K`
(release `4a7a6a9`), the Dataset button →
`huggingface.co/datasets/BrightGuo/ProcObject-10K` (v2.0, same files as the GitHub `data/`).

To publish: push this directory to `WenliangGuo/ProcObject-10K-Page`, enable GitHub Pages (branch root),
then check the social card (`og:image`) with a card validator and open the page once on a real phone.

## Media and licenses

The video excerpts come from CaptainCook4D, EgoPER, HoloAssist and COIN and remain under those datasets'
licenses. The page template is adapted from [Nerfies](https://github.com/nerfies/nerfies.github.io)
(CC BY-SA 4.0).
