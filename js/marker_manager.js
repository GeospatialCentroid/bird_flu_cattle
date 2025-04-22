class Marker_Manager {
  constructor(properties) {
    //store all the properties passed
    for (var p in properties){
        this[p]=properties[p]
    }


   }
   reset(){
   //this.items = new L.FeatureGroup();
      //https://github.com/Leaflet/Leaflet.markercluster?tab=readme-ov-file#customising-the-clustered-markers
//       if (this.marker_cluster) {
//
//            for(var i=0;i<this.items.length;i++){
//             this.marker_cluster.removeLayer(this.items[i]);
//              delete this.items[i];
//            }
//
//
//           this.map.removeLayer(this.marker_cluster);
//           delete this.marker_cluster;
//
//        //return
//        }
         this.marker_cluster.clearLayers()
      this.items=[]

   }
   init(){
        this.items=[]; //for storing markers
      this.marker_cluster = L.markerClusterGroup({
            spiderfyDistanceMultiplier:.4,
            maxClusterRadius:1,
            iconCreateFunction: function (cluster) {
             var childCount = cluster.getChildCount();


             var markers=cluster.getAllChildMarkers()
             var sick_count=0
             for(var i =0;i<markers.length;i++){
                 if (markers[i].options.icon.options.sick==true){
                   sick_count+=1
                 }

             }
             var color = marker_manager.get_cluster_color(sick_count)

             var count=sick_count
             var count_display=$('#count_display_dropdown option:selected').val()
             if (count_display==2){
                count =Math.round((sick_count/childCount)*100)+"%"
             }else if (count_display==3){
                count =childCount
             }
             // wellness check
             var well_count=0
             for(var i =0;i<markers.length;i++){
                 if (markers[i].options.icon.options.well==true){
                   well_count+=1
                 }

             }


             var  class_name='marker-cluster'
             // if there are well cows - add a yellow outline
             if(well_count>0){
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

            // allow marking a cow as sick
           // popup_content+='<button type="button" class="btn btn-info" onclick="marker_manager.mark_sick('+obj["ID"]+')">Mark as sick</button>'+" on "
            popup_content+=$("#filter_current_date").val()
            popup_content+="<br/>"+"<a href='javascript:void(0);' onclick='record_manager.show_data("+obj["ID"]+",\"ID\")'>Show Movement History</a>"


            var sick_records = marker_manager.get_event_records(obj["ID"],event_data["sick"])
            for(var i=0;i<sick_records.length;i++){
               popup_content+="<br/>"+"Clinical From: "+moment.unix(sick_records[i]["start_date"]).format('YYYY-MM-DD')+" to "+ moment.unix (sick_records[i]["end_date"]).format('YYYY-MM-DD')
            }

             var well_records = marker_manager.get_event_records(obj["ID"],event_data["well"])
            for(var i=0;i<well_records.length;i++){
               popup_content+="<br/>"+"Recovered From: "+moment.unix(well_records[i]["start_date"]).format('YYYY-MM-DD')+" to "+ moment.unix (well_records[i]["end_date"]).format('YYYY-MM-DD')
            }

            var marker=L.marker(location, {icon: this.get_marker_icon(obj["ID"],marker_manager.check_status(obj["ID"], moment($("#filter_current_date").val(),'YYYY-MM-DD').unix()))})
            this.items.push(marker)
            this.marker_cluster.addLayer( marker.bindPopup(popup_content))//
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
                     sick:_class=="marker_sick",
                     well:_class=="marker_well"
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
                         map_manager.map.setView(marker.getLatLng(), 19);
                     });
                     visible_layer.spiderfy();
                 }else{

                    map_manager.map.setView(marker.getLatLng(), 19);
                    marker.fire('click');
                }
           }

         });

    }
//    mark_sick(_id){
//        // find the cow on the map - turn it red
//        // create a record of the cow being sick at a specific date
//        // moving forward from the date the cow remains sick
//        // moving backwards, should the cow remain sick?
//        var $this=this;
//         this.marker_cluster.eachLayer(function (marker){
//             if(marker.options.icon.options._id==_id){
//                marker.options.icon.options.sick=true;
//                marker.setIcon($this.get_marker_icon(_id,"marker_sick"));
//                sick_data.push({"id":_id, "date": moment($("#filter_current_date").val(),'YYYY-MM-DD').unix()})
//
//
//             }
//    });
//    }
    check_status(_id,_date){
        /**
         * Determines if an item is sick. Checks against a list of sick ranges. Amended to also check if a cow is well
         *
         * @param {number} _id the unique id of the item.
         * @param {number} _date the unix time.
         * @returns {string} the name of a class to style the item accordingly
         */

        for(var i=0;i<event_data["sick"].length;i++){
            if(event_data["sick"][i]["id"]==_id && _date>=event_data["sick"][i]["start_date"] && _date<=event_data["sick"][i]["end_date"]){
                return "marker_sick";
            }

        }
        for(var i=0;i<event_data["well"].length;i++){
            if(event_data["well"][i]["id"]==_id && _date>=event_data["well"][i]["start_date"] && _date<=event_data["well"][i]["end_date"]){
                return "marker_well";
            }

        }
        return "marker_default";
    }
   get_event_records(_id,_array){
         /**
         * Generates a list of sick records for an item
         * @param {number} _id the unique id of the item.
         * @returns {array} an array of sick records for the item
         */
        var records=[]
        for(var i=0;i<_array.length;i++){
            if(_array[i]["id"]==_id){
               records.push(_array[i])
            }
        }
        return records;
    }
     get_cluster_color(val){
        //find out where we are in the gradient

       //todo allow for gadient across more colors
       var color1 = hexToRgb("FFFFFF")
       var color2 = hexToRgb("FF0000")
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