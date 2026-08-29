import bpy
import math

OUT_PATH = r"C:\Users\Phili\Documents\Claude Projekte\game-mortalkombat\models\ninja.glb"

# ---------- clean scene ----------
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for block_type in (bpy.data.meshes, bpy.data.materials, bpy.data.objects):
    for block in list(block_type):
        if block.users == 0:
            block_type.remove(block)

# ---------- proportions (Blender units == game world units) ----------
W = 68.0
H = 160.0
HEAD_R = 17.0

LEG_H = H * 0.42
TORSO_H = H * 0.42
LEG_W = W * 0.22
ARM_LEN = H * 0.36
ARM_W = W * 0.16
SHOULDER_Z = LEG_H + TORSO_H * 0.85

# ---------- materials ----------
def make_mat(name, rgb, roughness=0.7, metallic=0.05):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (rgb[0], rgb[1], rgb[2], 1.0)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    return mat

mat_body = make_mat('ninja_body', (0.045, 0.042, 0.038), roughness=0.8, metallic=0.05)
mat_trim = make_mat('ninja_trim', (0.32, 0.22, 0.10), roughness=0.4, metallic=0.65)
mat_blade = make_mat('ninja_blade', (0.72, 0.74, 0.78), roughness=0.25, metallic=0.9)
mat_hilt = make_mat('ninja_hilt', (0.05, 0.06, 0.10), roughness=0.6, metallic=0.1)

# ---------- helpers ----------
def add_empty(name, loc, parent):
    o = bpy.data.objects.new(name, None)
    o.empty_display_size = 2
    o.location = loc
    bpy.context.collection.objects.link(o)
    o.parent = parent
    return o

def cylinder(name, radius, depth, loc, mat, parent, taper=1.0):
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=depth, location=loc, vertices=10)
    obj = bpy.context.active_object
    obj.name = name
    if taper != 1.0:
        for v in obj.data.vertices:
            if v.co.z > 0:
                v.co.x *= taper
                v.co.y *= taper
    obj.data.materials.append(mat)
    obj.parent = parent
    return obj

def box(name, size, loc, mat, parent, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = size
    obj.rotation_euler = rot
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    obj.data.materials.append(mat)
    obj.parent = parent
    return obj

def sphere(name, radius, loc, mat, parent, scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=radius, location=loc, segments=14, ring_count=10)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    obj.parent = parent
    return obj

def join_same_parent(objs, name, parent):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    joined = bpy.context.active_object
    joined.name = name
    joined.parent = parent
    return joined

# ---------- root ----------
root = add_empty('root', (0, 0, 0), None)

# ---------- legs (single-material posable mesh + unjoined decorative siblings) ----------
def build_leg(side_sign, pivot_name, mesh_name):
    px = side_sign * W * 0.13
    pivot = add_empty(pivot_name, (px, 0, 0), root)

    leg_upper = cylinder(mesh_name + '_a', LEG_W * 0.5, LEG_H * 0.62, (0, 0, LEG_H * 0.62 * 0.5 + LEG_H * 0.02), mat_body, pivot, taper=0.82)
    boot = cylinder(mesh_name + '_b', LEG_W * 0.56, LEG_H * 0.4, (0, 0, LEG_H * 0.2), mat_body, pivot)
    leg = join_same_parent([leg_upper, boot], mesh_name, pivot)

    box(mesh_name + '_knee', (LEG_W * 1.05, LEG_W * 0.7, LEG_H * 0.14), (0, LEG_W * 0.35, LEG_H * 0.64), mat_trim, pivot)
    box(mesh_name + '_shin', (LEG_W * 0.9, LEG_W * 0.55, LEG_H * 0.32), (0, LEG_W * 0.3, LEG_H * 0.34), mat_trim, pivot)
    return pivot, leg

leg_l_pivot, leg_l = build_leg(-1, 'legLPivot', 'legL')
leg_r_pivot, leg_r = build_leg(1, 'legRPivot', 'legR')

# ---------- torso (single-material posable mesh + unjoined decorative siblings) ----------
torso = box('torso', (W * 0.5, W * 0.34, TORSO_H * 0.86), (0, 0, LEG_H + TORSO_H * 0.5), mat_body, root)

belt = cylinder('belt', W * 0.32, W * 0.14, (0, 0, LEG_H + TORSO_H * 0.08), mat_trim, root)
belt.rotation_euler = (math.radians(90), 0, 0)
bpy.context.view_layer.objects.active = belt
bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)

box('shoulder_l', (W * 0.22, W * 0.26, TORSO_H * 0.16), (-W * 0.32, 0, LEG_H + TORSO_H * 0.92), mat_trim, root)
box('shoulder_r', (W * 0.22, W * 0.26, TORSO_H * 0.16), (W * 0.32, 0, LEG_H + TORSO_H * 0.92), mat_trim, root)
box('chest_wrap', (W * 0.08, W * 0.36, TORSO_H * 0.9), (0, W * 0.02, LEG_H + TORSO_H * 0.5), mat_trim, root, rot=(0, 0, math.radians(28)))

# ---------- head (single-material posable mesh + unjoined decorative sibling) ----------
skull = sphere('head_a', HEAD_R, (0, 0, LEG_H + TORSO_H + HEAD_R * 0.72), mat_body, root, scale=(0.92, 0.95, 1.0))
hood = sphere('head_b', HEAD_R * 1.18, (0, HEAD_R * 0.12, LEG_H + TORSO_H + HEAD_R * 0.95), mat_body, root, scale=(1.0, 1.05, 1.12))
mask = box('head_c', (HEAD_R * 1.5, HEAD_R * 0.55, HEAD_R * 0.85), (0, -HEAD_R * 0.62, LEG_H + TORSO_H + HEAD_R * 0.55), mat_body, root)
head = join_same_parent([skull, hood, mask], 'head', root)

box('brow', (HEAD_R * 1.4, HEAD_R * 0.3, HEAD_R * 0.22), (0, -HEAD_R * 0.68, LEG_H + TORSO_H + HEAD_R * 1.05), mat_trim, root)

# ---------- katana (static prop, multi-material, not referenced by name in-game) ----------
blade = box('blade', (2.2, W * 0.02, H * 0.5), (0, 0, 0), mat_blade, None)
guard = cylinder('guard', 5.0, 2.2, (0, 0, -H * 0.25), mat_trim, None)
guard.rotation_euler = (math.radians(90), 0, 0)
bpy.context.view_layer.objects.active = guard
bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
hilt = cylinder('hilt', 3.0, H * 0.14, (0, 0, -H * 0.25 - H * 0.09), mat_hilt, None)

katana = join_same_parent([blade, guard, hilt], 'katana', None)
katana.rotation_euler = (math.radians(18), 0, math.radians(12))
bpy.context.view_layer.objects.active = katana
bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
katana.location = (-W * 0.05, W * 0.28, LEG_H + TORSO_H * 1.05)
katana.parent = root

# ---------- arms (single-material posable mesh + unjoined decorative siblings) ----------
def build_arm(side_sign, pivot_name, mesh_name, y_offset):
    px = side_sign * W * 0.44
    pivot = add_empty(pivot_name, (px, y_offset, SHOULDER_Z), root)

    upper = cylinder(mesh_name + '_a', ARM_W * 0.5, ARM_LEN * 0.42, (0, 0, -ARM_LEN * 0.42 * 0.5), mat_body, pivot, taper=0.85)
    lower = cylinder(mesh_name + '_b', ARM_W * 0.42, ARM_LEN * 0.36, (0, 0, -ARM_LEN * 0.64), mat_body, pivot, taper=0.9)
    arm = join_same_parent([upper, lower], mesh_name, pivot)

    box(mesh_name + '_guard', (ARM_W * 1.1, ARM_W * 0.8, ARM_LEN * 0.18), (0, ARM_W * 0.1, -ARM_LEN * 0.46), mat_trim, pivot)
    sphere(mesh_name + '_fist', ARM_W * 0.42, (0, 0, -ARM_LEN * 0.8), mat_hilt, pivot)
    return pivot, arm

arm_back_pivot, arm_back = build_arm(-1, 'armBackPivot', 'armBack', -W * 0.08)
arm_front_pivot, arm_front = build_arm(1, 'armFrontPivot', 'armFront', W * 0.12)

# ---------- export ----------
import os
os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)

bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(
    filepath=OUT_PATH,
    export_format='GLB',
    use_selection=True,
    export_apply=True,
    export_yup=True,
)

print('EXPORTED_OK:', OUT_PATH)
