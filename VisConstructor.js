

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

	this.tooltips={
		'radius': 'primitive radius',
		'radius/0': 'cube width',
		'radius/1': 'cube height',
		'radius/2': 'cube length',
		'center/0': 'movement in x direction',
		'center/1': 'movement in y direction',
		'center/2': 'movement in z direction',
		'axis/0' : 'axis of rotation x coordinate',
		'axis/1' : 'axis of rotation y coordinate',
		'axis/2' : 'axis of rotation z coordinate',
		'angle'  : 'angle of rotation about axis',
		'count'  : 'number of copys this object is multiplied to',
		'0' : 'click to enter this subobject\'s name',
		'1' :'select operation or primitive type of this subobject',
		'1/cube':'cube primitive',
		'1/cylinder':'cylinder primitive',
		'1/sphere':'sphere primitive',
		'1/union':'union operation',
		'1/intersect':'intersection operation',
		'1/subtract':'subtraction operation',
		'1/multiply':'multiplication operation',
		'1/transform':'tranform operation',
		'1/empty':'leave subobject empty',
	}

	this.getTooltip=function(path){
		var base =this.getBase(path);
		var base2=this.getBase(this.getParent(path));			
		return this.tooltips[base2+'/'+base] || this.tooltips[base];
	}

	this.getOperatorSelect=function(path,selected){
		var html='<select id="'+path+'" onchange="VisConstructor.changeNodeType(this);" title="'+this.getTooltip(path)+'">';
		for (var op in this.nodeTemplates)
			html+='<option value='+op+(op==selected?' selected=selected':'')+' title="'+this.getTooltip(path+'/'+op)+'">'+op+'</option>';
		html+='</select>';
		return html;
	}

	this.getEdit=function(path,value){
		return '<input id="'+path+'" onchange="VisConstructor.changeValue(this);" value="'+value+'" title="'+this.getTooltip(path)+'">';
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
				var select=nodes[i].id;
				if(this.selectedPath!=select){
					this.selectedPath=select;
					this.updateTreeView();
					this.updateSelected();
				}
				document.getElementById(this.selectedPath).scrollIntoView();
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

	this.export=function(){
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
			this.selectedMesh=viewer.buildMesh(this.csgWorker.getPolygons(this.sceneTree,this.selectedPath));
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

	this.hashchange=function(data)
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
			this.csgWorker.csgCache={};
		}
		this.updateTreeView();
		this.update();
	}

	
	this.update=function(){
		document.title=this.sceneTree[0]+' - Vis/Constructor';
		this.save();
		//this.worker.postMessage(['setMesh','getPolygons',this.sceneTree,'root']);
		viewer.mesh=viewer.buildMesh(this.csgWorker.getPolygons(this.sceneTree,'root'));
		this.updateSelected();
	}

	this.updateSelected=function(){
		if(this.selectedPath)
			this.updateManipulator();
		else
			viewer.ondraws=[];
		viewer.gl.ondraw();
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

	this.keypress=function(e){
		if(e.target.tagName=='INPUT') return;
		if(e.charCode=='x'.charCodeAt(0)) this.cut();
		if(e.charCode=='c'.charCodeAt(0)) this.copy();
		if(e.charCode=='v'.charCodeAt(0)) this.paste();
		if(e.charCode=='y'.charCodeAt(0)) this.deselect();
	};

	this.attach=function(){
		viewer = new Viewer(document.getElementById('view'));
		var visConstructor=this;
		window.addEventListener('keypress', function(e){visConstructor.keypress(e)} ,false);
		window.addEventListener("hashchange", function(e){visConstructor.hashchange(e)}, false);
		this.hashchange();
	}
}


