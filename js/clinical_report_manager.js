class ClinicalReportManager {
    constructor() {
        this.targetEvent = "Clinical"; // Filter for Clinical events
        this.currentReportCSV = "";    // Store CSV data for export
        
    }


   setupReportDateControls() {
        let jqFormat = eventManager.displayJqFormat;
        
        $('#report_start_date, #report_end_date').datepicker({
            dateFormat: jqFormat
        });

        $('#report_duration').on('input', () => {
            this.updateReportDates();
        });

        $('#report_start_date, #report_end_date').on('change', () => {
            this.updateReportDuration();
        });
        
        $('#generate_report_btn').on('click', () => this.generateTable());
        $('#download_report_btn').on('click', () => this.downloadTableAsCSV());

        // ADDED: Trigger report generation whenever the toggle is clicked
        $('#track_daily_location_toggle').on('change', () => {
            this.generateTable();
        });

        this.updateReportDates();
        console.log("updated")
    }

    updateReportDates() {
        let anchorDateVal = $("#filter_current_date").datepicker().val() || moment().format(eventManager.displayMomentFormat);
        let daysToTrace = parseInt($('#report_duration').val()) || 0;

        let baseDate = moment(anchorDateVal, eventManager.displayMomentFormat);
        let targetDate = moment(anchorDateVal, eventManager.displayMomentFormat).add(daysToTrace, 'days');
        
        let startDate = moment.min(baseDate, targetDate);
        let endDate = moment.max(baseDate, targetDate);
            
        $('#report_start_date').val(startDate.format(eventManager.displayMomentFormat));
        $('#report_end_date').val(endDate.format(eventManager.displayMomentFormat));
    }

    updateReportDuration() {
        let startVal = $('#report_start_date').val();
        let endVal = $('#report_end_date').val();
        
        if (startVal && endVal) {
            let startDate = moment(startVal, eventManager.displayMomentFormat);
            let endDate = moment(endVal, eventManager.displayMomentFormat);
            
            let diffDays = endDate.diff(startDate, 'days');
            $('#report_duration').val(Math.abs(diffDays));
        }
    }

    openModal() {
        this.updateReportDates();
        $('#report_table_container').empty(); 
        this.currentReportCSV = "";
        
        let modalElement = document.getElementById('clinicalReportModal');
        let myModal = bootstrap.Modal.getOrCreateInstance(modalElement);
        myModal.show();
    }

    // Identifies the active plot key from event_settings (e.g., 'Clinical Count')
    getPlotKey() {
        for (var i in event_settings) {
            var obj = event_settings[i];
            if (obj["type"] == 'plot') {
                return obj.label;
            }
        }
        return null;
    }

   generateTable() {
        let startStr = $('#report_start_date').val();
        let endStr = $('#report_end_date').val();

        let startMoment = moment(startStr, eventManager.displayMomentFormat);
        let endMoment = moment(endStr, eventManager.displayMomentFormat);
        let global_end_date = moment($("#filter_end_date").val(), eventManager.displayMomentFormat); // Needed for movement edge cases

        if (!startMoment.isValid() || !endMoment.isValid()) {
            alert("Please enter valid start and end dates.");
            return;
        }

        let has_plot = this.getPlotKey();
        if (!has_plot || !window.event_data || !event_data[has_plot]) {
            $('#report_table_container').html('<div class="alert alert-warning">No plot tracking configuration found for clinical signs.</div>');
            return;
        }

        let array = event_data[has_plot];
        let sortedPens = Object.keys(layer_manager.pen_center).sort((a, b) => Number(a) - Number(b));
        
        // Check toggle state
        let trackDailyLocation = $('#track_daily_location_toggle').is(':checked');

        let dateMap = {};
        let colTotals = {};
        sortedPens.forEach(pen => colTotals[pen] = 0);
        let grandTotal = 0;

        let currMoment = startMoment.clone();
        while (currMoment.isSameOrBefore(endMoment)) {
            let _date = currMoment.unix();
            let dateDisplayStr = currMoment.format(eventManager.displayMomentFormat);

            let match_days = [];

            if (!trackDailyLocation) {
                // MODE 1: Onset Tracking (Original)
                for (let i = 0; i < array.length; i++) {
                    if (array[i]["start_date"] === _date) {
                        // Standardize object format for downstream processing
                        match_days.push({ from_pen: String(array[i]["from_pen"]) });
                    }
                }
            } else {
                // MODE 2: Active Daily Location Tracking
                let clinical_ids = new Set();
                
                // 1. Find all cows that are actively clinical on this day
                for (let i = 0; i < array.length; i++) {
                    if (_date >= array[i]["start_date"] && _date <= array[i]["end_date"]) {
                        clinical_ids.add(array[i]["id"]);
                    }
                }

                // 2. Find which pen those specific cows are in on this day
                for (let i = 0; i < record_manager.json_data.length; i++) {
                    let t = record_manager.json_data[i];
                    
                    if (clinical_ids.has(t["ID"])) {
                        let isStart = currMoment.isSame(t["START DATE"], 'day');
                        let isBetween = currMoment.isAfter(t["START DATE"], 'day') && currMoment.isBefore(t["END DATE"], 'day');
                        let isGlobalLastDay = currMoment.isSame(t["END DATE"], 'day') && currMoment.isSame(global_end_date, 'day');

                        if (isStart || isBetween || isGlobalLastDay) {
                            match_days.push({ from_pen: String(t["IN PEN"]) });
                        }
                    }
                }
            }

            // Downstream calculation logic remains identical
            if (match_days.length > 0) {
                if (!dateMap[dateDisplayStr]) {
                    dateMap[dateDisplayStr] = { total: 0 };
                    sortedPens.forEach(p => dateMap[dateDisplayStr][p] = 0);
                }

                match_days.forEach(item => {
                    let fromPen = item.from_pen;
                    if (sortedPens.includes(fromPen)) {
                        dateMap[dateDisplayStr][fromPen]++;
                        dateMap[dateDisplayStr].total++;
                        colTotals[fromPen]++;
                        grandTotal++;
                    }
                });
            }

            currMoment.add(1, 'days');
        }

        if (grandTotal === 0) {
            $('#report_table_container').html('<div class="alert alert-warning">No records found matching this plot criteria in the date range.</div>');
            this.currentReportCSV = "";
            return;
        }

        let sortedDates = Object.keys(dateMap);

        // Build CSV Header & HTML Table Header
        let csvArray = [`"Clinical Signs Date",${sortedPens.map(p => `"${p}"`).join(',')},"Total"`];
        
        let html = `
            <table class="table table-bordered table-sm table-striped text-center align-middle mt-3">
                <thead class="table-light">
                    <tr><th class="text-start">Clinical Signs Date</th>
        `;
        sortedPens.forEach(p => html += `<th>${p}</th>`);
        html += `<th>Total</th></tr></thead><tbody>`;

        // Generate Rows
        sortedDates.forEach(d => {
            html += `<tr><td class="text-start fw-bold">${d}</td>`;
            let csvRow = [`"${d}"`];
            
            sortedPens.forEach(p => {
                let count = dateMap[d][p] || 0;
                let pctStr = count > 0 ? ((count / grandTotal) * 100).toFixed(2) + '%' : '';
                html += `<td>${pctStr}</td>`;
                csvRow.push(`"${pctStr}"`);
            });
            
            let rowPct = ((dateMap[d].total / grandTotal) * 100).toFixed(1) + '%';
            html += `<td class="fw-bold">${rowPct}</td></tr>`;
            csvRow.push(`"${rowPct}"`);
            
            csvArray.push(csvRow.join(','));
        });

        // Generate Footer Totals
        html += `</tbody><tfoot class="table-light fw-bold"><tr><td class="text-start">Total</td>`;
        let csvFooter = [`"Total"`];
        
        sortedPens.forEach(p => {
            let colPct = colTotals[p] > 0 ? ((colTotals[p] / grandTotal) * 100).toFixed(1) + '%' : '';
            html += `<td>${colPct}</td>`;
            csvFooter.push(`"${colPct}"`);
        });
        
        html += `<td>100.0%</td></tr></tfoot></table>`;
        csvFooter.push(`"100.0%"`);
        csvArray.push(csvFooter.join(','));

        $('#report_table_container').html(html);
        this.currentReportCSV = csvArray.join('\n');
    }
}
// Initialize globally
const clinicalReportManager = new ClinicalReportManager();