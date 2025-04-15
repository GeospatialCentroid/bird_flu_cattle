#Bird flu in cattle

## About

The following application has been designed to visualize the movement of cows among pens
to help understand the transmission of Bird Flu in cattle. This application runs within a web browser and has been designed to work with your herd movement data.
The herd movement data must be loading into the application in order for the application to work, but this data is only stored in memory preventing others
of accessing it.

## Requirements
This application requires two files for it to run:

1. A comma separated variable (CSV) file (with extension .csv) listing herd movements containing the following
   header columns: ID, CURRENT PEN, TO PEN, EVENT, and DATE
   - ID: the cow ID
   - CURRENT PEN: the current pen number the cow was in
   - TO PEN: the pen number where the cow was moved
   - EVENT: The reason for the move (note that 'FLU' and 'WELL') are used to drive a visual representation of cows in the app
   - DATE: the day the event occurred in the format M/D/YY
    
Additional columns can be added though they will just pass through and appear in the table view.
    
2. A GeoJSON file (with extension .geojson) that contains polygons for the pens, with an 'id' for each pen.
This GeoJSON file can be created using https://geojson.io. Start by navigating to the farm location
   and use the polygon tool (the square icon) to create shapes outlining each of the pens.
   After each shape is drawn, **click** within the shape to reveal it's popup, 
   Enter 'id' (without quotes) into the left table cell, then enter the pen number in the right table cell,
   and finally click **Save** from within the popup.
   After all the pens (with 'id' numbers) have been added, clicking **Save** on the top left of the interface 
   will save a GeoJSON file to your computer. 
   
## Running the App
Once you have both the required files on your computer, make sure they are saved in the same directory and then navigate to https://geospatialcentroid.github.io/bird_flu_cattle 
On your file system, navigate to the folder where the required files are saved, and drag them on to the file input field of the application. 
The application will load these files into memory and show the first day of the data, placing the cows in their respective pens on the map.

## Using the App
The application provides many tools for you to explore your herd data.
###The Map
The map itself allows you to zoom in and out of your farm and pan around.
The pens are drawn in blue and their id number is displayed on top. The pens can be clicked to reveal a popup, 
and clicking the **Show Pen Data** link reveals a table showing all the cows in the pen on that day.

Cows are clustered within their pens, and the number on the cluster represents the count of clinical cows. 
To change this number to either a precent of clinical cows, or simply the count of cows in the pen at that time, 
use the *Cluster Number* dropdown on the bottom right of the map (above the legend).
Clicking the cluster reveals all the cows in that pen on that day, and they are colored based on the legend.
Clicking on a cow shows it's popup information and to see its movement history, click the **Show Movement History Link**, to reveal a table view of its data.

###The Map Controls
Moving from left to right, the controls below the map do the following:
1. Search by Cow ID, enter a number into the input field to find where that particular cow is on the map.
2. The Start and End Date fields allow you to adjust the range used to animate cow movements over time. 
   The slider bar below these fields can also be used to adjust the start and end dates. 
   Once your desired date range is set, clicking the **play** button will start the animation.
3. The Current Date field updates as the animation progresses, or can be changed to any day within your data's range. 
   The left and right arrows next to this field allow you to jump either forward or backwards in time.

###The Table View
A table is created when either the **Show Pen Data** link or **Show Movement History** link is clicked. 
This table shows an exploded view of the loaded data, where each herd movement event is converted to a start and end date range.
Clicking a row in the table changes the current date to the start date of the row event and selects the corresponding cow ID on the map.