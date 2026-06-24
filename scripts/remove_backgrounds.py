"""
Remove backgrounds from every product image in-place using rembg.

Walks the Product Designs/ tree (Female/ and Male/), removes the background
from each .png/.jpg/.jpeg/.webp file, and overwrites it in place.

Concurrency: uses a ProcessPoolExecutor with one worker per CPU core. The
u2net model is loaded once per worker process on first call, then reused.
"""
from __future__ import annotations

import os
import sys
import time
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path

from PIL import Image
from rembg import remove, new_session

# Load the model once in the parent so workers inherit the cached weights.
# new_session() pre-downloads and warms the model.
SESSION = new_session("u2net")

IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp"}


def process_one(path: str) -> tuple[str, str]:
    """Remove background from a single image, overwrite it in place.
    Returns (path, status) where status is 'ok' or 'error: ...'.
    """
    try:
        with Image.open(path) as inp:
            inp.load()
            out = remove(inp, session=SESSION, only_mask=False)
        # Preserve original format by saving back as PNG (always supports alpha).
        # If the source was a JPEG, we save as PNG to keep transparency.
        out_path = Path(path)
        if out_path.suffix.lower() in {".jpg", ".jpeg", ".webp"}:
            out_path = out_path.with_suffix(".png")
        out.save(out_path, "PNG", optimize=True)
        return (str(out_path), "ok")
    except Exception as e:
        return (path, f"error: {type(e).__name__}: {e}")


def collect_images(root: Path) -> list[str]:
    paths: list[str] = []
    for p in root.rglob("*"):
        if p.is_file() and p.suffix.lower() in IMAGE_EXTS:
            paths.append(str(p))
    return sorted(paths)


def main() -> int:
    root = Path("Product Designs")
    if not root.is_dir():
        print(f"ERROR: '{root}' does not exist or is not a directory", file=sys.stderr)
        return 1

    images = collect_images(root)
    print(f"[rembg] {len(images)} images across {root}", flush=True)
    if not images:
        return 0

    cpu = os.cpu_count() or 4
    workers = min(cpu, len(images))
    print(f"[rembg] using {workers} workers", flush=True)

    t0 = time.time()
    ok = 0
    fail = 0
    failures: list[tuple[str, str]] = []

    with ProcessPoolExecutor(max_workers=workers) as ex:
        futures = {ex.submit(process_one, p): p for p in images}
        for i, fut in enumerate(as_completed(futures), start=1):
            path, status = fut.result()
            if status == "ok":
                ok += 1
            else:
                fail += 1
                failures.append((path, status))
            if i % 25 == 0 or i == len(images):
                elapsed = time.time() - t0
                rate = i / elapsed if elapsed > 0 else 0
                eta = (len(images) - i) / rate if rate > 0 else 0
                print(
                    f"[rembg] {i}/{len(images)}  ok={ok}  fail={fail}  "
                    f"{rate:.2f} img/s  eta={eta/60:.1f} min",
                    flush=True,
                )

    print(f"[rembg] DONE  ok={ok}  fail={fail}  elapsed={(time.time()-t0)/60:.1f} min", flush=True)
    if failures:
        print("[rembg] failures:", flush=True)
        for p, s in failures[:20]:
            print(f"  {s}  {p}", flush=True)
        if len(failures) > 20:
            print(f"  ... and {len(failures) - 20} more", flush=True)
    return 0 if fail == 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())
