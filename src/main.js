import './styles.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

const canvas = document.querySelector('#avatar-canvas');
const loadingScreen = document.querySelector('[data-loading-screen]');
const loadingStatus = document.querySelector('[data-loading-status]');
const loadingBar = document.querySelector('[data-loading-bar]');
const loadingPercent = document.querySelector('[data-loading-percent]');
const navButtons = [...document.querySelectorAll('[data-shot-nav]')];
const heroCopy = document.querySelector('.hero-copy');
const pagePanels = [...document.querySelectorAll('[data-page-panel]')];
const aboutScreens = [...document.querySelectorAll('[data-about-screen]')];
const aboutPanel = document.querySelector('.about-panel');
const aboutScreenButtons = [...document.querySelectorAll('[data-about-target]')];
const experienceScreens = [...document.querySelectorAll('[data-experience-screen]')];
const experiencePanel = document.querySelector('.experience-panel');
const experienceScreenButtons = [...document.querySelectorAll('[data-experience-target]')];
const portfolioScreens = [...document.querySelectorAll('[data-portfolio-screen]')];
const portfolioPanel = document.querySelector('.portfolio-panel');
const portfolioScreenButtons = [...document.querySelectorAll('[data-portfolio-target]')];
const portfolioVideos = [...document.querySelectorAll('.portfolio-panel video')];
const posterGalleries = [...document.querySelectorAll('.poster-gallery')];
const homepageScreens = [...document.querySelectorAll('[data-homepage-screen]')];
const homepagePanel = document.querySelector('.homepage-panel');
const homepageScreenButtons = [...document.querySelectorAll('[data-homepage-target]')];
const homepageViewers = [...document.querySelectorAll('[data-homepage-viewer]')];
const otherScreens = [...document.querySelectorAll('[data-other-screen]')];
const otherPanel = document.querySelector('.other-panel');
const otherScreenButtons = [...document.querySelectorAll('[data-other-target]')];
const otherCardDecks = [...document.querySelectorAll('.other-card-deck')];
const contactHomeButton = document.querySelector('[data-contact-home]');
const imageLightbox = document.querySelector('[data-image-lightbox]');
const lightboxImage = document.querySelector('[data-lightbox-image]');
const lightboxCaption = document.querySelector('[data-lightbox-caption]');
const lightboxCloseButton = document.querySelector('[data-lightbox-close]');
const lightboxTargets = [...document.querySelectorAll('.poster-preview img, .homepage-viewer img, .icon-showcase img, .other-card-deck img, .wide-work-scroll img')];
const finePointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
const calibrationPanel = document.querySelector('.calibration-panel');
const saveShotButton = document.querySelector('[data-save-shot]');
const copyShotsButton = document.querySelector('[data-copy-shots]');
const resetShotsButton = document.querySelector('[data-reset-shots]');
const shotOutput = document.querySelector('[data-shot-output]');
const copyAdjustButtons = [...document.querySelectorAll('[data-copy-adjust]')];
const confirmCopyButton = document.querySelector('[data-copy-confirm]');
const resetCopyButton = document.querySelector('[data-copy-reset]');
const publicAsset = (path) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
const officeSceneModelPath = publicAsset('office-avatar-v5.glb');
const bookcaseModelPath = publicAsset('office-bookcase-v4.glb');
const createModelLoader = () => {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  return loader;
};
const bookcaseMoveButtons = [...document.querySelectorAll('[data-bookcase-move]')];
const bookcaseStepButtons = [...document.querySelectorAll('[data-bookcase-step]')];
const resetBookcaseButton = document.querySelector('[data-bookcase-reset]');
const confirmBookcaseButton = document.querySelector('[data-bookcase-confirm]');
const copyBookcaseButton = document.querySelector('[data-bookcase-copy]');
const bookcaseOutput = document.querySelector('[data-bookcase-output]');

function installImageRecovery() {
  const retryImage = (image) => {
    if (!(image instanceof HTMLImageElement) || image.dataset.retryAttempted === 'true') return;
    image.dataset.retryAttempted = 'true';
    const failedSource = image.currentSrc || image.src;
    if (!failedSource) return;
    window.setTimeout(() => {
      image.closest('picture')?.querySelectorAll('source').forEach((source) => source.remove());
      const retryUrl = new URL(failedSource, window.location.href);
      retryUrl.searchParams.set('retry', Date.now().toString(36));
      image.src = retryUrl.href;
    }, 650);
  };

  document.addEventListener('error', (event) => retryImage(event.target), true);
  window.addEventListener('load', () => {
    document.querySelectorAll('img').forEach((image) => {
      if (image.complete && image.naturalWidth === 0) retryImage(image);
    });
  }, { once: true });
}

installImageRecovery();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf4f6f5);
let cameraFillLight = null;

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  powerPreference: 'high-performance',
});
// Keep the full-screen scene crisp without rendering tens of millions of
// pixels per frame on high-resolution displays.
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.localClippingEnabled = true;

const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
camera.position.set(2.7, 0.2, 8.2);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.enableRotate = false;
controls.enableZoom = false;
controls.enablePan = false;
controls.minDistance = 0.55;
controls.maxDistance = 30;
controls.minPolarAngle = Math.PI * 0.18;
controls.maxPolarAngle = Math.PI * 0.82;
controls.target.set(0, 0, 0);
controls.autoRotate = false;
controls.autoRotateSpeed = 0.32;

const clock = new THREE.Clock();
let cameraPreset = '';
let shotIndex = 0;
let aboutScreenIndex = 0;
let experienceScreenIndex = 0;
let portfolioScreenIndex = 0;
let homepageScreenIndex = 0;
let otherScreenIndex = 0;
let transition = null;
let animatedHead = null;
let animatedHeadBase = null;
let animationMixer = null;
let previousElapsed = 0;
let bookcaseRoot = null;
let bookcaseStepMode = 'normal';
const pointerState = {
  x: 0,
  y: 0,
  time: 0,
  primary: false,
};
const deg = THREE.MathUtils.degToRad;
const bookcaseStepSizes = {
  fine: { move: 0.05, rotate: deg(2), scale: 0.025 },
  normal: { move: 0.16, rotate: deg(6), scale: 0.07 },
  broad: { move: 0.45, rotate: deg(15), scale: 0.16 },
};
const defaultBookcaseTransform = {
  position: [-1.73, -2.18, -5.81],
  rotationY: 0.454,
  scale: 1.84,
};
const bookcaseTransform = {
  position: [...defaultBookcaseTransform.position],
  rotationY: defaultBookcaseTransform.rotationY,
  scale: defaultBookcaseTransform.scale,
};
const heroCopyAnchor = new THREE.Vector3();
const heroCopyProjection = new THREE.Vector3();
const heroCopyRayPoint = new THREE.Vector3();
const heroCopyHomeCamera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
const heroCopyHomeTarget = new THREE.Vector3();
let heroCopyAnchorSignature = '';
let heroCopyHomeDistance = 1;
const defaultHeroCopyTransform = { x: 96, y: 0, scale: 0.8 };
const heroCopyTransform = { ...defaultHeroCopyTransform };

const storyboardShots = {
  desktop: [
    {
      camera: [0.835, 6.037, 18.686],
      target: [-4.384, 1.226, 0.443],
      duration: 1180,
    },
    {
      camera: [1.831, 4.927, 17.34],
      target: [6.613, 1.113, 1.298],
      duration: 1280,
    },
    {
      camera: [2.396, 1.002, 4.365],
      target: [-0.232, 0.301, -0.114],
      duration: 1200,
    },
    {
      camera: [2.583, 20.028, 10.576],
      target: [5.791, 0.983, -1.077],
      duration: 1420,
    },
    {
      camera: [0.022, 7.691, 10.138],
      target: [4.521, 2.15, -1.142],
      duration: 1320,
    },
    {
      camera: [5.595, 3.384, 4.662],
      target: [0.623, 0.891, 1.431],
      duration: 1160,
    },
    {
      camera: [-0.543, 4.732, 4.753],
      target: [1.062, 0.481, -0.752],
      duration: 1300,
    },
  ],
  mobile: [
    {
      camera: [0.835, 6.037, 18.686],
      target: [-4.384, 1.226, 0.443],
      duration: 1180,
    },
    {
      camera: [1.831, 4.927, 17.34],
      target: [6.613, 1.113, 1.298],
      duration: 1280,
    },
    {
      camera: [2.396, 1.002, 4.365],
      target: [-0.232, 0.301, -0.114],
      duration: 1200,
    },
    {
      camera: [2.583, 20.028, 10.576],
      target: [5.791, 0.983, -1.077],
      duration: 1420,
    },
    {
      camera: [0.022, 7.691, 10.138],
      target: [4.521, 2.15, -1.142],
      duration: 1320,
    },
    {
      camera: [5.595, 3.384, 4.662],
      target: [0.623, 0.891, 1.431],
      duration: 1160,
    },
    {
      camera: [-0.543, 4.732, 4.753],
      target: [1.062, 0.481, -0.752],
      duration: 1300,
    },
  ],
};

const defaultStoryboardShots = cloneShots(storyboardShots);
updateBookcaseStepState();
renderBookcaseOutput();

const urlShot = Number.parseInt(new URLSearchParams(window.location.search).get('shot') ?? '', 10);
if (Number.isInteger(urlShot)) {
  shotIndex = THREE.MathUtils.euclideanModulo(urlShot - 1, storyboardShots.desktop.length);
}
updateNavState();
updatePagePanels();
setAboutScreen(0);
setExperienceScreen(0);
setPortfolioScreen(0);
setHomepageScreen(0);
setOtherScreen(0);
renderShotOutput();

navButtons.forEach((button) => {
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    const nextIndex = Number(button.dataset.shotNav);
    if (Number.isInteger(nextIndex)) {
      if (nextIndex === 1) {
        setAboutScreen(0);
      }
      if (nextIndex === 2) {
        setExperienceScreen(0);
      }
      if (nextIndex === 3) {
        setPortfolioScreen(0);
      }
      if (nextIndex === 4) {
        setHomepageScreen(0);
      }
      if (nextIndex === 5) {
        setOtherScreen(0);
      }
      transitionToShot(nextIndex);
    }
  });
});

aboutPanel?.addEventListener('click', (event) => {
  if (shotIndex !== 1 || event.target.closest('a, button, input, textarea, select')) {
    return;
  }
  advancePage();
});

experiencePanel?.addEventListener('click', (event) => {
  if (shotIndex !== 2 || event.target.closest('a, button, input, textarea, select')) {
    return;
  }
  advancePage();
});

aboutScreenButtons.forEach((button) => {
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    setAboutScreen(Number(button.dataset.aboutTarget));
  });
});

experienceScreenButtons.forEach((button) => {
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    setExperienceScreen(Number(button.dataset.experienceTarget));
  });
});

portfolioPanel?.addEventListener('click', (event) => {
  if (shotIndex !== 3 || event.target.closest('video, button, a, input, textarea, select, .poster-card')) {
    return;
  }
  advancePage();
});

portfolioScreenButtons.forEach((button) => {
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    setPortfolioScreen(Number(button.dataset.portfolioTarget));
  });
});

homepagePanel?.addEventListener('click', (event) => {
  if (shotIndex !== 4 || event.target.closest('button, a, input, textarea, select, .homepage-viewer')) return;
  advancePage();
});

homepageScreenButtons.forEach((button) => {
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    setHomepageScreen(Number(button.dataset.homepageTarget));
  });
});

otherPanel?.addEventListener('click', (event) => {
  if (shotIndex !== 5 || event.target.closest('button, a, input, textarea, select, .wide-work-scroll, figure')) return;
  advancePage();
});

otherScreenButtons.forEach((button) => {
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    setOtherScreen(Number(button.dataset.otherTarget));
  });
});

contactHomeButton?.addEventListener('click', (event) => {
  event.stopPropagation();
  transitionToShot(0);
});

function closeImageLightbox() {
  imageLightbox?.classList.remove('is-open');
  imageLightbox?.classList.remove('is-long-image');
  imageLightbox?.setAttribute('aria-hidden', 'true');
  if (lightboxImage) lightboxImage.removeAttribute('src');
}

let lightboxTargetIndex = 0;
let lightboxSwipeStartX = 0;

function openImageLightbox(index) {
  const image = lightboxTargets[index];
  if (!imageLightbox || !lightboxImage || !image) return;
  lightboxTargetIndex = THREE.MathUtils.euclideanModulo(index, lightboxTargets.length);
  lightboxImage.src = image.currentSrc || image.src;
  lightboxImage.alt = image.alt || '作品大图';
  if (lightboxCaption) lightboxCaption.textContent = `${image.alt || '作品大图'} · 左右滑动切换`;
  imageLightbox.classList.toggle('is-long-image', Boolean(image.closest('.homepage-viewer')));
  imageLightbox.classList.add('is-open');
  imageLightbox.setAttribute('aria-hidden', 'false');
}

lightboxTargets.forEach((image, index) => {
  image.addEventListener('click', (event) => {
    event.stopPropagation();
    if (finePointerQuery.matches) return;
    openImageLightbox(index);
  });
});

posterGalleries.forEach((gallery) => {
  const previewImage = gallery.querySelector('.poster-preview img');
  const previewCaption = gallery.querySelector('.poster-preview figcaption');
  const thumbnails = [...gallery.querySelectorAll('[data-poster-src]')];

  const selectPoster = (button) => {
    if (!previewImage || !button) return;
    const thumbnailImage = button.querySelector('img');
    previewImage.src = thumbnailImage?.currentSrc || thumbnailImage?.src || button.dataset.posterSrc;
    previewImage.alt = button.dataset.posterAlt || '海报作品';
    if (previewCaption) previewCaption.textContent = button.dataset.posterLabel || '';
    thumbnails.forEach((thumbnail) => {
      const active = thumbnail === button;
      thumbnail.classList.toggle('is-active', active);
      thumbnail.setAttribute('aria-pressed', String(active));
    });
  };

  thumbnails.forEach((button) => {
    button.addEventListener('pointerenter', () => {
      if (finePointerQuery.matches) selectPoster(button);
    });
    button.addEventListener('click', () => selectPoster(button));
  });
});

otherCardDecks.forEach((deck) => {
  const cards = [...deck.querySelectorAll('figure')];
  deck.addEventListener('pointermove', (event) => {
    if (!finePointerQuery.matches) return;
    const rect = deck.getBoundingClientRect();
    const progress = THREE.MathUtils.clamp((event.clientX - rect.left) / Math.max(rect.width, 1), 0, 0.999);
    const focusedIndex = Math.floor(progress * cards.length);
    deck.classList.add('has-focus');
    cards.forEach((card, index) => card.classList.toggle('is-focused', index === focusedIndex));
  }, { passive: true });
  deck.addEventListener('pointerleave', () => {
    deck.classList.remove('has-focus');
    cards.forEach((card) => card.classList.remove('is-focused'));
  });
});

lightboxCloseButton?.addEventListener('click', closeImageLightbox);
imageLightbox?.addEventListener('click', (event) => {
  if (event.target === imageLightbox) closeImageLightbox();
});
imageLightbox?.addEventListener('touchstart', (event) => {
  if (event.touches.length === 1) lightboxSwipeStartX = event.touches[0].clientX;
}, { passive: true });
imageLightbox?.addEventListener('touchend', (event) => {
  if (!imageLightbox.classList.contains('is-open') || imageLightbox.classList.contains('is-long-image')) return;
  const endX = event.changedTouches[0]?.clientX ?? lightboxSwipeStartX;
  const distance = endX - lightboxSwipeStartX;
  if (Math.abs(distance) < 55) return;
  openImageLightbox(lightboxTargetIndex + (distance < 0 ? 1 : -1));
}, { passive: true });
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && imageLightbox?.classList.contains('is-open')) closeImageLightbox();
});

homepageViewers.forEach((viewer) => {
  const progressLabel = viewer.closest('.homepage-screen')?.querySelector('[data-homepage-progress]');
  viewer.addEventListener('click', (event) => event.stopPropagation());
  viewer.addEventListener('scroll', () => {
    const scrollRange = Math.max(viewer.scrollHeight - viewer.clientHeight, 1);
    const progress = Math.round((viewer.scrollTop / scrollRange) * 100);
    if (progressLabel) progressLabel.textContent = `向下滑动浏览 · ${progress}%`;
  }, { passive: true });
});

let homepageAutoScrollFrame = 0;
let homepageAutoScrollTime = performance.now();
const homepageLoopPauses = new WeakMap();

function autoScrollHomepage(timestamp) {
  const delta = Math.min(timestamp - homepageAutoScrollTime, 40);
  homepageAutoScrollTime = timestamp;
  const activeViewer = homepageScreens[homepageScreenIndex]?.querySelector('[data-homepage-viewer]');

  if (shotIndex === 4 && activeViewer && !activeViewer.matches(':hover')) {
    const maxScroll = activeViewer.scrollHeight - activeViewer.clientHeight;
    const pauseUntil = homepageLoopPauses.get(activeViewer) || 0;
    if (maxScroll > 0 && timestamp >= pauseUntil) {
      if (activeViewer.scrollTop >= maxScroll - 1) {
        activeViewer.scrollTop = 0;
        homepageLoopPauses.set(activeViewer, timestamp + 1400);
      } else {
        activeViewer.scrollTop = Math.min(maxScroll, activeViewer.scrollTop + delta * 0.018);
      }
    }
  }

  homepageAutoScrollFrame = requestAnimationFrame(autoScrollHomepage);
}

homepageAutoScrollFrame = requestAnimationFrame(autoScrollHomepage);

calibrationPanel?.addEventListener('pointerdown', (event) => {
  event.stopPropagation();
});

calibrationPanel?.addEventListener('pointerup', (event) => {
  event.stopPropagation();
});

calibrationPanel?.addEventListener('click', (event) => {
  event.stopPropagation();
});

saveShotButton?.addEventListener('click', (event) => {
  event.stopPropagation();
  saveCurrentShot();
});

copyShotsButton?.addEventListener('click', (event) => {
  event.stopPropagation();
  copyCurrentShots();
});

resetShotsButton?.addEventListener('click', (event) => {
  event.stopPropagation();
  resetStoredShots();
});

copyAdjustButtons.forEach((button) => {
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    adjustHeroCopy(button.dataset.copyAdjust);
  });
});

confirmCopyButton?.addEventListener('click', (event) => {
  event.stopPropagation();
  persistHeroCopyTransform();
  flashButton(confirmCopyButton, '已确定');
});

resetCopyButton?.addEventListener('click', (event) => {
  event.stopPropagation();
  Object.assign(heroCopyTransform, defaultHeroCopyTransform);
  updateHeroCopy();
  persistHeroCopyTransform();
  flashButton(resetCopyButton, '已重置');
});

bookcaseMoveButtons.forEach((button) => {
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    moveBookcase(button.dataset.bookcaseMove);
  });
});

bookcaseStepButtons.forEach((button) => {
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    bookcaseStepMode = button.dataset.bookcaseStep || 'normal';
    updateBookcaseStepState();
  });
});

resetBookcaseButton?.addEventListener('click', (event) => {
  event.stopPropagation();
  resetBookcaseTransform();
});

confirmBookcaseButton?.addEventListener('click', (event) => {
  event.stopPropagation();
  persistBookcaseTransform();
  flashButton(confirmBookcaseButton, '已确定');
});

copyBookcaseButton?.addEventListener('click', (event) => {
  event.stopPropagation();
  copyBookcaseTransform();
});

renderer.domElement.addEventListener('pointerdown', (event) => {
  if (event.button !== 0) {
    return;
  }

  pointerState.x = event.clientX;
  pointerState.y = event.clientY;
  pointerState.time = performance.now();
  pointerState.primary = true;
  controls.autoRotate = false;
});

renderer.domElement.addEventListener('pointerup', (event) => {
  if (!pointerState.primary || event.button !== 0) {
    return;
  }

  pointerState.primary = false;
  const dx = event.clientX - pointerState.x;
  const dy = event.clientY - pointerState.y;
  const distance = Math.hypot(dx, dy);
  const elapsed = performance.now() - pointerState.time;

  if (distance <= 8 && elapsed <= 520) {
    advancePage();
  }
});

renderer.domElement.addEventListener('pointercancel', () => {
  pointerState.primary = false;
});

window.addEventListener('dblclick', (event) => {
  event.preventDefault();
  controls.autoRotate = false;
});

let wheelNavigationLockedUntil = 0;

window.addEventListener('wheel', (event) => {
  if (Math.abs(event.deltaY) < 24 || event.target.closest('video, input, textarea, select')) return;

  const scrollRegion = event.target.closest('.homepage-viewer, .panel-inner');
  if (scrollRegion) {
    const maxScroll = scrollRegion.scrollHeight - scrollRegion.clientHeight;
    const canScrollDown = event.deltaY > 0 && scrollRegion.scrollTop < maxScroll - 2;
    const canScrollUp = event.deltaY < 0 && scrollRegion.scrollTop > 2;
    if (canScrollDown || canScrollUp) return;
  }

  event.preventDefault();
  const now = performance.now();
  if (transition || now < wheelNavigationLockedUntil) return;
  wheelNavigationLockedUntil = now + 720;

  if (event.deltaY > 0) {
    if (shotIndex < getShots().length - 1) advancePage();
  } else {
    retreatPage();
  }
}, { passive: false });


function getHeroCopyStorageKey() {
  return `office-avatar-hero-copy:${officeSceneModelPath}`;
}

function loadHeroCopyTransform() {
  try {
    const saved = JSON.parse(localStorage.getItem(getHeroCopyStorageKey()) || 'null');
    if (!saved) {
      return { ...defaultHeroCopyTransform };
    }
    return {
      x: Number(saved.x) || 0,
      y: Number(saved.y) || 0,
      scale: THREE.MathUtils.clamp(Number(saved.scale) || 1, 0.5, 1.8),
    };
  } catch {
    return { ...defaultHeroCopyTransform };
  }
}

function persistHeroCopyTransform() {
  try {
    localStorage.setItem(getHeroCopyStorageKey(), JSON.stringify(heroCopyTransform));
  } catch {
    // The in-memory values remain available for the current calibration session.
  }
  renderShotOutput();
}

function adjustHeroCopy(action) {
  switch (action) {
    case 'left':
      heroCopyTransform.x -= 12;
      break;
    case 'right':
      heroCopyTransform.x += 12;
      break;
    case 'up':
      heroCopyTransform.y -= 12;
      break;
    case 'down':
      heroCopyTransform.y += 12;
      break;
    case 'smaller':
      heroCopyTransform.scale = THREE.MathUtils.clamp(heroCopyTransform.scale - 0.05, 0.5, 1.8);
      break;
    case 'larger':
      heroCopyTransform.scale = THREE.MathUtils.clamp(heroCopyTransform.scale + 0.05, 0.5, 1.8);
      break;
    default:
      return;
  }
  updateHeroCopy();
  renderShotOutput();
}

function cssColor(hex) {
  return `#${hex.toString(16).padStart(6, '0')}`;
}

function makeFabricTexture(base, line, accent) {
  const size = 160;
  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = size;
  textureCanvas.height = size;
  const ctx = textureCanvas.getContext('2d');
  ctx.fillStyle = cssColor(base);
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = cssColor(line);
  ctx.globalAlpha = 0.24;
  ctx.lineWidth = 1;
  for (let i = -size; i < size * 2; i += 11) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + size, size);
    ctx.stroke();
  }

  ctx.strokeStyle = cssColor(accent);
  ctx.globalAlpha = 0.13;
  for (let i = 0; i < size; i += 22) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i + 14);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.2, 2.15);
  return texture;
}

function makeKnitTexture() {
  const size = 192;
  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = size;
  textureCanvas.height = size;
  const ctx = textureCanvas.getContext('2d');
  ctx.fillStyle = '#4a4946';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = '#686660';
  ctx.lineWidth = 5;
  ctx.globalAlpha = 0.58;

  for (let x = -12; x < size + 16; x += 18) {
    ctx.beginPath();
    for (let y = 0; y <= size; y += 8) {
      const wave = Math.sin(y * 0.18) * 4;
      if (y === 0) {
        ctx.moveTo(x + wave, y);
      } else {
        ctx.lineTo(x + wave, y);
      }
    }
    ctx.stroke();
  }

  ctx.strokeStyle = '#353431';
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.34;
  for (let y = 8; y < size; y += 18) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y + 7);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.4, 1.3);
  return texture;
}

const fabricTexture = makeFabricTexture(0xa7a7a0, 0x7f807b, 0xd0d0ca);
const knitTexture = makeKnitTexture();

const materials = {
  skin: new THREE.MeshStandardMaterial({
    color: 0xefb28b,
    roughness: 0.5,
    metalness: 0.02,
  }),
  skinWarm: new THREE.MeshStandardMaterial({
    color: 0xf2bd9a,
    roughness: 0.54,
    metalness: 0.02,
  }),
  blush: new THREE.MeshStandardMaterial({
    color: 0xea8c83,
    roughness: 0.75,
    transparent: true,
    opacity: 0.45,
  }),
  hair: new THREE.MeshStandardMaterial({
    color: 0x17110d,
    roughness: 0.62,
  }),
  hairLight: new THREE.MeshStandardMaterial({
    color: 0x2c1b10,
    roughness: 0.66,
  }),
  knit: new THREE.MeshStandardMaterial({
    color: 0x514f4b,
    map: knitTexture,
    roughness: 0.93,
  }),
  jacket: new THREE.MeshStandardMaterial({
    color: 0xb4b4ae,
    map: fabricTexture,
    roughness: 0.91,
  }),
  jacketShadow: new THREE.MeshStandardMaterial({
    color: 0x85857e,
    roughness: 0.88,
  }),
  jacketDeep: new THREE.MeshStandardMaterial({
    color: 0x777771,
    roughness: 0.9,
  }),
  shirt: new THREE.MeshStandardMaterial({
    color: 0xf7f4ed,
    roughness: 0.73,
  }),
  pants: new THREE.MeshStandardMaterial({
    color: 0xa1a29c,
    map: fabricTexture,
    roughness: 0.88,
  }),
  shoe: new THREE.MeshStandardMaterial({
    color: 0x202329,
    roughness: 0.56,
  }),
  sole: new THREE.MeshStandardMaterial({
    color: 0xf3eee5,
    roughness: 0.78,
  }),
  lens: new THREE.MeshPhysicalMaterial({
    color: 0x0f1014,
    roughness: 0.12,
    metalness: 0.08,
    transparent: true,
    opacity: 0.84,
    transmission: 0.08,
  }),
  frame: new THREE.MeshStandardMaterial({
    color: 0x0d0e11,
    roughness: 0.32,
    metalness: 0.16,
  }),
  eye: new THREE.MeshStandardMaterial({ color: 0xfffbf4, roughness: 0.32 }),
  iris: new THREE.MeshStandardMaterial({ color: 0x251811, roughness: 0.4 }),
  mouth: new THREE.MeshStandardMaterial({ color: 0x642524, roughness: 0.48 }),
  teeth: new THREE.MeshStandardMaterial({ color: 0xfff4e6, roughness: 0.36 }),
  stubble: new THREE.MeshStandardMaterial({
    color: 0x4f352c,
    roughness: 0.7,
    transparent: true,
    opacity: 0.55,
  }),
  lace: new THREE.MeshStandardMaterial({
    color: 0xf4ede3,
    roughness: 0.68,
  }),
  glint: new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.18,
    transparent: true,
    opacity: 0.58,
  }),
  metal: new THREE.MeshStandardMaterial({
    color: 0xc7bdae,
    roughness: 0.25,
    metalness: 0.68,
  }),
};

const geometries = {
  sphere: new THREE.SphereGeometry(1, 64, 48),
};

function roundedBox(width, height, depth, radius, smoothness = 8) {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;

  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);

  return new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: smoothness,
    steps: 1,
    bevelSize: radius * 0.42,
    bevelThickness: radius * 0.48,
  }).center();
}

function addMesh(group, geometry, material, position, scale, rotation) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(position[0], position[1], position[2]);
  mesh.scale.set(scale[0], scale[1], scale[2]);
  if (rotation) {
    mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
  }
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function addOval(group, material, position, scale, rotation) {
  return addMesh(group, geometries.sphere, material, position, scale, rotation);
}

function capsuleBetween(group, start, end, radius, material, scale = [1, 1], segments = 26) {
  const from = new THREE.Vector3(...start);
  const to = new THREE.Vector3(...end);
  const mid = from.clone().add(to).multiplyScalar(0.5);
  const direction = to.clone().sub(from);
  const length = direction.length();
  const geometry = new THREE.CapsuleGeometry(
    radius,
    Math.max(0.01, length - radius * 2),
    12,
    segments
  );
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(mid);
  mesh.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.normalize()
  );
  mesh.scale.set(scale[0], 1, scale[1]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function createAvatar() {
  const avatar = new THREE.Group();
  avatar.name = 'selected-avatar-soft-cartoon-3d';
  avatar.position.set(0.15, -0.03, 0);

  const body = new THREE.Group();
  body.rotation.set(deg(-3), deg(-15), deg(-10));
  body.position.set(0.02, 0.04, 0);
  avatar.add(body);

  addLegs(body);
  addTorso(body);
  addArms(body);
  addHead(body);
  addVolumetricPolish(body);

  return avatar;
}

function addTorso(parent) {
  addOval(parent, materials.shirt, [0.04, 0.08, 0.18], [0.43, 0.74, 0.22], [deg(2), 0, deg(-3)]);
  addOval(parent, materials.jacket, [0, 0.06, -0.06], [0.67, 0.85, 0.34], [deg(-3), 0, deg(-1)]);
  addOval(parent, materials.jacket, [-0.42, 0.08, 0.1], [0.22, 0.72, 0.18], [deg(6), deg(-10), deg(-8)]);
  addOval(parent, materials.jacket, [0.43, 0.06, 0.08], [0.23, 0.72, 0.18], [deg(6), deg(10), deg(8)]);

  addMesh(
    parent,
    roundedBox(0.5, 0.86, 0.055, 0.085),
    materials.shirt,
    [0.03, 0.06, 0.35],
    [1, 1, 1],
    [deg(4), 0, deg(-2)]
  );

  addMesh(
    parent,
    roundedBox(0.23, 0.82, 0.065, 0.055),
    materials.jacket,
    [-0.25, 0.04, 0.39],
    [1, 1, 1],
    [deg(5), deg(-13), deg(-8)]
  );
  addMesh(
    parent,
    roundedBox(0.22, 0.76, 0.065, 0.055),
    materials.jacket,
    [0.26, -0.02, 0.38],
    [1, 1, 1],
    [deg(4), deg(12), deg(7)]
  );

  addMesh(
    parent,
    roundedBox(0.38, 0.1, 0.08, 0.045),
    materials.jacketShadow,
    [-0.22, 0.72, 0.34],
    [1, 1, 1],
    [deg(12), deg(-2), deg(-25)]
  );
  addMesh(
    parent,
    roundedBox(0.38, 0.1, 0.08, 0.045),
    materials.jacketShadow,
    [0.26, 0.71, 0.34],
    [1, 1, 1],
    [deg(12), deg(2), deg(25)]
  );

  addMesh(
    parent,
    roundedBox(0.24, 0.22, 0.04, 0.04),
    materials.jacketShadow,
    [0.31, -0.2, 0.43],
    [1, 1, 1],
    [deg(4), deg(2), deg(-2)]
  );

  for (let i = 0; i < 5; i += 1) {
    addOval(
      parent,
      materials.metal,
      [-0.11, 0.46 - i * 0.17, 0.435],
      [0.022, 0.022, 0.01]
    );
  }

  capsuleBetween(parent, [-0.38, 0.46, 0.39], [-0.31, -0.38, 0.35], 0.012, materials.jacketDeep, [0.6, 0.6], 8);
  capsuleBetween(parent, [0.4, 0.34, 0.36], [0.36, -0.44, 0.32], 0.012, materials.jacketDeep, [0.6, 0.6], 8);
  capsuleBetween(parent, [-0.03, 0.58, 0.42], [0.08, -0.32, 0.43], 0.01, materials.lace, [0.48, 0.48], 8);
}

function addLegs(parent) {
  const hipY = -0.62;
  addOval(parent, materials.pants, [0.02, -0.58, -0.02], [0.55, 0.22, 0.3], [deg(-3), 0, deg(2)]);
  capsuleBetween(parent, [-0.18, hipY, 0.03], [-0.52, -1.23, 0.1], 0.18, materials.pants, [1.16, 0.95]);
  capsuleBetween(parent, [-0.52, -1.23, 0.1], [-0.54, -1.88, 0.2], 0.165, materials.pants, [1.1, 0.92]);
  capsuleBetween(parent, [0.19, hipY, 0.03], [0.42, -1.13, 0.04], 0.18, materials.pants, [1.16, 0.95]);
  capsuleBetween(parent, [0.42, -1.13, 0.04], [0.94, -1.67, 0.28], 0.165, materials.pants, [1.1, 0.92]);

  addMesh(
    parent,
    roundedBox(0.48, 0.18, 0.68, 0.075),
    materials.shoe,
    [-0.56, -2.05, 0.32],
    [1, 1, 1],
    [deg(4), deg(-16), deg(-5)]
  );
  addMesh(
    parent,
    roundedBox(0.5, 0.07, 0.7, 0.055),
    materials.sole,
    [-0.56, -2.14, 0.33],
    [1, 1, 1],
    [deg(4), deg(-16), deg(-5)]
  );
  addMesh(
    parent,
    roundedBox(0.48, 0.18, 0.68, 0.075),
    materials.shoe,
    [1.08, -1.84, 0.43],
    [1, 1, 1],
    [deg(-9), deg(28), deg(-15)]
  );
  addMesh(
    parent,
    roundedBox(0.5, 0.07, 0.7, 0.055),
    materials.sole,
    [1.09, -1.92, 0.44],
    [1, 1, 1],
    [deg(-9), deg(28), deg(-15)]
  );

  addOval(parent, materials.pants, [-0.48, -1.25, 0.1], [0.17, 0.16, 0.13], [deg(2), 0, deg(-6)]);
  addOval(parent, materials.pants, [0.42, -1.18, 0.08], [0.17, 0.16, 0.13], [deg(-4), 0, deg(10)]);
  addMesh(
    parent,
    roundedBox(0.28, 0.035, 0.045, 0.016),
    materials.sole,
    [-0.58, -2.0, 0.68],
    [1, 1, 1],
    [deg(2), deg(-18), deg(-6)]
  );
  addMesh(
    parent,
    roundedBox(0.3, 0.035, 0.045, 0.016),
    materials.sole,
    [1.12, -1.8, 0.79],
    [1, 1, 1],
    [deg(-8), deg(26), deg(-16)]
  );
  addMesh(
    parent,
    roundedBox(0.4, 0.12, 0.25, 0.05),
    materials.jacketShadow,
    [-0.54, -1.88, 0.17],
    [1, 1, 1],
    [deg(5), deg(-14), deg(-6)]
  );
  addMesh(
    parent,
    roundedBox(0.42, 0.12, 0.25, 0.05),
    materials.jacketShadow,
    [0.9, -1.66, 0.25],
    [1, 1, 1],
    [deg(-8), deg(24), deg(-14)]
  );
  addShoeDetails(parent, [-0.56, -2.05, 0.32], [deg(4), deg(-16), deg(-5)]);
  addShoeDetails(parent, [1.08, -1.84, 0.43], [deg(-9), deg(28), deg(-15)]);
}

function addShoeDetails(parent, position, rotation) {
  const shoe = new THREE.Group();
  shoe.position.set(position[0], position[1], position[2]);
  shoe.rotation.set(rotation[0], rotation[1], rotation[2]);
  parent.add(shoe);

  for (let i = 0; i < 3; i += 1) {
    addMesh(
      shoe,
      roundedBox(0.24, 0.018, 0.032, 0.008),
      materials.lace,
      [0, 0.105, 0.05 + i * 0.085],
      [1, 1, 1],
      [0, 0, deg(i === 1 ? -8 : 8)]
    );
  }
  addMesh(shoe, roundedBox(0.26, 0.026, 0.05, 0.014), materials.sole, [-0.18, 0.02, 0.18], [1, 1, 1], [0, 0, deg(-25)]);
  addMesh(shoe, roundedBox(0.26, 0.026, 0.05, 0.014), materials.sole, [0.18, 0.02, 0.18], [1, 1, 1], [0, 0, deg(25)]);
}

function addArms(parent) {
  addShoulderPad(parent, -0.62, deg(-22));
  addShoulderPad(parent, 0.63, deg(22));

  capsuleBetween(parent, [-0.62, 0.62, 0.02], [-1.08, 0.35, 0.18], 0.16, materials.jacket, [1.12, 0.92]);
  capsuleBetween(parent, [-1.08, 0.35, 0.18], [-1.56, 0.26, 0.36], 0.14, materials.jacket, [1, 0.86]);
  addOval(parent, materials.jacket, [-1.08, 0.35, 0.18], [0.17, 0.15, 0.13], [deg(-8), 0, deg(12)]);
  addMesh(parent, roundedBox(0.26, 0.12, 0.18, 0.05), materials.jacketDeep, [-1.52, 0.25, 0.35], [1, 1, 1], [deg(0), deg(-8), deg(-12)]);
  addHand(parent, [-1.72, 0.27, 0.43], 'wideLeft');

  capsuleBetween(parent, [0.62, 0.62, 0.02], [0.96, 0.98, 0.18], 0.165, materials.jacket, [1.12, 0.93]);
  capsuleBetween(parent, [0.96, 0.98, 0.18], [1.11, 1.42, 0.34], 0.14, materials.jacket, [1, 0.87]);
  addOval(parent, materials.jacket, [0.96, 0.98, 0.18], [0.17, 0.15, 0.13], [deg(10), 0, deg(-16)]);
  addMesh(parent, roundedBox(0.26, 0.12, 0.18, 0.05), materials.jacketDeep, [1.1, 1.36, 0.32], [1, 1, 1], [deg(10), deg(6), deg(18)]);
  addHand(parent, [1.1, 1.56, 0.42], 'raisedRight');

  addMesh(
    parent,
    roundedBox(0.24, 0.11, 0.16, 0.045),
    materials.jacketShadow,
    [-1.48, 0.26, 0.34],
    [1, 1, 1],
    [deg(0), deg(-8), deg(-16)]
  );
  addMesh(
    parent,
    roundedBox(0.24, 0.11, 0.16, 0.045),
    materials.jacketShadow,
    [1.1, 1.34, 0.32],
    [1, 1, 1],
    [deg(10), deg(6), deg(22)]
  );
}

function addShoulderPad(parent, x, rotZ) {
  addMesh(
    parent,
    roundedBox(0.3, 0.17, 0.25, 0.085),
    materials.jacket,
    [x, 0.7, 0.03],
    [1, 1, 1],
    [deg(2), 0, rotZ]
  );
}

function addHand(parent, position, pose) {
  const isRaised = pose === 'raisedRight';
  addOval(
    parent,
    materials.skinWarm,
    position,
    [0.13, 0.09, 0.075],
    [0, 0, isRaised ? deg(18) : deg(-12)]
  );

  const fingers =
    pose === 'wideLeft'
      ? [
          [-0.16, 0.1, 0.04],
          [-0.19, 0.02, 0.05],
          [-0.18, -0.06, 0.05],
          [-0.13, -0.13, 0.04],
          [-0.02, -0.15, 0.06],
        ]
      : [
          [-0.13, 0.12, 0.04],
          [-0.05, 0.18, 0.05],
          [0.04, 0.18, 0.05],
          [0.12, 0.12, 0.04],
          [0.15, 0.02, 0.05],
        ];

  fingers.forEach((offset, index) => {
    const start = [
      position[0] + offset[0] * 0.42,
      position[1] + offset[1] * 0.42,
      position[2] + offset[2] * 0.42,
    ];
    const end = [
      position[0] + offset[0],
      position[1] + offset[1],
      position[2] + offset[2],
    ];
    capsuleBetween(
      parent,
      start,
      end,
      index === 4 ? 0.018 : 0.02,
      materials.skinWarm,
      [0.78, 0.78],
      12
    );
    addOval(parent, materials.skinWarm, end, [0.026, 0.022, 0.02]);
  });
}

function addHead(parent) {
  capsuleBetween(parent, [0, 0.8, 0.03], [0, 1.07, 0.04], 0.11, materials.skin, [0.82, 0.78]);

  const head = new THREE.Group();
  head.position.set(-0.04, 1.55, 0.06);
  head.rotation.y = deg(-13);
  head.rotation.z = deg(5);
  parent.add(head);

  addOval(head, materials.skin, [0, 0.02, 0], [0.38, 0.53, 0.34]);
  addOval(head, materials.skin, [0, -0.39, 0.03], [0.27, 0.18, 0.24]);
  addOval(head, materials.skin, [-0.4, -0.01, -0.02], [0.078, 0.12, 0.05]);
  addOval(head, materials.skin, [0.38, -0.02, -0.02], [0.074, 0.12, 0.05]);

  addFace(head);
  addHair(head);
  addBeanie(head);
  addSunglasses(head);
}

function addFace(head) {
  addOval(head, materials.eye, [-0.135, 0.1, 0.32], [0.13, 0.09, 0.032], [0, deg(-4), 0]);
  addOval(head, materials.eye, [0.145, 0.1, 0.32], [0.13, 0.09, 0.032], [0, deg(-4), 0]);
  addOval(head, materials.iris, [-0.13, 0.095, 0.35], [0.038, 0.042, 0.012]);
  addOval(head, materials.iris, [0.15, 0.095, 0.35], [0.038, 0.042, 0.012]);
  addOval(head, materials.glint, [-0.116, 0.116, 0.362], [0.012, 0.012, 0.004]);
  addOval(head, materials.glint, [0.164, 0.116, 0.362], [0.012, 0.012, 0.004]);

  addMesh(
    head,
    roundedBox(0.25, 0.045, 0.026, 0.02),
    materials.hair,
    [-0.14, 0.24, 0.34],
    [1, 1, 1],
    [deg(4), 0, deg(-5)]
  );
  addMesh(
    head,
    roundedBox(0.25, 0.045, 0.026, 0.02),
    materials.hair,
    [0.16, 0.25, 0.34],
    [1, 1, 1],
    [deg(4), 0, deg(5)]
  );

  capsuleBetween(head, [0, 0.03, 0.35], [0.015, -0.17, 0.37], 0.034, materials.skinWarm, [0.75, 0.62], 18);
  addOval(head, materials.skinWarm, [0.02, -0.15, 0.39], [0.052, 0.034, 0.032]);

  addOval(
    head,
    materials.mouth,
    [0.02, -0.31, 0.36],
    [0.17, 0.07, 0.018],
    [deg(2), 0, deg(-2)]
  );
  addMesh(
    head,
    roundedBox(0.2, 0.036, 0.018, 0.014),
    materials.teeth,
    [0.02, -0.275, 0.378],
    [1, 0.8, 1],
    [0, 0, deg(-2)]
  );
  addOval(
    head,
    materials.blush,
    [0.02, -0.345, 0.379],
    [0.09, 0.025, 0.006],
    [0, 0, deg(-2)]
  );

  [
    [-0.12, -0.43, 0.31],
    [-0.03, -0.46, 0.33],
    [0.08, -0.43, 0.32],
    [-0.18, -0.36, 0.32],
    [0.16, -0.36, 0.32],
  ].forEach((dot) => {
    addOval(head, materials.stubble, dot, [0.012, 0.009, 0.004], [0, 0, deg(8)]);
  });

  addOval(head, materials.blush, [-0.265, -0.1, 0.32], [0.11, 0.055, 0.014], [0, deg(6), deg(-10)]);
  addOval(head, materials.blush, [0.265, -0.105, 0.32], [0.11, 0.055, 0.014], [0, deg(-6), deg(10)]);
}

function addHair(head) {
  addOval(head, materials.hair, [-0.03, 0.29, -0.01], [0.38, 0.24, 0.31], [deg(-8), 0, deg(4)]);

  const bangs = [
    [-0.27, 0.32, 0.26, -0.19, 0.12, 0.34],
    [-0.19, 0.37, 0.29, -0.14, 0.17, 0.37],
    [-0.1, 0.4, 0.31, -0.08, 0.14, 0.38],
    [0.02, 0.4, 0.31, 0.01, 0.16, 0.38],
    [0.12, 0.38, 0.28, 0.13, 0.18, 0.36],
    [0.23, 0.31, 0.22, 0.2, 0.13, 0.33],
  ];

  bangs.forEach((strand, index) => {
    const [sx, sy, sz, ex, ey, ez] = strand;
    capsuleBetween(
      head,
      [sx, sy, sz],
      [ex, ey, ez],
      index % 2 === 0 ? 0.037 : 0.03,
      index % 3 === 0 ? materials.hairLight : materials.hair,
      [0.82, 0.72],
      12
    );
  });

  capsuleBetween(head, [0.28, 0.23, -0.07], [0.34, -0.18, 0.05], 0.044, materials.hair, [0.72, 0.58], 12);
  capsuleBetween(head, [-0.31, 0.2, -0.03], [-0.36, -0.16, 0.06], 0.039, materials.hair, [0.7, 0.58], 12);

  const flyaways = [
    [-0.2, 0.43, 0.16, -0.3, 0.5, 0.18],
    [-0.08, 0.47, 0.22, -0.08, 0.56, 0.24],
    [0.08, 0.45, 0.2, 0.18, 0.53, 0.22],
    [0.2, 0.38, 0.14, 0.31, 0.45, 0.15],
  ];
  flyaways.forEach((strand, index) => {
    capsuleBetween(
      head,
      [strand[0], strand[1], strand[2]],
      [strand[3], strand[4], strand[5]],
      index % 2 === 0 ? 0.013 : 0.011,
      index % 2 === 0 ? materials.hairLight : materials.hair,
      [0.58, 0.48],
      10
    );
  });
}

function addBeanie(head) {
  addMesh(
    head,
    new THREE.TorusGeometry(0.39, 0.045, 18, 84),
    materials.knit,
    [0.02, 0.24, 0.02],
    [1.06, 0.78, 0.82],
    [deg(8), 0, deg(-8)]
  );

  addOval(
    head,
    materials.knit,
    [0.15, 0.35, -0.17],
    [0.42, 0.28, 0.37],
    [deg(-12), deg(10), deg(-13)]
  );
  addOval(
    head,
    materials.knit,
    [0.28, 0.22, -0.24],
    [0.26, 0.2, 0.23],
    [deg(-18), deg(22), deg(-15)]
  );

  for (let i = 0; i < 11; i += 1) {
    const x = -0.26 + i * 0.052;
    capsuleBetween(
      head,
      [x, 0.45 - Math.abs(i - 5) * 0.008, -0.02],
      [x + 0.05, 0.17, 0.02],
      0.009,
      materials.jacketShadow,
      [0.9, 0.9],
      8
    );
  }

  for (let i = 0; i < 8; i += 1) {
    const x = -0.24 + i * 0.07;
    capsuleBetween(
      head,
      [x, 0.25, 0.27],
      [x + 0.025, 0.15, 0.3],
      0.008,
      materials.jacketDeep,
      [0.62, 0.62],
      8
    );
  }
}

function addSunglasses(head) {
  const glasses = new THREE.Group();
  glasses.position.set(-0.03, 0.33, 0.35);
  glasses.rotation.set(deg(-19), deg(1), deg(-6));
  head.add(glasses);

  addMesh(
    glasses,
    roundedBox(0.23, 0.15, 0.033, 0.045),
    materials.lens,
    [-0.14, 0, 0],
    [1, 1, 1],
    [0, 0, deg(-3)]
  );
  addMesh(
    glasses,
    roundedBox(0.23, 0.15, 0.033, 0.045),
    materials.lens,
    [0.14, 0.002, 0],
    [1, 1, 1],
    [0, 0, deg(3)]
  );
  addMesh(glasses, roundedBox(0.53, 0.027, 0.035, 0.012), materials.frame, [0, 0.075, 0.012], [1, 1, 1]);
  addMesh(glasses, roundedBox(0.075, 0.019, 0.025, 0.008), materials.frame, [0, 0, 0.015], [1, 1, 1]);
  addMesh(
    glasses,
    roundedBox(0.18, 0.022, 0.024, 0.008),
    materials.frame,
    [-0.27, 0.035, -0.02],
    [1, 1, 1],
    [0, deg(20), deg(8)]
  );
  addMesh(
    glasses,
    roundedBox(0.18, 0.022, 0.024, 0.008),
    materials.frame,
    [0.27, 0.035, -0.02],
    [1, 1, 1],
    [0, deg(-20), deg(-8)]
  );
  addMesh(glasses, roundedBox(0.075, 0.014, 0.006, 0.006), materials.glint, [-0.18, 0.035, 0.025], [1, 1, 1], [0, 0, deg(-16)]);
  addMesh(glasses, roundedBox(0.075, 0.014, 0.006, 0.006), materials.glint, [0.1, 0.04, 0.025], [1, 1, 1], [0, 0, deg(-16)]);
}

function addVolumetricPolish(parent) {
  addOval(parent, materials.pants, [0.02, -0.55, -0.02], [0.54, 0.24, 0.31], [deg(-3), 0, deg(1)]);
  addMesh(
    parent,
    roundedBox(0.7, 0.13, 0.16, 0.055),
    materials.jacketShadow,
    [0.02, -0.48, 0.25],
    [1, 1, 1],
    [deg(5), 0, deg(-2)]
  );

  const sleeveFolds = [
    [-0.86, 0.47, 0.26, -1.02, 0.36, 0.28],
    [-1.22, 0.26, 0.34, -1.38, 0.23, 0.37],
    [0.86, 0.72, 0.2, 1.0, 0.84, 0.24],
    [1.06, 1.12, 0.29, 1.12, 1.26, 0.33],
  ];
  sleeveFolds.forEach((fold) => {
    capsuleBetween(
      parent,
      [fold[0], fold[1], fold[2]],
      [fold[3], fold[4], fold[5]],
      0.012,
      materials.jacketShadow,
      [0.62, 0.62],
      8
    );
  });

  const pantFolds = [
    [-0.33, -0.9, 0.28, -0.45, -1.1, 0.3],
    [-0.53, -1.48, 0.31, -0.52, -1.72, 0.33],
    [0.31, -0.88, 0.24, 0.44, -1.08, 0.28],
    [0.62, -1.38, 0.36, 0.83, -1.55, 0.42],
  ];
  pantFolds.forEach((fold) => {
    capsuleBetween(
      parent,
      [fold[0], fold[1], fold[2]],
      [fold[3], fold[4], fold[5]],
      0.011,
      materials.jacketShadow,
      [0.58, 0.58],
      8
    );
  });

  addMesh(
    parent,
    roundedBox(0.28, 0.055, 0.075, 0.028),
    materials.jacketShadow,
    [-0.16, 0.74, 0.37],
    [1, 1, 1],
    [deg(9), 0, deg(-18)]
  );
  addMesh(
    parent,
    roundedBox(0.28, 0.055, 0.075, 0.028),
    materials.jacketShadow,
    [0.24, 0.73, 0.36],
    [1, 1, 1],
    [deg(8), 0, deg(21)]
  );
}

function createBackdrop() {
  const floorBase = new THREE.Mesh(
    new THREE.CircleGeometry(14.5, 160),
    new THREE.MeshStandardMaterial({
      color: 0xf7f8f5,
      roughness: 0.86,
      metalness: 0,
    })
  );
  floorBase.rotation.x = -Math.PI / 2;
  floorBase.position.y = -2.235;
  floorBase.receiveShadow = true;
  scene.add(floorBase);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 24),
    new THREE.ShadowMaterial({
      color: 0x191612,
      opacity: 0.16,
      transparent: true,
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -2.22;
  floor.receiveShadow = true;
  scene.add(floor);
}

function createPortfolioStudio() {
  const studio = new THREE.Group();
  studio.name = 'portfolio-studio-set';
  studio.position.set(1.95, -0.02, -0.92);
  studio.rotation.y = deg(-6);

  const studioMaterials = {
    shell: new THREE.MeshStandardMaterial({ color: 0xe9ece9, roughness: 0.82 }),
    edge: new THREE.MeshStandardMaterial({ color: 0x40484c, roughness: 0.64 }),
    soft: new THREE.MeshStandardMaterial({ color: 0xcbd0ce, roughness: 0.78 }),
    deep: new THREE.MeshStandardMaterial({ color: 0x1d2326, roughness: 0.58 }),
    paper: new THREE.MeshStandardMaterial({ color: 0xf8f6ef, roughness: 0.8 }),
    accent: new THREE.MeshStandardMaterial({ color: 0x2d5caa, roughness: 0.62 }),
    warm: new THREE.MeshStandardMaterial({ color: 0xd6b07d, roughness: 0.72 }),
    green: new THREE.MeshStandardMaterial({ color: 0x4b8b67, roughness: 0.76 }),
  };

  const addStudioMesh = (geometry, material, position, scale = [1, 1, 1], rotation = [0, 0, 0]) => {
    const mesh = addMesh(studio, geometry, material, position, scale, rotation);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };

  addStudioMesh(roundedBox(3.3, 0.16, 0.88, 0.045), studioMaterials.shell, [0.25, -1.12, 0.2]);
  addStudioMesh(roundedBox(3.5, 0.08, 0.98, 0.025), studioMaterials.soft, [0.25, -1.21, 0.2]);

  [-1.25, 1.75].forEach((x) => {
    [-0.16, 0.52].forEach((z) => {
      addStudioMesh(roundedBox(0.1, 1.0, 0.1, 0.025), studioMaterials.deep, [x, -1.72, z]);
    });
  });

  addStudioMesh(roundedBox(0.82, 0.05, 0.48, 0.025), studioMaterials.deep, [0.62, -1.01, 0.02], [1, 1, 1], [deg(-9), 0, 0]);
  addStudioMesh(roundedBox(0.78, 0.52, 0.05, 0.025), studioMaterials.soft, [0.62, -0.72, -0.14], [1, 1, 1], [deg(-8), 0, 0]);
  addStudioMesh(roundedBox(0.52, 0.03, 0.26, 0.018), studioMaterials.edge, [0.62, -0.98, 0.06]);

  const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.1, 0.18, 32), studioMaterials.paper);
  mug.position.set(1.55, -0.95, 0.38);
  mug.castShadow = true;
  mug.receiveShadow = true;
  studio.add(mug);
  addStudioMesh(new THREE.TorusGeometry(0.08, 0.014, 10, 24), studioMaterials.paper, [1.68, -0.95, 0.38], [0.82, 0.82, 0.82], [0, deg(90), 0]);

  const shelfX = -0.9;
  [-0.72, 0.08, 0.88].forEach((y) => {
    addStudioMesh(roundedBox(2.25, 0.1, 0.32, 0.025), studioMaterials.shell, [shelfX, y, -0.42]);
  });
  [-1.95, 0.15].forEach((x) => {
    addStudioMesh(roundedBox(0.1, 1.82, 0.1, 0.025), studioMaterials.edge, [x, 0.08, -0.42]);
  });

  const bookColors = [studioMaterials.deep, studioMaterials.soft, studioMaterials.accent, studioMaterials.warm];
  for (let i = 0; i < 9; i += 1) {
    addStudioMesh(
      roundedBox(0.08, 0.34 + (i % 3) * 0.04, 0.18, 0.012),
      bookColors[i % bookColors.length],
      [-1.72 + i * 0.1, -0.49, -0.24],
      [1, 1, 1],
      [0, 0, deg((i % 2) * 5 - 2)]
    );
  }

  addStudioMesh(roundedBox(0.48, 0.04, 0.3, 0.012), studioMaterials.paper, [-0.18, -0.51, -0.23], [1, 1, 1], [0, deg(0), deg(-8)]);
  addStudioMesh(roundedBox(0.52, 0.05, 0.28, 0.016), studioMaterials.accent, [-0.1, 0.27, -0.25], [1, 1, 1], [0, deg(0), deg(10)]);

  for (let i = 0; i < 4; i += 1) {
    const figure = new THREE.Group();
    figure.position.set(0.15 + i * 0.17, 0.62, -0.26);
    addMesh(figure, new THREE.SphereGeometry(0.055, 20, 16), studioMaterials.soft, [0, 0.11, 0], [1, 1, 1]);
    addMesh(figure, roundedBox(0.08, 0.12, 0.045, 0.018), studioMaterials.deep, [0, 0.01, 0], [1, 1, 1]);
    studio.add(figure);
  }

  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.18, 32), studioMaterials.warm);
  pot.position.set(-1.5, 1.03, -0.26);
  pot.castShadow = true;
  pot.receiveShadow = true;
  studio.add(pot);
  for (let i = 0; i < 5; i += 1) {
    addStudioMesh(
      new THREE.CapsuleGeometry(0.025, 0.28, 6, 12),
      studioMaterials.green,
      [-1.5 + (i - 2) * 0.05, 1.22 + Math.abs(i - 2) * 0.02, -0.26],
      [1, 1, 1],
      [deg(24 + i * 7), deg(i * 32), deg((i - 2) * 10)]
    );
  }

  const tileMaterial = new THREE.MeshStandardMaterial({
    color: 0xd9dddc,
    roughness: 0.88,
    transparent: true,
    opacity: 0.55,
  });
  for (let i = 0; i < 8; i += 1) {
    addStudioMesh(
      roundedBox(0.45, 0.018, 0.28, 0.016),
      tileMaterial,
      [-1.9 + i * 0.54, -2.18, 1.08 + (i % 2) * 0.22],
      [1, 1, 1],
      [0, deg(-8), 0]
    );
  }

  scene.add(studio);
}

function addLights() {
  const ambient = new THREE.HemisphereLight(0xfff7eb, 0x8a8174, 1.62);
  scene.add(ambient);

  const key = new THREE.DirectionalLight(0xfff0d9, 2.85);
  key.position.set(3.2, 4.8, 4.5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 24;
  key.shadow.camera.left = -10;
  key.shadow.camera.right = 10;
  key.shadow.camera.top = 10;
  key.shadow.camera.bottom = -10;
  scene.add(key);

  const rim = new THREE.DirectionalLight(0xcde9ff, 1.55);
  rim.position.set(-4, 3.2, -3.5);
  scene.add(rim);

  const soft = new THREE.PointLight(0xffcda4, 0.75, 8);
  soft.position.set(-1.2, 1.2, 3.2);
  scene.add(soft);

  cameraFillLight = new THREE.PointLight(0xffd7b8, 1.15, 9);
  cameraFillLight.castShadow = false;
  scene.add(cameraFillLight);
}

createBackdrop();
addLights();
setLoadingProgress(18, '页面已就绪，3D场景将在后台加载');
window.setTimeout(() => loadingScreen?.classList.add('is-complete'), 320);

const startSceneLoading = () => {
  window.setTimeout(() => {
    addSceneToDisplay().then(() => {
      renderer.shadowMap.needsUpdate = true;
      window.requestAnimationFrame(() => {
        renderer.shadowMap.autoUpdate = false;
        setLoadingProgress(100, '场景加载完成');
      });
    });
  }, 700);
};

if (document.readyState === 'complete') {
  startSceneLoading();
} else {
  window.addEventListener('load', startSceneLoading, { once: true });
}

function setLoadingProgress(value, label) {
  const progress = THREE.MathUtils.clamp(Math.round(value), 0, 100);
  if (loadingBar) loadingBar.style.width = `${progress}%`;
  if (loadingPercent) loadingPercent.textContent = `${progress}%`;
  if (loadingStatus && label) loadingStatus.textContent = label;
}

async function addAvatarToScene() {
  scene.add(createSeatedOfficeAvatar());
}

async function addSceneToDisplay() {
  setLoadingProgress(4, '正在加载人物场景');
  const importedScene = await loadImportedOfficeScene();
  if (importedScene) {
    scene.add(importedScene);
    setLoadingProgress(72, '正在加载空间陈设');
  } else {
    setLoadingProgress(72, '人物模型暂未加载');
  }

  await addBookcaseToScene();
  applyCameraPreset(true);
}

async function loadImportedOfficeScene() {
  return new Promise((resolve) => {
    let attempts = 0;
    const load = () => {
      const loader = createModelLoader();
      const modelUrl = attempts === 0
        ? officeSceneModelPath
        : `${officeSceneModelPath}?retry=${Date.now().toString(36)}`;
      attempts += 1;
      loader.load(
      modelUrl,
      (gltf) => {
        const model = gltf.scene;
        model.name = 'imported-office-scene-source';
        const root = createImportedOfficeSceneRoot(model);

        if (gltf.animations?.length) {
          animationMixer = new THREE.AnimationMixer(model);
          gltf.animations.forEach((clip) => {
            animationMixer.clipAction(clip).play();
          });
        }

        resolve(root);
      },
      (event) => {
        if (event.total > 0) setLoadingProgress(4 + (event.loaded / event.total) * 66, '正在加载人物场景');
      },
      () => {
        if (attempts < 2) {
          window.setTimeout(load, 900);
        } else {
          resolve(null);
        }
      }
    );
    };
    load();
  });
}

function createImportedOfficeSceneRoot(model) {
  tuneOfficeSceneMaterials(model);

  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const root = new THREE.Group();
  root.name = 'imported-office-scene-root';
  root.position.set(1.5, -2.18, -0.62);
  root.rotation.set(0, deg(-2), 0);
  root.scale.setScalar(size.y > 0 ? 5.0 / size.y : 1);

  model.position.set(-center.x, -box.min.y, -center.z);
  root.add(model);

  return root;
}

async function addBookcaseToScene() {
  const bookcase = await loadImportedBookcase();
  if (bookcase) {
    scene.add(bookcase);
  }
}

async function loadImportedBookcase() {
  return new Promise((resolve) => {
    let attempts = 0;
    const load = () => {
      const loader = createModelLoader();
      const modelUrl = attempts === 0
        ? bookcaseModelPath
        : `${bookcaseModelPath}?retry=${Date.now().toString(36)}`;
      attempts += 1;
      loader.load(
      modelUrl,
      (gltf) => {
        const model = gltf.scene;
        model.name = 'imported-bookcase-source';
        resolve(createImportedBookcaseRoot(model));
      },
      (event) => {
        if (event.total > 0) setLoadingProgress(72 + (event.loaded / event.total) * 25, '正在加载空间陈设');
      },
      () => {
        if (attempts < 2) {
          window.setTimeout(load, 900);
        } else {
          resolve(null);
        }
      }
    );
    };
    load();
  });
}

function createImportedBookcaseRoot(model) {
  tuneOfficeSceneMaterials(model);

  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const root = new THREE.Group();
  root.name = 'imported-bookcase-root';
  root.userData.baseScale = size.y > 0 ? 3.6 / size.y : 1;

  model.position.set(-center.x, -box.min.y, -center.z);
  root.add(model);
  bookcaseRoot = root;
  applyBookcaseTransform();

  return root;
}

function tuneOfficeSceneMaterials(model) {
  const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
  const tunedMaterials = new WeakMap();

  const tuneMaterial = (material, geometry) => {
    if (!material) {
      return material;
    }
    if (tunedMaterials.has(material)) {
      return tunedMaterials.get(material);
    }

    const tuned = material.clone();
    if ('vertexColors' in tuned && geometry?.attributes?.color) {
      tuned.vertexColors = true;
    }
    if ('metalness' in tuned) {
      tuned.metalness = 0;
    }
    if ('roughness' in tuned) {
      tuned.roughness = Math.max(tuned.roughness ?? 0.72, 0.74);
    }
    if ('envMapIntensity' in tuned) {
      tuned.envMapIntensity = 0.75;
    }

    [tuned.map, tuned.normalMap, tuned.roughnessMap, tuned.metalnessMap].forEach((texture) => {
      if (!texture) {
        return;
      }
      texture.anisotropy = maxAnisotropy;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = true;
      texture.needsUpdate = true;
    });
    if (tuned.map) {
      tuned.map.colorSpace = THREE.SRGBColorSpace;
    }

    tuned.side = THREE.DoubleSide;
    tuned.needsUpdate = true;
    tunedMaterials.set(material, tuned);
    return tuned;
  };

  model.traverse((child) => {
    if (!child.isMesh) {
      return;
    }

    child.castShadow = true;
    child.receiveShadow = true;
    child.frustumCulled = false;

    if (child.geometry) {
      if (!child.geometry.attributes.normal) {
        child.geometry.computeVertexNormals();
      }
      child.geometry.computeBoundingBox();
      child.geometry.computeBoundingSphere();
    }

    child.material = Array.isArray(child.material)
      ? child.material.map((material) => tuneMaterial(material, child.geometry))
      : tuneMaterial(child.material, child.geometry);
  });
}

function getBookcaseStorageKey() {
  return `office-avatar-bookcase-transform:${officeSceneModelPath}:${bookcaseModelPath}`;
}

function loadStoredBookcaseTransform() {
  try {
    const saved = JSON.parse(localStorage.getItem(getBookcaseStorageKey()) || 'null');
    if (!saved) {
      return;
    }

    if (Array.isArray(saved.position) && saved.position.length === 3) {
      bookcaseTransform.position = saved.position.map(Number);
    }
    if (Number.isFinite(Number(saved.rotationY))) {
      bookcaseTransform.rotationY = Number(saved.rotationY);
    }
    if (Number.isFinite(Number(saved.scale))) {
      bookcaseTransform.scale = THREE.MathUtils.clamp(Number(saved.scale), 0.25, 3);
    }
  } catch {
    localStorage.removeItem(getBookcaseStorageKey());
  }
}

function persistBookcaseTransform() {
  try {
    localStorage.setItem(getBookcaseStorageKey(), JSON.stringify(bookcaseTransform));
  } catch {
    // The visible parameter box still lets the current values be copied manually.
  }
  renderBookcaseOutput();
}

function applyBookcaseTransform() {
  if (!bookcaseRoot) {
    return;
  }

  bookcaseRoot.position.fromArray(bookcaseTransform.position);
  bookcaseRoot.rotation.set(0, bookcaseTransform.rotationY, 0);
  const baseScale = bookcaseRoot.userData.baseScale || 1;
  bookcaseRoot.scale.setScalar(baseScale * bookcaseTransform.scale);
}

function moveBookcase(action) {
  const step = bookcaseStepSizes[bookcaseStepMode] || bookcaseStepSizes.normal;
  const position = bookcaseTransform.position;

  switch (action) {
    case 'x-':
      position[0] -= step.move;
      break;
    case 'x+':
      position[0] += step.move;
      break;
    case 'y-':
      position[1] -= step.move;
      break;
    case 'y+':
      position[1] += step.move;
      break;
    case 'z-':
      position[2] -= step.move;
      break;
    case 'z+':
      position[2] += step.move;
      break;
    case 'rotate-left':
      bookcaseTransform.rotationY += step.rotate;
      break;
    case 'rotate-right':
      bookcaseTransform.rotationY -= step.rotate;
      break;
    case 'scale-down':
      bookcaseTransform.scale = THREE.MathUtils.clamp(bookcaseTransform.scale - step.scale, 0.25, 3);
      break;
    case 'scale-up':
      bookcaseTransform.scale = THREE.MathUtils.clamp(bookcaseTransform.scale + step.scale, 0.25, 3);
      break;
    default:
      return;
  }

  applyBookcaseTransform();
  persistBookcaseTransform();
}

function resetBookcaseTransform() {
  bookcaseTransform.position = [...defaultBookcaseTransform.position];
  bookcaseTransform.rotationY = defaultBookcaseTransform.rotationY;
  bookcaseTransform.scale = defaultBookcaseTransform.scale;
  applyBookcaseTransform();
  persistBookcaseTransform();
  try {
    localStorage.removeItem(getBookcaseStorageKey());
  } catch {
    // Ignore storage failures; the in-memory reset is enough for the current preview.
  }
  flashButton(resetBookcaseButton, '已重置');
}

async function copyBookcaseTransform() {
  const payload = JSON.stringify(formatBookcaseTransform(), null, 2);
  if (bookcaseOutput) {
    bookcaseOutput.value = payload;
    bookcaseOutput.select();
  }

  try {
    await navigator.clipboard.writeText(payload);
    flashButton(copyBookcaseButton, '已复制');
  } catch {
    flashButton(copyBookcaseButton, '手动复制');
  }
}

function updateBookcaseStepState() {
  bookcaseStepButtons.forEach((button) => {
    const isActive = button.dataset.bookcaseStep === bookcaseStepMode;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-current', isActive ? 'true' : 'false');
  });
}

function formatBookcaseTransform() {
  return {
    model: bookcaseModelPath,
    position: bookcaseTransform.position.map((value) => Number(value.toFixed(3))),
    rotationY: Number(bookcaseTransform.rotationY.toFixed(3)),
    rotationYDeg: Number(THREE.MathUtils.radToDeg(bookcaseTransform.rotationY).toFixed(1)),
    scale: Number(bookcaseTransform.scale.toFixed(3)),
  };
}

function renderBookcaseOutput() {
  if (!bookcaseOutput) {
    return;
  }

  bookcaseOutput.value = JSON.stringify(formatBookcaseTransform(), null, 2);
}

async function loadProductionHeadAvatar() {
  try {
    const response = await fetch(officeSceneModelPath, { method: 'HEAD' });
    if (!response.ok) {
      return null;
    }
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      return null;
    }
  } catch {
    return null;
  }

  return new Promise((resolve) => {
    const loader = createModelLoader();
    loader.load(
      officeSceneModelPath,
      (gltf) => {
        const model = gltf.scene;
        model.name = 'production-avatar-head-source';
        normalizeImportedAvatar(model);
        resolve(createClippedProductionHead(model));
      },
      undefined,
      () => resolve(null)
    );
  });
}

function createClippedProductionHead(model) {
  tuneImportedAvatarMaterials(model);

  const root = new THREE.Group();
  root.name = 'production-head-only-root';
  root.position.set(2.08, -1.72, -1.02);
  root.rotation.set(0, deg(-8), 0);
  root.scale.setScalar(0.56);
  root.add(model);

  const clipPlanes = [
    new THREE.Plane(new THREE.Vector3(0, 1, 0), 0.62),
    new THREE.Plane(new THREE.Vector3(0, -1, 0), 0.36),
    new THREE.Plane(new THREE.Vector3(1, 0, 0), -1.62),
    new THREE.Plane(new THREE.Vector3(-1, 0, 0), 2.58),
    new THREE.Plane(new THREE.Vector3(0, 0, 1), 1.68),
    new THREE.Plane(new THREE.Vector3(0, 0, -1), -0.2),
  ];
  applyMaterialClipping(model, clipPlanes);

  animatedHead = root;
  return root;
}

function applyMaterialClipping(model, clipPlanes) {
  model.traverse((child) => {
    if (!child.isMesh) {
      return;
    }

    const applyClip = (material) => {
      material.clippingPlanes = clipPlanes;
      material.clipShadows = true;
      material.needsUpdate = true;
      return material;
    };

    child.material = Array.isArray(child.material)
      ? child.material.map((material) => applyClip(material))
      : applyClip(child.material);
  });
}

function createHeadOnlyAvatar() {
  const root = new THREE.Group();
  root.name = 'happy-head-only-avatar';

  animatedHead = new THREE.Group();
  animatedHead.name = 'happy-head-rig';
  animatedHead.position.set(2.18, -1.72, -1.04);
  animatedHead.rotation.set(deg(-2), deg(-12), deg(0));
  animatedHead.scale.setScalar(1.2);
  root.add(animatedHead);

  addHead(animatedHead);

  return root;
}

function createSeatedOfficeAvatar() {
  const root = new THREE.Group();
  root.name = 'seated-office-avatar';
  root.position.set(2.08, -1.18, -1.02);
  root.rotation.set(0, deg(-7), 0);
  root.scale.setScalar(0.96);

  addMesh(root, roundedBox(0.64, 0.035, 0.2, 0.02), materials.frame, [0, 0.23, 0.72], [1, 1, 1], [deg(2), 0, 0]);
  addMesh(root, roundedBox(0.18, 0.035, 0.24, 0.035), materials.frame, [0.48, 0.23, 0.72], [1, 1, 1], [deg(2), deg(-8), 0]);

  const chair = new THREE.Group();
  chair.name = 'office-chair';
  root.add(chair);
  addMesh(chair, roundedBox(0.78, 0.11, 0.62, 0.055), materials.frame, [0, -0.56, -0.2], [1, 1, 1]);
  addMesh(chair, roundedBox(0.78, 0.9, 0.12, 0.07), materials.frame, [0, -0.1, -0.48], [1, 1, 1], [deg(-6), 0, 0]);
  capsuleBetween(chair, [0, -0.62, -0.2], [0, -1.1, -0.18], 0.045, materials.frame, [0.75, 0.75], 14);
  [-0.3, 0.3].forEach((x) => {
    capsuleBetween(chair, [x, -1.08, -0.18], [x * 1.4, -1.32, 0.12], 0.028, materials.frame, [0.72, 0.72], 10);
  });

  const body = new THREE.Group();
  body.name = 'seated-office-body';
  body.rotation.set(deg(-3), deg(-5), deg(1));
  root.add(body);

  addOval(body, materials.jacket, [0, -0.1, 0], [0.42, 0.52, 0.24], [deg(-4), 0, 0]);
  addOval(body, materials.shirt, [0.02, -0.08, 0.19], [0.27, 0.43, 0.07], [deg(-2), 0, 0]);
  addMesh(body, roundedBox(0.23, 0.56, 0.045, 0.045), materials.jacket, [-0.18, -0.1, 0.22], [1, 1, 1], [deg(2), deg(-8), deg(-5)]);
  addMesh(body, roundedBox(0.22, 0.54, 0.045, 0.045), materials.jacket, [0.2, -0.11, 0.22], [1, 1, 1], [deg(2), deg(8), deg(5)]);
  addMesh(body, roundedBox(0.28, 0.09, 0.16, 0.04), materials.jacketShadow, [-0.31, 0.18, 0.02], [1, 1, 1], [deg(4), 0, deg(-18)]);
  addMesh(body, roundedBox(0.28, 0.09, 0.16, 0.04), materials.jacketShadow, [0.31, 0.18, 0.02], [1, 1, 1], [deg(4), 0, deg(18)]);

  addSeatedArms(body);
  addSeatedLegs(body);
  addCalmOfficeHead(body);

  return root;
}

function addSeatedArms(parent) {
  capsuleBetween(parent, [-0.34, 0.08, 0.02], [-0.54, -0.1, 0.24], 0.115, materials.jacket, [1, 0.82], 18);
  capsuleBetween(parent, [-0.54, -0.1, 0.24], [-0.44, 0.18, 0.58], 0.088, materials.jacket, [0.9, 0.72], 18);
  addOval(parent, materials.jacketShadow, [-0.54, -0.1, 0.24], [0.11, 0.095, 0.085]);
  addMesh(parent, roundedBox(0.18, 0.09, 0.13, 0.04), materials.jacketDeep, [-0.45, 0.15, 0.54], [1, 1, 1], [deg(8), deg(-8), deg(8)]);
  addOval(parent, materials.skinWarm, [-0.43, 0.19, 0.65], [0.1, 0.055, 0.04], [deg(8), 0, deg(-10)]);

  capsuleBetween(parent, [0.34, 0.08, 0.02], [0.56, -0.08, 0.23], 0.115, materials.jacket, [1, 0.82], 18);
  capsuleBetween(parent, [0.56, -0.08, 0.23], [0.43, 0.2, 0.59], 0.088, materials.jacket, [0.9, 0.72], 18);
  addOval(parent, materials.jacketShadow, [0.56, -0.08, 0.23], [0.11, 0.095, 0.085]);
  addMesh(parent, roundedBox(0.18, 0.09, 0.13, 0.04), materials.jacketDeep, [0.44, 0.16, 0.55], [1, 1, 1], [deg(8), deg(8), deg(-8)]);
  addOval(parent, materials.skinWarm, [0.42, 0.2, 0.66], [0.1, 0.055, 0.04], [deg(8), 0, deg(10)]);
}

function addSeatedLegs(parent) {
  addOval(parent, materials.pants, [0, -0.55, -0.02], [0.44, 0.18, 0.26], [deg(-8), 0, 0]);
  capsuleBetween(parent, [-0.17, -0.58, 0.02], [-0.48, -0.98, 0.22], 0.13, materials.pants, [1.05, 0.85], 16);
  capsuleBetween(parent, [0.17, -0.58, 0.02], [0.46, -0.98, 0.2], 0.13, materials.pants, [1.05, 0.85], 16);
  addMesh(parent, roundedBox(0.34, 0.12, 0.32, 0.055), materials.shoe, [-0.56, -1.08, 0.32], [1, 1, 1], [deg(-5), deg(-16), deg(-4)]);
  addMesh(parent, roundedBox(0.34, 0.12, 0.32, 0.055), materials.shoe, [0.54, -1.08, 0.3], [1, 1, 1], [deg(-5), deg(16), deg(4)]);
}

function addCalmOfficeHead(parent) {
  capsuleBetween(parent, [0, 0.26, 0.02], [0, 0.43, 0.03], 0.085, materials.skin, [0.82, 0.78], 16);

  const head = new THREE.Group();
  head.name = 'calm-office-head';
  head.position.set(0.01, 0.78, 0.07);
  head.rotation.set(deg(-2), deg(-9), deg(1));
  parent.add(head);

  addOval(head, materials.skin, [0, 0.02, 0], [0.34, 0.46, 0.31]);
  addOval(head, materials.skin, [0, -0.34, 0.03], [0.24, 0.15, 0.21]);
  addOval(head, materials.skin, [-0.35, -0.01, -0.02], [0.07, 0.11, 0.048]);
  addOval(head, materials.skin, [0.35, -0.02, -0.02], [0.07, 0.11, 0.048]);
  addCalmOfficeFace(head);
  addHair(head);
  addBeanie(head);
  addSunglasses(head);

  animatedHead = head;
  animatedHeadBase = {
    y: head.position.y,
    rx: head.rotation.x,
    ry: head.rotation.y,
    rz: head.rotation.z,
  };
}

function addCalmOfficeFace(head) {
  addOval(head, materials.eye, [-0.12, 0.076, 0.29], [0.084, 0.044, 0.022], [0, deg(-4), 0]);
  addOval(head, materials.eye, [0.13, 0.076, 0.29], [0.084, 0.044, 0.022], [0, deg(-4), 0]);
  addOval(head, materials.iris, [-0.104, 0.07, 0.313], [0.021, 0.025, 0.008]);
  addOval(head, materials.iris, [0.146, 0.07, 0.313], [0.021, 0.025, 0.008]);
  addOval(head, materials.glint, [-0.096, 0.081, 0.322], [0.006, 0.006, 0.003]);
  addOval(head, materials.glint, [0.154, 0.081, 0.322], [0.006, 0.006, 0.003]);

  addMesh(head, roundedBox(0.19, 0.034, 0.022, 0.016), materials.hair, [-0.12, 0.205, 0.305], [1, 1, 1], [deg(3), 0, deg(-5)]);
  addMesh(head, roundedBox(0.19, 0.034, 0.022, 0.016), materials.hair, [0.14, 0.205, 0.305], [1, 1, 1], [deg(3), 0, deg(5)]);

  capsuleBetween(head, [0.005, 0.02, 0.31], [0.012, -0.13, 0.33], 0.026, materials.skinWarm, [0.72, 0.6], 14);
  addOval(head, materials.skinWarm, [0.016, -0.13, 0.345], [0.042, 0.026, 0.024]);

  capsuleBetween(head, [-0.11, -0.27, 0.326], [0.12, -0.268, 0.326], 0.012, materials.mouth, [0.65, 0.42], 12);
  addOval(head, materials.blush, [-0.23, -0.08, 0.292], [0.08, 0.04, 0.012], [0, deg(6), deg(-8)]);
  addOval(head, materials.blush, [0.23, -0.08, 0.292], [0.08, 0.04, 0.012], [0, deg(-6), deg(8)]);

  [
    [-0.09, -0.36, 0.29],
    [0, -0.38, 0.305],
    [0.09, -0.36, 0.29],
  ].forEach((dot) => {
    addOval(head, materials.stubble, dot, [0.008, 0.006, 0.003]);
  });
}

function animateHappyHead(elapsed) {
  if (!animatedHead) {
    return;
  }

  const base = animatedHeadBase ?? {
    y: animatedHead.position.y,
    rx: animatedHead.rotation.x,
    ry: animatedHead.rotation.y,
    rz: animatedHead.rotation.z,
  };
  animatedHead.position.y = base.y + Math.sin(elapsed * 2.1) * 0.01;
  animatedHead.rotation.x = base.rx + Math.sin(elapsed * 1.7 + 0.5) * 0.018;
  animatedHead.rotation.y = base.ry + Math.sin(elapsed * 1.9) * 0.035;
  animatedHead.rotation.z = base.rz + Math.sin(elapsed * 2.2) * 0.012;
}

async function loadProductionAvatar() {
  try {
    const response = await fetch(officeSceneModelPath, { method: 'HEAD' });
    if (!response.ok) {
      return null;
    }
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      return null;
    }
  } catch {
    return null;
  }

  return new Promise((resolve) => {
    const loader = createModelLoader();
    loader.load(
      officeSceneModelPath,
      (gltf) => {
        const model = gltf.scene;
        model.name = 'production-avatar-glb';
        normalizeImportedAvatar(model);
        resolve(createRefinedAvatarRoot(model));
      },
      undefined,
      () => resolve(null)
    );
  });
}

function normalizeImportedAvatar(model) {
  model.traverse((child) => {
    if (child.isMesh) {
      const isFaceSculptDetail = child.name.startsWith('face_sculpt_');
      child.castShadow = !isFaceSculptDetail;
      child.receiveShadow = !isFaceSculptDetail;
    }
  });

  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const targetHeight = 4.9;
  const scale = size.y > 0 ? targetHeight / size.y : 1;
  model.scale.setScalar(scale);
  model.position.set(-center.x * scale + 0.15, -box.min.y * scale - 2.18, -center.z * scale);
  model.rotation.set(0, deg(-12), 0);
}

function createRefinedAvatarRoot(model) {
  tuneImportedAvatarMaterials(model);

  const root = new THREE.Group();
  root.name = 'refined-avatar-display-root';
  root.position.set(1.35, 0, -0.08);

  root.add(model);
  return root;
}

function tuneImportedAvatarMaterials(model) {
  const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
  const tunedMaterials = new WeakMap();

  const tuneMaterial = (material) => {
    if (!material) {
      return material;
    }
    if (tunedMaterials.has(material)) {
      return tunedMaterials.get(material);
    }

    const tuned = material.clone();
    if ('metalness' in tuned) {
      tuned.metalness = Math.min(tuned.metalness ?? 0, 0.04);
    }
    if ('roughness' in tuned) {
      tuned.roughness = Math.max(tuned.roughness ?? 0.72, 0.72);
    }
    if ('envMapIntensity' in tuned) {
      tuned.envMapIntensity = 0.92;
    }
    if ('color' in tuned && tuned.color) {
      tuned.color.multiplyScalar(1.06);
    }

    [tuned.map, tuned.normalMap, tuned.roughnessMap, tuned.metalnessMap].forEach((texture) => {
      if (!texture) {
        return;
      }
      texture.anisotropy = maxAnisotropy;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = true;
      texture.needsUpdate = true;
    });

    tuned.needsUpdate = true;
    tunedMaterials.set(material, tuned);
    return tuned;
  };

  model.traverse((child) => {
    if (!child.isMesh) {
      return;
    }

    if (child.geometry) {
      child.geometry.computeVertexNormals();
    }
    child.material = Array.isArray(child.material)
      ? child.material.map((material) => tuneMaterial(material))
      : tuneMaterial(child.material);
  });
}

function cloneShots(source) {
  return JSON.parse(JSON.stringify(source));
}

function getShotStorageKey() {
  return `office-avatar-camera-shots:${officeSceneModelPath}`;
}

function loadStoredShots() {
  try {
    const saved = JSON.parse(localStorage.getItem(getShotStorageKey()) || 'null');
    if (!saved) {
      return;
    }

    ['desktop', 'mobile'].forEach((preset) => {
      if (!Array.isArray(saved[preset])) {
        return;
      }

      saved[preset].forEach((shot, index) => {
        if (!storyboardShots[preset]?.[index] || !Array.isArray(shot.camera) || !Array.isArray(shot.target)) {
          return;
        }

        storyboardShots[preset][index] = {
          camera: shot.camera.map(Number),
          target: shot.target.map(Number),
          duration: Number(shot.duration) || storyboardShots[preset][index].duration,
        };
      });
    });
  } catch {
    localStorage.removeItem(getShotStorageKey());
  }
}

function persistShots() {
  try {
    localStorage.setItem(getShotStorageKey(), JSON.stringify(storyboardShots));
  } catch {
    // Local storage can be unavailable in a few browser modes; the textarea still exposes the values.
  }
  renderShotOutput();
}

function compactVector(vector) {
  return vector.toArray().map((value) => Number(value.toFixed(3)));
}

function saveCurrentShot() {
  const preset = getViewportPreset();
  const shot = storyboardShots[preset][shotIndex];
  shot.camera = compactVector(camera.position);
  shot.target = compactVector(controls.target);
  heroCopyAnchorSignature = '';
  persistShots();
  updateNavState();
  updateHeroCopy();
  flashButton(saveShotButton, '已保存');
}

async function copyCurrentShots() {
  const payload = JSON.stringify(
    {
      shots: storyboardShots,
      heroCopy: heroCopyTransform,
      bookcase: formatBookcaseTransform(),
    },
    null,
    2
  );
  if (shotOutput) {
    shotOutput.value = payload;
    shotOutput.select();
  }

  try {
    await navigator.clipboard.writeText(payload);
    flashButton(copyShotsButton, '已复制');
  } catch {
    flashButton(copyShotsButton, '手动复制');
  }
}

function resetStoredShots() {
  const defaults = cloneShots(defaultStoryboardShots);
  storyboardShots.desktop = defaults.desktop;
  storyboardShots.mobile = defaults.mobile;
  heroCopyAnchorSignature = '';
  try {
    localStorage.removeItem(getShotStorageKey());
  } catch {
    // Ignore storage failures; the in-memory reset is still useful.
  }
  renderShotOutput();
  applyShot(shotIndex, true);
  flashButton(resetShotsButton, '已重置');
}

function renderShotOutput() {
  if (!shotOutput) {
    return;
  }

  const preset = getViewportPreset();
  shotOutput.value = JSON.stringify(
    {
      preset,
      active: shotIndex + 1,
      shots: storyboardShots[preset],
      heroCopy: heroCopyTransform,
    },
    null,
    2
  );
}

function flashButton(button, label) {
  if (!button) {
    return;
  }

  const original = button.textContent;
  button.textContent = label;
  window.setTimeout(() => {
    button.textContent = original;
  }, 900);
}

function getViewportPreset() {
  return window.innerWidth < 720 ? 'mobile' : 'desktop';
}

function getShots() {
  return storyboardShots[getViewportPreset()];
}

function getNextShotIndex() {
  const shots = getShots();
  return (shotIndex + 1) % shots.length;
}

function smoothstep(edge0, edge1, value) {
  const t = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function getHeroCopyHomeScreenPosition(width, height) {
  if (width < 720) {
    const copyHeight = heroCopy?.offsetHeight || 116;
    return {
      x: 18,
      y: Math.max(190, height - 28 - copyHeight / 2),
    };
  }

  if (width < 1060) {
    return {
      x: 42,
      y: height * 0.46,
    };
  }

  return {
    x: THREE.MathUtils.clamp(width * 0.11, 74, 240),
    y: height * 0.46,
  };
}

function updateHeroCopyAnchor(width, height) {
  const homeShot = getShots()?.[0];
  if (!homeShot) {
    return;
  }

  const signature = [
    getViewportPreset(),
    width,
    height,
    ...homeShot.camera,
    ...homeShot.target,
  ].join(':');

  if (signature === heroCopyAnchorSignature) {
    return;
  }

  heroCopyAnchorSignature = signature;
  heroCopyHomeCamera.aspect = width / height;
  heroCopyHomeCamera.position.fromArray(homeShot.camera);
  heroCopyHomeTarget.fromArray(homeShot.target);
  heroCopyHomeCamera.lookAt(heroCopyHomeTarget);
  heroCopyHomeCamera.updateProjectionMatrix();
  heroCopyHomeCamera.updateMatrixWorld(true);

  const homePosition = getHeroCopyHomeScreenPosition(width, height);
  heroCopyRayPoint.set(
    (homePosition.x / width) * 2 - 1,
    -(homePosition.y / height) * 2 + 1,
    0.5
  );
  heroCopyRayPoint.unproject(heroCopyHomeCamera);

  const direction = heroCopyRayPoint.sub(heroCopyHomeCamera.position).normalize();
  const targetDistance = heroCopyHomeCamera.position.distanceTo(heroCopyHomeTarget);
  const anchorDistance = targetDistance * (width < 720 ? 0.92 : 0.88);
  heroCopyAnchor.copy(heroCopyHomeCamera.position).addScaledVector(direction, anchorDistance);
  heroCopyHomeDistance = Math.max(heroCopyHomeCamera.position.distanceTo(heroCopyAnchor), 0.001);
}

function getHeroCopyVisibility() {
  if (!transition) {
    return shotIndex === 0 ? 1 : 0;
  }

  const progress = transition.progress || 0;
  if (transition.fromIndex === 0 && transition.toIndex === 0) {
    return 1;
  }
  if (transition.fromIndex === 0) {
    return 1 - smoothstep(0.1, 0.82, progress);
  }
  if (transition.toIndex === 0) {
    return smoothstep(0.2, 0.92, progress);
  }

  return 0;
}

function updateHeroCopy() {
  if (!heroCopy) {
    return;
  }

  const width = canvas.clientWidth || window.innerWidth || 1;
  const height = canvas.clientHeight || window.innerHeight || 1;
  updateHeroCopyAnchor(width, height);

  heroCopyProjection.copy(heroCopyAnchor).project(camera);
  const x = (heroCopyProjection.x * 0.5 + 0.5) * width;
  const y = (-heroCopyProjection.y * 0.5 + 0.5) * height;
  const copyWidth = heroCopy.offsetWidth || 440;
  const copyHeight = heroCopy.offsetHeight || 140;
  const isInFront = heroCopyProjection.z > -1 && heroCopyProjection.z < 1;
  const isNearViewport =
    x > -copyWidth * 1.25 &&
    x < width + copyWidth * 0.4 &&
    y > -copyHeight &&
    y < height + copyHeight;
  const visibleAmount = getHeroCopyVisibility() * (isInFront && isNearViewport ? 1 : 0);
  const distance = Math.max(camera.position.distanceTo(heroCopyAnchor), 0.001);
  const scale = THREE.MathUtils.clamp(heroCopyHomeDistance / distance, 0.72, 1.12) * heroCopyTransform.scale;

  const homeShot = getShots()?.[0];
  const homeYaw = homeShot
    ? Math.atan2(homeShot.camera[0] - heroCopyAnchor.x, homeShot.camera[2] - heroCopyAnchor.z)
    : 0;
  const currentYaw = Math.atan2(camera.position.x - heroCopyAnchor.x, camera.position.z - heroCopyAnchor.z);
  const yawDelta = THREE.MathUtils.euclideanModulo(currentYaw - homeYaw + Math.PI, Math.PI * 2) - Math.PI;
  const rotateY = THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(yawDelta) * 0.32, -22, 22);

  heroCopy.style.setProperty('--hero-copy-x', `${(x + heroCopyTransform.x).toFixed(2)}px`);
  heroCopy.style.setProperty('--hero-copy-y', `${(y + heroCopyTransform.y).toFixed(2)}px`);
  heroCopy.style.setProperty('--hero-copy-scale', scale.toFixed(3));
  heroCopy.style.setProperty('--hero-copy-rotate-y', `${rotateY.toFixed(2)}deg`);
  heroCopy.style.setProperty('--hero-copy-opacity', visibleAmount.toFixed(3));
  heroCopy.classList.toggle('is-hidden', visibleAmount <= 0.01);
  heroCopy.setAttribute('aria-hidden', visibleAmount <= 0.01 ? 'true' : 'false');
}

function getPanelVisibility(panelIndex) {
  if (!transition) {
    return shotIndex === panelIndex ? 1 : 0;
  }

  const progress = transition.progress || 0;
  if (transition.fromIndex === panelIndex && transition.toIndex === panelIndex) {
    return 1;
  }
  if (transition.fromIndex === panelIndex) {
    return 1 - smoothstep(0.08, 0.78, progress);
  }
  if (transition.toIndex === panelIndex) {
    return smoothstep(0.16, 0.9, progress);
  }

  return 0;
}

function updatePagePanels() {
  pagePanels.forEach((panel) => {
    const panelIndex = Number(panel.dataset.pagePanel);
    if (!Number.isInteger(panelIndex)) {
      return;
    }

    const visibleAmount = getPanelVisibility(panelIndex);
    const offsetX = (1 - visibleAmount) * 58;
    const scale = 0.985 + visibleAmount * 0.015;
    panel.style.setProperty('--panel-opacity', visibleAmount.toFixed(3));
    panel.style.setProperty('--panel-offset-x', `${offsetX.toFixed(2)}px`);
    panel.style.setProperty('--panel-scale', scale.toFixed(3));
    panel.style.setProperty('--panel-blur', `${((1 - visibleAmount) * 8).toFixed(2)}px`);
    panel.classList.toggle('is-hidden', visibleAmount <= 0.01);
    panel.setAttribute('aria-hidden', visibleAmount <= 0.01 ? 'true' : 'false');
  });
}

function setAboutScreen(index) {
  resetPanelScroll(aboutPanel);
  aboutScreenIndex = THREE.MathUtils.euclideanModulo(index, Math.max(aboutScreens.length, 1));
  aboutScreens.forEach((screen, screenIndex) => {
    const isActive = screenIndex === aboutScreenIndex;
    screen.classList.toggle('is-active', isActive);
    screen.setAttribute('aria-hidden', isActive ? 'false' : 'true');
  });
  aboutScreenButtons.forEach((button) => {
    const isActive = Number(button.dataset.aboutTarget) === aboutScreenIndex;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-current', isActive ? 'true' : 'false');
  });
}

function setExperienceScreen(index) {
  resetPanelScroll(experiencePanel);
  experienceScreenIndex = THREE.MathUtils.euclideanModulo(index, Math.max(experienceScreens.length, 1));
  experienceScreens.forEach((screen, screenIndex) => {
    const isActive = screenIndex === experienceScreenIndex;
    screen.classList.toggle('is-active', isActive);
    screen.setAttribute('aria-hidden', isActive ? 'false' : 'true');
  });
  experienceScreenButtons.forEach((button) => {
    const isActive = Number(button.dataset.experienceTarget) === experienceScreenIndex;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-current', isActive ? 'true' : 'false');
  });
}

function setPortfolioScreen(index) {
  resetPanelScroll(portfolioPanel);
  portfolioScreenIndex = THREE.MathUtils.euclideanModulo(index, Math.max(portfolioScreens.length, 1));
  portfolioVideos.forEach((video) => video.pause());
  portfolioScreens.forEach((screen, screenIndex) => {
    const isActive = screenIndex === portfolioScreenIndex;
    screen.classList.toggle('is-active', isActive);
    screen.setAttribute('aria-hidden', isActive ? 'false' : 'true');
  });
  portfolioScreenButtons.forEach((button) => {
    const isActive = Number(button.dataset.portfolioTarget) === portfolioScreenIndex;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-current', isActive ? 'true' : 'false');
  });
}

function setHomepageScreen(index) {
  resetPanelScroll(homepagePanel);
  homepageScreenIndex = THREE.MathUtils.euclideanModulo(index, Math.max(homepageScreens.length, 1));
  homepageScreens.forEach((screen, screenIndex) => {
    const isActive = screenIndex === homepageScreenIndex;
    screen.classList.toggle('is-active', isActive);
    screen.setAttribute('aria-hidden', isActive ? 'false' : 'true');
    if (isActive) {
      const viewer = screen.querySelector('[data-homepage-viewer]');
      const progressLabel = screen.querySelector('[data-homepage-progress]');
      if (viewer) viewer.scrollTop = 0;
      if (progressLabel) progressLabel.textContent = '向下滑动浏览 · 0%';
    }
  });
  homepageScreenButtons.forEach((button) => {
    const isActive = Number(button.dataset.homepageTarget) === homepageScreenIndex;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-current', isActive ? 'true' : 'false');
  });
}

function setOtherScreen(index) {
  resetPanelScroll(otherPanel);
  otherScreenIndex = THREE.MathUtils.euclideanModulo(index, Math.max(otherScreens.length, 1));
  otherScreens.forEach((screen, screenIndex) => {
    const isActive = screenIndex === otherScreenIndex;
    screen.classList.toggle('is-active', isActive);
    screen.setAttribute('aria-hidden', isActive ? 'false' : 'true');
    if (isActive) screen.querySelectorAll('.wide-work-scroll').forEach((scroller) => { scroller.scrollLeft = 0; });
  });
  otherScreenButtons.forEach((button) => {
    const isActive = Number(button.dataset.otherTarget) === otherScreenIndex;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-current', isActive ? 'true' : 'false');
  });
}

function resetPanelScroll(panel) {
  const scroller = panel?.querySelector('.panel-inner');
  if (scroller) scroller.scrollTop = 0;
}

function advancePage() {
  if (shotIndex === 1 && aboutScreenIndex === 0) {
    setAboutScreen(1);
    return;
  }

  if (shotIndex === 1 && aboutScreenIndex === 1) {
    setExperienceScreen(0);
    transitionToShot(2);
    return;
  }

  if (shotIndex === 2 && experienceScreenIndex < experienceScreens.length - 1) {
    setExperienceScreen(experienceScreenIndex + 1);
    return;
  }

  if (shotIndex === 2 && experienceScreenIndex === experienceScreens.length - 1) {
    setPortfolioScreen(0);
    transitionToShot(3);
    return;
  }

  if (shotIndex === 3 && portfolioScreenIndex < portfolioScreens.length - 1) {
    setPortfolioScreen(portfolioScreenIndex + 1);
    return;
  }

  if (shotIndex === 3 && portfolioScreenIndex === portfolioScreens.length - 1) {
    setHomepageScreen(0);
    transitionToShot(4);
    return;
  }

  if (shotIndex === 4 && homepageScreenIndex < homepageScreens.length - 1) {
    setHomepageScreen(homepageScreenIndex + 1);
    return;
  }

  if (shotIndex === 4 && homepageScreenIndex === homepageScreens.length - 1) {
    setOtherScreen(0);
    transitionToShot(5);
    return;
  }

  if (shotIndex === 5 && otherScreenIndex < otherScreens.length - 1) {
    setOtherScreen(otherScreenIndex + 1);
    return;
  }

  if (shotIndex === 5 && otherScreenIndex === otherScreens.length - 1) {
    transitionToShot(6);
    return;
  }

  const nextIndex = getNextShotIndex();
  if (nextIndex === 1) {
    setAboutScreen(0);
  }
  if (nextIndex === 2) {
    setExperienceScreen(0);
  }
  if (nextIndex === 3) {
    setPortfolioScreen(0);
  }
  if (nextIndex === 4) {
    setHomepageScreen(0);
  }
  if (nextIndex === 5) {
    setOtherScreen(0);
  }
  transitionToShot(nextIndex);
}

function retreatPage() {
  if (shotIndex === 0) return;

  if (shotIndex === 1) {
    if (aboutScreenIndex > 0) setAboutScreen(aboutScreenIndex - 1);
    else transitionToShot(0);
    return;
  }

  if (shotIndex === 2) {
    if (experienceScreenIndex > 0) setExperienceScreen(experienceScreenIndex - 1);
    else {
      setAboutScreen(Math.max(aboutScreens.length - 1, 0));
      transitionToShot(1);
    }
    return;
  }

  if (shotIndex === 3) {
    if (portfolioScreenIndex > 0) setPortfolioScreen(portfolioScreenIndex - 1);
    else {
      setExperienceScreen(Math.max(experienceScreens.length - 1, 0));
      transitionToShot(2);
    }
    return;
  }

  if (shotIndex === 4) {
    if (homepageScreenIndex > 0) setHomepageScreen(homepageScreenIndex - 1);
    else {
      setPortfolioScreen(Math.max(portfolioScreens.length - 1, 0));
      transitionToShot(3);
    }
    return;
  }

  if (shotIndex === 5) {
    if (otherScreenIndex > 0) setOtherScreen(otherScreenIndex - 1);
    else {
      setHomepageScreen(Math.max(homepageScreens.length - 1, 0));
      transitionToShot(4);
    }
    return;
  }

  if (shotIndex === 6) {
    setOtherScreen(Math.max(otherScreens.length - 1, 0));
    transitionToShot(5);
  }
}

function updateNavState() {
  navButtons.forEach((button) => {
    const isActive = Number(button.dataset.shotNav) === shotIndex;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-current', isActive ? 'page' : 'false');
  });
  renderShotOutput();
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function applyShot(index, instant = false) {
  const shots = getShots();
  const shot = shots[index % shots.length];
  shotIndex = index % shots.length;
  updateNavState();

  if (instant) {
    transition = null;
    controls.enabled = true;
    camera.position.fromArray(shot.camera);
    controls.target.fromArray(shot.target);
    camera.lookAt(controls.target);
    controls.update();
    updateHeroCopy();
    updatePagePanels();
    return;
  }

  transitionToShot(shotIndex);
}

function transitionToShot(index) {
  const shots = getShots();
  const fromIndex = shotIndex;
  const toIndex = index % shots.length;
  const shot = shots[toIndex];
  shotIndex = toIndex;
  updateNavState();
  transition = {
    startTime: performance.now(),
    duration: shot.duration,
    progress: 0,
    fromIndex,
    toIndex,
    fromCamera: camera.position.clone(),
    toCamera: new THREE.Vector3(...shot.camera),
    fromTarget: controls.target.clone(),
    toTarget: new THREE.Vector3(...shot.target),
  };
  controls.enabled = false;
  controls.autoRotate = false;
  updateHeroCopy();
  updatePagePanels();
}

function updateTransition() {
  if (!transition) {
    return;
  }

  const elapsed = performance.now() - transition.startTime;
  const progress = Math.min(1, elapsed / transition.duration);
  transition.progress = progress;
  const eased = easeInOutCubic(progress);
  camera.position.lerpVectors(transition.fromCamera, transition.toCamera, eased);
  controls.target.lerpVectors(transition.fromTarget, transition.toTarget, eased);
  camera.lookAt(controls.target);

  if (progress >= 1) {
    transition = null;
    controls.enabled = true;
    controls.update();
  }
}

function applyCameraPreset(force = false) {
  const preset = getViewportPreset();
  if (!force && preset === cameraPreset) {
    return;
  }

  cameraPreset = preset;
  if (preset === 'mobile') {
    controls.minDistance = 0.65;
    controls.maxDistance = 34;
  } else {
    controls.minDistance = 0.55;
    controls.maxDistance = 34;
  }
  applyShot(shotIndex, true);
}

function resize() {
  const { clientWidth, clientHeight } = canvas;
  if (canvas.width !== clientWidth || canvas.height !== clientHeight) {
    renderer.setSize(clientWidth, clientHeight, false);
    camera.aspect = clientWidth / clientHeight;
    camera.updateProjectionMatrix();
    applyCameraPreset();
  }
}

function animate() {
  resize();
  updateTransition();
  const elapsed = clock.getElapsedTime();
  const delta = elapsed - previousElapsed;
  previousElapsed = elapsed;
  if (animationMixer) {
    animationMixer.update(delta);
  }
  animateHappyHead(elapsed);
  if (cameraFillLight) {
    cameraFillLight.position.copy(camera.position);
  }
  controls.update();
  updateHeroCopy();
  updatePagePanels();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();
