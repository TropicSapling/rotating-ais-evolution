var gameLoop;
var time_alive_sorted = [];
var total_mass = 0;
var rand_spawn_chance = 0.1; // MIN: >0, MAX: 1.
var thisTickRand = Math.random();

////////////////////////////////    'time_alive' & 'ai' structures    ////////////////////////////////
////////                                                                                      ////////
////////                                  Check file 'ai.js'                                  ////////
////////                                                                                      ////////
//////////////////////////////////////////////////////////////////////////////////////////////////////

window.onerror = function(msg, url, line, column, error) {
	alert("An error has occurred. Check console for details.");
	
	if(error) {
		console.log("[!] " + msg + " in file " + url);
		console.log("Line: " + line + ", column: " + column);
		console.log("Stack Trace:");
		console.log(error.stack);
	} else {
		alert("[!] Error: " + msg + " in file " + url + "\n\nLine: " + line + ", column: " + column);
	}
	
	clearInterval(gameLoop);
}

function deepCopy(arr) { // Because JS hates me and is just that annoying
	var out = [];
	
	for (i = 0; i < arr.length; i++) {
		out.push(arr[i]);
	}
	
	return out;
}

function regenConditions(id) {
	console.log("REGEN:", deepCopy(ai[id]));
	ai[id].splice(8, 2); // NOTE: After this splice, [8] = old [10]
	if(ai[id][8]) {
		combineConditions(id, ai[id][8][0], ai[id][8][1]);
	} else {
		genRandConditions(id);
	}
}

function getCondGenes(conditions) {
	var processed_conditions = [];
	
	for(var cond = 0; cond < conditions.length; cond++) {
		processed_conditions.push([]);
		
		for(part = 0; part < conditions[cond].length; part++) {
			var code = conditions[cond][part];
			if(typeof code === 'object') {
				processed_conditions[cond].push(code[0]);
			} else {
				processed_conditions[cond].push(code);
			}
		}
	}
	
	return processed_conditions;
}

function checkConditions(id) {
	var condGenes = getCondGenes(ai[id][8]);
	
	try {
		var rotate = new Function("return " + condGenes[0].join(" "))();
		
		if(rotate == true) {
			ai[id][7] += 0.4;
			if(ai[id][7] >= 360) {
				ai[id][7] -= 360;
			}
		}
	} catch(e) {
		regenConditions(id);
		checkConditions(id);
	}
	
	try {
		var move = new Function("return " + condGenes[1].join(" "))();
		
		if(move == true) {
			ai[id][3] += Math.sin(ai[id][7]) * 3; // [3] = x-pos, [7] = rotation
			ai[id][4] += Math.cos(ai[id][7]) * 3; // [4] = y-pos
			
			if(ai[id][3] < 0) {
				ai[id][3] = 0;
			}
			
			if(ai[id][3] > 600 - ai[id][5]) {
				ai[id][3] = 600 - ai[id][5];
			}
			
			if(ai[id][4] < 0) {
				ai[id][4] = 0;
			}
			
			if(ai[id][4] > 600 - ai[id][6]) {
				ai[id][4] = 600 - ai[id][6];
			}
		}
	} catch(e) {
		regenConditions(id);
		checkConditions(id);
	}
}

function cleanAll() {
	for(i = 0; i < time_alive.length; i++) {
		if(!time_alive[i][2]) {
			var posInTop = 100;
			for(j = 0; j < time_alive_sorted.length; j++) {
				if(time_alive_sorted[j][0] == time_alive[i][0]) {
					posInTop = j;
					break;
				}
			}
			
			if(posInTop > 100) {
				time_alive.splice(i, 1);
				i--;
			}
		}
	}
}

function cleanup(i) {
	for(var j = 0; j < time_alive.length; j++) {
		if(time_alive[j][2] == i) {
			var posInTop = 100;
			for(var k = 0; k < time_alive_sorted.length; k++) {
				if(time_alive_sorted[k][2] == i) {
					posInTop = k;
					break;
				}
			}
			
			if(time_alive.length < 100 || posInTop < 100) {
				time_alive[j].splice(2, 1);
			} else {
				time_alive.splice(j, 1);
			}
			
			break;
		}
	}
}

function renderAIs(game) {
	var ai_copy = [];
	for(i = 0; i < ai.length; i++) {
		if(ai[i].length > 5) {
			ai_copy.push(ai[i][5] * ai[i][6]);
			if(ai[i][10] && typeof ai[i][10][0] === 'number') {
				total_mass += ai[i][10][0] * ai[i][10][1];
			} else {
				total_mass += ai[i][5] * ai[i][6];
			}
		}
	}
	
	ai_copy = ai_copy.sort(function(a,b){return a - b});
	
	var ai_sorted = [];
	for(i = 0; i < ai_copy.length; i++) {
		for(j = 0; j < ai.length; j++) {
			if(ai[j].length > 5 && ai[j][5] * ai[j][6] == ai_copy[i]) {
				ai_sorted.push(ai[j]);
			}
		}
	}
	
	var ai_sorted_old = deepCopy(ai_sorted);
	
	for(i = 0; i < ai_sorted.length; i++) {
		if(ai_sorted[i][10] && ai_sorted[i][10][0] === "dying") {
			if(ai_sorted[i][5] > 1 && ai_sorted[i][6] > 1) {
				ai_sorted[i][10][1] = ai_sorted[i][10][1] * 1.2;
				var change = ai_sorted[i][10][1];
				
				ai_sorted[i][5] -= change;
				ai_sorted[i][6] -= change;
				
				ai_sorted[i][3] += change / 2;
				ai_sorted[i][4] += change / 2;
			} else {
				cleanup(ai.indexOf(ai_sorted[i]));
				ai_sorted[i] = "dead";
			}
		}
		
		if(ai_sorted[i] !== "dead") {
			if(ai_sorted[i][10] && typeof ai_sorted[i][10][0] === 'number') {
				if(ai_sorted[i][5] < ai_sorted[i][10][0] || ai_sorted[i][6] < ai_sorted[i][10][1]) { // [10][0] = full width, [10][1] = full height
					var changeX = ai_sorted[i][5] * 1.2 - ai_sorted[i][5];
					var changeY = ai_sorted[i][6] * 1.2 - ai_sorted[i][6];
					
					ai_sorted[i][5] += changeX;
					ai_sorted[i][6] += changeY;
					
					ai_sorted[i][3] -= changeX / 2;
					ai_sorted[i][4] -= changeY / 2;
				} else {
					ai_sorted[i][5] = ai_sorted[i][10][0];
					ai_sorted[i][6] = ai_sorted[i][10][1];
					ai_sorted[i].splice(10, 1);
				}
			} else if(!ai_sorted[i][10] || typeof ai_sorted[i][10][0] === 'object') {
				var side_len = ai_sorted[i][5];
				var new_mass = side_len * side_len - 2;
				var new_side_len = Math.sqrt(new_mass);
				
				ai_sorted[i][3] += (side_len - new_side_len) / 2;
				ai_sorted[i][4] += (side_len - new_side_len) / 2;
				ai_sorted[i][5] = new_side_len;
				ai_sorted[i][6] = new_side_len;
			}
			
			if(ai_sorted[i][5] * ai_sorted[i][6] < 100 && (!(ai_sorted[i][10]) || typeof ai_sorted[i][10][0] === 'object')) {
				if(ai_sorted[i][10]) {
					ai_sorted[i].splice(10, 0, ["dying", 1.1]);
				} else {
					ai_sorted[i].push(["dying", 1.1]);
				}
			} else {
				game.fillStyle = "rgb(" + ai_sorted[i][0] + ", " + ai_sorted[i][1] + ", " + ai_sorted[i][2] + ")"; // [0], [1] and [2] are colour values
				game.fillRect(ai_sorted[i][3], ai_sorted[i][4], ai_sorted[i][5], ai_sorted[i][6]);
			}
		}
	}
	
	for(i = 0; i < ai.length; i++) {
		if(ai[i].length >= 5) {
			ai[i] = ai_sorted[ai_sorted_old.indexOf(ai[i])];
		}
	}
}

function findCollision(id, taken) {
	var collisions = [];
	var i = 0;
	
	for(i = id; i < ai.length; i++) {
		if(ai[i] !== "dead" && (!(ai[i][10]) || typeof ai[i][10][0] === 'object')) {
			var x1 = ai[id][3];
			var x2 = ai[i][3];
			var y1 = ai[id][4];
			var y2 = ai[i][4];
			var w1 = ai[id][5];
			var w2 = ai[i][5];
			var h1 = ai[id][6];
			var h2 = ai[i][6];
			
			if(taken.indexOf(i) == -1 && (id == i || (x1 <= x2 + w2 && x1 + w1 >= x2 && y1 <= y2 + h2 && y1 + h1 >= y2))) {
				collisions.push(i);
			}
		}
	}
	
	return collisions;
}

function checkCollisions(game) {
	var collidingAIs = [];
	var takenIDs = [];
	
	for(i = 0; i < ai.length; i++) {
		if(ai[i] !== "dead" && (!(ai[i][10]) || typeof ai[i][10][0] === 'object')) {
			collidingAIs.push(findCollision(i, takenIDs));
			
			for(j = 0; j < collidingAIs[collidingAIs.length - 1].length; j++) {
				takenIDs.push(collidingAIs[collidingAIs.length - 1][j]);
			}
		}
	}
	
	for(i = 0; i < collidingAIs.length; i++) {
		if(collidingAIs[i].length > 1) {
			for(j = 0; j < collidingAIs[i].length; j++) {
				var size = ai[collidingAIs[i][j]][5] * ai[collidingAIs[i][j]][6];
				var x1 = ai[collidingAIs[i][j]][3];
				var y1 = ai[collidingAIs[i][j]][4];
				var w1 = ai[collidingAIs[i][j]][5];
				var h1 = ai[collidingAIs[i][j]][6];
				
				for(k = 0; k < collidingAIs[i].length; k++) {
					var size2 = ai[collidingAIs[i][k]][5] * ai[collidingAIs[i][k]][6];
					var x2 = ai[collidingAIs[i][k]][3];
					var y2 = ai[collidingAIs[i][k]][4];
					var w2 = ai[collidingAIs[i][k]][5];
					var h2 = ai[collidingAIs[i][k]][6];
					
					if((x1 - x2 < 10 && x1 + w1 - x2 - w2 > -10 && y1 - y2 < 10 && y1 + h1 - y2 - h2 > -10) && Math.sqrt(size2) / Math.sqrt(size) < 0.9) {
						ai[collidingAIs[i][k]] = "dead";
						cleanup(collidingAIs[i][k]);
						
						while(ai[collidingAIs[i][j]][5] * ai[collidingAIs[i][j]][6] < size + size2) {
							ai[collidingAIs[i][j]][5] += 1;
							ai[collidingAIs[i][j]][3] -= 0.5;
							ai[collidingAIs[i][j]][6] += 1;
							ai[collidingAIs[i][j]][4] -= 0.5;
						}
						
						collidingAIs[i].splice(k, 1);
						
						k--;
						
						if(k < j) {
							j--;
						}
					}
				}
			}
		}
	}
}

function getRandAIInRange(id) {
	var ais_in_range = [];
	var vision = ai[id][5] * 3;
	for(i = 0; i < ai.length; i++) {
		if(i != id && (!(ai[i][10]) || typeof ai[i][10][0] === 'object') && ai[i][3] + ai[i][5] > ai[id][3] - vision && ai[i][3] < ai[id][3] + ai[id][5] + vision && ai[i][4] + ai[i][6] > ai[id][4] - vision && ai[i][4] < ai[id][4] + ai[id][6] + vision) {
			ais_in_range.push(ai[i]);
		}
	}
	
	if(ais_in_range.length > 0) {
		return ais_in_range[Math.floor(thisTickRand * ais_in_range.length)];
	} else {
		return 0;
	}
}

function findPar() {
	var total_time_alive = 0;
	var par_chance = [];
	for(var i = 0; i < time_alive.length; i++) {
		par_chance.push([total_time_alive, total_time_alive + time_alive[i][0]]);
		total_time_alive += time_alive[i][0];
	}
	
	var randNumber = Math.floor(Math.random() * total_time_alive);
	for(var i = 0; i < par_chance.length; i++) {
		if(randNumber >= par_chance[i][0] && randNumber < par_chance[i][1]) {
			return time_alive[i][1];
		}
	}
}

function getBrowserSpeed() {
	var test = 9.87654321;
	var s_time = performance.now();
	var time_to_calc = [];
	
	while(performance.now() - s_time < 200) {
		var before_calc = performance.now();
		for(i = 0; i < 1000; i++) {
			if(Math.round(Math.random())) {
				test = test * 0.123456789;
			} else {
				test = test / 0.123456789;
			}
		}
		
		time_to_calc.push(performance.now() - before_calc);
	}
	
	var total_time = 0;
	for(i = 0; i < time_to_calc.length; i++) {
		total_time += time_to_calc[i];
	}
	
	return Math.round(1000 * (total_time / time_to_calc.length));
}

$(function() {
	var canvas = document.getElementById("game");
	var game = canvas.getContext("2d");
	
	game.fillStyle = "#eee";
	game.fillRect(0, 0, 600, 600);
	
	setTimeout(function() {
		var delay = getBrowserSpeed();
		if(delay < 10) {
			delay = 10;
		} else if(delay > 40) {
			delay = 40;
		}
		
		var original_mutation_chance = mutation_chance;
		var original_rand_spawn_chance = rand_spawn_chance;
		var start_time = performance.now();
		
		gameLoop = setInterval(function() {
			var thisTickRand = Math.random();
			
			game.clearRect(0, 0, 600, 600);
			
			game.fillStyle = "#eee";
			game.fillRect(0, 0, 600, 600); // Background
			
			if(total_mass < 10000) {
				if(ai.length > 1 && performance.now() - start_time > 5000 && Math.floor(Math.random() * (1 / rand_spawn_chance)) > 0) {
					var par1 = findPar();
					var par2 = findPar();
					
					combineGenes(par1, par2);
				} else {
					genRandGenes();
				}
			}
			
			checkCollisions(game);
			
			var time_alive_copy = [];
			
			for(id = 0; id < ai.length; id++) {
				if(ai[id] !== "dead" && (!(ai[id][10]) || ai[id][10][0] !== "dying")) {
					for(i = 0; i < time_alive.length; i++) {
						if(time_alive[i][2] == id) {
							time_alive[i][0] += 1;
							break;
						}
					}
					
					if(!(ai[id][10]) || typeof ai[id][10][0] === 'object') {
						checkConditions(id);
					}
				}
			}
			
			if(performance.now() - start_time > 4000) {
				for(i = 0; i < time_alive.length; i++) {
					if(time_alive[i].length < 3) {
						time_alive[i][0] = time_alive[i][0] * 0.9999;
					}
					
					time_alive_copy.push(time_alive[i][0]);
				}
				
				time_alive_copy = time_alive_copy.sort(function(a,b){return b - a});
				
				time_alive_sorted = [];
				for(i = 0; i < time_alive_copy.length; i++) {
					for(j = 0; j < time_alive.length; j++) {
						if(time_alive[j][0] == time_alive_copy[i]) {
							time_alive_sorted.push(time_alive[j]);
							break;
						}
					}
				}
			}
			
			total_mass = 0;
			
			renderAIs(game);
			
			if(time_alive.length > 100) {
				cleanAll();
			}
			
			if(time_alive_sorted.length > 0) {
				var conditions = getCondGenes(time_alive_sorted[0][1][8]);
				$('#best-thought').html("<strong>Thoughts of the longest survivor:</strong> " + "[" + conditions[0].join(" ") + "], [" + conditions[1].join(" ") + "]");
			}
			
			if(mutation_chance > original_mutation_chance / 3 ) {
				mutation_chance = mutation_chance * 0.99999;
			}
			
			if(rand_spawn_chance > original_rand_spawn_chance / 4) {
				rand_spawn_chance = rand_spawn_chance * 0.9999;
			}
		}, delay);
	}, 50);
});
