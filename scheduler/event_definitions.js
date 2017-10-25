
const TYPE_JUDGING = new sessionType("Judging", 8);
const TYPE_ROUND = new sessionType("Matches", 16);

var UID_counter = 1;
var start_time_offset = 0; // Set to number of minutes to start if wanted


function sessionType(name,priority) {
	this.name = name;
	this.priority = priority;
}

function EventParameters(name,nTeams,nDays,teamNumbers,teamNames,days) {
	this.name = name || "2017 FLL Tournament";
	this.nTeams = nTeams || 24;
	this.nDays = nDays || 1;
	this.allSessions = [];
	this.teamNumbers = teamNumbers || [];
	this.teamNames = teamNames || [];
	this.days = days || [];
	// this.days = ["Day 1"];
	while (this.days.length < this.nDays) this.days.push("Day " + (this.days.length+1));
	while (this.teamNumbers.length < this.nTeams) this.teamNumbers.push("" + (this.teamNumbers.length+1)); 
	while (this.teamNames.length < this.nTeams) this.teamNames.push("Team " + (this.teamNames.length+1)); 

	this.changeTitle = function() {
	    var safe = this.name;
	    this.name = prompt("Enter title here", $("#title").get(0).textContent);
	    if (this.name == null) this.name = safe;
	    document.getElementById("title").innerHTML = this.name;
	}
	this.changeNTeams = function() {
		this.nTeams = $("#nTeams")[0].value;
		while (this.teamNumbers.length < this.nTeams) this.teamNumbers.push("" + (this.teamNumbers.length+1)); 
		while (this.teamNames.length < this.nTeams) this.teamNames.push("Team " + (this.teamNames.length+1)); 
		while (this.teamNumbers.length > this.nTeams) this.teamNumbers.splice(this.teamNumbers.length,1); 
		while (this.teamNames.length > this.nTeams) this.teamNames.splice(this.teamNames.length,1); 

	}
}

function updateDays() {
	tournament.nDays = $("#nDays")[0].value;
	while (tournament.days.length < tournament.nDays) {
		tournament.days.push("Day "+ (tournament.days.length+1));
	}
	while (tournament.days.length > tournament.nDays) {
		tournament.days.splice(tournament.days.length-1,1);
	}
	for (var i = 0; i < tournament.allSessions.length; i++) {
		tournament.allSessions[i].updateDOM();
	}
}

// session parameters
function SessionParameters(type,name,start,end,nSims,nLocs,length,buffer,locs) {
	this.uid = UID_counter++;
	this.type = type || TYPE_JUDGING;
	this.name = name || (this.type==TYPE_JUDGING?"Judging ":"Round ")+this.uid;
	this.start = start || 120;
	this.end = end || 300;
	this.nSims = nSims || (this.type==TYPE_JUDGING)?4:2;
	this.nLocs = nLocs || 4;
	this.length = length || (this.type==TYPE_JUDGING)?10:4;
	this.buffer = buffer || (this.type==TYPE_JUDGING)?5:4;
	this.locations = locs || [];
	// Create elements of DOM input form
	this.doms = new DomCollection();
	this.docObj = $("<table class=roundtable>");
	this.doms.title.attr('value',this.name);
	this.doms.startTimeInput.attr('value',minsToTime(this.start));
	this.doms.endTimeInput.attr('value',minsToTime(this.end));
	this.doms.lenInput.attr('value',this.length);
	this.doms.bufInput.attr('value',this.buffer);
	this.doms.simInput.attr('value',this.nSims);
	this.doms.locsInput.attr('value',this.nLocs);
	this.ToForm = function() {
		var dom = this.docObj;
		var x = $("<tr><td><h3></h3></td><td><button class=\"btn\" onclick=\"copyToAll("+this.uid+")\">Copy to all</button></td></tr>");
		$("h3", x).append(this.doms.title);
		dom.append(x);
		var x = $("<tr><td>Start time:</td><td><div></div></td></tr>");
		$("div", x).append(this.doms.startDateInput);
		$("div", x).append(this.doms.startTimeInput);
		dom.append(x);
		var x = $("<tr><td>Must be done by:</td><td><div></div></td></tr>");
		$("div", x).append(this.doms.endDateInput);
		$("div", x).append(this.doms.endTimeInput);
		dom.append(x);
		var x = $("<tr><td>Duration (min):</td><td><div></div></td></tr>");
		$("div", x).append(this.doms.lenInput);
		dom.append(x);
		var x = $("<tr><td>Buffer/cleanup time (min):</td><td><div></div></td></tr>");
		$("div", x).append(this.doms.bufInput);
		dom.append(x);
		var x = $("<tr><td># Simultaneous teams:</td><td><div></div></td></tr>");
		if (this.type == TYPE_JUDGING) x = $("<tr hidden><td># Simultaneous teams:</td><td><div></div></td></tr>");
		$("div", x).append(this.doms.simInput);
		dom.append(x);
		if (this.type == TYPE_JUDGING)
			var x = $("<tr><td># judging panels:</td><td><div></div></td></tr>");
		else if (this.type == TYPE_ROUND)
			var x = $("<tr><td># tables:</td><td><div></div></td></tr>");
		else
			var x = $("<tr><td># locations:</td><td><div></div></td></tr>");
		// var x = $("<tr><td># locations:</td><td><div></div></td></tr>");
		$("div", x).append(this.doms.locsInput);
		dom.append(x);
		dom.append($("<tr><td><button class=\"btn\" onclick=\"openLocationModal("+this.uid+")\" data-toggle=\"modal\" data-target=\"#locationModal\">Edit location names</button>\
			</td><td><button class=\"btn\" onclick=deleteParams("+this.uid+")>Delete</button></td></tr>"));
		// Add change listeners
        var ins = $("input,select", dom);
        for (var i = 0; i < ins.length; i++) {
        	$(ins[i]).attr('onchange','getSession('+this.uid+').update();');
		}
     	return dom;
	}
	this.updateDOM = function() {
		this.doms.startDateInput.empty();
		this.doms.endDateInput.empty();
		for (var i = 0; i < tournament.nDays; i++)
			this.doms.startDateInput.append($("<option value=\""+i+"\">"+tournament.days[i]+"</option>"));
		if (tournament.nDays <= 1) this.doms.startDateInput.hide();
		else this.doms.startDateInput.show();
		for (var i = 0; i < tournament.nDays; i++)
			this.doms.endDateInput.append($("<option value=\""+i+"\">"+tournament.days[i]+"</option>"));
		if (tournament.nDays <= 1) this.doms.endDateInput.hide();
		else this.doms.endDateInput.show();

		this.doms.title[0].value = this.name;
		this.doms.startDateInput[0].value = minsToDate(this.start);
		this.doms.startTimeInput[0].value = minsToTime(this.start);
		this.doms.endDateInput[0].value = minsToDate(this.end);
		this.doms.endTimeInput[0].value = minsToTime(this.end);
		this.doms.lenInput[0].value = this.length;
		this.doms.bufInput[0].value = this.buffer;
		this.doms.locsInput[0].value = this.nLocs;
		this.doms.simInput[0].value = this.nSims;
	}
	this.update = function() {
		this.name = this.doms.title[0].value;
		this.start = tdToMins(this.doms.startDateInput[0].value,this.doms.startTimeInput[0].value);
		this.end = tdToMins(this.doms.endDateInput[0].value,this.doms.endTimeInput[0].value);
		this.length = this.doms.lenInput[0].value;
		this.buffer = this.doms.bufInput[0].value;
		this.nLocs = this.doms.locsInput[0].value;
		if (this.type != TYPE_JUDGING) this.nSims = this.doms.simInput[0].value;
		else this.nSims = this.nLocs;

		while (this.locations.length < this.nLocs) {
			if (this.type == TYPE_JUDGING)
				this.locations.push("Room "+ (this.locations.length+1));
			else if (this.type == TYPE_ROUND)
				this.locations.push("Table "+ (this.locations.length+1));				
		}
		while (this.locations.length > this.nLocs) {
			this.locations.splice(this.locations.length-1,1);
		}
	}
	this.update();
}

function DomCollection() {
	this.title=$("<input class=\"form-control\" type=text value=\"Title\">");
	this.startDateInput=$("<select class=\"form-control\"></select>");
	for (var i = 0; i < tournament.days.length; i++)
		this.startDateInput.append($("<option value=\""+i+"\">"+tournament.days[i]+"</option>"));
	if (tournament.days.length <= 1) this.startDateInput.hide();
	else this.startDateInput.show();
	this.startTimeInput=$("<input class=\"form-control\" type=time value=\"09:00\" step=\"900\">");
	this.endDateInput=$("<select class=\"form-control\"></select>");
	for (var i = 0; i < tournament.days.length; i++)
		this.endDateInput.append($("<option value=\""+i+"\">"+tournament.days[i]+"</option>"));
	if (tournament.days.length <= 1) this.endDateInput.hide();
	else this.endDateInput.show();
	this.endTimeInput=$("<input class=\"form-control\" type=time value=\"14:00\" step=\"900\">");
	this.lenInput=$("<input class=\"form-control\" type=number min=0 max=1000 value=10>")
	this.bufInput=$("<input class=\"form-control\" type=number min=0 max=1000 value=10>")
	this.simInput=$("<input class=\"form-control\" type=number min=1 max=100 value=1>");
	this.locsInput=$("<input class=\"form-control\" type=number min=1 max=100 value=1>");
}

function BreakParameters(name,start,end,nSims) {
	this.name = name;
	this.start = start;
	this.end = end;
	this.nSims = nSims;
}

function loadPresetFLL() {
	addRound("Round 1",600,1020,2,4,5,5);
	addRound("Round 2",600,1020,2,4,5,5);
	addRound("Round 3",600,1020,2,4,5,5);
	addJudging("Robot Design Judging",600,1020,4,4,10,5);
	addJudging("Core Values Judging",600,1020,4,4,10,5);
	addJudging("Research Project Judging",600,1020,4,4,10,5);
}

function addJudging(name,start,end,nSims,nLocs,length,buffer,locs) {
	// alert("Hello");
	var p = new SessionParameters(TYPE_JUDGING,name,start,end,nSims,nLocs,length,buffer,locs);
	tournament.allSessions.push(p);
	p.ToForm().insertBefore("#addJudgeBtn")
}

function addRound(name,start,end,nSims,nLocs,length,buffer,locs) {
	// alert("Hello");
	var p = new SessionParameters(TYPE_ROUND,name,start,end,nSims,nLocs,length,buffer,locs);
	tournament.allSessions.push(p);
	p.ToForm().insertBefore("#addRoundBtn")
}

function updateParams(id) {
	getSession(id).update();
}

function deleteParams(id) {
	var toDelete = -1;

	for (var i = 0; i < tournament.allSessions.length; i++) {
		if (tournament.allSessions[i].uid == id) {
			$(tournament.allSessions[i].docObj).remove();
			toDelete = i;
			break;
		}
	}
	if (toDelete == -1) {
		console.log("Delete failed....whattup?");
		return;
	}
	tournament.allSessions.splice(toDelete,1);
}

function minsToDate(x) {
	return Math.floor(x/(24*60));
}

function minsToTime(x) {
	x = (x%(24*60)) + start_time_offset;
	var h = (x/60);
	var m = (x%60);
	var zh = (h < 10) ? "0" : "";
	var zm = (m < 10) ? "0" : "";
	return zh+h+":"+zm+m;
}

function tdToMins(d,t) {
    var res = t.split(":");
    return d*(60*24) + parseInt(res[0])*60 + parseInt(res[1]) - start_time_offset;
}

function getSession(uid) {
	for (var i = 0; i < tournament.allSessions.length; i++) {
		if (tournament.allSessions[i].uid == uid) return tournament.allSessions[i];
	}
	console.log("Failed to find session " + uid);
	return null;
}

function copyToAll(uid) {
	var baseSession = getSession(uid);
	for (var i = 0; i < tournament.allSessions.length; i++) {
		var session = tournament.allSessions[i];
		if (session.uid != uid && session.type == baseSession.type) {
			session.start = baseSession.start;
			session.end = baseSession.end;
			session.length = baseSession.length;
			session.buffer = baseSession.buffer;
			session.nLocs = baseSession.nLocs;
			session.nSims = baseSession.nSims;
			session.updateDOM();
			session.update();
		}
	}
}

function openLocationModal(uid) {
	session = getSession(uid);
    $("#loc-modal-body").empty();
    $("#loc-modal-body").append($("<input type=\"hidden\" value=\""+uid+"\">"));
    for (var i = 0; i < session.locations.length; i++) {
    	var input = $("<input type=\"text\" class=\"form-control\" value=\""+session.locations[i]+"\">");
        $("#loc-modal-body").append(input);
        $("#loc-modal-body").append(document.createElement("BR"));
    }
}

function closeLocationModal() {
	var inputs = $("#loc-modal-body>input");
	uid = inputs[0].value;
	session = getSession(uid);
	for (var i = 1; i < inputs.length; i++)
		session.locations[i-1] = inputs[i].value;
}

function openDayModal() {
    $("#day-modal-body").empty();
    for (var i = 0; i < tournament.nDays; i++) {
    	var input = $("<input type=\"text\" class=\"form-control\" value=\""+tournament.days[i]+"\">");
        $("#day-modal-body").append(input);
        $("#day-modal-body").append(document.createElement("BR"));
    }
}

function closeDayModal() {
	var inputs = $("#day-modal-body>input");
	for (var i = 0; i < inputs.length; i++)
		tournament.days[i] = inputs[i].value;
	updateDays();
}

function openTeamModal() {
    $("#team-modal-body").empty();
    $("#team-modal-body").append($("<p>One line per team.  Team numbers will automatically add\/delete to match the number of team names.</p>"))
    var x = $("<textarea rows=\""+tournament.nTeams+"\" cols=\"5\"></textarea>");
    for (var i = 0; i < tournament.teamNumbers.length; i++)
    	x.append(tournament.teamNumbers[i]+"\n");
    $("#team-modal-body").append(x);
    var x = $("<textarea rows=\""+tournament.nTeams+"\" cols=\"60\"></textarea>");
    for (var i = 0; i < tournament.teamNames.length; i++)
    	x.append(tournament.teamNames[i]+"\n");
    $("#team-modal-body").append(x);
}

function closeTeamModal() {
	var inputs = $("#team-modal-body>textarea");
	var nums = inputs[0].value.split("\n");
	if (nums[nums.length-1] == "") nums.splice(nums.length-1,1);
	var names = inputs[1].value.split("\n");
	if (names[names.length-1] == "") names.splice(names.length-1,1);
	while (nums.length < names.length) nums.push(""+(nums.length+1));
	while (nums.length > names.length) nums.splice(nums.length-1,1);
	tournament.teamNumbers = nums;
	tournament.teamNames = names;
	tournament.nTeams = names.length;
	$("#nTeams")[0].value = tournament.nTeams;
}