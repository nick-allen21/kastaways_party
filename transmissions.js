// KA-026 transmission log (v6).
// Each transmission `dropAt` is in PT (-07:00 covers the entire run; no DST flip).
// `body` is rendered exactly as written (whitespace + line breaks preserved, typewriter character-by-character).
// `pacing` is an optional map: bodyLineIdx -> { ms, pauseAfter } overriding default typewriter rhythm.
// `rations` is the per-transmission Rations Log snapshot (rendered below the body).

window.TRANSMISSIONS = [
  {
    id: "T1",
    label: "SIGNAL_INTERCEPTED",
    act: "I",
    dropAt: "2026-04-27T12:00:00-07:00",
    header: "TRANSMISSION 01 · SIGNAL INTERCEPTED · DAY 1",
    body:
`MAYDAY · MAYDAY · MAYDAY

THIS IS THE KAPPA ALPHA ORDER.
THE KREWSHIP HAS GONE DOWN.

WE WERE EXPLORING LAKE LAG.
A LIGHT RAIN BECAME A TEMPEST.
LIGHTNING STRUCK THE MAST.
THE HULL TOOK ON WATER.

WE WASHED ASHORE ON UNKNOWN LAND.
WE DUBBED IT KA ISLAND.

FILIP RIGGED A HOTSPOT FROM
HIS MAC MINI. WE HAVE BYTES.
NOT MANY. ENOUGH FOR THIS.

FOOD: ONE MONTH AT BEST.
WATER: WE FOUND SOME.
RESCUE: UNCLEAR.

IF YOU ARE RECEIVING THIS —
WE NEED HELP BY MAY 2.

NEXT SIGNAL IN 24 HOURS.
STAND BY.`,
    pacing: {
      19: { ms: 70, pauseAfter: 800 },  // RESCUE: UNCLEAR.
      25: { ms: 70 }                    // STAND BY.
    },
    rations: {
      rum:     { pct: 100 },
      whisky:  { pct: 100 },
      chicken: { pct: 100 },
      morale:  { pct: null, glitch: true },
      zyns:    { pct: 100 }
    }
  },

  {
    id: "T2",
    label: "THE_RAIDERS",
    act: "I",
    dropAt: "2026-04-28T12:00:00-07:00",
    header: "TRANSMISSION 02 · DAY 2 · THE RAIDERS",
    body:
`WE WERE NOT THE FIRST HERE.

THEY CAME ON OUR FIRST NIGHT.
EMERGED FROM THE DARK.
WEAPONS IN HAND.
SLASHED OUR MEMBERS.
STOLE OUR SUPPLIES.

WE FOUGHT WHAT WE COULD.

MERILL IS 30 V 1 AGAINST THEM.
HE IS NOT SLEEPING.
TWEAKSNER IS PUNCHING THE WAVES.
CHASE HIT THE PIECE SO HARD
HIS VO2 MAX DOUBLED.
CHARLIE GOES, "DAMN."

WE ARE COMPLETELY MAROONED.

NEXT SIGNAL TOMORROW.`,
    pacing: {
      0:  { ms: 70, pauseAfter: 800 },  // WE WERE NOT THE FIRST HERE.
      8:  { ms: 70, pauseAfter: 400 },  // WE FOUGHT WHAT WE COULD.
      17: { ms: 70, pauseAfter: 600 }   // WE ARE COMPLETELY MAROONED.
    },
    rations: {
      rum:     { pct: 80 },
      whisky:  { pct: 85 },
      chicken: { pct: 70 },
      morale:  { pct: null, glitch: true },
      zyns:    { pct: 75 }
    }
  },

  {
    id: "T3",
    label: "FADING",
    act: "I",
    dropAt: "2026-04-29T12:00:00-07:00",
    header: "TRANSMISSION 03 · DAY 3 · FADING",
    body:
`THREE DAYS SINCE THE WRECK.
THREE DAYS OF SILENCE FROM YOU.

RATIONS THIN. THE BOYS ARE COOKED.
PEARSON HAS LOST WEIGHT.
JACOB IS CRYING ABOUT IT.

JAMES E IS HYPE THAT THE WATER
WASHED THE OIL OFF THE CHICKEN.
SMALL WINS.

THE RAIDERS HAVE A NAME NOW.
WE CALL THEM THE KARAIDERS.

UNSPEAKABLE THOUGHTS HAVE EMERGED.
AS DELICIOUS AS JATWANI MUST BE —
WE ARE HOLDING THE LINE.

FILIP SAYS THE BYTES ARE GOING.
NEXT SIGNAL TOMORROW.`,
    pacing: {
      15: { ms: 70 },                   // AS DELICIOUS AS JATWANI MUST BE —
      16: { ms: 70, pauseAfter: 600 }   // WE ARE HOLDING THE LINE.
    },
    rations: {
      rum:     { pct: 70 },
      whisky:  { pct: 75 },
      chicken: { pct: 50 },
      morale:  { pct: null, glitch: true },
      zyns:    { pct: 55 }
    }
  },

  {
    id: "T4",
    label: "RESCUE_CANCELLED",
    act: "II",
    dropAt: "2026-04-30T12:00:00-07:00",
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
    },
    rations: {
      rum:     { pct: 65 },
      whisky:  { pct: 70 },
      chicken: { pct: 35 },
      morale:  { pct: null, glitch: true },
      zyns:    { pct: 40 }
    }
  },

  {
    id: "T5",
    label: "TWENTY_FOUR_HOURS",
    act: "II→III",
    dropAt: "2026-05-01T12:00:00-07:00",
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
    },
    rations: {
      rum:     { pct: 55 },
      whisky:  { pct: 60 },
      chicken: { pct: 22 },
      morale:  { pct: null, glitch: true },
      zyns:    { pct: 22 }
    }
  },

  {
    id: "T6",
    label: "FINAL_TRANSMISSION",
    act: "III",
    dropAt: "2026-05-02T10:00:00-07:00",
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
    },
    rations: {
      rum:     { pct: 40 },
      whisky:  { pct: 45 },
      chicken: { pct: 12 },
      morale:  { pct: null, glitch: true },
      zyns:    { pct: 8 }
    }
  }
];

// Static order + display labels for the rations log (matches the keys above).
window.RATIONS_ORDER = [
  { key: "rum",     label: "RUM" },
  { key: "whisky",  label: "WHISKY" },
  { key: "chicken", label: "ALEX MANE CHICKEN" },
  { key: "morale",  label: "MORALE" },
  { key: "zyns",    label: "ZYNS (Rx)" }
];

window.SIGNAL_ANCHORS = {
  firstDrop: "2026-04-27T12:00:00-07:00",
  partyStart: "2026-05-02T14:00:00-07:00",
  signalTerminated: "2026-05-02T10:00:00-07:00"
};
