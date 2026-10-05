
class Data_Config_Handler {
    /**
     * Manages the Data Config popup elements and transforms the loaded CSV data
     * before passing it back to the Record_Manager for processing.
     * 
     * @param {Object} record_manager - The instance of Record_Manager.
     * @param {Array} required_variables - The array of required columns.
     */
    constructor(record_manager, required_variables) {
        this.record_manager = record_manager;
        this.required_variables = required_variables || [];
        
        // Centralized object array storing date formats, values, and optional dataset attributes
        this.date_formats = [
            { text: "YYYY-MM-DD", value: "YYYY-MM-DD" },
            { text: "MM/DD/YYYY", value: "MM/DD/YYYY" },
            { text: "DD/MM/YYYY", value: "DD/MM/YYYY" },
            { text: "M/D/YY", value: "M/D/YY", dataJq: "m/d/y" },
            { text: "M/D/YYYY", value: "M/D/YYYY" },
            { text: "MM/DD/YY", value: "MM/DD/YY" },
            { text: "YYYY/MM/DD", value: "YYYY/MM/DD" }
        ];
    }

    /**
     * Dynamically populates the date format select dropdown based on the centralized object.
     */
    populate_date_format_dropdown() {
        const $select =$('#csv_input_date_format');
        $select.empty();
        
        this.date_formats.forEach(format => {
            const dataJqAttr = format.dataJq ? ` data-jq="${format.dataJq}"` : "";
            $select.append(`<option value="${format.value}"${dataJqAttr}>${format.text}</option>`);
        });
    }

    /**
     * Initializes the modal UI, populates dropdowns based on CSV headers, 
     * and binds event listeners.
     */
    setup_config_ui() {
        // Populate the dropdown before handling the data
        this.populate_date_format_dropdown();

        const data = this.record_manager.json_data;
        if (!data || data.length === 0) return;

        $("#model_data_config").show();
        $('#data_config_save_but').focus();
        
        const keys = Object.keys(data[0]).sort();
        $("#required_variables").empty(); 

        for (let i = 0; i < this.required_variables.length; i++) {
            let rv = this.required_variables[i];
            let optional = (["TO PEN", "MOVE EVENT", "REMARK"].includes(rv)) ? " (optional)" : "";
            
            let html = `<div class="d-flex align-items-center"><div class="form-row-item"><label for="${rv.replaceAll(" ", "_")}">${rv}${optional}</label> `;
            html += `<select id="${rv.replaceAll(" ", "_")}">`;
            
            if (rv === "MOVE EVENT") {
                html += `<option value="0">Not Selected</option>`;
            } else {
                html += `<option value="0">Not Available</option>`;
                for (let k = 0; k < keys.length; k++) {
                    const keyUpper = keys[k].toUpperCase();
                    const rvUpper = rv.toUpperCase();
                    const isSelected = (keyUpper === rvUpper) || (rv === "CURRENT PEN" && keyUpper === "PEN");
                    const selected = isSelected ? 'selected' : '';

                    html += `<option value="${keys[k]}" ${selected}>${keys[k]}</option>`;
                }
            }
            
            html += `</select></div></div>`;
            $("#required_variables").append(html);
        }

        $('#EVENT').off('change').on('change', (e) => {
            this.populate_move_event_options($(e.target).val());
        });
        
        $('#DATE').off('change').on('change', (e) => {
            this.config_date_value(data[0], $(e.target).val());
        });

        $('#csv_input_date_format').off('change input').on('change input', (e) => {
            this.update_date_preview(data[0], $('#DATE').val(), $(e.target).val());
        });

        this.config_date_value(data[0], $('#DATE').val());
        this.populate_move_event_options($('#EVENT').val());

        $('#data_config_save_but').off('click').on('click', () => {
            this.save_data_config();
        });
    }

    populate_move_event_options(event_column_key) {

        const data = this.record_manager.json_data;
        const $moveSelect =$('#MOVE_EVENT');
        if (!$moveSelect.length) return;

        const currentSelection = $moveSelect.val();
        $moveSelect.empty();$moveSelect.append('<option value="0">Not Selected</option>');

        if (!event_column_key || event_column_key === "0" || !data || data.length === 0) {
            return;
        }

        const uniqueValues = new Set();
        for (let i = 0; i < data.length; i++) {
            const val = data[i][event_column_key];
            if (val !== undefined && val !== null && String(val).trim() !== "") {
                uniqueValues.add(String(val).trim());
            }
        }

        Array.from(uniqueValues).sort().forEach(val => {
            const isSelected = (val === currentSelection || (currentSelection === "0" && val.toUpperCase() === "MOVE")) ? 'selected' : '';
            $moveSelect.append(`<option value="${val}" ${isSelected}>${val}</option>`);
        });
    }

    // Evaluates a date string dynamically against the centralized class property
    auto_detect_date_format(date_string) {
        for (let formatObj of this.date_formats) {
            if (moment(date_string, formatObj.value, true).isValid()) {
                return formatObj.value;
            }
        }
        return this.date_formats[0].value; // Default fallback to the first option if no match
    }

    config_date_value(sample_data_row, date_column_key) {
        let first_date_value = sample_data_row[date_column_key]; 
        
        if (first_date_value) {
            let guessed_format = this.auto_detect_date_format(first_date_value);
            console.log(guessed_format, "guessed_format");
            $('#csv_input_date_format').val(guessed_format);
            
            this.update_date_preview(sample_data_row, date_column_key, guessed_format);
        } else {
            $('#first_date_preview').text("(No date found in first row)").css('color', 'inherit');
            $('#data_config_save_but').prop('disabled', true); 
        }
    }

    update_date_preview(sample_data_row, date_column_key, format_string) {
        // [Existing logic remains unchanged]
        let raw_date_value = sample_data_row[date_column_key];
        
        if (!raw_date_value) {
            $('#data_config_save_but').prop('disabled', true);
            return;
        }

        let parsed_date = moment(raw_date_value, format_string, true); 

        if (parsed_date.isValid()) {
            $('#first_date_preview')
                .text(`(Valid: ${parsed_date.format("MMMM Do YYYY")})`)
                .css('color', 'green');
            $('#data_config_save_but').prop('disabled', false);
        } else {
            $('#first_date_preview')
                .text(`(Invalid format for: "${raw_date_value}")`)
                .css('color', 'red');
            $('#data_config_save_but').prop('disabled', true);
        }
    }

    save_data_config() {
        // 1. Add class to body
        $('body').addClass('waiting-cursor');

        // 2. Allow browser render queue to repaint first
        requestAnimationFrame(() => {
            setTimeout(() => {
                let selected_input_format = $('#csv_input_date_format').val();
                this.record_manager.date_format = selected_input_format;   
                
                const key_map = {};
                for (let j = 0; j < this.required_variables.length; j++) {
                    const rv = this.required_variables[j];
                    const old_key = document.getElementById(rv.replaceAll(" ", "_"))?.value;
                    
                    if (old_key && old_key !== rv && old_key !== "0") {
                        key_map[rv] = old_key;
                    }
                }

                const data = this.record_manager.json_data;
                for (let i = 0; i < data.length; i++) {
                    const obj = data[i];
                    for (const [new_key, old_key] of Object.entries(key_map)) {
                        if (old_key in obj) {
                            obj[new_key] = obj[old_key];
                            delete obj[old_key];
                        }
                    }
                }

                if ($("#CURRENT_PEN").val() == "0") {
                    const last_pen_by_id = {}; 

                    for (let i = 0; i < data.length; i++) {
                        const record = data[i];
                        const id = record["ID"];

                        if (last_pen_by_id[id] !== undefined) {
                            record["CURRENT PEN"] = last_pen_by_id[id];
                        }

                        last_pen_by_id[id] = record["TO PEN"];
                    }
                }

                $("#model_data_config").hide();
                $('body').removeClass('waiting-cursor');
                
                this.record_manager.process_data(this.record_manager.json_data, this.record_manager);
            }, 50);
        });
    }
}