importScripts("../main.js?v=20260530-mate-search-opts");

const MS_TOTAL_CONFIGS = 6041280;
const MS_CONFIGS_PER_NEUTRAL = 188790;
const MS_STARTER_PAIR_COUNT = 465;
const MS_OPPONENT_PAIR_COUNT = 406;
const MS_MAX_SCORE = 1000000;
const MS_MATE_THRESHOLD = 900000;
const MS_TT_BITS = 18;
const MS_TT_SIZE = 1 << MS_TT_BITS;
const MS_TT_BUCKET_SIZE = 2;
const MS_TT_BUCKET_MASK = (MS_TT_SIZE / MS_TT_BUCKET_SIZE) - 1;
const MS_BATCH_CONFIGS = 250;
const MS_BATCH_MATES = 32;
const MS_BATCH_MS = 250;
const MS_NULL_TT = {stats: null};

let msShouldStop = false;
let msGeneration = 0;
let msSharedMemory = null;
let msSharedTT = null;
let msPairFirst31 = null;
let msPairSecond31 = null;
let msPairFirst29 = null;
let msPairSecond29 = null;
let msMirrorCard = null;

function msTwoDigit(value){
	return value < 10 ? "0" + value : String(value);
}

function msCardName(card){
	const entry = move_dictionary[msTwoDigit(card)];
	return entry ? entry.name : msTwoDigit(card);
}

function msCardStartColor(card){
	const entry = move_dictionary[msTwoDigit(card)];
	return entry ? entry.startColor : "R";
}

function msGameState(config){
	return "ppmpp" + "e".repeat(15) + "PPMPP"
		+ msTwoDigit(config.red0) + "-"
		+ msTwoDigit(config.red1) + "-"
		+ msTwoDigit(config.blue0) + "-"
		+ msTwoDigit(config.blue1) + "-"
		+ msTwoDigit(config.neutral) + "X"
		+ config.startingPlayer;
}

function msConfigId(config){
	return "R" + msTwoDigit(config.red0) + msTwoDigit(config.red1)
		+ "-B" + msTwoDigit(config.blue0) + msTwoDigit(config.blue1)
		+ "-N" + msTwoDigit(config.neutral)
		+ "-" + config.startingPlayer;
}

function msIsMateForStartingPlayer(score, startingPlayer){
	if(Math.abs(score) < MS_MATE_THRESHOLD) return false;
	return (startingPlayer == "R" && score > 0) || (startingPlayer == "B" && score < 0);
}

function msSquareCoord(square){
	return String.fromCharCode("A".charCodeAt(0) + (square % 5)) + (Math.floor(square / 5) + 1);
}

function msMirrorSquare(square){
	return Math.floor(square / 5) * 5 + (4 - (square % 5));
}

function msDescribeMove(search, move){
	if(!move) return {};
	const decoded = fastDecodeMove(search, move);
	const card = Number(decoded.cardID);
	return {
		color: decoded.color,
		card: msCardName(card),
		card_id: msTwoDigit(card),
		from: decoded.startLocation,
		to: decoded.targetLocation,
		from_coord: msSquareCoord(decoded.startLocation),
		to_coord: msSquareCoord(decoded.targetLocation)
	};
}

function msMirrorMoveDescription(move){
	if(!move || !move.card_id) return {};
	const mirroredCard = msMirrorCard[Number(move.card_id)];
	const from = msMirrorSquare(move.from);
	const to = msMirrorSquare(move.to);
	return {
		color: move.color,
		card: msCardName(mirroredCard),
		card_id: msTwoDigit(mirroredCard),
		from,
		to,
		from_coord: msSquareCoord(from),
		to_coord: msSquareCoord(to)
	};
}

function msCreateSearch(config, startedAt){
	const search = createFastStartingSearchFromCards(config.red0, config.red1, config.blue0, config.blue1, config.neutral, config.startingPlayer, MS_NULL_TT, msSharedMemory, startedAt);
	search.maxThinkingTime = null;
	search.mateOnly = true;
	return search;
}

function msInitTables(){
	if(msSharedTT) return;
	ensureFastSearchTables();
	msSharedMemory = createFastSearchMemory();
	msSharedMemory.mateOnly = true;
	msSharedTT = {
		generation: new Uint32Array(MS_TT_SIZE),
		hashA: new Uint32Array(MS_TT_SIZE),
		hashB: new Uint32Array(MS_TT_SIZE),
		depth: new Int8Array(MS_TT_SIZE),
		score: new Int32Array(MS_TT_SIZE),
		flag: new Int8Array(MS_TT_SIZE),
		move: new Uint16Array(MS_TT_SIZE)
	};
	msPairFirst31 = msBuildPairPositions(31, 0);
	msPairSecond31 = msBuildPairPositions(31, 1);
	msPairFirst29 = msBuildPairPositions(29, 0);
	msPairSecond29 = msBuildPairPositions(29, 1);
	msMirrorCard = msBuildMirrorCardMap();
}

function msBuildPairPositions(size, part){
	const count = size * (size - 1) / 2;
	const output = new Uint8Array(count);
	let index = 0;
	for(let first=0;first<size-1;first++){
		for(let second=first+1;second<size;second++){
			output[index] = part == 0 ? first : second;
			index += 1;
		}
	}
	return output;
}

function msMoveSignature(rawMove){
	let f = 0;
	let b = 0;
	let l = 0;
	let r = 0;
	for(let i=0;i<rawMove.length;i++){
		const char = rawMove[i];
		if(char == "f") f += 1;
		else if(char == "b") b += 1;
		else if(char == "l") l += 1;
		else if(char == "r") r += 1;
	}
	return f + "," + b + "," + l + "," + r;
}

function msMirrorRawMove(rawMove){
	let output = "";
	for(let i=0;i<rawMove.length;i++){
		const char = rawMove[i];
		output += char == "l" ? "r" : (char == "r" ? "l" : char);
	}
	return output;
}

function msCardSignature(moves){
	return moves.map(msMoveSignature).sort().join("|");
}

function msBuildMirrorCardMap(){
	const signatures = new Map();
	for(let card=0;card<32;card++){
		const id = msTwoDigit(card);
		const entry = move_dictionary[id];
		signatures.set(entry.startColor + "|" + msCardSignature(entry.moves), card);
	}
	const output = new Uint8Array(32);
	for(let card=0;card<32;card++){
		const id = msTwoDigit(card);
		const entry = move_dictionary[id];
		const mirroredMoves = entry.moves.map(msMirrorRawMove);
		const mirroredCard = signatures.get(entry.startColor + "|" + msCardSignature(mirroredMoves));
		output[card] = mirroredCard === undefined ? card : mirroredCard;
	}
	return output;
}

function msStarterCard(neutral, position){
	return position < neutral ? position : position + 1;
}

function msNthRemainingCard(neutral, firstStarter, secondStarter, position){
	let seen = 0;
	for(let card=0;card<32;card++){
		if(card == neutral || card == firstStarter || card == secondStarter) continue;
		if(seen == position) return card;
		seen += 1;
	}
	return 0;
}

function msPositionWithoutCard(card, excluded){
	return card < excluded ? card : card - 1;
}

function msPositionWithoutCards(card, excludedA, excludedB, excludedC){
	let position = card;
	if(excludedA < card) position -= 1;
	if(excludedB < card) position -= 1;
	if(excludedC < card) position -= 1;
	return position;
}

function msPairIndexFromPositions(first, second, size){
	return first * (2 * size - first - 1) / 2 + (second - first - 1);
}

function msFillConfigAtIndex(index, config){
	const neutral = Math.floor(index / MS_CONFIGS_PER_NEUTRAL);
	const neutralOffset = index - neutral * MS_CONFIGS_PER_NEUTRAL;
	const starterPairIndex = Math.floor(neutralOffset / MS_OPPONENT_PAIR_COUNT);
	const opponentPairIndex = neutralOffset - starterPairIndex * MS_OPPONENT_PAIR_COUNT;
	const starterFirst = msStarterCard(neutral, msPairFirst31[starterPairIndex]);
	const starterSecond = msStarterCard(neutral, msPairSecond31[starterPairIndex]);
	const opponentFirst = msNthRemainingCard(neutral, starterFirst, starterSecond, msPairFirst29[opponentPairIndex]);
	const opponentSecond = msNthRemainingCard(neutral, starterFirst, starterSecond, msPairSecond29[opponentPairIndex]);
	const startingPlayer = msCardStartColor(neutral);
	config.index = index;
	config.neutral = neutral;
	config.startingPlayer = startingPlayer;
	if(startingPlayer == "R"){
		config.red0 = starterFirst;
		config.red1 = starterSecond;
		config.blue0 = opponentFirst;
		config.blue1 = opponentSecond;
	} else {
		config.red0 = opponentFirst;
		config.red1 = opponentSecond;
		config.blue0 = starterFirst;
		config.blue1 = starterSecond;
	}
	return config;
}

function msConfigIndex(config){
	const neutral = config.neutral;
	const startingPlayer = msCardStartColor(neutral);
	const starter0 = startingPlayer == "R" ? config.red0 : config.blue0;
	const starter1 = startingPlayer == "R" ? config.red1 : config.blue1;
	const opponent0 = startingPlayer == "R" ? config.blue0 : config.red0;
	const opponent1 = startingPlayer == "R" ? config.blue1 : config.red1;
	const starterFirst = Math.min(starter0, starter1);
	const starterSecond = Math.max(starter0, starter1);
	const opponentFirst = Math.min(opponent0, opponent1);
	const opponentSecond = Math.max(opponent0, opponent1);
	const starterPos0 = msPositionWithoutCard(starterFirst, neutral);
	const starterPos1 = msPositionWithoutCard(starterSecond, neutral);
	const starterPairIndex = msPairIndexFromPositions(starterPos0, starterPos1, 31);
	const opponentPos0 = msPositionWithoutCards(opponentFirst, neutral, starterFirst, starterSecond);
	const opponentPos1 = msPositionWithoutCards(opponentSecond, neutral, starterFirst, starterSecond);
	const opponentPairIndex = msPairIndexFromPositions(opponentPos0, opponentPos1, 29);
	return neutral * MS_CONFIGS_PER_NEUTRAL + starterPairIndex * MS_OPPONENT_PAIR_COUNT + opponentPairIndex;
}

function msFillMirrorConfig(config, mirrorConfig){
	const redMirror0 = msMirrorCard[config.red0];
	const redMirror1 = msMirrorCard[config.red1];
	const blueMirror0 = msMirrorCard[config.blue0];
	const blueMirror1 = msMirrorCard[config.blue1];
	mirrorConfig.red0 = redMirror0 <= redMirror1 ? redMirror0 : redMirror1;
	mirrorConfig.red1 = redMirror0 <= redMirror1 ? redMirror1 : redMirror0;
	mirrorConfig.blue0 = blueMirror0 <= blueMirror1 ? blueMirror0 : blueMirror1;
	mirrorConfig.blue1 = blueMirror0 <= blueMirror1 ? blueMirror1 : blueMirror0;
	mirrorConfig.neutral = msMirrorCard[config.neutral];
	mirrorConfig.startingPlayer = msCardStartColor(mirrorConfig.neutral);
	mirrorConfig.index = msConfigIndex(mirrorConfig);
	return mirrorConfig;
}

function msNextGeneration(){
	msGeneration = (msGeneration + 1) >>> 0;
	if(msGeneration == 0){
		msSharedTT.generation.fill(0);
		msGeneration = 1;
	}
	return msGeneration;
}

function msTTIndex(search){
	return ((search.hashA ^ Math.imul(search.hashB, 0x9e3779b1)) & MS_TT_BUCKET_MASK) * MS_TT_BUCKET_SIZE;
}

function msTTProbeIndex(tt, search, generation){
	const index = msTTIndex(search);
	for(let offset=0;offset<MS_TT_BUCKET_SIZE;offset++){
		const entryIndex = index + offset;
		if(tt.generation[entryIndex] == generation && tt.hashA[entryIndex] == search.hashA && tt.hashB[entryIndex] == search.hashB){
			return entryIndex;
		}
	}
	return -1;
}

function msTTStore(tt, search, generation, depthRemaining, score, flag, move, ply){
	const index = msTTIndex(search);
	let replaceIndex = index;
	let shallowestDepth = tt.depth[index];
	for(let offset=0;offset<MS_TT_BUCKET_SIZE;offset++){
		const entryIndex = index + offset;
		if(tt.generation[entryIndex] != generation){
			replaceIndex = entryIndex;
			break;
		}
		if(tt.hashA[entryIndex] == search.hashA && tt.hashB[entryIndex] == search.hashB){
			if(tt.depth[entryIndex] > depthRemaining) return;
			replaceIndex = entryIndex;
			break;
		}
		if(tt.depth[entryIndex] < shallowestDepth){
			shallowestDepth = tt.depth[entryIndex];
			replaceIndex = entryIndex;
		}
	}
	tt.generation[replaceIndex] = generation;
	tt.hashA[replaceIndex] = search.hashA;
	tt.hashB[replaceIndex] = search.hashB;
	tt.depth[replaceIndex] = depthRemaining;
	tt.score[replaceIndex] = fastNormalizeTTScoreForStore(score, ply);
	tt.flag[replaceIndex] = flag;
	tt.move[replaceIndex] = move;
}

function msMateAlphaBeta(search, depthRemaining, alpha, beta, ply, tt, generation){
	GreatestDepthSearched = Math.max(GreatestDepthSearched, ply);
	const terminalScore = fastTerminalScore(search, ply);
	if(terminalScore) return terminalScore;
	if(depthRemaining == 0) return 0;

	const alphaOrig = alpha;
	const betaOrig = beta;
	const ttIndex = msTTProbeIndex(tt, search, generation);
	let ttMove = 0;
	if(ttIndex >= 0){
		ttMove = tt.move[ttIndex];
		if(tt.depth[ttIndex] >= depthRemaining){
			const ttScore = fastNormalizeTTScoreForProbe(tt.score[ttIndex], ply);
			const ttFlag = tt.flag[ttIndex];
			if(ttFlag == TT_EXACT) return ttScore;
			if(ttFlag == TT_LOWER) alpha = Math.max(alpha, ttScore);
			else if(ttFlag == TT_UPPER) beta = Math.min(beta, ttScore);
			if(alpha >= beta) return ttScore;
		}
	}

	const moveCount = fastGenerateLegalMoves(search, ply);
	const legalMoves = search.moveBuffers[ply];
	if(moveCount == 0) return 0;
	msOrderMateMoves(search, legalMoves, moveCount, ttMove, ply);

	const maximizingPlayer = search.turn == FAST_RED;
	let bestMove = legalMoves[0];
	let bestScore = maximizingPlayer ? -MS_MAX_SCORE - 1 : MS_MAX_SCORE + 1;
	for(let moveIndex=0;moveIndex<moveCount;moveIndex++){
		const move = legalMoves[moveIndex];
		AImovesEvaluated += 1;
		let score = fastTerminalMoveScore(search, move, ply + 1);
		if(!score){
			fastMakeMove(search, move, ply);
			score = msMateAlphaBeta(search, depthRemaining - 1, alpha, beta, ply + 1, tt, generation);
			fastUnmakeMove(search, ply);
		}
		if((maximizingPlayer && score > bestScore) || (!maximizingPlayer && score < bestScore)){
			bestScore = score;
			bestMove = move;
		}
		if(maximizingPlayer) alpha = Math.max(alpha, bestScore);
		else beta = Math.min(beta, bestScore);
		if(alpha >= beta){
			fastRecordCutoff(search, move, ply, depthRemaining);
			break;
		}
	}

	let flag = TT_EXACT;
	if(bestScore <= alphaOrig) flag = TT_UPPER;
	else if(bestScore >= betaOrig) flag = TT_LOWER;
	msTTStore(tt, search, generation, depthRemaining, bestScore, flag, bestMove, ply);
	if(ply == 0) search.rootMove = bestMove;
	return bestScore;
}

function msOrderMateMoves(search, moves, moveCount, ttMove, ply){
	const scores = search.moveScoreBuffers[ply] || (search.moveScoreBuffers[ply] = new Int32Array(FAST_MAX_MOVES));
	for(let i=0;i<moveCount;i++){
		const move = moves[i];
		const score = msMateMoveHeuristic(search, move, ttMove, ply);
		let j = i - 1;
		while(j >= 0 && scores[j] < score){
			moves[j + 1] = moves[j];
			scores[j + 1] = scores[j];
			j -= 1;
		}
		moves[j + 1] = move;
		scores[j + 1] = score;
	}
}

function msMateMoveHeuristic(search, move, ttMove, ply){
	if(move == ttMove) return 3000000;
	const terminalScore = fastTerminalMoveScore(search, move, ply + 1);
	if(terminalScore){
		if((search.turn == FAST_RED && terminalScore > 0) || (search.turn == FAST_BLUE && terminalScore < 0)) return 2500000;
		return -2500000;
	}
	const startBit = FastMoveStartBitTable[move];
	const targetBit = FastMoveTargetBitTable[move];
	let score = 0;
	if(search.occupiedMask & targetBit) score += (search.masterMask & targetBit) ? 500000 : 50000;
	if(search.masterMask & startBit){
		const target = FastMoveTargetTable[move];
		if((search.redMask & startBit) && target == 2) score += 1000000;
		else if((search.redMask & startBit) == 0 && target == 22) score += 1000000;
		const row = Math.floor(target / 5);
		score += (search.redMask & startBit) ? (4 - row) * 2000 : row * 2000;
	}
	if(search.killerOne[ply] == move) score += 12000;
	else if(search.killerTwo[ply] == move) score += 10000;
	const colorIndex = search.turn == FAST_RED ? 0 : 1;
	score += search.history[colorIndex * FAST_HISTORY_SIZE + move];
	return score;
}

function msSearchRoot(config, maxDepth, tt, generation, startedAt){
	const search = msCreateSearch(config, startedAt);
	const score = msMateAlphaBeta(search, maxDepth, -MS_MAX_SCORE - 1, MS_MAX_SCORE + 1, 0, tt, generation);
	return {
		score,
		move: search.rootMove || 0,
		search
	};
}

function msExtractPrincipalVariation(config, depth, tt, generation){
	const search = msCreateSearch(config, getNow());
	const line = [];
	let madeMoves = 0;
	for(let ply=0;ply<depth;ply++){
		if(fastTerminalScore(search, ply)) break;
		const ttIndex = msTTProbeIndex(tt, search, generation);
		if(ttIndex < 0) break;
		const move = tt.move[ttIndex];
		if(!move) break;
		const moveCount = fastGenerateLegalMoves(search, ply);
		const legalMoves = search.moveBuffers[ply];
		if(!fastMoveListContains(legalMoves, moveCount, move)) break;
		line.push(msDescribeMove(search, move));
		if(fastTerminalMoveScore(search, move, ply + 1)) break;
		fastMakeMove(search, move, ply);
		madeMoves += 1;
	}
	for(let ply=madeMoves-1;ply>=0;ply--){
		fastUnmakeMove(search, ply);
	}
	return line;
}

function msBuildMateResult(config, maxDepth, nodes, elapsedMs, score, rootMove, search, tt, generation){
	const matePlies = MS_MAX_SCORE - Math.abs(score);
	const result = {
		config_index: config.index,
		config_id: msConfigId(config),
		game_state: msGameState(config),
		starting_player: config.startingPlayer,
		red_cards: [msCardName(config.red0), msCardName(config.red1)],
		blue_cards: [msCardName(config.blue0), msCardName(config.blue1)],
		neutral: msCardName(config.neutral),
		max_depth: maxDepth,
		nodes,
		elapsed_ms: elapsedMs,
		mate_found: true,
		mate_plies: matePlies,
		mate_moves: Math.ceil(matePlies / 2),
		search_depth: maxDepth,
		first_move: msDescribeMove(search, rootMove),
		principal_variation: msExtractPrincipalVariation(config, matePlies, tt, generation)
	};
	return result;
}

function msMirrorMateResult(result, mirrorConfig){
	const mirrorResult = {
		config_index: mirrorConfig.index,
		config_id: msConfigId(mirrorConfig),
		game_state: msGameState(mirrorConfig),
		starting_player: mirrorConfig.startingPlayer,
		red_cards: [msCardName(mirrorConfig.red0), msCardName(mirrorConfig.red1)],
		blue_cards: [msCardName(mirrorConfig.blue0), msCardName(mirrorConfig.blue1)],
		neutral: msCardName(mirrorConfig.neutral),
		max_depth: result.max_depth,
		nodes: 0,
		elapsed_ms: 0,
		mate_found: true,
		mate_plies: result.mate_plies,
		mate_moves: result.mate_moves,
		search_depth: result.search_depth,
		first_move: msMirrorMoveDescription(result.first_move),
		principal_variation: result.principal_variation.map(msMirrorMoveDescription),
		mirrored_from: result.config_id
	};
	return mirrorResult;
}

function msSolveConfig(config, mirrorConfig, maxDepth){
	const startedAt = getNow();
	const generation = msNextGeneration();
	AImovesEvaluated = 0;
	GreatestDepthSearched = 0;
	const root = msSearchRoot(config, maxDepth, msSharedTT, generation, startedAt);
	const elapsedMs = getNow() - startedAt;
	const output = {
		nodes: AImovesEvaluated,
		elapsed_ms: elapsedMs,
		mates: []
	};
	if(msIsMateForStartingPlayer(root.score, config.startingPlayer)){
		const result = msBuildMateResult(config, maxDepth, output.nodes, elapsedMs, root.score, root.move, root.search, msSharedTT, generation);
		output.mates.push(result);
		if(mirrorConfig && mirrorConfig.index != config.index){
			output.mates.push(msMirrorMateResult(result, mirrorConfig));
		}
	}
	return output;
}

function msCreateBatch(startIndex){
	return {
		type: "batch",
		nextIndex: startIndex,
		configs: 0,
		searched_configs: 0,
		skipped_configs: 0,
		nodes: 0,
		elapsed_ms: 0,
		mates: []
	};
}

function msFlushBatch(batch, force){
	if(!force && batch.configs < MS_BATCH_CONFIGS && batch.mates.length < MS_BATCH_MATES && batch.elapsed_ms < MS_BATCH_MS) return false;
	if(batch.configs == 0 && batch.mates.length == 0) return false;
	postMessage(batch);
	return true;
}

self.onmessage = function(event){
	const message = event.data;
	if(message.type == "stop"){
		msShouldStop = true;
		return;
	}
	if(message.type != "start") return;

	msInitTables();
	msShouldStop = false;
	const maxDepth = message.maxDepth || 12;
	const startIndex = Math.max(0, Number(message.nextIndex) || 0);
	const config = {};
	const mirrorConfig = {};
	let batch = msCreateBatch(startIndex);
	let batchStartedAt = getNow();

	for(let index=startIndex;index<MS_TOTAL_CONFIGS;index++){
		if(msShouldStop) break;
		msFillConfigAtIndex(index, config);
		msFillMirrorConfig(config, mirrorConfig);
		batch.configs += 1;
		batch.nextIndex = index + 1;
		if(mirrorConfig.index < index && mirrorConfig.index >= startIndex){
			batch.skipped_configs += 1;
		} else {
			const result = msSolveConfig(config, mirrorConfig.index > index ? mirrorConfig : null, maxDepth);
			batch.searched_configs += 1;
			batch.nodes += result.nodes;
			for(let i=0;i<result.mates.length;i++){
				batch.mates.push(result.mates[i]);
			}
		}
		batch.elapsed_ms = getNow() - batchStartedAt;
		if(msFlushBatch(batch, false)){
			batch = msCreateBatch(index + 1);
			batchStartedAt = getNow();
		}
	}
	msFlushBatch(batch, true);
	postMessage({type: msShouldStop ? "paused" : "done", index: batch.nextIndex});
};
