# Converts a rigged FBX character (e.g. from the Quaternius-style avatar-templates/
# packs) into a self-contained GLB for use as a skeletal fighter rig in-game:
# relinks + packs the texture, uniform-scales the whole rig to a target world-unit
# height, drops its feet on the ground plane (z=0), and exports GLB (Y-up, applied).
#
# Usage (headless):
#   blender --background --python convert_skeletal_template.py -- \
#     <input.fbx> <texture.png> <output.glb> <target_height>
#
# Example invocations used for this project's roster:
#   ... Army_Free/FBX/Characters/Army_Captain_Blue.fbx  Army_Free/Texture/Texture.png       models/cassius.glb 162
#   ... Army_Free/FBX/Characters/Army_Knight_Red.fbx    Army_Free/Texture/Texture.png       models/brannok.glb 172
#   ... Skeletons_Free/FBX/Characters/Skeleton_Archer.fbx Skeletons_Free/Texture/Texture.png models/solkan.glb 158
#
# Note: the glTF exporter strips dots from bone names (e.g. "upper_arm.L" becomes
# "upper_armL") — SkeletalRig3D.js looks bones up by the stripped name at runtime.
import bpy
import sys
import os

argv = sys.argv[sys.argv.index('--') + 1:]
fbx_path, texture_path, out_path, scale_str = argv

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for block_type in (bpy.data.meshes, bpy.data.materials, bpy.data.images, bpy.data.armatures, bpy.data.actions):
    for block in list(block_type):
        if block.users == 0:
            block_type.remove(block)

bpy.ops.import_scene.fbx(filepath=fbx_path)

# Relink the texture to the real local file and pack it so the GLB export embeds it.
img = bpy.data.images.get('Texture.png')
if img is None:
    for i in bpy.data.images:
        if 'texture' in i.name.lower():
            img = i
            break
if img is not None:
    img.filepath = texture_path
    img.source = 'FILE'
    img.reload()
    img.pack()
    print('Texture relinked:', img.filepath, 'size=', img.size[:])
else:
    print('WARNING: no texture image found to relink')

# Uniform-scale the whole rig to the target world-unit height.
target_height = float(scale_str)
armature = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
bpy.ops.object.select_all(action='DESELECT')
armature.select_set(True)
bpy.context.view_layer.objects.active = armature
bbox_min = None
bbox_max = None
for obj in bpy.data.objects:
    if obj.type != 'MESH':
        continue
    for corner in obj.bound_box:
        world_corner = obj.matrix_world @ __import__('mathutils').Vector(corner)
        if bbox_min is None:
            bbox_min = world_corner.copy()
            bbox_max = world_corner.copy()
        else:
            bbox_min.x = min(bbox_min.x, world_corner.x)
            bbox_min.y = min(bbox_min.y, world_corner.y)
            bbox_min.z = min(bbox_min.z, world_corner.z)
            bbox_max.x = max(bbox_max.x, world_corner.x)
            bbox_max.y = max(bbox_max.y, world_corner.y)
            bbox_max.z = max(bbox_max.z, world_corner.z)

current_height = bbox_max.z - bbox_min.z
scale_factor = target_height / current_height if current_height > 0 else 1.0
print('current_height=', current_height, 'scale_factor=', scale_factor)

for obj in bpy.data.objects:
    if obj.parent is None:
        obj.scale = (obj.scale[0] * scale_factor, obj.scale[1] * scale_factor, obj.scale[2] * scale_factor)
        obj.location = (obj.location[0] * scale_factor, obj.location[1] * scale_factor, obj.location[2] * scale_factor - bbox_min.z * scale_factor)

bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(
    filepath=out_path,
    export_format='GLB',
    use_selection=True,
    export_apply=True,
    export_yup=True,
)
print('EXPORTED_OK:', out_path)
