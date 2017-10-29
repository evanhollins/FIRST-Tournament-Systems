/**
SessionType [name, priority]:
	TYPE_JUDGING
	TYPE_MATCH_ROUND
	TYPE_BREAK

Methods:
	METHOD_RANDOM
	METHOD_BLOCK

EventParameters:
	[ UID_counter, teamnum_counter, start_time_offset, name, majorLogo, gameLogo, days ]
	minTravel
	method
	teams (TeamParameters):
		function TeamParameters(number,name) {
		[number, name]
		special
		start
		end
		schedule
	allSessions (SessionParameters):
		uid
		type
		name
		start
		end
		nLocs
		nSims
		length
		buffer
		locations
		schedule
**/
function schedule(event) {
	buildAllTables(event);
	initialFill(event);
	swapFill(event);
	sortThingsOut(event);
}

function emptySchedule(event) {
	for (var i = 0; i < event.allSessions.length; i++) event.allSessions.schedule = [];
	for (var i = 0; i < event.teams.length; i++) event.teams[i].schedule = [];
}

/**
	num: Count of instance 
	time: Time (mins) of instance
	teams: List of teams in instance
	loc: Location offset (i.e. for staggered sessions, location index of where the teams begin)
	extra: true/false if extra time is allocated
*/
function Instance(uid, num, time, teams, loc) {
	this.session_uid = uid;
	this.num = num;
	this.time = time;
	this.teams = teams;
	this.loc = loc;
	this.surrogates=0;
	this.standins=0;
	this.extra = false;
}

const NOT_YET_ADDED = -64;

function buildAllTables(event) {
	event.allSessions.sort(function(a,b) {
		if (a.type.priority == b.type.priority) return a.start - b.start;
		return a.type.priority - b.type.priority;
	});
	for (var i = 0; i < event.allSessions.length; i++) {
		if (event.allSessions[i].type != TYPE_BREAK) event.allSessions[i].start = timeInc(event,event.allSessions[i].start,0);
		if (event.allSessions[i].type == TYPE_MATCH_ROUND) continue;
		var end = tableSession(event,event.allSessions[i],0);
		if (end > event.allSessions[i].end) alert (event.allSessions[i].name + " will finish late! Consider revising");
	}
	var end = -Infinity;
	var offset = 0;
	for (var i = 0; i < event.allSessions.length; i++) {
		if (event.allSessions[i].type != TYPE_MATCH_ROUND) continue;
		if (event.allSessions[i].start < end) event.allSessions[i].start = end;
		end = tableSession(event,event.allSessions[i],offset);
		offset += event.allSessions[i].schedule.length;
		if (end > event.allSessions[i].end) alert (event.allSessions[i].name + " will finish late! Consider revising");
	}
}

/**
    Sets up all the timeslots for the given session.
    numOffset: offset at which to start counting (facilitates round numbering)
    @return Returns the time the schedule is finished (i.e. the end
    time of the last event)
*/
function tableSession(event, session, numOffset) {
	if (!numOffset) numOffset = 0;
    var now = session.start;
    var L = Math.ceil((event.teams.length*session.instances) / session.nSims);
    var lastNTeams = ((event.teams.length*session.instances) % session.nSims);
    lastNTeams = (lastNTeams==0) ? session.nSims : lastNTeams;
    // if (session.fillerPolicy == USE_SURROGATES) {
    // 	var teamsToAdd = session.nSims - lastNTeams;
    // 	lastNTeams = session.nSims;
    // }
    session.schedule = new Array(L);
    
    // Figure out how many rounds to make extra long
    var everyN = (session.extraTimeEvery)?session.extraTimeEvery:Infinity;
    var specialTeams = 0;
    for (var i = 0; i < event.teams.length; i++) {
    	if (event.teams[i].special) specialTeams++;
    }
    var extraRoundsNeeded = Math.ceil(specialTeams/session.nSims);
    var everyNRounds = ((session.extraTimeFirst)?1:0) +((session.extraTimeEvery)?L/everyN:0);
    if (everyNRounds < extraRoundsNeeded) {
    	everyN = (L+1)/(extraRoundsNeeded+1);
    }

    var roundsSinceExtra = 0;
    var extraRounds = 0;
    if (session.type == TYPE_BREAK) everyN = Infinity;
    for (var i = 0; i < L; i++) {
        var d = Math.floor(session.nLocs/session.nSims);
        var locOffset = (i%d)*session.nSims;
        if (i < L-1) { 
	        session.schedule[i] = new Instance(session.uid,i+1+numOffset,now,new Array(session.nSims),locOffset);
	        now = timeInc(event,now,session.length+session.buffer);
	        roundsSinceExtra++;
            if (((i == 0 && session.extraTimeFirst) || (roundsSinceExtra >= everyN)) && extraRounds < extraRoundsNeeded) {
	        	session.schedule[i].extra = true;
	        	now = timeInc(event,now,event.extraTime);
	        	roundsSinceExtra = 0;
	        	extraRounds++;
	        }
	    } else {
	    	session.schedule[i] = new Instance(session.uid,i+1+numOffset,now,new Array(lastNTeams),locOffset);
	    	now = now + session.length + session.buffer;
	        roundsSinceExtra++;
            if (roundsSinceExtra >= everyN) {
	        	session.schedule[i].extra = true;
	        	now = now + event.extraTime;
	        }
	    }

        for (var t = 0; t < session.schedule[i].teams.length; t++) {
            session.schedule[i].teams[t] = NOT_YET_ADDED;
        }
    }
    return now;
}

function initialFill(event) {
	var oneSetOfTeams = event.teams.slice();
	shuffle(oneSetOfTeams);
	for (var i = 0; i < event.allSessions.length; i++) {
		var teams = [];
		for (var j = 0; j < event.allSessions[i].instances; j++) 
			teams = teams.concat(oneSetOfTeams.slice());
        if (event.method == "block") {
            for (var j = 0; j < event.allSessions[i].nSims*2; j++)
                teams.push(teams.shift());
        } else shuffle(teams);
		fillSession(event,event.allSessions[i],teams);
	}
}

function fillSession(event, session, teams) {
	for (var i = 0; i < session.schedule.length; i++) {
		var instance = session.schedule[i];
		for (var t = 0; t < instance.teams.length; t++) {
			var team = -1;
			for (var k = 0; k < teams.length; k++) {
				if (canDo(event,teams[k],instance)) {
					team = k;
					break;
				}
			}
			if (team != -1) {
				var team = teams.splice(team,1)[0];
				instance.teams[t] = team.uid;
				team.schedule.push(instance);
			} else continue;
		}
	}
	// TODO: Change this to be right at the end of the swapFilling to make sure this is done correctly.
	// for (var i = 0; i < teams.length; i++) teams[i].schedule.push(new Instance(session.uid, -1,null,null,-1));
}

/**
	Go through all sessions in the event and fix up errors through first-order swapping.
**/
function swapFill(event) {
    for (var j = 0; j < 10; j++) {
        var fixed = 0;
        evaluate(event);
        for (var i = 0; i < event.allSessions.length; i++) {
            if (event.allSessions[i].nErrors == 0) continue;
            fixed += swapFillSession(event, event.allSessions[i], event.teams);
        }
        if (fixed == 0) break;
    }
}

/**
	Go through a given session, fix all errors with first-order swapping.
	TODO: deal with the case where instances > 1?  How to do this?
	@return Number of errors fixed
**/
function swapFillSession(event, session, teams) {
	var fixed = 0;
	// Make list of teams that aren't in this session enough (lost set)
	var lostTeams = [];
	for (var i = 0; i < teams.length ; i++) 
		if (hasDone(teams[i],session.uid) < session.instances) lostTeams.push(teams[i]);
	// Find every empty slot in the schedule
	for (var i = 0; i < session.schedule.length; i++) {
		var instance_A = session.schedule[i];
		for (var j = 0; j < instance_A.teams.length; j++) {
			if (instance_A.teams[j] != NOT_YET_ADDED) continue;
			// Found empty slot!	
			// Now find a team A from the full set that can do this time
			for (var tA = 0; tA < teams.length; tA++) {
				if (!canDo(event,teams[tA],instance_A,session.uid)) continue;
				// Now, find a team B from the lost set that can take team A's instance 
				var instance_B = null;
				for (var x = 0; x < teams[tA].schedule.length; x++) {
					if (teams[tA].schedule[x].session_uid == instance_A.session_uid) {
						instance_B = teams[tA].schedule.splice(x,1)[0];
						break;
					}
				}
				var f = fixed;
				if (instance_B == null) {
					// Team A can just do instance A; no swap required, add the team in.
					instance_A.teams[j] = teams[tA].uid;
					teams[tA].schedule.push(instance_A);
					fixed++;
					break;
				}
				for (var tB = 0; tB < lostTeams.length; tB++) {
					if (!canDo(event,lostTeams[tB],instance_B)) continue;
					// Found a team that can swap with A!
					// Now, swap teams A and B
					// Add instanceA to teamA
					instance_A.teams[j] = teams[tA].uid;
					teams[tA].schedule.push(instance_A);
					// Add instanceB to teamB
					var truth = false;
					for (var idx = 0 ; idx < instance_B.teams.length; idx++) {
						if (instance_B.teams[idx] == teams[tA].uid) {
							truth = true;
							instance_B.teams[idx] = lostTeams[tB].uid;
						}
					}
					lostTeams[tB].schedule.push(instance_B);
					lostTeams.splice(tB,1);
					fixed++;
					break;
				}
				if (f == fixed) teams[tA].schedule.push(instance_B);
			}
		}
	}
	// console.log("Fixed " + fixed + " errors by swapping");
	return fixed;
}

function evaluate(event) {
	event.errors = 0;
	for (var i = 0; i < event.allSessions.length; i++) {
		var session = event.allSessions[i];
		session.nErrors = 0;
		for (var j = 0; j < session.schedule.length; j++)
			for (var k = 0; k < session.schedule[j].teams.length; k++) 
				if (session.schedule[j].teams[k] == NOT_YET_ADDED) session.nErrors++;
		event.errors += session.nErrors;
	}
}

/** 
	Sorts the sessions and team schedules, in order to ensure individual timetables are consistent.
**/
function sortThingsOut(event) {
	event.allSessions.sort(function(a,b) {
		if (a.type.priority == b.type.priority) return a.start - b.start;
		return a.type.priority - b.type.priority;
	});
	for (var i = 0; i < event.teams.length; i++) {
		event.teams[i].schedule.sort(function(a,b) {
			if (getSession(a.session_uid).type.priority == getSession(b.session_uid).type.priority)
				return getSession(a.session_uid).start - getSession(b.session_uid).start
			return getSession(a.session_uid).type.priority - getSession(b.session_uid).type.priority;
		});
	}
	// Fill in surrogate teams
	for (var i = 0; i < event.allSessions.length; i++) {
		var session = event.allSessions[i];
		if (session.fillerPolicy != USE_SURROGATES) continue;
		var lastInst = session.schedule[session.schedule.length-1];
		while (lastInst.teams.length < session.nSims) {
			lastInst.surrogates++;
			var found = false;
			shuffle(event.teams);
			for (var t = 0; t < event.teams.length; t++) {
				if (canDo(event,event.teams[t],lastInst)) {
					lastInst.teams.push(event.teams[t].uid);
					getTeam(event.teams[t].uid).schedule.push(lastInst);
					console.log("Found team " + event.teams[t].number)
					found = true;
					break;
				}
			}
			if (!found) console.log("NO SURROGATE FOUND");
			if (!found) lastInst.teams.push(NOT_YET_ADDED);
		}
	}
}


/** ========================== UTILITIES ========================== **/

/** 
	Increments given time, skipping breaks.
	@return Returns the incremented time.
*/
function timeInc(event,time,len) {
    var newTime = time + len;
    for (var i = 0; i < event.allSessions.length; i++) {
    	var session = event.allSessions[i];
    	if (session.type != TYPE_BREAK) continue;
    	if ((time+len) >= session.start && time < session.end)
    		newTime = session.end;
    }
    return newTime;
}

/**
	Return true if the team can do the given instance.
	Returns false if they don't have time to come from a previous instance or go to a later one.
	if 'excl' is given, do not consider that session ID when checking this.
**/ 
function canDo(event, team, instance, excl) {
	// Check if team already has something in their schedule
	for (var i = 0; i < team.schedule.length; i++) {
		var startA = team.schedule[i].time;
		if (excl && team.schedule[i].session_uid == excl) continue;
		if (getSession(team.schedule[i].session_uid).type == TYPE_BREAK)
			var endA = startA + getSession(team.schedule[i].session_uid).length;
		else 
			var endA = startA + getSession(team.schedule[i].session_uid).length + event.minTravel;
		var startB = instance.time;
		if (getSession(team.schedule[i].session_uid).type == TYPE_BREAK)
			var endB = startB + getSession(instance.session_uid).length;
		else
			var endB = startB + getSession(instance.session_uid).length + event.minTravel;
		if (startA == startB) return false;
		if (startA < startB && endA > startB) return false;
		if (startA > startB && startA < endB) return false;
	}
	return true;
}

/**
	Returns how many times a team has done a given session
**/
function hasDone(team, uid) {
	var count = 0;
	for (var i = 0; i < team.schedule.length; i++) {
		if (team.schedule[i].session_uid == uid) count++;
	}
	return count;
}

/**
 * Shuffles array in place.
 * @param {Array} a items The array containing the items.
 */
function shuffle(a) {
    var j, x, i;
    for (i = a.length; i; i--) {
        j = Math.floor(Math.random() * i);
        x = a[i - 1];
        a[i - 1] = a[j];
        a[j] = x;
    }
}