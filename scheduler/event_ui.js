function EventPanel(params) {
	console.log(params);
	this.params = params;
	this.allPanels = [];
	this.teamInput = $("#nTeams")[0];
	this.daysInput = $("#nDays")[0];
	this.minsInput = $("#minTravel")[0];
	this.titleInput = $("#title")[0];
	this.majorLogoInput = $("#majrimg")[0];
	this.gameLogoInput = $("#gameimg")[0];
	this.majorFileInput = $("#majrfile")[0];
	this.gameFileInput = $("#gamefile")[0];
	this.teamInput.value = this.params.teams.length;
	this.daysInput.value = this.params.days.length;
	this.minsInput.value = this.params.minTravel;
	this.titleInput.innerHTML = this.params.name;
	this.majorLogoInput.src = this.params.majorLogo;
	this.gameLogoInput.src = this.params.gameLogo;
	for (var i = 0; i < params.allSessions.length; i++) {
		var p = new SessionPanel(params.allSessions[i]);
		this.allPanels.push(p);
		if (p.session.type == TYPE_JUDGING)
			p.docObj.insertBefore("#addJudgeBtn");
		else if (p.session.type == TYPE_ROUND)
			p.docObj.insertBefore("#addRoundBtn");
		else if (p.session.type == TYPE_BREAK)
			p.docObj.insertBefore("#addBreakBtn");
	}
	this.changeTitle = function() {
	    var safe = this.params.name;
	    this.params.name = prompt("Enter title here", this.titleInput.textContent);
	    if (this.params.name == null) this.params.name = safe;
	    this.titleInput.innerHTML = this.params.name;
		autosave();
	}
	this.changeNTeams = function() {
		var nTeams = this.teamInput.value;
		while (this.params.teams.length < nTeams)
			this.params.teams.push(new TeamParameters(this.params.teams.length+1)); 
		while (this.params.teams.length > nTeams)
			this.params.teams.splice(this.params.teams.length-1,1); 
		autosave();
	}
	this.changeMinTravel = function() {
		this.params.minTravel = this.minsInput.value;		
		autosave();
	}
	this.changeNDays = function() {
		this.params.updateNDays(this.daysInput.value);
		var toDelete = [];
		for (var i = 0; i < this.allPanels.length; i++) {
			var panel = this.allPanels[i];
			if (panel.session.type == TYPE_BREAK && panel.session.end > this.params.days.length*(24*60))
				toDelete.push(panel.session.uid);
			while (panel.session.start > this.params.days.length*(24*60)) panel.session.start -= (24*60);
			while (panel.session.end > this.params.days.length*(24*60)) panel.session.end -= (24*60);
			panel.updateDOM();
		}
		for (var i = 0; i < toDelete.length; i++) {
			deleteParams(toDelete[i]);
		}
		autosave();
	}
	this.changeMajorLogo = function() {
	    var file = this.majorFileInput.files[0];
	    var reader = new FileReader();
	    reader.onloadend = function() {
	    	tourn_ui.params.majorLogo = this.result;
			tourn_ui.majorLogoInput.src = tourn_ui.params.majorLogo;
		    autosave();
	    }
	    if (file) {
			reader.readAsDataURL(file);
	    }
	}
	this.changeGameLogo = function() {
	    var file = this.gameFileInput.files[0];
	    var reader = new FileReader();
	    reader.onloadend = function() {
	    	tourn_ui.params.gameLogo = this.result;
			tourn_ui.gameLogoInput.src = tourn_ui.params.gameLogo;
		    autosave();
	    }
	    if (file) {
			reader.readAsDataURL(file);
	    }
	}
	this.sequenceTeams = function() {
	    var x = $("#lg-modal-body>textarea")[0];
	    var names = $("#lg-modal-body>textarea")[1].value.split('\n');
	    nameLen = names.length;
	    if (names[names.length-1] == "") nameLen--;
	    x.value = "";
	    for (var i = 0; i < nameLen; i++)
	    	x.value = x.value + ((i+1)+"\n");
	}
}

function generate() {
	// validate(tournament); * Not yet implemented *
	Schedule(tournament); 
	printToDom(tournament);
}

function autosave() {
	var json = save();
	localStorage.setItem("schedule", json);
}

var saveFile = null;
function saveToFile(filename) {
	fullname = filename+".schedule";
	json = save();
	var data = new Blob([json], {type: 'text/plain'});
    if (saveFile !== null) {
      window.URL.revokeObjectURL(saveFile); //Prevents memory leaks on multiple saves.
    }
    saveFile = window.URL.createObjectURL(data);
    saveLink = $("#saveLink")[0];
    saveLink.download = fullname;
    saveLink.href = saveFile;
    saveLink.click();
}

function loadFromFile(evt) {
	//https://www.html5rocks.com/en/tutorials/file/dndfiles/
	// ^ Explains how to read files as binary, text, etc.
    var reader = new FileReader();
    reader.onload = function(e) {
		console.log("Loaded: ");
		console.log(e.target.result);
		// Should probably check that this 'looks' like a schedule file.  check field names, number of fields, etc.
		// Step 1: Delete everything in the UI.
		var uids = [];
		for (var i = 0; i < tourn_ui.allPanels.length; i++) {
			uids.push(tourn_ui.allPanels[i].session.uid);
		}
		for (var i = 0; i < uids.length; i++) {
			deleteParams(uids[i]);
		}
		//Step 2: Replace tourn_ui.params and tourn_ui
        tourn_ui.params = load(e.target.result);
        tourn_ui = new EventPanel(tourn_ui.params);
    }
    if (evt.files[0]) {
        reader.readAsText(evt.files[0]);
    }
	alert ("Loaded " + evt.files[0].name + "!");
}

function getPanel(uid) {
	for (var i = 0; i < tourn_ui.allPanels.length; i++) {
		if (tourn_ui.allPanels[i].session.uid == uid) return tourn_ui.allPanels[i];
	}
	console.log("Failed to find Panel " + uid);
	return null;
}



function SessionPanel(session) {
	this.session = session;

	// Create elements of DOM input form
	this.docObj = $("<table class=roundtable>");

	// DOM objects
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

	// Build docObj
	if (this.session.type != TYPE_BREAK)
		var x = $("<tr><td><h3></h3></td><td><button class=\"btn\" onclick=\"copyToAll("+this.session.uid+")\">Copy to all</button></td></tr>");
	else var x = $("<tr><td colspan=\"2\"><h3></h3></td></tr>");
	$("h3", x).append(this.title);
	this.docObj.append(x);
	var x = $("<tr><td>Start time:</td><td><div></div></td></tr>");
	$("div", x).append(this.startDateInput);
	$("div", x).append(this.startTimeInput);
	this.docObj.append(x);
	var x = $("<tr><td>Must be done by:</td><td><div></div></td></tr>");
	$("div", x).append(this.endDateInput);
	$("div", x).append(this.endTimeInput);
	this.docObj.append(x);
	if (this.session.type != TYPE_BREAK) {
		var x = $("<tr><td>Duration (min):</td><td><div></div></td></tr>");
		$("div", x).append(this.lenInput);
		this.docObj.append(x);
		var x = $("<tr><td>Buffer/cleanup time (min):</td><td><div></div></td></tr>");
		$("div", x).append(this.bufInput);
		this.docObj.append(x);
		var x = $("<tr><td># Simultaneous teams:</td><td><div></div></td></tr>");
		if (this.session.type == TYPE_JUDGING) x = $("<tr hidden><td># Simultaneous teams:</td><td><div></div></td></tr>");
		$("div", x).append(this.simInput);
		this.docObj.append(x);
	}
	if (this.session.type == TYPE_JUDGING)
		var x = $("<tr><td># judging panels:</td><td><div></div></td></tr>");
	else if (this.session.type == TYPE_ROUND)
		var x = $("<tr><td># tables:</td><td><div></div></td></tr>");
	else if (this.session.type == TYPE_BREAK)
		var x = null;
	else 
		var x = $("<tr><td># locations:</td><td><div></div></td></tr>");
	if (x) {
		$("div", x).append(this.locsInput);
		this.docObj.append(x);
	}
	this.docObj.append($("<tr><td><button class=\"btn\" onclick=\"openLocationModal("+this.session.uid+")\" data-toggle=\"modal\" data-target=\"#smallModal\">Edit location names</button>\
		</td><td><button class=\"btn\" onclick=deleteParams("+this.session.uid+")>Delete</button></td></tr>"));
	// Add change listeners
    var ins = $("input,select", this.docObj);
    for (var i = 0; i < ins.length; i++) {
    	$(ins[i]).attr('onchange','getPanel('+this.session.uid+').update();');
	}

	this.updateDOM = function() {
		this.startDateInput.empty();
		this.endDateInput.empty();
		for (var i = 0; i < tournament.days.length; i++)
			this.startDateInput.append($("<option value=\""+i+"\">"+tournament.days[i]+"</option>"));
		if (tournament.days.length <= 1) this.startDateInput.hide();
		else this.startDateInput.show();
		for (var i = 0; i < tournament.days.length; i++)
			this.endDateInput.append($("<option value=\""+i+"\">"+tournament.days[i]+"</option>"));
		if (tournament.days.length <= 1) this.endDateInput.hide();
		else this.endDateInput.show();

		this.title[0].value = this.session.name;
		this.startDateInput[0].value = minsToDate(this.session.start);
		this.startTimeInput[0].value = minsToTime(this.session.start);
		this.endDateInput[0].value = minsToDate(this.session.end);
		this.endTimeInput[0].value = minsToTime(this.session.end);
		this.lenInput[0].value = this.session.length;
		this.bufInput[0].value = this.session.buffer;
		this.locsInput[0].value = this.session.nLocs;
		this.simInput[0].value = this.session.nSims;
		autosave();
	}
	this.update = function() {
		this.session.name = this.title[0].value;
		this.session.start = dtToMins(this.startDateInput[0].value,this.startTimeInput[0].value);
		this.session.end = dtToMins(this.endDateInput[0].value,this.endTimeInput[0].value);
		this.session.length = parseInt(this.lenInput[0].value);
		this.session.buffer = parseInt(this.bufInput[0].value);
		this.session.nLocs = parseInt(this.locsInput[0].value);
		if (this.session.type != TYPE_JUDGING) this.session.nSims = parseInt(this.simInput[0].value);
		else this.session.nSims = parseInt(this.session.nLocs);

		while (this.session.locations.length < this.session.nLocs) {
			if (this.session.type == TYPE_JUDGING)
				this.session.locations.push("Room "+ (this.session.locations.length+1));
			else if (this.session.type == TYPE_ROUND)
				this.session.locations.push("Table "+ (this.session.locations.length+1));				
			else this.session.locations.push("Lunch area");
		}
		while (this.session.locations.length > this.session.nLocs) {
			this.session.locations.splice(this.session.locations.length-1,1);
		}
		autosave();
	}
	this.updateDOM();
	this.update();

}

function copyToAll(uid) {
	var basePanel = getPanel(uid);
	for (var i = 0; i < tourn_ui.allPanels.length; i++) {
		var panel = tourn_ui.allPanels[i];
		if (panel.session.uid != uid && panel.session.type == basePanel.session.type) {
			panel.session.start = basePanel.session.start;
			panel.session.end = basePanel.session.end;
			panel.session.length = basePanel.session.length;
			panel.session.buffer = basePanel.session.buffer;
			panel.session.nLocs = basePanel.session.nLocs;
			panel.session.nSims = basePanel.session.nSims;
			panel.updateDOM();
			panel.update();
		}
	}
}

function addJudging(name,start,end,nSims,nLocs,length,buffer,locs) {
	// alert("Hello");
	var s = new SessionParameters(TYPE_JUDGING,name,start,end,nSims,nLocs,length,buffer,locs);
	tourn_ui.params.allSessions.push(s);
	var p = new SessionPanel(s);
	tourn_ui.allPanels.push(p);
	p.docObj.insertBefore("#addJudgeBtn")
}

function addRound(name,start,end,nSims,nLocs,length,buffer,locs) {
	// alert("Hello");
	var s = new SessionParameters(TYPE_ROUND,name,start,end,nSims,nLocs,length,buffer,locs);
	tourn_ui.params.allSessions.push(s);
	var p = new SessionPanel(s);
	tourn_ui.allPanels.push(p);
	p.docObj.insertBefore("#addRoundBtn")
}

function addBreak(name,start,end,locs) {
	// alert("Hello");
	var s = new SessionParameters(TYPE_BREAK,name,start,end,null,null,null,null,locs);
	tourn_ui.params.allSessions.push(s);
	var p = new SessionPanel(s);
	tourn_ui.allPanels.push(p);
	p.docObj.insertBefore("#addBreakBtn")
}

function minsToDate(x) {
	if (x == null) return null;
	return Math.floor(x/(24*60));
}

function minsToTime(x) {
	if (x == null) return null;
	x = (x%(24*60)) + tournament.start_time_offset;
	var h = Math.floor(x/60);
	var m = (x%60);
	var zh = (h < 10) ? "0" : "";
	var zm = (m < 10) ? "0" : "";
	return zh+h+":"+zm+m;
}

function dtToMins(d,t) {
	if (t == "") return null;
    var res = t.split(":");
    return d*(60*24) + parseInt(res[0])*60 + parseInt(res[1]) - tournament.start_time_offset;
}

function openLocationModal(uid) {
	panel = getPanel(uid);
    $("#sm-modal-body").empty();
    $("#sm-modal-footer").empty();
    $("#sm-modal-body").append($("<input type=\"hidden\" value=\""+uid+"\">"));
    for (var i = 0; i < panel.session.locations.length; i++) {
    	var input = $("<input type=\"text\" class=\"form-control\" value=\""+panel.session.locations[i]+"\">");
        $("#sm-modal-body").append(input);
        $("#sm-modal-body").append(document.createElement("BR"));
    }
    $("#sm-modal-footer").append($("<button type=\"button\" onclick=\"closeLocationModal()\" class=\"btn btn-default\" data-dismiss=\"modal\">Save</button>"));
    $("#sm-modal-footer").append($("<button type=\"button\" class=\"btn btn-default\" data-dismiss=\"modal\">Close</button>"));
}

function closeLocationModal() {
	var inputs = $("#sm-modal-body>input");
	uid = inputs[0].value;
	panel = getPanel(uid);
	for (var i = 1; i < inputs.length; i++)
		panel.session.locations[i-1] = inputs[i].value;
	autosave();
}

function openDayModal() {
    $("#sm-modal-body").empty();
    $("#sm-modal-footer").empty();
    $("#sm-modal-title")[0].innerHTML = "Days";
    for (var i = 0; i < tourn_ui.params.days.length; i++) {
    	var input = $("<input type=\"text\" class=\"form-control\" value=\""+tourn_ui.params.days[i]+"\">");
	    $("#sm-modal-body").append(input);
	    $("#sm-modal-body").append(document.createElement("BR"));
	}
    $("#sm-modal-footer").append($("<button type=\"button\" onclick=\"closeDayModal()\" class=\"btn btn-default\" data-dismiss=\"modal\">Save</button>"));
    $("#sm-modal-footer").append($("<button type=\"button\" class=\"btn btn-default\" data-dismiss=\"modal\">Close</button>"));
}

function closeDayModal() {
	var inputs = $("#sm-modal-body>input");
	for (var i = 0; i < inputs.length; i++)
		tourn_ui.params.days[i] = inputs[i].value;
	tourn_ui.changeNDays();
}

function openTeamImportModal() {
    $("#lg-modal-body").empty();
    $("#lg-modal-footer").empty();
    $("#lg-modal-body").append($("<p>One line per team.  Team numbers will automatically add\/delete to match the number of team names.</p>"))
    $("#lg-modal-body").append($("<p><button type=\"button\" class=\"btn\" onclick=\"tourn_ui.sequenceTeams()\">Number sequentially</button></p>"));
    var x = $("<textarea rows=\""+tourn_ui.params.teams.length+"\" cols=\"5\"></textarea>");
    for (var i = 0; i < tourn_ui.params.teams.length; i++)
    	x.append(tourn_ui.params.teams[i].number+"\n");
    $("#lg-modal-body").append(x);
    var x = $("<textarea rows=\""+tourn_ui.params.teams.length+"\" cols=\"60\"></textarea>");
    for (var i = 0; i < tourn_ui.params.teams.length; i++)
    	x.append(tourn_ui.params.teams[i].name+"\n");
    $("#lg-modal-body").append(x);
    $("#lg-modal-footer").append($("<button type=\"button\" onclick=\"closeTeamImportModal()\" class=\"btn btn-default\" data-dismiss=\"modal\">Save</button>"));
    $("#lg-modal-footer").append($("<button type=\"button\" class=\"btn btn-default\" data-dismiss=\"modal\">Close</button>"));
}

function closeTeamImportModal() {
	var inputs = $("#lg-modal-body>textarea");
	var nums = inputs[0].value.split("\n");
	if (nums[nums.length-1] == "") nums.splice(nums.length-1,1);
	var names = inputs[1].value.split("\n");
	if (names[names.length-1] == "") names.splice(names.length-1,1);
	while (nums.length < names.length) nums.push(""+(nums.length+1));
	while (nums.length > names.length) nums.splice(nums.length-1,1);
	while (tourn_ui.params.teams.length < nums.length) tourn_ui.params.teams.push(new TeamParameters(0));
	while (tourn_ui.params.teams.length > nums.length) tourn_ui.params.teams.splice(tourn_ui.params.teams.length-1,1);
	for (var i = 0; i < nums.length; i++) {
		tourn_ui.params.teams[i].number = nums[i];
		tourn_ui.params.teams[i].name = names[i];
	}
	tourn_ui.teamInput.value = tourn_ui.params.teams.length;
	autosave();
}

function openTeamEditModal() {
    $("#lg-modal-body").empty();
    $("#lg-modal-footer").empty();
    $("#lg-modal-body").append($("<table class=\"table\">"));
    $("#lg-modal-body>table").append($("<thead><tr><th>Team</th><th>Needs extra time?</th><th>Arrival time</th><th>Departure time</th></tr></thead>"));
    $("#lg-modal-body>table").append($("<tbody>"));
   	for (var i = 0; i < tourn_ui.params.teams.length; i++) {
   		var team = tourn_ui.params.teams[i];
   		var x = $("<tr>");
   		$(x).append($("<td>"+team.number+", "+team.name+"</td>"));
   		if (team.special)
	   		$(x).append($("<td><input type=\"checkbox\" class=\"form-control\" checked></td>"));
   		else 
   			$(x).append($("<td><input type=\"checkbox\" class=\"form-control\"></td>"));
		var dateInput1=$("<td><select class=\"form-control\" value=\""+minsToDate(team.start)+"\"></select></td>");
		for (var j = 0; j < tourn_ui.params.days.length; j++)
			$("select", dateInput1).append($("<option value=\""+j+"\">"+tourn_ui.params.days[j]+"</option>"));
		if (tourn_ui.params.days.length <= 1) $("select",dateInput1).hide();
		else $("select",dateInput1).show();
		$(x).append(dateInput1);
		if (team.start == null) 
	   		$(dateInput1).append($("<input class=\"form-control\" type=\"time\" step=\"900\">"));
		else 
	   		$(dateInput1).append($("<input class=\"form-control\" type=\"time\" step=\"900\" value=\""+minsToTime(team.start)+"\">"));
		var dateInput2=$("<td><select class=\"form-control\" value=\""+minsToDate(team.end)+"\"></select></td>");
		for (var j = 0; j < tourn_ui.params.days.length; j++)
			$("select", dateInput2).append($("<option value=\""+j+"\">"+tourn_ui.params.days[j]+"</option>"));
		if (tourn_ui.params.days.length <= 1) $("select",dateInput2).hide();
		else $("select",dateInput2).show();
		$(x).append(dateInput2);
		if (team.end == null) 
	   		$(dateInput2).append($("<input class=\"form-control\" type=\"time\" step=\"900\">"));
		else 
	   		$(dateInput2).append($("<input class=\"form-control\" type=\"time\" step=\"900\" value=\""+minsToTime(team.end)+"\">"));
		$("#lg-modal-body>table").append(x);
   	}
   	console.log($("#lg-modal-body"));
    $("#lg-modal-footer").append($("<button type=\"button\" onclick=\"closeTeamEditModal()\" class=\"btn btn-default\" data-dismiss=\"modal\">Save</button>"));
    $("#lg-modal-footer").append($("<button type=\"button\" class=\"btn btn-default\" data-dismiss=\"modal\">Close</button>"));
}

function closeTeamEditModal() {
	var modal = $("#lg-modal-body");
	var rows = $("tr", modal);
	for (var i = 1; i < rows.length; i++) {
		var inputs = $("input,select",rows[i]);
		var team = tourn_ui.params.teams[i-1];
		team.special = inputs[0].checked;
		console.log(inputs);
		console.log("inputs");
		team.start = dtToMins(inputs[1].value,inputs[2].value);
		team.end = dtToMins(inputs[3].value,inputs[4].value);
	}
}

function clickSave() {
	saveToFile(prompt("Enter filename", tourn_ui.params.name.replace(/ /g, '_')));
}

function clickLoad() {
	if (window.File && window.FileReader && window.FileList && window.Blob) {
	  // Great success! All the File APIs are supported.
	  $("#loadFileInput").click();
	} else {
	  alert('The File APIs are not fully supported in this browser.');
	}
}
