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

const NOT_YET_ADDED = -64;

function Schedule(event) {
	event.allSessions.sort(function(a,b) {
		if (a.type.priority == b.type.priority) return a.start - b.start;
		return a.type.priority - b.type.priority;
	});
	for (var i = 0; i < event.allSessions.length; i++) {
		if (event.allSessions[i].type == TYPE_MATCH_ROUND) continue;
		var end = tableSession(event,event.allSessions[i]);
		if (end > event.allSessions[i].end) alert (event.allSessions[i].name + " will finish late! Consider revising");
	}
	var end = -Infinity;
	for (var i = 0; i < event.allSessions.length; i++) {
		if (event.allSessions[i].type != TYPE_MATCH_ROUND) continue;
		if (event.allSessions[i].start < end) event.allSessions[i].start = end;
		end = tableSession(event,event.allSessions[i]);
		if (end > event.allSessions[i].end) alert (event.allSessions[i].name + " will finish late! Consider revising");
	}
	console.log(event);
}

/**
	num: Count of instance 
	time: Time (mins) of instance
	teams: List of teams in instance
	loc: Location offset (i.e. for staggered sessions, location index of where the teams begin)
	extra: true/false if extra time is allocated
*/
function Instance(num, time, teams, loc) {
	this.num = num;
	this.time = time;
	this.teams = teams;
	this.loc = loc;
	this.extra = false;
}
/**
    Sets up all the timeslots for the given session.
    @return Returns the time the schedule is finished (i.e. the end
    time of the last event)
*/
function tableSession(event, session) {
    var now = session.start;
    var L = Math.ceil((event.teams.length*session.instances) / session.nSims);
    var lastNTeams = ((event.teams.length*session.instances) % session.nSims);
    lastNTeams = (lastNTeams==0) ? session.nSims : lastNTeams;
    session.schedule = new Array(L);
    
    // Figure out how many rounds to make extra long
    var everyN = (session.extraTimeEvery)?session.extraTimeEvery:Infinity;
    var specialTeams = 0;
    for (var i = 0; i < event.teams.length; i++) {
    	if (event.teams[i].special) specialTeams++;
    }
    console.log(session.name);
    console.log("special teams: "+specialTeams);
    var extraRoundsNeeded = Math.ceil(specialTeams/session.nSims);
    console.log("Extra rounds needed: "+extraRoundsNeeded);
    var everyNRounds = ((session.extraTimeFirst)?1:0) +((session.extraTimeEvery)?L/everyN:0);
    console.log("Extra rounds gotten:" + everyNRounds);
    if (everyNRounds < extraRoundsNeeded) {
    	everyN = (L+1)/(extraRoundsNeeded+1);
    }
    console.log("EveryN: "+everyN);

    var roundsSinceExtra = 0;
    var extraRounds = 0;
    for (var i = 0; i < L; i++) {
        var d = Math.floor(session.nLocs/session.nSims);
        var locOffset = (i%d)*session.nSims;
        if (i < L-1) { 
	        session.schedule[i] = new Instance(i+1,now,new Array(session.nSims),locOffset);
	        now = timeInc(event,now,session.length+session.buffer);
	        roundsSinceExtra++;
            if (((i == 0 && session.extraTimeFirst) || (roundsSinceExtra >= everyN)) && extraRounds < extraRoundsNeeded) {
	        	session.schedule[i].extra = true;
	        	now = timeInc(event,now,event.extraTime);
	        	roundsSinceExtra = 0;
	        	extraRounds++;
	        }
	    } else {
	    	session.schedule[i] = new Instance(i+1,now,new Array(lastNTeams),locOffset);
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

/** 
	Increments given time, skipping breaks.
	@return Returns the incremented time.
*/
function timeInc(event,time,len) {
    var newTime = time + len;
    for (var i = 0; i < event.allSessions; i++) {
    	var session = event.allSessions[i];
    	if (session.type != TYPE_BREAK) continue;
    	if ((time+len) >= session.start && time < session.end)
    		newTime = time;
    }
    return newTime;
}

