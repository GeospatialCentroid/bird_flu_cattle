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
        for (var p in properties) {
            this[p] = properties[p];
        }
        this.poly = null;
        this.pen_center = {};
        this.alt_pen_center = {};
        this.networkLayer = L.layerGroup().addTo(map_manager.map);
        this.auto_pen_index = 0;

    }

    // Shared helper for GeoJSON layer configuration
    get_geojson_options() {
        return {
            style: {
                fillColor: '#b5ffb4',
                weight: 0.2,
                opacity: 1,
                color: '#b5ffb4',
                fillOpacity: 0.3
            },
            onEachFeature: (feature, layer) => {
                var title = feature.properties.id;
                if (feature.properties.name) {
                    title += " (" + feature.properties.name + ")";
                }

                var b = layer.getBounds();
                L.tooltip([b._northEast.lat, b._southWest.lng], {
                    content: String(title),
                    permanent: true,
                    opacity: 0.9,
                    className: "polygon_label",
                    direction: "right",
                    offset: L.point(-5, 9)
                }).addTo(map_manager.map);

                var exclude = ["stroke", "stroke-width", "stroke-opacity", "fill", "fill-opacity"];

                var popup_content = "<strong>PEN ID: " + title + "</strong><br/>";
                popup_content += "<table>";
                for (var p in feature.properties) {
                    if (!exclude.includes(p) && p !== "id" && p !== "name") {
                        popup_content += "<tr><td><b>" + p + ":</b></td><td>" + feature.properties[p] + "</td></tr>";
                    }
                }
                popup_content += "</table>";
                popup_content += "<a href='javascript:void(0);' onclick='record_manager.show_data(\"" + feature.properties.id + "\",\"IN PEN\",true)'>Show Pen Data</a>";

                popup_content +="<br><button id='toggle_edit_btn' class='btn btn-outline-primary btn-sm' onclick='layer_manager.toggle_geojson_editing();'><i class='bi bi-pencil-square'></i></button>"
                popup_content += `<button id='edit_download_btn' class='btn btn-outline-primary btn-sm' onclick="download('geojson.geojson', JSON.stringify(layer_manager.poly.toGeoJSON()))"><i class='bi bi-download'></i></button>`;
                layer.on('click', (e) => {
                    map_manager.show_highlight_geo_json(feature);
                    let popup = L.popup()
                        .setLatLng(e.latlng)
                        .setContent(popup_content)
                        .openOn(map_manager.map);

                    popup.on("remove", () => {
                        map_manager.hide_highlight_feature();
                    });
                });
                let sync_center = () => {
                    let pen_id = String(feature.properties.id);
                    layer_manager.pen_center[pen_id] = layer.getCenter();
                };
                layer.on('pm:edit', sync_center);
                layer.on('pm:dragend', sync_center);
            }
        };
    }
    // Add this method to Layer_Manager:
    toggle_geojson_editing() {
        this.is_editing = !this.is_editing;

        if (this.poly) {
            this.poly.eachLayer((layer) => {
                // todo enable layer dragging
                if (this.is_editing) {
                    layer.pm.enable({
                        allowSelfIntersection: false,
                        draggable: true
                    });
                } else {
                    layer.pm.disable();
                }
            });
        }

        // Update button text and style
        let $btn = $('#toggle_edit_btn');
        if (this.is_editing) {
            $btn.removeClass('btn-outline-primary').addClass('btn-success').html('<i class="bi bi-check-lg"></i>');
        } else {
            $btn.removeClass('btn-success').addClass('btn-outline-primary').html('<i class="bi bi-pencil-square"></i>');
        }
    }
    // Shared helper for indexing center coordinates and alt IDs
    index_pen_layer(layer) {
        if (!layer.feature || !layer.feature.properties) return;

        let pen_id = String(layer.feature.properties.id);
        layer_manager.pen_center[pen_id] = layer.getCenter();

        if (layer.feature.properties.hasOwnProperty('alt_ids')) {
            var alt_ids = layer.feature.properties.alt_ids.split(",");
            for (var a in alt_ids) {
                layer_manager.alt_pen_center[String(alt_ids[a])] = layer.getCenter();
            }
        }
    }

    // Main GeoJSON file loader
    create_geojson(_data) {
        layer_manager.pen_center = {};
        layer_manager.alt_pen_center = {};
        layer_manager.grid_anchor = null;  // Reset the anchor point
        layer_manager.auto_pen_index = 0;  // Reset the grid counter

        layer_manager.poly = L.geoJson(_data, layer_manager.get_geojson_options());
        layer_manager.poly.addTo(map_manager.map);

        layer_manager.poly.eachLayer((layer) => layer_manager.index_pen_layer(layer));
    }
    generate_missing_pens(data) {
        if (!data || !Array.isArray(data)) return;

        let unique_pens = new Set();
        
        // Scan common pen fields in your dataset
        data.forEach(row => {
            if (row["IN PEN"]) unique_pens.add(String(row["IN PEN"]));
            if (row["TO PEN"]) unique_pens.add(String(row["TO PEN"]));
            if (row["FROM PEN"]) unique_pens.add(String(row["FROM PEN"]));
            if (row["PEN"]) unique_pens.add(String(row["PEN"]));
        });

        // Trigger location lookup/auto-generation for each pen
        unique_pens.forEach(pen_id => {
            this.get_poly_location(pen_id);
        });
    }
    // Fallback single-pen auto-generator
    generate_default_pen(pen_id) {
        if (layer_manager.auto_pen_index === undefined) {
            layer_manager.auto_pen_index = 0;
        }

        // Calculate the anchor point based on existing GeoJSON pens ---
        if (!layer_manager.grid_anchor) {
            let existing_pens = Object.keys(layer_manager.pen_center);
            
            if (existing_pens.length > 0) {
                // Average the coordinates of all loaded pens
                let sum_lat = 0, sum_lng = 0;
                existing_pens.forEach(k => {
                    sum_lat += layer_manager.pen_center[k].lat;
                    sum_lng += layer_manager.pen_center[k].lng;
                });
                
                layer_manager.grid_anchor = {
                    lat: sum_lat / existing_pens.length,
                    lng: (sum_lng / existing_pens.length) + 0.008 // Offset slightly to the East
                };
            } else {
                // Fallback to 0,0 if absolutely no pens exist
                layer_manager.grid_anchor = { lat: 0, lng: 0 };
            }
        }
        // ----------------------------------------------------------------------

        let index = layer_manager.auto_pen_index++;
        let cols = 5;
        let row = Math.floor(index / cols);
        let col = index % cols;

        let spacing = 0.003; // ~300m spacing
        let delta = 0.001;   // ~100m box size

        // Add the anchor coordinates to the grid position
        let lat = layer_manager.grid_anchor.lat + (row * spacing);
        let lng = layer_manager.grid_anchor.lng + (col * spacing);

        let geojsonFeature = {
            "type": "Feature",
            "properties": {
                "id": pen_id
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [lng - delta, lat - delta],
                    [lng + delta, lat - delta],
                    [lng + delta, lat + delta],
                    [lng - delta, lat + delta],
                    [lng - delta, lat - delta]
                ]]
            }
        };

        let pen_layer = L.geoJson(geojsonFeature, layer_manager.get_geojson_options());
        pen_layer.addTo(map_manager.map);

        pen_layer.eachLayer((layer) => layer_manager.index_pen_layer(layer));

        if (layer_manager.poly) {
            layer_manager.poly.addLayer(pen_layer);
        } else {
            layer_manager.poly = pen_layer;
        }

        return layer_manager.pen_center[String(pen_id)];
    }

    get_poly_location(pen_id) {
        if (!pen_id) return null;

        if (!layer_manager.pen_center) {
            layer_manager.pen_center = {};
        }

        if (layer_manager.pen_center[pen_id]) {
            return layer_manager.pen_center[pen_id];
        }

        return layer_manager.generate_default_pen(pen_id);
    }


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
                <b>Date Arrived:</b> ${nextRecord["START DATE"].format(eventManager.displayMomentFormat)}<br>
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

