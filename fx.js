class VFX {
    constructor({ anim, x, y, follow = null, followTime = 0, globalModifier = {}, autoFlipFrom = null }) {
        this.anim = anim;
        this.frames = anim.frames;
        this.frameIndex = 0;
        this.frameTimer = 0;

        // Starting position
        this.baseX = x;
        this.baseY = y;
        this.x = x;
        this.y = y;

        this.follow = follow;
        this.followTime = followTime;

        this.autoFlipFrom = autoFlipFrom;

        this.finished = false;

        this.globalModifier = {
            offset: globalModifier.offset ?? [0, 0],
            scale: globalModifier.scale ?? [1, 1],
            rotation: globalModifier.rotation ?? 0,
            blendMode: globalModifier.blendMode ?? null,
            flipX: globalModifier.flipX ?? false,
            flipY: globalModifier.flipY ?? false
        };
    }

    update() {
        if (this.finished) return;

        // Follow logic
        if (this.follow && this.followTime > 0) {
            this.x = this.follow.sprite.x;
            this.y = this.follow.sprite.y;
            this.followTime--;
        } else {
            // If no follow, stick to baseX/baseY
            this.x = this.baseX;
            this.y = this.baseY;
        }

        const frame = this.frames[this.frameIndex];
        if (!frame) return;

        this.frameTimer++;
        if (this.frameTimer >= frame.duration) {
            this.frameTimer = 0;
            this.frameIndex++;
            if (this.frameIndex >= this.frames.length) {
                if (this.anim.playOnce) this.finished = true;
                else this.frameIndex = this.anim.loopStart ?? 0;
            }
        }
    }

    render() {
        if (this.finished) return;

        const frame = this.frames[this.frameIndex];
        if (!frame) return;

        // SCALE + FLIP
        let sx = (frame.scale?.[0] ?? 1) * (this.globalModifier.scale?.[0] ?? 1);
        let sy = (frame.scale?.[1] ?? 1) * (this.globalModifier.scale?.[1] ?? 1);

        let autoFlipX = this.autoFlipFrom?.facing === -1;
        const flipX = autoFlipX ^ (frame.flipX ?? false) ^ (this.globalModifier.flipX ?? false);
        const flipY = (frame.flipY ?? false) ^ (this.globalModifier.flipY ?? false);

        if (flipX) sx *= -1;
        if (flipY) sy *= -1;

        // OFFSETS
        let offsetX = (frame.offset?.[0] ?? 0) + (this.globalModifier.offset?.[0] ?? 0);
        let offsetY = (frame.offset?.[1] ?? 0) + (this.globalModifier.offset?.[1] ?? 0);

        if (flipX) offsetX = -offsetX;

        // ROTATION + BLEND
        const rotation = (frame.rotation ?? 0) + (this.globalModifier.rotation ?? 0);
        const blend = frame.blendMode ?? this.globalModifier.blendMode ?? ADD;

        const img = frame.img;
        const w = img.width;
        const h = img.height;

        // DRAW
        push();
        blendMode(blend);

        // Translate to position + offsets
        translate(this.x + offsetX, this.y + offsetY);
        rotate(rotation);

        // Center anchor for rotation
        push();
        scale(sx, sy);
        image(img, -w / 2, -h / 2);
        pop();
        pop();
    }
}


class SFX {
    constructor({ soundObj, volume = 1, pitch = 1 }) {
        this.sound = soundObj.sound; // preloaded p5.SoundFile
        this.volume = volume ?? soundObj.volume ?? 1;
        this.pitch = pitch ?? soundObj.pitch ?? 1;
        this.finished = false;

        this.play();
    }

    play() {
        if (this.sound.isLoaded()) {
            this.sound.setVolume(this.volume);
            this.sound.rate(this.pitch);
            this.sound.play();
            this.finished = true; // considered done immediately
        } else {
            console.warn("moron tried to play a sound before it was loaded lmao");
        }
    }

    update() {
        // optional: track playback if desired
    }
}
