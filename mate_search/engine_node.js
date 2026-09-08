const fs = require('node:fs');
const path = require('node:path');
// Compile in a normal V8 context, matching browser execution speed.
module.exports = new Function(fs.readFileSync(path.join(__dirname, '../main.js'), 'utf8') +
 '\nreturn {move_dictionary, createFastSearch, fastGenerateLegalMoves, fastDecodeMove, fastMakeMove, fastUnmakeMove, fastTerminalScore, ensureFastSearchTables, getLegalMoves, doMove, precomputeOnBoardMoves};')();
