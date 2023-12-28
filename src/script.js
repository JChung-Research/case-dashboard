//////////////  Setup    /////////////
function setup() {
    timeStart = Date.now();
    blinkTime = Date.now();
    timeStart_proximity = Date.now();
    timeInitialStart = Date.now();

    setupProgram();
    loadTypesInFile();
    loadAssets(dtIP);
    setupScene();
    setupGeometry();
    setupHtmlInput();
    requestAnimationFrame(render);
    // setupSliderInterval();
}

function setupProgram() {
    console.log("setupProgram");
    const canvas = document.getElementById("c");
    renderer = new THREE.WebGLRenderer({ canvas });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Set up the size of the canvas
    renderer.setSize(canvas.clientWidth, canvas.clientHeight*coeffAspect, false);  

    raycaster = new THREE.Raycaster();
    pointer = new THREE.Vector2();
    window.addEventListener('pointerdown', onPointerMove);

    scene = new THREE.Scene();
}

// JIHOON: Update a object type list 'typesInFile' from the imported IFC file
function loadTypesInFile(){

    var fileLoader = new THREE.FileLoader();
    fileLoader.load(ifcFilePath, function ( object ) {

        // JIHOON: Import data in a IFCJSON file
        if(JSON.parse(object)["data"]){
            jsonData = JSON.parse(object)["data"];
        } else if (JSON.parse(object)["Data"]) {
            jsonData = JSON.parse(object)["Data"];
        } else {
            console.log("This is not a valid file!");
        }

        for (let i = 0; i < jsonData.length; i++){
            var typeJsonData = convertDuctType(jsonData[i].type);
            if (showElements.includes(typeJsonData) && jsonData[i].representations){
                typesInFile.push(typeJsonData);
        }}
        typesInFile = typesInFile.filter(distinct);

        loadSelectTypeDiv();
    });
}

function loadAssets(IP) {
    //////////////////// Load the instantiate the chair model - its MTL and OBJ files ////////////////////
    console.log("loadAssets");

    $.ajax({
        type: "GET",
        url: IP,        
        dataType: "json",
        contentType: "application/json; charset=utf-8",
        cache: false,
        beforeSend: function (xhr) {
            xhr.setRequestHeader ("Authorization", "Basic " + btoa(dtUser + ":" + dtPw));
        },
    }).done(function(data){
        console.log(sensorOccupancyInitDict);
        setupSensorDict(data);
        loadIFCFiles(data);
    });

    loadDoorOpenings();
}

function convertDuctType (input) {
    var output;
    (ductElements.includes(input)) ? output = nameDuctType : output = input;
    return output;
}

function loadIFCFiles(dtData){
        //JIHOON CHUNG: Create geometries from IFC.JSON files
        var fileLoader = new THREE.FileLoader();

        fileLoader.load(ifcFilePath, function ( object ) {

            console.log("fileLoader");
            // JIHOON: Import data in a IFCJSON file
            if(JSON.parse(object)["data"]){
                jsonData = JSON.parse(object)["data"];
            } else if (JSON.parse(object)["Data"]) {
                jsonData = JSON.parse(object)["Data"];
            } else {
                console.log("This is not a valid file!");
            }
            
            for (let i = 0; i < jsonData.length; i++){
                var typeJsonData = convertDuctType(jsonData[i].type);
                if (selectedType.includes(typeJsonData) && jsonData[i].representations){
                    var objId = jsonData[i].representations[0].ref;
                    let verts = [], faces = [];

                    // JIHOON CHUNG: for indexing object names
                    if (!type_dict[typeJsonData]) {
                        type_dict[typeJsonData] = 1;
                    } else {
                        type_dict[typeJsonData] += 1;
                    }

                    for (let j = 0; j < jsonData.length; j++){
                        if (jsonData[j].type == "shapeRepresentation" && jsonData[j].globalId == objId)
                        {
                            // JIHOON: Import mesh data into verts & faces list
                            jsonOBJ = jsonData[j].items[0];
                            jsonOBJ.split('\n').forEach((e) => {
                                if (e.split(' ')[0] === 'v'){
                                    verts.push({
                                        x: parseFloat(e.split(' ')[1]),
                                        y: parseFloat(e.split(' ')[2]),
                                        z: parseFloat(e.split(' ')[3]),
                                    });}
                                else if (e.split(' ')[0] === 'f'){
                                    faces.push({
                                        a: parseInt(e.split(' ')[1]),
                                        b: parseInt(e.split(' ')[2]),
                                        c: parseInt(e.split(' ')[3]),
                                    });}
                            });

                            templateJSON = new THREE.OBJLoader().parse(jsonOBJ);
                            templateJSON.castShadow = true;
                            templateJSON.receiveShadow = false;

                            for (k = 0; k < colorInpObj.data.length; k++){
                                var typeJsonData = convertDuctType(jsonData[i].type);
                                if (typeJsonData == colorInpObj.data[k].type) {
                                    var material = new THREE.MeshPhongMaterial({
                                        color: colorInpObj.data[k].color ? colorInpObj.data[k].color : "#ffffff",
                                        opacity: colorInpObj.data[k].opacity ? colorInpObj.data[k].opacity : 0.2,
                                        transparent: true
                                    });

                                    let geometry = new THREE.BufferGeometry();
                                    let points = [];
                                    faces.forEach((f) => {
                                        points.push(verts[f.a], verts[f.b], verts[f.c]);
                                    });
                                    geometry.setFromPoints(points);
                                    geometry.computeVertexNormals();

                                    templateJSON.position.x -= 20;
                                    templateJSON.position.z += 15;
                                    templateJSON.children[0].geometry = geometry;
                                    templateJSON.children[0].material = material;
                                    templateJSON.children[0].castShadow = true;
                                    templateJSON.name = jsonData[i].name + "_" + type_dict[typeJsonData];
                                    templateJSON.userData.type = typeJsonData;
                                    templateJSON.userData.volume = jsonData[i].Volume;
                                    templateJSON.userData.area = jsonData[i].Area;
                                    templateJSON.userData.centroid = getCenterPoint(templateJSON.children[0]);

                                    if (jsonData[i].ThermalTransmittance) {
                                        templateJSON.userData.ThermalTransmittance = jsonData[i].ThermalTransmittance;
                                    }
                                    if (jsonData[i].Length) {
                                        templateJSON.userData.length = jsonData[i].Length;
                                    }
                                    if (jsonData[i].Mark && jsonData[i].Mark.includes("Sensor") && ((typeJsonData=="Door") || (typeJsonData=='Window'))) {
                                        door_index[jsonData[i].Mark] = j;         
                                        doorClosed[jsonData[i].Mark] = true;                         
                                    }                      
                                    if (jsonData[i].Mark && jsonData[i].Mark.includes("Sensor")) {
                                        templateJSON.userData.sensorId = jsonData[i].Mark;

                                        // JIHOON: Adding sensorTypes into userData arrays
                                        for (let i = 0; i < dtData.devices.length; i++){
                                            var selDevice = dtData.devices[i]                                            
                                            if (templateJSON.userData.sensorId == selDevice.labels.ifcjson) templateJSON.userData.sensorType = selDevice.type;
                                        }

                                        (jsonData[i].Mark == selSensorId) ? selElement = templateJSON : "";
                                    }

                                    templateJSON.rotation.x = -Math.PI / 2;
                                    templateJSON.scale.set(scale, scale, scale);


                                    scene.add(templateJSON);
                                    scene.updateMatrixWorld(true);
                                    var pos = new THREE.Vector3();
                                    pos.setFromMatrixPosition(templateJSON.matrixWorld);
                                }
                            }
                            backupElements.push(templateJSON);
                        }
                    }
                }
            }
        } );
}

function loadDoorOpenings() {
    //console.log(jsonData[i].name);                                        
    var fileLoader_open = new THREE.FileLoader();
    
    fileLoader_open.load(ifcFilePath_open, function (object) {       
        jsonData = JSON.parse(object)["data"];
        doorKeys = Object.keys(door_index);
        for (let i = 0; i < doorKeys.length; i++){
            //console.log("doorKeys_Value: ", door_index[doorKeys[i]])
            let verts = [], faces = [];
            var jsonOBJ = jsonData[door_index[doorKeys[i]]].items[0];
            jsonOBJ.split('\n').forEach((e) => {
                if (e.split(' ')[0] === 'v'){
                    verts.push({
                        x: parseFloat(e.split(' ')[1]),
                        y: parseFloat(e.split(' ')[2]),
                        z: parseFloat(e.split(' ')[3]),
                    });}
                else if (e.split(' ')[0] === 'f'){
                    faces.push({
                        a: parseInt(e.split(' ')[1]),
                        b: parseInt(e.split(' ')[2]),
                        c: parseInt(e.split(' ')[3]),
                    });}                                        
            });
            
            let geometry_open = new THREE.BufferGeometry();
            let points = [];
            faces.forEach((f) => {
                points.push(verts[f.a], verts[f.b], verts[f.c]);
            });
            
            geometry_open.setFromPoints(points);
            geometry_open.computeVertexNormals();
            for (var j = 0; j < scene.children.length; j++) { 
                if(scene.children[j].userData.sensorId == doorKeys[i]){
                    scene.children[j].userData.doorGeometry = geometry_open;
                    //console.log("geometry_open: ", geometry_open);
                }
            }       
        }
    });
}

function updateCameraTopMatrix (inputCanvas) {
    cameraTopWidth = inputCanvas.clientWidth/4;
    cameraTopHeight = inputCanvas.clientHeight/4;
    cameraTop.aspect = inputCanvas / cameraTopHeight;
    cameraTop.updateProjectionMatrix();
}

function setupScene() {
    console.log("setupScene");
    scene.background = new THREE.Color(0x6688ff);

    // 2. Create the Camera
    //const fov = 75;
    const aspect = 2 / coeffAspect;//2;
    const d = 20;
    const near = 1;
    const far = 1000;
    camera = new THREE.OrthographicCamera(-d*aspect, d*aspect, d, -d, near, far);//PerspectiveCamera(fov, aspect, near, far)
    camera.position.x = 55;
    camera.position.y = 58;
    camera.position.z = -61;
    camera.zoom = 1.7;
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.update();

    // Add top view
    cameraTop = new THREE.OrthographicCamera(-d*aspect, d*aspect, d, -d, near, far);
    cameraTop.position.set(6,5,-5);
    cameraTop.zoom = 2.1;
    //cameraTop.rotateZ(Math.PI);
    cameraTop.name = "OverheadCamera";
    cameraTop.lookAt(6,0,-5);
    //camera.add(cameraTop);    

    //! 4. Add a light
    //Create a DirectionalLight and turn on shadows for the light
    const light = new THREE.DirectionalLight(0xffffff, 0.8);
    light.position.set(-50, 100, -100); //default; light shining from top
    light.target.position.set(0, 0, 0);
    light.castShadow = true; // default false
    scene.add(light);

    //Set up shadow properties for the light
    light.shadow.mapSize.width = 512; // default
    light.shadow.mapSize.height = 512; // default
    light.shadow.camera.near = 0.5; // default
    light.shadow.camera.far = 200; // default
    light.shadow.camera.left = -20;
    light.shadow.camera.right = 20;
    light.shadow.camera.top = 20;
    light.shadow.camera.bottom = -20;
    //Create a helper for the shadow camera (optional)
    const helper = new THREE.CameraHelper(light.shadow.camera);
    scene.add(helper);


    const ambientLight = new THREE.AmbientLight(0x808080);
    scene.add(ambientLight);
    scene.add(camera);


    // JIHOON: GUI for camera controller
    function updateCamera() {
        camera.updateProjectionMatrix();
    }

    gui.domElement.id = 'gui';

    cameraFolder = gui.addFolder('Camera');
    cameraFolder.add(camera.position, 'z', -100, 100);
    cameraFolder.add(camera, 'zoom', 0.1, 10).onChange(updateCamera);
    cameraFolder.open();

    heatFolder = gui.addFolder('Heatmap');
    cubeFolder = gui.addFolder('Geometry');
 
    updateCameraTopMatrix(renderer.domElement);
    camera.updateProjectionMatrix();
}

function setupGeometry() {
    console.log("setupGeometry")

    // 3a. Create the Geometry
    //Create a plane that receives shadows (but does not cast them)
    const planeSize = 50;
    const planeGeometry = new THREE.PlaneGeometry(planeSize, planeSize);
    const planeMaterial = new THREE.MeshStandardMaterial({ color: 0xa0a0a0 })
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.receiveShadow = true;
    plane.rotation.x = -Math.PI / 2;
    scene.add(plane);
}

function setupHtmlInput(){
    console.log("setupHtmlInput");

    var atext = '';
    atext += '<span id="subtitles">Occupancy Sensor: <input type="checkbox" onchange="showOccupancy(this)"';
    atext += (boolOccupancy)? ' checked' : '';
    atext += '><div id="inputOccupancyColor" style="display:inline-flex; margin-left:8px">';
    if (boolOccupancy) {
        atext += "<input type='color' style='width:24px;height:24px' name='' value=";
        atext += occupiedDeskColor;
        atext += " onchange='changeOccupiedColor(this.value)'>";
    }     
    atext += '</div></span>';

    document.getElementById("showOccupancy").innerHTML = atext;

    atext = '';
    atext += '<span id="subtitles">Proximity Sensor: <input type="checkbox" name="" onchange="showProximity(this)"';
    atext += (boolProximity)? ' checked' : '';
    atext += '><div id="inputProximityColor" style="display:inline-flex; margin-left:8px">';    
    if (boolProximity) {
        atext += "<input type='color' style='width:24px;height:24px' value=";
        atext += openedWindowColor;
        atext += " onchange='changeOpenedColor(this.value)'>";
    }
    atext += '</div></span>';
    
    document.getElementById("showProximity").innerHTML = atext;

    atext = '';
    atext += '<span id="subtitles">Ambient Sensor: <input type="checkbox" name="" onchange="showAmbient(this)"';
    atext += (boolAmbient)? ' checked' : '';
    atext += '><div id ="inputAmbientType" style="display:inline-flex; margin-left:8px">';
    if (boolAmbient) {
        atext += "<select name='selSensor', id='selAmbientType' onChange='updateSelAmbient(this.value)'>"
        atext += "<option value='"

        for (i = 0; arrAmbientTypes.length; i++){
            atext += arrAmbientTypes[i] + "'";
            atext += (arrAmbientTypes[i] == ambientDataType) ? " selected>" : ">";
        }
        atext += arrAmbientTypes[i] + "</option>";
        updateSelAmbient(ambientDataType);
    }    
    atext += '</div></span>';

    document.getElementById("showAmbient").innerHTML = atext;
}

// JIHOON: Add cubeFolder
function addCubeFolder(){
    controlX = cubeFolder.add(selElement.position, 'x', -50, 50);
    controlY = cubeFolder.add(selElement.position, 'y', -50, 50);
    controlZ = cubeFolder.add(selElement.position, 'z', -50, 50);
    controlR = cubeFolder.add(selElement.rotation, 'z', -Math.PI, Math.PI);
    cubeFolder.open();
}

// JIHOON: Add HTML table of the selected element
function addSelTable(){
    // Create a text string containing the HTML we will be generating and incrementally add to it.
    var textout = "<table class='table table-bordered'><thead><tr><th style='width: 30%'>Key</th><th>Value</th></tr></thead>"
    textout += "<tr><td>name</td><td>"
    textout += selElement.name;
    Object.keys(selElement.userData).forEach(e => {
        var value_ = selElement.userData[e]

        textout += "</td></tr><tr><td>"
        textout += e;
        textout += "</td><td>";

        // JIHOON: Write XYZ coordinate values
        if (e == "centroid") {
            Object.keys(value_).forEach(p => {
                textout += p + ": " + Math.round(value_[p]*1000)/1000;
                p == "z" ? textout += "" : textout += ", ";
            })
        } else if (typeof value_ == "number") {
            textout += Math.round(value_*1000)/1000;
        } else {
            textout += value_;
        }
    });
    textout += "</td></tr></table>";

    document.getElementById("DataTableDIV").innerHTML = textout;
}

// JIHOON: Update position of GUI contorls
function updateGui(){
    var guiElement = document.getElementById("gui");
    var canvas = document.getElementById("c");
    guiElement.style.position = "absolute";
    guiElement.style.top = canvas.getBoundingClientRect().top + "px";
    guiElement.style.left = canvas.getBoundingClientRect().left + "px";
}

// JIHOON: Load 'Select Object Type' on HTML
function loadSelectTypeDiv(){
    console.log("loadSelectObjectType");
    var selectTypeEle = document.getElementById("selectType");
    var textout = "<table class='table table-bordered'><thead><tr><th style='width:13%'>Check</th><th>Object Type</th><th style='width:13%'>Color</th><th style='width:34%'>Opacity</th></tr></thead>";
    for (var i=0; i < showElements.length; i++){
        var myType = showElements[i];

        // JIHOON: Add checkbox input
        textout += '<tr><td class="table table-bordered"><input style="width:17px; height:17px; margin: auto;" type="checkbox" value=';
        textout += myType;
        if (typesInFile.includes(showElements[i])){
            textout += ' checked';
            selectedType.push(showElements[i]);
        }
        textout += ' onclick="updateViewObject(this)"></td><td>';
        textout += myType + "</td><td>";
        textout += '<input type="color" style="width:24px;height:24px" name="'
        textout += myType +'"'
        for (k = 0; k < colorInpObj.data.length; k++){
            if (myType == colorInpObj.data[k].type) {
                textout += ' value='+colorInpObj.data[k].color;
            }
        }

        // JIHOON: Add onChange function on the color input
        textout += ' onchange="onTypeColor(this.name, this.value, this.type)"></td><td>';
        textout += ' <input type="range" style="width:120px" min="0" max"100" name="'
        textout += myType +'"'
        for (k = 0; k < colorInpObj.data.length; k++){
            if (myType == colorInpObj.data[k].type) {
                textout += ' value='+colorInpObj.data[k].opacity*100;
                        // JIHOON: Add onChange function on the opacity input
                textout += ' onchange="onTypeColor(this.name, this.value, this.type)"><div id="valueOpacity_'+k+'">'
                textout += colorInpObj.data[k].opacity*100 + '%</div></td></tr>';
            }
        }
    }
    textout += "</table>";
    document.getElementById("selectType").innerHTML = textout;
    selectedType = selectedType.filter(distinct);
}

// JIHOON: Update object types whether they are shown or hidden
function updateViewObject(cb){
    if(cb.checked){
        selectedType.push(cb.value);

        for (i=0; i < backupElements.length ; i++) {
            if (convertDuctType(backupElements[i].userData.type) == cb.value){
                scene.children.push(backupElements[i]);
            }
        }

    } else if (!cb.checked){
        for (i=0; i < backupElements.length ; i++) {
            if (convertDuctType(backupElements[i].userData.type) == cb.value){
                scene.children.splice(scene.children.indexOf(backupElements[i]),1);
            }
        }
    }
}

// JIHOON: Change color/opacity of an object type
function onTypeColor(aname, avalue, atype){
    var acolor;
    var anopacity;
    for (k = 0; k < colorInpObj.data.length; k++){
        if (aname == colorInpObj.data[k].type) { 
            if (atype == "color"){
                colorInpObj.data[k].color = avalue;
                acolor = avalue
                anopacity = colorInpObj.data[k].opacity
            }
            else if (atype == "range"){
                colorInpObj.data[k].opacity = avalue;
                anopacity = avalue/100;
                document.getElementById("valueOpacity_"+k).innerHTML = avalue + "%";
                acolor = colorInpObj.data[k].color;
            }
        }
    }

    for (var i = 0; i < scene.children.length; i++) {
        if (aname == scene.children[i].userData.type) {
            scene.children[i].children[0].material = new THREE.MeshPhongMaterial({
                color: acolor,
                opacity: anopacity,
                transparent: true
            });
        }
    }
}

function changeOccupiedColor(avalue) {
    occupiedDeskColor = avalue;
    
    for (var i = 0; i < scene.children.length; i++) {
        var sensorId = scene.children[i].userData.sensorId;
        if ((sensorId) && (scene.children[i].userData.sensorType == "deskOccupancy")) {
            var numState = sensorRealtime[sensorId].data.occupancy;
            updateOccDeskColor(numState, sensorId);
        }
    }
}

function changeOpenedColor(avalue) {
    openedWindowColor = avalue;

    for (var i = 0; i < scene.children.length; i++) {
        var sensorId = scene.children[i].userData.sensorId;
        if ((sensorId) && (scene.children[i].userData.sensorType == "proximity")) {
            var boolState = sensorRealtime[sensorId].data.proximity;
            updateDoorStatus(sensorId, boolState);
        }
    }
}

// Show on/off the occupancy sensor
function showOccupancy(cb) {
    boolOccupancy = cb.checked;
    var atext = "";

    if (boolOccupancy) {
        atext += " <input type='color' style='width:24px;height:24px' name='' value=";
        atext += occupiedDeskColor;
        atext += " onchange='changeOccupiedColor(this.value)'>";
    } 
    document.getElementById("inputOccupancyColor").innerHTML = atext;

    for (var i = 0; i < scene.children.length; i++) {
        var sensorId = scene.children[i].userData.sensorId;
        if ((sensorId) && (scene.children[i].userData.sensorType == "deskOccupancy")) {
            var numState = sensorRealtime[sensorId].data.occupancy;
            (boolOccupancy) ? updateOccDeskColor(numState, sensorId) : updateOccDeskColor(0, sensorId);
        }
    }
}

function showProximity(cb) {
    boolProximity = cb.checked;
    var atext = "";

    if (boolProximity) {
        atext += " <input type='color' style='width:24px;height:24px' value=";
        atext += openedWindowColor;
        atext += " onchange='changeOpenedColor(this.value)'>";
    }
    document.getElementById("inputProximityColor").innerHTML = atext;

    for (var i = 0; i < scene.children.length; i++) {
        var sensorId = scene.children[i].userData.sensorId;
        if ((sensorId) && (scene.children[i].userData.sensorType == "proximity")) {
            var boolState = sensorRealtime[sensorId].data.proximity;
            (boolProximity) ? updateDoorStatus(sensorId, boolState) : updateDoorStatus(sensorId, true);
        }
    }
}

function showAmbient(cb) {
    boolAmbient = cb.checked;
    atext = "";

    if (boolAmbient) {
        atext += "<select name='selAmbientType', id='selAmbientType' onChange='updateSelAmbient(this.value)'>"
        for (i = 0; i < arrAmbientTypes.length; i++){
            atext += "<option value='";
            atext += arrAmbientTypes[i] + "'";
            (arrAmbientTypes[i] == ambientDataType) ? atext += " selected>" : atext += ">";
            atext += arrAmbientTypes[i] + "</option>";
        }
        atext += "</select>";
    }
    document.getElementById("inputAmbientType").innerHTML = atext;
    updateSelAmbient(ambientDataType);
}

function updateSelAmbient(avalue){   
    if ((!boolAmbient) || (ambientDataType != avalue)){
        currentHeightRatio = meshHeat.material.uniforms.heightRatio.value;
        heatFolder.remove(controlHeat);
        scene.remove(scene.getObjectByName(varVizualize));
        var idx = 0;
        for (var i = 0; i < scene.children.length; i++) {
            if (numTempSensors.length * 2 == idx){
                i += idx;
            } else if (scene.children[i].name == varText || scene.children[i].name == varLine) {
                scene.remove(scene.children[i]);
                i -= 1;
                idx += 1;
            }
        }

        changeObjOpacity(1);
        remove3DChart();

        controlHeat = NaN;
    }

    ambientDataType = avalue;
    if (boolAmbient) {
        drawHeatmap(sensorRealtime, avalue);
        realtimeDataDisplay(sensorRealtime, avalue);
        changeObjOpacity(4);
    }
}

function updateSelSensor(ID){
    for (var i = 0; i < scene.children.length; i++) {
        (scene.children[i].userData.sensorId && scene.children[i].userData.sensorId == ID) ? selElement = scene.children[i] : "";

        lineChart = new GraphTable("GraphTableDIV", selSensorId, sensorDict);
        lineChart.refresh();

        gaugeChart = new RealTable("RealTableDIV", selSensorId, sensorRealtime);
        gaugeChart.refresh();
    }
}


// JIHOON: Save the keys of sensorDict into another list
function setupSensorDict(dtData){
    console.log(dtData);
    var textSelSensor = "<span id='subtitles'>Select Sensor: <select name='selSensor', id='selSensor' onChange='updateSelSensor(this.value)'>";

    for (let i = 0; i < dtData.devices.length; i++){
        // JIHOON: Setting up the dictionary 'sensorDictKeys'
        if (dtData.devices[i].labels.ifcjson) {
            selKey = dtData.devices[i].labels.ifcjson;
            sensorDictKeys.push(selKey);

            if(dtData.devices[i].type == "humidity") {                
                // sensorDict[selKey] = sensorHumidityInitDict;
                // sensorRealtime[selKey] = sensorHumidityInitDict;
                sensorDict[selKey] = {
                                        type: "",
                                        time: {
                                            strTime: [],
                                            dateTime: []
                                        },
                                        data: {
                                            humidity: [],
                                            temperature: []
                                        }
                                    };
                sensorRealtime[selKey] = {
                                            type: "",
                                            time: {
                                                strTime: [],
                                                dateTime: []
                                            },
                                            data: {
                                                humidity: [],
                                                temperature: []
                                            }
                                        };
                                        sensorDict[selKey].type = "humidity";
                sensorRealtime[selKey].type = "humidity";
                numTempSensors += 1;

                textSelSensor += "<option value='";
                textSelSensor += selKey + "'";
                (selKey == selSensorId) ? textSelSensor += " selected>" : textSelSensor += ">";
                textSelSensor += selKey + "</option>";
            } else if (dtData.devices[i].type == "deskOccupancy") {                
                // sensorDict[selKey] = sensorOccupancyInitDict;                
                // sensorRealtime[selKey] = sensorOccupancyInitDict;
                sensorDict[selKey] = {
                                        type: "",
                                        time: {
                                        strTime: [],
                                        dateTime: []
                                        },
                                        data: {
                                        occupancy:[]
                                        }
                                    };     
                sensorRealtime[selKey] = {
                                            type: "",
                                            time: {
                                            strTime: [],
                                            dateTime: []
                                            },
                                            data: {
                                            occupancy:[]
                                            }
                                        };       
                sensorDict[selKey].type = "deskOccupancy";
                sensorRealtime[selKey].type = "deskOccupancy";
            } else if (dtData.devices[i].type == "proximity") {                
                sensorDict[selKey] = {
                                        type: "",
                                        time: {
                                        strTime: [],
                                        dateTime: []
                                        },
                                        data: {
                                        proximity:[]
                                        }
                                    };     
                sensorRealtime[selKey] = {
                                            type: "",
                                            time: {
                                            strTime: [],
                                            dateTime: []
                                            },
                                            data: {
                                            proximity:[]
                                            }
                                        };       
                sensorDict[selKey].type = "proximity";
                sensorRealtime[selKey].type = "proximity";
            }
        }
    }

    textSelSensor += "</select></span>";
    document.getElementById("SelectSensorID").innerHTML = textSelSensor;
}

// Visualize occupants who are sitting on their chairs
function vizCurrentOcc(occDeskData, sensorClr, sensorOpc){
    //console.log(occDeskData);
    var curDeskX = occDeskData.centroid.x; var curDeskY = occDeskData.centroid.y; var curDeskZ = occDeskData.centroid.z;
    var occPosePath = objSittingPath;
    var objLoader = new THREE.OBJLoader();
    objLoader.load(occPosePath, function (object) {
        object.castShadow = true;
        object.receiveShadow = false;
        for (var i = 0; i < object.children.length; i++) {
            object.children[i].castShadow = true;
        }

    var amodel = object.clone();
    var dirSign;
    if (dirDesk_east.includes(occDeskData.sensorId)){
        dirSign = 1;
    } else if (dirDesk_west.includes(occDeskData.sensorId)){
        dirSign = -1;
    }
    amodel.castShadow = true;
    amodel.receiveShadow = false;
    amodel.position.x = curDeskX -20;
    amodel.position.y = 0//curDeskZ;
    amodel.position.z = -curDeskY +15;
    amodel.scale.set(0.023, 0.023, 0.023);   
    amodel.userData.type = "Occupant";
    amodel.name = nameOccupant + occDeskData.sensorId;
    amodel.rotateX(-Math.PI / 2);
    amodel.rotateZ(Math.PI / 2 * dirSign);
    amodel.position.x -= (0.5 - 0.65) * dirSign;
    amodel.position.y += 0.09;
    //amodel.position.z = 0.5 * dirSign;
    amodel.children[0].material = new THREE.MeshPhongMaterial({
        color: sensorClr,
        opacity: sensorOpc * 0.75,
        transparent: true
    });

    scene.remove(scene.getObjectByName(nameOccupant + occDeskData.sensorId));
    scene.add(amodel);
    });
}

// Update the color of the occupied desks
function updateOccDeskColor (state, ID) {
    var sensorClr_;
    var sensorOpc_;
    var vizOccunat; 
    if (state == 1) {
        sensorClr_ = occupiedDeskColor;
        sensorOpc_ = occpiedDeskOpacity;
        vizOccunat = true;
    } else {
        sensorClr_ = colorInpObj.data[4].color;
        sensorOpc_ = colorInpObj.data[4].opacity; 
        vizOccunat = false;
    }

    for (var i = 0; i < scene.children.length; i++) {
        if (sensorDictKeys.includes(scene.children[i].userData.sensorId) && scene.children[i].userData.sensorId == ID) {
            scene.children[i].children[0].material = new THREE.MeshPhongMaterial({
                color: sensorClr_,
                opacity: sensorOpc_,
                transparent: true
            });

            if (vizOccunat == true) {
                vizCurrentOcc(scene.children[i].userData, sensorClr_, sensorOpc_);
            } else if ((vizOccunat == false) && (scene.getObjectByName(nameOccupant + ID))){
                scene.remove(scene.getObjectByName(nameOccupant + ID));
            }
        }
    }
}

// JIHOON: Import sensor data from DT API
function importSensorData(IP){
    var timeNow = Date.now();
    if ((Math.floor((timeNow-timeStart)/1000) >= updateInterval) || (initialRequestDesk && Math.floor((timeNow-timeStart)/1000) >= initialImportTime)) {   
        $.ajax({
            type: "GET",
            url: IP,        
            dataType: "json",
            contentType: "application/json; charset=utf-8",
            cache: false,
            beforeSend: function (xhr) {
                xhr.setRequestHeader ("Authorization", "Basic " + btoa(dtUser + ":" + dtPw));
            },
        }).done(function(data){
            console.log("Receieved DT data");

            for (let i = 0; i < data.devices.length; i++){
                if (data.devices[i].labels.ifcjson){ // If Distruptive Technology sensor contains ifcjson label
                    var sensorId = data.devices[i].labels.ifcjson;                           
                    if (sensorDictKeys.includes(sensorId)){   // if the sensor with ifcjson label are included in the sensorDictKeys
                        if (data.devices[i].type == "humidity") {
                            var dateTime = data.devices[i].reported.humidity.updateTime;
                            var numHumidity = data.devices[i].reported.humidity.relativeHumidity;
                            var numTemperature = data.devices[i].reported.humidity.temperature;        

                            sensorDict[sensorId].time.dateTime.push(dateTime);
                            sensorDict[sensorId].time.strTime.push(rewriteTimestamp_show(dateTime));
                            sensorDict[sensorId].data.humidity.push(numHumidity);
                            sensorDict[sensorId].data.temperature.push(numTemperature);                                    
                            sensorRealtime[sensorId].data.humidity = numHumidity;
                            sensorRealtime[sensorId].data.temperature  = numTemperature;

                        } else if (data.devices[i].type == "deskOccupancy") {
                            var dateTime = data.devices[i].reported.deskOccupancy.updateTime;
                            var strState = data.devices[i].reported.deskOccupancy.state;
                            var numState;                                    
                            (strState == "OCCUPIED") ? numState = 1 : numState = 0

                            sensorDict[sensorId].time.dateTime.push(dateTime);
                            sensorDict[sensorId].time.strTime.push(rewriteTimestamp_show(dateTime));
                            sensorDict[sensorId].data.occupancy.push(numState);                                    
                            sensorRealtime[sensorId].data.occupancy = numState;
                            
                            (boolOccupancy) ? updateOccDeskColor(numState, sensorId) : updateOccDeskColor(0, sensorId);
                        }
                    }
                }
            }    
            
            // Update selected sensor graphs            
            lineChart = new GraphTable("GraphTableDIV", selSensorId, sensorDict);
            lineChart.refresh();

            gaugeChart = new RealTable("RealTableDIV", selSensorId, sensorRealtime);
            gaugeChart.refresh();

            // Update the heatmap
            if (boolAmbient) {
                currentHeightRatio = meshHeat.material.uniforms.heightRatio.value;
                scene.remove(scene.getObjectByName(varVizualize));
                var idx = 0;
                for (var i = 0; i < scene.children.length; i++) {
                    if (numTempSensors.length * 2 == idx){
                        i += idx;
                    } else if (scene.children[i].name == varText || scene.children[i].name == varLine) {
                        scene.remove(scene.children[i]);
                        i -= 1;
                        idx += 1;
                    }
                }

                remove3DChart();

                drawHeatmap(sensorRealtime, ambientDataType);
                realtimeDataDisplay(sensorRealtime, ambientDataType);
            }        
        });
        timeStart = Date.now();
        initialRequestDesk = false;
       }

       // Blink active sensors
       if (Math.floor((timeNow-blinkTime)/1000) >= blinkInterval) {
        var sensorClr_;
        if (blinkOn){
            sensorClr_ = blinkColor;
            blinkOn = false;
        } else {
            sensorClr_ = colorInpObj.data[6].color;
            blinkOn = true;
        }

        for (var i = 0; i < scene.children.length; i++) {
            if (sensorDictKeys.includes(scene.children[i].userData.sensorId) && scene.children[i].userData.sensorType == "humidity") {
                scene.children[i].children[0].material = new THREE.MeshPhongMaterial({
                    color: sensorClr_,
                    opacity: colorInpObj.data[6].opacity,
                    transparent: true
                });
            }
        }
        blinkTime = Date.now();
       }     


       if ((Math.floor((timeNow-timeStart_proximity)/1000) >= updateDoorInterval) || (initialRequestProximity && Math.floor((timeNow-timeStart_proximity)/1000) >= initialImportTime)) {   
        $.ajax({
            type: "GET",
            url: IP,        
            dataType: "json",
            contentType: "application/json; charset=utf-8",
            cache: false,
            beforeSend: function (xhr) {
                xhr.setRequestHeader ("Authorization", "Basic " + btoa(dtUser + ":" + dtPw));
            },
        }).done(function(data){
            //console.log("request proximity sensor");
            for (let i = 0; i < data.devices.length; i++){
                if (data.devices[i].labels.ifcjson){ // If Distruptive Technology sensor contains ifcjson label
                    var sensorId = data.devices[i].labels.ifcjson;                           
                    if (sensorDictKeys.includes(sensorId)){   // if the sensor with ifcjson label are included in the sensorDictKeys                        
                        if (data.devices[i].type == "proximity") {                            
                            var dateTime = data.devices[i].reported.objectPresent.updateTime;
                            var boolState = (data.devices[i].reported.objectPresent.state == "PRESENT") ? true : false; // true: closed; false: opened

                            sensorDict[sensorId].time.dateTime.push(dateTime);
                            sensorDict[sensorId].time.strTime.push(rewriteTimestamp_show(dateTime));
                            sensorDict[sensorId].data.proximity.push(boolState);
                            sensorRealtime[sensorId].data.proximity = boolState;

                            (boolProximity) ? updateDoorStatus(sensorId, boolState) : updateDoorStatus(sensorId, true);

                            
                        }
                    }
                }
            }            
        });
        timeStart_proximity = Date.now();
        initialRequestProximity = false;
        }
       
       if ((Math.floor((timeNow-timeStart_proximity)/1000) >= updateDoorInterval) || (initialRequestProximity && Math.floor((timeNow-timeStart_proximity)/1000) >= initialImportTime)) {   
        $.ajax({
            type: "GET",
            url: IP,        
            dataType: "json",
            contentType: "application/json; charset=utf-8",
            cache: false,
            beforeSend: function (xhr) {
                xhr.setRequestHeader ("Authorization", "Basic " + btoa(dtUser + ":" + dtPw));
            },
        }).done(function(data){
            //console.log("request proximity sensor");
            for (let i = 0; i < data.devices.length; i++){
                if (data.devices[i].labels.ifcjson){ // If Distruptive Technology sensor contains ifcjson label
                    var sensorId = data.devices[i].labels.ifcjson;                           
                    if (sensorDictKeys.includes(sensorId)){   // if the sensor with ifcjson label are included in the sensorDictKeys                        
                        if (data.devices[i].type == "proximity") {                            
                            var dateTime = data.devices[i].reported.objectPresent.updateTime;
                            var boolState = (data.devices[i].reported.objectPresent.state == "PRESENT") ? true : false; // true: closed; false: opened

                            sensorDict[sensorId].time.dateTime.push(dateTime);
                            sensorDict[sensorId].time.strTime.push(rewriteTimestamp_show(dateTime));
                            sensorDict[sensorId].data.proximity.push(boolState);
                            sensorRealtime[sensorId].data.proximity = boolState;

                            (boolProximity) ? updateDoorStatus(sensorId, boolState) : updateDoorStatus(sensorId, true);

                            
                        }
                    }
                }
            }            
        });
        timeStart_proximity = Date.now();
        initialRequestProximity = false;
        }
  }


// JIHOON: button for opning/closing doors
function openDoor(){
    doorKeys = Object.keys(door_index);

    for (var j = 0; j < scene.children.length; j++) { 
        if(scene.children[j].userData.sensorId == doorKeys[0]){            
            var prevGeometry = scene.children[j].userData.doorGeometry;          
            scene.children[j].userData.doorGeometry = scene.children[j].children[0].geometry; 
            scene.children[j].children[0].geometry = prevGeometry;            
        }
    }  
}

// JIHOON: update door status
function updateDoorStatus(Id, boolProx) {   
    var sensorClr_;
    var sensorOpc_;
    var vizOccunat; 
    if ((boolProx == false) && (boolProximity == true)) {
        sensorClr_ = openedWindowColor;
        sensorOpc_ = openedWindowOpacity;
    } else {
        sensorClr_ = colorInpObj.data[4].color;
        sensorOpc_ = colorInpObj.data[4].opacity; 
    }
    
    for (var j = 0; j < scene.children.length; j++) { 
        var selUserData = scene.children[j].userData;
        if (((selUserData.type == "Door")||(selUserData.type == "Window")) && selUserData.sensorId && selUserData.sensorId == Id){
            scene.children[j].children[0].material = new THREE.MeshPhongMaterial({
                color: sensorClr_,
                opacity: sensorOpc_,
                transparent: true
            });           

        if (doorClosed[Id] != boolProx){
            prevGeometry = scene.children[j].userData.doorGeometry;

            scene.children[j].userData.doorGeometry = scene.children[j].children[0].geometry; 
            scene.children[j].children[0].geometry = prevGeometry;
            doorClosed[Id] = boolProx;              
            }
        }
    }
}

// JIHOON: Rewrite timestamp into human-readable string
function rewriteTimestamp_save(timeNow){
    var timeDate = new Date(timeNow);
    return (timeDate.getMonth()+1)+
    "/"+timeDate.getDate()+
    "/"+timeDate.getFullYear()+
    " "+timeDate.getHours()+
    ":"+timeDate.getMinutes()+
    ":"+timeDate.getSeconds();
}

// JIHOON: Rewrite timestamp into human-readable string
function rewriteTimestamp_show(timeNow){
    var timeDate = new Date(timeNow);
    var hours = timeDate.getHours();
    var ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return hours+
    ":"+timeDate.getMinutes()+
    ":"+timeDate.getSeconds()+
    " "+ampm+
    " ("+(timeDate.toLocaleString('default', {month:'short'}))+
    " "+timeDate.getDate()+")";
}

// JIHOON: Create heatmap mesh
function createHeightMap(sensorRealtime, ambDataType){
    sensorValueMax = (ambDataType == "Temperature") ? 30 : 100;
    var prev_max = 50;
    var canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;

    var ctx = canvas.getContext("2d");
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, 256, 256);

    var radius = 30;

    for (var i = 0; i < scene.children.length; i++) {
        if (sensorDictKeys.includes(scene.children[i].userData.sensorId) && scene.children[i].userData.sensorType == "humidity") {
            var x = (scene.children[i].userData.centroid.x-20 + prev_max/2)/prev_max * canvas.width; //
            var y = (-scene.children[i].userData.centroid.y+15+prev_max/2)/prev_max * canvas.width;//
            var h8 = (ambDataType == "Temperature") ? sensorRealtime[scene.children[i].userData.sensorId].data.temperature / sensorValueMax * 255 : sensorRealtime[scene.children[i].userData.sensorId].data.humidity / sensorValueMax * 255;
            var grd = ctx.createRadialGradient(x, y, 1, x, y, radius);

            grd.addColorStop(0, "rgb("+ h8 + "," + h8 + "," + h8 +",1)");
            grd.addColorStop(1, "transparent");
            ctx.fillStyle = grd;
            ctx.fillRect(0, 0, 256, 256);

        } else if (scene.children[i].userData.type == "Wall"){
            var x = scene.children[i].userData.centroid.x;
            var y = scene.children[i].userData.centroid.y;
            var h8 = 0;
            var grd = ctx.createRadialGradient(x, y, 1, x, y, radius);

            grd.addColorStop(0, "rgb("+ h8 + "," + h8 + "," + h8 +")");
            grd.addColorStop(1, "transparent");
            ctx.fillStyle = grd;
            ctx.fillRect(0, 0, 256, 256);
        }
    }
    return new THREE.CanvasTexture(canvas);
  }

// JIHOON: Get center point of every object
function getCenterPoint(mesh) {
    var middle = new THREE.Vector3();
    var geometry = mesh.geometry;

    geometry.computeBoundingBox();

    middle.x = (geometry.boundingBox.max.x + geometry.boundingBox.min.x) / 2;
    middle.y = (geometry.boundingBox.max.y + geometry.boundingBox.min.y) / 2;
    middle.z = (geometry.boundingBox.max.z + geometry.boundingBox.min.z) / 2;

    mesh.localToWorld( middle );
    return middle;
}

// JIHOON: Draw heatmap mesh
function drawHeatmap(sensorRealtime, ambDataType){
    const planeHeatmap = new THREE.PlaneGeometry(50, 50, 100, 100);
    planeHeatmap.rotateX(-Math.PI * 0.5);

    // JIHOON: Update height value of the heatmap
    if (controlHeat){
        currentHeightRatio = meshHeat.material.uniforms.heightRatio.value;
        heatFolder.remove(controlHeat);
    }

    var heatVertex = `
        uniform sampler2D heightMap;
        uniform float heightRatio;
        varying vec2 vUv;
        varying float hValue;
        void main() {
        vUv = uv;
        vec3 pos = position;
        hValue = texture2D(heightMap, vUv).r;
        pos.y = hValue * heightRatio;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos,1.0);
        }
        `;

        var heatFragment = `
        varying float hValue;

        // honestly stolen from https://www.shadertoy.com/view/4dsSzr
        vec3 heatmapGradient(float t) {
        return clamp((pow(t, 1.5) * 0.8 + 0.2) * vec3(smoothstep(0.0, 0.35, t) + t * 0.5, smoothstep(0.5, 1.0, t), max(1.0 - t * 1.7, t * 7.0 - 6.0)), 0.0, 1.0);
        }

        void main() {
        float v = abs(hValue - 1.);
        gl_FragColor = vec4(heatmapGradient(hValue), 1. - v * v) ;
        }
        `;

    var heightMap = createHeightMap(sensorRealtime, ambDataType);
    meshHeat = new THREE.Mesh(planeHeatmap, new THREE.ShaderMaterial({
        uniforms: {
          heightMap: {value: heightMap},
          heightRatio: {value: currentHeightRatio}
        },
        vertexShader: heatVertex,
        fragmentShader: heatFragment,
        transparent: true
      }));
    meshHeat.name = varVizualize;

    // JIHOON: Update meshHeatmap
    if (boolAmbient){
        scene.add(meshHeat);
        controlHeat = heatFolder.add(meshHeat.material.uniforms.heightRatio, "value", 1, 15).name("heightRatio");
        heatFolder.open();
    }
}

// JIHOON: Get location data of active sensors
function activeSensorLocation() {
    for (var i = 0; i < scene.children.length; i++) {
        if (sensorDictKeys.includes(scene.children[i].userData.sensorId)) {
            var x = scene.children[i].userData.centroid.x;// - 20;
            var y = scene.children[i].userData.centroid.y;// + 15;
            var z = scene.children[i].userData.centroid.z;
            var radius = 1;

            const geometry = new THREE.SphereGeometry( radius, 16, 16 );
            const material = new THREE.MeshBasicMaterial( { color: blinkColor } );
            const sphere = new THREE.Mesh( geometry, material );
            sphere.position.x = x -20;
            sphere.position.y = z;
            sphere.position.z = -y +15;
            //sphere.rotation.x = -Math.PI / 2;
            scene.add( sphere );

        }
    }
}

function generateSurface(arrIdx, arrPt, strName, strColor, numOpacity){
    var arrInput = []
    for (i = 0; i < arrPt.length; i++){
        arrInput.push(arrPt[i][0] - 20);     
        (arrIdx.includes(i)) ? arrInput.push(ptBoundaryZ[1]) : arrInput.push(ptBoundaryZ[0]) ;
        arrInput.push(-arrPt[i][1] +15);
    }

    const geometry = new THREE.BufferGeometry();

    // create a simple square shape. We duplicate the top left and bottom right
    // vertices because each vertex needs to appear once per triangle.
    const vertices = new Float32Array(arrInput);

    // itemSize = 3 because there are 3 values (components) per vertex
    geometry.setAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );
    const material = new THREE.MeshBasicMaterial( { color: strColor, opacity: numOpacity, transparent: true} );
    const mesh = new THREE.Mesh( geometry, material );
    mesh.name = strName
    scene.add(mesh);
}

// Generate borderlines and y axis ticks of the 3D chart
function generateBorder(Z, nameBorder, nameYtick, strColor, ambDataType){
    (ambDataType == "Temperature") ? strMetric = "°C" : strMetric = "%";
    const materialLine = new THREE.LineBasicMaterial({color:strColor, opacity:0.7, transparent: true});
    const ptsLine = [];
    ptsLine.push(new THREE.Vector3(ptBoundary2[0]-20+offsetBorder, Z, -ptBoundary2[1]+15-offsetBorder));
    ptsLine.push(new THREE.Vector3(ptBoundary3[0]-20+offsetBorder, Z, -ptBoundary3[1]+15-offsetBorder));
    ptsLine.push(new THREE.Vector3(ptBoundary4[0]-20+offsetBorder, Z, -ptBoundary4[1]+15-offsetBorder));    

    const geoLine = new THREE.BufferGeometry().setFromPoints(ptsLine);
    const sensorLine = new THREE.Line(geoLine, materialLine);
    sensorLine.name = nameBorder;

    scene.add(sensorLine);

    (ambDataType == "Temperature") ? caliZ = Z*4: caliZ = Z*80/6;
    var label = makeTextSprite((caliZ).toString() + strMetric,
    { fontsize: 18, textColor: {r:0, g:0, b:0, a:0.9}, transparent: true});
    label.position.set(ptBoundary2[0]-21+offsetBorder, Z-1.6, -ptBoundary2[1]+12-offsetBorder);
    label.name = nameYtick;

    scene.add(label);
}

// JIHOON: Display real-time data
function realtimeDataDisplay(sensorRealtime, ambDataType) {
    var textHeight = 15;
    (ambDataType == "Temperature") ? strMetric = "°C" : strMetric = "%";
    for (var i = 0; i < scene.children.length; i++) {
        if (sensorDictKeys.includes(scene.children[i].userData.sensorId) && scene.children[i].userData.sensorType == "humidity") {
            var x = scene.children[i].userData.centroid.x - 20;
            var y = scene.children[i].userData.centroid.z - 0.3;
            var z = - scene.children[i].userData.centroid.y + textHeight;
            //y *= currentHeightRatio;

            var value_;
            var textClr_;
            var lineClr_;
            var text = scene.children[i].userData.sensorId + " (";

            (ambDataType == "Temperature") ? value_ = sensorRealtime[scene.children[i].userData.sensorId].data.temperature : value_ = sensorRealtime[scene.children[i].userData.sensorId].data.humidity;
            text += value_;
            text += strMetric + ")";

            if (blinkOn && numTempThreshold<value_) {
                lineClr_= 0xff0000;
                textClr_ = {r:255, g:0, b:0, a:0.9};
            } else {
                lineClr_= 0x000000;
                textClr_ = {r:0, g:0, b:0, a:0.9};
            }

            var measurement = makeTextSprite(text.toString(),
            { fontsize: 18, textColor: textClr_});
            measurement.position.set(x-1.5,y*currentHeightRatio/2 +1.5,z-2);
            measurement.name = varText;
            //idx += 1;

            scene.add(measurement);

            const materialLine = new THREE.LineBasicMaterial({ color: lineClr_ });
            const ptsLine = [];
            ptsLine.push(new THREE.Vector3(x, y, z));
            ptsLine.push(new THREE.Vector3(x, y*currentHeightRatio/2 +2.5, z));

            const geoLine = new THREE.BufferGeometry().setFromPoints( ptsLine );
            const sensorLine = new THREE.Line( geoLine, materialLine );
            sensorLine.name = varLine;

            scene.add(sensorLine);
        }
    }

    var arrPtGround = [ptBoundary1, ptBoundary4, ptBoundary3, ptBoundary3, ptBoundary2, ptBoundary1];
    var arrPtPlane1 = [ptBoundary2, ptBoundary3, ptBoundary3, ptBoundary3, ptBoundary2, ptBoundary2];
    var arrPtPlane2 = [ptBoundary4, ptBoundary4, ptBoundary3, ptBoundary3, ptBoundary3, ptBoundary4];
    
    generateSurface([7], arrPtGround, "chartGround", chartGroundClr, chartGroundOpacity);
    generateSurface([2,3,4], arrPtPlane1, "chartPlane1", chartPlaneClr, chartPlaneOpacity);
    generateSurface([1,2,3], arrPtPlane2, "chartPlane2", chartPlaneClr, chartPlaneOpacity);    

    if (ambDataType == "Temperature"){
        for (i=0; i < 6; i += 1){
            generateBorder((i+1)*5/4, "chartBorderline", "chartYtick", borderClr, ambDataType);    
        }
    } else {
        for (i=0; i < 5; i += 1){
            generateBorder((i+1)*6/4, "chartBorderline", "chartYtick", borderClr, ambDataType);    
        }
    }
}

// Change the opacity of all the objects in showElements
function changeObjOpacity(mul) {
    for (var k = 0; k < colorInpObj.data.length; k++){
        var acolor = colorInpObj.data[k].color; 
        var anopacity = colorInpObj.data[k].opacity;

        for (var i = 0; i < scene.children.length; i++) {
            if (colorInpObj.data[k].type == scene.children[i].userData.type) {
                scene.children[i].children[0].material = new THREE.MeshPhongMaterial({
                    color: acolor,
                    opacity: anopacity / mul,
                    transparent: true
                });
            }
        }
    }
}

function remove3DChart (){
    // Remove 3D chart components
    scene.remove(scene.getObjectByName("chartGround"));
    scene.remove(scene.getObjectByName("chartPlane1"));
    scene.remove(scene.getObjectByName("chartPlane2"));

    for (i=0; i < 6; i += 1){
        scene.remove(scene.getObjectByName("chartBorderline"));
        scene.remove(scene.getObjectByName("chartYtick"));
    }
}

// JIHOON: Write a text of real-time data
function makeTextSprite( message, parameters ) {
    if ( parameters === undefined ) parameters = {};
    var fontface = parameters.hasOwnProperty("fontface") ? parameters["fontface"] : "Arial";
    var fontsize = parameters.hasOwnProperty("fontsize") ? parameters["fontsize"] : 18;
    var borderThickness = parameters.hasOwnProperty("borderThickness") ? parameters["borderThickness"] : 4;
    var borderColor = parameters.hasOwnProperty("borderColor") ?parameters["borderColor"] : { r:0, g:0, b:0, a:1.0 };
    var backgroundColor = parameters.hasOwnProperty("backgroundColor") ?parameters["backgroundColor"] : { r:0, g:0, b:255, a:1.0 };
    var textColor = parameters.hasOwnProperty("textColor") ?parameters["textColor"] : { r:0, g:0, b:0, a:1.0 };

    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');
    context.font = "Normal " + fontsize + "px " + fontface;
    var metrics = context.measureText( message );
    var textWidth = metrics.width;

    context.fillStyle   = "rgba(" + backgroundColor.r + "," + backgroundColor.g + "," + backgroundColor.b + "," + backgroundColor.a + ")";
    context.strokeStyle = "rgba(" + borderColor.r + "," + borderColor.g + "," + borderColor.b + "," + borderColor.a + ")";
    context.fillStyle = "rgba("+textColor.r+", "+textColor.g+", "+textColor.b+", 1.0)";
    context.fillText( message, borderThickness, fontsize + borderThickness);

    var texture = new THREE.Texture(canvas)
    texture.needsUpdate = true;
    var spriteMaterial = new THREE.SpriteMaterial( { map: texture } );
    var sprite = new THREE.Sprite( spriteMaterial );
    sprite.scale.set(0.5 * fontsize, 0.25 * fontsize, 0.75 * fontsize);

    return sprite;
}

// JIHOON: Select time point to visualize historical data
function timeSlider(){
    var vizTime = parseInt(document.getElementById("inputTimeSlider").value);
    document.getElementById("sliderValue").innerHTML = "<br><span id='subtitles'>Selected Time: </span>" + rewriteTimestamp_show(vizTime);
    var inList = sensorDict[numTime].map(function(x) { return parseInt(x / 1000); });
    var goal = parseInt(vizTime / 1000);
    var closest = inList.reduce(function(prev, curr) {
        return (Math.abs(curr-goal) < Math.abs(prev-goal) ? curr : prev);
    });
    vizIndex = inList.indexOf(closest);
}

// Create the renderer loop
function render(time) {
    time *= 0.001;  // convert time to seconds

    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    // check if the size has been changed
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
        renderer.setSize(width, height, false);   // set the renderer size to the canvas size
        camera.aspect = canvas.clientWidth / canvas.clientHeight; // set the renderer aspect ratio
        camera.updateProjectionMatrix();

        updateCameraTopMatrix(canvas);
    }

    controls.update();

    // update the picking ray with the camera and pointer position
    if (rayset) {
        raycaster.setFromCamera(pointer, camera);

        // calculate objects intersecting the picking ray
        const intersects = raycaster.intersectObjects(scene.children);

        for (let i = 0; i < intersects.length; i++) {
            // JIHOON: to show certain elements defined in 'showElements'
            if (showElements.includes(intersects[i].object.parent.userData.type)) {

                selElement = intersects[i].object.parent;

                // JIHOON:
                if (prevFurniture && prevMaterial) {
                    prevFurniture.children[0].material = prevMaterial;
                }
                prevFurniture = selElement;
                prevMaterial = selElement.children[0].material;

                // JIHOON: Clicked element's color is chaged to Red
                selElement.children[0].material = new THREE.MeshPhongMaterial({
                    color: 0xff0000,
                    opacity: 0.8,
                    transparent: true
                });

                if (lock == false || selElement.name != lastObjectName ) {
                    if(controlX){
                        cubeFolder.remove(controlX);
                        cubeFolder.remove(controlY);
                        cubeFolder.remove(controlZ);
                        cubeFolder.remove(controlR);
                    }

                    addCubeFolder();
                    lastObjectName = selElement.name;
                    lock = true;
                }
                addSelTable();

                if (sensorDictKeys.includes(selElement.userData.sensorId) && selElement.userData.sensorType == "humidity") {
                    selSensorId = selElement.userData.sensorId;
                    
                    lineChart = new GraphTable("GraphTableDIV", selSensorId, sensorDict);
                    lineChart.refresh();
        
                    gaugeChart = new RealTable("RealTableDIV", selSensorId, sensorRealtime);
                    gaugeChart.refresh();
                }
            }
        }
    }

    updateGui();
    importSensorData(dtIP);

    if ((Math.floor((Date.now()-timeInitialStart)/1000) >= timeInitialLoading)) {  
        renderer.setViewport(0, 0, canvas.clientWidth, canvas.clientHeight);
        renderer.render(scene, camera);

        renderer.setScissorTest(true);
        renderer.setScissor(
        canvas.clientWidth - cameraTopWidth -16,
        canvas.clientHeight - cameraTopHeight -16,
        cameraTopWidth,
        cameraTopHeight  
        );
        renderer.setViewport(
            canvas.clientWidth - cameraTopWidth - 16,
            canvas.clientHeight - cameraTopHeight - 16,
            cameraTopWidth,
            cameraTopHeight
        );
        renderer.render(scene, cameraTop);
        renderer.setScissorTest(false);
    }

    requestAnimationFrame(render);
}


function onPointerMove(event) {
    // calculate pointer position in normalized device coordinates
    // (-1 to +1) for both components
    const canvas = document.getElementById("c");
    const width = canvas.clientWidth;
    const height = canvas.clientHeight
    var X = event.clientX - canvas.getBoundingClientRect().left;
    var Y = event.clientY - Math.round(canvas.getBoundingClientRect().top);

    pointer.x = (X / width) * 2 - 1;
    pointer.y = - (Y / height) * 2 + 1;
    rayset = true;

}

//////////////////////////////////      GraphTable class         //////////////

class GraphTable {
    constructor(divID, sensorID_, sensorDict_) {
      this.sensorID = sensorID_;
      this.sensorDict = sensorDict_;
      this.divid = divID;
  };

    refresh() {
        var sensorID = this.sensorID;
        var sensorTempData = this.sensorDict[sensorID].data.temperature;
        var sensorHumidData = this.sensorDict[sensorID].data.humidity;
        var timeData = this.sensorDict[sensorID].time.strTime;

        var myDiv = document.getElementById(this.divid);
        var atext = "";
        //atext += "<h4 class='titleChart'>" + sensorID + "</h4><br>";
        atext += "<table class='GraphTableStyle'><tr><td>";
        atext += '<h4 class="titleChart">Temperature</h4>';
        atext += '<div class="graph-wrapper">';
        atext += '<canvas id="myAreaChart_temp"></canvas>';
        atext += "</div></td><td>";
        atext += '<h4 class="titleChart">Humidity</h4>';
        atext += '<div class="graph-wrapper">';
        atext += '<canvas id="myAreaChart_humid"></canvas>';
        atext += "</div></td></tr></table>";

        myDiv.innerHTML = atext;

        var ctx_temp = document.getElementById("myAreaChart_temp");
        var ctx_humid = document.getElementById("myAreaChart_humid");
        _line_component.data.labels = timeData;
        _line_component.data.datasets[0].data = sensorTempData;
        _line_component.data.datasets[0].label = sensorID;
        _line_component.data.dataUnit = "°C";
        var chart_temp = new Chart(ctx_temp, _line_component);
        _line_component.data.datasets[0].data = sensorHumidData;
        _line_component.data.dataUnit = "%"; 
        
        var chart_temp = new Chart(ctx_humid, _line_component);
        }
    }   // end table class



//////////////////////////////////      RealTable class         ////////////////////////////////

class RealTable {
    constructor(divID, sensorID_, sensorRealtime_) {
        this.sensorID = sensorID_;
        this.sensorRealtime = sensorRealtime_;
        this.divid = divID;
    };

    refresh() {
        var sensorID = this.sensorID;
        var sensorTempData = this.sensorRealtime[sensorID].data.temperature;
        var sensorHumidData = this.sensorRealtime[sensorID].data.humidity;

        var myDiv = document.getElementById(this.divid);
        var atext = "";
        //atext += "<h4 class='titleChart'>" + sensorID + "</h4><br>";
        atext += "<table class='RealTableStyle'><tr><td>";
        atext += '<h4 class="titleChart">Temperature</h4>';
        atext += '<div class="gauge-wrapper">';
        atext += '<canvas id="myGaugeChart_temp"></canvas>';
        atext += '<div class="textGauge">'+sensorTempData+'°C</div>';
        atext += "</div></td><td>";
        atext += '<h4 class="titleChart">Humidity</h4>';
        atext += '<div class="gauge-wrapper">';
        atext += '<canvas id="myGaugeChart_humid"></canvas>';
        atext += '<div class="textGauge">'+sensorHumidData+'%</div>';
        atext += "</div></td></tr></table>";

        myDiv.innerHTML = atext;

        var ctx_temp = document.getElementById("myGaugeChart_temp");
        var ctx_humid = document.getElementById("myGaugeChart_humid");
        var chart_temp = new Chart(ctx_temp, _gauge_component);
        var chart_humid = new Chart(ctx_humid, _gauge_component);
        change_gauge(chart_temp, "Gauge", [sensorTempData, maxTemperature-sensorTempData]);
        change_gauge(chart_humid, "Gauge", [sensorHumidData, maxHumidity-sensorHumidData]);
    }
}   // end table class


  // Set new default font family and font color to mimic Bootstrap's default styling
  Chart.defaults.global.defaultFontFamily = 'Nunito', '-apple-system,system-ui,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif';
  Chart.defaults.global.defaultFontColor = '#858796';

   //JIHOON: drawing & updating charts
  function change_gauge(chart, label, data){
    chart.data.datasets.forEach((dataset) => {
      if(dataset.label == label){
        dataset.data = data;
      }
    });
    chart.update();
  }

  _gauge_component = {
    type:"doughnut",
    data: {
        labels : ["Red","Grey"],
        datasets: [{
            label: "Gauge",
            data : [10, 190],
            backgroundColor: [
                "rgb(78, 115, 223)",
                "rgb(120, 120, 120)",
                "rgb(255, 205, 86)"
            ]
        }]
    },
    options: {
      circumference: Math.PI + 1,
      rotation: -Math.PI - 0.5,
        cutoutPercentage : 60, // precent
        plugins: {
            datalabels: {
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              borderColor: '#ffffff',
              color: function(context) {
                return context.dataset.backgroundColor;
              },
              font: function(context) {
                var w = context.chart.width;
                return {
                  size: w < 512 ? 18 : 20
                }
              },
              align: 'start',
              anchor: 'start',
              offset: 10,
              borderRadius: 4,
              borderWidth: 1,
              formatter: function(value, context) {
                var i = context.dataIndex;
                var len = context.dataset.data.length - 1;
                if(i == len){
                  return null;
                }
                return value+' mph';
              }
            }
        },
        legend: {
            display: false
        },
        tooltips: {
            enabled: false
        }
    }
  }

  function number_format(number, decimals, dec_point, thousands_sep) {
    // *     example: number_format(1234.56, 2, ',', ' ');
    // *     return: '1 234,56'
    number = (number + '').replace(',', '').replace(' ', '');
    var n = !isFinite(+number) ? 0 : +number,
      prec = !isFinite(+decimals) ? 0 : Math.abs(decimals),
      sep = (typeof thousands_sep === 'undefined') ? ',' : thousands_sep,
      dec = (typeof dec_point === 'undefined') ? '.' : dec_point,
      s = '',
      toFixedFix = function(n, prec) {
        var k = Math.pow(10, prec);
        return '' + Math.round(n * k) / k;
      };
    // Fix for IE parseFloat(0.55).toFixed(0) = 0;
    s = (prec ? toFixedFix(n, prec) : '' + Math.round(n)).split('.');
    if (s[0].length > 3) {
      s[0] = s[0].replace(/\B(?=(?:\d{3})+(?!\d))/g, sep);
    }
    if ((s[1] || '').length < prec) {
      s[1] = s[1] || '';
      s[1] += new Array(prec - s[1].length + 1).join('0');
    }
    return s.join(dec);
  }

// JIHOON: Basic components to show a line chart
  _line_component = {
    type: 'line',
    data: {
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      dataUnit: "temperature",
      datasets: [{
        label: "Earnings",
        lineTension: 0.3,
        backgroundColor: "rgba(78, 115, 223, 0.05)",
        borderColor: "rgba(78, 115, 223, 1)",
        pointRadius: 3,
        pointBackgroundColor: "rgba(78, 115, 223, 1)",
        pointBorderColor: "rgba(78, 115, 223, 1)",
        pointHoverRadius: 3,
        pointHoverBackgroundColor: "rgba(78, 115, 223, 1)",
        pointHoverBorderColor: "rgba(78, 115, 223, 1)",
        pointHitRadius: 10,
        pointBorderWidth: 2,
        data: [0, 10000, 5000, 15000, 10000, 20000, 15000, 25000, 20000, 30000, 25000, 40000],
      }],
    },
    options: {
      maintainAspectRatio: true,
      layout: {
        padding: {
          left: 10,
          right: 25,
          top: 25,
          bottom: 0
        }
      },
      scales: {
        xAxes: [{
          time: {
            unit: 'date'
          },
          gridLines: {
            display: false,
            drawBorder: false
          },
          ticks: {
            maxTicksLimit: 7
          }
        }],
        yAxes: [{
          ticks: {
            maxTicksLimit: 5,
            padding: 10,
            // Include a dollar sign in the ticks
            callback: function(value, index, values) {
              return number_format(value,2) + _line_component.data.dataUnit;
            }
          },
          gridLines: {
            color: "rgb(234, 236, 244)",
            zeroLineColor: "rgb(234, 236, 244)",
            drawBorder: false,
            borderDash: [2],
            zeroLineBorderDash: [2]
          }
        }],
      },
      legend: {
        display: false
      },
      tooltips: {
        backgroundColor: "rgb(255,255,255)",
        bodyFontColor: "#858796",
        titleMarginBottom: 10,
        titleFontColor: '#6e707e',
        titleFontSize: 16,
        borderColor: '#dddfeb',
        borderWidth: 1,
        xPadding: 15,
        yPadding: 15,
        displayColors: false,
        intersect: false,
        mode: 'index',
        caretPadding: 10,
        callbacks: {
          label: function(tooltipItem, chart, mode) {
            var datasetLabel = chart.datasets[tooltipItem.datasetIndex].label || '';
            return datasetLabel + ': ' + number_format(tooltipItem.yLabel,2) + _line_component.data.dataUnit;
          }
        }
      }
    }
  }
