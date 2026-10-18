/** Apply the latest spin flag. Call this from the animation frame, not a stale render closure. */
export function applyAutoRotate(
  controls: { autoRotate: boolean },
  enabled: { readonly current: boolean },
) {
  controls.autoRotate = enabled.current;
}
