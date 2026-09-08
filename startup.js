/* Keep the game usable while the optional puzzle library downloads. */
main();
document.getElementById('startGameButton').disabled = false;
document.getElementById('customSetupButton').disabled = false;

function loadPuzzleLibrary(){
 const actions = document.getElementById('menuMateActions');
 actions.textContent = 'Loading puzzles…';
 const script = document.createElement('script');
 script.src = './mate_search/mate_starting_states.js?v=20260907b';
 script.async = true;
 script.onload = () => {
  if(Array.isArray(window.MATE_STARTING_STATES)) renderMatePuzzleControls();
  else script.onerror();
 };
 script.onerror = () => {
  script.remove();
  actions.textContent = 'Puzzles could not be loaded. ';
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.textContent = 'Retry';
  retry.onclick = loadPuzzleLibrary;
  actions.appendChild(retry);
 };
 document.head.appendChild(script);
}
// Allow the menu to paint before starting optional library work.
requestAnimationFrame(() => setTimeout(loadPuzzleLibrary, 0));
