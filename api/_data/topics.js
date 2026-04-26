// Story-topic pool. The serverless function picks one at random and uses it as
// fallback color only when the receiver's message is too empty/vague to drive a
// direct reply. Keep day-scoped pools spoiler-safe: T1 should not accidentally
// volunteer Karaiders, "no one is coming", or later bytes/Mac Mini lore.
const DEFAULT_TOPICS = [
  "the rations running out — the rum, the whisky, the alex mane chicken",
  "the night the karaiders raided camp and slashed half the krew",
  "the moment the krewship hull cracked and the wreck went under",
  "thinking you were going to die when lightning hit the mast",
  "filip's mac mini is running on fumes and the bytes are almost gone",
  "merrill is 30 v 1 against the karaiders and refuses to sleep",
  "tweaksner is punching the waves again",
  "chase hit the piece so hard his vo2 max doubled",
  "pearson keeps losing weight and jacob is crying about it",
  "james e is hyped because the water washed the oil off the chicken",
  "the vote — no one is coming, so we throw the last rave instead",
  "building the stage from the bones of the krewship",
  "the karaiders have gone quiet and it's somehow worse than the attacks",
  "morale is doing something weird, the readout glitches every time we check",
  "hearing your faint signal come through after days of silence",
  "you have to find us before may second or it's over",
  "what the borg tastes like on day five of the wreck"
];

const TOPICS_BY_TRANSMISSION = {
  t1: [
    "the food is soaked, but at least the ocean washed the oil off the alex mane chicken",
    "finding some water inland after waking up on KA Island",
    "taking apart pieces of the split krewship for shelter",
    "believing you are the first settlers on KA Island",
    "trying to figure out if anyone can hear the SOS",
    "salvaging supplies while they bob around in the water"
  ]
};

function getTopicsForTransmission(tid) {
  const key = String(tid || "").toLowerCase();
  return TOPICS_BY_TRANSMISSION[key] || DEFAULT_TOPICS;
}

module.exports = DEFAULT_TOPICS;
module.exports.getTopicsForTransmission = getTopicsForTransmission;
