Self-hosted mesh decoders copied from the `three` package (`examples/jsm/libs`).

The viewer loads them from this site (`/decoders/draco/` and `/decoders/ktx2/`). It does not fetch them from a CDN.

- `draco/` is the glTF build of Google Draco (WASM decoder + wrapper). Apache-2.0. See `draco/README.md`.
- `ktx2/` is the Binomial Basis Universal transcoder used by `KTX2Loader`. See `ktx2/README.md`.
