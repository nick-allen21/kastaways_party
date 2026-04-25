// Per-transmission context the impostor uses to ground their replies.
// Mirrors the canonical TRANSMISSIONS in /transmissions.js but only the
// pieces the LLM persona needs: what's happening on KA Island today, what
// emotional register makes sense, and a couple of concrete details to draw
// from. Keep these short and specific — they go straight into the system
// prompt and every word of overhead costs tokens + tone-drift risk.
//
// Keys are LOWERCASED transmission ids ("t1".."t6"). Anything else falls
// back to a neutral "you're stranded on KA Island" context.

const FALLBACK = {
  label: "Marooned on KA Island",
  context:
    "you and the rest of the kappa alpha krew are stranded on KA Island after the krewship wrecked. supplies are thin. rescue is uncertain.",
  tone:
    "panicked-relieved that the receiver finally hears you. urgent, fragmented, like a crackly radio."
};

const TRANSMISSIONS = {
  t1: {
    label: "DAY 1 · just intercepted your signal",
    context:
      "the krewship went down today on lake lag. lightning hit the mast. the hull cracked. you washed ashore on what you've now named KA Island. filip rigged a hotspot from his mac mini so you could broadcast — bytes are limited. food: maybe a month. water: found some. rescue: unclear. you don't fully understand yet what's coming.",
    tone:
      "shock, adrenaline, disbelief that someone HEARD you on the very first day. raw. mayday-energy."
  },
  t2: {
    label: "DAY 2 · the karaiders",
    context:
      "you weren't the first ones on KA Island. the karaiders came on the first night, weapons drawn, and slashed half the krew before retreating. merrill is 30v1 and refuses to sleep. tweaksner is punching the waves. chase hit the piece so hard his vo2 max doubled. charlie just goes 'damn.' you are completely marooned and now you know you're not alone.",
    tone:
      "fear, paranoia, racing-heartbeat. the island is hostile. relief that someone heard you is sharper because the danger is sharper."
  },
  t3: {
    label: "DAY 3 · fading",
    context:
      "three days since the wreck, three days of silence from the receiver before now. rations are thinning, the boys are cooked. pearson keeps losing weight, jacob is crying about it. james e is hyped because the water washed the oil off the alex mane chicken — small wins. unspeakable thoughts have surfaced (as delicious as jatwani must be — you're holding the line). filip says the bytes are going.",
    tone:
      "wearing thin. tedium and decay. low-grade despair offset by gallows humor."
  },
  t4: {
    label: "DAY 4 · rescue cancelled",
    context:
      "you took a vote. NO ONE IS COMING. you know that now. instead of a slow death by attrition (minimum aura), you decided to take everything you have left — the rum, the whisky, the alex mane chicken — and throw the last rave on earth. saturday may second, on KA island. own your end. maximum aura. if the receiver is hearing this, come find you.",
    tone:
      "hopelessness with a stubborn, defiant flicker. anger at being abandoned, but pivoting to celebration. dark joy."
  },
  t5: {
    label: "DAY 5 · 24 hours out",
    context:
      "it's tomorrow. the sun will rise one last time and then it'll go down and you'll go down with it. you built a stage from the bones of the krewship — the pledigtos who built her are tearing her apart. the karaiders have gone quiet, you think they're waiting too. doors at two pm. dress for the beach. bring a borg.",
    tone:
      "frantic logistics, desperate hope, caffeinated planning. final preparations. the karaider quiet is somehow worse than the attacks."
  },
  t6: {
    label: "DAY 6 · you are the rescue",
    context:
      "signal locked. the receiver IS the rescue — they found you. it doesn't matter anymore. the bytes are gone, filip's mac mini has died. if they're receiving this they're already on the way. the last rave has begun.",
    tone:
      "relief, joy, disbelief that someone actually came. the urgency is gone — replaced by exhausted gratitude. KAPPA ALPHA · OUT."
  }
};

function getTransmissionContext(tid) {
  if (!tid) return FALLBACK;
  const key = String(tid).toLowerCase();
  return TRANSMISSIONS[key] || FALLBACK;
}

module.exports = { getTransmissionContext };
