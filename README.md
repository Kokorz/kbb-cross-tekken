# kbb-cross-tekken
This is a final project for a class in my University.

Forged from the molten plastic of Mishima Zaibatsu, from the lowest floor of the darkest basement where only Electric Wind God Fists dare be made, exists the most unholy item ever to be found in a box of frosted Sugar Doodles... This project. I decided to try and fuse [Kirby Battle Blitz](https://gamejolt.com/games/KBB/578480) and [Tekken 8](https://store.steampowered.com/app/1778820/TEKKEN_8/). No 3D movement however, just a lot of mechanics. Coded in JavaScript, libraries used are q5.js (in place of p5.js), p5.sound, and p5play.

Due to usage of assets that won't become public property until the latest version of KBB (one of the games this is based on; and a fangame I work on as a lead developer), version 3.0.0, releases, after this is graded, this repository may likely become private until said version of the game is publicly released. 

(If by rare chance you are someone from said class that has GitHub, however, I don't mind giving you access to the repo after it's made private however, let me know :3... just don't make any commits.) 


## Checklist!
### Civilian States
- [x] Idle
- [x] Crouch
- [x] Walk
  - [x] Forward
  - [x] Backward
- [x] Run
- [x] Jump
- [ ] Backdash
- [ ] Turn
- [ ] Hurtstates
  - [x] Grounded (Stand High/Low, Crouch)
  - [x] Air Normal
  - [ ] Tornado
    - (sprites are made!)
  - [x] Screw
  - [x] Groundbounce
  - [x] Knockdown
    - NOTE: OTG'ing doesn't work properly yet
    - NOTE: Teching has not been implemented
    - NOTE: Could use a bit of sliding to a stop (easing) when they hit the ground IF there's an xvel
  - [ ] Wall Splat
    - (sprites are made!)
### Attacks
#### NOTE: I DON'T EXPECT MYSELF TO DO ALL OF THESE... IT ALL DEPENDS ON TIME!
> These are notated using numpad notation so as to make it easier for me to understand at a quick glance!
> 
> If you are by chance a Tekken player and are struggling to read this (Tekken uses different notation)... Or, you don't understand numpad notation...
> Here's a quick at a glance primer!:
> 7 | 8 | 9
> | --- | --- | --- |
> 4 | 5 | 6
> 1 | 2 | 3
>
> These correspond to your directions. 5 being neutral (no direction), 2 being down, 6 being forward, you get the idea.
> 
> Buttons are: **L**eft **P**unch, **R**ight **P**unch, **L**eft **K**ick, **R**ight **K**ick
>
> So, for example, 5LP means Neutral Left Punch.
>
> an example of button combo notation: LP+RP
>
> an example of FAST successive button presses (for moves with strings): LP,RP
>
> an example of chains: LP > RP
> 
> There are of course motions too, oooooooh
> 
> 236 means do down, down forward, forward.
>
> Meaning, 236LK means doing Down, Down Forward, Forward, Left Kick.
#### Stray
- [x] 5LP
  - [x] Concept
    - Jab.
  - [x] Animation
  - [x] Code
- [x] 5RP
  - [x] Concept
    - Jab.
  - [x] Animation
  - [x] Code
- [ ] 5LK
  - [ ] Concept
      - Heel Kick of sorts... because making a puffball do a 'knee' is impossible biologically
  - [ ] Animation
  - [ ] Code
- [ ] 5RK
  - [x] Concept
    - Kick similar to [Ragna's 5B from BlazBlue.](https://www.dustloop.com/w/BBCF/Ragna_the_Bloodedge#5B)
  - [ ] Animation
  - [ ] Code
- [ ] 5LP+RP  
  - [x] Concept
    - Shoulder Tackle. [Tetsuzanko!](https://virtuafighter.com/commands/tetsuzank%C5%8D.23329/view)
  - [ ] Animation
  - [ ] Code
- [x] 66LP
  - [x] Concept
      - A dashing uppercut! 
  - [x] Animation
    - Exists already, needs to get imported!
  - [x] Code
- [ ] 2LP
  - [ ] Concept
      - zzz
  - [ ] Animation
  - [ ] Code
- [ ] 2RP
  - [ ] Concept
      - zzz
  - [ ] Animation
  - [ ] Code
- [ ] 2LK
  - [ ] Concept
      - zzz
  - [ ] Animation
  - [ ] Code
- [ ] 2RK
  - [ ] Concept
      - zzz
  - [ ] Animation
  - [ ] Code
- [ ] j.LP
  - [ ] Concept
      - zzz
  - [ ] Animation
  - [ ] Code
- [ ] j.RP
  - [ ] Concept
      - zzz
  - [ ] Animation
  - [ ] Code
- [ ] j.LK
  - [ ] Concept
      - zzz
  - [ ] Animation
  - [ ] Code
- [ ] j.RK
  - [ ] Concept
      - zzz
  - [ ] Animation
  - [ ] Code
- [ ] 4LP+RP
  - [ ] Concept
      - zzz
  - [ ] Animation
  - [ ] Code
- [ ] 3LK+RK
  - [ ] Concept
      - zzz
  - [ ] Animation
  - [ ] Code
- [ ] LP+LK/RP+RK
  - [ ] Concept
      - zzz
  - [ ] Animation
  - [ ] Code
#### Glitch
- [x] 5LP
  - [x] Concept
    - Jab.
  - [x] Animation
  - [x] Code
- [x] 5RP
  - [x] Concept
    - Jab.
  - [x] Animation
  - [x] Code
- [ ] 5LK
  - [ ] Concept
      - zzz
  - [ ] Animation
  - [ ] Code
- [ ] 5RK
  - [ ] Concept
      - zz
  - [ ] Animation
  - [ ] Code
- [ ] 2LP
  - [ ] Concept
      - zzz
  - [ ] Animation
  - [ ] Code
- [ ] 2RP
  - [ ] Concept
      - zzz
  - [ ] Animation
  - [ ] Code
- [ ] 2LK
  - [ ] Concept
      - zzz
  - [ ] Animation
  - [ ] Code
- [ ] 2RK
  - [ ] Concept
      - zzz
  - [ ] Animation
  - [ ] Code
- [ ] j.LP
  - [ ] Concept
      - zzz
  - [ ] Animation
  - [ ] Code
- [ ] j.RP
  - [ ] Concept
      - zzz
  - [ ] Animation
  - [ ] Code
- [ ] j.LK
  - [ ] Concept
      - zzz
  - [ ] Animation
  - [ ] Code
- [ ] j.RK
  - [ ] Concept
      - zzz
  - [ ] Animation
  - [ ] Code
- [ ] 6523
  - [x] Concept
      - the mishima special crouch dash
  - [ ] Animation
  - [ ] Code

### System
- [ ] Match flow system
- [ ] Character select
- [ ] Makey Makey support
- [ ] Damage Scaling
  - In progress, Issue with takeHit/checkHits where attacks apply Twice.
- [ ] Launch Scaling (aka, Tekken's Juggle System)
  - In progress, Issue with takeHit/checkHits where attacks apply Twice.
- [x] Add in the WALLS.
- [ ] Add a proper background
  - You know what, i'm NOT doing this!
- [ ] Make UI more Stylish
- [ ] Effects System
  - [x] Sound and Visual Effects Spawn/Play
  - [ ] Visual Effects can be manipulated in character class and its subclasses
