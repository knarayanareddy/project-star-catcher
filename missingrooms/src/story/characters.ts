export interface Dossier {
  id: string;
  /** key into CAST (figure styling) */
  cast: string;
  name: string;
  aka?: string;
  age: number;
  role: string;
  group: "principal" | "occupant";
  room?: string;
  /** one-line hook */
  hook: string;
  /** height in metres, for the lineup */
  metres: number;
  appearance: string[];
  signature: string[];
  sound: string;
  want?: string;
  wound?: string;
  belief?: string;
  need?: string;
  history: string;
  tells: string[];
  relationships: { who: string; text: string }[];
  arc: { ep: string; text: string }[];
  rules: string[];
  animation: string[];
}

export const PRINCIPALS: Dossier[] = [
  {
    id: "orrin",
    cast: "orrin",
    name: "Orrin Voss",
    aka: "The District Surveyor · the only voice",
    age: 52,
    role: "Certified Surveyor, Grade 4 — Housing Department. Narrator of the report.",
    group: "principal",
    hook: "A man who replaces every human noun with a technical one, then makes a joke about the technical noun.",
    metres: 1.84,
    appearance: [
      "Narrow-shouldered, 1.84 m, with the faint stoop of twenty-seven years of reading plans at low desks. Walks with his weight a little behind his feet, as though checking the floor is where the drawing says it is.",
      "Round steel glasses he pushes up with a knuckle, never a fingertip. Brown hair gone grey in streaks, cut by the same barber for twenty years; he has never asked for anything different.",
      "Department cream jacket, one size too generous (issued, not tailored), over a white shirt and a rust-coloured tie he re-knots when he is lying. Charcoal trousers, resoled shoes.",
    ],
    signature: [
      "Lanyard: ID card (VOSS, O. — Grade 4) and a brass survey key with three notches. The key inspects; it cannot authorize.",
      "Survey Recorder 07 in the breast pocket — a handheld dictaphone with a red REC lamp. The Department distrusts handwritten corrections, so every report is spoken. The narration IS the recording.",
      "Steel survey tape on his belt (yellow case, rigid blade). A chewed pen cap. A clipboard with a chipped corner, squared against any surface he stands near.",
      "In the inside pocket, never admitted to: Lenna’s cloth tape, frayed at the first inch and repaired with yellow thread.",
    ],
    sound:
      "One mature masculine voice: precise, conversational, dryly funny — never a permanent horror whisper. The humour is a defence and gets less confident as danger becomes personal. Footsteps are even and unhurried until Episode 1’s last beat, when he kneels. Breath is audible only when he lifts something heavy.",
    want: "Close the discrepancy without reopening his approved plans.",
    wound:
      "Eleven years ago he co-signed the loan for their mother’s care home. When a certification audit came, he let his younger sister take the whole debt into her own name so his record stayed clean. He calls this ‘compliance’. She paid for nine years, mostly with thread. He visits on birthdays and mentions the sewing machine he once carried up two flights.",
    belief: "If the number is correct, responsibility belongs to whoever interprets it.",
    need: "Make his own signed contribution visible, and accept that knowing obliges an action.",
    history:
      "Orrin joined the Department the year folding was invented, as an emergency inspector. He believed in it — truly believed fire, flood and crumbling blocks could be solved without demolishing them. He rose by being the surveyor who never raised the question. Fourteen months ago he approved Overlay Rev E, covering three emergency-receiver bays with a marketing rectangle, because a developer’s letter said it was temporary. He did not read the third page.",
    tells: [
      "Replaces a human noun with a technical one (‘occupancy’, ‘capacity adjustment’, ‘the room’) and then riffs on the technical noun.",
      "Checks his watch when moved. Squares the clipboard edge. Says ‘That is the correct figure’ when he means ‘I am frightened’.",
      "Says ‘close enough’ to Lenna — a reflex that survives the whole night (Episode 6).",
    ],
    relationships: [
      { who: "Lenna", text: "Sister. Owes her more than he can itemize; has only ever offered solvable faults, never apologies." },
      { who: "Mrs. Rill", text: "She spent six months asking him to look at the old plans. He advised a clearer copy." },
      { who: "The Attendant", text: "Mirror. Another careful person who has learned to stand exactly inside a procedure." },
    ],
    arc: [
      { ep: "Ep 1", text: "Polished report voice. Amused at the system, then recognises a person behind a number. He kneels for the first time and says her name into the recorder." },
      { ep: "Ep 2", text: "Irritated correction. A private rescue becomes nine people. Finds his own signature under the showroom, and breaks a numbered seal on camera." },
      { ep: "Ep 3–4", text: "Personal admission; he must be helped by people who owe him nothing. Refuses the one-room exception." },
      { ep: "Ep 5–6", text: "Spoken work log under pressure, then a plain witness account with no comforting conclusion. His credential is suspended; he holds a curtain rail straight." },
    ],
    rules: [
      "Only voice in the series. He never quotes anyone.",
      "He may interpret a face; he never knows another person’s unspoken thoughts.",
      "He is never the hero of the building — the residents’ work is always shown doing the lifting.",
    ],
    animation: [
      "Profile-led staging, three-quarter at most. Hands do the acting: the knuckle on the glasses, the squaring clipboard.",
      "He changes posture across the season: Ep 1 stands to measure; Ep 1 final beat he kneels; Ep 6 sits without inspecting the chair.",
    ],
  },
  {
    id: "lenna",
    cast: "lenna",
    name: "Lenna Voss",
    aka: "The Seamstress · the sender of three tugs",
    age: 47,
    role: "Seamstress; Orrin’s sister. Folded into Room 2-07.",
    group: "principal",
    room: "F-3 · Room 2-07",
    hook: "She uses space socially — chairs drawn together, curtains mended, hems let out for neighbours — and she explains hard things without making you feel small.",
    metres: 1.65,
    appearance: [
      "1.65 m, strong-forearmed, quick on her feet. Dark hair with early silver, twisted up and pinned with a tailor’s pencil and two pins; the pencil is always behind where she’d look for it.",
      "Deep indigo smock with deep patch pockets (hand-stitched in yellow thread), sleeves pushed above the elbow. Mismatched buttons — she replaced them with whatever was in the tin.",
      "A tomato-red pincushion at her wrist, a brass thimble on the right middle finger, spectacles pushed up into her hair. A loop of yellow thread tied round the left wrist as a habit, not a charm.",
    ],
    signature: [
      "The cloth tape. She made it for Orrin because his steel tape ‘couldn’t measure a body comfortably’. She repaired the frayed first inch with yellow thread and told him to remember it was missing.",
      "Yellow thread: pocket stitching, wrist loop, the colour of every small act of care in the series.",
      "The sewing machine Orrin carried up two flights, which she has never once let him forget.",
    ],
    sound:
      "Nonverbal only. Scissors closing. The long dry rasp of cloth being drawn taut — the three-tug service signal. Controlled, even breath. When she is working she sometimes hums three notes under her breath; never a tune, never words. No spoken line, no whispered explanation, no tapped-out sentence — the signal is only ‘I am here’.",
    want: "Keep the nine people alive — and keep them calm enough to cooperate.",
    wound:
      "She paid the debt Orrin walked away from, quietly, and never invoiced him. She decided long ago that she preferred being relied upon to being thanked.",
    belief: "Most problems are shortages of space, patience or thread. Apologies are free; repairs aren’t.",
    need: "To be asked, rather than assumed on. (She does not forgive Orrin automatically — she hands him a curtain rail and a chair.)",
    history:
      "Lenna ran a corner altering shop until the debt took it. Now she works from the second-floor sewing room, 2-07, altering clothes for the building. She taught the neighbours’ children to sew buttons. Orrin once taught her the three-tug signal as a game at the kitchen table, the year he qualified; she remembered; he didn’t.",
    tells: [
      "Measures people with her eyes when she is moved: shoulder to shoulder, hem to floor.",
      "Straightens the object nearest to someone who is upset. Never looks at the person doing it.",
      "Points to a chair instead of making a speech.",
    ],
    relationships: [
      { who: "Orrin", text: "Brother. She knows he prefers a solvable fault to an apology and has been giving him faults for eleven years." },
      { who: "Josie & Anselm", text: "In her sewing room for a hem fitting when the fold engaged. She is their anchor." },
      { who: "The other residents", text: "She organises the internal clear latches by touch through the maintenance seam." },
    ],
    arc: [
      { ep: "Ep 1", text: "Never seen — only a living, trained sender taking the other end of a tape, three tugs." },
      { ep: "Ep 2", text: "Still unseen. Counted as the ninth movement, underlined in yellow thread." },
      { ep: "Ep 3–5", text: "Seen through a narrow inspection view; knots the tape to a latch; passes a signal room to room; moves a fallen table before she lets anyone take her place." },
      { ep: "Ep 6", text: "Corrects the spelling of her own name in the register. Holds a curtain rail straight with her brother and does not narrate what she has learned." },
    ],
    rules: [
      "No intelligible speech. Her agency is physical.",
      "Her tape locates the seam. It never carries a person and never becomes rescue equipment.",
      "She never explains the plot through a ‘convenient code’.",
    ],
    animation: [
      "Always working a small task with her hands, even in danger. Her stillness is the signal that something is wrong.",
      "She is the warmest colour on screen — the only yellow thread.",
    ],
  },
  {
    id: "rill",
    cast: "rill",
    name: "Margit Rill",
    aka: "Mrs. Rill · Chair of the Tenants’ Association",
    age: 71,
    role: "Retired plans-registry draftswoman. Tenants’ representative; keeper of the old floor plans.",
    group: "principal",
    hook: "She distrusts Orrin before he earns a reason to trust him, and helps anyway — without absolving his signature.",
    metres: 1.52,
    appearance: [
      "1.52 m, quick and unsentimental, with a slight forward lean as though walking into wind. White hair in a low, tight braid wound around the back of her head.",
      "Rust-wool shawl over a charcoal dress; half-moon glasses on a chain; a canvas tool-roll under the left arm and a cardboard plan tube under the right — one for what is wrong, one for how it was meant to be.",
      "Sensible shoes that make no sound on carpet. Mouth set. She has not smiled in this building since the fold notices.",
    ],
    signature: [
      "The plan tube: thirty-one years of registry drawings, including the original Calder Court sheets.",
      "A socket wrench in the tool roll (she will hand it over without a word in Episode 3).",
      "A tally pencil behind her ear, used to mark the ninth resident only when Lenna is fully clear.",
    ],
    sound: "Nonverbal. A short exhale through the nose that means ‘no’. Tool-roll canvas, tube end scuffing the wall, a dry tap on the paper where Orrin should look.",
    want: "Get the old plans seen by someone with a signature.",
    wound: "Six months of polite requests, each answered with: ‘please submit a clearer copy.’",
    belief: "A drawing is a promise someone has to keep.",
    need: "To be believed without proving it twice.",
    history:
      "Mrs. Rill drew the original emergency-receiver detail for Calder Court as a junior draftswoman. When the building was ‘repositioned’, she noticed the new brochure’s floor plan had no receiving bays. She wrote to the Department four times.",
    tells: [
      "Taps the exact spot on a plan, not near it.",
      "Never accepts an offered hand; points to the bolt instead.",
      "Counts under her breath — people, bolts, floors — with her lips only.",
    ],
    relationships: [
      { who: "Orrin", text: "The man who read her four letters and never opened the plan tube. She helps him anyway; she does not absolve him." },
      { who: "The residents", text: "She is their memory. After the night she carries the timestamped report to other buildings." },
    ],
    arc: [
      { ep: "Ep 1", text: "A cameo: passes Orrin in the corridor, plan tube under her arm, reads his badge, looks away." },
      { ep: "Ep 2", text: "Not present — the plans she kept are the plans under the showroom overlay." },
      { ep: "Ep 3–5", text: "Arrives with the old plan and a socket wrench; refuses his hand; makes him point to where the line ends, not where the drawing says it should." },
      { ep: "Ep 6", text: "Holds the timestamped report in front of the success banner. Distributes copies without him at the centre." },
    ],
    rules: ["No dialogue. She communicates with paper, tools and her pencil.", "She is not Orrin’s redeemer. She is a neighbour."],
    animation: ["Short stride, quick turns. Always carrying paper. Reads with her whole upper body forward."],
  },
  {
    id: "attendant",
    cast: "attendant",
    name: "C. Hollis",
    aka: "The Compliance Attendant · Unit 4417",
    age: 38,
    role: "Compliance Attendant, Housing Department. Silent institutional antagonist.",
    group: "principal",
    hook: "A human being in a spotless coat who stands exactly inside the procedure. Not supernatural, not omniscient, not about to become the hero.",
    metres: 1.78,
    appearance: [
      "1.78 m, slim, with an unhurried, even pace. Close-cropped hair under a paper-white cap. A face that has practised pleasantly neutral.",
      "Spotless knee-length white coat, pale trousers, white soft-soled shoes that make no sound; white gloves they never remove in front of anyone.",
      "A tablet in a hip cradle, a small badge with a green dot, and — taped inside the cradle where only they can see it — a child’s school photo.",
    ],
    signature: [
      "The tablet: green occupancy totals, penalty screens, review slots, fault codes. Every refusal is a screen.",
      "Numbered tamper seals (this one: No. 0047-1193). A clean white cloth for things that are not clean.",
      "The tablet’s pleasant chimes: major, indifferent, always correct.",
    ],
    sound: "Nonverbal. No footsteps. Glove-on-glass taps at precise intervals. A single exhale when a procedure completes. Never raises a voice because there is no voice.",
    want: "Get through the shift without an exception, because exceptions are a performance review.",
    wound: "Two probation reviews ago they approved an exception. They do not talk about what it cost.",
    belief: "If the form is complete, the outcome is not theirs.",
    need: "To refuse to help hide what happened — which they eventually do, at their own risk, without ever becoming a hero.",
    history:
      "Hollis has worked Calder Court’s folding rota for fourteen months. They keep the purge schedule, lock authorised controls, and request reset when a bypass is disconnected. They are procedural, not armed. They cannot physically stop anyone; they can only record and ask.",
    tells: [
      "Removes objects with two fingers, like dirt, then sets them on a clean cloth.",
      "Stands exactly square to a surface. Thumb rubs the seam of the glove when uncertain.",
      "Checks the time at perfectly regular intervals — which makes the one time they don’t something to notice.",
    ],
    relationships: [
      { who: "Orrin", text: "A mirror. They wait for him to become reasonable and are not sure what they’re hoping for." },
      { who: "The tablet photo", text: "Never explained. Shown once, in Episode 5, when the seal is photographed." },
    ],
    arc: [
      { ep: "Ep 1", text: "Not seen. Mentioned only as a form in the building’s hallways: green number, purge time." },
      { ep: "Ep 2", text: "Offers a green total, a penalty, a review two hours too late, and an ‘equipment fault’ code. Locks the transfer panel, seals it, and waits." },
      { ep: "Ep 3–5", text: "Points to the schedule. Offers the one-room exception. Photographs the broken seal — and does not reconnect the bypass." },
      { ep: "Ep 6", text: "Refuses to join Orrin in hiding what happened. Does not become the hero." },
    ],
    rules: ["No private force: locks, logs, resets.", "Not omniscient. Their authority is infrastructural and procedural.", "Never given a redeeming speech."],
    animation: ["Blocking tells everything: they never cross the line between inside and outside the procedure until the last beat of Episode 5.", "Whites and creams: the cleanest thing in every frame."],
  },
];

const occ = (o: Partial<Dossier> & Pick<Dossier, "id" | "cast" | "name" | "age" | "role" | "room" | "hook" | "metres" | "appearance" | "signature" | "history" | "tells" | "arc">): Dossier => ({
  group: "occupant",
  sound: "Nonverbal only — breath, fabric, objects.",
  relationships: [],
  rules: ["No intelligible speech. Visible as a body and an activity through a compressed seam."],
  animation: [],
  ...o,
});

export const OCCUPANTS: Dossier[] = [
  occ({
    id: "tobias",
    cast: "tobias",
    name: "Tobias Kessing",
    age: 61,
    role: "Night porter, Calder Court (22 years).",
    room: "F-1 · linen annex & night lodge",
    hook: "Winds a pocket watch at the top of every hour and keeps a ledger of nights.",
    metres: 1.86,
    appearance: ["Tall, wide, with a grey moustache and a flat cap he has not taken off since the fold.", "Long dark greatcoat with brass buttons — hung on a hook, one of the nine objects Orrin sees: ‘a coat’."],
    signature: ["Pocket watch on a chain.", "A cloth-bound ledger. The last entry reads 22:10."],
    history: "He knows every key in the building. He noticed the fold at 14:30 Thursday and logged it before he realised he was inside it.",
    tells: ["Winds the watch when counting.", "Sits very straight."],
    arc: [
      { ep: "Ep 2", text: "Seen in compressed perspective: shifts at 17.2s — the first tally." },
      { ep: "Ep 3–5", text: "Keeps the A-room latch clear. First out of the first room." },
    ],
  }),
  occ({
    id: "ruta",
    cast: "ruta",
    name: "Ruta Vaitkus",
    age: 39,
    role: "Laundry worker (night shift).",
    room: "F-1 · linen annex",
    hook: "Counts folds with her finger. Cannot stop counting.",
    metres: 1.64,
    appearance: ["Rust-red headscarf; pale-teal work smock; strong hands.", "Her red lunch tin is the second of the three objects Orrin names."],
    signature: ["Red lunch tin with a cream stripe.", "A folded sheet she keeps folding."],
    history: "Moved to the city nine years ago to fold other people’s sheets. She taught the newest hire, Dev, to fold a fitted sheet.",
    tells: ["Counts folds on her finger.", "Hands Dev the other end of every sheet."],
    arc: [
      { ep: "Ep 2", text: "Seen through the F-1 slab: a red tin on a table, the second tally." },
      { ep: "Ep 3–5", text: "Clears the internal latch; carries the tin out with her." },
    ],
  }),
  occ({
    id: "dev",
    cast: "dev",
    name: "Dev Malhotra",
    age: 26,
    role: "Laundry worker, newest hire (nine weeks).",
    room: "F-1 · linen annex",
    hook: "Headphones round his neck, no sound coming out of them. He took them off in the first minute.",
    metres: 1.76,
    appearance: ["Tall, thin, curly dark hair; grey apron over a T-shirt; white sneakers.", "Headphones hung on the cart handle."],
    signature: ["Headphones, cable wound twice round his wrist.", "A bouncing knee."],
    history: "He took the job because it let him study at night. He was folding a sheet with Ruta when the room thinned.",
    tells: ["Bounces a knee when afraid.", "Stands behind Ruta."],
    arc: [{ ep: "Ep 2", text: "Third of the three in F-1; third tally." }, { ep: "Ep 3–5", text: "Holds Ruta’s end of the sheet while she clears the latch." }],
  }),
  occ({
    id: "samir",
    cast: "samir",
    name: "Samir Haddad",
    age: 38,
    role: "Tram mechanic.",
    room: "F-2 · Flat 4C",
    hook: "Tests every latch twice. In the folded room he has tested every latch eleven times.",
    metres: 1.74,
    appearance: ["Broad, short black hair, oil-dark knuckles; navy overalls with the sleeves rolled."],
    signature: ["Blue work cap on a hook.", "A small torch he keeps switching on and off."],
    history: "He had come home early to fix a dripping tap. The fold engaged while he held the washer.",
    tells: ["Tests a latch twice.", "Stands between his daughter and the door."],
    arc: [{ ep: "Ep 2", text: "First of the F-2 family to move; fourth tally." }, { ep: "Ep 3–5", text: "Checks the load indicator with Orrin; second transfer." }],
  }),
  occ({
    id: "noor",
    cast: "noor",
    name: "Noor Haddad",
    age: 35,
    role: "Transit dispatcher.",
    room: "F-2 · Flat 4C",
    hook: "Dispatches buses for a living; has been dispatching air, water and sleep for ten hours.",
    metres: 1.62,
    appearance: ["Dark bun, plum blouse, headset round her neck (the headset is one of the nine objects)."],
    signature: ["Headset.", "A notepad where she has written the time every thirty minutes."],
    history: "She has written ‘22:10 — still here’ four times, with the time changed.",
    tells: ["Counts her daughter’s breaths.", "Writes the time, not the date."],
    arc: [{ ep: "Ep 2", text: "Fifth tally." }, { ep: "Ep 3–5", text: "Keeps the family calm and in order for the second transfer." }],
  }),
  occ({
    id: "yusra",
    cast: "yusra",
    name: "Yusra Haddad",
    age: 7,
    role: "Second-grader.",
    room: "F-2 · Flat 4C",
    hook: "Her one red shoe is the third object Orrin names — and, in Episode 4, the thing that nearly undoes him.",
    metres: 1.22,
    appearance: ["Small, long dark braid, yellow jumper, blue jeans, one red shoe — the other is the one in the folded room."],
    signature: ["The red shoe.", "A pen she uses to draw on her palm."],
    history: "She took one shoe off at the door when the fold began. She hasn’t put it back on.",
    tells: ["Draws on her palm.", "Hides behind her father’s knee, then looks out."],
    arc: [{ ep: "Ep 2", text: "Sixth tally — the smallest silhouette." }, { ep: "Ep 4", text: "Carries the shoe across the receiver line." }],
  }),
  occ({
    id: "josie",
    cast: "josie",
    name: "Josephine ‘Josie’ Adeyemi",
    age: 44,
    role: "Home-care aide.",
    room: "F-3 · Room 2-07",
    hook: "Carries an entire pharmacy in a bag and has not put it down since Thursday afternoon.",
    metres: 1.7,
    appearance: ["Dark curls pinned back; teal scrubs; white trainers; a large canvas medical bag with a worn brass clasp (the caregiver’s bag Orrin and Lenna carry in Episode 5)."],
    signature: ["The canvas medical bag.", "A wristwatch worn on the inside of the wrist."],
    history: "She was at Mr. Park’s hem fitting when the fold engaged. She checks his pulse at the wrist every twenty minutes.",
    tells: ["Checks a pulse that isn’t there when she’s anxious.", "Keeps the bag between her feet."],
    arc: [{ ep: "Ep 2", text: "Seventh tally." }, { ep: "Ep 5", text: "Hands the bag — and the tape — to Lenna in the third transfer." }],
  }),
  occ({
    id: "anselm",
    cast: "anselm",
    name: "Anselm Park",
    age: 83,
    role: "Retired piano tuner.",
    room: "F-3 · Room 2-07",
    hook: "Hears the air pumps and taps his fingers along with their 1.2-second cycle. He tuned pianos for sixty years.",
    metres: 1.66,
    appearance: ["Thin, white hair, round glasses; half-fitted grey suit jacket held with Lenna’s pins; walking cane (one of the nine objects)."],
    signature: ["The cane.", "A tuning fork in his breast pocket."],
    history: "He was being fitted for his granddaughter’s wedding. The pins are still in the jacket.",
    tells: ["Taps along with the pump.", "Holds the fork to his ear when he is afraid."],
    arc: [{ ep: "Ep 2", text: "Eighth tally." }, { ep: "Ep 5", text: "Third out, helped by Josie." }],
  }),
];

export interface ObjectEntry {
  name: string;
  what: string;
  rules: string;
}

export const OBJECTS: ObjectEntry[] = [
  {
    name: "Lenna’s cloth tape",
    what: "Cream cloth, black numerals, first inch frayed and repaired with yellow thread. A tiny stitched word, ‘room’, sits near the six-inch mark.",
    rules: "Short by exactly one inch. Orrin compensates; it locates the seam and never carries load, stops a motor or holds a person.",
  },
  {
    name: "Survey Recorder 07",
    what: "A handheld recorder with a red REC lamp. The narration is its transcript; its lamp is a continuous on-screen clock for the report.",
    rules: "Stops once, in Episode 1, when he realises the file’s subject is a person; restarts with her name.",
  },
  {
    name: "Orrin’s survey key",
    what: "Brass, three notches. Opens inspection hatches. Cannot authorize a transfer.",
    rules: "Its limit is shown, not explained: it fits one keyway and visibly fails the other.",
  },
  {
    name: "The Display Family",
    what: "The poster family on LIVE LARGER, and the six staging chairs in the showroom. Smooth, delighted, hollow — not characters; set dressing with an argument.",
    rules: "Never animated. Their hollow pears are plaster (the tock), their books are painted blocks.",
  },
  {
    name: "Seal No. 0047-1193",
    what: "Numbered adhesive tamper strip on the transfer panel. VOID chevrons appear when torn.",
    rules: "Broken in view of the Recorder; photographed twice. Breaking it records his responsibility.",
  },
];
