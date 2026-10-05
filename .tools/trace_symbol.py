# -*- coding: utf-8 -*-
"""Traza los glifos blancos del logo original (imtlazarus-logo-icon-circles-imt-2.png)
y genera el simbolo reconstruido en SVG + PNG."""
import re, math, io, os, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets', 'img', 'imtlazarus-original.png')
W, H = 356, 141

# volcado de píxeles del logo original (ImageMagick)
dump = subprocess.check_output(['convert', SRC, 'txt:-']).decode('utf-8', 'replace')

img = {}
for r in dump.splitlines():
    m = re.match(r'(\d+),(\d+): \((\d+),(\d+),(\d+)', r)
    if not m: continue
    x, y, R, G, B = map(int, m.groups())
    img[(x, y)] = (R, G, B)

def is_white(p):
    R, G, B = img.get(p, (0, 0, 0))
    return R > 215 and G > 215 and B > 215

# fondo exterior
from collections import deque
bg = set(); q = deque()
for x in range(W):
    for y in (0, H - 1):
        if is_white((x, y)): bg.add((x, y)); q.append((x, y))
while q:
    x, y = q.popleft()
    for nx, ny in ((x+1,y),(x-1,y),(x,y+1),(x,y-1)):
        if 0 <= nx < W and 0 <= ny < H and (nx, ny) not in bg and is_white((nx, ny)):
            bg.add((nx, ny)); q.append((nx, ny))
mask = {(x, y) for (x, y) in img if (x, y) not in bg and is_white((x, y)) and x < 170}

# ---- Moore boundary tracing ----
def neighbours(p):
    x, y = p
    return [(x+1,y),(x+1,y+1),(x,y+1),(x-1,y+1),(x-1,y),(x-1,y-1),(x,y-1),(x+1,y-1)]

def trace(start):
    """contorno exterior en sentido horario (coordenadas de pixel)"""
    contour = [start]
    prev = None
    cur = start
    while True:
        ns = neighbours(cur)
        if prev is None:
            start_idx = 0
        else:
            start_idx = (ns.index(prev) + 1) % 8
        found = None
        for k in range(8):
            cand = ns[(start_idx + k) % 8]
            if cand in mask:
                found = cand; break
        if found is None:
            break
        prev, cur = cur, found
        if cur == start and len(contour) > 2:
            break
        contour.append(cur)
        if len(contour) > 20000:
            break
    return contour

# componentes conexas
seen = set(); comps = []
for p in mask:
    if p in seen: continue
    stack = [p]; comp = []
    seen.add(p)
    while stack:
        c = stack.pop(); comp.append(c)
        for n in neighbours(c):
            if n in mask and n not in seen:
                seen.add(n); stack.append(n)
    comps.append(comp)
comps.sort(key=len, reverse=True)

def rdp(pts, eps=0.45):
    if len(pts) < 3: return pts
    def d(p, a, b):
        if a == b: return math.hypot(p[0]-a[0], p[1]-a[1])
        t = ((p[0]-a[0])*(b[0]-a[0]) + (p[1]-a[1])*(b[1]-a[1])) / ((b[0]-a[0])**2 + (b[1]-a[1])**2)
        t = max(0, min(1, t))
        px, py = a[0]+t*(b[0]-a[0]), a[1]+t*(b[1]-a[1])
        return math.hypot(p[0]-px, p[1]-py)
    dmax, idx = 0, 0
    for i in range(1, len(pts)-1):
        dd = d(pts[i], pts[0], pts[-1])
        if dd > dmax: dmax, idx = dd, i
    if dmax > eps:
        return rdp(pts[:idx+1], eps)[:-1] + rdp(pts[idx:], eps)
    return [pts[0], pts[-1]]

paths = []
for comp in comps:
    if len(comp) < 30: continue
    # buscar pixel de inicio: el de menor y, luego menor x
    start = min(comp, key=lambda p: (p[1], p[0]))
    cont = trace(start)
    simp = rdp(cont, 0.5)
    pts = ' '.join('%.1f,%.1f' % (p[0] + 0.5, p[1] + 0.5) for p in simp)
    paths.append(pts)

print('componentes trazadas:', len(paths), [len(p.split()) for p in paths])

# ---- SVG ----
CIRCLES = [  # orden de pintado (fondo -> frente)
    ('#34a853', 109.0, 49.5, 44.5),
    ('#000000',  62.0, 72.0, 55.0),
    ('#ff9900', 110.0, 70.0, 50.0),
    ('#0081c2',  92.5, 89.4, 45.6),
    ('#741b47',  86.0, 68.0, 52.0),
]

svg = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 175 141" width="175" height="141" role="img" aria-label="IMTLazarus">']
svg.append('  <g>')
for col, cx, cy, r in CIRCLES:
    svg.append('    <circle cx="%.1f" cy="%.1f" r="%.1f" fill="%s"/>' % (cx, cy, r, col))
svg.append('  </g>')
svg.append('  <g fill="#ffffff">')
for pts in paths:
    svg.append('    <polygon points="%s"/>' % pts)
svg.append('  </g>')
svg.append('</svg>')
svg_txt = '\n'.join(svg) + '\n'

out_svg = os.path.join(ROOT, 'assets', 'img', 'imtlazarus-symbol.svg')
io.open(out_svg, 'w', encoding='utf-8').write(svg_txt)
print('escrito', out_svg, len(svg_txt), 'bytes')

# ---- PNG (ImageMagick draw, supersampling x4) ----
SS = 4
S = 512
scale = S * SS / 175.0
def sc(v): return v * scale
cmd = ['convert', '-size', '%dx%d' % (S*SS, S*SS), 'xc:none', '-fill', 'none']
draws = []
for col, cx, cy, r in CIRCLES:
    draws.append(('fill', col, 'circle %.2f,%.2f %.2f,%.2f' % (sc(cx), sc(cy), sc(cx + r), sc(cy))))
for pts in paths:
    poly = ' '.join('%.2f,%.2f' % (sc(float(p.split(',')[0])), sc(float(p.split(',')[1]))) for p in pts.split())
    draws.append(('fill', '#ffffff', 'polygon ' + poly))
args = ['convert', '-size', '%dx%d' % (S*SS, S*SS), 'xc:none']
for kind, col, geom in draws:
    args += ['-fill', col, '-stroke', 'none', '-draw', geom]
out_png = os.path.join(ROOT, 'assets', 'img', 'imtlazarus-symbol.png')
args += ['-resize', '%dx%d' % (S, S), out_png]
subprocess.check_call(args)
print('escrito', out_png)
