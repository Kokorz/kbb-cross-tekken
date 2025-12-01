class VFX {
    constructor({ anim, x, y, follow = null, followTime = 0, globalModifier = {} }) {
        this.anim = anim;
        this.frames = anim.frames;
        this.frameIndex = 0;
        this.frameTimer = 0;

        this.x = x;
        this.y = y;
        this.follow = follow;
        this.followTime = followTime;

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

        if (this.follow && this.followTime > 0) {
            this.x = this.follow.sprite.x;
            this.y = this.follow.sprite.y;
            this.followTime--;
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

        // Combine per-frame modifiers with global modifiers
        const offsetX = (frame.offset?.[0] ?? 0) + (this.globalModifier.offset?.[0] ?? 0);
        const offsetY = (frame.offset?.[1] ?? 0) + (this.globalModifier.offset?.[1] ?? 0);

        let scaleX = (frame.scale?.[0] ?? 1) * (this.globalModifier.scale?.[0] ?? 1);
        let scaleY = (frame.scale?.[1] ?? 1) * (this.globalModifier.scale?.[1] ?? 1);

        // Apply flips
        if (frame.flipX ?? this.globalModifier.flipX) scaleX *= -1;
        if (frame.flipY ?? this.globalModifier.flipY) scaleY *= -1;

        const rotation = (frame.rotation ?? 0) + (this.globalModifier.rotation ?? 0);
        const blend = frame.blendMode ?? this.globalModifier.blendMode ?? ADD;

        push();
        translate(this.x + offsetX, this.y + offsetY);
        rotate(rotation);
        scale(scaleX, scaleY);
        blendMode(blend);

        imageMode(CENTER);
        image(frame.img, 0, 0);

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
