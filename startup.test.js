const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('game initializes before optional puzzles, with recovery from failed downloads', () => {
 const elements = Object.fromEntries(['startGameButton','customSetupButton','menuMateActions'].map(id => [id,{disabled:true,appendChild(child){this.child=child;}}]));
 const scripts=[];
 let initialized=false, rendered=0, frame;
 const context={window:{},document:{getElementById:id=>elements[id],createElement:()=>({remove(){this.removed=true;}}),head:{appendChild:s=>scripts.push(s)}},main(){initialized=true;},renderMatePuzzleControls(){rendered++;},requestAnimationFrame(fn){frame=fn;},setTimeout(fn){fn();}};
 vm.runInNewContext(fs.readFileSync('startup.js','utf8'),context);
 assert.ok(initialized);
 assert.equal(elements.startGameButton.disabled,false);
 assert.equal(elements.customSetupButton.disabled,false);
 assert.equal(scripts.length,0,'first paint precedes the library request');
 frame();
 assert.equal(scripts.length,1);
 scripts[0].onerror();
 assert.match(elements.menuMateActions.textContent,/could not be loaded/);
 elements.menuMateActions.child.onclick();
 assert.equal(scripts.length,2);
 context.window.MATE_STARTING_STATES=[];
 scripts[1].onload();
 assert.equal(rendered,1);
});

test('HTML cannot call menu actions before initialization or block on puzzle data',()=>{
 const html=fs.readFileSync('index.html','utf8');
 assert.match(html,/id="startGameButton" disabled/);
 assert.match(html,/id="customSetupButton" disabled/);
 assert.doesNotMatch(html,/<script[^>]+src="[^\"]*mate_starting_states/);
 assert.ok(html.indexOf('main.js?')<html.indexOf('startup.js?'));
});
