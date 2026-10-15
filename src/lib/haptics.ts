/**
 * A short haptic tick, used to confirm a camera scan without the admin having
 * to look back at the screen.
 *
 * Android browsers have the Vibration API. Safari never shipped it, so iOS
 * gets the only hook it does offer: since iOS 18, toggling an
 * `<input type="checkbox" switch>` plays the system haptic, and clicking its
 * label toggles it. The switch is created off-screen once and reused.
 * Anywhere neither exists (desktop, older iOS) this is a silent no-op.
 */
let iosSwitchLabel: HTMLLabelElement | null = null

export function hapticTick() {
  try {
    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate(40)
      return
    }
    if (!iosSwitchLabel) {
      const label = document.createElement('label')
      label.setAttribute('aria-hidden', 'true')
      label.style.cssText = 'position:fixed;width:0;height:0;overflow:hidden;opacity:0;pointer-events:none'
      const input = document.createElement('input')
      input.type = 'checkbox'
      input.setAttribute('switch', '')
      input.tabIndex = -1
      label.appendChild(input)
      document.body.appendChild(label)
      iosSwitchLabel = label
    }
    iosSwitchLabel.click()
  } catch {
    // Haptics are a nicety; never let them break a scan.
  }
}
