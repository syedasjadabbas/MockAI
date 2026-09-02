import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { CANDIDATE_IMAGES } from '../assets/images';

/**
 * Creates an ultra-high-resolution CanvasTexture for the 3D Assessment Panels
 */
function createAssessmentCardTexture({ title, value, subtext, statusColor = '#FF6B35', width = 1024, height = 512, hasCircle = false, circleVal = 91 }) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Background - Deep solid charcoal with subtle transparency
  ctx.fillStyle = '#181818';
  ctx.beginPath();
  ctx.roundRect(12, 12, width - 24, height - 24, 32);
  ctx.fill();

  // Distinct high-contrast border
  ctx.strokeStyle = '#383838';
  ctx.lineWidth = 6;
  ctx.stroke();

  // Top accent bar in Primary Orange
  ctx.strokeStyle = statusColor;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.roundRect(12, 12, width - 24, height - 24, 32);
  ctx.clip();
  ctx.beginPath();
  ctx.moveTo(12, 16);
  ctx.lineTo(160, 16);
  ctx.stroke();

  // Restore clip for content
  ctx.restore();

  if (hasCircle) {
    // Score circular meter on right
    const cx = width - 150;
    const cy = height / 2 + 10;
    const r = 90;
    // Track background
    ctx.strokeStyle = '#2A2A2A';
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    // Progress arc
    ctx.strokeStyle = statusColor;
    ctx.lineWidth = 16;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * (circleVal / 100)));
    ctx.stroke();
    // Inner percentage text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 54px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${circleVal}%`, cx, cy);
  }

  // Header Title (Uppercase, High Contrast Muted Grey)
  ctx.fillStyle = '#A3A3A3';
  ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(title.toUpperCase(), 60, 60);

  // Main Metric Value (Extra Large Crisp Pure White)
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 96px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(value, 60, 120);

  // Subtext / Tag + Progress Bar
  if (subtext) {
    ctx.fillStyle = statusColor;
    ctx.font = '600 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(subtext, 60, 260);

    const barWidth = width - (hasCircle ? 360 : 120);
    // Background track
    ctx.fillStyle = '#2E2E2E';
    ctx.beginPath();
    ctx.roundRect(60, 330, barWidth, 16, 8);
    ctx.fill();

    // Active progress fill
    ctx.fillStyle = statusColor;
    ctx.beginPath();
    ctx.roundRect(60, 330, barWidth * 0.88, 16, 8);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Creates high-resolution branding texture for the microphone body
 */
function createMicrophoneBrandTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Dark graphite background
  ctx.fillStyle = '#161616';
  ctx.fillRect(0, 0, 1024, 256);

  // "MOCK AI" Text Branding (Crisp bold typography)
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 76px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('MOCK AI', 512, 110);

  // Orange subtle indicator dot & rule
  ctx.fillStyle = '#FF6B35';
  ctx.beginPath();
  ctx.arc(330, 110, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FF6B35';
  ctx.fillRect(390, 175, 244, 8);

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Creates texture for microphone metal mesh capsule
 */
function createMeshGrilleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#1A1A1A';
  ctx.fillRect(0, 0, 64, 64);

  // Diamond weave pattern
  ctx.strokeStyle = '#3A3A3A';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = -64; i < 128; i += 8) {
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 64, 64);
    ctx.moveTo(i + 64, 0);
    ctx.lineTo(i, 64);
  }
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 16);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Interactive WebGL 3D Hero Scene for MockAI
 */
const HeroScene3D = () => {
  const containerRef = useRef(null);
  const [hasWebGL, setHasWebGL] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

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
    scene.background = new THREE.Color('#111111');
    scene.fog = new THREE.FogExp2('#111111', 0.045);

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 450;

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 1.2, 8.8);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    // --- Lighting ---
    const ambientLight = new THREE.AmbientLight('#262626', 1.8);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight('#FFFFFF', 2.5);
    keyLight.position.set(5, 8, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 25;
    keyLight.shadow.bias = -0.001;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight('#404040', 1.2);
    fillLight.position.set(-5, 3, -3);
    scene.add(fillLight);

    // Subtle orange rim & accent lights
    const orangePointLight = new THREE.PointLight('#FF6B35', 3.5, 12);
    orangePointLight.position.set(0, 0.5, 0);
    scene.add(orangePointLight);

    const goldRimLight = new THREE.PointLight('#FF9F1C', 2.0, 10);
    goldRimLight.position.set(-3, 2, -3);
    scene.add(goldRimLight);

    // --- Group Hierarchy ---
    const worldGroup = new THREE.Group();
    scene.add(worldGroup);

    const micAssembly = new THREE.Group();
    worldGroup.add(micAssembly);

    // Materials
    const graphiteMetalMat = new THREE.MeshStandardMaterial({
      color: '#1C1C1C',
      metalness: 0.88,
      roughness: 0.28,
    });

    const orangeAccentMat = new THREE.MeshStandardMaterial({
      color: '#FF6B35',
      emissive: '#FF6B35',
      emissiveIntensity: 0.45,
      metalness: 0.6,
      roughness: 0.2,
    });

    const goldAccentMat = new THREE.MeshStandardMaterial({
      color: '#FF9F1C',
      emissive: '#FF9F1C',
      emissiveIntensity: 0.35,
      metalness: 0.8,
      roughness: 0.25,
    });

    const grilleTexture = createMeshGrilleTexture();
    const grilleMat = new THREE.MeshStandardMaterial({
      color: '#222222',
      map: grilleTexture,
      metalness: 0.92,
      roughness: 0.35,
      bumpMap: grilleTexture,
      bumpScale: 0.04,
    });

    // --- Microphone Construction ---
    const micGroup = new THREE.Group();
    micAssembly.add(micGroup);
    micGroup.position.y = 0.35;

    // 1. Lower Body Cylinder with "MOCK AI" Branding
    const brandTexture = createMicrophoneBrandTexture();
    const bodyBrandMat = new THREE.MeshStandardMaterial({
      color: '#FFFFFF',
      map: brandTexture,
      metalness: 0.75,
      roughness: 0.3,
    });
    const lowerBodyGeo = new THREE.CylinderGeometry(0.55, 0.52, 1.25, 32);
    const lowerBody = new THREE.Mesh(lowerBodyGeo, bodyBrandMat);
    lowerBody.position.y = 0.2;
    lowerBody.castShadow = true;
    micGroup.add(lowerBody);

    // Body accent rings
    const ringGeo = new THREE.TorusGeometry(0.56, 0.025, 16, 48);
    const ringTop = new THREE.Mesh(ringGeo, orangeAccentMat);
    ringTop.rotation.x = Math.PI / 2;
    ringTop.position.y = 0.82;
    micGroup.add(ringTop);

    const ringMid = new THREE.Mesh(ringGeo, goldAccentMat);
    ringMid.rotation.x = Math.PI / 2;
    ringMid.position.y = -0.42;
    micGroup.add(ringMid);

    // 2. Upper Mesh Capsule
    const capsuleBodyGeo = new THREE.CylinderGeometry(0.53, 0.53, 1.1, 32);
    const capsuleBody = new THREE.Mesh(capsuleBodyGeo, grilleMat);
    capsuleBody.position.y = 1.38;
    capsuleBody.castShadow = true;
    micGroup.add(capsuleBody);

    const capsuleDomeGeo = new THREE.SphereGeometry(0.53, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const capsuleDome = new THREE.Mesh(capsuleDomeGeo, grilleMat);
    capsuleDome.position.y = 1.93;
    capsuleDome.castShadow = true;
    micGroup.add(capsuleDome);

    // Capsule rib bands (Studio frame)
    const ribGeo = new THREE.CylinderGeometry(0.54, 0.54, 0.04, 32);
    const rib1 = new THREE.Mesh(ribGeo, graphiteMetalMat);
    rib1.position.y = 1.38;
    micGroup.add(rib1);

    // 3. Shockmount Cradle
    const shockRingGeo = new THREE.TorusGeometry(0.85, 0.035, 16, 48);
    const shockRing1 = new THREE.Mesh(shockRingGeo, graphiteMetalMat);
    shockRing1.rotation.x = Math.PI / 2;
    shockRing1.position.y = 0.2;
    micGroup.add(shockRing1);

    const shockRing2 = new THREE.Mesh(shockRingGeo, graphiteMetalMat);
    shockRing2.rotation.x = Math.PI / 2;
    shockRing2.position.y = -0.15;
    micGroup.add(shockRing2);

    // Vertical shock struts
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const strutGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.5, 12);
      const strut = new THREE.Mesh(strutGeo, graphiteMetalMat);
      strut.position.set(Math.cos(angle) * 0.85, 0.025, Math.sin(angle) * 0.85);
      micGroup.add(strut);
    }

    // Elastic orange bands
    const bandMat = new THREE.MeshBasicMaterial({ color: '#FF6B35', wireframe: false });
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2 + Math.PI / 4;
      const bandGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.45, 8);
      const band = new THREE.Mesh(bandGeo, bandMat);
      band.position.set(Math.cos(angle) * 0.68, 0.025, Math.sin(angle) * 0.68);
      band.rotation.z = Math.PI / 6;
      micGroup.add(band);
    }

    // 4. Heavy Studio Pedestal / Base
    const pedestalGroup = new THREE.Group();
    micAssembly.add(pedestalGroup);

    const stemGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.4, 24);
    const stem = new THREE.Mesh(stemGeo, graphiteMetalMat);
    stem.position.y = -0.65;
    stem.castShadow = true;
    pedestalGroup.add(stem);

    // Pedestal disk base
    const baseGeo = new THREE.CylinderGeometry(1.6, 1.75, 0.22, 48);
    const baseMat = new THREE.MeshStandardMaterial({
      color: '#161616',
      metalness: 0.85,
      roughness: 0.35,
    });
    const pedestalBase = new THREE.Mesh(baseGeo, baseMat);
    pedestalBase.position.y = -1.45;
    pedestalBase.receiveShadow = true;
    pedestalBase.castShadow = true;
    pedestalGroup.add(pedestalBase);

    const baseRingGeo = new THREE.TorusGeometry(1.62, 0.025, 16, 64);
    const baseRing = new THREE.Mesh(baseRingGeo, orangeAccentMat);
    baseRing.rotation.x = Math.PI / 2;
    baseRing.position.y = -1.34;
    pedestalGroup.add(baseRing);

    // Dark reflection floor plane
    const floorGeo = new THREE.PlaneGeometry(30, 30);
    const floorMat = new THREE.MeshStandardMaterial({
      color: '#0D0D0D',
      metalness: 0.8,
      roughness: 0.4,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.56;
    floor.receiveShadow = true;
    scene.add(floor);

    // --- Concentric Audio Waveform Rings (Parametric animated) ---
    const waveformRings = [];
    const ringRadii = [1.8, 2.3, 2.85];

    ringRadii.forEach((radius, idx) => {
      const segments = 128;
      const points = [];
      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(theta) * radius, 0, Math.sin(theta) * radius));
      }
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({
        color: idx === 1 ? '#FF9F1C' : '#FF6B35',
        transparent: true,
        opacity: 0.7 - idx * 0.15,
        linewidth: 1.5,
      });
      const ringLine = new THREE.Line(lineGeo, lineMat);
      ringLine.position.y = 0.55 + idx * 0.15;
      ringLine.rotation.x = 0.2 + idx * 0.1;
      ringLine.rotation.z = -0.15 * idx;
      worldGroup.add(ringLine);
      waveformRings.push({ mesh: ringLine, radius, speed: 0.8 + idx * 0.4, basePoints: [...points] });
    });

    // Outer AI Neural Orbit Ring
    const neuralOrbitGeo = new THREE.TorusGeometry(3.4, 0.015, 16, 100);
    const neuralOrbitMat = new THREE.MeshBasicMaterial({
      color: '#FF6B35',
      transparent: true,
      opacity: 0.35,
    });
    const neuralOrbit = new THREE.Mesh(neuralOrbitGeo, neuralOrbitMat);
    neuralOrbit.rotation.x = Math.PI / 2.8;
    neuralOrbit.rotation.y = 0.3;
    worldGroup.add(neuralOrbit);

    // --- Floating Particle Cloud ---
    const particleCount = 75;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleSpeeds = [];

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 1.2 + Math.random() * 3.2;
      const y = -1.2 + Math.random() * 3.8;
      particlePositions[i * 3] = Math.cos(angle) * r;
      particlePositions[i * 3 + 1] = y;
      particlePositions[i * 3 + 2] = Math.sin(angle) * r;

      particleSpeeds.push({
        angle,
        r,
        y,
        angularSpeed: (0.1 + Math.random() * 0.3) * (Math.random() > 0.5 ? 1 : -1),
        yVel: (Math.random() - 0.5) * 0.005,
      });
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: '#FF9F1C',
      size: 0.055,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });
    const particleCloud = new THREE.Points(particleGeo, particleMat);
    worldGroup.add(particleCloud);

    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    brandTexture.anisotropy = maxAnisotropy;

    // --- 3D Assessment Floating Panels ---
    const cards = [
      {
        data: { title: 'Speech Clarity', value: '94%', subtext: 'Clear articulation' },
        pos: [-2.65, 1.35, 1.1],
        rot: [0.02, 0.14, -0.01],
        scale: [2.1, 1.05, 1],
        floatPhase: 0,
      },
      {
        data: { title: 'Pacing cadence', value: '135 wpm', subtext: 'Optimal tempo' },
        pos: [-2.5, -0.35, 1.3],
        rot: [-0.02, 0.12, 0.01],
        scale: [2.1, 1.05, 1],
        floatPhase: 1.8,
      },
      {
        data: { title: 'Evaluation', value: '91%', subtext: 'Composite Score', hasCircle: true, circleVal: 91 },
        pos: [2.65, 1.35, 1.1],
        rot: [0.02, -0.14, 0.01],
        scale: [2.1, 1.05, 1],
        floatPhase: 3.2,
      },
      {
        data: { title: 'Fluency Index', value: 'High', subtext: 'Low hesitation' },
        pos: [2.5, -0.35, 1.3],
        rot: [-0.02, -0.12, -0.01],
        scale: [2.1, 1.05, 1],
        floatPhase: 4.6,
      },
    ];

    const cardMeshes = [];
    cards.forEach((cfg) => {
      const cardTex = createAssessmentCardTexture(cfg.data);
      cardTex.anisotropy = maxAnisotropy;
      const cardGeo = new THREE.PlaneGeometry(1, 1);
      const cardMat = new THREE.MeshBasicMaterial({
        map: cardTex,
        transparent: true,
        opacity: 0.96,
        side: THREE.DoubleSide,
      });
      const cardMesh = new THREE.Mesh(cardGeo, cardMat);
      cardMesh.position.set(...cfg.pos);
      cardMesh.rotation.set(...cfg.rot);
      cardMesh.scale.set(...cfg.scale);

      worldGroup.add(cardMesh);
      cardMeshes.push({ mesh: cardMesh, basePos: [...cfg.pos], phase: cfg.floatPhase });
    });

    // --- Mouse Parallax Tracking ---
    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouse.targetX = nx * 0.45;
      mouse.targetY = ny * 0.3;
    };
    container.addEventListener('mousemove', handleMouseMove);

    // --- Resize Handling ---
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 600;
      const h = container.clientHeight || 450;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // --- Animation Render Loop ---
    let animId;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);

      const elapsed = clock.getElapsedTime();

      // Smooth camera damping
      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;

      camera.position.x = mouse.x * 0.9;
      camera.position.y = 1.2 + mouse.y * 0.6;
      camera.lookAt(0, 0.45, 0);

      if (!reducedMotion) {
        // Microphone continuous gentle rotation
        micGroup.rotation.y = elapsed * 0.22;

        // Orange point light gentle breathe
        orangePointLight.intensity = 3.0 + Math.sin(elapsed * 2.5) * 0.8;

        // Waveform rings parametric pulsation
        waveformRings.forEach((ring, idx) => {
          const posAttr = ring.mesh.geometry.attributes.position;
          const count = posAttr.count;
          for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const wave = Math.sin(angle * 6 + elapsed * ring.speed * 2.5) * 0.06;
            const r = ring.radius + wave;
            posAttr.setXYZ(i, Math.cos(angle) * r, Math.sin(angle * 4 + elapsed) * 0.04, Math.sin(angle) * r);
          }
          posAttr.needsUpdate = true;
          ring.mesh.rotation.y = elapsed * (0.08 + idx * 0.04);
        });

        // Neural orbit rotation
        neuralOrbit.rotation.z = elapsed * 0.12;

        // Floating particles orbital drift
        const positions = particleCloud.geometry.attributes.position.array;
        for (let i = 0; i < particleCount; i++) {
          const p = particleSpeeds[i];
          p.angle += p.angularSpeed * 0.015;
          p.y += p.yVel;
          if (p.y > 3.0) p.y = -1.0;
          if (p.y < -1.0) p.y = 3.0;

          positions[i * 3] = Math.cos(p.angle) * p.r;
          positions[i * 3 + 1] = p.y;
          positions[i * 3 + 2] = Math.sin(p.angle) * p.r;
        }
        particleCloud.geometry.attributes.position.needsUpdate = true;

        // Floating assessment panels subtle sway & bobbing
        cardMeshes.forEach((card) => {
          const bob = Math.sin(elapsed * 1.4 + card.phase) * 0.065;
          const tilt = Math.cos(elapsed * 1.1 + card.phase) * 0.02;
          card.mesh.position.y = card.basePos[1] + bob;
          card.mesh.rotation.z = tilt;
        });
      }

      renderer.render(scene, camera);
    };

    animate();
    setIsLoaded(true);

    // --- Cleanup on Unmount ---
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousemove', handleMouseMove);

      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => {
              if (m.map) m.map.dispose();
              m.dispose();
            });
          } else {
            if (obj.material.map) obj.material.map.dispose();
            obj.material.dispose();
          }
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
      <img
        src={CANDIDATE_IMAGES.dashboardHero}
        alt="MockAI 3D Microphone & AI Analysis Core"
        className="w-full h-full object-cover"
      />
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      <div ref={containerRef} className="w-full h-full" />
      {!isLoaded && (
        <div className="absolute inset-0 bg-[#111111] flex items-center justify-center">
          <span className="c-tech-annotation text-orange-400">[INITIALIZING 3D ENGINE...]</span>
        </div>
      )}
    </div>
  );
};

export default HeroScene3D;
