(function (root) {
  "use strict";
  const files = {
    move: "assets/audio/soldiers-marching.mp3",
    battle: "assets/audio/sword-fast-fight.mp3",
    capture: "assets/audio/city-captured.mp3",
    loss: "assets/audio/city-lost.mp3",
    taipingVictory: "assets/audio/taiping-victory.mp3",
    qingVictory: "assets/audio/qing-victory.mp3",
    endgame: "assets/audio/endgame.mp3"
  };
  function ending(result) {
    return result.winner === "taiping" ? "taipingVictory" : result.winner === "qing" ? "qingVictory" : "endgame";
  }
  function sequenceFor(event, details) {
    details = details || {};
    if (event === "preview") return [{ clip: "move", seconds: 1.2 }];
    if (event === "move") {
      const sequence = [{ clip: "move", seconds: 2.5 }];
      if (details.result) sequence.push({ clip: ending(details.result) });
      else if (details.captured) sequence.push({ clip: "capture" });
      return sequence;
    }
    if (event === "claim") return [{ clip: "capture" }];
    if (event === "battle") {
      const sequence = [{ clip: "battle", seconds: 3 }];
      if (details.result) sequence.push({ clip: ending(details.result) });
      else if (details.battle && details.battle.outcome === "attacker") sequence.push({ clip: "capture" });
      return sequence;
    }
    if (event === "turn") {
      if (details.result) return [{ clip: ending(details.result) }];
      // A shared-screen game announces losses to the defending team on its next turn.
      const before = details.previousCities || {}, after = details.cities || {};
      const lost = Object.keys(before).some(function (id) {
        return before[id].owner === details.side && after[id] && after[id].owner !== details.side;
      });
      return lost ? [{ clip: "loss" }] : [];
    }
    return [];
  }
  function createPlayer(options) {
    options = options || {};
    const assets = options.assets || root.TAIPING_SOUND_ASSETS || files;
    const makeAudio = options.createAudio || function () {
      const element = new root.Audio();
      element.id = "game-audio"; element.hidden = true;
      root.document.body.appendChild(element);
      return element;
    };
    let enabled = false, audio = null, generation = 0, cutoff = null, errorHandler = function () {};
    function clearClip() {
      clearTimeout(cutoff); cutoff = null;
      if (!audio) return;
      audio.onended = null; audio.onerror = null;
      audio.pause();
      try { audio.currentTime = 0; } catch (_) { /* The media may not have loaded yet. */ }
    }
    function stop() { generation++; clearClip(); }
    function play(event, details) {
      const sequence = sequenceFor(event, details);
      if (!enabled || !sequence.length) return Promise.resolve(false);
      stop();
      const current = generation;
      let index = 0;
      function failed(error) {
        if (current === generation) { stop(); errorHandler(error); }
        return false;
      }
      function next() {
        if (!enabled || current !== generation) return Promise.resolve(false);
        clearClip();
        const step = sequence[index++];
        if (!step) return Promise.resolve(true);
        try {
          if (!audio) audio = makeAudio();
          audio.preload = "auto"; audio.volume = 1; audio.loop = false;
          audio.src = assets[step.clip];
          audio.onended = function () { void next(); };
          audio.onerror = function () { failed(audio.error); };
          // Start in the click handler; reuse this media element for queued clips.
          return Promise.resolve(audio.play()).then(function () {
            if (!enabled || current !== generation) return false;
            if (step.seconds) cutoff = setTimeout(function () { void next(); }, step.seconds * 1000);
            return true;
          }).catch(failed);
        } catch (error) { return Promise.resolve(failed(error)); }
      }
      return next();
    }
    return {
      isEnabled: function () { return enabled; },
      setEnabled: function (value) { enabled = Boolean(value); if (!enabled) stop(); return enabled; },
      setErrorHandler: function (handler) { errorHandler = handler; },
      stop: stop,
      play: play
    };
  }
  if (typeof module !== "undefined" && module.exports) module.exports = { createPlayer: createPlayer, files: files, sequenceFor: sequenceFor };
  else root.TaipingSound = createPlayer();
})(typeof globalThis !== "undefined" ? globalThis : this);
