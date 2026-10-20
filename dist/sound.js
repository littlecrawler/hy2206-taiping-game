(function (root) {
  "use strict";
  function createPlayer() {
    let enabled = false;
    // Keep the preference and event hooks for future audio; this build is silent.
    return {
      isEnabled: function () { return enabled; },
      setEnabled: function (value) { enabled = Boolean(value); return enabled; },
      play: function () { return Promise.resolve(false); }
    };
  }
  if (typeof module !== "undefined" && module.exports) module.exports = { createPlayer: createPlayer };
  else root.TaipingSound = createPlayer();
})(typeof globalThis !== "undefined" ? globalThis : this);
