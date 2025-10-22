//create a filter manager to control the selection of items from a CSV file
var config
var DEBUGMODE=false

var record_manager;
var marker_manager;

var svg;

var table_manager;
var usp={};// the url params object to be populated

var map_manager;
var layer_manager;

var event_settings=false; // the dynamic details either loaded or configured while the app is running
var event_data={}


var analytics_manager;

if (typeof(params)=="undefined"){
    var params = {}
}
var last_params={}
var usp={};// the url params object to be populated

var browser_control=false; //flag for auto selecting to prevent repeat cals
var required_variables = ["ID","TO PEN","CURRENT PEN","EVENT","DATE"]

$( function() {

    load_data("app.csv","csv",initialize_interface)

    $(document).on('change','#data_input',function(){on_file_change(event);})

    $("#map_wrapper").resizable({
    handles: 's',
    stop: function(event, ui) {
        $(this).css("width", '');
   }
});
});

load_data = function(url,type,call_back){
    // type csv = should be 'text' and then converted
    // geojson = should be 'json' and then converted

     if(type=='geojson'){
        type='json'
    }else if (type=='json'){
        type='json'
    }else{
        type='text'
    }
    //todo be sure to convert appropriately once loaded
    $.ajax({
        url: url,
        dataType: type,
        success: function(_data) {
            call_back(_data)
        },
        error: function (xhr, ajaxOptions, thrownError) {
        console.log(xhr.status);
         console.log(thrownError);
         console.log("URL",url)
         $("#file_upload_controls").show()
      }
     });

}

function initialize_interface(_data,wait){

  config= $.csv.toObjects(_data.replaceAll('\t', ''))
  setup_params()

 table_manager = new Table_Manager({
    elm_wrap:"data_table_wrapper",
          elm:"data_table"})
    table_manager.init()

    setup_map();

    load_data(config[0]["data"],"geojson",layer_manager.create_geojson)
    $("#map_file").html(config[0]["data"])

    setup_records(config[1]);

    // When the model  "tracking events" is closed
    $("#model_data_form").on("hidden.bs.modal", function () {


        $("#filter_current_date").trigger('change');
    });

}




function setup_params(){
    if (window.location.search.substring(1)!="" && $.isEmptyObject(params)){
        usp = new URLSearchParams(window.location.search.substring(1).replaceAll("~", "'").replaceAll("+", " "))

        if (usp.get('f')!=null){
            params['f'] = rison.decode("!("+usp.get("f")+")")
        }
        if (usp.get('e')!=null){
            params['e'] =  rison.decode(usp.get('e'))
        }
        // debug mode
        if (usp.get('d')!=null){
           DEBUGMODE=true
        }



    }

}
function setup_map(){
    if(map_manager){
        // prevent second init
        return
    }

    map_manager = new Map_Manager(
     {params:params['e'] ,
        lat:0,
        lng: 0,
        z:8,
        limit:100 // max results for identify
        })

     map_manager.init()



     layer_manager = new Layer_Manager({map:map_manager.map});

      marker_manager=new Marker_Manager({ map:map_manager.map})
    marker_manager.init()
}
function setup_records(_data){
   record_manager = new Record_Manager({
        csv:_data['data'],

        title_col:_data['title_col'],
        filter_cols:_data['filter_cols'].split(","),
        date:_data['date'].split(","),
        params:params['f'],

     })

     record_manager.init();

}




function after_filter(){
    console.log("after_filter")
    record_manager.join_data();
    //console.log(record_manager.json_data)
    var start_date = moment.unix($("#filter_date .filter_slider_box").slider("values")[0]).utc()
    //var end_date = moment.unix($("#filter_date .filter_slider_box").slider("values")[1]).utc()
    var  end_date = moment.unix($("#filter_date .filter_slider_box").slider("values")[1]).utc()
    //todo  dial the INTERFACE end date back one day to account for view showing data up to but excluding the end date
   //var  end_date = moment.unix($("#filter_date .filter_slider_box").slider("values")[1]).add(-1, 'day')

    record_manager.complete_end_data(end_date)

    record_manager.complete_start_data(start_date)
//
    record_manager.clean_data()

}

function setup_interface(_event_settings){

      console.log("setup_interface")
      // make sure to account for date filers
      var start =  $("#init_filter_start_date").val()
      var end =  $("#init_filter_end_date").val()
      // filter the data

      record_manager.json_data=JSON.parse(JSON.stringify(record_manager.date_filter_data(record_manager.all_data,start,end)));
      if(record_manager.json_data.length==0){
        console.log("No data available, please adjust data range");
        $("#init_filter_start_date").addClass("error_field");
         $("#init_filter_end_date").addClass("error_field");

       setTimeout( function() {
             show_model();
        },300);
        return

      }
      record_manager.populate_search(record_manager.json_data)
      //
      $("#init_filter_start_date").removeClass("error_field");
      $("#init_filter_end_date").removeClass("error_field");
      // update interface dates
      var date_list = record_manager.get_date_list(record_manager,record_manager.json_data)
      record_manager.add_date_search(date_list[0],date_list[date_list.length-1])
      after_filter()
      //
      event_settings =_event_settings
      var  end_date = moment.unix($("#filter_date .filter_slider_box").slider("values")[1])
      event_data ={}
      for (var i in event_settings){
            var obj=event_settings[i]
            // create a style for each of the events to be tracked
            $("<style type='text/css'> .marker_"+obj.label+" path { color:"+obj.color+";} </style>").appendTo("head");
            // we also need a class without the path for the cluster outline
            if(obj["type"]=='cluster_outline'){
                var rgb = hexToRgb(obj.color);
               $("<style type='text/css'> .marker-cluster-warn {  background-color:rgba("+rgb[0]+","+rgb[1]+", "+rgb[2]+", 0.6);} </style>").appendTo("head");
            }
            // set event label
            event_data[obj.label]=[]
            // create buckets with all the config specified events to be tracked
            if(obj.end){
               obj.end= obj.end.trim()
            }
            if(obj.start!=null){
                record_manager.populate_days(event_data[obj.label],obj.start.trim(),obj.end,end_date)
            }

      }

       load_data("images/cow.svg","",populate_legend)

       populate_cow_list()
       record_manager.get_first_infection_date()

    setTimeout(function(){
      if(record_manager.params && record_manager.params[0].date){
            $("#filter_current_date").datepicker().val( record_manager.params[0].date);
            // we need this to trigger the creation of the plot
            $("#filter_current_date").trigger('change');
           // set the map bounds to include all the geojson
            try{
                map_manager.map.fitBounds(layer_manager.poly.getBounds());
            }catch(e){
                console.log("unable to zoom the map")

            }
            //
            //console.log(event_data)

         }else{
            record_manager.search_by_date(moment.unix($("#filter_date .filter_slider_box").slider("values")[0]).utc())
         }
    },1000);

}
function populate_legend(_data){
    svg = _data // store the svg file globally
    // create the legend - dynamically injecting the cow information
    html="<table>"
    html+="<tr><td width=30>"+svg+" </td><td>Non-clinical</td></tr>"
    for(var i in event_settings){

        var obj = event_settings[i]
        if(obj["type"]!='plot'){
            html+="<tr><td class='marker_"+obj.label+" shadow'>"+svg+" </td><td>"+obj.label+"</td></tr>"
        }
    }

    html+="</table>"
    $("#legend").html(html)
}
function populate_cow_list(){
    var html=""
    for(var i in event_settings){
        var obj = event_settings[i]
        if(obj["type"]!='plot'){
            html+=" <span class='font-weight-bold'>"+obj.label+" Cows:</span> <span class='hyper' id='total_"+obj.label+"'></span> <br/>"
        }
    }

     $("#cow_count_list").html(html)
}


 function save_params(){
    // access the managers and store the info URL sharing

    var p = "?f="+encodeURIComponent(rison.encode(record_manager.filters))
    +"&e="+rison.encode(map_manager.params)

//    if(layer_manager && typeof(layer_manager.layers_list)!="undefined"){
//        p+="&l="+rison.encode(layer_manager.layers_list)
//    }
//
//    if(typeof(record_manager.panel_name)!="undefined"){
//        // add the panel if available
//        p+="/"+record_manager.panel_name;
//    }
//    if(typeof(record_manager.display_resource_id)!="undefined"){
//        // add the display_resource_id if available
//        p+="/"+record_manager.display_resource_id;
//    }
//
//    if (record_manager.page_rows){
//        p +="&rows="+(record_manager.page_start+record_manager.page_rows)
//    }
//    if (record_manager.page_start){
//        p +="&start=0"
//    }
//    if (record_manager.sort_str){
//        p +="&sort="+record_manager.sort_str
//    }
//    if (record_manager.fq_str){
//        p +="&fq="+record_manager.fq_str
//    }
    // retain debug mode
    if (DEBUGMODE){
        p +="&d=1"
    }

    // before saving the sate, let's make sure they are not the same
    if(JSON.stringify(p) != JSON.stringify(last_params) && !browser_control){
       window.history.pushState(p, null, window.location.pathname+p.replaceAll(" ", "+").replaceAll("'", "~"))
        last_params = p
    }

}

