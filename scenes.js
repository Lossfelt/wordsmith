// Skjermveksling – minimal scene-styring. Hver topp-skjerm er en `.scene`
// (#scene-search = letefasen, #scene-combat = kamp). showScene(name) viser én
// scene og skjuler resten via `hidden`-attributtet. Eksponeres på window så
// combat.js (og senere letefase.js) kan veksle scene.

function showScene(name) {
  const target = 'scene-' + name;
  document.querySelectorAll('.scene').forEach(sceneEl => {
    sceneEl.hidden = sceneEl.id !== target;
  });
}

window.showScene = showScene;
