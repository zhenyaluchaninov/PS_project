// DOM Entrypoint
document.addEventListener("DOMContentLoaded", onLoadNotFound);


function onLoadNotFound() {
  var body = document.getElementById("404");
  if (body == null) {
  return;
  }

  // console.log("404 loaded");
  var element = document.getElementById('txtLost');

  var typewriter = new Typewriter(element, {
  loop: false,
  delay: 80,
  });

  typewriter.pauseFor(2500)
  .typeString('...om du inte hittar det du söker, ')
  .pauseFor(500)
  .typeString('får du leta någon annanstans')
  .pauseFor(200)
  .typeString('.')
  .pauseFor(200)
  .typeString('.')
  .pauseFor(200)
  .typeString('.')
  .pauseFor(200)
  .typeString('')
  .pauseFor(2500)
  .start();

}
