class Character {
  constructor(name, shortname, x, y, keybinds) {
    this.name = name;
    this.shortname = shortname;
    this.sprite = new Sprite(x, y, 1, 1);
    this.sprite.physics = KINEMATIC;
    this.sprite.bounciness = 0;

    this.keybindings = keybinds;

    this.state = "idle";
    this.anims = {};
    this.currentAnim = null;

    this.defaultFacing = 1; // left-facing default
    this.facing = 1;
    this.queuedTurn = false;
    this.inControl = true;

    this.frameIndex = 0;
    this.frameTimer = 0;
    this.justEnteredState = true;
    this.transitioning = false;

    // Hitbox / pushbox / hurtbox arrays
    this.maxBoxes = 10;
    this.pushboxes = Array.from({ length: this.maxBoxes }, () => ({
      x: 0,
      y: 0,
      w: 0,
      h: 0,
    }));
    this.hurtboxes = Array.from({ length: this.maxBoxes }, () => ({
      x: 0,
      y: 0,
      w: 0,
      h: 0,
    }));
    this.hitboxes = Array.from({ length: this.maxBoxes }, () => ({
      x: 0,
      y: 0,
      w: 0,
      h: 0,
    }));

    this.maxHealth = 1000;
    this.health = 1000;
    this.jumpSpeedX = 1;
    this.jumpSpeedY = -1.5;
    this.hitStunTimer = 0;
    this.hitPauseTimer = 0; // not used for shared freeze, kept for safety
    this.knockback = { x: 0, y: 0 };
    this.knockbackApplied = false;
    this.incomingHitAnimType = null;

    this.canHitThisSequence = false;
    this.lastMoveData = null;
    this.lastHitMoveData = null;

    this.blockStunTimer = 0;

    this.inputBuffer = [];
    this.bufferExpireFrames = 15;

    this.buttonBuffer = [];

    this.prevInputs = {
      dir: 5,
      lp: false, rp: false, lk: false, rk: false
    };

    this.ground = gfloor;

    this.currentAttackResult = null; // null | "hit" | "block" | "whiff"

    this.states = {
      idle: { type: "stand" },
      crouch: { type: "crouch" },
      walk: { type: "stand" },
      run: { type: "stand" },
      turn: { type: "stand" },
      crouchTurn: { type: "crouch" },
      prejump: { type: "stand" },
      jump: { type: "air" },
      fall: { type: "air" },
      land: { type: "ground" },
      guardHi: { type: "stand" },
      guardLo: { type: "crouch" },
      guardPostHi: { type: "stand" },
      guardPostLo: { type: "crouch" },
      hitstun: { type: "stand" },       // grounded hitstun
      airHitstun: { type: "air" },      // air hitstun
      groundbounce: { type: "air" },
      knockdown: { type: "liedown" }
    };

    this.CANCEL_TABLE = [];

    // this.CANCEL_TABLE = [
    //   {
    //     fromState: ["nmlAtk5LP"],    // states you can cancel from
    //     result: "hit",               // null = any, can be "hit" | "block" | "whiff"
    //     minFrame: 4,                 // runtime frame window
    //     maxFrame: 9,
    //     minKeyframe: 1,              // keyframe index window
    //     maxKeyframe: 1,
    //     buttons: ["rp"],             // optional button tap requirement
    //     motion: null,                // optional motion input name
    //     to: "nmlAtk5RP",             // state to transition to
    //   },
    //   {
    //     fromState: ["nmlAtk5LP"],
    //     result: "whiff",
    //     minFrame: 0,
    //     maxFrame: 6,
    //     to: "idle",
    //   },
    //   {
    //     fromState: ["nmlAtk2LK"],
    //     result: "block",
    //     minFrame: 2,
    //     maxKeyframe: 0,
    //     buttons: ["lp"],
    //     to: "nmlAtk2LP"
    //   },
    //   // Add more as needed
    // ];


  }

  changeState(newState) {
    // if (this.state === newState) return;
    this.previousState = this.state;
    this.state = newState;
    this.stateType = this.states[newState]?.type || "stand"; // default to stand
    this.frameIndex = 0;
    this.frameTimer = 0;
    this.justEnteredState = true;

    if (this[`enter_${newState}`]) this[`enter_${newState}`]();
    this.processQueuedTurn();
  }

  processQueuedTurn() {
    if (!this.queuedTurn) return;
    if (["idle", "crouch"].includes(this.state)) {
      this.changeState(this.state === "crouch" ? "crouchTurn" : "turn");
    }
    this.queuedTurn = false;
  }

  setAnim(animName) {
    if (this.currentAnim === animName) return;
    this.currentAnim = animName;
    this.frameIndex = 0;
    this.frameTimer = 0;
  }

  updateFacing() {
    if (!this.opponent) return;

    const desiredFacing = this.opponent.sprite.x > this.sprite.x ? 1 : -1;
    if (this.facing === desiredFacing) return;

    // Don't queue new turn if already turning
    if (["turn", "crouchTurn"].includes(this.state)) return;

    const turnableStates = ["idle", "crouch"];
    if (turnableStates.includes(this.state)) {
      this.changeState(this.state === "crouch" ? "crouchTurn" : "turn");
    } else {
      this.queuedTurn = true;
    }
  }

  updateBoxes() {
    const anim = this.anims[this.currentAnim];
    if (!anim) return;
    const frameData = anim.frames[this.frameIndex];

    // Mapping from box type to internal arrays
    const boxMap = {
      pushbox: this.pushboxes,
      hurtbox: this.hurtboxes,
      hitbox: this.hitboxes,
    };

    // Supported box types
    const types = Object.keys(boxMap);

    // Clear all boxes first
    types.forEach((type) => {
      const arr = boxMap[type];
      for (let i = 0; i < arr.length; i++) {
        arr[i].x = arr[i].y = arr[i].w = arr[i].h = 0;
      }
    });

    // Helper to apply boxes to the correct array
    const applyBoxes = (boxesArray) => {
      for (let i = 0; i < boxesArray.length; i++) {
        const b = boxesArray[i];
        const arr = boxMap[b.type];
        if (!arr) continue; // skip unknown types

        let x = b.x ?? 0;
        let y = b.y ?? 0;
        let w = b.w ?? 0;
        let h = b.h ?? 0;

        if (this.facing !== this.defaultFacing) x = -x - w;

        arr[i].x = this.sprite.x + x;
        arr[i].y = this.sprite.y + y;
        arr[i].w = w;
        arr[i].h = h;
      }
    };

    // Apply boxes per type: frame-specific first, fallback to default
    types.forEach((type) => {
      const frameTypeBoxes = (frameData.boxes ?? []).filter(
        (b) => b.type === type
      );
      if (frameTypeBoxes.length > 0) {
        applyBoxes(frameTypeBoxes);
      } else {
        const defaultTypeBoxes = (anim.defaultBoxes ?? []).filter(
          (b) => b.type === type
        );
        if (defaultTypeBoxes.length > 0) applyBoxes(defaultTypeBoxes);
      }
    });
  }

  handleInput() {
    const now = frameCount;

    // fetch current direction from table -
    const dir = this.getCurrentDirection(); // uses DIR_FROM_AXES

    // Poll buttons for this frame
    const curBtn = {
      lp: keyIsDown(this.keybindings.lp),
      rp: keyIsDown(this.keybindings.rp),
      lk: keyIsDown(this.keybindings.lk),
      rk: keyIsDown(this.keybindings.rk),
    };

    // Direction edge detection (push only when direction changes)

    if (dir !== 5 && dir !== this.prevInputs.dir) {
      // Only push if non-neutral AND changed since last frame
      this.inputBuffer.push({ dir, frame: now });
    }

    //  Button rising-edge detection (push only once per tap)
    for (const b in curBtn) {
      const isDown = curBtn[b];
      const wasDown = this.prevInputs[b];

      if (isDown && !wasDown) {
        // Button was pressed this frame
        this.buttonBuffer.push({ btn: b, frame: now });
      }
    }

    //  Save snapshot for next frame
    this.prevInputs.dir = dir;
    for (const b in curBtn) this.prevInputs[b] = curBtn[b];

    //  Expire old entries
    const cutoff = now - this.bufferExpireFrames;

    this.inputBuffer = this.inputBuffer.filter(e => e.frame > cutoff);
    // Button buffer typically has small fixed retention (~20 frames)
    this.buttonBuffer = this.buttonBuffer.filter(e => now - e.frame <= 20);
  }

  getCurrentDirection() {
    const x =
      (keyIsDown(this.keybindings.right) ? 1 : 0) +
      (keyIsDown(this.keybindings.left) ? -1 : 0);

    const y =
      (keyIsDown(this.keybindings.up) ? 1 : 0) +
      (keyIsDown(this.keybindings.down) ? -1 : 0);

    return DIR_FROM_AXES[`${x},${y}`];
  }

  flipDir(dir) {
    return DIR[dir].flip;
  }

  isHoldingBack() {
    const dir = this.getCurrentDirection();
    const d = DIR[dir];

    // Facing 1 -> back = x = -1
    // Facing -1 -> back = x = +1
    const backX = (this.facing === 1 ? -1 : 1);

    // "Standing" or "jumping" back (not crouching)
    return d.x === backX && d.y >= 0;
  }

  isHoldingDownBack() {
    const dir = this.getCurrentDirection();
    const d = DIR[dir];

    const backX = (this.facing === 1 ? -1 : 1);

    return d.x === backX && d.y === -1;
  }

  wasButtonTapped(btn, windowFrames = 2) {
    const now = frameCount;

    for (const entry of this.buttonBuffer) {
      const isSameButton = entry.btn === btn;
      const isWithinWindow = now - entry.frame <= windowFrames;

      if (isSameButton && isWithinWindow) {
        return true;
      }
    }

    return false;
  }

  getBuffer() { return this.inputBuffer; }

  hasMotion(name) {
    return detectMotion(this.getBuffer(), name, this.facing);
  }

  advanceFrame(animName = this.currentAnim) {
    const anim = this.anims[animName];
    if (!anim || !anim.frames) return;
    const frame = anim.frames[this.frameIndex];
    this.frameTimer++;
    if (this.frameTimer >= (frame.duration || 6)) {
      this.frameTimer = 0;
      this.frameIndex++;
      if (anim.playOnce)
        this.frameIndex = Math.min(this.frameIndex, anim.frames.length - 1);
      else if (this.frameIndex >= anim.frames.length)
        this.frameIndex = anim.loopStart || 0;
    }

    // Movedata change detection (this is a deep compare, so json.stringify is necessary)
    const currentMD = this.getCurrentMoveData();
    const prev = this.lastMoveData;
    const changed = JSON.stringify(currentMD) !== JSON.stringify(prev);

    if (changed) {
      this.canHitThisSequence = true;
    }

    this.lastMoveData = currentMD;
  }

  getCurrentMoveData() {
    const anim = this.anims[this.currentAnim];
    if (!anim) return null;

    const frames = anim.frames;
    const fi = this.frameIndex;

    // Check current frame movedata
    const frameMD = frames[fi]?.movedata;
    if (frameMD && frameMD.length > 0) {
      return frameMD[0]; // always expect one movedata object
    }

    // Search backwards for last defined movedata
    for (let i = fi - 1; i >= 0; i--) {
      const md = frames[i].movedata;
      if (md && md.length > 0) {
        return md[0];
      }
    }

    // Fall back to defaultMoveData
    const defaultMD = anim.defaultMoveData;
    if (defaultMD && defaultMD.length > 0) {
      return defaultMD[0];
    }

    // Nothing found? :(
    return null;
  }

  render() {
    const anim = this.anims[this.currentAnim || this.state];
    if (!anim || !anim.frames.length) return;
    const frame = anim.frames[this.frameIndex];
    if (!frame) return;

    // Grab modifier object
    const mod = frame.modifier ?? {};

    // Offsets (do not flip)
    const offsetX = mod.offset?.[0] || 0;
    const offsetY = mod.offset?.[1] || 0;

    // Flip
    const flip = this.facing !== this.defaultFacing;

    // Frame transforms
    const rot = mod.rotation ?? 0;             // degrees, since angleMode(DEGREES)
    const sx = mod.scale?.[0] ?? 1;
    const sy = mod.scale?.[1] ?? 1;

    // Apply flip to X scale only
    const scaleX = flip ? -sx : sx;
    const scaleY = sy;

    // Blend mode: frame > object > NORMAL
    const blend = mod.blendMode ?? this.blendMode ?? NORMAL;

    push();

    blendMode(blend);

    // Anchor at sprite.x / sprite.y
    translate(this.sprite.x, this.sprite.y + offsetY);

    // Rotate around anchor
    rotate(rot);

    // Scale after rotate
    scale(scaleX, scaleY);

    // Draw so anchor is midpoint bottom of the sprite
    const drawX = -frame.img.width / 2 + offsetX;
    const drawY = -frame.img.height;

    image(frame.img, drawX, drawY);

    pop();

    this.drawBoxes();
  }

  drawBoxes() {
    const draw = (arr, fillColor, strokeColor) => {
      fill(...fillColor);
      stroke(...strokeColor);
      strokeWeight(1);
      arr.forEach((b) => rect(b.x, b.y, b.w, b.h));
    };
    draw(this.pushboxes, [0, 0, 255, 64], [0, 0, 255]);
    draw(this.hurtboxes, [0, 255, 0, 64], [0, 255, 0]);
    draw(this.hitboxes, [255, 0, 0, 64], [255, 0, 0]);
  }

  takeHit(attacker) {
    const md = attacker.getCurrentMoveData();
    if (!md) return;

    attacker.currentAttackResult = "hit";

    //  Damage & Hit Logic 
    this.health -= md.damage || 0;
    if (this.health < 0) this.health = 0;

    globalHitPause = md.hit_pause || 0;
    this.hitStunTimer = md.hit_stun || 0;

    this.knockback = {
      x: md.hit_knockback?.[0] || 0,
      y: md.hit_knockback?.[1] || 0,
    };
    this.knockbackApplied = false;

    attacker.canHitThisSequence = false;
    attacker.lastHitMoveData = md;

    this.incomingHitAnimType = md.hit_animtype_ground;

    this.isAirborne = (this.sprite.y > gfloor.y) || this.stateType === "air" || md.launch === true;

    this.frameIndex = 0;
    this.frameTimer = 0;
    this.sprite.vel.x = 0;
    this.sprite.vel.y = 0;

    //x and y pos
    const atkHB = attacker.getCurrentHitboxes?.() || [];
    const defHB = this.getCurrentHurtboxes?.() || [];
    const hitPoint = this.fetchHitIntersection(atkHB, defHB);

    const fxX = hitPoint ? hitPoint.x : this.sprite.x;
    const fxY = hitPoint ? hitPoint.y : this.sprite.y;

    //hitspark angle modifier calculation
    let fxAngle = 0;
    if (this.knockback.x !== 0 || this.knockback.y !== 0) {
        fxAngle = degrees(atan2(-this.knockback.y, this.knockback.x));
    }

    // this is based on strength 
    spawnFX({
      x: fxX,
      y: fxY,
      visual: [md.strength === "Heavy" ? "spark_hitH" : md.strength === "Medium" ? "spark_hitM" : "spark_hitL"],
      sound: [md.strength === "Heavy" ? "hitSH" : md.strength === "Medium" ? "hitH" : "hitL"],
      autoFlipFrom: attacker,
      follow: true,
      followTime: 1,
      globalModifier: {rotation: fxAngle}
    });

    const hitPropAir = md.hit_property_air || "Normal";
    this.hitPropertyAir = hitPropAir;

    let nextState = "hitstun";

    if (this.isAirborne) {
        if (hitPropAir === "Screw") {
            nextState = "airHitstunScrew";
        } else if (hitPropAir === "Tornado") {
            nextState = "airHitstunTornado";
            // note to future me: isTornadoed should ONLY be reset when opponent recovers
            this.isTornadoed = true;
        } else {
            nextState = "airHitstun";
        }
    }

    this.changeState(nextState);
  }

  takeBlock(attacker, { movedata }) {
    globalHitPause = movedata.block_pause || 0;

    const standInput = this.isHoldingBack();
    const crouchInput = this.isHoldingDownBack();

    let blockCorrect = false;
    if (standInput && (movedata.guard_flag === "High" || movedata.guard_flag === "Mid")) blockCorrect = true;
    if (crouchInput && movedata.guard_flag === "Low") blockCorrect = true;

    if (!blockCorrect) {
      this.takeHit(attacker);
      return;
    }

    attacker.currentAttackResult = "block";

    this._pendingGuardState = crouchInput ? "guardLo" : "guardHi";
    this._pendingBlockStunTimer = movedata.block_stun || 0;
    this._pendingKnockback = {
      x: movedata.block_knockback?.[0] || 0,
      y: movedata.block_knockback?.[1] || 0,
    };
    this.knockbackApplied = false;

    // FX SPAWN (same for all blocks) 
    spawnFX({
      x: this.sprite.x,
      y: this.sprite.y,
      visual: ["spark_block"],
      sound: ["block1"],
      autoFlipFrom: attacker
    });

    // FORCE guard state immediately
    if (crouchInput) {
      if (this.state !== "guardLo") this.changeState("guardLo");
    } else {
      if (this.state !== "guardHi") this.changeState("guardHi");
    }
  }

  fetchHitIntersection(attackerBoxes, defenderBoxes) {
    for (const hb of attackerBoxes) {
      for (const ub of defenderBoxes) {
        const dx = Math.abs(hb.x - ub.x);
        const dy = Math.abs(hb.y - ub.y);
        const overlapX = (hb.w / 2 + ub.w / 2) - dx;
        const overlapY = (hb.h / 2 + ub.h / 2) - dy;

        if (overlapX > 0 && overlapY > 0) {
          // Actual overlap center
          const ix = (hb.x + ub.x) / 2;
          const iy = (hb.y + ub.y) / 2;
          return { x: ix, y: iy };
        }
      }
    }
    return null;
  }

  updateLogic() {
    this.handleInput();
    this.updateFacing();
    this.updateBoxes();

    if (this._pendingGuardState) {
      this.changeState(this._pendingGuardState);
      this.blockStunTimer = this._pendingBlockStunTimer;
      this.knockback = this._pendingKnockback;
      this._pendingGuardState = null;
      this._pendingBlockStunTimer = 0;
      this._pendingKnockback = { x: 0, y: 0 };
    }

    this.handleCancels();
    this.handleStandardStates();
    if (this[`state_${this.state}`]) this[`state_${this.state}`]();

    const anim = this.anims[this.currentAnim || this.state];
    if (anim) {
      const frame = anim.frames[this.frameIndex];
      if (frame?.effects) {
        spawnFX({
          x: this.sprite.x,
          y: this.sprite.y,
          follow: this, // FX gets attached to character if followTime > 0!
          visual: frame.effects.visual ?? [],
          sound: frame.effects.sound ?? []
        });
      }
    }

    this.sprite.x = floor(this.sprite.x);
    this.sprite.y = floor(this.sprite.y);
  }

  //open standardstates.js for this class's definition!
  //...
  //im so glad there is an equivalent to C++ class method prototypes in js.
  handleStandardStates() { }

  handleCancels() {
    if (!this.currentAnim) return;

    if (globalHitPause > 0) return;

    const runtimeFrame = this.getRuntimeFrame();
    const keyframe = this.frameIndex;


    for (const entry of this.CANCEL_TABLE) {
      // Check state
      if (entry.fromState && !entry.fromState.includes(this.state)) continue;

      // Check attack result
      if (entry.result) {
            const results = Array.isArray(entry.result) ? entry.result : [entry.result];
            if (!results.includes(this.currentAttackResult)) continue;
      }

      // Check frame ranges
      if (entry.minFrame !== undefined && runtimeFrame < entry.minFrame) continue;
      if (entry.maxFrame !== undefined && runtimeFrame > entry.maxFrame) continue;

      if (entry.minKeyframe !== undefined && keyframe < entry.minKeyframe) continue;
      if (entry.maxKeyframe !== undefined && keyframe > entry.maxKeyframe) continue;

      // Check button tap if required
      if (entry.buttons && !entry.buttons.every((b) => this.wasButtonTapped(b))) continue;

      // Check motion if required
      if (entry.motion && !this.hasMotion(entry.motion)) continue;

      // All conditions met, perform cancel
      this.changeState(entry.to);
      return; // only cancel to the first valid entry
    }
  }

  getRuntimeFrame() {
    const anim = this.anims[this.currentAnim];
    if (!anim || !anim.frames) return 0;

    let rcframeCount = 0;
    for (let i = 0; i < this.frameIndex; i++) {
      rcframeCount += anim.frames[i].duration || 6;
    }
    rcframeCount += this.frameTimer; // add current frame timer
    return rcframeCount;
  }
}
