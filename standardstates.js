Character.prototype.handleStandardStates = function handleStandardStates() {

    const dir = this.getCurrentDirection();
    const d = DIR[dir]; // x/y info

    switch (this.state) {
        case "idle":
            // Record state before input actions
            const before = this.state;

            // If a new state was selected, stop running idle logic immediately
            if (this.state !== before) return;

            if (this.justEnteredState) {
                this.setAnim(this.previousState === "crouch" ? "croToSta" : "idle");
                this.transitioning = this.previousState === "crouch";
                this.justEnteredState = false;
            }

            if (this.transitioning) {
                const anim = this.anims[this.currentAnim];
                if (this.frameIndex >= anim.frames.length - 1) {
                    this.setAnim("idle");
                    this.transitioning = false;
                }
            }

            this.advanceFrame();

            // Move to crouch
            if (d.y === -1) {
                this.changeState("crouch");
                return;
            }

            // Move to jump
            if (d.y === 1) {
                this.changeState("prejump");
                return;
            }

            if (this.hasMotion("run")) {
                this.changeState("run");
                return;
            }

            if (d.x !== 0) {
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

            if (d.y !== -1) {
                this.changeState("idle");
                return;
            }

            break;

        case "walk":
            let moveDir = d.x; // -1 left, 0 neutral, 1 right
            if (moveDir !== 0) {
                const relativeDir = moveDir * this.facing;
                this.setAnim(relativeDir === 1 ? "walkF" : "walkB");
                this.sprite.x += moveDir;
            } else {
                this.changeState("idle");
            }

            this.advanceFrame();
            if (d.y === 1) this.changeState("prejump");
            break;

        case "run":
            let runDir = d.x;
            const forward = this.facing;
            const relativeRun = runDir * forward;
            const runSpeed = 3.5;

            if (relativeRun > 0) {
                this.setAnim("run");
                this.sprite.vel.x = lerp(this.sprite.vel.x, forward * runSpeed, 0.3);
                this.advanceFrame("run");
            } else if (relativeRun < 0) {
                this.sprite.vel.x = 0;
                this.changeState("walk");
                return;
            } else if (relativeRun === 0 && this.sprite.vel.x !== 0) {
                this.setAnim("runStop");
                this.advanceFrame("runStop");
                this.sprite.vel.x = lerp(this.sprite.vel.x, 0, 0.2);
                if (abs(this.sprite.vel.x) < 0.5) this.sprite.vel.x = 0;
                if (this.sprite.vel.x === 0) this.changeState("idle");
                return;
            }

            if (d.y === 1) this.changeState("prejump");
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
                this.sprite.vel.x = d.x * this.jumpSpeedX;
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

                const FRICTION_PER_SECOND_HI = 6; // pixels per second per second
                const dt = 1 / 60;
                const frictionMultiplier = Math.exp(-FRICTION_PER_SECOND_HI * dt);

                this.sprite.vel.x *= frictionMultiplier;

                // minimal cutoff to stop
                if (Math.abs(this.sprite.vel.x) < 0.05) this.sprite.vel.x = 0;

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
                this.sprite.vel.x = 0;
            }

            this.advanceFrame();

            const hiPostA = this.anims.guardHiPost;
            if (this.frameIndex >= hiPostA.frames.length - 1) {
                if (d.y === -1) this.changeState("crouch");
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

                const FRICTION_PER_SECOND_LO = 7; // pixels per second per second
                const dt = 1 / 60;
                const frictionMultiplier = Math.exp(-FRICTION_PER_SECOND_LO * dt);

                this.sprite.vel.x *= frictionMultiplier;

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
                this.sprite.vel.x = 0;
            }

            this.advanceFrame();

            const loPostA = this.anims.guardLoPost;
            if (this.frameIndex >= loPostA.frames.length - 1) {
                if (d.y === -1) this.changeState("crouch");
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
                        High: "hurtStandHi",
                        Low: "hurtStandLo",
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

        case "airHitstun":
            if (this.justEnteredState) {
                // Start with hurtairstun
                this.setAnim("hurtAirStun");
                this.frameIndex = 0;
                this.frameTimer = 0;
                this.justEnteredState = false;

                // clear the hint
                this.incomingHitAnimType = null;
            }

            // Shared hitstop freeze
            if (globalHitPause > 0) return;

            // Apply one-time knockback
            if (!this.knockbackApplied) {
                this.sprite.vel.x += this.knockback.x * (this.facing === 1 ? 1 : -1);
                this.sprite.vel.y += this.knockback.y;
                this.knockbackApplied = true;
            }

            // Apply velocities
            this.sprite.x += this.sprite.vel.x;
            this.sprite.y += this.sprite.vel.y;

            // Gravity pull
            this.sprite.vel.y += 0.07; // adjust gravity

            // Horizontal drag
            this.sprite.vel.x *= 0.95;

            // Switch to air fall animation only once moving downward
            if (this.prevVelY < 0 && this.sprite.vel.y >= 0 && this.currentAnim !== "hurtAirFall") {
                this.setAnim("hurtAirFall");
                this.frameIndex = 0;
                this.frameTimer = 0;
            }

            this.prevVelY = this.sprite.vel.y;

            // Advance hurt animation only while in active hitstun
            if (this.hitStunTimer > 0) {
                this.hitStunTimer--;
            }

            this.advanceFrame();

            // Landing detection
            if (this.sprite.y >= gfloor.y) {
                this.sprite.y = gfloor.y;
                this.sprite.vel.x = 0;
                this.sprite.vel.y = 0;

                // Determine landing face direction
                if (this.currentAnim === "hurtAirFall" ||
                    this.currentAnim === "hurtAirStun") {
                    // Default assumption: hurtAirStun ends face-up
                    this.airLandingFace = "up";
                }

                // Transition depending on vertical speed or knockback
                if (this.knockback.y > -2) {
                    this.changeState("knockdown");
                } else {
                    this.changeState("groundbounce");
                }
            }
            return;

        case "airHitstunScrew":
            if (this.justEnteredState) {
                // During hitpause, always show this
                this.setAnim("hurtAirSpecialStun");
                this.frameIndex = 0;
                this.frameTimer = 0;
                this.justEnteredState = false;

                // We will start checking angle after hitpause ends
                this.prevVelY = this.sprite.vel.y;

            }

            if (globalHitPause > 0) {
                return;
            }

            // Apply one-time knockback
            if (!this.knockbackApplied) {
                this.sprite.vel.x += this.knockback.x * (this.facing === 1 ? 1 : -1);
                this.sprite.vel.y += this.knockback.y;
                this.knockbackApplied = true;
            }

            // Velocity vector
            const vx = this.sprite.vel.x * this.facing; // adjust for facing
            const vy = -this.sprite.vel.y; // invert if +y is down

            // Prevent atan2(0,0)
            let deg;
            if (vx === 0 && vy === 0) {
                deg = this.lastScrewAngle ?? 0;
            } else {
                deg = Math.atan2(vy, vx) * (180 / Math.PI);
                if (deg < 0) deg += 360;
            }

            // Snap to nearest 45
            let snapped = Math.round(deg / 45) * 45;
            snapped = snapped % 360;
            if (snapped < 0) snapped += 360;

            this.lastScrewAngle = snapped;

            const screwAnim = `hurtAirScrew${snapped}deg`;

            // Switch animation only if different, preserve frame index/timer
            if (this.currentAnim !== screwAnim) {
                const oldFrame = this.frameIndex;
                const oldTimer = this.frameTimer;

                this.setAnim(screwAnim);

                this.frameIndex = oldFrame;
                this.frameTimer = oldTimer;
            }


            // Physics
            this.sprite.x += this.sprite.vel.x;
            this.sprite.y += this.sprite.vel.y;

            // Gravity
            this.sprite.vel.y += 0.07;

            // Track previous Y velocity
            this.prevVelY = this.sprite.vel.y;

            // Hitstun decrement
            if (this.hitStunTimer > 0) {
                this.hitStunTimer--;
            }

            // Advance current animation
            this.advanceFrame();

            // Landing detection
            if (this.sprite.y >= gfloor.y) {
                this.sprite.y = gfloor.y;
                this.sprite.vel.x = 0;
                this.sprite.vel.y = 0;

                this.airLandingFace = "up";
                // Always knockdown on screw landing
                this.changeState("knockdown");
            }

            return;

        case "groundbounce":
            if (this.justEnteredState) {

                // PHASE 1: play knockdown animation first (matching landing orientation)
                this.groundBouncePhase = "pre";
                this.groundBouncePreTimer = 5;

                if (this.airLandingFace === "up") {
                    this.setAnim("knockdownFaceUp");
                } else {
                    this.setAnim("knockdownFaceDown");
                }

                this.frameIndex = 0;
                this.frameTimer = 0;

                // During prephase: no hop yet
                this.sprite.vel.x *= 0.4;
                this.sprite.vel.y = 0;

                this.justEnteredState = false;
            }

            // Shared hitstop
            if (globalHitPause > 0) return;


            // PHASE 1 — play knockdown animation first

            if (this.groundBouncePhase === "pre") {

                // Stay stuck to ground
                this.sprite.y = gfloor.y;

                // Slight sliding movement if desired
                this.sprite.x += this.sprite.vel.x;
                this.sprite.vel.x *= 0.9;

                // Animate knockdown pose
                this.advanceFrame();

                // Countdown to bounce
                this.groundBouncePreTimer--;
                if (this.groundBouncePreTimer <= 0) {

                    // Switch to actual bounce phase
                    this.groundBouncePhase = "bounce";

                    // Select opposite-facing bounce animation
                    if (this.airLandingFace === "up") {
                        this.setAnim("groundbounceToFaceDown");
                    } else {
                        this.setAnim("groundbounceToFaceUp");
                    }

                    this.frameIndex = 0;
                    this.frameTimer = 0;

                    // Start upward bounce hop
                    this.sprite.vel.y = this.knockback.y * 0.5; // upward bounce
                    this.sprite.vel.x *= 0.6;
                }

                return;
            }

            // PHASE 2 — perform bounce animation
            if (this.groundBouncePhase === "bounce") {

                // Apply motion
                this.sprite.x += this.sprite.vel.x;
                this.sprite.y += this.sprite.vel.y;

                // Gravity
                this.sprite.vel.y += 0.08;

                // Advance animation
                this.advanceFrame();

                // Check landing after bounce
                if (this.sprite.y >= gfloor.y) {
                    this.sprite.y = gfloor.y;
                    this.sprite.vel.x = 0;
                    this.sprite.vel.y = 0;

                    // Flip landing orientation for final knockdown animation
                    this.airLandingFace = (this.airLandingFace === "up" ? "down" : "up");

                    // Now enter final knockdown (opposite face)
                    this.changeState("knockdown");
                    return;
                }

                return;
            }

            return;

        case "knockdown":
            if (this.justEnteredState) {

                // Choose animation based on last orientation
                if (this.airLandingFace === "up") {
                    this.setAnim("knockdownFaceUp");
                } else {
                    this.setAnim("knockdownFaceDown");
                }

                this.frameIndex = 0;
                this.frameTimer = 0;
                this.knockdownTimer = 0;

                // Knockdown slide
                this.sprite.vel.x *= 0.4;  // reduced slide
                this.sprite.vel.y = 0;

                this.justEnteredState = false;
            }

            if (globalHitPause > 0) return;

            // Slide effect
            this.sprite.x += this.sprite.vel.x;

            // Knockdown friction
            this.sprite.vel.x *= 0.85;

            // Stay on ground
            this.sprite.y = gfloor.y;

            // Advance looping knockdown animation
            this.advanceFrame();

            // Knockdown duration timer
            if (!this.knockdownTimer) this.knockdownTimer = 60; // 1 second of being down
            this.knockdownTimer--;

            // Timer expired → allow tech/wakeup later
            if (this.knockdownTimer <= 0) {
                this.changeState("idle");
                this.knockdownTimer = 0;
            }

            return;

    }
}