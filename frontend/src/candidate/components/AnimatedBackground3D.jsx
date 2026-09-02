import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

/**
 * Three.js Subtle 3D Animated Background across MockAI
 * 
 * Features:
 * 1. Floating particles/nodes (Amber/Orange & Slate)
 * 2. Slow-moving neural network connections (LineSegments)
 * 3. Abstract rotating 3D rings/orbits (Concentric wireframe rings)
 * 
 * High performance, low opacity, pointer-events: none, non-intrusive.
 */
const AnimatedBackground3D = () => {
  const containerRef = useRef(null);
  const [hasWebGL, setHasWebGL] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Check WebGL availability
    try {
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
      if (!gl) {
        setHasWebGL(false);
        return;
      }
    } catch {
      setHasWebGL(false);
      return;
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // --- Scene Setup ---
    const scene = new THREE.Scene();
    
    let width = window.innerWidth;
    let height = window.innerHeight;

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(0, 0, 24);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'low-power',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0); // Transparent canvas
    container.appendChild(renderer.domElement);

    const bgGroup = new THREE.Group();
    scene.add(bgGroup);

    // =========================================================================
    // 1. FLOATING PARTICLES & 2. NEURAL NETWORK CONNECTIONS
    // =========================================================================
    const nodeCount = 65;
    const maxDistance = 5.2;
    const bounds = { x: 22, y: 14, z: 10 };

    const nodePositions = new Float32Array(nodeCount * 3);
    const nodeVelocities = [];

    for (let i = 0; i < nodeCount; i++) {
      const x = (Math.random() - 0.5) * bounds.x * 2;
      const y = (Math.random() - 0.5) * bounds.y * 2;
      const z = (Math.random() - 0.5) * bounds.z * 2;

      nodePositions[i * 3] = x;
      nodePositions[i * 3 + 1] = y;
      nodePositions[i * 3 + 2] = z;

      nodeVelocities.push({
        vx: (Math.random() - 0.5) * 0.008,
        vy: (Math.random() - 0.5) * 0.008,
        vz: (Math.random() - 0.5) * 0.006,
      });
    }

    const nodeGeometry = new THREE.BufferGeometry();
    nodeGeometry.setAttribute('position', new THREE.BufferAttribute(nodePositions, 3));

    // Warm orange & subtle amber node points
    const nodeMaterial = new THREE.PointsMaterial({
      color: '#FF6B35',
      size: 0.18,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
    });
    const nodePoints = new THREE.Points(nodeGeometry, nodeMaterial);
    bgGroup.add(nodePoints);

    // Dynamic Neural Network Interconnecting Lines
    const maxLines = (nodeCount * (nodeCount - 1)) / 2;
    const linePositions = new Float32Array(maxLines * 6);
    const lineColors = new Float32Array(maxLines * 6);

    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    lineGeometry.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));

    const lineMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
    });
    const lineSegments = new THREE.LineSegments(lineGeometry, lineMaterial);
    bgGroup.add(lineSegments);

    const baseColor = new THREE.Color('#FF6B35');

    // =========================================================================
    // 3. ABSTRACT ROTATING 3D RINGS / ORBITS
    // =========================================================================
    const ringsGroup = new THREE.Group();
    bgGroup.add(ringsGroup);
    ringsGroup.position.set(8, -2, -6);

    const ringDefs = [
      { radius: 7.5, tube: 0.018, rotX: 1.2, rotY: 0.4, color: '#FF6B35', speed: 0.04, opacity: 0.22 },
      { radius: 10.5, tube: 0.015, rotX: -0.8, rotY: 0.7, color: '#FF9F1C', speed: -0.03, opacity: 0.16 },
      { radius: 14.0, tube: 0.012, rotX: 0.5, rotY: -0.9, color: '#FF6B35', speed: 0.02, opacity: 0.12 },
    ];

    const ringMeshes = [];
    ringDefs.forEach((def) => {
      const geo = new THREE.TorusGeometry(def.radius, def.tube, 16, 120);
      const mat = new THREE.MeshBasicMaterial({
        color: def.color,
        transparent: true,
        opacity: def.opacity,
        wireframe: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.set(def.rotX, def.rotY, 0);
      ringsGroup.add(mesh);
      ringMeshes.push({ mesh, speed: def.speed });
    });

    // Secondary left ambient ring
    const leftRingGeo = new THREE.TorusGeometry(8.0, 0.014, 16, 100);
    const leftRingMat = new THREE.MeshBasicMaterial({
      color: '#FF9F1C',
      transparent: true,
      opacity: 0.14,
    });
    const leftRing = new THREE.Mesh(leftRingGeo, leftRingMat);
    leftRing.position.set(-10, 4, -8);
    leftRing.rotation.set(-1.1, 0.5, 0.2);
    bgGroup.add(leftRing);

    // =========================================================================
    // MOUSE PARALLAX & RESIZE
    // =========================================================================
    let mouseX = 0;
    let mouseY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;

    const handleMouseMove = (e) => {
      targetMouseX = (e.clientX / window.innerWidth - 0.5) * 1.5;
      targetMouseY = (e.clientY / window.innerHeight - 0.5) * 1.5;
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // =========================================================================
    // RENDER LOOP
    // =========================================================================
    let animId;
    let lastTime = 0;

    const animate = (time) => {
      animId = requestAnimationFrame(animate);

      const delta = (time - lastTime) * 0.001 || 0.016;
      lastTime = time;

      // Smooth camera parallax
      mouseX += (targetMouseX - mouseX) * 0.04;
      mouseY += (targetMouseY - mouseY) * 0.04;

      camera.position.x = mouseX * 2.0;
      camera.position.y = -mouseY * 1.5;
      camera.lookAt(0, 0, 0);

      if (!reducedMotion) {
        // 1. Update Particle Positions & 2. Compute Neural Lines
        const posArray = nodeGeometry.attributes.position.array;
        let lineIdx = 0;
        let colorIdx = 0;
        let lineCount = 0;

        for (let i = 0; i < nodeCount; i++) {
          const v = nodeVelocities[i];
          const i3 = i * 3;

          posArray[i3] += v.vx;
          posArray[i3 + 1] += v.vy;
          posArray[i3 + 2] += v.vz;

          // Bounce off bounds smoothly
          if (posArray[i3] < -bounds.x || posArray[i3] > bounds.x) v.vx *= -1;
          if (posArray[i3 + 1] < -bounds.y || posArray[i3 + 1] > bounds.y) v.vy *= -1;
          if (posArray[i3 + 2] < -bounds.z || posArray[i3 + 2] > bounds.z) v.vz *= -1;

          // Check proximity to other nodes for neural network connection
          for (let j = i + 1; j < nodeCount; j++) {
            const j3 = j * 3;
            const dx = posArray[i3] - posArray[j3];
            const dy = posArray[i3 + 1] - posArray[j3 + 1];
            const dz = posArray[i3 + 2] - posArray[j3 + 2];
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (dist < maxDistance) {
              const alpha = (1.0 - dist / maxDistance) * 0.45;

              linePositions[lineIdx++] = posArray[i3];
              linePositions[lineIdx++] = posArray[i3 + 1];
              linePositions[lineIdx++] = posArray[i3 + 2];

              linePositions[lineIdx++] = posArray[j3];
              linePositions[lineIdx++] = posArray[j3 + 1];
              linePositions[lineIdx++] = posArray[j3 + 2];

              // Set alpha color intensity
              lineColors[colorIdx++] = baseColor.r * alpha;
              lineColors[colorIdx++] = baseColor.g * alpha;
              lineColors[colorIdx++] = baseColor.b * alpha;

              lineColors[colorIdx++] = baseColor.r * alpha;
              lineColors[colorIdx++] = baseColor.g * alpha;
              lineColors[colorIdx++] = baseColor.b * alpha;

              lineCount++;
            }
          }
        }

        nodeGeometry.attributes.position.needsUpdate = true;
        lineGeometry.setDrawRange(0, lineCount * 2);
        lineGeometry.attributes.position.needsUpdate = true;
        lineGeometry.attributes.color.needsUpdate = true;

        // 3. Rotate 3D Orbits
        ringMeshes.forEach((r) => {
          r.mesh.rotation.z += r.speed * delta;
        });
        leftRing.rotation.z -= 0.02 * delta;
        leftRing.rotation.y += 0.015 * delta;
      }

      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(animate);

    // =========================================================================
    // CLEANUP
    // =========================================================================
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);

      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });

      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  if (!hasWebGL) {
    return (
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-15"
        style={{
          backgroundImage: 'radial-gradient(#FF6B35 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
        aria-hidden="true"
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
      style={{
        opacity: 0.38,
        mixBlendMode: 'screen',
      }}
      aria-hidden="true"
    />
  );
};

export default AnimatedBackground3D;
