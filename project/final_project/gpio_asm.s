// ============================================================================
// PARMCO — Phone APP RP4 Motor Control — GPIO Assembly Module (32-BIT)
// ============================================================================
//
// File:        gpio_asm.s
// Project:     PARMCO (Phone APP RP4 Motor Control)
// Course:      ECSE 4235 — Embedded Systems, Spring 2026
// University:  University of Georgia
// Authors:     Justin Moreno and Jalen Edusei
// Date:        March 25, 2026
// Checkpoint:  2 — RP4 motor control with ARMv7 assembly GPIO manipulation
//
// Description:
//   This file contains 32-bit ARM (AArch32/ARMv7-A) assembly routines for 
//   direct GPIO register manipulation on the Raspberry Pi 4 (BCM2711 SoC,
//   Cortex-A72). These functions are called from the C motor control
//   program via the ARM Architecture Procedure Call Standard (AAPCS32).
//
//   The BCM2711 uses memory-mapped I/O: GPIO control registers exist
//   at fixed offsets from a peripheral base address. In user-space,
//   the physical base (0xFE200000) is mapped into virtual memory via
//   mmap() on /dev/gpiomem, and the resulting virtual pointer is passed
//   to gpio_init() for use by all subsequent functions.
//
// Register Map (BCM2711 GPIO, offsets from base):
//   GPFSEL0  = base + 0x00   Function Select for GPIO 0-9
//   GPFSEL1  = base + 0x04   Function Select for GPIO 10-19
//   GPFSEL2  = base + 0x08   Function Select for GPIO 20-29
//   GPFSEL3  = base + 0x0C   Function Select for GPIO 30-39
//   GPFSEL4  = base + 0x10   Function Select for GPIO 40-49
//   GPFSEL5  = base + 0x14   Function Select for GPIO 50-53
//   GPSET0   = base + 0x1C   Pin Output Set (write 1 = set HIGH)
//   GPSET1   = base + 0x20   Pin Output Set for GPIO 32-53
//   GPCLR0   = base + 0x28   Pin Output Clear (write 1 = set LOW)
//   GPCLR1   = base + 0x2C   Pin Output Clear for GPIO 32-53
//
//   Each GPFSEL register controls 10 pins, with 3 bits per pin:
//     000 = Input, 001 = Output, 100 = Alt0, 101 = Alt1, etc.
//     Pin N is in GPFSEL(N/10), bits [(N%10)*3 + 2 : (N%10)*3]
//
//   Writing to GPSET/GPCLR: setting bit N in GPSET0 drives GPIO N HIGH.
//   Setting bit N in GPCLR0 drives GPIO N LOW. Writing 0 to any bit in
//   these registers has NO effect — this atomic design prevents race
//   conditions when toggling individual pins.
//
// AAPCS32 Calling Convention:
//   - Arguments passed in r0-r3 (32-bit)
//   - Return value in r0
//   - r0-r3, r12 are caller-saved (scratch) registers
//   - r4-r11 are callee-saved (must be preserved if used)
//   - r13 = SP (Stack Pointer), r14 = LR (Link Register), r15 = PC
//
// ============================================================================

    .arch armv7ve              // Target 32-bit architecture supporting hardware UDIV
    .syntax unified            // Use unified assembly syntax
    .arm                       // Compile in standard 32-bit ARM mode (not Thumb)
    .text                      // Place all code in the .text section

// ============================================================================
// MODULE-LEVEL STORAGE
// ============================================================================
// We store the GPIO base virtual address in the .data section so all three
// functions can access it. gpio_init() writes the address here; the other
// functions load it before computing register offsets.

    .data
    .align 2                   // Align to 4-byte boundary (required for 32-bit loads)
gpio_base_addr:
    .word 0                    // 32-bit storage for the mmap'd GPIO base pointer
                               // Initialized to 0 (NULL) — must call gpio_init first

    .text                      // Return to the code section


// ============================================================================
// gpio_init — Store the GPIO base address for subsequent calls
// ============================================================================
//
// C Prototype:  void gpio_init(volatile void *base_ptr);
//
// Parameters:
//   R0 = base_ptr   — virtual address returned by mmap() on /dev/gpiomem.
//
// Returns:      void
//
// ============================================================================

    .global gpio_init          // Make symbol visible to the C linker
    .type gpio_init, %function // Declare as a function (for ELF metadata)

gpio_init:
    // Load the address of the gpio_base_addr variable into R1.
    ldr     r1, =gpio_base_addr        // R1 = address of gpio_base_addr

    // Store the base pointer (R0) into the memory location pointed to by R1.
    // This is a 32-bit store because pointers are 32 bits on AArch32.
    str     r0, [r1]                   // *gpio_base_addr = base_ptr

    // Return to the caller. 
    bx      lr                         // Branch to Link Register

    .size gpio_init, .-gpio_init       // Tell the assembler the function's size


// ============================================================================
// gpio_set_output — Configure a GPIO pin as an output
// ============================================================================
//
// C Prototype:  void gpio_set_output(unsigned int pin);
//
// Parameters:
//   R0 = pin    — GPIO pin number (0-53, BCM numbering)
//
// Returns:      void
//
// ============================================================================

    .global gpio_set_output
    .type gpio_set_output, %function

gpio_set_output:
    // ---- Save callee-saved registers (we use R4-R8) ----
    // AAPCS32 requires us to preserve R4-R11 across function calls.
    // We push them to the stack along with the Link Register (LR).
    push    {r4-r8, lr}

    // ---- Load the GPIO base address from the global variable ----
    ldr     r4, =gpio_base_addr        // R4 = address of gpio_base_addr
    ldr     r4, [r4]                   // R4 = *gpio_base_addr (mmap'd base pointer)

    // ---- Save the pin number for later use ----
    mov     r5, r0                     // R5 = pin number

    // ---- Step 1: Compute GPFSEL register index = pin / 10 ----
    mov     r6, #10                    // R6 = 10 (divisor)
    udiv    r7, r5, r6                 // R7 = pin / 10 = GPFSEL register index

    // ---- Step 2: Compute register byte offset = reg_index * 4 ----
    lsl     r7, r7, #2                 // R7 = reg_index * 4 = byte offset

    // ---- Step 3: Compute bit position = (pin % 10) * 3 ----
    // pin % 10: multiply quotient back by 10 and subtract from original.
    udiv    r3, r5, r6                 // R3 = pin / 10 (quotient)
    mul     r8, r3, r6                 // R8 = quotient * 10
    sub     r3, r5, r8                 // R3 = pin - (quotient * 10) = pin % 10
    mov     r8, #3                     // R8 = 3 (bits per pin)
    mul     r3, r3, r8                 // R3 = (pin % 10) * 3 = bit position

    // ---- Step 4: Load the current GPFSEL register value ----
    add     r8, r4, r7                 // R8 = base + reg_offset
    ldr     r6, [r8]                   // R6 = current GPFSEL register contents

    // ---- Step 5: Clear the 3-bit field (BIC = AND NOT) ----
    mov     r7, #7                     // R7 = 0b111 (3-bit mask)
    lsl     r7, r7, r3                 // R7 = 0b111 << bit_position
    bic     r6, r6, r7                 // R6 = R6 & ~R7 (clear the 3-bit field)

    // ---- Step 6: Set output mode (ORR with 001) ----
    mov     r7, #1                     // R7 = 0b001 (output mode code)
    lsl     r7, r7, r3                 // R7 = 0b001 << bit_position
    orr     r6, r6, r7                 // R6 = R6 | R7 (set output mode)

    // ---- Step 7: Write the modified value back to the GPFSEL register ----
    str     r6, [r8]                   // *GPFSEL_reg = modified value

    // ---- Restore callee-saved registers and return ----
    pop     {r4-r8, pc}                // Restore registers and pop LR directly into PC to return

    .size gpio_set_output, .-gpio_set_output


// ============================================================================
// gpio_write — Set a GPIO pin HIGH or LOW
// ============================================================================
//
// C Prototype:  void gpio_write(unsigned int pin, unsigned int value);
//
// Parameters:
//   R0 = pin    — GPIO pin number (0-31 for GPSET0/GPCLR0)
//   R1 = value  — 0 to drive LOW (via GPCLR0), 1 to drive HIGH (via GPSET0)
//
// Returns:      void
//
// ============================================================================

    .global gpio_write
    .type gpio_write, %function

gpio_write:
    // ---- Load the GPIO base address ----
    ldr     r2, =gpio_base_addr
    ldr     r2, [r2]                   // R2 = base pointer

    // ---- Create the pin bitmask ----
    mov     r3, #1                     // R3 = 1
    lsl     r3, r3, r0                 // R3 = 1 << pin = bitmask

    // ---- Branch based on the desired output value ----
    cmp     r1, #0                     // Compare value (R1) with 0
    beq     .Lclear_pin                // If R1 == 0, branch to clear logic

    // ---- SET path: write bitmask to GPSET0 (offset 0x1C) ----
    str     r3, [r2, #0x1C]            // *(base + 0x1C) = bitmask → pin goes HIGH
    bx      lr                         // Return to C caller

.Lclear_pin:
    // ---- CLEAR path: write bitmask to GPCLR0 (offset 0x28) ----
    str     r3, [r2, #0x28]            // *(base + 0x28) = bitmask → pin goes LOW
    bx      lr                         // Return to C caller

    .size gpio_write, .-gpio_write

// ============================================================================
// Literal Pool Dump
// ============================================================================
// Tell the assembler to place the literal values (like =gpio_base_addr) here
// at the end of the text section, ensuring they are reachable by LDR.
    .ltorg
