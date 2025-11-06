# Bird Flu in Cattle

## About

The following application has been designed to visualize the movement of dairy cattle between pens,
to help inform transmission of Bird Flu (Influenza A Virus, subtype H5N1) in cattle. This application runs within a web browser and has been designed to work with your herd movement data.
Herd movement data must be loaded into the application in order for it to work. This data is only stored in memory, which prevents others
from accessing it.

## Requirements
This application requires two files:

1. A comma separated variable (CSV; with extension .csv) file listing dates and cattle movements, with the following
   column headers: ID, CURRENT PEN, TO PEN, EVENT, and DATE
   - ID: the cow ID or other cow identifier
   - CURRENT PEN: a number specifying the pen the cow is currently in
   - TO PEN: a number specifying the pen the cow is moving to
   - EVENT: a reason for moving the cow (note that 'FLU' and 'WELL' denote sick and recovered cows, respectively) are used to drive a visual representation of cows in the current application
   - DATE: the day the event and movement occurred, using format M/D/YYYY
    
Additional columns can be added, though they will appear in the table view only.
    
2. A GeoJSON file (with extension .geojson) that contains polygons specifying pen location, with an identifyer for each pen.
This GeoJSON file can be created using https://geojson.io. A brief outline of how to create this file at the given web address is as follows:
   - Navigate to the farm location by using an address in the search bar
   - Use the polygon tool (the square icon) to create shapes outlining each pen denoted in the .csv file
   - After creating each pen polygon, **click** within the shape to reveal a pop-up, enter 'id' (without quotes) into the left table cell (adding the attribute 'id'), enter the pen number in the right table cell, click **Save** from within the popup.
      - These 'id' numbers are used to join the pen number to the appropriate pen location
   - After adding all pens (with 'id' numbers), click **Save** on the top left of the interface. This will save a GeoJSON file to your computer. You will be able to reopen this within https://geojson.io to continue to edit 
     the map, if needed.
   - Note: If you'd like to see additional attributes in the popup, you can add them. And if you assign an attribute named 'name', this will appear on the map next to the 'id'. 
   - To support pens that may have multiple ids, use the 'alt_ids' property and add a comma separated list of additional ids.
   
## Running the App
Once you have both required files on your computer, make sure they are saved in the same directory. Navigate to https://geospatialcentroid.github.io/bird_flu_cattle. Within your file system, navigate to the folder where the required files are saved and drag them, in turn, to the file input field of the application. 
The application will load these files into memory and show the first day of available data, which also places each cow in their respective pen on the map.

## Using the App
The application provides many tools for you to explore your herd data. These are described below. 

### The Map
You will be able to zoom in and out on the farm map, and pan to different map areas.
The pens are drawn in blue and their id number is displayed in the lower left-hand corner. When clicked over, each pen will reveal a pop-up, 
and clicking the **Show Pen Data** link reveals a table showing all the cows in the pen on that day.

Overlaid on pens, circles symbolize the cows present within each pen, which we refer to here as a cluster number. The cluster number in the circle will initially represent the count of clinical cows (i.e. cows denoted as 'FLU' in the uploaded .csv). 
The circles are colored white unless one or more clinical cows are present within the pen. In these instances there is will be a gradient of red shading to the circle; 10% darker for each clinical cow.
If there is a recovered cow in the pen (i.e. cows denoted as 'WELL' in the uploaded .csv), a yellow outer layer is added to the circle.

To change the cluster number to a percent of clinical cows or a count of cows in the pen at that time, use the *Cluster Number* dropdown on the bottom right of the map to make your selection.
Clicking the circle with the specified cluster number will reveal a diagram of all cows in that pen on that day, colored based on the legend (sick, recovered, not sick or recovered).
Clicking on a particular cow within this diagram will show its movement and event history. You can click the **Show Movement History Link** after selecting a cow to reveal a table view of this data.

### The Map Controls
Moving from left to right, the controls below the map do the following:
1. Cow ID look-up: enter a number into the input field to find where that particular cow is on the map.
2. Start and End Date: these fields allow you to adjust the range used to animate cow movements over time. 
   The slider bar below these fields can also be used to adjust the start and end dates. 
   Once a desired date range is set, clicking the **play** button will start the animation, moving between days at 0.3 sec/day.
   The Current Date field will update as the animation progresses, but can also be changed to any day within the range of data uploaded. 
   The left and right arrows next to this field allow you to move forward or backward in time.

### The Table View
A table is created when either the **Show Pen Data** link or **Show Movement History** link is clicked. 
This table shows an expanded view of the data, where each event has been converted to a start and end date range.
Clicking a row in the table changes the current date to the date of the row event, and selects/highlights the corresponding cow on the map.
