class HUD {
  constructor(p1, p2, durationMs = 60000) {
    this.p1 = p1;
    this.p2 = p2;
    this.startTime = millis();
    this.duration = durationMs; // 60 seconds default
    this.timeUp = false;
    this.timeUpStartFrame = 0;
    this.timeUpHoldDur = 120;

    this.itemEffects = []; // Array of floating text effects
  }

  update() {
    // Update effects
    this.itemEffects = this.itemEffects.filter((eff) => {
      eff.update();
      return !eff.isOver();
    });
  }

  display() {
    push();
    camera.off(); // UI is screen-space
    this.displayHealthBars();
    // this.displayTimer();
    this.displayStates();
    this.displayEffects();
    // this.displayTimeUp();
    pop();
  }

  displayHealthBars() {
    const barWidth = 90; // bigger width
    const barHeight = 10; // bigger height
    const margin = 10;

    // Player 1 (left-top)
    let hpRatio1 = constrain(this.p1.health / this.p1.maxHealth, 0, 1);
    fill(60);
    noStroke();
    rect(margin, margin, barWidth, barHeight, 5); // move to top
    fill(50, 90, 255);
    rect(margin, margin, barWidth * hpRatio1, barHeight, 5);

    // Player 2 (right-top)
    let hpRatio2 = constrain(this.p2.health / this.p1.maxHealth, 0, 1);
    fill(60);
    rect(width - barWidth - margin, margin, barWidth, barHeight, 5);
    fill(50, 90, 255);
    rect(width - barWidth - margin, margin, barWidth * hpRatio2, barHeight, 5);
  }

  displayTimer() {
    const elapsed = millis() - this.startTime;
    const remaining = max(this.duration - elapsed, 0);

    const totalSeconds = floor(remaining / 1000);
    const minutes = floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const ms = floor(remaining % 1000);

    const timerStr = nf(minutes, 2) + ":" + nf(seconds, 2) + "." + nf(ms, 3);

    textSize(30);
    textAlign(CENTER, CENTER);
    fill(0);
    text(timerStr, width / 2, 30);

    if (remaining <= 0 && !this.timeUp) {
      this.timeUp = true;
      this.timeUpStartFrame = frameCount;
    }
  }

  displayStates() {
    textSize(10);
    fill(0);
    textAlign(CENTER, CENTER);

    // P1 state (left-bottom)
    text(this.p1.state, 20, 35);

    // P2 state (right-bottom)
    text(this.p2.state, width - 20, 35);
  }

  displayEffects() {
    this.itemEffects.forEach((eff) => eff.display());
  }

  displayTimeUp() {  
    if (!this.timeUp) return;

    const elapsed = frameCount - this.timeUpStartFrame;
    const fadeInDuration = 30;
    const holdDuration = this.timeUpHoldDur;
    const totalDuration = fadeInDuration + holdDuration;

    push();
    textAlign(CENTER, CENTER);
    textSize(100);
    fill(0);
    text("TIME'S UP", width / 2, height / 2);
    pop();

    if (elapsed > totalDuration) {
      // Trigger end of match
      gameState = "ending";
      endingGraphStartFrame = frameCount;
    }
  }

  addEffect(text, color, x, y) {
    this.itemEffects.push(new Effect_ItemGainText(text, color, x, y));
  }
}
