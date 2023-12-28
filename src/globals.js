////////////////////////////////// GLOBALS VARAIBLES ////////////////////////////////

var prevUserData;

var scale = 1;
var scene;
var rayset = false;
var renderer;
var canvas;
var camera;
var cameraTop;
var cameraTopWidth;
var cameraTopHeight;
var controls;
var pointer;
var raycaster;
const coeffAspect = 1.25;

var renderer2D;
var canvas2D;
var camera2D;
var controls2D;

var templateChair = null;
var templateTable = null;
var dtIP = "https://api.d21s.com/v2/projects/cio6cburc3pjoj50skeg/devices";
var dtUser = "cjkfd9v1o1l000em0lk0";
var dtPw = "05b5e1f591574fc8945f3f0ce924f6c5";
var occupiedDeskColor = "#ff5f1f";
const occpiedDeskOpacity = 0.85;
var openedWindowColor = "#ff00ff";
const openedWindowOpacity = 0.85;
const defaultColor = "#dddddd"
const defaultOpacity = 0.8

// JIHOON: Additional variables
const ifcFilePath = './ifcFile_CASE_closed.json';//'./output.json';
const ifcFilePath_open = './ifcFile_CASE_opened.json';
const objSittingPath = './assets/human3D_sitting.obj';
const nameOccupant = "Occupant_"
const dirDesk_east = ['Sensor18', 'Sensor20','Sensor22','Sensor23','Sensor25','Sensor27','Sensor49','Sensor51','Sensor53','Sensor55','Sensor57'];
const dirDesk_west = ['Sensor16', 'Sensor17', 'Sensor19','Sensor21','Sensor24','Sensor26','Sensor50','Sensor52','Sensor54','Sensor56','Sensor58'];

// JIHOON : To visualize object types on the web
const nameDuctType = "HVACDuct";
const ductElements = ["DuctSegment", "DuctFitting", "AirTerminal"]
const showElements = ["Wall", "Column", "Window", "Door", "Furniture", "ElectricAppliance", "BuildingElementProxy", nameDuctType]; //"DuctSegment", "DuctFitting", "AirTerminal", "DistributionPort"];
var typesInFile = [];
var selectedType = [];
var backupElements = [];

// JIHOON: Predefined color, opacity, cost of object types
var colorInpObj = {
  "data": [
      {
          "type": "Door",
          "color": defaultColor,
          "opacity": defaultOpacity
      },
      {
          "type": "Column",
          "color": defaultColor,
          "opacity": defaultOpacity
      },
      {
          "type": "Wall",
          "color": defaultColor,
          "opacity": defaultOpacity
      },
      {
          "type": "Window",
          "color": defaultColor,
          "opacity": defaultOpacity
      },
      {
          "type": "Furniture",
          "color": defaultColor,
          "opacity": defaultOpacity
      },
      {
          "type": "BuildingElementProxy",
          "color": defaultColor,
          "opacity": defaultOpacity
      },
      {
          "type": "ElectricAppliance",
          "color": defaultColor,
          "opacity": defaultOpacity
      },
      {
          "type": nameDuctType,
          "color": defaultColor,
          "opacity": defaultOpacity
      }
  ]
}

// var colorInpObj = {
//     "data": [
//         {
//             "type": "Door",
//             "color": "#fa9301",
//             "opacity": 0.5
//         },
//         {
//             "type": "Column",
//             "color": "#f9a8c3",
//             "opacity": 0.5
//         },
//         {
//             "type": "Wall",
//             "color": "#000eff",
//             "opacity": 0.3
//         },
//         {
//             "type": "Window",
//             "color": "#f100e4",
//             "opacity": 0.3
//         },
//         {
//             "type": "Furniture",
//             "color": "#00f1e4",
//             "opacity": 0.5
//         },
//         {
//             "type": "BuildingElementProxy",
//             "color": "#0084a2",
//             "opacity": 0.8
//         },
//         {
//             "type": "ElectricAppliance",
//             "color": "#dd1232",
//             "opacity": 0.8
//         },
//         {
//             "type": nameDuctType,
//             "color": "#0084a2",
//             "opacity": 0.8
//         }
//     ]
// }

var controlX;
var controlHeat;
var meshHeat;
var prevFurniture;
var prevMaterial;
var lock = false;
var lastObjectName = "";
var jsonData;
var templateJSON = null;
var doorOBJ;
var type_dict = {};
var door_index = {};
const doorId = "entrance";
const meetingId = "meetingRoom";
var doorClosed = {}
var boolOccupancy = true;
var boolProximity = true;
var boolAmbient = false;
const arrAmbientTypes = ["Temperature", "Humidity"]
var ambientDataType = "Temperature";

var sensorHumidityInitDict = {
                                type: "",
                                time: {
                                    strTime: [],
                                    dateTime: []
                                },
                                data: {
                                    humidity: [],
                                    temperature: []
                                }
                              }

var sensorOccupancyInitDict = {
                                type: "",
                                time: {
                                  strTime: [],
                                  dateTime: []
                                },
                                data: {
                                  occupancy:[]
                                }
                              }                              

var gui = new dat.GUI();
var cameraFolder;
var cubeFolder;
var heatFolder;
var selElement;
var selSensorId = "Sensor41";
var sensorDictPath = 'exportDict.json';
var lenSensorDict;
var timeStart;
var timeInitialStart;
const timeInitialLoading = 5;
var timeStart_proximity;
const blinkInterval = 1;
var blinkTime;
var blinkOn = false;
var blinkColor = "#0000ff"; 
var numTime = 'numTimestamp';
var strTime = 'strTimestamp';
// var sensorDict = {}
// var sensorDictKeys;
var sensorDict = {};
var sensorDictKeys = [];
var varVizualize = "sensorDataViz"; 
var varText = 'sensorDataText';
var varLine = 'sensorLine';
var sensorTypeName = "ElectricAppliance";
const updateInterval = 300;
const updateDoorInterval = 5;
var sensorValueMax = (ambientDataType == "Temperature") ? 30 : 100;
var currentHeightRatio = 8;
var heatmapOn = false;
var realtimeOn = true;
var sensorRealtime = {};
var vizIndex;
const numTempThreshold = 20;
var numTempSensors = 0;
var prevGeometry;
var initialRequestDesk = true;
var initialRequestProximity = true;
const initialImportTime = 5;

const distinct = (value, index, self) => {
    return self.indexOf(value) === index;
}

var offsetBorder = 0.1;
var ptBoundary1 = [38.048, 27.247];
var ptBoundary2 = [38.048, 12.108];
var ptBoundary3 = [12.547, 12.108];
var ptBoundary4 = [12.547, 27.247];
var ptBoundaryZ = [offsetBorder, sensorValueMax/4];

var chartPlaneClr = '#cccccc';
var chartPlaneOpacity = 0.7
var chartGroundClr = '#333333';
var chartGroundOpacity = 0.9
const borderClr = '#000000';

const _max_temperature=50;
const _max_humidity=100;
const _max_light=1024;
const _max_TVOC=150;
const _max_eCO2=1000;
const maxCO2 = 15;
const maxTemperature = 30;
const maxHumidity = 100;

// JIHOON: To draw line charts on the web
var _line_component = {
    type: 'line',
    data: {
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
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
              return '$' + number_format(value,2);
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
        titleFontSize: 14,
        borderColor: '#dddfeb',
        borderWidth: 1,
        xPadding: 15,
        yPadding: 15,
        displayColors: false,
        intersect: false,
        mode: 'index',
        caretPadding: 10,
        callbacks: {
          label: function(tooltipItem, chart) {
            var datasetLabel = chart.datasets[tooltipItem.datasetIndex].label || '';
            return datasetLabel + ': $' + number_format(tooltipItem.yLabel,2);
          }
        }
      }
    }
  };
