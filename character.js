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

    this.isGuarding = false;
    this.isStandingGuard = false;
    this.isCrouchGuard = false;
    this.blockStunTimer = 0;


    this.inputBuffer = [];
    this.bufferExpireFrames = 15;

    this.buttonBuffer = [];
    this.lastDirState = {}; // tracks which directions were previously pressed
    for (let d = 1; d <= 9; d++) this.lastDirState[d] = false;
    this.lastButtonState = { a: false, b: false, c: false, d: false };

    this.ground = gfloor;
  }

  changeState(newState) {
    if (this.state === newState) return;
    this.previousState = this.state;
    this.state = newState;
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
    const dir = this.getCurrentDirection();
    // If neutral, mark all directions as "released"
    if (dir === 5) {
      for (let d = 1; d <= 9; d++) this.lastDirState[d] = false;
      return;
    }

    // Only push if this direction was previously *not pressed*
    if (!this.lastDirState[dir]) {
      this.pushInput(dir);
      this.lastDirState[dir] = true;
    }

    // Push button taps into buffer using keyIsDown
    ["lp", "rp", "lk", "rk"].forEach((btn) => {
      if (keyIsDown(this.keybindings[btn]) && !this.lastButtonState[btn]) {
        this.pushButton(btn); // record the tap
      }
      // Update lastButtonState so we only push once per press
      this.lastButtonState[btn] = keyIsDown(this.keybindings[btn]);
    });

    // Update lastDirState array for directional logic
    for (let d = 1; d <= 9; d++) {
      if (d !== dir) this.lastDirState[d] = false;
    }
  }

  flipDir(dir) {
    const map = { 1: 3, 3: 1, 4: 6, 6: 4, 7: 9, 9: 7 };
    return map[dir] ?? dir;
  }

  getCurrentDirection() {
    const u = keyIsDown(this.keybindings.up),
      d = keyIsDown(this.keybindings.down),
      l = keyIsDown(this.keybindings.left),
      r = keyIsDown(this.keybindings.right);
    if (u && r) return 9;
    if (u && l) return 7;
    if (d && r) return 3;
    if (d && l) return 1;
    if (u) return 8;
    if (d) return 2;
    if (l) return 4;
    if (r) return 6;
    return 5;
  }

  horizontalFromDir(dir) {
    if ([1, 4, 7].includes(dir)) return -1;
    if ([3, 6, 9].includes(dir)) return 1;
    return 0;
  }

  isHoldingBack() {
    const backKey = this.facing === 1 ? this.keybindings.left : this.keybindings.right;
    return keyIsDown(backKey);
  }

  isHoldingDownBack() {
    const backKey = this.facing === 1 ? this.keybindings.left : this.keybindings.right;
    return keyIsDown(backKey) && keyIsDown(this.keybindings.down);
  }


  pushInput(dir) {
    const now = frameCount;

    // Avoid duplicate pushes on the same frame
    if (
      this.inputBuffer.length > 0 &&
      this.inputBuffer[this.inputBuffer.length - 1].dir === dir &&
      this.inputBuffer[this.inputBuffer.length - 1].frame === now
    )
      return;

    this.inputBuffer.push({ dir, frame: now });

    if (this.inputBuffer.length > this.maxBufferSize) this.inputBuffer.shift();

    // Expire old inputs
    this.inputBuffer = this.inputBuffer.filter(
      (e) => now - e.frame < this.bufferExpireFrames
    );
  }

  pushButton(btn) {
    this.buttonBuffer.push({ btn, frame: frameCount });
    if (this.buttonBuffer.length > 20) this.buttonBuffer.shift();
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

  getBuffer() {
    const now = frameCount;

    // Keep only the recent entries within bufferExpireFrames
    this.inputBuffer = this.inputBuffer.filter((entry) => {
      const age = now - entry.frame;
      return age < this.bufferExpireFrames;
    });

    return this.inputBuffer;
  }

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

    // Movedata change detection (deep compare)
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

    // 1. Check current frame movedata
    const frameMD = frames[fi]?.movedata;
    if (frameMD && frameMD.length > 0) {
      return frameMD[0]; // always expect one movedata object
    }

    // 2. Search backwards for last defined movedata
    for (let i = fi - 1; i >= 0; i--) {
      const md = frames[i].movedata;
      if (md && md.length > 0) {
        return md[0];
      }
    }

    // 3. Fall back to defaultMoveData
    const defaultMD = anim.defaultMoveData;
    if (defaultMD && defaultMD.length > 0) {
      return defaultMD[0];
    }

    // 4. Nothing found
    return null;
  }

  render() {
    const anim = this.anims[this.currentAnim || this.state];
    if (!anim || !anim.frames.length) return;
    const frame = anim.frames[this.frameIndex];
    if (!frame) return;

    const offsetX = frame.offset?.[0] || 0; // do NOT flip
    const offsetY = frame.offset?.[1] || 0;

    const flip = this.facing !== this.defaultFacing;

    push();
    translate(this.sprite.x, this.sprite.y + offsetY);
    if (flip) scale(-1, 1);
    image(frame.img, -frame.img.width / 2 + offsetX, -frame.img.height);
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
    if (!md) return; // safety fallback

    // Damage
    this.health -= md.damage || 0;
    if (this.health < 0) this.health = 0;

    // Shared hitstop (global freeze)
    globalHitPause = md.hit_pause || 0;

    // Per-character hitstun
    this.hitStunTimer = md.hit_stun || 0;

    // Knockback (applies once after shared hitstop ends)
    this.knockback = {
      x: (md.hit_knockback && md.hit_knockback[0]) || 0,
      y: (md.hit_knockback && md.hit_knockback[1]) || 0,
    };
    this.knockbackApplied = false;

    // Store hint for choosing hurt anim
    this.incomingHitAnimType = md.hit_animtype_ground || null;

    // Prevent attacker from re-hitting this movedata until it changes
    attacker.canHitThisSequence = false;
    attacker.lastHitMoveData = md;

    this.changeState("hitstun");
  }

  takeBlock(attacker, { movedata }) {

    const gf = movedata.guard_flag;

    const standInput = this.isHoldingBack();
    const crouchInput = this.isHoldingDownBack();

    let blockCorrect = false;

    if (standInput && (gf === "High" || gf === "Mid")) blockCorrect = true;
    if (crouchInput && gf === "Low") blockCorrect = true;

    if (!blockCorrect) {
      this.takeHit(attacker, { movedata });
      return;
    }

    // Store pending block state for the next frame
    this._pendingGuardState = crouchInput ? "guardLo" : "guardHi";

    // Store blockstun info
    this._pendingBlockStunTimer = movedata.block_stun || 0;
    this._pendingKnockback = {
      x: (movedata.block_knockback && movedata.block_knockback[0]) || 0,
      y: (movedata.block_knockback && movedata.block_knockback[1]) || 0,
    };
    this.knockbackApplied = false;

    // FORCE the correct guard state so blockstun logic can run
    if (crouchInput) {
      if (this.state !== "guardLo") this.changeState("guardLo");
    } else {
      if (this.state !== "guardHi") this.changeState("guardHi");
    }
  }

  handleButtonTaps() {
    const buttons = ["lp", "rp", "lk", "rk"];
    buttons.forEach((btn) => {
      if (this.wasButtonTapped(btn))
        if (this.getCurrentDirection() != 2) {
          this.changeState(`nmlAtk5${btn.toUpperCase()}`);
        } else {
          this.changeState(`nmlAtk2${btn.toUpperCase()}`);
        }
    });
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

    this.handleStandardStates();
    if (this[`state_${this.state}`]) this[`state_${this.state}`]();
    this.sprite.x = floor(this.sprite.x);
    this.sprite.y = floor(this.sprite.y);
  }

  handleStandardStates() {
    switch (this.state) {
      case "idle":
        this.handleButtonTaps();

        if (this.justEnteredState) {
          this.setAnim(this.previousState === "crouch" ? "croToSta" : "idle");
          this.transitioning = this.previousState === "crouch";
          this.justEnteredState = false;
        }

        if (this.state !== "idle") return;

        if (this.transitioning) {
          const anim = this.anims[this.currentAnim];
          if (this.frameIndex >= anim.frames.length - 1) {
            this.setAnim("idle");
            this.transitioning = false;
          }
        }

        this.advanceFrame();

        // Move to crouch
        if (keyIsDown(this.keybindings.down)) {
          this.changeState("crouch");
          return;
        }

        // Move to jump
        if (keyIsDown(this.keybindings.up)) {
          this.changeState("prejump");
          return;
        }

        if (this.hasMotion("run")) {
          this.changeState("run");
          return;
        }

        if (
          keyIsDown(this.keybindings.left) ||
          keyIsDown(this.keybindings.right)
        ) {
          this.changeState("walk");
          return;
        }

        break;

      case "crouch":
        if (this.justEnteredState) {
          this.setAnim(this.previousState === "idle" ? "staToCro" : "crouch");
          this.transitioning = this.previousState === "idle";
          this.justEnteredState = false;
        }

        if (this.transitioning) {
          const anim = this.anims[this.currentAnim];
          if (this.frameIndex >= anim.frames.length - 1) {
            this.setAnim("crouch");
            this.transitioning = false;
          }
        }

        this.advanceFrame();

        if (!keyIsDown(this.keybindings.down)) {
          this.changeState("idle");
          return;
        }

        this.handleButtonTaps();
        break;

      case "walk":
        let moveDir = 0;
        if (keyIsDown(this.keybindings.left)) moveDir = -1;
        if (keyIsDown(this.keybindings.right)) moveDir = 1;

        if (moveDir !== 0) {
          const relativeDir = moveDir * this.facing;
          this.setAnim(relativeDir === 1 ? "walkF" : "walkB");
          this.sprite.x += moveDir;
        } else this.changeState("idle");

        this.advanceFrame();
        if (keyIsDown(this.keybindings.up)) this.changeState("prejump");
        this.handleButtonTaps();
        break;

      case "run":
        // Determine input relative to facing
        let inputDir = 0;
        if (keyIsDown(this.keybindings.left)) inputDir = -1;
        if (keyIsDown(this.keybindings.right)) inputDir = 1;
        const forward = this.facing;
        const relativeInput = inputDir * forward;
        const runSpeed = 4;

        if (relativeInput > 0) {
          // Running forward
          this.setAnim("run");
          this.sprite.vel.x = lerp(this.sprite.vel.x, forward * runSpeed, 0.3);
          this.advanceFrame("run");
        } else if (relativeInput < 0) {
          // Back input: switch to walk
          this.sprite.vel.x = 0;
          this.changeState("walk");
          return;
        } else if (relativeInput === 0 && this.sprite.vel.x !== 0) {
          // Decelerate
          this.setAnim("runStop");
          this.advanceFrame("runStop");
          this.sprite.vel.x = lerp(this.sprite.vel.x, 0, 0.2);
          if (abs(this.sprite.vel.x) < 0.5) this.sprite.vel.x = 0;
          if (
            !keyIsDown(this.keybindings.left) &&
            !keyIsDown(this.keybindings.right) &&
            this.sprite.vel.x === 0
          ) {
            this.changeState("idle");
          }
          return;
        }

        // Jump check
        if (keyIsDown(this.keybindings.up)) this.changeState("prejump");

        // Button taps
        this.handleButtonTaps();
        break;

      case "turn":
        if (this.justEnteredState) {
          this.setAnim("turn");
          this.frameIndex = 0;
          this.frameTimer = 0;
          this.facing *= -1;
          this.justEnteredState = false;
        }

        this.advanceFrame();

        const turnAnim = this.anims.turn;
        if (this.frameIndex >= turnAnim.frames.length - 1) {
          this.changeState("idle");
        }
        break;

      case "crouchTurn":
        if (this.justEnteredState) {
          this.setAnim("crouchTurn");
          this.frameIndex = 0;
          this.frameTimer = 0;
          this.facing *= -1;
          this.justEnteredState = false;
        }

        this.advanceFrame();

        const croTurnAnim = this.anims.crouchTurn;
        if (this.frameIndex >= croTurnAnim.frames.length - 1) {
          this.changeState("crouch");
        }
        break;

      case "prejump":
        if (this.justEnteredState) {
          this.setAnim("prejump");
        }
        this.advanceFrame();
        const preJumpAnim = this.anims.prejump;
        if (this.frameIndex >= preJumpAnim.frames.length - 1) this.changeState("jump");
        break;

      case "jump":
        if (this.justEnteredState) {
          this.setAnim("jump");
          this.frameIndex = 0;
          this.frameTimer = 0;
          this.sprite.vel.y = this.jumpSpeedY;
          const hor = this.horizontalFromDir(this.getCurrentDirection());
          this.sprite.vel.x = hor * this.jumpSpeedX;
          this.justEnteredState = false;
        }

        this.sprite.y += this.sprite.vel.y;
        this.sprite.vel.y += 0.09;

        if (this.sprite.vel.y >= 0) this.changeState("fall");
        else this.advanceFrame();
        break;

      case "fall":
        if (this.justEnteredState) {
          this.setAnim("fall");
          this.frameIndex = 0;
          this.frameTimer = 0;
          this.justEnteredState = false;
        }

        this.sprite.vel.y += 0.09;
        this.sprite.y += this.sprite.vel.y;

        this.advanceFrame();

        if (this.sprite.y >= this.ground.y) {
          this.sprite.y = this.ground.y;
          this.sprite.vel.x = 0;
          this.sprite.vel.y = 0;
          this.changeState("land");
        }
        break;

      case "land":
        if (this.justEnteredState) {
          this.setAnim("land");
        }
        this.advanceFrame();
        const landAnim = this.anims.land;
        if (this.frameIndex >= landAnim.frames.length - 1) this.changeState("idle");
        break;

      case "guardHi":
        if (this.justEnteredState) {
          this.setAnim("guardHi");
          this.frameIndex = 0;
          this.frameTimer = 0;
          this.knockbackApplied = false;
          this.justEnteredState = false;
        }

        // === BLOCKSTUN MODE ===
        if (this.blockStunTimer > 0) {
          if (globalHitPause > 0) return;

          //  APPLY ONE-TIME KNOCKBACK (right after hitstop ends) 
          if (!this.knockbackApplied) {
            // apply immediate translation once
            this.sprite.vel.x += this.knockback.x * (this.facing === 1 ? 1 : -1);
            this.sprite.vel.y += this.knockback.y;
            this.knockbackApplied = true;
          }

          this.advanceFrame();

          this.blockStunTimer--;
          if (this.blockStunTimer > 0) return;

          // End of blockstun → go to guard post
          this.changeState("guardPostHi");
          return;
        }

        this.advanceFrame();

        // Once animation finishes, go to post guard regardless of input
        const hiAnim = this.anims.guardHi;
        if (this.frameIndex >= hiAnim.frames.length - 1) {
          this.changeState("guardPostHi");
        }
        break;


      case "guardPostHi":
        if (this.justEnteredState) {
          this.setAnim("guardHiPost");
          this.frameIndex = 0;
          this.frameTimer = 0;
          this.justEnteredState = false;
        }

        this.advanceFrame();

        const hiPostA = this.anims.guardHiPost;
        if (this.frameIndex >= hiPostA.frames.length - 1) {
          if (keyIsDown(this.keybindings.down)) this.changeState("crouch");
          else this.changeState("idle");
        }
        break;

      case "guardLo":
        if (this.justEnteredState) {
          this.setAnim("guardLo");
          this.frameIndex = 0;
          this.frameTimer = 0;
          this.knockbackApplied = false;
          this.justEnteredState = false;
        }

        // === BLOCKSTUN MODE ===
        if (this.blockStunTimer > 0) {
          if (globalHitPause > 0) return;

          //  APPLY ONE-TIME KNOCKBACK (right after hitstop ends) 
          if (!this.knockbackApplied) {
            // apply immediate translation once
            this.sprite.vel.x += this.knockback.x * (this.facing === 1 ? 1 : -1);
            this.sprite.vel.y += this.knockback.y;
            this.knockbackApplied = true;
          }

          this.advanceFrame();

          this.blockStunTimer--;
          if (this.blockStunTimer > 0) return;

          this.changeState("guardPostLo");
          return;
        }

        this.advanceFrame();

        // Once animation finishes, go to post guard regardless of input
        const loAnim = this.anims.guardLo;
        if (this.frameIndex >= loAnim.frames.length - 1) {
          this.changeState("guardPostLo");
        }
        break;

      case "guardPostLo":
        if (this.justEnteredState) {
          this.setAnim("guardLoPost");
          this.frameIndex = 0;
          this.frameTimer = 0;
          this.justEnteredState = false;
        }

        this.advanceFrame();

        const loPostA = this.anims.guardLoPost;
        if (this.frameIndex >= loPostA.frames.length - 1) {
          if (keyIsDown(this.keybindings.down)) this.changeState("crouch");
          else this.changeState("idle");
        }
        break;

      case "hitstun":
        if (this.justEnteredState) {
          // Determine crouch vs stand hurt first
          const dir = this.getCurrentDirection();
          const isCrouching =
            this.previousState === "crouch" ||
            dir === 2 ||
            dir === 1 ||
            dir === 3;

          if (isCrouching) {
            this.setAnim("hurtCrouch");
          } else {
            // Prefer explicit animtype from movedata, fallback to standLo
            const map = {
              standHi: "hurtStandHi",
              standLo: "hurtStandLo",
            };
            if (this.incomingHitAnimType) {
              this.setAnim(map[this.incomingHitAnimType] || "hurtStandLo");
            } else {
              this.setAnim("hurtStandLo");
            }
          }

          this.frameIndex = 0;
          this.frameTimer = 0;

          // clear the hint so it doesn't persist into later hits
          this.incomingHitAnimType = null;
          this.justEnteredState = false;
        }

        //  SHARED HITSTOP (game freeze) 
        // If globalHitPause is active, freeze here (no knockback application or frame advancement)
        if (typeof globalHitPause !== "undefined" && globalHitPause > 0) {
          return;
        }

        //  APPLY ONE-TIME KNOCKBACK (right after hitstop ends) 
        if (!this.knockbackApplied) {
          // apply immediate translation once
          this.sprite.vel.x += this.knockback.x * (this.facing === 1 ? 1 : -1);
          this.sprite.vel.y += this.knockback.y;
          this.knockbackApplied = true;
        }

        if (this.sprite.vel.x) {
          this.sprite.x += this.sprite.vel.x;
          this.sprite.vel.x *= 0.7;
        }

        // Advance hurt animation while in hitstun
        if (this.hitStunTimer > 0 && globalHitPause == 0) {
          this.advanceFrame();
          this.hitStunTimer--;
          if (this.hitStunTimer > 0) return;
        }

        // Exit hitstun: return to crouch if holding down, otherwise idle
        const dirAfter = this.getCurrentDirection();
        this.sprite.vel.x = 0;
        if (dirAfter === 2 || dirAfter === 1 || dirAfter === 3) {
          this.changeState("crouch");
        } else {
          this.changeState("idle");
        }
        return;
    }
  }
}
