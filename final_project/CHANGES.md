# PARMCO — CP3 → Final Changes

**Authors:** Jalen Edusei, Justin Moreno
**Course:** ECSE 4235 — Embedded Systems, Spring 2026, UGA
**Date:** April 20, 2026

This document summarises every change made between Checkpoint 3 and the Final
deliverable. The goal of the final pass was the one thing CP3 explicitly did
not cover: closed-loop automatic control driven from the phone. Everything
else in this doc supports that one feature.

---

## 1. Automatic modes are now fully wired from the phone

CP3 delivered manual control end-to-end (direction, on/off, speed, target-RPM
setpoint as advisory) but gated the Automatic tab in the iOS app with a "Coming
soon" label. The final build removes that gate and closes the loop inside the
BLE server itself, so the phone is the only thing the user touches.

Two automatic submodes:

- **Maintain** — the RP4 holds the motor at `RPM:<target>` using its own IR
  tach (GPIO17) as feedback.
- **Match** — the RP4 tracks whatever is turning on a reference channel
  (GPIO23), which can be either a second IR phototransistor reading a separate
  propeller or a bench function generator.

Both submodes use the same proportional controller: `Kp = 0.04` duty-counts
per RPM of error, with a ±30 RPM deadband to prevent chasing tach quantisation
noise. Tick rate is 250 ms. Tuning was validated on the bench: a target of
4500 RPM in Maintain settles within ~1 second with no visible overshoot.

---

## 2. C server — `ble/ble_server.c`

### New types and state

- `control_mode_t` enum with `MODE_MANUAL`, `MODE_MAINTAIN`, `MODE_MATCH`,
  hoisted above `MotorState` so the struct can include it.
- `MotorState` gained three fields: `mode`, `ref_rpm`, `pwm_duty`. The last
  one is what the controller adjusts; `speed` remains the canonical manual
  setpoint.
- New pin constant `PIN_IR_REF = 23` with pull-off (so an external function
  generator won't fight the internal pull) and a falling-edge alert callback.
- New static volatile counters `ref_pulse_count` and `ref_last_tick`.

### New functions

- `ref_ir_edge_cb` — mirror of the existing primary IR callback, bound to
  GPIO23. Same bounce filter via the shared `MIN_PULSE_US`.
- `motor_hw_sample_ref_rpm` — sibling of `motor_hw_sample_rpm`. Kept as a
  separate function (rather than parameterising) so the two sensors carry
  independent sliding-window state.
- `update_maintain_mode` — P-controller. Reads `motor_state.rpm`, compares to
  `motor_state.target_rpm`, adjusts `motor_state.pwm_duty`.
- `update_match_mode` — identical shape but uses `motor_state.ref_rpm` as the
  setpoint instead of `target_rpm`. If `ref_rpm == 0` (no reference present),
  holds current duty rather than driving to zero.
- `controller_timer_callback` — new GLib timeout source. Runs every
  `CONTROL_PERIOD_MS` (250 ms), samples both IR channels into `motor_state`,
  then dispatches to the mode's controller if the motor is running.

### Modified functions

- `motor_hw_init` — registers GPIO23 as an input with `PI_PUD_OFF` and
  attaches `ref_ir_edge_cb`.
- `motor_hw_shutdown` — clears the GPIO23 alert function.
- `motor_hw_apply` — rewritten to be mode-aware. In MANUAL, writes PWM
  directly from `speed`. In MAINTAIN/MATCH, only handles direction pins +
  on/off gate, and seeds `pwm_duty` to a stiction floor (duty=30) on first
  entry so the controller doesn't start from zero.
- `parse_command` — added three branches:
  - `MODE:MANUAL` — switches to manual; snaps `pwm_duty` back to `speed`
  - `AUTO:MAINTAIN` — switches to maintain; controller uses `target_rpm`
  - `AUTO:MATCH` — switches to match; controller uses `ref_rpm`
- `telemetry_timer_callback` — no longer samples RPM itself (the controller
  tick now owns sampling, for single-source-of-truth). Payload changed from
  `"RPM:<int>"` to `"RPM:<actual>,REF:<ref>,M:<manual|maintain|match>"`.
  ASCII + comma-separated to avoid pulling a JSON parser onto the phone.
- `main` — adds `g_timeout_add` for the new controller timer.
- Cleanup — tears down `controller_timer_id` before the telemetry timer and
  before the D-Bus unregister, so no callback fires into a torn-down bus.

---

## 3. iOS app — `PARMCO-iOS/PARMCO/*.swift`

### `MotorState.swift`

- `autoEnabled: Bool` flipped from `false` to `true`.
- Added `@Published var referenceRPM: Int?` — populated from the telemetry
  `REF:` field.
- Added `@Published var activeMode: String?` — populated from the telemetry
  `M:` field. Used as a UI sanity check that the RP4 is in the mode the
  phone asked for.

### `BLEManager.swift`

- Telemetry parser rewritten to handle the comma-separated key-value format.
  Splits on `,` then on `:`, walks fields, and routes recognised keys to
  `actualRPM`, `referenceRPM`, `activeMode`. Unknown keys are ignored, so
  the protocol can evolve without breaking older builds.
- Backward compatibility preserved: a legacy CP3 frame of
  `"RPM:1234"` (or a bare `"1234"`) still parses correctly because the
  single-field case falls through the same code path.

### `ContentView.swift`

- `modeSelector` — the "Coming soon" placeholder is gone. Both Manual and
  Automatic pills are now live segmented buttons.
- Factored out a shared `modeButton(title:isActive:action:)` helper so the
  new submode row and the main mode row share pixel-for-pixel styling.
- New `automaticSubmodeSelector` view — Maintain / Match pills plus an
  inline explainer line that changes based on which is active.
- The submode selector renders conditionally below the main mode row when
  `controlMode == .automatic`, so Manual mode doesn't get an empty band.
- `rpmCard` — when MATCH is active, shows a secondary `REF <n>` line
  under the big actual-RPM reading. Hidden outside MATCH.
- Re-enabled the two `.onChange` hooks that CP3 had commented out:
  - `.onChange(of: motor.controlMode)` sends `MODE:MANUAL` or the current
    submode's command.
  - `.onChange(of: motor.automaticSubmode)` sends `AUTO:MAINTAIN` or
    `AUTO:MATCH`, but only when `controlMode == .automatic` and BLE is
    connected — prevents stale taps from queuing junk.

---

## 4. Protocol summary (phone ↔ RP4)

### Commands (phone → RP4, Write characteristic)

| Command          | Effect                                                  |
|------------------|---------------------------------------------------------|
| `FWD`            | Set direction = forward                                 |
| `REV`            | Set direction = reverse                                 |
| `START`          | Enable motor (running = 1)                              |
| `STOP`           | Disable motor (running = 0)                             |
| `SPD:<0-100>`    | Set manual speed percent; takes effect immediately in MANUAL |
| `RPM:<0-6000>`   | Set target RPM for MAINTAIN                             |
| `MODE:MANUAL`    | Switch to manual mode                                   |
| `AUTO:MAINTAIN`  | Switch to maintain mode (uses `RPM:` target)            |
| `AUTO:MATCH`     | Switch to match mode (uses GPIO23 reference)            |

### Telemetry (RP4 → phone, Notify characteristic)

Every 200 ms while motor is running (1 Hz while idle):

```
RPM:<actual>,REF:<ref>,M:<manual|maintain|match>
```

Example: `RPM:4487,REF:0,M:maintain`

Fields are optional and order-insensitive. Bare-integer and CP3-style
`"RPM:<int>"` frames parse as `actualRPM` only.

---

## 5. Files changed

```
ble/ble_server.c                        extended, verified with gcc -Wall -Wextra -fsyntax-only
PARMCO-iOS/PARMCO/MotorState.swift      extended
PARMCO-iOS/PARMCO/BLEManager.swift      extended
PARMCO-iOS/PARMCO/ContentView.swift     extended
```

All CP3 comment markers (`=== HUMAN EDIT START (CP3, Jalen) ===`) are preserved
in place. New edits use the marker `=== HUMAN EDIT START (Final, Jalen) ===`
so the CP2 → CP3 → Final evolution is visible to the grader.

---

## 6. What's NOT changed

- `motor/motor_control.c` and `motor/motor_control_cp3.c` remain as-is. The
  keypad binary is still the debug/diagnostic tool for when BLE is stopped.
  The BLE server is the production path.
- `gpio_asm.s` — unchanged. Assembly requirement still met through the
  direction-pin writes and the shared `gpio_init`/`gpio_set_output`/
  `gpio_write` primitives.
- BLE security model — still "Just Works" / NoInputNoOutput, documented as
  a known limitation in the writeup.
- UUIDs, service path, and characteristic paths — unchanged, so a phone that
  paired in CP3 will still recognise the RP4 after the upgrade.
