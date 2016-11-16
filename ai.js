var op = 0;
var parenthesis = 0;
var mutation_chance = 0.25; // MIN: >0, MAX: 1.
var max_genes = 8; // So that AI doesn't have access to genes #8+

var ai = [];
var inputs = [["+", "-", "*", "/", "<", "<=", ">=", ">", "&&", "||"], ["(", ")"], ["ai[__EXENOW(id)__][__EXENOW(Math.floor(Math.random() * max_genes))__]", "getRandAIInRange(__EXENOW(id)__)[__EXENOW(Math.floor(Math.random() * max_genes))__]"]];
var changing_inputs = ["ai[", "getRandAIInRange("]; // Used in game.js to speed up evolution, the first parts of inputs[2] before the '__EXENOW(...)__'

function randomBetween(min, max) {
	return Math.floor(Math.random()*(max-min+1)+min);
}

function spliceStr(str, index, pos) {
	return str.slice(0, index) + str.slice(pos);
}

function findInput(id) {
	var randParenthesis = Math.round(Math.random());
	
	if(op % 2) {
		var randOp = Math.floor(Math.random() * (inputs[0].length));
		
		if(parenthesis > 0 && randParenthesis == inputs[1].indexOf(")") && Math.round(Math.random())) {
			ai[id][8].push(inputs[1][randParenthesis]); // [8] = condition gene
			parenthesis--;
			op--;
		} else {
			ai[id][8].push(inputs[0][randOp]);
		}
	} else {
		var randVar = Math.floor(Math.random() * (inputs[2].length));
		
		if(randParenthesis == inputs[1].indexOf("(") && Math.round(Math.random())) {
			ai[id][8].push(inputs[1][randParenthesis]);
			parenthesis++;
			op--;
		} else {
			if(Math.round(Math.random())) {
				var randNumber = Math.floor(Math.random() * 100)
				ai[id][8].push(randNumber);
			} else {
				var raw_code = "";
				raw_code = inputs[2][randVar];
				while(raw_code.indexOf("__EXENOW(") != -1) {
					var index = raw_code.indexOf("__EXENOW(");
					var pos = index + 9; // 9 = "__EXENOW(".length
					
					raw_code = spliceStr(raw_code, index, pos); // Removes "__EXENOW("
					pos -= 9;
					
					var codeToExec = "";
					while(!(raw_code[pos] == "_" && raw_code[pos + 1] == "_")) {
						codeToExec += raw_code[pos];
						pos++;
					}
					codeToExec = codeToExec.slice(0, codeToExec.length - 1); // Removes ")" from code to execute
					pos--;
					
					raw_code = spliceStr(raw_code, pos, pos + 3); // Removes remaining ")__"
					
					try {
						var new_code = new Function("id", "return " + codeToExec);
						var new_code_ret = new_code(id);
						raw_code = raw_code.replace(codeToExec, new_code_ret);
					} catch(e) {
						throw e;
					}
				}
				
				ai[id][8].push(raw_code);
			}
		}
	}
}

function genRandCond(id) {
	ai[id].push([]); // Add base for condition gene
	ai[id].push(randomBetween(2, 16)); // Add base for the gene controlling the length of the condition gene
	while(ai[id][9] % 2 == 0) {
		ai[id][9] = randomBetween(2, 16);
	}
	
	if(Math.round(Math.random())) {
		ai[id][9] += 2; // [9] = where the length of condition gene is stored
	} else if(ai[id][9] > 2) {
		ai[id][9] -= 2;
	}
	
	for(i = 0; i < ai[id][9]; i++) {
		findInput(id);
		op++;
	}
	
	op = 0;
	
	while(parenthesis > 0) {
		ai[id][8].push(")"); // [8] = where the condition gene is stored
		parenthesis--;
	}
}

function combineConditions(id, cond1, cond2, cond_len1, cond_len2) {
	ai[id].splice(8, 0, []);
	do {
		ai[id].splice(9, 0, randomBetween(Math.min(cond_len1, cond_len2) - 1, Math.max(cond_len1, cond_len2) + 1));
	} while(ai[id][9] % 2 == 0);
	
	for(var i = 0; i < ai[id][9]; i++) {
		if(i < cond1.length && (i >= cond2.length || Math.round(Math.random()))) {
			ai[id][8].push(cond1[i]);
		} else {
			ai[id][8].push(cond2[i]);
		}
	}
}

function genRandGenes() {
	var width = randomBetween(19, 31);
	var height = width;
	var placeAvailable = ai.indexOf("dead");
	
	if(placeAvailable == -1) {
		ai.push([Math.floor(Math.random() * 256), Math.floor(Math.random() * 256), Math.floor(Math.random() * 256), Math.floor(Math.random() * (600 - width * 1.5) + width / 2), Math.floor(Math.random() * (600 - height * 1.5) + height / 2), 1.1, 1.1, Math.floor(Math.random() * 360)]);
		genRandCond(ai.length - 1);
		
		ai[ai.length - 1].push([width, height]);
	} else {
		ai[placeAvailable] = [Math.floor(Math.random() * 256), Math.floor(Math.random() * 256), Math.floor(Math.random() * 256), Math.floor(Math.random() * (600 - width * 1.5) + width / 2), Math.floor(Math.random() * (600 - height * 1.5) + height / 2), 1.1, 1.1, Math.floor(Math.random() * 360)];
		genRandCond(placeAvailable);
		
		ai[placeAvailable].push([width, height]);
	}
}

function combineGenes(par1, par2) {
	var placeAvailable = ai.indexOf("dead");
	
	var width = randomBetween(19, 31);
	var height = width;
	
	if(placeAvailable == -1) {
		ai.push([]);
		
		for(var i = 0; i < par1.length; i++) {
			if(i == 5 || i == 6) {
				ai[ai.length - 1].push(1.1);
			} else if(i == 4) {
				if(par1[4] < 300) {
					ai[ai.length - 1].push(par1[4] + randomBetween(75, 125));
				} else {
					ai[ai.length - 1].push(par1[4] - randomBetween(75, 125));
				}
			} else if(i == 3) {
				if(ai[par1][3] < 300) {
					ai[ai.length - 1].push(par1[3] + randomBetween(75, 125));
				} else {
					ai[ai.length - 1].push(par1[3] - randomBetween(75, 125));
				}
			} else if(i == 8) {
				combineConditions(ai.length - 1, par1[8], par2[8], par1[9], par2[9]);
			} else if(typeof par1[i] === 'number' && i != 9) {
				ai[ai.length - 1].push(randomBetween(Math.min(par1[i], par2[i]) - 1, Math.max(par1[i], par2[i]) + 1));
			}
		}
		
		ai[ai.length - 1].push([width, height]);
		ai[ai.length - 1].push([par1[8], par2[8]]);
		
		for(var i = 0; i < ai[ai.length - 1].length; i++) {
			if(i != 5 && i != 6 && i != 9 && i != 11 && Math.floor(Math.random() * (1 / mutation_chance)) == 0) {
				if(typeof ai[ai.length - 1][i] === 'number') {
					if(Math.round(Math.random())) {
						ai[ai.length - 1][i] += 2;
					} else {
						ai[ai.length - 1][i] -= 2;
					}
				} else if(typeof ai[ai.length - 1][i] === 'string') {
					// WIP
				} else if(typeof ai[ai.length - 1][i] === 'object') {
					// WIP
				}
			}
		}
	} else {
		ai[placeAvailable] = [];
		
		for(var i = 0; i < par1.length; i++) {
			if(i == 5 || i == 6) {
				ai[placeAvailable].push(1.1);
			} else if(i == 4) {
				if(par1[4] < 300) {
					ai[placeAvailable].push(par1[4] + randomBetween(75, 125));
				} else {
					ai[placeAvailable].push(par1[4] - randomBetween(75, 125));
				}
			} else if(i == 3) {
				if(par1[3] < 300) {
					ai[placeAvailable].push(par1[3] + randomBetween(75, 125));
				} else {
					ai[placeAvailable].push(par1[3] - randomBetween(75, 125));
				}
			} else if(i == 8) {
				combineConditions(placeAvailable, par1[8], par2[8], par1[9], par2[9]);
			} else if(typeof ai[par1][i] === 'number' && i != 9) {
				ai[placeAvailable].push(randomBetween(Math.min(par1[i], par2[i]) - 1, Math.max(par1[i], par2[i]) + 1));
			}
		}
		
		ai[placeAvailable].push([width, height]);
		ai[placeAvailable].push([par1[8], par2[8]]);
		
		for(var i = 0; i < ai[placeAvailable].length; i++) {
			if(i != 5 && i != 6 && i != 9 && i != 11 && Math.floor(Math.random() * (1 / mutation_chance)) == 0) {
				if(typeof ai[placeAvailable][i] === 'number') {
					if(Math.round(Math.random())) {
						ai[placeAvailable][i] += 2;
					} else {
						ai[placeAvailable][i] -= 2;
					}
				} else if(typeof ai[placeAvailable][i] === 'string') {
					// WIP
				} else if(typeof ai[placeAvailable][i] === 'object') {
					// WIP
				}
			}
		}
	}
}
