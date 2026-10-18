import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Dinosaur, DinoViewMode } from '../types/dinosaur';
import { buildDinosaur3D, DinoModelResult } from './dino3d/dinoModels';
import { RotateCw, ZoomIn, ZoomOut, Sparkles } from 'lucide-react';

interface ThreeDinoViewerProps {
  dinosaur: Dinosaur;
  viewMode: DinoViewMode;
  onRoarTrigger?: () => void;
}

export const ThreeDinoViewer: React.FC<ThreeDinoViewerProps> = ({
  dinosaur,
  viewMode,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [cameraView, setCameraView] = useState<'full' | 'head' | 'side'>('full');

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelResultRef = useRef<DinoModelResult | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());

  // Initialize Three.js Scene once
  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0xf6f0e2);
    scene.fog = new THREE.FogExp2(0xf6f0e2, 0.025);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 120);
    camera.position.set(5.4, 3.2, 6.2);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    rendererRef.current = renderer;

    mountRef.current.appendChild(renderer.domElement);

    // 4. Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.02; // Keep above ground pedestal
    controls.minDistance = 2.0;
    controls.maxDistance = 18.0;
    controls.target.set(0, 1.8, 0);
    controlsRef.current = controls;

    // 5. Realistic 3-Point Natural History Lighting
    const ambientLight = new THREE.AmbientLight(0xfff8eb, 0.85);
    scene.add(ambientLight);

    // Primary Sun Key Light (casts crisp soft shadows & highlights reptilian scales)
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

    // Cool Sky Rim Light (back-left) to accentuate dorsal osteoderms, horns, and ribs
    const rimLight = new THREE.DirectionalLight(0xdbeafe, 1.15);
    rimLight.position.set(-7, 6, -6);
    scene.add(rimLight);

    // Warm Sandstone Ground Fill Light
    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0xd6c3a5, 0.9);
    scene.add(hemiLight);

    // 6. Natural History Diorama Pedestal
    const pedestalGroup = new THREE.Group();

    // Main circular sandstone earth platform
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

    // Inner compacted dirt/moss ring
    const innerDiscGeo = new THREE.CylinderGeometry(4.75, 4.85, 0.04, 48);
    const innerDiscMat = new THREE.MeshStandardMaterial({
      color: 0xcab899,
      roughness: 0.95,
    });
    const innerDisc = new THREE.Mesh(innerDiscGeo, innerDiscMat);
    innerDisc.position.y = 0.01;
    innerDisc.receiveShadow = true;
    pedestalGroup.add(innerDisc);

    // Sculpted prehistoric boulders around pedestal edge
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0xa6957c,
      roughness: 0.88,
    });
    const rockPositions: [number, number, number, number][] = [
      [-2.8, 0.12, -2.2, 0.32],
      [-3.1, 0.08, -1.7, 0.22],
      [2.9, 0.10, -2.4, 0.28],
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

    // Soft drop shadow catcher plane
    const shadowGeo = new THREE.PlaneGeometry(22, 22);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.ShadowMaterial({ opacity: 0.2 });
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.position.y = 0.032;
    shadowPlane.receiveShadow = true;
    pedestalGroup.add(shadowPlane);

    scene.add(pedestalGroup);

    // 7. Animation Loop
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);

      clockRef.current.getDelta();
      const elapsed = clockRef.current.getElapsedTime();

      if (controlsRef.current) {
        controlsRef.current.autoRotate = autoRotate;
        controlsRef.current.autoRotateSpeed = 1.05;
        controlsRef.current.update();
      }

      // Organic idle breathing, head look, and jaw motion
      if (modelResultRef.current) {
        const { chestMesh, jawMesh, neckMesh } = modelResultRef.current;

        // Subtle ribcage breathing expansion
        if (chestMesh) {
          const breath = 1.0 + Math.sin(elapsed * 2.0) * 0.012;
          chestMesh.scale.set(breath, breath, 1.0);
        }

        // Subtle realistic head/neck scan
        if (neckMesh) {
          neckMesh.rotation.y = Math.sin(elapsed * 0.85) * 0.06;
          neckMesh.rotation.z = Math.cos(elapsed * 1.1) * 0.02;
        }

        // Hinged lower jaw breathing & occasional predatory gape
        if (jawMesh) {
          const gapeWave = Math.pow(Math.max(0, Math.sin(elapsed * 0.9)), 4) * 0.16;
          const breathJaw = Math.max(0, Math.sin(elapsed * 2.0)) * 0.03;
          jawMesh.rotation.x = gapeWave + breathJaw;
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // 8. Resize Listener
    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const newW = mountRef.current.clientWidth;
      const newH = mountRef.current.clientHeight;
      cameraRef.current.aspect = newW / newH;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(newW, newH);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (rendererRef.current && rendererRef.current.domElement) {
        mountRef.current?.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
    };
  }, []);

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate;
    }
  }, [autoRotate]);

  // Swap Dinosaur Model when selected dinosaur changes
  useEffect(() => {
    if (!sceneRef.current) return;

    if (modelResultRef.current) {
      sceneRef.current.remove(modelResultRef.current.rootGroup);
      modelResultRef.current = null;
    }

    const newModel = buildDinosaur3D(dinosaur);
    modelResultRef.current = newModel;
    sceneRef.current.add(newModel.rootGroup);

    // Apply current view mode immediately
    newModel.exteriorGroup.visible = viewMode === 'exterior';
    newModel.skeletonGroup.visible = viewMode === 'skeleton';

    setCameraPreset('full', dinosaur);
  }, [dinosaur]);

  // Handle View Mode switch (Living Reptilian Skin vs Museum Skeleton)
  useEffect(() => {
    if (!modelResultRef.current) return;
    const { exteriorGroup, skeletonGroup } = modelResultRef.current;
    exteriorGroup.visible = viewMode === 'exterior';
    skeletonGroup.visible = viewMode === 'skeleton';
  }, [viewMode, dinosaur]);

  const setCameraPreset = (preset: 'full' | 'head' | 'side', targetDino = dinosaur) => {
    setCameraView(preset);
    if (!controlsRef.current || !cameraRef.current) return;

    const isTall = targetDino.id === 'brachiosaurus';
    const isLong = targetDino.id === 'diplodocus' || targetDino.id === 'spinosaurus';

    if (preset === 'full') {
      const dist = isTall ? 9.6 : isLong ? 8.4 : 6.4;
      const targetY = isTall ? 2.9 : 1.75;
      controlsRef.current.target.set(0, targetY, 0);
      cameraRef.current.position.set(dist * 0.78, targetY + 1.15, dist * 0.82);
    } else if (preset === 'head') {
      const headCoords: Record<string, [number, number]> = {
        't-rex': [2.75, 2.3],
        'brachiosaurus': [5.85, 2.2],
        'diplodocus': [2.42, 3.85],
        'triceratops': [1.85, 1.85],
        'stegosaurus': [1.45, 2.3],
        'velociraptor': [2.08, 1.7],
        'ankylosaurus': [1.12, 1.75],
        'spinosaurus': [2.48, 2.65],
      };
      const [headY, headZ] = headCoords[targetDino.id] ?? [2.2, 2.0];
      controlsRef.current.target.set(0, headY, headZ);
      cameraRef.current.position.set(1.85, headY + 0.25, headZ + 1.95);
    } else if (preset === 'side') {
      const sideDist = isTall ? 10.2 : isLong ? 8.8 : 6.8;
      const targetY = isTall ? 2.9 : 1.75;
      controlsRef.current.target.set(0, targetY, -0.2);
      cameraRef.current.position.set(sideDist, targetY + 0.3, -0.2);
    }
    controlsRef.current.update();
  };

  const handleZoom = (direction: 'in' | 'out') => {
    if (!controlsRef.current || !cameraRef.current) return;
    const factor = direction === 'in' ? 0.8 : 1.25;
    const offset = cameraRef.current.position.clone().sub(controlsRef.current.target);
    offset.multiplyScalar(factor);
    cameraRef.current.position.copy(controlsRef.current.target).add(offset);
    controlsRef.current.update();
  };

  return (
    <div className="relative w-full h-full min-h-[460px] md:min-h-[560px] rounded-3xl overflow-hidden bg-safari-100 border-4 border-safari-300 shadow-playful">
      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Touch / Mouse Drag Helper Hint for Kids */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none flex items-center gap-2 bg-white/90 backdrop-blur-sm px-3.5 py-1.5 rounded-full border border-safari-300 shadow-playful-sm text-safari-800 text-xs sm:text-sm font-bold">
        <Sparkles className="w-4 h-4 text-amber-500 animate-spin" style={{ animationDuration: '6s' }} />
        <span>Drag to rotate • Pinch to zoom!</span>
      </div>

      {/* Current View Badge */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <div
          className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold shadow-playful-sm flex items-center gap-1.5 ${
            viewMode === 'exterior'
              ? 'bg-jungle-100 text-jungle-800 border-2 border-jungle-500'
              : 'bg-bone-100 text-amber-900 border-2 border-bone-300'
          }`}
        >
          <span>{viewMode === 'exterior' ? '🦖 Living Reptilian Skin' : '🦴 Museum Fossil Skeleton'}</span>
        </div>
      </div>

      {/* Floating 3D Navigation Controls Bar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border-2 border-safari-300 shadow-playful">
        {/* Auto Rotate Toggle */}
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          title="Toggle Auto Spin"
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

        {/* Camera Angles */}
        <button
          onClick={() => setCameraPreset('full')}
          className={`btn-chunky whitespace-nowrap px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold border ${
            cameraView === 'full'
              ? 'bg-jungle-500 text-white border-jungle-600 shadow-playful-sm'
              : 'bg-safari-100 text-safari-800 border-safari-300'
          }`}
        >
          Whole Dino
        </button>
        <button
          onClick={() => setCameraPreset('head')}
          className={`btn-chunky whitespace-nowrap px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold border ${
            cameraView === 'head'
              ? 'bg-jungle-500 text-white border-jungle-600 shadow-playful-sm'
              : 'bg-safari-100 text-safari-800 border-safari-300'
          }`}
        >
          Head & Jaws 👀
        </button>
        <button
          onClick={() => setCameraPreset('side')}
          className={`btn-chunky whitespace-nowrap px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold border ${
            cameraView === 'side'
              ? 'bg-jungle-500 text-white border-jungle-600 shadow-playful-sm'
              : 'bg-safari-100 text-safari-800 border-safari-300'
          }`}
        >
          Profile
        </button>

        <div className="w-[1px] h-6 bg-safari-300 mx-1 hidden sm:block" />

        {/* Zoom In / Out */}
        <button
          onClick={() => handleZoom('in')}
          title="Zoom In"
          className="btn-chunky p-2 rounded-xl bg-safari-100 hover:bg-safari-200 text-safari-900 border border-safari-300 hidden sm:flex items-center justify-center"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleZoom('out')}
          title="Zoom Out"
          className="btn-chunky p-2 rounded-xl bg-safari-100 hover:bg-safari-200 text-safari-900 border border-safari-300 hidden sm:flex items-center justify-center"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
