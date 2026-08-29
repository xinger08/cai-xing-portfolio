from pathlib import Path
from PIL import Image

Image.MAX_IMAGE_PIXELS = None

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"

JOBS = [
    *[(f"portfolio/poster-{i:02d}.jpg", f"portfolio/poster-{i:02d}.webp", 1800, 84) for i in range(1, 13) if i != 2],
    ("portfolio/poster-02.png", "portfolio/poster-02.webp", 1800, 84),
    ("homepage/homepage-01.jpg", "homepage/homepage-01-optimized.jpg", 1200, 82),
    ("homepage/homepage-02.png", "homepage/homepage-02-optimized.jpg", 1200, 82),
    ("homepage/homepage-03.png", "homepage/homepage-03-optimized.jpg", 1200, 82),
    *[(f"other/main-icon-{i:02d}.png", f"other/main-icon-{i:02d}.webp", 1440, 86) for i in range(1, 7)],
    ("other/other-01.jpg", "other/other-01.webp", 1400, 84),
    ("other/other-02.png", "other/other-02.webp", 1400, 84),
    ("other/other-03.jpg", "other/other-03.webp", 1400, 84),
    ("other/skateboard-01.jpg", "other/skateboard-01.webp", 4800, 84),
    ("other/skateboard-02.jpg", "other/skateboard-02.webp", 4800, 84),
]

for source_name, output_name, max_width, quality in JOBS:
    source = PUBLIC / source_name
    output = PUBLIC / output_name
    with Image.open(source) as image:
        image.load()
        if image.width > max_width:
            height = round(image.height * max_width / image.width)
            image = image.resize((max_width, height), Image.Resampling.LANCZOS)
        output.parent.mkdir(parents=True, exist_ok=True)
        if output.suffix.lower() == ".jpg":
            if image.mode == "RGBA":
                background = Image.new("RGB", image.size, "white")
                background.paste(image, mask=image.getchannel("A"))
                image = background
            elif image.mode != "RGB":
                image = image.convert("RGB")
            image.save(output, "JPEG", quality=quality, optimize=True, progressive=True, subsampling="4:2:0")
        else:
            if image.mode not in ("RGB", "RGBA"):
                image = image.convert("RGBA" if "transparency" in image.info else "RGB")
            image.save(output, "WEBP", quality=quality, method=6)
        print(f"{source_name} -> {output_name}: {output.stat().st_size / 1024 / 1024:.2f} MB")
