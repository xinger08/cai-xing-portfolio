from math import radians
from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[1]
REFERENCE = ROOT / "references" / "avatar-turnaround-target.png"
CURRENT_GLB = ROOT / "public" / "avatar.glb"
OUT = ROOT / "work" / "avatar_turnaround_production_scene.blend"


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def material(name, color, alpha=1.0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = color
    mat.use_nodes = True
    bsdf = next((node for node in mat.node_tree.nodes if node.type == "BSDF_PRINCIPLED"), None)
    if bsdf:
        bsdf.inputs["Base Color"].default_value = color
        bsdf.inputs["Alpha"].default_value = alpha
        bsdf.inputs["Roughness"].default_value = 0.75
    if alpha < 1:
        mat.blend_method = "BLEND"
        mat.show_transparent_back = True
    return mat


def image_material(name, image_path):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = next((node for node in nodes if node.type == "BSDF_PRINCIPLED"), None)
    tex = nodes.new("ShaderNodeTexImage")
    tex.image = bpy.data.images.load(str(image_path))
    if bsdf:
        mat.node_tree.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
        bsdf.inputs["Roughness"].default_value = 0.85
    return mat


def add_reference_board():
    img = bpy.data.images.load(str(REFERENCE))
    aspect = img.size[0] / img.size[1]
    height = 5.4
    width = height * aspect

    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 1.35, 2.7), rotation=(radians(90), 0, 0))
    board = bpy.context.object
    board.name = "TARGET_three_view_reference_do_not_model_from_memory"
    board.dimensions = (width, 0.02, height)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    board.data.materials.append(image_material("three view target image", REFERENCE))

    label_mat = material("dark label text", (0.05, 0.045, 0.04, 1))
    for label, x in (("FRONT", -width * 0.32), ("SIDE", 0), ("BACK", width * 0.32)):
        bpy.ops.object.text_add(location=(x, 1.28, 5.62), rotation=(radians(75), 0, 0))
        text = bpy.context.object
        text.name = f"reference label {label.lower()}"
        text.data.body = label
        text.data.align_x = "CENTER"
        text.data.size = 0.18
        text.data.materials.append(label_mat)


def add_height_guides():
    guide_mat = material("height guide warm gray", (0.45, 0.42, 0.36, 0.38), 0.38)
    for z, name in ((0.0, "floor"), (2.05, "shirt hem and hip"), (3.45, "shoulder"), (5.05, "head and beanie top")):
        bpy.ops.mesh.primitive_cube_add(size=1, location=(-3.25, 0.25, z))
        line = bpy.context.object
        line.name = f"guide {name}"
        line.dimensions = (6.5, 0.018, 0.018)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        line.data.materials.append(guide_mat)


def import_current_model():
    bpy.ops.import_scene.gltf(filepath=str(CURRENT_GLB))
    imported = [obj for obj in bpy.context.selected_objects]
    for obj in imported:
        obj.name = f"current_blockout_{obj.name}"


def add_camera_and_lights():
    bpy.ops.object.light_add(type="AREA", location=(0, -4, 6))
    light = bpy.context.object
    light.name = "large modeling softbox"
    light.data.energy = 500
    light.data.size = 5

    bpy.ops.object.camera_add(location=(0, -7, 2.9), rotation=(radians(70), 0, 0))
    bpy.context.scene.camera = bpy.context.object


def main():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    clear_scene()
    add_reference_board()
    add_height_guides()
    import_current_model()
    add_camera_and_lights()
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT))
    print(f"Saved {OUT}")


if __name__ == "__main__":
    main()
