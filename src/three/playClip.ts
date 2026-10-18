import * as THREE from 'three';

export function playNamedClip(
  model: { mixer: THREE.AnimationMixer | null; clips: THREE.AnimationClip[] },
  name: string,
): boolean {
  if (!model.mixer) return false;
  const clip = THREE.AnimationClip.findByName(model.clips, name);
  if (!clip) return false;
  model.mixer.stopAllAction();
  const action = model.mixer.clipAction(clip);
  action.reset();
  action.setLoop(THREE.LoopRepeat, Infinity);
  action.clampWhenFinished = false;
  action.play();
  return true;
}
