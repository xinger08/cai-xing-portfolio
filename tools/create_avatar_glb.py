from math import radians
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "avatar.glb"


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def material(name, color, roughness=0.6, metallic=0.0, alpha=1.0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = color
    mat.use_nodes = True
    bsdf = next((node for node in mat.node_tree.nodes if node.type == "BSDF_PRINCIPLED"), None)
    if bsdf:
        if "Base Color" in bsdf.inputs:
            bsdf.inputs["Base Color"].default_value = color
        if "Roughness" in bsdf.inputs:
            bsdf.inputs["Roughness"].default_value = roughness
        if "Metallic" in bsdf.inputs:
            bsdf.inputs["Metallic"].default_value = metallic
        if "Alpha" in bsdf.inputs:
            bsdf.inputs["Alpha"].default_value = alpha
    if alpha < 1:
        mat.blend_method = "BLEND"
        mat.use_screen_refraction = True
    return mat


MATS = {}


def setup_materials():
    MATS.update(
        {
            "skin": material("warm skin", (0.93, 0.61, 0.43, 1), 0.52),
            "skin_light": material("skin soft highlights", (1.0, 0.73, 0.55, 1), 0.55),
            "blush": material("transparent blush", (1.0, 0.34, 0.36, 0.48), 0.82, alpha=0.48),
            "hair": material("soft black hair", (0.02, 0.018, 0.015, 1), 0.7),
            "hair_warm": material("warm hair strands", (0.12, 0.07, 0.035, 1), 0.72),
            "knit": material("charcoal knitted beanie", (0.22, 0.22, 0.21, 1), 0.9),
            "knit_dark": material("deep knit grooves", (0.07, 0.07, 0.065, 1), 0.95),
            "jacket": material("soft gray overshirt", (0.61, 0.61, 0.57, 1), 0.88),
            "jacket_dark": material("soft gray seam shadow", (0.43, 0.44, 0.41, 1), 0.9),
            "shirt": material("white cotton tee", (0.94, 0.91, 0.85, 1), 0.75),
            "pants": material("loose gray pants", (0.54, 0.55, 0.51, 1), 0.86),
            "shoe": material("black leather sneakers", (0.02, 0.025, 0.03, 1), 0.45),
            "sole": material("warm white rubber sole", (0.9, 0.86, 0.77, 1), 0.72),
            "lens": material("gloss black sunglasses lens", (0.01, 0.012, 0.016, 0.86), 0.18, 0.08, 0.86),
            "frame": material("black sunglasses frame", (0.005, 0.006, 0.008, 1), 0.35, 0.12),
            "eye": material("eye white", (1.0, 0.97, 0.9, 1), 0.35),
            "iris": material("dark iris", (0.08, 0.045, 0.025, 1), 0.45),
            "mouth": material("mouth interior", (0.25, 0.04, 0.045, 1), 0.55),
            "teeth": material("teeth", (0.98, 0.92, 0.82, 1), 0.35),
            "metal": material("shirt buttons", (0.56, 0.54, 0.49, 1), 0.34, 0.35),
        }
    )


def assign(obj, mat):
    obj.data.materials.append(mat)
    return obj


def smooth(obj):
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.shade_smooth()
    obj.select_set(False)
    return obj


def oval(name, mat_key, loc, scale, rot=(0, 0, 0), segments=48):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=24, radius=1, location=loc, rotation=rot)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    assign(obj, MATS[mat_key])
    return smooth(obj)


def rounded_box(name, mat_key, loc, dims, rot=(0, 0, 0), bevel=0.06):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dims
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    mod = obj.modifiers.new("soft bevel", "BEVEL")
    mod.width = bevel
    mod.segments = 10
    obj.modifiers.new("weighted normals", "WEIGHTED_NORMAL")
    assign(obj, MATS[mat_key])
    obj.select_set(False)
    return obj


def capsule_between(name, mat_key, start, end, radius, scale_xy=(1.0, 1.0), vertices=32):
    start = Vector(start)
    end = Vector(end)
    mid = (start + end) * 0.5
    direction = end - start
    length = direction.length
    if length <= 0:
        return []

    quat = direction.to_track_quat("Z", "Y")
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=length,
        location=mid,
        rotation=quat.to_euler(),
    )
    cyl = bpy.context.object
    cyl.name = f"{name} body"
    cyl.scale.x *= scale_xy[0]
    cyl.scale.y *= scale_xy[1]
    assign(cyl, MATS[mat_key])
    smooth(cyl)

    cap_scale = (radius * scale_xy[0], radius * scale_xy[1], radius)
    a = oval(f"{name} cap A", mat_key, start, cap_scale, segments=24)
    b = oval(f"{name} cap B", mat_key, end, cap_scale, segments=24)
    return [cyl, a, b]


def tapered_between(name, mat_key, start, end, radius_start, radius_end, scale_xy=(1.0, 1.0), vertices=48):
    start = Vector(start)
    end = Vector(end)
    mid = (start + end) * 0.5
    direction = end - start
    length = direction.length
    if length <= 0:
        return None

    quat = direction.to_track_quat("Z", "Y")
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius_start,
        radius2=radius_end,
        depth=length,
        location=mid,
        rotation=quat.to_euler(),
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale.x *= scale_xy[0]
    obj.scale.y *= scale_xy[1]
    assign(obj, MATS[mat_key])
    return smooth(obj)


def seam(name, start, end, radius=0.012, mat="jacket_dark"):
    return capsule_between(name, mat, start, end, radius, (0.45, 0.45), vertices=12)


def build_torso():
    oval("soft white tee volume", "shirt", (0.02, -0.08, 2.25), (0.43, 0.26, 0.72), (radians(3), 0, radians(-4)))
    oval("loose overshirt back volume", "jacket", (0, -0.05, 2.25), (0.72, 0.38, 0.85), (radians(-2), 0, radians(-3)))
    rounded_box("left hanging overshirt panel", "jacket", (-0.27, -0.38, 2.27), (0.25, 0.08, 1.1), (radians(2), radians(-11), radians(-7)), 0.065)
    rounded_box("right hanging overshirt panel", "jacket", (0.26, -0.37, 2.25), (0.25, 0.08, 1.02), (radians(2), radians(11), radians(7)), 0.065)
    rounded_box("left open collar", "jacket_dark", (-0.23, -0.34, 2.92), (0.44, 0.1, 0.12), (radians(16), 0, radians(-27)), 0.045)
    rounded_box("right open collar", "jacket_dark", (0.23, -0.34, 2.9), (0.44, 0.1, 0.12), (radians(16), 0, radians(27)), 0.045)
    rounded_box("soft front pocket", "jacket_dark", (0.29, -0.47, 2.2), (0.24, 0.05, 0.28), (radians(3), 0, radians(-2)), 0.045)
    rounded_box("rounded shirt hem", "shirt", (0.04, -0.46, 1.62), (0.62, 0.08, 0.12), (radians(2), 0, radians(-2)), 0.05)
    rounded_box("overshirt lower hem", "jacket_dark", (0.02, -0.43, 1.56), (0.78, 0.12, 0.13), (radians(3), 0, radians(-2)), 0.055)

    for i in range(5):
        oval(f"small overshirt button {i + 1}", "metal", (-0.12, -0.48, 2.65 - i * 0.2), (0.025, 0.011, 0.025), segments=18)

    seam("left shirt opening seam", (-0.38, -0.49, 2.72), (-0.34, -0.45, 1.78), radius=0.007, mat="jacket_dark")
    seam("right shirt opening seam", (0.39, -0.48, 2.58), (0.35, -0.44, 1.78), radius=0.007, mat="jacket_dark")


def build_legs():
    oval("soft pants seat", "pants", (0.0, -0.02, 1.38), (0.54, 0.3, 0.28), (radians(-3), 0, radians(1)))
    capsule_between("left loose thigh", "pants", (-0.2, -0.02, 1.35), (-0.5, -0.02, 0.82), 0.18, (1.15, 0.92))
    capsule_between("left loose calf", "pants", (-0.5, -0.02, 0.82), (-0.56, -0.02, 0.22), 0.17, (1.08, 0.92))
    capsule_between("right loose thigh", "pants", (0.2, 0.0, 1.35), (0.42, -0.02, 0.92), 0.18, (1.15, 0.92))
    capsule_between("right loose calf", "pants", (0.42, -0.02, 0.92), (0.92, -0.02, 0.34), 0.17, (1.08, 0.92))
    rounded_box("left pants cuff", "jacket_dark", (-0.56, -0.03, 0.24), (0.44, 0.24, 0.13), (radians(5), radians(-8), radians(-5)), 0.055)
    rounded_box("right pants cuff", "jacket_dark", (0.9, -0.03, 0.36), (0.44, 0.24, 0.13), (radians(-8), radians(18), radians(-12)), 0.055)

    build_shoe("left", (-0.58, -0.16, 0.02), (radians(2), radians(-13), radians(-4)))
    build_shoe("right", (1.02, -0.12, 0.08), (radians(-9), radians(24), radians(-13)))

    for x in [-0.42, 0.62]:
        seam(f"subtle pants fold {x}", (x, -0.23, 1.02), (x + 0.04, -0.23, 0.5), radius=0.006, mat="jacket_dark")


def build_shoe(side, loc, rot):
    x, y, z = loc
    rounded_box(f"{side} black sneaker upper", "shoe", (x, y, z + 0.12), (0.5, 0.76, 0.2), rot, 0.08)
    rounded_box(f"{side} rubber sole", "sole", (x, y, z + 0.02), (0.55, 0.82, 0.1), rot, 0.055)
    rounded_box(f"{side} toe cap", "sole", (x, y - 0.27, z + 0.15), (0.32, 0.17, 0.08), rot, 0.045)
    for i in range(3):
        rounded_box(
            f"{side} lace {i + 1}",
            "sole",
            (x, y - 0.08 + i * 0.08, z + 0.23),
            (0.24, 0.025, 0.018),
            (rot[0], rot[1], rot[2] + radians(10 if i % 2 == 0 else -10)),
            0.008,
        )


def build_arms():
    rounded_box("left dropped shoulder fabric", "jacket", (-0.62, -0.08, 2.82), (0.35, 0.3, 0.22), (radians(5), 0, radians(-22)), 0.09)
    rounded_box("right dropped shoulder fabric", "jacket", (0.63, -0.08, 2.82), (0.35, 0.3, 0.22), (radians(5), 0, radians(22)), 0.09)

    capsule_between("left puffy upper sleeve", "jacket", (-0.62, -0.07, 2.78), (-1.08, -0.14, 2.48), 0.16, (1.15, 0.92))
    capsule_between("left puffy forearm sleeve", "jacket", (-1.08, -0.14, 2.48), (-1.56, -0.17, 2.4), 0.14, (1.0, 0.88))
    rounded_box("left sleeve cuff", "jacket_dark", (-1.52, -0.18, 2.38), (0.27, 0.19, 0.13), (radians(0), radians(-8), radians(-12)), 0.05)
    build_hand("left", (-1.78, -0.2, 2.42), "spread")

    capsule_between("right puffy upper sleeve", "jacket", (0.63, -0.07, 2.78), (0.98, -0.12, 3.1), 0.16, (1.15, 0.92))
    capsule_between("right puffy forearm sleeve", "jacket", (0.98, -0.12, 3.1), (1.13, -0.12, 3.52), 0.14, (1.0, 0.88))
    rounded_box("right sleeve cuff", "jacket_dark", (1.12, -0.13, 3.46), (0.27, 0.19, 0.13), (radians(8), radians(8), radians(18)), 0.05)
    build_hand("right", (1.12, -0.18, 3.72), "raised")

    seam("left sleeve fold one", (-0.86, -0.32, 2.62), (-1.18, -0.3, 2.46))
    seam("right sleeve fold one", (0.82, -0.31, 2.94), (1.05, -0.28, 3.22))


def build_hand(side, loc, pose):
    x, y, z = loc
    oval(f"{side} palm", "skin_light", (x, y, z), (0.12, 0.08, 0.09), (0, 0, radians(14 if pose == "raised" else -12)), segments=24)
    if pose == "raised":
        offsets = [(-0.13, 0.02, 0.12), (-0.06, 0.01, 0.2), (0.02, 0.0, 0.2), (0.1, 0.0, 0.14), (0.15, -0.01, 0.04)]
    else:
        offsets = [(-0.16, 0.0, 0.1), (-0.19, 0.0, 0.02), (-0.18, 0.0, -0.06), (-0.12, 0.0, -0.13), (-0.02, 0.0, -0.15)]
    for i, (dx, dy, dz) in enumerate(offsets):
        start = (x + dx * 0.36, y + dy * 0.36, z + dz * 0.36)
        end = (x + dx, y + dy, z + dz)
        capsule_between(f"{side} finger {i + 1}", "skin_light", start, end, 0.02 if i != 4 else 0.018, (0.72, 0.72), vertices=12)


def build_head():
    capsule_between("soft neck", "skin", (0.0, -0.02, 2.95), (0.0, -0.02, 3.22), 0.11, (0.82, 0.78))
    oval("stylized head", "skin", (-0.04, -0.03, 3.65), (0.39, 0.34, 0.54), (0, radians(-12), radians(5)))
    oval("rounded chin", "skin", (-0.03, -0.05, 3.27), (0.27, 0.24, 0.17), (0, radians(-12), 0))
    oval("left ear", "skin", (-0.42, -0.03, 3.62), (0.06, 0.04, 0.11), (0, 0, 0), segments=24)
    oval("right ear", "skin", (0.34, -0.05, 3.62), (0.055, 0.04, 0.1), (0, 0, 0), segments=24)

    build_face()
    build_hair_and_beanie()
    build_sunglasses()


def build_face():
    oval("left eye white", "eye", (-0.16, -0.34, 3.78), (0.12, 0.035, 0.085), (radians(3), 0, 0), segments=24)
    oval("right eye white", "eye", (0.12, -0.35, 3.78), (0.12, 0.035, 0.085), (radians(3), 0, 0), segments=24)
    oval("left iris looking aside", "iris", (-0.1, -0.38, 3.77), (0.035, 0.012, 0.036), segments=18)
    oval("right iris looking aside", "iris", (0.18, -0.39, 3.77), (0.035, 0.012, 0.036), segments=18)
    rounded_box("left eyebrow", "hair", (-0.17, -0.38, 3.96), (0.25, 0.03, 0.045), (radians(1), 0, radians(5)), 0.016)
    rounded_box("right eyebrow", "hair", (0.13, -0.39, 3.96), (0.25, 0.03, 0.045), (radians(1), 0, radians(14)), 0.016)
    capsule_between("nose bridge", "skin_light", (-0.02, -0.39, 3.72), (0.0, -0.43, 3.52), 0.035, (0.7, 0.55), vertices=18)
    oval("nose tip", "skin_light", (0.0, -0.45, 3.55), (0.055, 0.032, 0.038), segments=18)
    rounded_box("nervous open mouth", "mouth", (0.02, -0.43, 3.36), (0.32, 0.035, 0.1), (radians(0), 0, radians(-5)), 0.04)
    rounded_box("upper teeth strip", "teeth", (0.02, -0.46, 3.39), (0.25, 0.018, 0.035), (radians(0), 0, radians(-5)), 0.012)
    for i, tx in enumerate([-0.06, 0.0, 0.06]):
        rounded_box(f"tooth groove {i}", "mouth", (0.02 + tx, -0.475, 3.39), (0.008, 0.01, 0.035), (0, 0, radians(-5)), 0.003)
    oval("left cheek blush", "blush", (-0.28, -0.36, 3.55), (0.1, 0.014, 0.055), (0, 0, radians(-9)), segments=24)
    oval("right cheek blush", "blush", (0.26, -0.37, 3.54), (0.1, 0.014, 0.055), (0, 0, radians(9)), segments=24)


def build_hair_and_beanie():
    oval("black hair mass", "hair", (-0.04, -0.03, 3.94), (0.39, 0.32, 0.23), (radians(-8), 0, radians(4)))
    strands = [
        (-0.28, -0.33, 4.03, -0.21, -0.42, 3.79),
        (-0.18, -0.35, 4.1, -0.13, -0.44, 3.84),
        (-0.08, -0.37, 4.12, -0.06, -0.44, 3.84),
        (0.03, -0.36, 4.1, 0.03, -0.44, 3.85),
        (0.14, -0.34, 4.04, 0.15, -0.42, 3.82),
        (0.23, -0.28, 3.98, 0.22, -0.37, 3.78),
    ]
    for i, s in enumerate(strands):
        capsule_between(f"front hair strand {i + 1}", "hair_warm" if i % 2 == 0 else "hair", s[:3], s[3:], 0.03 if i % 2 == 0 else 0.026, (0.75, 0.58), vertices=12)

    bpy.ops.mesh.primitive_torus_add(major_radius=0.37, minor_radius=0.045, major_segments=96, minor_segments=16, location=(0.02, -0.01, 3.96), rotation=(radians(95), 0, radians(-8)))
    rim = bpy.context.object
    rim.name = "thick knitted beanie rim"
    rim.scale = (1.05, 0.82, 0.72)
    assign(rim, MATS["knit"])
    smooth(rim)
    oval("slouchy beanie body", "knit", (0.13, 0.08, 4.14), (0.42, 0.36, 0.27), (radians(-12), radians(10), radians(-13)))
    oval("beanie rear droop", "knit", (0.28, 0.16, 4.02), (0.26, 0.24, 0.19), (radians(-18), radians(22), radians(-15)))
    for i in range(12):
        x = -0.27 + i * 0.05
        seam(f"knit rib {i + 1}", (x, -0.31, 4.08), (x + 0.05, -0.28, 3.91), radius=0.008, mat="knit_dark")


def build_sunglasses():
    rounded_box("left raised sunglass lens", "lens", (-0.16, -0.43, 4.05), (0.23, 0.04, 0.15), (radians(-18), 0, radians(-4)), 0.045)
    rounded_box("right raised sunglass lens", "lens", (0.12, -0.44, 4.05), (0.23, 0.04, 0.15), (radians(-18), 0, radians(4)), 0.045)
    rounded_box("top sunglass frame", "frame", (-0.02, -0.46, 4.14), (0.56, 0.035, 0.035), (radians(-18), 0, radians(0)), 0.012)
    rounded_box("sunglass bridge", "frame", (-0.02, -0.47, 4.05), (0.075, 0.025, 0.025), (radians(-18), 0, 0), 0.008)


def build_refined_avatar():
    build_refined_legs()
    build_refined_torso()
    build_refined_arms()
    build_refined_head()
    lengthen_refined_lower_body()


def build_refined_torso():
    oval("refined white tee tapered core", "shirt", (0.02, -0.08, 2.72), (0.4, 0.23, 0.74), (radians(4), 0, radians(-7)))
    oval("refined gray overshirt soft shell", "jacket", (-0.02, -0.05, 2.72), (0.58, 0.27, 0.78), (radians(-1), 0, radians(-7)))
    oval("refined left overshirt side volume", "jacket", (-0.38, -0.04, 2.66), (0.18, 0.22, 0.66), (radians(4), radians(-6), radians(-11)))
    oval("refined right overshirt side volume", "jacket", (0.36, -0.05, 2.64), (0.18, 0.22, 0.64), (radians(4), radians(6), radians(5)))

    rounded_box("refined visible white tee front", "shirt", (0.03, -0.39, 2.68), (0.48, 0.06, 1.04), (radians(4), 0, radians(-5)), 0.08)
    rounded_box("refined left open overshirt panel", "jacket", (-0.28, -0.43, 2.67), (0.24, 0.08, 1.16), (radians(4), radians(-11), radians(-11)), 0.075)
    rounded_box("refined right open overshirt panel", "jacket", (0.28, -0.43, 2.63), (0.23, 0.08, 1.08), (radians(4), radians(10), radians(4)), 0.075)
    rounded_box("refined left collar flap", "jacket_dark", (-0.24, -0.46, 3.33), (0.42, 0.09, 0.12), (radians(14), radians(-3), radians(-31)), 0.045)
    rounded_box("refined right collar flap", "jacket_dark", (0.23, -0.46, 3.3), (0.4, 0.09, 0.12), (radians(14), radians(3), radians(26)), 0.045)
    rounded_box("refined chest pocket", "jacket_dark", (0.31, -0.5, 2.65), (0.25, 0.045, 0.29), (radians(4), 0, radians(-3)), 0.045)
    rounded_box("refined overshirt soft hem", "jacket_dark", (0.0, -0.42, 2.03), (0.78, 0.11, 0.14), (radians(3), 0, radians(-6)), 0.06)
    rounded_box("refined white tee loose hem", "shirt", (0.05, -0.47, 2.09), (0.56, 0.07, 0.12), (radians(3), 0, radians(-4)), 0.045)

    for i in range(5):
        oval(f"refined shirt button {i + 1}", "metal", (-0.12, -0.49, 3.12 - i * 0.21), (0.024, 0.01, 0.024), segments=18)

    seam("refined left front opening seam", (-0.39, -0.5, 3.18), (-0.33, -0.47, 2.16), radius=0.007, mat="jacket_dark")
    seam("refined right front opening seam", (0.38, -0.5, 3.03), (0.35, -0.47, 2.14), radius=0.007, mat="jacket_dark")
    seam("refined back yoke seam hint", (-0.45, 0.22, 3.21), (0.42, 0.22, 3.14), radius=0.007, mat="jacket_dark")


def build_refined_legs():
    oval("refined loose pants hip", "pants", (0.02, -0.02, 1.96), (0.51, 0.28, 0.28), (radians(-3), 0, radians(-5)))

    tapered_between("refined left long thigh cloth", "pants", (-0.18, -0.03, 1.88), (-0.47, -0.04, 1.17), 0.21, 0.18, (1.12, 0.9))
    tapered_between("refined left long calf cloth", "pants", (-0.47, -0.04, 1.17), (-0.56, -0.03, 0.38), 0.18, 0.16, (1.04, 0.88))
    tapered_between("refined right long thigh cloth", "pants", (0.21, -0.03, 1.86), (0.51, -0.02, 1.24), 0.21, 0.18, (1.12, 0.9))
    tapered_between("refined right long calf cloth", "pants", (0.51, -0.02, 1.24), (0.98, -0.04, 0.5), 0.18, 0.16, (1.04, 0.88))

    oval("refined left knee cloth wrinkle", "pants", (-0.47, -0.05, 1.17), (0.2, 0.16, 0.13), (radians(3), 0, radians(-7)))
    oval("refined right knee cloth wrinkle", "pants", (0.51, -0.05, 1.24), (0.2, 0.16, 0.13), (radians(-4), 0, radians(8)))
    rounded_box("refined left gathered pants cuff", "jacket_dark", (-0.56, -0.04, 0.41), (0.43, 0.22, 0.14), (radians(5), radians(-8), radians(-5)), 0.055)
    rounded_box("refined right gathered pants cuff", "jacket_dark", (0.99, -0.04, 0.53), (0.43, 0.22, 0.14), (radians(-8), radians(18), radians(-13)), 0.055)

    build_refined_shoe("left", (-0.6, -0.17, 0.14), (radians(2), radians(-13), radians(-5)))
    build_refined_shoe("right", (1.08, -0.15, 0.25), (radians(-9), radians(25), radians(-14)))

    folds = [
        (-0.34, -0.23, 1.55, -0.45, -0.24, 1.06),
        (-0.58, -0.22, 0.92, -0.56, -0.22, 0.49),
        (0.32, -0.23, 1.52, 0.48, -0.23, 1.13),
        (0.65, -0.22, 0.96, 0.91, -0.22, 0.59),
    ]
    for i, fold in enumerate(folds):
        seam(f"refined pants vertical fold {i + 1}", fold[:3], fold[3:], radius=0.006, mat="jacket_dark")


def build_refined_shoe(side, loc, rot):
    x, y, z = loc
    rounded_box(f"refined {side} black high top upper", "shoe", (x, y, z + 0.13), (0.48, 0.72, 0.2), rot, 0.08)
    rounded_box(f"refined {side} warm white rubber sole", "sole", (x, y, z + 0.02), (0.54, 0.78, 0.1), rot, 0.055)
    rounded_box(f"refined {side} white side check front", "sole", (x - 0.09, y - 0.14, z + 0.21), (0.26, 0.026, 0.052), (rot[0], rot[1], rot[2] + radians(-24)), 0.012)
    rounded_box(f"refined {side} white side check back", "sole", (x + 0.1, y - 0.08, z + 0.21), (0.28, 0.026, 0.052), (rot[0], rot[1], rot[2] + radians(24)), 0.012)
    for i in range(3):
        rounded_box(
            f"refined {side} lace {i + 1}",
            "sole",
            (x, y - 0.06 + i * 0.07, z + 0.23),
            (0.23, 0.026, 0.018),
            (rot[0], rot[1], rot[2] + radians(8 if i % 2 == 0 else -8)),
            0.008,
        )


def build_refined_arms():
    oval("refined left soft shoulder fabric", "jacket", (-0.6, -0.08, 3.24), (0.22, 0.17, 0.13), (radians(5), 0, radians(-24)))
    oval("refined right soft shoulder fabric", "jacket", (0.59, -0.08, 3.23), (0.22, 0.17, 0.13), (radians(5), 0, radians(22)))

    tapered_between("refined left loose upper sleeve", "jacket", (-0.63, -0.08, 3.21), (-1.12, -0.14, 2.94), 0.2, 0.17, (1.1, 0.9))
    tapered_between("refined left loose forearm sleeve", "jacket", (-1.12, -0.14, 2.94), (-1.66, -0.18, 2.84), 0.17, 0.14, (1.0, 0.84))
    rounded_box("refined left sleeve cuff", "jacket_dark", (-1.63, -0.19, 2.83), (0.27, 0.19, 0.13), (radians(0), radians(-8), radians(-12)), 0.05)
    build_hand("refined left", (-1.86, -0.21, 2.9), "spread")

    tapered_between("refined right loose upper sleeve", "jacket", (0.62, -0.08, 3.2), (0.98, -0.12, 3.56), 0.2, 0.17, (1.1, 0.9))
    tapered_between("refined right loose forearm sleeve", "jacket", (0.98, -0.12, 3.56), (1.16, -0.13, 4.0), 0.17, 0.14, (1.0, 0.84))
    rounded_box("refined right sleeve cuff", "jacket_dark", (1.15, -0.14, 3.94), (0.27, 0.19, 0.13), (radians(8), radians(8), radians(18)), 0.05)
    build_hand("refined right", (1.17, -0.19, 4.2), "raised")

    seam("refined left sleeve fold upper", (-0.84, -0.29, 3.1), (-1.2, -0.29, 2.92), radius=0.009, mat="jacket_dark")
    seam("refined left sleeve fold cuff", (-1.37, -0.3, 2.87), (-1.58, -0.28, 2.85), radius=0.009, mat="jacket_dark")
    seam("refined right sleeve fold upper", (0.82, -0.29, 3.4), (1.04, -0.28, 3.66), radius=0.009, mat="jacket_dark")
    seam("refined right sleeve fold cuff", (1.1, -0.28, 3.8), (1.17, -0.28, 4.02), radius=0.009, mat="jacket_dark")


def build_refined_head():
    capsule_between("refined soft neck", "skin", (-0.02, -0.02, 3.42), (-0.02, -0.02, 3.72), 0.105, (0.82, 0.78))
    oval("refined expressive head", "skin", (-0.08, -0.03, 4.13), (0.37, 0.33, 0.54), (radians(1), radians(-14), radians(6)))
    oval("refined soft chin", "skin", (-0.08, -0.06, 3.75), (0.26, 0.22, 0.17), (0, radians(-14), 0))
    oval("refined left ear", "skin", (-0.46, -0.03, 4.11), (0.055, 0.04, 0.105), (0, 0, 0), segments=24)
    oval("refined right ear", "skin", (0.29, -0.05, 4.1), (0.052, 0.04, 0.1), (0, 0, 0), segments=24)

    build_refined_face()
    build_refined_hair_and_beanie()
    build_refined_sunglasses()


def build_refined_face():
    oval("refined left large eye white", "eye", (-0.2, -0.35, 4.25), (0.12, 0.034, 0.082), (radians(3), 0, 0), segments=24)
    oval("refined right large eye white", "eye", (0.08, -0.36, 4.25), (0.12, 0.034, 0.082), (radians(3), 0, 0), segments=24)
    oval("refined left iris side glance", "iris", (-0.14, -0.39, 4.24), (0.035, 0.012, 0.036), segments=18)
    oval("refined right iris side glance", "iris", (0.14, -0.4, 4.24), (0.035, 0.012, 0.036), segments=18)
    rounded_box("refined left thick eyebrow", "hair", (-0.21, -0.39, 4.44), (0.25, 0.03, 0.045), (radians(1), 0, radians(3)), 0.016)
    rounded_box("refined right thick eyebrow", "hair", (0.08, -0.4, 4.44), (0.25, 0.03, 0.045), (radians(1), 0, radians(15)), 0.016)
    capsule_between("refined nose bridge", "skin_light", (-0.05, -0.4, 4.18), (-0.03, -0.44, 4.0), 0.034, (0.7, 0.55), vertices=18)
    oval("refined nose tip", "skin_light", (-0.03, -0.46, 4.02), (0.052, 0.032, 0.038), segments=18)
    rounded_box("refined nervous smile mouth", "mouth", (-0.02, -0.44, 3.83), (0.32, 0.035, 0.095), (radians(0), 0, radians(-5)), 0.04)
    rounded_box("refined upper teeth", "teeth", (-0.02, -0.47, 3.86), (0.25, 0.018, 0.034), (radians(0), 0, radians(-5)), 0.012)
    rounded_box("refined lower lip shadow", "mouth", (0.0, -0.468, 3.79), (0.22, 0.016, 0.024), (0, 0, radians(-5)), 0.009)
    for i, tx in enumerate([-0.07, -0.01, 0.05]):
        rounded_box(f"refined tooth groove {i + 1}", "mouth", (-0.02 + tx, -0.48, 3.86), (0.007, 0.01, 0.033), (0, 0, radians(-5)), 0.003)
    oval("refined left cheek blush", "blush", (-0.31, -0.37, 4.02), (0.09, 0.014, 0.052), (0, 0, radians(-9)), segments=24)
    oval("refined right cheek blush", "blush", (0.22, -0.38, 4.01), (0.09, 0.014, 0.052), (0, 0, radians(9)), segments=24)

    for i, dot in enumerate([(-0.15, -0.43, 3.78), (-0.05, -0.45, 3.75), (0.07, -0.43, 3.77)]):
        oval(f"refined tiny stubble {i + 1}", "hair_warm", dot, (0.012, 0.006, 0.009), (0, 0, radians(8)), segments=12)


def build_refined_hair_and_beanie():
    oval("refined black hair mass", "hair", (-0.08, -0.04, 4.46), (0.38, 0.3, 0.22), (radians(-8), 0, radians(5)))
    strands = [
        (-0.34, -0.34, 4.55, -0.24, -0.43, 4.31),
        (-0.24, -0.36, 4.64, -0.16, -0.45, 4.36),
        (-0.12, -0.38, 4.66, -0.08, -0.46, 4.37),
        (0.0, -0.38, 4.64, 0.0, -0.46, 4.36),
        (0.12, -0.35, 4.58, 0.11, -0.43, 4.34),
        (0.22, -0.29, 4.5, 0.19, -0.38, 4.31),
    ]
    for i, strand in enumerate(strands):
        capsule_between(
            f"refined messy front hair strand {i + 1}",
            "hair_warm" if i % 2 == 0 else "hair",
            strand[:3],
            strand[3:],
            0.028 if i % 2 == 0 else 0.024,
            (0.74, 0.58),
            vertices=12,
        )

    flyaways = [
        (-0.2, -0.22, 4.68, -0.32, -0.25, 4.82),
        (-0.06, -0.24, 4.72, -0.08, -0.27, 4.88),
        (0.08, -0.22, 4.66, 0.19, -0.24, 4.78),
    ]
    for i, strand in enumerate(flyaways):
        capsule_between(f"refined hair flyaway {i + 1}", "hair_warm", strand[:3], strand[3:], 0.011, (0.55, 0.45), vertices=10)

    bpy.ops.mesh.primitive_torus_add(major_radius=0.37, minor_radius=0.045, major_segments=96, minor_segments=16, location=(0.03, -0.01, 4.48), rotation=(radians(95), 0, radians(-8)))
    rim = bpy.context.object
    rim.name = "refined thick beanie rim"
    rim.scale = (1.05, 0.82, 0.72)
    assign(rim, MATS["knit"])
    smooth(rim)
    oval("refined slouchy beanie crown", "knit", (0.13, 0.08, 4.66), (0.42, 0.35, 0.27), (radians(-12), radians(10), radians(-13)))
    oval("refined beanie rear droop", "knit", (0.29, 0.16, 4.54), (0.26, 0.23, 0.19), (radians(-18), radians(22), radians(-15)))
    for i in range(13):
        x = -0.29 + i * 0.048
        seam(f"refined knit rib {i + 1}", (x, -0.31, 4.6), (x + 0.045, -0.28, 4.43), radius=0.007, mat="knit_dark")


def build_refined_sunglasses():
    rounded_box("refined left sunglass lens on forehead", "lens", (-0.19, -0.43, 4.58), (0.23, 0.035, 0.14), (radians(-20), 0, radians(-5)), 0.045)
    rounded_box("refined right sunglass lens on forehead", "lens", (0.09, -0.44, 4.58), (0.23, 0.035, 0.14), (radians(-20), 0, radians(4)), 0.045)
    rounded_box("refined sunglass top frame", "frame", (-0.05, -0.46, 4.66), (0.55, 0.03, 0.032), (radians(-20), 0, radians(-1)), 0.012)
    rounded_box("refined sunglass bridge", "frame", (-0.05, -0.47, 4.58), (0.07, 0.024, 0.024), (radians(-20), 0, 0), 0.008)
    rounded_box("refined left sunglass temple", "frame", (-0.34, -0.35, 4.58), (0.17, 0.02, 0.022), (radians(-12), radians(24), radians(10)), 0.008)
    rounded_box("refined right sunglass temple", "frame", (0.23, -0.35, 4.58), (0.17, 0.02, 0.022), (radians(-12), radians(-24), radians(-10)), 0.008)


def lengthen_refined_lower_body():
    hip_z = 1.95
    lower_tokens = (
        "long thigh cloth",
        "long calf cloth",
        "knee cloth",
        "pants cuff",
        "high top",
        "rubber sole",
        "side check",
        "lace",
        "pants vertical fold",
    )

    for obj in bpy.context.scene.objects:
        if obj.type != "MESH":
            continue
        name = obj.name.lower()
        if not any(token in name for token in lower_tokens):
            continue

        obj.location.z = hip_z + (obj.location.z - hip_z) * 1.24
        if "long thigh cloth" in name or "long calf cloth" in name:
            obj.scale.z *= 1.08


def build_turnaround_avatar():
    build_turnaround_legs()
    build_turnaround_torso()
    build_turnaround_arms()
    build_turnaround_head()


def build_turnaround_legs():
    oval("turnaround loose pants hip block", "pants", (0.0, 0.0, 1.88), (0.42, 0.24, 0.18), (radians(-2), 0, 0))

    tapered_between("turnaround left wide upper pant leg", "pants", (-0.22, -0.02, 1.85), (-0.31, -0.02, 1.12), 0.25, 0.23, (1.02, 0.9))
    tapered_between("turnaround left wide lower pant leg", "pants", (-0.31, -0.02, 1.12), (-0.34, -0.03, 0.37), 0.24, 0.2, (0.96, 0.86))
    tapered_between("turnaround right wide upper pant leg", "pants", (0.22, -0.02, 1.85), (0.31, -0.02, 1.12), 0.25, 0.23, (1.02, 0.9))
    tapered_between("turnaround right wide lower pant leg", "pants", (0.31, -0.02, 1.12), (0.34, -0.03, 0.37), 0.24, 0.2, (0.96, 0.86))

    for side, x in (("left", -0.34), ("right", 0.34)):
        oval(f"turnaround {side} soft knee cloth", "pants", (x * 0.92, -0.035, 1.12), (0.18, 0.14, 0.12), (radians(2), 0, radians(-4 if x < 0 else 4)))
        rounded_box(
            f"turnaround {side} gathered cuff band",
            "jacket_dark",
            (x, -0.04, 0.43),
            (0.36, 0.18, 0.12),
            (radians(2), radians(-4 if x < 0 else 4), 0),
            0.045,
        )
        for i in range(4):
            z = 0.53 + i * 0.075
            seam(
                f"turnaround {side} ankle cloth ring {i + 1}",
                (x - 0.17, -0.2, z),
                (x + 0.17, -0.2, z + 0.02),
                radius=0.007,
                mat="jacket_dark",
            )

    for i, x in enumerate([-0.44, -0.26, 0.26, 0.44]):
        seam(
            f"turnaround pants long vertical wrinkle {i + 1}",
            (x, -0.22, 1.63),
            (x * 0.9, -0.22, 0.58),
            radius=0.006,
            mat="jacket_dark",
        )

    build_turnaround_sneaker("left", (-0.34, -0.16, 0.1), (radians(1), radians(-5), radians(0)))
    build_turnaround_sneaker("right", (0.34, -0.16, 0.1), (radians(1), radians(5), radians(0)))


def build_turnaround_sneaker(side, loc, rot):
    x, y, z = loc
    rounded_box(f"turnaround {side} black sneaker upper", "shoe", (x, y, z + 0.14), (0.44, 0.7, 0.22), rot, 0.075)
    rounded_box(f"turnaround {side} warm white sole", "sole", (x, y, z + 0.025), (0.5, 0.78, 0.1), rot, 0.055)
    rounded_box(f"turnaround {side} toe box", "shoe", (x, y - 0.27, z + 0.16), (0.36, 0.2, 0.13), rot, 0.055)
    rounded_box(f"turnaround {side} toe cap highlight", "sole", (x, y - 0.31, z + 0.19), (0.25, 0.065, 0.04), rot, 0.02)
    rounded_box(f"turnaround {side} white side check front", "sole", (x - 0.1, y - 0.12, z + 0.25), (0.25, 0.026, 0.055), (rot[0], rot[1], rot[2] + radians(-26)), 0.012)
    rounded_box(f"turnaround {side} white side check back", "sole", (x + 0.1, y - 0.07, z + 0.25), (0.25, 0.026, 0.055), (rot[0], rot[1], rot[2] + radians(26)), 0.012)
    for i in range(4):
        rounded_box(
            f"turnaround {side} white lace {i + 1}",
            "sole",
            (x, y - 0.08 + i * 0.055, z + 0.27),
            (0.22, 0.024, 0.017),
            (rot[0], rot[1], rot[2] + radians(8 if i % 2 == 0 else -8)),
            0.008,
        )


def build_turnaround_torso():
    oval("turnaround white tee body under shirt", "shirt", (0.0, -0.1, 2.83), (0.4, 0.21, 0.72), (radians(2), 0, 0))
    oval("turnaround loose gray overshirt body", "jacket", (0.0, 0.0, 2.8), (0.66, 0.32, 0.9), (radians(-1), 0, 0))
    oval("turnaround oversized shirt lower drape", "jacket", (0.0, -0.03, 2.36), (0.68, 0.29, 0.34), (radians(-1), 0, 0))
    rounded_box("turnaround flat white tee front", "shirt", (0.0, -0.39, 2.78), (0.46, 0.055, 1.06), (radians(2), 0, 0), 0.07)
    rounded_box("turnaround left gray shirt front panel", "jacket", (-0.29, -0.43, 2.75), (0.28, 0.07, 1.25), (radians(2), radians(-8), radians(-2)), 0.07)
    rounded_box("turnaround right gray shirt front panel", "jacket", (0.29, -0.43, 2.73), (0.28, 0.07, 1.22), (radians(2), radians(8), radians(2)), 0.07)
    rounded_box("turnaround back overshirt panel", "jacket", (0.0, 0.28, 2.75), (0.92, 0.06, 1.3), (radians(-1), 0, 0), 0.08)
    rounded_box("turnaround left open collar", "jacket_dark", (-0.24, -0.45, 3.46), (0.38, 0.085, 0.12), (radians(13), 0, radians(-28)), 0.04)
    rounded_box("turnaround right open collar", "jacket_dark", (0.24, -0.45, 3.45), (0.38, 0.085, 0.12), (radians(13), 0, radians(28)), 0.04)
    rounded_box("turnaround rear collar line", "jacket_dark", (0.0, 0.31, 3.42), (0.58, 0.055, 0.1), (radians(-2), 0, 0), 0.03)
    rounded_box("turnaround chest pocket outline", "jacket_dark", (0.31, -0.49, 2.9), (0.22, 0.04, 0.26), (radians(2), 0, 0), 0.035)
    rounded_box("turnaround overshirt curved hem", "jacket_dark", (0.0, -0.42, 2.08), (0.84, 0.085, 0.11), (radians(2), 0, 0), 0.045)
    rounded_box("turnaround rear shirt yoke seam", "jacket_dark", (0.0, 0.34, 3.29), (0.76, 0.032, 0.035), (radians(-1), 0, 0), 0.012)
    seam("turnaround rear center pleat left", (-0.03, 0.36, 3.25), (-0.08, 0.36, 2.43), radius=0.006, mat="jacket_dark")
    seam("turnaround rear center pleat right", (0.03, 0.36, 3.25), (0.08, 0.36, 2.43), radius=0.006, mat="jacket_dark")

    for i in range(5):
        oval(f"turnaround gray shirt button {i + 1}", "metal", (-0.12, -0.49, 3.25 - i * 0.21), (0.022, 0.009, 0.022), segments=18)

    for i, x in enumerate([-0.36, -0.21, 0.2, 0.36]):
        seam(
            f"turnaround soft shirt vertical fabric grain {i + 1}",
            (x, -0.48, 3.23),
            (x * 0.95, -0.47, 2.26),
            radius=0.0045,
            mat="jacket_dark",
        )


def build_turnaround_arms():
    oval("turnaround left soft shoulder", "jacket", (-0.57, -0.02, 3.32), (0.18, 0.15, 0.12), (radians(2), 0, radians(-12)))
    oval("turnaround right soft shoulder", "jacket", (0.57, -0.02, 3.32), (0.18, 0.15, 0.12), (radians(2), 0, radians(12)))

    tapered_between("turnaround left relaxed upper sleeve", "jacket", (-0.58, -0.04, 3.3), (-0.78, -0.06, 2.72), 0.19, 0.17, (1.02, 0.86))
    tapered_between("turnaround left relaxed lower sleeve", "jacket", (-0.78, -0.06, 2.72), (-0.82, -0.08, 2.13), 0.17, 0.13, (0.95, 0.82))
    tapered_between("turnaround right relaxed upper sleeve", "jacket", (0.58, -0.04, 3.3), (0.78, -0.06, 2.72), 0.19, 0.17, (1.02, 0.86))
    tapered_between("turnaround right relaxed lower sleeve", "jacket", (0.78, -0.06, 2.72), (0.82, -0.08, 2.13), 0.17, 0.13, (0.95, 0.82))
    tapered_between("turnaround left continuous overshirt sleeve cover", "jacket", (-0.59, -0.075, 3.25), (-0.82, -0.1, 2.13), 0.205, 0.145, (1.06, 0.9))
    tapered_between("turnaround right continuous overshirt sleeve cover", "jacket", (0.59, -0.075, 3.25), (0.82, -0.1, 2.13), 0.205, 0.145, (1.06, 0.9))

    rounded_box("turnaround left buttoned sleeve cuff", "jacket_dark", (-0.82, -0.09, 2.1), (0.24, 0.17, 0.12), (radians(2), 0, radians(-6)), 0.045)
    rounded_box("turnaround right buttoned sleeve cuff", "jacket_dark", (0.82, -0.09, 2.1), (0.24, 0.17, 0.12), (radians(2), 0, radians(6)), 0.045)
    build_relaxed_hand("left", (-0.86, -0.12, 1.85), -1)
    build_relaxed_hand("right", (0.86, -0.12, 1.85), 1)

    for side, sx in (("left", -1), ("right", 1)):
        seam(f"turnaround {side} sleeve outer fold", (sx * 0.69, -0.23, 3.1), (sx * 0.79, -0.22, 2.34), radius=0.006, mat="jacket_dark")
        seam(f"turnaround {side} sleeve cuff fold", (sx * 0.7, -0.23, 2.42), (sx * 0.85, -0.22, 2.18), radius=0.006, mat="jacket_dark")


def build_relaxed_hand(side, loc, mirror):
    x, y, z = loc
    oval(f"turnaround {side} relaxed palm", "skin_light", (x, y, z), (0.09, 0.055, 0.13), (radians(3), 0, radians(8 * mirror)), segments=24)
    finger_data = [
        (0.0, -0.02, -0.12, 0.021),
        (0.045 * mirror, -0.02, -0.13, 0.02),
        (0.087 * mirror, -0.018, -0.115, 0.018),
        (-0.075 * mirror, -0.03, -0.055, 0.019),
    ]
    for i, (dx, dy, dz, radius) in enumerate(finger_data):
        start = (x + dx * 0.35, y + dy * 0.35, z - 0.06)
        end = (x + dx, y + dy, z + dz)
        capsule_between(f"turnaround {side} relaxed finger {i + 1}", "skin_light", start, end, radius, (0.66, 0.66), vertices=12)


def build_turnaround_head():
    capsule_between("turnaround soft neck", "skin", (0.0, -0.02, 3.48), (0.0, -0.02, 3.73), 0.1, (0.82, 0.76))
    oval("turnaround stylized calm head", "skin", (0.0, -0.05, 4.15), (0.34, 0.3, 0.5), (0, 0, 0))
    oval("turnaround soft jaw and chin", "skin", (0.0, -0.06, 3.8), (0.25, 0.22, 0.17), (0, 0, 0))
    oval("turnaround left ear", "skin", (-0.36, -0.02, 4.14), (0.058, 0.04, 0.105), segments=24)
    oval("turnaround right ear", "skin", (0.36, -0.02, 4.14), (0.058, 0.04, 0.105), segments=24)
    build_turnaround_face()
    build_turnaround_hair_and_beanie()
    build_turnaround_sunglasses()


def build_turnaround_face():
    oval("turnaround left calm eye white", "eye", (-0.13, -0.34, 4.23), (0.09, 0.03, 0.065), (radians(2), 0, 0), segments=24)
    oval("turnaround right calm eye white", "eye", (0.13, -0.34, 4.23), (0.09, 0.03, 0.065), (radians(2), 0, 0), segments=24)
    oval("turnaround left centered iris", "iris", (-0.13, -0.375, 4.22), (0.028, 0.01, 0.032), segments=18)
    oval("turnaround right centered iris", "iris", (0.13, -0.375, 4.22), (0.028, 0.01, 0.032), segments=18)
    rounded_box("turnaround left soft eyebrow", "hair", (-0.14, -0.38, 4.39), (0.22, 0.026, 0.036), (radians(1), 0, radians(4)), 0.014)
    rounded_box("turnaround right soft eyebrow", "hair", (0.14, -0.38, 4.39), (0.22, 0.026, 0.036), (radians(1), 0, radians(-4)), 0.014)
    capsule_between("turnaround small nose bridge", "skin_light", (0.0, -0.39, 4.16), (0.0, -0.43, 4.02), 0.028, (0.7, 0.55), vertices=18)
    oval("turnaround small nose tip", "skin_light", (0.0, -0.445, 4.03), (0.043, 0.027, 0.03), segments=18)
    rounded_box("turnaround gentle closed smile", "mouth", (0.0, -0.425, 3.86), (0.19, 0.018, 0.028), (0, 0, 0), 0.01)
    oval("turnaround left subtle cheek", "blush", (-0.23, -0.355, 4.02), (0.07, 0.012, 0.04), (0, 0, radians(-6)), segments=24)
    oval("turnaround right subtle cheek", "blush", (0.23, -0.355, 4.02), (0.07, 0.012, 0.04), (0, 0, radians(6)), segments=24)


def build_turnaround_hair_and_beanie():
    oval("turnaround black rounded hair mass", "hair", (0.0, -0.03, 4.45), (0.34, 0.28, 0.2), (radians(-7), 0, 0))
    hair_strands = [
        (-0.25, -0.32, 4.53, -0.18, -0.42, 4.31),
        (-0.16, -0.34, 4.6, -0.12, -0.43, 4.35),
        (-0.06, -0.35, 4.62, -0.04, -0.43, 4.36),
        (0.04, -0.35, 4.61, 0.05, -0.43, 4.35),
        (0.14, -0.34, 4.57, 0.14, -0.42, 4.32),
        (0.23, -0.3, 4.5, 0.22, -0.39, 4.3),
    ]
    for i, strand in enumerate(hair_strands):
        capsule_between(
            f"turnaround front messy hair strand {i + 1}",
            "hair_warm" if i % 2 == 0 else "hair",
            strand[:3],
            strand[3:],
            0.025 if i % 2 == 0 else 0.022,
            (0.72, 0.55),
            vertices=12,
        )

    flyaways = [
        (-0.16, -0.2, 4.66, -0.24, -0.2, 4.82),
        (-0.03, -0.22, 4.69, -0.02, -0.21, 4.86),
        (0.12, -0.2, 4.64, 0.22, -0.2, 4.77),
    ]
    for i, strand in enumerate(flyaways):
        capsule_between(f"turnaround lifted hair spike {i + 1}", "hair_warm", strand[:3], strand[3:], 0.01, (0.5, 0.42), vertices=10)

    bpy.ops.mesh.primitive_torus_add(major_radius=0.36, minor_radius=0.045, major_segments=96, minor_segments=16, location=(0.02, -0.005, 4.46), rotation=(radians(95), 0, radians(-8)))
    rim = bpy.context.object
    rim.name = "turnaround thick knitted beanie rim"
    rim.scale = (1.05, 0.82, 0.72)
    assign(rim, MATS["knit"])
    smooth(rim)
    oval("turnaround slouchy beanie crown", "knit", (0.16, 0.1, 4.6), (0.39, 0.33, 0.25), (radians(-12), radians(10), radians(-12)))
    oval("turnaround beanie rear droop", "knit", (0.29, 0.21, 4.47), (0.24, 0.21, 0.18), (radians(-18), radians(22), radians(-15)))
    for i in range(14):
        x = -0.28 + i * 0.044
        seam(f"turnaround beanie rib {i + 1}", (x, -0.3, 4.58), (x + 0.04, -0.27, 4.41), radius=0.0065, mat="knit_dark")


def build_turnaround_sunglasses():
    rounded_box("turnaround left forehead sunglass lens", "lens", (-0.15, -0.42, 4.55), (0.2, 0.033, 0.13), (radians(-18), 0, radians(-4)), 0.04)
    rounded_box("turnaround right forehead sunglass lens", "lens", (0.12, -0.42, 4.55), (0.2, 0.033, 0.13), (radians(-18), 0, radians(4)), 0.04)
    rounded_box("turnaround sunglass top bridge frame", "frame", (-0.015, -0.45, 4.64), (0.49, 0.029, 0.03), (radians(-18), 0, 0), 0.011)
    rounded_box("turnaround sunglass nose bridge", "frame", (-0.015, -0.455, 4.55), (0.065, 0.022, 0.022), (radians(-18), 0, 0), 0.008)
    rounded_box("turnaround left sunglass temple arm", "frame", (-0.3, -0.34, 4.55), (0.16, 0.018, 0.021), (radians(-12), radians(20), radians(8)), 0.008)
    rounded_box("turnaround right sunglass temple arm", "frame", (0.27, -0.34, 4.55), (0.16, 0.018, 0.021), (radians(-12), radians(-20), radians(-8)), 0.008)


def build_stage1_goofy_avatar():
    build_stage1_goofy_legs()
    build_turnaround_torso()
    build_stage1_goofy_arms()
    build_stage1_goofy_head()


def build_stage1_goofy_legs():
    oval("stage1 loose pants hip under shirt", "pants", (0.0, 0.0, 1.88), (0.42, 0.24, 0.18), (radians(-2), 0, radians(-3)))

    tapered_between("stage1 left planted wide upper pant leg", "pants", (-0.22, -0.02, 1.85), (-0.29, -0.02, 1.1), 0.25, 0.23, (1.02, 0.9))
    tapered_between("stage1 left planted wide lower pant leg", "pants", (-0.29, -0.02, 1.1), (-0.31, -0.03, 0.37), 0.24, 0.2, (0.96, 0.86))
    tapered_between("stage1 right playful upper pant leg", "pants", (0.2, -0.02, 1.84), (0.42, -0.02, 1.14), 0.25, 0.23, (1.02, 0.9))
    tapered_between("stage1 right playful lower pant leg", "pants", (0.42, -0.02, 1.14), (0.7, -0.03, 0.43), 0.24, 0.2, (0.96, 0.86))

    for side, x, z in (("left", -0.31, 0.43), ("right", 0.7, 0.48)):
        rounded_box(
            f"stage1 {side} gathered cuff band",
            "jacket_dark",
            (x, -0.04, z),
            (0.36, 0.18, 0.12),
            (radians(2), radians(-5 if x < 0 else 12), radians(-1 if x < 0 else -8)),
            0.045,
        )
        for i in range(4):
            ring_z = z + 0.08 + i * 0.07
            seam(
                f"stage1 {side} ankle cloth ring {i + 1}",
                (x - 0.16, -0.2, ring_z),
                (x + 0.16, -0.2, ring_z + 0.02),
                radius=0.007,
                mat="jacket_dark",
            )

    build_turnaround_sneaker("stage1 left", (-0.32, -0.16, 0.1), (radians(1), radians(-5), radians(-2)))
    build_turnaround_sneaker("stage1 right", (0.78, -0.16, 0.14), (radians(-4), radians(18), radians(-10)))

    for i, fold in enumerate([
        (-0.42, -0.22, 1.58, -0.33, -0.22, 0.62),
        (-0.2, -0.22, 1.55, -0.28, -0.22, 0.55),
        (0.26, -0.22, 1.58, 0.44, -0.22, 0.68),
        (0.52, -0.22, 1.25, 0.68, -0.22, 0.62),
    ]):
        seam(f"stage1 pants goofy pose fold {i + 1}", fold[:3], fold[3:], radius=0.006, mat="jacket_dark")


def build_stage1_goofy_arms():
    oval("stage1 left shoulder under loose shirt", "jacket", (-0.57, -0.02, 3.32), (0.18, 0.15, 0.12), (radians(2), 0, radians(-17)))
    oval("stage1 right shoulder under loose shirt", "jacket", (0.57, -0.02, 3.32), (0.18, 0.15, 0.12), (radians(2), 0, radians(22)))

    tapered_between("stage1 left arm flung upper sleeve", "jacket", (-0.6, -0.07, 3.25), (-1.05, -0.11, 2.92), 0.205, 0.17, (1.08, 0.9))
    tapered_between("stage1 left arm flung lower sleeve", "jacket", (-1.05, -0.11, 2.92), (-1.48, -0.14, 2.66), 0.17, 0.14, (1.0, 0.84))
    rounded_box("stage1 left cuff open", "jacket_dark", (-1.45, -0.15, 2.65), (0.25, 0.18, 0.12), (radians(2), radians(-8), radians(-17)), 0.045)
    build_hand("stage1 left", (-1.68, -0.19, 2.66), "spread")

    tapered_between("stage1 right waving upper sleeve", "jacket", (0.6, -0.07, 3.25), (0.95, -0.1, 3.62), 0.205, 0.17, (1.08, 0.9))
    tapered_between("stage1 right waving lower sleeve", "jacket", (0.95, -0.1, 3.62), (1.13, -0.12, 4.12), 0.17, 0.14, (1.0, 0.84))
    rounded_box("stage1 right cuff raised", "jacket_dark", (1.12, -0.13, 4.05), (0.25, 0.18, 0.12), (radians(8), radians(8), radians(18)), 0.045)
    build_hand("stage1 right", (1.12, -0.18, 4.34), "raised")

    seam("stage1 left sleeve stretched fold", (-0.82, -0.28, 3.08), (-1.33, -0.26, 2.72), radius=0.007, mat="jacket_dark")
    seam("stage1 right sleeve raised fold", (0.82, -0.28, 3.45), (1.07, -0.27, 3.88), radius=0.007, mat="jacket_dark")


def build_stage1_goofy_head():
    capsule_between("stage1 tilted soft neck", "skin", (0.0, -0.02, 3.48), (0.02, -0.02, 3.73), 0.1, (0.82, 0.76))
    oval("stage1 goofy tilted head", "skin", (-0.05, -0.05, 4.15), (0.34, 0.3, 0.5), (0, radians(-10), radians(6)))
    oval("stage1 soft jaw and chin", "skin", (-0.04, -0.06, 3.8), (0.25, 0.22, 0.17), (0, radians(-10), radians(4)))
    oval("stage1 left ear", "skin", (-0.39, -0.02, 4.13), (0.058, 0.04, 0.105), segments=24)
    oval("stage1 right ear", "skin", (0.31, -0.02, 4.13), (0.058, 0.04, 0.105), segments=24)
    build_stage1_goofy_face()
    build_turnaround_hair_and_beanie()
    build_turnaround_sunglasses()


def build_stage1_goofy_face():
    oval("stage1 left surprised eye white", "eye", (-0.17, -0.35, 4.24), (0.12, 0.034, 0.083), (radians(2), 0, radians(-4)), segments=24)
    oval("stage1 right surprised eye white", "eye", (0.1, -0.36, 4.24), (0.12, 0.034, 0.083), (radians(2), 0, radians(5)), segments=24)
    oval("stage1 left side glance iris", "iris", (-0.1, -0.386, 4.235), (0.034, 0.011, 0.036), segments=18)
    oval("stage1 right side glance iris", "iris", (0.17, -0.396, 4.235), (0.034, 0.011, 0.036), segments=18)
    rounded_box("stage1 left arched eyebrow", "hair", (-0.18, -0.385, 4.42), (0.24, 0.026, 0.038), (radians(1), 0, radians(10)), 0.014)
    rounded_box("stage1 right arched eyebrow", "hair", (0.12, -0.39, 4.43), (0.24, 0.026, 0.038), (radians(1), 0, radians(20)), 0.014)
    capsule_between("stage1 small nose bridge", "skin_light", (-0.02, -0.4, 4.16), (0.0, -0.44, 4.02), 0.028, (0.7, 0.55), vertices=18)
    oval("stage1 small nose tip", "skin_light", (0.0, -0.45, 4.03), (0.046, 0.028, 0.032), segments=18)
    rounded_box("stage1 goofy clenched mouth", "mouth", (0.02, -0.435, 3.84), (0.3, 0.03, 0.09), (0, 0, radians(-6)), 0.035)
    rounded_box("stage1 visible upper teeth strip", "teeth", (0.02, -0.465, 3.87), (0.24, 0.017, 0.032), (0, 0, radians(-6)), 0.011)
    for i, tx in enumerate([-0.06, 0.0, 0.06]):
        rounded_box(f"stage1 tooth groove {i + 1}", "mouth", (0.02 + tx, -0.477, 3.87), (0.007, 0.009, 0.03), (0, 0, radians(-6)), 0.003)
    oval("stage1 left warm cheek", "blush", (-0.29, -0.36, 4.02), (0.085, 0.012, 0.05), (0, 0, radians(-8)), segments=24)
    oval("stage1 right warm cheek", "blush", (0.24, -0.36, 4.02), (0.085, 0.012, 0.05), (0, 0, radians(8)), segments=24)


def apply_corrected_adult_proportions():
    """Correct the first draft's short-leg/chibi tendency before exporting."""
    leg_tokens = ("pants", "thigh", "calf", "shoe", "sneaker", "sole", "toe", "lace")

    for obj in bpy.context.scene.objects:
        if obj.type not in {"MESH", "LIGHT", "CAMERA"}:
            continue
        name = obj.name.lower()

        if obj.type != "MESH" or not any(token in name for token in leg_tokens):
            continue

        obj.location.z = obj.location.z * 1.28
        if any(token in name for token in ("thigh", "calf", "pants")):
            obj.scale.z *= 1.08
            obj.scale.x *= 0.95
            obj.scale.y *= 0.95

    for obj in bpy.context.scene.objects:
        if obj.type != "MESH":
            continue
        name = obj.name.lower()
        if "overshirt back volume" in name or "soft white tee volume" in name:
            obj.scale.x *= 0.88
            obj.scale.y *= 0.92


def add_lighting_and_camera():
    bpy.ops.object.light_add(type="AREA", location=(0, -4, 5))
    key = bpy.context.object
    key.name = "large softbox"
    key.data.energy = 450
    key.data.size = 5
    bpy.ops.object.light_add(type="POINT", location=(-3, 2, 4))
    rim = bpy.context.object
    rim.name = "soft cool rim"
    rim.data.energy = 120
    bpy.ops.object.camera_add(location=(3.0, -6.0, 2.6), rotation=(radians(68), 0, radians(26)))
    bpy.context.scene.camera = bpy.context.object


def export_glb():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(OUT),
        export_format="GLB",
        export_apply=True,
        export_animations=False,
    )


def main():
    raise SystemExit(
        "The previous procedural avatar blockout was rejected. "
        "Create a new Blender modeling workflow before exporting avatar.glb."
    )


if __name__ == "__main__":
    main()
