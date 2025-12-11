// DOM Entrypoint
document.addEventListener("DOMContentLoaded", onLoadIndex);

function onLoadIndex() {
  startTypewriter();
}

function startTypewriter() {
  var element = document.getElementById('txtIntro');
  if (element == null) return;

  var typewriter = new Typewriter(element, {
  loop: true,
  delay: 80,
  });

  typewriter.pauseFor(2500)
  .typeString('Ett pedagogiskt verktyg som gör det enkelt')
  .pauseFor(300)
  .deleteChars(6)
  .typeString('roligt')
  .pauseFor(200)
  .typeString(' att skapa textbaserade äventyr!')
  .pauseFor(2500)
  .start();
}