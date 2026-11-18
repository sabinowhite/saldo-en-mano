"""Verify the reflection-created WorkManager database constructor in a release APK."""
import struct
import sys
import zipfile


def verify_dex(data):
    def uint(offset):
        return struct.unpack_from('<I', data, offset)[0]

    def uleb(offset):
        value = shift = 0
        while True:
            byte = data[offset]
            offset += 1
            value |= (byte & 127) << shift
            if byte < 128:
                return value, offset
            shift += 7
            if shift > 35:
                raise ValueError('Invalid DEX integer')

    if not data.startswith(b'dex\n'):
        raise ValueError('Invalid DEX header')
    strings_count, strings_offset = uint(56), uint(60)
    strings = []
    for index in range(strings_count):
        _, start = uleb(uint(strings_offset + index * 4))
        end = data.index(b'\0', start)
        strings.append(data[start:end].decode('utf-8', errors='replace'))
    type_count, type_offset = uint(64), uint(68)
    types = [strings[uint(type_offset + i * 4)] for i in range(type_count)]
    class_count, class_offset = uint(96), uint(100)
    for index in range(class_count):
        start = class_offset + index * 32
        if types[uint(start)] != 'Landroidx/work/impl/WorkDatabase_Impl;':
            continue
        offset = uint(start + 24)
        if not offset:
            return False
        sizes = []
        for _ in range(4):
            size, offset = uleb(offset)
            sizes.append(size)
        for _ in range(sizes[0] + sizes[1]):
            _, offset = uleb(offset)
            _, offset = uleb(offset)
        method_index = 0
        for _ in range(sizes[2]):
            delta, offset = uleb(offset)
            flags, offset = uleb(offset)
            code_offset, offset = uleb(offset)
            method_index += delta
            _, proto, name = struct.unpack_from('<HHI', data, uint(92) + method_index * 8)
            proto_offset = uint(76) + proto * 12
            if strings[name] == '<init>' and uint(proto_offset + 8) == 0:
                return bool(flags & 1 and flags & 0x10000 and code_offset)
        return False
    return None


def verify_apk(path):
    with zipfile.ZipFile(path) as apk:
        for name in apk.namelist():
            if name.startswith('classes') and name.endswith('.dex'):
                result = verify_dex(apk.read(name))
                if result is not None:
                    if not result:
                        raise ValueError('WorkDatabase_Impl public no-argument constructor missing')
                    print('Verified: WorkDatabase_Impl has a public no-argument constructor with code')
                    return
    raise ValueError('WorkDatabase_Impl not found in APK')


if __name__ == '__main__':
    verify_apk(sys.argv[1])
