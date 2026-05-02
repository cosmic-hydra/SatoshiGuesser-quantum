import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildQasmSource,
  simulateQasmMeasurement,
  quantumRandomPrivKey,
  getLastQasmCircuit,
  getLastQasmBits,
} from '../src/game/qasm.js';

test('buildQasmSource produces valid OpenQASM 2.0 header', () => {
  const src = buildQasmSource(8);
  assert.ok(src.startsWith('OPENQASM 2.0;'), 'must begin with OPENQASM 2.0;');
  assert.ok(src.includes('include "qelib1.inc";'), 'must include qelib1');
  assert.ok(src.includes('qreg q[8];'), 'must declare qreg');
  assert.ok(src.includes('creg c[8];'), 'must declare creg');
  assert.ok(src.includes('measure q -> c;'), 'must end with measure');
});

test('buildQasmSource emits exactly numQubits H gates', () => {
  const numQubits = 16;
  const src = buildQasmSource(numQubits);
  const hLines = src.split('\n').filter((l) => l.startsWith('h q['));
  assert.equal(hLines.length, numQubits);
});

test('buildQasmSource default produces 256-qubit circuit', () => {
  const src = buildQasmSource();
  assert.ok(src.includes('qreg q[256];'));
  const hLines = src.split('\n').filter((l) => l.startsWith('h q['));
  assert.equal(hLines.length, 256);
});

test('simulateQasmMeasurement returns correct number of bits', () => {
  const { bits } = simulateQasmMeasurement(16);
  assert.equal(bits.length, 16);
  assert.ok(bits.every((b) => b === 0 || b === 1), 'all bits must be 0 or 1');
});

test('simulateQasmMeasurement returns 32 bytes for 256 qubits', () => {
  const { bytes, bits } = simulateQasmMeasurement(256);
  assert.equal(bytes.length, 32);
  assert.equal(bits.length, 256);
});

test('simulateQasmMeasurement bits are consistent with bytes', () => {
  const { bytes, bits } = simulateQasmMeasurement(8);
  // Only 8 qubits → 1 byte.  Reconstruct byte from bits.
  let reconstructed = 0;
  for (let i = 0; i < 8; i++) {
    reconstructed = (reconstructed << 1) | bits[i];
  }
  assert.equal(reconstructed, bytes[0]);
});

test('quantumRandomPrivKey returns a 32-byte Uint8Array', () => {
  const key = quantumRandomPrivKey();
  assert.ok(key instanceof Uint8Array);
  assert.equal(key.length, 32);
});

test('quantumRandomPrivKey updates module-level circuit state', () => {
  quantumRandomPrivKey();
  const circuit = getLastQasmCircuit();
  const bits = getLastQasmBits();
  assert.ok(typeof circuit === 'string' && circuit.length > 0, 'circuit must be non-empty');
  assert.ok(Array.isArray(bits) && bits.length === 256, 'bits must be 256-element array');
});

test('consecutive quantumRandomPrivKey calls produce different keys', () => {
  const k1 = quantumRandomPrivKey();
  const k2 = quantumRandomPrivKey();
  // With 256-bit random output the probability of collision is negligible.
  assert.notDeepEqual(Array.from(k1), Array.from(k2));
});
