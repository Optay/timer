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
