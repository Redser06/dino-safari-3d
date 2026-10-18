import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';

/**
 * Same-origin decoder folders copied into public/decoders from the three.js package.
 * These must stay relative site paths. Do not point them at a CDN.
 */
export const DRACO_DECODER_PATH = '/decoders/draco/';
export const KTX2_TRANSCODER_PATH = '/decoders/ktx2/';

export function createDinosaurGltfLoader() {
  const loader = new GLTFLoader();

  const draco = new DRACOLoader();
  draco.setDecoderPath(DRACO_DECODER_PATH);
  draco.setDecoderConfig({ type: 'wasm' });

  const ktx2 = new KTX2Loader();
  ktx2.setTranscoderPath(KTX2_TRANSCODER_PATH);

  loader.setDRACOLoader(draco);
  loader.setKTX2Loader(ktx2);

  return { loader, draco, ktx2 };
}
