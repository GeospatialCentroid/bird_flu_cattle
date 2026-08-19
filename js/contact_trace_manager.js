class ContactTraceManager {
    constructor() {
        // Replaces your global variables
        this.currentTraceCowId = null;
        this.currentTraceCSV = "";
    }

    // Call this method when setting up the page or opening the modal
    setupTraceDateControls() {
        // Initialize jquery.datetimepicker (disable time if you only need dates)
        $('#trace_start_date, #trace_end_date').datetimepicker({
            timepicker: false,
            format: 'Y-m-d' // This matches the YYYY-MM-DD output of moment.js
        });

        // 1. When the trace duration changes -> update the start and end dates
        // Arrow functions used here to preserve 'this' context
        $('#trace_duration').on('input', () => {
            this.updateTraceDates();
        });

        // 2. When the user manually picks a start or end date -> update the duration
        $('#trace_start_date, #trace_end_date').on('change', () => {
            this.updateTraceDuration();
        });
        
        // Run once on setup to populate initial values
        this.updateTraceDates();
    }

    updateTraceDates() {
    // Use your global map filter date as the anchor point
    let anchorDateVal = $("#filter_current_date").datepicker().val() || moment().format(eventManager.displayMomentFormat);
    let daysToTrace = parseInt($('#trace_duration').val()) || 0;

    let baseDate = moment(anchorDateVal, eventManager.displayMomentFormat);
    let targetDate = moment(anchorDateVal, eventManager.displayMomentFormat).add(daysToTrace, 'days');
    
    let startDate = moment.min(baseDate, targetDate);
    let endDate = moment.max(baseDate, targetDate);
        
    // FIX: Use displayMomentFormat here instead of displayJqFormat
    $('#trace_start_date').val(startDate.format(eventManager.displayMomentFormat));
    $('#trace_end_date').val(endDate.format(eventManager.displayMomentFormat));
    }

    updateTraceDuration() {
        let startVal = $('#trace_start_date').val();
        let endVal = $('#trace_end_date').val();
        
        if (startVal && endVal) {
            let startDate = moment(startVal, eventManager.displayMomentFormat);
            let endDate = moment(endVal, eventManager.displayMomentFormat);
            
            // Calculate the difference in days and update the duration input
            let diffDays = endDate.diff(startDate, 'days');
            $('#trace_duration').val(diffDays);
        }
    }

    openTraceModal(cowId, durationDays) {
        // 1. Set the instance Cow ID so the trace function knows who to look for
        this.currentTraceCowId = cowId;
        
        // 2. Update the modal title to show the cow being traced
        document.getElementById('trace_cow_id_display').innerText = cowId;

        // 3. Set the duration input to match whatever was passed from the popup button
        document.getElementById('trace_duration').value = durationDays;

        // 4. Call our sync function to calculate and set the start/end dates
        this.updateTraceDates();

        // 5. Clear out any previous search results from the table and CSV
        document.getElementById('trace_results_body').innerHTML = '';
        this.currentTraceCSV = ""; 

        // 6. Finally, open the Bootstrap modal
        let traceModal = new bootstrap.Modal(document.getElementById('tracingModal'));
        traceModal.show();
        
        this.runContactTrace();
    }

    runContactTrace() {
        // Grab the explicit dates right out of the new UI inputs
        let traceStart = $('#trace_start_date').val();
        let traceEnd = $('#trace_end_date').val();
        
        // Pass the explicit dates instead of a base date and duration
        let contacts = this.getContactTraceData(this.currentTraceCowId, traceStart, traceEnd);
        
        // Send to table renderer
        this.renderTraceTable(contacts, this.currentTraceCowId, traceStart, traceEnd);
    }

    // Function now accepts explicit start and end dates
    getContactTraceData(cowId, traceStart, traceEnd) {
        var data = record_manager.json_data; // Assumes record_manager is available globally
        
        let startDate = moment(traceStart);
        let endDate = moment(traceEnd);
        
        let contacts = [];
        
        // 1. Get all movements for the target cow in the time window
        let targetCowMovements = data.filter(record => 
            String(record["ID"]) === String(cowId) && 
            record["START DATE"].isBefore(endDate) && 
            record["END DATE"].isAfter(startDate)
        );

        targetCowMovements.forEach(targetMove => {
            let activePen = targetMove["IN PEN"] || targetMove["FROM PEN"]; 

            // 2. Find other cows that were in that SAME active pen
            let potentialContacts = data.filter(record => 
                String(record["ID"]) !== String(cowId) && 
                (record["IN PEN"] === activePen || record["FROM PEN"] === activePen) 
            );
            
            potentialContacts.forEach(contactMove => {
                let overlapStart = moment.max(targetMove["START DATE"], contactMove["START DATE"]);
                let overlapEnd = moment.min(targetMove["END DATE"], contactMove["END DATE"]);
                
                // Still constrain the specific overlap event to the boundaries of our trace window
                let traceOverlapStart = moment.max(overlapStart, startDate);
                let traceOverlapEnd = moment.min(overlapEnd, endDate);
                
                if (traceOverlapStart.isBefore(traceOverlapEnd)) {
                    let durationDays = traceOverlapEnd.diff(traceOverlapStart, 'days');
                    
                    contacts.push({
                        cow_id: contactMove["ID"],
                        pen: activePen, 
                        event: contactMove["EVENT"] || "Unknown",
                        duration: durationDays === 0 ? 1 : durationDays, 
                        dates: `${traceOverlapStart.format('YYYY-MM-DD')} to ${traceOverlapEnd.format('YYYY-MM-DD')}`
                    });
                }
            });
        });
        
        return contacts;
    }

    renderTraceTable(contacts, traceCowId, traceStart, traceEnd) {
        let tbody = document.getElementById('trace_results_body');
        let color_events = get_cluster_color_events(); // Assumes this is available globally
        
        // 2. Initialize the CSV array with headers
        let csvArray = [ `"Contact Cow ID","Pen Location","Contact Event","Overlap Duration (days)","Start Date","End Date"`];
        
        if (contacts.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No contacts found in this timeframe.</td></tr>`;
            this.currentTraceCSV = ""; 
            return;
        }

        let groupedContacts = {};
        
        contacts.forEach(c => {
            if (!groupedContacts[c.cow_id]) {
                groupedContacts[c.cow_id] = {
                    cow_id: c.cow_id,
                    total_duration: 0,
                    records: []
                };
            }
            groupedContacts[c.cow_id].total_duration += c.duration;
            groupedContacts[c.cow_id].records.push(c);
        });

        let groupedArray = Object.values(groupedContacts);
        groupedArray.sort((a, b) => b.total_duration - a.total_duration);

        let html = '';
        
        groupedArray.forEach(group => {
            group.records.sort((a, b) => {
                let dateA = moment(a.dates.split(' to ')[0], eventManager.displayMomentFormat).valueOf();
                let dateB = moment(b.dates.split(' to ')[0], eventManager.displayMomentFormat).valueOf();
                return dateA - dateB;
            });

            let pensHtml = group.records.map(r => r.pen).join('<br>');
            let eventsHtml = group.records.map(r => {
                let badgeClass = color_events.includes(r.event) ? 'bg-danger' : 'bg-secondary';
                return `<span class="badge ${badgeClass} mb-1">${r.event}</span>`;
            }).join('<br>');
            let durationsHtml = group.records.map(r => `${r.duration} days`).join('<br>');
            let datesHtml = group.records.map(r => r.dates).join('<br>');

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
            
            group.records.forEach(r => {
                let cowIdCsv = group.cow_id; 
                let penCsv = r.pen;
                let eventCsv = r.event;
                let durationCsv = r.duration; 
                let dateParts = r.dates.split(' to '); 
                let startDateCsv = dateParts[0];
                let endDateCsv = dateParts[1];

                csvArray.push(`"${cowIdCsv}","${penCsv}","${eventCsv}","${durationCsv}","${startDateCsv}","${endDateCsv}"`);
            });
        });
        
        tbody.innerHTML = html;
        this.currentTraceCSV = csvArray.join('\n');
    }

    downloadTableAsCSV() {
        if (!this.currentTraceCSV) {
            alert("No data to download.");
            return;
        }

        let cowId = this.currentTraceCowId || document.getElementById('trace_cow_id_display').innerText; 
        let startDate = document.getElementById('trace_start_date').value;
        let endDate = document.getElementById('trace_end_date').value;

        let filename = `contact_trace_${cowId}_${startDate}_to_${endDate}.csv`;

        const blob = new Blob([this.currentTraceCSV], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        
        if (link.download !== undefined) { 
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
}

