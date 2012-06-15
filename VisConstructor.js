function getCookieValue(cookieName)
{
 var value=null;
 if(document.cookie != "") 
 {
  cookieName=cookieName+"=";
  
  var start=document.cookie.indexOf(cookieName);
  if(start>=0) 
  {
   start=start+cookieName.length;
   
   var end=document.cookie.indexOf(";", start);
   if(end<0) end=document.cookie.length;
   
   value=document.cookie.substring(start,end);
   value=unescape(value);
  }
 }
 return value;
}

function setCookie(cookieName,cookieValue)
{
 var cookie=cookieName+"="+escape(cookieValue)+";";
 document.cookie=cookie;
}
/*
if(HTMLElement){
	HTMLElement.prototype.removeClass=function(className){
		var tmp=" "+this.className+" ";
		tmp=tmp.replace(" "+className+" "," ");
		tmp=tmp.trim();
		this.className=tmp;
	}
}*/


// Convert from CSG solid to GL.Mesh object
buildMesh = function(polygons) {

	var mesh = new GL.Mesh({ normals: true, colors: true });
	var indexer = new GL.Indexer();
	polygons.map(function(polygon) {
		var indices = polygon.vertices.map(function(vertex) {
			vertex.color = polygon.shared || [1, 1, 1];
			return indexer.add(vertex);
		});
		for (var i = 2; i < indices.length; i++) {
			mesh.triangles.push([indices[0], indices[i - 1], indices[i]]);
		}
	});
	mesh.vertices = indexer.unique.map(function(v) { return [v.pos.x, v.pos.y, v.pos.z]; });
	mesh.normals = indexer.unique.map(function(v) { return [v.normal.x, v.normal.y, v.normal.z]; });
	mesh.colors = indexer.unique.map(function(v) { return v.color; });
	//  mesh.computeWireframe();
	mesh.compile();
	//console.log("Mesh triangles: "+mesh.triangles.length);
	return mesh;
};

clone=function(object){
	return JSON.parse(JSON.stringify(object));
}

Viewer=function(csg, width, height) {

	this.rotSpeed=.3;
	this.moveSpeed=.001;
	this.zoomSpeed=.002;
	
	this.angleX = 20;
	this.angleY = 20;
	this.posX=0;
	this.posY=0;
	this.posZ=5;

	// Get a new WebGL canvas
	var gl = GL.create();
	this.gl = gl;
	this.mesh = buildMesh(csg.polygons);

	// Set up the viewport
	gl.canvas.width = width;
	gl.canvas.height = height;
	gl.viewport(0, 0, width, height);
	gl.matrixMode(gl.PROJECTION);
	gl.loadIdentity();
	gl.perspective(45, width / height, 0.1, 100);
	gl.matrixMode(gl.MODELVIEW);

	// Set up WebGL state
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
	gl.clearColor(0, 0, 0, .1);
	gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.CULL_FACE);
	gl.enable(gl.BLEND);
	gl.polygonOffset(1, 1);

	// Black shader for wireframe
	this.blackShader = new GL.Shader('\
		void main() {\
			gl_Position = gl_ModelViewProjectionMatrix * gl_Vertex;\
		}\
		', '\
		void main() {\
			gl_FragColor = vec4(0.0, 0.0, 0.0, 0.1);\
		}\
	');

	// Shader with diffuse and specular lighting
	this.lightingShader = new GL.Shader('\
		varying vec3 color;\
		varying vec3 normal;\
		varying vec3 light;\
		void main() {\
			const vec3 lightDir = vec3(1.0, 2.0, 3.0) / 3.741657386773941;\
			light = (gl_ModelViewMatrix * vec4(lightDir, 0.0)).xyz;\
			color = gl_Color.rgb;\
			normal = gl_NormalMatrix * gl_Normal;\
			gl_Position = gl_ModelViewProjectionMatrix * gl_Vertex;\
		}\
		', '\
		varying vec3 color;\
		varying vec3 normal;\
		varying vec3 light;\
		uniform float alpha;\
		void main() {\
			vec3 n = normalize(normal);\
			float diffuse = max(0.0, dot(light, n));\
			float specular = pow(max(0.0, -reflect(light, n).z), 32.0) * sqrt(diffuse);\
			gl_FragColor = vec4(mix(color * (0.3 + 0.7 * diffuse), vec3(1.0), specular), alpha);\
		}\
	');

	// Black shader for wireframe
	this.blackShader = new GL.Shader('\
		void main() {\
			gl_Position = gl_ModelViewProjectionMatrix * gl_Vertex;\
		}\
		', '\
		void main() {\
			gl_FragColor = vec4(0.0, 0.0, 0.0, 0.1);\
		}\
	');

	var that = this;

	gl.onmousemove = function(e) {
		if (e.dragging) {
			var b=e.original.button;
			if(b==0 && !e.shiftKey && !e.altKey && !e.ctrlKey){
				that.angleY += e.deltaX * that.rotSpeed;
				that.angleX += e.deltaY * that.rotSpeed;
				that.angleX = Math.max(-90, Math.min(90, that.angleX));
			}else if(b==1 || (b==0 && e.shiftKey &&!e.altKey && !e.ctrlKey )){
				that.posX+=e.deltaX * that.posZ  * that.moveSpeed;
				that.posY-=e.deltaY * that.posZ * that.moveSpeed;
			}else if(b==0 && !e.shiftKey &&!e.altKey && e.ctrlKey ){
				var delta=1-e.deltaY*that.zoomSpeed;
				that.posZ*=delta;      
			}
			viewer.gl.ondraw();
		}
	};

	gl.canvas.addEventListener('mousewheel',function(event){
		var delta=1-event.wheelDelta*that.zoomSpeed;
		that.posZ*=delta;
		that.gl.ondraw();
	});

	this.ondraws=[];

	gl.ondraw = function() {
		gl.makeCurrent();

		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		gl.loadIdentity();
		gl.translate(that.posX, that.posY, -that.posZ);
		gl.rotate(that.angleX, 1, 0, 0);
		gl.rotate(that.angleY, 0, 1, 0);

		gl.enable(gl.POLYGON_OFFSET_FILL);
		that.lightingShader.uniforms({alpha: 1.0}).draw(that.mesh, gl.TRIANGLES);
		gl.disable(gl.POLYGON_OFFSET_FILL);
		//gl.disable(gl.DEPTH_TEST);
		//    that.blackShader.draw(that.mesh, gl.LINES);
		for(var i=0; i<that.ondraws.length; i++)
			that.ondraws[i](that, gl);
		//gl.enable(gl.DEPTH_TEST);
	};

	gl.ondraw();
}


Constructor=function(){
	
}

VisConstructor=new function(){



	this.selectedPath=null;
	this.justSaved=false;
	this.csgWorker=CsgWorker;

	this.nodeTemplates={
		'empty':['','empty'],
		'transform':['','transform',{center:[0,0,0], angle:0, axis:[0,1,0]},['','empty']],
		'union':      ['','union',['','empty'],['','empty']],
		'subtract': ['','subtract',['','empty'],['','empty']],
		'intersect':  ['','intersect',['','empty'],['','empty']],
		'multiply': ['','multiply',{count: 2, center:[0,0,0], angle:0, axis:[0,1,0]},['','empty']],
		'sphere'  :['','sphere'  ,{radius: 1.3}],
		'cube'    :['','cube'    ,{radius: [1,1,1]}],
		'cylinder':['','cylinder',{l:1 , radius: 1, conical: 0}]
	}
	
	this.sceneTree=['Unnamed','subtract', this.nodeTemplates['cube'], this.nodeTemplates['sphere']];

	this.findSlot=function(node, subnode){
		for(var i=2; i<node.length; i++)
			if(node[i]==subnode || subnode==null && Array.isArray(node[i]) && node[i][1]=='empty') return i;
		return -1;
	}

	this.wrap=function(opType){
		if(!this.selectedPath) return;

		this.invalidateTree(this.selectedPath);

		var node=clone(this.nodeTemplates[opType]);
		var toWrap=this.getSelectedTree();
		node[this.findSlot(node,null)]=toWrap;
		
		var parent=this.getSubtree(this.getParent(this.selectedPath));
		if(parent){
			var slot=this.findSlot(parent,toWrap);
			parent[slot]=node;
		}else
			this.sceneTree=node;

		if(node[3]) this.selectedPath+="/3";
		this.updateTreeView();
		this.update();
	}

	this.add=function(primitiveType){
		if(!this.selectedPath) return;

		var parent=this.getSubtree(this.getParent(this.selectedPath));

		var node=clone(this.nodeTemplates[primitiveType]);

		this.invalidateTree(this.selectedPath);

		var toWrap=this.getSelectedTree();
		if(toWrap[1]!='empty'){
			var union=clone(this.nodeTemplates['union']);
			union[2]=toWrap;
			union[3]=node;
			node=union;
			this.selectedPath+="/3";
		}

		if(parent){
			var slot=this.findSlot(parent,toWrap);
			parent[slot]=node;
		}else
			this.sceneTree=node;

		this.updateTreeView();
		this.update();
	}

	this.getOperatorSelect=function(path,selected){
		var html='<select id="'+path+'" onchange="VisConstructor.changeNodeType(this);">';
		for (var op in this.nodeTemplates)
			html+='<option value='+op+(op==selected?' selected=selected':'')+'>'+op+'</option>';
		html+='</select>';
		return html;
	}

	this.getEdit=function(path,value){
		return '<input id="'+path+'" onchange="VisConstructor.changeValue(this);" value="'+value+'">';
	}

	// check wether the given path denotes a node.
	// this is true if all nodes from the given one up to root are arrays.
	this.isNode=function(path){
		do{
			if(!Array.isArray(this.getSubtree(path))) return false;
			path=this.getParent(path);
		}while(path);
		
		return true;
	}

	this.set=function(path, value){
		var parent=this.getParent(path);
		var key   =this.getBase  (path);
		if(parent) this.getSubtree(parent)[key]=value;
		else       this.sceneTree              =value;

		this.invalidate(path);
		if(this.isNode(path)) {
			this.updateTreeView();
			this.invalidateTree(path);
		}
		this.update();
	}

	this.changeNodeType=function(selectElement){
		var path=this.getParent(selectElement.id); // path to this selector's node.
		var value=selectElement.value;
	 	var node=clone(this.nodeTemplates[value]);

		this.set(path, node);		
	}

	this.changeValue=function(editElement){
		var path=editElement.id;
		var value=editElement.value;
		this.set(path, value);
	}

	this.updateTreeView=function(){
		var view=document.getElementById('treeview');
		while(view.firstChild) 
			view.removeChild(view.firstChild);
		this.updateNodeView(view, this.sceneTree,'root');
	}

	this.updateNodeView=function(parentview, value, path){

		if(!Array.isArray(value)){
			this.updateObjectView(parentview, '', value, path);
			return;
		}

		var nodeview=document.createElement('div');
		parentview.appendChild(nodeview);
		nodeview.className='node'+(path==this.selectedPath ? ' selected' : '' );
		nodeview.id=path;
		nodeview.addEventListener('click',this.selectHandler,false);
		for(var i=0; i<value.length; i++)
			this.updateNodeView(nodeview, value[i], path+'/'+i); 
	}

	this.selectHandler=function(e){
		if(this.id && this.id!=VisConstructor.selectedPath){

			if(VisConstructor.selectedPath) {
				var oldSelectedElement=document.getElementById(VisConstructor.selectedPath);
				if(oldSelectedElement) oldSelectedElement.removeClass('selected');
			}		
	
			VisConstructor.selectedPath=this.id;
			this.className+=' selected';
			VisConstructor.updateSelected();
		}
		e.stopPropagation();
	}

	this.deselect=function(){
		var oldSelectedElement=document.getElementById(this.selectedPath);
		if(oldSelectedElement) oldSelectedElement.removeClass('selected');
		this.selectedPath='';
		this.update();
	}

	this.search=function(name){
		var nodes=document.querySelectorAll('.node');
		for (var i=0; i<nodes.length; i++){
			var nameField=nodes[i].querySelector('input');
			if(nameField.value.indexOf(name)>-1){
				this.selectedPath=nodes[i].id;
				this.updateTreeView();
				this.updateSelected();
				break;
			}		
		}
	}

	this.copy=function(){
		setCookie('clipboard', JSON.stringify(this.getSelectedTree()));
	}
	this.cut=function(){
		this.copy();
		var selected=this.getSelectedTree();
		selected.length=0;
		selected.push('','empty');
		this.updateTreeView();	
		this.invalidateTree(this.selectedPath);
		this.update();	
	}
	this.paste=function(){
		var selected=this.getSelectedTree();
		selected.length=0;
		var pasted=getCookieValue('clipboard');
		if(pasted){
			pasted=JSON.parse(pasted);
			selected.push.apply(selected, pasted);
			this.updateTreeView();
			this.invalidateTree(this.selectedPath);
			this.update();
		}
	}

	this.invalidate=function(path){
		this.csgWorker.invalidate(path);
		// and delete all child nodes
		var p=path;
		do{
			delete this.meshCache[p];
			p=this.getParent(p);
		}while(p);		
	}

	this.invalidateTree=function(path){
		this.csgWorker.invalidateTree(path);
		this.invalidate(path);
		for(key in this.meshCache) 
			if(key.indexOf(path)==0)
				delete this.meshCache[key];
	}


	this.getSelectedTree=function(){
		if(!this.selectedPath) return null;
		return this.getSubtree(this.selectedPath);
	}

	this.getParent=function(path){
		var index=path.lastIndexOf('/');
		if(index<0) return '';
		return path.substring(0,index);
	}
	this.getBase=function(path){
		var start=path.lastIndexOf('/');
		if(start<0) return '';
		return path.substring(start+1);
	}

	this.getSubtree=function(path){
		if(!path) return null;
		if(path=='root') return this.sceneTree;
		var parent=this.getParent(path);
		if(!parent) return this.sceneTree;
		var sub=this.getSubtree(parent);
		var base=this.getBase(path);
		return sub[base];
	}

	this.progress=function(p){
		var indic=document.getElementById('progress');
		var bar  =document.getElementById('progressBar');

		if (p==0 || p==1) indic.style.display='none';
		else              indic.style.display='block';
		if(p==1) p=0;
		if(p<0.1) p=0.1;
		bar.style.width=(p*100)+'%';
	}


	this.meshCache={};
/*
	this.setMesh=function(args){
		viewer.mesh=buildMesh(args[0]);
		this.meshCache[args[1]]=viewer.mesh;
		viewer.gl.ondraw();
	}

	this.setSelectedMesh=function(args){
		this.selectedMesh=buildMesh(args[0]);
		this.meshCache[args[1]]=this.selectedMesh;
		viewer.gl.ondraw();
	}
*/	
	this.onmessage=function(event){
		var msg=event.data;
		var method=msg.shift();
		this[method].apply(this,msg);
	}

	this.worker=new Worker('CsgWorker.js');
	this.worker.onmessage=function(event){VisConstructor.onmessage(event);};

	this.cancel=function(){
		this.worker.terminate();
		this.progress(1);
	}

	this.saveStl=function(stl){
		var bb = new BlobBuilder;
		bb.append(stl);
		var blob=bb.getBlob("text/plain;charset=utf-8");
		var name=VisConstructor.sceneTree[0]||'unnamed';
		saveAs(blob,name+'.stl');
	}

	this.exportStl=function(){
		document.getElementById('progressName').innerHTML='exporting stl...';
		this.progress(.1);
		this.worker.postMessage(['saveStl','exportStl',this.sceneTree]);
	}

/*
	this.manipulators={
		'sphere': function(node, csg){
			var r=node[2]['radius'];
			var ring=CSG.cylinder({l:r/20, radius: r});
			return ring.subtract(csg);
			
		}
	};

	this.getManipulator(node){
		
	}*/

	this.updateManipulator=function(){
		/*
		var manipulatorMesh = new GL.Mesh({lines:true});
		manipulatorMesh.vertices=[
			[-10,0,0],
			[ 10,0,0],
			[0,-10,0],
			[0, 10,0],
			[0,0,-10],
			[0,0, 10]
		];
		manipulatorMesh.lines=[[0,1],[2,3],[4,5]];
		manipulatorMesh.compile();*/
		//var pos=[0,0,0];
		//if(selectedTree[1]['center']) pos=selectedTree[1]['center'];
		if(this.meshCache[this.selectedPath]) {
			this.selectedMesh=this.meshCache[this.selectedPath];
		}else
			this.selectedMesh=buildMesh(this.csgWorker.getPolygons(this.sceneTree,this.selectedPath));
		viewer.gl.ondraw();
		//	this.worker.postMessage(['setSelectedMesh','getPolygons',this.sceneTree,this.selectedPath]);
		//this.selectedMesh=this.getMesh(this.selectedPath);
		//var csg=getManipulator(selectedTree);
		//var manipulatorMesh=csg.toMesh();
		var manipulatorDraw=function(viewer, gl){
			if(VisConstructor.selectedMesh) viewer.lightingShader.uniforms({alpha: [.5]}).draw(VisConstructor.selectedMesh, gl.TRIANGLES);
			//gl.pushMatrix();
			//gl.translate(pos[0],pos[1],pos[2]);
			//viewer.blackShader.draw(manipulatorMesh, gl.LINES);
			//gl.popMatrix();
		}
		viewer.ondraws=[manipulatorDraw];
	}

	this.save=function()
	{
		var json=JSON.stringify(this.sceneTree);
		if(json!=document.location.hash.substring(1)){
			this.justSaved=true;
			document.location.hash=json;
		}
		return json;
	}

	
	this.convertLegacy=function(node){
		if(!Array.isArray(node)) return;
		if(this.nodeTemplates[node[0]]) 
			node.unshift('');
		if (Array.isArray(node[2]) && node[3] && !Array.isArray(node[3])){
			var tmp=node[3];
			node[3]=node[2];
			node[2]=tmp;
		} 
		for(var i=2; i<node.length; i++)
			this.convertLegacy(node[i]);
	}

	this.load=function(data)
	{
		if(this.justSaved) {
			this.justSaved=false;
			return;
		}
		if(document.location.hash)
			data=document.location.hash.substring(1);
		if(data){
			this.sceneTree=JSON.parse(data);
			this.convertLegacy(this.sceneTree);
			this.csgCache={};
		}
		this.updateTreeView();
		this.update();
	}

	

	this.update=function(){
		this.save();
		//this.worker.postMessage(['setMesh','getPolygons',this.sceneTree,'root']);
		viewer.mesh=buildMesh(this.csgWorker.getPolygons(this.sceneTree,'root'));
		this.updateSelected();
	}

	this.updateSelected=function(){
		this.save();

		if(this.selectedPath)
			this.updateManipulator();
		else
			viewer.ondraws=[];
	}

	this.updateObjectView=function(parentview, key, value, path){
		var nodeview=document.createElement('div');
		parentview.appendChild(nodeview);
		nodeview.innerHTML=key;
		if(Array.isArray(value)){
			nodeview.className='array';
			for(var i=0; i<value.length; i++)
				this.updateObjectView(nodeview, '', value[i], path+'/'+i);	
		}else if(typeof value=='object'){
			nodeview.className='object';
			for(var key2 in value)
				this.updateObjectView(nodeview, key2, value[key2], path+'/'+key2);	
		}else{
			if(parentview.className.indexOf('node')>-1 && this.getBase(path)=='1'){
				nodeview.innerHTML=this.getOperatorSelect(path,value);
			}else{
				nodeview.className='value';
				nodeview.innerHTML=key+" "+this.getEdit(path, value);
			}
		}
	}

	this.keylistener=function(e){
		if(e.target.tagName=='INPUT') return;
		if(e.charCode=='x'.charCodeAt(0)) VisConstructor.cut();
		if(e.charCode=='c'.charCodeAt(0)) VisConstructor.copy();
		if(e.charCode=='v'.charCodeAt(0)) VisConstructor.paste();
		if(e.charCode=='s'.charCodeAt(0)) VisConstructor.exportStl();
		if(e.charCode=='y'.charCodeAt(0)) VisConstructor.deselect();
	};

	this.resizeHandler=function(){
		var canvas=viewer.gl.canvas;
		var w=canvas.parentNode.offsetWidth;
		var h=canvas.parentNode.offsetHeight;
		var gl=viewer.gl;
		gl.canvas.width=w; canvas.height=h;
		gl.viewport(0, 0,w,h);
		gl.matrixMode(gl.PROJECTION);
		gl.loadIdentity();
		gl.perspective(45, w / h, 0.1, 100);
		gl.matrixMode(gl.MODELVIEW);
		viewer.gl.ondraw();
	};


	this.attach=function(){
		viewer = new Viewer(new CSG(), 400, 400);
		document.getElementById('view').appendChild(viewer.gl.canvas);
		window.addEventListener('keypress', this.keylistener ,false);
		window.addEventListener("resize",this.resizeHandler,false);    
		window.addEventListener("hashchange", function(){VisConstructor.load()}, false);
		this.load();
		this.resizeHandler();
	}
}


