# Graph Report - obt-apparel  (2026-10-29)

## Corpus Check
- Corpus is ~43,369 words - fits in a single context window. You may not need a graph.

## Summary
- 389 nodes · 646 edges · 21 communities (15 shown, 6 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 20

## God Nodes (most connected - your core abstractions)
1. `convex` - 18 edges
2. `react` - 17 edges
3. `next` - 16 edges
4. `compilerOptions` - 16 edges
5. `compilerOptions` - 13 edges
6. `SiteShell()` - 13 edges
7. `main()` - 12 edges
8. `GlassPill()` - 12 edges
9. `ProductView()` - 12 edges
10. `getAllProducts()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `Convex production qualified-anteater-360` --references--> `submit`  [INFERRED]
  CONTEXT.md → convex/contact.ts
- `No invented prices` --rationale_for--> `ProductView()`  [EXTRACTED]
  CONTEXT.md → src/components/site/product-view.tsx
- `Anchor line` --references--> `LINES`  [INFERRED]
  Brand.md → src/components/site/site-shell.tsx
- `OBT storefront` --references--> `SiteShell()`  [EXTRACTED]
  CONTEXT.md → src/components/site/site-shell.tsx
- `Guest cart session` --references--> `add`  [EXTRACTED]
  CONTEXT.md → convex/cart.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **OBT brand system** — brand_md_one_body_temple, brand_md_vision, brand_md_mission, brand_md_anchor, brand_md_wordmark [EXTRACTED 1.00]

## Communities (21 total, 6 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (29): OBT storefront, nextConfig, next, metadata, HomePage(), generateStaticParams(), ProductPage(), Props (+21 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (31): Convex production qualified-anteater-360, clear, current, removeLine, removeLineHelper(), sessionIdArg, updateQuantity, list (+23 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (40): dependencies, convex@^1.42.0, next@16.2.9, react@19.2.4, react-dom@19.2.4, @react-three/drei@^10.7.7, @react-three/fiber@^9.6.1, three@^0.184.0 (+32 more)

### Community 3 - "Community 3"
Cohesion: 0.11
Nodes (24): api, components, internal, ContactPage(), metadata, ComingSoon(), ContactCard(), Field() (+16 more)

### Community 4 - "Community 4"
Cohesion: 0.11
Nodes (22): Guest cart session, add, display, metadata, RootLayout(), sans, ConvexClientProvider(), onAdd() (+14 more)

### Community 5 - "Community 5"
Cohesion: 0.12
Nodes (10): main(), path_from_contour(), render_descriptor(), svg_doc(), trace_mask(), human_bytes(), main(), collect_images() (+2 more)

### Community 6 - "Community 6"
Cohesion: 0.12
Nodes (26): accentFor(), COLOR_ACCENTS, CSV_PATH, CsvRow, __dirname, discoverDiskMockups(), DISK_FOLDER_ALIASES, DiskMockup (+18 more)

### Community 7 - "Community 7"
Cohesion: 0.13
Nodes (20): react, LandingExperience(), planeScaleForViewport(), PolishedShader(), PolishedShaderProps, ShaderMaterialRef, ShaderPlane(), ShaderPlaneProps (+12 more)

### Community 8 - "Community 8"
Cohesion: 0.11
Nodes (17): buildDisplacementPNG(), dispBuf, displacementMagnitudes(), heightAt(), normalAt(), { png: dispPng, maxMag }, specBuf, specPng (+9 more)

### Community 9 - "Community 9"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 10 - "Community 10"
Cohesion: 0.12
Nodes (15): compilerOptions, allowJs, allowSyntheticDefaultImports, forceConsistentCasingInFileNames, isolatedModules, jsx, lib, module (+7 more)

### Community 11 - "Community 11"
Cohesion: 0.22
Nodes (11): metadata, Content(), PageHeader(), Pill(), PoliciesView(), PolicySectionView(), SectionPillRow(), useActiveSection() (+3 more)

### Community 12 - "Community 12"
Cohesion: 0.15
Nodes (14): BODYSUITS_ROWS, BOTTOMS_ROWS, BRAS_ROWS, COLUMNS, INTRO, labelForCategory(), NOTE, SIZE_ORDER (+6 more)

### Community 13 - "Community 13"
Cohesion: 0.22
Nodes (6): Bone, Ember, Ink, One Body Temple, OBT wordmark, LINES

### Community 14 - "Community 14"
Cohesion: 0.29
Nodes (5): ActionCtx, DatabaseReader, DatabaseWriter, MutationCtx, QueryCtx

## Knowledge Gaps
- **6 isolated node(s):** `graphify-mcp`, `Ink`, `Bone`, `Ember`, `OBT wordmark` (+1 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 169 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `convex` connect `Community 1` to `Community 0`, `Community 2`, `Community 3`, `Community 4`, `Community 14`?**
  _High betweenness centrality (0.201) - this node is a cross-community bridge._
- **What connects `graphify-mcp`, `Ink`, `Bone` to the rest of the system?**
  _6 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.09191919191919191 - nodes in this community are weakly interconnected._
- **Why does `pngjs` connect `Community 2` to `Community 8`?**
  _High betweenness centrality (0.180) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07419712070874862 - nodes in this community are weakly interconnected._
- **Why does `react` connect `Community 7` to `Community 0`, `Community 2`, `Community 3`, `Community 4`, `Community 11`?**
  _High betweenness centrality (0.139) - this node is a cross-community bridge._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.06585365853658537 - nodes in this community are weakly interconnected._