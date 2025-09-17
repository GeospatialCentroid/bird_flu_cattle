/**
 * Description. A filter system used to navigate a spreadsheet linked to resources.
    The features include a search system, filter controls, and paging system to navigate rows in a csv linked to html pages.
 *
 * @file   This files defines the record_manager class.
 * @author Kevin Worthington
 *
 * @param {Object} properties     The properties passed as a json object specifying:
    csv     The path to the csv file containing a '
    omit_result_item    An array of items to omit from the details (i.e. values associated with the selected csv row
    omit_filter_item    An array of items to omit from the filter controls
    path_col    The column in the csv containing the file path to the html resource to load
    title_col    The column in the csv containing the title of the resource
    sub_title_col (optional) The column in the csv containing the sub title of the resource. If set, included in search.
 */


class Record_Manager {
  constructor(properties) {
    //store all the properties passed
    for (var p in properties){
        this[p]=properties[p]
    }
    //keep reference to the the loaded spreadsheet data - source of filtering, selection and display
    this.json_data;
    this.mode='data';
    // store the subset of results for use
    this.subset_data;
    // store the item in the list
    this.page_num;
    // a dictionary of all the filters set
    this.filters={}
    this.progress_interval;
    this.date_format='M/D/YYYY'
   }
  init() {
    var $this=this
     //simulate progress - load up to 90%
      var current_progress = 0;
      this.progress_interval = setInterval(function() {
          current_progress += 5;
          $("#loader").css("width", current_progress + "%")
          if (current_progress >= 90)
              clearInterval($this.progress_interval);

      }, 100);
    //
    $("#data_file").html(this.csv)
    this.load_csv(this.csv,this.process_csv)
    //
//    $("#search").focus();
    $("#search_clear").click(function(){
        $("#search").val("")
    })
    ///--------
    $('input[type=radio][name=search_type]').change(function() {
        $this.mode=this.value
    });

     $("#search_but").click(function(){

//            $.get($this.place_url, { q: $("#search").val() }, function(data) {
//                try{
//                    $this.show_place_bounds(data[0].boundingbox)
//                    $("#search").val(data[0].display_name)
//                }catch(e){
//
//                }
        console.log("Select this option",$("#search").val())
        marker_manager.select_marker_by_id($("#search").val())


    })

    //

  }
   load_csv(file_name,func){
        var $this=this
        $.ajax({
            type: "GET",
            url: file_name,
            dataType: "text",
            success: function(data) {
                func(data,$this);
            }
         });
    }

     process_csv(data,$this){
        // convert the csv file to json and create a subset of the records as needed
       // strip any extraneous tabs
       $this.json_data= $.csv.toObjects(data.replaceAll('\t', ''))
         // account for dates
        var date_list=[]
        if($this?.date){
            for (var i=0;i<$this.json_data.length;i++){
                for (var c in $this.date){
                var val = $this.json_data[i][$this.date[c]]
                      if(val!=""){
                       date_list.push(moment(val,$this.date_format))
                      }
                 }
            }

        }

        //sort
        //date_list= date_list.sort((a, b) => a.valueOf() - b.valueOf())
        $this.add_date_search(date_list[0],date_list[date_list.length-1])

        // index sort
        if($this.json_data[0]?.["INDEX"]){
           $this.json_data.sort((a, b) => {
                if (a.ID < b.ID) return 1;
                if (a.ID > b.ID) return -1;
                return 0;
            });

        }
        ///---
        // now that we have the records we need create a filter menu
        $this.generate_filters($this.json_data)
        $this.add_filter_watcher()
        $this.ids_added=true;//to prevent future ids
        if($this.params){
            //populate the filters if set
            browser_control=true
//            $this.set_filters()
//            $this.filter()

            //console.log(params,$this.params)


            browser_control=false
        }else{

//             $this.filter()
        }
        $this.populate_search($this.json_data,true);

        //-------------
        //hide loader
        clearInterval($this.progress_interval)
        $("#loader").css("width", 100 + "%")
        setTimeout( function() {

            $(".overlay").fadeOut("slow", function () {
                $(this).css({display:"none",'background-color':"none"});
                 $(".container").show();
                  map_manager.map.invalidateSize();
            });
        },300);
        after_filter();
    }

    add_date_search(start,end){
        var  $this=this
        //date search
        $('#filter_date_checkbox').change(
            function(){
              record_manager.delay_date_change();
            }
        );
        $("#filter_start_date").datepicker({ dateFormat: 'yy-mm-dd',
                minDate:start.format('YYYY-MM-DD'),
                maxDate: end.format('YYYY-MM-DD')}).val(start.format('YYYY-MM-DD'))



        $("#filter_end_date").datepicker({ dateFormat: 'yy-mm-dd',
                minDate:start.format('YYYY-MM-DD'),
                maxDate: end.format('YYYY-MM-DD')}).val(end.format('YYYY-MM-DD'))

         // add current date
         $("#filter_current_date").datepicker({ dateFormat: 'yy-mm-dd',
                minDate:start.format('YYYY-MM-DD'),
                maxDate: end.format('YYYY-MM-DD')}).val(start.format('YYYY-MM-DD'))

         $("#filter_current_date").change( function() {
              record_manager.search_by_date(moment($("#filter_current_date").val(),'YYYY-MM-DD') )

              $this.filters.date=$("#filter_current_date").val()

              $("#map_label").html("<b>Date:</b> "+$("#filter_current_date").val())
              save_params()

              // control the forward and back buttons
              $("#date_advance_backward").prop("disabled", false);
              $("#date_advance_forward").prop("disabled", false);
               if($("#filter_current_date").val()===$("#filter_start_date").val()){
                  $("#date_advance_backward").prop("disabled", true);
              }
              if($("#filter_current_date").val()===$("#filter_end_date").val()){
                  $("#date_advance_forward").prop("disabled", true);
              }

        });

        $("#filter_start_date").change( function() {
            record_manager.delay_date_change()

        });
        $("#filter_end_date").change( function() {
          record_manager.delay_date_change()
        });
        // use numeric equivalent for the slider
        var values = [start.unix(),end.unix()]
        $("#filter_date .filter_slider_box").slider({
            range: true,
            min: values[0],
            max: values[1],
            values:values,
            slide: function( event, ui ) {
               $("#filter_start_date").datepicker().val(moment.unix(ui.values[0]).format('YYYY-MM-DD'))
               $("#filter_end_date").datepicker().val(moment.unix(ui.values[1]).format('YYYY-MM-DD'))
               record_manager.delay_date_change()

         }
        })


    }
     delay_date_change(){
        var $this=this
        // prevent multiple calls when editing filter parameters
        if(this.timeout){
            clearTimeout(this.timeout);
        }
        this.timeout=setTimeout(function(){
              $this.update_date_filter()
              $this.timeout=false

        },500)
     }
     //todo add date filtering
    update_date_filter(){
         // Add date filter
          $("#filter_current_date").datepicker().val( $("#filter_start_date").val())
          $("#filter_current_date").trigger('change');
    }
    ///
   join_data(){
        // join the data to itself to add an end date
        //look for matches by finding the cow ID the TO PEN (t) and match on Cow ID and CURRENT PEN

        // Loop over all records
        for(var i=0;i<this.json_data.length;i++){

            var t = this.json_data[i] // create a reference to the to (t) record
            // Loop over all the records to join (looking forward)
            for(var j=i+1;j<this.json_data.length;j++){
                var c = this.json_data[j] // create a reference to the current pen (c) record
                // where the ids match and the to (t) pen matches the current (c) pan
                if(t["ID"] == c["ID"] && t["TO PEN"] == c["CURRENT PEN"]){
                     // for clarity add an "IN PEN"
                     t["IN PEN"]=t["TO PEN"]
                    // clean up the data by using 'start' and 'end' as date objects
                     t["START DATE"]=moment(t["DATE"],this.date_format)
                     t["END DATE"]=moment(c["DATE"],this.date_format)

                    break
                }
            }
       }
    }
   complete_end_data(_end_date){
   console.log("_end_date",_end_date.format('YYYY-MM-DD' ))
        // Since we only have movement data - we don't know how long the cows have been in their last Pen
        // For any records that don't have an END Date - use the End Date
        for(var i=0;i<this.json_data.length;i++){
            var t = this.json_data[i]
             if(!t.hasOwnProperty("END DATE")){
                // for clarity add an "IN PEN"
               t["IN PEN"]=t["TO PEN"]
               t["START DATE"]=moment(t["DATE"],this.date_format)
               t["END DATE"]=_end_date

             }
       }
    }
    complete_start_data(_start_date){
        // Add a record for the first instance of each cow ID giving it a duration of _start_date to end date
        // be sure to omit records that start on the _start_date
        var ids=[] // store the unique ids
        for(var i=0;i<this.json_data.length;i++){
            var t =this.json_data[i]
             if($.inArray(t["ID"], ids)==-1){
               ids.push(t["ID"])
               //
               if(!moment(t["DATE"],this.date_format).isSame(_start_date)){
               record_manager.json_data.push({
                "ID":t["ID"],
                "IN PEN":t["CURRENT PEN"],
                "START DATE":_start_date,
                "END DATE":moment(t["DATE"],this.date_format),
                "EVENT":"Start"
               })
              }
           }
       }
    }
    clean_data(){
        // remove extraneous/confusing attributes
        for(var i=0;i<this.json_data.length;i++){
          var t = this.json_data[i]
          t["FROM PEN"]= t["CURRENT PEN"]
          delete t["TO PEN"]
          delete t["CURRENT PEN"]
          delete t["DATE"]

       }
    }

    populate_days(_array,_event_start,_event_end,_end_date){

        // called with event_data["sick"],"FLU","WELL",end_date)
        // create a sub set of the data
        //any record that has an EVENT labeled {_event_start} should have a record
        //console.log("populate_days", _end_date)
        for(var i=0;i<this.json_data.length;i++){
          var t = this.json_data[i];
          var end_date = false
          if(t["EVENT"].trim()==_event_start){

                // find the end date which should be ahead
                if(_event_end && _event_end!=""){
                    for(var j=i+1;j<this.json_data.length;j++){
                         var u = this.json_data[j]
                         // make sure the next event is later than the first and matched the desired end event name
                         if(u["ID"]==t["ID"] && u["EVENT"].trim()==_event_end && moment(t["START DATE"],this.date_format).unix() < moment(u["START DATE"],this.date_format).unix()){
//                           console.log("Closing t",t, "with u",u)
                            end_date=moment(u["START DATE"],this.date_format).unix()
                            break;
                         }
                    }
                }
                if(!end_date){
                    end_date=_end_date.unix()
                }

                _array.push({"id":t["ID"], "start_date": moment(t["START DATE"],this.date_format).unix(), "end_date": end_date,"from_pen": t["FROM PEN"]})
            }

        }
    }
    get_first_infection_date(){
        var infection_val=false
        var infection_record
        for(var i in event_settings){
            var e = event_settings[i]
            if(e["type"]=='cluster_color'){
                infection_val= e.start
               break
            }
        }

        if(infection_val){
            for(var i=0;i<this.json_data.length;i++){
                if(this.json_data[i]["EVENT"]==infection_val){
                infection_record = this.json_data[i]
                 $("#date_first_infection").html(infection_record["START DATE"].format('YYYY-MM-DD'))
                  $("#date_first_infection").click(function() {
                    $("#filter_current_date").datepicker().val( infection_record["START DATE"].format('YYYY-MM-DD'))
                    $("#filter_current_date").trigger('change');
                  });
                 break
                }
            }
        }
    }

   search_by_date(_date){
       // let's search for records that fall on a date
       // create a temporary object to track the important information
       this.id_track={
                    'ids':[],// store the unique ids
                    'duplicate_ids':[],// store the unique ids
                    'pen_warning':{}// When a pen can't be found in the geojson
                     }

        //inject the tracked events from the config
         for(var i in event_settings){
            var obj = event_settings[i]
            if(obj["type"]!='plot'){
                this.id_track[obj.label]=[]
            }
        }


       marker_manager.reset();// remove all markers
       for(var i=0;i<this.json_data.length;i++){
             var t = this.json_data[i]

            if(_date.isBetween(t["START DATE"], t["END DATE"]) || _date.isSame(t["START DATE"]) ) {//|| _date.isSame( t["END DATE"])

                if($.inArray(t["ID"], this.id_track['ids'])==-1){
                    this.id_track['ids'].push(t["ID"])

                }else{
                   // console.log(t["ID"], "is on the map more than once")
                    this.id_track['duplicate_ids'].push(t["ID"])
                }

                // show the cows on the map
                //console.log(t["IN PEN"])
                // get the pen id
                var location = layer_manager.get_poly_location(t["IN PEN"])
                if(location){

                    var marker = marker_manager.create_marker(t,location);
                    var status = marker.options.icon.options.status
                    if(status!='default'){
                        this.id_track[status].push(marker)
                    }
                    //console.log(marker.options.icon.options)
//                    if(marker.options.icon.options.sick){
//                        ids_sick.push(marker)
//                    }
//                     if(marker.options.icon.options.well){
//                        ids_well.push(marker)
//                    }
//                     if(marker.options.icon.options.sold){
//                        ids_sold.push(marker)
//                    }
//                     if(marker.options.icon.options.dead){
//                        ids_dead.push(marker)
//                    }
                }else{
                    //console.log(t["IN PEN"], "not found")
                    this.create_pen_warning(t["IN PEN"])
                }
           }
        }
        $("#total_items").html( this.id_track["ids"].length)
        // add hyper link to data access
        $("#total_items").off("click");
        $("#total_items").click(function() {
            record_manager.format_data_for_show(record_manager.id_track["ids"],["ID"])
        });

        $("#duplicate_items").html( this.id_track["duplicate_ids"].length)
        $("#duplicate_items").off("click");
        $("#duplicate_items").click(function() {
             record_manager.format_data_for_show(record_manager.id_track["duplicate_ids"],["ID"])
        });
        // Show totals
         for(var i in event_settings){
            var obj = event_settings[i]
            if(obj["type"]!='plot'){
               $("#total_"+obj.label).html(this.id_track[obj.label].length)
                $("#total_"+obj.label).data('label', obj.label);
                $("#total_"+obj.label).off("click");
                console.log(this.id_track[obj.label])
                $("#total_"+obj.label).click(function() {
                        var label= $(this).data('label')
                        record_manager.format_data_for_show(record_manager.id_track[label],["ID"])
                });
            }
        }

        //
        this.show_orig_sick_pen(_date.unix())
        this.show_pen_warning()
    }
    format_data_for_show(data,attrs){
        // take an array and convert it to a list of json objects
        console.log(data)
        var temp_array = data.map(item => {
            // if it's not already an array, wrap it so indexing works
            const values = Array.isArray(item) ? item : [item];

            // build {attr1: val1, attr2: val2, ...}
            return attrs.reduce((obj, key, i) => {
              obj[key] = values[i] !== undefined ? values[i] : null; // or leave undefined
              return obj;
            }, {});
          });
          table_manager.show_data(temp_array)
    }

    create_pen_warning(pen,t){
        // track the unique pens and give a warning
        if(!(String(pen) in this.id_track["pen_warning"])){
             this.id_track["pen_warning"][String(pen)]=[]
        }
        this.id_track["pen_warning"][String(pen)].push(t)

    }
     show_pen_warning(pen,t){
        // track the unique pens and given a warning
        var html=""
       for(var i in  this.id_track["pen_warning"]){
        html+="Pen: "+ i +" has "+ this.id_track["pen_warning"][i].length +" not shown </br>"

       }
        $("#warning").html(html)
    }
    show_orig_sick_pen(_date){
        // get the plot tracking information
        var has_plot =false
         for(var i in event_settings){
            var obj = event_settings[i]
            if(obj["type"]=='plot'){
              has_plot = obj.label
            }
        }
        if (has_plot){
            var match_days=[]
            var array=event_data[has_plot]
            for(var i=0;i<array.length;i++){
                if(_date>=array[i]["start_date"] && _date<=array[i]["end_date"]){
                   match_days.push(array[i]);
                }
            }
            // group by pen
            var ids={}
            for(var i=0;i<match_days.length;i++){
                if(!ids?.[match_days[i]["from_pen"]]){
                    ids[match_days[i]["from_pen"]]=[]
                }
                // for ease of future access convert end_date and start_date into formatted datetime objects
                var matched_day=Object.assign({}, match_days[i]);
                matched_day["start_date"]=moment.unix(matched_day["start_date"]).format('YYYY-MM-DD')
                matched_day["end_date"]=moment.unix(matched_day["end_date"]).format('YYYY-MM-DD')
                ids[match_days[i]["from_pen"]].push(matched_day)
            }
            //store the originating pen for later
            this.match_days_ids=ids
            // convert to CSV
            var data =[]
            for(var i in ids){
                data.push({"name":i,"value":ids[i].length})
            }
            create_plot(data.sort((a, b) => b.value - a.value)) // Ascending order
        }
    }
    show_orig_sick_pen_data(pen){
    console.log(this.match_days_ids[pen])
    // create a temporary json obj converting the end_date and start_date into formatted datetime objects

       table_manager.show_data(this.match_days_ids[pen])
    }
    show_data(_id,_attr,_at_date){
        var data=[];
         for(var i=0;i<this.json_data.length;i++){
            var t = this.json_data[i]

            if(t[_attr] == _id){
                data.push(t)

            }

         }
         if(_at_date){
           // use the current date to filter the data
           var temp_data=[]
           var curr_date =  moment($("#filter_current_date").val(),'YYYY-MM-DD')
           for(var i=0;i<data.length;i++){
                var t=data[i]
                if(curr_date.isBetween(t["START DATE"], t["END DATE"]) || curr_date.isSame(t["START DATE"]) ){
                    temp_data.push(t);
                }
            }
            data =temp_data
         }

         //sort by start date
         data.sort(function(a, b){
            return a['START DATE'] - b['START DATE'];
        });
        // store the original subsetted json with the table for ease of access
        table_manager.json_data=data
         table_manager.generate_table(data,true)
         table_manager.show_totals()
    }



    //------- animate slider

    slider_toggle(_this,_exit) {

        var $this=this
        var icon=$(_this).children("i")
        if(icon.hasClass("bi-pause-fill")){
            $this.slider_pause(icon)
            return
        }
        icon.removeClass("bi-play-fill")
        icon.addClass("bi-pause-fill")


        var slider=$("#filter_date .filter_slider_box")

        //if we are at the end. start at the beginning
         if(moment($("#filter_current_date").val(),'YYYY-MM-DD').unix()==moment($("#filter_end_date").val(),'YYYY-MM-DD').unix()){
              var start_date = moment($("#filter_start_date").val(),'YYYY-MM-DD').unix()-86400
              $("#filter_current_date").datepicker().val(moment.unix(start_date).format('YYYY-MM-DD' ))

          }
        $this.slider_step(slider,icon)
    }
   slider_step(_slider,_icon) {

        var $this=this
        var curr_position= moment($("#filter_current_date").val(),'YYYY-MM-DD').unix()
        var next_position=curr_position+86400

         $("#filter_current_date").datepicker().val(moment.unix(next_position).format('YYYY-MM-DD'))
         $("#filter_current_date").trigger('change');

         //if we are at the end. stop
          if($("#filter_current_date").val()===$("#filter_end_date").val()){

                  $this.slider_pause(_icon)
              return
          }
//
        $this.slider_timeout=setTimeout(function(){
            $this.slider_step(_slider,_icon)
        },500*$("#playback_speed_dropdown").val())
    }
    slider_pause(_icon) {
        //stop the timer
       _icon.removeClass("bi-pause-fill")
       _icon.addClass("bi-play-fill")
        clearTimeout(this.slider_timeout);
    }
    move_to_date(amt){
        record_manager.slider_pause($(".slider_toggle").children(":first"))
          var curr_position= moment($("#filter_current_date").val(),'YYYY-MM-DD').unix()
            var next_position=curr_position+(86400*amt)
            $("#filter_current_date").datepicker().val(moment.unix(next_position).format('YYYY-MM-DD'))
         $("#filter_current_date").trigger('change');
    }


     populate_search(data){
       // to make it easy to select a dataset, an autocomplete control is used and populated based on entered values

      var $this = this
       // loop over the data and add 'value' and 'key' items for use in the autocomplete input element
      var unique_values=[]
      this.subset_data=[]
      var reduced = data.reduce(function(filtered, item) {

          var label =item[$this.title_col]
            if ($this.hasOwnProperty('sub_title_col') && item[$this.sub_title_col]!=""){
                label +=" ("+item[$this.sub_title_col]+")"
            }
           if($.inArray(label, unique_values)==-1){
                unique_values.push(label)
              $this.subset_data.push({label: label, value: item["id"]});
          }
          return filtered;
        }, []);

      $( "#search" ).autocomplete({
          source: this.subset_data,
          minLength: 0,
          select: function( event, ui ) {
                event.preventDefault();
                // prevent the appended bracket value from being used in the search
                //$("#search").val(ui.item.label.substring(0,ui.item.label.indexOf("(")-1));
                $("#search_but").trigger("click")
            },
        focus: function(event, ui) {
            event.preventDefault();
            $("#search").val(ui.item.label);
        }

      });
      $(document).on("keydown", "#search", function(e) {
            if(e.keyCode==13){
                $("#search_but").trigger("click")
            }
        })

//      this.show_results()
//
//      //update counts
//      this.update_results_info(this.subset_data.length)
    }

    ////////////////----------------------
    // Purge unneeded methods
     generate_filters(_data){
        // create a list of all the unique values
        // then create controls to allow users to filter items
        // these controls will update their counts when filters are selected

        $("#filters").empty()
        var $this=this;
        // create a catalog of all the unique options for each of attributes
        this.catalog={}
        // create a separate obj to track the occurrences of each unique option
        this.catalog_counts={}
        for (var i=0;i<_data.length;i++){
            var obj=_data[i]

            for (var a in obj){
               //start with a check for numeric
               if ($.isNumeric(obj[a])){
                obj[a]=parseInt(obj[a])
               }
               // see if we hve and array
               if ($.isArray(obj[a])){
                    // need to add all the array items into the catalog
                    for (var j = 0; j<obj[a].length;j++){
                        this.add_to_catalog(a,obj[a][j])
                    }
               }else{
                    this.add_to_catalog(a,obj[a])
               }

            }

        }
        // sort all the items
        // create controls - Note column names are used for ids - spaces replaced with '__'
         for (var a in this.catalog){
//                // join with counts and sort by prevalence
//               var catalog_and_counts=[]
//               for(var j=0;j<this.catalog[a].length;j++){
//                    catalog_and_counts.push([this.catalog_counts[a][j],this.catalog[a][j]])
//               }
//
//                catalog_and_counts.sort(function (a, b) {
//                    if (a[0] === b[0]) {
//                        return 0;
//                    }
//                    else {
//                        return (a[0] > b[0]) ? -1 : 1;
//                    }
//                });
//               // now extract the values
//               this.catalog[a]=[]
//               this.catalog_counts[a]=[]
//               for(var j=0;j<catalog_and_counts.length;j++){
//                    this.catalog[a].push(catalog_and_counts[j][1])
//                    this.catalog_counts[a].push(catalog_and_counts[j][0])
//               }
            //console.log(this.catalog[a])
               // generate control html based on data type (use last value to workaround blank first values)
               if (this.catalog[a].length>0 && $.inArray(a,$this.filter_cols)>-1){
                    $("#filters").append(this.get_multi_select(a,this.catalog[a],this.catalog_counts[a]))
                }
         }
    }
    add_filter_watcher(){
        var $this=this;
        // watch at the filter list level
        $('.filter_list').change( function() {
           var id = $(this).attr('id')
            // create a new list of selected values
           var vals=[]
           $(this).find(":checked").each(function() {
                vals.push($(this).val())

           })
           if(vals.length==0){
                vals=null
           }
           console_log("add_filter_watcher",$(this).attr('id'),vals)
           $this.add_filter($(this).attr('id'),vals);
           $this.filter()
        });
    }
    add_to_catalog(col,val){
        if(typeof(this.catalog[col])=="undefined"){
               this.catalog[col]=[val]
               this.catalog_counts[col]=[1]
            }else{
                //populate with any new value
                var array_index=$.inArray(val,this.catalog[col])
                if (array_index==-1){
                    this.catalog[col].push(val)
                    this.catalog_counts[col].push(1)
                }else{
                    this.catalog_counts[col][array_index]+=1
                }
            }
    }
     get_multi_select(id,options,counts){
        var html=""
        var _id = id.replaceAll(" ", "__");
        html+="<label class='form-label' for='"+_id+"'>"+id+"</label>"
        html+="<div class='form-group filter_list' name='"+_id+"' id='"+_id+"' >"
        for (var o in options){
            var val = options[o];
            var text=options[o];
            if(text==""){
                text="(blank)"
            }

            html+='<label class="list-group-item d-flex justify-content-between ">'
            html+=''+text+'<span><input class="form-check-input me-1 align-left" type="checkbox" value="'+val+'"></span>'
            html+='</label>'
        }

        html+=" </div>"
        return html

    }


    add_filter(_id,value){
        if (_id ==false){
            _id = "Search"
            // add text to the search field
            $("#search").val(value)
        }
        // remove the __ to get the true id
        var id = _id.replaceAll("__", " ");
        // set the filters value
        this.filters[id]=value
        console_log("And the filters are...",this.filters)
        //create text for filter chip
        var text_val=""
        //for number range use dash - separator
        if (value!=null){
            if($.isNumeric(value[0]) && value.length<=2){
                text_val=value[0]+" - "+value[1]
            }else if ($.inArray(id, ["Date"])>-1){
                 text_val=value[0]+" - "+value[1]
            }else{
                text_val=value.join(", ")
            }
        }
        this.show_filter_selection(_id.replaceAll( " ", "__"),id+": "+text_val.clip_text(30))
        if (value==null){
           this.remove_filter(_id)
        }

    }




}
 


