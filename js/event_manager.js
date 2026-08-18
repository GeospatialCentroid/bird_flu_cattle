class EventManager {
    constructor() {
        this.current_multi_select_target = null;
        this.required_files = { ".csv": {}, ".geojson": {} };
        
        // Define default display formats
        this.displayMomentFormat = 'MM/DD/YYYY';
        this.displayJqFormat = 'mm/dd/yy';
        
        this._initEventDelegation();
    }

    init_event_prompt(data) {
        var $this=eventManager
        console.log("init_event_prompt");
        $this.setup_fields();
        $this.setup_dates(record_manager.all_data);
        $(".picker").drawrpalette("destroy");
        
        let event_settings = data.event_settings; // store the settings
        for (var e in event_settings) {
            if (e > 0) {
                // make a duplicate
                $this.duplicate_row($(".duplicate").last());
            }
            $("#data_form .row:last-child").each((index, el) => {
                $(el).find(":input").each((index, input) => {
                    if (typeof($(input).attr("data")) !== "undefined") {
                        // set the value of the input
                        $(input).val(event_settings[e][$(input).attr("data")]);
                    }
                });
            });
        }

        $(".picker").drawrpalette().on("choose.drawrpalette", (event, hexcolor) => {
            console.log("choose: " + hexcolor);
        });

        $this.show_model();
    }

    show_model() {
        $('#model_data_form').modal('show');
        
        setTimeout(() => {
            $('#data_form_save_but').focus();
        }, 500);
    }

    duplicate_row(elm) {
        $(elm).parent().parent().parent().append($(elm).parent().parent().clone());
    }

    fix_picker() {
        $("span.cow_color:last").empty();
        $("span.cow_color:last").html('<input type="text" class="cow_color picker" value="" data="color"/>');
        $(".picker:last").drawrpalette();
    }

    delete_row(elm) {
        $(elm).parent().parent().remove();
    }

    setup_fields() {
        // get all the unique events and populate the dropdowns
        $('.start_dropdown').append(this.get_dropdown('start'));
        $('.end_dropdown').append(this.get_dropdown('end'));
    }

    _initEventDelegation() {
        // Event delegation ensures that dynamically duplicated rows will still trigger the modal
        $(document).on('click', '.multi-select-trigger', (e) => {
            let $target = $(e.currentTarget);
            let name = $target.attr('data');
            this.current_multi_select_target = $target;
            this.open_multi_select_modal(name, $target.val());
        });

        // Handle the Save button click for the multi-select modal globally
        $(document).on('click', '#saveEventSelection', () => {
            let selected = [];
            $('#eventSelectionColumns input:checked').each((index, el) => {
                selected.push($(el).val());
            });
            
            if (this.current_multi_select_target) {
                this.current_multi_select_target.val(selected.join(', '));
            }
            
            $('#eventSelectionModal').modal('hide');
        });

        // Listener for the new Global Date Format dropdown
        $("#global_date_format").on("change", function() {
            // 1. Store the OLD format before we overwrite it
            var oldMomentFormat = eventManager.displayMomentFormat;
            
            // 2. Get the NEW formats from the dropdown
            var newMomentFormat = $(this).val();
            var newJqFormat = $(this).find(':selected').data('jq');
            
            // 3. Safely parse the CURRENT date values using the OLD format so we don't lose them
            var currentStart = moment($("#filter_start_date").val(), oldMomentFormat);
            var currentEnd = moment($("#filter_end_date").val(), oldMomentFormat);
            var currentCurr = moment($("#filter_current_date").val(), oldMomentFormat);
            
            // 4. Update your global eventManager variables
            eventManager.displayMomentFormat = newMomentFormat;
            eventManager.displayJqFormat = newJqFormat;
            
            // 5. Update the jQuery UI Datepickers to use the new format 
            //    and immediately set the inputs to the new formatted string
            if (currentStart.isValid()) {
                $("#filter_start_date")
                    .datepicker("option", "dateFormat", newJqFormat)
                    .val(currentStart.format(newMomentFormat));
            }
                
            if (currentEnd.isValid()) {
                $("#filter_end_date")
                    .datepicker("option", "dateFormat", newJqFormat)
                    .val(currentEnd.format(newMomentFormat));
            }
                
            if (currentCurr.isValid()) {
                $("#filter_current_date")
                    .datepicker("option", "dateFormat", newJqFormat)
                    .val(currentCurr.format(newMomentFormat));
                    
                // 6. Update the map label if you have one
                $("#map_label").html("<b>Date:</b> " + $("#filter_current_date").val());
                
                // 7. Re-trigger the data search to refresh map/markers natively in the new format
                if (typeof record_manager !== 'undefined') {
                    record_manager.search_by_date(currentCurr);
                }
            }
        });
    }

    get_dropdown(name) {
        // Return a read-only input instead of a select element
        return $('<input type="text" class="form-control bg-white multi-select-trigger" data="' + name + '" readonly placeholder="Select ' + name + ' events..." style="cursor: pointer;">');
    }

    init_multi_select_modal() {
        if ($('#eventSelectionModal').length === 0) {
            let modalHtml = `
            <div class="modal fade" id="eventSelectionModal" tabindex="-1" aria-hidden="true" style="z-index: 1000000000;">
              <div class="modal-dialog modal-lg">
                <div class="modal-content">
                  <div class="modal-header">
                    <h5 class="modal-title">Select Events</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                  </div>
                  <div class="modal-body">
                    <div id="eventSelectionColumns" class="row"></div>
                  </div>
                  <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-primary" id="saveEventSelection">Save</button>
                  </div>
                </div>
              </div>
            </div>`;
            $('body').append(modalHtml);

            // Clean up stuck backdrops and restore body state when closed
            $('#eventSelectionModal').on('hidden.bs.modal', function () {
                $('.modal-stack-fixed').remove();
                if ($('#model_data_form').hasClass('show')) {
                    $('body').addClass('modal-open');
                }
            });
        }
    }

    open_multi_select_modal(name, currentValues) {
        this.init_multi_select_modal();
        
        $('#eventSelectionModal .modal-title').text('Select ' + name + ' event(s)');
        
        let events = record_manager.catalog.EVENT.sort();
        if (name === 'end') {
            events = ['None'].concat(events);
        }

        let chunkSize = 10;
        let columnsHtml = '';
        let currentArray = currentValues ? currentValues.split(',').map(s => s.trim()) : [];

        for (let i = 0; i < events.length; i += chunkSize) {
            let chunk = events.slice(i, i + chunkSize);
            
            columnsHtml += '<div class="col-sm-6 col-md-3 mb-3">'; 
            
            chunk.forEach((ev, index) => {
                let isChecked = currentArray.includes(ev) ? 'checked' : '';
                let safeId = `chk_${name}_${i}_${index}`;
                
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
        
        // Show the modal
        let multiModal = new bootstrap.Modal(document.getElementById('eventSelectionModal'));
        multiModal.show();

        // Ensure Bootstrap's backdrop layer appears directly underneath this modal (above the previous one)
        $('.modal-backdrop').not('.modal-stack-fixed').last().addClass('modal-stack-fixed').css('z-index', '999999999');
    }

    process_data_forms() {
        $('body').addClass('waiting-cursor');
        console.log("process_data_forms");
        
        var posts = [];
        $("#data_form").children().each((index, el) => {
            var p = {};
            $(el).find(":input").each((index, input) => {
                let dataAttr = $(input).attr("data");
                if (dataAttr) {
                    let val = $(input).val();
                    
                    // If the field is start or end, convert the comma-separated string into an array
                    if ((dataAttr === 'start' || dataAttr === 'end') && typeof val === 'string') {
                        p[dataAttr] = val ? val.split(',').map(s => s.trim()).filter(Boolean) : [];
                    } else {
                        p[dataAttr] = val;
                    }
                }
            });
            posts.push(p);
        });
        
        $('#model_data_form').modal('hide');
        setup_interface(posts);
        $('body').removeClass('waiting-cursor');
    }

    on_file_change(event) {
        const files = event.target.files;

        for (const file of files) {
            const reader = new FileReader();

            reader.onload = (e) => {
                this.check_requirements(file.name, e.target.result);
            };

            reader.onerror = () => {
                console.error("Error reading the file");
            };
            reader.readAsText(file);
        }
    }

    check_requirements(_file, _data) {
        var ext = _file.substring(_file.lastIndexOf("."));
        this.required_files[ext]["file_name"] = _file;
        this.required_files[ext]["data"] = _data;

        var requirements_met = true;
        for (var r in this.required_files) {
            if (Object.keys(this.required_files[r]).length === 0) {
                requirements_met = false;
            }
        }
        
        if (requirements_met) {
            record_manager.parse_data(this.required_files[".csv"].data, record_manager);
            $("#data_file").html(this.required_files[".csv"].file_name);
            layer_manager.create_geojson(JSON.parse(this.required_files[".geojson"].data));
            $("#map_file").html(this.required_files[".geojson"].file_name);
        }
    }

    setup_dates(data) {
        var date_list = record_manager.get_date_list(record_manager, data);
        
        // Assuming get_date_list returns Moment objects parsed with record_manager.date_format
        var start = date_list[0];
        var end = date_list[date_list.length - 1];
        
        if ($("#init_filter_start_date").hasClass('hasDatepicker')) {
            $("#init_filter_start_date").datepicker("destroy");
        }
        if ($("#init_filter_end_date").hasClass('hasDatepicker')) {
            $("#init_filter_end_date").datepicker("destroy");
        }
        
        // Configure logic with JqFormat, output values with MomentFormat
        $("#init_filter_start_date").datepicker({
            dateFormat: this.displayJqFormat,
            minDate: start.format(this.displayMomentFormat),
            maxDate: end.format(this.displayMomentFormat)
        }).val(start.format(this.displayMomentFormat));

        $("#init_filter_end_date").datepicker({
            dateFormat: this.displayJqFormat,
            minDate: start.format(this.displayMomentFormat),
            maxDate: end.format(this.displayMomentFormat)
        }).val(end.format(this.displayMomentFormat));
    }
}