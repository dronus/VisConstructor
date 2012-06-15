

if(typeof window != "object"){
	importScripts('csg.js');
	importScripts('gl-matrix.js');
}

CsgWorker=new function(){
	this.getVertexStl=function(v){
		var s=10;
		return '   vertex '+(s*v.x).toFixed(5)+' '+(-s*v.z).toFixed(5)+' '+(s*v.y).toFixed(5)+'\n';
	}

	this.simpleManifold=function(polygons){

		var vertexIndex={};
		for(var i=0; i<polygons.length; i++){
			var p=polygons[i];
			for(var j=0; j<p.vertices.length; j++){
				var v=p.vertices[j];
				var key=v.pos.x+" "+v.pos.y+" "+v.pos.z;
				vertexIndex[key]=v;
			}
		}

		var pointsAdded=[];
		for(var i=0; i<polygons.length; i++){
			postMessage(['progress',i/polygons.length*0.9+0.1]);
			var p=polygons[i];
			for(var key in vertexIndex){
				var v=vertexIndex[key];
				var vp=v.pos;
				var t = p.plane.normal.dot(v.pos) - p.plane.w;
				if (t > -CSG.Plane.EPSILON && t < CSG.Plane.EPSILON){
					for(var j=0; j<p.vertices.length; j++){
						var p1=p.vertices[j].pos;
						var p2=p.vertices[(j+1)%p.vertices.length].pos;
						var dp =p2.minus(p1);
						var dp2=vp.minus(p1);
						var projD=dp.dot(dp2)/dp.length()/dp.length();
						var proj =dp2.minus(dp.times(projD));
						var d    =proj.length();

						if(projD > CSG.Plane.EPSILON && projD < 1-CSG.Plane.EPSILON && d > -CSG.Plane.EPSILON && d < CSG.Plane.EPSILON){
							p.vertices.splice(j+1, 0, v);
							pointsAdded.push(v.pos);
						}
					}
				}			
			}
		}
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
	
	this.csgCache={};

	this.getCsg=function(path){

		if(this.csgCache[path]) return this.csgCache[path];
		
		var node=this.getSubtree(path);
		if(!Array.isArray(node))
			return node;

		var args=[];
		for(var i=2; i<node.length; i++)
			args.push(this.getCsg(path+'/'+i));

		var csg=CSG[node[1]].apply(CSG, args);
		this.csgCache[path]=csg;
		
		return csg;
	}	

	this.invalidateTree=function(path){
		this.invalidate(path);
		// and delete all child nodes
		for(key in this.csgCache) 
			if(key.indexOf(path)==0)
				delete this.csgCache[key];
	}

	this.invalidate=function(path){
		// delete all upstream nodes
		var p=path;
		do{
			delete this.csgCache[p];
			p=this.getParent(p);
		}while(p);
	}

	this.mergeTransforms=function(path){
		
		var parent=this.getParent(path);
		if(parent)
			var m=this.mergeTransforms(parent);
		else{
			var m=mat4.create();
			mat4.identity(m);
		}

		var node=this.getSubtree(path);	
		if(node[1]=='transform'){
			var m2=CSG.getTransform(node[2]);
			mat4.multiply(m,m2,m);
		}

		return m;
	}

	this.getPolygons=function(data,path){
		this.sceneTree=data;
		var csg=this.getCsg(path);		
		if(csg.bakedPolygons) return csg.bakedPolygons; 
		var parent=this.getParent(path);
		if(parent){
			var transform=this.mergeTransforms(parent);				
			csg=csg.transform({'transform': transform});
			csg.setColor(0,.5,0);
		}
		var polys=csg.polygons;
		this.csgCache[path].bakedPolygons=polys;
		return polys;		
	}

	this.exportStl=function(data){
		var polys=this.getPolygons(data,'root');
		this.simpleManifold(polys);
		//viewer.mesh=csg.toMesh();
		var stl='solid exported\n';
		for(var i=0; i<polys.length; i++)
		{
			var poly=polys[i];
			var n=poly.plane.normal;
	
			// break n-polys down to triangle fan
			for(var j=0; j<poly.vertices.length-2; j++){
				stl+=' facet normal '+n.x.toFixed(5)+' '+n.z.toFixed(5)+' '+n.y.toFixed(5)+'\n';
				stl+='  outer loop\n';
				stl+=this.getVertexStl(poly.vertices[0].pos); //fan point vertex
				for(var k=j+1; k<j+3; k++)
				{
					var v=poly.vertices[k].pos;
					stl+=this.getVertexStl(v);
				}
				stl+='  endloop\n';
				stl+=' endfacet\n';
			}
		}	
		stl+='endsolid exported\n';
		
		return stl;
	}
}

if(typeof window != "object"){
	onmessage=function(event){
		var msg=event.data;
		var action=msg.shift();
		var method=msg.shift();
		postMessage(['progress',.1]); // set progress completed
		var result=CsgWorker[method].apply(CsgWorker,msg);
		var answer=[action,result];
		if(action) postMessage(answer);
		postMessage(['progress',1]); // set progress completed
	}
}

