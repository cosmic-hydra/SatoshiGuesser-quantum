/**
 * QASM 2.0 quantum circuit for random private-key generation.
 *
 * Architecture
 * ────────────
 *   6 qubits, each initialised to |0⟩
 *   H (Hadamard) gate applied to every qubit  →  superposition |+⟩
 *   Simultaneous measurement collapses each qubit to 0 or 1 with equal
 *   probability, yielding a uniformly random 6-bit string.
 *
 * Simulation (browser / Node)
 * ───────────────────────────
 *   The measurement outcomes are drawn from crypto.getRandomValues() — a CSPRNG
 *   whose output is statistically indistinguishable from a true quantum
 *   measurement on this circuit.  On a real quantum processor, replace
 *   simulateQasmMeasurement() with a call to the hardware back-end.
 */

const NUM_QUBITS = 6;

/** Module-level state so the UI can inspect the last circuit without passing
 *  it through every call frame. */
let _lastCircuit = '';
let _lastBits = /** @type {number[]|null} */ (null);

// ---------------------------------------------------------------------------
// Circuit builder
// ---------------------------------------------------------------------------

/**
 * Build a complete OpenQASM 2.0 source string for an n-qubit Hadamard
 * measurement circuit.  n defaults to 6.
 *
 * @param {number} numQubits
 * @returns {string}
 */
export function buildQasmSource(numQubits = NUM_QUBITS) {
  const lines = [
    'OPENQASM 2.0;',
    'include "qelib1.inc";',
    '',
    `qreg q[${numQubits}];`,
    `creg c[${numQubits}];`,
    '',
  ];
  for (let i = 0; i < numQubits; i++) {
    lines.push(`h q[${i}];`);
  }
  lines.push('');
  lines.push('measure q -> c;');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Circuit simulation
// ---------------------------------------------------------------------------

/**
 * Simulate the measurement of all qubits in the Hadamard circuit.
 * Returns both raw bytes (for key derivation) and individual bits (for the UI).
 *
 * @param {number} numQubits
 * @returns {{ bytes: Uint8Array, bits: number[] }}
 */
export function simulateQasmMeasurement(numQubits = NUM_QUBITS) {
  // Always allocate at least 32 bytes so the private key derivation has
  // sufficient entropy regardless of how many qubits the circuit uses.
  // With fewer than 256 qubits the quantum measurement is demonstrative;
  // the remaining key entropy is supplied by the CSPRNG padding below.
  const numBytes = Math.max(32, Math.ceil(numQubits / 8));
  const bytes = new Uint8Array(numBytes);
  crypto.getRandomValues(bytes);

  const bits = [];
  for (let i = 0; i < numQubits; i++) {
    const byteIdx = Math.floor(i / 8);
    const bitIdx = 7 - (i % 8); // MSB-first within each byte
    bits.push((bytes[byteIdx] >> bitIdx) & 1);
  }
  return { bytes: bytes.slice(0, 32), bits };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a quantum random 32-byte private key via a simulated QASM circuit.
 * Stores the circuit source and measurement bits for UI inspection.
 *
 * @returns {Uint8Array} 32-byte private key
 */
export function quantumRandomPrivKey() {
  _lastCircuit = buildQasmSource(NUM_QUBITS);
  const { bytes, bits } = simulateQasmMeasurement(NUM_QUBITS);
  _lastBits = bits;
  return bytes;
}

/** Return the most recently generated QASM circuit source string. */
export function getLastQasmCircuit() {
  return _lastCircuit;
}

/** Return the most recent 256-bit measurement result as an array of 0/1. */
export function getLastQasmBits() {
  return _lastBits;
}
