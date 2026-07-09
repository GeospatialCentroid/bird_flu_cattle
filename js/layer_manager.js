/**
 * Description. A layer object to control what is shown on the map
 *
 * @file   This files defines the Layer_Manager class.
 * @author Kevin Worthington
 *
 * @param {Object} properties     The properties passed as a json object specifying:


*/

class Layer_Manager {
  constructor(properties) {
    //store all the properties passed
    for (var p in properties){
        this[p]=properties[p]
    }
    this.poly;
    //create a layer for showing the disease network lines 
    this.networkLayer = L.layerGroup().addTo(map_manager.map);

  }
  create_geojson(_data){
        // create lookup chart too
        layer_manager.pen_center={}

        // create lookup for alt_ids
        layer_manager.alt_pen_center={}
        layer_manager.poly = L.geoJson(_data, {
            style: {
                fillColor: '#b5ffb4',
                weight: .2,
                opacity: 1,
                color: '#b5ffb4',
                fillOpacity: 0.3
            },
            onEachFeature: function (feature, layer) {
            // Build title line
            var title =  feature.properties.id;
            if (feature.properties.name) {
              title += " (" + feature.properties.name + ")";
            }
                var b = layer.getBounds()
                var tooltip = L.tooltip([b._northEast.lat,b._southWest.lng],{
                content:String(title)
                ,permanent: true, opacity: 0.9,className: "polygon_label",direction: "right",offset:L.point(-5, 9)
                })
                .addTo(map_manager.map);

                var exclude = ["stroke", "stroke-width", "stroke-opacity", "fill", "fill-opacity"];



            // Start popup content
            var popup_content = "<strong>"+"PEN ID: " + title + "</strong><br/>";
            popup_content += "<table>";

            for (var p in feature.properties) {
              if (!exclude.includes(p) && p !== "id" && p !== "name") {
                popup_content += "<tr><td><b>" + p + ":</b></td><td>" + feature.properties[p] + "</td></tr>";
              }
            }
            popup_content += "</table>";
                popup_content+="<a href='javascript:void(0);' onclick='record_manager.show_data(\""+feature.properties.id+"\",\"IN PEN\",true)'>Show Pen Data</a>"
               layer.on('click', function(e) {
                  map_manager.show_highlight_geo_json(feature)
                  let popup = L.popup()
                    .setLatLng(e.latlng)
                    .setContent(popup_content)
                    .openOn(map_manager.map);
                      // close event popup
                      popup.on("remove", function () {
                         map_manager.hide_highlight_feature()
                      });



                });
            }
        })
        layer_manager.poly.addTo(map_manager.map);

        layer_manager.poly.eachLayer(function(layer) {
            // populate an object with the pen id as the key and center point for use in quick positioning of the cows
            layer_manager.pen_center[String(layer.feature.properties.id)]=layer.getCenter()

            // do the same for the alt pen centers
            if(layer.feature.properties.hasOwnProperty('alt_ids')){
               var alt_ids =  layer.feature.properties.alt_ids.split(",");
               for(var a in alt_ids){
                    layer_manager.alt_pen_center[String(alt_ids[a])]=layer.getCenter()
               }
            }

        });
    }
    get_poly_location(_id){

        // cows are positioned in pens each pen should know how many cows it contains
        if(!layer_manager.pen_center.hasOwnProperty(String(_id))){
            // pen not found
            // lets try to find it in the alt ids
           return layer_manager.alt_pen_center[String(_id)]
        }

       return layer_manager.pen_center[String(_id)]

    }
//layer_manager.get_poly_location(contact.pen)

 mapTransmissionNetwork(contacts, targetCowPenId) {
    this.networkLayer.clearLayers();
    
    let targetPenCoords = layer_manager.get_poly_location(targetCowPenId); 
    
    contacts.forEach(contact => {
        let contactPenCoords = layer_manager.get_poly_location(contact.pen);
        
        if (!contactPenCoords || isNaN(contactPenCoords.lat) || !targetPenCoords || contact.pen === targetCowPenId) return;
        // Calculate thickness and color
        let lineWeight = Math.min(contact.duration + 1, 1); 
        let lineColor = (contact.event === 'FLU') ? '#dc3545' : '#ffc107'; // Red for flu, yellow for non-flu
        
        // Use our math function to get the curved coordinates
        // We use Math.random() slightly on the bend factor so multiple lines don't overlap perfectly!
        let randomBend = 0.2 + (Math.random() * 0.2); 
        let curvePoints = getBezierCurve(targetPenCoords, contactPenCoords, randomBend);

        // Draw the curved line
        var vectorLine = L.polyline(curvePoints, {
            color: lineColor,
            weight: lineWeight,
            opacity: 0.65,
            dashArray: (contact.event === 'FLU') ? null : '8, 8', // Dashed if they didn't catch the flu
            lineCap: 'round'
        }).addTo(this.networkLayer);

        vectorLine.bindPopup(`
            <b>Transmission Vector</b><br>
            From Pen: ${targetCowPenId} to Pen: ${contact.pen}<br>
            Exposure Duration: ${contact.duration} days<br>
            Resulting Event: ${contact.event}
        `);
    });
}
 mapCowTrajectory(cowId) {
    var data = record_manager.json_data;
    
    // 1. Get ALL records for this specific cow
    let history = data.filter(record => String(record["ID"]) === String(cowId));
    
    if (history.length === 0) return;

    // 2. Sort the records chronologically from oldest to newest
    history.sort((a, b) => a["START DATE"].valueOf() - b["START DATE"].valueOf());
    
    // 3. Clear previous network drawings
    // (Assuming networkLayer is a global L.layerGroup() as defined in your previous step)
    layer_manager.networkLayer.clearLayers(); 
    // map_manager.map.closePopup();

    let stepCounter = 1;

    // 4. Loop through the history to draw the movement vectors
    for (let i = 0; i < history.length - 1; i++) {
        let currentRecord = history[i];
        let nextRecord = history[i + 1];
        console.log(currentRecord)
        let currentPen = currentRecord["IN PEN"];
        let nextPen = nextRecord["IN PEN"]; 
        
        // Only draw a line if the cow actually physically moved to a different pen
        if (currentPen !== nextPen) {
            let startCoords = layer_manager.get_poly_location(currentPen);
            let endCoords = layer_manager.get_poly_location(nextPen);
            console.log(currentPen,startCoords)
            console.log(nextPen,endCoords)
            if (!startCoords || !endCoords) continue;
            
            // REUSE CODE: Generate the curve
            // We use a consistent bend factor here (e.g., 0.2) so the timeline looks clean
            let curvePoints = getBezierCurve(startCoords, endCoords, 0.2);
            let lineColor = '#0dcaf0'; // Saved as a variable so we can reuse it
            // Draw the movement path
            var movementLine = L.polyline(curvePoints, {
                color: lineColor, // Bootstrap Info Blue to match the button
                weight: 4,
                opacity: 0.8,
                dashArray: '10, 10', // Dashed line to imply travel/motion
                lineCap: 'round'
            }).addTo(layer_manager.networkLayer); // Use your layer manager

            marker_manager.getArrowMarker(curvePoints, lineColor).addTo(layer_manager.networkLayer);
            // Add a popup to the line itself so you can click the line to see when it happened
            movementLine.bindPopup(`
                <div class="text-center">
                    <span class="badge bg-info text-dark mb-1">Movement Step #${stepCounter}</span>
                </div>
                <b>Path:</b> Pen ${currentPen} &rarr; Pen ${nextPen}<br>
                <b>Date Arrived:</b> ${nextRecord["START DATE"].format('YYYY-MM-DD')}<br>
                <b>Recorded Event:</b> ${nextRecord["EVENT"] || "Move"}
            `);

            stepCounter++;
        }
    }
}
//zoom_marker(_id){
//    var coords = this.get_feature(_id)
//
//    //var corner=L.latLng(Number(coords[1]), Number(coords[0]))//L.latLngBounds(coords, coords);
//    map_manager.map_zoom_event(coords)
//    //this.layer_click({latlng:corner},1)
//}
//get_feature(_id){
//    //var f =this.layers[0].layer_obj.data.features
//    var f = layer_rects
//    for (var i =0;i<f.length;i++){
//        var props=f[i].properties
//        if(props._id==_id){
//            return f[i].getBounds()
//           // return f[i].geometry.coordinates
//        }
//    }
//  }
//layer_click(e,_resource_id){
//        // show all the projects under the mouse click
//        map_manager.layer_clicked=true
//        map_manager.selected_layer_id=_resource_id
//
//        map_manager.click_lat_lng = e.latlng
//        map_manager.click_x_y=e.containerPoint
//       var  turf_point=turf.point([e.latlng.lng,e.latlng.lat])
//
//        map_manager.popup_show();
//        var features=[]
//        //
//         for(var i =0;i<layer_rects.length;i++){
//
//            layer_rects[i].eachLayer(function(child_layer) {
//                  if (turf.booleanPointInPolygon(turf_point, child_layer.toGeoJSON())) {
//                   features.push(layer_rects[i]);
//                  }
//            })
//        }
//        //
//       // try{
////              map_manager.selected_feature_id=layer_manager.get_object_id(e.layer.feature);
//
//              map_manager.show_popup_details(features)
//        //}catch(error){
//            // could be an artificial click
//             console_log("error",e)
//       // }
//         //map_manager.layer_clicked=false
//  }
//  get_layer_obj(_resource_id){
//      for(var i =0;i<this.layers.length;i++){
//            var temp_layer = this.layers[i]
//            if (temp_layer.id==_resource_id){
//                return temp_layer
//
//            }
//      }
//      // if no layer was returned - maybe we are controls
//     if(_resource_id =="basemap"){
//        return {"layer_obj":this.basemap_layer,"type":"basemap"}
//
//     }
//
//  }
//  is_on_map(_resource_id){
//    var layer = this.get_layer_obj(_resource_id)
//    if (layer){
//        return true;
//    }else{
//        return false;
//    }
//  }
//  get_object_id(_feature){
//        // as the objectid might not be consistent between layers, we'll to no consistently determine what it is
//        if(!_feature?.id ){
//            if( _feature?.properties && _feature.properties?.id){
//                 return  _feature.properties.id
//            }else{
//                return  _feature.properties._id
//            }
//        }
//        return _feature["id"]
//  }


}

