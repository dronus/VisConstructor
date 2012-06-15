
importScripts('csg.js');
importScripts('gl-matrix.js');
importScripts('VisConstructor.js');


StlExporter=new function(){
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
			postMessage({'progress':i/polygons.length*0.9+0.1});
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

	this.exportStl=function(polys){
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

onmessage=function(event){
	postMessage({'progressName':'exporting stl...'});
	VisConstructor.sceneTree=JSON.parse(event.data);
	var csg=VisConstructor.getCsg('root');
	var stl=StlExporter.exportStl(csg.polygons);
	postMessage({'progress':1, 'stl':stl});
}


