/*
 *	 	Design Programming at CASE, RPI, 2021
 *	 	Course instructor Prof. Dennis Shelden
 * 		Code developed by Nirvik Saha
 * 		Please do not modify unless you know what/how to...
 */

 var meshArr;
 var _wallMaterial;
 function Extrude_Shape(X, Y, aMaterial) {
   meshArr = [];
   var a = [...X];
   a.push(a[0]);
   var b = Aa(a, Y);
   CSV(a, b);
   CSH1(a);
   CSH1(b);
 }
 function Construct_Wall(X, Y, aMaterial) {
   _wallMaterial = aMaterial;
   meshArr = [];
   var A = [...X];
   var W = [];
   try {
	 W = [Y.height, Y.thickness, Y.closed]; //
   } catch (e) {
	 W = [100, 10];
   }
   if (Y.closed === undefined) {
	 Y.closed = true;
   }
   try {
	 if (Y.closed) A.push(A[0]);
   } catch (err) {
	 A.push(A[0]);
   }
   var B = Aa(A, W[0]);
   if (A.length === 2) {
	 CSV(A, B); //
	 CSV(O(A, W[1], Y.closed), O(B, W[1], Y.closed), Y.closed);
	 CSH2(A, O(A, W[1], Y.closed));
	 CSH2(B, O(B, W[1], Y.closed), Y.closed);
	 CSN(A, O(A, W[1], Y.closed), B, O(B, W[1], Y.closed));
 
	 /// DRS change to add meshes to scene
	 meshArr.forEach((node) => {
	   node.rotation.x = -Math.PI / 2;
	   scene.add(node);
	 });
 
	 return true;
   }
   if (Y.type && Y.type.curve === true) {
	 if (Y.type.curvature > 0.49) {
	   Y.type.curvature = 0.35;
	 } else if (Y.type.curvature < 0.01) {
	   Y.type.curvature = 0.35;
	 }
	 if (Y.type.smoothness > 49) {
	   Y.type.smoothness = 20;
	 } else if (Y.type.smoothness < 5) {
	   Y.type.smoothness = 20;
	 }
	 let a = C(A, Y.type.curvature, Y.type.smoothness, Y.closed);
	 let b = C(B, Y.type.curvature, Y.type.smoothness, Y.closed);
	 CSV(a, b, Y.closed);
	 CSV(O(a, W[1], Y.closed), O(b, W[1], Y.closed));
	 CSH2(a, O(a, W[1], Y.closed));
	 CSH2(b, O(b, W[1], Y.closed));
	 if (!Y.closed) CSN(a, O(a, W[1], Y.closed), b, O(b, W[1], Y.closed));
   } else {
	 CSV(A, B, Y.closed);
	 CSV(O(A, W[1], Y.closed), O(B, W[1], Y.closed), Y.closed);
	 CSH2(A, O(A, W[1], Y.closed));
	 CSH2(B, O(B, W[1], Y.closed), Y.closed);
	 if (!Y.closed) CSN(A, O(A, W[1], Y.closed), B, O(B, W[1], Y.closed));
   }
 
   /// DRS change to add meshes to scene
   meshArr.forEach((node) => {
	 node.rotation.x = -Math.PI / 2;
	 scene.add(node);
   });
   return true;
 }
 var Aa = (A, e) => {
   let X = [];
   A.forEach((p) => {
	 let q = { x: p.x, y: p.y, z: p.z + e };
	 X.push(q);
   });
   return X;
 };
 var CSN = (A, B, C, D) => {
   let i = 0,
	 j = A.length - 1;
   meshArr = [
	 ...meshArr,
	 new THREE.Mesh(
	   new THREE.BufferGeometry().setFromPoints([
		 new THREE.Vector3(A[i].x, A[i].y, A[i].z),
		 new THREE.Vector3(B[i].x, B[i].y, B[i].z),
		 new THREE.Vector3(C[i].x, C[i].y, C[i].z),
		 new THREE.Vector3(D[i].x, D[i].y, D[i].z),
	   ]),
	   _wallMaterial
	 ),
   ];
   meshArr = [
	 ...meshArr,
	 new THREE.Mesh(
	   new THREE.BufferGeometry().setFromPoints([
		 new THREE.Vector3(A[j].x, A[j].y, A[j].z),
		 new THREE.Vector3(B[j].x, B[j].y, B[j].z),
		 new THREE.Vector3(C[j].x, C[j].y, C[j].z),
		 new THREE.Vector3(D[j].x, D[j].y, D[j].z),
	   ]),
	   _wallMaterial
	 ),
   ];
 };
 var CSV = (A, B, closed = true) => {
   var i = 0;
   while (i < A.length - 1) {
	 meshArr = [
	   ...meshArr,
	   new THREE.Mesh(
		 new THREE.BufferGeometry().setFromPoints([
		   new THREE.Vector3(A[i].x, A[i].y, A[i].z),
		   new THREE.Vector3(A[i + 1].x, A[i + 1].y, A[i + 1].z),
		   new THREE.Vector3(B[i].x, B[i].y, B[i].z),
		 ]),
		 _wallMaterial
	   ),
	 ];
	 meshArr = [
	   ...meshArr,
	   new THREE.Mesh(
		 new THREE.BufferGeometry().setFromPoints([
		   new THREE.Vector3(B[i + 1].x, B[i + 1].y, B[i + 1].z),
		   new THREE.Vector3(B[i].x, B[i].y, B[i].z),
		   new THREE.Vector3(A[i + 1].x, A[i + 1].y, A[i + 1].z),
		 ]),
		 _wallMaterial
	   ),
	 ];
	 i++;
   }
 };
 var CSH1 = (A) => {
   for (let i = 1; i < A.length - 1; i++) {
	 meshArr = [
	   ...meshArr,
	   new THREE.Mesh(
		 new THREE.BufferGeometry().setFromPoints([
		   new THREE.Vector3(A[0].x, A[0].y, A[0].z),
		   new THREE.Vector3(A[i].x, A[i].y, A[i].z),
		   new THREE.Vector3(A[i + 1].x, A[i + 1].y, A[i + 1].z),
		 ]),
		 _wallMaterial
	   ),
	 ];
   }
 };
 var CSH2 = (A, B, closed) => {
   for (let i = 0; i < A.length - 1; i++) {
	 meshArr = [
	   ...meshArr,
	   new THREE.Mesh(
		 new THREE.BufferGeometry().setFromPoints([
		   new THREE.Vector3(A[i].x, A[i].y, A[i].z),
		   new THREE.Vector3(B[i].x, B[i].y, B[i].z),
		   new THREE.Vector3(A[i + 1].x, A[i + 1].y, A[i + 1].z),
		 ]),
		 _wallMaterial
	   ),
	 ];
	 meshArr = [
	   ...meshArr,
	   new THREE.Mesh(
		 new THREE.BufferGeometry().setFromPoints([
		   new THREE.Vector3(B[i].x, B[i].y, B[i].z),
		   new THREE.Vector3(B[i + 1].x, B[i + 1].y, B[i + 1].z),
		   new THREE.Vector3(A[i + 1].x, A[i + 1].y, A[i + 1].z),
		 ]),
		 _wallMaterial
	   ),
	 ];
   }
 };
 var DS = (A) => {
   for (let i = 0; i < A.length - 1; i++) {
	 meshArr = [
	   ...meshArr,
	   new THREE.Mesh(
		 new THREE.BufferGeometry().setFromPoints([
		   new THREE.Vector3(A[i].x, A[i].y, A[i].z),
		   new THREE.Vector3(A[i + 1].x, A[i + 1].y, A[i + 1].z),
		 ]),
		 new THREE.LineBasicMaterial({ color: 0x000fff })
	   ),
	 ];
   }
 };
 var C = (A, c, s, closed = true) => {
   let X = [];
   if (closed) {
	 for (let i = 0; i < A.length - 1; i++) {
	   var p, q, r;
	   if (i === 0) {
		 p = A[A.length - 2];
		 q = A[0];
		 r = A[1];
	   } else {
		 p = A[i - 1];
		 q = A[i];
		 r = A[i + 1];
	   }
	   let m = {
		 x: p.x + V(p, q).x * c,
		 y: p.y + V(p, q).y * c,
		 z: p.z + V(p, q).z * c,
	   };
	   let a = {
		 x: q.x + V(q, p).x * c,
		 y: q.y + V(q, p).y * c,
		 z: q.z + V(q, p).z * c,
	   };
	   let b = {
		 x: q.x + V(q, r).x * c,
		 y: q.y + V(q, r).y * c,
		 z: q.z + V(q, r).z * c,
	   };
	   let f = L(a, q, s);
	   let g = L(q, b, s);
	   let h = G(f, g, s);
	   h.forEach((x) => {
		 X.push(x);
	   });
	 }
	 X.push(X[0]);
	 DS(X);
	 return X;
   } else {
	 X.push(A[0]);
	 for (let i = 1; i < A.length - 1; i++) {
	   var p, q, r;
	   p = A[i - 1];
	   q = A[i];
	   r = A[i + 1];
	   let m = {
		 x: p.x + V(p, q).x * c,
		 y: p.y + V(p, q).y * c,
		 z: p.z + V(p, q).z * c,
	   };
	   let a = {
		 x: q.x + V(q, p).x * c,
		 y: q.y + V(q, p).y * c,
		 z: q.z + V(q, p).z * c,
	   };
	   let b = {
		 x: q.x + V(q, r).x * c,
		 y: q.y + V(q, r).y * c,
		 z: q.z + V(q, r).z * c,
	   };
	   let f = L(a, q, s);
	   let g = L(q, b, s);
	   let h = G(f, g, s);
	   h.forEach((x) => {
		 X.push(x);
	   });
	 }
	 X.push(A[A.length - 1]);
	 DS(X);
	 return X;
   }
 };
 var D = (p, q) => {
   return Math.sqrt(
	 Math.pow(V(p, q).x, 2) + Math.pow(V(p, q).y, 2) + Math.pow(V(p, q).z, 2)
   );
 };
 var D1 = (u, v) => {
   return u.x * v.x + u.y * v.y + u.z * v.z;
 };
 var D2 = (u, v) => {
   return u.x * v.y - u.y * v.x;
 };
 var G = (A, B, s) => {
   var e = [];
   let i = 0;
   while (i < A.length) {
	 let r = L(A[i], B[i], s);
	 e.push(r[i]);
	 i++;
   }
   return e;
 };
 var I = (A, closed = true) => {
   var X = [];
   if (!closed) X.push(A[0].p);
   let i = 0;
   while (i < A.length) {
	 var a, b, c, d;
	 if (closed) {
	   if (i === 0) {
		 a = A[A.length - 1].p;
		 b = A[A.length - 1].q;
		 c = A[0].p;
		 d = A[0].q;
	   } else {
		 a = A[i - 1].p;
		 b = A[i - 1].q;
		 c = A[i].p;
		 d = A[i].q;
	   }
	 } else {
	   if (i === 0) {
		 a = A[0].p;
		 b = A[0].q;
		 c = A[1].p;
		 d = A[1].q;
	   } else if (i > 1) {
		 a = A[i - 1].p;
		 b = A[i - 1].q;
		 c = A[i].p;
		 d = A[i].q;
	   } else {
		 i++;
		 continue;
	   }
	 }
	 var t1 = D2(V(a, c), V(c, d)) / D2(V(a, b), V(c, d));
	 var p = { x: a.x + t1 * V(a, b).x, y: a.y + t1 * V(a, b).y, z: a.z };
	 X.push(p);
	 i++;
   }
   if (closed) X.push(X[0]);
   else X.push(A[A.length - 1].q);
   return X;
 };
 var L = (p, q, n) => {
   var X = [];
   let i = 0.0;
   while (i < 1.0 + 1.0 / n) {
	 let r = {
	   x: p.x + V(p, q).x * i,
	   y: p.y + V(p, q).y * i,
	   z: p.z + V(p, q).z * i,
	 };
	 X.push(r);
	 i += 1.0 / n;
   }
   return X;
 };
 var M = (p, q) => {
   return { x: (p.x + q.x) * 0.5, x: (p.y + q.y) * 0.5, z: (p.z + q.z) * 0.5 };
 };
 var N1 = (u) => {
   return { x: -u.y, y: u.x, z: u.z };
 };
 var N2 = (u) => {
   return { x: u.y, y: -u.x, z: u.z };
 };
 var O = (A, e, closed = true) => {
   var R = [];
   let i = 0;
   if (A.length === 2) {
	 return [T(A[0], S(N1(U(A[0], A[1])), e)), T(A[1], S(N1(U(A[0], A[1])), e))];
   }
   while (i < A.length - 1) {
	 let p = T(A[i], S(N1(U(A[i], A[i + 1])), e)),
	   q = T(A[i + 1], S(N1(U(A[i], A[i + 1])), e));
	 R.push({ p, q });
	 i++;
   }
   let X = I(R, closed);
   return X;
 };
 var S = (u, r) => {
   return { x: u.x * r, y: u.y * r, z: u.z * r };
 };
 var T = (u, p) => {
   return { x: u.x + p.x, y: u.y + p.y, z: u.z + p.z };
 };
 var U = (p, q) => {
   return {
	 x: V(p, q).x / D(p, q),
	 y: V(p, q).y / D(p, q),
	 z: V(p, q).z / D(p, q),
   };
 };
 var V = (p, q) => {
   return { x: q.x - p.x, y: q.y - p.y, z: q.z - p.z };
 };
 