import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { disposeObject3D, teardownViewer } from './disposeResources';
import { applyAutoRotate } from './autoRotate';
import { createDinosaurGltfLoader, DRACO_DECODER_PATH, KTX2_TRANSCODER_PATH } from './createGltfLoader';
import { playNamedClip } from './playClip';
import { loadTriceratops, TARGET_LENGTH } from './loadTriceratops';

describe('disposeObject3D', () => {
  it('disposes geometries, materials, and textures', () => {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const texture = new THREE.DataTexture(new Uint8Array([255, 0, 0, 255]), 1, 1);
    const material = new THREE.MeshBasicMaterial({ map: texture });
    const mesh = new THREE.Mesh(geometry, material);

    const geometrySpy = vi.spyOn(geometry, 'dispose');
    const materialSpy = vi.spyOn(material, 'dispose');
    const textureSpy = vi.spyOn(texture, 'dispose');

    disposeObject3D(mesh);

    expect(geometrySpy).toHaveBeenCalledTimes(1);
    expect(materialSpy).toHaveBeenCalledTimes(1);
    expect(textureSpy).toHaveBeenCalledTimes(1);
  });

  it('disposes every material on a multi-material mesh and shared geometry only once', () => {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const first = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const second = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const mesh = new THREE.Mesh(geometry, [first, second]);
    const copy = new THREE.Mesh(geometry, first);

    const geometrySpy = vi.spyOn(geometry, 'dispose');
    const firstSpy = vi.spyOn(first, 'dispose');
    const secondSpy = vi.spyOn(second, 'dispose');

    const group = new THREE.Group();
    group.add(mesh, copy);
    disposeObject3D(group);

    expect(geometrySpy).toHaveBeenCalledTimes(1);
    expect(firstSpy).toHaveBeenCalledTimes(1);
    expect(secondSpy).toHaveBeenCalledTimes(1);
  });
});

describe('teardownViewer', () => {
  it('disposes the scene graph and the renderer', () => {
    const scene = new THREE.Scene();
    const geometry = new THREE.SphereGeometry(1, 8, 8);
    const material = new THREE.MeshBasicMaterial();
    scene.add(new THREE.Mesh(geometry, material));

    const geometrySpy = vi.spyOn(geometry, 'dispose');
    const renderer = { dispose: vi.fn(), forceContextLoss: vi.fn() };
    const controls = { dispose: vi.fn() };

    teardownViewer({ scene, renderer, controls });

    expect(controls.dispose).toHaveBeenCalledTimes(1);
    expect(geometrySpy).toHaveBeenCalledTimes(1);
    expect(renderer.dispose).toHaveBeenCalledTimes(1);
    expect(renderer.forceContextLoss).toHaveBeenCalledTimes(1);
    expect(scene.children).toHaveLength(0);
  });
});

describe('applyAutoRotate', () => {
  it('reads the latest spin flag instead of a stale closed-over value', () => {
    const controls = { autoRotate: true };
    const enabled = { current: true };

    applyAutoRotate(controls, enabled);
    expect(controls.autoRotate).toBe(true);

    enabled.current = false;
    applyAutoRotate(controls, enabled);
    expect(controls.autoRotate).toBe(false);
  });
});

describe('createDinosaurGltfLoader', () => {
  it('points Draco and KTX2 decoders at self-hosted files', () => {
    const { loader, draco, ktx2 } = createDinosaurGltfLoader();
    const dracoPath = (draco as unknown as { decoderPath: string }).decoderPath;
    expect(dracoPath).toBe(DRACO_DECODER_PATH);
    expect(ktx2.transcoderPath).toBe(KTX2_TRANSCODER_PATH);
    const paths = `${dracoPath} ${ktx2.transcoderPath}`;
    expect(paths).not.toMatch(/https?:|cdn\.|gstatic|jsdelivr|unpkg|googleapis/i);
    expect(paths.startsWith('/decoders/')).toBe(true);
    expect(loader).toBeTruthy();
    draco.dispose();
    ktx2.dispose();
  });
});

describe('playNamedClip', () => {
  it('plays a named clip and reports when the name is missing', () => {
    const root = new THREE.Group();
    const mixer = new THREE.AnimationMixer(root);
    const walk = new THREE.AnimationClip('walk', 1, [
      new THREE.VectorKeyframeTrack('.position', [0, 1], [0, 0, 0, 0, 1, 0]),
    ]);
    const model = { mixer, clips: [walk] };

    expect(playNamedClip(model, 'walk')).toBe(true);
    expect(mixer.clipAction(walk).isRunning()).toBe(true);
    expect(playNamedClip(model, 'idle')).toBe(false);
  });
});

describe('asset manifest and model files', () => {
  it('records CC0 models that exist on disk and stay within 3 MB', () => {
    const manifest = JSON.parse(readFileSync('src/data/asset-manifest.json', 'utf8')) as {
      assets: Array<{
        id: string;
        file: string;
        size: number;
        licence: string;
        author: string;
        sourceUrl: string;
      }>;
    };

    expect(manifest.assets.map((asset) => asset.id)).toEqual([
      'triceratops-skin',
      'triceratops-skeleton',
    ]);

    for (const asset of manifest.assets) {
      expect(asset.licence).toMatch(/CC0/);
      expect(asset.author.length).toBeGreaterThan(0);
      expect(asset.sourceUrl).toMatch(/^https:\/\//);
      expect(asset.size).toBeLessThanOrEqual(3 * 1024 * 1024);
      const bytes = readFileSync(`public/${asset.file}`);
      expect(bytes.byteLength).toBe(asset.size);
    }
  });

  it('keeps idle and walk on the skin model and Draco on the skeleton', () => {
    const readJson = (file: string) => {
      const data = readFileSync(file);
      const chunkLength = data.readUInt32LE(12);
      return JSON.parse(data.subarray(20, 20 + chunkLength).toString('utf8')) as {
        animations?: Array<{ name?: string }>;
        extensionsRequired?: string[];
      };
    };

    const skin = readJson('public/models/triceratops-skin.glb');
    const names = (skin.animations ?? []).map((clip) => clip.name);
    expect(names).toContain('idle');
    expect(names).toContain('walk');

    const skeleton = readJson('public/models/triceratops-skeleton.glb');
    expect(skeleton.extensionsRequired ?? []).toContain('KHR_draco_mesh_compression');
  });
});

describe('loadTriceratops skeleton orientation', () => {
  it('stands the loaded skeleton upright, feet down and skull toward +Z', async () => {
    // glTF POSITION min/max is the decoded mesh bounds. This file is one mesh with no node transform.
    // On this scan the back is +X, the feet are -X, the skull is -Y, and the tail is +Y.
    const data = readFileSync('public/models/triceratops-skeleton.glb');
    const chunkLength = data.readUInt32LE(12);
    const json = JSON.parse(data.subarray(20, 20 + chunkLength).toString('utf8')) as {
      accessors: Array<{ type?: string; min?: number[]; max?: number[] }>;
    };
    const position = json.accessors.find((accessor) => accessor.type === 'VEC3' && accessor.min && accessor.max);
    if (!position?.min || !position.max) throw new Error('Skeleton POSITION bounds are missing');

    const [minX, minY, minZ] = position.min;
    const [maxX, maxY, maxZ] = position.max;
    const raw = new THREE.Vector3(maxX - minX, maxY - minY, maxZ - minZ);
    expect(raw.y).toBeGreaterThan(Math.max(raw.x, raw.z));

    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;
    const midZ = (minZ + maxZ) / 2;
    const geometry = new THREE.BoxGeometry(raw.x, raw.y, raw.z);
    geometry.translate(midX, midY, midZ);
    const skeleton = new THREE.Group();
    skeleton.add(new THREE.Mesh(geometry));

    const marker = (name: string, x: number, y: number, z: number) => {
      const point = new THREE.Object3D();
      point.name = name;
      point.position.set(x, y, z);
      skeleton.add(point);
      return point;
    };
    const feet = marker('feet', minX, midY, midZ);
    const back = marker('back', maxX, midY, midZ);
    const skull = marker('skull', midX, minY, midZ);
    const tail = marker('tail', midX, maxY, midZ);
    const hips = marker('hips', midX, midY, midZ);

    const skin = new THREE.Group();
    const loader = {
      loadAsync: async (url: string) => {
        if (url.includes('skeleton')) return { scene: skeleton, animations: [] };
        return { scene: skin, animations: [] };
      },
    };

    const model = await loadTriceratops(loader as unknown as Parameters<typeof loadTriceratops>[0]);
    model.skeletonGroup.updateWorldMatrix(true, true);
    const size = new THREE.Box3().setFromObject(model.skeletonGroup).getSize(new THREE.Vector3());
    const world = (object: THREE.Object3D) => object.getWorldPosition(new THREE.Vector3());
    const feetPos = world(feet);
    const backPos = world(back);
    const skullPos = world(skull);
    const tailPos = world(tail);
    const hipsPos = world(hips);

    expect(skeleton.rotation.order).toBe('ZYX');
    expect(size.y).toBeGreaterThan(Math.min(size.x, size.z));
    expect(Math.max(size.x, size.z)).toBeCloseTo(TARGET_LENGTH, 2);
    expect(feetPos.y).toBeCloseTo(0, 2);
    expect(feetPos.y).toBeLessThan(hipsPos.y);
    expect(backPos.y).toBeGreaterThan(hipsPos.y);
    expect(skullPos.y).toBeGreaterThan(feetPos.y);
    expect(skullPos.z).toBeGreaterThan(tailPos.z);
  });
});
