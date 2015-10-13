'use strict';

var Timer = Timer || {};   // Namespace

Timer.Controller = function( _model, _view ) {
  var model = _model;
  var view = _view;
  
  var LoadState = function() {
    model.LoadState();
    
    active.task = null;
    active.day = null;
    active.block = null;
    
    view.PopulateTaskList( model.GetTasks(), -1 );
    
    // update selected/active
    //UpdateBlockControls();
  }
  
  
  
  var AddTask = function( event ) {
    console.log("AddTask");
    event.preventDefault(); // no HTTP submission, please.
    
    var $inputField = $('#newTaskName');
    
    var newTask = model.AddTask( $inputField.val() );
    
    $inputField.val( $inputField.defaultValue ); // necessary?
    
    view.AddTaskView( newTask, model.GetTasks().length-1 );
    view.ToggleAddTaskForm();
  }
  
  /// Used to prevent forms from submitting and reloading the page.
  var PreventDefault = function( event ) {
    event.preventDefault();
  }
  
  var SelectTask = function( event ) {
    console.log("SelectTask", model.GetTasks());
    
    var optionSelected = $("option:selected", this);
    var newSelectedTask = model.GetTasks()[ optionSelected.attr('data-index') ];
    
    view.HideEditTaskForm();
    
    if ( newSelectedTask ==  null ) { console.log("Selected task is null"); return; }
    
    // deselect?
    if ( selected.task == newSelectedTask ) {
      selected.task = null;
      selected.day = null;
      selected.block = null;
      
      view.PopulateTaskList( model.GetTasks(), -1 );
      
      PopulateDaysView();
      view.ClearBlocksView();
      
      // TODO - what does this do in current implementation?
      $('#taskList' + ' tr' ).removeClass('selected');
      $('#deleteTask').hide();
      //
      
      return;
    }
    
    selected.task = newSelectedTask;
    selected.day = null;
    selected.block = null;
    
    // TODO - is this relevant anymore?
    $('#taskList' + ' tr' ).removeClass('selected');
    $(this).addClass('selected');
    $('#deleteTask').show();
    //
    
    // Reset filter dates
    daysFilterFromPinned = false;
    daysFilterToPinned = false;
    
    // TODO - this should be handled by the view object
    $('#pinDaysFilterFrom').prop("disabled", false );
    $('#pinDaysFilterTo').prop("disabled", false );
    
    daysFilterFrom = new Timer.TimerDate();
    daysFilterTo = new Timer.TimerDate();
    if ( selected.task.days.length > 0 ) {
      daysFilterFrom = selected.task.days[0].date;
      daysFilterTo = selected.task.days[(selected.task.days.length-1)].date;
    }
    view.UpdateFilter( daysFilterFrom, daysFilterTo );
    //
    
    view.UpdateTaskDetailView( selected.task );
    PopulateDaysView();
    view.ClearBlocksView();
  }
  
  var ToggleEditTaskForm = function () {
    view.ToggleEditTaskForm( selected.task.name );
  }
  
  var EditTask = function( event ) {
    event.preventDefault(); // no HTTP submission, please.
    
    if ( selected.task == null ) { return; }
    
    var newTaskName = $('#editTaskForm input[name=taskName]').val();
    
    model.EditTask( selected.task, newTaskName );
    
    view.UpdateTaskDetailView( selected.task );
    view.PopulateTaskList( model.GetTasks(), model.GetTasks().indexOf( selected.task ) );
    view.ToggleEditTaskForm();
  }
  
  
  var DeleteTask = function() {
    if (selected.task == null) { return; }
    
    if ( !window.confirm("Delete selected task?") ) { return; }
    
    var index = model.DeleteTask( selected.task );
    view.DeleteTaskView( index );
    
    selected.task = null;
    selected.day = null;
    selected.block = null;
    
  }  
  

  /// Start/stop the timer.
  var ToggleTimer = function() {
    if (active.block==null) {
      StartBlock();
    } else {
      StopBlock();
    }
  }
  

  
  var UpdateRunningTimer = function() {
    if ( active.block == null ) { return; }
    
    if ( TestDayRollover() ) { return; }
    
    active.block.duration = Timer.TimeAdd( active.block.duration, new Timer.TimerTime( 0, 1 ) );
    view.UpdateRunningTimerView( active.block );
  }
  
  var TestDayRollover = function() {
    if ( active.block == null ) { return; }
    
    var today = new Timer.TimerDate();
    var dayDifference = Timer.CompareDates( today, active.day.date );
    if ( dayDifference != 0 ) {
      // Stop active block at 23:59
      active.block.stop = new TimerTime(23, 59);
      active.block.duration = TimeDifference( active.block.start, active.block.stop );
      model.UpdateTotals();
      
      // clear timer view
      view.UpdateRunningTimerView( null );
      view.UpdateDayView( active.day, selected.task.days.indexOf( active.day ) );
      view.UpdateBlockView( active.block, selected.day.blocks.indexOf( active.block ) );
      view.UpdateTimerControls( false );
      
      if ( dayDifference == 1 ) { // next day
        // Start a new block at 00:00 for the new day
        active.block = new Timer.Block();
        active.block.start = new Timer.TimerTimer(0,0);
        if ( model.AddBlock( active.task, today, active.block ) ) {
          active.day = model.GetDay( active.task, today );
          view.UpdateRunningTimerView( active.block );
          if ( selected.day == active.day ) {
            view.AddBlockView( active.block, active.day.blocks.length-1, SelectBlock );
          }
          view.UpdateTimerControls(true);
        } else {
          active.task = null;
          active.day = null;
          active.block = null;
        }          
      }
      
      model.SaveState();
      
    }
  }
  
  /**
   * REPORTS
   */
  var UpdateReport = function() {
    console.log("UpdateReport");
    
    // attempt to parse from and to as dates
    var fromDate = Timer.ParseDate( $('#reportFrom').val() );
    var toDate = Timer.ParseDate( $('#reportTo').val() );
    
    var total = model.GetTotal( selected.task, fromDate, toDate );
    
    view.UpdateReport( total );
  }
  var SetReportAll = function() {
    if (selected.task.days.length == 0 ) { return; }
    var fromDate = selected.task.days[0].date;
    $('#reportFrom').val( Timer.ShowDate(fromDate) );
    var toDate = selected.task.days[(selected.task.days.length-1)].date;
    $('#reportTo').val( Timer.ShowDate(toDate) );
    UpdateReport();
  }
  var SetReportLastMonth = function() {
    if (selected.task.days.length == 0 ) { return; }
    var lastDate = selected.task.days[(selected.task.days.length-1)].date;
    var fromDate = new Timer.TimerDate( lastDate.year, lastDate.month-1, 1 );
    $('#reportFrom').val( Timer.ShowDate( fromDate ) );
    var toDate = new Timer.TimerDate( fromDate.year, fromDate.month, 31 );
    $('#reportTo').val( Timer.ShowDate( toDate) );
    UpdateReport();
  }
  var SetReportCurrentMonth = function() {
    if (selected.task.days.length == 0 ) { return; }
    var lastDate = selected.task.days[(selected.task.days.length-1)].date;
    var fromDate = new Timer.TimerDate( lastDate.year, lastDate.month, 1 );
    $('#reportFrom').val( Timer.ShowDate( fromDate ) );
    var toDate = new Timer.TimerDate( lastDate.year, lastDate.month, 31 );
    $('#reportTo').val( Timer.ShowDate( toDate) );
    UpdateReport();
  }
  
  /**
   * Log filter
   */
  // TODO - Update filter dates when model changes, need better MVC separation to implement this sensibly.
  var PinDaysFilterFrom = function() {
    daysFilterFromPinned = true;
    $('#pinDaysFilterFrom').prop("disabled", true );
    PopulateDaysView();
  }
  var PinDaysFilterTo = function() {
    daysFilterToPinned = true;
    $('#pinDaysFilterTo').prop("disabled", true );
    PopulateDaysView();
  }
  
  var UpdateDaysFilter = function(event) {
    console.log('updateDaysFilter');
    
    if ( event.target.id == 'dayDisplayFrom' ) {
      daysFilterFromPinned = false;
      $('#pinDaysFilterFrom').prop("disabled", false );
    }
    if ( event.target.id == 'dayDisplayTo' ) {
      daysFilterToPinned = false;
      $('#pinDaysFilterTo').prop("disabled", false );
    }
    
    // Parse filter dates
    // Filter task days based on filter days
    // attempt to parse from and to as dates
    var fromDate = Timer.ParseDate( $('#dayDisplayFrom').val() );
    var toDate = Timer.ParseDate( $('#dayDisplayTo').val() );
    
    if ( (fromDate!=daysFilterFrom) || (toDate!=daysFilterTo) ) {
      daysFilterFrom = fromDate;
      daysFilterTo = toDate;
      PopulateDaysView();
    }
  }
  
  var PinDaysFilter = function() {
    if ( (selected.task!=null) && (selected.task.days.length > 0) ) {
      if ( daysFilterFromPinned ) {
        daysFilterFrom = selected.task.days[0].date;
        view.UpdateFilter( daysFilterFrom, null );
      }
      if ( daysFilterToPinned ) {
        daysFilterTo = selected.task.days[(selected.task.days.length-1)].date;
        view.UpdateFilter( null, daysFilterTo );
      }
    }
  }
  var PopulateDaysView = function() {
    if ( selected.task == null ) { return; }
    PinDaysFilter();
    
    var selectedDayIndex = selected.task.days.indexOf( selected.day );
    
    view.PopulateDaysView( selected.task, daysFilterFrom, daysFilterTo, selectedDayIndex, SelectDay );
  }
  
  /**
   * DAYS
   */
  var SelectDay = function(event) {
    if ( $(event.target).is('#deleteDay') ) { return; }
 
    $( '#dayList tr' ).removeClass('selected');
    
    //console.log(this);
    //console.log(event.target);
    var $deleteDay = $('#deleteDay');
    
    var selectedDay = selected.task.days[ $(this).attr('data-index') ];
    if ( selectedDay == selected.day ) {
      selected.day = null;
      $deleteDay.hide();
      view.ClearBlocksView();
    } else {
      selected.day = selectedDay;
      $(this).addClass('selected');
      
      $(this).find('td:nth-of-type(3)').append( $deleteDay );
      $deleteDay.show();
      
      view.UpdateBlocksView( selected.day, -1, SelectBlock );
    }
    selected.block = null;
  
  }
  
  var DeleteDay = function() {
    if ((selected.day == null) || (selected.task == null)) { return; }
    
    if ( !window.confirm("Delete selected day?") ) { return; }
    var index = model.DeleteDay( selected.task, selected.day );
    PinDaysFilter();
    view.DeleteDayView( index, selected.task.days.length );
    view.ClearBlocksView();
  }
  
  /**
   * BLOCKS
   */
  var SelectBlock = function( event ) {
    if ( $(event.target).is('#deleteBlock')||$(event.target).is('#editBlock') ) { return; }
    console.log("SelectBlock", event.target);
    
    $( '#blockList tr' ).removeClass('selected');
    
    var $editDelete = $('#editDeleteBlock');
    
    var newBlock = selected.day.blocks[ $(this).attr('data-index') ];
    if ( newBlock == selected.block ) {
      selected.block = null;
      $editDelete.hide();
      view.ResetEditBlockForm();
    } else {
      selected.block= newBlock;
      $(this).addClass('selected');
      $(this).find('td:nth-of-type(3)').append($editDelete);
      $editDelete.show();
    }
  }
  
  /// Attempt to add a new block
  var AddBlock = function( task, date, block ) {
    // Add a new day if we need one
    var newDay = !model.HasDay( selected.task, date );
    if ( newDay ) {
      model.AddDay( selected.task, date );
      PinDaysFilter();
    }
    
    // Make sure block does not overlap existing blocks
    if ( !model.AddBlock( selected.task, date, block ) ) {
      window.alert("Unable to start timer, current time overlaps with existing block.");
      console.log("Unable to start new block. Starting time overlaps existing block.");
      active.block = null;
      return false;
    }
    
    if ( selected.task == task ) {
      var day = model.GetDay( task, date );
      var dayIndex = selected.task.days.indexOf(day);
      if ( newDay ) {
        view.AddDayView( day, dayIndex, SelectDay );
      } else {
        view.UpdateDayView( day, dayIndex );
      }
      if ( selected.day == day ) {
        view.AddBlockView( block, day.blocks.indexOf(block), SelectBlock );
      }
    }
    
    return true;
  }
  
  /// Start a new block at the current time for the selected task.
  var StartBlock = function() {
    if ( selected.task == null ) { return; }
    if ( active.block != null ) { return; } // Only one open block at a time

    // Attempt to add a new block to the selected task
    var newBlock = new Timer.Block();
    var date = new Timer.TimerDate();
    
    if ( AddBlock( selected.task, date, newBlock ) ) {
      // Update state and view
      active.block = newBlock;
      active.task = selected.task;
      activeTime = active.block.duration;
      active.day = model.GetDay( active.task, date );
      
      view.UpdateTimerControls(true, active.task );
      view.UpdateRunningTimerView( active.block, active.task );
    }
  }
  var StopBlock = function() {
    if ( active.block == null ) { return; }
    console.log("StopBlock");

    var now = new Date();
    active.block.stop = new Timer.TimerTime( now.getHours(), now.getMinutes() );
    active.block.duration = Timer.TimeDifference( active.block.start, active.block.stop );
    
    model.UpdateTotals( active.task );
    model.SaveState();
    
    view.UpdateRunningTimerView( null );
    view.UpdateTimerControls( false );
    if ( selected.task == active.task ) {
      view.UpdateDayView( active.day, active.task.days.indexOf( active.day) );
    }
    if ( selected.day == active.day ) {
      view.UpdateBlockView( active.block, active.day.blocks.indexOf( active.block) );
    }
    
    active.task = null;
    active.day = null;
    active.block = null;
  }
  
    
  var ToggleEditBlockForm = function() {
    var selectedBlockIndex = selected.day.blocks.indexOf( selected.block );
    view.ToggleEditBlockForm( selectedBlockIndex, selected.block );
  }
  
  var EditBlock = function( event ) {
    event.preventDefault();
    
    var oldBlock = selected.block;
    var newBlock = new Timer.Block();
    newBlock.start = Timer.ParseTime( $('#editBlockStart').val() );
    newBlock.stop = Timer.ParseTime( $('#editBlockStop').val() );
    newBlock.duration = Timer.TimeDifference( newBlock.start, newBlock.stop );
    
    if ( model.EditBlock( selected.task, selected.day, oldBlock, newBlock ) ) {
      PopulateDaysView();
      view.UpdateBlocksView( selected.day, selected.day.blocks.indexOf( selected.block ), SelectBlock );
    }
    
  }  
  var DeleteBlock = function() {
    if ((selected.day == null) || (selected.block == null)) { return; }
    if ( !window.confirm("Delete selected block?") ) { return; }
    
    // remove block
    var index = model.DeleteBlock( selected.task, selected.day, selected.block );
    selected.block = null;
    
    view.UpdateDayView( selected.day );
    view.DeleteBlockView(index);
    view.ResetEditBlockForm();
  }
  var ToggleAddBlockForm = function() {
    view.ToggleAddBlockForm( selected.day );
  }
  
  var AddManualBlock = function( event ) {
    event.preventDefault();
    
    console.log("AddManualBlock");
    
    if ( selected.task == null ) {return;} // Form should be disabled in this case, but we'll keep this until the big refactor.
    
    // Parse date
    var date = Timer.ParseDate( $('#addBlockForm input[name=addBlockDate]').val() );
    
    // Parse start/end or duration
    var start = Timer.ParseTime( $('#addBlockForm input[name=addBlockStart]').val() );
    var stop = Timer.ParseTime( $('#addBlockForm input[name=addBlockStop]').val() );
    
    if ( (date==null) || (start==null) || (stop==null) ) { return; }
    
    var newBlock = new Timer.Block();
    newBlock.start = start;
    newBlock.stop = stop;
    newBlock.duration = Timer.TimeDifference( start, stop );
    
    if ( AddBlock( selected.task, date, newBlock) ) {
      view.ToggleAddBlockForm(); // Hide the form.
    }
  }
  
  
  /**
   * BACKUP/RESTORE
   */
  var Backup = function() {
    var $field = $('#backupForm textarea');
    $field.val( Timer.IO.GenerateSaveString( model.GetTasks() ) );
  }
  var Restore = function() {
    if ( !window.confirm("Replace current state with contents of form?") ) { return; }
    
    var encoded = $('#backupForm textarea').val();
    
    var loadedTasks = Timer.IO.Parse( encoded );
    if ( loadedTasks==null ) {
      console.log("Unable to restore state.");
      return;
    }
    
    selected.task = null;
    selected.day = null;
    selected.block = null;
    
    model.SetState( loadedTasks );
    model.SaveState();
    view.PopulateTaskList( model.GetTasks(), -1 );
    $('#taskList').trigger('change');
    
  }
  
  
  /**
   * Hook
   */
  $('#noSubmitForm').submit( PreventDefault );
  
  // Timer
  $('#startStop').click( ToggleTimer );
  //$('#startTimer').click( StartBlock );
  //$('#stopTimer').click( StopBlock );
  
  // Tasks
  $('#addTask').click( view.ToggleAddTaskForm );
  $('#addTaskForm').submit( AddTask );
  $('#newTaskCancel').click( view.ToggleAddTaskForm );
  
  $('#taskListForm').submit( PreventDefault );
  $('#taskList').change( SelectTask );
  
  $('#deleteTask').click( DeleteTask );
  
  $('#editTask').click( ToggleEditTaskForm );
  $('#editTaskForm').submit( EditTask );
  $('#editTaskForm').bind( 'reset', view.HideEditTaskForm );
  
  // Report
  $('#reportFrom').on('change keydown paste input', UpdateReport );
  $('#reportTo').on('change keydown paste input', UpdateReport );
  $('#reportAll').click( SetReportAll );
  $('#reportCurrentMonth').click( SetReportCurrentMonth );
  $('#reportLastMonth').click( SetReportLastMonth );
  
  
  // Days, Blocks
  $('#dayDisplayFrom').on('change keydown paste input', UpdateDaysFilter );
  $('#dayDisplayTo').on('change keydown paste input', UpdateDaysFilter );
  $('#pinDaysFilterFrom').click( PinDaysFilterFrom );
  $('#pinDaysFilterTo').click( PinDaysFilterTo );
  
  $('#deleteDay').click( DeleteDay );
  
  $('#editBlock').click( ToggleEditBlockForm );
  $('#editBlockForm').submit( EditBlock );
  $('#editBlockForm').bind('reset', view.ResetEditBlockForm );
  $('#deleteBlock').click( DeleteBlock );
  
  $('#addBlock').click( ToggleAddBlockForm );
  $('#addBlockForm').submit( AddManualBlock );
  $('#addBlockForm').bind( 'reset', view.ResetAddBlockForm );
  
  // Backup
  $('#backupForm').submit( PreventDefault );
  $('#backupForm button[name="backup"]').click( Backup );
  $('#backupForm button[name="restore"]').click( Restore );
  
  // Help
  $('#helpToggle').click( view.ToggleHelp );
  
//  $('#editTags').click( ToggleTagForm );
//  $('form#tagsForm').submit( EditTags );
 
  /** 
   * State
   */
  var active = {
    task: null,
    day: null,
    block: null
  };
  var selected = {
    task: null,
    month: null,
    day: null,
    block: null
  };
  var activeTime = new Timer.TimerTime(0,0);
  
  var daysFilterFrom = null;
  var daysFilterTo = null;
  var daysFilterFromPinned = true;
  var daysFilterToPinned = true;
  
  window.setInterval( UpdateRunningTimer, 60000 );

  return {
    LoadState: LoadState
  }
}


function InitTimer() {
  var model = new Timer.Model();
  var view = new Timer.View();
  var timer = new Timer.Controller( model, view );
  
  timer.LoadState();
  $('#taskList').trigger('change');
  
}
  
$(document).ready( InitTimer );

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



'use strict';


var Timer = Timer || {};   // Namespace

Timer.View = function() {
  /**
   * View
   */
  var AddTaskView = function( task, index ) {
    var newItem = $( CreateTaskViewItem( task, index ) );
    $('#taskList').append( newItem );
    
    newItem.prop( 'selected', true );
    $('#taskList').trigger('change');
  }
  
  var UpdateTaskView = function( task ) {
    var $element = GetTaskElement( task );
    
    var newContent = task.name;
    
    if ( task == active.task ) { newContent += "*"; }
    
    $element.empty();
    $element.append( newContent );
  }
  
  var DeleteTaskView = function( index ) {
    var $element = $('#taskList option[data-index="' + index + '"]');
    //AnimateRowOut( $element, true );
    
    console.log($element);
    
    var taskCount = $('#taskList option[data-index]').length;
    
    var $other;
    for ( var i=(index+1); i<= taskCount; i++ ) {
      $other = $('#taskList option[data-index="' + i + '"]');
      $other.attr('data-index', i-1);
    }
    
    $element.remove();
    $('#taskList').trigger('change');
    
  }
  
  var PopulateTaskList = function( tasks, selectedTaskIndex ) {
    console.log("PopulateTaskList");
    $('#taskList').empty();
    var option = '';
    for (var i=0;i<tasks.length;i++){
      option += CreateTaskViewItem( tasks[i], i );
    }
    option = $(option);
    $('#taskList').append(option);
    
    if ( selectedTaskIndex>=0 ) {
      $('#taskList' + ' [data-index="' + selectedTaskIndex + '"]').prop('selected', true );
    }
  }
  
  var CreateTaskViewItem = function( task, index, active ) {
    
    return '<option class="task" data-index="' + index + '">' +
           task.name + (( active )?"*":"") +
           '</option>';
  }
  
  var UpdateTaskDetailView = function( task ) {
    $('#taskName').html( task.name );
  }
  
  var AppendDeleteButton = function( $parent ) {
    /*
    var $deleteButton = $('<div class="delete"></div>');
    $parent.append( $deleteButton );
    
    return $deleteButton; // For attaching appropriate event handler
    */
  }

  /// Update the total for a day
  var UpdateDayView = function(day, index) {
    var $element = $( '#dayList > tbody > tr[data-index="'+index+'"] > td:nth-of-type(2)');
    if ( $element == null ) { return; }
    $element.text( Timer.ShowTime(day.total) );
  }
  
  var UpdateFilter = function( daysFilterFrom, daysFilterTo ) {
    if (daysFilterFrom !== null ) {
      $('#dayDisplayFrom').val( Timer.ShowDate( daysFilterFrom) );
    }
    if (daysFilterTo !== null ) {
      $('#dayDisplayTo').val( Timer.ShowDate( daysFilterTo) );
    }
  }
  
  var PopulateDaysView = function( task, daysFilterFrom, daysFilterTo, selectedDayIndex, onClickDayRow ) {
    
    // Preserve shared elements
    var $deleteDay = $('#deleteDay');
    $('#daysHolder').append($deleteDay);
    $deleteDay.hide();
    //
    
    $('#dayList tbody tr').remove();
    //ClearBlocksView();
    
    // Generate elements for filtered days
    var dayElements = '';
    for ( var i=0; i< task.days.length; i++ ) {
      // filter
      if ( (daysFilterFrom != null) && (Timer.CompareDates( task.days[i].date, daysFilterFrom) < 0 ) ) { continue; }
      if ( (daysFilterTo != null) && (Timer.CompareDates( task.days[i].date, daysFilterTo) > 0 ) ) { continue; }
      //
      
      dayElements += '<tr data-index="' + i + '" class="day-row">' +
                     CreateDayViewContent( task.days[i] ) +
                     '</tr>';
    }
    dayElements = $(dayElements);
    $('#dayList tbody').append(dayElements);
    dayElements.filter('.day-row').click( onClickDayRow );
    
    // sync active and selected
    if ( selectedDayIndex >=0 ) {
      $('#dayList [data-index="' + selectedDayIndex + '"]').addClass('selected');
    }
  }
  
  var AddDayView = function( day, index, onClickDayRow ) {
    var dayElement = '<tr data-index="' + index + '" class="day-row">' +
                     CreateDayViewContent( day );
                     '</tr>';
    var $dayElement = $(dayElement);
    
    // Make way!
    var $element;
    var daysCount = $('#dayList tr[data-index]').length;
    for ( var i=(daysCount-1); i>=index ; i-- ) {
      $element = $('#dayList tr[data-index="' + i + '"]');
      $element.attr('data-index', (i+1));
      
      $element = $('#dayList tr[data-index="total-' + i + '"]');
      $element.attr('data-index', "total-" + (i+1) );
    }
    
    var $nextNeighbor = $('#dayList tbody tr[data-index="' + (index+1) + '"]');
    if ( $nextNeighbor.length == 0 ) {
      $('#dayList tbody').append( $dayElement );
    } else {
      $nextNeighbor.before( $dayElement );
    }
    $dayElement.click( onClickDayRow );
    
    AnimateRowIn( $dayElement );
    
  }
  
  var CreateDayViewContent = function( day ) {
    return '<td>' + Timer.ShowDate(day.date) + '</td>' +
           '<td>' + Timer.ShowTime(day.total) + '</td>' +
           '<td>' + '' + '</td>';
  }
  
  var DeleteDayView = function( index, dayCount ) {
    // Preserve shared elements
    var $deleteDay = $('#deleteDay');
    $('#daysHolder').append($deleteDay);
    $deleteDay.hide();
    //
    
    
    var $element = $('#dayList tr[data-index="' + index + '"]')
                   .add('#dayList tr[data-index="total-' + index + '"]');
    AnimateRowOut( $element, true );
    
    
    for ( var i=(index+1); i<= dayCount; i++ ) {
      $element = $('#dayList tr[data-index="' + i + '"]');
      $element.attr('data-index', i-1);
      
      $element = $('#dayList tr[data-index="total-' + i + '"]');
      $element.attr('data-index', "total-" + (i-1) );
    }
  }
  
  
  
  
  
  var AddBlockView = function ( block, index, onClickBlock ) {
    // Adjust existing indices
    var blockCount = $('#blockList tr[data-index]').length;
    for ( var i=index; i<= blockCount; i++ ) {
      var $blockRow = $('#blockList tr[data-index="' + i + '"]');
      $blockRow.attr('data-index', i+1);
    }
    
    var blockElement = '<tr data-index="' + index + '">' + 
                       CreateBlockViewContent( block ) +
                       '</tr>';
    var $blockElement = $(blockElement);
    $blockElement.click( onClickBlock );
    
    var $previous = $('#blockList tr[data-index="' + (index-1) + '"]');
    if ( $previous.length==0 ) {
      $('#blockList').append($blockElement);
    } else {
      $previous.after( $blockElement );
    }
    
    AnimateRowIn( $blockElement );
  }
  
  var ClearBlocksView = function() {
    // Preserve shared elements
    var $editDeleteBlock = $('#editDeleteBlock');
    $('#blocksContent').append($editDeleteBlock);
    $editDeleteBlock.hide();
    
    var $editBlockForm = $('#editBlockForm');
    $('#blocksContent').append($editBlockForm);
    $editBlockForm.hide();
    
    //
    
    $('#blockList').empty();
  }
  
  var UpdateBlocksView = function( day, selectedBlockIndex, onClickBlock ) {
    ClearBlocksView ();
    
    $('#dayTags').show();
    var blockElements = '';
    for ( var i=0; i< day.blocks.length; i++ ) {
      blockElements += '<tr data-index="' + i + '">' + 
                       CreateBlockViewContent( day.blocks[i] ) +
                       '</tr>';
    }
    var $blockElements = $(blockElements);
    $('#blockList').append($blockElements);
    $blockElements.click( onClickBlock );
    
    // sync active and selected
    if ( selectedBlockIndex >=0 ) {
      $('#blockList tr[data-index="' + selectedBlockIndex + '"]').addClass('selected');
    }
    
  }
  
  // Update block view non-destructively
  var UpdateBlockView = function( block, index ) {
    var $element = $( '#blockList tr[data-index="'+index+'"]');
    if ($element == null) {return;}
    
    $element.find('td:nth-of-type(1)').html( Timer.ShowTime( block.start ) + '&ndash;' + Timer.ShowTime( block.stop ) );
    $element.find('td:nth-of-type(2)').html( Timer.ShowTime( block.duration ) );
  }
  var CreateBlockViewContent = function( block ) {
    return '<td>' + Timer.ShowTime( block.start ) + '&ndash;' + 
           Timer.ShowTime( block.stop ) + '</td>' +
           '<td>' + Timer.ShowTime( block.duration ) + '</td>' +
           '<td>' + '' + '</td>';
  }
  var CreateBlinkableTotal = function( time ) {
    var hour = Timer.ZeroPad( time.hour );
    var minute = Timer.ZeroPad( time.minute );
    return hour + '<span class="blinkable">:</span>' + minute;
  }
  var DeleteBlockView = function( index ) {
    var $element = $('#blockList tr[data-index="' + index + '"]');
    
    // Preserve shared elements
    var $editDeleteBlock = $element.find('#editDeleteBlock');
    if ( $editDeleteBlock.length != 0 ) {
      $('#blocksContent').append($editDeleteBlock);
      $editDeleteBlock.hide();
    }
    //
    
    AnimateRowOut( $element, true );
    
    // Update data indices for remaining items
    var blockCount = $('#blockList tr[data-index]').length;
    for ( var i=(index+1); i<= blockCount; i++ ) {
      $element = $('#blockList tr[data-index="' + i + '"]');
      $element.attr('data-index', i-1);
    }
    
    
  }
  
  var ToggleEditBlockForm = function( index, block ) {
    console.log("edit block");
    var $editBlockForm = $('#editBlockForm');
    if ( $editBlockForm.is(':visible') ) {
      AnimateRowOut( $editBlockForm );
    } else {
      //$editBlockForm.trigger('reset');
      AnimateRowIn( $editBlockForm );
      
      // position
      $('#blockList [data-index="' + index + '"]').after($editBlockForm);
      
      // prepopulate
      $('#editBlockStart').val( Timer.ShowTime(block.start));
      $('#editBlockStop').val( Timer.ShowTime(block.stop));
      //
      //console.log( $('#editBlockFrom'), ShowTime(selected.block.start) );
      
    }
  }
  var ResetEditBlockForm = function() {
    AnimateRowOut( $('#editBlockForm') );
  }
  
  var ToggleAddBlockForm = function( day ) {
    var $addBlockForm = $('#addBlockForm');
    if ( $addBlockForm.is(':visible') ) {
      $addBlockForm.slideUp();
    } else {
      $addBlockForm.trigger('reset');
      if ( day != null ) {
        $('#addBlockDate').val( Timer.ShowDate( day.date ) );
      }
      $addBlockForm.slideDown();
    }
  }
  var ResetAddBlockForm = function() {
    $('#addBlockForm').slideUp();
  }  
  
  
  
  
  
  
  var UpdateTimerControls = function ( running, activeTask ) {
    if (running) {
      $('#startStop').text('Stop');
      $('#activeTaskName').text( activeTask.name );
      $('#activeBlockTime').addClass('blink');
    } else {
      $('#startStop').text('Start');
      $('#activeTaskName').empty();
      $('#activeBlockTime').removeClass('blink');
    }
  }
  

  var UpdateRunningTimerView = function( activeBlock ) {
    
    var out = '00:00';
    if ( activeBlock!=null ) {
      out = CreateBlinkableTotal( activeBlock.duration );
    }
    
    $('#activeBlockTime').html( out );
  }
  
  
  var UpdateReport = function( total ) {
    if ( total == null ) {
      $('#reportTotal').text('--:--' );
    } else {
      $('#reportTotal').text( Timer.ShowTime( total ) );
    }
  }
    


  var ToggleEditTaskForm = function( selectedTaskName ) {
    var $editTaskForm = $('#editTaskForm');
    
    if ( $editTaskForm.is(':visible') ) {
      HideEditTaskForm();
    } else {
      $('#editTaskForm input[name=taskName]').val( selectedTaskName );
      $editTaskForm.slideDown();
    }
  }
  var HideEditTaskForm = function() {
    $('#editTaskForm').slideUp();
  }

  var ToggleAddTaskForm = function() {
    var $addTaskForm = $('#addTaskForm');
    if ( $addTaskForm.is(':visible') ) {
      $addTaskForm.slideUp();
    } else {
      $addTaskForm.trigger('reset');
      $addTaskForm.slideDown();
    }
  }
  
  









  var ToggleTagForm = function() {
    //console.log("toggletagform");
    if ( (selected.day == null ) ) { return; }
    
    if ( $('#tagsForm').is(':visible') ) {
      $('#tagsForm').hide();
    } else {
      $('#tagsInput').val( selected.day.tags );
      $('#tagsForm').show();
    }
  }




  
  /**
   * GET DOM ELEMENTS
   */
  
  var GetTaskElement = function(task) {
    var index = tasks.indexOf( task );
    var $element = $( TASK_LIST_SELECTOR + ' option[data-index="'+index+'"]');
    return $element;
  }
  /*
  var GetDayElement = function(day) {
    if ( selected.task == null ) { return null; }
    var index = selected.task.days.indexOf( day );
    if ( index<0 ) { return null; }
    var $element = $( '#dayList > tbody > tr[data-index="'+index+'"]');
    //console.log( $element );
    return $element;
  }*/
  /*
  var GetBlockElement = function(block) {
    if ( selected.day == null ) { return null; }
    var index = selected.day.blocks.indexOf( block );
    if ( index<0) { return null; }
    var $element = $( '#blockList tr[data-index="'+index+'"]');
    //console.log( $element );
    return $element;
  }*/

  var ToggleHelp = function() {
    $('#blurb').slideToggle();
/*    var $element = $('#blurb');
    if ( $element.is(':visible') ) {
      $element.hide();
    } else {
      $element.show();
    }*/
    
  }
  

  
  /**
   * http://stackoverflow.com/questions/467336/jquery-how-to-use-slidedown-or-show-function-on-a-table-row
   */
  var AnimateRowIn = function( $element ) {
    $element.show();
    
    $element.find('> td')
    .wrapInner('<div style="display: block;" />')
    .parent()
    .find('> td > div').hide()
    .slideDown(400, function(){
      var $wrapped = $(this);
      $wrapped.replaceWith( $wrapped.contents() );
    });
  }
  var AnimateRowOut = function( $element, remove ) {
    if ( typeof remove == 'undefined') { remove = false; }
    $element.find('> td')
    .wrapInner('<div style="display: block;" />')
    .parent()
    .find('> td > div')
    .slideUp(400, function(){
      if ( remove ) {
        $(this).parent().parent().remove();
      } else {
        var $wrapped = $(this);
        $wrapped.replaceWith( $wrapped.contents() );
        $element.hide();
      }
    });
  }
  
  
  

  
  // Interface
  return {
    UpdateRunningTimerView: UpdateRunningTimerView,
    UpdateTaskDetailView: UpdateTaskDetailView,
    DeleteTaskView: DeleteTaskView,
    ToggleAddTaskForm: ToggleAddTaskForm,
    ToggleEditTaskForm: ToggleEditTaskForm,
    AddTaskView: AddTaskView,
    HideEditTaskForm: HideEditTaskForm,
    PopulateTaskList: PopulateTaskList,
    
    UpdateTimerControls: UpdateTimerControls,
    
    UpdateReport: UpdateReport,
    
    UpdateDayView: UpdateDayView,
    AddDayView: AddDayView,
    UpdateFilter: UpdateFilter,
    PopulateDaysView: PopulateDaysView,
    DeleteDayView: DeleteDayView,
    
    UpdateBlockView: UpdateBlockView,
    AddBlockView: AddBlockView,
    UpdateBlocksView: UpdateBlocksView,
    ClearBlocksView: ClearBlocksView,
    ResetEditBlockForm: ResetEditBlockForm,
    ToggleAddBlockForm: ToggleAddBlockForm,
    ToggleEditBlockForm: ToggleEditBlockForm,
    DeleteBlockView: DeleteBlockView,
    ResetAddBlockForm: ResetAddBlockForm,
    
    ToggleHelp: ToggleHelp
  }
  
}

