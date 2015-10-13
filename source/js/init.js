
function InitTimer() {
  var model = new Timer.Model();
  var view = new Timer.View();
  var timer = new Timer.Controller( model, view );
  
  timer.LoadState();
  $('#taskList').trigger('change');
  
}
  
$(document).ready( InitTimer );
