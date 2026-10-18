import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Dinosaur, DinoViewMode } from '../types/dinosaur';
import { buildDinosaur3D, DinoModelResult } from './dino3d/dinoModels';
import { RotateCw, ZoomIn, ZoomOut, Compass, Sparkles } from 'lucide-react';

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

  // Internal Three.js refs
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
    scene.background = new THREE.Color(0xfaf6ed); // Soft warm background
    scene.fog = new THREE.FogExp2(0xfaf6ed, 0.04);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(4.5, 3.2, 5.5);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    rendererRef.current = renderer;

    mountRef.current.appendChild(renderer.domElement);

    // 4. Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 + 0.05; // Don't go below floor
    controls.minDistance = 2.0;
    controls.maxDistance = 16.0;
    controls.target.set(0, 1.8, 0);
    controlsRef.current = controls;

    // 5. Lighting
    // Ambient fill
    const ambientLight = new THREE.AmbientLight(0xfff8ee, 1.1);
    scene.add(ambientLight);

    // Warm Sun Directional Light
    const sunLight = new THREE.DirectionalLight(0xfffaed, 2.0);
    sunLight.position.set(6, 12, 8);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 30;
    sunLight.shadow.camera.left = -6;
    sunLight.shadow.camera.right = 6;
    sunLight.shadow.camera.top = 6;
    sunLight.shadow.camera.bottom = -6;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    // Soft Prehistoric Sky Hemisphere Light
    const hemiLight = new THREE.HemisphereLight(0xbae6fd, 0xd9c5a3, 0.85);
    scene.add(hemiLight);

    // 6. Natural Pedestal / Excavation Platform
    const pedestalGroup = new THREE.Group();
    // Circular stone disc
    const discGeo = new THREE.CylinderGeometry(3.6, 3.8, 0.35, 32);
    const discMat = new THREE.MeshStandardMaterial({
      color: 0xdfd3bd,
      roughness: 0.9,
    });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.position.y = -0.18;
    disc.receiveShadow = true;
    pedestalGroup.add(disc);

    // Outer fossil border ring
    const ringGeo = new THREE.TorusGeometry(3.65, 0.12, 8, 32);
    ringGeo.rotateX(Math.PI / 2);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xc4b397,
      roughness: 0.8,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.01;
    pedestalGroup.add(ring);

    // Soft drop shadow catcher plane
    const shadowGeo = new THREE.PlaneGeometry(16, 16);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.ShadowMaterial({ opacity: 0.18 });
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.position.y = -0.19;
    shadowPlane.receiveShadow = true;
    pedestalGroup.add(shadowPlane);

    scene.add(pedestalGroup);

    // 7. Animation Loop
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);

      const delta = clockRef.current.getDelta();
      const elapsed = clockRef.current.getElapsedTime();

      // Auto rotation
      if (autoRotate && controlsRef.current) {
        controlsRef.current.autoRotate = true;
        controlsRef.current.autoRotateSpeed = 1.2;
      } else if (controlsRef.current) {
        controlsRef.current.autoRotate = false;
      }

      controlsRef.current?.update();

      // Idle breathing and tail swaying animations
      if (modelResultRef.current) {
        const { tailSegments, chestMesh, jawMesh, neckMesh } = modelResultRef.current;

        // Subtle chest expansion (breathing)
        if (chestMesh) {
          const breath = 1.0 + Math.sin(elapsed * 2.2) * 0.025;
          chestMesh.scale.set(breath, breath, 1.0);
        }

        // Tail swaying like a real reptile
        tailSegments.forEach((seg, idx) => {
          const sway = Math.sin(elapsed * 2.5 - idx * 0.6) * 0.08;
          seg.rotation.y = sway;
        });

        // Subtle neck bobbing
        if (neckMesh) {
          neckMesh.rotation.z = Math.sin(elapsed * 1.5) * 0.02;
        }

        // Gentle jaw breathing
        if (jawMesh) {
          jawMesh.rotation.x = Math.max(0, Math.sin(elapsed * 1.8) * 0.06);
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

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (rendererRef.current && rendererRef.current.domElement) {
        mountRef.current?.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
    };
  }, []);

  // Update autoRotate in controls
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate;
    }
  }, [autoRotate]);

  // Load / Swap Dinosaur Model when dinosaur changes
  useEffect(() => {
    if (!sceneRef.current) return;

    // Remove previous model if exists
    if (modelResultRef.current) {
      sceneRef.current.remove(modelResultRef.current.rootGroup);
      modelResultRef.current = null;
    }

    // Build new 3D dinosaur
    const newModel = buildDinosaur3D(dinosaur);
    modelResultRef.current = newModel;
    sceneRef.current.add(newModel.rootGroup);

    // Adjust camera target & distance based on dinosaur scale
    if (controlsRef.current && cameraRef.current) {
      const isGiant = dinosaur.id === 'brachiosaurus' || dinosaur.id === 'diplodocus';
      const targetY = isGiant ? 3.0 : 1.8;
      const camDist = isGiant ? 9.5 : 5.8;

      controlsRef.current.target.set(0, targetY, 0);
      cameraRef.current.position.set(camDist * 0.8, targetY + 1.2, camDist * 0.9);
      controlsRef.current.update();
    }
  }, [dinosaur]);

  // Handle View Mode switch (Exterior vs Skeleton vs X-Ray)
  useEffect(() => {
    if (!modelResultRef.current) return;
    const { exteriorGroup, skeletonGroup } = modelResultRef.current;

    if (viewMode === 'exterior') {
      exteriorGroup.visible = true;
      skeletonGroup.visible = false;
      // Ensure exterior materials are fully opaque
      exteriorGroup.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          const mat = mesh.material as THREE.MeshStandardMaterial;
          if (mat) {
            mat.transparent = false;
            mat.opacity = 1.0;
            mat.depthWrite = true;
          }
        }
      });
    } else if (viewMode === 'skeleton') {
      exteriorGroup.visible = false;
      skeletonGroup.visible = true;
    } else if (viewMode === 'xray') {
      // X-Ray Mode: skeleton visible + semi-transparent living skin
      exteriorGroup.visible = true;
      skeletonGroup.visible = true;
      exteriorGroup.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          const mat = mesh.material as THREE.MeshStandardMaterial;
          if (mat) {
            mat.transparent = true;
            mat.opacity = 0.22;
            mat.depthWrite = false;
          }
        }
      });
    }
  }, [viewMode, dinosaur]);

  // Camera preset handler
  const setCameraPreset = (preset: 'full' | 'head' | 'side') => {
    setCameraView(preset);
    if (!controlsRef.current || !cameraRef.current) return;

    const isGiant = dinosaur.id === 'brachiosaurus' || dinosaur.id === 'diplodocus';

    if (preset === 'full') {
      const dist = isGiant ? 9.5 : 6.0;
      const targetY = isGiant ? 2.8 : 1.8;
      controlsRef.current.target.set(0, targetY, 0);
      cameraRef.current.position.set(dist * 0.75, targetY + 1.2, dist * 0.85);
    } else if (preset === 'head') {
      const headY = dinosaur.id === 'brachiosaurus' ? 5.5 : 2.5;
      const headZ = dinosaur.id === 'diplodocus' ? 3.5 : 1.8;
      controlsRef.current.target.set(0, headY, headZ);
      cameraRef.current.position.set(1.5, headY + 0.3, headZ + 2.4);
    } else if (preset === 'side') {
      const sideDist = isGiant ? 10.0 : 6.2;
      const targetY = isGiant ? 2.8 : 1.8;
      controlsRef.current.target.set(0, targetY, 0);
      cameraRef.current.position.set(sideDist, targetY, 0);
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
        <div className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold shadow-playful-sm flex items-center gap-1.5 ${
          viewMode === 'exterior'
            ? 'bg-jungle-100 text-jungle-800 border-2 border-jungle-500'
            : viewMode === 'skeleton'
            ? 'bg-bone-100 text-amber-900 border-2 border-bone-300'
            : 'bg-amber-100 text-amber-900 border-2 border-amber-500'
        }`}>
          <span>{viewMode === 'exterior' ? '🦖 Living Skin' : viewMode === 'skeleton' ? '🦴 Museum Skeleton' : '🔍 X-Ray Bones Inside'}</span>
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
          className={`btn-chunky px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold border ${
            cameraView === 'full'
              ? 'bg-jungle-500 text-white border-jungle-600 shadow-playful-sm'
              : 'bg-safari-100 text-safari-800 border-safari-300'
          }`}
        >
          Whole Dino
        </button>
        <button
          onClick={() => setCameraPreset('head')}
          className={`btn-chunky px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold border ${
            cameraView === 'head'
              ? 'bg-jungle-500 text-white border-jungle-600 shadow-playful-sm'
              : 'bg-safari-100 text-safari-800 border-safari-300'
          }`}
        >
          Big Head 👀
        </button>
        <button
          onClick={() => setCameraPreset('side')}
          className={`btn-chunky px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold border ${
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
