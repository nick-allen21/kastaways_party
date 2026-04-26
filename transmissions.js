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
    header: "TRANSMISSION 01 · SIGNAL INTERCEPTED · DAY 1",
    body:
`SOS.
THIS IS THE KAPPA ALPHA ORDER.

THE KREWSHIP HAS GONE DOWN.

AFTER SAILING AROUND THE WORLD
WE WERE FINALLY HEADING HOME. 

THAT IS WHEN A TERRIBLE STORM HIT.

THE KREWSHIP WENT DOWN. 
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
      12: { ms: 70, pauseAfter: 500 },  // THE KREWSHIP WAS SPLIT IN TWO
      26: { ms: 70, pauseAfter: 600 },  // IS ANYONE OUT THERE?
      29: { ms: 70 }                    // PLEASE COME SAVE US.
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

THE KRAIDERS ARE OUT THERE.

PARANOIA HAS SET IN.
WE WATCH THE TREE LINE.
WE CAN HEAR THEM IN THE TREES.

FOOD IS SCARCE.
WATER IS WORSE.

EVERYTHING WE SALVAGED
IS DISAPPEARING FASTER
THAN WE THOUGHT.

THE HUNGER IS DOING SOMETHING
TO THE KREW.

UNSPEAKABLE THOUGHTS
HAVE EMERGED.

WE HAVE NOT TURNED
ON EACH OTHER.

NOT YET.

WE ARE HOLDING THE LINE.

PLEASE.
IF YOU ARE RECEIVING THIS,
COME SAVE US.`,
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
    label: "RESCUE_CANCELLED",
    act: "II",
    dropAt: "2026-04-30T00:00:00-07:00",
    header: "TRANSMISSION 04 · RESCUE CANCELLED",
    stamp: "RESCUE CANCELLED",
    body:
`WE TOOK A VOTE.

NO ONE IS COMING.
WE KNOW THAT NOW.

A SLOW DEATH IN A BATTLE OF
ATTRITION. MINIMUM AURA.

INSTEAD —
WE TAKE EVERYTHING WE HAVE.
THE RUM. THE WHISKY.
THE ALEX MANE CHICKEN.

WE THROW ONE LAST BLOWOUT.

THE LAST RAVE ON EARTH.
SATURDAY. MAY SECOND.
ON KA ISLAND.

OWN OUR END. MAXIMUM AURA.

IF YOU ARE RECEIVING THIS —
COME FIND US.

NEXT SIGNAL TOMORROW.`,
    pacing: {
      0:  { ms: 70, pauseAfter: 600 },   // WE TOOK A VOTE.
      2:  { ms: 70, pauseAfter: 1200 },  // NO ONE IS COMING.
      3:  { ms: 70, pauseAfter: 400 },   // WE KNOW THAT NOW.
      8:  { ms: 70, pauseAfter: 600 },   // INSTEAD —
      10: { ms: 18 },                    // THE RUM. THE WHISKY.
      11: { ms: 18 },                    // THE ALEX MANE CHICKEN.
      13: { ms: 70, pauseAfter: 800 },   // WE THROW ONE LAST BLOWOUT.
      19: { ms: 70, pauseAfter: 600 }    // OWN OUR END. MAXIMUM AURA.
    }
  },

  {
    id: "T5",
    label: "TWENTY_FOUR_HOURS",
    act: "II→III",
    dropAt: "2026-05-01T00:00:00-07:00",
    header: "TRANSMISSION 05 · 24 HOURS",
    body:
`IT IS TOMORROW.

THE SUN WILL RISE ONE LAST TIME
AND THEN IT WILL GO DOWN.
AND WE WILL GO DOWN WITH IT.

WE BUILT A STAGE
FROM THE BONES OF THE KREWSHIP.
THE PLEDIGTOS WHO BUILT HER
ARE TEARING HER APART.

THE KARAIDERS HAVE GONE QUIET.
WE THINK THEY ARE WAITING TOO.

COME AT TWO PM.
DRESS FOR THE BEACH.
BRING A BORG.

SEE YOU ON THE ISLAND.`,
    pacing: {
      0:  { ms: 70, pauseAfter: 800 },  // IT IS TOMORROW.
      4:  { ms: 70, pauseAfter: 800 },  // AND WE WILL GO DOWN WITH IT.
      14: { ms: 18 },                   // COME AT TWO PM.
      15: { ms: 18 },                   // DRESS FOR THE BEACH.
      16: { ms: 18, pauseAfter: 400 },  // BRING A BORG.
      18: { ms: 70 }                    // SEE YOU ON THE ISLAND.
    }
  },

  {
    id: "T6",
    label: "FINAL_TRANSMISSION",
    act: "III",
    dropAt: "2026-05-02T00:00:00-07:00",
    header: "FINAL TRANSMISSION · SIGNAL TERMINATED",
    body:
`SIGNAL LOCKED.

YOU ARE THE RESCUE.
YOU FOUND US.
IT DOES NOT MATTER ANYMORE.

THE BYTES ARE GONE.
FILIP'S MAC MINI HAS DIED.

IF YOU ARE RECEIVING THIS,
YOU ARE ALREADY ON THE WAY.

THE LAST RAVE HAS BEGUN.

KAPPA ALPHA · OUT.`,
    pacing: {
      0:  { ms: 70, pauseAfter: 1000 }, // SIGNAL LOCKED.
      2:  { ms: 70, pauseAfter: 600 },  // YOU ARE THE RESCUE.
      3:  { ms: 70, pauseAfter: 600 },  // YOU FOUND US.
      4:  { ms: 70, pauseAfter: 1500 }, // IT DOES NOT MATTER ANYMORE.
      12: { ms: 70, pauseAfter: 800 },  // THE LAST RAVE HAS BEGUN.
      14: { ms: 90 }                    // KAPPA ALPHA · OUT.
    }
  }
];

window.SIGNAL_ANCHORS = {
  firstDrop: "2026-04-25T00:00:00-07:00",
  partyStart: "2026-05-02T14:00:00-07:00",
  signalTerminated: "2026-05-02T00:00:00-07:00"
};
