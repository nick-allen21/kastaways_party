// Story-topic pool. The serverless function picks one at random and uses it as
// fallback color only when the receiver's message is too empty/vague to drive a
// direct reply. Keep day-scoped pools spoiler-safe: T1 should not accidentally
// volunteer Karaiders, "no one is coming", or later bytes/Mac Mini lore.
const DEFAULT_TOPICS = [
  "trying to figure out if anyone can hear the SOS",
  "the krewship split in two on the beach",
  "salvaging supplies from the water after the wreck",
  "finding water inland and using krewship pieces for shelter",
  "the KrAiders knowing the beach better than the krew",
  "not knowing where the KrAiders came from or where they disappeared to",
  "food and water running out faster after the raid",
  "hearing the KrAiders in the trees",
  "holding the line and not turning on each other",
  "deciding it is too late to be saved but not too late to join",
  "taking the rum, whisky, and alex mane chicken for the Blowout Bash",
  "building a mighty stage from the bones of the Krewship",
  "singing sea shanties and playing music at the Final Bash",
  "begging the receiver to come join the last party"
];

const TOPICS_BY_TRANSMISSION = {
  t1: [
    "the food is soaked, but at least the ocean washed the oil off the alex mane chicken",
    "finding some water inland after waking up on KA Island",
    "taking apart pieces of the split krewship for shelter",
    "believing you are the first settlers on KA Island",
    "trying to figure out if anyone can hear the SOS",
    "salvaging supplies while they bob around in the water"
  ],
  t2: [
    "realizing you were sorely mistaken about being the first settlers",
    "the KrAiders coming out of the dark on the first night",
    "the KrAiders knowing the beach better than the krew",
    "not knowing where the KrAiders came from or where they disappeared to",
    "food and water running out faster after the raid",
    "merrill trying to fight too many KrAiders at once, as a coping joke",
    "filip being captured, only if it fits the receiver's message"
  ],
  t3: [
    "watching the tree line after the KrAider raid",
    "hearing the KrAiders in the trees",
    "food being scarce and water being worse",
    "everything salvaged disappearing faster than expected",
    "unspeakable thoughts emerging from hunger",
    "not turning on each other yet",
    "holding the line"
  ],
  t4: [
    "taking a vote and deciding survival is over",
    "you can't save us, not in time",
    "not waiting for the KrAiders or starvation to finish the krew",
    "taking everything left for one last Blowout Bash",
    "the rum, the whisky, and the alex mane chicken",
    "it is too late to save us but not too late to come join us",
    "the last party of our lives on KA Island"
  ],
  t5: [
    "the Final Bash is tomorrow",
    "the mighty stage built from the bones of the Krewship",
    "the whole beach shaking",
    "rum galore and whisky too",
    "singing sea shanties all day",
    "playing music until the island can hear you die",
    "wanting the receiver to come tomorrow and join the Final Bash",
    "how badly the krew wants the receiver there for the last party"
  ],
  t6: [
    "the Final Bash has begun",
    "rum already flowing and music already playing",
    "dancing on the remnants of the Krewship",
    "the stage shaking and the whole beach shaking",
    "not wanting to be saved anymore",
    "this no longer being an SOS, but an invitation",
    "asking the receiver to come join the Order on your last day",
    "the last bash KA Island will ever see",
    "the party of a lifetime"
  ]
};

function getTopicsForTransmission(tid) {
  const key = String(tid || "").toLowerCase();
  return TOPICS_BY_TRANSMISSION[key] || DEFAULT_TOPICS;
}

module.exports = DEFAULT_TOPICS;
module.exports.getTopicsForTransmission = getTopicsForTransmission;
