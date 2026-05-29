# Onitama Mate Pattern Report

## Scope

The checked-in search data currently contains two completed non-mates and a resume state, not a saved mate-found dataset. To analyze actual mates, I reused the solver embedded in `matesearch.html` and generated three focused samples of found mate-in-5 positions:

- first 20 Tiger-branch mates with Blue to move from neutral Monkey,
- first 20 Kirin-branch mates with Blue to move from neutral Monkey,
- first 20 Tiger-branch mates with Red to move from neutral Dragon.

All sampled found mates were mate in 5 plies: attacker move, defender move, attacker move, defender move, attacker terminal move. The patterns below should be read as directional/card-role concepts, not as a complete proof over all 706,440 searched configurations.

## Main Pattern

The dominant pattern is a three-move attacking relay:

1. Use a fast forward opener to put a master or advanced pawn into the middle of the board.
2. Use the post-trade neutral/second card as a bridge to reach or capture onto a penultimate square near the enemy temple.
3. Win with a card borrowed from the defender after card rotation.

The exact card names vary, but the roles are consistent. The card cycle matters as much as the board geometry: the attacker's first card becomes available to the defender, the defender's response card becomes available to the attacker, and the attacker's final move is often made with a card the defender just supplied.

## Required Direction Families

### 1. Opener: reach the middle fast

The opener must move an attacking piece two ranks forward or one rank forward with a large side shift from the starting line.

Useful opener directions:

- `ff`: Tiger.
- `ffl` or `ffr`: Kirin.
- `fll` or `frr`: Dragon, Giraffe, Iguana/Tanuki on one side.

Observed examples:

- Tiger master jump: center master `ff` into the center file.
- Kirin master jump: center master `ffl`/`ffr` into a side-center lane.
- Dragon-style opener: center master `fll`/`frr` into a wide lane.

The opener does not have to be the master in every line, but the same concept applies: a fast piece must become a direct temple/capture threat quickly enough that the defender's two replies cannot reset the race.

### 2. Bridge: move from center to a penultimate square

The bridge move usually moves the attacker from a middle square to the fourth rank from its home side, often while capturing a defender that stepped into the lane.

Useful bridge directions:

- Single forward: `f`.
- Forward diagonals: `fl`, `fr`.
- Wide forward diagonals: `fll`, `frr`.

Cards that satisfy these bridge directions:

- `f`: Crab, Crane, Boar, Horse, Ox, Panda, Bear, Sea Snake, Viper, Mouse, Rat, Tanuki, Iguana.
- `fl`: Monkey, Elephant, Mantis, Eel, Goose, Frog, Dog, Bear, Phoenix, Otter.
- `fr`: Monkey, Elephant, Mantis, Cobra, Rooster, Rabbit, Fox, Panda, Phoenix, Sable.
- `fll`: Dragon, Giraffe, Iguana.
- `frr`: Dragon, Giraffe, Tanuki.

Monkey shows up heavily because it has both forward diagonals and backward diagonals, so it can act as a capture/bridge card from many middle-board squares. Dragon also shows up as a strong bridge in Kirin lines because it can pull a Kirin-advanced master back onto the near-temple lane with a wide forward diagonal.

### 3. Finisher: enter the temple or capture the master

The final card must connect a penultimate approach square to the enemy temple, or connect to the enemy master after the defender's forced reply.

Common final approach shapes:

- One-rank finish from the penultimate rank: `f`, `fl`, `fr`.
- Wide one-rank finish from an outside file: `fll`, `frr`.
- Two-rank finish from a middle rank: `ff`, `ffl`, `ffr`.

This is why many different card names can finish the same mate. The exact card is less important than whether the borrowed card contains the required correction into the temple square.

Practical finisher card families:

- Straight finish: any card with `f`.
- Diagonal finish: any card with `fl` or `fr`.
- Wide finish: Dragon/Giraffe/Tanuki/Iguana-style `frr`/`fll`.
- Two-rank finish: Tiger `ff` or Kirin `ffl`/`ffr`.

## Defender-Card Pattern

The defender's card often helps the attacker in two ways:

- It moves a defender into a capturable lane square.
- After rotation, it becomes the attacker's final card.

That means the defender's first used card is dangerous if it contains a forward move that can later serve as the attacker's temple-entry direction. In the samples, many mates are not "needs Elephant" or "needs Mantis"; they are "needs the defender to own a card with the correct forward diagonal after it rotates."

Turtle appears often as the defender's other card because it lacks forward movement (`rr`, `ll`, `bl`, `br`). In these lines, the defender's spare card is poor at contesting the direct forward race. Turtle is a common enabler, not a universal requirement.

## General Mate-In-5 Template

Use this as the reusable concept:

```text
Attacker move 1:
  Use a fast opener (`ff`, `ffl`, `ffr`, `fll`, `frr`) to enter the middle.

Defender move 1:
  Defender spends a card that either steps into the lane or will later be a usable finisher.

Attacker move 2:
  Use a bridge card (`f`, `fl`, `fr`, `fll`, `frr`) to reach/capture onto a penultimate approach square.

Defender move 2:
  Defender usually gets the opener card, but cannot both answer the threat and prevent the rotated finisher.

Attacker move 3:
  Use the borrowed defender card, or the remaining attacker card, to enter the temple or capture the master.
```

## What To Look For In New Deals

Strong mate-in-5 candidates have most of these properties:

- The starting player has a fast opener: Tiger, Kirin, Dragon/Giraffe, or a one-sided equivalent like Tanuki/Iguana when the board square works.
- The neutral card after the opener gives a bridge move, especially Monkey or another forward-diagonal card.
- The opponent owns at least one card with the final approach direction the attacker will need after rotation.
- The opponent's second card is slow, lateral, backward, or otherwise unable to cover the temple lane.
- The final approach can be described as "middle to penultimate to temple" rather than by an exact card sequence.

The most reusable mental model is: fast opener plus bridge plus borrowed finisher. Card names are interchangeable whenever their move glyphs satisfy those three roles.
