
// touch device mouse event emulator

function touchHandler(event) {
    var touches = event.changedTouches;
    var first = touches[0];
    var type = '';
 
    if(event.touches && event.touches.length == 2) {
	if(event.type != "touchstart") return;
	type="dblclick";
    } else {
	switch(event.type) {
	    case "touchstart":
	      type = "mousedown";
	      break;
	    case "touchmove":
	      type="mousemove";
	      break;
	    case "touchend":
	      type="mouseup";
	      break;
	    default:
	      return;
	}
    }
 
    if(!first.target) return;
 
    var tryNode = first.target;
 
    event.preventDefault();
 
    var simulatedEvent = document.createEvent("MouseEvent");
    simulatedEvent.initMouseEvent(type, true, true, window, 1, first.screenX, first.screenY, first.clientX, first.clientY, false, false, false, false, 0, null);
 
    tryNode.dispatchEvent(simulatedEvent);
}
document.addEventListener("touchstart", touchHandler, true);
document.addEventListener("touchmove", touchHandler, true);
document.addEventListener("touchend", touchHandler, true);
document.addEventListener("touchcancel", touchHandler, true);

