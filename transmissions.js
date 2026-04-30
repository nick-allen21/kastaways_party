// 664.LOMITA.CT.94305 transmission log.
// Each transmission `dropAt` is in PT (-07:00 covers the entire run; no DST flip).
// `body` is rendered exactly as written (whitespace + line breaks preserved, typewriter character-by-character).
// `pacing` is an optional map: bodyLineIdx -> { ms, pauseAfter } overriding default typewriter rhythm.

window.TRANSMISSIONS = [
  {
    id: "T1",
    label: "SIGNAL_INTERCEPTED",
    act: "I",
    dropAt: "2026-04-25T00:00:00-07:00",
    header: "TRANSMISSION 01 · INTERCEPTED · DAY 1",
    body:
`SOS.
THIS IS THE KAPPA ALPHA ORDER.

THE KREWSHIP HAS GONE DOWN.

AFTER SAILING AROUND THE WORLD
WE WERE FINALLY HEADING HOME.

THAT IS WHEN A TERRIBLE STORM HIT.

OUR MEMBERS FLEW OVERBOARD
WE THOUGHT IT WAS THE END.

HOWEVER, OUR LIVES WERE SPARED.

WE WOKE UP, WASHED ASHORE
ON AN UNKNOWN ISLAND.

THE KREWSHIP WAS SPLIT IN TWO
ON THE BEACH.

OUR SUPPLIES WERE BOBBING
IN THE WATER.
WE SALVAGED WHAT WE COULD.

FOOD: ONE MONTH AT BEST.
WATER: WE FOUND SOME INLAND.
SHELTER: PARTS OF THE KREWSHIP.

WE DUBBED THIS PLACE KA ISLAND.
WE BELIEVE OURSELVES ITS FIRST SETTLERS.

IS ANYONE OUT THERE?
IS ANYONE RECEIVING THIS?

PLEASE COME SAVE US.`,
    pacing: {
      0:  { ms: 70, pauseAfter: 400 },  // SOS.
      18: { ms: 70, pauseAfter: 500 },  // THE KREWSHIP WAS SPLIT IN TWO
      32: { ms: 70, pauseAfter: 600 },  // IS ANYONE OUT THERE?
      35: { ms: 70 }                    // PLEASE COME SAVE US.
    }
  },

  {
    id: "T2",
    label: "THE_KRAIDERS",
    act: "I",
    dropAt: "2026-04-28T00:00:00-07:00",
    header: "TRANSMISSION 02 · DAY 2 · THE KRAIDERS",
    body:
`WE WERE SORELY MISTAKEN.

WE ARE NOT THE FIRST SETTLERS
OF KA ISLAND.

THEY CAME ON OUR FIRST NIGHT.
EMERGED FROM THE DARK.
WEAPONS IN HAND.

THEY SLASHED OUR MEMBERS.
STOLE OUR SUPPLIES.

WE DID ALL WE COULD
TO FIGHT THEM OFF.

WE NAMED THEM THE KRAIDERS.

THEY HAVE BEEN HERE
LONGER THAN US.
MAYBE A LOT LONGER.

THEY KNEW THE BEACH
BETTER THAN WE DID.

WE DO NOT KNOW WHERE
THEY CAME FROM.
WE DO NOT KNOW WHERE
THEY WENT.

THEY KEPT YELLING —
NO ONE HELPED US.
NO ONE IS GOING TO HELP YOU EITHER.

FOOD IS RUNNING OUT FASTER NOW.
WATER TOO.

WE ARE BARELY HOLDING OUR OWN.

WHO ARE THEY?
WHERE DID THEY COME FROM?

PLEASE HURRY.`,
    pacing: {
      0:  { ms: 70, pauseAfter: 800 },  // WE WERE SORELY MISTAKEN.
      2:  { ms: 70, pauseAfter: 600 },  // WE ARE NOT THE FIRST SETTLERS
      21: { ms: 70, pauseAfter: 500 },  // THEY KNEW THE BEACH
      24: { ms: 70, pauseAfter: 200 },  // WE DO NOT KNOW WHERE
      26: { ms: 70, pauseAfter: 500 },  // WE DO NOT KNOW WHERE
      30: { ms: 70, pauseAfter: 400 },  // NO ONE HELPED US.
      31: { ms: 70, pauseAfter: 900 },  // NO ONE IS GOING TO HELP YOU EITHER.
      36: { ms: 70, pauseAfter: 600 },  // WE ARE BARELY HOLDING OUR OWN.
      41: { ms: 70 }                    // PLEASE HURRY.
    }
  },

  {
    id: "T3",
    label: "FADING",
    act: "I",
    dropAt: "2026-04-29T00:00:00-07:00",
    header: "TRANSMISSION 03 · DAY 3 · FADING",
    body:
`THREE DAYS SINCE THE WRECK.

WHERE ARE YOU GUYS!??!?!

THIS IS THE KAPPA ALPHA ORDER
A TERRIBLE STORM HIT THE KREWSHIP

WHILE WE WERE SAILING
AROUND THE WORLD

THE KREWSHIP WENT DOWN

OUR MEMBERS FLEW OVERBOARD
WE THOUGHT IT WAS THE END.

HOWEVER, OUR LIVES WERE SPARED.

WE WOKE UP, WASHED ASHORE
ON AN UNKNOWN ISLAND.

RAIDERS, INHABITANTS OF THE ISLAND
HAVE BEEN COMING AFTER US

FOOD IS SCARCE.
WE ARE RUNNING OUT OF WATER

EVERYTHING WE SALVAGED
IS DISAPPEARING FASTER
THAN WE THOUGHT.

THE HUNGER IS DOING SOMETHING
TO THE KREW.

UNSPEAKABLE THOUGHTS ARE EMERGING.

PLEASE.

IS ANYONE THERE !?!?

IF YOU ARE RECEIVING THIS,
COME SAVE US BY MAY 2ND.

WE WILL NOT
MAKE IT PAST
MAY 2ND!!!!!!!!!!!!!!`,
    pacing: {
      0:  { ms: 70, pauseAfter: 600 },  // THREE DAYS SINCE THE WRECK.
      2:  { ms: 18, pauseAfter: 400 },  // WHERE ARE YOU GUYS!??!?!
      4:  { ms: 70, pauseAfter: 600 },  // THE KRAIDERS ARE OUT THERE.
      6:  { ms: 70, pauseAfter: 300 },  // PARANOIA HAS SET IN.
      7:  { ms: 70, pauseAfter: 400 },  // WE WATCH THE TREE LINE.
      8:  { ms: 70, pauseAfter: 700 },  // WE CAN HEAR THEM IN THE TREES.
      20: { ms: 70 },                   // UNSPEAKABLE THOUGHTS
      24: { ms: 70, pauseAfter: 500 },  // ON EACH OTHER.
      26: { ms: 90, pauseAfter: 1000 }, // NOT YET.
      28: { ms: 70, pauseAfter: 700 },  // WE ARE HOLDING THE LINE.
      30: { ms: 70 }                    // PLEASE.
    }
  },

  {
    id: "T4",
    label: "DONT_SAVE_US",
    act: "II",
    dropAt: "2026-04-30T00:00:00-07:00",
    header: "TRANSMISSION 04 · DON'T SAVE US",
    stamp: "COME JOIN US ‼️‼️",
    body:
`WE TOOK A VOTE.

IT'S TOO LATE FOR US

AFTER SAILING THE WORLD 
AFTER THE STORM
AFTER CRASHING ON AN UNKNOWN ISLAND

WE TRIED RATIONING 
WE TRIED FIGHTING OFF THE RAIDERS
WE TRIED SURVIVAL

HOWEVER, WE'VE DECIDED 
WE WILL NOT WAIT
FOR THE RAIDERS
TO FINISH THIS.

WE WILL NOT STARVE
SLOWLY ON THIS BEACH.

SO WE ARE DONE
TRYING TO SURVIVE.

INSTEAD, THE KAPPA ALPHA ORDER 
WILL BE TAKING EVERYTHING WE HAVE LEFT
ALL OF OUR REMAINING RESOURCES...

ALL THE RUM. 🍹
ALL THE WHISKY. 🥃
ALL THE ALEX MANE CHICKEN. 🍗

AND WITH IT

WE ARE THROWING
ONE. 
LAST.
PARTY.

SATURDAY!!! 
MAY SECOND!!!
ON KA ISLAND !!!!

WE ARE THROWING THE BLOWOUT BASH
OF OUR LIVES 🎉

WE ARE GIVING UP ON SURVIVAL 
AND GOING OUT WITH A BANGGGGGG💣

IF YOU ARE RECEIVING THIS
DON'T COME TO THE ISLAND 

TO SAVE US
WE NO LONGER WANT TO BE SAVED!!

COME TO THE ISLAND

TO JOIN US!!!!

FOR THE LAST PARTY 
OF OUR LIVES

FOR THE LAST DAY 
OF OUR LIVES!!!!!

THIS TRANSMISSION IS NOT AN SOS!!
IT'S TOO LATE FOR THAT.

THIS TRANSMISSION !!!
IS AN INVITATION TO MAKE OUR LAST DAY
THE BEST DAY EVER.

THIS TRANSMISSION
IS A CALLING TO
THE BLOWOUT DARTY WITH US.

TO THE BLOWOUT BASHHHHHHHHH!!!

🏝️MAY 2ND. KAPPA ALPHA. KASTAWAYS🏝️
🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉`,
    pacing: {
      0:  { ms: 70, pauseAfter: 650 },  // WE TOOK A VOTE.
      2:  { ms: 74, pauseAfter: 650 },  // IT'S TOO LATE FOR US
      4:  { ms: 70 },                   // AFTER SAILING THE WORLD
      5:  { ms: 70 },                   // AFTER THE STORM
      6:  { ms: 70, pauseAfter: 450 },  // AFTER CRASHING...
      8:  { ms: 64 },                   // WE TRIED RATIONING
      9:  { ms: 64 },                   // WE TRIED FIGHTING...
      10: { ms: 64, pauseAfter: 550 },  // WE TRIED SURVIVAL
      12: { ms: 70, pauseAfter: 350 },  // HOWEVER, WE'VE DECIDED
      13: { ms: 62 },
      14: { ms: 62 },
      15: { ms: 62, pauseAfter: 420 },
      17: { ms: 62 },
      18: { ms: 62, pauseAfter: 500 },
      20: { ms: 64 },
      21: { ms: 64, pauseAfter: 650 },  // TRYING TO SURVIVE.
      23: { ms: 54 },                   // INSTEAD...
      24: { ms: 48 },
      25: { ms: 42, pauseAfter: 300 },
      27: { ms: 22 },
      28: { ms: 22 },
      29: { ms: 22, pauseAfter: 250 },
      31: { ms: 38, pauseAfter: 220 },  // AND WITH IT
      33: { ms: 28 },                   // WE ARE THROWING
      34: { ms: 105, pauseAfter: 650 }, // ONE.
      35: { ms: 105, pauseAfter: 650 }, // LAST.
      36: { ms: 105, pauseAfter: 800 }, // PARTY.
      38: { ms: 20 },
      39: { ms: 20 },
      40: { ms: 20, pauseAfter: 260 },
      42: { ms: 18 },
      43: { ms: 14, pauseAfter: 300 },
      45: { ms: 28 },
      46: { ms: 28, pauseAfter: 250 },
      48: { ms: 44, pauseAfter: 300 },
      49: { ms: 28, pauseAfter: 250 },
      51: { ms: 44, pauseAfter: 300 },
      52: { ms: 32, pauseAfter: 260 },
      54: { ms: 24, pauseAfter: 120 },
      56: { ms: 16, pauseAfter: 250 },
      58: { ms: 12 },
      59: { ms: 12, pauseAfter: 360 },
      61: { ms: 12 },
      62: { ms: 12, pauseAfter: 360 },
      64: { ms: 24 },
      65: { ms: 24, pauseAfter: 300 },
      67: { ms: 24 },
      68: { ms: 16 },
      69: { ms: 14, pauseAfter: 300 },
      71: { ms: 24 },
      72: { ms: 18 },
      73: { ms: 14, pauseAfter: 300 },
      75: { ms: 16, pauseAfter: 260 },
      77: { ms: 20 },
      78: { ms: 120 }
    }
  },

  {
    id: "T5",
    label: "FINAL_BASH",
    act: "II→III",
    dropAt: "2026-05-01T00:00:00-07:00",
    header: "TRANSMISSION 05 · FINAL BASH",
    body:
`IT IS TOMORROW!!! 🎉

THE FINAL BASH. 🥳

WE BUILT A MIGHTY STAGE
FROM THE BONES OF THE KREWSHIP. 🔨

THE WHOLE BEACH IS SHAKING!!! ⚡

RUMS GALORE. 🍹
WHISKY TOO. 🥃

WE WILL SING SEA SHANTIES
ALL DAY. 🎶

WE WILL PLAY MUSIC
UNTIL THE ISLAND
CAN HEAR US DIE!!! 🔊

IF ANYONE IS GETTING
THIS MESSAGE —

IF ANYONE CAN HEAR US —

COME TOMORROW!!! 🏝️
COME JOIN US
FOR THE FINAL BASH!!! 🎉`,
    pacing: {
      0:  { ms: 55, pauseAfter: 500 },  // IT IS TOMORROW!!!
      2:  { ms: 48, pauseAfter: 450 },  // THE FINAL BASH.
      4:  { ms: 48 },                   // WE BUILT A MIGHTY STAGE
      5:  { ms: 48, pauseAfter: 500 },  // FROM THE BONES OF THE KREWSHIP.
      7:  { ms: 28, pauseAfter: 260 },  // THE WHOLE BEACH IS SHAKING!!!
      9:  { ms: 28 },                   // RUMS GALORE.
      10: { ms: 28, pauseAfter: 260 },  // WHISKY TOO.
      12: { ms: 32 },                   // WE WILL SING SEA SHANTIES
      13: { ms: 32, pauseAfter: 300 },  // ALL DAY.
      15: { ms: 48 },                   // WE WILL PLAY MUSIC
      17: { ms: 48, pauseAfter: 650 },  // CAN HEAR US DIE!!!
      19: { ms: 50 },                   // IF ANYONE IS GETTING
      22: { ms: 50, pauseAfter: 350 },  // IF ANYONE CAN HEAR US —
      24: { ms: 42, pauseAfter: 300 },  // COME TOMORROW!!!
      25: { ms: 42 },                   // COME JOIN US
      26: { ms: 42 }                    // FOR THE FINAL BASH!!!
    }
  },

  {
    id: "T6",
    label: "FINAL_BASH_BEGUN",
    act: "III",
    dropAt: "2026-05-02T00:00:00-07:00",
    header: "FINAL TRANSMISSION · THE FINAL BASH HAS BEGUN",
    body:
`THE FINAL BASH HAS BEGUN!!! 🎉🥳

THE RUM IS ALREADY FLOWING!!! 🍹🍹
THE MUSIC IS ALREADY PLAYING!!! 🎶🔊

WE ARE DANCING 🕺
ON THE REMNANTS
OF THE KREWSHIP!!! 🌊

THE STAGE IS SHAKING!!! 🔥
THE WHOLE BEACH IS SHAKING!!! ⚡

WE DO NOT WANT
TO BE SAVED.

NOT ANYMORE!!! 🍻

THIS IS NO LONGER AN SOS. 📡

THIS IS AN INVITATION
TO THE PARTY OF A LIFETIME!!! 🎉

COME JOIN THE ORDER
ON OUR LAST DAY!!! 🫡

THE LAST BASH
KA ISLAND WILL EVER SEE!!! 🏝️

THE LAST BASH
KA WILL EVER SEE!!! 🔥

COME JOIN US HERE!!! 🥳

THIS IS A PARTY
FOR THE AGES!!! 🎶🍹

KAPPA ALPHA · OUT!!! 🫡`,
    pacing: {
      0:  { ms: 70, pauseAfter: 1000 }, // THE FINAL BASH HAS BEGUN.
      2:  { ms: 24 },                   // THE RUM IS ALREADY FLOWING.
      3:  { ms: 24, pauseAfter: 400 },  // THE MUSIC IS ALREADY PLAYING.
      5:  { ms: 70 },                   // WE ARE DANCING
      7:  { ms: 70, pauseAfter: 700 },  // OF THE KREWSHIP.
      9:  { ms: 18 },                   // THE STAGE IS SHAKING.
      10: { ms: 18, pauseAfter: 500 },  // THE WHOLE BEACH IS SHAKING.
      12: { ms: 70 },                   // WE DO NOT WANT
      13: { ms: 70, pauseAfter: 600 },  // TO BE SAVED.
      15: { ms: 90, pauseAfter: 800 },  // NOT ANYMORE.
      17: { ms: 70, pauseAfter: 700 },  // THIS IS NO LONGER AN SOS.
      19: { ms: 70 },                   // THIS IS AN INVITATION
      20: { ms: 70, pauseAfter: 700 },  // TO THE PARTY OF A LIFETIME.
      22: { ms: 70 },                   // COME JOIN THE ORDER
      23: { ms: 70, pauseAfter: 700 },  // ON OUR LAST DAY.
      25: { ms: 70 },                   // THE LAST BASH
      26: { ms: 70, pauseAfter: 600 },  // KA ISLAND WILL EVER SEE.
      28: { ms: 70 },                   // THE LAST BASH
      29: { ms: 70, pauseAfter: 600 },  // KA WILL EVER SEE.
      31: { ms: 70, pauseAfter: 700 },  // COME JOIN US HERE.
      33: { ms: 70 },                   // THIS IS A PARTY
      34: { ms: 70, pauseAfter: 900 },  // FOR THE AGES.
      36: { ms: 90 }                    // KAPPA ALPHA · OUT.
    }
  }
];

window.SIGNAL_ANCHORS = {
  firstDrop: "2026-04-25T00:00:00-07:00",
  partyStart: "2026-05-02T14:00:00-07:00",
  signalTerminated: "2026-05-02T00:00:00-07:00"
};
