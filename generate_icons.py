import struct, zlib

def create_png(size, filepath):
    sig = b'\x89PNG\r\n\x1a\n'

    ihdr_data = struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)
    ihdr_crc = zlib.crc32(b'IHDR' + ihdr_data) & 0xffffffff
    ihdr = struct.pack('>I', 13) + b'IHDR' + ihdr_data + struct.pack('>I', ihdr_crc)

    pixels = bytearray()
    center = size // 2
    radius = int(size * 0.38)

    for y in range(size):
        pixels.append(0)
        for x in range(size):
            dx = x - center
            dy = y - center
            dist = (dx * dx + dy * dy) ** 0.5

            if dist <= radius:
                r, g, b = 99, 102, 241
                if dist > radius - 3:
                    r, g, b = 79, 70, 229
                if size >= 192:
                    if -8 < dx < 8 and -12 <= dy <= -9:
                        r, g, b = 255, 255, 255
                    if -6 < dx < 4 and -2 <= dy <= 1:
                        r, g, b = 255, 255, 255
                    if -8 < dx < 8 and 9 <= dy <= 12:
                        r, g, b = 255, 255, 255
                    if 4 <= dx <= 8 and (-12 <= dy <= -9 or 9 <= dy <= 12):
                        r, g, b = 255, 255, 255
                    if 0 <= dx <= 4 and -2 <= dy <= 1:
                        r, g, b = 255, 255, 255
            else:
                r, g, b = 15, 23, 42

            pixels.extend([r, g, b])

    compressed = zlib.compress(bytes(pixels))
    idat_crc = zlib.crc32(b'IDAT' + compressed) & 0xffffffff
    idat = struct.pack('>I', len(compressed)) + b'IDAT' + compressed + struct.pack('>I', idat_crc)

    iend_crc = zlib.crc32(b'IEND') & 0xffffffff
    iend = struct.pack('>I', 0) + b'IEND' + struct.pack('>I', iend_crc)

    with open(filepath, 'wb') as f:
        f.write(sig + ihdr + idat + iend)
    print(f'Created {filepath} ({size}x{size})')

create_png(192, 'frontend/public/icon-192.png')
create_png(512, 'frontend/public/icon-512.png')
print('Done!')
