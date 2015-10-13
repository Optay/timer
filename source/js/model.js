'use strict';

// Namespace
var Timer = Timer || {};  

Timer.Model = function() {

  /**
  * State
  */
  var tasks = [];
  
  /**
  * TASKS
  */
  var AddTask = function( taskName ) {
    //TODO error check (duplicate or null task name)
    
    var newTask = new Timer.Task( taskName );
    tasks.push(newTask);
    console.log( "AddTask", tasks);
    SaveState();
    
    return newTask;
  }
  var EditTask = function( task, newName ) {
    task.name = newName;
    SaveState();
  }
  
  
  
  
  

  
  var DeleteTask = function( task ) {
    var index = tasks.indexOf( task );
    tasks.splice( index, 1);
    SaveState();
    
    return index;
    
  }
  
  var UpdateTotals = function( task ) {
    task.total = new Timer.TimerTime(0,0);
    for( var dayIndex = 0; dayIndex<task.days.length; dayIndex++ ) {
      var day = task.days[dayIndex];
      day.total = new Timer.TimerTime(0,0);
      for (var i=0; i<day.blocks.length; i++ ) {
        day.total = Timer.TimeAdd( day.total, day.blocks[i].duration);
      }
      task.total = Timer.TimeAdd( task.total, day.total );
    }
  }
  
  /**
   * REPORT
   */
  var GetTotal = function( task, fromDate, toDate ) {
    if ( (task==null) || (fromDate==null) || (toDate==null) ) { return null; }
    
    var total = new Timer.TimerTime(0,0);
    
    for (var iDay = 0; iDay<task.days.length ; iDay ++ ) {
      if ( (Timer.CompareDates(task.days[iDay].date, fromDate ) >= 0 ) &&
           (Timer.CompareDates(task.days[iDay].date, toDate ) <= 0 ) ) {
        
        for (var iBlock = 0; iBlock<task.days[iDay].blocks.length; iBlock++ ) {
          total = Timer.TimeAdd( total, task.days[iDay].blocks[iBlock].duration );
        }
      }
    }
    
    return total;
  }
  
    
  
  /**
  * DAYS
  */

  var DeleteDay = function( task, day ) {
    var index = task.days.indexOf( day );
    task.days.splice(index, 1);
    SaveState();
    
    return index;
  }
  
  var HasDay = function( task, date ) {
    for ( var i=task.days.length - 1; i >=0; i-- ) {
      if ( Timer.CompareDates( task.days[i].date, date ) == 0 ) {
        return true;
      }
    }
    return false;
  }
  
  var GetDay = function( task, date ) {
    if ( task == null ) {
      console.log("Error: task is null");
      return null;
    }
    
    var day = null;
    for ( var i=task.days.length - 1; i >=0; i-- ) {
      /*if ( ( task.days[i].date.year == date.year ) &&
           ( task.days[i].date.month == date.month ) &&
           ( task.days[i].date.day == date.day ) ) {*/
      if ( Timer.CompareDates( task.days[i].date, date ) == 0 ) {
        return task.days[i];
        break;
      }
    }
    console.log("Task does not have Day for given date.");
    return null;
  /*
    if ( day == null ) {
      day = new Timer.Day( { 
                      year: date.year,
                      month: date.month,
                      day: date.day,
                      tags: "" } );
      AddDay( task, day );
    }
    
    return day;*/
  }
  var AddDay = function( task, date ) {
    if ( HasDay( task, date ) ) {
      console.log("Task already has this day.");
      return null;
    }
    var day = new Timer.Day( { 
      year: date.year,
      month: date.month,
      day: date.day } );
    
    task.days.push( day );
    task.days.sort( Timer.CompareDays );
    
    /*
    UpdateTaskView( task );
    if ( task == selected.task ) {
      AddDayView( newDay, task.days.indexOf( newDay ) );
    }
    */
    
    return day;
  }
  
  
  /**
  * BLOCKS
  */
  var AddBlock = function( task, date, newBlock ) {
    var day = GetDay( task, date );
    if ( TestOverlap( day, newBlock ) ) {
      return false;
    }
    InsertBlock( task, day, newBlock );  // add the block to the day
    return true;
  }

  
  var EditBlock = function( task, day, oldBlock, newBlock ) {
    
    // remove old block from the selected day
    day.blocks.splice( day.blocks.indexOf(oldBlock), 1 );
    
    // test for overlap
    var newBlockSafe = !TestOverlap(day, newBlock);
    if ( newBlockSafe ) {
      InsertBlock( task, day, newBlock );  // add the new version
    } else {
      InsertBlock( task, day, oldBlock );  // put the old one back
    }
    
    SaveState();
    
    return newBlockSafe;
  }

  var DeleteBlock = function( task, day, block ) {
    // remove block
    var index = day.blocks.indexOf( block );
    day.blocks.splice(index, 1);
    
    UpdateTotals( task );
    
    SaveState();
    
    return index;
  }
  
  var AddManualBlock = function( task, date, start, stop ) {
    var day = GetDay( task, date );
    
    // Create block object
    var block = new Timer.Block();
    block.start = start;
    block.stop = stop;
    block.duration = Timer.TimeDifference(start, stop);
    
    if ( TestOverlap( day, block ) ) {
      window.alert("Unable to add block, times overlap existing blocks.");
      return null;
    }
    
    InsertBlock( task, day, block );
    SaveState();
    
    return block;
  }
  
  
  // TODO - test for overlap should happen in this function...
  var InsertBlock = function( task, day, block ) {
    // Add new block
    for ( var i = day.blocks.length-1; i>=-1; i-- ) {
      if ( i == -1 ) {
        day.blocks.splice( (i+1), 0, block );
      } else if ( Timer.CompareTimes( block.start, day.blocks[i].stop ) > 0 ) {
        day.blocks.splice( (i+1), 0, block );
        break;
      }
    }
    UpdateTotals( task );
  }
  
  
  /// Returns true if parameter block overlaps any blocks already included in the parameter day.
  /// Returns false if there is no overlap.
  var TestOverlap = function( day, block ) {
    // If block starts or stops within an existing block, there is an overlap
    // If existing block has no end time (is active), then anything after its start time is considered overlapping
    for ( var i=0; i<day.blocks.length; i++ ) {
      var existingBlock = day.blocks[i];
      if ( ( block.start != null ) && ( Timer.CompareTimes( block.start, existingBlock.start ) >= 0 ) ) {
        if ( (existingBlock.stop == null ) || ( Timer.CompareTimes( block.start, existingBlock.stop ) <= 0 ) ) {
          return true;
        }
      }
           
      if ( ( block.stop != null ) && ( Timer.CompareTimes( block.stop, existingBlock.start ) >= 0 ) ) {
        if ( ( existingBlock.stop == null ) || ( Timer.CompareTimes( block.stop, existingBlock.stop ) <= 0 ) ) {
          return true;
        }
      }
    }
    return false;
  }
  

  



  /**
  * Serialize/Deserialize
  */
  var SaveState = function() {
    console.log("SaveState");
    Timer.IO.Save( tasks );
    
  /*
    if(typeof(Storage) !== "undefined") {
      var encoded = JSON.stringify(tasks);
      localStorage.setItem("timerthing", encoded );
    } else {
      console.log("No local storage available.");
    }
    */
  }
  var LoadState = function() {
    var loadedTasks = Timer.IO.Load();
    
    if ( loadedTasks==null ) {
      console.log("Unable to load state.");
      return;
    }
    
    SetState( loadedTasks );
  }

  var SetState = function( newTasks ) {
  
    for (var itask = 0; itask<newTasks.length; itask ++ ) {
      UpdateTotals( newTasks[itask] );
      
      /*
      // find active blocks
      for (var iDay = 0; iDay<newTasks[itask].days.length ; iDay ++ ) {
        for (var iBlock = 0; iBlock<newTasks[itask].days[iDay].blocks.length; iBlock++ ) {
          if ( newTasks[itask].days[iDay].blocks[iBlock].stop == null ) {
            // report if multiple active blocks found, stop extras
            if ( active.block!= null ) {
              // clear running block, alert
              StopBlock();
              // stopblock will update view and save state, but task list has not been updated yet...
              // need dirty system here
              
            }
            active.task = newTasks[itask];
            active.day = newTasks[itask].days[iDay];
            active.block = newTasks[itask].days[iDay].blocks[iBlock];
            
            // check for rollover
            TestDayRollover();
            // day rollover will update view and save state, but task list has not been updated yet...
            // need dirty system here
          }
        }
      }*/
      
    }
    
  
    tasks = newTasks;
  }
  
  var GetTasks = function() {
    return tasks;
  }
  
  
  
  // Interface
  return {
    GetTasks: GetTasks,
    
    AddTask: AddTask,
    EditTask: EditTask,
    DeleteTask: DeleteTask,
    
    HasDay: HasDay,
    GetDay: GetDay,
    AddDay: AddDay,
    DeleteDay: DeleteDay,
    
    AddBlock: AddBlock,
    EditBlock: EditBlock,
    AddManualBlock: AddManualBlock,
    DeleteBlock: DeleteBlock,
    
    GetTotal: GetTotal,
    UpdateTotals: UpdateTotals,
    
    LoadState: LoadState,
    SaveState: SaveState,
    SetState: SetState
  }
}
