/**
 * Theme.swift
 * PARMCO — Phone APP RP4 Motor Control
 *
 * ECSE 4235 — Embedded Systems, Spring 2026
 * University of Georgia
 * Authors: Justin Moreno and Jalen Edusei
 */

import SwiftUI

// MARK: - Color Palette

struct PColor {
    static let bgPrimary        = Color(hex: 0x0D0D0F)
    static let bgCard           = Color(hex: 0x18181B)
    static let bgCardElevated   = Color(hex: 0x1E1E22)
    static let bgInput          = Color(hex: 0x252529)
    static let bgOverlay        = Color.black.opacity(0.75)

    static let accentForward    = Color(hex: 0x22C55E)
    static let accentReverse    = Color(hex: 0x3B82F6)
    static let accentStopped    = Color(hex: 0xEF4444)
    static let accentIdle       = Color(hex: 0x52525B)
    static let accentWarning    = Color(hex: 0xF59E0B)
    static let accentSpeed      = Color(hex: 0x06B6D4)

    static let textPrimary      = Color(hex: 0xF4F4F5)
    static let textSecondary    = Color(hex: 0xA1A1AA)
    static let textMuted        = Color(hex: 0x71717A)
    static let textOnAccent     = Color.white

    static let buttonActive     = Color(hex: 0x27272A)
    static let buttonPressed    = Color(hex: 0x3F3F46)
    static let border           = Color(hex: 0x2E2E33)
    static let borderActive     = Color(hex: 0x3B82F6)

    static let connected        = Color(hex: 0x22C55E)
    static let connecting       = Color(hex: 0xF59E0B)
    static let scanning         = Color(hex: 0x3B82F6)
    static let disconnected     = Color(hex: 0xEF4444)
}

// MARK: - Color Extension

extension Color {
    init(hex: UInt, opacity: Double = 1.0) {
        self.init(
            .sRGB,
            red:   Double((hex >> 16) & 0xFF) / 255.0,
            green: Double((hex >> 8)  & 0xFF) / 255.0,
            blue:  Double( hex        & 0xFF) / 255.0,
            opacity: opacity
        )
    }
}
