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

    setup_records(config[1])

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


     // initialize this filtering system

     record_manager.init();

}
function after_filter(){
    record_manager.join_data()
    var start_date = moment.unix($("#filter_date .filter_slider_box").slider("values")[0]).utc()
    //var end_date = moment.unix($("#filter_date .filter_slider_box").slider("values")[1]).utc()
    var  end_date = moment.unix($("#filter_date .filter_slider_box").slider("values")[1]).utc()
    //todo  dial the INTERFACE end date back one day to account for view showing data up to but excluding the end date
   //var  end_date = moment.unix($("#filter_date .filter_slider_box").slider("values")[1]).add(-1, 'day')

    record_manager.complete_end_data(end_date)

     record_manager.complete_start_data(start_date)

    record_manager.clean_data()

    $("#model_data_form").on("hidden.bs.modal", function () {
       process_data_forms();
        $("#filter_current_date").trigger('change');
    });
   load_data('settings_config.json','json',init_event_prompt)

}

function setup_interface(event_settings){

      var  end_date = moment.unix($("#filter_date .filter_slider_box").slider("values")[1])

      for (var i in event_settings){
            var obj=event_settings[i]
            // create a style for each of the events to be tracked
            $("<style type='text/css'> .marker_"+obj.label+" path { color:"+obj.color+";} </style>").appendTo("head");
            // we also need a class without the path for the cluster outline
            if(obj["type"]=='cluster_outline'){
                var rgb = hexToRgb(obj.color);
               $("<style type='text/css'> .marker-cluster-warn {  background-color:rgba("+rgb[0]+","+rgb[1]+", "+rgb[2]+", 0.6);} </style>").appendTo("head");
            }
            // reset the event label
            event_data[obj.label]=[]
            // create buckets with all the config specified events to be tracked
            record_manager.populate_days(event_data[obj.label],obj.start,obj.end,end_date)

      }
       load_data("images/cow.svg","",populate_legend)
       populate_cow_list()
       console.log(event_data)

    setTimeout(function(){
      if(record_manager.params && record_manager.params[0].date){
            $("#filter_current_date").datepicker().val( record_manager.params[0].date)
            $("#filter_current_date").trigger('change');
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
            html+=" <span class='font-weight-bold'>"+obj.label+" Cows:</span> <span id='total_"+obj.label+"'></span> <br/>"
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

create_plot= function(data){

    $("#plot").empty()

    if(data.length==0){
        $("#plot").hide()
        return
    }
     $("#plot").show()

    // set the dimensions and margins of the graph
    var row_height=25
    const margin = {top: 18, right: 0, bottom:25, left: 40},
        width = 120 - margin.left - margin.right,
        height = (row_height*(data.length+1)) - margin.top - margin.bottom;

    // append the svg object to the body of the page
    const svg = d3.select("#plot")
      .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);


    svg.append("text")
        .attr("x", (0))
        .attr("y", 0 - (margin.top / 2))
        .style("font-size", "11px")
         .style("font-weight", "bolder")
         .style('fill', 'black')
        .text("Originating Pen")


    var extent = d3.extent(data, function(d) {
        return d.value;
    });

      // Add X axis
      const x = d3.scaleLinear()
      .domain([0, extent[1]])
      .range([ 0, width])

      svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x).ticks(2,d3.format('0f'))).style('color', 'black')
        .selectAll("text")
          .attr("transform", "translate(-10,0)rotate(-45)")
          .style("text-anchor", "end")
           .style('color', 'black')

      // Y axis
      const y = d3.scaleBand()
        .range([ 0, height ])
        .domain(data.map(d => d.name))
        .padding(.1);
      svg.append("g")
        .call(d3.axisLeft(y))
        .style('color', 'black')

      //Bars
      svg.selectAll("myRect")
        .data(data)
        .join("rect")
        .attr("x", x(0) )
        .attr("y", d => y(d.name))
        .attr("width", d => x(d.value))
        .attr("height", y.bandwidth())
        .attr("fill", "black")



}