import json
import sys
from pathlib import Path
from PIL import Image

gltf_path = Path(sys.argv[1]).resolve()
max_size = int(sys.argv[2]) if len(sys.argv) > 2 else 2048
quality = int(sys.argv[3]) if len(sys.argv) > 3 else 82
data = json.loads(gltf_path.read_text(encoding="utf-8"))

for index, image_def in enumerate(data.get("images", [])):
    uri = image_def.get("uri")
    if not uri or uri.startswith("data:"):
        continue
    source = gltf_path.parent / uri
    output = source.with_name(f"texture-{index:02d}.jpg")
    with Image.open(source) as image:
        image.load()
        image.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
        if image.mode == "RGBA":
            background = Image.new("RGB", image.size, "white")
            background.paste(image, mask=image.getchannel("A"))
            image = background
        elif image.mode != "RGB":
            image = image.convert("RGB")
        image.save(output, "JPEG", quality=quality, optimize=True, progressive=True, subsampling="4:2:0")
    image_def["uri"] = output.name
    image_def["mimeType"] = "image/jpeg"
    print(f"{source.name} -> {output.name}: {output.stat().st_size / 1024 / 1024:.2f} MB")

gltf_path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
