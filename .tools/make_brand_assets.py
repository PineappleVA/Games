# -*- coding: utf-8 -*-
"""Genera los assets de marca de IMTLazarus Games a partir del logo original.

Uso:  python3 .tools/make_brand_assets.py

Entradas:  image-search/imtlazarus-logo-icon-circles-imt-2.png  (logo original)
Salidas:
  assets/img/imtlazarus-mark.png   512x512, símbolo centrado, fondo transparente
  assets/img/imtlazarus.png        512x512, símbolo sobre fondo #131007 (icono / og:image)
  assets/img/imtlazarus-logo.png   lockup horizontal (símbolo + "Lazarus"), transparente
  assets/img/imtlazarus-logo@256.png  versión pequeña del lockup
  assets/img/imtlazarus-512.png    símbolo grande para incrustar (data URI del juego)
"""
import os
import re
import io
import subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets', 'img', 'imtlazarus-original.png')
IMG = os.path.join(ROOT, 'assets', 'img')
SYMBOL_SVG = os.path.join(IMG, 'imtlazarus-symbol.svg')
BG = '#131007'
BLUE = '#0681c2'


def run(args):
    subprocess.check_call(args)


def build_canvas(dst, size, ss, bg):
    """Dibuja círculos + glifos del SVG en un canvas cuadrado centrado."""
    svg = io.open(SYMBOL_SVG, encoding='utf-8').read()
    scale = float(size * ss) / 175.0
    args = ['convert', '-size', '%dx%d' % (size * ss, size * ss), 'xc:' + (bg or 'none')]
    for m in re.finditer(r'<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)" fill="(#[0-9a-f]+)"/>', svg):
        cx, cy, r, col = float(m.group(1)), float(m.group(2)), float(m.group(3)), m.group(4)
        args += ['-fill', col, '-stroke', 'none', '-draw',
                 'circle %.2f,%.2f %.2f,%.2f' % (cx * scale, cy * scale, (cx + r) * scale, cy * scale)]
    for m in re.finditer(r'<polygon points="([^"]+)"/>', svg):
        pts = ' '.join('%.2f,%.2f' % (float(p.split(',')[0]) * scale, float(p.split(',')[1]) * scale)
                       for p in m.group(1).split())
        args += ['-fill', '#ffffff', '-stroke', 'none', '-draw', 'polygon ' + pts]
    # recorta al contenido y vuelve a centrar con un 3% de margen
    pad = int(round(size * ss * 0.05))
    args += ['-trim', '+repage', '-bordercolor', bg or 'none', '-border', str(pad)]
    args += ['-resize', '%dx%d' % (size, size), '-background', bg or 'none',
             '-gravity', 'center', '-extent', '%dx%d' % (size, size)]
    args += ['-depth', '8', '-strip', dst]
    run(args)


def build_lockup(dst, height):
    """Símbolo + "Lazarus" en azul, como el logo original (356x141 -> 356x160)."""
    W, H, SS = 356, 160, 4
    svg = io.open(SYMBOL_SVG, encoding='utf-8').read()
    args = ['convert', '-size', '%dx%d' % (W * SS, H * SS), 'xc:none']
    for m in re.finditer(r'<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)" fill="(#[0-9a-f]+)"/>', svg):
        cx, cy, r, col = float(m.group(1)), float(m.group(2)), float(m.group(3)), m.group(4)
        args += ['-fill', col, '-stroke', 'none', '-draw',
                 'circle %s,%s %s,%s' % (cx * SS, cy * SS, (cx + r) * SS, cy * SS)]
    for m in re.finditer(r'<polygon points="([^"]+)"/>', svg):
        pts = ' '.join('%.2f,%.2f' % (float(p.split(',')[0]) * SS, float(p.split(',')[1]) * SS)
                       for p in m.group(1).split())
        args += ['-fill', '#ffffff', '-stroke', 'none', '-draw', 'polygon ' + pts]
    pts_size = 100 * (177 * SS) / 422.0          # DejaVu Sans Bold: 422px de ancho a 100pt
    cap_h = 74 * pts_size / 100.0
    args += ['-font', 'DejaVu-Sans-Bold', '-pointsize', str(int(round(pts_size))),
             '-fill', BLUE, '-stroke', 'none', '-gravity', 'northwest',
             '-annotate', '+%d+%d' % (176 * SS, int(round(52 * SS - 0.05 * cap_h))), 'Lazarus']
    args += ['-resize', '%dx' % (int(round(height * W / float(H))),), '-strip', dst]
    run(args)


def build_og(dst, w=1200, h=630):
    """Imagen de compartir (og:image): fondo oscuro + lockup centrado."""
    tmp = os.path.join(IMG, '.og-tmp.png')
    build_lockup(tmp, int(h * 0.5))
    run(['convert', '-size', '%dx%d' % (w, h), 'xc:' + BG,
         '(', tmp, ')', '-gravity', 'center', '-composite', '-depth', '8', '-strip', dst])
    os.remove(tmp)


def main():
    if not os.path.exists(SRC):
        raise SystemExit('Falta la fuente del logo: ' + SRC)
    build_canvas(os.path.join(IMG, 'imtlazarus-mark.png'), 512, 4, None)
    build_canvas(os.path.join(IMG, 'imtlazarus.png'), 512, 4, BG)
    build_canvas(os.path.join(IMG, 'imtlazarus-256.png'), 256, 4, None)
    build_lockup(os.path.join(IMG, 'imtlazarus-logo.png'), 240)
    build_og(os.path.join(IMG, 'imtlazarus-og.png'))
    print('Assets generados en', IMG)


if __name__ == '__main__':
    main()
