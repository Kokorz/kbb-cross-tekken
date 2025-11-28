//Final Project Derived from Research Project!

let data_str, data_gli;
let str_loadedAnimations = {};
let gli_loadedAnimations = {};
let p1, p2, gfloor;

let bgOffsetX = 0,
  bgOffsetY = 0;

let UI;

let globalHitPause = 0;

const MOTIONS = {
  run: { sequences: [[6, 6]], leniency: 3 },
  qcf: { sequences: [[2, 3, 6]], leniency: 4 },
  dp: {
    sequences: [
      [6, 2, 3],
      [6, 5, 2, 3],
      [6, 2, 3, 6],
    ],
    leniency: 4,
  },
};

const KEYBINDINGS_P1 = {
  up: 85, // u
  down: 74, // h
  left: 72, // j
  right: 75, // k
  lp: 90, // zh
  rp: 88, // x
  lk: 67, // c
  rk: 86, // v
};

const KEYBINDINGS_P2 = {
  up: 87, // w
  down: 83, // s
  left: 65, // a
  right: 68, // d
  lp: 66, // b
  lk: 78, // n
  rp: 77, // m
  rk: 188, // comma
};

function preload() {
  defaultImageScale(1);
  data_str = loadJSON("data/data_str.json");
  data_gli = loadJSON("data/data_gli.json");
}

function setup() {
  new Canvas(256, 144);
  displayMode(CENTER, PIXELATED, 8);
  frameRate(60);

  allSprites.pixelPerfect = true;

  str_loadedAnimations = loadAnimations(data_str);
  gli_loadedAnimations = loadAnimations(data_gli);

  gfloor = new Sprite();
  gfloor.y = width * 0.972;
  gfloor.w = width * 4;
  gfloor.h = 0;
  gfloor.physics = STATIC;

  p1 = new Stray((width / 4) * 3, gfloor.y, KEYBINDINGS_P1);
  p2 = new Glitch(width / 4, gfloor.y, KEYBINDINGS_P2);

  p1.opponent = p2;
  p2.opponent = p1;

  UI = new HUD(p1, p2);
}

function loadAnimations(json) {
  let anims = {};
  for (const [name, data] of Object.entries(json.animations)) {
    let lastMoveData = data.defaultMoveData ?? null;

    const frames = data.frames.map((f) => {
      if (f.movedata) lastMoveData = f.movedata;
      return {
        img: loadImage(f.image),
        duration: f.duration ?? json.defaultDuration,
        boxes: f.boxes ?? [],
        offset: f.offset ?? [0, 0],
        movedata: lastMoveData,
      };
    });

    anims[name] = {
      frames,
      loopStart: data.loopStart ?? 0,
      playOnce: data.playOnce ?? !data.loop,
      defaultBoxes: data.defaultBoxes ?? [],
    };
  }
  return anims;
}

function update() {
  gfloor.x = (p1.sprite.y + p2.sprite.y) / 2;
  p1.updateLogic();
  p2.updateLogic();
  checkHits(p1, p2);
  checkHits(p2, p1);
  resolvePush(p1, p2);
  resolvePush(p2, p1);

  if (globalHitPause > 0) {
    globalHitPause--;
    return; // literally freeze the entire game world except timers
  }
}

function draw() {
  background(220);
  drawParallaxBackground();
  updateCamera();

  camera.on();
  drawInfiniteFloor();
  p1.render();
  p2.render();
  camera.off();
  UI.display();
}

function updateCamera() {
  //  Player distance for dynamic zoom 
  const pDist = abs(p1.sprite.x - p2.sprite.x);

  const minDist = (width / 3) * 2;
  const maxDist = width;

  const maxZoom = 1;
  const minZoom = 0.65;

  let t = (pDist - minDist) / (maxDist - minDist);
  t = constrain(t, 0, 1);

  const targetZoom = lerp(maxZoom, minZoom, t);

  //  Horizontal centering 
  const targetX = (p1.sprite.x + p2.sprite.x) * 0.5;

  //  Vertical centering with floor anchor 
  const targetY_raw = (p1.sprite.y + p2.sprite.y) * 0.5 - 50;

  const floorY = gfloor.y;
  const bottomMarginPixels = 100;

  const worldMargin = bottomMarginPixels / camera.zoom;
  const cameraBottomWorld = height / 2 / camera.zoom;

  const targetY_floorAnchor = floorY - (cameraBottomWorld - worldMargin);

  const targetY = min(targetY_raw, targetY_floorAnchor);

  //  Lerp toward targets 
  let camX = lerp(camera.x, targetX, 0.12);
  let camY = lerp(camera.y, targetY, 0.12);
  let camZoom = lerp(camera.zoom, targetZoom, 0.05);

  //  SNAP TO PIXEL GRID
  const grid = 8; // because of displayMode scale = 8
  camX = round(camX * grid) / grid;
  camY = round(camY * grid) / grid;
  camZoom = round(camZoom * grid) / grid;

  //  Apply snapped values 
  camera.x = camX;
  camera.y = camY;
  camera.zoom = camZoom;
}

// Background Handlers...
function drawParallaxBackground() {
  const parallaxFactor = 0.5,
    checkerSize = 10;
  bgOffsetX =
    (((camera.x * parallaxFactor) % (checkerSize * 2)) + checkerSize * 2) %
    (checkerSize * 2);
  bgOffsetY =
    (((camera.y * parallaxFactor) % (checkerSize * 2)) + checkerSize * 2) %
    (checkerSize * 2);

  const cols = ceil(width / checkerSize) + 2;
  const rows = ceil(height / checkerSize) + 2;

  noStroke();
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++)
      fill((x + y) % 2 === 0 ? 130 : 170),
        rect(
          x * checkerSize - bgOffsetX,
          y * checkerSize - bgOffsetY,
          checkerSize,
          checkerSize
        );
}

function drawInfiniteFloor() {
  // Base pixel size for tiles (how big they look at zoom = 1)
  const baseTileWidth = 40;
  const baseTileHeight = 120;

  // Convert to world units so camera zoom will enlarge/shrink them visually
  const tileWidth = baseTileWidth / camera.zoom;
  const tileHeight = baseTileHeight / camera.zoom;

  // Determine visible tile span in world space
  const startTile = floor((camera.x - width / 2 / camera.zoom) / tileWidth) - 2;
  const endTile = startTile + ceil(width / camera.zoom / tileWidth) + 4;

  fill(30);
  stroke(30);
  strokeWeight(2);

  for (let i = startTile; i <= endTile; i++) {
    const x = i * tileWidth;
    rect(x, gfloor.y, tileWidth, tileHeight);
  }
}

//  INPUT / MOTION 
function getCurrentDirection() {
  const up = keyIsDown(this.keybindings.up),
    down = keyIsDown(this.keybindings.down),
    left = keyIsDown(this.keybindings.left),
    right = keyIsDown(this.keybindings.right);
  if (up && right) return 9;
  if (up && left) return 7;
  if (down && right) return 3;
  if (down && left) return 1;
  if (up) return 8;
  if (down) return 2;
  if (left) return 4;
  if (right) return 6;
  return 5;
}

function matchPattern(buffer, pattern, leniency = 3, timeWindow = 12) {
  let seqIndex = pattern.length - 1;
  let lastFrame = null;
  let mismatches = 0;

  for (let i = buffer.length - 1; i >= 0; i--) {
    const { dir, frame } = buffer[i];
    if (lastFrame !== null && lastFrame - frame > timeWindow) break;

    if (dir === pattern[seqIndex]) {
      seqIndex--;
      lastFrame = frame;
      if (seqIndex < 0) return true;
    } else mismatches++;

    if (mismatches > leniency) break;
  }
  return false;
}

function flipDirValue(dir) {
  const map = { 1: 3, 3: 1, 4: 6, 6: 4, 7: 9, 9: 7 };
  return map[dir] ?? dir;
}

function detectMotion(buffer, motionName, facing = 1) {
  if (motionName === "run") {
    const forward = facing === 1 ? 6 : 4;
    const timeWindow = 8; // adjust for responsiveness
    let lastTap = null;

    for (let i = buffer.length - 1; i >= 0; i--) {
      const { dir, frame } = buffer[i];
      if (dir === forward) {
        if (lastTap !== null && lastTap - frame <= timeWindow) return true;
        lastTap = frame;
      }
      // invalidate if opposite direction appears between taps
      if (dir === (forward === 6 ? 4 : 6)) break;
    }
    return false;
  }

  const motion = MOTIONS[motionName];
  if (!motion) return false;

  return motion.sequences.some((seq) => {
    const adjusted = seq.map((v) => (facing === -1 ? flipDirValue(v) : v));
    return matchPattern(buffer, adjusted, motion.leniency);
  });
}

// Collision Detection
function normalizeBox(box) {
  return {
    x: box.w < 0 ? box.x + box.w : box.x,
    y: box.h < 0 ? box.y + box.h : box.y,
    w: Math.abs(box.w),
    h: Math.abs(box.h),
  };
}

function rectOverlap(a, b) {
  const A = normalizeBox(a);
  const B = normalizeBox(b);

  // Ignore boxes with zero width or height
  if (A.w == 0 || A.h == 0 || B.w == 0 || B.h == 0) return false;

  return (
    A.x < B.x + B.w && A.x + A.w > B.x && A.y < B.y + B.h && A.y + A.h > B.y
  );
}

function checkHits(attacker, defender) {
  // Do not check hits during shared hitstop
  if (globalHitPause > 0) return;

  const currentMD = attacker.getCurrentMoveData();
  if (!currentMD || !attacker.canHitThisSequence) return;

  const guardFlag = currentMD.guard_flag; // "High", "Mid", "Low"

  const hitboxes = attacker.hitboxes;
  const hurtboxes = defender.hurtboxes;

  for (const hit of hitboxes) {
    if (!hit || hit.w === 0 || hit.h === 0) continue;

    for (const hurt of hurtboxes) {
      if (!hurt || hurt.w === 0 || hurt.h === 0) continue;

      if (!rectOverlap(hit, hurt)) continue;

      // ----------------------------------------------------------
      // 1. Tekken High Whiff Rule
      //    A standing High attack whiffs on a crouching defender
      //    IF they are not attempting to guard.
      // ----------------------------------------------------------
      if (guardFlag === "High" && defender.isCrouching && 
          !defender.isHoldingBack() && !defender.isHoldingDownBack()) {
        return;
      }

      // ----------------------------------------------------------
      // 2. Determine if defender is *attempting* to block (via input)
      //    No proximity. No isGuarding flag. Pure input logic.
      // ----------------------------------------------------------
      const wantsToBlock =
        defender.isHoldingBack() || defender.isHoldingDownBack();

      // ----------------------------------------------------------
      // 3. Apply block or hit.
      //    takeBlock will internally decide correct/incorrect block.
      // ----------------------------------------------------------

      if (wantsToBlock) {
        defender.takeBlock(attacker, { movedata: currentMD });
      } else {
        defender.takeHit(attacker, { movedata: currentMD });
      }

      // ----------------------------------------------------------
      // 4. Prevent repeat hits for this sequence
      // ----------------------------------------------------------
      attacker.canHitThisSequence = false;
      attacker.lastHitMoveData = currentMD;

      return;
    }
  }
}



function resolvePush(p1, p2) {
  let minOverlap = Infinity;

  p1.pushboxes.forEach((b1) => {
    if (b1.w === 0 || b1.h === 0) return;

    p2.pushboxes.forEach((b2) => {
      if (b2.w === 0 || b2.h === 0) return;

      if (rectOverlap(b1, b2)) {
        const leftA = b1.x;
        const rightA = b1.x + b1.w;
        const leftB = b2.x;
        const rightB = b2.x + b2.w;

        const overlap = Math.min(rightA - leftB, rightB - leftA);

        if (overlap > 0 && overlap < minOverlap) {
          minOverlap = overlap;
        }
      }
    });
  });

  if (minOverlap !== Infinity) {
    const half = minOverlap / 2;

    if (p1.sprite.x < p2.sprite.x) {
      p1.sprite.x -= half;
      p2.sprite.x += half;
    } else {
      p1.sprite.x += half;
      p2.sprite.x -= half;
    }
  }
}

//Stray!
class Stray extends Character {
  constructor(x, y, keybinds) {
    super("Stray", "str", x, y, keybinds);

    // Assign preloaded animations from JSON
    for (const animName in str_loadedAnimations) {
      this.anims[animName] = str_loadedAnimations[animName];
    }

    for (const animName in this.anims) {
      const frames = this.anims[animName].frames;
      // console.log(animName, frames.map(f => !!f.img));
    }

    this.changeState("idle");
  }

  state_nmlAtk5LP() {
    if (this.justEnteredState) {
      this.setAnim("nmlAtk5LP");
      this.frameIndex = 0;
      this.frameTimer = 0;
      this.sprite.vel.x = 0;
      this.justEnteredState = false;
    }

    if (typeof globalHitPause !== "undefined" && globalHitPause > 0) {
      return;
    }

    this.advanceFrame("nmlAtk5LP");
    const anim = this.anims.nmlAtk5LP;
    if (this.frameIndex >= anim.frames.length - 1) this.changeState("idle");
  }

  state_nmlAtk5RP() {
    if (this.justEnteredState) {
      this.setAnim("nmlAtk5RP");
      this.frameIndex = 0;
      this.frameTimer = 0;
      this.sprite.vel.x = 0;
      this.justEnteredState = false;
    }

    if (typeof globalHitPause !== "undefined" && globalHitPause > 0) {
      return;
    }

    this.advanceFrame("nmlAtk5RP");
    const anim = this.anims.nmlAtk5LP;
    if (this.frameIndex >= anim.frames.length - 1) this.changeState("idle");
  }

  state_nmlAtk5LK() {
    if (this.justEnteredState) {
      this.setAnim("nmlAtk5LK");
      this.frameIndex = 0;
      this.frameTimer = 0;
      this.sprite.vel.x = 0;
      this.justEnteredState = false;
    }

    if (typeof globalHitPause !== "undefined" && globalHitPause > 0) {
      return;
    }

    this.advanceFrame("nmlAtk5LK");
    const anim = this.anims.nmlAtk5LK;
    if (this.frameIndex >= anim.frames.length - 1) this.changeState("idle");
  }
}

//Glitch
class Glitch extends Character {
  constructor(x, y, keybinds) {
    super("Glitch", "gli", x, y, keybinds);

    // Assign preloaded animations from JSON
    for (const animName in gli_loadedAnimations) {
      this.anims[animName] = gli_loadedAnimations[animName];
    }

    for (const animName in this.anims) {
      const frames = this.anims[animName].frames;
      // console.log(animName, frames.map(f => !!f.img));
    }

    this.changeState("idle");
  }
}
