function printToDom(event) {
	if (event.allSessions[0].schedule == null) return;
    if (event.errors > 0) {
        $("#words")[0].style.color = "red";
        var str = (event.errors == 1) ? " error" : " errors";
        $("#words")[0].innerHTML = event.errors + str + ".  Try again, or adjust your parameters.";
    } else {
        $("#words")[0].style.color = "green";        
        $("#words")[0].innerHTML = "Schedule generated successfully.  The below tables can be copied into spreadsheets, or you can view or download pre-formatted PDF's using either of the buttons below.  Please note that View PDFs may not work correctly if you have ad blocker installed. <br>NB: PDFs are not currently supported in Internet Explorer, but you can still use the tables.";
    }

	var results=$("#results");
	results.empty();
	for (var i = 0; i < event.allSessions.length; i++) {
		var session = event.allSessions[i];
		if (session.type != TYPE_BREAK) results.append(generateTable(session));
	}
	results.append(generateIndivTable(event));
}

function generateTable(session) {
	var result = $("<div class=\"container-fluid session\">");
	result.append($("<h4>"+session.name+"</h4>"));
	var table = $("<table class=\"table resultTable table-responsive\">");
	var header = "<thead><tr><th>#</th><th>Time</th>";
	for (var i = 0; i < session.locations.length; i++) 
		header += "<th>"+session.locations[i]+"</th>";
	header += "</tr></thead>";
	table.append($(header));

	var tbody = $("<tbody>");
	for (var i = 0; i < session.schedule.length; i++) {
		var instance = session.schedule[i];
		var row = $("<tr>");
		if (instance.extra) {
			row.append("<td class=\"extra-time\">"+instance.num+"</td>");
			row.append("<td class=\"extra-time\">"+minsToDT(instance.time)+"</td>");
		} else {
			row.append("<td>"+instance.num+"</td>");
			row.append("<td>"+minsToDT(instance.time)+"</td>");
		}

        var diff = instance.loc+instance.teams.length+1;
        for (var dummy = 0; dummy < instance.loc; dummy++) {
        	diff--;
            row.append($("<td>"));
        }

		for (var t = 0; t < instance.teams.length; t++) {
			diff--;
			var deets="event,"+session.uid+","+i+","+t;
			if (instance.teams[t] == NOT_YET_ADDED)
				row.append($("<td draggable=\"true\" class=\"unfilled\" ondrop=\"drop("+deets+")\" ondragstart=\"drag("+deets+")\" ondragover=\"allowDrop("+deets+")\">--</td>"));
			else 
				row.append($("<td draggable=\"true\" ondrop=\"drop("+deets+")\" ondragover=\"allowDrop("+deets+")\" ondragstart=\"drag("+deets+")\">"+getTeam(instance.teams[t]).number+"</td>"));
			console.log
		}
		while (diff-- >= 0) row.append($("<td>"));
		tbody.append(row);
	}
	table.append(tbody);
	result.append(table);
	return result;
}

function generateIndivTable(event) {
	var result = $("<div class=\"container-fluid indiv\">");
	result.append($("<h4>Individual Schedules</h4>"));
	var table = $("<table class=\"table resultTable table-condensed table-responsive\">");
	var header = "<thead><tr><th colspan=2>Team</th>";
	for (var i = 0; i < event.allSessions.length; i++) { 
		if (event.allSessions[i].type == TYPE_BREAK) continue;
		header += "<th colspan=3>"+event.allSessions[i].name+"</th>";
	}
	header += "<th rowspan=2>Min. Travel time</td></tr></thead>";
	table.append($(header));
	var header = "<thead><tr><th>#</th><th>Time</th>";
	for (var i = 0; i < event.allSessions.length; i++) { 
		if (event.allSessions[i].type == TYPE_BREAK) continue;
		header += "<th>#</th>";
		header += "<th>Time</th>";
		header += "<th>Loc</th>";
	}
	header += "</tr></thead>";
	table.append($(header));

	var tbody = $("<tbody>");
	for (var i = 0; i < event.teams.length; i++) {
		var row = $("<tr>");
		var team = event.teams[i];
		row.append($("<td>"+team.number+"</td><td>"+team.name+"</td>"));
		for (var j = 0; j < team.schedule.length; j++) {
			if (getSession(team.schedule[j].session_uid).type == TYPE_BREAK) continue;
			row.append($("<td>"+team.schedule[j].num+"</td>"));
			row.append($("<td>"+minsToDT(team.schedule[j].time)+"</td>"));
			if (team.schedule[j].loc == -1)
				row.append($("<td>--</td>"));
			else
				row.append($("<td>"+getSession(team.schedule[j].session_uid).locations[team.schedule[j].loc]+"</td>"));
		}
		row.append($("<td>"+minTravelTime(team)+"</td>"));
		tbody.append(row);
	}
	table.append(tbody);
	result.append(table);
	return result;
}

function drop(evt,uid,i,t) {
	evt.preventDefault();
    var from_uid = parseInt(evt.dataTransfer.getData("uid"));
    var from_i = parseInt(evt.dataTransfer.getData("instance"));
    var from_t = parseInt(evt.dataTransfer.getData("team"));
	var from_instance = getSession(from_uid).schedule[from_i];
    console.log(from_instance);
    var to_instance = getSession(uid).schedule[i];
    console.log(to_instance);
}

function allowDrop(evt,uid,i,t) {
	evt.preventDefault();
}

function drag(evt,uid,i,t) {
    evt.dataTransfer.setData("uid", uid);
    evt.dataTransfer.setData("instance", i);
    evt.dataTransfer.setData("team", t);
}