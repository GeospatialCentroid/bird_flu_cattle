/**
 * Description. A reusable map object able to be used as a separate component
    Should support many different types of spatial data
 *
 * @file   This files defines the Map_Manager class.
 * @author Kevin Worthington
 *
 * @param {Object} properties     The properties passed as a json object specifying:


 */


class Map_Manager {
  constructor(properties) {
    //store all the properties passed
    for (var p in properties){
        this[p]=properties[p]
    }
    // keep track of position on *map* when clicked
    this.click_lat_lng;
    //keep track of position on *page* when clicked
    this.click_x_y;
    //look at the url params to see if they exist and should be used instead
    if (this.params){
        if (this.params.hasOwnProperty('z')){
            this.z = Number(this.params['z'])
        }
         if (this.params.hasOwnProperty('c')){
            var c = this.params['c'].split(',')
            this.lat= Number(c[0])
            this.lng = Number(c[1])
        }

    }else{
        this.params={}
    }

    this.layer_clicked=false
    this.selected_feature_id;
    this.highlighted_feature;
    this.highlighted_rect;

   var options ={}//default L.CRS.EPSG3857, messy crs: L.CRS.EPSG4326

    this.map = L.map('map',options).setView([this.lat, this.lng], this.z);
  // create a reference to this for use during interaction
    var $this=this

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {

            maxZoom: 19,

            attribution: "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
        }).addTo($this.map);

    // specify popup options
    this.popup_options =
    {
    'className' : 'popup',
    "keepInView":false
    }

    // used during layer selection
    this.selected_layer_id

    this.add_legend()

    $(document).on("keydown", "#map", function(e) {
            if(e.keyCode==13){
                 $(document.activeElement).trigger('click');

            }
        })

      this.add_plot();
      this.add_label();

  }

  init() {

  }

    // Clean code below


     //
    update_map_pos(no_save){
        var c = this.map.getCenter()
        this.set_url_params("c",c.lat+","+c.lng)
        this.set_url_params("z",this.map.getZoom())
        if(!no_save){
            save_params()
        }
        // also update the table view if table bounds checked
        table_manager?.bounds_change_handler();
        //update the search results if search results checked
//        record_manager?.bounds_change_handler();
    }
    move_map_pos(_params){
        var z = Number(_params['z'])
        var c = _params['c'].split(',')
        var lat= Number(c[0])
        var lng = Number(c[1])
        this.map.setView([lat, lng], z, {animation: true});
    }

    set_url_params(type,value){
        // allow or saving details outside of the filter list but
        //added to the json_str when the map changes
        this.params[type]= value

    }
    //

    update_map_size(){
        // make the map fill the difference
        var window_width=$( "#map_wrapper" ).width()
        $("#map").width(window_width-$("#image_map").width()-2)
        this.map.invalidateSize(true)
        this.image_map.invalidateSize(true)
    }



    add_legend(){
        var header ="<span class='legend_title'>"+"</span>"
        //add custom control
        L.Control.MyControl = L.Control.extend({
          onAdd: function(map) {
            var el = L.DomUtil.create('div', 'legend');
            el.innerHTML = header+'<div id="legend"></div>';
            return el;
          },
          onRemove: function(map) {
            // Nothing to do here
          }
        });

        L.control.myControl = function(opts) {
          return new L.Control.MyControl(opts);
        }

        L.control.myControl({
          position: 'bottomright'
        }).addTo(this.map);
    }
    add_plot(){
     L.Control.MapPlot = L.Control.extend({
            onAdd: function(map) {
                var div = L.DomUtil.create('div','legend plot');
                div.id = 'plot';
                L.DomEvent.disableClickPropagation(div)
                return div;
            },
            onRemove: function(map) {
                // Nothing to do here
            }
        });
        L.control.map_plot = function(opts) {
            return new L.Control.MapPlot(opts);
        }
        L.control.map_plot({ position: 'bottomleft' }).addTo( this.map);
    }
    add_label(){
         L.Control.MapPlot = L.Control.extend({
            onAdd: function(map) {
                var div = L.DomUtil.create('div','legend map_label');
                div.id = 'map_label';
                L.DomEvent.disableClickPropagation(div)
                return div;
            },
            onRemove: function(map) {
                // Nothing to do here
            }
        });
        L.control.map_plot = function(opts) {
            return new L.Control.MapPlot(opts);
        }
        L.control.map_plot({ position: 'topright' }).addTo( this.map);

    }



    show_highlight_geo_json(geo_json){
        var $this=this
        // when a researcher hovers over a resource show the bounds on the map
        if (typeof(this.highlighted_feature) !="undefined"){
            this.hide_highlight_feature();
        }
        if (geo_json?.geometry && geo_json.geometry.type =="Point" || geo_json?.type=="MultiPoint"){
            //special treatment for points
            this.highlighted_feature = L.geoJSON(geo_json, {
              pointToLayer: function (feature, latlng) {
                        return L.marker(latlng, {icon: $this.get_marker_icon()});
                }
            }).addTo(this.map);
        }else{
            this.highlighted_feature =  L.geoJSON(geo_json,{
                style: function (feature) {
                    return {color: "#fff",fillColor:"#fff",fillOpacity:.5};
                }
                }).addTo(this.map);
        }

    }
     hide_highlight_feature(){
        this.map.removeLayer(this.highlighted_feature);
        delete this.highlighted_feature;
    }
    get_selected_layer(){
        // start with the last layer (top) if not yet set - check to make use the previous selection still exists
        if (!this.selected_layer_id || !layer_manager.is_on_map(this.selected_layer_id) ){
            if ( layer_manager.layers.length>0){
                this.selected_layer_id=layer_manager.layers[layer_manager.layers.length-1].id
            }else{
                console.log("No layers for you!")
                return
            }

        }

        return layer_manager.get_layer_obj(this.selected_layer_id);
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
    const margin = {top: 18, right: 10, bottom:25, left: 40},
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
        .attr("x", (-10))
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
     const yAxisG =  svg.append("g")
        .call(d3.axisLeft(y))
        .style('color', 'blue')
        .style('text-decoration', 'underline')

   // add a click handler to each tick label
    yAxisG.selectAll(".tick text")
    .style("cursor", "pointer")
    .on("click", function(event, d) {
        // show all the data for the pens with originating infections
        record_manager.show_orig_sick_pen_data(d)
    });

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

