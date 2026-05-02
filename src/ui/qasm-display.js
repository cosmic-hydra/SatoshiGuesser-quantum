/**
 * QasmDisplay — renders a compact summary of the last quantum circuit and its
 * measurement result inside a given container element.
 *
 * Expected inner structure (created by index.html):
 *   .qasm-source   — <pre> for the condensed circuit text
 *   .qasm-bits     — <code> for the 64-char hex measurement result
 *   .qasm-copy-btn — <button> to copy the full circuit to the clipboard
 */

const PREVIEW_GATES = 3; // H-gate lines to show before the ellipsis

export class QasmDisplay {
  /**
   * @param {HTMLElement} el  Wrapper element that contains the sub-elements above.
   */
  constructor(el) {
    this._el = el;
    this._sourceEl = el.querySelector('.qasm-source');
    this._bitsEl = el.querySelector('.qasm-bits');
    this._copyBtn = el.querySelector('.qasm-copy-btn');
    this._fullCircuit = '';

    if (this._copyBtn) {
      this._copyBtn.addEventListener('click', () => this._copy());
    }
  }

  /**
   * Refresh the panel with a new circuit + measurement result.
   *
   * @param {string}   circuit  Full OpenQASM 2.0 source string
   * @param {number[]} bits     256-element array of 0/1
   */
  update(circuit, bits) {
    this._fullCircuit = circuit;
    if (this._sourceEl) {
      this._sourceEl.textContent = this._summarise(circuit);
    }
    if (this._bitsEl && bits) {
      this._bitsEl.textContent = this._bitsToHex(bits);
    }
  }

  show() { this._el.classList.remove('hidden'); }
  hide() { this._el.classList.add('hidden'); }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** Return a condensed QASM summary (first few H gates + ellipsis + measure). */
  _summarise(src) {
    const lines = src.split('\n');
    const firstH = lines.findIndex((l) => l.startsWith('h q['));
    if (firstH === -1) return src;

    let hCount = 0;
    for (const l of lines) if (l.startsWith('h q[')) hCount++;

    const pre = lines.slice(0, firstH + PREVIEW_GATES);
    const measureIdx = lines.findIndex((l) => l.startsWith('measure'));
    const post = measureIdx !== -1 ? lines.slice(measureIdx) : [];

    const skipped = hCount - PREVIEW_GATES;
    const middle = skipped > 0
      ? [`// … ${skipped} more h gates …`, '']
      : [];

    return [...pre, ...middle, ...post].join('\n');
  }

  /** Convert a bit array to a lowercase hex string (4 bits → 1 nibble). */
  _bitsToHex(bits) {
    let hex = '';
    for (let i = 0; i + 3 < bits.length; i += 4) {
      const nibble =
        (bits[i] << 3) | (bits[i + 1] << 2) | (bits[i + 2] << 1) | bits[i + 3];
      hex += nibble.toString(16);
    }
    return hex;
  }

  async _copy() {
    if (!this._fullCircuit) return;
    try {
      await navigator.clipboard.writeText(this._fullCircuit);
      const orig = this._copyBtn.textContent;
      this._copyBtn.textContent = 'Copied!';
      setTimeout(() => { this._copyBtn.textContent = orig; }, 1500);
    } catch {
      // Clipboard access denied — fail silently.
    }
  }
}
