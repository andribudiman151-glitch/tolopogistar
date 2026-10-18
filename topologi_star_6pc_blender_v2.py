import bpy, math
from mathutils import Vector

# =====================================================================
# topologi_star_6pc_blender_v2.py
# Generator 3D Topologi Jaringan Star Otomatis untuk Blender
# Kompatibel dengan Blender 3.3 LTS, 3.6 LTS, 4.0, dan 4.2+ LTS
# =====================================================================

# Bersihkan scene default
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

# Helper pembuatan material
def mat(name, color, metallic=0.0, rough=0.4):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    if bsdf:
        bsdf.inputs['Base Color'].default_value = (*color, 1)
        bsdf.inputs['Metallic'].default_value = metallic
        bsdf.inputs['Roughness'].default_value = rough
    return m

M = {
    'base': mat('Base', (0.12, 0.15, 0.19), 0.35, 0.35),
    'base2': mat('Base2', (0.04, 0.06, 0.09), 0.45, 0.30),
    'pcw': mat('PC White', (0.72, 0.76, 0.82), 0.15, 0.3),
    'pcd': mat('PC Dark', (0.03, 0.05, 0.07), 0.4, 0.28),
    'screen': mat('Screen', (0.03, 0.32, 0.72), 0.15, 0.2),
    'switch': mat('Switch', (0.03, 0.12, 0.25), 0.5, 0.25),
    'cyan': mat('Cyan', (0.1, 0.7, 1), 0.3, 0.2),
    'green': mat('Green', (0.05, 1, 0.25), 0.2, 0.15),
    'blue': mat('Blue', (0.05, 0.25, 1), 0, 0.3),
    'yellow': mat('Yellow', (1, 0.65, 0.05), 0, 0.3),
    'red': mat('Red', (0.9, 0.05, 0.05), 0, 0.3),
    'white': mat('White', (0.9, 0.92, 0.95), 0, 0.3),
    'orange': mat('Orange', (1, 0.3, 0.05), 0, 0.3),
    'rj': mat('RJ45', (0.92, 0.94, 0.96), 0.1, 0.25),
    'router': mat('Router', (0.05, 0.25, 1), 0, 0.3),
    'printer': mat('Printer', (0.85, 0.87, 0.9), 0, 0.3)
}

def cube(name, loc, scale, material, bevel=0.06):
    bpy.ops.mesh.primitive_cube_add(location=loc)
    o = bpy.context.object
    o.name = name
    o.scale = (scale[0]/2, scale[1]/2, scale[2]/2)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod = o.modifiers.new('Bevel', 'BEVEL')
        mod.width = bevel
        mod.segments = 3
    o.data.materials.append(material)
    return o

def cyl_between(name, a, b, r, material):
    a = Vector(a); b = Vector(b); d = b - a; mid = (a + b) / 2
    bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=r, depth=d.length, location=mid)
    o = bpy.context.object
    o.name = name
    o.rotation_mode = 'QUATERNION'
    o.rotation_quaternion = d.to_track_quat('Z', 'Y')
    o.data.materials.append(material)
    return o

def sphere(name, loc, r, material):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, radius=r, location=loc)
    o = bpy.context.object
    o.name = name
    o.data.materials.append(material)
    return o

def empty_parent(name, children, location=(0, 0, 0)):
    bpy.ops.object.empty_add(type='PLAIN_AXES', location=location)
    empty = bpy.context.object
    empty.name = name
    for c in children:
        c.parent = empty
        c.matrix_parent_inverse = empty.matrix_world.inverted()
    return empty

# 1. Base / Meja Lab
cube('Base', (0, 0, 0), (18, 18, 0.6), M['base'], 0.12)
cube('BaseAccent', (0, 0, 0.38), (17.2, 17.2, 0.16), M['base2'], 0.08)

# 2. Switch (Perangkat Pusat)
switch_children = [cube('SwitchBody', (0, 0, 1.25), (4.2, 2.6, 0.75), M['switch'], 0.12)]
for j in range(6):
    px = -1.45 + j * 0.58
    switch_children.append(cube(f'LAN Port {j+1}', (px, -1.36, 1.28), (0.38, 0.12, 0.28), M['pcd'], 0.03))
    switch_children.append(sphere(f'LED {j+1}', (px, -1.46, 1.36), 0.055, M['green']))
empty_parent('Switch', switch_children, location=(0, 0, 1.25))

# 3. 6 PC Client Mengelilingi Switch
angles = [math.radians(a) for a in (0, 60, 120, 180, 240, 300)]
cmats = [M['blue'], M['green'], M['yellow'], M['red'], M['white'], M['orange']]
all_cable_objs = []

for i, ang in enumerate(angles, 1):
    cx, cy = 7 * math.cos(ang), 7 * math.sin(ang)
    pc_children = []
    pc_children.append(cube(f'Client {i} CPU', (cx, cy, 1.45), (1, 1.35, 1.55), M['pcd'], 0.08))
    pc_children.append(cube(f'Client {i} Front', (cx - 0.55 * math.cos(ang), cy - 0.55 * math.sin(ang), 1.55), (0.82, 0.06, 0.78), M['pcw'], 0.02))
    pc_children.append(cube(f'Client {i} Monitor', (cx, cy, 2.75), (2.25, 0.22, 1.4), M['pcw'], 0.08))
    pc_children.append(cube(f'Client {i} Screen', (cx - 0.13 * math.cos(ang), cy - 0.13 * math.sin(ang), 2.76), (1.86, 0.04, 1.03), M['screen'], 0.02))
    pc_children.append(cube(f'Client {i} Keyboard', (cx, cy - 0.02, 0.92), (1.55, 0.65, 0.12), M['pcw'], 0.04))
    pc_children.append(cube(f'Client {i} Mouse', (cx + 1.05, cy - 0.02, 0.95), (0.22, 0.34, 0.11), M['pcd'], 0.03))
    empty_parent(f'PC0{i}', pc_children, location=(cx, cy, 1.45))

    # Kabel & RJ45 di kedua ujung (Switch dan PC)
    px = -1.45 + (i - 1) * 0.58
    p0 = (px, -1.52, 1.30); p1 = (px, -1.9, 0.82)
    p2 = (cx - 0.8 * math.cos(ang), cy - 0.8 * math.sin(ang), 0.82)
    p3 = (p2[0], p2[1], 1.05); p4 = (cx - 0.42 * math.cos(ang), cy - 0.42 * math.sin(ang), 1.05)
    for k, (a, b) in enumerate(zip([p0, p1, p2, p3], [p1, p2, p3, p4]), 1):
        all_cable_objs.append(cyl_between(f'UTP {i}.{k}', a, b, 0.09, cmats[i-1]))
    # RJ-45 di sisi Switch
    all_cable_objs.append(cube(f'RJ45 Switch {i}', (px, -1.44, 1.28), (0.22, 0.28, 0.16), M['rj'], 0.02))
    # RJ-45 di sisi PC NIC
    all_cable_objs.append(cube(f'RJ45 PC {i}', p4, (0.22, 0.16, 0.14), M['rj'], 0.02))

# 4. Router (Gateway Tambahan)
router_children = [
    cube('RouterStand', (0, -3.6, 1.0), (2.8, 1.6, 1.8), M['pcd'], 0.06),
    cube('RouterBody', (0, -3.6, 2.2), (2.6, 1.2, 0.55), M['router'], 0.1),
    cyl_between('RouterAntenna1', (-0.7, -3.6, 2.5), (-0.7, -3.6, 3.7), 0.06, M['pcd']),
    cyl_between('RouterAntenna2', (0.7, -3.6, 2.5), (0.7, -3.6, 3.7), 0.06, M['pcd']),
]
empty_parent('Router', router_children, location=(0, -3.6, 2.2))
all_cable_objs.append(cyl_between('UTP Router', (0, -1.9, 1.25), (0, -3.6, 2.0), 0.08, M['pcd']))
all_cable_objs.append(cube('RJ45 Router Switch', (0, -1.5, 1.25), (0.22, 0.28, 0.16), M['rj'], 0.02))
all_cable_objs.append(cube('RJ45 Router Port', (0, -3.4, 2.0), (0.22, 0.28, 0.16), M['rj'], 0.02))

# 5. Network Printer (Resource Sharing - Dipisahkan di Meja Khusus Area Terbuka)
printer_pos = (-6.4, 4.2, 0)
printer_children = [
    cube('PrinterDesk', (printer_pos[0], printer_pos[1], 0.8), (2.4, 1.8, 0.14), M['base'], 0.04),
    cube('PrinterBody', (printer_pos[0], printer_pos[1], 1.25), (1.8, 1.4, 0.75), M['printer'], 0.08),
    cube('PrinterScannerTop', (printer_pos[0], printer_pos[1], 1.68), (1.75, 1.35, 0.12), M['pcd'], 0.02),
    cube('PrinterSlot', (printer_pos[0], printer_pos[1] - 0.55, 1.02), (1.2, 0.6, 0.04), M['pcd'], 0.02),
    cube('PrinterPaper', (printer_pos[0], printer_pos[1] - 0.52, 1.05), (1.0, 0.5, 0.02), M['white'], 0.01),
]
empty_parent('Printer', printer_children, location=printer_pos)
all_cable_objs.append(cyl_between('UTP Printer', (1.5, -1.2, 1.25), (printer_pos[0], printer_pos[1], 0.95), 0.08, M['cyan']))
all_cable_objs.append(cube('RJ45 Printer Switch', (1.5, -1.44, 1.25), (0.22, 0.28, 0.16), M['rj'], 0.02))
all_cable_objs.append(cube('RJ45 Printer Port', (printer_pos[0], printer_pos[1], 0.95), (0.22, 0.28, 0.16), M['rj'], 0.02))

# Kelompokkan seluruh kabel ke Empty 'Cable'
empty_parent('Cable', all_cable_objs, location=(0, 0, 1.0))

# 6. Pencahayaan & Kamera
def look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()

bpy.ops.object.camera_add(location=(18, -21, 18))
cam = bpy.context.object
look_at(cam, (0, 0, 1))
bpy.context.scene.camera = cam

bpy.ops.object.light_add(type='AREA', location=(0, -4, 16))
key = bpy.context.object; key.data.energy = 1600; key.data.shape = 'DISK'; key.data.size = 10
look_at(key, (0, 0, 0))

bpy.ops.object.light_add(type='AREA', location=(12, 9, 9))
fill = bpy.context.object; fill.data.energy = 900; fill.data.size = 8
look_at(fill, (0, 0, 1))

scene = bpy.context.scene

# Deteksi otomatis EEVEE engine berdasarkan versi Blender
if 'BLENDER_EEVEE_NEXT' in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items.keys():
    scene.render.engine = 'BLENDER_EEVEE_NEXT'
else:
    scene.render.engine = 'BLENDER_EEVEE'

scene.world.color = (0.015, 0.02, 0.03)

# Export GLB otomatis
export_path = "//topologi-star.glb"
bpy.ops.export_scene.gltf(
    filepath=bpy.path.abspath(export_path),
    export_format='GLB',
    use_selection=False,
    export_apply=True,
    export_yup=True
)

bpy.ops.wm.save_as_mainfile(filepath='topologi_star_6pc.blend')
print('[SUKSES] File GLB berhasil diekspor: topologi-star.glb')
