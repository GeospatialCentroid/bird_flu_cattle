class ContactTraceManager {
    constructor() {
        this.currentTraceCowId = null;
        this.currentTraceCSV = "";
        this.availableTraceEvents = []; // Stores unique events for the modal catalog
        this._initEventDelegation();
    }

    _initEventDelegation() {
        // Event delegation to open the modal when clicking the filter input
        $(document).on('click', '#filter_contact_event', (e) => {
            let $target = $(e.currentTarget);
            let currentVals = $target.val();
            this.open_multi_select_modal('filter_contact_event', currentVals);
        });

        // Handle the Save button click for the multi-select modal specifically for contact tracing
        $(document).on('click', '#saveEventSelection', () => {
            let selected = [];
            $('#eventSelectionColumns input:checked').each((index, el) => {
                selected.push($(el).val());
            });
            
            let $filterInput = $('#filter_contact_event');
            if ($filterInput.length) {
                $filterInput.val(selected.length > 0 ? selected.join(', ') : '');
            }
            
            $('#eventSelectionModal').modal('hide');
            this.runContactTrace(); // Re-run trace with updated filters
        });
    }

    open_multi_select_modal(name, currentValues) {
        // Assumes init_event_selection_modal exists or is shared globally from EventManager
        if (typeof eventManager !== 'undefined' && eventManager.init_multi_select_modal) {
            eventManager.init_multi_select_modal();
        }
        
        $('#eventSelectionModal .modal-title').text('Select Contact Event(s)');
        
        let events = this.availableTraceEvents.length > 0 ? this.availableTraceEvents : (record_manager.catalog?.EVENT || []).sort();

        let chunkSize = 10;
        let columnsHtml = '';
        let currentArray = currentValues ? currentValues.split(',').map(s => s.trim()) : [];

        for (let i = 0; i < events.length; i += chunkSize) {
            let chunk = events.slice(i, i + chunkSize);
            
            columnsHtml += '<div class="col-sm-6 col-md-3 mb-3">'; 
            
            chunk.forEach((ev, index) => {
                let isChecked = currentArray.includes(ev) ? 'checked' : '';
                let safeId = `chk_trace_${i}_${index}`;
                
                columnsHtml += `
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" value="${ev}" id="${safeId}" ${isChecked}>
                        <label class="form-check-label" for="${safeId}">
                            ${ev}
                        </label>
                    </div>`;
            });
            columnsHtml += '</div>';
        }
        
        $('#eventSelectionColumns').html(columnsHtml);
        
        let multiModal = new bootstrap.Modal(document.getElementById('eventSelectionModal'));
        multiModal.show();

        $('.modal-backdrop').not('.modal-stack-fixed').last().addClass('modal-stack-fixed').css('z-index', '999999999');
    }

   setupTraceDateControls() {
        this.initTraceDatepickers();

        // 1. When the trace duration changes -> update the dates AND re-run the trace automatically
        $('#trace_duration').on('input', () => {
            this.updateTraceDates();
            this.runContactTrace(); // <--- Automatically triggers the report refresh
        });

        // 2. When the user manually picks a start or end date -> update the duration AND re-run trace
        $('#trace_start_date, #trace_end_date').on('change', () => {
            this.updateTraceDuration();
            this.runContactTrace(); // <--- Optional: also refresh report if dates are manually picked
        });
        
        // Listen to global format changes to refresh inputs and bounds on the fly
        $("#global_date_format").on("change", () => {
            this.initTraceDatepickers();
            this.updateTraceDates();
        });

        this.updateTraceDates();
    }

    initTraceDatepickers() {
        let minStr = record_manager.global_min_date ? record_manager.global_min_date.format(eventManager.displayMomentFormat) : undefined;
        let maxStr = record_manager.global_max_date ? record_manager.global_max_date.format(eventManager.displayMomentFormat) : undefined;
        try {
            $('#trace_start_date').datepicker("destroy");
        } catch (e) {}

        try {
            $('#trace_end_date').datepicker("destroy");
        } catch (e) {}

        $('#trace_start_date, #trace_end_date').datepicker({
            dateFormat: eventManager.displayJqFormat,
            minDate: minStr,
            maxDate: maxStr
        });
    }

    updateTraceDates() {
        let anchorDateVal = $("#filter_current_date").val() || moment().format(eventManager.displayMomentFormat);
        let daysToTrace = parseInt($('#trace_duration').val()) || 0;

        let baseDate = moment(anchorDateVal, eventManager.displayMomentFormat);
        let targetDate = moment(anchorDateVal, eventManager.displayMomentFormat).add(daysToTrace, 'days');
        
        let startDate = moment.min(baseDate, targetDate);
        let endDate = moment.max(baseDate, targetDate);
            
        // Use global moment format
        $('#trace_start_date').val(startDate.format(eventManager.displayMomentFormat));
        $('#trace_end_date').val(endDate.format(eventManager.displayMomentFormat));
    }

    updateTraceDuration() {
        let startVal = $('#trace_start_date').val();
        let endVal = $('#trace_end_date').val();
        
        if (startVal && endVal) {
            let startDate = moment(startVal, eventManager.displayMomentFormat);
            let endDate = moment(endVal, eventManager.displayMomentFormat);
            
            let diffDays = endDate.diff(startDate, 'days');
            $('#trace_duration').val(diffDays);
        }
    }

    toggleContactEventColumn() {
        let isChecked = document.getElementById('toggleContactEvent').checked;
        let elements = document.querySelectorAll('.col-contact-event');
        
        elements.forEach(el => {
            if (isChecked) {
                el.classList.remove('contact-event-hidden');
            } else {
                el.classList.add('contact-event-hidden');
            }
        });

        this.runContactTrace();
    }

    openTraceModal(cowId, durationDays) {
        this.currentTraceCowId = cowId;
        document.getElementById('trace_cow_id_display').innerText = cowId;
        document.getElementById('trace_duration').value = durationDays;
        
        // Reset filter field on open if desired
        $('#filter_contact_event').val('');
        this.initTraceDatepickers()
        this.updateTraceDates();
        document.getElementById('trace_results_body').innerHTML = '';
        this.currentTraceCSV = ""; 

        let traceModal = new bootstrap.Modal(document.getElementById('tracingModal'));
        traceModal.show();
        
        this.runContactTrace();
    }

    runContactTrace() {
        let traceStart = $('#trace_start_date').val();
        let traceEnd = $('#trace_end_date').val();
        
        let contacts = this.getContactTraceData(this.currentTraceCowId, traceStart, traceEnd);
        this.renderTraceTable(contacts, this.currentTraceCowId, traceStart, traceEnd);
    }

    getContactTraceData(cowId, traceStart, traceEnd) {
        var data = record_manager.json_data;
        let startDate = moment(traceStart);
        let endDate = moment(traceEnd);
        let contacts = [];
        
        let targetCowMovements = data.filter(record => 
            String(record["ID"]) === String(cowId) && 
            record["START DATE"].isBefore(endDate) && 
            record["END DATE"].isAfter(startDate)
        );

        let allUniqueEvents = new Set();

        targetCowMovements.forEach(targetMove => {
            let activePen = targetMove["IN PEN"] || targetMove["FROM PEN"]; 

            let potentialContacts = data.filter(record => 
                String(record["ID"]) !== String(cowId) && 
                (record["IN PEN"] === activePen || record["FROM PEN"] === activePen) 
            );
            
            potentialContacts.forEach(contactMove => {
                let eventName = contactMove["EVENT"] || "Unknown";
                allUniqueEvents.add(eventName);

                let overlapStart = moment.max(targetMove["START DATE"], contactMove["START DATE"]);
                let overlapEnd = moment.min(targetMove["END DATE"], contactMove["END DATE"]);
                
                let traceOverlapStart = moment.max(overlapStart, startDate);
                let traceOverlapEnd = moment.min(overlapEnd, endDate);
                
                if (traceOverlapStart.isBefore(traceOverlapEnd)) {
                    let durationDays = traceOverlapEnd.diff(traceOverlapStart, 'days');
                    
                    contacts.push({
                        cow_id: contactMove["ID"],
                        pen: activePen, 
                        event: eventName,
                        duration: durationDays === 0 ? 1 : durationDays, 
                        dates: `${traceOverlapStart.format('YYYY-MM-DD')} to ${traceOverlapEnd.format('YYYY-MM-DD')}`
                    });
                }
            });
        });

        // Save catalog list for the modal checkbox builder
        this.availableTraceEvents = Array.from(allUniqueEvents).sort();

        // Apply selected multi-select filters from the input text value
        let filterVal = $('#filter_contact_event').val();
        if (filterVal) {
            let selectedOptions = filterVal.split(',').map(s => s.trim()).filter(Boolean);
            if (selectedOptions.length > 0) {
                contacts = contacts.filter(c => selectedOptions.includes(c.event));
            }
        }
        
        return contacts;
    }

    renderTraceTable(contacts, traceCowId, traceStart, traceEnd) {
        let tbody = document.getElementById('trace_results_body');
        let color_events = get_cluster_color_events();
        
        let isEventVisible = document.getElementById('toggleContactEvent').checked;
        let visibilityClass = isEventVisible ? '' : 'contact-event-hidden';

        // 1. Initialize CSV headers based on whether events are shown or hidden
        let csvArray = [];
        if (isEventVisible) {
            csvArray.push(`"Contact Cow ID","Pen Location","Contact Event","Overlap Duration (days)","Start Date","End Date"`);
        } else {
            csvArray.push(`"Contact Cow ID","Pen Location","Overlap Duration (days)","Start Date","End Date"`);
        }
        
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
                    pens: new Set(),
                    events: new Set(),
                    dates: []
                };
            }
            groupedContacts[c.cow_id].total_duration += c.duration;
            groupedContacts[c.cow_id].pens.add(c.pen);
            groupedContacts[c.cow_id].events.add(c.event);
            groupedContacts[c.cow_id].dates.push(c.dates);
        });

        let groupedArray = Object.values(groupedContacts);
        groupedArray.sort((a, b) => b.total_duration - a.total_duration);

        let html = '';

        groupedArray.forEach(group => {
            let pensList = Array.from(group.pens);
            let eventsList = Array.from(group.events);

            let pensHtml, eventsHtml, durationsHtml, datesHtml;

            if (!isEventVisible) {
                // COLLAPSED VIEW (When Contact Event is hidden)
                pensHtml = pensList.join(', ');
                eventsHtml = eventsList.map(ev => {
                    let badgeClass = color_events.includes(ev) ? 'bg-danger' : 'bg-secondary';
                    return `<span class="badge ${badgeClass} mb-1">${ev}</span>`;
                }).join('<br>');
                
                durationsHtml = `${group.total_duration} days`;
                
                let allDates = group.dates.map(d => d.split(' to '));
                let minStart = allDates.reduce((min, d) => d[0] < min ? d[0] : min, allDates[0][0]);
                let maxEnd = allDates.reduce((max, d) => d[1] > max ? d[1] : max, allDates[0][1]);
                datesHtml = `${minStart} to ${maxEnd}`;

                // Push consolidated summary row to CSV
                csvArray.push(`"${group.cow_id}","${pensHtml}","${group.total_duration}","${minStart}","${maxEnd}"`);

            } else {
                // EXPANDED VIEW (Default with individual event rows)
                let groupRecords = contacts.filter(c => c.cow_id === group.cow_id);
                groupRecords.sort((a, b) => {
                    let dateA = moment(a.dates.split(' to ')[0], eventManager.displayMomentFormat).valueOf();
                    let dateB = moment(b.dates.split(' to ')[0], eventManager.displayMomentFormat).valueOf();
                    return dateA - dateB;
                });

                pensHtml = groupRecords.map(r => r.pen).join('<br>');
                eventsHtml = groupRecords.map(r => {
                    let badgeClass = color_events.includes(r.event) ? 'bg-danger' : 'bg-secondary';
                    return `<span class="badge ${badgeClass} mb-1">${r.event}</span>`;
                }).join('<br>');
                durationsHtml = groupRecords.map(r => `${r.duration} days`).join('<br>');
                datesHtml = groupRecords.map(r => r.dates).join('<br>');

                // Push individual rows to CSV
                groupRecords.forEach(r => {
                    let dateParts = r.dates.split(' to '); 
                    csvArray.push(`"${group.cow_id}","${r.pen}","${r.event}","${r.duration}","${dateParts[0]}","${dateParts[1]}"`);
                });
            }

            html += `
                <tr>
                    <td class="align-middle">
                        <strong>${group.cow_id}</strong><br>
                        <small class="text-muted text-nowrap">Total: ${group.total_duration} days</small>
                    </td>
                    <td class="align-middle">${pensHtml}</td>
                    <td class="align-middle col-contact-event ${visibilityClass}">${eventsHtml}</td>
                    <td class="align-middle">${durationsHtml}</td>
                    <td class="align-middle text-nowrap">${datesHtml}</td>
                </tr>
            `;
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
        download(filename, this.currentTraceCSV);
    }
}