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
    let contacts = contactTracer.getContactTraceData(cowId, _date, daysToTrace); 

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

function autoDetectDateFormat(dateStr) {
    if (!dateStr) return 'YYYY-MM-DD'; // Fallback
    
    // Strip out times if they exist (e.g., "12/31/2024 14:30" -> "12/31/2024")
    let datePart = dateStr.trim().split(/[ T]/)[0];

    // Check for YYYY-MM-DD (Starts with 4 digits and uses hyphens)
    if (/^\d{4}-\d{1,2}-\d{1,2}/.test(datePart)) {
        return 'YYYY-MM-DD';
    }

    // Check for slash formats
    if (datePart.includes('/')) {
        let parts = datePart.split('/');
        
        if (parts.length >= 3) {
            let part1 = parseInt(parts[0], 10);
            let part2 = parseInt(parts[1], 10);

            if (part1 > 12) {
                // If the first number is > 12, it MUST be DD/MM/YYYY
                return 'DD/MM/YYYY'; 
            } else if (part2 > 12) {
                // If the second number is > 12, it MUST be MM/DD/YYYY
                return 'MM/DD/YYYY'; 
            }
            
            // If both are <= 12 (ambiguous like 05/06/2024), default to US format
            return 'MM/DD/YYYY';
        }
    }

    return 'YYYY-MM-DD'; // Default fallback
}

