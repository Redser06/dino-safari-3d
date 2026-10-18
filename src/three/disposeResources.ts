import * as THREE from 'three';

const disposedGeometries = new WeakSet<THREE.BufferGeometry>();
const disposedMaterials = new WeakSet<THREE.Material>();
const disposedTextures = new WeakSet<THREE.Texture>();

function disposeTexture(texture: THREE.Texture) {
  if (disposedTextures.has(texture)) return;
  disposedTextures.add(texture);
  texture.dispose();
}

function collectMaterialTextures(material: THREE.Material): THREE.Texture[] {
  const textures: THREE.Texture[] = [];
  for (const value of Object.values(material)) {
    if (value instanceof THREE.Texture) textures.push(value);
  }
  const withUniforms = material as THREE.Material & {
    uniforms?: Record<string, { value?: unknown }>;
  };
  if (withUniforms.uniforms) {
    for (const uniform of Object.values(withUniforms.uniforms)) {
      if (uniform?.value instanceof THREE.Texture) textures.push(uniform.value);
    }
  }
  return textures;
}

function disposeMaterial(material: THREE.Material) {
  if (disposedMaterials.has(material)) return;
  disposedMaterials.add(material);
  for (const texture of collectMaterialTextures(material)) {
    disposeTexture(texture);
  }
  material.dispose();
}

/**
 * Free GPU resources held by a mesh tree: geometries, materials, and textures.
 * Safe to call more than once on the same objects.
 */
export function disposeObject3D(root: THREE.Object3D) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry && mesh.geometry instanceof THREE.BufferGeometry) {
      if (!disposedGeometries.has(mesh.geometry)) {
        disposedGeometries.add(mesh.geometry);
        mesh.geometry.dispose();
      }
    }
    const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (!material) return;
    const materials = Array.isArray(material) ? material : [material];
    for (const entry of materials) disposeMaterial(entry);
  });
}

export interface ViewerTeardown {
  scene: THREE.Scene;
  renderer: { dispose: () => void; forceContextLoss?: () => void };
  controls: { dispose: () => void } | null;
}

/** Tear down a viewer: scene resources first, then the WebGL renderer. */
export function teardownViewer({ scene, renderer, controls }: ViewerTeardown) {
  controls?.dispose();
  disposeObject3D(scene);
  scene.clear();
  renderer.dispose();
  renderer.forceContextLoss?.();
}
