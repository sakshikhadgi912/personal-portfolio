// Hero background: a flowing gradient shader plus glossy shapes that drift,
// follow the mouse, and float away as you scroll.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const GRADIENTS = {
  light: ['#ff4f8b', '#ff9a3c', '#8b5cf6', '#ffd23f'],
  dark: ['#6d1550', '#b4380f', '#2e1680', '#d0176a'],
};

const SHAPES = [
  { geo: () => new THREE.TorusGeometry(0.9, 0.36, 48, 128), color: '#ffffff', pos: [4.6, 1.5, 0] },
  { geo: () => new THREE.SphereGeometry(0.75, 64, 64), color: '#ffd23f', pos: [2.3, -2.2, 1.5] },
  { geo: () => new THREE.TorusKnotGeometry(0.62, 0.22, 200, 32), color: '#8b5cf6', pos: [6.3, -1.7, -2] },
  { geo: () => new THREE.CapsuleGeometry(0.42, 1.1, 16, 32), color: '#ff4f8b', pos: [-5.2, 2.6, -3] },
  { geo: () => new THREE.IcosahedronGeometry(0.8, 0), color: '#ff9a3c', pos: [1.0, 3.0, -4] },
  { geo: () => new THREE.SphereGeometry(0.45, 48, 48), color: '#ffffff', pos: [-2.2, 3.9, -7] },
];

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec2 uRes;
  uniform vec2 uMouse;
  uniform vec3 uC1, uC2, uC3, uC4;
  varying vec2 vUv;

  vec2 hash(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(dot(hash(i), f), dot(hash(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
               mix(dot(hash(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)), dot(hash(i + vec2(1.0)), f - vec2(1.0)), u.x), u.y);
  }

  void main() {
    vec2 p = vUv;
    p.x *= uRes.x / uRes.y;
    float t = uTime * 0.07;

    // Domain warping gives the slow, liquid flow.
    vec2 q = vec2(noise(p * 1.3 + t), noise(p * 1.3 - t + 3.1));
    vec2 r = vec2(noise(p * 1.7 + q * 1.8 + vec2(1.7, 9.2) + t * 1.3),
                  noise(p * 1.7 + q * 1.8 + vec2(8.3, 2.8) - t));
    r += (uMouse - 0.5) * 0.5;
    float n = noise(p * 1.1 + r * 1.6);

    vec3 col = mix(uC1, uC2, smoothstep(-0.45, 0.45, r.x));
    col = mix(col, uC3, smoothstep(-0.35, 0.55, r.y) * 0.85);
    col = mix(col, uC4, smoothstep(0.0, 0.6, n) * 0.55);

    float grain = fract(sin(dot(vUv * uRes, vec2(12.9898, 78.233))) * 43758.5453);
    col += (grain - 0.5) * 0.035;
    gl_FragColor = vec4(col, 1.0);
  }
`;

// Raw sRGB values: the shader writes straight to the canvas without color conversion.
function hexToVec3(hex) {
  const n = parseInt(hex.slice(1), 16);
  return new THREE.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

function isDark() {
  const theme = document.documentElement.dataset.theme;
  return theme ? theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
}

export function initScene(canvas, { reduceMotion }) {
  const hero = canvas.parentElement;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.z = 12;

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  sun.position.set(5, 6, 5);
  scene.add(sun);

  const uniforms = {
    uTime: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) },
    uMouse: { value: new THREE.Vector2(0.5, 0.5) },
    uC1: { value: new THREE.Vector3() },
    uC2: { value: new THREE.Vector3() },
    uC3: { value: new THREE.Vector3() },
    uC4: { value: new THREE.Vector3() },
  };
  const background = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, depthTest: false, depthWrite: false })
  );
  background.frustumCulled = false;
  background.renderOrder = -1;
  scene.add(background);

  const group = new THREE.Group();
  scene.add(group);
  const meshes = SHAPES.map((s, i) => {
    const mesh = new THREE.Mesh(s.geo(), new THREE.MeshPhysicalMaterial({
      color: s.color,
      roughness: 0.18,
      metalness: 0.05,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
      iridescence: 0.5,
      iridescenceIOR: 1.3,
    }));
    mesh.userData = {
      home: s.pos,
      rx: 0.15 + (i % 3) * 0.08,
      ry: 0.2 + (i % 2) * 0.12,
      freq: 0.6 + i * 0.13,
      phase: i * 1.7,
    };
    group.add(mesh);
    return mesh;
  });

  function applyTheme() {
    const colors = GRADIENTS[isDark() ? 'dark' : 'light'];
    ['uC1', 'uC2', 'uC3', 'uC4'].forEach((key, i) => uniforms[key].value.copy(hexToVec3(colors[i])));
    if (!running) frame();
  }

  // Keep shapes around the edges so the text stays readable, especially on phones.
  function layout(aspect) {
    const portrait = aspect < 1;
    const xScale = Math.max(Math.min(1, aspect / 1.6), 0.35);
    meshes.forEach((m) => {
      const [x, y, z] = m.userData.home;
      m.userData.baseY = portrait ? y * 0.25 + 2.6 : y;
      m.position.set(x * xScale, m.userData.baseY, z);
      m.scale.setScalar(portrait ? 0.5 : 1);
    });
  }

  const mouse = new THREE.Vector2();
  const smoothMouse = new THREE.Vector2();
  window.addEventListener('pointermove', (e) => {
    mouse.set((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
  });

  const clock = new THREE.Clock();
  function frame() {
    const t = reduceMotion ? 0 : clock.getElapsedTime();
    const scroll = Math.min(1, window.scrollY / Math.max(1, hero.offsetHeight));
    smoothMouse.lerp(mouse, 0.05);

    uniforms.uTime.value = t;
    uniforms.uMouse.value.set(smoothMouse.x * 0.5 + 0.5, smoothMouse.y * 0.5 + 0.5);

    meshes.forEach((m) => {
      const d = m.userData;
      m.rotation.x = t * d.rx + scroll * 2.5;
      m.rotation.y = t * d.ry + scroll * 1.5;
      m.position.y = d.baseY + Math.sin(t * d.freq + d.phase) * 0.25;
    });
    group.rotation.y = smoothMouse.x * 0.25;
    group.rotation.x = -smoothMouse.y * 0.15;
    group.position.y = scroll * 3.5;

    renderer.render(scene, camera);
  }

  let running = false;
  function loop() {
    if (!running) return;
    frame();
    requestAnimationFrame(loop);
  }
  function setRunning(on) {
    if (reduceMotion || on === running) return;
    running = on;
    if (on) loop();
  }

  function resize() {
    const w = hero.clientWidth;
    const h = hero.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    uniforms.uRes.value.set(w, h);
    layout(w / h);
    if (!running) frame();
  }

  new ResizeObserver(resize).observe(hero);
  new IntersectionObserver(([entry]) => setRunning(entry.isIntersecting)).observe(hero);
  window.addEventListener('themechange', applyTheme);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

  applyTheme();
  resize();
  hero.classList.add('has-scene');
}
