import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Dinosaur, DinoViewMode } from '../types/dinosaur';
import { buildDinosaur3D, DinoModelResult } from './dino3d/dinoModels';
import { releaseSharedDinoTextures } from './dino3d/textureGenerator';
import { disposeObject3D, teardownViewer } from '../three/disposeResources';
import { applyAutoRotate } from '../three/autoRotate';
import { createDinosaurGltfLoader } from '../three/createGltfLoader';
import { frameModel, CameraPreset } from '../three/frameCamera';
import { loadTriceratops } from '../three/loadTriceratops';
import { playNamedClip } from '../three/playClip';
import { RotateCw, ZoomIn, ZoomOut, Sparkles } from 'lucide-react';
import type { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import type { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';

interface ThreeDinoViewerProps {
  dinosaur: Dinosaur;
  viewMode: DinoViewMode;
  onOpenCredits: () => void;
}

type MotionName = 'idle' | 'walk';

function releaseModel(model: DinoModelResult | null) {
  if (!model) return;
  model.mixer?.stopAllAction();
  disposeObject3D(model.rootGroup);
  releaseSharedDinoTextures();
}

export const ThreeDinoViewer: React.FC<ThreeDinoViewerProps> = ({
  dinosaur,
  viewMode,
  onOpenCredits,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [cameraView, setCameraView] = useState<CameraPreset>('full');
  const [motion, setMotion] = useState<MotionName>('idle');
  const [clipNames, setClipNames] = useState<string[]>([]);
  const [loadingModel, setLoadingModel] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelResultRef = useRef<DinoModelResult | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());
  const autoRotateRef = useRef(true);
  const viewModeRef = useRef<DinoViewMode>(viewMode);
  const cameraViewRef = useRef<CameraPreset>('full');
  const motionRef = useRef<MotionName>('idle');
  const gltfRef = useRef<{ loader: GLTFLoader; draco: DRACOLoader; ktx2: KTX2Loader } | null>(null);

  viewModeRef.current = viewMode;
  cameraViewRef.current = cameraView;
  motionRef.current = motion;

  useEffect(() => {
    if (!mountRef.current) return;
    const mount = mountRef.current;

    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0xf6f0e2);
    scene.fog = new THREE.FogExp2(0xf6f0e2, 0.025);

    const camera = new THREE.PerspectiveCamera(42, width / Math.max(height, 1), 0.1, 120);
    camera.position.set(5.4, 3.2, 6.2);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.domElement.tabIndex = 0;
    renderer.domElement.setAttribute(
      'aria-label',
      '3D dinosaur. Drag to look around, or use the arrow keys when this view is focused.',
    );
    rendererRef.current = renderer;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.02;
    controls.minDistance = 2.0;
    controls.maxDistance = 18.0;
    controls.target.set(0, 1.8, 0);
    controls.listenToKeyEvents(renderer.domElement);
    controlsRef.current = controls;

    const gltf = createDinosaurGltfLoader();
    gltf.ktx2.detectSupport(renderer);
    gltfRef.current = gltf;

    const ambientLight = new THREE.AmbientLight(0xfff8eb, 0.85);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff5e0, 2.4);
    sunLight.position.set(7, 13, 8);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 35;
    sunLight.shadow.camera.left = -7.5;
    sunLight.shadow.camera.right = 7.5;
    sunLight.shadow.camera.top = 7.5;
    sunLight.shadow.camera.bottom = -7.5;
    sunLight.shadow.bias = -0.0004;
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0xdbeafe, 1.15);
    rimLight.position.set(-7, 6, -6);
    scene.add(rimLight);

    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0xd6c3a5, 0.9);
    scene.add(hemiLight);

    const pedestalGroup = new THREE.Group();
    const discGeo = new THREE.CylinderGeometry(5.2, 5.5, 0.36, 48);
    const discMat = new THREE.MeshStandardMaterial({
      color: 0xdccbb1,
      roughness: 0.92,
      metalness: 0.02,
    });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.position.y = -0.18;
    disc.receiveShadow = true;
    pedestalGroup.add(disc);

    const innerDiscGeo = new THREE.CylinderGeometry(4.75, 4.85, 0.04, 48);
    const innerDiscMat = new THREE.MeshStandardMaterial({
      color: 0xcab899,
      roughness: 0.95,
    });
    const innerDisc = new THREE.Mesh(innerDiscGeo, innerDiscMat);
    innerDisc.position.y = 0.01;
    innerDisc.receiveShadow = true;
    pedestalGroup.add(innerDisc);

    const rockMat = new THREE.MeshStandardMaterial({
      color: 0xa6957c,
      roughness: 0.88,
    });
    const rockPositions: [number, number, number, number][] = [
      [-2.8, 0.12, -2.2, 0.32],
      [-3.1, 0.08, -1.7, 0.22],
      [2.9, 0.1, -2.4, 0.28],
      [2.4, 0.09, 2.8, 0.24],
    ];
    for (const [rx, ry, rz, rs] of rockPositions) {
      const rockGeo = new THREE.DodecahedronGeometry(rs, 1);
      rockGeo.scale(1.3, 0.68, 1.1);
      const rock = new THREE.Mesh(rockGeo, rockMat);
      rock.position.set(rx, ry, rz);
      rock.rotation.y = rx * 1.7;
      rock.castShadow = true;
      rock.receiveShadow = true;
      pedestalGroup.add(rock);
    }

    const shadowGeo = new THREE.PlaneGeometry(22, 22);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.ShadowMaterial({ opacity: 0.2 });
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.position.y = 0.032;
    shadowPlane.receiveShadow = true;
    pedestalGroup.add(shadowPlane);
    scene.add(pedestalGroup);

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      const delta = clockRef.current.getDelta();
      const elapsed = clockRef.current.getElapsedTime();

      if (controlsRef.current) {
        applyAutoRotate(controlsRef.current, autoRotateRef);
        controlsRef.current.autoRotateSpeed = 1.05;
        controlsRef.current.update();
      }

      const model = modelResultRef.current;
      if (model?.mixer) {
        model.mixer.update(delta);
      } else if (model) {
        const { chestMesh, jawMesh, neckMesh } = model;
        if (chestMesh) {
          const breath = 1.0 + Math.sin(elapsed * 2.0) * 0.012;
          chestMesh.scale.set(breath, breath, 1.0);
        }
        if (neckMesh) {
          neckMesh.rotation.y = Math.sin(elapsed * 0.85) * 0.06;
          neckMesh.rotation.z = Math.cos(elapsed * 1.1) * 0.02;
        }
        if (jawMesh) {
          const gapeWave = Math.pow(Math.max(0, Math.sin(elapsed * 0.9)), 4) * 0.16;
          const breathJaw = Math.max(0, Math.sin(elapsed * 2.0)) * 0.03;
          jawMesh.rotation.x = gapeWave + breathJaw;
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const newW = mountRef.current.clientWidth;
      const newH = mountRef.current.clientHeight;
      cameraRef.current.aspect = newW / Math.max(newH, 1);
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
      releaseModel(modelResultRef.current);
      modelResultRef.current = null;
      if (sceneRef.current && rendererRef.current) {
        teardownViewer({
          scene: sceneRef.current,
          renderer: rendererRef.current,
          controls: controlsRef.current,
        });
      }
      gltf.draco.dispose();
      gltf.ktx2.dispose();
      gltfRef.current = null;
      if (renderer.domElement.parentElement === mount) {
        mount.removeChild(renderer.domElement);
      }
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      controlsRef.current = null;
    };
  }, []);

  const showModel = (model: DinoModelResult) => {
    const scene = sceneRef.current;
    if (!scene) {
      releaseModel(model);
      return;
    }
    if (modelResultRef.current) {
      scene.remove(modelResultRef.current.rootGroup);
      releaseModel(modelResultRef.current);
    }
    modelResultRef.current = model;
    scene.add(model.rootGroup);
    const mode = viewModeRef.current;
    model.exteriorGroup.visible = mode === 'exterior';
    model.skeletonGroup.visible = mode === 'skeleton';
    setClipNames(model.clips.map((clip) => clip.name));
    if (mode === 'exterior') playNamedClip(model, motionRef.current);
    const visible = mode === 'exterior' ? model.exteriorGroup : model.skeletonGroup;
    if (cameraRef.current && controlsRef.current) {
      frameModel(cameraRef.current, controlsRef.current, visible, 'full');
      setCameraView('full');
    }
  };

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    let cancelled = false;

    const dropCurrent = () => {
      if (!modelResultRef.current) return;
      scene.remove(modelResultRef.current.rootGroup);
      releaseModel(modelResultRef.current);
      modelResultRef.current = null;
    };

    if (dinosaur.id === 'triceratops') {
      const bundle = gltfRef.current;
      if (!bundle) return;
      setLoadingModel(true);
      setLoadError(null);
      loadTriceratops(bundle.loader)
        .then((model) => {
          if (cancelled) {
            releaseModel(model);
            return;
          }
          // Drop the previous dinosaur before attaching. Its shared textures
          // must not be disposed after the new file's own textures are in use.
          dropCurrent();
          showModel(model);
        })
        .catch(() => {
          if (!cancelled) setLoadError('The Triceratops model could not open. Please try again.');
        })
        .finally(() => {
          if (!cancelled) setLoadingModel(false);
        });
    } else {
      setLoadingModel(false);
      setLoadError(null);
      // Rebuild shared skin textures only after the previous model released them.
      dropCurrent();
      showModel(buildDinosaur3D(dinosaur));
    }

    return () => {
      cancelled = true;
    };
    // showModel is recreated each render and only uses refs plus setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dinosaur]);

  useEffect(() => {
    const model = modelResultRef.current;
    if (!model || !cameraRef.current || !controlsRef.current) return;
    model.exteriorGroup.visible = viewMode === 'exterior';
    model.skeletonGroup.visible = viewMode === 'skeleton';
    const visible = viewMode === 'exterior' ? model.exteriorGroup : model.skeletonGroup;
    frameModel(cameraRef.current, controlsRef.current, visible, cameraViewRef.current);
    if (viewMode === 'exterior') playNamedClip(model, motionRef.current);
    else model.mixer?.stopAllAction();
  }, [viewMode]);

  useEffect(() => {
    const model = modelResultRef.current;
    if (!model || viewMode !== 'exterior') return;
    playNamedClip(model, motion);
  }, [motion, viewMode]);

  const setCameraPreset = (preset: CameraPreset) => {
    setCameraView(preset);
    const model = modelResultRef.current;
    if (!model || !controlsRef.current || !cameraRef.current) return;
    const visible = viewMode === 'exterior' ? model.exteriorGroup : model.skeletonGroup;
    frameModel(cameraRef.current, controlsRef.current, visible, preset);
  };

  const handleZoom = (direction: 'in' | 'out') => {
    if (!controlsRef.current || !cameraRef.current) return;
    const factor = direction === 'in' ? 0.8 : 1.25;
    const offset = cameraRef.current.position.clone().sub(controlsRef.current.target);
    offset.multiplyScalar(factor);
    cameraRef.current.position.copy(controlsRef.current.target).add(offset);
    controlsRef.current.update();
  };

  const toggleSpin = () => {
    setAutoRotate((prev) => {
      const next = !prev;
      autoRotateRef.current = next;
      return next;
    });
  };

  const hasWalk = clipNames.includes('walk');
  const hasIdle = clipNames.includes('idle');
  const showMotion = hasWalk || hasIdle;
  const motionLocked = viewMode === 'skeleton';

  return (
    <div className="relative w-full h-full min-h-[460px] md:min-h-[560px] rounded-3xl overflow-hidden bg-safari-100 border-4 border-safari-300 shadow-playful">
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      <div className="absolute top-4 left-4 z-10 pointer-events-none flex items-center gap-2 bg-white/90 backdrop-blur-sm px-3.5 py-1.5 rounded-full border border-safari-300 shadow-playful-sm text-safari-800 text-xs sm:text-sm font-bold">
        <Sparkles className="w-4 h-4 text-amber-500 animate-spin" style={{ animationDuration: '6s' }} />
        <span>Drag to rotate • Pinch to zoom!</span>
      </div>

      <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-2">
        <div
          className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold shadow-playful-sm flex items-center gap-1.5 ${
            viewMode === 'exterior'
              ? 'bg-jungle-100 text-jungle-800 border-2 border-jungle-500'
              : 'bg-bone-100 text-amber-900 border-2 border-bone-300'
          }`}
        >
          <span>{viewMode === 'exterior' ? 'Living skin' : 'Fossil skeleton'}</span>
        </div>
        <button
          type="button"
          onClick={onOpenCredits}
          className="btn-chunky px-3 py-1.5 rounded-full text-xs sm:text-sm font-bold bg-white/95 text-safari-900 border border-safari-300 shadow-playful-sm"
        >
          Credits
        </button>
      </div>

      {loadingModel && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-safari-100/70" role="status">
          <p className="bg-white px-4 py-2 rounded-2xl border-2 border-safari-300 font-extrabold text-safari-900">
            Bringing Triceratops in...
          </p>
        </div>
      )}
      {loadError && (
        <div className="absolute top-16 left-4 right-4 z-20 bg-white border-2 border-amber-500 rounded-2xl p-3 text-sm font-bold text-safari-900" role="alert">
          {loadError}
        </div>
      )}

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 max-w-[96%]">
        {showMotion && (
          <div
            role="group"
            aria-label="Triceratops animation"
            className="flex items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-2 rounded-2xl border-2 border-safari-300 shadow-playful"
          >
            <button
              type="button"
              aria-pressed={motion === 'idle'}
              aria-label="Play idle animation"
              disabled={!hasIdle || motionLocked}
              onClick={() => setMotion('idle')}
              className={`btn-chunky px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold border ${
                motion === 'idle' && !motionLocked
                  ? 'bg-jungle-500 text-white border-jungle-600'
                  : 'bg-safari-100 text-safari-800 border-safari-300'
              } disabled:opacity-50`}
            >
              Idle
            </button>
            <button
              type="button"
              aria-pressed={motion === 'walk'}
              aria-label="Play walk animation"
              disabled={!hasWalk || motionLocked}
              onClick={() => setMotion('walk')}
              className={`btn-chunky px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold border ${
                motion === 'walk' && !motionLocked
                  ? 'bg-jungle-500 text-white border-jungle-600'
                  : 'bg-safari-100 text-safari-800 border-safari-300'
              } disabled:opacity-50`}
            >
              Walk
            </button>
            {motionLocked && (
              <span className="text-[11px] font-bold text-safari-700 max-w-[10rem]">
                This fossil skeleton stays still.
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border-2 border-safari-300 shadow-playful">
          <button
            type="button"
            onClick={toggleSpin}
            aria-pressed={autoRotate}
            aria-label={autoRotate ? 'Stop spinning' : 'Start spinning'}
            title={autoRotate ? 'Stop spinning' : 'Start spinning'}
            className={`btn-chunky flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold border ${
              autoRotate
                ? 'bg-amber-400 text-safari-900 border-amber-500 shadow-playful-sm'
                : 'bg-safari-100 text-safari-800 border-safari-300'
            }`}
          >
            <RotateCw className={`w-4 h-4 ${autoRotate ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }} />
            <span className="hidden sm:inline">Spin</span>
          </button>

          <div className="w-[1px] h-6 bg-safari-300 mx-1" />

          <button
            type="button"
            onClick={() => setCameraPreset('full')}
            aria-pressed={cameraView === 'full'}
            className={`btn-chunky whitespace-nowrap px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold border ${
              cameraView === 'full'
                ? 'bg-jungle-500 text-white border-jungle-600 shadow-playful-sm'
                : 'bg-safari-100 text-safari-800 border-safari-300'
            }`}
          >
            Whole Dino
          </button>
          <button
            type="button"
            onClick={() => setCameraPreset('head')}
            aria-pressed={cameraView === 'head'}
            className={`btn-chunky whitespace-nowrap px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold border ${
              cameraView === 'head'
                ? 'bg-jungle-500 text-white border-jungle-600 shadow-playful-sm'
                : 'bg-safari-100 text-safari-800 border-safari-300'
            }`}
          >
            Head
          </button>
          <button
            type="button"
            onClick={() => setCameraPreset('side')}
            aria-pressed={cameraView === 'side'}
            className={`btn-chunky whitespace-nowrap px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold border ${
              cameraView === 'side'
                ? 'bg-jungle-500 text-white border-jungle-600 shadow-playful-sm'
                : 'bg-safari-100 text-safari-800 border-safari-300'
            }`}
          >
            Profile
          </button>

          <div className="w-[1px] h-6 bg-safari-300 mx-1 hidden sm:block" />

          <button
            type="button"
            onClick={() => handleZoom('in')}
            aria-label="Zoom in"
            title="Zoom in"
            className="btn-chunky p-2 rounded-xl bg-safari-100 hover:bg-safari-200 text-safari-900 border border-safari-300 hidden sm:flex items-center justify-center"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleZoom('out')}
            aria-label="Zoom out"
            title="Zoom out"
            className="btn-chunky p-2 rounded-xl bg-safari-100 hover:bg-safari-200 text-safari-900 border border-safari-300 hidden sm:flex items-center justify-center"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
