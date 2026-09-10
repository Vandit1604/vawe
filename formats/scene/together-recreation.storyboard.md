---
message: "A recreation of the together.ai launch film, rebuilt from its own measured study to test whether this engine can reproduce a continuous motion-graphics piece."
audience: "Us. This is a benchmark, not a film for anyone else."
arc: "type → product → claim → models → prompt → close"
framework: "Recreation. The structure is not chosen, it is measured off refs/together-chat.mp4."
reference: "together-chat"
threads: "one continuous action and a carried object: the input bar appears small, returns, and the film pushes into it until its send button fills the frame"
object: "the together.ai product surface, from a tilted plane to an input bar to its own send button"
object_t0: "nothing on screen but a word being typed"
object_states: "b2 a tilted plane arriving · b3 an input bar, small · b5 the model list · b6 the same input bar, filling the frame, being typed into · b7 the mark in a halo"
object_last: "the closing line under the halo"
format: 1920x1080
theme: "themes/together-chat.json"
duration: 19.8s
pace: "showreel, 1.98s per idea, measured: the study reports a 1.98s median shot and 30.3 shots per minute"
spectacle: "beat 5 · the input layer · the film pushes into the send button until it fills the frame · it is the reference's own loudest moment and its only extreme scale change"
not: "no hard cuts anywhere (the study measured peak scene score 0.113) · no third-party logos reproduced · no invented copy: every line is the reference's own"
---

### Reference devices

| id | the device | this film |
|---|---|---|
| D1 | typewriter with a cursor bar | **beat 1**, `Introducing` types, then the wordmark |
| D2 | wordmark with a pill chip | **beat 1**, `together.ai [CHAT]`, the pill pops after the word lands |
| D3 | tilted plane running off the frame | **beat 2**, the app surface |
| D4 | two planes at different depths | **beat 2**, the plane travels while the input dissolves up through it |
| D5 | a word arrives large and accent, then settles in ink | **beat 3**, `Private, secure access`, keyed per word |
| D6 | list card, bold over grey, a check | **beat 4**, the model list |
| D7 | extreme scale push into ONE element | **beat 5**, the input bar at 0.5x, 1.0x, 1.9x, 3.4x |
| D8 | typing into a field | **beat 5**, the question types itself |
| D9 | attach and round send button filling the frame | **beat 5**, the end of the push. Kept here: in THIS film it is the right object |
| D10 | icon in a pale halo with a badge | **beat 6** |
| D11 | closing sentence word by word, last phrase accent | **beat 6**, `the U.S. & Canada` |
| D12 | ends on black | the film's own outro |

## Beat 1: Type (0s-2.75s)
- type: hook
- archetype: centred
- weight: quiet
- shot: medium (one word, centred, nothing else in frame)
- camera: hold
- picture: a word typing under a cursor bar, then the wordmark with its pill
- onscreen: "Introducing" / "together.ai"
- motion: .ty-in@fade:energy
- mechanism: the word types itself · the pill pops after it lands
- becomes: an empty ground becomes a word, and the word becomes a brand
- trigger: nothing yet. This beat opens the film.
- layout: centred, about 30% of frame width, everything else deliberately empty
- style: near-white ground, one face, nothing but type
- rest: none, the typing fills it
- why: the reference withholds the brand for two seconds and that withholding is the hook
- duration: 2.75s
- transition_in: cut

## Beat 2: Product (2.55s-6.5s)
- type: product_intro
- archetype: split
- weight: strong
- shot: wide (a tilted plane crossing the frame, and the one control inside it)
- camera: hold
- picture: the app surface on a tilted plane arriving from the upper right and travelling down-left as it grows, then the input bar dissolving up through it while the plane keeps moving
- onscreen: "together.ai" / "What's on your mind?"
- motion: .ap-row@fadeUp:professional
- mechanism: a plane travelling and growing on one keyed track, with a second surface crossfading up through it, both moving at once
- becomes: a wordmark becomes the product it names, and the product becomes the one control the film cares about
- trigger: the wordmark lands, so the thing it names can arrive
- layout: the plane fills the left two thirds and runs off two edges; the bar sits centred at about 40% of frame width
- style: white cards on near-white, separated by depth alone
- rest: neither surface ever stops travelling
- why: show the product, then pick out of it the object the film will later push into
- duration: 3.95s
- transition_in: fade

## Beat 3: Claim (6.5s-8.9s)
- type: benefit_highlight
- archetype: centred
- weight: strong
- shot: medium (one sentence, centred)
- camera: hold
- picture: three words arriving one at a time, each large and in the accent before settling into the line in ink
- onscreen: "Private, secure access"
- motion: .w@growUp:energy
- mechanism: per-word arrival, keyed as size and colour together
- becomes: a product becomes a promise about that product
- trigger: the viewer has seen the surface and will now be told what it guarantees
- layout: centred, about 45% of frame width
- style: type only, the accent used once per word and then given up
- rest: none
- why: this is the reference's signature type move and the film is a test of whether we can do it
- duration: 2.4s
- transition_in: fade

## Beat 4: Models (8.9s-12.1s)
- type: feature_showcase
- archetype: asymmetric-baseline
- weight: strong
- shot: medium (a list card right, a line left)
- camera: hold
- picture: the model list arriving tilted and oversized, settling upright and smaller while the line builds beside it
- onscreen: "to top open-source models"
- motion: .md-row@fadeUp:professional
- mechanism: a card settling from 1.5x on a keyed track while a sentence builds word by word
- becomes: a promise becomes the specific things it is a promise about
- trigger: a claim about access demands the list of what is accessible
- layout: the line on the left third, the card on the right half
- style: one card, rows of bold over grey, a check on the selected row
- rest: the card keeps settling through the whole beat
- why: the proof behind the claim, named
- duration: 3.2s
- transition_in: fade

## Beat 5: Ask (12.1s-16.2s)
- type: feature_showcase
- archetype: hero-object
- weight: peak
- shot: close (the input bar, then only its send button)
- camera: hold
- picture: the input bar returning small, growing to full width, being typed into, then the frame pushing into its send button until the button is the whole picture
- onscreen: "Explaine quantum physics like I'm 10 years old"
- motion: .in-typed@fade:energy
- mechanism: one object at four scales on a single keyed track, with the question typing itself through the middle of it
- becomes: a field becomes a question, and a question becomes the button that sends it
- trigger: the viewer knows what the models are, so the film shows them being used
- layout: the bar spans about 78% of frame width, then leaves the frame entirely
- style: the loudest moment in the film, and its only extreme scale change
- rest: none, the push carries it
- why: the whole film exists to end on the act of asking
- duration: 4.1s
- transition_in: fade

## Beat 6: Close (16.2s-19.8s)
- type: cta
- archetype: lockup
- weight: quiet
- shot: medium (the mark in a halo, centred)
- camera: hold
- picture: the icon scaling up inside a pale accent halo, then the closing line building word by word under it
- onscreen: "Models served from data centers hosted in the U.S. & Canada"
- motion: .w@fadeUp:gravity
- mechanism: a halo scaling on a keyed track, then a sentence building
- becomes: the act of asking becomes the place the answer comes from
- trigger: the question has been sent, so the film can say where it goes
- layout: centred, the halo about 27% of frame width, the line under it
- style: the quietest frame, one soft edge in a film with no others
- rest: none
- why: the reference closes on where the compute lives, and that is its actual differentiator
- duration: 3.6s
- transition_in: fade
