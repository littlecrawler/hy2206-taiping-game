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
    if (event === "test") return [{ clip: "move", seconds: 1.2 }, { clip: "battle", seconds: 3 }, { clip: "capture" }];
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
    // Enabled by default, but playback only starts from a game action or sound test.
    let enabled = true, audio = null, generation = 0, cutoff = null, append = null, errorHandler = function () {};
    function clearClip() {
      clearTimeout(cutoff); cutoff = null;
      if (!audio) return;
      audio.onended = null; audio.onerror = null;
      audio.pause();
      try { audio.currentTime = 0; } catch (_) { /* The media may not have loaded yet. */ }
    }
    function stop() { generation++; append = null; clearClip(); }
    function play(event, details) {
      const sequence = sequenceFor(event, details);
      if (!enabled || !sequence.length) return Promise.resolve(false);
      // Changing teams must not cut off the action or its capture announcement.
      if (event === "turn" && append) { append(sequence); return Promise.resolve(true); }
      stop();
      const current = generation;
      let index = 0;
      append = function (steps) { sequence.push.apply(sequence, steps); };
      function failed(error) {
        if (current === generation) { stop(); errorHandler(error); }
        return false;
      }
      function next() {
        if (!enabled || current !== generation) return Promise.resolve(false);
        clearClip();
        const step = sequence[index++];
        if (!step) { append = null; return Promise.resolve(true); }
        let finished = false;
        function advance() {
          if (finished || current !== generation) return;
          finished = true;
          void next();
        }
        function clipFailed(error) {
          if (finished || current !== generation) return false;
          finished = true;
          return failed(error);
        }
        try {
          if (!audio) audio = makeAudio();
          audio.preload = "auto"; audio.volume = 1; audio.muted = false; audio.loop = false;
          audio.src = assets[step.clip];
          audio.onended = advance;
          audio.onerror = function () { clipFailed(audio.error); };
          // Start in the click handler; reuse this media element for queued clips.
          return Promise.resolve(audio.play()).then(function () {
            if (!enabled || current !== generation || finished) return false;
            if (step.seconds) cutoff = setTimeout(advance, step.seconds * 1000);
            return true;
          }).catch(clipFailed);
        } catch (error) { return Promise.resolve(clipFailed(error)); }
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
