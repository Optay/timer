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

