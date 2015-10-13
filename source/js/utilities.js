'use strict';


// Namespace
var Timer = Timer || {};  

/**
* Utilities
*/
Timer.TimeAdd = function( timeA, timeB ) {
  var minutesA = timeA.hour * 60 + timeA.minute;
  var minutesB = timeB.hour * 60 + timeB.minute;
  var total = minutesA + minutesB;
  
  var timeTotal = new Timer.TimerTime( parseInt(total/60), total%60 );
  return timeTotal;
}
Timer.TimeDifference = function( timeA, timeB ) {
  var minutesA = timeA.hour * 60 + timeA.minute;
  var minutesB = timeB.hour * 60 + timeB.minute;
  var difference = minutesB - minutesA;
  
  var timeDifference = new Timer.TimerTime( parseInt(difference/60), difference%60 );
  return timeDifference;
}
Timer.ShowTime = function( timerTime ) {
  if ( timerTime == null ) {
    return "--:--";
  } else
    var hour = Timer.ZeroPad( timerTime.hour );
    var minute = Timer.ZeroPad( timerTime.minute );
    return hour + ":" + minute;
}
Timer.ShowDate = function( timerDate  ) {
  return timerDate.year + "-" + Timer.ZeroPad( timerDate.month ) + "-" + Timer.ZeroPad( timerDate.day );
}
/// Parses a string in YYYY-MM-DD format into a TimerDate object.
/// Return null if string is not divided into three substrings by hyphens.
/// Will allow invalid dates like 2000-00-88.
Timer.ParseDate = function( dateString ) {
  var dateValues = dateString.split('-');
  var date = null;
  if ( dateValues.length==3 ) { 
    date = new Timer.TimerDate( Timer.AsInt(dateValues[0]), Timer.AsInt(dateValues[1]), Timer.AsInt(dateValues[2]) );
  }
  return date;
}
/// Parses a string in NN:NN format into a TimerTime object.
/// Will allow invalid times like 33:87.
Timer.ParseTime = function( timeString ) {
  var time = null;
  var timeValues = timeString.split(":");
  if ( timeValues.length==2 ) {
    time = new Timer.TimerTime( Timer.AsInt(timeValues[0]), Timer.AsInt(timeValues[1]) );
  }
  return time;
}

Timer.ZeroPad = function( value ) {
  if ( value<=9 ) {
    return "0" + value;
  } else {
    return "" + value;
  }
}
Timer.AsInt = function( value ) {
  var inted = parseInt( value );
  if ( isNaN(inted) ) { inted = 0; }
  return inted;
}

/// Returns
///   1 if a comes after b
///   -1 if a comes before b
///   0 if the two dates are the same
Timer.CompareDays = function( a, b ) {
  return Timer.CompareDates( a.date, b.date );
}
Timer.CompareDates = function( a, b ) {
  var aIndex = '' + a.year + Timer.ZeroPad(a.month) + Timer.ZeroPad(a.day);
  aIndex = parseInt(aIndex);
  
  var bIndex = '' + b.year + Timer.ZeroPad(b.month) + Timer.ZeroPad(b.day);
  bIndex = parseInt(bIndex);
  
  return (aIndex - bIndex);
}

Timer.CompareTimes = function( a, b ) {
  var aValue = a.hour * 60 + a.minute;
  var bValue = b.hour * 60 + b.minute;
  
  return ( aValue - bValue );
}


/**
* Definitions
*/
// Task definition
Timer.Task = function( name ) {
  this.name = name;
  this.days = [];
  this.total = new Timer.TimerTime(0,0);
}
// Day definition
Timer.Day = function( initial ) {
  var now = new Date();
  var year = now.getFullYear();
  var month = now.getMonth() + 1; // getMonth return value is zero-indexed
  var day = now.getDate();
  var tags = "";
  var lastInSet = false;
  
  if ( initial != null ) {
    if ( initial.year != null ) { year = initial.year; }
    if ( initial.month != null ) { month = initial.month; }
    if ( initial.day != null ) { day = initial.day; }
    if ( initial.tags != null ) { tags = initial.tags; }
    if ( initial.lastInSet != null ) { lastInSet = initial.lastInSet; }
  }
  
  this.date = new Timer.TimerDate( year, month, day );
  this.blocks = [];
  this.total = new Timer.TimerTime(0,0);
  this.tags = tags;
  this.lastInSet = lastInSet;
}

Timer.Month = function( initial ) {
  var now = new Date();
  var year = now.getFullYear();
  var month = now.getMonth() + 1; // getMonth return value is zero-indexed
  if ( initial != null ) {
    if ( initial.year != null ) { year = initial.year; }
    if ( initial.month != null ) { month = initial.month; }
  }
  this.year = year;
  this.month = month;
}


// Time object definitions
Timer.Block = function() {
  var now = new Date();
  this.start = new Timer.TimerTime( now.getHours(), now.getMinutes() );
  this.stop = null;
  this.duration = new Timer.TimerTime(0,0);
}
Timer.TimerDate = function( year, month, day ) {
  var now = new Date();
  
  if ( year==null) { year = now.getFullYear(); }
  if ( month==null) { month = now.getMonth() + 1; } // getMonth return value is zero-indexed
  if ( day==null) { day = now.getDate(); }

  this.year = year;
  this.month = month;
  this.day = day;
}
Timer.TimerTime = function( hour, minute ) {
  this.hour = hour;
  this.minute = minute;
}

// static IO methods: load, save, ...
Timer.IO = (function () {
  function Load() {
    if(typeof(Storage) === "undefined") {
      console.log("No local storage available.");
      return null;
    }
    var encoded = localStorage.getItem("timerthing");
    
    return this.Parse( encoded );
  }
  function Parse( encoded ) {
    var decoded = JSON.parse( encoded );
    if ( decoded == null ) {
      console.log("Save data is unreadable.");
      return null;
    }
    
    // identify save version
    var saveVersion = 1;
    if ( decoded.hasOwnProperty("meta") ) {
      saveVersion = decoded.meta.saveVersion;
    }
    //console.log( saveVersion );
    
    if ( saveVersion == 1 ) {
      window.alert("Your save file is version 1 which is not currently supported.");
      return;
    
      // Populate times array
      for( var iTask=0; iTask < decoded.length; iTask++ ) {
        var task = decoded[ iTask ];
        
        for (var iDay = 0; iDay < task.days.length; iDay++ ) {
          var day = task.days[iDay];
          day.times = [];
          
          for (var iBlock = 0; iBlock < day.blocks.length; iBlock++ ) {
            if ( day.blocks[iBlock].stop != null ) {
              day.times.push( day.blocks[iBlock].start );
              day.times.push( day.blocks[iBlock].stop );
            }
          }
        }
      }
      
      return decoded;
    } else
    if ( saveVersion == 2 ) {
    
      // parse times, generate task objects, calculate totals
      for( var iTask=0; iTask < decoded.tasks.length; iTask++ ) {
        var task = decoded.tasks[ iTask ];
        task.total = null;
        
        for (var iDay = 0; iDay < task.days.length; iDay++ ) {
          var day = task.days[iDay];
          day.blocks = [];
          day.total = null;
          
          var iTime = 0;
          while( (iTime+1) < day.times.length ) {
            var block = new Block();
            block.start = day.times[iTime];
            block.stop = day.times[ iTime+1 ];
            block.duration = TimeDifference( block.start, block.stop );
            
            day.blocks.push( block );
            iTime += 2;
          }
        }
      }
    
      return decoded.tasks;
    } else if ( saveVersion == 3 ) {
      // no tomfoolery
      return decoded.tasks;
    }

  }
  
  function Save( tasks ) {
    if(typeof(Storage) === "undefined") {
      console.log("No local storage available.");
      return;
    }
    
    localStorage.setItem("timerthing", GenerateSaveString( tasks ) );
    //console.log( GenerateSaveString( tasks ) );
  }
  
  function GenerateSaveString( tasks ) {
    /*
    var saveTasks = [];
    
    // Make a copy of the data
    // and remove data not to be saved: totals
    for( var iTask=0; iTask < tasks.length; iTask++ ) {
      var task = new Task();
      saveTasks.push( task );
      
      task.name = tasks[ iTask ].name;
      delete task.total;
      
      for (var iDay = 0; iDay < tasks[iTask].days.length; iDay++ ) {
        var currentDay = tasks[iTask].days[iDay];
        var day = new Day( {year: currentDay.date.year,
                            month: currentDay.date.month,
                            day: currentDay.date.day,
                            lastInSet: currentDay.lastInSet,
                            tags: currentDay.tags } );
                            
        
        // Replace with something more bare
        delete day.blocks;
        day.blocks = [];
        
        for (var iBlock = 0; iBlock < currentDay.blocks.length; iBlock++ ) {
          day.blocks.push({ start: currentDay.blocks[iBlock].start,
                            stop: currentDay.blocks[iBlock].stop });
        }
        
        delete day.total;
        
        task.days.push( day );
      }
    }*/
    
    var saveData = { meta: { saveVersion: 3},
                     tasks: tasks
                   };
    
    var encoded = JSON.stringify( saveData );
    
    return encoded;
  }
  
  return { Load: Load,
           Save: Save,
           Parse: Parse,
           GenerateSaveString: GenerateSaveString }
  
})();


