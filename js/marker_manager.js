class Marker_Manager {
  constructor(properties) {
    //store all the properties passed
    for (var p in properties){
        this[p]=properties[p]
    }


   }
   reset(){
      this.marker_cluster.clearLayers()
      this.items=[]
   }
   init(){
      this.items=[]; //for storing markers
      this.marker_cluster = L.markerClusterGroup({
            spiderfyDistanceMultiplier:.4,
            maxClusterRadius:1,
            iconCreateFunction: function (cluster) {
            // custom cluster function bases on count of sick cows
             var color =[255,255,255]// base color for clusters
             var count=0
             var childCount = cluster.getChildCount();

             var markers=cluster.getAllChildMarkers()
             var cluster_color_count=0
             var cluster_outline_count=0
             // find the cluster category
             var has_cluster_color =false
             var has_cluster_outline =false

             for(var i in event_settings){
                var e = event_settings[i]
                if(e["type"]=='cluster_color'){
                    has_cluster_color =e.label
                    var cluster_color = e.color.substring(1)// get the hex color but strip the '#'
                }
                if(e["type"]=='cluster_outline'){
                    has_cluster_outline =e.label
                }
            }
            if(has_cluster_color){
                 for(var i =0;i<markers.length;i++){
                     if (markers[i].options.icon.options.status==has_cluster_color){
                       cluster_color_count+=1
                     }

                 }
                 // get the color between 0 and n to show what the cluster contains
                 color = marker_manager.get_cluster_color(cluster_color_count,color,hexToRgb(cluster_color))

                 count=cluster_color_count
                 var count_display=$('#count_display_dropdown option:selected').val()
                 if (count_display==2){
                    count =Math.round((cluster_color_count/childCount)*100)+"%"
                 }else if (count_display==3){
                    count =childCount
                 }
             }
             //------------------
             // wellness check
              if(has_cluster_outline){

                 for(var i =0;i<markers.length;i++){
                     if (markers[i].options.icon.options.status==has_cluster_outline){
                       cluster_outline_count+=1
                     }
                 }
            }

             var  class_name='marker-cluster'
             // if there are well cows - add a yellow outline
             if(cluster_outline_count>0 && has_cluster_outline){
                class_name='marker-cluster-warn'

             }
             return new L.DivIcon({
                    html: "<div style='background-color: rgba("+color[0]+","+color[1]+","+color[2]+", 0.6);'><span>" + count+ "</span></div>",
                    className: class_name,  iconSize: new L.Point(40, 40)
                });


        }
        });
      this.map.addLayer(this.marker_cluster);

      // add dropdown
      var legend = L.control({position: 'bottomright'});
        legend.onAdd = function (map) {
            var div = L.DomUtil.create('div', 'info legend');
            div.innerHTML = '<b>Cluster Number</b><select id="count_display_dropdown"><option value=1>Clinical Count</option><option value=2>Clinical Percentage</option><option value=3>Cow Count</option></select>';
            div.firstChild.onmousedown = div.firstChild.ondblclick = L.DomEvent.stopPropagation;
            return div;
        };
        legend.addTo(this.map);
        $("#count_display_dropdown").change(function() {
             record_manager.search_by_date(moment($("#filter_current_date").val(),'YYYY-MM-DD') )


        });
    }
    create_marker(obj,location){
        if(location){
            var popup_content = "ID: "+obj["ID"]+"<br/>"
            popup_content += "In Pen: "+obj["IN PEN"]+"<br/>"


            popup_content+=$("#filter_current_date").val()
            // dyanmically populate popup content based on config
            popup_content+="<br/>"+"<a href='javascript:void(0);' onclick='record_manager.show_data("+obj["ID"]+",\"ID\")'>Show Movement History</a>"

            // We're looking for any matching records from the event_data
            for(var i in event_settings){
                var e = event_settings[i]
                if(e["type"]!='plot'){
                    var records = marker_manager.get_event_records(obj["ID"],event_data[e.label])
                    for(var i=0;i<records.length;i++){
                       popup_content+="<br/>"+e.label+" From: "+moment.unix(records[i]["start_date"]).format('YYYY-MM-DD')+" to "+ moment.unix (records[i]["end_date"]).format('YYYY-MM-DD')
                    }
                }
            }


            var marker=L.marker(location, {icon: this.get_marker_icon(obj["ID"],marker_manager.check_status(obj["ID"], moment($("#filter_current_date").val(),'YYYY-MM-DD').unix()))})
            this.items.push(marker)
            this.marker_cluster.addLayer( marker)//
            marker.on('click', function(e) {
              // create and display popup on map
              let popup = L.popup({ autoPanPadding: [200, 200],offset: [0, -10]})
                .setLatLng(e.target._latlng)
                .setContent(popup_content)
                .openOn(map_manager.map);

              // close event popup
              popup.on("remove", function () {
                 map_manager.hide_highlight_feature()
              });
                //show a polygon around the marker
                var c=e.target._latlng
                var amt=.000005
                var coords =[[[c.lng+amt*2,c.lat+amt],[c.lng+amt*2,c.lat-amt],[c.lng-amt*2,c.lat-amt],[c.lng-amt*2,c.lat+amt],[c.lng+amt*2,c.lat+amt]]]
               var geo_json={
                    "type": "Feature",
                    "properties": { },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": coords
                    }
                };
                map_manager.show_highlight_geo_json(geo_json)
            })
            return marker;
        }else{
            console.log(location, "not found",obj)
        }


    }
    get_marker_icon(id,_class){

         return   L.divIcon({
                    html: svg,
                    className: _class,
                     iconSize: [16, 16],
                     iconAnchor: [8, 16],
                    _id:id,
                    status:_class.substring(_class.indexOf("marker_")+7)

        });

    }
    select_marker_by_id(_id){
    console.log("select_marker_by_id", _id)
       var $this=this
        this.marker_cluster.eachLayer(function (marker){
           // console.log(marker.getLatLng(), marker)
           if(marker.options.icon.options._id==_id){
                 var visible_layer = $this.marker_cluster.getVisibleParent(marker);
                  if (visible_layer instanceof L.MarkerCluster) {
                      // We want to show a marker that is currently hidden in a cluster.
                      // Make sure it will get highlighted once revealed.
                      $this.marker_cluster.once('spiderfied', function() {
                        marker.fire('click');
                     });
                     visible_layer.spiderfy();
                 }else{
                    marker.fire('click');
                }
                 map_manager.map.setView(marker.getLatLng(), 18);
                 console.log(marker)
           }

         });

    }
    check_status(_id,_date){
        /**
         * Determines if an item is sick. Checks against a list of sick ranges. Amended to also check if a cow is well
         *
         * @param {number} _id the unique id of the item.
         * @param {number} _date the unix time.
         * @returns {string} the name of a class to style the item accordingly
         */
        var marker_class = "marker_default"
        for(var i in event_settings){
                var e = event_settings[i]
                if(e["type"]!='plot'){
                    var records = marker_manager.get_event_records(_id,event_data[e.label])
                    for(var i=0;i<records.length;i++){
                         if( _date>=records[i]["start_date"] && _date<=records[i]["end_date"]){
                         marker_class= "marker_"+e.label;
                        }
                    }
                }
            }


        return marker_class;
    }
   get_event_records(_id,_array){
         /**
         * Generates a list of event records based on the item id
         * @param {number} _id the unique id of the item.
         * @returns {array} an array of records for the item
         */
        var records=[]
        for(var i=0;i<_array.length;i++){
            if(_array[i]["id"]==_id){
               records.push(_array[i])
            }
        }
        return records;
    }
     get_cluster_color(val,color_1,color_2){
        //find out where we are in the gradient

       //Allow for gradient across 2 colors, note that the must be in rgb hexToRgb(color_1)
       var color1 = color_1
       var color2 = color_2
       //
       var lower= 0
       var higher = 10
       //exception for out of range values
       if(Number(val)>higher){
           val=higher
       }else if(Number(val)<lower){
           val=lower
       }

       var weight=(Number(val)-lower)/(higher-lower)
       var color = this.get_color_between(color2,color1, weight)
       return color
    }
    // gradient color support
    get_color_between(color1, color2, weight) {
        var w1 = weight;
        var w2 = 1 - w1;
        var rgb = [Math.round(color1[0] * w1 + color2[0] * w2),
            Math.round(color1[1] * w1 + color2[1] * w2),
            Math.round(color1[2] * w1 + color2[2] * w2)];
        return rgb;
    }
}