import CoreBluetooth
import SwiftUI

private let parmcoServiceUUID    = CBUUID(string: "12345678-1234-5678-1234-56789ABCDEF0")
private let commandCharUUID      = CBUUID(string: "12345678-1234-5678-1234-56789ABCDEF1")
private let telemetryCharUUID    = CBUUID(string: "12345678-1234-5678-1234-56789ABCDEF2")

private let kSavedPeripheralUUID = "parmco_saved_peripheral_uuid"
private let kReconnectBackoff: [TimeInterval] = [1.0, 2.0, 4.0, 8.0, 15.0]
private let kReconnectScanWindow: TimeInterval = 10.0

enum BLEConnectionState: String {
    case disconnected = "Disconnected"
    case scanning = "Scanning..."
    case connecting = "Connecting..."
    case connected = "Connected"
    case reconnecting = "Reconnecting…"

    var color: Color {
        switch self {
        case .disconnected: return PColor.disconnected
        case .scanning:     return PColor.scanning
        case .connecting:   return PColor.connecting
        case .connected:    return PColor.connected
        case .reconnecting: return PColor.connecting
        }
    }
}

struct DiscoveredDevice: Identifiable, Hashable {
    let id: UUID
    let peripheralRef: CBPeripheral
    let name: String
    let rssi: Int

    func hash(into hasher: inout Hasher) { hasher.combine(id) }

    static func == (lhs: DiscoveredDevice, rhs: DiscoveredDevice) -> Bool {
        lhs.id == rhs.id
    }
}

@MainActor
final class BLEManager: NSObject, ObservableObject {

    @Published var connectionState: BLEConnectionState = .disconnected
    @Published var statusMessage: String = "Not connected"
    @Published var discoveredDevices: [DiscoveredDevice] = []
    @Published var hasSavedPeripheral: Bool = false

    weak var motorState: MotorState?

    private var centralManager: CBCentralManager!
    private var connectedPeripheral: CBPeripheral?
    private var commandCharacteristic: CBCharacteristic?
    private var telemetryCharacteristic: CBCharacteristic?

    private var scanTimer: Timer?

    // Important fix: do NOT start armed
    private var shouldAutoReconnect = false

    private var reconnectAttempts: Int = 0
    private var reconnectTimer: Timer?
    private var reconnectScanTimer: Timer?
    private var isReconnectScanning: Bool = false

    override init() {
        super.init()
        hasSavedPeripheral = UserDefaults.standard.string(forKey: kSavedPeripheralUUID) != nil
        centralManager = CBCentralManager(delegate: self, queue: nil)
    }

    // MARK: Public API

    func startScan() {
        cancelReconnect()

        guard centralManager.state == .poweredOn else {
            statusMessage = "Bluetooth is off. Enable it in Settings."
            connectionState = .disconnected
            return
        }

        discoveredDevices = []
        connectionState = .scanning
        statusMessage = "Scanning for PARMCO-RP4..."

        centralManager.scanForPeripherals(
            withServices: [parmcoServiceUUID],
            options: [CBCentralManagerScanOptionAllowDuplicatesKey: false]
        )

        scanTimer?.invalidate()
        scanTimer = Timer.scheduledTimer(withTimeInterval: 15.0, repeats: false) { [weak self] _ in
            Task { @MainActor in
                guard let self = self, self.connectionState == .scanning else { return }
                self.stopScan()
                let count = self.discoveredDevices.count
                self.statusMessage = count > 0
                    ? "Scan complete. \(count) device(s) found. Tap to connect."
                    : "Scan complete. No PARMCO devices found."
                self.connectionState = .disconnected
            }
        }
    }

    func stopScan() {
        scanTimer?.invalidate()
        scanTimer = nil
        centralManager.stopScan()
    }

    func connect(to device: DiscoveredDevice) {
        stopScan()
        cancelReconnect()
        connectionState = .connecting
        statusMessage = "Connecting..."
        centralManager.connect(device.peripheralRef, options: nil)
    }

    func disconnect() {
        shouldAutoReconnect = false
        cancelReconnect()

        if let peripheral = connectedPeripheral {
            if let telChar = telemetryCharacteristic {
                peripheral.setNotifyValue(false, for: telChar)
            }
            centralManager.cancelPeripheralConnection(peripheral)
        }

        cleanup()
        connectionState = .disconnected
        statusMessage = "Disconnected."
    }

    func forgetSavedPeripheral() {
        UserDefaults.standard.removeObject(forKey: kSavedPeripheralUUID)
        hasSavedPeripheral = false
        shouldAutoReconnect = false
        cancelReconnect()
        disconnect()
        statusMessage = "Forgotten. Scan to reconnect."
    }

    func sendCommand(_ command: String) {
        guard connectionState == .connected else {
            print("[PARMCO BLE] Cannot send \(command) — state is not connected.")
            return
        }
        guard let peripheral = connectedPeripheral else {
            print("[PARMCO BLE] Cannot send \(command) — no peripheral.")
            return
        }
        guard let characteristic = commandCharacteristic else {
            print("[PARMCO BLE] Cannot send \(command) — no command characteristic.")
            return
        }
        guard let data = command.data(using: .utf8) else {
            print("[PARMCO BLE] Cannot encode command \(command).")
            return
        }

        peripheral.writeValue(data, for: characteristic, type: .withoutResponse)
        print("[PARMCO BLE] Sent command: \"\(command)\"")
    }

    func setTargetRPM(_ rpm: Int) {
        guard rpm >= 0 else { return }
        sendCommand("RPM:\(rpm)")
    }

    // MARK: Reconnect

    private func scheduleReconnect() {
        guard shouldAutoReconnect else { return }
        guard hasSavedPeripheral else { return }

        reconnectTimer?.invalidate()
        let idx = min(reconnectAttempts, kReconnectBackoff.count - 1)
        let delay = kReconnectBackoff[idx]
        reconnectAttempts = idx + 1

        connectionState = .reconnecting
        statusMessage = "Reconnecting (attempt \(idx + 1))…"
        print("[PARMCO BLE] Reconnect pass #\(idx + 1) in \(delay)s")

        reconnectTimer = Timer.scheduledTimer(withTimeInterval: delay, repeats: false) { [weak self] _ in
            Task { @MainActor in
                self?.runReconnectPass()
            }
        }
    }

    private func runReconnectPass() {
        guard shouldAutoReconnect else { return }
        guard hasSavedPeripheral else { return }

        guard centralManager.state == .poweredOn else {
            statusMessage = "Waiting for Bluetooth to come back on…"
            return
        }

        if let uuidString = UserDefaults.standard.string(forKey: kSavedPeripheralUUID),
           let uuid = UUID(uuidString: uuidString) {
            let known = centralManager.retrievePeripherals(withIdentifiers: [uuid])
            if let peripheral = known.first {
                print("[PARMCO BLE] Reconnect fast path: \(uuid)")
                statusMessage = "Reconnecting to saved device…"
                connectionState = .reconnecting
                centralManager.connect(peripheral, options: nil)
                return
            }
        }

        print("[PARMCO BLE] Reconnect fallback scan")
        isReconnectScanning = true
        connectionState = .reconnecting
        statusMessage = "Scanning for PARMCO-RP4 to reconnect…"

        centralManager.scanForPeripherals(
            withServices: [parmcoServiceUUID],
            options: [CBCentralManagerScanOptionAllowDuplicatesKey: false]
        )

        reconnectScanTimer?.invalidate()
        reconnectScanTimer = Timer.scheduledTimer(withTimeInterval: kReconnectScanWindow, repeats: false) { [weak self] _ in
            Task { @MainActor in
                guard let self = self, self.isReconnectScanning else { return }
                self.isReconnectScanning = false
                self.centralManager.stopScan()
                self.scheduleReconnect()
            }
        }
    }

    private func cancelReconnect() {
        reconnectTimer?.invalidate()
        reconnectTimer = nil

        reconnectScanTimer?.invalidate()
        reconnectScanTimer = nil

        if isReconnectScanning {
            centralManager?.stopScan()
            isReconnectScanning = false
        }

        reconnectAttempts = 0
    }

    // MARK: Helpers

    private func cleanup() {
        commandCharacteristic = nil
        telemetryCharacteristic = nil
        connectedPeripheral = nil
        motorState?.actualRPM = nil
    }

    private func savePeripheralUUID(_ uuid: UUID) {
        UserDefaults.standard.set(uuid.uuidString, forKey: kSavedPeripheralUUID)
        hasSavedPeripheral = true
    }
}

// MARK: CBCentralManagerDelegate

extension BLEManager: CBCentralManagerDelegate {

    nonisolated func centralManagerDidUpdateState(_ central: CBCentralManager) {
        Task { @MainActor in
            print("[PARMCO BLE] Adapter state: \(central.state.rawValue)")

            if central.state == .poweredOn {
                let hasSaved = UserDefaults.standard.string(forKey: kSavedPeripheralUUID) != nil
                self.hasSavedPeripheral = hasSaved

                if self.shouldAutoReconnect,
                   hasSaved,
                   self.connectionState != .connected,
                   self.reconnectTimer == nil,
                   !self.isReconnectScanning {
                    self.scheduleReconnect()
                }
            } else if self.connectionState != .disconnected {
                self.connectionState = .disconnected
                self.statusMessage = "Bluetooth turned off."
            }
        }
    }

    nonisolated func centralManager(
        _ central: CBCentralManager,
        didDiscover peripheral: CBPeripheral,
        advertisementData: [String : Any],
        rssi RSSI: NSNumber
    ) {
        Task { @MainActor in
            if self.isReconnectScanning {
                self.isReconnectScanning = false
                self.reconnectScanTimer?.invalidate()
                self.reconnectScanTimer = nil
                self.centralManager.stopScan()
                print("[PARMCO BLE] Reconnect scan matched \(peripheral.identifier); connecting")
                self.statusMessage = "Reconnecting to \(peripheral.name ?? "PARMCO-RP4")…"
                self.centralManager.connect(peripheral, options: nil)
                return
            }

            let alreadyFound = self.discoveredDevices.contains { $0.id == peripheral.identifier }
            guard !alreadyFound else { return }

            let name = peripheral.name
                ?? advertisementData[CBAdvertisementDataLocalNameKey] as? String
                ?? "Unknown Device"

            let device = DiscoveredDevice(
                id: peripheral.identifier,
                peripheralRef: peripheral,
                name: name,
                rssi: RSSI.intValue
            )

            self.discoveredDevices.append(device)
            self.statusMessage = "Found \(self.discoveredDevices.count) device(s)..."
            print("[PARMCO BLE] Discovered: \(name) (\(peripheral.identifier))")
        }
    }

    nonisolated func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
        Task { @MainActor in
            print("[PARMCO BLE] Connected to: \(peripheral.name ?? peripheral.identifier.uuidString)")
            self.connectedPeripheral = peripheral
            peripheral.delegate = self
            self.statusMessage = "Connected. Discovering services..."

            self.savePeripheralUUID(peripheral.identifier)
            self.shouldAutoReconnect = true
            self.cancelReconnect()

            try? await Task.sleep(nanoseconds: 900_000_000)
            peripheral.discoverServices([parmcoServiceUUID])
        }
    }

    nonisolated func centralManager(
        _ central: CBCentralManager,
        didFailToConnect peripheral: CBPeripheral,
        error: Error?
    ) {
        Task { @MainActor in
            self.cleanup()

            if self.shouldAutoReconnect && self.hasSavedPeripheral {
                self.statusMessage = "Connect failed: \(error?.localizedDescription ?? "unknown"). Retrying…"
                self.scheduleReconnect()
            } else {
                self.connectionState = .disconnected
                self.statusMessage = "Connection failed: \(error?.localizedDescription ?? "Unknown error")"
            }
        }
    }

    nonisolated func centralManager(
        _ central: CBCentralManager,
        didDisconnectPeripheral peripheral: CBPeripheral,
        error: Error?
    ) {
        Task { @MainActor in
            print("[PARMCO BLE] Device disconnected: \(peripheral.name ?? peripheral.identifier.uuidString)")
            self.cleanup()

            if self.shouldAutoReconnect && self.hasSavedPeripheral {
                self.connectionState = .reconnecting
                if let err = error {
                    self.statusMessage = "Link lost: \(err.localizedDescription). Reconnecting…"
                } else {
                    self.statusMessage = "Link lost. Reconnecting…"
                }
                self.reconnectAttempts = 0
                self.scheduleReconnect()
            } else {
                self.connectionState = .disconnected
                if let err = error {
                    self.statusMessage = "Connection lost: \(err.localizedDescription)"
                } else {
                    self.statusMessage = "Disconnected from PARMCO-RP4."
                }
            }
        }
    }
}

// MARK: CBPeripheralDelegate

extension BLEManager: CBPeripheralDelegate {

    nonisolated func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
        Task { @MainActor in
            if let error = error {
                self.statusMessage = "Service discovery failed: \(error.localizedDescription)"
                self.disconnect()
                return
            }

            guard let service = peripheral.services?.first(where: { $0.uuid == parmcoServiceUUID }) else {
                self.statusMessage = "Connected device is not a PARMCO controller."
                self.disconnect()
                return
            }

            peripheral.discoverCharacteristics([commandCharUUID, telemetryCharUUID], for: service)
        }
    }

    nonisolated func peripheral(
        _ peripheral: CBPeripheral,
        didDiscoverCharacteristicsFor service: CBService,
        error: Error?
    ) {
        Task { @MainActor in
            if let error = error {
                self.statusMessage = "Characteristic discovery failed: \(error.localizedDescription)"
                return
            }

            var foundCommand = false

            for characteristic in service.characteristics ?? [] {
                switch characteristic.uuid {
                case commandCharUUID:
                    self.commandCharacteristic = characteristic
                    foundCommand = true
                    print("[PARMCO BLE] Found command characteristic.")
                case telemetryCharUUID:
                    self.telemetryCharacteristic = characteristic
                    peripheral.setNotifyValue(true, for: characteristic)
                    print("[PARMCO BLE] Subscribed to telemetry notifications.")
                default:
                    break
                }
            }

            if foundCommand {
                self.connectionState = .connected
                self.statusMessage = "Connected to \(peripheral.name ?? "PARMCO-RP4")"
            } else {
                self.connectionState = .disconnected
                self.statusMessage = "Connected, but command characteristic not found."
                print("[PARMCO BLE] ERROR: command characteristic not found.")
            }
        }
    }

    nonisolated func peripheral(
        _ peripheral: CBPeripheral,
        didUpdateValueFor characteristic: CBCharacteristic,
        error: Error?
    ) {
        guard characteristic.uuid == telemetryCharUUID,
              error == nil,
              let data = characteristic.value,
              let decoded = String(data: data, encoding: .utf8)
        else { return }

        let trimmed = decoded.trimmingCharacters(in: .whitespacesAndNewlines)

        // === HUMAN EDIT START (Final, Jalen) ===
        // Final-project payload is comma-separated key:value, e.g.
        //   "RPM:1234,REF:1180,M:maintain"
        //
        // Fields are optional and may arrive in any order. Anything we
        // don't recognise is ignored. Backward compatibility with the
        // CP3 format ("RPM:1234" or just "1234") is preserved because
        // a single-field payload parses correctly under this split.
        var newActual: Int?
        var newRef: Int?
        var newMode: String?

        for field in trimmed.split(separator: ",") {
            let parts = field.split(separator: ":", maxSplits: 1)
            if parts.count == 2 {
                let key = parts[0].trimmingCharacters(in: .whitespaces).uppercased()
                let val = String(parts[1]).trimmingCharacters(in: .whitespaces)
                switch key {
                case "RPM": newActual = Int(val)
                case "REF": newRef    = Int(val)
                case "M":   newMode   = val.lowercased()
                default:    break
                }
            } else if parts.count == 1 {
                // CP3 fallback: a bare number means actual RPM.
                if let bare = Int(String(parts[0]).trimmingCharacters(in: .whitespaces)) {
                    newActual = bare
                }
            }
        }

        // Bail only if we got literally nothing usable. A partial frame
        // (e.g. only RPM: arrived because the REF sensor is idle) is
        // still worth dispatching.
        guard newActual != nil || newRef != nil || newMode != nil else { return }

        Task { @MainActor in
            if let a = newActual { self.motorState?.actualRPM    = a }
            if let r = newRef    { self.motorState?.referenceRPM = r }
            if let m = newMode   { self.motorState?.activeMode   = m }
        }
        // === HUMAN EDIT END ===
    }

    nonisolated func peripheral(
        _ peripheral: CBPeripheral,
        didWriteValueFor characteristic: CBCharacteristic,
        error: Error?
    ) {
        if let error = error {
            print("[PARMCO BLE] Write failed: \(error.localizedDescription)")
        }
    }
}
