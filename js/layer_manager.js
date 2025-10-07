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
  }
  create_geojson(_data){
        // create lookup chart too
        layer_manager.pen_center={}
        //#b5ffb4
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
            layer_manager.pen_center[String(layer.feature.properties.id)]=layer.getCenter()
         });
    }
    get_poly_location(_id){
        // cows are positioned in pens each pen should know how many cows it contains
        if(!String(_id) in layer_manager.pen_center){
            return
        }

       return layer_manager.pen_center[String(_id)]

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

