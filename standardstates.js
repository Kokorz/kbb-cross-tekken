Character.prototype.handleStandardStates = function handleStandardStates() {

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

                this.sprite.vel.x *= 0.7;

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

                this.sprite.vel.x *= 0.7;

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