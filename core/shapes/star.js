// A thin 4-point star on its own three.js canvas. Import it in a module page after `window.THREE` and
// core/engine/page-api.js are loaded; core/shapes/README.md has the API.
import * as THREE from 'three';

const TIP = 100;
const WAIST = 14;
const STAR_D = `M0,${-TIP} Q${WAIST},${-WAIST} ${TIP},0 Q${WAIST},${WAIST} 0,${TIP} `
  + `Q${-WAIST},${WAIST} ${-TIP},0 Q${-WAIST},${-WAIST} 0,${-TIP} Z`;

const LOOKS = {
  glass: { preset: 'glass', tint: '#eef0f8', shade: 0.55, opts: { transmission: 0, transparent: true, opacity: 0.82, metalness: 0.1, roughness: 0.18, clearcoat: 1, iridescence: 0.7, envMapIntensity: 1.1 } },
  chrome: { preset: 'chrome', tint: '#c9cad2', shade: 0.4, opts: { metalness: 0.6, roughness: 0.3, envMapIntensity: 0.9 } },
  iridescent: { preset: 'iridescent', tint: '#c4b4ff', shade: 0.45, opts: { metalness: 0.5, roughness: 0.3, envMapIntensity: 0.9, iridescenceThicknessRange: [250, 900] } },
};

// A soft dark blot on each face: the darker concave centre of the reference star. The cap has only
// outline vertices, so a vertex colour cannot reach the middle; a gradient plane can.
function centreShade(unit, frontZ, strength) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const ramp = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  ramp.addColorStop(0, `rgba(8,8,24,${strength})`);
  ramp.addColorStop(1, 'rgba(8,8,24,0)');
  g.fillStyle = ramp;
  g.fillRect(0, 0, 128, 128);
  const map = new THREE.CanvasTexture(c);
  const shade = new THREE.Group();
  for (const side of [1, -1]) {
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(unit * 0.5, unit * 0.5),
      new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false }));
    plane.position.z = side * (frontZ + 0.002);
    plane.rotation.y = side === 1 ? 0 : Math.PI;
    shade.add(plane);
  }
  return shade;
}

export function createStar(canvas, { depth = 0.08, bevel = 0.02, look = 'glass', tint, shade } = {}) {
  const spec = LOOKS[look];
  if (!spec) throw new Error(`createStar: unknown look "${look}", one of: ${Object.keys(LOOKS).join(', ')}`);
  const w = canvas.width, h = canvas.height;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(w, h, false);
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-w / 2, w / 2, h / 2, -h / 2, -2000, 2000);
  window.vawe.three.studio(renderer, scene, null, 'metal');
  scene.background = null;

  const geometry = window.vawe.three.extrude(STAR_D, { depth, bevel });
  geometry.center();
  const material = window.vawe.three.material(spec.preset, { color: tint || spec.tint, ...spec.opts });
  const mesh = new THREE.Mesh(geometry, material);
  geometry.computeBoundingBox();
  const unit = geometry.boundingBox.max.x - geometry.boundingBox.min.x;
  mesh.add(centreShade(unit, geometry.boundingBox.max.z, shade ?? spec.shade));
  scene.add(mesh);

  function draw({ x = w / 2, y = h / 2, size = 0, spin = 0, tilt = 0, roll = 0, opacity = 1, blur = 0 } = {}) {
    mesh.visible = size > 0 && opacity > 0;
    mesh.position.set(x - w / 2, h / 2 - y, 0);
    mesh.scale.setScalar(size / unit);
    mesh.rotation.set(tilt, spin, roll);
    canvas.style.opacity = String(opacity);
    canvas.style.filter = blur > 0 ? `blur(${blur}px)` : 'none';
    renderer.render(scene, camera);
  }
  return { draw, mesh };
}
