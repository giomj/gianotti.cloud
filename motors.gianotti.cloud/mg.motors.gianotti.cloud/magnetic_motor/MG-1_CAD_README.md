# MG-1 parametric CAD — build notes

Companion to `MG-1_drawing_set.pdf`. Every dimension lives in **`MG1_params.scad`**;
the other files derive from it. Change a number there and every part follows.

## Files

| File | Sheet | What it makes |
|---|---|---|
| `MG1_params.scad` | 1 | all parameters + a loud `echo()` of every derived number |
| `MG1_lib.scad` | — | keyed magnet pocket, keyed bore, bearing seat, tie/vent holes |
| `MG1_rotor.scad` | 4, 5 | both rotor carriers — set `which = "hs"` or `"ls"` |
| `MG1_modulator.scad` | 6 | modulator plate + integral reaction arm — set `variant = 1/2/3` |
| `MG1_frame.scad` | 7 | frame end plate, gap shim, standoff reference — set `part` |
| `MG1_assembly.scad` | 2, 3 | interference check / exploded view — set `explode_mm` |

## Export

```
openscad -o hs_rotor.stl  -D 'which="hs"' MG1_rotor.scad
openscad -o ls_rotor.stl  -D 'which="ls"' MG1_rotor.scad
openscad -o modulator_v1.stl -D 'variant=1' MG1_modulator.scad
openscad -o frame_plate.stl -D 'part="frame"' MG1_frame.scad
```

Set `$fn = 64` while iterating, `200` for export. Every file echoes its key
numbers on compile — read them, they are the check.

## Corrected number

Block angular width is **16.43°**, the chord subtended by a flat 10 mm block at
R_m = 35 (`2·asin(5/35)`). The earlier 16.37° figure was the arc-length
approximation `10/35 rad`. The block is flat, so the chord is correct.
Pole-arc ratios are therefore 0.913 (HS) and 0.821 (LS). The drawing set has
been rebuilt with these values.

## Non-negotiables carried into the CAD

- **PETG or ASA, never PLA.** PLA creeps at 55 °C; a crept air gap is a rotor crash.
- **No printed feature defines the air gap.** Aluminium standoffs between frame
  plates, steel sleeves bonded into the bearing seats. Never run a 608 directly
  in plastic.
- **Magnet pockets are keyed** — one flat corner notch per pocket, so a block
  can only seat one way round. Polarity errors are invisible after glue-up.
  Witness dots print proud on north poles so they are tactile.
- **Seat magnets dry first**, confirm the N/S map with a field probe on every
  single block, then bond.
- **The reaction arm is a measurement datum**, not structure. Solid infill,
  6 perimeters, or replace it with an aluminium bar. Its deflection is
  measurement error in `tau_react = F_cell × 0.088 m`.
- **Assemble only with the threaded-rod jig** (4 long M5, diagonal pairs, a
  quarter turn at a time). An unrestrained rotor free-flies into the modulator.
- **Polycarbonate burst shroud, interlocked into SAFE-01**, before any powered run.
