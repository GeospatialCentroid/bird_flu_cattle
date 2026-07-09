/**
 * Get the URL parameters
 * source: https://css-tricks.com/snippets/javascript/get-url-variables/
 * @param  {String} url The URL
 * @return {Object}     The URL parameters
 */
var getParams = function (url) {
	var params = {};
	var parser = document.createElement('a');
	parser.href = url;
	var query = parser.search.substring(1);
	var vars = query.split('&');
	for (var i = 0; i < vars.length; i++) {
		var pair = vars[i].split('=');
		params[pair[0]] = decodeURIComponent(pair[1]);
	}
	return params;
};

//to support older browsers
String.prototype.replaceAll = function(target, replacement) {
  return this.split(target).join(replacement);
};

//color control
function rgbStrToHex(rgb) {
  var rgbvals = /rgb\((.+),(.+),(.+)\)/i.exec(rgb);
  var rval = parseInt(rgbvals[1]);
  var gval = parseInt(rgbvals[2]);
  var bval = parseInt(rgbvals[3]);
  return '#' + (
    rval.toString(16) +
    gval.toString(16) +
    bval.toString(16)
  ).toUpperCase();
}
function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
    ] : null;
}

function rgbToHex(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}
function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

String.prototype.clip_text=function(limit){
    if(this.length>limit){
       return "<div class='d-inline' title='"+this.toString()+"'>"+this.substring(0,limit)+"...</div>"
    }
    return this
}
String.prototype.hyper_text=function(){
    var urlRegex = /(https?:\/\/[^\s]+)/g;
    return this.replace(urlRegex, function(url) {
        return '<a href="' + url + '" target="_blank">' + url + '</a>';
    })
}
function endsWithAny(str, list) {
  return list.some(suffix => str.endsWith(suffix));
}
String.prototype.img_text=function(){
    const suffixes = [".jpg", ".png", ".gif"];
    if(endsWithAny(this, suffixes)){
        return '<img src="' + this + '" class="thumbnail" >';
    }else{
        return this
    }
}

//set via url params
var DEBUGMODE=false
console_log = (function (methods, undefined) {

    	var Log = Error; // does this do anything?  proper inheritance...?
    	Log.prototype.write = function (args, method) {
    		/// <summary>
    		/// Paulirish-like console.log wrapper.  Includes stack trace via @fredrik SO suggestion (see remarks for sources).
    		/// Paulirish-like console.log wrapper.  Includes stack trace via @fredrik SO suggestion (see remarks for sources).
    		/// </summary>
    		/// <param name="args" type="Array">list of details to log, as provided by `arguments`</param>
    		/// <param name="method" type="string">the console method to use:  debug, log, warn, info, error</param>
    		/// <remarks>Includes line numbers by calling Error object -- see
    		/// * http://paulirish.com/2009/log-a-lightweight-wrapper-for-consolelog/
    		/// * http://stackoverflow.com/questions/13815640/a-proper-wrapper-for-console-log-with-correct-line-number
    		/// * http://stackoverflow.com/a/3806596/1037948
    		/// </remarks>

    		// via @fredrik SO trace suggestion; wrapping in special construct so it stands out
    		var suffix = {
    			"@": (this.lineNumber
    					? this.fileName + ':' + this.lineNumber + ":1" // add arbitrary column value for chrome linking
    					: extractLineNumberFromStack(this.stack)
    			)
    		};

    		args = args.concat([suffix]);
    		// via @paulirish console wrapper
    		if (console && console[method]) {
    			if (console[method].apply) { console[method].apply(console, args); } else { console[method](args); } // nicer display in some browsers
    		}
    	};
    	var extractLineNumberFromStack = function (stack) {
    		/// <summary>
    		/// Get the line/filename detail from a Webkit stack trace.  See http://stackoverflow.com/a/3806596/1037948
    		/// </summary>
    		/// <param name="stack" type="String">the stack string</param>

    		// correct line number according to how Log().write implemented
    		var line = stack.split('\n')[3];
    		// fix for various display text
    		try{
                line = (line.indexOf(' (') >= 0
                    ? line.split(' (')[1].substring(0, line.length - 1)
                    : line.split('at ')[1]
                    );
                return line;
    		}catch(e){
    		    return "undefined";
    		}

    	};

    	// method builder
    	var logMethod = function(method) {
    		return function (params) {
    			/// <summary>
    			/// Paulirish-like console.log wrapper
    			/// </summary>
    			/// <param name="params" type="[...]">list your logging parameters</param>

    			// only if explicitly true somewhere
    			if (typeof DEBUGMODE === typeof undefined || !DEBUGMODE) return;

    			// call handler extension which provides stack trace
    			Log().write(Array.prototype.slice.call(arguments, 0), method); // turn into proper array & declare method to use
    		};//--	fn	logMethod
    	};
    	var result = logMethod('log'); // base for backwards compatibility, simplicity
    	// add some extra juice
    	for(var i in methods) result[methods[i]] = logMethod(methods[i]);

		return result; // expose
    })(['error', 'debug', 'info', 'warn']);//--- _log


class Analytics_Manager {
    constructor(properties,_resource_id) {
        // for events that might happen really frequently, like zooming into the map or changing the transparency
        // prevent more then one event from being tracking within a time frame
        this.sent_events=[]
    }
    track_event(category,action,label,value,delay){
        console_log("track event")
        return
        // not the delay prevents the same event from being submitted with a certain number of seconds
        var trigger=true
        if (delay){
            // check the events sent to see if there is a match
            var match=false
            for(var i=0;i<this.sent_events.length;i++){
                var s = this.sent_events[i]
                if(s.category==category && s.label==label && s.value==value){
                     //if match - check if enough time has surpassed to send another event
                     // if so - send a new event and update the time
                     if ((Date.now()-s.time)/1000>delay){
                        match=true
                     }else{
                        trigger=false
                     }
                     //update the time to extend the clock
                     s.time=Date.now()

                }
            }
            if(!match){
                 this.sent_events.push({category:category,label:label,value:value,time:Date.now()})
            }
        }
        if (trigger){
            console_log("trigger",category, action,label,value)

            gtag('event', action, {
              'event_category': category,
              'event_label': label,
              'value': value
            })
        }

    }
}

L.Layer.prototype.setInteractive = function (interactive) {
    if (this.getLayers) {
        try{
            this.getLayers().forEach(layer => {
                layer.setInteractive(interactive);
            });
        }catch(e){
            console.log("unable to set setInteractive", e)
        }

        return;
    }
    if (!this._path) {
        return;
    }

    this.options.interactive = interactive;

    if (interactive) {
        L.DomUtil.addClass(this._path, 'leaflet-interactive');
    } else {
        L.DomUtil.removeClass(this._path, 'leaflet-interactive');
    }
};
//https://stackoverflow.com/questions/2346011/how-do-i-scroll-to-an-element-within-an-overflowed-div
jQuery.fn.scrollTo = function(elem, speed) {
    $(this).animate({
        scrollTop:  $(this).scrollTop() - $(this).offset().top + $(elem).offset().top
    }, speed == undefined ? 1000 : speed);
    return this;
};

// a user could set more than one cluster color 
// (i.e the inportant event they want to track)
function get_cluster_color_events() {
    var event_names = [];
    for (var i in event_settings) {
        var e = event_settings[i];
        if (e.type == 'cluster_color') {
            event_names.push(e.start);
        }
    }
    return event_names;
}
//Contact tracing

// Global variable to remember which cow we are tracing
let currentTraceCowId = null; 

function triggerNetworkFromPopup(cowId, currentPen, days) {
    let _date = $("#filter_current_date").datepicker().val();
    
    // Parse the days from the popup, fallback to -14 if the user left it blank
    let daysToTrace = parseInt(days) || -14; 
    
    // Pass the user's requested days to your helper function
    let contacts = getContactTraceData(cowId, _date, daysToTrace); 

    // Close the popup and draw the map
    map_manager.map.closePopup();
    layer_manager.mapTransmissionNetwork(contacts, currentPen);
}
//

// Expects arrays in [lat, lng] format
function getBezierCurve(latlng1, latlng2, bendFactor = 0.3) {
    // Check if the coordinate is an Object {lat, lng} or an Array [lat, lng]
    let lat1 = (latlng1.lat !== undefined) ? latlng1.lat : latlng1[0];
    let lng1 = (latlng1.lng !== undefined) ? latlng1.lng : latlng1[1];
    
    let lat2 = (latlng2.lat !== undefined) ? latlng2.lat : latlng2[0];
    let lng2 = (latlng2.lng !== undefined) ? latlng2.lng : latlng2[1];

    // If they are STILL undefined, log an error so you can see exactly which pen is missing data
    if (lat1 === undefined || lat2 === undefined) {
        console.error("Invalid coordinates passed to Bezier generator:", latlng1, latlng2);
        return [];
    }

    // Find the midpoint
    let midLat = (lat1 + lat2) / 2;
    let midLng = (lng1 + lng2) / 2;

    // Calculate perpendicular offset
    let dLat = lat2 - lat1;
    let dLng = lng2 - lng1;
    
    // Determine the control point that "pulls" the curve outward
    let controlLat = midLat + (dLng * bendFactor);
    let controlLng = midLng - (dLat * bendFactor);

    // Generate 20 segments to make a smooth curve
    let points = [];
    for (let t = 0; t <= 1; t += 0.05) { 
        let lat = Math.pow(1 - t, 2) * lat1 + 2 * (1 - t) * t * controlLat + Math.pow(t, 2) * lat2;
        let lng = Math.pow(1 - t, 2) * lng1 + 2 * (1 - t) * t * controlLng + Math.pow(t, 2) * lng2;
        points.push([lat, lng]);
    }
    
    return points;
}
////

function openTraceModal(cowId, days) {
    currentTraceCowId = cowId;
    document.getElementById('trace_cow_id_display').innerText = cowId;
    
    // Sync the value from the popup to the modal's input field
    let daysToTrace = parseInt(days) || -14;
    document.getElementById('trace_duration').value = daysToTrace;
    
    // Clear previous results
    document.getElementById('trace_results_body').innerHTML = `<tr><td colspan="5" class="text-center text-muted">Loading trace...</td></tr>`;
    
    // Show the modal
    var myModal = new bootstrap.Modal(document.getElementById('tracingModal'));
    myModal.show();

    // Automatically run the contact trace so the table is fully populated when the modal opens!
    runContactTrace();
}

function runContactTrace() {
    let _date = $("#filter_current_date").datepicker().val();
    let daysToTrace = parseInt(document.getElementById('trace_duration').value);
    
    // Call the helper function!
    let contacts = getContactTraceData(currentTraceCowId, _date, daysToTrace);
    
    // Send to table renderer
    renderTraceTable(contacts);
}

///

// This function strictly calculates contacts and returns the array
function getContactTraceData(cowId, referenceDate, daysToTrace) {
    var data = record_manager.json_data;
    
    let baseDate = moment(referenceDate);
    let targetDate = moment(referenceDate).add(daysToTrace, 'days');
    
    let startDate = moment.min(baseDate, targetDate);
    let endDate = moment.max(baseDate, targetDate);
    
    let contacts = [];
    
    // 1. Get all movements for the target cow in the time window
    let targetCowMovements = data.filter(record => 
        String(record["ID"]) === String(cowId) && 
        record["START DATE"].isBefore(endDate) && 
        record["END DATE"].isAfter(startDate)
    );

    targetCowMovements.forEach(targetMove => {
        // FIX: Grab the pen the cow moved TO (or is currently in)
        let activePen = targetMove["IN PEN"] || targetMove["FROM PEN"]; 

        // 2. Find other cows that were in that SAME active pen
        let potentialContacts = data.filter(record => 
            String(record["ID"]) !== String(cowId) && 
            (record["IN PEN"] === activePen || record["FROM PEN"] === activePen) 
        );
        
        potentialContacts.forEach(contactMove => {
            let overlapStart = moment.max(targetMove["START DATE"], contactMove["START DATE"]);
            let overlapEnd = moment.min(targetMove["END DATE"], contactMove["END DATE"]);
            
            let traceOverlapStart = moment.max(overlapStart, startDate);
            let traceOverlapEnd = moment.min(overlapEnd, endDate);
            
            if (traceOverlapStart.isBefore(traceOverlapEnd)) {
                let durationDays = traceOverlapEnd.diff(traceOverlapStart, 'days');
                
                contacts.push({
                    cow_id: contactMove["ID"],
                    pen: activePen, // Use the active pen for the output table
                    event: contactMove["EVENT"] || "Unknown",
                    duration: durationDays === 0 ? 1 : durationDays, 
                    dates: `${traceOverlapStart.format('YYYY-MM-DD')} to ${traceOverlapEnd.format('YYYY-MM-DD')}`
                });
            }
        });
    });
    
    return contacts;
}

///

function renderTraceTable(contacts) {
    let tbody = document.getElementById('trace_results_body');
    let color_events = get_cluster_color_events();
    console.log(color_events);
    
    if (contacts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No contacts found in this timeframe.</td></tr>`;
        return;
    }

    // 1. Group the contacts by cow_id
    let groupedContacts = {};
    
    contacts.forEach(c => {
        // If we haven't seen this cow yet, create a container for it
        if (!groupedContacts[c.cow_id]) {
            groupedContacts[c.cow_id] = {
                cow_id: c.cow_id,
                total_duration: 0, // Keep a running total of all contact days
                records: []        // Store all the individual contact events here
            };
        }
        
        // Add the current event to this cow's group
        groupedContacts[c.cow_id].total_duration += c.duration;
        groupedContacts[c.cow_id].records.push(c);
    });

    // 2. Convert the grouped object back into an array so we can sort it
    let groupedArray = Object.values(groupedContacts);

    // Sort the primary rows by highest total duration of contact
    groupedArray.sort((a, b) => b.total_duration - a.total_duration);

    // 3. Generate the HTML
    let html = '';
    
    groupedArray.forEach(group => {
        // Sort each cow's individual records chronologically
        group.records.sort((a, b) => new Date(a.dates.split(' to ')[0]) - new Date(b.dates.split(' to ')[0]));

        // Map over the records to create stacked lines separated by <br> tags
        let pensHtml = group.records.map(r => r.pen).join('<br>');
        
        let eventsHtml = group.records.map(r => {
            let badgeClass = color_events.includes(r.event) ? 'bg-danger' : 'bg-secondary';
            return `<span class="badge ${badgeClass} mb-1">${r.event}</span>`;
        }).join('<br>');
        
        let durationsHtml = group.records.map(r => `${r.duration} days`).join('<br>');
        let datesHtml = group.records.map(r => r.dates).join('<br>');

        // Create a single row for the cow, with the stacked data in the columns
        // align-middle keeps everything vertically centered if rows get tall
        html += `
            <tr>
                <td class="align-middle">
                    <strong>${group.cow_id}</strong><br>
                    <small class="text-muted text-nowrap">Total: ${group.total_duration} days</small>
                </td>
                <td class="align-middle">${pensHtml}</td>
                <td class="align-middle">${eventsHtml}</td>
                <td class="align-middle">${durationsHtml}</td>
                <td class="align-middle text-nowrap">${datesHtml}</td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}
