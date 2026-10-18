import * as THREE from 'three';

// Procedural canvas-based texture generator for reptilian scales and fossil bone
export function createReptileScaleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // Base neutral grey
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 512, 512);

    // Draw pebbled reptilian scales
    const gridSize = 16;
    for (let x = 0; x < 512; x += gridSize) {
      for (let y = 0; y < 512; y += gridSize) {
        const offsetX = (Math.random() - 0.5) * 4;
        const offsetY = (Math.random() - 0.5) * 4;
        const radius = gridSize * 0.42 + (Math.random() - 0.5) * 2;

        const val = Math.floor(110 + Math.random() * 80);
        ctx.fillStyle = `rgb(${val}, ${val}, ${val})`;
        ctx.beginPath();
        ctx.ellipse(x + gridSize / 2 + offsetX, y + gridSize / 2 + offsetY, radius, radius * 0.85, Math.random() * Math.PI, 0, Math.PI * 2);
        ctx.fill();

        // Edge groove
        ctx.strokeStyle = '#404040';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  return texture;
}

export function createBoneTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.fillStyle = '#EBE7D8';
    ctx.fillRect(0, 0, 256, 256);

    // Subtle fossil grain streaks
    for (let i = 0; i < 200; i++) {
      ctx.fillStyle = 'rgba(160, 150, 130, 0.08)';
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const w = 4 + Math.random() * 20;
      const h = 1 + Math.random() * 2;
      ctx.fillRect(x, y, w, h);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}
