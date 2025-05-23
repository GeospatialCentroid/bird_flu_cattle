
function  init_event_prompt(data){
    // populate the event prompt based on the loaded config
    setup_fields()
    $(".picker").drawrpalette("destroy");
    event_settings = data.event_settings // store the settings
      for (var e in event_settings){
        if(e>0){
        // make a duplicate
        duplicate_row($(".duplicate").last())
        }
       $("#data_form .row:last-child").each(function( index ) {
                 $(this).find(":input").each(function( index ) {
                if(typeof($(this).attr("data"))!="undefined"){
                     $(this).val(event_settings[e][$(this).attr("data")])
                }
              });
        });
      }
      $(".picker").drawrpalette()
     show_model()
}
function show_model(){
      $('#model_data_form').modal('show');
}

//--Dynamic event tracking
duplicate_row=function(elm){
      $(elm).parent().parent().parent().append($(elm).parent().parent().clone())
}
fix_picker =function(){
    $(".picker:last").drawrpalette();
}
delete_row=function(elm){
    $(elm).parent().parent().remove()

}
setup_fields=function(){
    // get all the unique events and populate the dropdowns

     $('.start_dropdown').append(get_dropdown('start'))
     $('.end_dropdown').append(get_dropdown('end'))


}

get_dropdown=function(name){
    var select = $('<select data="'+name+'">');
     // allow the end dropdown to have no selection
     if(name=='end'){
          select.append($('<option selected>', {  value: 'None',text: 'None' }));
     }
    for(var i in record_manager.catalog.EVENT.sort()){
        var v = record_manager.catalog.EVENT[i]
        select.append($('<option>', {  value: v,text: v }));
     }

     return select
}
process_data_forms=function(){
    // look through all the forms and pull the information
    var posts=[]
    $("#data_form").children().each(function( index ) {
     var p={}
       $(this).find(":input").each(function( index ) {
        if($(this).attr("data")){
            p[$(this).attr("data")]=$(this).val()
        }
       });
      posts.push(p)
    });
     $('#model_data_form').modal('hide');
    setup_interface(posts)

}
//----------
on_file_change= function(event){
      const files=event.target.files

        for (const file of files) {
             const reader = new FileReader();

            reader.onload = function(e) {
              check_requirements(file.name,e.target.result)
            };

            reader.onerror = function() {
              console.error("Error reading the file");
            };
            reader.readAsText(file); // or readAsDataURL, readAsArrayBuffer, etc.
        }
}

var required_files={".csv":{},".geojson":{}}
    check_requirements=function(_file,_data){
    //This app requires both a csv and a geojson file
    var ext =_file.substring(_file.lastIndexOf("."))
    required_files[ext]["file_name"]=_file
     required_files[ext]["data"]=_data

     var requirements_met=true
     for(var r in required_files){
        if(Object.keys(required_files[r]).length===0){
            requirements_met=false
        }
     }
    if(requirements_met){
        // the data has been loaded via an upload form take the back door
//        initialize_interface(required_files[".csv"].data,true)

        record_manager.process_csv(required_files[".csv"].data,record_manager)
        $("#data_file").html(required_files[".csv"].file_name)
        layer_manager.create_geojson(JSON.parse(required_files[".geojson"].data))
        $("#map_file").html(required_files[".geojson"].file_name)
    }
}